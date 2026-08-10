/* ════ REGISTRO PERSONAL ════ */

/* ════════════════════════════════════════════════════════
   TABS — Registro Individual / Registro Masivo
   Antes convivían en 2 columnas siempre visibles (.g2); separados
   en sub-tabs (mismo patrón que Contratos) para ganar pantalla y
   evitar que el usuario confunda un flujo con el otro.
   ════════════════════════════════════════════════════════ */
function switchTabRegistro(tab){
  const tabs = { individual:'tab-reg-individual', masivo:'tab-reg-masivo' };
  const subs = { individual:'sub-tab-reg-individual', masivo:'sub-tab-reg-masivo' };

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
}

/* ════════════════════════════════════════════════════════
   CARGO Y ESTADO CIVIL SEGÚN SEXO (Hallazgo Grande #9)
   Antes: una sola lista mezclada, solo Cosechero/Cosechera tenía
   ambas formas, el resto solo masculino. Ahora: pares completos,
   se muestra la forma correcta automáticamente según el Sexo
   elegido — antes de elegir Sexo, se muestra la forma masculina
   por defecto (no bloquea poder seguir llenando el resto).
   ════════════════════════════════════════════════════════ */
const CARGOS_PARES = [
  ['Cosechero','Cosechera'],
  ['Podador','Podadora'],
  ['Raleador','Raleadora'],
  ['Operario de Packing','Operaria de Packing'],
  ['Seleccionador','Seleccionadora'],
  ['Amarrador','Amarradora'],
  ['Regador','Regadora'],
  ['Fumigador','Fumigadora'],
  ['Tractorista','Tractorista'],
  ['Jefe de Cuadrilla','Jefa de Cuadrilla'],
  ['Supervisor de Campo','Supervisora de Campo'],
  ['Encargado de Bodega','Encargada de Bodega'],
  ['Estibador','Estibadora'],
  ['Chofer','Chofer'],
];
const ESTADO_CIVIL_PARES = [
  ['Soltero','Soltera'],
  ['Casado','Casada'],
  ['Divorciado','Divorciada'],
  ['Viudo','Viuda'],
  ['Conviviente','Conviviente'],
];
const NACIONALIDAD_PARES = [
  ['Chileno','Chilena'],
  ['Haitiano','Haitiana'],
  ['Colombiano','Colombiana'],
  ['Venezolano','Venezolana'],
  ['Peruano','Peruana'],
  ['Boliviano','Boliviana'],
  ['Argentino','Argentina'],
  ['Paraguayo','Paraguaya'],
];

function _actualizarListasPorSexo(){
  const sexo   = document.getElementById('m-sexo')?.value || '';
  const colIdx = sexo === 'Mujer' ? 1 : 0; // por defecto (sin elegir aún) muestra la forma masculina

  // --- Cargo ---
  const selCargo = document.getElementById('m-cargo');
  if(selCargo){
    const valorPrevio = selCargo.value;
    // Encontrar en qué fila estaba el valor previamente elegido, para
    // mantener la misma selección en la forma de género correcta.
    const filaPrevia = CARGOS_PARES.find(p => p.includes(valorPrevio));
    selCargo.innerHTML = '<option value="">— Seleccionar cargo —</option>'
      + CARGOS_PARES.map(p => `<option value="${p[colIdx]}">${p[colIdx]}</option>`).join('')
      + '<option value="otro">Otro (especificar)</option>';
    if(valorPrevio === 'otro') selCargo.value = 'otro';
    else if(filaPrevia) selCargo.value = filaPrevia[colIdx];
  }

  // --- Estado civil ---
  const selCivil = document.getElementById('m-estado-civil');
  if(selCivil){
    const valorPrevio = selCivil.value;
    const filaPrevia = ESTADO_CIVIL_PARES.find(p => p.includes(valorPrevio));
    selCivil.innerHTML = '<option value="">— Seleccionar —</option>'
      + ESTADO_CIVIL_PARES.map(p => `<option value="${p[colIdx]}">${p[colIdx]}</option>`).join('');
    if(filaPrevia) selCivil.value = filaPrevia[colIdx];
  }

  // --- Nacionalidad ---
  // ✅ Mismo patrón que Cargo/Estado Civil. La opción "otro" se mantiene
  // igual en ambas formas (no tiene par masculino/femenino, es texto libre).
  const selNac = document.getElementById('m-nacionalidad');
  if(selNac){
    const valorPrevio = selNac.value;
    const filaPrevia = NACIONALIDAD_PARES.find(p => p.includes(valorPrevio));
    selNac.innerHTML = NACIONALIDAD_PARES.map(p => `<option value="${p[colIdx]}">${p[colIdx]}</option>`).join('')
      + '<option value="otro">Otro...</option>';
    if(valorPrevio === 'otro') selNac.value = 'otro';
    else if(filaPrevia) selNac.value = filaPrevia[colIdx];
  }
}

/* ───────── RP-006: Validación centralizada ─────────
   Devuelve { ok:true } o { ok:false, mensaje } — nunca lanza excepción. */
