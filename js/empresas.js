/* ════ EMPRESAS — mis empresas, mandantes, faenas ════ */

/* Normaliza un RUT para comparar (sin puntos/guión, mayúscula) */
function _normRUT(rut){
  return (rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}
function _rutsIguales(a, b){
  if(!a || !b) return false;
  return _normRUT(a) === _normRUT(b);
}
/* ¿Ese RUT ya está usado por otra empresa (propia o mandante)? idExcluir = el registro que se está editando */
function _rutYaExiste(rut, idExcluir){
  if(!rut) return null;
  const enMandantes = empresas.find(e => e.id !== idExcluir && _rutsIguales(e.rut, rut));
  if(enMandantes) return { registro: enMandantes, tipo: 'mandante' };
  const enPropias = empresas_propias.find(e => e.id !== idExcluir && _rutsIguales(e.rut, rut));
  if(enPropias) return { registro: enPropias, tipo: 'empresa propia' };
  return null;
}

function abrirModalMiEmpresa(){
  const modal = document.getElementById('modal-mi-empresa');
  modal.style.display = 'flex';
  const e = cfg.empresa || {};
  document.getElementById('me-nombre').value             = e.razon_social || '';
  document.getElementById('me-rut').value                = e.rut || '';
  document.getElementById('me-ciudad').value              = e.ciudad || '';
  document.getElementById('me-representante').value      = e.representante || '';
  document.getElementById('me-rut-representante').value  = e.rut_representante || '';
  document.getElementById('me-cargo-representante').value= e.cargo_representante || '';
  document.getElementById('me-correo').value              = e.correo || '';
  document.getElementById('me-telefono').value             = e.telefono || '';
  document.getElementById('me-direccion').value           = e.direccion || '';
  document.getElementById('me-comuna').value              = e.comuna || '';
  document.getElementById('me-region').value              = e.region || '';
}

function cerrarModalMiEmpresa(){
  document.getElementById('modal-mi-empresa').style.display = 'none';
}

function guardarMiEmpresa(){
  const nombre = document.getElementById('me-nombre').value.trim();
  const rut    = document.getElementById('me-rut').value.trim();
  const rutRep = document.getElementById('me-rut-representante').value.trim();
  if(!nombre){ toast('⚠️ Ingresa la razón social','error'); return; }
  if(!rut)   { toast('⚠️ Ingresa el RUT de la empresa','error'); return; }
  if(!validarRUT(rut)){
    const continuar = confirm(`El dígito verificador del RUT "${rut}" no coincide.\n¿Deseas guardarlo de todas formas?`);
    if(!continuar) return;
  }
  if(rutRep && _rutsIguales(rut, rutRep)){
    toast('❌ El RUT del representante no puede ser igual al RUT de la empresa','error');
    return;
  }

  cfg.empresa = {
    razon_social:        nombre,
    rut:                 rut,
    ciudad:              document.getElementById('me-ciudad').value.trim(),
    representante:       document.getElementById('me-representante').value.trim(),
    rut_representante:   document.getElementById('me-rut-representante').value.trim(),
    cargo_representante: document.getElementById('me-cargo-representante').value.trim(),
    correo:              document.getElementById('me-correo').value.trim(),
    telefono:            document.getElementById('me-telefono').value.trim(),
    direccion:           document.getElementById('me-direccion').value.trim(),
    comuna:              document.getElementById('me-comuna').value.trim(),
    region:              document.getElementById('me-region').value,
  };

  guardarCfg();
  cerrarModalMiEmpresa();
  renderMisEmpresas();
  toast('✅ Mi Empresa guardada','exito');
}

function renderContratistas(){
  const el=document.getElementById('lista-contratistas');

  // Rellenar tarjeta de empresa contratista desde cfg
  const empNomEl = document.getElementById('empresa-principal-nombre');
  const empRutEl = document.getElementById('empresa-principal-rut');
  if(empNomEl) empNomEl.textContent = cfg.empresa?.razon_social || '— Sin configurar —';
  if(empRutEl) empRutEl.textContent = cfg.empresa?.rut ? 'RUT: ' + cfg.empresa.rut : 'Ve a Configuración para ingresar los datos de tu empresa';

  if(!empresas.length){
    el.innerHTML='<div style="font-size:13px;color:var(--texto3);text-align:center;padding:32px;">Sin mandantes registrados — haz clic en "Nuevo Mandante"</div>';
    return;
  }

  const colors=[['#DBEAFE','#1D4ED8'],['#D1FAE5','#065F46'],['#FEF3C7','#92400E'],['#EDE9FE','#5B21B6'],['#FCE7F3','#9D174D']];

  el.innerHTML=`
    <div style="background:var(--gris-bg);display:flex;padding:10px 16px;font-size:11px;font-weight:600;color:var(--texto3);border-bottom:2px solid var(--borde);text-transform:uppercase;letter-spacing:0.4px;border-radius:var(--radius-lg) var(--radius-lg) 0 0;">
      <div style="flex:1.5;">Empresa</div>
      <div style="flex:0.7;">RUT</div>
      <div style="flex:1;">Faena</div>
      <div style="flex:0.6;">Inicio</div>
      <div style="flex:0.7;">Término</div>
      <div style="flex:0.4;text-align:center;">Total</div>
      <div style="flex:0.4;text-align:center;">Activos</div>
      <div style="flex:0.5;text-align:center;">Inactivos</div>
      <div style="flex:1.8;text-align:right;">Acciones</div>
    </div>
    <div style="background:var(--blanco);border:1px solid var(--borde);border-top:none;border-radius:0 0 var(--radius-lg) var(--radius-lg);overflow:hidden;">
    ${empresas.map((e,i)=>{
      const[bg,fg]=colors[i%colors.length];
      const empId=e.id||e.rut;
      const total=trabajadores.filter(t=>(t.mandante_id||t.empresa_rut||t.empresa)===empId).length;
      const act=trabajadores.filter(t=>(t.mandante_id||t.empresa_rut||t.empresa)===empId&&t.estado==='activo').length;
      const inact=total-act;
      const pct=total?Math.round(act/total*100):0;
      const venc=estadoVencimiento(e.vigencia_contrato);
      const ini=e.nombre.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
      const faenas=e.faenas||[];
      const faenaColHTML = !faenas.length
        ? '<span style="color:var(--texto3);font-size:12px;">— sin faena —</span>'
        : faenas.length===1
          ? `<span style="font-size:12px;">${faenas[0].nombre||faenas[0]}</span>`
          : `<span onclick="_toggleFaenasFila('${empId}')" style="cursor:pointer;font-size:12px;font-weight:600;color:var(--azul);">
               <i class="ti ti-plant"></i> ${faenas.length} faenas <i class="ti ti-chevron-down" id="chev-faenas-${empId}"></i>
             </span>`;
      const subfilaFaenas = faenas.length>1 ? `
        <div id="subfila-faenas-${empId}" style="display:none;background:var(--gris-bg);padding:10px 16px 10px 64px;border-bottom:1px solid var(--borde);">
          ${faenas.map(f=>`<span style="display:inline-flex;align-items:center;gap:5px;background:#fff;border:1px solid var(--borde);
            border-radius:99px;padding:4px 12px;font-size:12px;margin:0 6px 6px 0;">
            <i class="ti ti-plant" style="font-size:11px;color:var(--verde-dark);"></i> ${f.nombre||f}
          </span>`).join('')}
        </div>` : '';
      // ✅ Se eliminó el onclick de toda la fila (llevaba accidentalmente
      // a "Trabajadores" con cualquier clic) — la acción "Ver trabajadores"
      // ahora vive solo en su botón explícito, en la columna Acciones.
      return`<div style="display:flex;align-items:center;padding:13px 16px;border-bottom:1px solid var(--borde);transition:.15s;"
        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <div style="flex:1.5;display:flex;align-items:center;gap:10px;">
          <div style="width:38px;height:38px;border-radius:9px;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${ini}</div>
          <div>
            <div style="font-weight:600;font-size:13px;">${e.nombre}${venc.badge}</div>
            <div style="font-size:11px;color:var(--texto3);">${e.correo||''}</div>
          </div>
        </div>
        <div style="flex:0.7;font-family:monospace;font-size:11px;color:var(--texto2);">${e.rut}</div>
        <div style="flex:1;min-width:0;">${faenaColHTML}</div>
        <div style="flex:0.6;min-width:0;">
          ${e.fecha_inicio_contrato
            ? `<div style="font-size:12px;font-weight:600;color:#2563EB;white-space:nowrap;">${new Date(e.fecha_inicio_contrato).toLocaleDateString('es-CL')}</div>`
            : '<span style="color:var(--texto3);font-size:12px;">—</span>'}
        </div>
        <div style="flex:0.7;min-width:0;">
          <div style="font-size:12px;font-weight:600;color:${venc.color};white-space:nowrap;">${venc.texto}</div>
          <div style="margin-top:4px;height:4px;background:var(--gris-bg);border-radius:2px;overflow:hidden;max-width:90px;">
            <div style="height:100%;width:${pct}%;background:${fg};border-radius:2px;"></div>
          </div>
        </div>
        <div style="flex:0.4;text-align:center;font-weight:700;font-size:14px;">${total}</div>
        <div style="flex:0.4;text-align:center;">
          <span style="background:#D1FAE5;color:#065F46;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;">${act}</span>
        </div>
        <div style="flex:0.5;text-align:center;">
          <span style="background:${inact>0?'#FEE2E2':'#F1F5F9'};color:${inact>0?'#dc2626':'#94A3B8'};font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;">${inact}</span>
        </div>
        <div style="flex:1.8;display:flex;gap:5px;justify-content:flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="verTrabajadoresEmpresa('${e.id||e.rut}')" title="Ver trabajadores">
  <i class="ti ti-eye"></i> Trabajadores
</button>
          <button class="btn btn-secondary btn-sm" onclick="abrirModalEmpresa('${e.id||e.rut}')" title="Editar mandante">
  <i class="ti ti-edit"></i> Editar
</button>
          <button class="btn btn-secondary btn-sm" onclick="toggleEstadoMandante('${e.id||e.rut}')"
            style="color:${e.estado==='inactivo'?'var(--verde-dark)':'var(--danger)'};"
            title="${e.estado==='inactivo'?'Activar':'Dar de baja'}">
  <i class="ti ti-${e.estado==='inactivo'?'circle-check':'circle-minus'}"></i>
  ${e.estado==='inactivo'?'Activar':'Baja'}
</button>
          <button class="btn btn-secondary btn-sm" onclick="eliminarMandante('${e.id||e.rut}')"
            style="color:var(--danger);" title="Eliminar mandante">
  <i class="ti ti-trash"></i>
</button>
        </div>
      </div>${subfilaFaenas}`;
    }).join('')}
    </div>`;
}

function _toggleFaenasFila(empId){
  const sub = document.getElementById(`subfila-faenas-${empId}`);
  const chev = document.getElementById(`chev-faenas-${empId}`);
  if(!sub) return;
  const abierto = sub.style.display !== 'none';
  sub.style.display = abierto ? 'none' : 'block';
  if(chev) chev.className = abierto ? 'ti ti-chevron-down' : 'ti ti-chevron-up';
}

/* Faenas del mandante que se está editando en el modal (en memoria hasta guardar) */
let _faenasEnEdicion = [];

function abrirModalEmpresa(idOrRut=null){
  const m=document.getElementById('modal-empresa');
  m.style.display='flex';
  document.getElementById('modal-empresa-titulo').textContent=idOrRut?'Editar mandante':'Nuevo mandante';
  document.getElementById('e-rut-original').value=idOrRut||'';
  const msgDupE = document.getElementById('e-rut-msg-dup');
  if(msgDupE) msgDupE.textContent = '';
  document.getElementById('e-rut').style.borderColor = '';
  const campos=['e-rut','e-nombre','e-rut-rep','e-nombre-rep','e-correo','e-telefono','e-fecha-inicio','e-vigencia','e-direccion','e-comuna','e-region'];
  if(!idOrRut){
    campos.forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    _faenasEnEdicion = [];
    _renderFaenasEnEdicion();
    return;
  }
  // Buscar por id primero, luego por rut (compatibilidad)
  const e=empresas.find(x=>x.id===idOrRut)||empresas.find(x=>x.rut===idOrRut);
  if(e){
    document.getElementById('e-rut').value          = e.rut||'';
    document.getElementById('e-nombre').value       = e.nombre||'';
    document.getElementById('e-rut-rep').value      = e.rut_representante||'';
    document.getElementById('e-nombre-rep').value   = e.nombre_representante||'';
    document.getElementById('e-correo').value       = e.correo||'';
    document.getElementById('e-telefono').value     = e.telefono||'';
    document.getElementById('e-fecha-inicio').value = e.fecha_inicio_contrato||'';
    document.getElementById('e-vigencia').value     = e.vigencia_contrato||'';
    document.getElementById('e-direccion').value    = e.direccion||'';
    document.getElementById('e-comuna').value       = e.comuna||'';
    document.getElementById('e-region').value       = e.region||'';
    // Guardar el id para que guardarEmpresa actualice el registro correcto
    document.getElementById('e-rut-original').value = e.id||e.rut;

    _faenasEnEdicion = (e.faenas||[]).map(f => ({ nombre: f.nombre || f }));
    _renderFaenasEnEdicion();
  }
}

/* ───────── Faenas — filas repetibles dentro del modal de mandante ───────── */

function _renderFaenasEnEdicion(){
  const cont = document.getElementById('e-faenas-lista');
  if(!cont) return;

  if(!_faenasEnEdicion.length){
    cont.innerHTML = '<div style="font-size:12px;color:var(--texto3);padding:6px 0;">Sin faenas agregadas</div>';
    return;
  }

  cont.innerHTML = _faenasEnEdicion.map((f, i) => `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
      <input type="text" value="${f.nombre||''}" placeholder="Ej: Cosecha, Packing, Poda, Raleo..."
        oninput="_actualizarFaenaNombre(${i}, this.value)"
        style="flex:1;padding:8px 10px;border-radius:7px;border:1px solid var(--borde);font-size:13px;">
      <button type="button" onclick="_eliminarFilaFaena(${i})" class="btn btn-secondary btn-sm" title="Eliminar faena">
        <i class="ti ti-trash"></i>
      </button>
    </div>`).join('');
}

function _agregarFilaFaena(){
  _faenasEnEdicion.push({ nombre:'' });
  _renderFaenasEnEdicion();
}

function _actualizarFaenaNombre(i, valor){
  if(_faenasEnEdicion[i]) _faenasEnEdicion[i].nombre = valor;
}

function _eliminarFilaFaena(i){
  _faenasEnEdicion.splice(i, 1);
  _renderFaenasEnEdicion();
}

function cerrarModalEmpresa(){document.getElementById('modal-empresa').style.display='none';}

async function guardarEmpresa(){
  const rutVal = document.getElementById('e-rut').value.trim();
  const idOriginal = document.getElementById('e-rut-original').value;
  const empExistente = empresas.find(e => e.rut === rutVal || e.id === idOriginal);
  const datos={
    id:                empExistente?.id || crypto.randomUUID(),
    rut:               rutVal,
    nombre:            document.getElementById('e-nombre').value.trim(),
    rut_representante: document.getElementById('e-rut-rep').value.trim(),
    nombre_representante: document.getElementById('e-nombre-rep').value.trim(),
    correo:            document.getElementById('e-correo').value.trim(),
    telefono:          document.getElementById('e-telefono').value.trim(),
    fecha_inicio_contrato: document.getElementById('e-fecha-inicio')?.value || null,
    vigencia_contrato: document.getElementById('e-vigencia').value||null,
    direccion:         document.getElementById('e-direccion').value.trim(),
    comuna:            document.getElementById('e-comuna')?.value.trim()||'',
    region:            document.getElementById('e-region')?.value||'',
    estado:            empExistente?.estado || 'activo',
    faenas:            _faenasEnEdicion.filter(f => f.nombre?.trim()).map(f => ({ nombre: f.nombre.trim() })),
  };

  if(!datos.rut||!datos.nombre){toast('⚠️ RUT y nombre son obligatorios','error');return;}
  if(datos.correo && !_formatoCorreoValido(datos.correo)){
    toast('⚠️ El correo ingresado no tiene un formato válido','error');
    return;
  }
  // Advertencia si RUT parece inválido, pero no bloquea (algunos RUTs de empresa son especiales)
  if(!validarRUT(datos.rut)){
    const continuar = confirm(`El dígito verificador del RUT "${datos.rut}" no coincide.\n¿Deseas guardarlo de todas formas?`);
    if(!continuar) return;
  }
  if(datos.rut_representante && !validarRUT(datos.rut_representante)){
    const continuar = confirm(`El dígito verificador del RUT representante "${datos.rut_representante}" no coincide.\n¿Deseas guardarlo de todas formas?`);
    if(!continuar) return;
  }
  if(datos.rut_representante && _rutsIguales(datos.rut, datos.rut_representante)){
    toast('❌ El RUT del representante no puede ser igual al RUT de la empresa','error');
    return;
  }
  const dup = _rutYaExiste(datos.rut, datos.id);
  if(dup){
    toast(`❌ Ese RUT ya está registrado en "${dup.registro.nombre}" (${dup.tipo})`,'error');
    return;
  }

  if(!supabaseClient){
    const idx=empresas.findIndex(e=>e.id===datos.id || e.rut===datos.rut);
    if(idx>=0)empresas[idx]={...empresas[idx],...datos}; else empresas.push(datos);
    guardarLocal(); cerrarModalEmpresa(); renderContratistas(); renderKpisMandantes(); poblarSelects();
    toast(`✅ ${datos.nombre} guardada localmente`,'exito'); return;
  }
  try{
    const existe=empresas.find(e=>e.rut===datos.rut);
    let err;
    if(existe)({error:err}=await supabaseClient.from('empresas').update(datos).eq('rut',datos.rut));
    else({error:err}=await supabaseClient.from('empresas').insert([datos]));
    if(err)throw err;
    await cargarDatos(); cerrarModalEmpresa();
    toast(`✅ ${datos.nombre} guardada en la nube`,'exito');
  }catch(e){toast(`❌ Error: ${e.message}`,'error')}
}

function toggleEstadoMandante(idOrRut){
  const e = empresas.find(x => x.id === idOrRut || x.rut === idOrRut);
  if(!e) return;
  const nuevoEstado = e.estado === 'inactivo' ? 'activo' : 'inactivo';
  const accion = nuevoEstado === 'inactivo' ? 'dar de baja' : 'reactivar';
  if(!confirm(`¿Confirmas ${accion} a ${e.nombre}?`)) return;
  e.estado = nuevoEstado;
  guardarLocal();
  renderContratistas();
  renderKpisMandantes();
  toast(`✅ ${e.nombre} ${nuevoEstado === 'inactivo' ? 'dada de baja' : 'reactivada'}`, 'exito');
}

function eliminarMandante(idOrRut){
  const e = empresas.find(x => x.id === idOrRut || x.rut === idOrRut);
  if(!e) return;
  const enUso = trabajadores.some(t => t.mandante_id === e.id || t.empresa_rut === e.rut);
  if(enUso){ toast(`⚠️ ${e.nombre} tiene trabajadores asignados — reasígnalos primero`, 'error'); return; }
  if(!confirm(`¿Eliminar ${e.nombre}? Esta acción no se puede deshacer.`)) return;
  empresas = empresas.filter(x => x.id !== e.id && x.rut !== e.rut);
  guardarLocal();
  renderContratistas();
  renderKpisMandantes();
  poblarSelects();
  toast(`🗑️ ${e.nombre} eliminada`, 'exito');
}

function verTrabajadoresEmpresa(idOrRut){
  const sel = document.getElementById('filtro-empresa');
  if(sel) sel.value = idOrRut;
  irA('trabajadores', document.querySelectorAll('.sb-item')[3]);
  setTimeout(() => { if(sel){ sel.value = idOrRut; cargarTrabajadores(); } }, 50);
}

function _kpiCard(label, value, sub, color){
  return `<div class="kpi"><div class="kpi-label">${label}</div>
    <div class="kpi-value" style="color:${color||'var(--texto)'};">${value}</div>
    <div class="kpi-sub">${sub}</div></div>`;
}

/* KPI compacto "activas/inactivas" — ej. 3/0 */
function _kpiActivoInactivo(label, activas, inactivas, sub){
  return `<div class="kpi">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">
      <span style="color:var(--verde-dark);">${activas}</span><span style="color:var(--texto3);font-weight:400;"> / </span><span style="color:${inactivas>0?'#dc2626':'var(--texto3)'};">${inactivas}</span>
    </div>
    <div class="kpi-sub">${sub ? sub + ' ' : ''}(activas / inactivas)</div>
  </div>`;
}

function renderKpisMisEmpresas(){
  const zona = document.getElementById('kpi-mis-empresas-zone');
  if(!zona) return;
  const activas   = empresas_propias.filter(e => e.estado !== 'inactivo').length;
  const inactivas = empresas_propias.filter(e => e.estado === 'inactivo').length;

  // ✅ Tarjetas "Trabajadores" y "Contratos" eliminadas — esa información
  // ya está visible por fila en la lista de abajo (columnas Total/Activos/
  // Inactivos). Se deja solo el resumen de Mis Empresas.
  // ✅ Grilla de ancho a contenido (igual criterio que .kpi-grid del resto
  // del sistema) en vez de columnas fijas iguales.
  zona.style.display = 'flex';
  zona.style.flexWrap = 'wrap';
  zona.style.gap = '14px';
  zona.innerHTML = _kpiActivoInactivo('Mis Empresas', activas, inactivas, 'empresas propias');
}

function renderKpisMandantes(){
  const zona = document.getElementById('kpi-mandantes-zone');
  if(!zona) return;
  const activos    = empresas.filter(e => e.estado !== 'inactivo').length;
  const inactivos  = empresas.filter(e => e.estado === 'inactivo').length;

  // ✅ "Faenas Registradas" reemplazado por resumen de vigencias (dato que
  // NO se ve de un vistazo en la lista, a diferencia de faenas/trabajadores
  // que sí están visibles por fila). "Trabajadores" eliminado por la misma
  // razón que en Mis Empresas — ya está en la lista.
  const porVencer = empresas.filter(e => {
    if(!e.vigencia_contrato) return false;
    const d = (new Date(e.vigencia_contrato) - new Date()) / (1000*60*60*24);
    return d >= 0 && d <= 30;
  }).length;
  const vencidos = empresas.filter(e => {
    if(!e.vigencia_contrato) return false;
    return (new Date(e.vigencia_contrato) - new Date()) < 0;
  }).length;
  const vigTexto = vencidos > 0
    ? `${vencidos} vencido${vencidos>1?'s':''}`
    : porVencer > 0 ? `${porVencer} por vencer` : '✅ Al día';
  const vigColor = vencidos > 0 ? '#dc2626' : porVencer > 0 ? '#d97706' : 'var(--verde-dark)';

  zona.style.display = 'flex';
  zona.style.flexWrap = 'wrap';
  zona.style.gap = '14px';
  zona.innerHTML =
    _kpiActivoInactivo('Empresas Mandantes', activos, inactivos, '') +
    `<div class="kpi" style="border-color:${vencidos>0?'#dc2626':porVencer>0?'#d97706':'var(--borde)'};">
      <div class="kpi-label">Vigencia de contratos</div>
      <div class="kpi-value" style="color:${vigColor};font-size:20px;">${vigTexto}</div>
      <div class="kpi-sub">${vencidos>0?'requieren atención urgente':porVencer>0?'vencen en ≤30 días':'todos vigentes'}</div>
    </div>`;
}

function switchTabEmpresas(tab){
  tabEmpresasActivo = tab;
  const tabMis  = document.getElementById('tab-mis-empresas');
  const tabMan  = document.getElementById('tab-mandantes');
  const subMis  = document.getElementById('sub-mis-empresas');
  const subMan  = document.getElementById('sub-mandantes');
  const kpiMis  = document.getElementById('kpi-mis-empresas-zone');
  const kpiMan  = document.getElementById('kpi-mandantes-zone');

  if(tab === 'mis-empresas'){
    tabMis.style.borderBottomColor = 'var(--azul)';   tabMis.style.color = 'var(--azul)';   tabMis.style.background = 'var(--gris-bg)';
    tabMan.style.borderBottomColor = 'transparent';    tabMan.style.color = 'var(--texto2)'; tabMan.style.background = 'none';
    subMis.style.display = '';    subMan.style.display = 'none';
    if(kpiMis) kpiMis.style.display = '';
    if(kpiMan) kpiMan.style.display = 'none';
    renderKpisMisEmpresas();
    renderMisEmpresas();
  } else {
    tabMan.style.borderBottomColor = 'var(--azul)';   tabMan.style.color = 'var(--azul)';   tabMan.style.background = 'var(--gris-bg)';
    tabMis.style.borderBottomColor = 'transparent';    tabMis.style.color = 'var(--texto2)'; tabMis.style.background = 'none';
    subMan.style.display = '';    subMis.style.display = 'none';
    if(kpiMan) kpiMan.style.display = '';
    if(kpiMis) kpiMis.style.display = 'none';
    renderKpisMandantes();
    renderContratistas();
  }
}

function renderMisEmpresas(){
  const el = document.getElementById('lista-mis-empresas');
  if(!el) return;

  // Actualizar badges de tabs
  const bMis = document.getElementById('badge-mis-empresas');
  const bMan = document.getElementById('badge-mandantes-tab');
  if(bMis) bMis.textContent = empresas_propias.length;
  if(bMan) bMan.textContent = empresas.length;

  if(!empresas_propias.length){
    el.innerHTML = `<div style="font-size:13px;color:var(--texto3);text-align:center;padding:40px;">
      <i class="ti ti-building-skyscraper" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.3;"></i>
      Sin empresas propias registradas.<br>Utiliza "Nueva Empresa" para comenzar.
    </div>`;
    return;
  }

  // Header tabla
  el.innerHTML = `
    <div style="display:flex;gap:0;padding:8px 14px;background:var(--gris-bg);
      border-radius:var(--radius);margin-bottom:6px;font-size:11px;
      font-weight:700;color:var(--texto3);text-transform:uppercase;letter-spacing:0.4px;">
      <div style="flex:2;">Empresa</div>
      <div style="flex:1;">RUT</div>
      <div style="flex:0.5;text-align:center;">Total</div>
      <div style="flex:0.5;text-align:center;">Activos</div>
      <div style="flex:0.5;text-align:center;">Inactivos</div>
      <div style="flex:2;text-align:right;">Acciones</div>
    </div>
    ${empresas_propias.map(ep => {
      const trabEp   = trabajadores.filter(t => t.empresa_propia_id === ep.id);
      const activos  = trabEp.filter(t => t.estado === 'activo').length;
      const inactivos= trabEp.filter(t => t.estado !== 'activo').length;
      const ini = ep.nombre?.substring(0,2).toUpperCase() || 'EP';
      const cols= ['#0f2942','#1a5c3a','#7c3aed','#b45309','#0369a1'];
      const col = cols[ep.nombre?.charCodeAt(0)%5||0];

      return `<div style="display:flex;align-items:center;gap:0;padding:12px 14px;
        background:#fff;border-radius:var(--radius);margin-bottom:6px;
        border:1px solid var(--borde);transition:box-shadow 0.15s;"
        onmouseover="this.style.boxShadow='var(--shadow-md)'"
        onmouseout="this.style.boxShadow='none'">
        <div style="flex:2;display:flex;align-items:center;gap:10px;">
          <div style="width:38px;height:38px;border-radius:8px;background:${col};
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-size:12px;font-weight:700;flex-shrink:0;">${ini}</div>
          <div>
            <div style="font-weight:600;font-size:13px;">${ep.nombre||'—'}</div>
            <div style="font-size:11px;color:var(--texto2);">${ep.correo||ep.telefono||''}</div>
          </div>
        </div>
        <div style="flex:1;font-family:monospace;font-size:11px;color:var(--texto2);">${ep.rut||'—'}</div>
        <div style="flex:0.5;text-align:center;font-weight:700;font-size:14px;">${trabEp.length}</div>
        <div style="flex:0.5;text-align:center;">
          <span style="background:#D1FAE5;color:#065F46;border-radius:99px;
            padding:2px 8px;font-size:11px;font-weight:600;">${activos}</span>
        </div>
        <div style="flex:0.5;text-align:center;">
          <span style="background:${inactivos>0?'#FEE2E2':'#F1F5F9'};
            color:${inactivos>0?'#991B1B':'var(--texto3)'};
            border-radius:99px;padding:2px 8px;font-size:11px;font-weight:600;">${inactivos}</span>
        </div>
        <div style="flex:2;display:flex;gap:5px;justify-content:flex-end;" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="verTrabajadoresEmpresaPropia('${ep.id}')" title="Ver trabajadores">
            <i class="ti ti-eye"></i> Trabajadores
          </button>
          <button class="btn btn-secondary btn-sm" onclick="abrirModalEmpresaPropia('${ep.id}')" title="Editar">
            <i class="ti ti-edit"></i> Editar
          </button>
          <button class="btn btn-secondary btn-sm" onclick="toggleEstadoEmpresaPropia('${ep.id}')"
            style="color:${ep.estado==='inactivo'?'var(--verde-dark)':'var(--danger)'};"
            title="${ep.estado==='inactivo'?'Activar':'Dar de baja'}">
            <i class="ti ti-${ep.estado==='inactivo'?'circle-check':'circle-minus'}"></i>
            ${ep.estado==='inactivo'?'Activar':'Baja'}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="eliminarEmpresaPropia('${ep.id}')"
            style="color:var(--danger);" title="Eliminar">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>`;
    }).join('')}`;
}

function abrirModalEmpresaPropia(id){
  const modal = document.getElementById('modal-empresa-propia');
  modal.style.display = 'flex';
  document.getElementById('ep-id-original').value = id || '';
  document.getElementById('modal-ep-titulo').textContent = id ? 'Editar Empresa' : 'Nueva Empresa Propia';

  const campos = ['ep-rut','ep-nombre','ep-rut-rep','ep-nombre-rep','ep-cargo-rep',
                  'ep-correo','ep-telefono','ep-ciudad','ep-direccion','ep-comuna','ep-region'];

  if(!id){
    campos.forEach(c => { const el=document.getElementById(c); if(el) el.value=''; });
    return;
  }
  const ep = empresas_propias.find(e => e.id === id);
  if(!ep) return;
  document.getElementById('ep-rut').value          = ep.rut||'';
  document.getElementById('ep-nombre').value       = ep.nombre||'';
  document.getElementById('ep-rut-rep').value      = ep.rut_representante||'';
  document.getElementById('ep-nombre-rep').value   = ep.nombre_representante||'';
  document.getElementById('ep-cargo-rep').value    = ep.cargo_representante||'';
  document.getElementById('ep-correo').value       = ep.correo||'';
  document.getElementById('ep-telefono').value     = ep.telefono||'';
  document.getElementById('ep-ciudad').value       = ep.ciudad||'';
  document.getElementById('ep-direccion').value    = ep.direccion||'';
  document.getElementById('ep-comuna').value       = ep.comuna||'';
  document.getElementById('ep-region').value       = ep.region||'';
  const msgDup = document.getElementById('ep-rut-msg-dup');
  if(msgDup) msgDup.textContent = '';
  document.getElementById('ep-rut').style.borderColor = '';
}

function cerrarModalEmpresaPropia(){
  document.getElementById('modal-empresa-propia').style.display = 'none';
}

/* ✅ Validación de RUT duplicado EN VIVO (al salir del campo), en vez de
   esperar a que se presione Guardar — resuelve además el problema de que
   el aviso por toast quedaba abajo a la derecha y era fácil de no ver:
   ahora el mensaje queda fijo, en rojo, justo debajo del campo. */
function _validarRutDuplicadoEnVivo(input){
  let msgEl = document.getElementById(input.id + '-msg-dup');
  if(!msgEl){
    msgEl = document.createElement('div');
    msgEl.id = input.id + '-msg-dup';
    msgEl.style.cssText = 'font-size:11px;color:var(--danger);margin-top:4px;';
    input.insertAdjacentElement('afterend', msgEl);
  }
  const rut = input.value.trim();
  if(!rut){ msgEl.textContent = ''; input.style.borderColor = ''; return; }

  const idExcluirEl = input.id === 'ep-rut'
    ? document.getElementById('ep-id-original')
    : document.getElementById('e-rut-original');
  const idExcluir = idExcluirEl?.value || '';

  const dup = _rutYaExiste(rut, idExcluir);
  if(dup){
    msgEl.textContent = `⚠️ Este RUT ya está registrado en "${dup.registro.nombre}" (${dup.tipo})`;
    input.style.borderColor = 'var(--danger)';
  } else {
    msgEl.textContent = '';
    input.style.borderColor = '';
  }
}

function _formatoCorreoValido(correo){
  if(!correo) return true; // vacío se valida aparte según si el campo es obligatorio
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(correo);
}

function guardarEmpresaPropia(){
  const rut    = document.getElementById('ep-rut').value.trim();
  const nombre = document.getElementById('ep-nombre').value.trim();
  const rutRep = document.getElementById('ep-rut-rep').value.trim();
  if(!rut)    { toast('⚠️ Ingresa el RUT de la empresa','error'); return; }
  if(!nombre) { toast('⚠️ Ingresa la razón social','error'); return; }
  if(!validarRUT(rut)){
    const continuar = confirm(`El dígito verificador del RUT "${rut}" no coincide.\n¿Deseas guardarlo de todas formas?`);
    if(!continuar) return;
  }
  if(rutRep && !validarRUT(rutRep)){
    const continuar = confirm(`El dígito verificador del RUT representante "${rutRep}" no coincide.\n¿Deseas guardarlo de todas formas?`);
    if(!continuar) return;
  }
  if(rutRep && _rutsIguales(rut, rutRep)){
    toast('❌ El RUT del representante no puede ser igual al RUT de la empresa','error');
    return;
  }

  const idOrig = document.getElementById('ep-id-original').value;

  const dup = _rutYaExiste(rut, idOrig);
  if(dup){
    toast(`❌ Ese RUT ya está registrado en "${dup.registro.nombre}" (${dup.tipo})`,'error');
    return;
  }

  // ✅ Campos obligatorios ampliados — quedan opcionales solo Cargo,
  // Correo y Teléfono (decisión del usuario). RUT y Razón Social ya se
  // validaban arriba.
  const nombreRep = document.getElementById('ep-nombre-rep').value.trim();
  const correo    = document.getElementById('ep-correo').value.trim();
  const ciudad    = document.getElementById('ep-ciudad').value.trim();
  const direccion = document.getElementById('ep-direccion').value.trim();
  const comuna    = document.getElementById('ep-comuna').value.trim();
  const region    = document.getElementById('ep-region').value;

  if(!rutRep)     { toast('⚠️ Ingresa el RUT del representante','error'); return; }
  if(!nombreRep)  { toast('⚠️ Ingresa el nombre del representante','error'); return; }
  if(!ciudad)     { toast('⚠️ Ingresa la ciudad','error'); return; }
  if(!direccion)  { toast('⚠️ Ingresa la dirección','error'); return; }
  if(!comuna)     { toast('⚠️ Ingresa la comuna','error'); return; }
  if(!region)     { toast('⚠️ Selecciona la región','error'); return; }
  if(correo && !_formatoCorreoValido(correo)){
    toast('⚠️ El correo ingresado no tiene un formato válido','error');
    return;
  }

  const epExistente = empresas_propias.find(e => e.id === idOrig || e.rut === rut);
  const datos = {
    id:                  idOrig || 'ep_' + Date.now(),
    rut,
    nombre,
    rut_representante:   rutRep,
    nombre_representante:nombreRep,
    cargo_representante: document.getElementById('ep-cargo-rep').value.trim(),
    correo,
    telefono:            document.getElementById('ep-telefono').value.trim(),
    ciudad,
    direccion,
    comuna,
    region,
    estado:              epExistente?.estado || 'activo',
  };

  const idx = empresas_propias.findIndex(e => e.id === idOrig || e.rut === rut);
  if(idx >= 0) empresas_propias[idx] = datos;
  else empresas_propias.push(datos);

  guardarLocal();
  cerrarModalEmpresaPropia();
  renderMisEmpresas();
  renderKpisMisEmpresas();
  poblarSelectsEmpresaPropia();
  toast(`✅ ${datos.nombre} guardada`, 'exito');
}

function toggleEstadoEmpresaPropia(id){
  const ep = empresas_propias.find(e => e.id === id);
  if(!ep) return;
  const nuevoEstado = ep.estado === 'inactivo' ? 'activo' : 'inactivo';
  const accion = nuevoEstado === 'inactivo' ? 'dar de baja' : 'reactivar';
  if(!confirm(`¿Confirmas ${accion} a ${ep.nombre}?`)) return;
  ep.estado = nuevoEstado;
  guardarLocal();
  renderMisEmpresas();
  renderKpisMisEmpresas();
  toast(`✅ ${ep.nombre} ${nuevoEstado === 'inactivo' ? 'dada de baja' : 'reactivada'}`, 'exito');
}

function eliminarEmpresaPropia(id){
  const ep = empresas_propias.find(e => e.id === id);
  if(!ep) return;
  const enUso = trabajadores.some(t => t.empresa_propia_id === id);
  if(enUso){ toast(`⚠️ ${ep.nombre} tiene trabajadores asignados — reasígnalos primero`, 'error'); return; }
  if(!confirm(`¿Eliminar ${ep.nombre}?`)) return;
  empresas_propias = empresas_propias.filter(e => e.id !== id);
  guardarLocal();
  renderMisEmpresas();
  renderKpisMisEmpresas();
  toast('🗑️ Empresa eliminada', 'exito');
}

function verTrabajadoresEmpresaPropia(id){
  const ep = empresas_propias.find(e => e.id === id);
  // Ir a módulo trabajadores con filtro por empresa propia
  const btn = [...document.querySelectorAll('.sb-item')].find(b => b.getAttribute('onclick')?.includes('trabajadores'));
  if(btn) irA('trabajadores', btn);
  setTimeout(() => {
    const sel = document.getElementById('filtro-empresa-propia');
    if(sel){ sel.value = id; cargarTrabajadores(); }
  }, 200);
}

function poblarSelectsEmpresaPropia(){
  const ids = ['filtro-empresa-propia', 'filtro-empresa-propia-ext', 'asignar-ep-select', 'm-empresa-contratista', 'c-empresa-propia', 'lote-empresa-propia'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const val = el.value;
    const esSeleccionUnica = (id === 'm-empresa-contratista' || id === 'lote-empresa-propia');
    el.innerHTML = `<option value="">${esSeleccionUnica ? '— Seleccionar empresa propia —' : '— Todas las empresas —'}</option>`
      + empresas_propias.map(ep => `<option value="${ep.id}">${ep.nombre}</option>`).join('');
    if(val) el.value = val;
  });
}


