/* ════════════════════════════════════════════════════════
   GESTION-LABORAL.JS — Novedades, Haberes, Descuentos, Jornada
   AgroContratista · Versión 1.0
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

function initGestionLaboral(){
  cargarGestionLaboral();
  _poblarSelectsGL();
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
  const selects = ['gl-filtro-mandante','gl-nov-trabajador','gl-nov-filtro-trab','gl-hab-trabajador','gl-des-trabajador','gl-jor-trabajador'];
  selects.forEach(id => {
    const el = document.getElementById(id); if(!el) return;
    const val = el.value;
    const esMandante = id.includes('mandante');
    if(esMandante){
      el.innerHTML = '<option value="">Todos los mandantes</option>'
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
  const habPer  = haberes_variables.filter(h => h.periodo === periodo && ruts.includes(h.trabajador_rut));
  const desPer  = descuentos.filter(d       => d.periodo === periodo && ruts.includes(d.trabajador_rut));
  const jorPer  = jornada_especial.filter(j => j.periodo === periodo && ruts.includes(j.trabajador_rut));

  const totalHab = habPer.reduce((s,h) => s + (parseFloat(h.monto)||0), 0);
  const totalDes = desPer.reduce((s,d) => s + (parseFloat(d.monto)||0), 0);
  const totalHex = jorPer.filter(j => j.tipo === 'hora_extra').reduce((s,j) => s + (parseFloat(j.horas)||0), 0);

  _setKPI('gl-kpi-novedades',  novPer.length,                           'novedades período');
  _setKPI('gl-kpi-haberes',    '$'+totalHab.toLocaleString('es-CL'),    'haberes variables');
  _setKPI('gl-kpi-descuentos', '$'+totalDes.toLocaleString('es-CL'),    'descuentos período');
  _setKPI('gl-kpi-hextra',     totalHex.toFixed(1)+' h',                'horas extra');
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
    const ausRut      = ausencias.filter(a => a.rut === rut);
    const novsRut     = novsPer.filter(n => n.trabajador_rut === rut);
    const fechasClasif= novsRut.map(n => n.fecha_inicio);
    const sinClasif   = ausRut.filter(a => !fechasClasif.includes(a.fecha));

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
          <i class="ti ti-chevron-down"></i> Ver detalle
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
}

function toggleDetalleNovedad(rut){
  const rid  = rut.replace(/\W/g,'');
  const fila = document.getElementById(`detalle-${rid}`);
  const btn  = document.querySelector(`#fila-res-${rid} button i`);
  if(!fila) return;
  const abierto = fila.style.display !== 'none';
  fila.style.display = abierto ? 'none' : 'table-row';
  if(btn) btn.className = abierto ? 'ti ti-chevron-down' : 'ti ti-chevron-up';
}

function _htmlDetalleNovedad(f){
  const ausenciasHtml = f.sinClasif.map(a => `
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--borde);">
      <span style="font-size:12px;color:var(--texto2);min-width:90px;">${_fmtFecha(a.fecha)}</span>
      <span class="badge badge-amarillo">⚠️ Sin clasificar</span>
      <span style="font-size:12px;color:var(--texto3);flex:1;">Detectada desde Asistencia</span>
      <button class="btn btn-secondary btn-sm" onclick="clasificarAusencia('${a.rut}','${a.fecha}')">
        <i class="ti ti-tag"></i> Clasificar
      </button>
    </div>`).join('');

  const novsHtml = f.novsRut.map(n => `
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--borde);">
      <span style="font-size:12px;color:var(--texto2);min-width:90px;">${_fmtFecha(n.fecha_inicio)}${n.fecha_fin&&n.fecha_fin!==n.fecha_inicio?' → '+_fmtFecha(n.fecha_fin):''}</span>
      ${_badgeNovedad(n.tipo)}
      <span style="font-size:12px;color:var(--texto2);flex:1;">${n.observacion||'—'}</span>
      <span class="badge ${n.aprobado?'badge-verde':'badge-gris'}">${n.aprobado?'Aprobada':'Pendiente'}</span>
      ${!n.aprobado?`<button class="btn btn-primary btn-sm" onclick="aprobarNovedad('${n.id}')"><i class="ti ti-check"></i></button>`:''}
      <button class="btn btn-danger btn-sm" onclick="eliminarNovedad('${n.id}')"><i class="ti ti-trash"></i></button>
    </div>`).join('');

  const vacio = !ausenciasHtml && !novsHtml
    ? '<div style="color:var(--texto3);font-size:13px;padding:8px 0;">Sin movimientos este período</div>'
    : '';

  return `<div style="max-width:900px;">${ausenciasHtml}${novsHtml}${vacio}</div>`;
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
  if(selTipo)  selTipo.value  = 'ausencia_injustificada';
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

function guardarNovedad(){
  const rut      = document.getElementById('gl-nov-trabajador')?.value;
  const tipo     = document.getElementById('gl-nov-tipo')?.value;
  const inicio   = document.getElementById('gl-nov-fecha-inicio')?.value;
  const fin      = document.getElementById('gl-nov-fecha-fin')?.value;
  const obs      = document.getElementById('gl-nov-obs')?.value||'';

  if(!rut || !tipo || !inicio){ toast('⚠️ Completa trabajador, tipo y fecha inicio','error'); return; }

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
   TAB 2 — HABERES VARIABLES
   ════════════════════════════════════════════════════════ */
