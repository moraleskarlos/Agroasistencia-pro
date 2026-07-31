/* ════════════════════════════════════════════════════════
   GESTION-LABORAL.JS — Novedades, Bonificaciones, Descuentos, Horas Extras
   AgroContratista · Versión 1.1
   (Bonificaciones: primer submódulo reestructurado bajo el patrón
   "Revisar información / Registrar" — ver ESPECIFICACION_GESTION_LABORAL_2.0.md.
   El resto de los submódulos solo recibió cambio de nombre por ahora.)
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
let _tabGLActivo = 'gl-novedades';

/* Instancias del Buscador de Trabajador usadas por Bonificaciones —
   se guardan en variables de módulo para poder llamar a .reset()
   desde otras funciones (ej. al cambiar de empresa o guardar). */
let _btHabRevisar    = null;
let _btHabRegistrar  = null;

function initGestionLaboral(){
  cargarGestionLaboral();
  _poblarSelectsGL();

  _btHabRevisar = initBuscadorTrabajador({
    inputId:    'gl-hab-rev-trabajador-input',
    dropdownId: 'gl-hab-rev-trabajador-dropdown',
    hiddenId:   'gl-hab-rev-trabajador',
    permiteVacio: true, // "todos los trabajadores" es una opción válida
    getRuts: () => _rutsFiltrados(document.getElementById('gl-hab-rev-empresa')?.value || ''),
    onSelect: renderHaberes,
    onClear:  renderHaberes,
  });

  _btHabRegistrar = initBuscadorTrabajador({
    inputId:    'gl-hab-reg-trabajador-input',
    dropdownId: 'gl-hab-reg-trabajador-dropdown',
    hiddenId:   'gl-hab-reg-trabajador',
    permiteVacio: false,
    getRuts: () => _rutsFiltrados(document.getElementById('gl-hab-reg-empresa')?.value || ''),
  });

  // Si cambia la empresa de "Registrar Bonificación", se limpia la
  // selección de trabajador (puede que ya no pertenezca a la empresa
  // nueva) — cascada empresa → trabajador.
  document.getElementById('gl-hab-reg-empresa')?.addEventListener('change', () => _btHabRegistrar?.reset());
  // Igual para "Revisar información de Bonificaciones".
  document.getElementById('gl-hab-rev-empresa')?.addEventListener('change', () => { _btHabRevisar?.reset(); renderHaberes(); });

  switchTabGL(_tabGLActivo);
}

function switchTabGL(tab){
  _tabGLActivo = tab;
  ['gl-novedades','gl-haberes','gl-descuentos','gl-jornada'].forEach(id => {
    const btn     = document.getElementById('tab-' + id);
    const panel   = document.getElementById('panel-' + id);
    const activo  = id === tab;
    if(btn)   { btn.classList.toggle('activo', activo); }
    if(panel) { panel.style.display = activo ? 'block' : 'none'; }
  });
  if(tab === 'gl-novedades')  renderNovedades();
  if(tab === 'gl-haberes')    renderHaberes();
  if(tab === 'gl-descuentos') renderDescuentos();
  if(tab === 'gl-jornada')    renderJornada();
  _renderKPIsGL();
}

function _poblarSelectsGL(){
  // gl-hab-trabajador ya no existe: Bonificaciones usa el Buscador de
  // Trabajador (ver _poblarEmpresasBonificaciones + initBuscadorTrabajador).
  const selects = ['gl-filtro-mandante','gl-nov-trabajador','gl-nov-filtro-trab','gl-des-trabajador','gl-jor-trabajador'];
  selects.forEach(id => {
    const el = document.getElementById(id); if(!el) return;
    const val = el.value;
    const esMandante = id.includes('mandante');
    if(esMandante){
      el.innerHTML = '<option value="">Todas las Empresas Mandante</option>'
        + empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    } else if(id === 'gl-nov-filtro-trab'){
      el.innerHTML = '<option value="">Todos los trabajadores</option>'
        + trabajadores.filter(t => t.estado === 'activo')
          .map(t => `<option value="${t.rut}">${t.nombre}</option>`).join('');
    } else {
      el.innerHTML = '<option value="">— Seleccionar trabajador —</option>'
        + trabajadores.filter(t => t.estado === 'activo')
          .map(t => `<option value="${t.rut}">${t.nombre} · ${t.rut}</option>`).join('');
    }
    if(val) el.value = val;
  });
  // Período: mes actual por defecto
  const hoy   = new Date();
  const mes   = String(hoy.getMonth()+1).padStart(2,'0');
  const anio  = hoy.getFullYear();
  const elPer = document.getElementById('gl-filtro-periodo');
  if(elPer && !elPer.value) elPer.value = `${anio}-${mes}`;

  // Mes por defecto del selector "Revisar información de Bonificaciones"
  const elPerHab = document.getElementById('gl-hab-fecha-mes');
  if(elPerHab && !elPerHab.value) elPerHab.value = `${anio}-${mes}`;

  _poblarEmpresasBonificaciones();
}

