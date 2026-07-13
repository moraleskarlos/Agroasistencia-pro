/* ════════════════════════════════════════════════════════
   EXPORTAR.JS — Todas las funciones de exportación Excel
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

/* ── 1. NÓMINA DE TRABAJADORES ─────────────────────────── */
function exportarTrabajadoresExcel(){
  if(!trabajadores.length){
    toast('⚠️ Sin datos para exportar','error');
    return;
  }

  const data = trabajadores.map(t => {
    const mandante = findMandante(t);
    const cont     = contratos.find(c => c.trabajador_id === t.id || c.trabajador_rut === t.rut);
    const fmt      = v => v ? new Date(v).toLocaleDateString('es-CL') : '';

    return {
      RUT:                    t.rut,
      'Nombre Completo':      t.nombre,
      Nacionalidad:           t.nacionalidad || '',
      'Fecha Nacimiento':     fmt(t.fecha_nacimiento),
      'Estado Civil':         t.estado_civil || '',
      'Correo Electrónico':   t.correo_electronico || '',
      Domicilio:              t.domicilio || '',
      AFP:                    t.afiliacion_afp || '',
      'Sistema de Salud':     t.sistema_salud || '',
      'Empresa Mandante':     mandante?.nombre || '',
      'RUT Mandante':         mandante?.rut || '',
      Faena:                  t.faena_obra || '',
      Cargo:                  t.funcion_cargo || '',
      'Fecha Ingreso':        fmt(t.fecha_ingreso),
      Estado:                 t.estado === 'activo' ? 'Activo' : 'Inactivo',
      Contrato:               cont ? 'Firmado' : 'Pendiente',
      'Fecha Firma Contrato': fmt(cont?.fecha_firma),
      'Sueldo Base':          cont?.sueldo_monto ? '$' + parseInt(cont.sueldo_monto).toLocaleString('es-CL') : '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  // Ajustar ancho de columnas automáticamente
  const anchos = Object.keys(data[0] || {}).map(key => {
    const maxLen = Math.max(key.length, ...data.map(row => String(row[key]||'').length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 35) };
  });
  ws['!cols'] = anchos;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trabajadores');
  XLSX.writeFile(wb, `Nomina_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.xlsx`);
  toast('⬇️ Nómina exportada con todos los campos','exito');
}

/* ── 2. PLANTILLA EXCEL PARA CARGA MASIVA ──────────────── */
function descargarPlantilla(){
  const wb = XLSX.utils.book_new();

  /* Hoja 1: Ejemplo con trabajador de muestra */
  const ejemplo = [{
    'RUT':               '12.345.678-9',
    'Nombre':            'Juan Pérez González',
    'Nacionalidad':      'Chileno',
    'Fecha Nacimiento':  '1990-05-15',
    'Estado Civil':      'Soltero',
    'Domicilio':         'Av. Principal 123, Curicó',
    'Correo':            'juan.perez@gmail.com',
    'AFP':               'Habitat',
    'Salud':             'Fonasa',
    'Fecha Ingreso':     '2026-01-10',
    'Tipo Doc. Migratorio':  '',
    'N° Doc. Migratorio':    '',
    'Fecha Venc. Documento': '',
  }];
  const ws1 = XLSX.utils.json_to_sheet(ejemplo);
  ws1['!cols'] = [
    {wch:14},{wch:24},{wch:12},{wch:16},{wch:12},
    {wch:28},{wch:26},{wch:10},{wch:10},{wch:14},
    {wch:22},{wch:16},{wch:18}
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '1. Datos');

  /* Hoja 2: Diccionario de valores válidos */
  const dict = [
    { Campo:'RUT',              'Formato / Valores aceptados':'12.345.678-9  (con puntos y guión)',                                                                   Obligatorio:'Sí',  Ejemplo:'12.345.678-9' },
    { Campo:'Nombre',           'Formato / Valores aceptados':'Nombre completo',                                                                                       Obligatorio:'Sí',  Ejemplo:'Juan Pérez González' },
    { Campo:'Nacionalidad',     'Formato / Valores aceptados':'Chileno · Colombiano · Peruano · Boliviano · Venezolano · Ecuatoriano · Haitiano · Argentino · Otro',   Obligatorio:'Sí',  Ejemplo:'Chileno' },
    { Campo:'Fecha Nacimiento', 'Formato / Valores aceptados':'AAAA-MM-DD',                                                                                            Obligatorio:'Sí',  Ejemplo:'1990-05-15' },
    { Campo:'Estado Civil',     'Formato / Valores aceptados':'Soltero · Casado · Divorciado · Viudo · Conviviente',                                                   Obligatorio:'Sí',  Ejemplo:'Soltero' },
    { Campo:'Domicilio',        'Formato / Valores aceptados':'Texto libre (calle, número, ciudad)',                                                                    Obligatorio:'Sí',  Ejemplo:'Av. Principal 123, Curicó' },
    { Campo:'Correo',           'Formato / Valores aceptados':'correo@dominio.com',                                                                                    Obligatorio:'No',  Ejemplo:'juan@gmail.com' },
    { Campo:'AFP',              'Formato / Valores aceptados':'Habitat · Provida · Capital · Cuprum · Planvital · Modelo · Uno · No cotiza',                           Obligatorio:'Sí',  Ejemplo:'Habitat' },
    { Campo:'Salud',            'Formato / Valores aceptados':'Fonasa · Isapre Banmédica · Isapre Cruz Blanca · Isapre Colmena · Isapre Consalud · Isapre Esencial',  Obligatorio:'Sí',  Ejemplo:'Fonasa' },
    { Campo:'Fecha Ingreso',    'Formato / Valores aceptados':'AAAA-MM-DD',                                                                                            Obligatorio:'No',  Ejemplo:'2026-01-10' },
    { Campo:'Tipo Doc. Migratorio',  'Formato / Valores aceptados':'Residencia Temporal · Visa Temporaria / Sujeta a Contrato · Visa de Temporada · Residencia Definitiva · Visa de Estudiante · Otro', Obligatorio:'Solo si no es chileno', Ejemplo:'Visa Temporaria / Sujeta a Contrato' },
    { Campo:'N° Doc. Migratorio',    'Formato / Valores aceptados':'Texto libre',                                                                                      Obligatorio:'Solo si no es chileno', Ejemplo:'123456789' },
    { Campo:'Fecha Venc. Documento', 'Formato / Valores aceptados':'AAAA-MM-DD',                                                                                       Obligatorio:'Solo si no es chileno', Ejemplo:'2026-12-31' },
  ];
  const ws2 = XLSX.utils.json_to_sheet(dict);
  ws2['!cols'] = [{wch:16},{wch:70},{wch:12},{wch:26}];
  XLSX.utils.book_append_sheet(wb, ws2, '2. Valores válidos');

  XLSX.writeFile(wb, 'Plantilla_Trabajadores.xlsx');
  toast('⬇️ Plantilla descargada — revisa las 2 hojas','exito');
}

/* ── 3. ASISTENCIA EXCEL ───────────────────────────────── */
function exportarAsistenciaExcel(){
  const fecha = document.getElementById('asist-fecha')?.value;
  if(!fecha){ toast('⚠️ Selecciona una fecha primero','error'); return; }

  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]');

  if(!data.length){ toast('⚠️ Sin marcaciones para exportar','error'); return; }

  const rows = data.map(r => {
    const t     = trabajadores.find(x => x.rut === r.rut);
    const emp   = empresas.find(e =>
      e.id  === (t?.mandante_id || t?.empresa || t?.empresa_rut) ||
      e.rut === (t?.empresa || t?.empresa_rut)
    );
    const estado = !r.hora_entrada ? 'Pendiente' : !r.hora_salida ? 'Activo' : 'Cerrado';

    return {
      Fecha:              r.fecha,
      RUT:                r.rut,
      Nombre:             t?.nombre || '',
      Mandante:           emp?.nombre || '',
      'Registrado por':   r.registrado_por || '',
      'Hora Entrada':     r.hora_entrada || '',
      'Hora Salida':      r.hora_salida || '',
      'Total Horas':      r.horas_trabajadas != null ? Number(r.horas_trabajadas).toFixed(1) : '',
      Jornada:            r.jornada || '',
      'Valor Jornada':    r.jornada_valor != null ? r.jornada_valor : '',
      Estado:             estado,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    {wch:12},{wch:14},{wch:28},{wch:22},{wch:16},
    {wch:12},{wch:12},{wch:12},{wch:12},{wch:13},{wch:10}
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
  XLSX.writeFile(wb, `Asistencia_${fecha}.xlsx`);
  toast('⬇️ Asistencia exportada','exito');
}

/* ── 4. ASISTENCIA POR MANDANTE ────────────────────────── */
function exportarAsistenciaPorMandante(){
  const fecha = document.getElementById('asist-fecha')?.value || new Date().toISOString().split('T')[0];
  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]');

  if(!data.length){ toast('⚠️ Sin marcaciones para exportar','error'); return; }
  if(!empresas.length){ toast('⚠️ Sin mandantes registrados','error'); return; }

  const wb = XLSX.utils.book_new();

  empresas.forEach(emp => {
    const trabsEmp = trabajadores.filter(t =>
      findMandante(t)?.id === emp.id || findMandante(t)?.rut === emp.rut
    );
    const registros = data.filter(r => trabsEmp.some(t => t.rut === r.rut));

    if(!registros.length) return; // omitir mandantes sin marcaciones ese día

    const rows = registros.map(r => {
      const t      = trabajadores.find(x => x.rut === r.rut);
      const estado = !r.hora_entrada ? 'Pendiente' : !r.hora_salida ? 'Activo' : 'Cerrado';
      return {
        RUT:              r.rut,
        Nombre:           t?.nombre || '',
        Cargo:            t?.funcion_cargo || '',
        Faena:            t?.faena_obra || '',
        'Hora Entrada':   r.hora_entrada || '',
        'Hora Salida':    r.hora_salida || '',
        'Total Horas':    r.horas_trabajadas != null ? Number(r.horas_trabajadas).toFixed(1) : '',
        Jornada:          r.jornada || '',
        Estado:           estado,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:14},{wch:28},{wch:18},{wch:20},{wch:12},{wch:12},{wch:12},{wch:12},{wch:10}];
    // Nombre de hoja: máx 31 caracteres (límite Excel)
    const nombreHoja = emp.nombre.slice(0,31).replace(/[:\\\/\?\*\[\]]/g,'');
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  });

  if(!wb.SheetNames.length){
    toast('⚠️ Sin marcaciones por mandante para exportar','error');
    return;
  }

  XLSX.writeFile(wb, `Asistencia_por_mandante_${fecha}.xlsx`);
  toast(`⬇️ Exportado por mandante — ${wb.SheetNames.length} hoja${wb.SheetNames.length>1?'s':''}`, 'exito');
}

/* ── 5. EMPRESAS (PROPIAS + MANDANTES) ─────────────────── */
function exportarEmpresasExcel(){
  if(!empresas_propias.length && !empresas.length){
    toast('⚠️ Sin datos para exportar','error');
    return;
  }

  const wb = XLSX.utils.book_new();

  if(empresas_propias.length){
    const ws1 = XLSX.utils.json_to_sheet(empresas_propias.map(ep => ({
      'Razón Social':    ep.nombre,
      RUT:               ep.rut,
      Representante:     ep.nombre_representante || ep.representante || '',
      'RUT Rep.':        ep.rut_representante || '',
      Correo:            ep.correo || '',
      Teléfono:          ep.telefono || '',
      Ciudad:            ep.ciudad || '',
      Dirección:         ep.direccion || '',
      Trabajadores:      trabajadores.filter(t => t.empresa_propia_id === ep.id).length,
    })));
    ws1['!cols'] = [{wch:28},{wch:14},{wch:24},{wch:14},{wch:26},{wch:14},{wch:14},{wch:28},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws1, 'Mis Empresas');
  }

  if(empresas.length){
    const ws2 = XLSX.utils.json_to_sheet(empresas.map(e => ({
      Mandante:        e.nombre,
      RUT:             e.rut,
      Representante:   e.nombre_representante || '',
      'RUT Rep.':      e.rut_representante || '',
      Correo:          e.correo || '',
      Teléfono:        e.telefono || '',
      Dirección:       e.direccion || '',
      Comuna:          e.comuna || '',
      Región:          e.region || '',
      Vencimiento:     e.vigencia_contrato || '',
      Trabajadores:    trabajadores.filter(t => findMandante(t)?.id === e.id).length,
      Activos:         trabajadores.filter(t => findMandante(t)?.id === e.id && t.estado === 'activo').length,
    })));
    ws2['!cols'] = [{wch:28},{wch:14},{wch:24},{wch:14},{wch:26},{wch:14},{wch:28},{wch:16},{wch:20},{wch:14},{wch:13},{wch:9}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Mandantes');
  }

  XLSX.writeFile(wb, `Empresas_${new Date().toLocaleDateString('es-CL').replace(/\//g,'-')}.xlsx`);
  toast('⬇️ Empresas exportadas correctamente','exito');
}
