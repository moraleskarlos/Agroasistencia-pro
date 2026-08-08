/* ════════════════════════════════════════════════════════
   GESTION-LABORAL.JS — Novedades, Bonificaciones, Descuentos, Horas Extras
   AgroContratista · Versión 2.0
   Los 4 submódulos comparten el mismo patrón de interfaz:
   fila única [Mes] [Empresa] [Trabajador-buscador] [Tipo] para
   revisar, y un formulario "Registrar [algo]" oculto por defecto,
   autocontenido (Empresa → Trabajador-buscador en cascada), para
   crear registros. Ya no existe un filtro global de página.
   ════════════════════════════════════════════════════════ */

const LOCAL_NOV  = 'agro_novedades';
const LOCAL_HAB  = 'agro_haberes_variables';
const LOCAL_DES  = 'agro_descuentos';
const LOCAL_JOR  = 'agro_jornada_especial';

/* ── CARGA / GUARDADO ──────────────────────────────────── */
function cargarGestionLaboral(){
  try{ novedades         = JSON.parse(localStorage.getItem(LOCAL_NOV))||[]; }catch{ novedades=[]; }
  try{ haberes_variables = JSON.parse(localStorage.getItem(LOCAL_HAB))||[]; }catch{ haberes_variables=[]; }
  try{ descuentos        = JSON.parse(localStorage.getItem(LOCAL_DES))||[]; }catch{ descuentos=[]; }
  try{ jornada_especial  = JSON.parse(localStorage.getItem(LOCAL_JOR))||[]; }catch{ jornada_especial=[]; }
}

function guardarNovedades(){       localStorage.setItem(LOCAL_NOV, JSON.stringify(novedades)); }
function guardarHaberes(){         localStorage.setItem(LOCAL_HAB, JSON.stringify(haberes_variables)); }
function guardarDescuentos(){      localStorage.setItem(LOCAL_DES, JSON.stringify(descuentos)); }
function guardarJornadaEspecial(){ localStorage.setItem(LOCAL_JOR, JSON.stringify(jornada_especial)); }

/* ── INIT DEL MÓDULO ───────────────────────────────────── */
let _tabBonosActivo = 'gl-haberes';
let _guardandoGL = false;
const _buscadoresGL = {};

/* ✅ Separado en 3 páginas (Ausencias / Bonos y Horas Extras / Descuentos)
   — antes era una sola página con 4 sub-tabs. Los 3 init reutilizan las
   mismas funciones de carga/selects/buscadores (que ya cubrían los 4
   submódulos a la vez, sin distinción), solo cambia qué se renderiza al
   final según qué página se está abriendo. */
function initAusencias(){
  cargarGestionLaboral();
  _poblarSelectsGL();
  _initBuscadoresGL();
  // ✅ Paso 4 — Vacaciones se movió aquí desde Remuneraciones. Se
  // precarga su data/selects igual que antes, pero la pestaña que se
  // muestra por defecto sigue siendo Faltas y Permisos.
  if(typeof initVacaciones === 'function') initVacaciones();
  switchTabAusencias('gl-novedades');
}

function initBonos(){
  cargarGestionLaboral();
  _poblarSelectsGL();
  _initBuscadoresGL();
  switchTabBonos(_tabBonosActivo);
}

function initDescuentos(){
  cargarGestionLaboral();
  _poblarSelectsGL();
  _initBuscadoresGL();
  renderDescuentos();
  _renderKPIsGL();
}

/* Alterna entre Faltas y Permisos, y Vacaciones — los 2 sub-tabs que
   quedaron juntos en "Ausencias y Permisos" (Paso 4: Vacaciones se movió
   aquí desde Remuneraciones, porque es una ausencia del trabajador).
   Usa ids explícitos, no un prefijo — 'rem-vacaciones' viene de otro
   archivo (vacaciones.js) que antes vivía junto a Libro/Previred/etc. */
function switchTabAusencias(tab){
  const pares = { 'gl-novedades': { tabId:'tab-gl-novedades', panelId:'panel-gl-novedades' },
                  'rem-vacaciones': { tabId:'tab-rem-vacaciones', panelId:'panel-rem-vacaciones' } };
  Object.keys(pares).forEach(id => {
    const { tabId, panelId } = pares[id];
    const btn    = document.getElementById(tabId);
    const panel  = document.getElementById(panelId);
    const activo = id === tab;
    if(btn){
      btn.style.color            = activo ? '#fff' : 'var(--texto2)';
      btn.style.borderBottomColor= activo ? 'var(--verde-dark)' : 'transparent';
      btn.style.background       = activo ? 'var(--verde-dark)' : 'none';
      btn.style.fontWeight       = activo ? '700' : '600';
    }
    if(panel) panel.style.display = activo ? 'block' : 'none';
  });
  // El grid de KPIs de Ausencias (aus-kpis-wrap) es propio de Faltas y
  // Permisos — Vacaciones ya trae sus propios KPIs dentro de su panel.
  const kpisWrap = document.getElementById('aus-kpis-wrap');
  if(kpisWrap) kpisWrap.style.display = tab === 'gl-novedades' ? '' : 'none';

  if(tab === 'gl-novedades'){ renderNovedades(); _renderKPIsGL(); }
  if(tab === 'rem-vacaciones' && typeof renderVacaciones === 'function') renderVacaciones();
}

/* Alterna entre Bonificaciones y Horas Extras — únicos 2 sub-tabs que
   quedaron juntos en la página "Bonos y Horas Extras" (comparten el
   criterio "aumentan el pago", pero son 2 submódulos independientes,
   cada uno con sus propios 4 KPIs — no deben verse los 8 a la vez). */
function switchTabBonos(tab){
  _tabBonosActivo = tab;
  ['gl-haberes','gl-jornada'].forEach(id => {
    const btn     = document.getElementById('tab-' + id);
    const panel   = document.getElementById('panel-' + id);
    const activo  = id === tab;
    if(btn)   { btn.classList.toggle('activo', activo); }
    if(panel) { panel.style.display = activo ? 'block' : 'none'; }
  });
  const kpisHaberes = ['gl-kpi-haberes','gl-kpi-hab-trabajadores','gl-kpi-hab-registros','gl-kpi-hab-promedio'];
  const kpisJornada = ['gl-kpi-hextra','gl-kpi-jor-trabajadores','gl-kpi-jor-registros','gl-kpi-jor-recargo100'];
  kpisHaberes.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = tab==='gl-haberes' ? '' : 'none'; });
  kpisJornada.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = tab==='gl-jornada' ? '' : 'none'; });
  if(tab === 'gl-haberes') renderHaberes();
  if(tab === 'gl-jornada') renderJornada();
  _renderKPIsGL();
}

/* Mes actual en formato YYYY-MM, usado como valor por defecto de los
   4 selectores "Mes" (uno por submódulo). */
function _mesActual(){
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
}

function _poblarSelectsGL(){
  const mes = _mesActual();
  ['gl-nov-rev-mes','gl-hab-rev-mes','gl-des-rev-mes','gl-jor-rev-mes','gl-des-mes'].forEach(id => {
    const el = document.getElementById(id);
    if(el && !el.value) el.value = mes;
  });
  _poblarEmpresasGL();
}

/* Puebla los 8 selectores de Empresa (Revisar + Registrar, ×4 submódulos).
   El de "Registrar" nunca tiene la opción "Todas" — hay que elegir una
   empresa puntual para poder registrar; si solo existe una empresa
   mandante en el sistema, se deja preseleccionada automáticamente. */