/* Empresas del submódulo Bonificaciones — se manejan aparte de
   gl-filtro-mandante porque este submódulo ya no depende del filtro
   global de la página (es autocontenido: "Revisar" y "Registrar"
   tienen cada uno su propio selector de empresa). */
function _poblarEmpresasBonificaciones(){
  const revSel = document.getElementById('gl-hab-rev-empresa');
  if(revSel){
    const val = revSel.value;
    revSel.innerHTML = '<option value="">Todas las Empresas Mandante</option>'
      + empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    if(val) revSel.value = val;
  }

  const regSel = document.getElementById('gl-hab-reg-empresa');
  if(regSel){
    const val = regSel.value;
    if(empresas.length === 1){
      // Una sola empresa mandante: se deja preseleccionada, sin obligar
      // a un clic sobre algo que no es realmente una decisión.
      regSel.innerHTML = `<option value="${empresas[0].id}">${empresas[0].nombre}</option>`;
      regSel.value = empresas[0].id;
    } else {
      regSel.innerHTML = '<option value="">— Seleccionar empresa —</option>'
        + empresas.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
      if(val) regSel.value = val;
    }
  }
}

function _getPeriodo(){
  const v = document.getElementById('gl-filtro-periodo')?.value || '';
  return v; // formato YYYY-MM
}

function _renderKPIsGL(){
  const periodo  = _getPeriodo();
  const mandante = document.getElementById('gl-filtro-mandante')?.value || '';

  // Filtro base de trabajadores
  const trabsFiltro = trabajadores.filter(t => {
    if(t.estado !== 'activo') return false;
    if(mandante && findMandante(t)?.id !== mandante) return false;
    return true;
  });
  const ruts = trabsFiltro.map(t => t.rut);

  const novPer  = novedades.filter(n        => n.periodo === periodo && ruts.includes(n.trabajador_rut));
  const desPer  = descuentos.filter(d       => d.periodo === periodo && ruts.includes(d.trabajador_rut));
  const jorPer  = jornada_especial.filter(j => j.periodo === periodo && ruts.includes(j.trabajador_rut));

  // Bonificaciones ya no depende del filtro global "Revisar mes / Elegir
  // empresa" de arriba — usa su propio rango (Día/Mes/Rango) y su propio
  // selector de empresa, para que el KPI y la tabla de la pestaña siempre
  // muestren el mismo período.
  const { inicio: habIni, fin: habFin } = _glHabGetRango();
  const mandanteHab = document.getElementById('gl-hab-rev-empresa')?.value || '';
  const rutsHab      = _rutsFiltrados(mandanteHab);
  const habPer  = haberes_variables.filter(h =>
    rutsHab.includes(h.trabajador_rut) &&
    (!habIni || !habFin || (h.fecha >= habIni && h.fecha <= habFin))
  );

  const totalHab = habPer.reduce((s,h) => s + (parseFloat(h.monto)||0), 0);
  const totalDes = desPer.reduce((s,d) => s + (parseFloat(d.monto)||0), 0);
  const totalHex = jorPer.filter(j => j.tipo === 'hora_extra').reduce((s,j) => s + (parseFloat(j.horas)||0), 0);

  // Trabajadores DISTINTOS por tipo de novedad — no cantidad de días/registros
  const contarTrabajadores = tipo => new Set(novPer.filter(n => n.tipo === tipo).map(n => n.trabajador_rut)).size;

  _setKPI('gl-kpi-goce',        contarTrabajadores('permiso_goce'),      'trabajadores');
  _setKPI('gl-kpi-singoce',     contarTrabajadores('permiso_sin_goce'),  'trabajadores');
  _setKPI('gl-kpi-licencia',    contarTrabajadores('licencia_medica'),   'trabajadores');
  _setKPI('gl-kpi-inasistencia',contarTrabajadores('ausencia_injustificada'), 'trabajadores');
  _setKPI('gl-kpi-haberes',    '$'+totalHab.toLocaleString('es-CL'),    'bonificaciones');
  _setKPI('gl-kpi-descuentos', '$'+totalDes.toLocaleString('es-CL'),    'descuentos período');
  _setKPI('gl-kpi-hextra',     totalHex.toFixed(1)+' h',                'horas extra');

  // Solo se muestran las tarjetas relacionadas con la pestaña activa — el
  // resto queda oculto, para no mezclar información de otros submódulos.
  const visibles = {
    'gl-novedades':  ['gl-kpi-goce','gl-kpi-singoce','gl-kpi-licencia','gl-kpi-inasistencia'],
    'gl-haberes':    ['gl-kpi-haberes'],
    'gl-descuentos': ['gl-kpi-descuentos'],
    'gl-jornada':    ['gl-kpi-hextra'],
  }[_tabGLActivo] || [];
  ['gl-kpi-goce','gl-kpi-singoce','gl-kpi-licencia','gl-kpi-inasistencia','gl-kpi-haberes','gl-kpi-descuentos','gl-kpi-hextra'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = visibles.includes(id) ? '' : 'none';
  });
}

