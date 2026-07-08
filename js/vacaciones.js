/* ════════════════════════════════════════════════════════
   VACACIONES.JS — Feriado legal y proporcional
   Base legal:
   · Art. 67 CT — 15 días hábiles de feriado por año de servicio
   · Art. 73 CT — feriado proporcional al término del contrato
   · Se excluyen del cómputo sábado, domingo y festivos (se
     usa el estándar de 1,25 días hábiles devengados por mes)
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

const LOCAL_VAC_EXTRA = 'agro_vacaciones_extra'; // ajustes manuales (feriado progresivo Art. 68, saldos migrados)
let vacaciones_extra = {};

const DIAS_FERIADO_ANUAL = 15;
const DIAS_FERIADO_MES   = DIAS_FERIADO_ANUAL / 12; // 1,25 días hábiles devengados por mes de servicio

/* ── CARGA / GUARDADO ───────────────────────────────────── */
function cargarVacacionesExtra(){
  try{ vacaciones_extra = JSON.parse(localStorage.getItem(LOCAL_VAC_EXTRA)) || {}; }
  catch{ vacaciones_extra = {}; }
}
function guardarVacacionesExtra(){
  localStorage.setItem(LOCAL_VAC_EXTRA, JSON.stringify(vacaciones_extra));
}

/* ── INIT ───────────────────────────────────────────────── */
function initVacaciones(){
  cargarGestionLaboral();
  cargarVacacionesExtra();
  switchTabRem('rem-vacaciones');

  const sel = document.getElementById('vac-empresa-selector');
  if(sel) _poblarFiltroEmpresaVacaciones();

  renderVacaciones();
}

