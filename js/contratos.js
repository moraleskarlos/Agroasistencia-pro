/* ════ CONTRATOS ════ */

function cargarContratos(){
  try{ contratos = JSON.parse(localStorage.getItem(LOCAL_C))  || []; } catch{ contratos = []; }
  try{ anexos    = JSON.parse(localStorage.getItem(LOCAL_AN)) || []; } catch{ anexos    = []; }
  _migrarNumerosContratoRetroactivo();
}

function guardarContratos(){
  localStorage.setItem(LOCAL_C,  JSON.stringify(contratos));
  localStorage.setItem(LOCAL_AN, JSON.stringify(anexos));
}

/* Nº de Contrato correlativo, independiente por Empresa Contratista (cada
   empresa tiene su propio RUT, aunque compartan dueño) — se guarda aparte en
   localStorage, no en el objeto contrato, para no perder el conteo si un
   contrato se borra. */
function _siguienteNumeroContrato(epId){
  const key = 'contrato_numero_contador';
  const contador = JSON.parse(localStorage.getItem(key) || '{}');
  const ep = epId || 'sin-empresa';
  contador[ep] = (contador[ep] || 0) + 1;
  localStorage.setItem(key, JSON.stringify(contador));
  return contador[ep];
}

/* Asigna Nº de Contrato a los contratos creados antes de este cambio, que no
   tienen numero_contrato — en el orden en que ya están guardados (orden de
   creación), agrupados por Empresa Contratista. Idempotente: solo toca los
   que todavía no tienen número, así que es seguro llamarla siempre al cargar. */
function _migrarNumerosContratoRetroactivo(){
  const pendientes = contratos.filter(c => !c.numero_contrato);
  if(!pendientes.length) return;
  const key = 'contrato_numero_contador';
  const contador = JSON.parse(localStorage.getItem(key) || '{}');
  pendientes.forEach(c => {
    const ep = c.empresa_propia_id || 'sin-empresa';
    contador[ep] = (contador[ep] || 0) + 1;
    c.numero_contrato = contador[ep];
  });
  localStorage.setItem(key, JSON.stringify(contador));
  guardarContratos();
}

/* Generador de jornada día por día — base común reutilizada por Contrato
   Individual, Contrato Masivo y el anexo de Cambio de Jornada. idFn(tipo, i)
   arma el id real de cada input ('dia' | 'dia-ini' | 'dia-fin', índice del
   día 0-6) — cada llamador mantiene su propio esquema de ids para no romper
   nada que ya dependa de ellos (Masivo, por ejemplo, ya tenía el suyo). */
