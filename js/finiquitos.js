/* ════════════════════════════════════════════════════════
   FINIQUITOS.JS — Documento de finiquito
   Causales cubiertas (las más comunes en faenas agrícolas):
   · Art. 159 N°1 — Mutuo acuerdo de las partes
   · Art. 159 N°2 — Renuncia del trabajador
   · Art. 159 N°4 — Vencimiento del plazo del contrato
   · Art. 161    — Necesidades de la empresa
   Indemnizaciones (solo aplican a Art. 161):
   · Art. 162 — Sustitutiva del aviso previo (si no se avisó
     con 30 días de anticipación)
   · Art. 163 — Por años de servicio (tope 11 años, base
     tope 90 UF)
   AgroContratista · Versión 1.0
   ⚠️ Este módulo cubre los casos más frecuentes. Casos con
   causales del Art. 160, fuero, o pactos especiales deben
   revisarse con un abogado laboral antes de firmar.
   ════════════════════════════════════════════════════════ */

const LOCAL_FINIQUITOS = 'agro_finiquitos';
let finiquitos_guardados = [];

const CAUSALES_FINIQUITO = {
  mutuo_acuerdo:      { label: 'Mutuo acuerdo de las partes',   articulo: 'Art. 159 N°1 CT', indemniza: false },
  renuncia:            { label: 'Renuncia voluntaria',           articulo: 'Art. 159 N°2 CT', indemniza: false },
  vencimiento_plazo:   { label: 'Vencimiento del plazo convenido', articulo: 'Art. 159 N°4 CT', indemniza: false },
  necesidades_empresa: { label: 'Necesidades de la empresa',     articulo: 'Art. 161 CT',     indemniza: true  },
};

const TOPE_ANIOS_INDEMNIZACION = 11;
const TOPE_UF_INDEMNIZACION    = 90;

/* ── CARGA / GUARDADO ───────────────────────────────────── */
function cargarFiniquitos(){
  try{ finiquitos_guardados = JSON.parse(localStorage.getItem(LOCAL_FINIQUITOS)) || []; }
  catch{ finiquitos_guardados = []; }
}
function guardarFiniquitos(){
  localStorage.setItem(LOCAL_FINIQUITOS, JSON.stringify(finiquitos_guardados));
}

/* ── INIT ───────────────────────────────────────────────── */
function initFiniquitos(){
  cargarFiniquitos();
  cargarGestionLaboral();
  cargarIndicadores();
  cargarVacacionesExtra();
  switchTabRem('rem-finiquitos');
  _poblarSelectTrabajadorFiniquito();
  renderListaFiniquitos();
}