function _poblarFiltroEmpresaVacaciones(){
  const sel = document.getElementById('vac-empresa-selector');
  if(!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">Todas las empresas</option>'
    + (empresas_propias||[]).map(e => `<option value="${e.id}">${e.nombre||e.razon_social}</option>`).join('');
  if(val) sel.value = val;
}

/* ════════════════════════════════════════════════════════
   MOTOR DE CÁLCULO — reutilizable por finiquitos.js
   ════════════════════════════════════════════════════════ */

/* Antigüedad completa en meses entre dos fechas */
function _mesesCompletos(fechaInicio, fechaCorte){
  const ini = new Date(fechaInicio);
  const fin = new Date(fechaCorte);
  let meses = (fin.getFullYear() - ini.getFullYear()) * 12 + (fin.getMonth() - ini.getMonth());
  if(fin.getDate() < ini.getDate()) meses--;
  return Math.max(0, meses);
}

/* Días de feriado progresivo Art. 68 CT — ajuste manual guardado por rut */
function getDiasProgresivoManual(rut){
  return parseFloat(vacaciones_extra[rut]?.dias_progresivo) || 0;
}

function setDiasProgresivoManual(rut, dias){
  vacaciones_extra[rut] = { ...(vacaciones_extra[rut]||{}), dias_progresivo: parseFloat(dias)||0 };
  guardarVacacionesExtra();
}

/* Días de feriado ya tomados (novedades tipo 'vacaciones' aprobadas), opcionalmente hasta una fecha de corte */
function _diasVacacionesTomados(rut, fechaCorte){
  return (novedades||[])
    .filter(n => n.trabajador_rut === rut && n.tipo === 'vacaciones' && n.aprobado)
    .filter(n => !fechaCorte || new Date(n.fecha_inicio) <= new Date(fechaCorte))
    .reduce((s,n) => s + (parseInt(n.dias)||0), 0);
}

/* Cálculo completo del saldo de vacaciones de un trabajador a una fecha de corte (por defecto hoy) */
function calcularSaldoVacaciones(rut, fechaCorte){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return { error: `Trabajador ${rut} no encontrado` };

  const corte = fechaCorte || new Date().toISOString().slice(0,10);
  const contrato = (contratos||[])
    .filter(c => c.trabajador_rut === rut)
    .sort((a,b) => new Date(a.fecha_inicio||0) - new Date(b.fecha_inicio||0))[0];

  const fechaIngreso = contrato?.fecha_inicio || t.fecha_ingreso;
  if(!fechaIngreso) return { error: `Sin fecha de ingreso para ${rut}` };

  const meses = _mesesCompletos(fechaIngreso, corte);
  const dias_devengados_base = +(meses * DIAS_FERIADO_MES).toFixed(2);
  const dias_progresivo      = getDiasProgresivoManual(rut);
  const dias_devengados_total = +(dias_devengados_base + dias_progresivo).toFixed(2);
  const dias_tomados         = _diasVacacionesTomados(rut, corte);
  const dias_saldo           = +(dias_devengados_total - dias_tomados).toFixed(2);

  // Valor día para pago proporcional (mismo criterio que liquidaciones: sueldo base / 30)
  const sueldoInfo = _getSueldoBase(rut, corte.slice(0,7));
  const sueldo_base = sueldoInfo?.monto || parseFloat(contrato?.sueldo_monto) || 0;
  const valor_dia_habil = sueldo_base > 0 ? Math.round(sueldo_base / DIVISOR_MES) : 0;
  const monto_saldo_pendiente = Math.max(0, Math.round(dias_saldo * valor_dia_habil));

  return {
    rut, nombre: t.nombre,
    fecha_ingreso: fechaIngreso,
    fecha_corte: corte,
    antiguedad_meses: meses,
    antiguedad_anios: +(meses/12).toFixed(1),
    dias_devengados_base,
    dias_progresivo,
    dias_devengados_total,
    dias_tomados,
    dias_saldo,
    sueldo_base,
    valor_dia_habil,
    monto_saldo_pendiente,
  };
}

/* ════════════════════════════════════════════════════════
   RENDER PRINCIPAL — tabla de saldos
   ════════════════════════════════════════════════════════ */
function renderVacaciones(){
  const empresaId = document.getElementById('vac-empresa-selector')?.value || '';
  const buscar     = (document.getElementById('vac-buscar')?.value || '').toLowerCase();
  const tbody      = document.getElementById('tbody-vacaciones');
  if(!tbody) return;

  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(empresaId) lista = lista.filter(t => t.empresa_propia_id === empresaId);
  if(buscar) lista = lista.filter(t => t.nombre?.toLowerCase().includes(buscar) || t.rut?.toLowerCase().includes(buscar));

  const saldos = lista.map(t => calcularSaldoVacaciones(t.rut)).filter(s => !s.error);

  _renderKPIsVacaciones(saldos);

  if(!saldos.length){
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--texto3);">
      Sin trabajadores para mostrar</td></tr>`;
    return;
  }

  tbody.innerHTML = saldos.map(s => {
    const alerta = s.dias_saldo > 20; // acumulación excesiva — riesgo de fiscalización DT
    return `<tr>
      <td style="font-size:12px;font-family:monospace;">${s.rut}</td>
      <td style="font-size:13px;font-weight:500;">${s.nombre}</td>
      <td style="font-size:12px;">${fmtFecha(s.fecha_ingreso)}</td>
      <td style="font-size:12px;text-align:center;">${s.antiguedad_anios} años</td>
      <td style="font-size:12px;text-align:center;">${s.dias_devengados_total}</td>
      <td style="font-size:12px;text-align:center;">${s.dias_tomados}</td>
      <td style="font-size:13px;text-align:center;font-weight:700;${alerta?'color:#dc2626;':'color:#065f46;'}">
        ${s.dias_saldo} ${alerta ? '<i class="ti ti-alert-triangle" title="Saldo alto — riesgo de fiscalización"></i>' : ''}
      </td>
      <td style="display:flex;gap:5px;">
        <button class="btn btn-secondary btn-sm" onclick="_abrirAjusteProgresivo('${s.rut}')" title="Ajuste feriado progresivo">
          <i class="ti ti-adjustments"></i>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="imprimirCertificadoVacaciones('${s.rut}')" title="Certificado de saldo">
          <i class="ti ti-printer"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function _renderKPIsVacaciones(saldos){
  const setKPI = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setKPI('vac-kpi-trab',   saldos.length);
  setKPI('vac-kpi-saldo-total', saldos.reduce((s,x)=>s+x.dias_saldo,0).toFixed(1));
  setKPI('vac-kpi-alerta', saldos.filter(x=>x.dias_saldo>20).length);
  const montoTotal = saldos.reduce((s,x)=>s+x.monto_saldo_pendiente,0);
  setKPI('vac-kpi-provision', '$'+Math.round(montoTotal).toLocaleString('es-CL'));
}

/* ── AJUSTE MANUAL DE FERIADO PROGRESIVO (Art. 68 CT) ───── */
function _abrirAjusteProgresivo(rut){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return;
  const actual = getDiasProgresivoManual(rut);
  const nuevo = prompt(
    `Días adicionales por feriado progresivo (Art. 68 CT) para ${t.nombre}.\n` +
    `Corresponde a 1 día extra por cada 3 nuevos años trabajados para el mismo empleador, sobre los primeros 10 años.\n` +
    `Valor actual: ${actual}`, actual
  );
  if(nuevo === null) return;
  const dias = parseFloat(nuevo);
  if(isNaN(dias) || dias < 0){ toast('⚠️ Ingresa un número válido', 'error'); return; }
  setDiasProgresivoManual(rut, dias);
  toast('✅ Ajuste guardado', 'exito');
  renderVacaciones();
}

/* ── EXPORTAR EXCEL ──────────────────────────────────────── */
function exportarVacacionesExcel(){
  const empresaId = document.getElementById('vac-empresa-selector')?.value || '';
  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(empresaId) lista = lista.filter(t => t.empresa_propia_id === empresaId);
  const saldos = lista.map(t => calcularSaldoVacaciones(t.rut)).filter(s => !s.error);
  if(!saldos.length){ toast('⚠️ Sin datos para exportar', 'error'); return; }

  const rows = saldos.map(s => ({
    'RUT': s.rut, 'Nombre': s.nombre,
    'Fecha ingreso': s.fecha_ingreso,
    'Antigüedad (años)': s.antiguedad_anios,
    'Días devengados (base)': s.dias_devengados_base,
    'Días progresivo Art. 68': s.dias_progresivo,
    'Total devengado': s.dias_devengados_total,
    'Días tomados': s.dias_tomados,
    'Saldo pendiente (días)': s.dias_saldo,
    'Valor día': s.valor_dia_habil,
    'Provisión $': s.monto_saldo_pendiente,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.min(Math.max(k.length+2, 10), 24) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vacaciones');
  XLSX.writeFile(wb, `Saldo_Vacaciones_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('⬇️ Excel exportado', 'exito');
}

/* ── CERTIFICADO IMPRIMIBLE DE SALDO ────────────────────── */
function imprimirCertificadoVacaciones(rut){
  const s = calcularSaldoVacaciones(rut);
  if(s.error){ toast(`❌ ${s.error}`, 'error'); return; }
  const t  = trabajadores.find(x => x.rut === rut);
  const ep = getEmpresaEmpleadora(t?.empresa_propia_id);

  const win = window.open('', '_blank', 'width=800,height=650');
  win.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"><title>Certificado de vacaciones — ${s.nombre}</title>
    <style>
      body{font-family:'Segoe UI',system-ui,sans-serif;margin:32px;color:#1e293b;}
      h2{color:#0f2942;margin-bottom:2px;}
      .sub{color:#64748b;font-size:13px;margin-bottom:20px;}
      table{width:100%;border-collapse:collapse;margin:16px 0;}
      td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;}
      td:first-child{color:#64748b;width:55%;}
      td:last-child{font-weight:600;text-align:right;}
      .destacado{background:#f0fdf4;border-radius:8px;}
      .destacado td{font-size:15px;color:#065f46;font-weight:700;}
      .firma{margin-top:60px;border-top:1px dashed #cbd5e1;padding-top:8px;width:280px;text-align:center;font-size:12px;color:#475569;}
      @media print{@page{margin:15mm;}}
    </style>
  </head><body>
    <h2>Certificado de Saldo de Vacaciones</h2>
    <div class="sub">${ep?.razon_social||ep?.nombre||'—'} · Emitido el ${new Date().toLocaleDateString('es-CL')}</div>
    <table>
      <tr><td>Trabajador</td><td>${s.nombre}</td></tr>
      <tr><td>RUT</td><td>${s.rut}</td></tr>
      <tr><td>Fecha de ingreso</td><td>${fmtFecha(s.fecha_ingreso)}</td></tr>
      <tr><td>Antigüedad</td><td>${s.antiguedad_anios} años (${s.antiguedad_meses} meses)</td></tr>
      <tr><td>Días devengados (1,25 día hábil/mes — Art. 67 CT)</td><td>${s.dias_devengados_base}</td></tr>
      <tr><td>Días adicionales feriado progresivo (Art. 68 CT)</td><td>${s.dias_progresivo}</td></tr>
      <tr><td>Total días devengados</td><td>${s.dias_devengados_total}</td></tr>
      <tr><td>Días ya tomados</td><td>${s.dias_tomados}</td></tr>
      <tr class="destacado"><td>Saldo pendiente</td><td>${s.dias_saldo} días</td></tr>
      <tr><td>Valor día hábil (sueldo base / 30)</td><td>$${s.valor_dia_habil.toLocaleString('es-CL')}</td></tr>
      <tr class="destacado"><td>Provisión estimada</td><td>$${s.monto_saldo_pendiente.toLocaleString('es-CL')}</td></tr>
    </table>
    <div class="firma">Firma empleador</div>
    <script>setTimeout(()=>window.print(),500);<\/script>
  </body></html>`);
  win.document.close();
}

/* ── UTILIDAD LOCAL (evita depender del orden de carga de otros JS) ── */
function fmtFecha(f){
  if(!f) return '—';
  return new Date(f+'T12:00:00').toLocaleDateString('es-CL');
}
