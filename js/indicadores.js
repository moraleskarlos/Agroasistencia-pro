/* ════════════════════════════════════════════════════════
   INDICADORES.JS — Indicadores previsionales mensuales
   Ingreso 100% manual, organizado por secciones A–F
   AgroContratista · Versión 2.0
   ════════════════════════════════════════════════════════ */

/* ── TABS DEL MÓDULO REMUNERACIONES ────────────────────── */
function switchTabRem(tab){
  document.querySelectorAll('[id^="tab-rem-"]').forEach(btn => {
    const activo = btn.id === 'tab-' + tab;
    btn.style.color            = activo ? 'var(--verde-dark)' : 'var(--texto2)';
    btn.style.borderBottomColor= activo ? 'var(--verde-dark)' : 'transparent';
    btn.style.fontWeight       = activo ? '700' : '600';
  });
  document.querySelectorAll('[id^="panel-rem-"]').forEach(panel => {
    panel.style.display = panel.id === 'panel-' + tab ? 'block' : 'none';
  });
}

/* ── CONSTANTES ─────────────────────────────────────────── */
const LOCAL_INDICADORES = 'agro_indicadores';

/* ── ESTADO ─────────────────────────────────────────────── */
let indicadores = [];

/* ── CARGA / GUARDADO ───────────────────────────────────── */
function cargarIndicadores(){
  try{ indicadores = JSON.parse(localStorage.getItem(LOCAL_INDICADORES)) || []; }
  catch{ indicadores = []; }
}

function guardarIndicadores(){
  localStorage.setItem(LOCAL_INDICADORES, JSON.stringify(indicadores));
}

function getIndicadoresPorPeriodo(periodo){
  return indicadores.find(i => i.periodo === periodo) || null;
}

/* ── ALERTA DE INDICADORES PENDIENTES ──────────────────── */
function getPeriodoActual(){
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
}

function getNombreMes(periodo){
  if(!periodo) return '';
  const [anio, mes] = periodo.split('-');
  return new Date(anio, mes-1, 1)
    .toLocaleDateString('es-CL', { month:'long', year:'numeric' });
}

function verificarAlertaIndicadores(){
  const periodo   = getPeriodoActual();
  const existe    = getIndicadoresPorPeriodo(periodo);
  const nombre    = getNombreMes(periodo);

  // Dashboard
  const elDash = document.getElementById('dash-alerta-indicadores');
  if(elDash){
    if(!existe){
      elDash.style.display = 'flex';
      elDash.innerHTML = `
        <i class="ti ti-alert-triangle" style="font-size:18px;flex-shrink:0;"></i>
        <div style="flex:1;">
          <strong>Indicadores previsionales de ${nombre} no registrados</strong>
          <div style="font-size:12px;margin-top:2px;opacity:.85;">
            Actualiza los valores antes de procesar liquidaciones de este período.
          </div>
        </div>
        <button onclick="irA('remuneraciones',null)" class="btn btn-sm"
          style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.3);flex-shrink:0;">
          <i class="ti ti-arrow-right"></i> Ir ahora
        </button>`;
    } else {
      elDash.style.display = 'flex';
      elDash.innerHTML = `
        <i class="ti ti-circle-check" style="font-size:18px;flex-shrink:0;color:#A7F3D0;"></i>
        <div style="font-size:13px;">
          <strong>Indicadores de ${nombre} al día</strong>
          <span style="font-size:11px;opacity:.8;margin-left:8px;">UF $${existe.uf?.toLocaleString('es-CL')||'—'} · UTM $${existe.utm?.toLocaleString('es-CL')||'—'}</span>
        </div>`;
      elDash.style.background = 'linear-gradient(135deg,#065F46,#059669)';
    }
  }

  // Remuneraciones
  const elRem = document.getElementById('rem-alerta-indicadores');
  if(elRem){
    if(!existe){
      elRem.style.display = 'flex';
      elRem.innerHTML = `
        <i class="ti ti-alert-triangle" style="font-size:16px;flex-shrink:0;color:#D97706;"></i>
        <div style="flex:1;font-size:13px;color:#92400E;">
          <strong>Faltan los indicadores de ${nombre}.</strong>
          Los indicadores previsionales cambian cada mes. Ingresa los valores antes de calcular liquidaciones.
        </div>`;
    } else {
      elRem.style.display = 'none';
    }
  }
}