function validarFormularioTrabajador(datos, idOriginal){
  if(!datos.rut)    return { ok:false, mensaje:'Ingresa el RUT del trabajador' };
  if(!validarRUT(datos.rut)){
    return { ok:false, mensaje:`El RUT "${datos.rut}" no es válido (revisa el dígito verificador)` };
  }
  // RP-001/002: RUT duplicado — solo se permite si estamos editando ESE mismo trabajador
  const existente = trabajadores.find(t => t.rut === datos.rut);
  if(existente && existente.id !== idOriginal){
    return { ok:false, mensaje:`Ya existe un trabajador registrado con el RUT ${datos.rut} (${existente.nombre}). Ve al módulo "Trabajadores" y usa "Editar ficha" en vez de crear uno nuevo.` };
  }

  if(!datos.nombre) return { ok:false, mensaje:'Ingresa el nombre del trabajador' };

  // RP-004: fecha de nacimiento válida y con año de 4 dígitos, no futura, no absurda
  if(!datos.fecha_nacimiento) return { ok:false, mensaje:'Ingresa la fecha de nacimiento' };
  const anioNac = parseInt((datos.fecha_nacimiento||'').split('-')[0], 10);
  const anioActual = new Date().getFullYear();
  if(!anioNac || String(anioNac).length !== 4 || anioNac < 1900 || anioNac > anioActual){
    return { ok:false, mensaje:'La fecha de nacimiento no es válida (año fuera de rango)' };
  }
  if(new Date(datos.fecha_nacimiento) > new Date()){
    return { ok:false, mensaje:'La fecha de nacimiento no puede ser futura' };
  }

  // ✅ NUEVO — Restricción de edad (Hallazgo Grande #10). Antes el sistema
  // no validaba nada más allá del rango de año, dejando registrar tanto a
  // menores de edad como a personas de 100+ años sin ningún aviso.
  const _hoy = new Date();
  const _fnac = new Date(datos.fecha_nacimiento);
  let edad = _hoy.getFullYear() - _fnac.getFullYear();
  const _mDiff = _hoy.getMonth() - _fnac.getMonth();
  if(_mDiff < 0 || (_mDiff === 0 && _hoy.getDate() < _fnac.getDate())) edad--;

  if(edad < 15){
    // Art. 13 Código del Trabajo: prohibido el trabajo de menores de 15
    // años, salvo excepciones muy puntuales que este sistema no cubre —
    // se bloquea directamente, sin opción de continuar.
    return { ok:false, mensaje:`No se puede registrar: el trabajador tiene ${edad} años. El Código del Trabajo (Art. 13) prohíbe el trabajo de menores de 15 años.` };
  }
  if(edad < 18){
    // Art. 13-16 Código del Trabajo: entre 15 y 17 años se permite solo
    // con autorización expresa de los padres/tutor y límites de horario y
    // tipo de trabajo — se pide confirmar que esa autorización existe,
    // en vez de bloquear directamente (puede ser un caso legítimo).
    const ok = confirm(
      `El trabajador tiene ${edad} años (menor de edad).\n\n`+
      `El Código del Trabajo exige autorización expresa de los padres o tutor legal, además de límites de horario y tipo de trabajo permitido, para contratar a un menor entre 15 y 17 años.\n\n`+
      `¿Confirmas que cuentas con esa autorización y quieres continuar con el registro?`
    );
    if(!ok) return { ok:false, mensaje:'Registro cancelado — se requiere autorización para contratar a un menor de edad.' };
  } else if(edad > 80){
    // Sin problema legal de fondo — solo un dato poco realista que vale
    // la pena confirmar antes de guardar, para descartar un error de
    // tipeo en la fecha de nacimiento.
    const ok = confirm(`El trabajador tendría ${edad} años según la fecha ingresada. ¿Es correcto, o fue un error al escribir la fecha de nacimiento?`);
    if(!ok) return { ok:false, mensaje:'Revisa la fecha de nacimiento antes de continuar.' };
  }

  // RP-005b: Sexo obligatorio (Hallazgo Grande #8)
  if(!datos.sexo) return { ok:false, mensaje:'Selecciona el Sexo del trabajador' };

  // RP-005: campos obligatorios
  if(!datos.empresa_propia_id) return { ok:false, mensaje:'Selecciona la Empresa Contratista' };
  // Mandante eliminado de aquí — ahora se define en Contratos (Hallazgo
  // Grande de Mandante, mismo criterio que Faena/Hallazgo #13). Igual
  // que Faena, el Mandante es un dato del vínculo contractual, no de
  // la persona; se fija recién al generar su primer Contrato.
  if(!datos.funcion_cargo)     return { ok:false, mensaje:'Ingresa el Cargo' };
  if(!datos.fecha_ingreso)     return { ok:false, mensaje:'Ingresa la Fecha de Ingreso' };

  // Validaciones migratorias — solo si corresponde según el tipo de situación migratoria
  if(esNacionalidadExtranjera(datos.nacionalidad)){
    if(!datos.tipo_doc_migratorio){
      return { ok:false, mensaje:'Selecciona la Situación Migratoria del trabajador extranjero' };
    }
    if(_fechaVencMigratorioObligatoria(datos.tipo_doc_migratorio) && !datos.fecha_venc_migratorio){
      return { ok:false, mensaje:'Ingresa la fecha de vencimiento del documento migratorio' };
    }
  }

  return { ok:true };
}

/* RP-009: la fecha de vencimiento solo es obligatoria para estas situaciones */
function _fechaVencMigratorioObligatoria(tipo){
  return tipo === 'Residencia Temporal' || tipo === 'Prórroga / Ampliación de Residencia (180 días)';
}

/* RP-008: estado automático del documento migratorio, calculado desde la fecha de vencimiento */
/* RP-008: estado del documento migratorio. Delega en _calcularSemaforo() (trabajadores.js)
   para que Registro Personal, Trabajadores y Alertas usen siempre el mismo criterio. */
function estadoDocumentoMigratorio(fecha){
  if(!fecha) return { texto:'Sin fecha', color:'var(--texto3)', emoji:'⚪' };
  const sem = _calcularSemaforo(fecha);
  const txt = new Date(fecha+'T12:00:00').toLocaleDateString('es-CL');
  const map = {
    negro:    { texto:`${txt} · Vencido`,               color:'#dc2626', emoji:'⚫' },
    rojo:     { texto:`${txt} · Vence pronto`,          color:'#dc2626', emoji:'🔴' },
    amarillo: { texto:`${txt} · Vigente (iniciar trámite)`, color:'#d97706', emoji:'🟡' },
    verde:    { texto:`${txt} · Vigente`,               color:'#16a34a', emoji:'🟢' },
  };
  return map[sem] || map.verde;
}

// buscarPorRUT() eliminada (Hallazgo Grande #7) — perdió utilidad al
// existir ya "Editar ficha" en Trabajadores, que hace exactamente lo
// mismo desde el lugar correcto.

