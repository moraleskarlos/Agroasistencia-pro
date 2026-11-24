/* ════════════════════════════════════════════════════════
   CENTRALIZACION.JS — Centralización contable de remuneraciones
   Genera el asiento contable (debe/haber) del período para
   ingresar al sistema de contabilidad.
   Distinto del "Resumen Contador" de libro.js (ese agrupa
   por institución previsional para Previred; este arma la
   partida contable con cuentas genéricas).
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

/* ── Plan de cuentas genérico (editable por el usuario) ─── */
const LOCAL_PLAN_CUENTAS = 'agro_plan_cuentas';
const PLAN_CUENTAS_DEFAULT = {
  // ── Debe (gastos) ──
  gasto_remuneraciones:   'Gasto Sueldos y Salarios',
  gasto_afp_empleador:    'Gasto Aporte Empleador AFP (0,1% cuenta individual)',
  gasto_sis:              'Gasto SIS (Seguro Invalidez y Sobrevivencia)',
  gasto_exp_vida:         'Gasto Seguro Social — Expectativa de Vida',
  gasto_rentabilidad:     'Gasto Seguro Social — Rentabilidad Protegida',
  gasto_afc_empleador:    'Gasto AFC Empleador',
  gasto_mutual:           'Gasto Seguro de Accidentes (Mutual / ISL)',
  gasto_correcciones:     'Gasto Correcciones de Meses Anteriores',
  gasto_finiquitos:       'Gasto Indemnizaciones y Feriado (Finiquitos)',
  // ── Haber (obligaciones) ──
  remuneraciones_pagar:   'Remuneraciones por Pagar',
  afp_pagar:              'AFP por Pagar',
  seguro_social_pagar:    'Seguro Social Previsional por Pagar',
  salud_pagar:            'Salud por Pagar',
  afc_pagar:              'Seguro de Cesantía por Pagar',
  mutual_pagar:           'Mutual / ISL por Pagar',
  iusc_pagar:             'Impuesto Único por Pagar',
  prestamos_personal:     'Préstamos y Anticipos al Personal',
  alimentos_pagar:        'Retención Pensión de Alimentos por Pagar',
  ccaf_pagar:             'CCAF por Pagar',
  otros_desc_pagar:       'Otros Descuentos por Pagar',
  finiquitos_pagar:       'Finiquitos por Pagar',
  recupero_correcciones:  'Recupero de Pagos en Exceso (Correcciones)',
};

// Nombres por defecto de la versión anterior: si siguen guardados tal
// cual (el usuario no los cambió), se reemplazan por el nombre nuevo.
const PLAN_CUENTAS_ANTERIOR = {
  otros_desc_pagar: 'Otros Descuentos por Pagar (Anticipos/Préstamos)',
};

let plan_cuentas = {};

function cargarPlanCuentas(){
  try{ plan_cuentas = { ...PLAN_CUENTAS_DEFAULT, ...(JSON.parse(localStorage.getItem(LOCAL_PLAN_CUENTAS))||{}) }; }
  catch{ plan_cuentas = { ...PLAN_CUENTAS_DEFAULT }; }
  Object.keys(PLAN_CUENTAS_ANTERIOR).forEach(k => {
    if(plan_cuentas[k] === PLAN_CUENTAS_ANTERIOR[k]) plan_cuentas[k] = PLAN_CUENTAS_DEFAULT[k];
  });
}
function guardarPlanCuentas(){
  localStorage.setItem(LOCAL_PLAN_CUENTAS, JSON.stringify(plan_cuentas));
}

/* ── INIT ───────────────────────────────────────────────── */
function initCentralizacion(){
  cargarLiquidaciones();
  cargarIndicadores();
  cargarPlanCuentas();

  const hoy    = new Date();
  const mesAnt = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
  const periodoDefault = `${mesAnt.getFullYear()}-${String(mesAnt.getMonth()+1).padStart(2,'0')}`;

  const sel = document.getElementById('cent-periodo-selector');
  if(sel && !sel.value) sel.value = periodoDefault;

  _poblarFiltroEmpresaCentralizacion();
  renderCentralizacion();
}