/* ── FORMATEO DE NÚMEROS CON SEPARADOR DE MILES ─────────── */
function formatearMiles(input){
  // Guarda posición del cursor
  let val = input.value.replace(/\./g,'').replace(/[^0-9]/g,'');
  if(val === '') { input.value = ''; return; }
  input.value = parseInt(val,10).toLocaleString('es-CL');
}

function formatearDecimal(input){
  // Permite hasta 2 decimales con coma
  let val = input.value.replace(/[^0-9,\.]/g,'');
  input.value = val;
}

function parsearMiles(str){
  if(!str && str !== 0) return null;
  const limpio = String(str).replace(/\./g,'').replace(/,/g,'.').trim();
  const num = parseFloat(limpio);
  return isNaN(num) ? null : num;
}

function parsearDecimal(str){
  if(!str && str !== 0) return null;
  const limpio = String(str).replace(/,/g,'.').trim();
  const num = parseFloat(limpio);
  return isNaN(num) ? null : num;
}

/* ── INIT DEL MÓDULO ────────────────────────────────────── */
function initIndicadores(){
  cargarIndicadores();
  switchTabRem('rem-indicadores');
  verificarAlertaIndicadores();

  // Período por defecto: mes actual
  const sel = document.getElementById('ind-periodo-selector');
  if(sel && !sel.value) sel.value = getPeriodoActual();

  renderListaIndicadores();
  const periodo = document.getElementById('ind-periodo-selector')?.value || getPeriodoActual();
  renderDetalleIndicador(periodo);

  // Ocultar formulario si no hay nada en edición
  const wrap = document.getElementById('ind-form-wrap');
  if(wrap) wrap.style.display = 'none';
}

/* ── LISTA HISTÓRICA DE PERÍODOS ────────────────────────── */
function renderListaIndicadores(){
  const tbody = document.getElementById('tbody-indicadores');
  if(!tbody) return;

  if(!indicadores.length){
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--texto3);">
      Sin períodos registrados — ingresa el primer período manualmente</td></tr>`;
    return;
  }

  const ordenados = [...indicadores].sort((a,b) => b.periodo.localeCompare(a.periodo));
  tbody.innerHTML = ordenados.map(ind => {
    const nombre = getNombreMes(ind.periodo);
    const actual = ind.periodo === getPeriodoActual();
    return `<tr style="cursor:pointer;" onclick="seleccionarPeriodoIndicador('${ind.periodo}')">
      <td style="font-size:13px;font-weight:600;text-transform:capitalize;">
        ${nombre}${actual ? ' <span class="badge badge-verde" style="margin-left:6px;">Mes actual</span>' : ''}
      </td>
      <td style="font-size:12px;">$${ind.uf?.toLocaleString('es-CL')||'—'}</td>
      <td style="font-size:12px;">$${ind.utm?.toLocaleString('es-CL')||'—'}</td>
      <td style="font-size:12px;">$${ind.tope_imponible_afp?.toLocaleString('es-CL')||'—'}</td>
      <td>
        <button class="btn btn-secondary btn-sm"
          onclick="event.stopPropagation();editarIndicadorExistente('${ind.periodo}')">
          <i class="ti ti-edit"></i>
        </button>
        <button class="btn btn-danger btn-sm" style="margin-left:4px;"
          onclick="event.stopPropagation();eliminarIndicadorPeriodo('${ind.periodo}')">
          <i class="ti ti-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function seleccionarPeriodoIndicador(periodo){
  const sel = document.getElementById('ind-periodo-selector');
  if(sel) sel.value = periodo;
  renderDetalleIndicador(periodo);
}