function renderHaberes(){
  const periodo  = _getPeriodo();
  const mandante = document.getElementById('gl-filtro-mandante')?.value||'';
  const ruts     = _rutsFiltrados(mandante);
  const lista    = haberes_variables.filter(h => h.periodo===periodo && ruts.includes(h.trabajador_rut));
  const tbody    = document.getElementById('tbody-haberes');
  if(!tbody) return;

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--texto3);">Sin haberes variables en este período</td></tr>`;
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
  wrap.style.display = wrap.style.display==='none' ? 'block' : 'none';
}

function guardarHaber(){
  const rut   = document.getElementById('gl-hab-trabajador')?.value;
  const tipo  = document.getElementById('gl-hab-tipo')?.value;
  const monto = document.getElementById('gl-hab-monto')?.value;
  const fecha = document.getElementById('gl-hab-fecha')?.value;
  const obs   = document.getElementById('gl-hab-obs')?.value||'';

  if(!rut||!tipo||!monto){ toast('⚠️ Completa trabajador, tipo y monto','error'); return; }

  const h = {
    id:             Date.now().toString(),
    trabajador_rut: rut,
    periodo:        (fecha||_getPeriodo()).slice(0,7),
    tipo, monto: parseFloat(monto), fecha: fecha||'', observacion: obs,
    registrado_por: sesionActiva?.usuario||'admin',
  };
  haberes_variables.push(h);
  guardarHaberes();
  toast('✅ Haber variable registrado','exito');
  _resetForm('form-haber');
  document.getElementById('gl-hab-form-wrap').style.display='none';
  renderHaberes();
  _renderKPIsGL();
}

function eliminarHaber(id){
  if(!confirm('¿Eliminar este haber?')) return;
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
  const rut    = document.getElementById('gl-des-trabajador')?.value;
  const tipo   = document.getElementById('gl-des-tipo')?.value;
  const monto  = document.getElementById('gl-des-monto')?.value;
  const cuotas = document.getElementById('gl-des-cuotas')?.value||1;
  const obs    = document.getElementById('gl-des-obs')?.value||'';

  if(!rut||!tipo||!monto){ toast('⚠️ Completa trabajador, tipo y monto','error'); return; }

  const d = {
    id:              Date.now().toString(),
    trabajador_rut:  rut,
    periodo:         _getPeriodo(),
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
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--texto3);">Sin registros de jornada especial en este período</td></tr>`;
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
  toast('✅ Jornada especial registrada','exito');
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