function _poblarFiltroEmpresaCentralizacion(){
  const sel = document.getElementById('cent-empresa-selector');
  if(!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">Todas las empresas (consolidado)</option>'
    + (empresas_propias||[]).map(e => `<option value="${e.id}">${e.nombre||e.razon_social}</option>`).join('');
  if(val) sel.value = val;
}

/* ✅ C6 (auditoría Centralización, 23-11-2026) — la empresa se toma del
   contrato de ESE período (_empresaDelPeriodo, mismo criterio que H9 en
   Liquidaciones), no de la empresa actual del trabajador. */
function _getLiquidacionesCentralizacion(periodo, empresaId){
  let lista = liquidaciones_guardadas.filter(l => l.periodo === periodo);
  if(empresaId) lista = lista.filter(l => _empresaDelPeriodo(l.rut, periodo) === empresaId);
  return lista;
}

function _getFiniquitosCentralizacion(periodo, empresaId){
  const lista = (typeof finiquitos_guardados !== 'undefined' ? finiquitos_guardados : [])
    .filter(f => (f.fecha_termino || '').slice(0,7) === periodo);
  return empresaId ? lista.filter(f => _empresaDelPeriodo(f.rut, periodo) === empresaId) : lista;
}

/* ════════════════════════════════════════════════════════
   MOTOR DEL ASIENTO CONTABLE
   ✅ Paso 1 Centralización (23-11-2026) — rehecho para que CUADRE:
   C1  antes el SIS iba al debe sin su contrapartida y el 0,1% del
       empleador al haber sin su gasto → descuadre en TODOS los meses
       ($10.080 con un sueldo de $600.000 + bono $100.000).
   C2  faltaban expectativa de vida, rentabilidad protegida y Mutual/ISL
       (el gasto quedaba $14.350 bajo el costo empresa del Libro).
   C3  préstamos y anticipos descontados se abonan a la cuenta de activo
       "Préstamos y Anticipos al Personal" (se recupera lo prestado, no
       es una deuda); alimentos y CCAF van a sus propias cuentas por pagar.
   C4  correcciones de meses cerrados (ajustes) con su propia cuenta.
   C5  finiquitos del mes: gasto (feriado + indemnizaciones, menos el
       aporte AFC imputado) contra finiquitos por pagar, alimentos y
       préstamos retenidos.
   Cuadra por construcción: haberes + aportes + ajustes = líquido +
   cotizaciones + descuentos; el redondeo o un líquido que no pudo ser
   negativo se informan como diferencia.
   ════════════════════════════════════════════════════════ */
function construirAsientoCentralizacion(periodo, empresaId){
  const lista = _getLiquidacionesCentralizacion(periodo, empresaId);
  const fins  = _getFiniquitosCentralizacion(periodo, empresaId);
  if(!lista.length && !fins.length) return { error: 'Sin liquidaciones ni finiquitos para este período' };

  const S = (fn) => lista.reduce((s,l) => s + Math.round(fn(l) || 0), 0);
  const F = (fn) => fins.reduce((s,f)  => s + Math.round(fn(f) || 0), 0);

  // Descuentos adicionales por tipo (C3)
  const desc = { prestamos:0, alimentos:0, ccaf:0, otros:0 };
  lista.forEach(l => {
    let clasificado = 0;
    (l.descuentos_adicionales || []).forEach(d => {
      const m = Math.round(parseFloat(d.monto) || 0);
      clasificado += m;
      if(d.tipo === 'prestamo' || d.tipo === 'anticipo') desc.prestamos += m;
      else if(d.tipo === 'retencion_judicial')            desc.alimentos += m;
      else if(d.tipo === 'caja_compensacion')             desc.ccaf      += m;
      else                                                desc.otros     += m;
    });
    desc.otros += Math.round(l.total_desc_adicionales || 0) - clasificado; // por si un dato antiguo no trae el detalle
  });

  const ajustes_pos = S(l => Math.max(0, l.total_ajustes || 0));
  const ajustes_neg = S(l => Math.max(0, -(l.total_ajustes || 0)));

  // Finiquitos (C5): el aporte AFC imputado lo paga el fondo de cesantía,
  // no la empresa, así que no es gasto ni deuda de la empresa.
  const fin_gasto     = F(f => (f.monto_vacaciones||0) + (f.monto_aviso_previo||0) + (f.monto_anios_servicio||0) + (f.sueldo_pendiente||0) - (f.descuento_afc||0));
  const fin_pagar     = F(f => f.total_a_pagar);
  const fin_alimentos = F(f => f.alimentos_aplicado);
  const fin_prestamos = F(f => f.descuentos_aplicados ?? f.total_descuentos);

  const pc = plan_cuentas;
  const debe = [
    { key:'gasto_remuneraciones', monto: S(l => l.total_haberes),                 glosa: 'Remuneraciones brutas del período (imponibles y no imponibles)' },
    { key:'gasto_afp_empleador',  monto: S(l => l.monto_afp_emp),                 glosa: 'Aporte empleador 0,1% a la cuenta individual (Reforma de Pensiones)' },
    { key:'gasto_sis',            monto: S(l => l.monto_sis),                     glosa: 'Cargo empleador — Seguro de Invalidez y Sobrevivencia' },
    { key:'gasto_exp_vida',       monto: S(l => l.monto_exp_vida),                glosa: 'Cargo empleador — Expectativa de Vida (Seguro Social)' },
    { key:'gasto_rentabilidad',   monto: S(l => l.monto_rentabilidad_protegida),  glosa: 'Cargo empleador — Rentabilidad Protegida (Seguro Social)' },
    { key:'gasto_afc_empleador',  monto: S(l => l.monto_afc_emp),                 glosa: 'Cargo empleador — Seguro de Cesantía' },
    { key:'gasto_mutual',         monto: S(l => l.monto_mutual),                  glosa: 'Cargo empleador — Seguro de accidentes del trabajo (Ley 16.744)' },
    { key:'gasto_correcciones',   monto: ajustes_pos,                             glosa: 'Montos pagados por correcciones de meses ya cerrados' },
    { key:'gasto_finiquitos',     monto: fin_gasto,                               glosa: `Feriado proporcional e indemnizaciones de ${fins.length} finiquito${fins.length===1?'':'s'} (menos aporte AFC imputado)` },
  ];
  const haber = [
    { key:'remuneraciones_pagar', monto: S(l => l.liquido),                       glosa: 'Líquido a pagar a trabajadores' },
    { key:'afp_pagar',            monto: S(l => l.monto_afp) + S(l => l.monto_afp_emp), glosa: 'Cotización AFP trabajador + 0,1% empleador' },
    { key:'seguro_social_pagar',  monto: S(l => l.monto_sis) + S(l => l.monto_exp_vida) + S(l => l.monto_rentabilidad_protegida), glosa: 'SIS + Expectativa de Vida + Rentabilidad Protegida (se pagan en Previred)' },
    { key:'salud_pagar',          monto: S(l => l.monto_salud),                   glosa: 'Cotización de salud (Fonasa / Isapre / parte CCAF)' },
    { key:'afc_pagar',            monto: S(l => l.monto_afc_trab) + S(l => l.monto_afc_emp), glosa: 'Seguro de Cesantía trabajador + empleador' },
    { key:'mutual_pagar',         monto: S(l => l.monto_mutual),                  glosa: 'Seguro de accidentes del trabajo' },
    { key:'iusc_pagar',           monto: S(l => l.iusc),                          glosa: 'Impuesto único de segunda categoría retenido' },
    { key:'prestamos_personal',   monto: desc.prestamos + fin_prestamos,          glosa: 'Recuperación de préstamos y anticipos (abono a la cuenta del personal)' },
    { key:'alimentos_pagar',      monto: desc.alimentos + fin_alimentos,          glosa: 'Retención judicial de pensión de alimentos (Ley 21.389)' },
    { key:'ccaf_pagar',           monto: desc.ccaf,                               glosa: 'Créditos sociales CCAF descontados' },
    { key:'otros_desc_pagar',     monto: desc.otros,                              glosa: 'Otros descuentos autorizados' },
    { key:'recupero_correcciones',monto: ajustes_neg,                             glosa: 'Descuentos por correcciones de meses ya cerrados' },
    { key:'finiquitos_pagar',     monto: fin_pagar,                               glosa: 'Total a pagar por finiquitos' },
  ];

  // Líquido que no pudo ser negativo (descuentos > haberes): la diferencia
  // queda como saldo a cobrar al trabajador, para que el asiento cuadre.
  const dif0 = debe.reduce((s,l)=>s+l.monto,0) - haber.reduce((s,l)=>s+l.monto,0);
  if(dif0 < 0) debe.push({ key:'prestamos_personal', monto: -dif0, glosa: 'Saldo de descuentos no cubierto por la remuneración (por cobrar al trabajador)' });

  const conNombre = arr => arr.filter(l => l.monto > 0).map(l => ({ ...l, cuenta: pc[l.key] || PLAN_CUENTAS_DEFAULT[l.key] }));
  const D = conNombre(debe), H = conNombre(haber);
  const total_debe  = D.reduce((s,l) => s + l.monto, 0);
  const total_haber = H.reduce((s,l) => s + l.monto, 0);
  const costo_empresa = S(l => l.total_haberes) + S(l => l.total_cargo_emp);

  return {
    periodo,
    trabajadores: lista.length,
    finiquitos: fins.length,
    debe: D, haber: H,
    total_debe, total_haber,
    costo_empresa,
    cuadrado: Math.abs(total_debe - total_haber) < 1,
    diferencia: total_debe - total_haber,
  };
}

/* ── RENDER PRINCIPAL ───────────────────────────────────── */
function renderCentralizacion(){
  const periodo   = document.getElementById('cent-periodo-selector')?.value || '';
  const empresaId = document.getElementById('cent-empresa-selector')?.value || '';
  const cont      = document.getElementById('cent-contenido');
  if(!cont) return;

  if(!periodo){
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--texto3);">Selecciona el período.</div>`;
    return;
  }

  const asiento = construirAsientoCentralizacion(periodo, empresaId);
  if(asiento.error){
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--texto3);">
      ${asiento.error}<br><br>
      <button class="btn btn-primary btn-sm" onclick="irA('remuneraciones')">
        <i class="ti ti-file-invoice"></i> Ir a Liquidaciones
      </button></div>`;
    return;
  }

  const fmtM = v => '$' + Math.round(v).toLocaleString('es-CL');

  cont.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
        <div>
          <div style="font-size:14px;font-weight:700;">Centralización contable — ${getNombreMes(periodo)}</div>
          <div style="font-size:12px;color:var(--texto2);">${asiento.trabajadores} liquidaci${asiento.trabajadores===1?'ón':'ones'}${asiento.finiquitos?` · ${asiento.finiquitos} finiquito${asiento.finiquitos>1?'s':''}`:''}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="_abrirEdicionPlanCuentas()"><i class="ti ti-list-details"></i> Plan de cuentas</button>
          <button class="btn btn-secondary btn-sm" onclick="imprimirCentralizacion()"><i class="ti ti-printer"></i> Imprimir</button>
          <button class="btn btn-primary btn-sm" onclick="exportarCentralizacionExcel()"><i class="ti ti-table-export"></i> Exportar Excel</button>
        </div>
      </div>

      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr style="background:#0f2942;">
            <th style="color:#fff;">Cuenta</th>
            <th style="color:#fff;text-align:right;">Debe</th>
            <th style="color:#fff;text-align:right;">Haber</th>
          </tr></thead>
          <tbody>
            ${asiento.debe.map(l => `<tr>
              <td style="font-size:13px;">${l.cuenta}<div style="font-size:11px;color:var(--texto3);">${l.glosa}</div></td>
              <td style="text-align:right;font-size:13px;">${fmtM(l.monto)}</td>
              <td></td>
            </tr>`).join('')}
            ${asiento.haber.map(l => `<tr>
              <td style="font-size:13px;">${l.cuenta}<div style="font-size:11px;color:var(--texto3);">${l.glosa}</div></td>
              <td></td>
              <td style="text-align:right;font-size:13px;">${fmtM(l.monto)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#1e293b;color:#fff;font-weight:700;">
              <td>TOTALES</td>
              <td style="text-align:right;">${fmtM(asiento.total_debe)}</td>
              <td style="text-align:right;">${fmtM(asiento.total_haber)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="margin-top:10px;font-size:13px;font-weight:600;${asiento.cuadrado ? 'color:#065f46;' : 'color:#dc2626;'}">
        ${asiento.cuadrado ? '✅ Asiento cuadrado' : `⚠️ Asiento descuadrado — diferencia de ${fmtM(Math.abs(asiento.diferencia))}`}
      </div>
    </div>

    <div id="cent-plan-cuentas-wrap" style="display:none;"></div>`;
}

/* ── EDICIÓN DEL PLAN DE CUENTAS (nombres genéricos, editables) ── */
function _abrirEdicionPlanCuentas(){
  const wrap = document.getElementById('cent-plan-cuentas-wrap');
  if(!wrap) return;
  const abierto = wrap.style.display !== 'none';
  if(abierto){ wrap.style.display = 'none'; return; }

  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="card" style="margin-top:14px;">
      <div class="card-title card-title-oscuro"><i class="ti ti-list-details"></i> Nombres de cuentas contables</div>
      <div style="font-size:12px;color:var(--texto2);margin-bottom:10px;">
        Ajusta los nombres para que calcen con tu plan de cuentas real. Se guardan localmente y se reutilizan en todos los períodos.
      </div>
      <div class="form-grid">
        ${Object.keys(PLAN_CUENTAS_DEFAULT).map(key => `
          <div class="form-group">
            <label>${PLAN_CUENTAS_DEFAULT[key]}</label>
            <input type="text" id="cent-cuenta-${key}" value="${plan_cuentas[key]||PLAN_CUENTAS_DEFAULT[key]}">
          </div>`).join('')}
      </div>
      <button class="btn btn-primary btn-sm" onclick="_guardarPlanCuentasUI()"><i class="ti ti-device-floppy"></i> Guardar plan de cuentas</button>
    </div>`;
}

function _guardarPlanCuentasUI(){
  Object.keys(PLAN_CUENTAS_DEFAULT).forEach(key => {
    const val = document.getElementById(`cent-cuenta-${key}`)?.value.trim();
    if(val) plan_cuentas[key] = val;
  });
  guardarPlanCuentas();
  toast('✅ Plan de cuentas actualizado', 'exito');
  renderCentralizacion();
}

/* ── IMPRIMIR ────────────────────────────────────────────── */
function imprimirCentralizacion(){
  const periodo   = document.getElementById('cent-periodo-selector')?.value || '';
  const empresaId = document.getElementById('cent-empresa-selector')?.value || '';
  const asiento   = construirAsientoCentralizacion(periodo, empresaId);
  if(asiento.error){ toast(`⚠️ ${asiento.error}`, 'error'); return; }
  const fmtM = v => '$' + Math.round(v).toLocaleString('es-CL');

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Centralización ${periodo}</title>
    <style>
      body{font-family:'Segoe UI',system-ui,sans-serif;margin:24px;font-size:13px;color:#1e293b;}
      table{width:100%;border-collapse:collapse;margin-top:14px;}
      th,td{padding:7px 9px;border-bottom:1px solid #e2e8f0;text-align:left;}
      th{background:#0f2942;color:#fff;font-size:11px;text-transform:uppercase;}
      td:nth-child(2),td:nth-child(3),th:nth-child(2),th:nth-child(3){text-align:right;}
      tfoot td{background:#1e293b;color:#fff;font-weight:700;}
    </style>
  </head><body>
    <h2 style="color:#0f2942;margin-bottom:2px;">Centralización Contable — Remuneraciones</h2>
    <p style="color:#64748b;">Período: ${getNombreMes(periodo)} · ${asiento.trabajadores} trabajadores</p>
    <table>
      <thead><tr><th>Cuenta</th><th>Debe</th><th>Haber</th></tr></thead>
      <tbody>
        ${asiento.debe.map(l=>`<tr><td>${l.cuenta}</td><td>${fmtM(l.monto)}</td><td></td></tr>`).join('')}
        ${asiento.haber.map(l=>`<tr><td>${l.cuenta}</td><td></td><td>${fmtM(l.monto)}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td>TOTALES</td><td>${fmtM(asiento.total_debe)}</td><td>${fmtM(asiento.total_haber)}</td></tr></tfoot>
    </table>
    <script>setTimeout(()=>window.print(),600);<\/script>
  </body></html>`);
  win.document.close();
}

/* ── EXPORTAR EXCEL ──────────────────────────────────────── */
function exportarCentralizacionExcel(){
  const periodo   = document.getElementById('cent-periodo-selector')?.value || '';
  const empresaId = document.getElementById('cent-empresa-selector')?.value || '';
  const asiento   = construirAsientoCentralizacion(periodo, empresaId);
  if(asiento.error){ toast(`⚠️ ${asiento.error}`, 'error'); return; }

  const rows = [
    ...asiento.debe.map(l => ({ Cuenta: l.cuenta, Glosa: l.glosa, Debe: Math.round(l.monto), Haber: 0 })),
    ...asiento.haber.map(l => ({ Cuenta: l.cuenta, Glosa: l.glosa, Debe: 0, Haber: Math.round(l.monto) })),
    { Cuenta: 'TOTALES', Glosa: '', Debe: Math.round(asiento.total_debe), Haber: Math.round(asiento.total_haber) },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:38},{wch:44},{wch:14},{wch:14}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Centralización');
  XLSX.writeFile(wb, `Centralizacion_${periodo}.xlsx`);
  toast('⬇️ Excel exportado', 'exito');
}
