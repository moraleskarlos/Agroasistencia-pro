/* ════ CONTRATOS ════ */

function cargarContratos(){
  try{ contratos = JSON.parse(localStorage.getItem(LOCAL_C))  || []; } catch{ contratos = []; }
  try{ anexos    = JSON.parse(localStorage.getItem(LOCAL_AN)) || []; } catch{ anexos    = []; }
}

function guardarContratos(){
  localStorage.setItem(LOCAL_C,  JSON.stringify(contratos));
  localStorage.setItem(LOCAL_AN, JSON.stringify(anexos));
}

function renderJornadaDias(jornadaGuardada){
  const cont = document.getElementById('jornada-dias');
  if(!cont) return;
  const g = jornadaGuardada || {};

  cont.innerHTML = DIAS_JORNADA.map((dia,i) => {
    const d   = g[dia] || {};
    // Por defecto Lun-Vie activos 08:00-18:00, fin de semana inactivo
    const act = d.activo !== undefined ? d.activo : i < 5;
    const ini = d.inicio || (i < 5 ? '08:00' : '');
    const fin = d.fin    || (i < 5 ? '18:00' : '');
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:${i<6?'1px solid var(--borde)':'none'};background:${act?'#F0FDF4':'#fff'};">
        <input type="checkbox" id="dia-${i}" ${act?'checked':''} onchange="onJornadaChange()" style="width:16px;height:16px;accent-color:var(--verde);cursor:pointer;">
        <label for="dia-${i}" style="flex:1;font-size:13px;font-weight:500;color:var(--texto);cursor:pointer;text-transform:none;letter-spacing:0;">${dia}</label>
        <input type="time" id="dia-ini-${i}" value="${ini}" onchange="onJornadaChange()" style="width:95px;padding:4px 7px;font-size:12px;">
        <span style="color:var(--texto3);font-size:12px;">–</span>
        <input type="time" id="dia-fin-${i}" value="${fin}" onchange="onJornadaChange()" style="width:95px;padding:4px 7px;font-size:12px;">
      </div>`;
  }).join('');

  onJornadaChange();
}

function leerJornadaDias(){
  const j = {};
  let totalHoras = 0;

  // Leer colación en horas (puede venir como "30 minutos", "60", "1 hora", etc.)
  const colRaw = document.getElementById('c-colacion')?.value || '';
  const colMin = parseInt(colRaw) || 0; // extrae el primer número
  const colHoras = colMin / 60;

  DIAS_JORNADA.forEach((dia,i) => {
    const act = document.getElementById(`dia-${i}`)?.checked || false;
    const ini = document.getElementById(`dia-ini-${i}`)?.value || '';
    const fin = document.getElementById(`dia-fin-${i}`)?.value || '';
    j[dia] = { activo: act, inicio: ini, fin: fin };
    if(act && ini && fin){
      const h = calcularHoras(ini, fin);
      if(h) totalHoras += Math.max(0, h - colHoras); // descontar colación por día
    }
  });
  return { jornada: j, totalHoras: Math.round(totalHoras*10)/10 };
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
  poblarSelectTrabajadoresContrato();
  poblarSelectAnexoTrabajador();
  actualizarBadgesContratos();
  if(!rutPreseleccionado){
    limpiarContrato();
    switchTabContratos('contratos');
  } else {
    switchTabContratos('contratos');
    const t   = trabajadores.find(x => x.rut === rutPreseleccionado);
    const sel = document.getElementById('c-trabajador');
    if(sel && t){ sel.value = t.id; precargarContrato(); }
  }
  renderJornadaDias();
  const b = document.getElementById('badge-contratos');
  if(b) b.textContent = contratos.length;
}

function poblarSelectTrabajadoresContrato(){
  const sel = document.getElementById('c-trabajador');
  if(!sel) return;
  const val = sel.value;

  if(_modoContratoActual === 'corregir'){
    const conContrato = trabajadores.filter(t => contratos.some(c => c.trabajador_id === t.id));
    sel.innerHTML = '<option value="">— Selecciona el contrato a corregir —</option>' +
      conContrato.map(t => `<option value="${t.id}">${t.nombre} — ${t.rut}</option>`).join('');
  } else {
    sel.innerHTML = '<option value="">— Seleccionar trabajador —</option>' +
      trabajadores.map(t => {
        const yaTiene = contratos.some(c => c.trabajador_id === t.id);
        return `<option value="${t.id}">${yaTiene ? '✓ ' : ''}${t.nombre} — ${t.rut}</option>`;
      }).join('');
  }
  if(val) sel.value = val;
  _actualizarContadorContratos();
  _renderListaVisualTrabajadorContrato();
}

function _renderListaVisualTrabajadorContrato(){
  const cont = document.getElementById('lista-visual-trabajador-contrato');
  if(!cont) return;

  const buscar = (document.getElementById('ct-buscar-visual')?.value || '').toLowerCase().trim();
  const valActual = document.getElementById('c-trabajador')?.value || '';

  let lista = (_modoContratoActual === 'corregir')
    ? trabajadores.filter(t => contratos.some(c => c.trabajador_id === t.id))
    : trabajadores.slice();

  if(buscar){
    lista = lista.filter(t => t.nombre?.toLowerCase().includes(buscar) || t.rut?.toLowerCase().includes(buscar));
  }
  lista.sort((a,b) => a.nombre?.localeCompare(b.nombre));

  if(!lista.length){
    cont.innerHTML = `<div style="padding:18px;text-align:center;color:var(--texto3);font-size:13px;">Sin resultados</div>`;
    return;
  }

  cont.innerHTML = lista.map(t => {
    const tieneContrato = contratos.some(c => c.trabajador_id === t.id);
    const seleccionado  = valActual === t.id;
    return `<div onclick="_seleccionarTrabajadorContratoVisual('${t.id}')"
        style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;
        border-bottom:1px solid var(--borde);background:${seleccionado?'#EFF6FF':'#fff'};"
        onmouseover="this.style.background='${seleccionado?'#EFF6FF':'#f8fafc'}'"
        onmouseout="this.style.background='${seleccionado?'#EFF6FF':'#fff'}'">
      <span style="width:22px;height:22px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:13px;color:#fff;background:${tieneContrato?'#16a34a':'#dc2626'};">
        ${tieneContrato ? '✓' : '✕'}
      </span>
      <span style="font-size:13px;font-weight:500;flex:1;">${t.nombre}</span>
      <span style="font-size:12px;font-family:monospace;color:var(--texto3);">${t.rut}</span>
      <span style="font-size:11px;font-weight:600;color:${tieneContrato?'#16a34a':'#dc2626'};">${tieneContrato?'con contrato':'sin contrato'}</span>
    </div>`;
  }).join('');
}

function _seleccionarTrabajadorContratoVisual(id){
  const sel = document.getElementById('c-trabajador');
  if(!sel) return;
  sel.value = id;
  precargarContrato();
  _renderListaVisualTrabajadorContrato();
}

function _actualizarContadorContratos(){
  const el = document.getElementById('contratos-contador');
  if(!el) return;
  const conContrato = trabajadores.filter(t => contratos.some(c => c.trabajador_id === t.id)).length;
  const sinContrato = trabajadores.length - conContrato;
  el.innerHTML = `
    <span style="cursor:pointer;color:#065f46;font-weight:600;" onclick="switchTabContratos('corregir')">${conContrato} con contrato</span>
    <span style="color:var(--texto3);"> · </span>
    <span style="cursor:pointer;color:#92400e;font-weight:600;" onclick="switchTabContratos('contratos')">${sinContrato} sin contrato</span>`;
}

function precargarContrato(){
  const id = document.getElementById('c-trabajador').value;
  const eppCont = document.getElementById('epp-en-contrato');
  if(!id){ limpiarPreview(); if(eppCont) eppCont.innerHTML = ''; return; }

  const t = trabajadores.find(x => x.rut === id || x.id === id);
  if(!t) return;

  if(_modoContratoActual === 'individual' && contratos.some(c => c.trabajador_id === t.id)){
    toast(`⚠️ ${t.nombre} ya tiene contrato — considera usar "Corregir Contrato" o un Anexo en su lugar`, 'error');
  }

  if(eppCont && _modoContratoActual !== 'masivo'){
    eppCont.innerHTML = _htmlFormularioEpp('cepp', t);
  }

  // Precargar datos bloqueados — trabajador
  document.getElementById('cp-rut').value           = t.rut || '';
  document.getElementById('cp-nombre').value        = t.nombre || '';
  document.getElementById('cp-nacionalidad').value  = t.nacionalidad || '';
  document.getElementById('cp-estado-civil').value  = t.estado_civil || '';
  document.getElementById('cp-afp').value           = t.afiliacion_afp || '';
  document.getElementById('cp-salud').value         = t.sistema_salud || '';

  // Auto-seleccionar la empresa empleadora del trabajador (o la ya guardada en su contrato existente)
  const contratoPrevio = (typeof contratos !== 'undefined' ? contratos : []).find(c => c.trabajador_id === t.id);
  const epIdTrabajador = contratoPrevio?.empresa_propia_id || t.empresa_propia_id || '';
  const selEmpresaPropia = document.getElementById('c-empresa-propia');
  if(selEmpresaPropia && epIdTrabajador && _modoContratoActual !== 'masivo') selEmpresaPropia.value = epIdTrabajador;

  // Precargar datos bloqueados — EMPRESA CONTRATISTA (desde select de empresa propia)
  const epId = document.getElementById('c-empresa-propia')?.value;
  const contratista = getEmpresaEmpleadora(epId);
  document.getElementById('cp-empresa-rut').value    = contratista.rut || '';
  document.getElementById('cp-empresa-nombre').value = contratista.razon_social || contratista.nombre || '';
  document.getElementById('cp-rep-nombre').value     = contratista.nombre_representante || '';
  document.getElementById('cp-rep-rut').value        = contratista.rut_representante || '';

  // Precargar EMPRESA MANDANTE (según asignación del trabajador)
  const mandante = empresas.find(e => e.id === (t.mandante_id||t.empresa_rut||t.empresa) || e.rut === (t.empresa_rut||t.empresa));
  const setMan = (id,v) => { const el = document.getElementById(id); if(el) el.value = v || ''; };
  setMan('cp-man-nombre',    mandante?.nombre);
  setMan('cp-man-rut',       mandante?.rut);
  setMan('cp-man-comuna',    mandante?.comuna);
  setMan('cp-man-region',    mandante?.region);
  setMan('cp-man-direccion', mandante ? [mandante.direccion, mandante.comuna, mandante.region].filter(Boolean).join(', ') : '');

  // Precargar Cargo y Faena automáticamente desde el trabajador (vienen de Registro Personal)
  const cCargo = document.getElementById('c-cargo');
  const cFaena = document.getElementById('c-faena');
  if(cCargo) cCargo.value = t.funcion_cargo || '';
  if(cFaena && !cFaena.value && t.faena_obra) cFaena.value = t.faena_obra;

  // Precargar fecha inicio desde fecha_ingreso del trabajador
  const fechaInicio = t.fecha_ingreso || '';
  // Si ya tiene contrato, cargar sus datos
  const contratoExistente = contratos.find(c => c.trabajador_id === id);
  if(contratoExistente) cargarContratoEnFormulario(contratoExistente);

  actualizarPrevia();
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
  document.getElementById('c-tipo-rem').value      = c.tipo_remuneracion || 'tiempo';
  document.getElementById('c-sueldo').value        = c.sueldo_monto || '';
  document.getElementById('c-sueldo-escrito').value= c.sueldo_escrito || '';
  const bens = c.beneficios || [];
  document.getElementById('ben-alojamiento').checked = bens.includes('alojamiento');
  document.getElementById('ben-alimentacion').checked = bens.includes('alimentacion');
  document.getElementById('ben-transporte').checked  = bens.includes('transporte');
  document.getElementById('ben-luz').checked         = bens.includes('luz');
  contratoEditandoId = c.id;
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

  return {
    trabajador_id:       trabajadorId,
    trabajador_rut:      t?.rut || '',
    empresa_rut:         t?.empresa || t?.empresa_rut || '',
    empresa_propia_id:   document.getElementById('c-empresa-propia')?.value || t?.empresa_propia_id || '',
    tipo:                document.getElementById('c-tipo').value,
    ciudad_firma:        document.getElementById('c-ciudad').value.trim(),
    fecha_firma:         document.getElementById('c-fecha-firma').value,
    funcion_cargo:       document.getElementById('c-cargo').value.trim(),
    nombre_faena:        document.getElementById('c-faena').value.trim(),
    ubicacion_faena:     [empresas.find(e=>e.id===(t?.mandante_id||t?.empresa_rut||t?.empresa)||e.rut===(t?.empresa_rut||t?.empresa))?.direccion,
                           empresas.find(e=>e.id===(t?.mandante_id||t?.empresa_rut||t?.empresa)||e.rut===(t?.empresa_rut||t?.empresa))?.comuna]
                          .filter(Boolean).join(', '),
    region:              empresas.find(e=>e.id===(t?.mandante_id||t?.empresa_rut||t?.empresa)||e.rut===(t?.empresa_rut||t?.empresa))?.region || '',
          mandante_nombre:     empresas.find(e=>e.id===(t?.mandante_id||t?.empresa_rut||t?.empresa)||e.rut===(t?.empresa_rut||t?.empresa))?.nombre || '',
            mandante_rut:        t?.empresa_rut || t?.empresa || '',
            mandante_direccion:  empresas.find(e=>e.id===(t?.mandante_id||t?.empresa_rut||t?.empresa)||e.rut===(t?.empresa_rut||t?.empresa))?.direccion || '',
           mandante_comuna:     empresas.find(e=>e.id===(t?.mandante_id||t?.empresa_rut||t?.empresa)||e.rut===(t?.empresa_rut||t?.empresa))?.comuna || '',
           mandante_region:     empresas.find(e=>e.id===(t?.mandante_id||t?.empresa_rut||t?.empresa)||e.rut===(t?.empresa_rut||t?.empresa))?.region || '',
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

function mostrarCargoOtro(){ /* cargo se carga automáticamente desde el trabajador */ }

function guardarContrato(){
  const id = document.getElementById('c-trabajador').value;
  if(!id){ toast('⚠️ Selecciona un trabajador','error'); return; }

  const cargo = document.getElementById('c-cargo').value.trim();
  if(!cargo){ toast('⚠️ Ingresa la función/cargo','error'); return; }

  const faena = document.getElementById('c-faena').value.trim();
  if(!faena){ toast('⚠️ Ingresa el nombre de la faena','error'); return; }

  const termino = document.getElementById('c-fecha-termino').value;
  if(!termino){ toast('⚠️ Ingresa la fecha de término','error'); return; }

  const datos = obtenerDatosFormulario();
  cargarContratos();

  if(contratoEditandoId){
    const idx = contratos.findIndex(c => c.id === contratoEditandoId);
    if(idx >= 0) contratos[idx] = {...contratos[idx], ...datos};
  } else {
    const existe = contratos.findIndex(c => c.trabajador_id === id);
    if(existe >= 0){
      contratos[existe] = {...contratos[existe], ...datos};
    } else {
      contratos.push({id: Date.now().toString(), ...datos});
    }
  }

  guardarContratos();
  contratoEditandoId = null;

  // Guardar EPP/IRL en la misma acción (evita un segundo viaje a la pestaña EPP/IRL)
  const t = trabajadores.find(x => x.rut === id || x.id === id);
  if(t) Object.assign(t, _leerFormularioEpp('cepp'));
  guardarLocal();

  const b = document.getElementById('badge-contratos');
  if(b) b.textContent = contratos.length;

  toast('✅ Contrato guardado correctamente','exito');
  actualizarPrevia();
}

function guardarCorreccionContrato(){
  const id = document.getElementById('c-trabajador').value;
  if(!id){ toast('⚠️ Selecciona el contrato a corregir','error'); return; }

  const t = trabajadores.find(x => x.rut === id || x.id === id);
  if(!t){ toast('⚠️ Trabajador no encontrado','error'); return; }

  cargarContratos();
  const existe = contratos.findIndex(c => c.trabajador_id === (t.id));
  if(existe < 0){ toast('⚠️ Este trabajador no tiene un contrato registrado para corregir','error'); return; }

  const cargo = document.getElementById('c-cargo').value.trim();
  if(!cargo){ toast('⚠️ Ingresa la función/cargo','error'); return; }
  const faena = document.getElementById('c-faena').value.trim();
  if(!faena){ toast('⚠️ Ingresa el nombre de la faena','error'); return; }
  const termino = document.getElementById('c-fecha-termino').value;
  if(!termino){ toast('⚠️ Ingresa la fecha de término','error'); return; }

  const datos = obtenerDatosFormulario();
  contratos[existe] = {...contratos[existe], ...datos};
  guardarContratos();

  Object.assign(t, _leerFormularioEpp('cepp'));
  guardarLocal();

  const tipoTxt = { temporada:'Temporada', plazo_fijo:'Plazo Fijo', indefinido:'Indefinido' }[datos.tipo] || datos.tipo;
  registrarDocumentoCarpeta({
    trabajador_id:  t.id,
    trabajador_rut: t.rut,
    tipo:           'correccion_contrato',
    subtipo:        datos.tipo,
    fecha_firma:    datos.fecha_firma || '',
    descripcion:    `Corrección de datos del contrato ${tipoTxt} — ${datos.nombre_faena || ''}`.trim(),
  });

  toast('✅ Corrección guardada — quedó registrada en la Carpeta Laboral', 'exito');
  actualizarPrevia();
  poblarSelectTrabajadoresContrato();
}

function limpiarContrato(){
  contratoEditandoId = null;
  const campos = ['c-ciudad','c-fecha-firma','c-cargo','c-faena',
    'c-temporada','c-fecha-termino','c-horas','c-distribucion','c-colacion',
    'c-sueldo','c-sueldo-escrito','cp-rut','cp-nombre','cp-nacionalidad',
    'cp-estado-civil','cp-afp','cp-salud','cp-empresa-rut','cp-empresa-nombre',
    'cp-rep-nombre','cp-rep-rut'];
  campos.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  ['ben-alojamiento','ben-alimentacion','ben-transporte','ben-luz'].forEach(id => {
    const el = document.getElementById(id); if(el) el.checked = false;
  });
  document.getElementById('c-trabajador').value = '';
  document.getElementById('c-tipo').value = 'temporada';
  document.getElementById('c-tipo-rem').value = 'tiempo';
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
  const mandante = findMandante(t);
  const datos    = obtenerDatosFormulario();

  const { htmlCompleto } = construirDocumentoContrato(t, emp, mandante, datos);
  const docHTML = _contenidoInternoDocumento(htmlCompleto);

  p.innerHTML = `
    <div style="background:#0f2942;color:#fff;padding:9px 12px;border-radius:var(--radius) var(--radius) 0 0;font-size:12px;font-weight:600;text-align:center;">
      Vista previa del documento
    </div>
    <div style="border:1px solid var(--borde);border-top:none;border-radius:0 0 var(--radius) var(--radius);
      max-height:520px;overflow-y:auto;background:#fff;padding:20px;">
      <style>#contrato-preview .doc-wrap{max-width:none;font-size:9.5pt;line-height:1.55;}</style>
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

  // Fechas formateadas
  const fmtLarga = v => v ? new Date(v).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}) : '___________';
  const fmtCorta = v => v ? new Date(v).toLocaleDateString('es-CL') : '___________';

  const fechaFirma   = fmtLarga(datos.fecha_firma);
  const fechaIngreso = fmtLarga(t?.fecha_ingreso);
  const fechaTermino = fmtLarga(datos.fecha_termino);
  const fechaNac     = fmtCorta(t?.fecha_nacimiento);

  // Sueldo
  const sueldoNum    = parseInt(datos.sueldo_monto || 0);
  const sueldoFmt    = sueldoNum ? '$' + sueldoNum.toLocaleString('es-CL') : '$___________';
  const sueldoPalab  = sueldoNum
    ? numeroALetras(sueldoNum).trim() + ' pesos'
    : '_______________________________________________';

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

  const TITULOS = {
    temporada:  'Contrato de Trabajo Agrícola por Temporada',
    plazo_fijo: 'Contrato de Trabajo Agrícola a Plazo Fijo',
    indefinido: 'Contrato de Trabajo Agrícola Indefinido',
  };
  const SUBTITULOS = {
    temporada:  `Temporada ${datos.temporada || '________'}`,
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
    <p>El trabajador(a) desempeñará la función de <strong>${datos.funcion_cargo}</strong>,
    siendo sus labores principales aquellas propias de dicho cargo.</p>
    <p>Sin perjuicio de lo anterior, podrá ejecutar labores agrícolas relacionadas con cosecha,
    poda, raleo, amarre, packing, selección, mantención de huertos, control de malezas, apoyo
    operacional agrícola y demás funciones afines que le encomiende el empleador, siempre que
    sean compatibles con la naturaleza de su cargo y dentro de su área de trabajo.</p>
    <p>En el desempeño de sus funciones, el trabajador(a) se compromete a:</p>
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
    <strong>${datos.nombre_faena}</strong>${tipo==='temporada' ? `, correspondiente a la temporada <strong>${datos.temporada || '________'}</strong>,` : ','}
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
    <p>Por la prestación de sus servicios, el trabajador percibirá:</p>
    <p>a) Sueldo base mensual: <strong>${sueldoFmt} (${sueldoPalab})</strong>.</p>
    <p>Las remuneraciones serán pagadas por períodos vencidos, el último día hábil de cada mes,
    mediante transferencia electrónica, depósito en cuenta bancaria u otro medio acordado
    entre las partes.</p>
    <p>Se deja constancia de que cualquier beneficio adicional otorgado por la empresa, en dinero
    o especie, no consignado expresamente en este contrato, se otorgará a título de mera
    liberalidad del empleador, sin constituir derecho adquirido, siempre que no se otorgue
    en forma permanente.</p>`});

  clausulas.push({tit:'Prohibiciones', body:`
    <p>El trabajador(a) se obliga a no incurrir en las siguientes conductas:</p>
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
    <p>El empleador proporcionará al trabajador(a) los elementos de protección personal necesarios
    para el desempeño de sus funciones, conforme a la Ley N°16.744 sobre Accidentes del Trabajo
    y Enfermedades Profesionales.</p>
    <p>El trabajador(a) se obliga a utilizar correctamente dichos implementos y a mantenerlos
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
      de la temporada agrícola <strong>${datos.temporada || '________'}</strong>, conforme a lo
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
      <p>Se deja constancia de que el trabajador(a) ingresó al servicio del empleador
      con fecha <strong>${fechaIngreso}</strong>.</p>`});
  }

  if(tipo === 'indefinido'){
    clausulas.push({tit:'Feriado anual', body:`
      <p>El trabajador(a) tendrá derecho a un feriado anual de quince días hábiles, con
      goce de remuneración íntegra, después de un año de servicio, conforme a lo dispuesto
      en el artículo 67 del Código del Trabajo. El feriado se otorgará de preferencia en
      primavera o verano, considerando las necesidades del empleador y las de la faena.</p>`});

    clausulas.push({tit:'Terminación del contrato', body:`
      <p>El presente contrato podrá terminar por alguna de las causales establecidas en
      los artículos 159, 160 y 161 del Código del Trabajo. En caso de término por
      necesidades de la empresa u otra causal que así lo requiera, el empleador deberá
      dar aviso previo de al menos treinta días, o pagar una indemnización sustitutiva
      equivalente a la última remuneración mensual devengada, conforme al artículo 162.</p>
      <p>Si correspondiere, el trabajador(a) tendrá derecho a la indemnización por años
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
    .doc-wrap{ max-width:76ch; margin:0 auto; }
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
    .checkbox{ width:13px; height:13px; border:1.5px solid #000;
      display:inline-block; text-align:center; line-height:13px; font-size:10px;
      cursor:pointer; flex-shrink:0; }
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
nacida(o) el <strong>${fechaNac}</strong>,
estado civil <strong>${t?.estado_civil || '___________'}</strong>,
con domicilio en <strong>${t?.domicilio || '___________'}</strong>,
correo electrónico <strong>${t?.correo_electronico || '___________'}</strong>,
afiliada(o) a AFP <strong>${t?.afiliacion_afp || '___________'}</strong>
y sistema de salud <strong>${t?.sistema_salud || '___________'}</strong>,
en adelante <em>"el Trabajador(a)"</em>, se ha convenido celebrar el siguiente
${tipoTexto}, el cual se regirá por el Código del Trabajo y demás disposiciones
legales vigentes.</p>

<p>Las partes acuerdan denominarse <em>"Empleador"</em> y <em>"Trabajador(a)"</em>,
respectivamente, y suscriben las siguientes cláusulas:</p>

${clausulasHTML}

<div class="firma-grid">
  <div class="firma-box">
    <div class="firma-linea"></div>
    <div class="firma-nombre">${t?.nombre || '______________'}</div>
    <div class="firma-rol">Trabajador(a)</div>
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
      const marcado = (t?.epp_entregados||[]).includes(item);
      return `<span class="check-item"><span class="checkbox${marcado?' checked':''}">${marcado?'✓':''}</span> ${item}</span>`;
    }).join('\n    ')}
    <span class="check-item"><span class="checkbox${(t?.epp_entregados||[]).includes('Otro')?' checked':''}">${(t?.epp_entregados||[]).includes('Otro')?'✓':''}</span> Otro: ${t?.epp_otro || '_______________'}</span>
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

  <p style="margin-bottom:10px;">Con fecha <strong>${fmtCorta(t?.irl_fecha_induccion || t?.fecha_ingreso)}</strong>, la empresa
  <strong>${emp.razon_social || '______________'}</strong>,
  RUT <strong>${emp.rut || '___________'}</strong>,
  representada por don(ña) <strong>${emp.representante || '______________'}</strong>,
  en su calidad de representante legal, hace entrega al(la) trabajador(a)
  <strong>${t?.nombre || '______________'}</strong>,
  RUT <strong>${t?.rut || '___________'}</strong>,
  de un ejemplar del Reglamento Interno de Orden, Higiene y Seguridad, en cumplimiento
  de lo dispuesto en el artículo 156 del Código del Trabajo.</p>

  <p style="margin-bottom:10px;">El(la) trabajador(a) declara haber recibido una copia del referido reglamento, haber sido
  informado(a) de su contenido y se compromete a cumplir las disposiciones, normas y
  procedimientos establecidos durante el desempeño de sus labores. Asimismo, se deja constancia
  de que el trabajador(a) ha sido informado(a) sobre la obligación de conocer y aplicar las
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
      <div class="firma-rol">Firma del Trabajador(a)</div>
      <div class="firma-rol">RUT: ${t?.rut || '___________'}</div>
    </div>
    <div class="firma-box">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${emp.representante || '______________'}</div>
      <div class="firma-rol">Entrega efectuada por</div>
      <div class="firma-rol">Fecha: ${fmtCorta(t?.irl_fecha_induccion || t?.fecha_ingreso)}</div>
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
    <div style="margin-bottom:8px;" class="check-item"><span class="checkbox" onclick="this.classList.toggle('checked');this.textContent=this.classList.contains('checked')?'✓':''"> </span> &nbsp;Persona trabajadora nueva</div>
    <div style="margin-bottom:8px;" class="check-item"><span class="checkbox" onclick="this.classList.toggle('checked');this.textContent=this.classList.contains('checked')?'✓':''"> </span> &nbsp;Persona trabajadora con ausencia prolongada</div>
    <div style="margin-bottom:8px;" class="check-item"><span class="checkbox" onclick="this.classList.toggle('checked');this.textContent=this.classList.contains('checked')?'✓':''"> </span> &nbsp;Persona trabajadora reubicada en nuevo cargo</div>
    <div style="margin-bottom:8px;" class="check-item"><span class="checkbox" onclick="this.classList.toggle('checked');this.textContent=this.classList.contains('checked')?'✓':''"> </span> &nbsp;Por cambio de proceso, tecnología, materiales o sustancias</div>
  </div>

  <p><strong>2. Identificación de la Persona Trabajadora</strong></p>
  <table>
    <tr><td>Nombre</td><td>${t?.nombre || '—'}</td></tr>
    <tr><td>RUT</td><td>${t?.rut || '—'}</td></tr>
    <tr><td>Empresa</td><td>${emp.razon_social || '—'}</td></tr>
    <tr><td>Faena</td><td>${datos.nombre_faena || '—'}</td></tr>
    <tr><td>Fecha</td><td>${fmtCorta(t?.irl_fecha_induccion || t?.fecha_ingreso)}</td></tr>
  </table>

  <p style="margin-top:16px;"><strong>3. Identificación del Relator(a)</strong></p>
  <table>
    <tr><td>Nombre del relator(a)</td><td>${emp.representante || '—'}</td></tr>
    <tr><td>Empresa</td><td>${emp.razon_social || '—'}</td></tr>
    <tr><td>Fecha de inducción</td><td>${fmtCorta(t?.irl_fecha_induccion || t?.fecha_ingreso)}</td></tr>
    <tr><td>Hora inicio</td><td>&nbsp;</td></tr>
    <tr><td>Hora término</td><td>&nbsp;</td></tr>
  </table>

  <p style="margin-top:16px;"><strong>4. Declaración de Recepción de IRL</strong>
    ${t?.irl_declarado ? ' <span style="color:#0a7a35;">✅ Declarado recibido por el trabajador(a) en su ficha</span>' : ''}
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
      <div class="firma-rol">Firma Trabajador(a)</div>
      <div class="firma-rol">RUT: ${t?.rut || '___________'}</div>
      <div class="firma-rol">Fecha: ${fmtCorta(t?.irl_fecha_induccion || t?.fecha_ingreso)}</div>
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
  const mandante = findMandante(t);

  if(!datos.funcion_cargo){ toast('⚠️ Ingresa la función/cargo','error'); return; }
  if(!datos.nombre_faena){  toast('⚠️ Ingresa el nombre de la faena','error'); return; }

  const { htmlCompleto, folioDoc, tipo } = construirDocumentoContrato(t, emp, mandante, datos);

  // Registrar en Carpeta Laboral (aplica tanto en modo individual como masivo)
  const tipoTxt = { temporada:'Temporada', plazo_fijo:'Plazo Fijo', indefinido:'Indefinido' }[tipo] || tipo;
  registrarDocumentoCarpeta({
    trabajador_id:  id,
    trabajador_rut: t?.rut || '',
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
  const tabs = { contratos:'tab-contratos', anexos:'tab-anexos', epp:'tab-epp', corregir:'tab-corregir' };
  // 'corregir' reutiliza el mismo panel visual que 'contratos' (mismo formulario)
  const subs = { contratos:'sub-tab-contratos', anexos:'sub-tab-anexos', epp:'sub-tab-epp', corregir:'sub-tab-contratos' };
  const hdrBtns = document.getElementById('contratos-header-btns');

  Object.keys(tabs).forEach(key => {
    const btn = document.getElementById(tabs[key]);
    if(!btn) return;
    const activo = key === tab;
    btn.style.borderBottomColor = activo ? 'var(--azul)' : 'transparent';
    btn.style.color = activo ? 'var(--azul)' : 'var(--texto2)';
  });
  // Mostrar/ocultar los paneles (sin duplicar 'sub-tab-contratos' al ocultarlo dos veces)
  document.getElementById('sub-tab-contratos').style.display = (tab === 'contratos' || tab === 'corregir') ? '' : 'none';
  document.getElementById('sub-tab-anexos').style.display    = (tab === 'anexos') ? '' : 'none';
  document.getElementById('sub-tab-epp').style.display       = (tab === 'epp') ? '' : 'none';

  if(hdrBtns) hdrBtns.style.display = (tab === 'contratos') ? 'flex' : 'none';

  if(tab === 'anexos'){
    poblarSelectAnexoTrabajador();
    actualizarBadgesContratos();
  }
  if(tab === 'epp'){
    initEppTab();
  }
  if(tab === 'contratos'){
    cambiarModoContrato('individual');
  }
  if(tab === 'corregir'){
    cambiarModoContrato('corregir');
  }
}

function actualizarBadgesContratos(){
  const bc = document.getElementById('badge-tab-contratos');
  const ba = document.getElementById('badge-tab-anexos');
  if(bc) bc.textContent = contratos.length;
  if(ba) ba.textContent = (anexos||[]).length;
}

function verListaContratos(){
  document.getElementById('modal-lista-contratos').style.display = 'flex';
  document.getElementById('buscar-contrato').value = '';
  renderListaContratos();
}

function cerrarModalListaContratos(){
  document.getElementById('modal-lista-contratos').style.display = 'none';
}

function renderListaContratos(){
  const buscar = (document.getElementById('buscar-contrato')?.value || '').toLowerCase().replace(/\./g,'');
  const cont   = document.getElementById('lista-contratos-modal');

  const lista = (contratos||[]).map(c => {
    const t = trabajadores.find(x => x.id === c.trabajador_id || x.rut === c.trabajador_rut);
    return { c, t };
  }).filter(({t}) => {
    if(!buscar) return true;
    const rutLimp = (t?.rut||'').replace(/\./g,'').toLowerCase();
    return (t?.nombre||'').toLowerCase().includes(buscar) || rutLimp.includes(buscar);
  }).sort((a,b) => (a.t?.nombre||'').localeCompare(b.t?.nombre||''));

  if(!lista.length){
    cont.innerHTML = `<div style="text-align:center;padding:40px;color:var(--texto3);">
      <i class="ti ti-file-off" style="font-size:36px;display:block;margin-bottom:10px;opacity:0.4;"></i>
      ${buscar ? 'Sin resultados para esa búsqueda' : 'Aún no se han generado contratos'}
    </div>`;
    return;
  }

  cont.innerHTML = lista.map(({c,t}) => {
    const mandante = findMandante(t);
    const tipoTxt = c.tipo === 'temporada' ? 'Temporada' : c.tipo === 'indefinido' ? 'Indefinido' : 'Plazo fijo';
    const fechaFirma = c.fecha_firma ? new Date(c.fecha_firma).toLocaleDateString('es-CL') : '—';

    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
      border:1px solid var(--borde);border-radius:var(--radius);margin-bottom:8px;background:#fff;">
      <div style="width:38px;height:38px;border-radius:8px;background:var(--gris-bg);
        display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="ti ti-file-description" style="color:var(--azul);font-size:18px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;">${t?.nombre || 'Trabajador eliminado'}</div>
        <div style="font-size:11px;color:var(--texto2);">
          ${t?.rut || c.trabajador_rut} · ${tipoTxt} · ${mandante?.nombre || '—'} · Firmado ${fechaFirma}
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="cerrarModalListaContratos();
        document.getElementById('c-trabajador').value='${t?.id||''}';precargarContrato();">
        <i class="ti ti-edit"></i> Editar
      </button>
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('c-trabajador').value='${t?.id||''}';generarPDFContrato();">
        <i class="ti ti-file-type-pdf"></i> PDF
      </button>
    </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════
   CONTRATOS MASIVOS
   ════════════════════════════════════════════════════════ */
let _modoContratoActual = 'individual';

function cambiarModoContrato(modo){
  _modoContratoActual = modo;
  const esMasivo   = modo === 'masivo';
  const esCorregir = modo === 'corregir';
  const esIndividual = modo === 'individual';

  document.getElementById('btn-modo-individual').className = esIndividual ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  document.getElementById('btn-modo-masivo').className     = esMasivo     ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

  const bloqueToggle = document.getElementById('bloque-toggle-individual-masivo');
  if(bloqueToggle) bloqueToggle.style.display = esCorregir ? 'none' : 'flex';

  document.getElementById('campo-c-trabajador-individual').style.display = esMasivo ? 'none' : '';
  document.getElementById('bloque-contrato-masivo').style.display       = esMasivo ? 'block' : 'none';
  document.getElementById('bloque-precargados-individual').style.display= esMasivo ? 'none' : '';
  document.getElementById('g2-contrato-cols').style.gridTemplateColumns = esMasivo ? '1fr' : '1fr 1fr';

  document.getElementById('botones-contrato-individual').style.display = (esIndividual) ? 'flex' : 'none';
  document.getElementById('botones-contrato-masivo').style.display     = esMasivo ? 'flex' : 'none';
  const botonesCorregir = document.getElementById('botones-contrato-corregir');
  if(botonesCorregir) botonesCorregir.style.display = esCorregir ? 'flex' : 'none';

  const btnHeader = document.getElementById('btn-generar-pdf-header');
  if(btnHeader) btnHeader.style.display = esMasivo ? 'none' : '';
  const btnVerDoc = document.getElementById('btn-ver-doc-individual');
  if(btnVerDoc) btnVerDoc.style.display = esMasivo ? 'none' : '';

  // Aviso fijo del modo Corregir
  const avisoCorregir = document.getElementById('aviso-corregir-contrato');
  if(avisoCorregir) avisoCorregir.style.display = esCorregir ? 'block' : 'none';

  // Label del selector cambia según el modo
  const lblSelector = document.getElementById('lbl-c-trabajador-select');
  if(lblSelector) lblSelector.textContent = esCorregir ? 'Selecciona el contrato a corregir' : 'Seleccionar trabajador';

  // Cargo y horas pasan a ser editables solo en modo masivo (compartidos para todo el grupo)
  const cCargo = document.getElementById('c-cargo');
  const cHoras = document.getElementById('c-horas');
  const lblCargo = document.getElementById('lbl-c-cargo');
  const lblHoras = document.getElementById('lbl-c-horas');
  if(cCargo){
    cCargo.readOnly = !esMasivo;
    cCargo.style.background = esMasivo ? '' : 'var(--gris-bg)';
    cCargo.placeholder = esMasivo ? 'Ej: Cosechero' : 'Se carga al seleccionar trabajador';
  }
  if(cHoras){
    cHoras.readOnly = !esMasivo;
    cHoras.style.background = esMasivo ? '' : 'var(--gris-bg)';
  }
  if(lblCargo) lblCargo.textContent = esMasivo ? 'Función / cargo (para todo el grupo) *' : 'Función / cargo *';
  if(lblHoras) lblHoras.textContent = esMasivo ? 'Horas semanales' : 'Horas semanales (auto)';

  document.getElementById('c-trabajador').value = '';
  limpiarPreview();

  const eppCont = document.getElementById('epp-en-contrato');
  if(eppCont){
    eppCont.innerHTML = esMasivo ? _htmlFormularioEpp('cepp', {}) : '';
  }

  poblarSelectTrabajadoresContrato(); // repuebla según el modo (todos con check, o solo los que tienen contrato)
  if(esMasivo) renderListaContratoMasivo();
}

/* Un trabajador tiene contrato vigente si existe un documento tipo 'contrato' en su carpeta laboral */
function _tieneContratoVigente(rut){
  return (carpeta || []).some(d => d.trabajador_rut === rut && d.tipo === 'contrato');
}

function renderListaContratoMasivo(){
  const buscar     = (document.getElementById('cm-buscar')?.value || '').toLowerCase().trim();
  const mostrarTodos = document.getElementById('cm-mostrar-con-contrato')?.checked;
  const cont = document.getElementById('cm-lista-trabajadores');
  if(!cont) return;

  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(!mostrarTodos) lista = lista.filter(t => !_tieneContratoVigente(t.rut));
  if(buscar) lista = lista.filter(t => t.rut?.toLowerCase().includes(buscar) || t.nombre?.toLowerCase().includes(buscar));

  const contador = document.getElementById('cm-contador');
  if(!lista.length){
    cont.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto3);font-size:13px;">
      ${mostrarTodos ? 'Sin trabajadores para mostrar' : 'Todos los trabajadores activos ya tienen contrato — activa "Mostrar también con contrato vigente" para recontratarlos'}
    </div>`;
    if(contador) contador.textContent = '';
    return;
  }

  cont.innerHTML = lista.map(t => {
    const yaContrato = _tieneContratoVigente(t.rut);
    return `<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:13px;border-bottom:1px solid var(--borde);cursor:pointer;">
      <input type="checkbox" class="cm-check-trab" value="${t.id}" data-rut="${t.rut}" onchange="_cmActualizarContador()" style="width:auto;">
      <span style="flex:1;">${t.nombre} <span style="color:var(--texto3);font-family:monospace;font-size:11px;">${t.rut}</span></span>
      ${yaContrato ? '<span class="badge badge-amarillo" style="font-size:10px;">Ya tiene contrato</span>' : ''}
    </label>`;
  }).join('');

  _cmActualizarContador();
}

function _cmActualizarContador(){
  const n = document.querySelectorAll('.cm-check-trab:checked').length;
  const contador = document.getElementById('cm-contador');
  if(contador) contador.textContent = n ? `${n} trabajador${n!==1?'es':''} seleccionado${n!==1?'s':''}` : '';
}

function _cmSeleccionarTodos(val){
  document.querySelectorAll('.cm-check-trab').forEach(c => c.checked = val);
  _cmActualizarContador();
}

/* ── VISTA PREVIA ────────────────────────────────────────── */
function previsualizarContratosMasivo(){
  const epId = document.getElementById('c-empresa-propia')?.value;
  if(!epId){ toast('⚠️ Selecciona la empresa empleadora', 'error'); return; }

  const cargo = document.getElementById('c-cargo').value.trim();
  if(!cargo){ toast('⚠️ Ingresa la función/cargo', 'error'); return; }
  const faena = document.getElementById('c-faena').value.trim();
  if(!faena){ toast('⚠️ Ingresa el nombre de la faena', 'error'); return; }
  const termino = document.getElementById('c-fecha-termino').value;
  if(!termino){ toast('⚠️ Ingresa la fecha de término', 'error'); return; }

  const seleccionados = Array.from(document.querySelectorAll('.cm-check-trab:checked'));
  if(!seleccionados.length){ toast('⚠️ Selecciona al menos un trabajador', 'error'); return; }

  const sueldo = document.getElementById('c-sueldo').value;
  const sueldoFmt = sueldo ? '$' + parseInt(sueldo).toLocaleString('es-CL') : '—';

  const tbody = document.getElementById('pcm-tbody');
  tbody.innerHTML = seleccionados.map(chk => {
    const t = trabajadores.find(x => x.id === chk.value);
    return `<tr>
      <td style="font-size:13px;">${t?.nombre||'—'}</td>
      <td style="font-size:12px;font-family:monospace;">${t?.rut||'—'}</td>
      <td style="font-size:12px;">${cargo}</td>
      <td style="font-size:12px;">${faena}</td>
      <td style="font-size:12px;">${sueldoFmt}</td>
      <td style="font-size:12px;">${fmtFecha(termino)}</td>
    </tr>`;
  }).join('');

  document.getElementById('pcm-contador').textContent = `${seleccionados.length} contrato${seleccionados.length!==1?'s':''} se van a generar con estos datos compartidos`;
  document.getElementById('modal-preview-contrato-masivo').style.display = 'flex';
}

function cerrarModalPreviewMasivo(){
  document.getElementById('modal-preview-contrato-masivo').style.display = 'none';
}

/* ── GENERACIÓN ──────────────────────────────────────────── */
let _generandoContratosMasivo = false;

function generarContratosMasivo(){
  if(_generandoContratosMasivo) return;
  const seleccionados = Array.from(document.querySelectorAll('.cm-check-trab:checked')).map(c => c.value);
  if(!seleccionados.length){ toast('⚠️ Selecciona al menos un trabajador', 'error'); return; }
  _generandoContratosMasivo = true;

  cargarContratos();
  const selTrabajador = document.getElementById('c-trabajador');
  const contenidos = [];
  const datosEppCompartido = _leerFormularioEpp('cepp');
  let generados = 0;

  seleccionados.forEach(idTrab => {
    selTrabajador.value = idTrab;

    const datos = obtenerDatosFormulario();
    const existe = contratos.findIndex(c => c.trabajador_id === idTrab);
    if(existe >= 0) contratos[existe] = {...contratos[existe], ...datos};
    else contratos.push({id: Date.now().toString() + '_' + idTrab, ...datos});

    // Aplicar EPP/IRL compartido al trabajador (mismo dato para todo el grupo)
    const t = trabajadores.find(x => x.id === idTrab);
    if(t) Object.assign(t, datosEppCompartido);

    const contenidoHTML = generarPDFContrato(true);
    if(contenidoHTML) contenidos.push(contenidoHTML);
    generados++;
  });

  guardarContratos();
  guardarLocal();
  selTrabajador.value = '';

  const b = document.getElementById('badge-contratos');
  if(b) b.textContent = contratos.length;

  cerrarModalPreviewMasivo();
  toast(`✅ ${generados} contrato${generados!==1?'s':''} generado${generados!==1?'s':''}`, 'exito');

  _abrirVentanaContratosMasivo(contenidos);
  renderListaContratoMasivo();
  _generandoContratosMasivo = false;
}

/* ── VENTANA DE IMPRESIÓN COMBINADA ──────────────────────── */
function _abrirVentanaContratosMasivo(contenidos){
  if(!contenidos.length) return;

  const cuerpo = contenidos
    .map((c, i) => i === 0 ? c : `<div class="salto"></div>${c}`)
    .join('\n');

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
    .doc-wrap{ max-width:76ch; margin:0 auto; }
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
    .checkbox{ width:13px; height:13px; border:1.5px solid #000;
      display:inline-block; text-align:center; line-height:13px; font-size:10px;
      cursor:pointer; flex-shrink:0; }
    .checkbox.checked{ background:#000; color:#fff; }
    .firma-simple{ margin-top:36px; }
    .firma-simple .firma-linea{ width:60%; margin:45px auto 6px; }
    .firma-simple p{ text-align:center; font-size:10pt; }
    .observ-linea{ border-bottom:1px solid #000; margin:8px 0; height:22px; }
    .no-print{ margin-bottom:24px; }
    @media print{ .no-print{display:none !important;} }
  </style>
</head><body>
<div class="no-print" style="display:flex;gap:10px;align-items:center;padding:16px;">
  <button onclick="window.print()" style="padding:10px 24px;background:#0f2942;color:#fff;
    border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
    🖨️ Imprimir / Guardar PDF (${contenidos.length} contratos)
  </button>
  <button onclick="window.close()" style="padding:10px 16px;background:#f1f5f9;
    border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;">
    Cerrar
  </button>
</div>
<div class="doc-wrap">
${cuerpo}
</div>
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
  sel.innerHTML = '<option value="">— Seleccionar trabajador —</option>' +
    trabajadores.map(t => `<option value="${t.rut}">${t.nombre} — ${t.rut}</option>`).join('');
  if(val) sel.value = val;
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
function _htmlFormularioEpp(prefix, datos){
  datos = datos || {};
  const entregados = datos.epp_entregados || [];
  return `
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
    <div class="form-grid" style="margin-bottom:12px;">
      <div class="form-group">
        <label>Fecha de entrega EPP</label>
        <input type="date" id="${prefix}-epp-fecha-entrega" value="${datos.epp_fecha_entrega||''}">
      </div>
    </div>

    <div class="form-section"><i class="ti ti-notebook"></i> RIOHS / Inducción (IRL)</div>
    <div class="form-grid" style="margin-bottom:14px;">
      <div class="form-group">
        <label>Fecha de inducción</label>
        <input type="date" id="${prefix}-irl-fecha-induccion" value="${datos.irl_fecha_induccion||''}">
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:22px;">
        <input type="checkbox" id="${prefix}-irl-declarado" ${datos.irl_declarado?'checked':''} style="width:auto;">
        <label style="margin:0;">Declara haber recibido RIOHS/IRL</label>
      </div>
    </div>`;
}

function _leerFormularioEpp(prefix){
  return {
    epp_entregados:       Array.from(document.querySelectorAll(`.${prefix}-epp-check:checked`)).map(c => c.value),
    epp_otro:             document.getElementById(`${prefix}-epp-otro-detalle`)?.value.trim() || '',
    epp_fecha_entrega:    document.getElementById(`${prefix}-epp-fecha-entrega`)?.value || null,
    irl_fecha_induccion:  document.getElementById(`${prefix}-irl-fecha-induccion`)?.value || null,
    irl_declarado:        document.getElementById(`${prefix}-irl-declarado`)?.checked || false,
  };
}

/* ── INDIVIDUAL ──────────────────────────────────────────── */
function cargarEppTrabajador(){
  const rut = document.getElementById('epp-sel-trabajador')?.value;
  const cont = document.getElementById('epp-form-individual');
  if(!cont) return;
  if(!rut){ cont.style.display = 'none'; cont.innerHTML = ''; return; }

  const t = trabajadores.find(x => x.rut === rut);
  cont.style.display = 'block';
  cont.innerHTML = _htmlFormularioEpp('eppi', t) + `
    <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="guardarEppIndividual()">
      <i class="ti ti-device-floppy"></i> Guardar EPP / IRL
    </button>`;
}

function guardarEppIndividual(){
  const rut = document.getElementById('epp-sel-trabajador')?.value;
  if(!rut){ toast('⚠️ Selecciona un trabajador', 'error'); return; }
  const t = trabajadores.find(x => x.rut === rut);
  if(!t){ toast('⚠️ Trabajador no encontrado', 'error'); return; }

  Object.assign(t, _leerFormularioEpp('eppi'));
  guardarLocal();
  toast(`✅ EPP / IRL guardado para ${t.nombre}`, 'exito');
}

/* ── MASIVO ──────────────────────────────────────────────── */
function renderListaEppMasivo(){
  const buscar = (document.getElementById('epp-cm-buscar')?.value || '').toLowerCase().trim();
  const cont = document.getElementById('epp-cm-lista');
  if(!cont) return;

  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(buscar) lista = lista.filter(t => t.rut?.toLowerCase().includes(buscar) || t.nombre?.toLowerCase().includes(buscar));

  if(!lista.length){
    cont.innerHTML = `<div style="padding:20px;text-align:center;color:var(--texto3);font-size:13px;">Sin trabajadores para mostrar</div>`;
    return;
  }

  cont.innerHTML = lista.map(t => `
    <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:13px;border-bottom:1px solid var(--borde);cursor:pointer;">
      <input type="checkbox" class="epp-cm-check-trab" value="${t.rut}" onchange="_eppCmActualizarContador()" style="width:auto;">
      <span>${t.nombre} <span style="color:var(--texto3);font-family:monospace;font-size:11px;">${t.rut}</span></span>
    </label>`).join('');

  // Mostrar el formulario compartido debajo de la lista (una sola vez)
  const contForm = document.getElementById('epp-form-masivo');
  if(contForm && !contForm.innerHTML){
    contForm.innerHTML = _htmlFormularioEpp('eppm', {}) + `
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
