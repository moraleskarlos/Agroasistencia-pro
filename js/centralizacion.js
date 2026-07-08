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
  gasto_remuneraciones:   'Gasto Sueldos y Salarios',
  remuneraciones_pagar:   'Remuneraciones por Pagar',
  afp_pagar:               'AFP por Pagar',
  salud_pagar:             'Salud por Pagar',
  afc_pagar:               'Seguro de Cesantía por Pagar',
  iusc_pagar:               'Impuesto Único por Pagar',
  otros_desc_pagar:        'Otros Descuentos por Pagar (Anticipos/Préstamos)',
  gasto_sis:                'Gasto SIS (Seguro Invalidez y Sobrevivencia)',
  gasto_afc_empleador:     'Gasto AFC Empleador',
};

let plan_cuentas = {};

function cargarPlanCuentas(){
  try{ plan_cuentas = { ...PLAN_CUENTAS_DEFAULT, ...(JSON.parse(localStorage.getItem(LOCAL_PLAN_CUENTAS))||{}) }; }
  catch{ plan_cuentas = { ...PLAN_CUENTAS_DEFAULT }; }
}
function guardarPlanCuentas(){
  localStorage.setItem(LOCAL_PLAN_CUENTAS, JSON.stringify(plan_cuentas));
}

/* ── INIT ───────────────────────────────────────────────── */
function initCentralizacion(){
  cargarLiquidaciones();
  cargarIndicadores();
  cargarPlanCuentas();
  switchTabRem('rem-centralizacion');

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

function _getLiquidacionesCentralizacion(periodo, empresaId){
  let lista = liquidaciones_guardadas.filter(l => l.periodo === periodo);
  if(empresaId){
    lista = lista.filter(l => {
      const t = trabajadores.find(x => x.rut === l.rut);
      return t?.empresa_propia_id === empresaId;
    });
  }
  return lista;
}

/* ════════════════════════════════════════════════════════
   MOTOR DEL ASIENTO CONTABLE
   ════════════════════════════════════════════════════════ */
function construirAsientoCentralizacion(periodo, empresaId){
  const lista = _getLiquidacionesCentralizacion(periodo, empresaId);
  if(!lista.length) return { error: 'Sin liquidaciones para este período' };

  const total_haberes    = lista.reduce((s,l) => s + (l.total_haberes||0), 0);
  const total_afp         = lista.reduce((s,l) => s + (l.monto_afp||0), 0);
  const total_salud       = lista.reduce((s,l) => s + (l.monto_salud||0), 0);
  const total_afc_trab    = lista.reduce((s,l) => s + (l.monto_afc_trab||0), 0);
  const total_iusc        = lista.reduce((s,l) => s + (l.iusc||0), 0);
  const total_otros_desc  = lista.reduce((s,l) => s + (l.total_desc_adicionales||0), 0);
  const total_liquido     = lista.reduce((s,l) => s + (l.liquido||0), 0);
  // Cargo empleador (no forma parte del líquido, pero sí del gasto total)
  const total_afp_emp     = lista.reduce((s,l) => s + (l.monto_afp_emp||0), 0);
  const total_sis         = lista.reduce((s,l) => s + (l.monto_sis||0), 0);
  const total_afc_emp     = lista.reduce((s,l) => s + (l.monto_afc_emp||0), 0);

  const total_prev_pagar_afp   = total_afp + total_afp_emp;      // AFP trabajador + empleador se pagan juntas
  const total_prev_pagar_afc   = total_afc_trab + total_afc_emp; // AFC trabajador + empleador se pagan juntas

  const debe = [
    { cuenta: plan_cuentas.gasto_remuneraciones, monto: total_haberes,  glosa: 'Gasto por remuneraciones brutas del período' },
    { cuenta: plan_cuentas.gasto_sis,             monto: total_sis,      glosa: 'Cargo empleador — Seguro de Invalidez y Sobrevivencia' },
    { cuenta: plan_cuentas.gasto_afc_empleador,   monto: total_afc_emp,  glosa: 'Cargo empleador — Seguro de Cesantía' },
  ].filter(l => l.monto > 0);

  const haber = [
    { cuenta: plan_cuentas.remuneraciones_pagar, monto: total_liquido,        glosa: 'Líquido a pagar a trabajadores' },
    { cuenta: plan_cuentas.afp_pagar,             monto: total_prev_pagar_afp, glosa: 'Cotización AFP trabajador + empleador' },
    { cuenta: plan_cuentas.salud_pagar,           monto: total_salud,          glosa: 'Cotización de salud (Fonasa/Isapre)' },
    { cuenta: plan_cuentas.afc_pagar,             monto: total_prev_pagar_afc, glosa: 'Cotización AFC trabajador + empleador' },
    { cuenta: plan_cuentas.iusc_pagar,             monto: total_iusc,           glosa: 'Impuesto único de segunda categoría retenido' },
    { cuenta: plan_cuentas.otros_desc_pagar,       monto: total_otros_desc,     glosa: 'Anticipos y préstamos descontados' },
  ].filter(l => l.monto > 0);

  const total_debe  = debe.reduce((s,l) => s + l.monto, 0);
  const total_haber = haber.reduce((s,l) => s + l.monto, 0);

  return {
    periodo,
    trabajadores: lista.length,
    debe, haber,
    total_debe, total_haber,
    cuadrado: Math.abs(total_debe - total_haber) < 1, // tolerancia de redondeo
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
      <button class="btn btn-primary btn-sm" onclick="switchTabRem('rem-liquidaciones')">
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
          <div style="font-size:12px;color:var(--texto2);">${asiento.trabajadores} trabajador${asiento.trabajadores>1?'es':''}</div>
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
      <div class="card-title"><i class="ti ti-list-details"></i> Nombres de cuentas contables</div>
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