function _renderJornadaDiasBase(contenedorId, idFn, jornadaGuardada, onChangeAttr){
  const cont = document.getElementById(contenedorId);
  if(!cont) return;
  const g = jornadaGuardada || {};

  cont.innerHTML = DIAS_JORNADA.map((dia,i) => {
    const d   = g[dia] || {};
    const act = d.activo !== undefined ? d.activo : i < 5;
    const ini = d.inicio || (i < 5 ? '08:00' : '');
    const fin = d.fin    || (i < 5 ? '18:00' : '');
    const idAct = idFn('dia', i), idIni = idFn('dia-ini', i), idFin = idFn('dia-fin', i);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:${i<6?'1px solid var(--borde)':'none'};background:${act?'#F0FDF4':'#fff'};">
        <input type="checkbox" id="${idAct}" ${act?'checked':''} onchange="${onChangeAttr}" style="width:16px;height:16px;accent-color:var(--verde);cursor:pointer;">
        <label for="${idAct}" style="flex:1;font-size:13px;font-weight:500;color:var(--texto);cursor:pointer;text-transform:none;letter-spacing:0;">${dia}</label>
        <input type="time" id="${idIni}" value="${ini}" onchange="${onChangeAttr}" style="width:95px;padding:4px 7px;font-size:12px;">
        <span style="color:var(--texto3);font-size:12px;">–</span>
        <input type="time" id="${idFin}" value="${fin}" onchange="${onChangeAttr}" style="width:95px;padding:4px 7px;font-size:12px;">
      </div>`;
  }).join('');
}

function _leerJornadaDiasBase(idFn, colacionMin){
  const j = {};
  let totalHoras = 0;
  const colHoras = (colacionMin||0) / 60;

  DIAS_JORNADA.forEach((dia,i) => {
    const act = document.getElementById(idFn('dia', i))?.checked || false;
    const ini = document.getElementById(idFn('dia-ini', i))?.value || '';
    const fin = document.getElementById(idFn('dia-fin', i))?.value || '';
    j[dia] = { activo: act, inicio: ini, fin: fin };
    if(act && ini && fin){
      const h = calcularHoras(ini, fin);
      if(h) totalHoras += Math.max(0, h - colHoras);
    }
  });
  return { jornada: j, totalHoras: Math.round(totalHoras*10)/10 };
}

function renderJornadaDias(jornadaGuardada){
  _renderJornadaDiasBase('jornada-dias', (tipo,i) => `${tipo}-${i}`, jornadaGuardada, 'onJornadaChange()');
  onJornadaChange();
}

function leerJornadaDias(){
  // Leer colación en horas (puede venir como "30 minutos", "60", "1 hora", etc.)
  const colRaw = document.getElementById('c-colacion')?.value || '';
  const colMin = parseInt(colRaw) || 0; // extrae el primer número
  return _leerJornadaDiasBase((tipo,i) => `${tipo}-${i}`, colMin);
}

/* Tercera instancia — anexo "Cambio de Jornada". No descuenta colación acá
   (la colación queda pactada en el contrato base, el anexo solo cambia
   horarios), así que horas_semanales de este helper es solo informativo. */
function _renderJornadaAnexo(jornadaGuardada){
  _renderJornadaDiasBase('anx-jornada-dias', (tipo,i) => `anx-${tipo}-${i}`, jornadaGuardada, 'actualizarPreviaAnexo()');
}

function _leerJornadaAnexo(){
  return _leerJornadaDiasBase((tipo,i) => `anx-${tipo}-${i}`, 0);
}

function resumenJornadaTexto(){
  const { jornada } = leerJornadaDias();
  const activos = DIAS_JORNADA.filter(d => jornada[d].activo);
  if(!activos.length) return 'Sin días asignados';
  return activos.map(d => `${d.slice(0,3)} ${jornada[d].inicio}-${jornada[d].fin}`).join(', ');
}

function onJornadaChange(){
  const { totalHoras } = leerJornadaDias();
  const horasEl = document.getElementById('c-horas');
  const distEl  = document.getElementById('c-distribucion');
  if(horasEl) horasEl.value = totalHoras;
  if(distEl)  distEl.value  = resumenJornadaTexto();
  actualizarPrevia();
}

function initContratos(rutPreseleccionado){
  cargarLocal();
  cargarContratos();
  poblarSelectsEmpresaPropia();
  poblarSelectTrabajadoresContrato();
  poblarSelectAnexoTrabajador();
  actualizarBadgesContratos();
  if(!rutPreseleccionado){
    limpiarContrato();
    switchTabContratos('ct-individual');
  } else {
    switchTabContratos('ct-individual');
    const t   = trabajadores.find(x => x.rut === rutPreseleccionado);
    const sel = document.getElementById('c-trabajador');
    if(sel && t){ sel.value = t.id; precargarContrato(); }
  }
  renderJornadaDias();
}

function poblarSelectTrabajadoresContrato(){
  const sel = document.getElementById('c-trabajador');
  if(!sel) return;
  const val = sel.value;

  sel.innerHTML = '<option value="">— Seleccionar trabajador —</option>' +
    trabajadores.map(t => {
      const yaTiene = contratos.some(c => _mismoTrabajador(c.trabajador_id, t.id));
      return `<option value="${t.id}">${yaTiene ? '✓ ' : ''}${t.nombre} — ${t.rut}</option>`;
    }).join('');

  if(val) sel.value = val;
  _actualizarContadorContratos();
  _renderListaVisualTrabajadorContrato();
}

function _renderListaVisualTrabajadorContrato(){
  const cont = document.getElementById('lista-visual-trabajador-contrato');
  if(!cont) return;

  const buscar  = (document.getElementById('ct-buscar-visual')?.value || '').toLowerCase().trim();
  const valActual = document.getElementById('c-trabajador')?.value || '';
  const epFiltro  = document.getElementById('c-empresa-propia')?.value || '';

  let lista = trabajadores.slice();

  if(epFiltro){
    lista = lista.filter(t => (t.empresa_propia_id || '') === epFiltro);
  }

  // ✅ Punto 14 del reporte de Contratos — Individual (igual que Masivo)
  // ya no muestra trabajadores que ya tienen contrato. Editar un contrato
  // existente se hace exclusivamente desde "Contratos Emitidos" — así
  // quedó definido en una sesión anterior, para no arriesgar
  // sobrescrituras accidentales desde la pantalla de creación.
  lista = lista.filter(t => !contratos.some(c => _mismoTrabajador(c.trabajador_id, t.id)));

  if(buscar){
    lista = lista.filter(t => t.nombre?.toLowerCase().includes(buscar) || t.rut?.toLowerCase().includes(buscar));
  }
  lista.sort((a,b) => a.nombre?.localeCompare(b.nombre));

  if(!lista.length){
    cont.innerHTML = `<div style="padding:18px;text-align:center;color:var(--texto3);font-size:13px;">Sin trabajadores pendientes de contrato${epFiltro ? ' en esta empresa' : ''}.</div>`;
    return;
  }

  cont.innerHTML = lista.map(t => {
    const seleccionado  = valActual === t.id;
    // ✅ Columna "Fecha de Ingreso" agregada a pedido — mismo criterio
    // ya usado en el panel de "Datos Precargados" (t.fecha_ingreso),
    // ahora visible también acá arriba, antes de elegir al trabajador.
    return `<div onclick="_seleccionarTrabajadorContratoVisual('${t.id}')"
        style="display:grid;grid-template-columns:28px 1fr 130px 180px 130px;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;
        border-bottom:1px solid var(--borde);background:${seleccionado?'#EFF6FF':'#fff'};"
        onmouseover="this.style.background='${seleccionado?'#EFF6FF':'#f8fafc'}'"
        onmouseout="this.style.background='${seleccionado?'#EFF6FF':'#fff'}'">
      <span style="width:18px;height:18px;border-radius:50%;flex-shrink:0;box-sizing:border-box;
        border:2px solid ${seleccionado?'#2563eb':'#cbd5e1'};background:${seleccionado?'#2563eb':'#fff'};
        display:flex;align-items:center;justify-content:center;">
        ${seleccionado ? '<span style="width:6px;height:6px;border-radius:50%;background:#fff;"></span>' : ''}
      </span>
      <span style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.nombre}</span>
      <span class="rut-mono">${t.rut}</span>
      <span style="font-size:12px;color:var(--texto2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.funcion_cargo || '—'}</span>
      <span style="font-size:12px;color:var(--texto2);white-space:nowrap;">${t.fecha_ingreso ? fmtFecha(t.fecha_ingreso) : '—'}</span>
    </div>`;
  }).join('');
}

/* Al cambiar la Empresa Empleadora: refiltra la lista de trabajadores y, si el
   trabajador ya seleccionado no pertenece a la empresa recién elegida, limpia
   la selección para no dejar datos de un trabajador que ya no aparece en la lista. */
function onCambioEmpresaFiltroContrato(){
  const epFiltro = document.getElementById('c-empresa-propia')?.value || '';
  const selTrabajador = document.getElementById('c-trabajador');
  const actual = trabajadores.find(t => t.id === selTrabajador?.value);

  if(epFiltro && actual && (actual.empresa_propia_id || '') !== epFiltro){
    selTrabajador.value = '';
    limpiarPreview();
  }

  _renderListaVisualTrabajadorContrato();
  precargarContrato();
  _masivoSeleccionados = {};
  renderBloquesMasivo();
}

function _seleccionarTrabajadorContratoVisual(id){
  const sel = document.getElementById('c-trabajador');
  if(!sel) return;
  sel.value = id;
  precargarContrato();
  _renderListaVisualTrabajadorContrato();
}

/* Ir directo al tab EPP de Contratos con un trabajador preseleccionado —
   usado por las alertas "EPP no registrado" / "RIOHS-IRL no declarado"
   (Hallazgo Grande #1). */
function irAContratoEpp(rut){
  irA('contratos');
  setTimeout(() => {
    if(typeof switchTabContratos === 'function') switchTabContratos('epp');
    setTimeout(() => {
      const sel = document.getElementById('epp-sel-trabajador');
      if(sel){
        sel.value = rut;
        if(typeof cargarEppTrabajador === 'function') cargarEppTrabajador();
      }
    }, 80);
  }, 80);
}

function _actualizarContadorContratos(){
  const el = document.getElementById('contratos-contador');
  if(!el) return;
  const conContrato = trabajadores.filter(t => contratos.some(c => _mismoTrabajador(c.trabajador_id, t.id))).length;
  const sinContrato = trabajadores.length - conContrato;
  el.innerHTML = `
    <span style="cursor:pointer;color:#065f46;font-weight:600;" onclick="switchTabContratos('ct-emitidos')">${conContrato} con contrato</span>
    <span style="color:var(--texto3);"> · </span>
    <span style="cursor:pointer;color:#92400e;font-weight:600;" onclick="switchTabContratos('ct-individual')">${sinContrato} sin contrato</span>`;
}

function precargarContrato(){
  const id = document.getElementById('c-trabajador').value;
  const eppCont = document.getElementById('epp-en-contrato');
  if(!id){ limpiarPreview(); if(eppCont) eppCont.innerHTML = ''; return; }

  const t = trabajadores.find(x => x.rut === id || x.id === id);
  if(!t) return;

  // Fecha de ingreso — dato de trazabilidad, no editable desde acá.
  // (antes mostraba fecha de registro por error; corregido a pedido)
  const elFechaReg = document.getElementById('c-fecha-registro-txt');
  if(elFechaReg){
    elFechaReg.textContent = t.fecha_ingreso
      ? new Date(t.fecha_ingreso + 'T00:00:00').toLocaleDateString('es-CL', {day:'2-digit', month:'2-digit', year:'numeric'})
      : '— (sin fecha de ingreso registrada)';
  }

  if(contratos.some(c => _mismoTrabajador(c.trabajador_id, t.id))){
    toast(`⚠️ ${t.nombre} ya tiene contrato — se sobrescribirá al guardar. Para un cambio puntual usa "Rectificar" en Contratos Emitidos, o un Anexo si es una condición laboral nueva`, 'error');
  }

  if(eppCont){
    eppCont.innerHTML = _htmlFormularioEpp('cepp', t);
    // ✅ Punto 7 del reporte de Contratos — igual que en Contrato Masivo:
    // estas 2 fechas ya no se piden por separado, se auto-completan con
    // la Fecha de Firma al guardar (ver guardarContrato()).
    const indInput = document.getElementById('cepp-irl-fecha-induccion');
    if(indInput) indInput.closest('.form-group').style.display = 'none';
    const eppFechaInput = document.getElementById('cepp-epp-fecha-entrega');
    if(eppFechaInput) eppFechaInput.closest('.form-group').style.display = 'none';
  }

  // Precargar datos bloqueados — trabajador
  document.getElementById('cp-rut').value           = t.rut || '';
  document.getElementById('cp-nombre').value        = t.nombre || '';
  document.getElementById('cp-nacionalidad').value  = t.nacionalidad || '';
  document.getElementById('cp-estado-civil').value  = t.estado_civil || '';
  document.getElementById('cp-afp').value           = t.afiliacion_afp || '';
  document.getElementById('cp-salud').value         = t.sistema_salud || '';

  // Auto-seleccionar la empresa empleadora del trabajador (o la ya guardada en su contrato existente)
  const contratoPrevio = (typeof contratos !== 'undefined' ? contratos : []).find(c => _mismoTrabajador(c.trabajador_id, t.id));
  const epIdTrabajador = contratoPrevio?.empresa_propia_id || t.empresa_propia_id || '';
  const selEmpresaPropia = document.getElementById('c-empresa-propia');
  if(selEmpresaPropia && epIdTrabajador) selEmpresaPropia.value = epIdTrabajador;

  // Precargar datos bloqueados — EMPRESA CONTRATISTA (desde select de empresa propia)
  const epId = document.getElementById('c-empresa-propia')?.value;
  const contratista = getEmpresaEmpleadora(epId);
  document.getElementById('cp-empresa-rut').value    = contratista.rut || '';
  document.getElementById('cp-empresa-nombre').value = contratista.razon_social || contratista.nombre || '';
  document.getElementById('cp-rep-nombre').value     = contratista.nombre_representante || '';
  document.getElementById('cp-rep-rut').value        = contratista.rut_representante || '';

  // Precargar EMPRESA MANDANTE — ✅ Bypass de Mandante: ya no viene del
  // trabajador (Registro Personal no lo pide). Se precarga con el
  // Mandante del Contrato ya existente si lo hay (contratoPrevio,
  // arriba) o con t.mandante_id si el trabajador ya tiene uno
  // sincronizado de un Contrato anterior — pero sigue siendo 100%
  // editable acá, es el selector el que manda.
  const mandanteSel = document.getElementById('cp-mandante');
  if(mandanteSel) mandanteSel.value = contratoPrevio?.mandante_id || t.mandante_id || '';
  _onCambioMandanteContrato();

  // Precargar Cargo automáticamente desde el trabajador (viene de Registro Personal)
  const cCargo = document.getElementById('c-cargo');
  if(cCargo) cCargo.value = t.funcion_cargo || '';
  // Faena ya no se prellena desde el trabajador (Hallazgo Grande #13) ni
  // se escribe libre — se elige desde el selector que arma
  // _onCambioMandanteContrato() según el Mandante recién elegido arriba.

  // Precargar fecha inicio desde fecha_ingreso del trabajador
  const fechaInicio = t.fecha_ingreso || '';
  // Si ya tiene contrato, cargar sus datos
  const contratoExistente = contratos.find(c => _mismoTrabajador(c.trabajador_id, id));
  if(contratoExistente) cargarContratoEnFormulario(contratoExistente);

  actualizarPrevia();
}

/* ✅ Bypass de Mandante — al elegir un Mandante en el selector del
   Contrato, refleja sus datos (RUT/comuna/región/dirección) en los
   campos de solo lectura de abajo. El nombre ya se ve en el propio
   selector, por eso no tiene campo aparte. */
function _onCambioMandanteContrato(){
  const mandante = _mandanteSeleccionadoContrato();
  const set = (elId,v) => { const el = document.getElementById(elId); if(el) el.value = v || ''; };
  set('cp-man-rut',       mandante?.rut);
  set('cp-man-comuna',    mandante?.comuna);
  set('cp-man-region',    mandante?.region);
  set('cp-man-direccion', mandante ? [mandante.direccion, mandante.comuna, mandante.region].filter(Boolean).join(', ') : '');

  // ✅ Punto 6 del reporte de Contratos — Faena pasa de texto libre a
  // selector cargado según el Mandante elegido (mismo criterio que ya
  // usa Contrato Masivo desde el rediseño del Bypass de Mandante). Se
  // reconstruye acá porque las faenas disponibles cambian según el
  // Mandante — mantiene el id="c-faena" para que cargarContratoEnFormulario
  // pueda seguir precargando el valor guardado normalmente.
  const wrapFaena = document.getElementById('c-faena-wrap');
  if(wrapFaena){
    const faenas = mandante?.faenas || [];
    wrapFaena.innerHTML = faenas.length
      ? `<select class="f-input" id="c-faena" onchange="actualizarPrevia()">
          <option value="">— Seleccionar faena —</option>
          ${faenas.map(f => `<option value="${f.nombre||f}">${f.nombre||f}</option>`).join('')}
        </select>`
      : `<input class="f-input" id="c-faena" placeholder="${mandante ? mandante.nombre+' no tiene faenas registradas' : 'Selecciona primero la Empresa Mandante'}" oninput="actualizarPrevia()">`;
  }

  if(typeof actualizarPrevia === 'function') actualizarPrevia();
}

function cargarContratoEnFormulario(c){
  document.getElementById('c-tipo').value          = c.tipo || 'temporada';
  document.getElementById('c-ciudad').value        = c.ciudad_firma || '';
  document.getElementById('c-fecha-firma').value   = c.fecha_firma || '';
  document.getElementById('c-cargo').value         = c.funcion_cargo || '';
  document.getElementById('c-faena').value         = c.nombre_faena || '';
  document.getElementById('c-temporada').value     = c.temporada || '';
  document.getElementById('c-fecha-termino').value = c.fecha_termino || '';
  document.getElementById('c-horas').value         = c.horas_semanales || '';
  document.getElementById('c-distribucion').value  = c.distribucion_jornada || '';
     renderJornadaDias(c.jornada_dias);
  document.getElementById('c-colacion').value      = c.colacion || '';
  // Compatibilidad: contratos guardados con el select viejo (tiempo/trato/
  // kilo/caja/bin) se muestran como "mensual" por defecto.
  const _formasValidas = ['mensual','diaria'];
  document.getElementById('c-tipo-rem').value = _formasValidas.includes(c.tipo_remuneracion) ? c.tipo_remuneracion : 'mensual';
  document.getElementById('c-sueldo').value        = c.sueldo_monto || '';
  document.getElementById('c-sueldo-escrito').value= c.sueldo_escrito || '';
  const bens = c.beneficios || [];
  document.getElementById('ben-alojamiento').checked = bens.includes('alojamiento');
  document.getElementById('ben-alimentacion').checked = bens.includes('alimentacion');
  document.getElementById('ben-transporte').checked  = bens.includes('transporte');
  document.getElementById('ben-luz').checked         = bens.includes('luz');
  contratoEditandoId = c.id;
}

/* ✅ Bypass de Mandante — helper único: el Mandante del Contrato
   Individual siempre sale del selector cp-mandante, nunca del
   trabajador (que ya no lo guarda como fuente primaria). Se usa
   tanto al guardar como en la vista previa/PDF, para que ambos
   coincidan siempre con lo que el usuario ve en pantalla. */
function _mandanteSeleccionadoContrato(){
  const id = document.getElementById('cp-mandante')?.value || '';
  return empresas.find(e => e.id === id || e.rut === id) || null;
}

/* Resuelve el Mandante de un Contrato YA GUARDADO (para listados
   históricos como "Contratos Emitidos") — usa el mandante_id propio
   del contrato, no el del trabajador, porque el trabajador puede
   haber tenido Mandantes distintos en Contratos sucesivos (ciclo de
   Reingreso). Con contratos antiguos guardados antes de este campo,
   cae de respaldo al mandante_rut ya guardado. */
function _mandanteDeContrato(c){
  if(!c) return null;
  return empresas.find(e => (c.mandante_id && e.id === c.mandante_id) || e.rut === c.mandante_rut) || null;
}

function obtenerDatosFormulario(){
const trabajadorId = document.getElementById('c-trabajador').value;

const t = trabajadores.find(
  x => x.rut === trabajadorId || x.id === trabajadorId
);
  const beneficios = [];
  if(document.getElementById('ben-alojamiento').checked) beneficios.push('alojamiento');
  if(document.getElementById('ben-alimentacion').checked) beneficios.push('alimentacion');
  if(document.getElementById('ben-transporte').checked)  beneficios.push('transporte');
  if(document.getElementById('ben-luz').checked)         beneficios.push('luz');

  // ✅ Mandante ya no se lee del trabajador (Bypass de Mandante) — se
  // elige directamente en este formulario, vía el selector cp-mandante.
  const mandanteId  = document.getElementById('cp-mandante')?.value || '';
  const mandanteObj = _mandanteSeleccionadoContrato();

  return {
    ..._leerFormularioEpp('cepp'),
    trabajador_id:       trabajadorId,
    trabajador_rut:      t?.rut || '',
    empresa_rut:         mandanteObj?.rut || '',
    empresa_propia_id:   document.getElementById('c-empresa-propia')?.value || t?.empresa_propia_id || '',
    tipo:                document.getElementById('c-tipo').value,
    ciudad_firma:        document.getElementById('c-ciudad').value.trim(),
    fecha_firma:         document.getElementById('c-fecha-firma').value,
    funcion_cargo:       document.getElementById('c-cargo').value.trim(),
    nombre_faena:        document.getElementById('c-faena').value.trim(),
    ubicacion_faena:     [mandanteObj?.direccion, mandanteObj?.comuna].filter(Boolean).join(', '),
    region:              mandanteObj?.region || '',
    mandante_id:         mandanteId,
    mandante_nombre:     mandanteObj?.nombre || '',
    mandante_rut:        mandanteObj?.rut || '',
    mandante_direccion:  mandanteObj?.direccion || '',
    mandante_comuna:     mandanteObj?.comuna || '',
    mandante_region:     mandanteObj?.region || '',
    temporada:           document.getElementById('c-temporada').value.trim(),
    fecha_inicio:        t?.fecha_ingreso || '',
    fecha_termino:       document.getElementById('c-fecha-termino').value,
    horas_semanales:     document.getElementById('c-horas').value,
    distribucion_jornada:document.getElementById('c-distribucion').value.trim(),
          jornada_dias:        leerJornadaDias().jornada,
    colacion:            document.getElementById('c-colacion').value.trim(),
    tipo_remuneracion:   document.getElementById('c-tipo-rem').value,
    sueldo_monto:        document.getElementById('c-sueldo').value,
    sueldo_escrito:      document.getElementById('c-sueldo-escrito').value.trim(),
    beneficios,
    estado:             'activo',
    creado_en:          new Date().toISOString(),
    // Estructura anexos (relacionados a este contrato):
    // anexos = [{ id, contrato_id, tipo, fecha, descripcion, pdf_url }]
    // Tipos: 'sueldo' | 'cargo' | 'faena' | 'prorroga' | 'otro'
  };
}

function guardarContrato(){
  const id = document.getElementById('c-trabajador').value;
  if(!id){ toast('⚠️ Selecciona un trabajador','error'); return; }

  const cargo = document.getElementById('c-cargo').value.trim();
  if(!cargo){ toast('⚠️ Ingresa la función/cargo','error'); return; }

  const faena = document.getElementById('c-faena').value.trim();
  if(!faena){ toast('⚠️ Ingresa el nombre de la faena','error'); return; }

  const mandanteSel = document.getElementById('cp-mandante')?.value || '';
  if(!mandanteSel){ toast('⚠️ Selecciona la Empresa Mandante','error'); return; }

  const termino = document.getElementById('c-fecha-termino').value;
  if(!termino){ toast('⚠️ Ingresa la fecha de término','error'); return; }

  const formaRem = document.getElementById('c-tipo-rem').value;
  if(!formaRem){ toast('⚠️ Selecciona la forma de remuneración (Mensual o Diaria)','error'); return; }

  // ✅ Nuevo — validación de sueldo mínimo. No bloquea (podría haber
  // motivos legítimos: jornada parcial ya contemplada, o el indicador
  // del período todavía no se cargó) — avisa y pide confirmación
  // explícita, mismo criterio que el aviso de 3er contrato de más
  // abajo. Se compara el sueldo pactado contra el mínimo proporcional
  // a la jornada semanal (45h = jornada de referencia completa, mismo
  // criterio que ya usa el resto del sistema para prorratear).
  {
    const tChequeoMin = trabajadores.find(x => x.rut === id || x.id === id);
    const sueldoIngresado = parseFloat(document.getElementById('c-sueldo')?.value) || 0;
    const horasSemIngresadas = parseFloat(document.getElementById('c-horas')?.value) || 45;
    const fechaFirmaMin = document.getElementById('c-fecha-firma')?.value;
    const periodoMin = (fechaFirmaMin || hoyISO()).slice(0,7);
    const minimo = (typeof _sueldoMinimoAplicable === 'function') ? _sueldoMinimoAplicable(tChequeoMin, periodoMin) : null;

    if(minimo && sueldoIngresado > 0){
      const minimoProporcional = Math.round(minimo.monto * Math.min(horasSemIngresadas, 45) / 45);
      if(sueldoIngresado < minimoProporcional){
        const continuarMin = confirm(
          `⚠️ El sueldo ingresado ($${sueldoIngresado.toLocaleString('es-CL')}) está por debajo del ingreso mínimo legal vigente para ${periodoMin} (tramo ${minimo.tramo}), proporcional a ${horasSemIngresadas}h semanales: $${minimoProporcional.toLocaleString('es-CL')}.\n\n¿Continuar y guardar igual?`
        );
        if(!continuarMin) return;
      }
    }
  }

  // ✅ BL-062 punto 4 — aviso del 3er contrato a Plazo Fijo genérico
  // (Art. 159 N°4 CT, distinto de Temporada — no aplica a esta última,
  // que sí puede repetirse faena tras faena indefinidamente). Se avisa
  // solo al crear un contrato NUEVO (no al editar uno existente vía
  // contratoEditandoId), usando la Carpeta Laboral como fuente del
  // historial real — es la que preserva los ciclos, no la tabla
  // operativa `contratos` que solo guarda el vigente.
  const tipoSel = document.getElementById('c-tipo').value;
  if(!contratoEditandoId && tipoSel === 'plazo_fijo'){
    const tChequeo  = trabajadores.find(x => x.rut === id || x.id === id);
    const epChequeo = document.getElementById('c-empresa-propia')?.value || tChequeo?.empresa_propia_id || '';
    const previos = (carpeta || [])
      .filter(d => d.tipo === 'contrato' && d.subtipo === 'plazo_fijo' &&
                   d.trabajador_rut === tChequeo?.rut && (d.empresa_propia_id||'') === epChequeo)
      .sort((a,b) => _fechaOrdenDoc(a) - _fechaOrdenDoc(b));

    if(previos.length >= 2){
      const fechaPrimero = new Date(_fechaOrdenDoc(previos[0]));
      const fechaFirmaNueva = document.getElementById('c-fecha-firma')?.value;
      const fechaNueva = fechaFirmaNueva ? new Date(fechaFirmaNueva+'T12:00:00') : new Date();
      const mesesDesdePrimero = (fechaNueva - fechaPrimero) / (1000*60*60*24*30.44);

      if(mesesDesdePrimero <= 15){
        const continuar = confirm(
          `⚠️ Este sería el 3er contrato a Plazo Fijo de ${tChequeo?.nombre||'este trabajador'} con la misma empresa, dentro de una ventana de 15 meses desde el primero (Art. 159 N°4 del Código del Trabajo).\n\n` +
          `Por ley, la 2ª renovación de un contrato a Plazo Fijo genérico transforma la relación laboral en INDEFINIDA — no aplica a contratos de Temporada (Art. 93-96 CT), que sí pueden repetirse.\n\n` +
          `¿Continuar y guardar igual como Plazo Fijo?`
        );
        if(!continuar) return;
      }
    }
  }

  const datos = obtenerDatosFormulario();
  cargarContratos();

  if(contratoEditandoId){
    const idx = contratos.findIndex(c => c.id === contratoEditandoId);
    if(idx >= 0) contratos[idx] = {...contratos[idx], ...datos};
  } else {
    const existe = contratos.findIndex(c => _mismoTrabajador(c.trabajador_id, id));
    if(existe >= 0){
      contratos[existe] = {...contratos[existe], ...datos};
    } else {
      contratos.push({id: Date.now().toString(), numero_contrato: _siguienteNumeroContrato(datos.empresa_propia_id), ...datos});
    }
  }

  guardarContratos();
  contratoEditandoId = null;

  // Guardar EPP/IRL en la misma acción (evita un segundo viaje a la pestaña EPP/IRL)
  const t = trabajadores.find(x => x.rut === id || x.id === id);
  if(t){
    // ✅ Punto 7 del reporte de Contratos — Fecha de entrega EPP y Fecha
    // de inducción RIOHS/IRL ya no se piden por separado, se auto-completan
    // con la Fecha de Firma (mismo criterio que ya usa Contrato Masivo).
    const datosEpp = _leerFormularioEpp('cepp');
    datosEpp.epp_fecha_entrega   = datos.fecha_firma || null;
    datosEpp.irl_fecha_induccion = datos.fecha_firma || null;
    Object.assign(t, datosEpp);
    // ✅ Sincronización del Bypass de Mandante: el trabajador ya no elige
    // su Mandante en Registro Personal — se fija aquí, al guardar el
    // Contrato, y queda reflejado en t.mandante_id — un solo campo
    // (Hallazgo #5, consolidado: antes se triplicaba en mandante_id/
    // empresa_rut/empresa "por compatibilidad"; ya no hace falta, todo
    // el sistema lee solo mandante_id). Se actualiza siempre al valor
    // del Contrato más reciente/vigente.
    t.mandante_id  = datos.mandante_id;
  }
  guardarLocal();


  toast('✅ Contrato guardado correctamente','exito');
  limpiarContrato();
  _renderListaVisualTrabajadorContrato();
}

function limpiarContrato(){
  contratoEditandoId = null;
  const campos = ['c-ciudad','c-fecha-firma','c-cargo','c-faena',
    'c-temporada','c-fecha-termino','c-horas','c-distribucion','c-colacion',
    'c-sueldo','c-sueldo-escrito','cp-rut','cp-nombre','cp-nacionalidad',
    'cp-estado-civil','cp-afp','cp-salud','cp-empresa-rut','cp-empresa-nombre',
    'cp-rep-nombre','cp-rep-rut','cp-mandante','cp-man-rut','cp-man-comuna',
    'cp-man-region','cp-man-direccion'];
  campos.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  // Vuelve el selector de Faena a su estado por defecto (input libre,
  // deshabilitado hasta elegir Mandante) — si quedó como <select> del
  // trabajador anterior, no se resetea solo con .value=''.
  const wrapFaena = document.getElementById('c-faena-wrap');
  if(wrapFaena) wrapFaena.innerHTML = `<input class="f-input" id="c-faena" placeholder="Selecciona primero la Empresa Mandante" oninput="actualizarPrevia()">`;
  const elFechaReg = document.getElementById('c-fecha-registro-txt');
  if(elFechaReg) elFechaReg.textContent = '—';
  ['ben-alojamiento','ben-alimentacion','ben-transporte','ben-luz'].forEach(id => {
    const el = document.getElementById(id); if(el) el.checked = false;
  });
  document.getElementById('c-trabajador').value = '';
  document.getElementById('c-tipo').value = 'temporada';
  document.getElementById('c-tipo-rem').value = '';
  limpiarPreview();
}

function limpiarPreview(){
  const p = document.getElementById('contrato-preview');
  if(p) p.innerHTML = '<div style="text-align:center;padding:20px;color:var(--texto3);font-size:13px;">Selecciona un trabajador para ver la vista previa</div>';
}

function autoEscribirSueldo(){
  const monto = parseInt(document.getElementById('c-sueldo').value) || 0;
  if(monto > 0){
    document.getElementById('c-sueldo-escrito').value = numeroALetras(monto) + ' pesos';
  }
  actualizarPrevia();
}

function numeroALetras(n){
  const unidades = ['','un','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
    'diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve'];
  const decenas  = ['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
  const centenas = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos',
    'seiscientos','setecientos','ochocientos','novecientos'];
  if(n === 0)   return 'cero';
  if(n === 100) return 'cien';
  if(n === 1000000) return 'un millón';
  let resultado = '';
  if(n >= 1000000){ resultado += numeroALetras(Math.floor(n/1000000)) + ' millón '; n %= 1000000; }
  if(n >= 1000){
    const miles = Math.floor(n/1000);
    resultado += (miles === 1 ? 'mil' : numeroALetras(miles) + ' mil') + ' ';
    n %= 1000;
  }
  if(n >= 100){ resultado += centenas[Math.floor(n/100)] + ' '; n %= 100; }
  if(n >= 20){ resultado += decenas[Math.floor(n/10)]; n %= 10; if(n > 0) resultado += ' y '; }
  if(n > 0 && n < 20) resultado += unidades[n];
  return resultado.trim();
}

function actualizarPrevia(){
  const id = document.getElementById('c-trabajador')?.value;
  const p  = document.getElementById('contrato-preview');
  if(!id || !p){ limpiarPreview(); return; }

  const t        = trabajadores.find(x => x.id === id);
  const epId     = document.getElementById('c-empresa-propia')?.value || t?.empresa_propia_id || '';
  const emp      = getEmpresaEmpleadora(epId);
  const mandante = _mandanteSeleccionadoContrato();
  const datos    = obtenerDatosFormulario();

  const { htmlCompleto } = construirDocumentoContrato(t, emp, mandante, datos);
  const docHTML = _contenidoInternoDocumento(htmlCompleto);

  p.innerHTML = `
    <div style="background:#0f2942;color:#fff;padding:9px 12px;border-radius:var(--radius) var(--radius) 0 0;font-size:12px;font-weight:600;text-align:center;">
      Vista previa del documento
    </div>
    <div style="border:1px solid var(--borde);border-top:none;border-radius:0 0 var(--radius) var(--radius);
      max-height:520px;overflow-y:auto;background:#fff;padding:20px;">
      <style>#contrato-preview .doc-wrap{max-width:none;font-size:9.5pt;line-height:1.55;overflow-wrap:break-word;word-break:break-word;}</style>
      <div class="doc-wrap">${docHTML}</div>
    </div>`;
}


function cambiarTipoContrato(){
  const tipo = document.getElementById('c-tipo')?.value;
  const campoTemporada = document.getElementById('campo-temporada');
  const campoFechaTermino = document.getElementById('campo-fecha-termino');
  const lblFechaTermino = document.getElementById('lbl-fecha-termino');

  if(campoTemporada) campoTemporada.style.display = (tipo === 'temporada') ? '' : 'none';

  if(campoFechaTermino){
    if(tipo === 'indefinido'){
      campoFechaTermino.style.display = 'none';
    } else {
      campoFechaTermino.style.display = '';
      if(lblFechaTermino) lblFechaTermino.textContent = 'Fecha término *';
    }
  }

  actualizarPrevia();
}

/* Construye el documento completo (Contrato + EPP + RIOHS + IRL) a partir de
   t/emp/mandante/datos ya resueltos. Es la ÚNICA fuente del documento — la usan
   tanto la Vista Previa en vivo como la generación de PDF (individual y masivo),
   así lo que se ve en pantalla mientras se completa el formulario es exactamente
   el documento que se imprime. */
function construirDocumentoContrato(t, emp, mandante, datos){
  const otrosMandantes = empresas.filter(e => e.id !== mandante?.id && e.estado !== 'inactivo');

  // ✅ Redacción dinámica según Sexo (Registro Personal) — reemplaza la
  // notación genérica "(a)"/"(o)" en todo el documento (contrato + anexos
  // EPP/IRL). Si el trabajador no tiene sexo registrado (dato viejo,
  // anterior a que existiera el campo), se usa la forma masculina como
  // respaldo, igual que hacía la notación "(a)" antes.
  const esMujer            = t?.sexo === 'Mujer';
  const ElTrabajador       = esMujer ? 'La trabajadora'  : 'El trabajador';
  const elTrabajador       = esMujer ? 'la trabajadora'  : 'el trabajador';
  const Trabajador         = esMujer ? 'Trabajadora'     : 'Trabajador';
  const trabajador_        = esMujer ? 'trabajadora'     : 'trabajador';
  const nacidoTxt          = esMujer ? 'nacida'          : 'nacido';
  const afiliadoTxt        = esMujer ? 'afiliada'        : 'afiliado';
  const informadoTxt       = esMujer ? 'informada'       : 'informado';
  const elTrabajadorCap    = esMujer ? 'la Trabajadora'  : 'el Trabajador';
  const delTrabajador      = esMujer ? 'de la'           : 'del';

  // Fechas formateadas
  // ✅ Corregido — mismo bug de zona horaria de toda la sesión
  // (BL-052 y siguientes): sin el ancla de mediodía, new Date(v)
  // interpreta la fecha como UTC medianoche, que en Chile cae en el
  // día ANTERIOR — el documento del contrato (el PDF legal que firma
  // el trabajador) imprimía la fecha de firma, término, ingreso y
  // nacimiento un día antes de la real.
  const fmtLarga = v => v ? new Date(v+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}) : '___________';
  const fmtCorta = v => v ? new Date(v+'T12:00:00').toLocaleDateString('es-CL') : '___________';

  const fechaFirma   = fmtLarga(datos.fecha_firma);
  const fechaIngreso = fmtLarga(t?.fecha_ingreso);
  const fechaTermino = fmtLarga(datos.fecha_termino);
  const fechaNac     = fmtCorta(t?.fecha_nacimiento);

  // Sueldo
  const sueldoNum    = parseInt(datos.sueldo_monto || 0);
  const sueldoFmt    = sueldoNum ? '$' + sueldoNum.toLocaleString('es-CL') : '$___________';
  const sueldoPalab  = sueldoNum
    ? numeroALetras(sueldoNum).trim() + ' pesos'
    : '_____________';
  const formaRemTxt  = datos.tipo_remuneracion === 'diaria' ? 'diaria' : 'mensual';

  // Jornada
  const horasSem  = datos.horas_semanales || '___';
  const detHorario= datos.distribucion_jornada || '_______________';
  const colacion  = datos.colacion || '___';

  // Mandantes adicionales (máx 3)
  const mandantesExtra = otrosMandantes.slice(0,3);
  const filaMandante = (m) => m
    ? `<li><strong>${m.nombre}</strong> – RUT ${m.rut} – ${[m.direccion, m.comuna, m.region].filter(Boolean).join(', ')}</li>`
    : '';

  // Dirección mandante completa
  const dirMandante = mandante
    ? [mandante.direccion, mandante.comuna, mandante.region].filter(Boolean).join(', ')
    : '___________';

  // Código de documento (folio interno, no oficial-correlativo) para trazabilidad de hojas sueltas
  const folioDoc = (() => {
    const base = (t?.rut||'').replace(/[^0-9kK]/g,'') + (t?.id||'') + new Date().toISOString().slice(0,10);
    let hash = 0;
    for(let i=0;i<base.length;i++){ hash = ((hash<<5)-hash + base.charCodeAt(i))|0; }
    return Math.abs(hash).toString(36).toUpperCase().slice(0,8);
  })();
  const folioLinea = `Doc. N° ${folioDoc} · ${t?.nombre||'—'} · RUT ${t?.rut||'—'} · Emitido el ${new Date().toLocaleDateString('es-CL')}`;

  // ══════════════════════════════════════════
  // Armado dinámico de cláusulas según tipo de contrato
  // ══════════════════════════════════════════
  const tipo = datos.tipo || 'temporada';

  // ✅ Corrige "Temporada Temporada 2026" (Punto 3 del reporte de
  // Contratos) — si el usuario ya escribió la palabra "Temporada" en el
  // campo, se le quita antes de anteponerla nosotros. Funciona sin
  // importar mayúsculas/minúsculas ni espacios extra.
  const temporadaLimpia = (datos.temporada || '').replace(/^\s*temporada\s*/i, '').trim();

  const TITULOS = {
    temporada:  'Contrato de Trabajo Agrícola por Temporada',
    plazo_fijo: 'Contrato de Trabajo Agrícola a Plazo Fijo',
    indefinido: 'Contrato de Trabajo Agrícola Indefinido',
  };
  const SUBTITULOS = {
    temporada:  `Temporada ${temporadaLimpia || '________'}`,
    plazo_fijo: `Vigencia hasta el ${fechaTermino}`,
    indefinido: 'Contrato de duración indefinida',
  };
  const TIPO_TEXTO = {
    temporada:  'contrato de trabajo por temporada',
    plazo_fijo: 'contrato de trabajo a plazo fijo',
    indefinido: 'contrato de trabajo de duración indefinida',
  };
  const tituloDoc    = TITULOS[tipo]    || TITULOS.temporada;
  const subtituloDoc = SUBTITULOS[tipo] || SUBTITULOS.temporada;
  const tipoTexto    = TIPO_TEXTO[tipo] || TIPO_TEXTO.temporada;

  const ORDINALES = ['Primero','Segundo','Tercero','Cuarto','Quinto','Sexto','Séptimo','Octavo','Noveno','Décimo',
    'Décimo Primero','Décimo Segundo','Décimo Tercero','Décimo Cuarto','Décimo Quinto','Décimo Sexto',
    'Décimo Séptimo','Décimo Octavo'];

  const clausulas = [];

  clausulas.push({tit:'Funciones del cargo', body:`
    <p>${ElTrabajador} desempeñará la función de <strong>${datos.funcion_cargo}</strong>,
    siendo sus labores principales aquellas propias de dicho cargo.</p>
    <p>Sin perjuicio de lo anterior, podrá ejecutar labores agrícolas relacionadas con cosecha,
    poda, raleo, amarre, packing, selección, mantención de huertos, control de malezas, apoyo
    operacional agrícola y demás funciones afines que le encomiende el empleador, siempre que
    sean compatibles con la naturaleza de su cargo y dentro de su área de trabajo.</p>
    <p>En el desempeño de sus funciones, ${elTrabajador} se compromete a:</p>
    <ol>
      <li>Cumplir fiel y oportunamente las políticas, instrucciones, reglamentos y órdenes impartidas por el empleador o sus representantes.</li>
      <li>Realizar todas las actividades que directa o indirectamente se relacionen con su labor y sean necesarias para su adecuado cumplimiento.</li>
      <li>Desarrollar su trabajo con el debido cuidado, protegiendo su salud, integridad y seguridad, así como la de sus compañeros de trabajo.</li>
      <li>Informar a su jefatura directa de cualquier anomalía que afecte el desarrollo normal de sus labores.</li>
      <li>Guardar absoluta reserva sobre toda información o documentación de la empresa, tanto dentro como fuera de ella.</li>
      <li>Mantener independencia entre las operaciones de la empresa y sus intereses personales o familiares.</li>
      <li>Conocer y cumplir las normas del Reglamento Interno de Orden, Higiene y Seguridad, cuya copia se entrega al momento de la firma del presente contrato.</li>
    </ol>
    <p>El incumplimiento de estas obligaciones podrá ser considerado falta grave en los términos
    del artículo 160 N°7 del Código del Trabajo, sin perjuicio de las demás acciones legales
    que correspondan.</p>`});

  clausulas.push({tit:'Lugar de prestación de servicios', body:`
    <p>El trabajador prestará servicios en la faena agrícola denominada
    <strong>${datos.nombre_faena}</strong>${tipo==='temporada' ? `, correspondiente a la temporada <strong>${temporadaLimpia || '________'}</strong>,` : ','}
    ubicada en <strong>${dirMandante}</strong>,
    de la empresa mandante <strong>${mandante?.nombre || '______________'}</strong>,
    RUT <strong>${mandante?.rut || '___________'}</strong>.</p>
    <p>Se deja expresa constancia de que el trabajador mantiene vínculo laboral, de subordinación
    y dependencia, con la empresa <strong>${emp.razon_social || '______________'}</strong>,
    en su calidad de contratista, ejecutando sus labores en régimen de subcontratación en las
    dependencias de la empresa mandante individualizada precedentemente.</p>
    ${mandantesExtra.length ? `
    <p>Sin perjuicio de lo anterior, el trabajador podrá prestar servicios en otras faenas o
    empresas mandantes con las cuales el empleador mantenga contratos vigentes, tales como:</p>
    <ul>${mandantesExtra.map(m => filaMandante(m)).join('')}</ul>
    <p>El trabajador podrá ser destinado a cualquiera de las empresas mandantes y faenas señaladas
    precedentemente, manteniendo siempre las condiciones esenciales de su contrato de trabajo.</p>
    <p>Asimismo, el trabajador podrá desempeñar funciones en distintas faenas agrícolas
    desarrolladas por dichas empresas mandantes, cuando ello sea necesario para la continuidad
    operacional de los servicios contratados.</p>
    <p>Cualquier destinación permanente a una empresa mandante distinta de las señaladas
    anteriormente deberá ser informada previamente al trabajador.</p>` : ''}
    <p>Lo anterior es sin perjuicio de lo dispuesto en el artículo 12 del Código del Trabajo.</p>`});

  clausulas.push({tit:'Jornada de trabajo', body:`
    <p>La jornada de trabajo será de <strong>${horasSem} horas semanales</strong>,
    distribuidas de la siguiente forma:</p>
    <p><strong>${detHorario}</strong></p>
    <p>La jornada diaria se interrumpirá con un intervalo de
    <strong>${colacion} minutos</strong> de colación, no imputables a la jornada.</p>
    <p>La distribución de la jornada podrá ser modificada por necesidades de la faena,
    dentro de los límites legales.</p>`});

  clausulas.push({tit:'Remuneración', body:`
    <p>El trabajador percibirá como remuneración la suma de
    <strong>${sueldoFmt} (${sueldoPalab})</strong>, correspondiente a una remuneración
    <strong>${formaRemTxt}</strong>, la que será pagada en moneda de curso legal dentro
    de los plazos establecidos en el artículo 55 del Código del Trabajo, mediante el
    sistema de pago acordado entre las partes.</p>
    <p>En caso de corresponder, el trabajador tendrá derecho a percibir las demás
    remuneraciones, beneficios o asignaciones pactadas en el presente contrato, en sus
    anexos o las que procedan conforme a la legislación laboral vigente.</p>`});

  clausulas.push({tit:'Prohibiciones', body:`
    <p>${ElTrabajador} se obliga a no incurrir en las siguientes conductas:</p>
    <ol>
      <li>Registrar asistencia de otro trabajador.</li>
      <li>Retirarse antes del término de la jornada sin autorización.</li>
      <li>Realizar actividades ajenas a su función durante la jornada laboral.</li>
      <li>Extraer de la empresa elementos, documentos o información sin autorización.</li>
      <li>Ejecutar negociaciones dentro del giro del empleador sin autorización.</li>
      <li>Realizar conductas contrarias a la normativa interna de la empresa.</li>
    </ol>
    <p>El incumplimiento de estas prohibiciones podrá dar lugar a las sanciones establecidas
    en la legislación vigente.</p>`});

  clausulas.push({tit:'Elementos de protección personal', body:`
    <p>El empleador proporcionará a ${elTrabajador} los elementos de protección personal necesarios
    para el desempeño de sus funciones, conforme a la Ley N°16.744 sobre Accidentes del Trabajo
    y Enfermedades Profesionales.</p>
    <p>${ElTrabajador} se obliga a utilizar correctamente dichos implementos y a mantenerlos
    en buen estado. En caso de término de la relación laboral, el trabajador deberá restituir
    los elementos de protección personal que le hayan sido entregados, en la medida que
    corresponda.</p>`});

  clausulas.push({tit:'Inasistencias', body:`
    <p>Se deja constancia de que:</p>
    <ul>
      <li>La inasistencia injustificada del trabajador por tres días consecutivos podrá ser considerada abandono de trabajo, conforme a la normativa vigente.</li>
      <li>La inasistencia injustificada reiterada, tales como dos días lunes consecutivos o tres inasistencias en un mismo mes calendario sin aviso previo ni justificación, podrá ser considerada incumplimiento grave de las obligaciones del contrato de trabajo.</li>
      <li>En caso de enfermedad o impedimento para asistir, el trabajador deberá dar aviso a su jefatura directa, verbal o escrito, dentro del mismo día de ocurrida la inasistencia.</li>
    </ul>`});

  clausulas.push({tit:'Horas extraordinarias', body:`
    <p>Las horas que excedan la jornada ordinaria semanal deberán ser previamente autorizadas
    por el empleador. Las horas extraordinarias tendrán carácter voluntario para el trabajador,
    no constituyendo una obligación su realización. En ningún caso podrán exceder de dos horas
    extraordinarias por día, de conformidad con la normativa vigente. Las horas extraordinarias
    se remunerarán con un recargo del 50% sobre el valor de la hora ordinaria. No se considerarán
    horas extraordinarias aquellas que no hayan sido previamente autorizadas por el empleador.</p>`});

  if(tipo === 'plazo_fijo'){
    clausulas.push({tit:'Plazo y duración del contrato', body:`
      <p>El presente contrato es de carácter plazo fijo, conforme a lo dispuesto en el
      artículo 159 N°4 del Código del Trabajo. Su vigencia se extiende desde el
      <strong>${fechaIngreso}</strong> hasta el <strong>${fechaTermino}</strong>.</p>
      <p>El presente contrato solo admite una renovación. Una segunda renovación, o la
      continuación de los servicios una vez expirado el plazo pactado, transformará la
      relación laboral en un contrato de duración indefinida.</p>
      <p>Se deja constancia de que la prestación de servicios discontinuos por doce meses
      o más, dentro de un período de quince meses, hace presumir legalmente la existencia
      de un contrato de duración indefinida.</p>
      <p>La terminación anticipada del presente contrato, sin que medie causal legal
      justificada, obligará al empleador a pagar al trabajador la totalidad de las
      remuneraciones convenidas hasta la fecha de término establecida en este instrumento.</p>`});
  } else if(tipo === 'indefinido'){
    clausulas.push({tit:'Vigencia del contrato', body:`
      <p>El presente contrato es de duración indefinida, comenzando a regir desde el
      <strong>${fechaIngreso}</strong>, y se mantendrá vigente mientras subsista la relación
      laboral entre las partes, salvo que se ponga término conforme a las causales establecidas
      en los artículos 159, 160 y 161 del Código del Trabajo.</p>`});
  } else {
    clausulas.push({tit:'Vigencia del contrato', body:`
      <p>El presente contrato es de carácter transitorio y se celebra para atender necesidades propias
      de la temporada agrícola <strong>${temporadaLimpia || '________'}</strong>, conforme a lo
      dispuesto en el <strong>artículo 93 del Código del Trabajo</strong>.</p>
      <p>Su vigencia se extenderá hasta el <strong>${fechaTermino}</strong>, o hasta que finalicen
      las labores que le dieron origen, lo que ocurra primero.</p>
      <p>Al término del contrato, el trabajador tendrá derecho a feriado proporcional conforme
      al artículo 74 del Código del Trabajo, calculado en proporción al tiempo efectivamente
      trabajado durante la temporada.</p>`});
  }

  clausulas.push({tit:'Descanso semanal', body:`
    <p>El trabajador gozará de descanso semanal los días domingos y festivos, conforme a lo
    dispuesto en el artículo 35 del Código del Trabajo. En casos de excepción calificados
    por la naturaleza de la faena, el descanso podrá distribuirse en otra forma, sin perjuicio
    de las compensaciones que correspondan.</p>`});

  clausulas.push({tit:'Régimen previsional', body:`
    <p>El trabajador cotizará en el sistema previsional chileno, afiliado a la AFP
    <strong>${t?.afiliacion_afp || '___________'}</strong>, siendo responsabilidad del empleador
    efectuar las retenciones legales y enterarlas oportunamente en las instituciones
    correspondientes.</p>`});

  clausulas.push({tit:'Trabajadores extranjeros', body:`
    <p>Si el trabajador fuese extranjero, podrá iniciar sus funciones una vez que cuente con
    la autorización legal correspondiente para trabajar en Chile.</p>`});

  if(tipo !== 'temporada'){
    clausulas.push({tit:'Fecha de ingreso', body:`
      <p>Se deja constancia de que ${elTrabajador} ingresó al servicio del empleador
      con fecha <strong>${fechaIngreso}</strong>.</p>`});
  }

  if(tipo === 'indefinido'){
    clausulas.push({tit:'Feriado anual', body:`
      <p>${ElTrabajador} tendrá derecho a un feriado anual de quince días hábiles, con
      goce de remuneración íntegra, después de un año de servicio, conforme a lo dispuesto
      en el artículo 67 del Código del Trabajo. El feriado se otorgará de preferencia en
      primavera o verano, considerando las necesidades del empleador y las de la faena.</p>`});

    clausulas.push({tit:'Terminación del contrato', body:`
      <p>El presente contrato podrá terminar por alguna de las causales establecidas en
      los artículos 159, 160 y 161 del Código del Trabajo. En caso de término por
      necesidades de la empresa u otra causal que así lo requiera, el empleador deberá
      dar aviso previo de al menos treinta días, o pagar una indemnización sustitutiva
      equivalente a la última remuneración mensual devengada, conforme al artículo 162.</p>
      <p>Si correspondiere, ${elTrabajador} tendrá derecho a la indemnización por años
      de servicio establecida en el artículo 163 del Código del Trabajo, equivalente a
      treinta días de la última remuneración mensual devengada por cada año de servicio
      y fracción superior a seis meses, con un máximo de trescientos treinta días de
      remuneración.</p>`});
  }

  clausulas.push({tit:'Ejemplares del contrato', body:`
    <p>El presente contrato se firma en dos ejemplares de igual tenor y fecha, quedando
    uno en poder de cada parte, declarando el trabajador haber recibido en este acto su
    ejemplar correspondiente, pudiendo emitirse copias adicionales para fines
    administrativos o legales.</p>
    <p>El empleador se obliga a mantener en el lugar de trabajo un ejemplar firmado del
    presente contrato, y a registrarlo en el sitio electrónico de la Dirección del
    Trabajo (www.direcciondeltrabajo.cl) dentro de los quince días hábiles siguientes a su
    celebración, conforme a lo dispuesto en el artículo 9 bis del Código del Trabajo.</p>`});

  clausulas.push({tit:'Domicilio para efectos legales', body:`
    <p>Para todos los efectos legales derivados del presente contrato, las partes fijan su
    domicilio en la ciudad de
    <strong>${datos.ciudad_firma || emp.ciudad || '______________'}</strong>.</p>`});

  clausulas.push({tit:'Aceptación de las partes', body:`
    <p>Las partes declaran haber leído íntegramente el presente contrato y estar conformes con
    su contenido, firmando en señal de aceptación.</p>`, esUltima:true});

  const clausulasHTML = clausulas.map((c, i) => {
    const numBadge = String(i+1).padStart(2,'0');
    const ordinal  = ORDINALES[i] || `Cláusula ${i+1}`;
    const bloque = `<div class="clausula">
      <div class="clausula-head"><span class="clausula-badge">${numBadge}</span><span class="clausula-tit">${ordinal} — ${c.tit}</span></div>
      ${c.body}
    </div>`;
    return c.esUltima ? `<div class="firma-cierre">\n${bloque}` : bloque;
  }).join('\n');

  const htmlCompleto = `<!DOCTYPE html><html lang="es"><head>
  <meta charset="UTF-8">
  <title>Contrato — ${t?.nombre}</title>
  <style>
    :root{ --verde-doc:#0F4C3A; }
    @page{ size:letter; margin:2.2cm 2.4cm; }
    *{ box-sizing:border-box; }
    body{ font-family:'Times New Roman',serif; font-size:11pt; line-height:1.75;
      margin:0; padding:0; color:#1a1a1a; }
    .doc-wrap{ max-width:76ch; margin:0 auto; overflow-wrap:break-word; word-break:break-word; }
    h1{ font-size:13pt; text-align:center; text-transform:uppercase;
      letter-spacing:1.2px; margin:0 0 4px; font-weight:bold; }
    h2{ font-size:11pt; text-align:center; text-transform:uppercase;
      letter-spacing:0.5px; margin:0 0 16px; font-weight:normal; color:#555; }
    p{ text-align:justify; margin:0 0 9px; orphans:3; widows:3; }
    .clausula{ margin-bottom:18px; }
    .clausula-head{ display:flex; align-items:center; gap:8px; margin-bottom:6px;
      page-break-after:avoid; break-after:avoid; }
    .clausula-badge{ font-family:Arial,Helvetica,sans-serif; background:var(--verde-doc);
      color:#fff; font-size:8pt; font-weight:bold; width:18px; height:18px; border-radius:4px;
      display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .clausula-tit{ font-family:Arial,Helvetica,sans-serif; font-size:10.5pt; font-weight:700;
      color:var(--verde-doc); letter-spacing:-0.01em; }
    ul, ol{ margin:6px 0 10px 20px; }
    ul li, ol li{ margin-bottom:5px; page-break-inside:avoid; break-inside:avoid; }
    .firma-grid{ display:grid; grid-template-columns:1fr 1fr; gap:50px; margin-top:28px; break-inside:avoid; page-break-inside:avoid; }
    .firma-cierre{ page-break-inside:avoid; break-inside:avoid; }
    .firma-box{ text-align:center; }
    .firma-linea{ border-top:1px solid #000; padding-top:6px; margin-top:28px; }
    .firma-nombre{ font-weight:bold; font-size:10pt; }
    .firma-rol{ font-size:9pt; color:#444; margin-top:1px; }
    .separador{ border:none; border-top:2px solid #000; margin:36px 0; }
    .salto{ break-before:page; page-break-before:always; margin-top:0; padding-top:0; }
    .doc-folio{ font-family:Arial,Helvetica,sans-serif; font-size:6.5pt; color:#aaa;
      text-align:center; margin-bottom:8px; letter-spacing:0.2px; text-transform:uppercase; }
    .doc-titulo{ font-size:12.5pt; font-weight:bold; text-align:center;
      text-transform:uppercase; letter-spacing:0.8px; margin-bottom:14px; color:var(--verde-doc); }
    .doc-subtitulo{ font-size:10pt; text-align:center; margin-bottom:18px; color:#555; }
    table{ width:100%; border-collapse:collapse; margin:10px 0; break-inside:avoid; page-break-inside:avoid; }
    table td{ padding:6px 10px; border:1px solid #ccc; font-size:10pt; vertical-align:top; }
    table td:first-child{ font-weight:bold; width:45%; background:#f7f7f7; }
    .check-row{ display:flex; gap:12px; flex-wrap:wrap; margin:8px 0; }
    .check-item{ display:flex; align-items:center; gap:6px; font-size:10pt; }
    .checkbox{ width:16px; height:16px; border:1.8px solid #000;
      display:inline-block; text-align:center; line-height:16px; font-size:12px;
      font-weight:bold; font-family:Arial,sans-serif; flex-shrink:0; }
    .checkbox.checked{ background:#000; color:#fff; }
    .firma-simple{ margin-top:36px; }
    .firma-simple .firma-linea{ width:60%; margin:45px auto 6px; }
    .firma-simple p{ text-align:center; font-size:10pt; }
    .observ-linea{ border-bottom:1px solid #000; margin:8px 0; height:22px; }
    .no-print{ margin-bottom:24px; }
    @media print{ .no-print{display:none !important;} }
  </style>
</head><body>
<div class="doc-wrap">

<!-- BOTONES IMPRIMIR -->
<div class="no-print" style="display:flex;gap:10px;align-items:center;">
  <button onclick="window.print()" style="padding:10px 24px;background:#0f2942;color:#fff;
    border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
    🖨️ Imprimir / Guardar PDF
  </button>
  <button onclick="window.close()" style="padding:10px 16px;background:#f1f5f9;
    border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;">
    Cerrar
  </button>
  <span style="font-size:12px;color:#666;margin-left:8px;">
    💡 EPP e inducción IRL se cargan desde la ficha del trabajador
  </span>
</div>

<!-- ══════════════════════════════════
     CONTRATO DE TRABAJO
══════════════════════════════════ -->
<div class="doc-folio">${folioLinea}</div>
<h1>${tituloDoc}</h1>
<h2>${subtituloDoc}</h2>

<p>En la ciudad de <strong>${datos.ciudad_firma || emp.ciudad || '______________'}</strong>,
a ${fechaFirma}, entre la empresa
<strong>${emp.razon_social || '______________'}</strong>,
RUT <strong>${emp.rut || '___________'}</strong>,
representada legalmente por don(ña) <strong>${emp.representante || '______________'}</strong>,
cédula de identidad <strong>${emp.rut_representante || '___________'}</strong>,
correo electrónico <strong>${emp.correo || '______________'}</strong>,
ambos domiciliados en <strong>${emp.direccion || '______________'}</strong>,
en adelante <em>"el Empleador"</em>; y don(ña)
<strong>${t?.nombre || '______________'}</strong>,
RUT <strong>${t?.rut || '___________'}</strong>,
de nacionalidad <strong>${t?.nacionalidad || '___________'}</strong>,
${nacidoTxt} el <strong>${fechaNac}</strong>,
estado civil <strong>${t?.estado_civil || '___________'}</strong>,
con domicilio en <strong>${t?.domicilio || '___________'}</strong>,
correo electrónico <strong>${t?.correo_electronico || '___________'}</strong>,
${afiliadoTxt} a AFP <strong>${t?.afiliacion_afp || '___________'}</strong>
y sistema de salud <strong>${t?.sistema_salud || '___________'}</strong>,
en adelante <em>"${elTrabajadorCap}"</em>, se ha convenido celebrar el siguiente
${tipoTexto}, el cual se regirá por el Código del Trabajo y demás disposiciones
legales vigentes.</p>

<p>Las partes acuerdan denominarse <em>"Empleador"</em> y <em>"${Trabajador}"</em>,
respectivamente, y suscriben las siguientes cláusulas:</p>

${clausulasHTML}

<div class="firma-grid">
  <div class="firma-box">
    <div class="firma-linea"></div>
    <div class="firma-nombre">${t?.nombre || '______________'}</div>
    <div class="firma-rol">${Trabajador}</div>
    <div class="firma-rol">RUT: ${t?.rut || '___________'}</div>
  </div>
  <div class="firma-box">
    <div class="firma-linea"></div>
    <div class="firma-nombre">${emp.razon_social || '______________'}</div>
    <div class="firma-rol">Representante legal: ${emp.representante || '______________'}</div>
    <div class="firma-rol">RUT: ${emp.rut_representante || '___________'}</div>
  </div>
</div>
</div>

<!-- ══════════════════════════════════
     EPP
══════════════════════════════════ -->
<div class="salto">
  <div class="doc-folio">${folioLinea}</div>
  <div class="doc-titulo">Constancia de Recepción de Elementos de Protección Personal (EPP)</div>

  <p>Yo, <strong>${t?.nombre || '______________'}</strong>,
  RUT <strong>${t?.rut || '___________'}</strong>,
  declaro haber recibido de parte de <strong>${emp.razon_social || '______________'}</strong>
  los siguientes elementos de protección personal, necesarios para el adecuado desempeño
  de mis funciones:</p>

  <div class="check-row" style="margin:16px 0;">
    ${['Legionario','Guantes','Lentes','Chaleco','Bloqueador'].map(item => {
      // ✅ Corregido — leía t?.epp_entregados (el TRABAJADOR), que nunca
      // tiene ese dato — el EPP se guarda en el CONTRATO (datos), no en
      // el trabajador. Mismo patrón exacto que ya se corrigió ayer en
      // Alertas y en la ficha del trabajador (trabajadores.js) — acá
      // vivía la misma falla, en el propio documento que se imprime.
      const marcado = (datos?.epp_entregados||[]).includes(item);
      return `<span class="check-item"><span class="checkbox${marcado?' checked':''}">${marcado?'X':''}</span> ${item}</span>`;
    }).join('\n    ')}
    <span class="check-item"><span class="checkbox${(datos?.epp_entregados||[]).includes('Otro')?' checked':''}">${(datos?.epp_entregados||[]).includes('Otro')?'X':''}</span> Otro: ${datos?.epp_otro || '_______________'}</span>
  </div>

  <p>Declaro que los elementos entregados se encuentran en buen estado y cumplen con la
  normativa chilena vigente. Me comprometo a utilizarlos correctamente, cuidarlos y mantenerlos
  en buen estado de funcionamiento, conforme a las instrucciones impartidas por el empleador.
  Se deja constancia de que el uso de los elementos de protección personal es obligatorio
  durante el desempeño de las labores.</p>

  <div class="firma-simple">
    <div class="firma-linea"></div>
    <p><strong>Nombre:</strong> ${t?.nombre || '______________'}</p>
    <p><strong>RUT:</strong> ${t?.rut || '___________'}</p>
    <p><strong>Fecha:</strong> ${fmtCorta(t?.epp_fecha_entrega || t?.fecha_ingreso)}</p>
  </div>
</div>

<!-- ══════════════════════════════════
     RIOHS
══════════════════════════════════ -->
<div class="salto">
  <div class="doc-folio">${folioLinea}</div>
  <div class="doc-titulo" style="margin-bottom:14px;">Constancia de Entrega de Reglamento Interno de Orden, Higiene y Seguridad</div>

  <p style="margin-bottom:10px;">Con fecha <strong>${fmtCorta(datos?.irl_fecha_induccion || t?.fecha_ingreso)}</strong>, la empresa
  <strong>${emp.razon_social || '______________'}</strong>,
  RUT <strong>${emp.rut || '___________'}</strong>,
  representada por don(ña) <strong>${emp.representante || '______________'}</strong>,
  en su calidad de representante legal, hace entrega a ${elTrabajador}
  <strong>${t?.nombre || '______________'}</strong>,
  RUT <strong>${t?.rut || '___________'}</strong>,
  de un ejemplar del Reglamento Interno de Orden, Higiene y Seguridad, en cumplimiento
  de lo dispuesto en el artículo 156 del Código del Trabajo.</p>

  <p style="margin-bottom:10px;">${ElTrabajador} declara haber recibido una copia del referido reglamento, haber sido
  ${informadoTxt} de su contenido y se compromete a cumplir las disposiciones, normas y
  procedimientos establecidos durante el desempeño de sus labores. Asimismo, se deja constancia
  de que ${elTrabajador} ha sido ${informadoTxt} sobre la obligación de conocer y aplicar las
  medidas preventivas de seguridad, higiene y disciplina contenidas en el Reglamento Interno,
  así como de los riesgos asociados a las labores que desempeña.</p>

  <table style="break-inside:auto;page-break-inside:auto;margin:8px 0;">
    <tr><td>Nombre completo</td><td>${t?.nombre || '—'}</td></tr>
    <tr><td>RUT</td><td>${t?.rut || '—'}</td></tr>
    <tr><td>Área o faena</td><td>${datos.nombre_faena || '—'}</td></tr>
    <tr><td>Fecha de ingreso</td><td>${fmtCorta(t?.fecha_ingreso)}</td></tr>
  </table>

  <p style="margin-top:14px;margin-bottom:6px;"><strong>Observaciones:</strong></p>
  <div class="observ-linea" style="margin:6px 0;"></div>
  <div class="observ-linea" style="margin:6px 0;"></div>

  <div class="firma-grid" style="margin-top:24px;">
    <div class="firma-box">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${t?.nombre || '______________'}</div>
      <div class="firma-rol">Firma ${delTrabajador} ${Trabajador}</div>
      <div class="firma-rol">RUT: ${t?.rut || '___________'}</div>
    </div>
    <div class="firma-box">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${emp.representante || '______________'}</div>
      <div class="firma-rol">Entrega efectuada por</div>
      <div class="firma-rol">Fecha: ${fmtCorta(datos?.irl_fecha_induccion || t?.fecha_ingreso)}</div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════
     IRL — DS N°44
══════════════════════════════════ -->
<div class="salto">
  <div class="doc-folio">${folioLinea}</div>
  <div class="doc-titulo">Planilla de Registro IRL</div>
  <div class="doc-subtitulo">Información de Riesgos Laborales — Art. 15 del D.S. N°44</div>
  <div class="doc-subtitulo">Empresas Contratistas, Subcontratistas y Prestadoras de Servicios en
    <strong>${mandante?.nombre || '______________'}</strong>
  </div>

  <p><strong>Declaración y Alcance:</strong> En conformidad con el Decreto Supremo N°44 del
  Ministerio del Trabajo y Previsión Social, se establece la obligación de garantizar que toda
  persona trabajadora reciba, antes de iniciar sus labores, información clara, oportuna y
  adecuada respecto de los riesgos asociados a las labores a realizar, las medidas preventivas
  a implementar y los métodos o procedimientos de trabajo seguros.</p>

  <p><strong>1. Tipo de Inducción</strong> (marque con una X la opción correspondiente)</p>
  <div style="margin:10px 0 16px;">
    ${[
      ['nueva', 'Persona trabajadora nueva'],
      ['ausencia_prolongada', 'Persona trabajadora con ausencia prolongada'],
      ['reubicada', 'Persona trabajadora reubicada en nuevo cargo'],
      ['cambio_proceso', 'Por cambio de proceso, tecnología, materiales o sustancias'],
    ].map(([valor, etiqueta]) => {
      const marcado = (datos.irl_tipo || t?.irl_tipo || 'nueva') === valor;
      return `<div style="margin-bottom:8px;" class="check-item"><span class="checkbox${marcado?' checked':''}">${marcado?'X':''}</span> &nbsp;${etiqueta}</div>`;
    }).join('\n    ')}
  </div>

  <p><strong>2. Identificación de la Persona Trabajadora</strong></p>
  <table>
    <tr><td>Nombre</td><td>${t?.nombre || '—'}</td></tr>
    <tr><td>RUT</td><td>${t?.rut || '—'}</td></tr>
    <tr><td>Empresa</td><td>${emp.razon_social || '—'}</td></tr>
    <tr><td>Faena</td><td>${datos.nombre_faena || '—'}</td></tr>
    <tr><td>Fecha</td><td>${fmtCorta(datos?.irl_fecha_induccion || t?.fecha_ingreso)}</td></tr>
  </table>

  <p style="margin-top:16px;"><strong>3. Identificación del Relator(a)</strong></p>
  <table>
    <tr><td>Nombre del relator(a)</td><td>${emp.representante || '—'}</td></tr>
    <tr><td>Empresa</td><td>${emp.razon_social || '—'}</td></tr>
    <tr><td>Fecha de inducción</td><td>${fmtCorta(datos?.irl_fecha_induccion || t?.fecha_ingreso)}</td></tr>
    <tr><td>Hora inicio</td><td>&nbsp;</td></tr>
    <tr><td>Hora término</td><td>&nbsp;</td></tr>
  </table>

  <p style="margin-top:16px;"><strong>4. Declaración de Recepción de IRL</strong>
    <!-- ✅ Corregido — leía t?.irl_declarado (trabajador, nunca poblado),
         mismo patrón que el EPP de arriba — ahora lee datos?.irl_declarado
         (el contrato, donde realmente se guarda). -->
    ${datos?.irl_declarado ? ` <span style="color:#0a7a35;">✅ Declarado recibido por ${elTrabajador} en su ficha</span>` : ''}
  </p>
  <p>Declaro haber recibido información clara y suficiente sobre los riesgos laborales
  asociados a mis funciones, así como respecto de las medidas preventivas y procedimientos
  de trabajo seguro, antes del inicio de mis labores.</p>
  <p>Asimismo, declaro comprender la importancia de cumplir las medidas de control indicadas,
  las cuales se encuentran contenidas en el Reglamento Interno de Orden, Higiene y Seguridad
  y en el Reglamento Especial para Empresas Contratistas y Subcontratistas.</p>

  <div class="firma-grid" style="margin-top:40px;">
    <div class="firma-box">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${emp.representante || '______________'}</div>
      <div class="firma-rol">Firma Relator(a)</div>
    </div>
    <div class="firma-box">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${t?.nombre || '______________'}</div>
      <div class="firma-rol">Firma ${Trabajador}</div>
      <div class="firma-rol">RUT: ${t?.rut || '___________'}</div>
      <div class="firma-rol">Fecha: ${fmtCorta(datos?.irl_fecha_induccion || t?.fecha_ingreso)}</div>
    </div>
  </div>
</div>

</div>
</body></html>`;

  return { htmlCompleto, folioDoc, tipo };
}

/* Extrae solo el contenido interno del documento (sin <head>/<style>, sin botones
   de impresión) — usado para la Vista Previa en pantalla y para concatenar varios
   contratos en un solo documento de impresión masiva. */
function _contenidoInternoDocumento(htmlCompleto){
  let contenido = htmlCompleto.split('<div class="doc-wrap">')[1] || '';
  contenido = contenido.split('</body></html>')[0];
  contenido = contenido.replace(/<div class="no-print"[\s\S]*?<\/div>\s*\n/, '');
  return contenido;
}

/* Genera el PDF desde el formulario Individual (o para un trabajador del modo Masivo).
   soloContenido=true devuelve solo el contenido interno, para el combinado masivo. */
function generarPDFContrato(soloContenido){
  const id = document.getElementById('c-trabajador')?.value;
  if(!id){ toast('⚠️ Selecciona un trabajador primero','error'); return; }

  const datos    = obtenerDatosFormulario();
  const t        = trabajadores.find(x => x.id === id);
  const epId     = document.getElementById('c-empresa-propia')?.value || t?.empresa_propia_id || '';
  const emp      = getEmpresaEmpleadora(epId);
  const mandante = _mandanteSeleccionadoContrato();

  if(!datos.funcion_cargo){ toast('⚠️ Ingresa la función/cargo','error'); return; }
  if(!datos.nombre_faena){  toast('⚠️ Ingresa el nombre de la faena','error'); return; }

  const { htmlCompleto, folioDoc, tipo } = construirDocumentoContrato(t, emp, mandante, datos);

  // Registrar en Carpeta Laboral (aplica tanto en modo individual como masivo)
  const tipoTxt = { temporada:'Temporada', plazo_fijo:'Plazo Fijo', indefinido:'Indefinido' }[tipo] || tipo;
  registrarDocumentoCarpeta({
    trabajador_id:  id,
    trabajador_rut: t?.rut || '',
    empresa_propia_id: epId,
    tipo:           'contrato',
    subtipo:        tipo,
    folio:          folioDoc,
    fecha_firma:    datos.fecha_firma || '',
    descripcion:    `Contrato ${tipoTxt} — ${datos.nombre_faena || ''} — ${datos.temporada || ''}`.trim().replace(/—\s*$/, ''),
  });

  if(soloContenido){
    return _contenidoInternoDocumento(htmlCompleto);
  }

  const win = window.open('','_blank');
  win.document.write(htmlCompleto);
  win.document.close();
}

function switchTabContratos(tab){
  tabContratosActivo = tab;
  const tabs = { 'ct-individual':'tab-ct-individual', 'ct-masivo':'tab-ct-masivo', 'ct-emitidos':'tab-ct-emitidos', anexos:'tab-anexos', epp:'tab-epp' };
  const subs = { 'ct-individual':'sub-tab-ct-individual', 'ct-masivo':'sub-tab-ct-masivo', 'ct-emitidos':'sub-tab-ct-emitidos', anexos:'sub-tab-anexos', epp:'sub-tab-epp' };
  const hdrBtns = document.getElementById('contratos-header-btns');
  const bloqueEmpresa = document.getElementById('bloque-empresa-compartida');
  const campoTipo = document.getElementById('campo-tipo-contrato-individual');

  Object.keys(tabs).forEach(key => {
    const btn = document.getElementById(tabs[key]);
    if(!btn) return;
    const activo = key === tab;
    btn.style.borderBottomColor = activo ? 'var(--azul)' : 'transparent';
    btn.style.color = activo ? '#fff' : 'var(--texto2)';
    btn.style.background = activo ? 'var(--azul)' : 'none';
  });
  Object.keys(subs).forEach(key => {
    const el = document.getElementById(subs[key]);
    if(el) el.style.display = (key === tab) ? '' : 'none';
  });

  if(hdrBtns) hdrBtns.style.display = (tab === 'ct-individual') ? 'flex' : 'none';
  if(bloqueEmpresa) bloqueEmpresa.style.display = (tab === 'ct-individual' || tab === 'ct-masivo') ? 'block' : 'none';
  if(campoTipo) campoTipo.style.display = (tab === 'ct-individual') ? '' : 'none';

  if(tab === 'ct-individual') _initTabContratoIndividual();
  if(tab === 'ct-masivo')     _initTabContratoMasivo();
  if(tab === 'ct-emitidos')   _initTabContratosEmitidos();
  if(tab === 'anexos'){
    poblarSelectAnexoTrabajador();
    actualizarBadgesContratos();
    cambiarModoAnexo('individual');
  }
  if(tab === 'epp') initEppTab();
}

function actualizarBadgesContratos(){
  const bc = document.getElementById('badge-tab-contratos');
  const ba = document.getElementById('badge-tab-anexos');
  if(bc) bc.textContent = contratos.length;
  if(ba) ba.textContent = (anexos||[]).length;
}

/* ════════════════════════════════════════════════════════
   CONTRATOS EMITIDOS
   ════════════════════════════════════════════════════════ */
function _initTabContratosEmitidos(){
  const selEmp = document.getElementById('ce-f-empresa');
  const selReal = document.getElementById('c-empresa-propia');
  if(selEmp && selReal){
    const val = selEmp.value;
    selEmp.innerHTML = '<option value="">Todas</option>' + selReal.innerHTML.replace(/<option value="">[^<]*<\/option>/, '');
    if(val) selEmp.value = val;
  }

  const selMandante = document.getElementById('ce-f-mandante');
  if(selMandante){
    const val = selMandante.value;
    const mandantes = [];
    (contratos||[]).forEach(c => {
      const m = _mandanteDeContrato(c);
      if(m && !mandantes.some(x => x.id === m.id)) mandantes.push(m);
    });
    mandantes.sort((a,b) => a.nombre.localeCompare(b.nombre));
    selMandante.innerHTML = '<option value="">Todos</option>' + mandantes.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
    if(val) selMandante.value = val;
  }

  renderContratosEmitidos();
}

/* Etiquetas de estado combinables — se calculan solas, nada se guarda a mano */
function _estadoTagsContrato(c, t){
  const tags = [];
  const hoy = hoyISO();
  if(c.tipo === 'indefinido' || !c.fecha_termino || c.fecha_termino >= hoy) tags.push({txt:'Vigente', bg:'#D1FAE5', fg:'#065F46'});
  else tags.push({txt:'Vencido', bg:'#FEE2E2', fg:'#991B1B'});

  const yaRectificado = (carpeta||[]).some(d => _mismoTrabajador(d.trabajador_id, c.trabajador_id) && d.tipo === 'rectificacion_contrato');
  if(yaRectificado) tags.push({txt:'Rectificado', bg:'#FEF3C7', fg:'#92400E'});

  const tieneAnexo = (anexos||[]).some(a => a.contrato_id === c.id || _mismoTrabajador(a.trabajador_id, c.trabajador_id));
  if(tieneAnexo) tags.push({txt:'Con Anexo', bg:'#DBEAFE', fg:'#1D4ED8'});

  return tags;
}

function renderContratosEmitidos(){
  const fEmpresa  = document.getElementById('ce-f-empresa')?.value || '';
  const fMandante = document.getElementById('ce-f-mandante')?.value || '';
  const fTipo     = document.getElementById('ce-f-tipo')?.value || '';
  const fEstado   = document.getElementById('ce-f-estado')?.value || '';
  const fBuscar   = (document.getElementById('ce-f-buscar')?.value || '').toLowerCase().trim();
  const fInicio   = document.getElementById('ce-f-inicio')?.value || '';
  const fTermino  = document.getElementById('ce-f-termino')?.value || '';

  let lista = (contratos||[]).map(c => {
    const t = trabajadores.find(x => _mismoTrabajador(x.id, c.trabajador_id) || x.rut === c.trabajador_rut);
    const mandante = _mandanteDeContrato(c);
    return { c, t, mandante, tags: _estadoTagsContrato(c, t||{}) };
  });

  if(fEmpresa)  lista = lista.filter(({c}) => (c.empresa_propia_id||'') === fEmpresa);
  if(fMandante) lista = lista.filter(({mandante}) => mandante?.id === fMandante);
  if(fTipo)     lista = lista.filter(({c}) => c.tipo === fTipo);
  if(fEstado)   lista = lista.filter(({tags}) => tags.some(tg =>
    (fEstado==='vigente' && tg.txt==='Vigente') || (fEstado==='vencido' && tg.txt==='Vencido') ||
    (fEstado==='rectificado' && tg.txt==='Rectificado') || (fEstado==='con_anexo' && tg.txt==='Con Anexo')));
  if(fBuscar)   lista = lista.filter(({t}) => t?.nombre?.toLowerCase().includes(fBuscar) || t?.rut?.toLowerCase().includes(fBuscar));
  if(fInicio)   lista = lista.filter(({c}) => !c.fecha_inicio || c.fecha_inicio >= fInicio);
  if(fTermino)  lista = lista.filter(({c}) => !c.fecha_termino || c.fecha_termino <= fTermino);

  lista.sort((a,b) => (b.c.creado_en||'').localeCompare(a.c.creado_en||''));

  const badge = document.getElementById('badge-tab-contratos');
  if(badge) badge.textContent = contratos.length;

  const tbody = document.getElementById('tbody-contratos-emitidos');
  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--texto3);">Sin contratos que coincidan con el filtro</td></tr>`;
    return;
  }

  // ✅ Corregido — mismo bug de zona horaria de toda la sesión, ahora en
  // la tabla de "Contratos Emitidos" (fecha de firma/término mostradas
  // podían salir un día antes de la real).
  const fmt = v => v ? new Date(v+'T12:00:00').toLocaleDateString('es-CL') : '—';
  const tipoTxt = { temporada:'Temporada', plazo_fijo:'Plazo Fijo', indefinido:'Indefinido' };

  tbody.innerHTML = lista.map(({c,t,mandante,tags}) => `
    <tr>
      <td>${c.numero_contrato ? 'Nº '+c.numero_contrato : 'S/N'}</td>
      <td>${fmt(c.creado_en)}</td>
      <td>${fmt(c.fecha_firma)}</td>
      <td>${t?.nombre || 'Trabajador eliminado'}</td>
      <td>${getEmpresaEmpleadora(c.empresa_propia_id)?.nombre || '—'}</td>
      <td>${mandante?.nombre || '—'}</td>
      <td>${tipoTxt[c.tipo] || c.tipo}</td>
      <td>${fmt(c.fecha_inicio)}</td>
      <td>${c.tipo==='indefinido' ? '—' : fmt(c.fecha_termino)}</td>
      <td>${tags.map(tg => `<span style="background:${tg.bg};color:${tg.fg};font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;margin-right:3px;white-space:nowrap;">${tg.txt}</span>`).join('')}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-secondary btn-sm" title="Ver PDF" onclick="_seleccionarTrabajadorContratoVisual('${t?.id||''}');generarPDFContrato();"><i class="ti ti-file-type-pdf"></i></button>
        <button class="btn btn-secondary btn-sm" title="Rectificar" onclick="abrirRectificacion('${c.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-secondary btn-sm" title="Crear Anexo" onclick="switchTabContratos('anexos')"><i class="ti ti-paperclip"></i></button>
        <button class="btn btn-secondary btn-sm" title="Carpeta Laboral" onclick="verPerfilTrabajador('${t?.rut||''}')"><i class="ti ti-folder"></i></button>
      </td>
    </tr>`).join('');
}

/* ── RECTIFICACIÓN ADMINISTRATIVA ─────────────────────────
   Solo campos propios del contrato — RUT/Nombre no se corrigen aquí
   porque pertenecen al registro del Trabajador (Registro Personal). */
let _rectContratoId = null;

const RECT_CAMPOS_TXT = {
  funcion_cargo:    'Cargo',
  nombre_faena:     'Faena',
  sueldo_monto:     'Sueldo',
  tipo_remuneracion:'Forma de pago',
  fecha_firma:      'Fecha de firma',
  fecha_termino:    'Fecha de término',
  ciudad_firma:     'Ciudad de firma',
};

function abrirRectificacion(contratoId){
  const c = contratos.find(x => x.id === contratoId);
  if(!c){ toast('⚠️ Contrato no encontrado', 'error'); return; }
  const t = trabajadores.find(x => _mismoTrabajador(x.id, c.trabajador_id));

  _rectContratoId = contratoId;
  document.getElementById('rect-trabajador-nombre').textContent = `${t?.nombre||'—'} · ${t?.rut||c.trabajador_rut}`;
  document.getElementById('rect-valor-nuevo').value = '';
  document.getElementById('rect-motivo').value = '';
  document.getElementById('rect-campo').value = 'funcion_cargo';
  _cargarValorAnteriorRectificacion();
  document.getElementById('modal-rectificacion').style.display = 'flex';
}

function cerrarModalRectificacion(){
  document.getElementById('modal-rectificacion').style.display = 'none';
  _rectContratoId = null;
}

function _cargarValorAnteriorRectificacion(){
  const c = contratos.find(x => x.id === _rectContratoId);
  if(!c) return;
  const campo = document.getElementById('rect-campo').value;
  const tipoTxt = { mensual:'Mensual', diaria:'Diaria (Jornal)' };
  let valor = c[campo];
  if(campo === 'tipo_remuneracion') valor = tipoTxt[valor] || valor;
  if(campo === 'sueldo_monto') valor = valor ? '$' + Number(valor).toLocaleString('es-CL') : '';
  // ✅ Corregido — mismo bug de zona horaria, ahora en el "valor anterior"
  // que se muestra al rectificar fecha_firma/fecha_termino.
  const esCampoFecha = campo === 'fecha_firma' || campo === 'fecha_termino';
  if(esCampoFecha && valor) valor = new Date(valor+'T12:00:00').toLocaleDateString('es-CL');
  document.getElementById('rect-valor-anterior').value = valor || '—';

  // ✅ Corregido — el campo "Nuevo valor" era texto libre incluso para
  // fechas: sin selector de calendario ni validación de formato, un
  // valor tipeado a mano en formato distinto a AAAA-MM-DD (ej.
  // "21/08/2026") se guardaba tal cual, rompiendo en silencio todos
  // los cálculos posteriores que dependen de esa fecha (Alertas,
  // Liquidaciones, etc. — confirmado con un caso real: da NaN días
  // hasta el vencimiento). Ahora usa un selector de calendario real
  // cuando el campo elegido es una fecha, igual que el resto del
  // sistema.
  const inputNuevo = document.getElementById('rect-valor-nuevo');
  if(inputNuevo){
    inputNuevo.type = esCampoFecha ? 'date' : 'text';
    inputNuevo.value = '';
  }
}

function guardarRectificacion(){
  const c = contratos.find(x => x.id === _rectContratoId);
  if(!c){ toast('⚠️ Contrato no encontrado', 'error'); return; }

  const campo = document.getElementById('rect-campo').value;
  const valorAnteriorTxt = document.getElementById('rect-valor-anterior').value;
  const valorNuevo = document.getElementById('rect-valor-nuevo').value.trim();
  const motivo = document.getElementById('rect-motivo').value.trim();

  if(!valorNuevo){ toast('⚠️ Ingresa el nuevo valor', 'error'); return; }
  if(!motivo){ toast('⚠️ Ingresa el motivo de la rectificación', 'error'); return; }

  // ✅ Resguardo adicional — aunque el campo ya usa type="date" para
  // fechas, se valida el formato igual antes de guardar (defensa en
  // profundidad, por si el valor llega de otra forma).
  if((campo === 'fecha_firma' || campo === 'fecha_termino') && !/^\d{4}-\d{2}-\d{2}$/.test(valorNuevo)){
    toast('⚠️ La fecha no tiene un formato válido — selecciónala con el calendario','error'); return;
  }

  cargarContratos();
  const idx = contratos.findIndex(x => x.id === _rectContratoId);
  if(idx < 0){ toast('⚠️ Contrato no encontrado', 'error'); return; }

  // Sueldo se guarda como número; el resto como texto tal cual se ingresó
  contratos[idx][campo] = (campo === 'sueldo_monto') ? (parseInt(valorNuevo.replace(/\D/g,'')) || 0) : valorNuevo;
  guardarContratos();

  const t = trabajadores.find(x => _mismoTrabajador(x.id, c.trabajador_id));
  registrarDocumentoCarpeta({
    trabajador_id:  c.trabajador_id,
    trabajador_rut: c.trabajador_rut,
    empresa_propia_id: c.empresa_propia_id || '',
    tipo:           'rectificacion_contrato',
    subtipo:        campo,
    fecha_firma:    hoyISO(),
    descripcion:    `Rectificación — ${RECT_CAMPOS_TXT[campo]||campo}: "${valorAnteriorTxt}" → "${valorNuevo}". Motivo: ${motivo}`,
  });

  toast(`✅ Rectificación guardada para ${t?.nombre||''}`, 'exito');
  cerrarModalRectificacion();
  renderContratosEmitidos();
}

/* ════════════════════════════════════════════════════════
   CONTRATOS MASIVOS
   ════════════════════════════════════════════════════════ */

/* Se llama al abrir la pestaña "Contrato Individual" */
function _initTabContratoIndividual(){
  document.getElementById('c-trabajador').value = '';
  limpiarPreview();
  poblarSelectTrabajadoresContrato();
}

/* ════════════════════════════════════════════════════════
   CONTRATO MASIVO — Empresa Propia → Mandante → Cargo → lista
   Simplificado tras el Bypass de Mandante: ya no se agrupa por
   Mandante (un trabajador sin Contrato todavía no tiene Mandante).
   El Mandante y el Cargo se ELIGEN una vez para todo el lote — no
   se leen de cada trabajador. "Masivo" es, por diseño, un lote
   homogéneo (mismo Cargo, mismas condiciones); un caso único (ej.
   un Supervisor) se sube por Contrato Individual.
   ════════════════════════════════════════════════════════ */

/* Se llama al abrir la pestaña "Contratos Masivos" */
/* ════════════════════════════════════════════════════════
   CONTRATO MASIVO — rediseño completo (reporte de Contratos, Punto 13)
   Nuevo flujo: Empresa Empleadora → bloques automáticos agrupados por
   Cargo (ya viene de Registro Personal, sin selector manual) → el
   usuario abre un bloque a la vez, selecciona trabajadores → Bloque 1
   del formulario de configuración recién ahí pide Mandante (que trae
   la Faena) — "un grupo por Mandante" es la regla, con aviso visible.
   Reemplaza el flujo anterior donde Mandante y Cargo se elegían ANTES
   de ver la lista de candidatos.
   ════════════════════════════════════════════════════════ */

/* Se llama al abrir la pestaña "Contratos Masivos" */
function _initTabContratoMasivo(){
  _masivoSeleccionados = {};
  renderBloquesMasivo();
}

/* Un trabajador tiene contrato vigente si existe un documento tipo 'contrato' en su carpeta laboral */
function _tieneContratoVigente(rut){
  return (carpeta || []).some(d => d.trabajador_rut === rut && d.tipo === 'contrato');
}

let _masivoSeleccionados = {}; // { cargoKey: Set(id_trabajador) }
let _configGruposActuales = [];

/* Candidatos base: activos, de la Empresa Propia elegida arriba, sin Contrato vigente */
function _candidatosMasivoBase(){
  const epId = document.getElementById('c-empresa-propia')?.value || '';
  if(!epId) return [];
  return trabajadores.filter(t => t.estado === 'activo' && (t.empresa_propia_id||'') === epId && !_tieneContratoVigente(t.rut));
}

function _cargoKeySafe(cargo){ return (cargo||'sin_cargo').replace(/[^a-zA-Z0-9]/g, '_'); }

function renderBloquesMasivo(){
  const epId    = document.getElementById('c-empresa-propia')?.value || '';
  const cont    = document.getElementById('masivo-bloques');
  const vacio   = document.getElementById('masivo-lista-vacio');
  const resumen = document.getElementById('masivo-pendientes-resumen');
  if(!cont) return;

  if(!epId){
    cont.innerHTML = '';
    if(vacio){ vacio.style.display = 'block'; vacio.textContent = 'Selecciona una Empresa Empleadora arriba para mostrar sus trabajadores pendientes de contrato.'; }
    if(resumen) resumen.textContent = '';
    return;
  }

  const candidatos = _candidatosMasivoBase();
  if(!candidatos.length){
    cont.innerHTML = '';
    if(vacio){ vacio.style.display = 'block'; vacio.textContent = 'Esta empresa no tiene trabajadores pendientes de contrato en este momento.'; }
    if(resumen) resumen.textContent = '';
    return;
  }
  if(vacio) vacio.style.display = 'none';

  // Agrupar automáticamente por Cargo — sin selector manual, el dato
  // ya viene de Registro Personal.
  const grupos = {};
  candidatos.forEach(t => {
    const cargo = t.funcion_cargo || 'Sin cargo';
    (grupos[cargo] = grupos[cargo] || []).push(t);
  });
  const cargos = Object.keys(grupos).sort((a,b) => a.localeCompare(b));

  if(resumen){
    resumen.textContent = `${candidatos.length} trabajador${candidatos.length!==1?'es':''} pendiente${candidatos.length!==1?'s':''} de contrato, en ${cargos.length} grupo${cargos.length!==1?'s':''} por cargo.`;
  }

  cont.innerHTML = cargos.map(cargo => {
    const key = _cargoKeySafe(cargo);
    const lista = grupos[cargo].slice().sort((a,b) => a.nombre?.localeCompare(b.nombre));
    return `
    <div style="border:1px solid var(--borde);border-radius:8px;margin-bottom:8px;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#f8fafc;cursor:pointer;" onclick="_toggleBloqueMasivo('${key}')">
        <span style="font-size:13px;font-weight:600;flex:1;">${cargo} (${lista.length})</span>
        <i class="ti ti-chevron-down" id="chev-masivo-${key}"></i>
      </div>
      <div id="bloque-masivo-${key}" style="display:none;padding:12px 14px;">
        <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;font-weight:600;cursor:pointer;border-bottom:1px solid var(--borde);margin-bottom:6px;">
          <input type="checkbox" onchange="_toggleTodosBloqueMasivo('${key}', this.checked)" style="width:auto;"> Seleccionar todos (${lista.length})
        </label>
        <div style="max-height:260px;overflow-y:auto;">
          ${lista.map(t => `
            <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer;">
              <input type="checkbox" class="masivo-check-${key}" data-id="${t.id}" onchange="_toggleCheckBloqueMasivo('${key}','${t.id}', this.checked)" style="width:auto;">
              <span style="flex:1;">${t.nombre} <span class="rut-mono">${t.rut}</span></span>
            </label>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:8px;">
          <span id="contador-masivo-${key}" style="font-size:12px;color:var(--texto3);">Selecciona trabajadores para generar contratos</span>
          <button class="btn btn-primary btn-sm" id="btn-config-masivo-${key}" onclick="abrirConfigGrupoMasivo('${key}')" disabled><i class="ti ti-settings"></i> Configurar y generar contratos</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function _toggleBloqueMasivo(key){
  const el = document.getElementById(`bloque-masivo-${key}`);
  const chev = document.getElementById(`chev-masivo-${key}`);
  if(!el) return;
  const abierto = el.style.display !== 'none';
  el.style.display = abierto ? 'none' : 'block';
  if(chev) chev.className = abierto ? 'ti ti-chevron-down' : 'ti ti-chevron-up';
}

function _marcarSeleccionMasivo(key, id, val){
  if(!_masivoSeleccionados[key]) _masivoSeleccionados[key] = new Set();
  if(val) _masivoSeleccionados[key].add(id); else _masivoSeleccionados[key].delete(id);
}

function _toggleTodosBloqueMasivo(key, val){
  document.querySelectorAll(`.masivo-check-${key}`).forEach(c => {
    c.checked = val;
    _marcarSeleccionMasivo(key, c.dataset.id, val);
  });
  _actualizarContadorBloqueMasivo(key);
}

function _toggleCheckBloqueMasivo(key, id, val){
  _marcarSeleccionMasivo(key, id, val);
  if(!val){
    const todos = document.querySelector(`#bloque-masivo-${key} input[type="checkbox"]:not(.masivo-check-${key})`);
    if(todos) todos.checked = false;
  }
  _actualizarContadorBloqueMasivo(key);
}

function _actualizarContadorBloqueMasivo(key){
  const n = _masivoSeleccionados[key]?.size || 0;
  const el = document.getElementById(`contador-masivo-${key}`);
  if(el) el.textContent = n ? `${n} trabajador${n!==1?'es':''} seleccionado${n!==1?'s':''}` : 'Selecciona trabajadores para generar contratos';
  const btn = document.getElementById(`btn-config-masivo-${key}`);
  if(btn) btn.disabled = n === 0;
}

/* ── CONFIGURACIÓN DEL GRUPO (Bloque 1: Mandante+Faena · Bloque 2:
   condiciones · Bloque 3: documentación) ────────────────────────── */
function abrirConfigGrupoMasivo(key){
  const seleccionados = _masivoSeleccionados[key];
  if(!seleccionados || !seleccionados.size){ toast('⚠️ Selecciona al menos un trabajador', 'error'); return; }

  const candidatos = _candidatosMasivoBase();
  const trabsSel = Array.from(seleccionados).map(id => candidatos.find(t => t.id === id)).filter(Boolean);
  if(!trabsSel.length){ toast('⚠️ Selecciona al menos un trabajador', 'error'); return; }
  const cargo = trabsSel[0].funcion_cargo || 'Sin cargo';

  const gid = key;
  _configGruposActuales = [{ gid, mandanteId: '', mandanteNombre: '', cargo, trabajadores: trabsSel }];

  const cont = document.getElementById('config-grupos-contenido');
  cont.innerHTML = `
    <div style="border:1px solid var(--borde);border-radius:10px;padding:14px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px;">${cargo} (${trabsSel.length} trabajador${trabsSel.length!==1?'es':''})</div>

      <div style="font-size:11px;font-weight:700;color:var(--texto3);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;">Bloque 1 — Empresa Mandante y Faena</div>
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:#92400E;">
        <i class="ti ti-alert-triangle"></i> Solo se puede ingresar un grupo por Empresa Mandante — los ${trabsSel.length} trabajadores seleccionados quedarán con el mismo Mandante.
      </div>
      <div class="fila-compacta" style="margin-bottom:10px;">
        <div class="f-group">
          <label class="form-label">Empresa Mandante *</label>
          <select class="f-input" id="cfg-mandante-${gid}" onchange="_onCambioMandanteConfigGrupo('${gid}')">
            <option value="">— Seleccionar mandante —</option>
            ${empresas.map(e => `<option value="${e.id||e.rut}">${e.nombre}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="f-group" id="cfg-faena-wrap-${gid}" style="margin-bottom:14px;">
        <label class="form-label">Faena *</label>
        <input class="f-input" id="cfg-faena-${gid}" placeholder="Selecciona primero la Empresa Mandante">
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--texto3);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;border-top:1px solid var(--borde);padding-top:12px;">Bloque 2 — Condiciones del contrato</div>
      <div class="fila-compacta" style="margin-bottom:8px;">
        <div class="f-group"><label class="form-label">Tipo de Contrato</label>
          <select class="f-input" id="cfg-tipo-${gid}" onchange="_onCambioTipoConfigGrupo('${gid}')">
            <option value="temporada">Contrato de Temporada</option>
            <option value="plazo_fijo">Contrato a Plazo Fijo</option>
            <option value="indefinido">Contrato Indefinido</option>
          </select>
        </div>
        <div class="f-group"><label class="form-label">Ciudad de firma</label><input class="f-input" id="cfg-ciudad-${gid}" placeholder="Ej: Santiago"></div>
      </div>
      <div class="fila-compacta" style="margin-bottom:4px;">
        <div class="f-group" id="cfg-campo-temporada-${gid}"><label class="form-label">Temporada</label><input class="f-input" id="cfg-temporada-${gid}" placeholder="Ej: 2026-2027 (sin escribir la palabra Temporada)"></div>
        <div class="f-group" id="cfg-campo-termino-${gid}"><label class="form-label">Fecha de término</label><input class="f-input" type="date" id="cfg-termino-${gid}"></div>
      </div>
      <div class="fila-compacta" style="margin-bottom:8px;">
        <div class="f-group"><label class="form-label">Colación (minutos)</label><input class="f-input" id="cfg-colacion-${gid}" placeholder="30" onchange="_actualizarHorasGrupo('${gid}')"></div>
        <div class="f-group"><label class="form-label">Horas semanales (auto)</label><input class="f-input" id="cfg-horas-${gid}" readonly style="background:var(--gris-bg);"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--texto3);text-transform:uppercase;margin-bottom:6px;">Jornada</div>
      <div id="cfg-jornada-${gid}" style="border:1px solid var(--borde);border-radius:8px;overflow:hidden;margin-bottom:12px;"></div>

      <div style="font-size:11px;font-weight:700;color:var(--texto3);text-transform:uppercase;margin-bottom:6px;">Remuneración</div>
      <div class="fila-compacta" style="margin-bottom:4px;">
        <div class="f-group"><label class="form-label">Fecha de Firma</label><input class="f-input" type="date" id="cfg-firma-${gid}" onchange="_actualizarAvisoFirmaGrupo('${gid}')"></div>
        <div class="f-group"><label class="form-label">Forma de Pago</label>
          <select class="f-input" id="cfg-formapago-${gid}">
            <option value="">— Seleccionar —</option>
            <option value="mensual">Mensual</option>
            <option value="diaria">Diaria (Jornal)</option>
          </select>
        </div>
      </div>
      <div class="fila-ancha" style="margin-bottom:4px;">
        <div class="f-group"><label class="form-label">Valor ($)</label><input class="f-input" type="number" id="cfg-valor-${gid}" placeholder="450000"></div>
      </div>
      <div id="cfg-aviso-firma-${gid}" style="display:none;font-size:11px;color:var(--danger);background:#FEF2F2;border-radius:6px;padding:6px 10px;margin-bottom:8px;"></div>

      <div style="font-size:11px;font-weight:700;color:var(--texto3);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;border-top:1px solid var(--borde);padding-top:12px;">Bloque 3 — Documentación y Prevención</div>
      <div id="cfg-epp-${gid}"></div>
    </div>`;

  _renderJornadaDiasGrupo(gid);
  const eppCont = document.getElementById(`cfg-epp-${gid}`);
  if(eppCont){
    eppCont.innerHTML = _htmlFormularioEpp(`cfg-${gid}`, {irl_declarado:true});
    // La fecha de inducción RIOHS/IRL y la fecha de entrega EPP usan la misma
    // Fecha de Firma del lote — se ocultan los campos propios de
    // _htmlFormularioEpp para no pedirlas dos veces.
    const indInput = document.getElementById(`cfg-${gid}-irl-fecha-induccion`);
    if(indInput) indInput.closest('.form-group').style.display = 'none';
    const eppFechaInput = document.getElementById(`cfg-${gid}-epp-fecha-entrega`);
    if(eppFechaInput) eppFechaInput.closest('.form-group').style.display = 'none';
  }

  document.getElementById('modal-config-grupos-masivo').style.display = 'flex';
}

/* Bloque 1 — al elegir Mandante, trae su Faena automáticamente (mismo
   criterio que Contrato Individual desde el Punto 6 del reporte). */
function _onCambioMandanteConfigGrupo(gid){
  const sel = document.getElementById(`cfg-mandante-${gid}`);
  const mandante = empresas.find(e => (e.id||e.rut) === sel?.value);
  const g = _configGruposActuales.find(x => x.gid === gid);
  if(g){ g.mandanteId = sel?.value || ''; g.mandanteNombre = mandante?.nombre || ''; }

  const wrap = document.getElementById(`cfg-faena-wrap-${gid}`);
  if(!wrap) return;
  const faenas = mandante?.faenas || [];
  wrap.innerHTML = `<label class="form-label">Faena *</label>` + (faenas.length
    ? `<select class="f-input" id="cfg-faena-${gid}">
        <option value="">— Seleccionar faena —</option>
        ${faenas.map(f => `<option value="${f.nombre||f}">${f.nombre||f}</option>`).join('')}
      </select>`
    : `<input class="f-input" id="cfg-faena-${gid}" placeholder="${mandante ? mandante.nombre+' no tiene faenas registradas' : 'Selecciona primero la Empresa Mandante'}">`);
}

function cerrarModalConfigGruposMasivo(){
  document.getElementById('modal-config-grupos-masivo').style.display = 'none';
}

function _onCambioTipoConfigGrupo(gid){
  const tipo = document.getElementById(`cfg-tipo-${gid}`)?.value;
  const campoTemp = document.getElementById(`cfg-campo-temporada-${gid}`);
  const campoTermino = document.getElementById(`cfg-campo-termino-${gid}`);
  if(campoTemp) campoTemp.style.display = tipo === 'temporada' ? '' : 'none';
  if(campoTermino) campoTermino.style.display = tipo === 'indefinido' ? 'none' : '';
  _actualizarAvisoFirmaGrupo(gid);
}

/* Misma base que Individual (_renderJornadaDiasBase), con ids propios por grupo */
function _renderJornadaDiasGrupo(gid){
  _renderJornadaDiasBase(`cfg-jornada-${gid}`, (tipo,i) => `cfg-${tipo}-${gid}-${i}`, null, `_actualizarHorasGrupo('${gid}')`);
  _onCambioTipoConfigGrupo(gid);
  _actualizarHorasGrupo(gid);
}

function _actualizarHorasGrupo(gid){
  const horasEl = document.getElementById(`cfg-horas-${gid}`);
  if(horasEl) horasEl.value = _leerJornadaGrupo(gid).horas_semanales;
}

function _leerJornadaGrupo(gid){
  const colMin = parseInt(document.getElementById(`cfg-colacion-${gid}`)?.value) || 0;
  const { jornada: j, totalHoras } = _leerJornadaDiasBase((tipo,i) => `cfg-${tipo}-${gid}-${i}`, colMin);
  const activos = DIAS_JORNADA.filter(d => j[d].activo);
  const distribucion = activos.length ? activos.map(d => `${d.slice(0,3)} ${j[d].inicio}-${j[d].fin}`).join(', ') : 'Sin días asignados';
  return { jornada_dias: j, horas_semanales: totalHoras, distribucion_jornada: distribucion };
}

/* Art. 9 Código del Trabajo: 5 días para contratos de Temporada (obra/faena <30 días),
   15 días para Plazo Fijo/Indefinido, contados desde el ingreso real del trabajador. */
function _actualizarAvisoFirmaGrupo(gid){
  const g = _configGruposActuales.find(x => x.gid === gid);
  const avisoEl = document.getElementById(`cfg-aviso-firma-${gid}`);
  if(!g || !avisoEl) return;

  const firma = document.getElementById(`cfg-firma-${gid}`)?.value;
  const tipo = document.getElementById(`cfg-tipo-${gid}`)?.value;
  if(!firma){ avisoEl.style.display = 'none'; return; }

  const limite = tipo === 'temporada' ? 5 : 15;
  const fFirma = new Date(firma + 'T00:00:00');
  let peor = null, peorDias = 0;

  g.trabajadores.forEach(t => {
    if(!t.fecha_ingreso) return;
    const fIngreso = new Date(t.fecha_ingreso + 'T00:00:00');
    const dias = Math.round((fFirma - fIngreso) / 86400000);
    if(dias > limite && dias > peorDias){ peorDias = dias; peor = t; }
  });

  if(peor){
    avisoEl.style.display = 'block';
    avisoEl.style.color = 'var(--danger)';
    avisoEl.style.background = '#FEF2F2';
    avisoEl.textContent = `⚠️ ${peor.nombre} ingresó el ${fmtFecha(peor.fecha_ingreso)} — la ley exige firmar dentro de ${limite} días desde el ingreso, y ya pasaron ${peorDias}.`;
    return;
  }

  // Sin infracciones — igual se muestra la fecha de ingreso más antigua del
  // grupo como referencia neutral, mismo criterio informativo que ya tiene
  // Contrato Individual.
  const conIngreso = g.trabajadores.filter(t => t.fecha_ingreso);
  if(conIngreso.length){
    const masAntiguo = conIngreso.reduce((a,b) => a.fecha_ingreso < b.fecha_ingreso ? a : b);
    avisoEl.style.display = 'block';
    avisoEl.style.color = 'var(--texto3)';
    avisoEl.style.background = 'var(--gris-bg)';
    avisoEl.textContent = `ℹ️ Fecha de ingreso más antigua del grupo: ${fmtFecha(masAntiguo.fecha_ingreso)} (${masAntiguo.nombre})`;
  } else {
    avisoEl.style.display = 'none';
  }
}

/* ── VALIDACIÓN + PANTALLA DE CONFIRMACIÓN (antes de generar nada) ──────── */
function _leerConfigGrupoMasivo(gid){
  const tipo = document.getElementById(`cfg-tipo-${gid}`)?.value;
  return {
    mandanteSel: document.getElementById(`cfg-mandante-${gid}`)?.value,
    tipo,
    ciudad:      document.getElementById(`cfg-ciudad-${gid}`)?.value.trim(),
    termino:     document.getElementById(`cfg-termino-${gid}`)?.value,
    temporada:   document.getElementById(`cfg-temporada-${gid}`)?.value.trim(),
    colacion:    document.getElementById(`cfg-colacion-${gid}`)?.value.trim(),
    firma:       document.getElementById(`cfg-firma-${gid}`)?.value,
    formaPago:   document.getElementById(`cfg-formapago-${gid}`)?.value,
    valor:       document.getElementById(`cfg-valor-${gid}`)?.value,
    faena:       document.getElementById(`cfg-faena-${gid}`)?.value.trim(),
  };
}

/* Arma el objeto `datos` de un contrato del lote para un trabajador puntual
   — función pura, sin efectos secundarios, usada tanto para la vista previa
   (sin guardar nada) como para la generación final (guardando de verdad). */
function _construirDatosContratoMasivo(g, cfgCompleto, t, mandanteObj){
  return {
    trabajador_id: t.id,
    trabajador_rut: t.rut,
    empresa_rut: mandanteObj?.rut || '',
    empresa_propia_id: t.empresa_propia_id || '',
    tipo: cfgCompleto.tipo_contrato,
    ciudad_firma: cfgCompleto.ciudad_firma,
    fecha_firma: cfgCompleto.fecha_firma,
    funcion_cargo: t.funcion_cargo || '',
    nombre_faena: cfgCompleto.faena || '',
    ubicacion_faena: [mandanteObj?.direccion, mandanteObj?.comuna].filter(Boolean).join(', '),
    region: mandanteObj?.region || '',
    mandante_id: g.mandanteId || '',
    mandante_nombre: mandanteObj?.nombre || '',
    mandante_rut: mandanteObj?.rut || '',
    mandante_direccion: mandanteObj?.direccion || '',
    mandante_comuna: mandanteObj?.comuna || '',
    mandante_region: mandanteObj?.region || '',
    temporada: cfgCompleto.temporada || '',
    fecha_inicio: t.fecha_ingreso || '',
    fecha_termino: cfgCompleto.fecha_termino || '',
    horas_semanales: cfgCompleto.horas_semanales,
    distribucion_jornada: cfgCompleto.distribucion_jornada,
    jornada_dias: cfgCompleto.jornada_dias,
    colacion: cfgCompleto.colacion,
    tipo_remuneracion: cfgCompleto.forma_pago,
    sueldo_monto: cfgCompleto.valor,
    sueldo_escrito: numeroALetras(cfgCompleto.valor).trim() + ' pesos',
    beneficios: [],
    estado: 'activo',
    creado_en: new Date().toISOString(),
    epp_entregados: cfgCompleto.epp_entregados,
    epp_otro: cfgCompleto.epp_otro,
    epp_fecha_entrega: cfgCompleto.epp_fecha_entrega,
    irl_fecha_induccion: cfgCompleto.irl_fecha_induccion,
    irl_tipo: cfgCompleto.irl_tipo,
    irl_declarado: cfgCompleto.irl_declarado,
  };
}

/* Arma cfgCompleto (config del grupo + EPP/RIOHS + jornada) a partir de los
   campos leídos por _leerConfigGrupoMasivo — separado para poder llamarlo
   tanto desde la vista previa como desde la generación final. */
function _construirCfgCompletoMasivo(gid, cfg){
  const { jornada_dias, horas_semanales, distribucion_jornada } = _leerJornadaGrupo(gid);
  const eppDatos = _leerFormularioEpp(`cfg-${gid}`);
  return {
    tipo_contrato:  cfg.tipo,
    faena:          cfg.faena,
    ciudad_firma:   cfg.ciudad,
    temporada:      cfg.tipo === 'temporada' ? cfg.temporada : '',
    fecha_termino:  cfg.tipo !== 'indefinido' ? cfg.termino : '',
    colacion:       cfg.colacion,
    jornada_dias, horas_semanales, distribucion_jornada,
    fecha_firma:    cfg.firma,
    forma_pago:     cfg.formaPago,
    valor:          parseInt(cfg.valor) || 0,
    epp_entregados: eppDatos.epp_entregados,
    epp_otro:       eppDatos.epp_otro,
    epp_fecha_entrega: cfg.firma,
    irl_fecha_induccion: cfg.firma,
    irl_tipo:       document.getElementById(`cfg-${gid}-irl-tipo`)?.value || '',
    irl_declarado:  eppDatos.irl_declarado,
  };
}

function generarContratosGrupoMasivo(){
  const g = _configGruposActuales[0];
  if(!g){ toast('⚠️ Vuelve a abrir "Configurar y generar contratos"', 'error'); return; }
  const gid = g.gid;

  const cfg = _leerConfigGrupoMasivo(gid);
  const { mandanteSel, tipo, ciudad, termino, temporada, colacion, firma, formaPago, valor, faena } = cfg;
  if(!mandanteSel){ toast(`⚠️ Selecciona la Empresa Mandante para "${g.cargo}"`, 'error'); return; }
  if(!faena){ toast(`⚠️ Ingresa/selecciona la Faena para "${g.cargo}"`, 'error'); return; }
  if(!ciudad){ toast(`⚠️ Ingresa la ciudad de firma para "${g.cargo}"`, 'error'); return; }
  if(tipo !== 'indefinido' && !termino){ toast(`⚠️ Ingresa la fecha de término para "${g.cargo}"`, 'error'); return; }
  if(tipo === 'temporada' && !temporada){ toast(`⚠️ Ingresa el nombre de la temporada para "${g.cargo}"`, 'error'); return; }
  if(!colacion){ toast(`⚠️ Ingresa la colación para "${g.cargo}"`, 'error'); return; }
  if(!firma){ toast(`⚠️ Ingresa la fecha de firma para "${g.cargo}"`, 'error'); return; }
  if(!formaPago){ toast(`⚠️ Selecciona la forma de pago para "${g.cargo}"`, 'error'); return; }
  if(!valor || parseInt(valor) <= 0){ toast(`⚠️ Ingresa el valor de la remuneración para "${g.cargo}"`, 'error'); return; }

  // Se eliminó la validación contra vigencia_contrato del Mandante:
  // el contrato de trabajo es exclusivamente entre el trabajador y la
  // Empresa Propia (Art. 183-A Código del Trabajo / Ley 20.123) — el
  // Mandante no tiene rol legal en los términos del contrato de trabajo,
  // así que no correspondía bloquear la fecha de término por esto.

  // Todo validado — se abre la revisión (vista previa real, sin guardar nada
  // todavía) en vez de generar directo.
  abrirConfirmacionMasivo(g);
}

let _previewContratosMasivoActual = [];
let _previewContratosMasivoIdx = 0;

function abrirConfirmacionMasivo(g){
  const gid = g.gid;
  const epId = document.getElementById('c-empresa-propia')?.value || '';
  const emp = getEmpresaEmpleadora(epId);

  document.getElementById('conf-masivo-empresa').textContent  = emp?.razon_social || emp?.nombre || '—';
  document.getElementById('conf-masivo-mandante').textContent = g.mandanteNombre || '—';
  document.getElementById('conf-masivo-cargo').textContent    = g.cargo || '—';

  const resumen = document.getElementById('conf-masivo-trab-resumen');
  if(resumen) resumen.textContent = `Trabajadores seleccionados (${g.trabajadores.length}) ▼`;
  const lista = document.getElementById('conf-masivo-trab-lista');
  if(lista){
    lista.innerHTML = g.trabajadores
      .slice().sort((a,b) => a.nombre?.localeCompare(b.nombre))
      .map(t => `<li>${t.nombre} <span class="rut-mono">(${t.rut})</span></li>`)
      .join('');
  }

  // Vista previa real — mismos datos y mismo motor de documento que la
  // generación final (construirDocumentoContrato), solo que acá no se
  // guarda nada todavía. Se genera un documento por trabajador para que
  // la revisión sea fiel (cargo/faena pueden variar por persona).
  const cfg = _leerConfigGrupoMasivo(gid);
  const cfgCompleto = _construirCfgCompletoMasivo(gid, cfg);
  const mandanteObj = empresas.find(e => e.id === g.mandanteId || e.rut === g.mandanteId);

  _previewContratosMasivoActual = g.trabajadores.map(t => {
    const empT = getEmpresaEmpleadora(t.empresa_propia_id);
    const datos = _construirDatosContratoMasivo(g, cfgCompleto, t, mandanteObj);
    const { htmlCompleto } = construirDocumentoContrato(t, empT, mandanteObj, datos);
    return { nombre: t.nombre, htmlCompleto };
  });
  _previewContratosMasivoIdx = 0;
  _renderPreviewContratoMasivo();

  document.getElementById('modal-confirmacion-masivo').style.display = 'flex';
}

function _renderPreviewContratoMasivo(){
  const total = _previewContratosMasivoActual.length;
  const cont  = document.getElementById('conf-masivo-preview');
  const nav   = document.getElementById('conf-masivo-nav');
  if(!cont || !total) return;

  const actual = _previewContratosMasivoActual[_previewContratosMasivoIdx];
  cont.innerHTML = actual.htmlCompleto ? _contenidoInternoDocumento(actual.htmlCompleto) : '<p style="color:var(--texto3);">Sin documento</p>';

  if(nav){
    nav.style.display = total > 1 ? 'flex' : 'none';
    const contador = document.getElementById('conf-masivo-nav-contador');
    if(contador) contador.textContent = `${actual.nombre} — ${_previewContratosMasivoIdx+1} de ${total}`;
    const prev = document.getElementById('conf-masivo-nav-prev');
    const next = document.getElementById('conf-masivo-nav-next');
    if(prev) prev.disabled = _previewContratosMasivoIdx === 0;
    if(next) next.disabled = _previewContratosMasivoIdx === total - 1;
  }
}

function _navPreviewContratoMasivo(delta){
  const total = _previewContratosMasivoActual.length;
  _previewContratosMasivoIdx = Math.max(0, Math.min(total - 1, _previewContratosMasivoIdx + delta));
  _renderPreviewContratoMasivo();
}

function cerrarModalConfirmacionMasivo(){
  document.getElementById('modal-confirmacion-masivo').style.display = 'none';
}

/* ── GENERACIÓN DIRECTA DE CONTRATOS (sin Excel de por medio) ───────────── */
function confirmarYGenerarContratosMasivo(){
  const g = _configGruposActuales[0];
  if(!g){ toast('⚠️ Vuelve a abrir "Configurar y generar contratos"', 'error'); return; }
  const gid = g.gid;

  cargarContratos();
  const contenidos = [];
  let generados = 0;

  const cfg = _leerConfigGrupoMasivo(gid);
  const cfgCompleto = _construirCfgCompletoMasivo(gid, cfg);
  const mandanteObj = empresas.find(e => e.id === g.mandanteId || e.rut === g.mandanteId);
  const tipoTxt = { temporada:'Temporada', plazo_fijo:'Plazo Fijo', indefinido:'Indefinido' }[cfgCompleto.tipo_contrato] || cfgCompleto.tipo_contrato;

  g.trabajadores.forEach(t => {
    const emp = getEmpresaEmpleadora(t.empresa_propia_id);
    const datos = _construirDatosContratoMasivo(g, cfgCompleto, t, mandanteObj);

    const existe = contratos.findIndex(c => _mismoTrabajador(c.trabajador_id, t.id));
    if(existe >= 0) contratos[existe] = {...contratos[existe], ...datos};
    else contratos.push({id: Date.now().toString() + '_' + t.id, numero_contrato: _siguienteNumeroContrato(datos.empresa_propia_id), ...datos});

    // ✅ Sincronización del Bypass de Mandante — mismo criterio que en el
    // Contrato Individual: el trabajador refleja el Mandante de su
    // Contrato más reciente, para que el resto del sistema siga
    // funcionando sin cambios (Dashboard, Empresas, Asistencia,
    // Trabajadores, Alertas, QR, Exportar). Un solo campo (Hallazgo #5).
    Object.assign(t, {
      mandante_id: g.mandanteId || '',
      epp_entregados: cfgCompleto.epp_entregados,
      epp_otro: cfgCompleto.epp_otro,
      epp_fecha_entrega: cfgCompleto.epp_fecha_entrega,
      irl_fecha_induccion: cfgCompleto.irl_fecha_induccion,
      irl_tipo: cfgCompleto.irl_tipo,
      irl_declarado: cfgCompleto.irl_declarado,
    });

    registrarDocumentoCarpeta({
      trabajador_id:  t.id,
      trabajador_rut: t.rut,
      empresa_propia_id: datos.empresa_propia_id || '',
      tipo:           'contrato',
      subtipo:        cfgCompleto.tipo_contrato,
      fecha_firma:    cfgCompleto.fecha_firma,
      descripcion:    `Contrato ${tipoTxt} — ${cfgCompleto.faena||''} (Masivo)`.trim(),
    });

    const { htmlCompleto } = construirDocumentoContrato(t, emp, mandanteObj, datos);
    if(htmlCompleto) contenidos.push(htmlCompleto);
    generados++;
  });

  guardarContratos();
  guardarLocal();

  cerrarModalConfirmacionMasivo();
  cerrarModalConfigGruposMasivo();
  toast(`✅ ${generados} contrato${generados!==1?'s':''} generado${generados!==1?'s':''}`, 'exito');

  _abrirVentanaContratosMasivo(contenidos);
  // Este bloque (cargo) queda limpio — si a alguno le queda gente sin
  // contrato todavía, renderBloquesMasivo() lo va a mostrar de nuevo con
  // el conteo actualizado (los recién contratados ya no aparecen, por
  // _tieneContratoVigente()).
  delete _masivoSeleccionados[gid];
  renderBloquesMasivo();
}



function _abrirVentanaContratosMasivo(contenidos){
  if(!contenidos.length) return;

  const nav = _bloqueNavegacionMasivo(contenidos.length);
  const cuerpo = contenidos.map(c => `<div class="doc-page">${c}</div>`).join('\n');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="es"><head>
  <meta charset="UTF-8">
  <title>Contratos masivos (${contenidos.length})</title>
  <style>
    :root{ --verde-doc:#0F4C3A; }
    @page{ size:letter; margin:2.2cm 2.4cm; }
    *{ box-sizing:border-box; }
    body{ font-family:'Times New Roman',serif; font-size:11pt; line-height:1.75;
      margin:0; padding:0; color:#1a1a1a; }
    .doc-wrap{ max-width:76ch; margin:0 auto; overflow-wrap:break-word; word-break:break-word; }
    h1{ font-size:13pt; text-align:center; text-transform:uppercase;
      letter-spacing:1.2px; margin:0 0 4px; font-weight:bold; }
    h2{ font-size:11pt; text-align:center; text-transform:uppercase;
      letter-spacing:0.5px; margin:0 0 16px; font-weight:normal; color:#555; }
    p{ text-align:justify; margin:0 0 9px; orphans:3; widows:3; }
    .clausula{ margin-bottom:18px; }
    .clausula-head{ display:flex; align-items:center; gap:8px; margin-bottom:6px;
      page-break-after:avoid; break-after:avoid; }
    .clausula-badge{ font-family:Arial,Helvetica,sans-serif; background:var(--verde-doc);
      color:#fff; font-size:8pt; font-weight:bold; width:18px; height:18px; border-radius:4px;
      display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .clausula-tit{ font-family:Arial,Helvetica,sans-serif; font-size:10.5pt; font-weight:700;
      color:var(--verde-doc); letter-spacing:-0.01em; }
    ul, ol{ margin:6px 0 10px 20px; }
    ul li, ol li{ margin-bottom:5px; page-break-inside:avoid; break-inside:avoid; }
    .firma-grid{ display:grid; grid-template-columns:1fr 1fr; gap:50px; margin-top:28px; break-inside:avoid; page-break-inside:avoid; }
    .firma-cierre{ page-break-inside:avoid; break-inside:avoid; }
    .firma-box{ text-align:center; }
    .firma-linea{ border-top:1px solid #000; padding-top:6px; margin-top:28px; }
    .firma-nombre{ font-weight:bold; font-size:10pt; }
    .firma-rol{ font-size:9pt; color:#444; margin-top:1px; }
    .separador{ border:none; border-top:2px solid #000; margin:36px 0; }
    .salto{ break-before:page; page-break-before:always; margin-top:0; padding-top:0; }
    .doc-folio{ font-family:Arial,Helvetica,sans-serif; font-size:6.5pt; color:#aaa;
      text-align:center; margin-bottom:8px; letter-spacing:0.2px; text-transform:uppercase; }
    .doc-titulo{ font-size:12.5pt; font-weight:bold; text-align:center;
      text-transform:uppercase; letter-spacing:0.8px; margin-bottom:14px; color:var(--verde-doc); }
    .doc-subtitulo{ font-size:10pt; text-align:center; margin-bottom:18px; color:#555; }
    table{ width:100%; border-collapse:collapse; margin:10px 0; break-inside:avoid; page-break-inside:avoid; }
    table td{ padding:6px 10px; border:1px solid #ccc; font-size:10pt; vertical-align:top; }
    table td:first-child{ font-weight:bold; width:45%; background:#f7f7f7; }
    .check-row{ display:flex; gap:12px; flex-wrap:wrap; margin:8px 0; }
    .check-item{ display:flex; align-items:center; gap:6px; font-size:10pt; }
    .checkbox{ width:16px; height:16px; border:1.8px solid #000;
      display:inline-block; text-align:center; line-height:16px; font-size:12px;
      font-weight:bold; font-family:Arial,sans-serif; flex-shrink:0; }
    .checkbox.checked{ background:#000; color:#fff; }
    .firma-simple{ margin-top:36px; }
    .firma-simple .firma-linea{ width:60%; margin:45px auto 6px; }
    .firma-simple p{ text-align:center; font-size:10pt; }
    .observ-linea{ border-bottom:1px solid #000; margin:8px 0; height:22px; }
    .no-print{ margin-bottom:24px; }
    @media print{ .no-print{display:none !important;} }
    ${nav.css}
  </style>
</head><body>
<div class="no-print" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:16px;">
  <button onclick="window.print()" style="padding:10px 24px;background:#0f2942;color:#fff;
    border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
    🖨️ Imprimir / Guardar PDF (${contenidos.length} contratos)
  </button>
  <button onclick="window.close()" style="padding:10px 16px;background:#f1f5f9;
    border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;">
    Cerrar
  </button>
  ${nav.toolbar}
</div>
<div class="doc-wrap">
${cuerpo}
</div>
${nav.script}
</body></html>`);
  win.document.close();
}

/* ════════════════════════════════════════════════════════
   EPP / RIOHS / IRL — pestaña dentro de Contratos
   ════════════════════════════════════════════════════════ */
const EPP_ITEMS = ['Legionario','Guantes','Lentes','Chaleco','Bloqueador'];
let _modoEppActual = 'individual';

function initEppTab(){
  cambiarModoEpp(_modoEppActual);
  _poblarSelectEppTrabajador();
  renderListaEppMasivo();
}

function _poblarSelectEppTrabajador(){
  const sel = document.getElementById('epp-sel-trabajador');
  if(!sel) return;
  const val = sel.value;
  const epFiltro = document.getElementById('epp-f-empresa')?.value || '';

  let lista = trabajadores.slice();
  if(epFiltro) lista = lista.filter(t => (t.empresa_propia_id || '') === epFiltro);

  sel.innerHTML = '<option value="">— Seleccionar trabajador —</option>' +
    lista.map(t => `<option value="${t.rut}">${t.nombre} — ${t.rut}</option>`).join('');
  if(val) sel.value = val;
}

/* BL-005 resuelto — Al cambiar la Empresa en EPP: refiltra el select
   Individual y la lista Masivo, y si el trabajador ya seleccionado en
   Individual no pertenece a la empresa recién elegida, limpia la
   selección. Mismo patrón que onCambioEmpresaFiltroContrato() en este
   mismo archivo. El onchange en el HTML (epp-f-empresa) ya apuntaba
   a esta función — solo faltaba que existiera. */
function _onCambioEmpresaEpp(){
  const epFiltro = document.getElementById('epp-f-empresa')?.value || '';
  const selTrabajador = document.getElementById('epp-sel-trabajador');
  const actual = trabajadores.find(t => t.rut === selTrabajador?.value);

  if(epFiltro && actual && (actual.empresa_propia_id || '') !== epFiltro){
    selTrabajador.value = '';
    cargarEppTrabajador();
  }

  _poblarSelectEppTrabajador();
  renderListaEppMasivo();
}

function cambiarModoEpp(modo){
  _modoEppActual = modo;
  const esMasivo = modo === 'masivo';
  document.getElementById('btn-epp-modo-individual').className = esMasivo ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm';
  document.getElementById('btn-epp-modo-masivo').className     = esMasivo ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  document.getElementById('bloque-epp-individual').style.display = esMasivo ? 'none' : '';
  document.getElementById('bloque-epp-masivo').style.display     = esMasivo ? '' : 'none';
}

/* Plantilla compartida del formulario de EPP/IRL (usa un prefijo de ids para no chocar entre individual/masivo) */
function _htmlFormularioEpp(prefix, datos, soloEpp){
  datos = datos || {};
  const entregados = datos.epp_entregados || [];
  const bloqueEpp = `
    <div class="form-section"><i class="ti ti-shield-check"></i> Elementos de Protección Personal (EPP)</div>
    <div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:10px;">
      ${EPP_ITEMS.map(item => `
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
          <input type="checkbox" class="${prefix}-epp-check" value="${item}" ${entregados.includes(item)?'checked':''} style="accent-color:var(--verde);"> ${item}
        </label>`).join('')}
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
        <input type="checkbox" id="${prefix}-epp-check-otro" class="${prefix}-epp-check" value="Otro" ${entregados.includes('Otro')?'checked':''}
          onchange="document.getElementById('${prefix}-epp-otro-detalle').style.display=this.checked?'inline-block':'none';" style="accent-color:var(--verde);"> Otro:
      </label>
      <input type="text" id="${prefix}-epp-otro-detalle" placeholder="Especificar" value="${datos.epp_otro||''}"
        style="display:${entregados.includes('Otro')?'inline-block':'none'};max-width:160px;padding:5px 8px;font-size:12px;border:1px solid var(--borde);border-radius:6px;">
    </div>
    <div class="fila-compacta" style="margin-bottom:12px;">
      <div class="form-group">
        <label>Fecha de entrega EPP</label>
        <input type="date" id="${prefix}-epp-fecha-entrega" value="${datos.epp_fecha_entrega||''}">
      </div>
    </div>`;

  if(soloEpp) return bloqueEpp; // pestaña EPP standalone: solo re-entrega de EPP, sin RIOHS/IRL (ya se declara al crear el contrato)

  return bloqueEpp + `
    <div class="form-section"><i class="ti ti-notebook"></i> RIOHS / Inducción (IRL)</div>
    <div class="fila-compacta" style="margin-bottom:10px;">
      <div class="form-group">
        <label>Fecha de inducción</label>
        <input type="date" id="${prefix}-irl-fecha-induccion" value="${datos.irl_fecha_induccion||''}">
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:22px;">
        <input type="checkbox" id="${prefix}-irl-declarado" ${datos.irl_declarado?'checked':''} style="width:auto;min-width:0;flex-shrink:0;">
        <label style="margin:0;">Declara haber recibido RIOHS/IRL</label>
      </div>
    </div>
    <div class="f-group" style="margin-bottom:10px;">
      <label class="form-label">Tipo de Inducción</label>
      <select class="f-input" id="${prefix}-irl-tipo">
        <option value="nueva" ${(!datos.irl_tipo||datos.irl_tipo==='nueva')?'selected':''}>Persona trabajadora nueva</option>
        <option value="ausencia_prolongada" ${datos.irl_tipo==='ausencia_prolongada'?'selected':''}>Persona trabajadora con ausencia prolongada</option>
        <option value="reubicada" ${datos.irl_tipo==='reubicada'?'selected':''}>Persona trabajadora reubicada en nuevo cargo</option>
        <option value="cambio_proceso" ${datos.irl_tipo==='cambio_proceso'?'selected':''}>Por cambio de proceso, tecnología, materiales o sustancias</option>
      </select>
    </div>`;
}

function _leerFormularioEpp(prefix){
  const datos = {
    epp_entregados:    Array.from(document.querySelectorAll(`.${prefix}-epp-check:checked`)).map(c => c.value),
    epp_otro:          document.getElementById(`${prefix}-epp-otro-detalle`)?.value.trim() || '',
    epp_fecha_entrega: document.getElementById(`${prefix}-epp-fecha-entrega`)?.value || null,
  };
  // Los campos RIOHS/IRL solo existen cuando el formulario se generó sin soloEpp
  // (Contrato Individual/Masivo) — si no existen, no se incluyen, para no borrar
  // por accidente la declaración ya hecha al crear el contrato.
  const campoInduccion = document.getElementById(`${prefix}-irl-fecha-induccion`);
  if(campoInduccion){
    datos.irl_fecha_induccion = campoInduccion.value || null;
    datos.irl_declarado = document.getElementById(`${prefix}-irl-declarado`)?.checked || false;
    datos.irl_tipo = document.getElementById(`${prefix}-irl-tipo`)?.value || 'nueva';
  }
  return datos;
}

/* ── INDIVIDUAL ──────────────────────────────────────────── */
function cargarEppTrabajador(){
  const rut = document.getElementById('epp-sel-trabajador')?.value;
  const cont = document.getElementById('epp-form-individual');
  if(!cont) return;
  if(!rut){ cont.style.display = 'none'; cont.innerHTML = ''; return; }

  const t = trabajadores.find(x => x.rut === rut);
  cont.style.display = 'block';
  cont.innerHTML = _htmlFormularioEpp('eppi', t, true) + `
    <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="guardarEppIndividual()">
      <i class="ti ti-device-floppy"></i> Guardar EPP
    </button>`;
}

function guardarEppIndividual(){
  const rut = document.getElementById('epp-sel-trabajador')?.value;
  if(!rut){ toast('⚠️ Selecciona un trabajador', 'error'); return; }
  const t = trabajadores.find(x => x.rut === rut);
  if(!t){ toast('⚠️ Trabajador no encontrado', 'error'); return; }

  Object.assign(t, _leerFormularioEpp('eppi'));
  guardarLocal();
  toast(`✅ EPP guardado para ${t.nombre}`, 'exito');
}

/* ── MASIVO ──────────────────────────────────────────────── */
function renderListaEppMasivo(){
  const buscar = (document.getElementById('epp-cm-buscar')?.value || '').toLowerCase().trim();
  const epFiltro = document.getElementById('epp-f-empresa')?.value || '';
  const cont = document.getElementById('epp-cm-lista');
  if(!cont) return;

  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(epFiltro) lista = lista.filter(t => (t.empresa_propia_id || '') === epFiltro);
  if(buscar) lista = lista.filter(t => t.rut?.toLowerCase().includes(buscar) || t.nombre?.toLowerCase().includes(buscar));

  if(!lista.length){
    cont.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto3);font-size:13px;">Sin trabajadores para mostrar</div>`;
    return;
  }

  cont.innerHTML = lista.map(t => `
    <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:13px;border-bottom:1px solid var(--borde);cursor:pointer;">
      <input type="checkbox" class="epp-cm-check-trab" value="${t.rut}" onchange="_eppCmActualizarContador()" style="width:auto;">
      <span>${t.nombre} <span class="rut-mono">${t.rut}</span></span>
    </label>`).join('');

  // Mostrar el formulario compartido debajo de la lista (una sola vez)
  const contForm = document.getElementById('epp-form-masivo');
  if(contForm && !contForm.innerHTML){
    contForm.innerHTML = _htmlFormularioEpp('eppm', {}, true) + `
      <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="guardarEppMasivo()">
        <i class="ti ti-device-floppy"></i> Aplicar a seleccionados
      </button>`;
  }

  _eppCmActualizarContador();
}

function _eppCmActualizarContador(){
  const n = document.querySelectorAll('.epp-cm-check-trab:checked').length;
  const contador = document.getElementById('epp-cm-contador');
  if(contador) contador.textContent = n ? `${n} trabajador${n!==1?'es':''} seleccionado${n!==1?'s':''}` : '';
}

function _eppCmSeleccionarTodos(val){
  document.querySelectorAll('.epp-cm-check-trab').forEach(c => c.checked = val);
  _eppCmActualizarContador();
}

function guardarEppMasivo(){
  const seleccionados = Array.from(document.querySelectorAll('.epp-cm-check-trab:checked')).map(c => c.value);
  if(!seleccionados.length){ toast('⚠️ Selecciona al menos un trabajador', 'error'); return; }

  const datos = _leerFormularioEpp('eppm');
  let aplicados = 0;
  seleccionados.forEach(rut => {
    const t = trabajadores.find(x => x.rut === rut);
    if(!t) return;
    Object.assign(t, datos);
    aplicados++;
  });

  guardarLocal();
  toast(`✅ EPP / IRL aplicado a ${aplicados} trabajador${aplicados!==1?'es':''}`, 'exito');
}