function cargarEnFormulario(t){
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.value=v||''; };
  set('m-rut',           t.rut);
  set('m-nombre',        t.nombre);
  set('m-fecha-nac',     t.fecha_nacimiento);

  // ✅ Sexo primero, y regenerar las listas de Cargo/Estado Civil según
  // corresponda ANTES de fijar sus valores — si no hay sexo guardado
  // (registros de antes de este cambio), quedan en forma masculina por
  // defecto, igual que el resto del sistema.
  set('m-sexo', t.sexo);
  _actualizarListasPorSexo();

  // RP-015: trabajadores importados/creados antes de este cambio pueden
  // traer el Estado Civil en formato viejo con "/a" (ej. "Soltero/a") —
  // se normaliza a la forma correcta según el Sexo ya cargado arriba.
  const mapCivilLegacy = {'Soltero/a':'Soltero','Casado/a':'Casado','Divorciado/a':'Divorciado','Viudo/a':'Viudo'};
  const civilBase = mapCivilLegacy[t.estado_civil] || t.estado_civil;
  const filaCivil = ESTADO_CIVIL_PARES.find(p => p.includes(civilBase));
  set('m-estado-civil', filaCivil ? filaCivil[t.sexo === 'Mujer' ? 1 : 0] : civilBase);

  set('m-correo',        t.correo_electronico);
  set('m-domicilio',     t.domicilio);
  set('m-afp',           t.afiliacion_afp);
  set('m-salud',         t.sistema_salud);
  set('m-fecha-ingreso', t.fecha_ingreso);

  // Nacionalidad — verificar si es una opción del select o valor libre
  const nacSelect = document.getElementById('m-nacionalidad');
  if(nacSelect){
    const opciones = [...nacSelect.options].map(o => o.value);
    if(t.nacionalidad && opciones.includes(t.nacionalidad)){
      nacSelect.value = t.nacionalidad;
      // Limpiar campo "otro"
      const otroCampo = document.getElementById('m-otra-nac');
      if(otroCampo) otroCampo.value = '';
    } else if(t.nacionalidad){
      // Nacionalidad no está en las opciones — usar "otro"
      nacSelect.value = 'otro';
      const otroCampo = document.getElementById('m-otra-nac');
      if(otroCampo) otroCampo.value = t.nacionalidad;
    }
  }

  // Cargo
  const cargoSel = document.getElementById('m-cargo');
  if(cargoSel){
    const opciones = [...cargoSel.options].map(o => o.value);
    if(t.funcion_cargo && !opciones.includes(t.funcion_cargo)){
      cargoSel.value = 'otro';
      const otroInput = document.getElementById('cargo-otro');
      if(otroInput) otroInput.value = t.funcion_cargo;
    } else {
      cargoSel.value = t.funcion_cargo || '';
    }
  }

  // Empresa contratista (empresa propia empleadora)
  const cont = document.getElementById('m-empresa-contratista');
  if(cont) cont.value = t.empresa_propia_id || '';

  // Mandante eliminado de este formulario — vive en Contrato (ver
  // findMandante() en core.js, que ahora resuelve desde el Contrato
  // vigente vía la sincronización que hace contratos.js al guardar).

  // Campos migratorios — cargar ANTES de llamar mostrarCamposMigratorios
  const selTipoDoc = document.getElementById('m-tipo-doc-mig');
  if(selTipoDoc) selTipoDoc.value = t.tipo_doc_migratorio || '';
  const numDoc = document.getElementById('m-num-doc-mig');
  if(numDoc) numDoc.value = t.num_doc_migratorio || '';
  const fechaVenc = document.getElementById('m-fecha-venc-mig');
  if(fechaVenc) fechaVenc.value = t.fecha_venc_migratorio || '';

  // Disparar manualmente las funciones de visibilidad
  evaluarCampos();
  mostrarCamposMigratorios(); // muestra/oculta bloque migratorio según nacionalidad
  onCambioTipoDocMig();       // muestra/oculta fecha de vencimiento según tipo doc

  // RP-001/002: marcar que estamos EDITANDO este trabajador (por ID, no por RUT)
  const idField = document.getElementById('m-rut-original');
  if(idField) idField.value = t.id;

  document.getElementById('btn-guardar-txt').textContent = 'Actualizar trabajador';
  _actualizarFichaPreviewRegistro();
}

function limpiarFormulario(){
  document.getElementById('form-trabajador').reset();
  const idField = document.getElementById('m-rut-original');
  if(idField) idField.value='';
  document.getElementById('btn-guardar-txt').textContent='Registrar trabajador';
  evaluarCampos();
  _borrarBorrador();
  _actualizarFichaPreviewRegistro();
}

function evaluarCampos(){

  // ✅ Nacionalidad — campo "otro"
  const nacOtro = document.getElementById('nac-otro');
  const nacSelect = document.getElementById('m-nacionalidad');
  if(nacOtro && nacSelect){
    nacOtro.style.display = nacSelect.value === 'otro' ? 'block' : 'none';
  }

  // ✅ Bloque migratorio — siempre sincronizado con nacionalidad
  mostrarCamposMigratorios();

  // ✅ Cargo
  const cargoOtro = document.getElementById('cargo-otro');
  const cargoSelect = document.getElementById('m-cargo');
  if(cargoOtro && cargoSelect){
    cargoOtro.style.display = cargoSelect.value === 'otro' ? 'block' : 'none';
  }

  // ✅ ISAPRE
  const isapreGrupo = document.getElementById('isapre-grupo');
  const saludSelect = document.getElementById('m-salud');
  if(isapreGrupo && saludSelect){
    isapreGrupo.style.display = saludSelect.value === 'Isapre' ? 'block' : 'none';
  }
}

function _leerDatosFormularioRegistro(){
  let nac=document.getElementById('m-nacionalidad').value;
  if(nac==='otro')nac=document.getElementById('m-otra-nac').value.trim();

  let cargo = document.getElementById('m-cargo').value;
  if(cargo === 'otro') cargo = document.getElementById('cargo-otro').value.trim();

  return {
    rut:               document.getElementById('m-rut').value.trim(),
    nombre:            document.getElementById('m-nombre').value.trim(),
    nacionalidad:      nac,
    fecha_nacimiento:  document.getElementById('m-fecha-nac').value||null,
    sexo:              document.getElementById('m-sexo')?.value || '',
    estado_civil:      document.getElementById('m-estado-civil').value,
    correo_electronico:document.getElementById('m-correo').value.trim()||null,
    domicilio:         document.getElementById('m-domicilio').value.trim(),
    afiliacion_afp:    document.getElementById('m-afp').value,
    sistema_salud:     document.getElementById('m-salud').value,
    empresa_propia_id: document.getElementById('m-empresa-contratista')?.value || '',
    // Mandante eliminado de Registro Personal — se fija al generar el
    // Contrato (contratos.js sincroniza mandante_id — un solo campo,
    // hacia el trabajador cuando corresponda).
    funcion_cargo:     cargo || '',
    fecha_ingreso:     document.getElementById('m-fecha-ingreso')?.value || null,
    estado:            'activo',
    // Campos migratorios
    tipo_doc_migratorio:   document.getElementById('m-tipo-doc-mig')?.value || null,
    num_doc_migratorio:    document.getElementById('m-num-doc-mig')?.value.trim() || null,
    fecha_venc_migratorio: document.getElementById('m-fecha-venc-mig')?.value || null,
  };
}

async function guardarTrabajador(e){
  e.preventDefault();
  const idOriginal = document.getElementById('m-rut-original')?.value || '';
  const datos = _leerDatosFormularioRegistro();

  const validacion = validarFormularioTrabajador(datos, idOriginal);
  if(!validacion.ok){ toast(`⚠️ ${validacion.mensaje}`,'error'); return; }

  if(!supabaseClient){
    if(idOriginal){
      // Modo edición: actualizar por ID, nunca por RUT
      const idx = trabajadores.findIndex(t => t.id === idOriginal);
      if(idx >= 0) trabajadores[idx] = {...trabajadores[idx], ...datos};
      // ✅ Fecha de registro (Punto 2 del reporte de Contratos): timestamp
      // automático de cuándo se creó el trabajador, no editable. Solo se
      // fija al crear — nunca se sobreescribe en una edición.
      else trabajadores.push({id: idOriginal, creado_en: new Date().toISOString(), ...datos}); // por si el id venía de un borrador recuperado
    } else {
      // Modo registro nuevo: ya validamos que el RUT no existe, se crea con ID propio
      trabajadores.push({id: crypto.randomUUID(), creado_en: new Date().toISOString(), ...datos});
    }
    guardarLocal(); limpiarFormulario();
    _cerrarModalEditarTrabajadorSiAbierto();

    const btn = document.getElementById('btn-guardar-trabajador');
    const txt = document.getElementById('btn-guardar-txt');
    if(btn && txt){
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
      txt.textContent = 'Guardado ✅';
      setTimeout(() => {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
        txt.textContent = 'Registrar trabajador';
      }, 1500);
    }
    toast(`✅ ${datos.nombre} guardado localmente`,'exito'); return;
  }
  try{
    let err;
    if(idOriginal)({error:err}=await supabaseClient.from('trabajadores').update(datos).eq('id',idOriginal));
    else({error:err}=await supabaseClient.from('trabajadores').insert([{id: crypto.randomUUID(), creado_en: new Date().toISOString(), ...datos}]));
    if(err)throw err;
    await cargarDatos(); limpiarFormulario();
    _cerrarModalEditarTrabajadorSiAbierto();
    toast(`✅ ${datos.nombre} ${idOriginal?'actualizado':'registrado'} en la nube`,'exito');
  }catch(err){toast(`❌ Error: ${err.message}`,'error')}
}