function _poblarEmpresasGL(){
  ['gl-nov-rev-empresa','gl-hab-rev-empresa','gl-des-rev-empresa','gl-jor-rev-empresa'].forEach(id => {
    const sel = document.getElementById(id);
    if(!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">Todas las Empresas Mandante</option>'
      + empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    if(val) sel.value = val;
  });
  ['gl-nov-reg-empresa','gl-hab-reg-empresa','gl-des-reg-empresa','gl-jor-reg-empresa'].forEach(id => {
    const sel = document.getElementById(id);
    if(!sel) return;
    const val = sel.value;
    if(empresas.length === 1){
      sel.innerHTML = `<option value="${empresas[0].id}">${empresas[0].nombre}</option>`;
      sel.value = empresas[0].id;
    } else {
      sel.innerHTML = '<option value="">— Seleccionar empresa —</option>'
        + empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
      if(val) sel.value = val;
    }
  });
}

/* Inicializa los 8 Buscadores de Trabajador (Revisar + Registrar, ×4
   submódulos) y conecta la cascada Empresa → Trabajador de cada uno. */
function _initBuscadoresGL(){
  const renders = { nov: renderNovedades, hab: renderHaberes, des: renderDescuentos, jor: renderJornada };
  ['nov','hab','des','jor'].forEach(prefix => {
    _buscadoresGL[prefix+'-rev'] = initBuscadorTrabajador({
      inputId:    `gl-${prefix}-rev-trabajador-input`,
      dropdownId: `gl-${prefix}-rev-trabajador-dropdown`,
      hiddenId:   `gl-${prefix}-rev-trabajador`,
      permiteVacio: true,
      getRuts: () => _rutsFiltrados(document.getElementById(`gl-${prefix}-rev-empresa`)?.value || ''),
      onSelect: () => { renders[prefix](); _renderKPIsGL(); },
      onClear:  () => { renders[prefix](); _renderKPIsGL(); },
    });
    _buscadoresGL[prefix+'-reg'] = initBuscadorTrabajador({
      inputId:    `gl-${prefix}-reg-trabajador-input`,
      dropdownId: `gl-${prefix}-reg-trabajador-dropdown`,
      hiddenId:   `gl-${prefix}-reg-trabajador`,
      permiteVacio: false,
      getRuts: () => _rutsFiltrados(document.getElementById(`gl-${prefix}-reg-empresa`)?.value || ''),
    });
    document.getElementById(`gl-${prefix}-reg-empresa`)?.addEventListener('change', () => _buscadoresGL[prefix+'-reg']?.reset());
    document.getElementById(`gl-${prefix}-rev-empresa`)?.addEventListener('change', () => {
      _buscadoresGL[prefix+'-rev']?.reset(); renders[prefix](); _renderKPIsGL();
    });
    document.getElementById(`gl-${prefix}-rev-mes`)?.addEventListener('change', () => { renders[prefix](); _renderKPIsGL(); });
    document.getElementById(`gl-${prefix}-rev-tipo`)?.addEventListener('change', () => renders[prefix]());
  });
}

/* ── KPIs — 4 por submódulo, cada uno con su propio filtro Mes/Empresa ── */
function _renderKPIsGL(){
  const mesNov      = document.getElementById('gl-nov-rev-mes')?.value || '';
  const mandanteNov = document.getElementById('gl-nov-rev-empresa')?.value || '';
  const rutsNov     = _rutsFiltrados(mandanteNov);
  const novPer      = novedades.filter(n => n.periodo === mesNov && rutsNov.includes(n.trabajador_rut));
  const contarTrabajadores = tipo => new Set(novPer.filter(n => n.tipo === tipo).map(n => n.trabajador_rut)).size;
  _setKPI('gl-kpi-goce',         contarTrabajadores('permiso_goce'),          'trabajadores');
  _setKPI('gl-kpi-singoce',      contarTrabajadores('permiso_sin_goce'),      'trabajadores');
  _setKPI('gl-kpi-licencia',     contarTrabajadores('licencia_medica'),       'trabajadores');
  _setKPI('gl-kpi-inasistencia', contarTrabajadores('ausencia_injustificada'),'trabajadores');

  const mesHab      = document.getElementById('gl-hab-rev-mes')?.value || '';
  const mandanteHab = document.getElementById('gl-hab-rev-empresa')?.value || '';
  const rutsHab     = _rutsFiltrados(mandanteHab);
  const habPer      = haberes_variables.filter(h => h.periodo === mesHab && rutsHab.includes(h.trabajador_rut));
  const totalHab    = habPer.reduce((s,h) => s + (parseFloat(h.monto)||0), 0);
  const trabHab     = new Set(habPer.map(h => h.trabajador_rut)).size;
  const promHab     = habPer.length ? totalHab / habPer.length : 0;
  _setKPI('gl-kpi-haberes',         '$'+totalHab.toLocaleString('es-CL'),          'bonificaciones');
  _setKPI('gl-kpi-hab-trabajadores', trabHab,                                      'trabajadores');
  _setKPI('gl-kpi-hab-registros',    habPer.length,                                'registros');
  _setKPI('gl-kpi-hab-promedio',     '$'+Math.round(promHab).toLocaleString('es-CL'),'promedio por registro');

  const mesDes      = document.getElementById('gl-des-rev-mes')?.value || '';
  const mandanteDes = document.getElementById('gl-des-rev-empresa')?.value || '';
  const rutsDes     = _rutsFiltrados(mandanteDes);
  const desPer      = descuentos.filter(d => d.periodo === mesDes && rutsDes.includes(d.trabajador_rut));
  const totalDes    = desPer.reduce((s,d) => s + (parseFloat(d.monto)||0), 0);
  const trabDes     = new Set(desPer.map(d => d.trabajador_rut)).size;
  // Con el modelo de "una cuota por mes", cada registro que aparece en el
  // período YA es una cuota activa de ese mes — no hace falta comparar
  // contra un contador de pagadas.
  const cuotasAct   = desPer.length;
  const saldoTotal  = desPer.reduce((s,d) => s + Math.max(0, parseFloat(d.monto_total||0) - (parseFloat(d.monto||0) * (d.numero_cuota||1))), 0);
  _setKPI('gl-kpi-descuentos',      '$'+totalDes.toLocaleString('es-CL'), 'descuentos período');
  _setKPI('gl-kpi-des-trabajadores', trabDes,                             'trabajadores');
  _setKPI('gl-kpi-des-cuotas',       cuotasAct,                           'cuotas activas');
  _setKPI('gl-kpi-des-saldo',        '$'+saldoTotal.toLocaleString('es-CL'), 'saldo pendiente');

  const mesJor      = document.getElementById('gl-jor-rev-mes')?.value || '';
  const mandanteJor = document.getElementById('gl-jor-rev-empresa')?.value || '';
  const rutsJor     = _rutsFiltrados(mandanteJor);
  const jorPer      = jornada_especial.filter(j => j.periodo === mesJor && rutsJor.includes(j.trabajador_rut));
  const totalHex    = jorPer.filter(j => j.tipo==='hora_extra').reduce((s,j) => s + (parseFloat(j.horas)||0), 0);
  const trabJor     = new Set(jorPer.map(j => j.trabajador_rut)).size;
  const recargo100  = jorPer.filter(j => j.tipo==='hora_extra' && j.recargo==='100').reduce((s,j) => s + (parseFloat(j.horas)||0), 0);
  _setKPI('gl-kpi-hextra',          totalHex.toFixed(1)+' h', 'horas extra');
  _setKPI('gl-kpi-jor-trabajadores', trabJor,                 'trabajadores');
  _setKPI('gl-kpi-jor-registros',    jorPer.length,            'registros');
  _setKPI('gl-kpi-jor-recargo100',   recargo100.toFixed(1)+' h','recargo 100%');
}

function _setKPI(id, val, sub){
  const el = document.getElementById(id);
  if(!el) return;
  el.querySelector('.kpi-value').textContent = val;
  el.querySelector('.kpi-sub').textContent   = sub;
}

/* ════════════════════════════════════════════════════════
   TAB 1 — NOVEDADES (Faltas y Permisos)
   ════════════════════════════════════════════════════════ */
function renderNovedades(){
  const periodo   = document.getElementById('gl-nov-rev-mes')?.value || '';
  const mandante  = document.getElementById('gl-nov-rev-empresa')?.value || '';
  const filtroRut = document.getElementById('gl-nov-rev-trabajador')?.value || '';
  const filtroTipo= document.getElementById('gl-nov-rev-tipo')?.value || '';
  const ruts      = _rutsFiltrados(mandante);
  const tbody     = document.getElementById('tbody-novedades');
  if(!tbody) return;

  const ausencias  = _leerAusenciasAsistencia(periodo, ruts);
  const novsPer    = novedades.filter(n => n.periodo === periodo && ruts.includes(n.trabajador_rut));

  const rutsMostrar = filtroRut ? [filtroRut] : ruts;
  const filas = rutsMostrar.map(rut => {
    const t           = trabajadores.find(x => x.rut === rut);
    if(!t) return null;
    const ausRut      = ausencias.filter(a => a.rut === rut && (!t.fecha_ingreso || a.fecha >= t.fecha_ingreso));
    const novsRut     = novsPer.filter(n => n.trabajador_rut === rut);
    const diasClasif  = new Set();
    novsRut.forEach(n => {
      let d = n.fecha_inicio;
      const fin = n.fecha_fin || n.fecha_inicio;
      while(d <= fin){
        diasClasif.add(d);
        d = _sumarDiaISO(d);
      }
    });
    const sinClasif   = ausRut.filter(a => !diasClasif.has(a.fecha));

    if(filtroTipo === 'sin_clasificar' && sinClasif.length === 0) return null;
    if(filtroTipo && filtroTipo !== 'sin_clasificar'){
      if(!novsRut.some(n => n.tipo === filtroTipo)) return null;
    }

    const totalDias   = novsRut.reduce((s,n) => s + (n.dias||1), 0);

    return { rut, t, sinClasif, novsRut, totalDias };
  }).filter(Boolean);

  // ✅ Corregido: si NINGÚN trabajador tiene novedades ni ausencias sin
  // clasificar en este período, se muestra el estado vacío en vez de
  // listar a todos como "✅ Al día" — un mes sin ninguna información
  // registrada no es lo mismo que un mes donde se revisó y todo está bien.
  const hayInformacion = filas.some(f => f.totalDias > 0 || f.sinClasif.length > 0);

  if(!filas.length || !hayInformacion){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--texto3);">
      Sin novedades en este período · Las ausencias se detectan automáticamente desde Asistencia
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filas.map(f => {
    const alertaBadge = f.sinClasif.length
      ? `<span class="badge badge-amarillo">⚠️ ${f.sinClasif.length} sin clasificar</span>`
      : `<span class="badge badge-verde">✅ Al día</span>`;
    const novBadges = f.novsRut.length
      ? [...new Set(f.novsRut.map(n=>n.tipo))].slice(0,3)
          .map(tipo => _badgeNovedad(tipo)).join(' ')
      : '<span style="color:var(--texto3);font-size:12px;">—</span>';

    return `<tr id="fila-res-${f.rut.replace(/\W/g,'')}">
      <td style="font-size:13px;font-weight:600;">${f.t.nombre}</td>
      <td class="rut-mono">${f.rut}</td>
      <td>${alertaBadge}</td>
      <td>${novBadges}</td>
      <td style="text-align:center;font-size:13px;font-weight:500;">${f.totalDias > 0 ? f.totalDias+' día'+(f.totalDias>1?'s':'') : '—'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="toggleDetalleNovedad('${f.rut}')">
          <i class="ti ti-chevron-down"></i> Revisar
        </button>
      </td>
    </tr>
    <tr id="detalle-${f.rut.replace(/\W/g,'')}" style="display:none;">
      <td colspan="6" style="padding:0;background:var(--gris-bg);">
        <div style="padding:14px 20px;">
          ${_htmlDetalleNovedad(f)}
        </div>
      </td>
    </tr>`;
  }).join('');

  _reabrirDetalleSiCorresponde();
}

let _detalleAbiertoRut = null;

function toggleDetalleNovedad(rut){
  const rid  = rut.replace(/\W/g,'');
  const fila = document.getElementById(`detalle-${rid}`);
  const btn  = document.querySelector(`#fila-res-${rid} button i`);
  if(!fila) return;
  const abierto = fila.style.display !== 'none';
  fila.style.display = abierto ? 'none' : 'table-row';
  if(btn) btn.className = abierto ? 'ti ti-chevron-down' : 'ti ti-chevron-up';
  _detalleAbiertoRut = abierto ? null : rut;
}

function _reabrirDetalleSiCorresponde(){
  if(!_detalleAbiertoRut) return;
  const rid  = _detalleAbiertoRut.replace(/\W/g,'');
  const fila = document.getElementById(`detalle-${rid}`);
  const btn  = document.querySelector(`#fila-res-${rid} button i`);
  if(!fila) return;
  fila.style.display = 'table-row';
  if(btn) btn.className = 'ti ti-chevron-up';
}

function _htmlDetalleNovedad(f){
  // Una sola lista ordenada por fecha. Los "sin clasificar" se listan uno
  // por uno (cada día es una clasificación pendiente independiente). Las
  // novedades YA REGISTRADAS se muestran como UNA fila por registro —no una
  // por día— con un badge de cantidad de días, para no repetir los botones
  // Aprobar/Eliminar por cada día de una misma licencia/permiso.
  const combinado = [
    ...f.sinClasif.map(a => ({ orden: a.fecha, tipoFila: 'pendiente', a })),
    ...f.novsRut.map(n   => ({ orden: n.fecha_inicio, tipoFila: 'novedad', n })),
  ].sort((x,y) => x.orden.localeCompare(y.orden));

  if(!combinado.length){
    return '<div style="max-width:900px;"><div style="color:var(--texto3);font-size:13px;padding:8px 0;">Sin movimientos este período</div></div>';
  }

  const filasHtml = combinado.map(item => {
    if(item.tipoFila === 'pendiente'){
      const a = item.a;
      return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--borde);">
        <span style="font-size:12px;color:var(--texto2);min-width:90px;">${_fmtFecha(a.fecha)}</span>
        <span class="badge badge-amarillo">⚠️ Sin clasificar</span>
        <span style="font-size:12px;color:var(--texto3);flex:1;">Detectada desde Asistencia</span>
        <button class="btn btn-secondary btn-sm" onclick="clasificarAusencia('${a.rut}','${a.fecha}')">
          <i class="ti ti-tag"></i> Registrar
        </button>
      </div>`;
    }
    const n = item.n;
    const rango = n.fecha_fin && n.fecha_fin !== n.fecha_inicio
      ? `${_fmtFecha(n.fecha_inicio)} → ${_fmtFecha(n.fecha_fin)}`
      : _fmtFecha(n.fecha_inicio);
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--borde);">
      <span style="font-size:12px;color:var(--texto2);min-width:150px;">${rango}</span>
      <span class="badge badge-gris">${n.dias||1} día${(n.dias||1)>1?'s':''}</span>
      ${_badgeNovedad(n.tipo)}
      <span style="font-size:12px;color:var(--texto2);flex:1;">${n.observacion||'—'}</span>
      <button class="btn btn-danger btn-sm" onclick="eliminarNovedad('${n.id}')"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('');

  return `<div style="max-width:900px;">${filasHtml}</div>`;
}

/* Determina si el trabajador tiene una marcación REAL de asistencia
   (hora_entrada) en una fecha puntual. Usa el mismo criterio que
   variables.js (_leerAsistenciaMes) para no tener dos definiciones
   distintas de "asistió" en el sistema. */
function _tieneMarcacionAsistencia(rut, fecha){
  const data = JSON.parse(localStorage.getItem('asistencia_' + fecha) || '[]');
  const reg  = data.find(x => x.rut === rut);
  return !!(reg && reg.hora_entrada);
}

/* Recorre un rango [inicio, fin] y devuelve las fechas donde el
   trabajador ya tiene asistencia marcada — usado para bloquear el
   registro de una ausencia que contradice un dato real. */
function _diasConAsistenciaEnRango(rut, inicio, fin){
  const conflictos = [];
  let d = inicio;
  while(d <= fin){
    if(_tieneMarcacionAsistencia(rut, d)) conflictos.push(d);
    d = _sumarDiaISO(d);
  }
  return conflictos;
}

function _leerAusenciasAsistencia(periodo, ruts){
  if(!periodo) return [];
  const [anio, mes] = periodo.split('-').map(Number);
  const diasMes     = new Date(anio, mes, 0).getDate();
  const ausencias   = [];

  for(let d = 1; d <= diasMes; d++){
    const fecha = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const clave = 'asistencia_' + fecha;
    const data  = JSON.parse(localStorage.getItem(clave)||'[]');
    // ✅ Corregido: si ese día no hay NINGÚN dato de asistencia guardado
    // (nadie marcó nada), significa que el día no fue registrado por el
    // módulo de Asistencia — no que todos los trabajadores faltaron. Antes,
    // un mes sin datos (ej. un mes futuro) marcaba a TODOS como "sin
    // clasificar" en cada día hábil, generando listas falsas como
    // "23 sin clasificar" sin que existiera ninguna inasistencia real.
    if(!data.length) continue;
    ruts.forEach(rut => {
      const marcacion = data.find(x => x.rut === rut);
      if(!marcacion){
        const diaSemana = new Date(fecha+'T12:00:00').getDay();
        if(diaSemana !== 0 && diaSemana !== 6){
          ausencias.push({ rut, fecha });
        }
      }
    });
  }
  return ausencias;
}

function clasificarAusencia(rut, fecha){
  const t = trabajadores.find(x => x.rut === rut);
  toggleFormNovedad(true); // fuerza apertura + repuebla empresas + resetea buscador
  const empresaId = findMandante(t)?.id || '';
  const selEmpresa = document.getElementById('gl-nov-reg-empresa');
  if(selEmpresa && empresaId) selEmpresa.value = empresaId;
  if(t){
    document.getElementById('gl-nov-reg-trabajador').value = rut;
    document.getElementById('gl-nov-reg-trabajador-input').value = `${t.nombre} · ${t.rut}`;
  }
  document.getElementById('gl-nov-tipo').value = '';
  document.getElementById('gl-nov-fecha-inicio').value = fecha;
  document.getElementById('gl-nov-fecha-fin').value = fecha;
}

function toggleFormNovedad(forzar){
  const wrap = document.getElementById('gl-nov-form-wrap');
  const abrir = forzar === true ? true : (forzar === false ? false : wrap.style.display === 'none');
  wrap.style.display = abrir ? 'block' : 'none';
  if(abrir){
    _poblarEmpresasGL();
    _buscadoresGL['nov-reg']?.reset();
  }
  return abrir;
}

function guardarNovedad(){
  if(_guardandoGL) return;
  const empresa  = document.getElementById('gl-nov-reg-empresa')?.value;
  const rut      = document.getElementById('gl-nov-reg-trabajador')?.value;
  const tipo     = document.getElementById('gl-nov-tipo')?.value;
  const inicio   = document.getElementById('gl-nov-fecha-inicio')?.value;
  const fin      = document.getElementById('gl-nov-fecha-fin')?.value;
  const obs      = document.getElementById('gl-nov-obs')?.value||'';

  if(!empresa){ toast('⚠️ Selecciona la empresa','error'); return; }
  if(!rut || !tipo || !inicio){ toast('⚠️ Completa trabajador, tipo y fecha inicio','error'); return; }

  // ✅ Validación cruzada contra Asistencia — reemplaza al paso de
  // aprobación manual que se eliminó. Si el trabajador ya tiene una
  // marcación real (hora_entrada) en algún día del rango, no se permite
  // registrar una ausencia ahí: el dato objetivo de Asistencia prevalece
  // sobre un registro manual que lo contradice.
  const conflictos = _diasConAsistenciaEnRango(rut, inicio, fin || inicio);
  if(conflictos.length){
    const t = trabajadores.find(x => x.rut === rut);
    toast(`⚠️ ${t?.nombre||'El trabajador'} ya tiene asistencia marcada el ${_fmtFecha(conflictos[0])}${conflictos.length>1?` (y ${conflictos.length-1} día(s) más)`:''} — no se puede registrar una ausencia en un día con asistencia confirmada`, 'error');
    return;
  }

  // ✅ NUEVO — Validación cruzada entre novedades: un trabajador no puede
  // tener dos motivos de ausencia distintos (o repetidos) en fechas que se
  // superponen. Reemplaza al chequeo de "duplicado exacto" — este es más
  // amplio, porque también detecta motivos DISTINTOS que se cruzan (ej.
  // licencia médica y permiso sin goce el mismo día), no solo repetidos.
  const conflictoNov = novedades.find(n =>
    n.trabajador_rut === rut &&
    n.fecha_inicio <= (fin || inicio) && n.fecha_fin >= inicio);
  if(conflictoNov){
    const t = trabajadores.find(x => x.rut === rut);
    toast(`⚠️ ${t?.nombre||'Este trabajador'} ya tiene "${_labelNovedad(conflictoNov.tipo)}" registrado entre ${_fmtFecha(conflictoNov.fecha_inicio)} y ${_fmtFecha(conflictoNov.fecha_fin)} — no puede tener dos motivos en fechas que se cruzan`, 'error');
    return;
  }

  _guardandoGL = true;

  const dias = fin ? _calcDias(inicio, fin) : 1;
  const nov  = {
    id:              Date.now().toString(),
    trabajador_rut:  rut,
    periodo:         inicio.slice(0,7),
    tipo,
    fecha_inicio:    inicio,
    fecha_fin:       fin || inicio,
    dias,
    observacion:     obs,
    // Se eliminó el paso de aprobación por separado — guardar el
    // formulario es el único trámite necesario. registrado_por y
    // fecha_registro (abajo) quedan como el registro de auditoría de
    // quién ingresó la novedad y cuándo.
    aprobado:        true,
    registrado_por:  sesionActiva?.usuario||'admin',
    fecha_registro:  new Date().toISOString().slice(0,10),
  };

  novedades.push(nov);
  guardarNovedades();
  registrarDocumentoCarpeta({
    trabajador_rut: rut,
    tipo: 'novedad',
    subtipo: tipo,
    descripcion: `${_labelNovedad(tipo)} — ${_fmtFecha(inicio)}${fin&&fin!==inicio?' al '+_fmtFecha(fin):''}`,
  });
  toast('✅ Novedad registrada','exito');
  _resetForm('form-novedad');
  _buscadoresGL['nov-reg']?.reset();
  document.getElementById('gl-nov-form-wrap').style.display = 'none';
  renderNovedades();
  _renderKPIsGL();
  _guardandoGL = false;
}

function eliminarNovedad(id){
  if(!confirm('¿Eliminar esta novedad?')) return;
  novedades = novedades.filter(x => x.id !== id);
  guardarNovedades();
  renderNovedades();
  _renderKPIsGL();
}

function _badgeNovedad(tipo){
  const map = {
    licencia_medica:       ['badge-azul',     '🏥 Lic. Médica'],
    permiso_goce:          ['badge-verde',    '✅ Permiso c/goce'],
    permiso_sin_goce:      ['badge-amarillo', '⚠️ Permiso s/goce'],
    vacaciones:            ['badge-azul',     '🏖️ Vacaciones'],
    ausencia_injustificada:['badge-rojo',     '❌ Injustificada'],
    otro:                  ['badge-gris',     '📋 Otro'],
  };
  const [cls, lbl] = map[tipo]||['badge-gris', tipo];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function _labelNovedad(tipo){
  const map = {
    licencia_medica:'Licencia Médica', permiso_goce:'Permiso con goce',
    permiso_sin_goce:'Permiso sin goce', vacaciones:'Vacaciones',
    ausencia_injustificada:'Ausencia injustificada', otro:'Otro',
  };
  return map[tipo]||tipo;
}

/* ════════════════════════════════════════════════════════
   TAB 2 — BONIFICACIONES
   ════════════════════════════════════════════════════════ */
function renderHaberes(){
  const periodo    = document.getElementById('gl-hab-rev-mes')?.value || '';
  const mandante   = document.getElementById('gl-hab-rev-empresa')?.value || '';
  const filtroTrab = document.getElementById('gl-hab-rev-trabajador')?.value || '';
  const filtroTipo = document.getElementById('gl-hab-rev-tipo')?.value || '';
  const ruts       = _rutsFiltrados(mandante);

  let lista = haberes_variables.filter(h => h.periodo===periodo && ruts.includes(h.trabajador_rut));
  if(filtroTrab) lista = lista.filter(h => h.trabajador_rut === filtroTrab);
  if(filtroTipo) lista = lista.filter(h => h.tipo === filtroTipo);

  const tbody = document.getElementById('tbody-haberes');
  if(!tbody) return;

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--texto3);">Sin bonificaciones registradas en este período</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(h => {
    const t = trabajadores.find(x => x.rut === h.trabajador_rut);
    return `<tr>
      <td style="font-size:13px;font-weight:500;">${t?.nombre||h.trabajador_rut}</td>
      <td>${_badgeHaber(h.tipo)}</td>
      <td style="font-size:13px;font-weight:600;color:var(--verde-dark);">$${parseFloat(h.monto||0).toLocaleString('es-CL')}</td>
      <td style="font-size:12px;">${_fmtFecha(h.fecha)||'—'}</td>
      <td style="font-size:12px;color:var(--texto2);">${h.observacion||'—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarHaber('${h.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
}

function toggleFormHaber(forzar){
  const wrap = document.getElementById('gl-hab-form-wrap');
  const abrir = forzar === true ? true : (forzar === false ? false : wrap.style.display === 'none');
  wrap.style.display = abrir ? 'block' : 'none';
  if(abrir){
    _poblarEmpresasGL();
    _buscadoresGL['hab-reg']?.reset();
  }
  return abrir;
}

function guardarHaber(){
  if(_guardandoGL) return;
  const empresa = document.getElementById('gl-hab-reg-empresa')?.value;
  const rut     = document.getElementById('gl-hab-reg-trabajador')?.value;
  const tipo    = document.getElementById('gl-hab-tipo')?.value;
  const monto   = document.getElementById('gl-hab-monto')?.value;
  const fecha   = document.getElementById('gl-hab-fecha')?.value;
  const obs     = document.getElementById('gl-hab-obs')?.value||'';

  if(!empresa){ toast('⚠️ Selecciona la empresa','error'); return; }
  if(!rut||!tipo||!monto){ toast('⚠️ Completa trabajador, tipo y monto','error'); return; }

  const yaExiste = haberes_variables.some(h =>
    h.trabajador_rut === rut && h.tipo === tipo &&
    h.monto === parseFloat(monto) && h.fecha === (fecha||''));
  if(yaExiste){ toast('⚠️ Ya existe una bonificación idéntica registrada','error'); return; }

  _guardandoGL = true;

  const h = {
    id:             Date.now().toString(),
    trabajador_rut: rut,
    periodo:        (fecha||_mesActual()).slice(0,7),
    tipo, monto: parseFloat(monto), fecha: fecha||'', observacion: obs,
    registrado_por: sesionActiva?.usuario||'admin',
  };
  haberes_variables.push(h);
  guardarHaberes();
  toast('✅ Bonificación registrada','exito');
  _resetForm('form-haber');
  _buscadoresGL['hab-reg']?.reset();
  document.getElementById('gl-hab-form-wrap').style.display='none';
  renderHaberes();
  _renderKPIsGL();
  _guardandoGL = false;
}

function eliminarHaber(id){
  if(!confirm('¿Eliminar esta bonificación?')) return;
  haberes_variables = haberes_variables.filter(x => x.id!==id);
  guardarHaberes();
  renderHaberes();
  _renderKPIsGL();
}

function _badgeHaber(tipo){
  const map = {
    bono_produccion:    ['badge-verde',   '🌿 Producción'],
    bono_asistencia:    ['badge-verde',   '📅 Asistencia'],
    bono_puntualidad:   ['badge-azul',    '⏰ Puntualidad'],
    bono_responsabilidad:['badge-azul',   '⭐ Responsabilidad'],
    colacion:           ['badge-amarillo','🍽️ Colación'],
    movilizacion:       ['badge-amarillo','🚌 Movilización'],
    viatico:            ['badge-gris',    '✈️ Viático'],
    asignacion_especial:['badge-azul',    '💼 Asig. Especial'],
    otro:               ['badge-gris',    '📋 Otro'],
  };
  const [cls,lbl] = map[tipo]||['badge-gris',tipo];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

/* ════════════════════════════════════════════════════════
   TAB 3 — DESCUENTOS
   ════════════════════════════════════════════════════════ */
function renderDescuentos(){
  const periodo    = document.getElementById('gl-des-rev-mes')?.value || '';
  const mandante   = document.getElementById('gl-des-rev-empresa')?.value || '';
  const filtroTrab = document.getElementById('gl-des-rev-trabajador')?.value || '';
  const filtroTipo = document.getElementById('gl-des-rev-tipo')?.value || '';
  const ruts       = _rutsFiltrados(mandante);

  let lista = descuentos.filter(d => d.periodo===periodo && ruts.includes(d.trabajador_rut));
  if(filtroTrab) lista = lista.filter(d => d.trabajador_rut === filtroTrab);
  if(filtroTipo) lista = lista.filter(d => d.tipo === filtroTipo);

  const tbody = document.getElementById('tbody-descuentos');
  if(!tbody) return;

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--texto3);">Sin descuentos en este período</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(d => {
    const t = trabajadores.find(x => x.rut === d.trabajador_rut);
    // Saldo restante después de aplicar la cuota de ESTE mes.
    const saldoRestante = Math.max(0, parseFloat(d.monto_total||0) - (parseFloat(d.monto||0) * (d.numero_cuota||1)));
    return `<tr>
      <td style="font-size:13px;font-weight:500;">${t?.nombre||d.trabajador_rut}</td>
      <td>${_badgeDescuento(d.tipo)}</td>
      <td style="font-size:13px;font-weight:600;color:var(--texto);">$${parseFloat(d.monto_total||0).toLocaleString('es-CL')}</td>
      <td style="font-size:13px;font-weight:600;color:var(--danger);">$${parseFloat(d.monto||0).toLocaleString('es-CL')}</td>
      <td style="font-size:12px;text-align:center;">${d.numero_cuota||1}/${d.cuotas_total||1}</td>
      <td style="font-size:13px;font-weight:500;">$${saldoRestante.toLocaleString('es-CL')}</td>
      <td style="font-size:12px;color:var(--texto2);">${d.observacion||'—'}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="eliminarDescuento('${d.id}')" title="Eliminar solo esta cuota"><i class="ti ti-trash"></i></button>
        ${(d.cuotas_total||1) > 1 ? `
        <button class="btn btn-secondary btn-sm" onclick="eliminarSerieDescuento('${d.grupo_id}')" title="Eliminar todas las cuotas pendientes de este descuento (no toca las ya pasadas)"><i class="ti ti-trash-x"></i></button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function toggleFormDescuento(forzar){
  const wrap = document.getElementById('gl-des-form-wrap');
  const abrir = forzar === true ? true : (forzar === false ? false : wrap.style.display === 'none');
  wrap.style.display = abrir ? 'block' : 'none';
  if(abrir){
    _poblarEmpresasGL();
    _buscadoresGL['des-reg']?.reset();
    const elMes = document.getElementById('gl-des-mes');
    if(elMes && !elMes.value) elMes.value = _mesActual();
  }
  return abrir;
}

/* Suma N meses a un período 'YYYY-MM' (N puede ser 0). */
function _sumarMeses(periodo, n){
  const [y, m] = periodo.split('-').map(Number);
  const d = new Date(y, (m - 1) + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function _fmtMes(periodo){
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const [y, m] = periodo.split('-').map(Number);
  return `${meses[m-1]} de ${y}`;
}

function guardarDescuento(){
  if(_guardandoGL) return;
  const empresa    = document.getElementById('gl-des-reg-empresa')?.value;
  const rut        = document.getElementById('gl-des-reg-trabajador')?.value;
  const tipo       = document.getElementById('gl-des-tipo')?.value;
  const montoTotal = document.getElementById('gl-des-monto')?.value;
  const cuotas     = document.getElementById('gl-des-cuotas')?.value||1;
  const mesInicio  = document.getElementById('gl-des-mes')?.value || _mesActual();
  const obs        = document.getElementById('gl-des-obs')?.value||'';

  if(!empresa){ toast('⚠️ Selecciona la empresa','error'); return; }
  if(!rut||!tipo||!montoTotal){ toast('⚠️ Completa trabajador, tipo y monto','error'); return; }

  // El campo del formulario ("Monto total") es la deuda completa, no la
  // cuota. La cuota mensual se calcula aquí.
  const nCuotas    = parseInt(cuotas) || 1;
  const totalNum   = parseFloat(montoTotal);
  const montoCuota = Math.round(totalNum / nCuotas);

  // ✅ NUEVO — Aviso de dos niveles cuando el trabajador ya tiene un
  // descuento ese mismo mes. No bloquea (Sí/No), porque puede ser legítimo
  // (ej. anticipo Y préstamo el mismo mes) — pero si es el MISMO tipo, el
  // mensaje es más directo, porque huele más a error de tipeo que a un
  // caso real (especialmente en tipos como Retención judicial o Cuota
  // sindical, que normalmente son una obligación única y continua).
  const otroDelMes = descuentos.find(d => d.trabajador_rut === rut && d.periodo === mesInicio);
  if(otroDelMes){
    const t = trabajadores.find(x => x.rut === rut);
    const nombre = t?.nombre || 'Este trabajador';
    const mensaje = otroDelMes.tipo === tipo
      ? `${nombre} ya tiene un descuento de tipo "${_labelDescuento(tipo)}" registrado en ${_fmtMes(mesInicio)} — ¿es un descuento distinto, o fue un error?`
      : `${nombre} ya tiene un descuento este mes (${_labelDescuento(otroDelMes.tipo)}) — ¿confirmas agregar también este?`;
    if(!confirm(mensaje + '\n\nAceptar = continuar de todas formas.\nCancelar = no guardar.')) return;
  }

  _guardandoGL = true;

  // ✅ Recurrencia: se genera UN registro por cada cuota, cada uno en su mes
  // correspondiente (mesInicio, mesInicio+1, ...). Como calculo.js ya filtra
  // los descuentos por período exacto (getDescuentosPorRut), esto hace que
  // cada mes futuro descuente su cuota automáticamente, sin tocar
  // calculo.js ni variables.js — antes solo existía el registro del primer
  // mes y las cuotas siguientes nunca se aplicaban solas.
  const grupoId = Date.now().toString();
  for(let i = 0; i < nCuotas; i++){
    descuentos.push({
      id:              grupoId + '-' + i,
      grupo_id:        grupoId,
      trabajador_rut:  rut,
      periodo:         _sumarMeses(mesInicio, i),
      tipo,
      monto:           montoCuota,
      monto_total:     totalNum,
      numero_cuota:    i + 1,
      cuotas_total:    nCuotas,
      observacion:     obs,
      registrado_por:  sesionActiva?.usuario||'admin',
    });
  }
  guardarDescuentos();

  const mesFin = _sumarMeses(mesInicio, nCuotas - 1);
  toast(nCuotas > 1
    ? `✅ Descuento registrado — ${nCuotas} cuotas generadas, de ${_fmtMes(mesInicio)} a ${_fmtMes(mesFin)}`
    : '✅ Descuento registrado', 'exito');
  _resetForm('form-descuento');
  _buscadoresGL['des-reg']?.reset();
  document.getElementById('gl-des-form-wrap').style.display='none';
  renderDescuentos();
  _renderKPIsGL();
  _guardandoGL = false;
}

function eliminarDescuento(id){
  if(!confirm('¿Eliminar esta cuota? (Solo se borra la de este mes; las demás cuotas del mismo descuento no se ven afectadas)')) return;
  descuentos = descuentos.filter(x => x.id!==id);
  guardarDescuentos();
  renderDescuentos();
  _renderKPIsGL();
}

/* Elimina de una sola vez todas las cuotas PENDIENTES (mes actual en
   adelante) de un mismo descuento — ej. el trabajador pagó el préstamo
   antes de tiempo, o el descuento se cargó mal y hay que anularlo
   completo. Las cuotas de meses ya pasados NO se tocan — quedaron
   reflejadas en liquidaciones ya generadas, borrarlas generaría
   inconsistencia con pagos que ya se hicieron. */
function eliminarSerieDescuento(grupoId){
  if(!grupoId){ toast('⚠️ Este descuento no tiene cuotas vinculadas','error'); return; }

  const mesActual = _mesActual();
  const serie = descuentos.filter(x => x.grupo_id === grupoId);
  const pendientes = serie.filter(x => x.periodo >= mesActual);
  const pasadas = serie.length - pendientes.length;

  if(!pendientes.length){
    toast('⚠️ No hay cuotas pendientes de este descuento — todas ya pasaron', 'error');
    return;
  }

  const t = trabajadores.find(x => x.rut === serie[0]?.trabajador_rut);
  const nombreTipo = _labelDescuento(serie[0]?.tipo);
  const aviso = pasadas > 0
    ? `Se eliminarán ${pendientes.length} cuota${pendientes.length!==1?'s':''} pendiente${pendientes.length!==1?'s':''} de "${nombreTipo}" de ${t?.nombre||'este trabajador'}.\n\nLas ${pasadas} cuota${pasadas!==1?'s':''} de meses ya pasados NO se tocan.\n\n¿Continuar?`
    : `Se eliminarán las ${pendientes.length} cuota${pendientes.length!==1?'s':''} de "${nombreTipo}" de ${t?.nombre||'este trabajador'} (ninguna se había cobrado todavía).\n\n¿Continuar?`;
  if(!confirm(aviso)) return;

  descuentos = descuentos.filter(x => !(x.grupo_id === grupoId && x.periodo >= mesActual));
  guardarDescuentos();
  renderDescuentos();
  _renderKPIsGL();
  toast(`✅ ${pendientes.length} cuota${pendientes.length!==1?'s':''} eliminada${pendientes.length!==1?'s':''}`, 'exito');
}

function _labelDescuento(tipo){
  const map = {
    anticipo:'Anticipo', prestamo:'Préstamo', caja_compensacion:'Caja de Compensación',
    cuota_sindical:'Cuota sindical', retencion_judicial:'Retención judicial', otro:'Otro',
  };
  return map[tipo]||tipo;
}

function _badgeDescuento(tipo){
  const map = {
    anticipo:          ['badge-rojo',     '💸 Anticipo'],
    prestamo:          ['badge-rojo',     '🏦 Préstamo'],
    caja_compensacion: ['badge-amarillo', '🏢 Caja Comp.'],
    cuota_sindical:    ['badge-gris',     '👥 Sindical'],
    retencion_judicial:['badge-rojo',     '⚖️ Ret. Judicial'],
    otro:              ['badge-gris',     '📋 Otro'],
  };
  const [cls,lbl] = map[tipo]||['badge-gris',tipo];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

/* ════════════════════════════════════════════════════════
   TAB 4 — HORAS EXTRAS
   ════════════════════════════════════════════════════════ */
function renderJornada(){
  const periodo    = document.getElementById('gl-jor-rev-mes')?.value || '';
  const mandante   = document.getElementById('gl-jor-rev-empresa')?.value || '';
  const filtroTrab = document.getElementById('gl-jor-rev-trabajador')?.value || '';
  const filtroTipo = document.getElementById('gl-jor-rev-tipo')?.value || '';
  const ruts       = _rutsFiltrados(mandante);

  let lista = jornada_especial.filter(j => j.periodo===periodo && ruts.includes(j.trabajador_rut));
  if(filtroTrab) lista = lista.filter(j => j.trabajador_rut === filtroTrab);
  if(filtroTipo) lista = lista.filter(j => j.tipo === filtroTipo);

  const tbody = document.getElementById('tbody-jornada');
  if(!tbody) return;

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--texto3);">Sin registros de horas extras en este período</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(j => {
    const t      = trabajadores.find(x => x.rut === j.trabajador_rut);
    const recargo = j.tipo==='hora_extra' ? (j.recargo==='100'?'100%':'50%') : '—';
    const monto   = _montoHoraExtra(j);
    return `<tr>
      <td style="font-size:13px;font-weight:500;">${t?.nombre||j.trabajador_rut}</td>
      <td>${_badgeJornada(j.tipo)}</td>
      <td style="font-size:12px;">${_fmtFecha(j.fecha)||'—'}</td>
      <td style="font-size:13px;font-weight:600;text-align:center;">${parseFloat(j.horas||0).toFixed(1)} h</td>
      <td style="font-size:12px;text-align:center;">${recargo}</td>
      <td style="font-size:13px;font-weight:600;color:var(--verde-dark);">${monto!==null ? '$'+monto.toLocaleString('es-CL') : '—'}</td>
      <td style="font-size:12px;color:var(--texto2);">${j.observacion||'—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarJornada('${j.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
}

/* ✅ NUEVO — Monto a pagar por un registro de hora extra, reutilizando la
   misma fórmula que ya usa variables.js para la liquidación (sueldo base
   ÷ 30 ÷ (horas semanales ÷ 5) × recargo). Solo aplica a tipo='hora_extra';
   los otros 3 tipos (compensada, cambio turno, turno especial) no tienen
   una fórmula de pago asociada. Si no hay contrato vigente para calcular,
   retorna null (la tabla muestra "—" en ese caso). */
function _montoHoraExtra(j){
  if(j.tipo !== 'hora_extra') return null;
  if(typeof _getContratoVigente !== 'function' || typeof _getSueldoBase !== 'function') return null;
  const contrato   = _getContratoVigente(j.trabajador_rut, j.periodo);
  const sueldoInfo = _getSueldoBase(j.trabajador_rut, j.periodo);
  if(!contrato || !sueldoInfo || !sueldoInfo.monto) return null;
  const divisor        = typeof DIVISOR_MES !== 'undefined' ? DIVISOR_MES : 30;
  const horasSemanales = parseFloat(contrato.horas_semana) || 45;
  const valorHoraOrd   = Math.round((sueldoInfo.monto / divisor) / (horasSemanales / 5));
  const recargo        = j.recargo === '100' ? 2.0 : 1.5;
  return Math.round(valorHoraOrd * recargo * (parseFloat(j.horas) || 0));
}

function toggleFormJornada(forzar){
  const wrap = document.getElementById('gl-jor-form-wrap');
  const abrir = forzar === true ? true : (forzar === false ? false : wrap.style.display === 'none');
  wrap.style.display = abrir ? 'block' : 'none';
  if(abrir){
    _poblarEmpresasGL();
    _buscadoresGL['jor-reg']?.reset();
  }
  onCambioTipoJornada();
  return abrir;
}

function onCambioTipoJornada(){
  const tipo   = document.getElementById('gl-jor-tipo')?.value;
  const recGrp = document.getElementById('gl-jor-recargo-grp');
  if(recGrp) recGrp.style.display = tipo==='hora_extra' ? 'block' : 'none';
}

function guardarJornada(){
  if(_guardandoGL) return;
  const empresa = document.getElementById('gl-jor-reg-empresa')?.value;
  const rut     = document.getElementById('gl-jor-reg-trabajador')?.value;
  const tipo    = document.getElementById('gl-jor-tipo')?.value;
  const fecha   = document.getElementById('gl-jor-fecha')?.value;
  const horas   = document.getElementById('gl-jor-horas')?.value;
  const recargo = document.getElementById('gl-jor-recargo')?.value||'50';
  const obs     = document.getElementById('gl-jor-obs')?.value||'';

  if(!empresa){ toast('⚠️ Selecciona la empresa','error'); return; }
  if(!rut||!tipo||!horas){ toast('⚠️ Completa trabajador, tipo y horas','error'); return; }

  // ✅ NUEVO — Tope legal diario (Art. 31 Código del Trabajo): máximo 2
  // horas extraordinarias por día. Solo aplica al tipo "hora_extra" — los
  // otros 3 tipos no son horas extraordinarias legales, no tienen tope.
  if(tipo === 'hora_extra'){
    const yaHorasDia = jornada_especial
      .filter(j => j.trabajador_rut === rut && j.tipo === 'hora_extra' && j.fecha === fecha)
      .reduce((s,j) => s + (parseFloat(j.horas)||0), 0);
    const totalDia = yaHorasDia + parseFloat(horas);
    if(totalDia > 2){
      const t = trabajadores.find(x => x.rut === rut);
      toast(`⚠️ Tope legal superado (Art. 31 Código del Trabajo — máx. 2h extra por día). ${t?.nombre||'Este trabajador'} ya tiene ${yaHorasDia.toFixed(1)}h registradas el ${_fmtFecha(fecha)}`, 'error');
      return;
    }

    // ✅ NUEVO — Tope legal semanal (Art. 31/32 CT, confirmado con
    // Dictamen DT N°60157): máximo 12 horas extraordinarias por semana
    // (lunes a domingo), sin importar cómo se repartan entre los días.
    // Combinado con el tope diario de arriba, esto ya cubre correctamente
    // el caso del "6º día" (si los primeros 5 días ya usaron las 12h,
    // el 6º día queda igual sin margen; si sobró margen, el 6º día puede
    // usarlo, pero nunca más de 2h por el tope diario de todas formas).
    const { inicio: semInicio, fin: semFin } = _semanaDeFecha(fecha);
    const yaHorasSemana = jornada_especial
      .filter(j => j.trabajador_rut === rut && j.tipo === 'hora_extra' && j.fecha >= semInicio && j.fecha <= semFin)
      .reduce((s,j) => s + (parseFloat(j.horas)||0), 0);
    const totalSemana = yaHorasSemana + parseFloat(horas);
    if(totalSemana > 12){
      const t = trabajadores.find(x => x.rut === rut);
      toast(`⚠️ Tope legal superado (Art. 31/32 Código del Trabajo — máx. 12h extra por semana). ${t?.nombre||'Este trabajador'} ya tiene ${yaHorasSemana.toFixed(1)}h registradas esta semana (${_fmtFecha(semInicio)} al ${_fmtFecha(semFin)})`, 'error');
      return;
    }
  }

  _guardandoGL = true;

  const j = {
    id:             Date.now().toString(),
    trabajador_rut: rut,
    periodo:        (fecha||_mesActual()).slice(0,7),
    tipo, fecha: fecha||'', horas: parseFloat(horas),
    recargo:        tipo==='hora_extra' ? recargo : null,
    observacion:    obs,
    registrado_por: sesionActiva?.usuario||'admin',
  };
  jornada_especial.push(j);
  guardarJornadaEspecial();
  toast('✅ Registro de horas extras guardado','exito');
  _resetForm('form-jornada');
  _buscadoresGL['jor-reg']?.reset();
  document.getElementById('gl-jor-form-wrap').style.display='none';
  renderJornada();
  _renderKPIsGL();
  _guardandoGL = false;
}

function eliminarJornada(id){
  if(!confirm('¿Eliminar este registro?')) return;
  jornada_especial = jornada_especial.filter(x => x.id!==id);
  guardarJornadaEspecial();
  renderJornada();
  _renderKPIsGL();
}

function _badgeJornada(tipo){
  const map = {
    hora_extra:      ['badge-rojo',     '⏱️ Hora Extra'],
    hora_compensada: ['badge-azul',     '🔄 Compensada'],
    cambio_turno:    ['badge-amarillo', '🔀 Cambio Turno'],
    turno_especial:  ['badge-gris',     '📋 T. Especial'],
  };
  const [cls,lbl] = map[tipo]||['badge-gris',tipo];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

/* ════════════════════════════════════════════════════════
   COMPONENTE REUTILIZABLE — BUSCADOR DE TRABAJADOR
   Autocomplete por nombre o RUT, acotado dinámicamente a una lista
   de RUTs (normalmente los de la empresa seleccionada en ese mismo
   bloque). Se usa 8 veces: Revisar + Registrar, en cada uno de los
   4 submódulos.

   cfg = {
     inputId, dropdownId, hiddenId,
     getRuts: () => [...RUTs permitidos ahora],
     permiteVacio: true si "sin selección" es válido (filtros "Revisar"),
     onSelect, onClear: callbacks opcionales,
   }
   Retorna { reset() }.
   ════════════════════════════════════════════════════════ */
function initBuscadorTrabajador(cfg){
  const input    = document.getElementById(cfg.inputId);
  const dropdown = document.getElementById(cfg.dropdownId);
  const hidden   = document.getElementById(cfg.hiddenId);
  if(!input || !dropdown || !hidden) return null;

  let items = [];
  let activeIdx = -1;

  function opcionesDisponibles(){
    const ruts = new Set((cfg.getRuts && cfg.getRuts()) || []);
    return trabajadores
      .filter(t => t.estado === 'activo' && ruts.has(t.rut))
      .sort((a,b) => a.nombre.localeCompare(b.nombre));
  }

  function pintar(lista){
    items = lista;
    activeIdx = -1;
    if(!lista.length){
      dropdown.innerHTML = `<div style="padding:10px 12px;font-size:12px;color:var(--texto3);">Sin resultados</div>`;
    } else {
      dropdown.innerHTML = lista.map((t,i) =>
        `<div class="bt-opcion" data-idx="${i}" style="padding:8px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--borde);">
          ${t.nombre} <span style="color:var(--texto3);font-size:11px;">· ${t.rut}</span>
        </div>`).join('');
    }
    dropdown.style.display = 'block';
  }

  function cerrar(){
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    items = [];
    activeIdx = -1;
  }

  function marcarActivo(){
    [...dropdown.children].forEach((el,i) => {
      el.style.background = i === activeIdx ? 'var(--gris-bg)' : 'transparent';
    });
  }

  function seleccionar(t){
    hidden.value = t.rut;
    input.value  = `${t.nombre} · ${t.rut}`;
    cerrar();
    if(cfg.onSelect) cfg.onSelect(t.rut);
  }

  function buscar(q){
    const base = opcionesDisponibles();
    const qn = (q||'').trim().toLowerCase();
    if(!qn) return pintar(base);
    pintar(base.filter(t =>
      t.nombre.toLowerCase().includes(qn) || t.rut.toLowerCase().includes(qn)
    ));
  }

  input.addEventListener('focus', () => buscar(''));
  input.addEventListener('input', () => {
    if(hidden.value){ hidden.value=''; if(cfg.permiteVacio && cfg.onClear) cfg.onClear(); }
    buscar(input.value);
  });
  input.addEventListener('keydown', e => {
    if(dropdown.style.display !== 'block') return;
    if(e.key === 'ArrowDown'){ e.preventDefault(); activeIdx = Math.min(activeIdx+1, items.length-1); marcarActivo(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); activeIdx = Math.max(activeIdx-1, 0); marcarActivo(); }
    else if(e.key === 'Enter'){ e.preventDefault(); if(items[activeIdx]) seleccionar(items[activeIdx]); }
    else if(e.key === 'Escape'){ cerrar(); }
  });
  dropdown.addEventListener('click', e => {
    const op = e.target.closest('.bt-opcion');
    if(!op) return;
    const t = items[parseInt(op.dataset.idx, 10)];
    if(t) seleccionar(t);
  });
  document.addEventListener('click', e => {
    if(e.target !== input && !dropdown.contains(e.target)) cerrar();
  });

  return {
    reset(){
      hidden.value = '';
      input.value  = '';
      cerrar();
    },
  };
}

/* ── UTILIDADES INTERNAS ───────────────────────────────── */
function _rutsFiltrados(mandanteId){
  return trabajadores
    .filter(t => {
      if(t.estado !== 'activo') return false;
      if(mandanteId && findMandante(t)?.id !== mandanteId) return false;
      return true;
    })
    .map(t => t.rut);
}

function _calcDias(inicio, fin){
  const d1 = new Date(inicio+'T12:00:00');
  const d2 = new Date(fin+'T12:00:00');
  return Math.max(1, Math.round((d2-d1)/(1000*60*60*24))+1);
}

/* Suma un día a una fecha ISO (YYYY-MM-DD) — usado para recorrer el rango
   completo de una novedad al calcular qué días ya quedaron clasificados. */
function _sumarDiaISO(fechaISO){
  const d = new Date(fechaISO + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function _fmtFecha(v){
  if(!v) return '—';
  const d = new Date(v+'T12:00:00');
  return isNaN(d) ? v : d.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'});
}

/* Rango lunes→domingo de la semana que contiene 'fecha' (YYYY-MM-DD),
   usado para el tope legal semanal de horas extra (Art. 31/32 CT). */
function _semanaDeFecha(fecha){
  const d = new Date(fecha + 'T12:00:00');
  const diaSemana = d.getDay(); // 0=domingo, 1=lunes, ... 6=sábado
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + offsetLunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const toYMD = x => x.toISOString().split('T')[0];
  return { inicio: toYMD(lunes), fin: toYMD(domingo) };
}

function _resetForm(id){
  const f = document.getElementById(id);
  if(f) f.reset();
}

/* ── API PÚBLICA PARA REMUNERACIONES ───────────────────── */
function getNovedadesPorRut(rut, periodo){
  return novedades.filter(n => n.trabajador_rut===rut && n.periodo===periodo);
}
function getHaberesPorRut(rut, periodo){
  return haberes_variables.filter(h => h.trabajador_rut===rut && h.periodo===periodo);
}
function getDescuentosPorRut(rut, periodo){
  return descuentos.filter(d => d.trabajador_rut===rut && d.periodo===periodo);
}
function getJornadaEspecialPorRut(rut, periodo){
  return jornada_especial.filter(j => j.trabajador_rut===rut && j.periodo===periodo);
}