/* ── FORMULARIO INGRESO / EDICIÓN ───────────────────────── */
function nuevoIndicadorManual(){
  const periodo = document.getElementById('ind-periodo-selector')?.value || getPeriodoActual();
  const existente = getIndicadoresPorPeriodo(periodo);
  _llenarFormulario(existente || { periodo });
  document.getElementById('ind-form-wrap').style.display = 'block';
  document.getElementById('ind-form-wrap').scrollIntoView({ behavior:'smooth', block:'start' });
}

function editarIndicadorExistente(periodo){
  const ind = getIndicadoresPorPeriodo(periodo);
  if(!ind) return;
  const sel = document.getElementById('ind-periodo-selector');
  if(sel) sel.value = periodo;
  _llenarFormulario(ind);
  document.getElementById('ind-form-wrap').style.display = 'block';
  document.getElementById('ind-form-wrap').scrollIntoView({ behavior:'smooth', block:'start' });
}

function _llenarFormulario(ind){
  const setM = (id, val) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.value = val != null ? parseInt(val).toLocaleString('es-CL') : '';
  };
  const setD = (id, val) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.value = val != null ? String(val).replace('.',',') : '';
  };
  const setT = (id, val) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.value = val ?? '';
  };

  setT('ind-f-periodo', ind.periodo || getPeriodoActual());

  // A — Generales
  setM('ind-f-uf',  ind.uf ? Math.round(ind.uf) : null);
  // UF tiene decimales
  const elUF = document.getElementById('ind-f-uf');
  if(elUF && ind.uf) elUF.value = ind.uf.toLocaleString('es-CL', {minimumFractionDigits:2, maximumFractionDigits:2});
  setM('ind-f-utm', ind.utm);
  setM('ind-f-uta', ind.uta);

  // B — Topes y Rentas
  setM('ind-f-tope-afp', ind.tope_imponible_afp);
  setM('ind-f-tope-afc', ind.tope_imponible_afc);
  setM('ind-f-renta-min', ind.renta_minima);
  setM('ind-f-renta-menor18', ind.renta_menor18);
  setM('ind-f-renta-casa', ind.renta_casa_particular);

  // D — SIS
  setD('ind-f-sis', ind.sis);

  // C — AFP
  const afpKeys = ['capital','cuprum','habitat','planvital','provida','modelo','uno'];
  afpKeys.forEach(key => {
    setD(`ind-f-afp-${key}-trab`, ind.afp?.[key]?.trabajador);
    setD(`ind-f-afp-${key}-emp`,  ind.afp?.[key]?.empleador);
    setD(`ind-f-afp-${key}-tot`,  ind.afp?.[key]?.total);
  });

  // E — AFC
  setD('ind-f-afc-indef-emp',  ind.afc?.indefinido?.empleador);
  setD('ind-f-afc-indef-trab', ind.afc?.indefinido?.trabajador);
  setD('ind-f-afc-fijo-emp',   ind.afc?.fijo?.empleador);
  setD('ind-f-afc-11-emp',     ind.afc?.indefinido_11anios?.empleador);
  setD('ind-f-afc-casa-emp',   ind.afc?.casa_particular?.empleador);

  // F — Asignación Familiar
  const af = ind.asignacion_familiar || [];
  ['A','B','C','D'].forEach(tramo => {
    const dato = af.find(a => a.tramo === tramo);
    setM(`ind-f-af-${tramo}-monto`, dato?.monto);
    setM(`ind-f-af-${tramo}-hasta`, dato?.hasta);
  });
}

function cancelarFormularioIndicador(){
  document.getElementById('ind-form-wrap').style.display = 'none';
}