/* ════════════════════════════════════════════════════════
   ENCABEZADO DE LA CUADRILLA — Empresa Propia / Cargo
   Mandante eliminado de aquí (Bypass de Mandante) — se elige
   recién al generar el Contrato de cada persona.
   Se elige DESPUÉS de validar el Excel (Opción B) y se confirma
   con el resumen antes de importar de verdad (ver
   abrirConfirmacionRegistroMasivo / confirmarImportacionMasiva).
   ════════════════════════════════════════════════════════ */
function _loteCompleto(){
  const ep     = document.getElementById('lote-empresa-propia')?.value || '';
  let   cargo  = document.getElementById('lote-cargo')?.value || '';
  if(cargo === 'otro') cargo = document.getElementById('lote-cargo-otro')?.value.trim() || '';
  return !!(ep && cargo);
}

function _onCambioCargoLote(){
  const sel  = document.getElementById('lote-cargo');
  const otro = document.getElementById('lote-cargo-otro');
  if(otro) otro.style.display = sel?.value === 'otro' ? 'block' : 'none';
  _actualizarEstadoLote();
}

function _actualizarEstadoLote(){
  const btn = document.getElementById('btn-subir-masivo');
  if(btn) btn.disabled = !(_loteCompleto() && datosExcel.length);
}

function _clickZonaDropExcel(){
  document.getElementById('archivo-excel').click();
}

