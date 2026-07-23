/* ════ REGISTRO PERSONAL ════ */

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
    return { ok:false, mensaje:`Ya existe un trabajador registrado con el RUT ${datos.rut} (${existente.nombre}). Usa "Buscar por RUT" para editarlo en vez de crear uno nuevo.` };
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

  // RP-005: campos obligatorios
  if(!datos.empresa_propia_id) return { ok:false, mensaje:'Selecciona la Empresa Contratista' };
  if(!datos.mandante_id)       return { ok:false, mensaje:'Selecciona la Empresa Mandante' };
  if(!datos.faena_obra)        return { ok:false, mensaje:'Selecciona la Faena' };
  if(!datos.funcion_cargo)     return { ok:false, mensaje:'Ingresa el Cargo' };
  if(!datos.fecha_ingreso)     return { ok:false, mensaje:'Ingresa la Fecha de Ingreso' };

  // Validaciones migratorias — solo si corresponde según el tipo de situación migratoria
  if(datos.nacionalidad && datos.nacionalidad !== 'Chileno'){
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
function estadoDocumentoMigratorio(fecha){
  if(!fecha) return { texto:'Sin fecha', color:'var(--texto3)', emoji:'⚪' };
  const dias = (new Date(fecha) - new Date()) / (1000*60*60*24);
  const txt  = new Date(fecha).toLocaleDateString('es-CL');
  if(dias < 0)   return { texto:`${txt} · Vencido`,      color:'#dc2626', emoji:'🔴' };
  if(dias <= 30) return { texto:`${txt} · Por vencer`,   color:'#d97706', emoji:'🟡' };
  return           { texto:`${txt} · Vigente`,           color:'#16a34a', emoji:'🟢' };
}

async function buscarPorRUT(){
  const rut=document.getElementById('rut-buscar').value.trim();
  if(!rut){toast('⚠️ Ingresa un RUT','error');return;}
  const t=trabajadores.find(w=>w.rut===rut);
  if(!t){toast('⚠️ RUT no encontrado en el sistema','error');return;}
  cargarEnFormulario(t); toast(`✅ Datos de ${t.nombre} cargados`,'exito');
}

function cargarEnFormulario(t){
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.value=v||''; };
  set('m-rut',           t.rut);
  set('m-nombre',        t.nombre);
  set('m-fecha-nac',     t.fecha_nacimiento);
  set('m-estado-civil',  t.estado_civil);
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

  // Mandante
  const selEmp = document.getElementById('m-empresa');
  if(selEmp){ selEmp.value = t.mandante_id || t.empresa_rut || ''; onCambioMandanteRegistro(t.faena_obra); }

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
}

