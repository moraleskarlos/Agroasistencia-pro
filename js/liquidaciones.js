/* ════════════════════════════════════════════════════════
   LIQUIDACIONES.JS — Generación de liquidaciones de sueldo
   Diseño profesional · Cumple Art. 54 CT
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

const LOCAL_LIQUIDACIONES = 'agro_liquidaciones';
let liquidaciones_guardadas = [];
let _liquidacionPreview = null;

/* ── CARGA / GUARDADO ──────────────────────────────────── */
function cargarLiquidaciones(){
  try{ liquidaciones_guardadas = JSON.parse(localStorage.getItem(LOCAL_LIQUIDACIONES)) || []; }
  catch{ liquidaciones_guardadas = []; }
}

function guardarLiquidaciones(){
  localStorage.setItem(LOCAL_LIQUIDACIONES, JSON.stringify(liquidaciones_guardadas));
}

/* ── INIT ───────────────────────────────────────────────── */
function initLiquidaciones(){
  cargarLiquidaciones();
  cargarIndicadores();

  const hoy   = new Date();
  const mesAnt= new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
  const periodoDefault = `${mesAnt.getFullYear()}-${String(mesAnt.getMonth()+1).padStart(2,'0')}`;

  const sel = document.getElementById('liq-periodo-selector');
  if(sel && !sel.value) sel.value = periodoDefault;

  _poblarSelectsLiquidacion();
  renderListaLiquidaciones();
  switchTabRem('rem-liquidaciones');
}

function _poblarSelectsLiquidacion(){
  const selMandante = document.getElementById('liq-filtro-mandante');
  if(selMandante){
    const val = selMandante.value;
    selMandante.innerHTML = '<option value="">Todos los mandantes</option>'
      + empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    if(val) selMandante.value = val;
  }
}

/* ── VERIFICACIONES PREVIAS ─────────────────────────────── */
function _verificarPreCondiciones(periodo){
  const ind = getIndicadoresPorPeriodo(periodo);
  if(!ind){
    toast(`⚠️ No hay indicadores previsionales para ${getNombreMes(periodo)} — regístralos primero`, 'error');
    return false;
  }
  const trabActivos = trabajadores.filter(t => t.estado === 'activo');
  if(!trabActivos.length){
    toast('⚠️ No hay trabajadores activos en el sistema', 'error');
    return false;
  }
  return true;
}

/* ── CALCULAR PREVIEW (sin guardar) ─────────────────────── */
function previsualizarLiquidacion(rut){
  const periodo = document.getElementById('liq-periodo-selector')?.value;
  if(!periodo){ toast('⚠️ Selecciona el período primero', 'error'); return; }
  if(!_verificarPreCondiciones(periodo)) return;

  const vars = construirVariablesRemuneracion(rut, periodo);
  if(vars.error){ toast(`❌ ${vars.error}`, 'error'); return; }

  const liq = calcularLiquidacion(vars, periodo);
  if(liq.error){ toast(`❌ ${liq.error}`, 'error'); return; }

  _liquidacionPreview = liq;
  _mostrarModalLiquidacion(liq, false);
}

function previsualizarLiquidacionSeleccionada(){
  const rut = document.getElementById('liq-sel-trabajador')?.value;
  if(!rut){ toast('⚠️ Selecciona un trabajador', 'error'); return; }
  previsualizarLiquidacion(rut);
}