function procesarExcel(event){
  const file = event.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb   = XLSX.read(e.target.result, {type:'binary', cellDates:true});
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {defval:''});

      if(!rows.length){ toast('\u26a0\ufe0f El archivo est\u00e1 vac\u00edo','error'); return; }

      // ✅ Opción B (carga masiva): el Excel se valida completo ANTES de
      // pedir Empresa Contratista y Cargo — ese encabezado se pide recién
      // al final, dentro de la previsualización (ver subirMasivo()).
      // Mandante eliminado del encabezado — se define en Contratos.

      const norm = v => (v||'').toString().trim()
        .toLowerCase().replace(/^\w/, c => c.toUpperCase());

      const mapNac   = {'chileno':'Chileno','colombiano':'Colombiano','peruano':'Peruano','boliviano':'Boliviano','venezolano':'Venezolano','ecuatoriano':'Ecuatoriano','haitiano':'Haitiano','argentino':'Argentino','otro':'Otro'};
      const mapCivil = {'soltero':'Soltero','soltera':'Soltera','casado':'Casado','casada':'Casada','divorciado':'Divorciado','divorciada':'Divorciada','viudo':'Viudo','viuda':'Viuda','conviviente':'Conviviente'};
      const mapSexo  = {'hombre':'Hombre','masculino':'Hombre','m':'Hombre','mujer':'Mujer','femenino':'Mujer','f':'Mujer'};
      const mapAfp   = {'habitat':'Habitat','provida':'Provida','capital':'Capital','cuprum':'Cuprum','planvital':'Planvital','modelo':'Modelo','uno':'Uno','no cotiza':'No cotiza'};
      const mapSalud = {'fonasa':'Fonasa','banmedica':'Isapre Banm\u00e9dica','cruz blanca':'Isapre Cruz Blanca','colmena':'Isapre Colmena','consalud':'Isapre Consalud','esencial':'Isapre Esencial','vida tres':'Isapre Vida Tres','isapre banmedica':'Isapre Banm\u00e9dica','isapre cruz blanca':'Isapre Cruz Blanca','isapre colmena':'Isapre Colmena','isapre consalud':'Isapre Consalud'};

      const normalizar = (val, mapa) => {
        const key = (val||'').toString().trim().toLowerCase();
        return mapa[key] || norm(val);
      };

      const fmtFecha = v => {
        if(!v) return null;
        if(v instanceof Date) return v.toISOString().split('T')[0];
        return v.toString().trim() || null;
      };

      datosExcel = [];
      errores = [];
      advertencias = [];
      const rutsVistosEnArchivo = new Set();

      rows.forEach((row, i) => {
        const fila   = i + 2;
        const rut    = (row['RUT'] || row['Rut'] || row['rut'] || '').toString().trim();
        const nombre = (row['Nombre'] || row['NOMBRE'] || '').toString().trim();

        if(!rut || !nombre){
          errores.push({ fila, nombre: nombre||'(sin nombre)', mensaje:`Falta ${!rut&&!nombre?'RUT y Nombre':!rut?'el RUT':'el Nombre'}`, correccion:'Completa ambas columnas — son obligatorias para poder crear el registro.' });
          return;
        }
        if(!validarRUT(rut)){
          errores.push({ fila, nombre, mensaje:`RUT "${rut}" inválido`, correccion:'Revisa el dígito verificador (después del guion). Ej: 12.345.678-5.' });
          return;
        }
        const yaExiste = trabajadores.find(t => t.rut === rut);
        if(yaExiste){
          errores.push({ fila, nombre, mensaje:`El RUT "${rut}" ya está registrado (${yaExiste.nombre})`, correccion:'Esta fila no se importará para evitar sobrescribir al trabajador existente. Si necesitas actualizar sus datos, hazlo desde "Trabajadores" → "Editar ficha".' });
          return;
        }
        if(rutsVistosEnArchivo.has(rut)){
          errores.push({ fila, nombre, mensaje:`El RUT "${rut}" está repetido dentro de este mismo archivo`, correccion:'Deja una sola fila por trabajador en el Excel y vuelve a subirlo.' });
          return;
        }
        rutsVistosEnArchivo.add(rut);

        const fecha_nacimiento = fmtFecha(row['Fecha Nacimiento'] || row['fecha_nacimiento']);
        if(!fecha_nacimiento){
          errores.push({ fila, nombre, mensaje:'Falta la Fecha de Nacimiento', correccion:'Completa la columna "Fecha Nacimiento" en formato AAAA-MM-DD — es obligatoria.' });
          return;
        }
        const anioNac = parseInt(fecha_nacimiento.split('-')[0], 10);
        if(String(anioNac).length !== 4 || anioNac < 1900 || anioNac > new Date().getFullYear()){
          errores.push({ fila, nombre, mensaje:`Fecha de Nacimiento inválida ("${fecha_nacimiento}")`, correccion:'Revisa que el año tenga 4 dígitos y esté dentro de un rango válido (1900–hoy).' });
          return;
        }

        // ✅ NUEVO — Restricción de edad (Hallazgo Grande #10), adaptada al
        // import masivo: sin confirm() por fila (sería inmanejable con
        // muchos trabajadores), en su lugar bloquea directo bajo 15 años,
        // y deja advertencia (no bloquea) para 15-17 y mayores de 80.
        const _hoyBulk  = new Date();
        const _fnacBulk = new Date(fecha_nacimiento);
        let _edadBulk = _hoyBulk.getFullYear() - _fnacBulk.getFullYear();
        const _mDiffBulk = _hoyBulk.getMonth() - _fnacBulk.getMonth();
        if(_mDiffBulk < 0 || (_mDiffBulk === 0 && _hoyBulk.getDate() < _fnacBulk.getDate())) _edadBulk--;
        if(_edadBulk < 15){
          errores.push({ fila, nombre, mensaje:`El trabajador tendría ${_edadBulk} años — el Código del Trabajo (Art. 13) prohíbe contratar menores de 15 años`, correccion:'Verifica la Fecha de Nacimiento; si es correcta, esta persona no puede registrarse.' });
          return;
        }
        if(_edadBulk < 18){
          advertencias.push({ fila, nombre, mensaje:`Es menor de edad (${_edadBulk} años)`, correccion:'Requiere autorización expresa de padres/tutor y límites de horario según el Código del Trabajo (Art. 13-16) — verifícalo antes de asignarle contrato.' });
        } else if(_edadBulk > 80){
          advertencias.push({ fila, nombre, mensaje:`Tendría ${_edadBulk} años según la fecha ingresada`, correccion:'Verifica que la Fecha de Nacimiento no tenga un error de tipeo.' });
        }

        const fecha_ingreso = fmtFecha(row['Fecha Ingreso'] || row['fecha_ingreso']);
        if(!fecha_ingreso){
          errores.push({ fila, nombre, mensaje:'Falta la Fecha de Ingreso', correccion:'Completa la columna "Fecha Ingreso" en formato AAAA-MM-DD — es obligatoria.' });
          return;
        }

        const nacionalidad = normalizar(row['Nacionalidad'] || row['NACIONALIDAD'], mapNac);
        const tipo_doc_migratorio   = (row['Tipo Doc. Migratorio']  || row['tipo_doc_migratorio']  || '').toString().trim();
        const num_doc_migratorio    = (row['N° Doc. Migratorio']    || row['num_doc_migratorio']   || '').toString().trim();
        const fecha_venc_migratorio = fmtFecha(row['Fecha Venc. Documento'] || row['fecha_venc_migratorio']);

        if(esNacionalidadExtranjera(nacionalidad)){
          if(_fechaVencMigratorioObligatoria(tipo_doc_migratorio) && !fecha_venc_migratorio){
            errores.push({ fila, nombre, mensaje:`Falta la fecha de vencimiento (obligatoria para "${tipo_doc_migratorio}")`, correccion:'Completa la columna "Fecha Venc. Documento" en formato AAAA-MM-DD, o cambia la Situación Migratoria si no corresponde.' });
            return;
          }
          if(!tipo_doc_migratorio){
            advertencias.push({ fila, nombre, mensaje:'Trabajador extranjero sin Situación Migratoria indicada', correccion:'Completa la columna "Tipo Doc. Migratorio" cuando la tengas — mientras tanto se importará sin esa información.' });
          } else if(!fecha_venc_migratorio){
            advertencias.push({ fila, nombre, mensaje:'Trabajador extranjero sin fecha de vencimiento de documento', correccion:'Agrega la fecha en la columna "Fecha Venc. Documento" — mientras falte, el semáforo de vencimiento no mostrará alertas para esta persona.' });
          }
        }

        // RP-014: correo con formato inválido no bloquea la fila — se importa
        // el trabajador igual, pero sin el correo, y queda como advertencia.
        const correoRaw = (row['Correo'] || row['correo_electronico'] || '').toString().trim();
        const correoValido = c => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(c);
        let correo_electronico = correoRaw;
        if(correoRaw && !correoValido(correoRaw)){
          advertencias.push({ fila, nombre, mensaje:`Correo "${correoRaw}" con formato inválido`, correccion:'No se importó ese correo (probablemente tiene tildes, ñ o espacios) — agrégalo manualmente después desde el formulario individual.' });
          correo_electronico = '';
        }

        const sexoRaw = (row['Sexo'] || row['sexo'] || '').toString().trim().toLowerCase();
        const sexo = mapSexo[sexoRaw] || '';
        if(!sexo){
          errores.push({ fila, nombre, mensaje:'Falta el Sexo (Hombre/Mujer)', correccion:'Completa la columna "Sexo" — es obligatoria.' });
          return;
        }

        const civilBase = normalizar(row['Estado Civil'] || row['estado_civil'], mapCivil);
        const filaCivil = ESTADO_CIVIL_PARES.find(p => p.includes(civilBase));
        const estado_civil = filaCivil ? filaCivil[sexo === 'Mujer' ? 1 : 0] : civilBase;

        const trabajador = {
          id:                crypto.randomUUID(),
          rut, nombre,
          nacionalidad,
          fecha_nacimiento,
          sexo,
          estado_civil,
          domicilio:         (row['Domicilio']  || '').toString().trim(),
          correo_electronico:correo_electronico,
          afiliacion_afp:    normalizar(row['AFP']  || row['afp'],   mapAfp),
          sistema_salud:     normalizar(row['Salud']|| row['salud'], mapSalud),
          tipo_doc_migratorio:   tipo_doc_migratorio || null,
          num_doc_migratorio:    num_doc_migratorio || null,
          fecha_venc_migratorio: fecha_venc_migratorio || null,
          // ✅ Empresa Propia y Cargo ya NO se leen aquí — se piden al
          // final, en subirMasivo(), después de validar todo el Excel
          // (Opción B). Mandante y Faena tampoco existen aquí: ambos se
          // definen recién al generar el Contrato de cada persona.
          fecha_ingreso,
          estado:            'activo'
        };

        datosExcel.push(trabajador);
      });

      if(!datosExcel.length){
        toast('\u274c Ning\u00fan registro v\u00e1lido para importar','error');
        _renderAvisosImportacion(errores, advertencias);
        event.target.value = '';
        return;
      }

      const thead = document.querySelector('#tabla-excel thead');
      const tbody = document.querySelector('#tabla-excel tbody');
      thead.innerHTML = `<tr>
        <th>RUT</th><th>Nombre</th><th>Nacionalidad</th><th>F. Nacimiento</th><th>Sexo</th><th>Estado Civil</th>
        <th>Domicilio</th><th>Correo</th><th>AFP</th><th>Salud</th><th>F. Ingreso</th>
        <th>Tipo Doc. Mig.</th><th>N° Doc. Mig.</th><th>Venc. Doc. Mig.</th>
      </tr>`;
      tbody.innerHTML = datosExcel.map(t => {
        const estMig = t.fecha_venc_migratorio ? estadoDocumentoMigratorio(t.fecha_venc_migratorio) : null;
        return `<tr>
        <td class="rut-mono">${t.rut}</td><td>${t.nombre}</td><td>${t.nacionalidad||'—'}</td>
        <td>${t.fecha_nacimiento||'—'}</td><td>${t.sexo||'—'}</td><td>${t.estado_civil||'—'}</td>
        <td>${t.domicilio||'—'}</td><td>${t.correo_electronico||'—'}</td>
        <td>${t.afiliacion_afp||'—'}</td><td>${t.sistema_salud||'—'}</td>
        <td>${t.fecha_ingreso||'—'}</td>
        <td>${t.tipo_doc_migratorio||'—'}</td><td>${t.num_doc_migratorio||'—'}</td>
        <td>${estMig ? `<span style="color:${estMig.color};font-weight:600;">${estMig.emoji} ${estMig.texto}</span>` : '—'}</td>
      </tr>`;
      }).join('');

      let countMsg = `${datosExcel.length} trabajador${datosExcel.length!==1?'es':''} listo${datosExcel.length!==1?'s':''} para importar`;
      if(errores.length) countMsg += ` \u00b7 ${errores.length} fila${errores.length!==1?'s':''} con error (omitida${errores.length!==1?'s':''})`;
      if(advertencias.length) countMsg += ` \u00b7 ${advertencias.length} aviso${advertencias.length!==1?'s':''}`;
      document.getElementById('preview-count').textContent = countMsg;
      document.getElementById('seccion-preview').style.display = 'block';
      _renderAvisosImportacion(errores, advertencias);
      _actualizarEstadoLote();

    } catch(err){
      toast('\u274c Error al leer el archivo Excel','error');
      console.error(err);
    }
  };
  reader.readAsBinaryString(file);
}

