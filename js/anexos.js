/* ════ ANEXOS ════ */

function onCambioTipoAnexo(){
  const tipo = document.getElementById('anexo-tipo').value;
  const zona = document.getElementById('anexo-campos-variables');

  const campoTexto = (id, label, placeholder) => `
    <div class="form-group" style="margin-bottom:12px;">
      <label style="font-size:12px;font-weight:600;color:var(--texto2);">${label} *</label>
      <input type="text" id="${id}" placeholder="${placeholder}" oninput="actualizarPreviaAnexo()"
        style="width:100%;padding:9px;border-radius:var(--radius);border:1px solid var(--borde);font-size:13px;margin-top:5px;">
    </div>`;

  const campoFecha = (id, label) => `
    <div class="form-group" style="margin-bottom:12px;">
      <label style="font-size:12px;font-weight:600;color:var(--texto2);">${label} *</label>
      <input type="date" id="${id}" oninput="actualizarPreviaAnexo()"
        style="width:100%;padding:9px;border-radius:var(--radius);border:1px solid var(--borde);font-size:13px;margin-top:5px;">
    </div>`;

  const camposMap = {
    cambio_labor:        campoTexto('anx-nueva-labor', 'Nueva Labor', 'Ej: Packing, Poda, Raleo...'),
    cambio_cargo:        campoTexto('anx-nuevo-cargo', 'Nuevo Cargo', 'Ej: Jefe de Cuadrilla'),
    cambio_faena:        campoTexto('anx-nueva-faena', 'Nueva Faena', 'Ej: Cosecha Arándanos Sector Norte')
                       + campoTexto('anx-nueva-ubicacion', 'Nueva Ubicación', 'Ej: Curicó, Maule'),
    cambio_mandante:     campoTexto('anx-nuevo-mandante', 'Nuevo Mandante', 'Ej: Agrícola Los Olivos')
                       + campoTexto('anx-nuevo-mandante-rut', 'RUT Nuevo Mandante', 'Ej: 76.123.456-7'),
    cambio_jornada:      campoTexto('anx-nueva-jornada', 'Nueva Distribución de Jornada', 'Ej: Lunes a Sábado, 08:00 a 17:00'),
    cambio_remuneracion: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                          <div>${campoTexto('anx-nuevo-sueldo', 'Nuevo Monto ($)', 'Ej: 600000')}</div>
                          <div>${campoTexto('anx-nuevo-sueldo-escrito', 'En palabras', 'Ej: Seiscientos mil pesos')}</div>
                          </div>`,
    prorroga:            campoFecha('anx-nueva-fecha-termino', 'Nueva Fecha de Término'),
    cambio_domicilio:    campoTexto('anx-nuevo-domicilio', 'Nuevo Domicilio Laboral', 'Ej: Av. Principal 456, Talca'),
    asignacion_especial: campoTexto('anx-descripcion-especial', 'Descripción de la Asignación', 'Describe la asignación especial'),
    otro:                campoTexto('anx-detalle-otro', 'Detalle de la modificación', 'Describe el cambio acordado'),
  };

  zona.innerHTML = tipo && camposMap[tipo]
    ? `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:var(--radius);padding:14px;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px;">
          <i class="ti ti-edit"></i> ${TIPOS_ANEXO[tipo]}
        </div>
        ${camposMap[tipo]}
       </div>`
    : '';
  actualizarPreviaAnexo();
}

function obtenerDetalleAnexo(){
  const tipo = document.getElementById('anexo-tipo').value;
  const get  = id => document.getElementById(id)?.value?.trim() || '';

  const detalles = {
    cambio_labor:        `Nueva labor: ${get('anx-nueva-labor')}`,
    cambio_cargo:        `Nuevo cargo: ${get('anx-nuevo-cargo')}`,
    cambio_faena:        `Nueva faena: ${get('anx-nueva-faena')} — Ubicación: ${get('anx-nueva-ubicacion')}`,
    cambio_mandante:     `Nuevo mandante: ${get('anx-nuevo-mandante')} RUT ${get('anx-nuevo-mandante-rut')}`,
    cambio_jornada:      `Nueva jornada: ${get('anx-nueva-jornada')}`,
    cambio_remuneracion: `Nuevo sueldo: $${parseInt(get('anx-nuevo-sueldo')||0).toLocaleString('es-CL')} (${get('anx-nuevo-sueldo-escrito')})`,
    prorroga:            `Nueva fecha de término: ${get('anx-nueva-fecha-termino') ? new Date(get('anx-nueva-fecha-termino')).toLocaleDateString('es-CL') : '—'}`,
    cambio_domicilio:    `Nuevo domicilio laboral: ${get('anx-nuevo-domicilio')}`,
    asignacion_especial: get('anx-descripcion-especial'),
    otro:                get('anx-detalle-otro'),
  };
  return detalles[tipo] || '';
}

function guardarAnexo(){
  const tipo         = document.getElementById('anexo-tipo').value;
  const fechaVig     = document.getElementById('anexo-fecha-vigencia').value;
  // Buscar trabajador desde el select inline del tab
  const trabajadorId = document.getElementById('anexo-trabajador-select')?.value
                    || document.getElementById('c-trabajador')?.value;

  if(!tipo)        { toast('⚠️ Selecciona el tipo de anexo','error'); return; }
  if(!fechaVig)    { toast('⚠️ Ingresa la fecha de vigencia','error'); return; }
  if(!trabajadorId){ toast('⚠️ Selecciona un trabajador primero','error'); return; }

  const t       = trabajadores.find(x => x.id === trabajadorId);
  const detalle = obtenerDetalleAnexo();
  if(!detalle){ toast('⚠️ Completa los campos del anexo','error'); return; }

  const nuevoAnexo = {
    id:             Date.now().toString(),
    trabajador_rut: t?.rut,
    trabajador_id:  trabajadorId,
    tipo,
    tipo_texto:     TIPOS_ANEXO[tipo],
    detalle,
    fecha_vigencia: fechaVig,
    ciudad:         document.getElementById('anexo-ciudad')?.value.trim() || '',
    observaciones:  document.getElementById('anexo-observaciones')?.value.trim() || '',
    fecha_creacion: new Date().toISOString(),
  };

  anexos.push(nuevoAnexo);
  guardarLocal();
  actualizarBadgesContratos();

  toast(`✅ Anexo "${TIPOS_ANEXO[tipo]}" guardado`, 'exito');
  renderHistorialAnexos(t?.rut);

  // Limpiar campos del formulario (no el trabajador)
  document.getElementById('anexo-tipo').value = '';
  document.getElementById('anexo-campos-variables').innerHTML = '';
  document.getElementById('anexo-fecha-vigencia').value = '';
  document.getElementById('anexo-observaciones').value = '';
  actualizarPreviaAnexo();
}

function renderHistorialAnexos(rut){
  if(!rut) return;
  const lista = document.getElementById('anexo-historial-lista');
  if(!lista) return;
  const hist  = (anexos||[]).filter(a => a.trabajador_rut === rut)
    .sort((a,b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

  if(!hist.length){
    lista.innerHTML = '<div style="text-align:center;padding:20px;color:var(--texto3);font-size:13px;">Sin anexos registrados para este trabajador</div>';
    return;
  }

  lista.innerHTML = hist.map(a => `
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:10px 12px;border:1px solid var(--borde);border-radius:var(--radius);
      margin-bottom:6px;background:#fff;">
      <div>
        <div style="font-size:13px;font-weight:600;">
          <i class="ti ti-paperclip" style="color:var(--verde-dark);margin-right:4px;"></i>
          ${a.tipo_texto}
        </div>
        <div style="font-size:11px;color:var(--texto2);margin-top:2px;">${a.detalle}</div>
        <div style="font-size:11px;color:var(--texto3);margin-top:2px;">
          Vigente desde: ${new Date(a.fecha_vigencia).toLocaleDateString('es-CL')}
        </div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-secondary btn-sm" onclick="generarPDFAnexoPorId('${a.id}')">
          <i class="ti ti-file-type-pdf"></i> PDF
        </button>
        <button class="btn btn-secondary btn-sm" onclick="eliminarAnexo('${a.id}')"
          style="color:var(--danger);">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    </div>`).join('');
}

function eliminarAnexo(id){
  if(!confirm('¿Eliminar este anexo?')) return;
  const a = (anexos||[]).find(x => x.id === id);
  anexos = (anexos||[]).filter(x => x.id !== id);
  guardarLocal();
  if(a) renderHistorialAnexos(a.trabajador_rut);
  toast('🗑️ Anexo eliminado','exito');
}

function generarPDFAnexo(){
  const tipo         = document.getElementById('anexo-tipo').value;
  const trabajadorId = document.getElementById('anexo-trabajador-select')?.value
                    || document.getElementById('c-trabajador')?.value;
  if(!tipo)        { toast('⚠️ Selecciona el tipo de anexo','error'); return; }
  if(!trabajadorId){ toast('⚠️ Selecciona un trabajador primero','error'); return; }

  const t       = trabajadores.find(x => x.id === trabajadorId);
  const emp     = cfg.empresa || {};
  const cont    = contratos.find(c => c.trabajador_id === trabajadorId || c.trabajador_rut === t?.rut);
  const detalle = obtenerDetalleAnexo();
  const fechaVig= document.getElementById('anexo-fecha-vigencia').value;
  const ciudad  = document.getElementById('anexo-ciudad').value || cfg.empresa?.ciudad || '___________';
  const obs     = document.getElementById('anexo-observaciones').value;

  if(!detalle){ toast('⚠️ Completa los campos del anexo','error'); return; }

  const fmtFecha = v => v ? new Date(v).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}) : '___________';

  const fechaContratoOrig = cont?.fecha_firma || t?.fecha_ingreso;

  // Código de documento (folio interno) para trazabilidad de hojas sueltas
  const folioDoc = (() => {
    const base = (t?.rut||'').replace(/[^0-9kK]/g,'') + (t?.id||'') + new Date().toISOString().slice(0,10);
    let hash = 0;
    for(let i=0;i<base.length;i++){ hash = ((hash<<5)-hash + base.charCodeAt(i))|0; }
    return Math.abs(hash).toString(36).toUpperCase().slice(0,8);
  })();
  const folioLinea = `Doc. N° ${folioDoc} · ${t?.nombre||'—'} · RUT ${t?.rut||'—'} · Emitido el ${new Date().toLocaleDateString('es-CL')}`;

  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="es"><head>
  <meta charset="UTF-8">
  <title>Anexo — ${TIPOS_ANEXO[tipo]} — ${t?.nombre}</title>
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
    .firma-grid{ display:grid; grid-template-columns:1fr 1fr; gap:50px; margin-top:28px; break-inside:avoid; page-break-inside:avoid; }
    .firma-cierre{ page-break-inside:avoid; break-inside:avoid; }
    .firma-box{ text-align:center; }
    .firma-linea{ border-top:1px solid #000; padding-top:6px; margin-top:28px; }
    .firma-nombre{ font-weight:bold; font-size:10pt; }
    .firma-rol{ font-size:9pt; color:#444; margin-top:1px; }
    .doc-folio{ font-family:Arial,Helvetica,sans-serif; font-size:6.5pt; color:#aaa;
      text-align:center; margin-bottom:8px; letter-spacing:0.2px; text-transform:uppercase; }
    .no-print{ margin-bottom:24px; }
    @media print{ .no-print{display:none !important;} }
  </style>
</head><body>
<div class="doc-wrap">

<div class="no-print" style="display:flex;gap:10px;align-items:center;">
  <button onclick="window.print()" style="padding:10px 24px;background:#0f2942;color:#fff;
    border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
    🖨️ Imprimir / Guardar PDF
  </button>
  <button onclick="window.close()" style="padding:10px 16px;background:#f1f5f9;
    border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;">
    Cerrar
  </button>
</div>

<div class="doc-folio">${folioLinea}</div>
<h1>Anexo de Contrato de Trabajo</h1>
<h2>${TIPOS_ANEXO[tipo]}</h2>

<p>En <strong>${ciudad}</strong>, a ${fmtFecha(fechaVig)}, entre
<strong>${emp.razon_social || '___________'}</strong>,
RUT <strong>${emp.rut || '___________'}</strong>,
representada legalmente por don(ña) <strong>${emp.representante || '___________'}</strong>,
RUT <strong>${emp.rut_representante || '___________'}</strong>,
en su calidad de <strong>${emp.cargo_representante || 'Representante Legal'}</strong>,
domiciliada en <strong>${emp.direccion || '______________'}</strong>,
en adelante <em>"el Empleador"</em>,
y don(ña) <strong>${t?.nombre || '___________'}</strong>,
RUT <strong>${t?.rut || '___________'}</strong>,
con domicilio en <strong>${t?.domicilio || '______________'}</strong>,
en adelante <em>"el Trabajador(a)"</em>,
se acuerda el siguiente anexo al contrato de trabajo suscrito con fecha
<strong>${fmtFecha(fechaContratoOrig)}</strong>:</p>

<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">01</span><span class="clausula-tit">Primero — Acuerdo de modificación</span></div>
  <p>Las partes declaran que, de común acuerdo y en forma libre y voluntaria,
  han convenido modificar determinadas condiciones del contrato de trabajo individual vigente.</p>
</div>

<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">02</span><span class="clausula-tit">Segundo — Modificación contractual</span></div>
  <p>A contar del día <strong>${fmtFecha(fechaVig)}</strong>,
  se introducen las siguientes modificaciones contractuales:</p>
  <p><strong>Tipo de modificación:</strong> ${TIPOS_ANEXO[tipo]}</p>
  <p><strong>Detalle de la modificación:</strong> ${detalle}</p>
  ${obs ? `<p><strong>Observaciones:</strong> ${obs}</p>` : ''}
</div>

<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">03</span><span class="clausula-tit">Tercero — Conformidad de las partes</span></div>
  <p>Las partes declaran que el presente anexo ha sido leído íntegramente y que refleja
  fielmente lo acordado, prestando su conformidad libre y voluntaria.</p>
</div>

<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">04</span><span class="clausula-tit">Cuarto — Vigencia de cláusulas no modificadas</span></div>
  <p>Todas aquellas cláusulas y estipulaciones del contrato de trabajo original que no han
  sido expresamente modificadas por el presente anexo mantienen plena vigencia y validez.</p>
</div>

<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">05</span><span class="clausula-tit">Quinto — Ejemplares y registro del anexo</span></div>
  <p>El presente anexo forma parte integrante del contrato de trabajo individual, obligando
  a las partes para todos los efectos legales, y se firma en dos ejemplares de igual tenor
  y fecha, quedando uno en poder de cada parte.</p>
  <p>El empleador se obliga a registrar el presente anexo en el sitio electrónico de la
  Dirección del Trabajo (www.direcciondeltrabajo.cl) dentro de los quince días hábiles
  siguientes a su celebración, conforme a lo dispuesto en el artículo 9 bis del Código
  del Trabajo.</p>
</div>

<div class="firma-cierre">
<div class="firma-grid">
  <div class="firma-box">
    <div class="firma-linea"></div>
    <div class="firma-nombre">${emp.razon_social || '___________'}</div>
    <div class="firma-rol">Representante legal: ${emp.representante || '___________'}</div>
    <div class="firma-rol">RUT: ${emp.rut_representante || '___________'}</div>
  </div>
  <div class="firma-box">
    <div class="firma-linea"></div>
    <div class="firma-nombre">${t?.nombre || '___________'}</div>
    <div class="firma-rol">Trabajador(a)</div>
    <div class="firma-rol">RUT: ${t?.rut || '___________'}</div>
  </div>
</div>
</div>

</div>
</body></html>`);
  win.document.close();
}