function abrirModalMandante(){
  abrirModalEmpresa(null); // reutiliza el modal existente
}

// ✅ Eliminado código muerto confirmado (Hallazgo Grande #13): el modal
// "Reasignar Mandante" completo — abrirModalAsignarMandante,
// cerrarModalAsignarMandante, onCambioMandanteAsignar,
// guardarAsignacionMandante — nunca se llamaba desde ningún botón ni
// onclick en todo el sistema. Se verificó exhaustivamente antes de
// eliminarlo (ver bitácora, Hallazgo #13).

function estadoVencimiento(fecha){
  if(!fecha) return {texto:'Sin fecha',color:'var(--texto3)',badge:'',dias:null};
  const dias=(new Date(fecha)-new Date())/(1000*60*60*24);
  const txt=new Date(fecha).toLocaleDateString('es-CL');
  if(dias<0)   return{texto:txt,color:'#dc2626',badge:'<span style="background:#FEE2E2;color:#dc2626;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;margin-left:6px;">🔴 VENCIDO</span>',dias};
  if(dias<=30) return{texto:txt,color:'#d97706',badge:`<span style="background:#FEF3C7;color:#d97706;font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;margin-left:6px;">⚡ Vence en ${Math.ceil(dias)}d</span>`,dias};
  return{texto:txt,color:'#16a34a',badge:'',dias};
}