function _renderAvisosImportacion(errores, advertencias){
  const cont = document.getElementById('preview-avisos');
  if(!cont) return;

  if(!errores.length && !advertencias.length){ cont.innerHTML = ''; return; }

  let html = '';
  if(errores.length){
    html += `<div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:700;color:#991B1B;margin-bottom:6px;">
        <i class="ti ti-alert-triangle"></i> ${errores.length} fila${errores.length!==1?'s':''} con error — no se importar${errores.length!==1?'án':'á'}
      </div>
      ${errores.map(e => `<div style="font-size:12px;color:#7F1D1D;padding:4px 0;border-top:1px solid #FECACA;">
        <strong>Fila ${e.fila}${e.nombre?` (${e.nombre})`:''}:</strong> ${e.mensaje}<br>
        <span style="color:#B91C1C;">→ ${e.correccion}</span>
      </div>`).join('')}
    </div>`;
  }
  if(advertencias.length){
    html += `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;">
      <div style="font-size:13px;font-weight:700;color:#92400E;margin-bottom:6px;">
        <i class="ti ti-info-circle"></i> ${advertencias.length} aviso${advertencias.length!==1?'s':''} — se importar${advertencias.length!==1?'án':'á'} igual, pero revisa esto
      </div>
      ${advertencias.map(a => `<div style="font-size:12px;color:#78350F;padding:4px 0;border-top:1px solid #FDE68A;">
        <strong>Fila ${a.fila}${a.nombre?` (${a.nombre})`:''}:</strong> ${a.mensaje}<br>
        <span style="color:#92400E;">→ ${a.correccion}</span>
      </div>`).join('')}
    </div>`;
  }
  cont.innerHTML = html;
}

let _ultimosRutsImportadosMasivo = [];

let _loteEmpresaPropiaPendiente = '';
let _loteCargoPendiente = '';

function subirMasivo(){
  if(!datosExcel.length){ toast('\u26a0\ufe0f No hay datos para importar','error'); return; }

  // ✅ Opción B — el encabezado (Empresa Contratista + Cargo) se valida
  // recién aquí, al confirmar la importación, no antes de subir el Excel.
  if(!_loteCompleto()){
    toast('⚠️ Completa Empresa Contratista y Cargo antes de importar', 'error');
    return;
  }
  const loteEmpresaPropia = document.getElementById('lote-empresa-propia').value;
  let   loteCargo         = document.getElementById('lote-cargo').value;
  if(loteCargo === 'otro') loteCargo = document.getElementById('lote-cargo-otro').value.trim();

  // RP-013: si el archivo tiene filas con error, nunca se importa en silencio —
  // se pide confirmación explícita indicando cuántos entran y cuántos se quedan fuera.
  if((errores||[]).length){
    const n = errores.length;
    const ok = confirm(
      `Este archivo tiene ${n} fila${n!==1?'s':''} con error.\n\n`+
      `Se importarán los ${datosExcel.length} trabajador${datosExcel.length!==1?'es':''} válido${datosExcel.length!==1?'s':''}.\n`+
      `${n} fila${n!==1?'s':''} con error NO se importará${n!==1?'n':''} — corrígelas y súbelas en un archivo aparte si quieres incluirlas.\n\n`+
      `¿Continuar con la importación parcial?`
    );
    if(!ok) return;
  }

  // Guardamos el encabezado validado para usarlo al confirmar — los
  // selects podrían limpiarse/cambiar mientras el modal está abierto.
  _loteEmpresaPropiaPendiente = loteEmpresaPropia;
  _loteCargoPendiente = loteCargo;
  abrirConfirmacionRegistroMasivo();
}

/* ✅ Pantalla de confirmación — mismo criterio que Contrato Masivo:
   revisar el resumen (Empresa/Cargo/Trabajadores) antes de confirmar,
   para pescar un encabezado mal elegido antes de importar de verdad. */
function abrirConfirmacionRegistroMasivo(){
  const epObj = empresas_propias.find(e => e.id === _loteEmpresaPropiaPendiente);
  const total = datosExcel.length;

  document.getElementById('conf-reg-masivo-empresa').textContent = epObj?.nombre || epObj?.razon_social || '—';
  document.getElementById('conf-reg-masivo-cargo').textContent   = _loteCargoPendiente || '—';
  document.getElementById('conf-reg-masivo-total').textContent   = total;
  document.getElementById('conf-reg-masivo-frase').textContent   =
    `Los ${total} trabajador${total!==1?'es':''} ser${total!==1?'án':'á'} contratado${total!==1?'s':''} con este mismo cargo y las mismas condiciones.`;

  document.getElementById('modal-confirmacion-registro-masivo').style.display = 'flex';
}

function cerrarModalConfirmacionRegistroMasivo(){
  document.getElementById('modal-confirmacion-registro-masivo').style.display = 'none';
}