function generarPDFAnexoPorId(id){
  const a = (anexos||[]).find(x => x.id === id);
  if(!a) return;
  // Precargar campos del modal con los datos del anexo guardado y generar
  document.getElementById('anexo-tipo').value = a.tipo;
  document.getElementById('anexo-fecha-vigencia').value = a.fecha_vigencia;
  document.getElementById('anexo-ciudad').value = a.ciudad || '';
  document.getElementById('anexo-observaciones').value = a.observaciones || '';
  // Preseleccionar trabajador
  const t = trabajadores.find(x => x.rut === a.trabajador_rut);
  if(t){
    const sel = document.getElementById('c-trabajador');
    if(sel) sel.value = t.id;
  }
  generarPDFAnexo();
}

function poblarSelectAnexoTrabajador(){
  const sel = document.getElementById('anexo-trabajador-select');
  if(!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar trabajador —</option>'
    + trabajadores.filter(t => t.estado === 'activo')
      .sort((a,b) => a.nombre?.localeCompare(b.nombre))
      .map(t => `<option value="${t.id}">${t.nombre} — ${t.rut}</option>`)
      .join('');
  if(val){ sel.value = val; onSeleccionTrabajadorAnexo(); }
}

function actualizarPreviaAnexo(){
  const p = document.getElementById('anexo-preview');
  if(!p) return;

  const id   = document.getElementById('anexo-trabajador-select')?.value;
  const tipo = document.getElementById('anexo-tipo')?.value;

  if(!id || !tipo){
    p.innerHTML = `<div style="text-align:center;padding:24px;color:var(--texto3);font-size:13px;">
      Selecciona trabajador y tipo de anexo
    </div>`;
    return;
  }

  const t       = trabajadores.find(x => x.id === id);
  const emp     = cfg.empresa || {};
  const detalle = obtenerDetalleAnexo();
  const fechaVig= document.getElementById('anexo-fecha-vigencia')?.value;
  const obs     = document.getElementById('anexo-observaciones')?.value;
  const fmt     = v => v ? new Date(v).toLocaleDateString('es-CL') : '—';

  const rows = [
    ['Trabajador',    t?.nombre || '—'],
    ['RUT',           t?.rut || '—'],
    ['Empleador',     emp.razon_social || '—'],
    ['Tipo de anexo', TIPOS_ANEXO[tipo] || '—'],
    ['Detalle',       detalle || '—'],
    ['Vigencia desde',fmt(fechaVig)],
    ['Observaciones', obs || 'Sin observaciones'],
  ];

  p.innerHTML = `
    <div style="background:#0f2942;color:#fff;padding:9px 12px;border-radius:var(--radius) var(--radius) 0 0;font-size:12px;font-weight:600;text-align:center;">
      Anexo de Contrato<br>
      <span style="font-size:10px;opacity:0.65;font-weight:400;">${TIPOS_ANEXO[tipo]||''}</span>
    </div>
    <div style="border:1px solid var(--borde);border-top:none;border-radius:0 0 var(--radius) var(--radius);overflow:hidden;">
      ${rows.map(([label,val],i) => `
        <div style="display:flex;justify-content:space-between;gap:10px;padding:8px 12px;
          font-size:12px;${i<rows.length-1?'border-bottom:1px solid var(--borde);':''}
          ${i%2===0?'background:#fff;':'background:#F8FAFC;'}">
          <span style="color:var(--texto2);">${label}</span>
          <span style="font-weight:600;text-align:right;max-width:60%;">${val}</span>
        </div>`).join('')}
    </div>`;
}

function onSeleccionTrabajadorAnexo(){
  const id = document.getElementById('anexo-trabajador-select')?.value;
  if(!id){ 
    ['nombre','rut','empresa','rep','mandante','cargo','faena','fecha-contrato']
      .forEach(k => { const el=document.getElementById('anexo-pre-'+k); if(el) el.textContent='—'; });
    document.getElementById('anexo-historial-lista').innerHTML =
      '<div style="text-align:center;padding:20px;color:var(--texto3);font-size:13px;">Selecciona un trabajador</div>';
    return;
  }
  const t    = trabajadores.find(x => x.id === id);
  const emp  = cfg.empresa || {};
  const man  = findMandante(t);
  const cont = contratos.find(c => c.trabajador_id === id || c.trabajador_rut === t?.rut);

  const set = (elId, val) => { const el=document.getElementById(elId); if(el) el.textContent = val||'—'; };
  set('anexo-pre-nombre',        t?.nombre);
  set('anexo-pre-rut',           t?.rut);
  set('anexo-pre-empresa',       emp.razon_social);
  set('anexo-pre-rep',           emp.representante);
  set('anexo-pre-mandante',      man?.nombre);
  set('anexo-pre-cargo',         cont?.funcion_cargo || t?.funcion_cargo);
  set('anexo-pre-faena',         cont?.nombre_faena  || t?.faena_obra);
  set('anexo-pre-fecha-contrato',
      cont?.fecha_firma ? new Date(cont.fecha_firma).toLocaleDateString('es-CL')
      : t?.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString('es-CL') : null);

  // Ciudad desde cfg
  const ciudad = document.getElementById('anexo-ciudad');
  if(ciudad && !ciudad.value) ciudad.value = emp.ciudad || '';

  renderHistorialAnexos(t?.rut);
  actualizarPreviaAnexo();
}

function limpiarFormAnexo(){
  document.getElementById('anexo-trabajador-select').value = '';
  document.getElementById('anexo-tipo').value = '';
  document.getElementById('anexo-campos-variables').innerHTML = '';
  document.getElementById('anexo-fecha-vigencia').value = '';
  document.getElementById('anexo-ciudad').value = '';
  document.getElementById('anexo-observaciones').value = '';
  ['nombre','rut','empresa','rep','mandante','cargo','faena','fecha-contrato']
    .forEach(k => { const el=document.getElementById('anexo-pre-'+k); if(el) el.textContent='—'; });
  document.getElementById('anexo-historial-lista').innerHTML =
    '<div style="text-align:center;padding:20px;color:var(--texto3);font-size:13px;">Selecciona un trabajador para ver su historial</div>';
  actualizarPreviaAnexo();
}