function limpiarFormulario(){
  document.getElementById('form-trabajador').reset();
  document.getElementById('rut-buscar').value='';
  const idField = document.getElementById('m-rut-original');
  if(idField) idField.value='';
  document.getElementById('btn-guardar-txt').textContent='Registrar trabajador';
  evaluarCampos();
  _borrarBorrador();
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

async function guardarTrabajador(e){
  e.preventDefault();
  let nac=document.getElementById('m-nacionalidad').value;
  if(nac==='otro')nac=document.getElementById('m-otra-nac').value.trim();

  let cargo = document.getElementById('m-cargo').value;
  if(cargo === 'otro') cargo = document.getElementById('cargo-otro').value.trim();

  const idOriginal = document.getElementById('m-rut-original')?.value || '';

  const datos={
    rut:               document.getElementById('m-rut').value.trim(),
    nombre:            document.getElementById('m-nombre').value.trim(),
    nacionalidad:      nac,
    fecha_nacimiento:  document.getElementById('m-fecha-nac').value||null,
    estado_civil:      document.getElementById('m-estado-civil').value,
    correo_electronico:document.getElementById('m-correo').value.trim()||null,
    domicilio:         document.getElementById('m-domicilio').value.trim(),
    afiliacion_afp:    document.getElementById('m-afp').value,
    sistema_salud:     document.getElementById('m-salud').value,
    empresa_propia_id: document.getElementById('m-empresa-contratista')?.value || '',
    empresa_rut:       document.getElementById('m-empresa')?.value || '',
    empresa:           document.getElementById('m-empresa')?.value || '',
    mandante_id:       document.getElementById('m-empresa')?.value || '',
    faena_obra:        document.getElementById('m-faena')?.value || '',
    funcion_cargo:     cargo || '',
    fecha_ingreso:     document.getElementById('m-fecha-ingreso')?.value || null,
    estado:            'activo',
    // Campos migratorios
    tipo_doc_migratorio:   document.getElementById('m-tipo-doc-mig')?.value || null,
    num_doc_migratorio:    document.getElementById('m-num-doc-mig')?.value.trim() || null,
    fecha_venc_migratorio: document.getElementById('m-fecha-venc-mig')?.value || null,
  };

  const validacion = validarFormularioTrabajador(datos, idOriginal);
  if(!validacion.ok){ toast(`⚠️ ${validacion.mensaje}`,'error'); return; }

  if(!supabaseClient){
    if(idOriginal){
      // Modo edición: actualizar por ID, nunca por RUT
      const idx = trabajadores.findIndex(t => t.id === idOriginal);
      if(idx >= 0) trabajadores[idx] = {...trabajadores[idx], ...datos};
      else trabajadores.push({id: idOriginal, ...datos}); // por si el id venía de un borrador recuperado
    } else {
      // Modo registro nuevo: ya validamos que el RUT no existe, se crea con ID propio
      trabajadores.push({id: crypto.randomUUID(), ...datos});
    }
    guardarLocal(); limpiarFormulario();

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
    else({error:err}=await supabaseClient.from('trabajadores').insert([{id: crypto.randomUUID(), ...datos}]));
    if(err)throw err;
    await cargarDatos(); limpiarFormulario();
    toast(`✅ ${datos.nombre} ${idOriginal?'actualizado':'registrado'} en la nube`,'exito');
  }catch(err){toast(`❌ Error: ${err.message}`,'error')}
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

      const norm = v => (v||'').toString().trim()
        .toLowerCase().replace(/^\w/, c => c.toUpperCase());

      const mapNac   = {'chileno':'Chileno','colombiano':'Colombiano','peruano':'Peruano','boliviano':'Boliviano','venezolano':'Venezolano','ecuatoriano':'Ecuatoriano','haitiano':'Haitiano','argentino':'Argentino','otro':'Otro'};
      const mapCivil = {'soltero':'Soltero','casado':'Casado','divorciado':'Divorciado','viudo':'Viudo','conviviente':'Conviviente'};
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
      let errores = [];
      let advertencias = [];
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
          errores.push({ fila, nombre, mensaje:`El RUT "${rut}" ya está registrado (${yaExiste.nombre})`, correccion:'Esta fila no se importará para evitar sobrescribir al trabajador existente. Si necesitas actualizar sus datos, hazlo desde "Buscar por RUT" en el registro individual.' });
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

        const fecha_ingreso = fmtFecha(row['Fecha Ingreso'] || row['fecha_ingreso']);
        if(!fecha_ingreso){
          errores.push({ fila, nombre, mensaje:'Falta la Fecha de Ingreso', correccion:'Completa la columna "Fecha Ingreso" en formato AAAA-MM-DD — es obligatoria.' });
          return;
        }

        const nacionalidad = normalizar(row['Nacionalidad'] || row['NACIONALIDAD'], mapNac);
        const tipo_doc_migratorio   = (row['Tipo Doc. Migratorio']  || row['tipo_doc_migratorio']  || '').toString().trim();
        const num_doc_migratorio    = (row['N° Doc. Migratorio']    || row['num_doc_migratorio']   || '').toString().trim();
        const fecha_venc_migratorio = fmtFecha(row['Fecha Venc. Documento'] || row['fecha_venc_migratorio']);

        if(nacionalidad && nacionalidad !== 'Chileno'){
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

        const trabajador = {
          id:                crypto.randomUUID(),
          rut, nombre,
          nacionalidad,
          fecha_nacimiento,
          estado_civil:      normalizar(row['Estado Civil']    || row['estado_civil'],   mapCivil),
          domicilio:         (row['Domicilio']  || '').toString().trim(),
          correo_electronico:(row['Correo']     || row['correo_electronico'] || '').toString().trim(),
          afiliacion_afp:    normalizar(row['AFP']  || row['afp'],   mapAfp),
          sistema_salud:     normalizar(row['Salud']|| row['salud'], mapSalud),
          tipo_doc_migratorio:   tipo_doc_migratorio || null,
          num_doc_migratorio:    num_doc_migratorio || null,
          fecha_venc_migratorio: fecha_venc_migratorio || null,
          empresa_propia_id: '',
          mandante_id:       '',
          empresa_rut:       '',
          empresa:           '',
          funcion_cargo:     (row['Cargo'] || row['cargo'] || '').toString().trim(),
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
        <th>RUT</th><th>Nombre</th><th>Nacionalidad</th><th>F. Nacimiento</th><th>Estado Civil</th>
        <th>Domicilio</th><th>Correo</th><th>AFP</th><th>Salud</th><th>F. Ingreso</th><th>Cargo</th>
        <th>Tipo Doc. Mig.</th><th>N° Doc. Mig.</th><th>Venc. Doc. Mig.</th>
      </tr>`;
      tbody.innerHTML = datosExcel.map(t => {
        const estMig = t.fecha_venc_migratorio ? estadoDocumentoMigratorio(t.fecha_venc_migratorio) : null;
        return `<tr>
        <td>${t.rut}</td><td>${t.nombre}</td><td>${t.nacionalidad||'—'}</td>
        <td>${t.fecha_nacimiento||'—'}</td><td>${t.estado_civil||'—'}</td>
        <td>${t.domicilio||'—'}</td><td>${t.correo_electronico||'—'}</td>
        <td>${t.afiliacion_afp||'—'}</td><td>${t.sistema_salud||'—'}</td>
        <td>${t.fecha_ingreso||'—'}</td><td>${t.funcion_cargo||'—'}</td>
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

function subirMasivo(){
  if(!datosExcel.length){ toast('\u26a0\ufe0f No hay datos para importar','error'); return; }

  let importados = 0;
  let omitidos = 0;
  const rutsImportados = [];
  datosExcel.forEach(trabajador => {
    // Defensa de última hora: si entre la previsualización y ahora alguien ya
    // registró ese RUT (ej. por otra pestaña), no lo sobrescribimos.
    const yaExiste = trabajadores.find(t => t.rut === trabajador.rut);
    if(yaExiste){ omitidos++; return; }
    trabajadores.push(trabajador);
    rutsImportados.push(trabajador.rut);
    importados++;
  });

  guardarLocal(); poblarSelects();

  let msg = `\u2705 ${importados} trabajador${importados!==1?'es':''} importado${importados!==1?'s':''}`;
  if(omitidos) msg += ` · ${omitidos} omitido${omitidos!==1?'s':''} (RUT ya existente)`;
  toast(msg, 'exito');

  datosExcel = [];
  document.getElementById('seccion-preview').style.display = 'none';
  document.getElementById('archivo-excel').value = '';
  const avisos = document.getElementById('preview-avisos');
  if(avisos) avisos.innerHTML = '';

  if(rutsImportados.length) abrirModalAsignacionMasiva(rutsImportados);
}

function cancelarMasivo(){
  datosExcel = [];
  document.getElementById('seccion-preview').style.display = 'none';
  document.getElementById('archivo-excel').value = '';
  const avisos = document.getElementById('preview-avisos');
  if(avisos) avisos.innerHTML = '';
}


function onCambioMandanteRegistro(faenaPreseleccionada){
  const rutMandante = document.getElementById('m-empresa')?.value || '';
  const selFaena    = document.getElementById('m-faena');
  if(!selFaena) return;

  // Buscar faenas del mandante (estructura futura: mandante.faenas[])
  // Por ahora se leen desde el array global `faenas` si existe, o se muestra campo libre
  const mandante    = empresas.find(e=>e.id===rutMandante || e.rut===rutMandante);
  const listFaenas  = (mandante?.faenas || []);

  if(listFaenas.length){
    selFaena.innerHTML = '<option value="">— Seleccionar faena —</option>'
      + listFaenas.map(f=>`<option value="${f.nombre||f}">${f.nombre||f}</option>`).join('');
  } else {
    selFaena.innerHTML = rutMandante
      ? '<option value="">Sin faenas registradas (se puede escribir en Mandantes)</option>'
      : '<option value="">— Selecciona primero un mandante —</option>';
  }

  if(faenaPreseleccionada) selFaena.value=faenaPreseleccionada;
}

/* ── CAMPOS MIGRATORIOS ─────────────────────────────────── */
function mostrarCamposMigratorios(){
  const nac    = document.getElementById('m-nacionalidad')?.value || '';
  const bloque = document.getElementById('bloque-migratorio');
  if(!bloque) return;
  const esExtranjero = nac && nac !== 'Chileno' && nac !== '';
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

/* ════════════════════════════════════════════════════════
   MODAL DE ASIGNACIÓN MASIVA — Empresa / Mandante / Cargo
   Se abre automáticamente después de una carga masiva por Excel
   ════════════════════════════════════════════════════════ */
let _ruts_asignacion_masiva = [];

function abrirModalAsignacionMasiva(ruts){
  _ruts_asignacion_masiva = ruts;
  const modal = document.getElementById('modal-asignacion-masiva');
  if(!modal) return;

  const selEP  = document.getElementById('am-empresa-propia');
  const selMan = document.getElementById('am-mandante');
  if(selEP)  selEP.innerHTML  = '<option value="">— Sin cambio —</option>' + (empresas_propias||[]).map(e => `<option value="${e.id}">${e.nombre||e.razon_social}</option>`).join('');
  if(selMan) selMan.innerHTML = '<option value="">— Sin cambio —</option>' + (empresas||[]).map(e => `<option value="${e.id||e.rut}">${e.nombre}</option>`).join('');
  const selFaena = document.getElementById('am-faena');
  if(selFaena) selFaena.innerHTML = '<option value="">— Selecciona primero un mandante —</option>';
  const cargo = document.getElementById('am-cargo');
  if(cargo) cargo.value = '';

  const lista = document.getElementById('am-lista-trabajadores');
  if(lista){
    lista.innerHTML = ruts.map(rut => {
      const t = trabajadores.find(x => x.rut === rut);
      return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--borde);">
        <input type="checkbox" class="am-check-trab" value="${rut}" checked style="width:auto;">
        ${t?.nombre || rut} · <span style="color:var(--texto3);font-size:12px;">${rut}</span>
      </label>`;
    }).join('');
  }
  const chkTodos = document.getElementById('am-check-todos');
  if(chkTodos) chkTodos.checked = true;

  const contador = document.getElementById('am-contador');
  if(contador) contador.textContent = `${ruts.length} trabajador${ruts.length!==1?'es':''} recién importado${ruts.length!==1?'s':''}`;

  modal.style.display = 'flex';
}

function onCambioMandanteAsignacionMasiva(){
  const manId    = document.getElementById('am-mandante')?.value || '';
  const selFaena = document.getElementById('am-faena');
  if(!selFaena) return;

  const mandante   = empresas.find(e => e.id === manId || e.rut === manId);
  const listFaenas = (mandante?.faenas || []);

  if(!manId){
    selFaena.innerHTML = '<option value="">— Selecciona primero un mandante —</option>';
  } else if(listFaenas.length){
    selFaena.innerHTML = '<option value="">— Sin cambio —</option>'
      + listFaenas.map(f => `<option value="${f.nombre||f}">${f.nombre||f}</option>`).join('');
  } else {
    selFaena.innerHTML = '<option value="">Sin faenas registradas (se agregan desde Mandantes)</option>';
  }
}

function toggleSeleccionarTodosMasivo(){
  const todos = document.getElementById('am-check-todos')?.checked;
  document.querySelectorAll('.am-check-trab').forEach(chk => chk.checked = todos);
}

function aplicarAsignacionMasiva(){
  const epId    = document.getElementById('am-empresa-propia')?.value || '';
  const manId   = document.getElementById('am-mandante')?.value || '';
  const faena   = document.getElementById('am-faena')?.value || '';
  const cargo   = document.getElementById('am-cargo')?.value.trim() || '';

  const seleccionados = Array.from(document.querySelectorAll('.am-check-trab:checked')).map(chk => chk.value);
  if(!seleccionados.length){ toast('⚠️ Selecciona al menos un trabajador', 'error'); return; }
  if(!epId && !manId && !faena && !cargo){ toast('⚠️ Elige empresa, mandante, faena o cargo para aplicar', 'error'); return; }

  let aplicados = 0;
  seleccionados.forEach(rut => {
    const t = trabajadores.find(x => x.rut === rut);
    if(!t) return;
    if(epId)  t.empresa_propia_id = epId;
    if(manId){ t.mandante_id = manId; t.empresa_rut = manId; t.empresa = manId; }
    if(faena) t.faena_obra = faena;
    if(cargo) t.funcion_cargo = cargo;
    aplicados++;
  });

  guardarLocal();
  toast(`✅ Empresa/mandante asignados a ${aplicados} trabajador${aplicados!==1?'es':''}`, 'exito');

  // Sacar de la lista a los ya aplicados, dejar el modal abierto por si quedan grupos distintos
  _ruts_asignacion_masiva = _ruts_asignacion_masiva.filter(r => !seleccionados.includes(r));
  if(_ruts_asignacion_masiva.length){
    abrirModalAsignacionMasiva(_ruts_asignacion_masiva);
  } else {
    cerrarModalAsignacionMasiva();
  }

  if(typeof cargarTrabajadores === 'function') cargarTrabajadores();
  if(typeof renderContratistas === 'function') renderContratistas();
}

function cerrarModalAsignacionMasiva(){
  const modal = document.getElementById('modal-asignacion-masiva');
  if(modal) modal.style.display = 'none';
  _ruts_asignacion_masiva = [];
}

/* ════════════════════════════════════════════════════════
   RP-003 — BORRADOR AUTOMÁTICO DEL FORMULARIO
   Guarda el progreso en localStorage mientras se completa el
   formulario, y ofrece recuperarlo si la página se recarga o
   se abandona antes de guardar.
   ════════════════════════════════════════════════════════ */
const _BORRADOR_KEY = 'rp_borrador_trabajador';
const _CAMPOS_BORRADOR = [
  'm-rut','m-nombre','m-nacionalidad','m-otra-nac','m-fecha-nac','m-estado-civil',
  'm-correo','m-domicilio','m-afp','m-salud','m-empresa-contratista','m-empresa',
  'm-faena','m-cargo','cargo-otro','m-fecha-ingreso',
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

  evaluarCampos();
  mostrarCamposMigratorios();
  onCambioTipoDocMig();
  onCambioMandanteRegistro(guardado.campos['m-faena']);

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
  document.getElementById('m-fecha-venc-mig')?.addEventListener('input', _actualizarSemaforoMigratorio);

  // RP-004: la fecha de nacimiento nunca puede ser futura
  const fechaNac = document.getElementById('m-fecha-nac');
  if(fechaNac) fechaNac.max = new Date().toISOString().split('T')[0];

  _verificarBorradorPendiente();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _initBorradorAutosave);
} else {
  _initBorradorAutosave();
}