/* Importación real — recién ocurre al confirmar en el modal de arriba. */
function confirmarImportacionMasiva(){
  const loteEmpresaPropia = _loteEmpresaPropiaPendiente;
  const loteCargo = _loteCargoPendiente;

  let importados = 0;

  let omitidos = 0;
  const rutsImportados = [];
  datosExcel.forEach(trabajador => {
    // Defensa de última hora: si entre la previsualización y ahora alguien ya
    // registró ese RUT (ej. por otra pestaña), no lo sobrescribimos.
    const yaExiste = trabajadores.find(t => t.rut === trabajador.rut);
    if(yaExiste){ omitidos++; return; }
    // Empresa Propia y Cargo recién se aplican ahora, con el encabezado
    // elegido al final (Opción B).
    trabajador.empresa_propia_id = loteEmpresaPropia;
    trabajador.funcion_cargo     = loteCargo;
    // ✅ Fecha de registro (Punto 2 del reporte de Contratos) — mismo
    // criterio que el alta individual.
    trabajador.creado_en         = new Date().toISOString();
    trabajadores.push(trabajador);
    rutsImportados.push(trabajador.rut);
    importados++;
  });

  guardarLocal(); poblarSelects();

  cerrarModalConfirmacionRegistroMasivo();

  // ✅ Ya no se abre el modal de "Asignación Masiva" — todo el lote ya
  // quedó asignado desde el encabezado elegido antes de subir. Se deja
  // un "Deshacer" simple como red de seguridad por si la cuadrilla se
  // configuró mal, en vez del modal completo de antes.
  _ultimosRutsImportadosMasivo = rutsImportados;
  let msg = `\u2705 ${importados} trabajador${importados!==1?'es':''} importado${importados!==1?'s':''}`;
  if(omitidos) msg += ` · ${omitidos} omitido${omitidos!==1?'s':''} (RUT ya existente)`;
  toast(msg, 'exito');

  const avisoDeshacer = document.getElementById('lote-aviso-deshacer');
  if(avisoDeshacer && rutsImportados.length){
    avisoDeshacer.style.display = 'flex';
    avisoDeshacer.querySelector('span').textContent =
      `${rutsImportados.length} trabajador${rutsImportados.length!==1?'es':''} recién importado${rutsImportados.length!==1?'s':''} — ¿la cuadrilla quedó mal configurada?`;
  }

  datosExcel = [];
  errores = [];
  advertencias = [];
  document.getElementById('seccion-preview').style.display = 'none';
  document.getElementById('archivo-excel').value = '';
  const avisos = document.getElementById('preview-avisos');
  if(avisos) avisos.innerHTML = '';
  // Limpiar el encabezado para el próximo archivo, evita arrastrar por
  // error la Empresa/Cargo de un lote anterior a uno nuevo.
  const selEp = document.getElementById('lote-empresa-propia');
  const selCargo = document.getElementById('lote-cargo');
  const otroCargo = document.getElementById('lote-cargo-otro');
  if(selEp) selEp.value = '';
  if(selCargo) selCargo.value = '';
  if(otroCargo){ otroCargo.value = ''; otroCargo.style.display = 'none'; }

  if(typeof cargarTrabajadores === 'function') cargarTrabajadores();
  if(typeof renderContratistas === 'function') renderContratistas();
}

/* Deshace la última importación masiva (borra a los recién importados).
   Reemplaza al "Deshacer importación" del modal anterior — mismo
   propósito, versión simplificada acorde al nuevo flujo. */
function deshacerUltimaImportacionMasiva(){
  if(!_ultimosRutsImportadosMasivo.length) return;
  const n = _ultimosRutsImportadosMasivo.length;
  if(!confirm(`¿Deshacer la última importación? Se eliminarán los ${n} trabajador${n!==1?'es':''} recién importado${n!==1?'s':''}. Esta acción no se puede deshacer.`)) return;

  trabajadores = trabajadores.filter(t => !_ultimosRutsImportadosMasivo.includes(t.rut));
  guardarLocal();
  toast(`🗑️ ${n} trabajador${n!==1?'es':''} eliminado${n!==1?'s':''} — importación deshecha`, 'exito');

  _ultimosRutsImportadosMasivo = [];
  const avisoDeshacer = document.getElementById('lote-aviso-deshacer');
  if(avisoDeshacer) avisoDeshacer.style.display = 'none';

  if(typeof cargarTrabajadores === 'function') cargarTrabajadores();
  if(typeof renderContratistas === 'function') renderContratistas();
}

function cancelarMasivo(){
  datosExcel = [];
  errores = [];
  advertencias = [];
  document.getElementById('seccion-preview').style.display = 'none';
  document.getElementById('archivo-excel').value = '';
  const avisos = document.getElementById('preview-avisos');
  if(avisos) avisos.innerHTML = '';
  const selEp = document.getElementById('lote-empresa-propia');
  const selCargo = document.getElementById('lote-cargo');
  const otroCargo = document.getElementById('lote-cargo-otro');
  if(selEp) selEp.value = '';
  if(selCargo) selCargo.value = '';
  if(otroCargo){ otroCargo.value = ''; otroCargo.style.display = 'none'; }
}


// onCambioMandanteRegistro() eliminada — Faena ya no vive en Registro
// Personal (Hallazgo Grande #13). El campo se define recién en Contratos.

/* ── CAMPOS MIGRATORIOS ─────────────────────────────────── */
function mostrarCamposMigratorios(){
  const nac    = document.getElementById('m-nacionalidad')?.value || '';
  const bloque = document.getElementById('bloque-migratorio');
  if(!bloque) return;
  const esExtranjero = esNacionalidadExtranjera(nac);
  bloque.style.display = esExtranjero ? 'block' : 'none';
  onCambioTipoDocMig();
}

function onCambioTipoDocMig(){
  const tipo  = document.getElementById('m-tipo-doc-mig')?.value || '';
  const grupo = document.getElementById('grupo-fecha-venc-mig');
  const nota  = document.getElementById('nota-res-definitiva');
  const lbl   = document.getElementById('lbl-fecha-venc-mig');
  const input = document.getElementById('m-fecha-venc-mig');
  if(!grupo) return;

  grupo.style.display = tipo ? 'block' : 'none';
  if(nota) nota.style.display = tipo === 'Residencia Definitiva' ? 'block' : 'none';

  const obligatoria = _fechaVencMigratorioObligatoria(tipo);
  if(input) input.required = obligatoria;
  if(lbl){
    lbl.textContent = tipo === 'Residencia Definitiva'
      ? 'Vencimiento cédula de identidad (opcional)'
      : `Fecha de vencimiento${obligatoria ? ' *' : ' (opcional)'}`;
  }
  _actualizarSemaforoMigratorio();
}

/* RP-008: semáforo en vivo junto al campo, mientras se completa el formulario */
function _actualizarSemaforoMigratorio(){
  const fecha = document.getElementById('m-fecha-venc-mig')?.value;
  const badge = document.getElementById('semaforo-venc-mig');
  if(!badge) return;
  if(!fecha){ badge.innerHTML = ''; return; }
  const est = estadoDocumentoMigratorio(fecha);
  badge.innerHTML = `<span style="color:${est.color};font-weight:600;font-size:12px;">${est.emoji} ${est.texto}</span>`;
}

