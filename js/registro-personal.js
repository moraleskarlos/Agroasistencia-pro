/* ════ REGISTRO PERSONAL ════ */

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
  // Cargo: si no coincide con ninguna opción predefinida, usar modo "Otro"
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
  // Empresa contratista (solo lectura)
  const cont = document.getElementById('m-empresa-contratista');
  if(cont) cont.value = cfg.empresa?.razon_social || '';
  // Mandante
  const selEmp = document.getElementById('m-empresa');
  if(selEmp){ selEmp.value = t.empresa_rut||''; onCambioMandanteRegistro(t.faena_obra); }  document.getElementById('btn-guardar-txt').textContent='Actualizar trabajador';
  evaluarCampos();
}

function limpiarFormulario(){
  document.getElementById('form-trabajador').reset();
  document.getElementById('rut-buscar').value='';
  document.getElementById('btn-guardar-txt').textContent='Registrar trabajador';
  evaluarCampos();
}

function evaluarCampos(){

  // ✅ Nacionalidad
  const nacOtro = document.getElementById('nac-otro');
  const nacSelect = document.getElementById('m-nacionalidad');

  if(nacOtro && nacSelect){
    nacOtro.style.display =
      nacSelect.value === 'otro'
      ? 'block'
      : 'none';
  }

  // ✅ Cargo (aunque ahora no lo uses, queda seguro)
  const cargoOtro = document.getElementById('cargo-otro');
  const cargoSelect = document.getElementById('m-cargo');

  if(cargoOtro && cargoSelect){
    cargoOtro.style.display =
      cargoSelect.value === 'otro'
      ? 'block'
      : 'none';
  }

  // ✅ ISAPRE
  const isapreGrupo = document.getElementById('isapre-grupo');
  const saludSelect = document.getElementById('m-salud');

  if(isapreGrupo && saludSelect){
    isapreGrupo.style.display =
      saludSelect.value === 'Isapre'
      ? 'block'
      : 'none';
  }

}

async function guardarTrabajador(e){
  e.preventDefault();
  let nac=document.getElementById('m-nacionalidad').value;
  if(nac==='otro')nac=document.getElementById('m-otra-nac').value.trim();

  let cargo = document.getElementById('m-cargo').value;
  if(cargo === 'otro') cargo = document.getElementById('cargo-otro').value.trim();
  
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
    empresa_rut:       document.getElementById('m-empresa')?.value || '',
    empresa:           document.getElementById('m-empresa')?.value || '',
    mandante_id:       document.getElementById('m-empresa')?.value || '',
    faena_obra:        document.getElementById('m-faena')?.value || '',
    funcion_cargo:     cargo || '',
    fecha_ingreso:     document.getElementById('m-fecha-ingreso')?.value || null,
    estado:            'activo'
  };
  if(!supabaseClient){
    const idx=trabajadores.findIndex(t=>t.rut===datos.rut);
    if(idx>=0)trabajadores[idx]={...trabajadores[idx],...datos};
    else trabajadores.push({id:Date.now().toString(),...datos});
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
    const existe=trabajadores.find(t=>t.rut===datos.rut);
    let err;
    if(existe)({error:err}=await supabaseClient.from('trabajadores').update(datos).eq('rut',datos.rut));
    else({error:err}=await supabaseClient.from('trabajadores').insert([datos]));
    if(err)throw err;
    await cargarDatos(); limpiarFormulario();
    toast(`✅ ${datos.nombre} ${existe?'actualizado':'registrado'} en la nube`,'exito');
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

      rows.forEach((row, i) => {
        const fila   = i + 2;
        const rut    = (row['RUT'] || row['Rut'] || row['rut'] || '').toString().trim();
        const nombre = (row['Nombre'] || row['NOMBRE'] || '').toString().trim();

        if(!rut || !nombre){ errores.push(`Fila ${fila}: RUT o Nombre vac\u00edo`); return; }
        if(!validarRUT(rut)){ errores.push(`Fila ${fila}: RUT "${rut}" inv\u00e1lido`); return; }

        const trabajador = {
          id:                Date.now().toString() + i,
          rut, nombre,
          nacionalidad:      normalizar(row['Nacionalidad']    || row['NACIONALIDAD'],   mapNac),
          fecha_nacimiento:  fmtFecha(row['Fecha Nacimiento']  || row['fecha_nacimiento']),
          estado_civil:      normalizar(row['Estado Civil']    || row['estado_civil'],   mapCivil),
          domicilio:         (row['Domicilio']  || '').toString().trim(),
          correo_electronico:(row['Correo']     || row['correo_electronico'] || '').toString().trim(),
          afiliacion_afp:    normalizar(row['AFP']  || row['afp'],   mapAfp),
          sistema_salud:     normalizar(row['Salud']|| row['salud'], mapSalud),
          empresa_rut:       '',
          empresa:           '',
          fecha_ingreso:     fmtFecha(row['Fecha Ingreso'] || row['fecha_ingreso']),
          estado:            'activo'
        };

        datosExcel.push(trabajador);
      });

      if(!datosExcel.length){
        toast('\u274c Ning\u00fan registro v\u00e1lido para importar','error');
        if(errores.length) console.warn('Errores importaci\u00f3n:', errores);
        event.target.value = '';
        return;
      }

      const thead = document.querySelector('#tabla-excel thead');
      const tbody = document.querySelector('#tabla-excel tbody');
      thead.innerHTML = '<tr><th>RUT</th><th>Nombre</th><th>Nacionalidad</th><th>AFP</th><th>Salud</th></tr>';
      tbody.innerHTML = datosExcel.map(t => `<tr><td>${t.rut}</td><td>${t.nombre}</td><td>${t.nacionalidad}</td><td>${t.afiliacion_afp}</td><td>${t.sistema_salud}</td></tr>`).join('');

      let countMsg = `${datosExcel.length} trabajador${datosExcel.length!==1?'es':''} listo${datosExcel.length!==1?'s':''} para importar`;
      if(errores.length) countMsg += ` \u00b7 \u26a0\ufe0f ${errores.length} fila${errores.length!==1?'s':''} con error (omitida${errores.length!==1?'s':''})`;
      document.getElementById('preview-count').textContent = countMsg;
      document.getElementById('seccion-preview').style.display = 'block';
      if(errores.length) console.warn('Errores importaci\u00f3n:', errores);

    } catch(err){
      toast('\u274c Error al leer el archivo Excel','error');
      console.error(err);
    }
  };
  reader.readAsBinaryString(file);
}

function subirMasivo(){
  if(!datosExcel.length){ toast('\u26a0\ufe0f No hay datos para importar','error'); return; }

  let importados = 0;
  datosExcel.forEach(trabajador => {
    const existe = trabajadores.findIndex(t => t.rut === trabajador.rut);
    if(existe >= 0) trabajadores[existe] = {...trabajadores[existe], ...trabajador};
    else trabajadores.push(trabajador);
    importados++;
  });

  guardarLocal(); poblarSelects();

  toast(`\u2705 ${importados} trabajador${importados!==1?'es':''} importado${importados!==1?'s':''}`, 'exito');

  datosExcel = [];
  document.getElementById('seccion-preview').style.display = 'none';
  document.getElementById('archivo-excel').value = '';
}

function cancelarMasivo(){
  datosExcel = [];
  document.getElementById('seccion-preview').style.display = 'none';
  document.getElementById('archivo-excel').value = '';
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