/* ── CALCULAR Y GUARDAR ─────────────────────────────────── */
function calcularYGuardarLiquidacion(rut, periodo){
  const vars = construirVariablesRemuneracion(rut, periodo);
  if(vars.error) return { error: vars.error };
  const liq  = calcularLiquidacion(vars, periodo);
  if(liq.error) return { error: liq.error };

  liq.folio          = _generarFolio(periodo);
  liq.fecha_emision  = new Date().toISOString().slice(0,10);
  liq.estado         = 'generada';

  // Reemplazar si ya existe para este período y rut
  const idx = liquidaciones_guardadas.findIndex(l => l.rut === rut && l.periodo === periodo);
  if(idx >= 0) liquidaciones_guardadas[idx] = liq;
  else liquidaciones_guardadas.push(liq);

  guardarLiquidaciones();

  // Registrar en Carpeta Laboral
  registrarDocumentoCarpeta({
    trabajador_rut: rut,
    tipo:        'liquidacion',
    subtipo:     periodo,
    folio:       liq.folio,
    fecha_firma: liq.fecha_emision,
    descripcion: `Liquidación ${getNombreMes(periodo)} — Líquido $${liq.liquido.toLocaleString('es-CL')}`,
  });

  return liq;
}

function generarLiquidacionIndividual(){
  const rut    = document.getElementById('liq-sel-trabajador')?.value;
  const periodo= document.getElementById('liq-periodo-selector')?.value;
  if(!rut)   { toast('⚠️ Selecciona un trabajador', 'error'); return; }
  if(!periodo){ toast('⚠️ Selecciona el período', 'error'); return; }
  if(!_verificarPreCondiciones(periodo)) return;

  const liq = calcularYGuardarLiquidacion(rut, periodo);
  if(liq.error){ toast(`❌ ${liq.error}`, 'error'); return; }

  toast(`✅ Liquidación generada — Folio ${liq.folio}`, 'exito');
  renderListaLiquidaciones();
  _mostrarModalLiquidacion(liq, true);
}

function generarLiquidacionesMasivas(){
  const periodo  = document.getElementById('liq-periodo-selector')?.value;
  const mandante = document.getElementById('liq-filtro-mandante')?.value;
  if(!periodo){ toast('⚠️ Selecciona el período', 'error'); return; }
  if(!_verificarPreCondiciones(periodo)) return;

  const lista = mandante
    ? construirVariablesMandante(periodo, mandante)
    : construirVariablesPeriodo(periodo);

  if(!lista.length){ toast('⚠️ Sin trabajadores para calcular', 'error'); return; }

  let ok = 0, errores = [];
  lista.forEach(vars => {
    const liq = calcularYGuardarLiquidacion(vars.rut, periodo);
    if(liq.error) errores.push(`${vars.nombre}: ${liq.error}`);
    else ok++;
  });

  guardarLiquidaciones();
  renderListaLiquidaciones();

  if(errores.length){
    toast(`⚠️ ${ok} generadas · ${errores.length} con error — revisa la consola`, 'error');
    console.warn('Errores en generación masiva:', errores);
  } else {
    toast(`✅ ${ok} liquidación${ok>1?'es':''} generada${ok>1?'s':''}`, 'exito');
  }
}

/* ── FOLIO CORRELATIVO ──────────────────────────────────── */
function _generarFolio(periodo){
  const [anio, mes] = periodo.split('-');
  const existentes  = liquidaciones_guardadas.filter(l => l.periodo === periodo).length;
  const num         = String(existentes + 1).padStart(4,'0');
  return `${anio}${mes}-${num}`;
}