/* Las funciones del modal "Asignación Masiva" (abrirModalAsignacionMasiva,
   onCambioMandanteAsignacionMasiva, toggleSeleccionarTodosMasivo,
   onCambioCargoAsignacionMasiva, aplicarAsignacionMasiva,
   deshacerImportacionMasiva, cerrarModalAsignacionMasiva) se eliminaron
   por completo — reemplazadas por el encabezado del lote antes de subir
   el Excel (ver _actualizarEstadoLote, _loteCompleto más arriba, y
   deshacerUltimaImportacionMasiva junto a subirMasivo). Hallazgo #12/#13.

/* ════════════════════════════════════════════════════════
   RP-003 — BORRADOR AUTOMÁTICO DEL FORMULARIO
   Guarda el progreso en localStorage mientras se completa el
   formulario, y ofrece recuperarlo si la página se recarga o
   se abandona antes de guardar.
   ════════════════════════════════════════════════════════ */
const _BORRADOR_KEY = 'rp_borrador_trabajador';
const _CAMPOS_BORRADOR = [
  'm-rut','m-nombre','m-nacionalidad','m-otra-nac','m-fecha-nac','m-sexo','m-estado-civil',
  'm-correo','m-domicilio','m-afp','m-salud','m-empresa-contratista',
  'm-cargo','cargo-otro','m-fecha-ingreso',
  'm-tipo-doc-mig','m-num-doc-mig','m-fecha-venc-mig','m-rut-original',
];

function _autoguardarBorrador(){
  // No guardamos borrador mientras se está EDITANDO un trabajador existente —
  // solo protege el registro de uno nuevo, para no mezclar flujos.
  const idOriginal = document.getElementById('m-rut-original')?.value;
  if(idOriginal) return;

  const campos = {};
  let tieneContenido = false;
  _CAMPOS_BORRADOR.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    campos[id] = el.value;
    if(el.value && id !== 'm-rut-original') tieneContenido = true;
  });

  if(!tieneContenido){ _borrarBorrador(); return; }

  try{
    localStorage.setItem(_BORRADOR_KEY, JSON.stringify({ campos, ts: Date.now() }));
  }catch(e){ /* localStorage lleno o bloqueado — no es crítico, se ignora */ }
}

function _borrarBorrador(){
  try{ localStorage.removeItem(_BORRADOR_KEY); }catch(e){}
  const banner = document.getElementById('rp-banner-borrador');
  if(banner) banner.remove();
}

function _verificarBorradorPendiente(){
  let guardado;
  try{ guardado = JSON.parse(localStorage.getItem(_BORRADOR_KEY) || 'null'); }catch(e){ guardado = null; }
  if(!guardado || !guardado.campos) return;

  const form = document.getElementById('form-trabajador');
  if(!form || document.getElementById('rp-banner-borrador')) return;

  const fecha = new Date(guardado.ts).toLocaleString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const nombre = guardado.campos['m-nombre'] || '(sin nombre)';

  const banner = document.createElement('div');
  banner.id = 'rp-banner-borrador';
  banner.style.cssText = 'background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;';
  banner.innerHTML = `
    <div style="font-size:13px;color:#92400E;">
      <i class="ti ti-alert-triangle"></i>
      Tienes un formulario sin guardar (<strong>${nombre}</strong>) del ${fecha}.
    </div>
    <div style="display:flex;gap:8px;">
      <button type="button" class="btn btn-primary btn-sm" onclick="_recuperarBorrador()">Recuperar</button>
      <button type="button" class="btn btn-secondary btn-sm" onclick="_descartarBorrador()">Descartar</button>
    </div>`;
  form.parentNode.insertBefore(banner, form);
}

function _recuperarBorrador(){
  let guardado;
  try{ guardado = JSON.parse(localStorage.getItem(_BORRADOR_KEY) || 'null'); }catch(e){ guardado = null; }
  if(!guardado || !guardado.campos) return;

  Object.entries(guardado.campos).forEach(([id, valor]) => {
    const el = document.getElementById(id);
    if(el) el.value = valor;
  });

  // Cargo y Estado Civil dependen del Sexo — se reconstruyen según el
  // Sexo recién restaurado, y se reaplica el valor guardado del borrador
  // (el forEach de arriba pudo no aplicarlo si esa opción todavía no
  // existía en la lista por defecto antes de conocer el Sexo).
  _actualizarListasPorSexo();
  if(guardado.campos['m-cargo']){
    const selCargo = document.getElementById('m-cargo');
    if(selCargo && [...selCargo.options].some(o => o.value === guardado.campos['m-cargo'])){
      selCargo.value = guardado.campos['m-cargo'];
    }
  }
  if(guardado.campos['m-estado-civil']){
    const selCivil = document.getElementById('m-estado-civil');
    if(selCivil && [...selCivil.options].some(o => o.value === guardado.campos['m-estado-civil'])){
      selCivil.value = guardado.campos['m-estado-civil'];
    }
  }

  evaluarCampos();
  mostrarCamposMigratorios();
  onCambioTipoDocMig();
  _actualizarFichaPreviewRegistro();

  const banner = document.getElementById('rp-banner-borrador');
  if(banner) banner.remove();
  toast('✅ Borrador recuperado', 'exito');
}

function _descartarBorrador(){
  if(!confirm('¿Descartar el formulario sin guardar? Esta acción no se puede deshacer.')) return;
  _borrarBorrador();
  toast('🗑️ Borrador descartado', 'exito');
}

function _initBorradorAutosave(){
  const form = document.getElementById('form-trabajador');
  if(!form || form.dataset.borradorInit) return;
  form.dataset.borradorInit = '1';
  form.addEventListener('input', _autoguardarBorrador);
  form.addEventListener('change', _autoguardarBorrador);
  form.addEventListener('input', _actualizarFichaPreviewRegistro);
  form.addEventListener('change', _actualizarFichaPreviewRegistro);
  document.getElementById('m-fecha-venc-mig')?.addEventListener('input', _actualizarSemaforoMigratorio);

  // RP-004: la fecha de nacimiento nunca puede ser futura
  const fechaNac = document.getElementById('m-fecha-nac');
  if(fechaNac) fechaNac.max = new Date().toISOString().split('T')[0];

  _verificarBorradorPendiente();
  _actualizarFichaPreviewRegistro(); // primer render (formulario vacío o borrador recuperado)
}

/* Ficha en vivo — reutiliza _renderDatosPersonalesPerfil() (trabajadores.js)
   con los datos que se van completando en el formulario, sin guardar. */
function _actualizarFichaPreviewRegistro(){
  if(typeof _renderDatosPersonalesPerfil !== 'function') return;
  const datos = _leerDatosFormularioRegistro();
  _renderDatosPersonalesPerfil(datos, 'registro-ficha-preview');
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _initBorradorAutosave);
} else {
  _initBorradorAutosave();
}
