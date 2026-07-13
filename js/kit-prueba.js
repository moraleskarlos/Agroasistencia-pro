/* ════════════════════════════════════════════════════════
   KIT-PRUEBA.JS — Kit 1: datos "buenos" para probar
   Remuneraciones de punta a punta (junio 2026)
   Carga: 2 empresas propias, 4 mandantes, 12 trabajadores
   (8 chilenos + 4 extranjeros), contratos, anexos, asistencia
   de junio completo, novedades, haberes y descuentos.
   No toca los indicadores previsionales si ya existen para
   el período (no pisa lo que Carlos ya cargó a mano).
   AgroContratista · Kit de prueba v1.0
   ════════════════════════════════════════════════════════ */

function cargarKitPruebaJunio(){
  if(!confirm('Esto agrega datos de prueba (2 empresas, 4 mandantes, 12 trabajadores, contratos, asistencia de junio completo, novedades, haberes y descuentos).\n\n¿Continuar?')) return;

  /* ── 1. EMPRESAS PROPIAS ─────────────────────────────── */
  const empresasPropias = [
    { id:'ep_kit_1', nombre:'Servicios Agrícolas Mataquito SpA', razon_social:'Servicios Agrícolas Mataquito SpA',
      rut:'76.111.222-8', rut_representante:'11.222.333-9', nombre_representante:'Juan Pérez González',
      cargo_representante:'Gerente General', correo:'contacto@mataquito.cl', telefono:'+56912345601',
      ciudad:'Curicó', direccion:'Camino a Rauco 450', comuna:'Curicó', region:'Maule' },
    { id:'ep_kit_2', nombre:'AgroContratistas del Maule Ltda', razon_social:'AgroContratistas del Maule Ltda',
      rut:'76.222.333-3', rut_representante:'15.678.901-1', nombre_representante:'Carlos Fuentes Vega',
      cargo_representante:'Representante Legal', correo:'contacto@agromaule.cl', telefono:'+56912345602',
      ciudad:'Molina', direccion:'Parcela 8, Ruta K-60', comuna:'Molina', region:'Maule' },
  ];

  /* ── 2. MANDANTES ────────────────────────────────────── */
  const mandantes = [
    { id:'man_kit_1', nombre:'Agrícola El Peral S.A.', rut:'76.333.444-9', contacto:'contacto@agricolaelperal.cl',
      vigencia_contrato:'2026-12-29', faenas:[{nombre:'Cosecha de Limón'}] },
    { id:'man_kit_2', nombre:'Frutícola Los Aromos S.A.', rut:'76.444.555-4', contacto:'contacto@losaromos.cl',
      vigencia_contrato:'2026-11-30', faenas:[{nombre:'Packing de Uva'}] },
    { id:'man_kit_3', nombre:'Exportadora San Rafael Ltda', rut:'76.555.666-K', contacto:'contacto@sanrafael.cl',
      vigencia_contrato:'2027-01-15', faenas:[{nombre:'Poda de Manzano'}] },
    { id:'man_kit_4', nombre:'Agrícola Santa Elena SpA', rut:'76.666.777-5', contacto:'contacto@santaelena.cl',
      vigencia_contrato:'2026-10-31', faenas:[{nombre:'Cosecha de Cereza'}] },
  ];

  /* ── 3. TRABAJADORES (12) ────────────────────────────── */
  const trabajadoresKit = [
    { rut:'11.222.333-9', nombre:'Juan Pérez González', nacionalidad:'Chileno', sexo:'M',
      fecha_nacimiento:'1985-03-12', estado_civil:'Casado', domicilio:'Av. Principal 123, Curicó',
      correo_electronico:'juan.perez@gmail.com', afiliacion_afp:'Habitat', sistema_salud:'Fonasa',
      fecha_ingreso:'2020-01-10', funcion_cargo:'Cosechero', empresa_propia_id:'ep_kit_1', mandante_id:'man_kit_1',
      faena_obra:'Cosecha de Limón' },
    { rut:'12.345.678-5', nombre:'María Soto Reyes', nacionalidad:'Chileno', sexo:'F',
      fecha_nacimiento:'1992-07-25', estado_civil:'Soltero', domicilio:'Los Aromos 456, Molina',
      correo_electronico:'maria.soto@gmail.com', afiliacion_afp:'Cuprum', sistema_salud:'Fonasa',
      fecha_ingreso:'2023-02-01', funcion_cargo:'Cosechera', empresa_propia_id:'ep_kit_1', mandante_id:'man_kit_1',
      faena_obra:'Cosecha de Limón' },
    { rut:'13.456.789-9', nombre:'Pedro Ramírez Díaz', nacionalidad:'Chileno', sexo:'M',
      fecha_nacimiento:'1980-11-03', estado_civil:'Conviviente', domicilio:'Camino Real 789, Curicó',
      correo_electronico:'pedro.ramirez@gmail.com', afiliacion_afp:'Provida', sistema_salud:'Isapre Consalud',
      fecha_ingreso:'2019-03-15', funcion_cargo:'Supervisor de campo', empresa_propia_id:'ep_kit_1', mandante_id:'man_kit_2',
      faena_obra:'Packing de Uva' },
    { rut:'14.567.890-0', nombre:'Ana Muñoz Fuentes', nacionalidad:'Chileno', sexo:'F',
      fecha_nacimiento:'1995-05-18', estado_civil:'Soltero', domicilio:'Villa Esperanza 321, Sagrada Familia',
      correo_electronico:'ana.munoz@gmail.com', afiliacion_afp:'Capital', sistema_salud:'Fonasa',
      fecha_ingreso:'2024-04-01', funcion_cargo:'Cosechera', empresa_propia_id:'ep_kit_1', mandante_id:'man_kit_2',
      faena_obra:'Packing de Uva' },
    { rut:'15.678.901-1', nombre:'Carlos Fuentes Vega', nacionalidad:'Chileno', sexo:'M',
      fecha_nacimiento:'1979-09-30', estado_civil:'Casado', domicilio:'Parcela 12, Rauco',
      correo_electronico:'carlos.fuentes@gmail.com', afiliacion_afp:'Modelo', sistema_salud:'Fonasa',
      fecha_ingreso:'2018-01-05', funcion_cargo:'Tractorista', empresa_propia_id:'ep_kit_2', mandante_id:'man_kit_3',
      faena_obra:'Poda de Manzano' },
    { rut:'16.789.012-1', nombre:'Rosa Delgado Castro', nacionalidad:'Chileno', sexo:'F',
      fecha_nacimiento:'1991-01-27', estado_civil:'Conviviente', domicilio:'Sector Alto 15, Curicó',
      correo_electronico:'rosa.delgado@gmail.com', afiliacion_afp:'Planvital', sistema_salud:'Isapre Colmena',
      fecha_ingreso:'2022-06-10', funcion_cargo:'Cosechera', empresa_propia_id:'ep_kit_2', mandante_id:'man_kit_3',
      faena_obra:'Poda de Manzano' },
    { rut:'17.890.123-0', nombre:'Luis Contreras Silva', nacionalidad:'Chileno', sexo:'M',
      fecha_nacimiento:'1998-12-14', estado_civil:'Soltero', domicilio:'Los Nogales 88, Rauco',
      correo_electronico:'luis.contreras@gmail.com', afiliacion_afp:'Uno', sistema_salud:'Fonasa',
      fecha_ingreso:'2025-11-03', funcion_cargo:'Cosechero', empresa_propia_id:'ep_kit_2', mandante_id:'man_kit_4',
      faena_obra:'Cosecha de Cereza' },
    { rut:'18.901.234-9', nombre:'Daniela Herrera Rojas', nacionalidad:'Chileno', sexo:'F',
      fecha_nacimiento:'1990-08-22', estado_civil:'Soltero', domicilio:'Villa Nueva 300, Rauco',
      correo_electronico:'daniela.herrera@gmail.com', afiliacion_afp:'Habitat', sistema_salud:'Fonasa',
      fecha_ingreso:'2021-02-20', funcion_cargo:'Encargada de Packing', empresa_propia_id:'ep_kit_2', mandante_id:'man_kit_4',
      faena_obra:'Cosecha de Cereza' },
    // Extranjeros
    { rut:'19.012.345-6', nombre:'José Martínez Pérez', nacionalidad:'Venezolano', sexo:'M',
      fecha_nacimiento:'1990-02-14', estado_civil:'Soltero', domicilio:'Población Nueva 55, Curicó',
      correo_electronico:'jose.martinez@gmail.com', afiliacion_afp:'Cuprum', sistema_salud:'Fonasa',
      fecha_ingreso:'2025-01-15', funcion_cargo:'Cosechero', empresa_propia_id:'ep_kit_1', mandante_id:'man_kit_1',
      faena_obra:'Cosecha de Limón',
      tipo_doc_migratorio:'Residencia Temporal', num_doc_migratorio:'V-19012345', fecha_venc_migratorio:'2027-06-15' },
    { rut:'20.123.456-5', nombre:'Luisa Fernández Rojas', nacionalidad:'Colombiano', sexo:'F',
      fecha_nacimiento:'1993-06-20', estado_civil:'Soltero', domicilio:'Los Álamos 200, Molina',
      correo_electronico:'luisa.fernandez@gmail.com', afiliacion_afp:'Provida', sistema_salud:'Fonasa',
      fecha_ingreso:'2024-03-10', funcion_cargo:'Encargada de Packing', empresa_propia_id:'ep_kit_1', mandante_id:'man_kit_2',
      faena_obra:'Packing de Uva',
      tipo_doc_migratorio:'Residencia Definitiva', num_doc_migratorio:'CC-20123456', fecha_venc_migratorio:'2036-03-10' },
    { rut:'21.234.567-9', nombre:'Marco Quispe Huamán', nacionalidad:'Peruano', sexo:'M',
      fecha_nacimiento:'1987-10-08', estado_civil:'Casado', domicilio:'Camino Interior 88, Teno',
      correo_electronico:'marco.quispe@gmail.com', afiliacion_afp:'Capital', sistema_salud:'Isapre Colmena',
      fecha_ingreso:'2025-02-20', funcion_cargo:'Supervisor de campo', empresa_propia_id:'ep_kit_2', mandante_id:'man_kit_3',
      faena_obra:'Poda de Manzano',
      tipo_doc_migratorio:'Visa Temporaria / Sujeta a Contrato', num_doc_migratorio:'P-21234567', fecha_venc_migratorio:'2027-02-20' },
    { rut:'22.345.678-2', nombre:'Daniel Charles Pierre', nacionalidad:'Haitiano', sexo:'M',
      fecha_nacimiento:'1994-08-05', estado_civil:'Soltero', domicilio:'Villa Sur 12, Rauco',
      correo_electronico:'daniel.charles@gmail.com', afiliacion_afp:'Modelo', sistema_salud:'Fonasa',
      fecha_ingreso:'2025-05-01', funcion_cargo:'Cosechero', empresa_propia_id:'ep_kit_2', mandante_id:'man_kit_4',
      faena_obra:'Cosecha de Cereza',
      tipo_doc_migratorio:'Visa de Temporada', num_doc_migratorio:'H-22345678', fecha_venc_migratorio:'2026-12-20' },
  ];

  // Completar EPP/IRL y estado para todos (kit "limpio" — nada pendiente)
  trabajadoresKit.forEach(t => {
    t.estado = 'activo';
    t.empresa_rut = t.mandante_id;
    t.empresa = t.mandante_id;
    t.epp_entregados = ['Legionario','Guantes','Lentes','Bloqueador'];
    t.epp_otro = '';
    t.epp_fecha_entrega = '2026-06-02';
    t.irl_fecha_induccion = '2026-06-02';
    t.irl_declarado = true;
    t.id = t.id || (Date.now().toString() + Math.random().toString(36).slice(2,7));
  });

  /* ── 4. CONTRATOS ─────────────────────────────────────── */
  const sueldosBase = {
    'Cosechero':520000, 'Cosechera':520000, 'Supervisor de campo':680000,
    'Tractorista':580000, 'Encargada de Packing':560000,
  };
  const contratosKit = trabajadoresKit.map((t, i) => {
    const tipo = i % 3 === 0 ? 'temporada' : (i % 3 === 1 ? 'plazo_fijo' : 'indefinido');
    const mandante = mandantes.find(m => m.id === t.mandante_id);
    return {
      id: 'ct_kit_' + (i+1),
      trabajador_id: t.id,
      trabajador_rut: t.rut,
      tipo,
      ciudad_firma: empresasPropias.find(e => e.id === t.empresa_propia_id)?.ciudad || 'Curicó',
      fecha_firma: t.fecha_ingreso,
      fecha_inicio: t.fecha_ingreso,
      fecha_termino: tipo === 'indefinido' ? '' : '2026-12-15',
      funcion_cargo: t.funcion_cargo,
      nombre_faena: t.faena_obra,
      temporada: 'Temporada 2026',
      horas_semanales: 45,
      distribucion_jornada: 'Lunes a Sábado',
      colacion: '13:00 a 14:00 hrs',
      tipo_remuneracion: 'sueldo_fijo',
      sueldo_monto: sueldosBase[t.funcion_cargo] || 520000,
      empresa_propia_id: t.empresa_propia_id,
    };
  });

  /* ── 5. ANEXOS (cambio de remuneración) ───────────────── */
  const anexosKit = [
    { id:'anx_kit_1', trabajador_rut:'11.222.333-9', trabajador_id: trabajadoresKit[0].id,
      tipo:'cambio_remuneracion', tipo_texto:'Cambio de Remuneración',
      detalle:'Nuevo sueldo base: $560.000', fecha_vigencia:'2026-06-01', ciudad:'Curicó',
      observaciones:'Reajuste por desempeño', fecha_creacion:new Date().toISOString(), nuevo_sueldo:560000 },
    { id:'anx_kit_2', trabajador_rut:'15.678.901-1', trabajador_id: trabajadoresKit[4].id,
      tipo:'cambio_remuneracion', tipo_texto:'Cambio de Remuneración',
      detalle:'Nuevo sueldo base: $620.000', fecha_vigencia:'2026-06-01', ciudad:'Molina',
      observaciones:'Reajuste por antigüedad', fecha_creacion:new Date().toISOString(), nuevo_sueldo:620000 },
  ];

  /* ── 6. NOVEDADES (ausencias justificadas de junio) ───── */
  const novedadesKit = [
    { id:'nov_kit_1', trabajador_rut:'13.456.789-9', periodo:'2026-06', tipo:'licencia_medica',
      fecha_inicio:'2026-06-10', fecha_fin:'2026-06-12', dias:3, observacion:'Licencia médica reposo',
      aprobado:true, registrado_por:'admin', fecha_registro:'2026-06-10' },
    { id:'nov_kit_2', trabajador_rut:'16.789.012-1', periodo:'2026-06', tipo:'permiso_sin_goce',
      fecha_inicio:'2026-06-16', fecha_fin:'2026-06-16', dias:1, observacion:'Trámite personal',
      aprobado:true, registrado_por:'admin', fecha_registro:'2026-06-16' },
  ];

  /* ── 7. HABERES VARIABLES ─────────────────────────────── */
  const haberesKit = [
    { id:'hab_kit_1', trabajador_rut:'11.222.333-9', periodo:'2026-06', tipo:'bono_produccion',
      monto:45000, fecha:'2026-06-30', observacion:'Bono por cumplimiento de meta', registrado_por:'admin' },
    { id:'hab_kit_2', trabajador_rut:'15.678.901-1', periodo:'2026-06', tipo:'bono_produccion',
      monto:60000, fecha:'2026-06-30', observacion:'Bono por cumplimiento de meta', registrado_por:'admin' },
    { id:'hab_kit_3', trabajador_rut:'19.012.345-6', periodo:'2026-06', tipo:'movilizacion',
      monto:25000, fecha:'2026-06-30', observacion:'Movilización junio', registrado_por:'admin' },
  ];

  /* ── 8. DESCUENTOS ─────────────────────────────────────── */
  const descuentosKit = [
    { id:'des_kit_1', trabajador_rut:'12.345.678-5', periodo:'2026-06', tipo:'anticipo',
      monto:50000, monto_total:50000, monto_pagado:50000, cuotas_total:1, cuotas_pagadas:1,
      observacion:'Anticipo de sueldo', registrado_por:'admin' },
    { id:'des_kit_2', trabajador_rut:'17.890.123-0', periodo:'2026-06', tipo:'prestamo',
      monto:20000, monto_total:60000, monto_pagado:20000, cuotas_total:3, cuotas_pagadas:1,
      observacion:'Préstamo cuota 1 de 3', registrado_por:'admin' },
  ];

  /* ── 9. ASISTENCIA — junio 2026 completo (lunes a sábado) ── */
  const diasDomingo = [7,14,21,28];
  const ausenciasProgramadas = {
    '13.456.789-9': ['2026-06-10','2026-06-11','2026-06-12'], // licencia médica
    '16.789.012-1': ['2026-06-16'],                            // permiso sin goce
  };

  for(let dia = 1; dia <= 30; dia++){
    if(diasDomingo.includes(dia)) continue; // domingo libre
    const fecha = `2026-06-${String(dia).padStart(2,'0')}`;
    const registrosDia = [];

    trabajadoresKit.forEach(t => {
      const ausente = (ausenciasProgramadas[t.rut] || []).includes(fecha);
      if(ausente) return; // sin marcación ese día — la novedad ya lo justifica

      registrosDia.push({
        rut: t.rut,
        fecha,
        hora_entrada: '08:00',
        hora_salida: '17:00',
        horas_trabajadas: 8,
        jornada_valor: 1,
        jornada: 'Completa',
        registrado_por: 'admin',
      });
    });

    localStorage.setItem('asistencia_' + fecha, JSON.stringify(registrosDia));
  }

  /* ── GUARDAR TODO ──────────────────────────────────────── */
  cargarLocal(); // asegura arrays base existentes antes de sobreescribir

  empresas_propias = empresasPropias;
  empresas         = mandantes;
  trabajadores     = trabajadoresKit;
  guardarLocal();

  if(typeof cargarContratos === 'function') cargarContratos();
  contratos = contratosKit;
  anexos    = anexosKit;
  if(typeof guardarContratos === 'function') guardarContratos();

  if(typeof cargarGestionLaboral === 'function') cargarGestionLaboral();
  novedades         = novedadesKit;
  haberes_variables = haberesKit;
  descuentos        = descuentosKit;
  if(typeof guardarNovedades === 'function') guardarNovedades();
  if(typeof guardarHaberes === 'function') guardarHaberes();
  if(typeof guardarDescuentos === 'function') guardarDescuentos();

  // Carpeta laboral: dejar constancia de los contratos y novedades ya "generados"
  if(typeof registrarDocumentoCarpeta === 'function'){
    contratosKit.forEach(c => {
      const tipoTxt = { temporada:'Temporada', plazo_fijo:'Plazo Fijo', indefinido:'Indefinido' }[c.tipo] || c.tipo;
      registrarDocumentoCarpeta({
        trabajador_id: c.trabajador_id, trabajador_rut: c.trabajador_rut,
        tipo:'contrato', subtipo:c.tipo, folio:'',
        fecha_firma:c.fecha_firma,
        descripcion:`Contrato ${tipoTxt} — ${c.nombre_faena} — ${c.temporada}`,
      });
    });
    novedadesKit.forEach(n => {
      registrarDocumentoCarpeta({
        trabajador_rut:n.trabajador_rut, tipo:'novedad', subtipo:n.tipo,
        descripcion:`${n.tipo === 'licencia_medica' ? 'Licencia médica' : 'Permiso sin goce'} — ${n.fecha_inicio}${n.fecha_fin!==n.fecha_inicio?' al '+n.fecha_fin:''}`,
      });
    });
  }

  toast('✅ Kit de prueba (junio 2026) cargado: 2 empresas, 4 mandantes, 12 trabajadores, contratos, asistencia completa, novedades, haberes y descuentos', 'exito');

  if(typeof renderDashboard === 'function') renderDashboard();
}