/* ── GUARDAR ────────────────────────────────────────────── */
function guardarIndicadorPeriodo(){
  const getT = id => document.getElementById(id)?.value?.trim() || null;
  const getM = id => parsearMiles(document.getElementById(id)?.value);
  const getD = id => parsearDecimal(document.getElementById(id)?.value);

  const periodo = getT('ind-f-periodo');
  if(!periodo || !/^\d{4}-\d{2}$/.test(periodo)){
    toast('⚠️ Período inválido — usa el formato AAAA-MM (ej: 2025-09)', 'error');
    return;
  }

  // UF tiene formato especial con coma decimal
  const ufRaw = document.getElementById('ind-f-uf')?.value || '';
  const uf    = parsearMiles(ufRaw.replace(/,(\d{2})$/, '')) +
                (ufRaw.includes(',') ? parseFloat('0.'+ufRaw.split(',').pop()) : 0);

  const afpKeys = ['capital','cuprum','habitat','planvital','provida','modelo','uno'];
  const afp = {};
  afpKeys.forEach(key => {
    afp[key] = {
      trabajador: getD(`ind-f-afp-${key}-trab`),
      empleador:  getD(`ind-f-afp-${key}-emp`),
      total:      getD(`ind-f-afp-${key}-tot`),
    };
  });

  const nuevoIndicador = {
    periodo,
    uf:                  getM('ind-f-uf') || uf,
    utm:                 getM('ind-f-utm'),
    uta:                 getM('ind-f-uta'),
    tope_imponible_afp:  getM('ind-f-tope-afp'),
    tope_imponible_afc:  getM('ind-f-tope-afc'),
    renta_minima:        getM('ind-f-renta-min'),
    renta_menor18:       getM('ind-f-renta-menor18'),
    renta_casa_particular: getM('ind-f-renta-casa'),
    sis:                 getD('ind-f-sis'),
    afp,
    afc: {
      indefinido:         { empleador: getD('ind-f-afc-indef-emp'), trabajador: getD('ind-f-afc-indef-trab') },
      fijo:               { empleador: getD('ind-f-afc-fijo-emp'),  trabajador: 0 },
      indefinido_11anios: { empleador: getD('ind-f-afc-11-emp'),    trabajador: 0 },
      casa_particular:    { empleador: getD('ind-f-afc-casa-emp'),  trabajador: 0 },
    },
    asignacion_familiar: ['A','B','C','D'].map(tramo => ({
      tramo,
      monto: getM(`ind-f-af-${tramo}-monto`) ?? 0,
      hasta: getM(`ind-f-af-${tramo}-hasta`) ?? null,
    })),
    fecha_registro: new Date().toISOString().slice(0,10),
  };

  const idx = indicadores.findIndex(i => i.periodo === periodo);
  if(idx >= 0) indicadores[idx] = nuevoIndicador;
  else indicadores.push(nuevoIndicador);

  guardarIndicadores();
  toast(`✅ Indicadores de ${getNombreMes(periodo)} guardados`, 'exito');
  document.getElementById('ind-form-wrap').style.display = 'none';
  renderListaIndicadores();
  renderDetalleIndicador(periodo);
  verificarAlertaIndicadores();
}

/* ── ELIMINAR ───────────────────────────────────────────── */
function eliminarIndicadorPeriodo(periodo){
  if(!confirm(`¿Eliminar los indicadores de ${getNombreMes(periodo)}?`)) return;
  indicadores = indicadores.filter(i => i.periodo !== periodo);
  guardarIndicadores();
  renderListaIndicadores();
  renderDetalleIndicador(periodo);
  verificarAlertaIndicadores();
  toast('🗑️ Período eliminado', 'exito');
}