/* ── LISTA DE LIQUIDACIONES ─────────────────────────────── */
function renderListaLiquidaciones(){
  const periodo  = document.getElementById('liq-periodo-selector')?.value || '';
  const mandante = document.getElementById('liq-filtro-mandante')?.value  || '';
  const tbody    = document.getElementById('tbody-liquidaciones');
  if(!tbody) return;

  let lista = liquidaciones_guardadas.filter(l => !periodo || l.periodo === periodo);
  if(mandante){
    const ruts = trabajadores
      .filter(t => findMandante(t)?.id === mandante)
      .map(t => t.rut);
    lista = lista.filter(l => ruts.includes(l.rut));
  }

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--texto3);">
      Sin liquidaciones para este período — genera las liquidaciones con el botón superior</td></tr>`;
    _renderResumenPeriodo([]);
    return;
  }

  lista.sort((a,b) => a.nombre?.localeCompare(b.nombre));
  tbody.innerHTML = lista.map(l => `<tr>
    <td style="font-size:13px;font-weight:500;">${l.nombre}</td>
    <td style="font-size:12px;font-family:monospace;">${l.rut}</td>
    <td style="font-size:12px;text-align:right;">$${l.total_haberes?.toLocaleString('es-CL')||'—'}</td>
    <td style="font-size:12px;text-align:right;color:var(--danger);">-$${l.total_descuentos?.toLocaleString('es-CL')||'—'}</td>
    <td style="font-size:13px;font-weight:600;text-align:right;color:var(--verde-dark);">$${l.liquido?.toLocaleString('es-CL')||'—'}</td>
    <td style="font-size:11px;color:var(--texto2);">${l.folio||'—'}</td>
    <td>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-secondary btn-sm" onclick="verLiquidacion('${l.rut}','${l.periodo}')" title="Ver">
          <i class="ti ti-eye"></i>
        </button>
        <button class="btn btn-primary btn-sm" onclick="imprimirLiquidacion('${l.rut}','${l.periodo}')" title="Imprimir/PDF">
          <i class="ti ti-printer"></i>
        </button>
      </div>
    </td>
  </tr>`).join('');

  _renderResumenPeriodo(lista);
}

function _renderResumenPeriodo(lista){
  const setKPI = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  const total_hab  = lista.reduce((s,l) => s + (l.total_haberes||0), 0);
  const total_desc = lista.reduce((s,l) => s + (l.total_descuentos||0), 0);
  const total_liq  = lista.reduce((s,l) => s + (l.liquido||0), 0);
  setKPI('liq-kpi-trabajadores', lista.length);
  setKPI('liq-kpi-haberes',      lista.length ? '$'+total_hab.toLocaleString('es-CL')  : '—');
  setKPI('liq-kpi-descuentos',   lista.length ? '$'+total_desc.toLocaleString('es-CL') : '—');
  setKPI('liq-kpi-liquido',      lista.length ? '$'+total_liq.toLocaleString('es-CL')  : '—');
}

/* ── VER LIQUIDACIÓN GUARDADA ───────────────────────────── */
function verLiquidacion(rut, periodo){
  const liq = liquidaciones_guardadas.find(l => l.rut === rut && l.periodo === periodo);
  if(!liq){ toast('⚠️ Liquidación no encontrada', 'error'); return; }
  _mostrarModalLiquidacion(liq, true);
}

/* ── MODAL CON LA LIQUIDACIÓN ───────────────────────────── */
function _mostrarModalLiquidacion(liq, guardada){
  const overlay = document.getElementById('liq-modal-overlay');
  const cont    = document.getElementById('liq-modal-contenido');
  if(!overlay || !cont) return;

  cont.innerHTML = _generarHTMLLiquidacion(liq, guardada);
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function cerrarModalLiquidacion(){
  const overlay = document.getElementById('liq-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

/* ── GENERAR HTML DE LIQUIDACIÓN ─────────────────────────── */
function _generarHTMLLiquidacion(liq, guardada){
  const ind     = getIndicadoresPorPeriodo(liq.periodo);
  const t       = trabajadores.find(x => x.rut === liq.rut);
  const cont    = contratos.find(c => c.trabajador_rut === liq.rut || c.trabajador_id === t?.id);
  const mandante= t ? findMandante(t) : null;
  const ep      = getEmpresaEmpleadora(cont?.empresa_propia_id);

  const [anio, mes] = liq.periodo.split('-');
  const nombreMes   = new Date(anio, mes-1, 1)
    .toLocaleDateString('es-CL', {month:'long', year:'numeric'});
  const fmtFecha = v => v ? new Date(v+'T12:00:00').toLocaleDateString('es-CL') : '—';
  const fmtM     = v => v != null ? '$'+Math.round(v).toLocaleString('es-CL') : '—';
  const badgeTipo = tipo => {
    const map = { indefinido:'Indefinido', fijo:'Plazo Fijo', temporada:'Temporada' };
    return `<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:500;padding:2px 8px;border-radius:99px;">${map[tipo]||tipo}</span>`;
  };

  // Haberes imponibles detalle
  let habImpRows = `<tr><td class="ld-sub">Sueldo base mensual</td><td class="ld-amt">${fmtM(liq.sueldo_base)}</td><td></td></tr>`;
  if(liq.descuento_ausencias > 0){
    habImpRows += `<tr><td class="ld-sub" style="color:#dc2626;">Descuento ${liq.dias_a_descontar} día${liq.dias_a_descontar>1?'s':''} ausencia${liq.dias_permiso_sin_goce>0?' sin goce':' injustificada'} (× ${fmtM(Math.round(liq.sueldo_base/30))})</td><td class="ld-amt" style="color:#dc2626;">-${fmtM(liq.descuento_ausencias)}</td><td></td></tr>`;
    habImpRows += `<tr><td class="ld-sub">Sueldo proporcional</td><td class="ld-amt">${fmtM(liq.sueldo_proporcional)}</td><td></td></tr>`;
  }
  (liq.haberes_variables||[]).filter(h=>h.imponible!==false).forEach(h => {
    habImpRows += `<tr><td class="ld-sub">${_labelHaber(h.tipo)}</td><td class="ld-amt">${fmtM(h.monto)}</td><td></td></tr>`;
  });
  (liq.horas_extra||[]).forEach(h => {
    habImpRows += `<tr><td class="ld-sub">Horas extra ${h.horas}h (${h.recargo} recargo) — ${fmtFecha(h.fecha)}</td><td class="ld-amt">${fmtM(h.monto_imponible)}</td><td></td></tr>`;
  });

  // Haberes no imponibles
  const habNoImp = (liq.haberes_variables||[]).filter(h=>h.imponible===false);
  let habNoImpRows = habNoImp.length
    ? habNoImp.map(h => `<tr><td class="ld-sub">${_labelHaber(h.tipo)}</td><td class="ld-amt">${fmtM(h.monto)}</td><td></td></tr>`).join('')
    : `<tr><td class="ld-sub" style="color:var(--texto3);">Sin haberes no imponibles</td><td></td><td></td></tr>`;

  // Descuentos legales
  const afpNombreLabel = t?.afiliacion_afp || liq.afp || '—';
  let descLegRows = `
    <tr><td class="ld-sub">AFP ${afpNombreLabel} — ${liq.pct_afp_trab}% s/ ${fmtM(liq.base_afp)}</td><td></td><td class="ld-amt-neg">-${fmtM(liq.monto_afp)}</td></tr>
    <tr><td class="ld-sub">${liq.es_isapre ? 'Isapre' : 'Fonasa'} — 7% s/ ${fmtM(liq.base_afp)}</td><td></td><td class="ld-amt-neg">-${fmtM(liq.monto_salud)}</td></tr>`;
  if(liq.monto_afc_trab > 0){
    descLegRows += `<tr><td class="ld-sub">AFC Seg. Cesantía — 0,6% s/ ${fmtM(liq.base_afc)}</td><td></td><td class="ld-amt-neg">-${fmtM(liq.monto_afc_trab)}</td></tr>`;
  }
  if(liq.iusc > 0){
    descLegRows += `<tr><td class="ld-sub">IUSC Impuesto Único s/ ${fmtM(liq.base_iusc)}</td><td></td><td class="ld-amt-neg">-${fmtM(liq.iusc)}</td></tr>`;
  }

  // Otros descuentos
  let otrosDescRows = '';
  if((liq.descuentos_adicionales||[]).length){
    liq.descuentos_adicionales.forEach(d => {
      const label = d.cuotas_total > 1
        ? `${_labelDescuento(d.tipo)} — cuota ${d.cuotas_pagadas||1}/${d.cuotas_total}`
        : _labelDescuento(d.tipo);
      otrosDescRows += `<tr><td class="ld-sub">${label}</td><td></td><td class="ld-amt-neg">-${fmtM(d.monto)}</td></tr>`;
    });
  } else {
    otrosDescRows = `<tr><td class="ld-sub" style="color:var(--texto3);">Sin otros descuentos</td><td></td><td></td></tr>`;
  }

  return `
  <style>
    .ld-wrap{max-width:760px;margin:0 auto;background:#fff;font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;color:#1e293b;}
    .ld-header{background:#0f2942;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:flex-start;}
    .ld-logo-icon{width:38px;height:38px;background:#10b981;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0;}
    .ld-titulo-label{font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;}
    .ld-titulo-periodo{font-size:20px;font-weight:600;color:#fff;margin-top:2px;}
    .ld-folio{font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;}
    .ld-body{padding:20px 24px;}
    .ld-ficha{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}
    .ld-ficha-col{padding:14px 16px;}
    .ld-ficha-col:first-child{border-right:1px solid #e2e8f0;}
    .ld-ficha-col-title{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;}
    .ld-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;}
    .ld-row-label{color:#64748b;}
    .ld-row-val{font-weight:500;color:#1e293b;text-align:right;}
    .ld-sec{display:flex;align-items:center;gap:8px;background:#0f2942;color:#fff;padding:7px 12px;border-radius:6px;margin:14px 0 6px;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;}
    .ld-sec-rojo{background:#7f1d1d;}
    .ld-sec-cafe{background:#78350f;}
    .ld-table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:2px;}
    .ld-table td{padding:6px 10px;border-bottom:1px solid #f1f5f9;}
    .ld-table tr:last-child td{border-bottom:none;}
    .ld-sub{padding-left:22px!important;color:#475569;}
    .ld-amt{text-align:right;font-weight:500;color:#1e293b;}
    .ld-amt-neg{text-align:right;font-weight:500;color:#dc2626;}
    .ld-subtotal td{background:#f8fafc;font-weight:500;font-size:12px;}
    .ld-bases{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;text-align:center;}
    .ld-base-label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:3px;}
    .ld-base-val{font-size:13px;font-weight:500;color:#1e293b;}
    .ld-totales{display:flex;justify-content:flex-end;margin:14px 0;}
    .ld-totales-inner{width:52%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}
    .ld-tot-row{display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;}
    .ld-tot-liquido{background:#0f2942;color:#fff;display:flex;justify-content:space-between;padding:12px 14px;font-size:15px;font-weight:600;}
    .ld-legal{font-size:11px;color:#64748b;line-height:1.5;padding:12px 0;border-top:1px solid #e2e8f0;margin-top:4px;}
    .ld-firmas{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:20px 0 8px;}
    .ld-firma-box{text-align:center;}
    .ld-firma-linea{border-top:1px dashed #cbd5e1;padding-top:8px;margin-top:40px;font-size:11px;color:#475569;}
    .ld-footer{text-align:center;padding:10px 0 4px;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;}
    @media print{
      body{margin:0;padding:0;}
      .ld-no-print{display:none!important;}
      .ld-wrap{max-width:100%;box-shadow:none;border:none;}
    }
  </style>

  <div class="ld-wrap">
    <div class="ld-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="ld-logo-icon">AC</div>
        <div>
          <div style="font-size:16px;font-weight:600;">AgroContratista</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.5px;">La plataforma para contratistas agrícolas</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div class="ld-titulo-label">Liquidación de sueldo</div>
        <div class="ld-titulo-periodo">${_capitalizar(nombreMes)}</div>
        <div class="ld-folio">Folio N° ${liq.folio||'—'} · Emitido ${fmtFecha(liq.fecha_emision||new Date().toISOString().slice(0,10))}</div>
      </div>
    </div>

    <div class="ld-body">

      <div class="ld-ficha">
        <div class="ld-ficha-col">
          <div class="ld-ficha-col-title">Empleador</div>
          <div class="ld-row"><span class="ld-row-label">Empresa</span><span class="ld-row-val">${ep?.razon_social||ep?.nombre||'—'}</span></div>
          <div class="ld-row"><span class="ld-row-label">RUT</span><span class="ld-row-val">${ep?.rut||'—'}</span></div>
          ${mandante ? `<div class="ld-row"><span class="ld-row-label">Mandante</span><span class="ld-row-val">${mandante.nombre}</span></div>` : ''}
          ${t?.faena_obra ? `<div class="ld-row"><span class="ld-row-label">Faena</span><span class="ld-row-val">${t.faena_obra}</span></div>` : ''}
        </div>
        <div class="ld-ficha-col">
          <div class="ld-ficha-col-title">Trabajador</div>
          <div class="ld-row"><span class="ld-row-label">Nombre</span><span class="ld-row-val">${liq.nombre}</span></div>
          <div class="ld-row"><span class="ld-row-label">RUT</span><span class="ld-row-val">${liq.rut}</span></div>
          ${t?.funcion_cargo ? `<div class="ld-row"><span class="ld-row-label">Cargo</span><span class="ld-row-val">${t.funcion_cargo}</span></div>` : ''}
          <div class="ld-row"><span class="ld-row-label">Contrato</span><span class="ld-row-val">${badgeTipo(liq.tipo_contrato)}</span></div>
          <div class="ld-row"><span class="ld-row-label">Inicio contrato</span><span class="ld-row-val">${fmtFecha(liq.fecha_inicio_contrato)}</span></div>
          <div class="ld-row"><span class="ld-row-label">Días mes / trabajados</span><span class="ld-row-val">30 / ${30 - (liq.dias_a_descontar||0)}</span></div>
          <div class="ld-row"><span class="ld-row-label">AFP</span><span class="ld-row-val">${_capitalizar(liq.afp||'—')} (${liq.pct_afp_trab||'—'}%)</span></div>
          <div class="ld-row"><span class="ld-row-label">Salud</span><span class="ld-row-val">${liq.sistema_salud||'Fonasa'} (7%)</span></div>
          <div class="ld-row"><span class="ld-row-label">Valor UF</span><span class="ld-row-val">${ind?.uf ? '$'+ind.uf.toLocaleString('es-CL',{minimumFractionDigits:2}) : '—'}</span></div>
        </div>
      </div>

      <div class="ld-sec"><i class="ti ti-trending-up"></i> Haberes imponibles</div>
      <table class="ld-table">
        ${habImpRows}
        <tr class="ld-subtotal"><td style="padding-left:10px;">Subtotal haberes imponibles</td><td class="ld-amt">${fmtM(liq.total_haberes_imponibles)}</td><td></td></tr>
      </table>

      <div class="ld-sec"><i class="ti ti-coffee"></i> Haberes no imponibles</div>
      <table class="ld-table">
        ${habNoImpRows}
        <tr class="ld-subtotal"><td style="padding-left:10px;">Subtotal no imponibles</td><td class="ld-amt">${fmtM(liq.total_haberes_no_imponibles)}</td><td></td></tr>
      </table>

      <div class="ld-sec ld-sec-rojo"><i class="ti ti-shield-check"></i> Descuentos legales previsionales</div>
      <table class="ld-table">
        ${descLegRows}
        <tr class="ld-subtotal"><td style="padding-left:10px;">Subtotal descuentos legales</td><td></td><td class="ld-amt-neg">-${fmtM(liq.total_prev_trab + liq.iusc)}</td></tr>
      </table>

      <div class="ld-sec ld-sec-cafe"><i class="ti ti-minus"></i> Otros descuentos</div>
      <table class="ld-table">
        ${otrosDescRows}
        <tr class="ld-subtotal"><td style="padding-left:10px;">Subtotal otros descuentos</td><td></td><td class="ld-amt-neg">-${fmtM(liq.total_desc_adicionales)}</td></tr>
      </table>

      <div class="ld-bases">
        <div><div class="ld-base-label">Base imponible AFP / Salud</div><div class="ld-base-val">${fmtM(liq.base_afp)}</div></div>
        <div><div class="ld-base-label">Base imponible AFC</div><div class="ld-base-val">${fmtM(liq.base_afc)}</div></div>
        <div><div class="ld-base-label">Base tributable IUSC</div><div class="ld-base-val">${fmtM(liq.base_iusc)}</div></div>
      </div>

      <div class="ld-totales">
        <div class="ld-totales-inner">
          <div class="ld-tot-row"><span>Total haberes</span><span style="font-weight:600;">${fmtM(liq.total_haberes)}</span></div>
          <div class="ld-tot-row"><span>Total descuentos</span><span style="font-weight:600;color:#dc2626;">-${fmtM(liq.total_descuentos)}</span></div>
          <div class="ld-tot-liquido"><span>Líquido a recibir</span><span>${fmtM(liq.liquido)}</span></div>
        </div>
      </div>

      <div class="ld-legal">
        Certifico que he recibido de <strong>${ep?.razon_social||ep?.nombre||'la empresa'}</strong> ${ep?.rut ? '(RUT '+ep.rut+')' : ''} a mi entera satisfacción la suma indicada en la presente liquidación y no tengo cargo ni cobro posterior que hacer por concepto de remuneraciones del período señalado.
      </div>

      <div class="ld-firmas">
        <div class="ld-firma-box">
          <div class="ld-firma-linea">Firma y timbre empleador<br><strong>${ep?.razon_social||ep?.nombre||'—'}</strong></div>
        </div>
        <div class="ld-firma-box">
          <div class="ld-firma-linea">Firma trabajador<br><strong>${liq.nombre}</strong><br>RUT ${liq.rut}</div>
        </div>
      </div>

      <div class="ld-footer">
        Documento generado por AgroContratista · Sistema de Gestión Laboral para Contratistas Agrícolas · Folio N° ${liq.folio||'—'}
      </div>

    </div>
  </div>`;
}

