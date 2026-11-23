/* ════════════════════════════════════════════════════════
   LIBRO.JS — Libro de Remuneraciones
   Formato DT (Art. 62 CT) + Resumen Contador
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

/* ── INIT ───────────────────────────────────────────────── */
function initLibro(){
  cargarLiquidaciones();
  cargarIndicadores();

  const hoy    = new Date();
  const mesAnt = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
  const periodoDefault = `${mesAnt.getFullYear()}-${String(mesAnt.getMonth()+1).padStart(2,'0')}`;

  const sel = document.getElementById('libro-periodo-selector');
  if(sel && !sel.value) sel.value = periodoDefault;

  _poblarFiltroMandanteLibro();
  renderLibro();
}

function _poblarFiltroMandanteLibro(){
  const sel = document.getElementById('libro-filtro-empresa');
  if(!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">Todas las empresas</option>'
    + (empresas_propias||[]).map(e => `<option value="${e.id}">${e.nombre||e.razon_social}</option>`).join('');
  if(val) sel.value = val;
}

/* ── OBTENER LIQUIDACIONES DEL PERÍODO ──────────────────── */
function _getLiquidacionesPeriodo(periodo, empresaId){
  let lista = liquidaciones_guardadas.filter(l => l.periodo === periodo);
  if(empresaId){
    // ✅ Mismo arreglo que en liquidaciones.js — contrato vigente del
    // período específico de cada liquidación, no "el primero que
    // encuentra" (importante con Carpeta Empresa / reingresos).
    lista = lista.filter(l => {
      const c = _getContratoVigente(l.rut, l.periodo);
      return c?.empresa_propia_id === empresaId;
    });
  }
  return lista.sort((a,b) => (a.nombre||'').localeCompare(b.nombre||''));
}

/* ── RENDER PRINCIPAL ───────────────────────────────────── */
function renderLibro(){
  const periodo = document.getElementById('libro-periodo-selector')?.value || '';
  const empresa = document.getElementById('libro-filtro-empresa')?.value  || '';
  const vista   = document.getElementById('libro-vista')?.value || 'dt';

  const lista = _getLiquidacionesPeriodo(periodo, empresa);
  const cont  = document.getElementById('libro-contenido');
  if(!cont) return;
  _marcarPestanaLibro(vista);

  if(!lista.length && vista !== 'lre'){
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--texto3);">
      Sin liquidaciones generadas para este período.<br><br>
      <button class="btn btn-primary btn-sm" onclick="irA('remuneraciones')">
        <i class="ti ti-file-invoice"></i> Ir a Liquidaciones
      </button>
    </div>`;
    _renderKPIsLibro([]);
    return;
  }

  _renderKPIsLibro(lista);
  const aviso = _avisoLiquidacionesDesactualizadas(lista, periodo);

  if(vista === 'dt'){
    cont.innerHTML = aviso + _renderLibroDT(lista, periodo);
  } else if(vista === 'lre' && typeof _renderLRE === 'function'){
    cont.innerHTML = _renderLRE(periodo);   // trae sus propios avisos y validaciones
  } else {
    cont.innerHTML = aviso + _renderResumenContador(lista, periodo);
  }
}

/* ✅ Auditoría Libro — pestañas de vista con títulos claros */
function cambiarVistaLibro(vista){
  const sel = document.getElementById('libro-vista');
  if(sel) sel.value = vista;
  renderLibro();
}
function _marcarPestanaLibro(vista){
  document.querySelectorAll('.libro-tab').forEach(b => {
    const activa = b.dataset.vista === vista;
    b.classList.toggle('btn-primary', activa);
    b.classList.toggle('btn-secondary', !activa);
  });
}

/* ✅ L2 — Aviso de liquidaciones cuyos datos cambiaron después de
   generarlas (🟡). El libro muestra lo generado; el aviso dice qué falta
   reabrir antes de cerrar el mes. */
function _avisoLiquidacionesDesactualizadas(lista, periodo){
  if(typeof _estadoLiquidacion !== 'function') return '';
  const pend = lista.filter(l => {
    const emp = (typeof _empresaDelPeriodo === 'function') ? _empresaDelPeriodo(l.rut, periodo) : '';
    if(typeof esMesCerrado === 'function' && esMesCerrado(periodo, emp)) return false;
    return _estadoLiquidacion(l.rut, periodo).estado === 'desactualizada';
  });
  if(!pend.length) return '';
  return `<div class="card" style="margin-bottom:12px;background:#fffbeb;border:1px solid #fcd34d;color:#92400e;font-size:13px;">
    <strong>🟡 ${pend.length} liquidación${pend.length!==1?'es':''} con datos cambiados después de generarla${pend.length!==1?'s':''}:</strong>
    ${pend.map(l => l.nombre).join(', ')}.
    El libro muestra lo generado. Para corregir, ve a Remuneraciones → "Reabrir"; el mes no se puede cerrar mientras haya alguna en 🟡.
  </div>`;
}

/* ✅ L4 — Desglose de haberes imponibles de una liquidación */
function _desgloseHaberes(l){
  const sueldo = l.sueldo_proporcional ?? l.sueldo_base ?? 0;
  const he     = (l.horas_extra || []).reduce((s,h) => s + (h.monto_imponible||0), 0);
  const grat   = l.gratificacion || 0;
  const otros  = Math.max(0, (l.total_haberes_imponibles||0) - sueldo - he - grat);
  return { sueldo, he, grat, otros };
}

function _renderKPIsLibro(lista){
  const fmtM = v => v ? '$'+Math.round(v).toLocaleString('es-CL') : '—';
  document.getElementById('libro-kpi-trab')?.setAttribute('data-val', lista.length);
  const setKPI = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setKPI('libro-kpi-trab',    lista.length);
  setKPI('libro-kpi-haberes', fmtM(lista.reduce((s,l)=>s+(l.total_haberes||0),0)));
  setKPI('libro-kpi-prev',    fmtM(lista.reduce((s,l)=>s+(l.total_prev_trab||0),0)));
  setKPI('libro-kpi-liquido', fmtM(lista.reduce((s,l)=>s+(l.liquido||0),0)));
}

/* ════════════════════════════════════════════════════════
   FORMATO 1 — LIBRO DT (Art. 62 CT)
   ✅ Corregido — el código citaba "Resolución Exenta N°961 DT", que no
   se encontró evidencia de que exista o esté relacionada al Libro de
   Remuneraciones. Referencias reales confirmadas: Art. 62 del Código
   del Trabajo (obligación del libro), Dictamen DT N°877/006 (10-03-2021)
   y Resolución Exenta N°285 (2021) de la DT — el manual oficial del
   Libro de Remuneraciones Electrónico.
   ════════════════════════════════════════════════════════ */
/* ✅ Botón "Cerrar mes" / "Corrección" — solo tiene sentido con UNA
   empresa específica seleccionada (el cierre es por empresa+período,
   no global). Si ya está cerrado, muestra el candado + el botón de
   Corrección (que no reabre nada, aplica un ajuste al mes siguiente). */
function _botonCierreMes(periodo){
  const empresa = document.getElementById('libro-filtro-empresa')?.value;
  if(!empresa) return '';

  if(typeof esMesCerrado === 'function' && esMesCerrado(periodo, empresa)){
    return `
      <span class="badge badge-gris" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;">
        <i class="ti ti-lock"></i> Mes cerrado
      </span>
      <button class="btn btn-secondary btn-sm" onclick="abrirModalCorreccion('${periodo}','${empresa}')" title="Corrección de emergencia — no reabre el mes, aplica un ajuste en el siguiente">
        <i class="ti ti-tool"></i> Corrección
      </button>`;
  }

  return `<button class="btn btn-secondary btn-sm" onclick="cerrarMes()" title="Bloquea generar o recalcular liquidaciones de este período para esta empresa">
    <i class="ti ti-lock"></i> Cerrar mes
  </button>`;
}

function _renderLibroDT(lista, periodo, opciones = {}){
  const [anio, mes] = periodo.split('-');
  const nombreMes   = new Date(anio, mes-1, 1)
    .toLocaleDateString('es-CL',{month:'long',year:'numeric'});
  const fmtM = v => v != null ? '$'+Math.round(v).toLocaleString('es-CL') : '$0';
  const fmtP = v => v != null ? v+'%' : '—';

  // Totales
  const tot = {
    sueldo_mes:       lista.reduce((s,l)=>s+_desgloseHaberes(l).sueldo,0),
    he:               lista.reduce((s,l)=>s+_desgloseHaberes(l).he,0),
    grat:             lista.reduce((s,l)=>s+_desgloseHaberes(l).grat,0),
    otros_imp:        lista.reduce((s,l)=>s+_desgloseHaberes(l).otros,0),
    sueldo_base:      lista.reduce((s,l)=>s+(l.sueldo_base||0),0),
    hab_imp:          lista.reduce((s,l)=>s+(l.total_haberes_imponibles||0),0),
    hab_no_imp:       lista.reduce((s,l)=>s+(l.total_haberes_no_imponibles||0),0),
    total_haberes:    lista.reduce((s,l)=>s+(l.total_haberes||0),0),
    afp:              lista.reduce((s,l)=>s+(l.monto_afp||0),0),
    salud:            lista.reduce((s,l)=>s+(l.monto_salud||0),0),
    afc_trab:         lista.reduce((s,l)=>s+(l.monto_afc_trab||0),0),
    iusc:             lista.reduce((s,l)=>s+(l.iusc||0),0),
    otros_desc:       lista.reduce((s,l)=>s+(l.total_desc_adicionales||0),0),
    total_desc:       lista.reduce((s,l)=>s+(l.total_descuentos||0),0),
    liquido:          lista.reduce((s,l)=>s+(l.liquido||0),0),
    // Cargo empleador
    afp_emp:          lista.reduce((s,l)=>s+(l.monto_afp_emp||0),0),
    sis:              lista.reduce((s,l)=>s+(l.monto_sis||0),0),
    afc_emp:          lista.reduce((s,l)=>s+(l.monto_afc_emp||0),0),
    costo_empresa:    lista.reduce((s,l)=>s+_costoEmpresa(l),0),
    reforma:          lista.reduce((s,l)=>s+(l.monto_exp_vida||0)+(l.monto_rentabilidad_protegida||0),0),
    mutual:           lista.reduce((s,l)=>s+(l.monto_mutual||0),0),
    aporte:           lista.reduce((s,l)=>s+_aportePatronal(l),0),
  };
  const sinTasaMutual = lista.some(l => l.tasa_mutual_configurada === false);

  const td  = (v, extra='') => `<td style="font-size:11px;text-align:right;${extra}">${v}</td>`;
  const filas = lista.map((l,i) => {
    const d = _desgloseHaberes(l);
    // ✅ L1 — aporte completo (incluye reforma de pensiones y Mutual)
    const aportePatronal = _aportePatronal(l);
    return `<tr style="${i%2===0?'':'background:#F8FAFC'}">
      <td style="font-size:11px;white-space:nowrap;">${i+1}</td>
      <td class="rut-mono" style="white-space:nowrap;">${l.rut}</td>
      <td style="font-size:12px;font-weight:500;white-space:nowrap;min-width:160px;">${l.nombre}${l.version > 1 ? ` <span title="Liquidación reabierta y corregida" style="font-size:10px;color:#92400e;background:#fef3c7;padding:1px 5px;border-radius:4px;">v${l.version}</span>` : ''}</td>
      <td style="font-size:11px;text-align:center;">${_tipoContratoLabel(_tipoContratoReal(l))}</td>
      <td style="font-size:11px;text-align:center;">${30-(l.dias_a_descontar||0)}</td>
      ${td(fmtM(d.sueldo))}${td(fmtM(d.he))}${td(fmtM(d.grat))}${td(fmtM(d.otros))}
      ${td(fmtM(l.total_haberes_imponibles),'font-weight:600;')}
      ${td(fmtM(l.total_haberes_no_imponibles))}
      ${td(fmtM(l.total_haberes),'font-weight:600;')}
      <td style="font-size:11px;text-align:center;white-space:nowrap;">${_capitalizar(l.afp||'—')}</td>
      ${td(fmtM(l.monto_afp))}${td(fmtM(l.monto_salud))}${td(fmtM(l.monto_afc_trab))}${td(fmtM(l.iusc))}${td(fmtM(l.total_desc_adicionales))}
      ${td(fmtM(l.total_descuentos),'font-weight:600;color:#dc2626;')}
      <td style="font-size:12px;text-align:right;font-weight:700;color:#065f46;">${fmtM(l.liquido)}</td>
      ${td(fmtM(aportePatronal),'color:#6d28d9;')}
    </tr>`;
  }).join('');

  const empSel = document.getElementById('libro-filtro-empresa')?.value || '';
  const ep = empSel ? getEmpresaEmpleadora(empSel) : null;
  const th = (t, al='right', title='') => `<th style="background:#0f2942;color:#fff;padding:8px 6px;text-align:${al};"${title ? ` title="${title}"` : ''}>${t}</th>`;
  const tf = v => `<td style="color:#fff;text-align:right;padding:9px 6px;">${v}</td>`;
  const sinTasaMutual2 = lista.some(l => l.tasa_mutual_configurada === false);

  return `
  <div class="card" style="margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-size:15px;font-weight:700;">Libro de Remuneraciones</div>
        <div style="font-size:12px;color:var(--texto2);margin-top:2px;">
          ${ep ? `${ep.razon_social || ep.nombre} · RUT ${ep.rut || '—'} · ` : ''}${_capitalizar(nombreMes)} · ${lista.length} trabajador${lista.length>1?'es':''}
          <span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;margin-left:8px;">Art. 62 CT</span>
        </div>
      </div>
      ${opciones.imprimir ? '' : `<div style="display:flex;gap:8px;">
        <button class="btn btn-secondary btn-sm" onclick="imprimirLibroDT()"><i class="ti ti-printer"></i> Imprimir</button>
        <button class="btn btn-primary btn-sm" onclick="exportarLibroExcel()"><i class="ti ti-table-export"></i> Exportar Excel</button>
        ${_botonCierreMes(periodo)}
      </div>`}
    </div>

    <div class="tabla-wrap" id="libro-dt-wrap">
      <table class="tabla" id="tabla-libro-dt" style="min-width:1600px;font-size:11px;">
        <thead>
          <tr>
            ${th('#','left')}${th('RUT','left')}${th('Nombre','left')}${th('Contrato','center')}${th('Días','center','Días pagados del mes (base 30)')}
            ${th('Sueldo del mes','right','Sueldo pagado: proporcional a los días, después de faltas y licencias')}${th('Horas extra')}${th('Gratificación')}${th('Otros imponibles','right','Bonos de producción, asistencia, etc.')}
            ${th('Total imponible')}${th('No imponibles','right','Colación, movilización, viático')}${th('Total haberes')}
            ${th('AFP','center')}${th('Cot. AFP')}${th('Cot. salud')}${th('Seg. cesantía')}${th('Impuesto')}${th('Otros desc.','right','Anticipos, préstamos, etc.')}${th('Total desc.')}
            ${th('Líquido')}${th('Aporte patronal','right','AFP empleador + SIS + seguro de cesantía + reforma de pensiones + Mutual')}
          </tr>
        </thead>
        <tbody>${filas}</tbody>
        <tfoot>
          <tr style="background:#1e293b;color:#fff;font-weight:600;">
            <td colspan="5" style="color:#fff;padding:9px 8px;font-size:12px;">TOTALES</td>
            ${tf(fmtM(tot.sueldo_mes))}${tf(fmtM(tot.he))}${tf(fmtM(tot.grat))}${tf(fmtM(tot.otros_imp))}
            ${tf(fmtM(tot.hab_imp))}${tf(fmtM(tot.hab_no_imp))}${tf(fmtM(tot.total_haberes))}
            <td style="color:#fff;text-align:center;padding:9px 6px;">—</td>
            ${tf(fmtM(tot.afp))}${tf(fmtM(tot.salud))}${tf(fmtM(tot.afc_trab))}${tf(fmtM(tot.iusc))}${tf(fmtM(tot.otros_desc))}${tf(fmtM(tot.total_desc))}
            <td style="text-align:right;padding:9px 6px;color:#10b981;">${fmtM(tot.liquido)}</td>
            ${tf(fmtM(tot.aporte))}
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Sección cargo empleador -->
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--borde);">
      <div style="font-size:11px;font-weight:700;color:var(--texto3);text-transform:uppercase;
        letter-spacing:.4px;margin-bottom:8px;">Cargo empleador (no se descuenta al trabajador)</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:12px;">
        <span>AFP empleador: <strong>${fmtM(tot.afp_emp)}</strong></span>
        <span>SIS: <strong>${fmtM(tot.sis)}</strong></span>
        <span>AFC empleador: <strong>${fmtM(tot.afc_emp)}</strong></span>
        <span>Reforma de pensiones: <strong>${fmtM(tot.reforma)}</strong></span>
        <span>Mutual / ISL: <strong>${fmtM(tot.mutual)}</strong>${sinTasaMutual2 ? ' <span style="color:#b45309;" title="Configura la tasa de tu Mutual en Previsión → Configuración de la empresa">(tasa básica 0,93% — configúrala en Previsión)</span>' : ''}</span>
        <span style="background:#f0fdf4;color:#065f46;padding:4px 12px;border-radius:6px;font-weight:700;">
          Costo total empresa: ${fmtM(tot.costo_empresa)}
        </span>
      </div>
    </div>
  </div>`;
}

/* ════════════════════════════════════════════════════════
   FORMATO 2 — RESUMEN CONTADOR
   Totales por institución para declaración Previred
   ════════════════════════════════════════════════════════ */
function _renderResumenContador(lista, periodo, opciones = {}){
  const [anio, mes] = periodo.split('-');
  const nombreMes   = new Date(anio, mes-1, 1)
    .toLocaleDateString('es-CL',{month:'long',year:'numeric'});
  const fmtM = v => v != null ? '$'+Math.round(v).toLocaleString('es-CL') : '$0';
  const ind  = getIndicadoresPorPeriodo(periodo);

  // Agrupar por AFP
  const porAfp = {};
  lista.forEach(l => {
    const key = _capitalizar(l.afp||'sin afp');
    if(!porAfp[key]) porAfp[key] = { trab:0, afp_trab:0, afp_emp:0, sis:0, base:0 };
    porAfp[key].trab++;
    porAfp[key].afp_trab += l.monto_afp||0;
    porAfp[key].afp_emp  += l.monto_afp_emp||0;
    porAfp[key].sis      += l.monto_sis||0;
    porAfp[key].base     += l.base_afp||0;
  });

  // Agrupar por institución de salud
  const porSalud = {};
  lista.forEach(l => {
    const key = l.sistema_salud||'Fonasa';
    if(!porSalud[key]) porSalud[key] = { trab:0, monto:0 };
    porSalud[key].trab++;
    porSalud[key].monto += l.monto_salud||0;
  });

  // AFC por tipo contrato
  const afc = {
    indef_trab: lista.filter(l=>l.tipo_contrato==='indefinido').reduce((s,l)=>s+(l.monto_afc_trab||0),0),
    indef_emp:  lista.filter(l=>l.tipo_contrato==='indefinido').reduce((s,l)=>s+(l.monto_afc_emp||0),0),
    fijo_emp:   lista.filter(l=>l.tipo_contrato==='fijo').reduce((s,l)=>s+(l.monto_afc_emp||0),0),
  };

  const total_prev_trab = lista.reduce((s,l)=>s+(l.total_prev_trab||0),0);
  const total_prev_emp  = lista.reduce((s,l)=>s+_aportePatronal(l),0);
  const total_iusc      = lista.reduce((s,l)=>s+(l.iusc||0),0);
  const total_liquido   = lista.reduce((s,l)=>s+(l.liquido||0),0);
  const total_haberes   = lista.reduce((s,l)=>s+(l.total_haberes||0),0);
  const costo_empresa   = lista.reduce((s,l)=>s+_costoEmpresa(l),0);

  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">

    <!-- Encabezado -->
    <div class="card" style="grid-column:span 2;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-size:15px;font-weight:700;">Resumen para el Contador</div>
        <div style="font-size:12px;color:var(--texto2);margin-top:2px;">
          ${_capitalizar(nombreMes)} · ${lista.length} trabajador${lista.length>1?'es':''}
        </div>
      </div>
      ${opciones.imprimir ? '' : `<div style="display:flex;gap:8px;">
        <button class="btn btn-secondary btn-sm" onclick="imprimirResumenContador()">
          <i class="ti ti-printer"></i> Imprimir
        </button>
        <button class="btn btn-primary btn-sm" onclick="exportarResumenExcel()">
          <i class="ti ti-table-export"></i> Exportar Excel
        </button>
        ${_botonCierreMes(periodo)}
      </div>`}
    </div>

    <!-- AFP por institución -->
    <div class="card">
      <div class="card-title card-title-oscuro"><i class="ti ti-building-bank"></i> AFP — Por institución</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:var(--gris-bg);">
          <th style="padding:6px 8px;text-align:left;font-size:10px;color:var(--texto3);text-transform:uppercase;">AFP</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;color:var(--texto3);text-transform:uppercase;">Trab.</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;color:var(--texto3);text-transform:uppercase;">Cot. Trabajador</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;color:var(--texto3);text-transform:uppercase;">Cot. Empleador</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;color:var(--texto3);text-transform:uppercase;">SIS</th>
        </tr></thead>
        <tbody>
          ${Object.entries(porAfp).map(([afp,d],i)=>`
          <tr style="${i%2===0?'':'background:#F8FAFC'}">
            <td style="padding:7px 8px;font-weight:500;">${afp}</td>
            <td style="padding:7px 8px;text-align:center;">${d.trab}</td>
            <td style="padding:7px 8px;text-align:right;">${fmtM(d.afp_trab)}</td>
            <td style="padding:7px 8px;text-align:right;">${fmtM(d.afp_emp)}</td>
            <td style="padding:7px 8px;text-align:right;">${fmtM(d.sis)}</td>
          </tr>`).join('')}
          <tr style="background:#1e293b;color:#fff;font-weight:600;">
            <td style="padding:7px 8px;" colspan="2">Total AFP</td>
            <td style="padding:7px 8px;text-align:right;">${fmtM(Object.values(porAfp).reduce((s,d)=>s+d.afp_trab,0))}</td>
            <td style="padding:7px 8px;text-align:right;">${fmtM(Object.values(porAfp).reduce((s,d)=>s+d.afp_emp,0))}</td>
            <td style="padding:7px 8px;text-align:right;">${fmtM(Object.values(porAfp).reduce((s,d)=>s+d.sis,0))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Salud por institución -->
    <div class="card">
      <div class="card-title card-title-oscuro"><i class="ti ti-heart-rate-monitor"></i> Salud — Por institución</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:var(--gris-bg);">
          <th style="padding:6px 8px;text-align:left;font-size:10px;color:var(--texto3);text-transform:uppercase;">Institución</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;color:var(--texto3);text-transform:uppercase;">Trab.</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;color:var(--texto3);text-transform:uppercase;">Cotización</th>
        </tr></thead>
        <tbody>
          ${Object.entries(porSalud).map(([inst,d],i)=>`
          <tr style="${i%2===0?'':'background:#F8FAFC'}">
            <td style="padding:7px 8px;font-weight:500;">${inst}</td>
            <td style="padding:7px 8px;text-align:center;">${d.trab}</td>
            <td style="padding:7px 8px;text-align:right;">${fmtM(d.monto)}</td>
          </tr>`).join('')}
          <tr style="background:#1e293b;color:#fff;font-weight:600;">
            <td style="padding:7px 8px;" colspan="2">Total Salud</td>
            <td style="padding:7px 8px;text-align:right;">${fmtM(Object.values(porSalud).reduce((s,d)=>s+d.monto,0))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- AFC -->
    <div class="card">
      <div class="card-title card-title-oscuro"><i class="ti ti-briefcase"></i> AFC — Seguro de Cesantía</div>
      <div style="font-size:13px;line-height:2.2;">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding:4px 0;">
          <span>Plazo Indefinido — Trabajador</span><strong>${fmtM(afc.indef_trab)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding:4px 0;">
          <span>Plazo Indefinido — Empleador</span><strong>${fmtM(afc.indef_emp)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding:4px 0;">
          <span>Plazo Fijo / Temporada — Empleador</span><strong>${fmtM(afc.fijo_emp)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-weight:700;">
          <span>Total AFC</span><strong>${fmtM(afc.indef_trab+afc.indef_emp+afc.fijo_emp)}</strong>
        </div>
      </div>
    </div>

    <!-- Resumen global -->
    <div class="card">
      <div class="card-title card-title-oscuro"><i class="ti ti-calculator"></i> Resumen global del período</div>
      <div style="font-size:13px;line-height:2.2;">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding:4px 0;">
          <span>Total haberes brutos</span><strong>${fmtM(total_haberes)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding:4px 0;">
          <span>Total cotizaciones trabajador</span><strong style="color:#dc2626;">-${fmtM(total_prev_trab)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding:4px 0;">
          <span>IUSC total</span><strong style="color:#dc2626;">-${fmtM(total_iusc)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding:4px 0;font-weight:700;">
          <span>Total líquido a pagar</span><strong style="color:#065f46;">${fmtM(total_liquido)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding:4px 0;">
          <span>Total cargo empleador (incluye reforma de pensiones y Mutual)</span><strong>${fmtM(total_prev_emp)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-weight:700;
          background:#f0fdf4;margin:0 -4px;padding:8px 4px;border-radius:6px;">
          <span>Costo total empresa</span><strong style="color:#065f46;font-size:14px;">${fmtM(costo_empresa)}</strong>
        </div>
      </div>
    </div>

  </div>`;
}