function _setKPI(id, val, sub){
  const el = document.getElementById(id);
  if(!el) return;
  el.querySelector('.kpi-value').textContent = val;
  el.querySelector('.kpi-sub').textContent   = sub;
}

/* ════════════════════════════════════════════════════════
   TAB 1 — NOVEDADES (vista resumen por trabajador)
   ════════════════════════════════════════════════════════ */
function renderNovedades(){
  const periodo   = _getPeriodo();
  const mandante  = document.getElementById('gl-filtro-mandante')?.value || '';
  const filtroRut = document.getElementById('gl-nov-filtro-trab')?.value || '';
  const filtroTipo= document.getElementById('gl-nov-filtro-tipo')?.value || '';
  const ruts      = _rutsFiltrados(mandante);
  const tbody     = document.getElementById('tbody-novedades');
  if(!tbody) return;

  const ausencias  = _leerAusenciasAsistencia(periodo, ruts);
  const novsPer    = novedades.filter(n => n.periodo === periodo && ruts.includes(n.trabajador_rut));

  // Agrupar por trabajador
  const rutsMostrar = filtroRut ? [filtroRut] : ruts;
  const filas = rutsMostrar.map(rut => {
    const t           = trabajadores.find(x => x.rut === rut);
    if(!t) return null;
    // Nunca deben aparecer ausencias en fechas anteriores al ingreso real del
    // trabajador — no debería existir historial laboral antes de esa fecha.
    const ausRut      = ausencias.filter(a => a.rut === rut && (!t.fecha_ingreso || a.fecha >= t.fecha_ingreso));
    const novsRut     = novsPer.filter(n => n.trabajador_rut === rut);
    // Un día está "clasificado" si cae dentro del rango [fecha_inicio, fecha_fin]
    // de CUALQUIER novedad del trabajador — no solo si coincide con el primer día.
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

    // Filtro por tipo
    if(filtroTipo === 'sin_clasificar' && sinClasif.length === 0) return null;
    if(filtroTipo && filtroTipo !== 'sin_clasificar'){
      if(!novsRut.some(n => n.tipo === filtroTipo)) return null;
    }

    const totalDias   = novsRut.reduce((s,n) => s + (n.dias||1), 0);
    const pendientes  = novsRut.filter(n => !n.aprobado).length;

    return { rut, t, sinClasif, novsRut, totalDias, pendientes };
  }).filter(Boolean);

  if(!filas.length){
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
      <td style="font-size:12px;font-family:monospace;color:var(--texto2);">${f.rut}</td>
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

/* Reabre el detalle del trabajador que se estaba revisando antes de que la
   tabla se reconstruyera (ej. tras guardar/aprobar/eliminar una novedad),
   para no perder el contexto en el que estaba el usuario. */
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
  // Una sola lista, ordenada por fecha — cada fecha se queda en su lugar y
  // muestra su propio estado (pendiente o ya clasificada), sin saltar de una
  // sección a otra al clasificarla. Una novedad de varios días (ej. licencia
  // de una semana) se expande en una fila por cada día, no en una sola fila
  // con el rango de fechas hacia el lado.
  const combinado = [
    ...f.sinClasif.map(a => ({ orden: a.fecha, tipoFila: 'pendiente', a })),
  ];
  f.novsRut.forEach(n => {
    let d = n.fecha_inicio;
    const fin = n.fecha_fin || n.fecha_inicio;
    while(d <= fin){
      combinado.push({ orden: d, tipoFila: 'novedad', n, fechaFila: d });
      d = _sumarDiaISO(d);
    }
  });
  combinado.sort((x,y) => x.orden.localeCompare(y.orden));

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
          <i class="ti ti-tag"></i> Clasificar
        </button>
      </div>`;
    }
    const n = item.n;
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--borde);">
      <span style="font-size:12px;color:var(--texto2);min-width:90px;">${_fmtFecha(item.fechaFila)}</span>
      ${_badgeNovedad(n.tipo)}
      <span style="font-size:12px;color:var(--texto2);flex:1;">${n.observacion||'—'}</span>
      <span class="badge ${n.aprobado?'badge-verde':'badge-gris'}">${n.aprobado?'Aprobada':'Pendiente'}</span>
      ${!n.aprobado?`<button class="btn btn-primary btn-sm" onclick="aprobarNovedad('${n.id}')"><i class="ti ti-check"></i></button>`:''}
      <button class="btn btn-danger btn-sm" onclick="eliminarNovedad('${n.id}')"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('');

  return `<div style="max-width:900px;">${filasHtml}</div>`;
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
    // Trabajadores activos sin marcación ese día = ausencia
    ruts.forEach(rut => {
      const marcacion = data.find(x => x.rut === rut);
      if(!marcacion){
        // Verificar que ese día no sea fin de semana (opcional)
        const diaSemana = new Date(fecha+'T12:00:00').getDay(); // 0=Dom, 6=Sáb
        if(diaSemana !== 0 && diaSemana !== 6){
          ausencias.push({ rut, fecha });
        }
      }
    });
  }
  return ausencias;
}

function clasificarAusencia(rut, fecha){
  // Pre-poblar formulario con los datos de la ausencia
  const periodo = fecha.slice(0,7);
  const sel     = document.getElementById('gl-nov-trabajador');
  const selTipo = document.getElementById('gl-nov-tipo');
  const iniFecha= document.getElementById('gl-nov-fecha-inicio');
  const finFecha= document.getElementById('gl-nov-fecha-fin');
  if(sel)      sel.value      = rut;
  if(selTipo)  selTipo.value  = '';
  if(iniFecha) iniFecha.value = fecha;
  if(finFecha) finFecha.value = fecha;
  document.getElementById('gl-nov-form-wrap').style.display = 'block';
  document.getElementById('gl-nov-trabajador').focus();
}

function toggleFormNovedad(){
  const wrap = document.getElementById('gl-nov-form-wrap');
  wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
  if(wrap.style.display === 'block'){
    // Período por defecto
    const p = _getPeriodo();
    const el = document.getElementById('gl-nov-periodo');
    if(el && p) el.value = p;
  }
}

let _guardandoGL = false;

function guardarNovedad(){
  if(_guardandoGL) return; // evita duplicar por doble clic
  const rut      = document.getElementById('gl-nov-trabajador')?.value;
  const tipo     = document.getElementById('gl-nov-tipo')?.value;
  const inicio   = document.getElementById('gl-nov-fecha-inicio')?.value;
  const fin      = document.getElementById('gl-nov-fecha-fin')?.value;
  const obs      = document.getElementById('gl-nov-obs')?.value||'';

  if(!rut || !tipo || !inicio){ toast('⚠️ Completa trabajador, tipo y fecha inicio','error'); return; }

  // Red de seguridad adicional: bloquea un duplicado exacto aunque el clic
  // haya llegado a pasar el bloqueo de arriba (ej. recarga a medio camino)
  const yaExiste = novedades.some(n =>
    n.trabajador_rut === rut && n.tipo === tipo &&
    n.fecha_inicio === inicio && n.fecha_fin === (fin || inicio));
  if(yaExiste){ toast('⚠️ Ya existe una novedad idéntica registrada','error'); return; }

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
    aprobado:        false,
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
  document.getElementById('gl-nov-form-wrap').style.display = 'none';
  renderNovedades();
  _renderKPIsGL();
  _guardandoGL = false;
}

function aprobarNovedad(id){
  const n = novedades.find(x => x.id === id);
  if(!n) return;
  n.aprobado = true;
  guardarNovedades();
  toast('✅ Novedad aprobada','exito');
  renderNovedades();
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
   TAB 2 — BONIFICACIONES (antes "Haberes Variables")
   Reestructurado bajo el patrón "Revisar información / Registrar":
   ver ESPECIFICACION_GESTION_LABORAL_2.0.md. Autocontenido — no
   depende del filtro global "Revisar mes / Elegir empresa" de arriba.
   ════════════════════════════════════════════════════════ */

/* Estado del selector temporal de "Revisar información de
   Bonificaciones": 'dia' | 'mes' | 'rango'. Los tres modos son
   solo formas distintas de definir el mismo rango [inicio, fin]
   contra el que se filtra — no hay tres lógicas separadas. */
let _glHabModo = 'mes';

function glHabSetModo(modo){
  _glHabModo = modo;
  ['dia','mes','rango'].forEach(m => {
    const btn = document.getElementById('gl-hab-modo-'+m);
    if(btn) btn.classList.toggle('activo', m === modo);
  });
  const wDia   = document.getElementById('gl-hab-fecha-dia-wrap');
  const wMes   = document.getElementById('gl-hab-fecha-mes-wrap');
  const wRango = document.getElementById('gl-hab-fecha-rango-wrap');
  if(wDia)   wDia.style.display   = modo === 'dia'   ? 'block' : 'none';
  if(wMes)   wMes.style.display   = modo === 'mes'   ? 'block' : 'none';
  if(wRango) wRango.style.display = modo === 'rango' ? 'flex'  : 'none';
  renderHaberes();
  _renderKPIsGL();
}

/* Resuelve el rango [inicio, fin] vigente según el modo activo.
   Formato de fechas: 'YYYY-MM-DD' (comparable como texto, igual
   que el resto del sistema). */
function _glHabGetRango(){
  if(_glHabModo === 'dia'){
    const v = document.getElementById('gl-hab-fecha-dia')?.value || '';
    return { inicio: v, fin: v };
  }
  if(_glHabModo === 'rango'){
    const ini = document.getElementById('gl-hab-fecha-ini')?.value || '';
    const fin = document.getElementById('gl-hab-fecha-fin')?.value || '';
    return { inicio: ini, fin: fin };
  }
  // modo 'mes' (por defecto)
  const v = document.getElementById('gl-hab-fecha-mes')?.value || '';
  if(!v) return { inicio: '', fin: '' };
  const [y, m] = v.split('-').map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  return { inicio: `${v}-01`, fin: `${v}-${String(ultimoDia).padStart(2,'0')}` };
}

function renderHaberes(){
  const { inicio, fin } = _glHabGetRango();
  const mandante   = document.getElementById('gl-hab-rev-empresa')?.value || '';
  const filtroTrab = document.getElementById('gl-hab-rev-trabajador')?.value || '';
  const filtroTipo = document.getElementById('gl-hab-rev-tipo')?.value || '';
  const ruts       = _rutsFiltrados(mandante);

  let lista = haberes_variables.filter(h =>
    ruts.includes(h.trabajador_rut) &&
    (!inicio || !fin || (h.fecha >= inicio && h.fecha <= fin))
  );
  if(filtroTrab) lista = lista.filter(h => h.trabajador_rut === filtroTrab);
  if(filtroTipo) lista = lista.filter(h => h.tipo === filtroTipo);

  const tbody = document.getElementById('tbody-haberes');
  if(!tbody) return;

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--texto3);">Sin bonificaciones registradas en este rango</td></tr>`;
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

function toggleFormHaber(){
  const wrap = document.getElementById('gl-hab-form-wrap');
  const abrir = wrap.style.display === 'none';
  wrap.style.display = abrir ? 'block' : 'none';
  if(abrir){
    // Cada vez que se abre "Registrar Bonificación" se limpia la
    // selección anterior del buscador, para no arrastrar por error
    // un trabajador de otra empresa/registro previo.
    _poblarEmpresasBonificaciones();
    _btHabRegistrar?.reset();
  }
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
    periodo:        (fecha||_getPeriodo()).slice(0,7),
    tipo, monto: parseFloat(monto), fecha: fecha||'', observacion: obs,
    registrado_por: sesionActiva?.usuario||'admin',
  };
  haberes_variables.push(h);
  guardarHaberes();
  toast('✅ Bonificación registrada','exito');
  _resetForm('form-haber');
  _btHabRegistrar?.reset();
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
  const periodo  = _getPeriodo();
  const mandante = document.getElementById('gl-filtro-mandante')?.value||'';
  const ruts     = _rutsFiltrados(mandante);
  const lista    = descuentos.filter(d => d.periodo===periodo && ruts.includes(d.trabajador_rut));
  const tbody    = document.getElementById('tbody-descuentos');
  if(!tbody) return;

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--texto3);">Sin descuentos en este período</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(d => {
    const t = trabajadores.find(x => x.rut === d.trabajador_rut);
    const saldo = (parseFloat(d.monto_total||d.monto||0) - parseFloat(d.monto_pagado||0));
    return `<tr>
      <td style="font-size:13px;font-weight:500;">${t?.nombre||d.trabajador_rut}</td>
      <td>${_badgeDescuento(d.tipo)}</td>
      <td style="font-size:13px;font-weight:600;color:var(--danger);">$${parseFloat(d.monto||0).toLocaleString('es-CL')}</td>
      <td style="font-size:12px;text-align:center;">${d.cuotas_total||1}</td>
      <td style="font-size:12px;text-align:center;">${d.cuotas_pagadas||0}</td>
      <td style="font-size:13px;font-weight:500;">$${saldo.toLocaleString('es-CL')}</td>
      <td style="font-size:12px;color:var(--texto2);">${d.observacion||'—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarDescuento('${d.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
}

function toggleFormDescuento(){
  const wrap = document.getElementById('gl-des-form-wrap');
  wrap.style.display = wrap.style.display==='none' ? 'block' : 'none';
}

function guardarDescuento(){
  if(_guardandoGL) return;
  const rut    = document.getElementById('gl-des-trabajador')?.value;
  const tipo   = document.getElementById('gl-des-tipo')?.value;
  const monto  = document.getElementById('gl-des-monto')?.value;
  const cuotas = document.getElementById('gl-des-cuotas')?.value||1;
  const obs    = document.getElementById('gl-des-obs')?.value||'';

  if(!rut||!tipo||!monto){ toast('⚠️ Completa trabajador, tipo y monto','error'); return; }

  const periodoActual = _getPeriodo();
  const yaExiste = descuentos.some(d =>
    d.trabajador_rut === rut && d.tipo === tipo &&
    d.monto === parseFloat(monto) && d.periodo === periodoActual);
  if(yaExiste){ toast('⚠️ Ya existe un descuento idéntico registrado este período','error'); return; }

  _guardandoGL = true;

  const d = {
    id:              Date.now().toString(),
    trabajador_rut:  rut,
    periodo:         periodoActual,
    tipo, monto: parseFloat(monto),
    monto_total:     parseFloat(monto) * parseInt(cuotas),
    monto_pagado:    parseFloat(monto),
    cuotas_total:    parseInt(cuotas),
    cuotas_pagadas:  1,
    observacion:     obs,
    registrado_por:  sesionActiva?.usuario||'admin',
  };
  descuentos.push(d);
  guardarDescuentos();
  toast('✅ Descuento registrado','exito');
  _resetForm('form-descuento');
  document.getElementById('gl-des-form-wrap').style.display='none';
  renderDescuentos();
  _renderKPIsGL();
  _guardandoGL = false;
}

function eliminarDescuento(id){
  if(!confirm('¿Eliminar este descuento?')) return;
  descuentos = descuentos.filter(x => x.id!==id);
  guardarDescuentos();
  renderDescuentos();
  _renderKPIsGL();
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
   TAB 4 — JORNADA ESPECIAL
   ════════════════════════════════════════════════════════ */
function renderJornada(){
  const periodo  = _getPeriodo();
  const mandante = document.getElementById('gl-filtro-mandante')?.value||'';
  const ruts     = _rutsFiltrados(mandante);
  const lista    = jornada_especial.filter(j => j.periodo===periodo && ruts.includes(j.trabajador_rut));
  const tbody    = document.getElementById('tbody-jornada');
  if(!tbody) return;

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--texto3);">Sin registros de horas extras en este período</td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(j => {
    const t      = trabajadores.find(x => x.rut === j.trabajador_rut);
    const recargo = j.tipo==='hora_extra' ? (j.recargo==='100'?'100%':'50%') : '—';
    return `<tr>
      <td style="font-size:13px;font-weight:500;">${t?.nombre||j.trabajador_rut}</td>
      <td>${_badgeJornada(j.tipo)}</td>
      <td style="font-size:12px;">${_fmtFecha(j.fecha)||'—'}</td>
      <td style="font-size:13px;font-weight:600;text-align:center;">${parseFloat(j.horas||0).toFixed(1)} h</td>
      <td style="font-size:12px;text-align:center;">${recargo}</td>
      <td style="font-size:12px;color:var(--texto2);">${j.observacion||'—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarJornada('${j.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
}

function toggleFormJornada(){
  const wrap = document.getElementById('gl-jor-form-wrap');
  wrap.style.display = wrap.style.display==='none' ? 'block' : 'none';
  // Mostrar/ocultar campo recargo
  onCambioTipoJornada();
}

function onCambioTipoJornada(){
  const tipo   = document.getElementById('gl-jor-tipo')?.value;
  const recGrp = document.getElementById('gl-jor-recargo-grp');
  if(recGrp) recGrp.style.display = tipo==='hora_extra' ? 'block' : 'none';
}

function guardarJornada(){
  const rut    = document.getElementById('gl-jor-trabajador')?.value;
  const tipo   = document.getElementById('gl-jor-tipo')?.value;
  const fecha  = document.getElementById('gl-jor-fecha')?.value;
  const horas  = document.getElementById('gl-jor-horas')?.value;
  const recargo= document.getElementById('gl-jor-recargo')?.value||'50';
  const obs    = document.getElementById('gl-jor-obs')?.value||'';

  if(!rut||!tipo||!horas){ toast('⚠️ Completa trabajador, tipo y horas','error'); return; }

  const j = {
    id:             Date.now().toString(),
    trabajador_rut: rut,
    periodo:        (fecha||_getPeriodo()).slice(0,7),
    tipo, fecha: fecha||'', horas: parseFloat(horas),
    recargo:        tipo==='hora_extra' ? recargo : null,
    observacion:    obs,
    registrado_por: sesionActiva?.usuario||'admin',
  };
  jornada_especial.push(j);
  guardarJornadaEspecial();
  toast('✅ Registro de horas extras guardado','exito');
  _resetForm('form-jornada');
  document.getElementById('gl-jor-form-wrap').style.display='none';
  renderJornada();
  _renderKPIsGL();
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
   de RUTs (normalmente los de la empresa seleccionada). Reemplaza
   al <select> largo de trabajador en los formularios de registro.

   cfg = {
     inputId:    id del <input type="text"> visible,
     dropdownId: id del <div> donde se pintan las opciones,
     hiddenId:   id del <input type="hidden"> que guarda el RUT elegido,
     getRuts:    función que retorna el array de RUTs permitidos
                 en este momento (se llama en cada búsqueda, así
                 refleja cambios de empresa sin necesidad de reiniciar),
     permiteVacio: true si "sin selección" es un resultado válido
                 (ej. el filtro "Revisar" puede quedar en "todos"),
     onSelect:   callback opcional al elegir un trabajador,
     onClear:    callback opcional al vaciar la selección,
   }
   Retorna { reset() } para limpiar la selección desde afuera
   (ej. al cambiar de empresa o tras guardar un formulario).
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