/* ── IMPRIMIR / GUARDAR PDF ─────────────────────────────── */
function imprimirLiquidacion(rut, periodo){
  const liq = liquidaciones_guardadas.find(l => l.rut === rut && l.periodo === periodo);
  if(!liq){ toast('⚠️ Liquidación no encontrada', 'error'); return; }

  const ventana = window.open('', '_blank', 'width=900,height=700');
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"><title>Liquidación ${liq.nombre} ${liq.periodo}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
    <style>body{margin:20px;background:#fff;}</style>
  </head><body>
    ${_generarHTMLLiquidacion(liq, true)}
    <script>setTimeout(()=>window.print(),800);<\/script>
  </body></html>`);
  ventana.document.close();
}

/* ── UTILIDADES ─────────────────────────────────────────── */
function _capitalizar(str){
  if(!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function _labelHaber(tipo){
  const map = {
    bono_produccion:'Bono producción', bono_asistencia:'Bono asistencia',
    bono_puntualidad:'Bono puntualidad', bono_responsabilidad:'Bono responsabilidad',
    colacion:'Colación', movilizacion:'Movilización', viatico:'Viático',
    asignacion_especial:'Asignación especial', otro:'Haber variable',
  };
  return map[tipo] || tipo;
}

function _labelDescuento(tipo){
  const map = {
    anticipo:'Anticipo', prestamo:'Préstamo',
    caja_compensacion:'Caja de Compensación', cuota_sindical:'Cuota sindical',
    retencion_judicial:'Retención judicial', otro:'Descuento',
  };
  return map[tipo] || tipo;
}