/* ── VISTA DETALLE (SOLO LECTURA) ───────────────────────── */
function renderDetalleIndicador(periodo){
  const cont = document.getElementById('ind-detalle-cont');
  if(!cont) return;
  const ind = getIndicadoresPorPeriodo(periodo);

  if(!ind){
    cont.innerHTML = `<div class="card" style="text-align:center;padding:30px;color:var(--texto3);">
      No hay indicadores para <strong>${getNombreMes(periodo)||periodo}</strong>.
      <br><br>
      <button class="btn btn-primary btn-sm" onclick="nuevoIndicadorManual()">
        <i class="ti ti-plus"></i> Ingresar ahora
      </button>
    </div>`;
    return;
  }

  const fmt  = v => v != null ? '$'+v.toLocaleString('es-CL') : '—';
  const fmtP = v => v != null ? v+'%' : '—';
  const afpNombres = {capital:'Capital',cuprum:'Cuprum',habitat:'Habitat',planvital:'PlanVital',provida:'Provida',modelo:'Modelo',uno:'Uno'};

  cont.innerHTML = `
    <div class="g4" style="margin-bottom:16px;">
      <div class="kpi azul"><div class="kpi-label">Valor UF</div><div class="kpi-value" style="font-size:20px;">${fmt(ind.uf)}</div><div class="kpi-sub">${getNombreMes(periodo)}</div></div>
      <div class="kpi verde"><div class="kpi-label">UTM</div><div class="kpi-value" style="font-size:20px;">${fmt(ind.utm)}</div><div class="kpi-sub">valor mensual</div></div>
      <div class="kpi amarillo"><div class="kpi-label">Tope AFP</div><div class="kpi-value" style="font-size:20px;">${fmt(ind.tope_imponible_afp)}</div><div class="kpi-sub">87,8 UF</div></div>
      <div class="kpi rojo"><div class="kpi-label">Tasa SIS</div><div class="kpi-value" style="font-size:20px;">${fmtP(ind.sis)}</div><div class="kpi-sub">seg. invalidez</div></div>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <div class="card-title"><i class="ti ti-building-bank"></i> C — Tasas AFP</div>
      <div class="tabla-wrap">
        <table class="tabla" style="min-width:450px;">
          <thead><tr><th>AFP</th><th style="text-align:center;">Trabajador</th><th style="text-align:center;">Empleador</th><th style="text-align:center;">Total</th></tr></thead>
          <tbody>
            ${Object.entries(ind.afp||{}).map(([key,v])=>`<tr>
              <td style="font-size:13px;font-weight:500;">${afpNombres[key]||key}</td>
              <td style="text-align:center;">${fmtP(v.trabajador)}</td>
              <td style="text-align:center;">${fmtP(v.empleador)}</td>
              <td style="text-align:center;font-weight:600;">${fmtP(v.total)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="g2" style="margin-bottom:14px;">
      <div class="card">
        <div class="card-title"><i class="ti ti-briefcase"></i> E — Seguro de Cesantía (AFC)</div>
        <div style="font-size:13px;line-height:2;">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding-bottom:4px;"><span>Plazo Indefinido</span><strong>${fmtP(ind.afc?.indefinido?.empleador)} emp · ${fmtP(ind.afc?.indefinido?.trabajador)} trab</strong></div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding-bottom:4px;"><span>Plazo Fijo</span><strong>${fmtP(ind.afc?.fijo?.empleador)} emp</strong></div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding-bottom:4px;"><span>Indefinido 11+ años</span><strong>${fmtP(ind.afc?.indefinido_11anios?.empleador)} emp</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>Casa Particular</span><strong>${fmtP(ind.afc?.casa_particular?.empleador)} emp</strong></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ti ti-users"></i> F — Asignación Familiar</div>
        <div style="font-size:13px;line-height:2;">
          ${(ind.asignacion_familiar||[]).map(a=>`
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--borde);padding-bottom:4px;">
              <span>Tramo ${a.tramo}</span>
              <strong>${fmt(a.monto)}${a.hasta?' · hasta '+fmt(a.hasta):' · sin tope'}</strong>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:4px;">
      <button class="btn btn-secondary btn-sm" onclick="editarIndicadorExistente('${periodo}')">
        <i class="ti ti-edit"></i> Editar
      </button>
      <button class="btn btn-danger btn-sm" onclick="eliminarIndicadorPeriodo('${periodo}')">
        <i class="ti ti-trash"></i> Eliminar
      </button>
    </div>`;
}

/* ── API PÚBLICA PARA CALCULO.JS ────────────────────────── */
function getTasaAFP(afpKey, periodo){
  const ind = getIndicadoresPorPeriodo(periodo);
  return ind?.afp?.[afpKey.toLowerCase()] || null;
}
function getTopeImponible(periodo){
  const ind = getIndicadoresPorPeriodo(periodo);
  return ind?.tope_imponible_afp || null;
}
function getTopeAFC(periodo){
  const ind = getIndicadoresPorPeriodo(periodo);
  return ind?.tope_imponible_afc || null;
}
function getRentaMinima(periodo){
  const ind = getIndicadoresPorPeriodo(periodo);
  return ind?.renta_minima || null;
}