/* ── IMPRIMIR ────────────────────────────────────────────── */
function imprimirLibroDT(){
  const periodo = document.getElementById('libro-periodo-selector')?.value || '';
  const empresa = document.getElementById('libro-filtro-empresa')?.value  || '';
  const lista   = _getLiquidacionesPeriodo(periodo, empresa);
  if(!lista.length){ toast('⚠️ Sin liquidaciones para imprimir','error'); return; }

  const win = window.open('','_blank','width=1100,height=700');
  win.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"><title>Libro Remuneraciones ${periodo}</title>
    <style>
      body{font-family:'Segoe UI',system-ui,sans-serif;margin:20px;font-size:11px;}
      table{width:100%;border-collapse:collapse;}
      th,td{padding:5px 6px;border:1px solid #e2e8f0;}
      th{background:#f1f5f9!important;color:#0f172a!important;font-size:9.5px;text-transform:uppercase;}
      tfoot td{background:#e2e8f0!important;color:#0f172a!important;font-weight:700;}
      .card{border:none;padding:0;} .tabla-wrap{overflow:visible;}
      @media print{@page{size:landscape;margin:8mm;}}
    </style>
  </head><body>
    ${_renderLibroDT(lista, periodo, { imprimir: true })}
    <script>setTimeout(()=>window.print(),600);<\/script>
  </body></html>`);
  win.document.close();
}

function imprimirResumenContador(){
  const periodo = document.getElementById('libro-periodo-selector')?.value || '';
  const empresa = document.getElementById('libro-filtro-empresa')?.value  || '';
  const lista   = _getLiquidacionesPeriodo(periodo, empresa);
  if(!lista.length){ toast('⚠️ Sin liquidaciones para imprimir','error'); return; }

  const win = window.open('','_blank','width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"><title>Resumen Contador ${periodo}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
    <style>
      body{font-family:'Segoe UI',system-ui,sans-serif;margin:20px;}
      .card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:14px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{padding:6px 8px;border-bottom:1px solid #f1f5f9;}
      th{background:#f8fafc;font-size:10px;text-transform:uppercase;color:#94a3b8;}
    </style>
  </head><body>
    ${_renderResumenContador(lista, periodo, { imprimir: true })}
    <script>setTimeout(()=>window.print(),600);<\/script>
  </body></html>`);
  win.document.close();
}

/* ── EXPORTAR EXCEL ─────────────────────────────────────── */
function exportarLibroExcel(){
  const periodo = document.getElementById('libro-periodo-selector')?.value || '';
  const empresa = document.getElementById('libro-filtro-empresa')?.value  || '';
  const lista   = _getLiquidacionesPeriodo(periodo, empresa);
  if(!lista.length){ toast('⚠️ Sin datos para exportar','error'); return; }

  const rows = lista.map((l,i) => ({
    'N°':                    i+1,
    'RUT':                   l.rut,
    'Nombre':                l.nombre,
    'Tipo contrato':         _tipoContratoLabel(_tipoContratoReal(l)),
    'Días trabajados':       30-(l.dias_a_descontar||0),
    'Sueldo base (contrato)':l.sueldo_base||0,
    'Sueldo del mes':        _desgloseHaberes(l).sueldo,
    'Horas extra':           _desgloseHaberes(l).he,
    'Gratificación':         _desgloseHaberes(l).grat,
    'Otros imponibles':      _desgloseHaberes(l).otros,
    'Total imponible':       l.total_haberes_imponibles||0,
    'Hab. no imponibles':    l.total_haberes_no_imponibles||0,
    'Total haberes':         l.total_haberes||0,
    'Base AFP':              l.base_afp||0,
    'AFP':                   _capitalizar(l.afp||''),
    'Cot. AFP trabajador':   l.monto_afp||0,
    'Cot. AFP empleador':    l.monto_afp_emp||0,
    'SIS':                   l.monto_sis||0,
    'Cot. Salud':            l.monto_salud||0,
    'AFC trabajador':        l.monto_afc_trab||0,
    'AFC empleador':         l.monto_afc_emp||0,
    'Reforma pensiones':     (l.monto_exp_vida||0) + (l.monto_rentabilidad_protegida||0),
    'Mutual':                Math.max(0, _aportePatronal(l) - (l.monto_afp_emp||0) - (l.monto_sis||0) - (l.monto_afc_emp||0) - (l.monto_exp_vida||0) - (l.monto_rentabilidad_protegida||0)),
    'Versión':               l.version || 1,
    'IUSC':                  l.iusc||0,
    'Otros descuentos':      l.total_desc_adicionales||0,
    'Total descuentos':      l.total_descuentos||0,
    'Líquido':               l.liquido||0,
    'Aporte patronal':       _aportePatronal(l),
    'Costo empresa':         _costoEmpresa(l),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.min(Math.max(k.length+2, 10), 22) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Libro DT');
  XLSX.writeFile(wb, `Libro_Remuneraciones_${periodo}.xlsx`);
  toast('⬇️ Libro exportado a Excel','exito');
}

function exportarResumenExcel(){
  const periodo = document.getElementById('libro-periodo-selector')?.value || '';
  const empresa = document.getElementById('libro-filtro-empresa')?.value  || '';
  const lista   = _getLiquidacionesPeriodo(periodo, empresa);
  if(!lista.length){ toast('⚠️ Sin datos para exportar','error'); return; }

  const wb = XLSX.utils.book_new();

  // Hoja 1: AFP
  const porAfp = {};
  lista.forEach(l => {
    const key = _capitalizar(l.afp||'sin afp');
    if(!porAfp[key]) porAfp[key] = {trab:0,afp_trab:0,afp_emp:0,sis:0};
    porAfp[key].trab++;
    porAfp[key].afp_trab += l.monto_afp||0;
    porAfp[key].afp_emp  += l.monto_afp_emp||0;
    porAfp[key].sis      += l.monto_sis||0;
  });
  const wsAfp = XLSX.utils.json_to_sheet(
    Object.entries(porAfp).map(([afp,d])=>({
      AFP:afp, Trabajadores:d.trab,
      'Cot. Trabajador':d.afp_trab,
      'Cot. Empleador':d.afp_emp,
      SIS:d.sis,
      'Total AFP+SIS':d.afp_trab+d.afp_emp+d.sis,
    }))
  );
  XLSX.utils.book_append_sheet(wb, wsAfp, 'AFP');

  // Hoja 2: Resumen global
  const wsRes = XLSX.utils.json_to_sheet([{
    'Período':              periodo,
    'Trabajadores':         lista.length,
    'Total haberes':        lista.reduce((s,l)=>s+(l.total_haberes||0),0),
    'Cotiz. trabajadores':  lista.reduce((s,l)=>s+(l.total_prev_trab||0),0),
    'IUSC':                 lista.reduce((s,l)=>s+(l.iusc||0),0),
    'Total líquido':        lista.reduce((s,l)=>s+(l.liquido||0),0),
    'Cargo empleador':      lista.reduce((s,l)=>s+_aportePatronal(l),0),
    'Costo total empresa':  lista.reduce((s,l)=>s+_costoEmpresa(l),0),
  }]);
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen');

  XLSX.writeFile(wb, `Resumen_Contador_${periodo}.xlsx`);
  toast('⬇️ Resumen exportado a Excel','exito');
}

/* ── UTILIDADES ─────────────────────────────────────────── */
/* ✅ L1 — Aporte patronal por trabajador: AFP empleador + SIS + AFC
   empleador + reforma de pensiones + Mutual. Las liquidaciones
   generadas antes de este cambio no traen Mutual: se calcula con la
   tasa actual de la empresa. */
function _aportePatronal(l){
  let mutual = l.monto_mutual;
  if(mutual == null && typeof _tasaMutualEmpresa === 'function'){
    const c = _getContratoVigente(l.rut, l.periodo);
    mutual = Math.round((l.base_afp||0) * _tasaMutualEmpresa(c?.empresa_propia_id).tasa / 100);
  }
  return (l.monto_afp_emp||0) + (l.monto_sis||0) + (l.monto_afc_emp||0)
       + (l.monto_exp_vida||0) + (l.monto_rentabilidad_protegida||0) + (mutual||0);
}
function _costoEmpresa(l){ return (l.total_haberes||0) + _aportePatronal(l); }

function _tipoContratoLabel(tipo){
  // ✅ Corregido — el mapa no tenía 'plazo_fijo' (el valor real que
  // guarda el contrato), solo 'fijo' (la categoría normalizada para
  // AFC). Se agrega como alias — mismo criterio que ya se usó para el
  // mismo bug en el modal de liquidación individual.
  const map = { indefinido:'Indefinido', fijo:'Plazo Fijo', plazo_fijo:'Plazo Fijo', temporada:'Temporada' };
  return map[tipo] || tipo || '—';
}

/* ✅ Tipo real del contrato — antes se leía directo l.tipo_contrato,
   que es la categoría YA NORMALIZADA para AFC (solo 'fijo' o
   'indefinido', nunca 'temporada' — ver _normalizarTipoContrato en
   variables.js). Eso hacía que un contrato de Temporada se mostrara
   como "Plazo Fijo" en el Libro. Se busca primero en el contrato
   vigente real de ese período (mismo criterio ya usado en el modal de
   liquidación individual), con l.tipo_contrato como último respaldo
   por si ese contrato ya no existe (reingreso a otro ciclo, etc.). */
function _tipoContratoReal(l){
  const cont = (typeof _getContratoVigente === 'function') ? _getContratoVigente(l.rut, l.periodo) : null;
  return cont?.tipo || cont?.tipo_contrato || l.tipo_contrato;
}