function _poblarSelectTrabajadorFiniquito(){
  const sel = document.getElementById('fin-sel-trabajador');
  if(!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar trabajador —</option>'
    + trabajadores.filter(t => t.estado === 'activo')
      .map(t => `<option value="${t.rut}">${t.nombre} · ${t.rut}</option>`).join('');
  if(val) sel.value = val;
}

/* ════════════════════════════════════════════════════════
   MOTOR DE CÁLCULO
   ════════════════════════════════════════════════════════ */
function calcularFiniquito(rut, fechaTermino, causal, avisoPrevioDado){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return { error: `Trabajador ${rut} no encontrado` };

  const causalInfo = CAUSALES_FINIQUITO[causal];
  if(!causalInfo) return { error: `Causal "${causal}" no reconocida` };

  const periodo = fechaTermino.slice(0,7);
  const ind = getIndicadoresPorPeriodo(periodo);
  if(!ind) return { error: `Sin indicadores previsionales para ${getNombreMes(periodo)} — regístralos primero` };

  const contrato = _getContratoVigente(rut, periodo);
  if(!contrato) return { error: `Sin contrato vigente para ${rut}` };

  const fechaIngreso = contrato.fecha_inicio || t.fecha_ingreso;
  const antiguedadMeses = _mesesCompletos(fechaIngreso, fechaTermino);
  const antiguedadAnios = antiguedadMeses / 12;

  // ── 1. Sueldo pendiente del mes de término (proporcional a días trabajados) ──
  const sueldoInfo = _getSueldoBase(rut, periodo);
  const sueldo_base = sueldoInfo?.monto || parseFloat(contrato.sueldo_monto) || 0;
  const valor_dia = Math.round(sueldo_base / DIVISOR_MES);
  const diaTermino = new Date(fechaTermino+'T12:00:00').getDate();
  const sueldo_pendiente = Math.round(valor_dia * diaTermino);

  // ── 2. Vacaciones proporcionales (reutiliza vacaciones.js) ──
  const vac = calcularSaldoVacaciones(rut, fechaTermino);
  const monto_vacaciones = vac.error ? 0 : Math.max(0, vac.monto_saldo_pendiente);

  // ── 3. Indemnización sustitutiva de aviso previo (Art. 162) ──
  // Solo aplica en necesidades de la empresa, y solo si NO se avisó con 30 días de anticipación
  let monto_aviso_previo = 0;
  if(causalInfo.indemniza && !avisoPrevioDado){
    monto_aviso_previo = Math.round(Math.min(sueldo_base, ind.uf * TOPE_UF_INDEMNIZACION));
  }

  // ── 4. Indemnización por años de servicio (Art. 163) ──
  // 1 mes de remuneración por año y fracción superior a 6 meses, tope 11 años
  let monto_anios_servicio = 0;
  let anios_indemnizables = 0;
  if(causalInfo.indemniza){
    const aniosCompletos  = Math.floor(antiguedadAnios);
    const mesesResto      = antiguedadMeses - (aniosCompletos * 12);
    anios_indemnizables   = Math.min(TOPE_ANIOS_INDEMNIZACION, aniosCompletos + (mesesResto > 6 ? 1 : 0));
    const base_indemnizacion = Math.min(sueldo_base, ind.uf * TOPE_UF_INDEMNIZACION);
    monto_anios_servicio  = Math.round(base_indemnizacion * anios_indemnizables);
  }

  // ── 5. Descuentos pendientes (anticipos, préstamos no saldados) del período ──
  const descuentos_pendientes = getDescuentosPorRut(rut, periodo);
  const total_descuentos = descuentos_pendientes.reduce((s,d) => s + (parseFloat(d.monto)||0), 0);

  const total_haberes = sueldo_pendiente + monto_vacaciones + monto_aviso_previo + monto_anios_servicio;
  const total_a_pagar = Math.max(0, total_haberes - total_descuentos);

  return {
    rut, nombre: t.nombre,
    fecha_ingreso: fechaIngreso,
    fecha_termino: fechaTermino,
    causal, causal_label: causalInfo.label, causal_articulo: causalInfo.articulo,
    aviso_previo_dado: !!avisoPrevioDado,
    antiguedad_anios: +antiguedadAnios.toFixed(2),
    antiguedad_meses: antiguedadMeses,

    sueldo_base, valor_dia, dia_termino: diaTermino,
    sueldo_pendiente,

    dias_vacaciones_saldo: vac.error ? 0 : vac.dias_saldo,
    monto_vacaciones,

    anios_indemnizables,
    tope_uf_aplicado: TOPE_UF_INDEMNIZACION,
    monto_aviso_previo,
    monto_anios_servicio,

    descuentos_pendientes,
    total_descuentos,

    total_haberes,
    total_a_pagar,
  };
}

/* ── VISTA PREVIA ───────────────────────────────────────── */
function previsualizarFiniquito(){
  const rut       = document.getElementById('fin-sel-trabajador')?.value;
  const fecha     = document.getElementById('fin-fecha-termino')?.value;
  const causal    = document.getElementById('fin-causal')?.value;
  const avisoDado = document.getElementById('fin-aviso-previo')?.checked;

  if(!rut)    { toast('⚠️ Selecciona un trabajador', 'error'); return; }
  if(!fecha)  { toast('⚠️ Ingresa la fecha de término', 'error'); return; }
  if(!causal) { toast('⚠️ Selecciona la causal de término', 'error'); return; }

  const fin = calcularFiniquito(rut, fecha, causal, avisoDado);
  if(fin.error){ toast(`❌ ${fin.error}`, 'error'); return; }

  _mostrarModalFiniquito(fin, false);
}

/* ── GENERAR Y GUARDAR ──────────────────────────────────── */
function generarFiniquito(){
  const rut       = document.getElementById('fin-sel-trabajador')?.value;
  const fecha     = document.getElementById('fin-fecha-termino')?.value;
  const causal    = document.getElementById('fin-causal')?.value;
  const avisoDado = document.getElementById('fin-aviso-previo')?.checked;

  if(!rut)    { toast('⚠️ Selecciona un trabajador', 'error'); return; }
  if(!fecha)  { toast('⚠️ Ingresa la fecha de término', 'error'); return; }
  if(!causal) { toast('⚠️ Selecciona la causal de término', 'error'); return; }

  const fin = calcularFiniquito(rut, fecha, causal, avisoDado);
  if(fin.error){ toast(`❌ ${fin.error}`, 'error'); return; }

  fin.folio = 'FIN-' + Date.now().toString().slice(-8);
  fin.fecha_emision = new Date().toISOString().slice(0,10);
  fin.estado = 'generado'; // generado → ratificado

  const idx = finiquitos_guardados.findIndex(f => f.rut === rut && f.fecha_termino === fecha);
  if(idx >= 0) finiquitos_guardados[idx] = fin;
  else finiquitos_guardados.push(fin);
  guardarFiniquitos();

  registrarDocumentoCarpeta({
    trabajador_rut: rut,
    tipo: 'finiquito',
    subtipo: causal,
    folio: fin.folio,
    fecha_firma: fecha,
    descripcion: `Finiquito — ${fin.causal_label} — Total $${fin.total_a_pagar.toLocaleString('es-CL')}`,
  });

  toast(`✅ Finiquito generado — Folio ${fin.folio}`, 'exito');
  renderListaFiniquitos();
  _mostrarModalFiniquito(fin, true);
}

/* ── MARCAR COMO RATIFICADO (ante Notaría / Inspección del Trabajo) ── */
function marcarFiniquitoRatificado(folio){
  const f = finiquitos_guardados.find(x => x.folio === folio);
  if(!f) return;
  if(!confirm(`¿Confirmas que el finiquito de ${f.nombre} fue ratificado ante ministro de fe?`)) return;
  f.estado = 'ratificado';
  f.fecha_ratificacion = new Date().toISOString().slice(0,10);
  guardarFiniquitos();
  renderListaFiniquitos();
  toast('✅ Finiquito marcado como ratificado', 'exito');
}

/* ── LISTA DE FINIQUITOS ─────────────────────────────────── */
function renderListaFiniquitos(){
  const tbody = document.getElementById('tbody-finiquitos');
  if(!tbody) return;

  if(!finiquitos_guardados.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--texto3);">
      Sin finiquitos generados</td></tr>`;
    return;
  }

  const ordenados = [...finiquitos_guardados].sort((a,b) => new Date(b.fecha_termino) - new Date(a.fecha_termino));
  tbody.innerHTML = ordenados.map(f => `<tr>
    <td style="font-size:12px;">${f.folio}</td>
    <td style="font-size:13px;font-weight:500;">${f.nombre}</td>
    <td style="font-size:12px;">${fmtFecha(f.fecha_termino)}</td>
    <td style="font-size:12px;">${f.causal_label}</td>
    <td style="font-size:12px;text-align:right;font-weight:600;">$${f.total_a_pagar.toLocaleString('es-CL')}</td>
    <td>
      <span class="badge ${f.estado==='ratificado'?'badge-verde':'badge-amarillo'}">
        ${f.estado==='ratificado' ? '✅ Ratificado' : '⏳ Pendiente ratificar'}
      </span>
    </td>
    <td style="display:flex;gap:5px;">
      <button class="btn btn-secondary btn-sm" onclick="imprimirFiniquito('${f.folio}')" title="Imprimir"><i class="ti ti-printer"></i></button>
      ${f.estado!=='ratificado' ? `<button class="btn btn-primary btn-sm" onclick="marcarFiniquitoRatificado('${f.folio}')" title="Marcar ratificado"><i class="ti ti-check"></i></button>` : ''}
    </td>
  </tr>`).join('');
}

/* ════════════════════════════════════════════════════════
   DOCUMENTO IMPRIMIBLE
   ════════════════════════════════════════════════════════ */
function _generarHTMLFiniquito(fin){
  const t  = trabajadores.find(x => x.rut === fin.rut);
  const ep = getEmpresaEmpleadora(t?.empresa_propia_id);
  const fmtM = v => '$' + Math.round(v||0).toLocaleString('es-CL');

  return `
  <style>
    .fq-wrap{max-width:760px;margin:0 auto;background:#fff;font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;}
    .fq-header{background:#0f2942;color:#fff;padding:18px 24px;border-radius:10px 10px 0 0;}
    .fq-body{padding:22px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;}
    .fq-titulo{font-size:17px;font-weight:700;margin-bottom:4px;}
    .fq-sub{font-size:12px;color:#94a3b8;}
    p{font-size:13px;line-height:1.7;text-align:justify;}
    table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;}
    td{padding:6px 8px;border-bottom:1px solid #f1f5f9;}
    td:last-child{text-align:right;font-weight:500;}
    .fq-total{background:#0f2942;color:#fff;font-weight:700;font-size:15px;}
    .fq-firmas{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:50px;}
    .fq-firma{text-align:center;border-top:1px dashed #cbd5e1;padding-top:8px;font-size:11px;color:#475569;}
    @media print{.fq-no-print{display:none;}}
  </style>
  <div class="fq-wrap">
    <div class="fq-header">
      <div class="fq-titulo">Finiquito de Contrato de Trabajo</div>
      <div class="fq-sub">Folio ${fin.folio||'(borrador)'} · ${fin.causal_articulo}</div>
    </div>
    <div class="fq-body">
      <p>En ${ep?.ciudad||'—'}, a ${fmtFecha(fin.fecha_emision||fin.fecha_termino)}, entre
      <strong>${ep?.razon_social||ep?.nombre||'—'}</strong>, RUT ${ep?.rut||'—'}, representada por
      ${ep?.representante||ep?.nombre_representante||'—'}, en adelante "el empleador", y don(ña)
      <strong>${fin.nombre}</strong>, RUT ${fin.rut}, en adelante "el trabajador", se deja constancia
      del finiquito del contrato de trabajo celebrado entre ambas partes con fecha ${fmtFecha(fin.fecha_ingreso)},
      cuya causal de término es <strong>${fin.causal_label}</strong> (${fin.causal_articulo}), con
      fecha de término ${fmtFecha(fin.fecha_termino)}.</p>

      <table>
        <tr><td>Remuneración pendiente del mes (${fin.dia_termino} día${fin.dia_termino>1?'s':''} trabajados)</td><td>${fmtM(fin.sueldo_pendiente)}</td></tr>
        <tr><td>Feriado proporcional — ${fin.dias_vacaciones_saldo} días pendientes</td><td>${fmtM(fin.monto_vacaciones)}</td></tr>
        ${fin.monto_aviso_previo > 0 ? `<tr><td>Indemnización sustitutiva del aviso previo (Art. 162 CT)</td><td>${fmtM(fin.monto_aviso_previo)}</td></tr>` : ''}
        ${fin.monto_anios_servicio > 0 ? `<tr><td>Indemnización por años de servicio — ${fin.anios_indemnizables} año${fin.anios_indemnizables!==1?'s':''} (Art. 163 CT, tope ${fin.tope_uf_aplicado} UF)</td><td>${fmtM(fin.monto_anios_servicio)}</td></tr>` : ''}
        ${fin.total_descuentos > 0 ? `<tr><td>Descuentos pendientes (anticipos / préstamos)</td><td>-${fmtM(fin.total_descuentos)}</td></tr>` : ''}
        <tr class="fq-total"><td>Total líquido a pagar</td><td>${fmtM(fin.total_a_pagar)}</td></tr>
      </table>

      <p>El trabajador declara recibir en este acto, a su entera satisfacción, la suma antes indicada,
      no teniendo cargo ni cobro alguno pendiente en contra del empleador por concepto de remuneraciones,
      feriados, indemnizaciones, o cualquier otra prestación derivada de la relación laboral o de su
      término, dando en consecuencia el más amplio y total finiquito.</p>

      ${fin.causal === 'necesidades_empresa' ? `<p style="font-size:11px;color:#94a3b8;">Este finiquito debe ser ratificado ante notario público, inspector del trabajo, o
      ministro de fe autorizado, conforme al Art. 177 CT, para que produzca pleno efecto liberatorio.</p>` : ''}

      <div class="fq-firmas">
        <div class="fq-firma">Firma empleador<br><strong>${ep?.razon_social||ep?.nombre||'—'}</strong></div>
        <div class="fq-firma">Firma trabajador<br><strong>${fin.nombre}</strong><br>RUT ${fin.rut}</div>
      </div>
    </div>
  </div>`;
}

function _mostrarModalFiniquito(fin, guardado){
  const html = _generarHTMLFiniquito(fin);
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Finiquito ${fin.nombre}</title></head><body style="margin:20px;">
    ${html}
    ${guardado ? '<script>setTimeout(()=>window.print(),700);<\/script>' : ''}
  </body></html>`);
  win.document.close();
}

function imprimirFiniquito(folio){
  const fin = finiquitos_guardados.find(f => f.folio === folio);
  if(!fin){ toast('⚠️ Finiquito no encontrado', 'error'); return; }
  _mostrarModalFiniquito(fin, true);
}
