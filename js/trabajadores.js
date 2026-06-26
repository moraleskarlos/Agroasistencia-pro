/* ════ TRABAJADORES ════ */

function cargarTrabajadores(){
  const fEmp    = document.getElementById('filtro-empresa')?.value || '';
  const fEst    = document.getElementById('filtro-estado')?.value  || '';
  const fFecha  = document.getElementById('filtro-fecha-ingreso')?.value || '';
  const buscar  = (document.getElementById('buscar-trab')?.value || '').toLowerCase().replace(/\./g,'');

  const lista = trabajadores.filter(t => {
    const m       = findMandante(t);
    const mEmp    = !fEmp || (m?.id === fEmp) || (m?.rut === fEmp) || (t.empresa_rut === fEmp) || (t.empresa === fEmp);
    const mEst    = !fEst   || t.estado === fEst;
    const rutLimp = (t.rut||'').replace(/\./g,'').toLowerCase();
    const mBus    = !buscar || t.nombre?.toLowerCase().includes(buscar) || rutLimp.includes(buscar);
    const mFecha  = !fFecha || t.fecha_ingreso === fFecha;
    return mEmp && mEst && mBus && mFecha;
  });

  // KPIs
  const total   = trabajadores.length;
  const activos = trabajadores.filter(t => t.estado === 'activo').length;
  const inact   = total - activos;

  const kT = document.getElementById('kpi-t-total');
  const kA = document.getElementById('kpi-t-activos');
  const kI = document.getElementById('kpi-t-inactivos');
  if(kT) kT.textContent = total;
  if(kA) kA.textContent = activos;
  if(kI) kI.textContent = inact;

  const firmados   = trabajadores.filter(t => (contratos||[]).some(c => c.trabajador_id === t.id || c.trabajador_rut === t.rut)).length;
  const pendientes = total - firmados;
  const kCval = document.getElementById('kpi-t-contratos-val');
  const kCsub = document.getElementById('kpi-t-contratos-sub');
  if(kCval && kCsub){
    if(total === 0){
      kCval.textContent = '—';
      kCval.style.color = 'var(--texto3)';
      kCsub.textContent = 'sin trabajadores';
    } else if(pendientes === 0){
      kCval.textContent = '✅ Al día';
      kCval.style.color = 'var(--verde-dark)';
      kCsub.textContent = 'todos vigentes';
    } else {
      kCval.textContent = `⚠️ ${pendientes} pendiente${pendientes!==1?'s':''}`;
      kCval.style.color = '#d97706';
      kCsub.textContent = `${firmados}/${total} firmados`;
    }
  }

  const tbody = document.getElementById('tbody-trabajadores');
  if(!tbody) return;

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:28px;color:var(--texto3);">
      ${total === 0
        ? '📋 Sin trabajadores — ve a Registro Personal'
        : '🔍 Sin resultados para los filtros'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map((t) => {
    const mandante     = findMandante(t);
    const mandanteNom  = mandante ? mandante.nombre : '—';
    const faenaNom     = t.faena_obra || '—';
    const cargoNom     = t.funcion_cargo || '—';
    const empPrincipal = getEmpresaEmpleadora(t.empresa_propia_id)?.razon_social || '—';
    const activo       = t.estado !== 'inactivo';

    const contrato = (contratos || []).find(c => c.trabajador_id === t.id || c.trabajador_rut === t.rut);
    const estadoContrato = contrato
      ? `<span style="background:#D1FAE5;color:#065F46;font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;white-space:nowrap;">✅ Firmado</span>`
      : `<span style="background:#FEF3C7;color:#92400E;font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;white-space:nowrap;">⚠️ Pendiente</span>`;

    return `<tr>
      <td style="text-align:center;width:36px;">
        <input type="checkbox" class="trab-check"
          data-id="${t.id}" data-rut="${t.rut}"
          style="width:16px;height:16px;accent-color:var(--verde);cursor:pointer;">
      </td>
      <td style="font-size:12px;">${empPrincipal}</td>
      <td style="font-size:12px;color:var(--texto2);white-space:nowrap;">
        ${t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString('es-CL') : '—'}
      </td>
      <td style="font-size:12px;font-family:monospace;color:var(--texto2);">${t.rut||'—'}</td>
      <td class="wrap-ok" style="font-size:13px;font-weight:500;min-width:160px;">${t.nombre||'—'}</td>
      <td style="font-size:12px;">${t.nacionalidad||'—'}</td>
      <td style="font-size:12px;">${cargoNom}</td>
      <td style="font-size:12px;">${mandanteNom}</td>
      <td class="wrap-ok" style="font-size:12px;min-width:160px;">${faenaNom}</td>
      <td>
        <span class="badge ${activo ? 'badge-verde' : 'badge-rojo'}">
          ${activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>${estadoContrato}</td>
      <td style="min-width:120px;">
        <div style="display:flex;gap:5px;flex-wrap:nowrap;align-items:center;">
          <button class="btn btn-secondary btn-sm"
            onclick="editarTrabajador('${t.rut}')" title="Editar">
            <i class="ti ti-edit"></i>
          </button>
          <button class="btn btn-secondary btn-sm"
            onclick="irAContrato('${t.rut}')" title="Ver contrato">
            <i class="ti ti-file-text"></i>
          </button>
          <button class="btn ${activo ? 'btn-danger' : 'btn-secondary'} btn-sm"
            onclick="cambiarEstado('${t.rut}','${activo ? 'inactivo' : 'activo'}')"
            title="${activo ? 'Dar de baja' : 'Reactivar'}">
            <i class="ti ti-${activo ? 'user-minus' : 'user-check'}"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function seleccionarTodosTrab(val){
  document.querySelectorAll('.trab-check').forEach(c => c.checked = val);
}

function editarTrabajador(rut){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return;
  irA('registro', document.querySelectorAll('.sb-item')[2]);
  setTimeout(() => {
    cargarEnFormulario(t);
    const btn = document.getElementById('btn-guardar-txt');
    if(btn) btn.textContent = 'Actualizar trabajador';
    toast('✅ Datos cargados para editar', 'exito');
  }, 150);
}

async function cambiarEstado(rut, nuevoEstado){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return;

  const accion = nuevoEstado === 'inactivo' ? 'dar de baja' : 'reactivar';
  if(!confirm(`¿Confirmas ${accion} a ${t.nombre}?`)) return;

  t.estado = nuevoEstado;
  if(supabaseClient) await supabaseClient.from('trabajadores').update({estado: nuevoEstado}).eq('rut', rut);
  guardarLocal();

  // Quedarse en trabajadores y refrescar tabla (NO redirigir)
  cargarTrabajadores();
  toast(`✅ ${t.nombre} ${nuevoEstado === 'inactivo' ? 'dado de baja' : 'reactivado'}`, 'exito');
}

function irAContrato(rut){
  const btn = [...document.querySelectorAll('.sb-item')]
    .find(b => b.getAttribute('onclick')?.includes('contratos'));
  // Pasar el rut directamente a irA para que initContratos lo reciba
  _rutPrecontratoTemp = rut;
  if(btn) irA('contratos', btn);
}

function exportarTrabajadoresExcel(){
  if(!trabajadores.length){
    toast('⚠️ Sin datos para exportar','error');
    return;
  }

  const data = trabajadores.map(t => {
    const mandante = findMandante(t);
    const cont = contratos.find(c => c.trabajador_id === t.id || c.trabajador_rut === t.rut);
    const fmt = v => v ? new Date(v).toLocaleDateString('es-CL') : '';

    return {
      RUT: t.rut,
      'Nombre Completo': t.nombre,
      Nacionalidad: t.nacionalidad || '',
      'Fecha Nacimiento': fmt(t.fecha_nacimiento),
      'Estado Civil': t.estado_civil || '',
      'Correo Electrónico': t.correo_electronico || '',
      Domicilio: t.domicilio || '',
      'AFP': t.afiliacion_afp || '',
      'Sistema de Salud': t.sistema_salud || '',
      'Empresa Mandante': mandante?.nombre || '',
      'RUT Mandante': mandante?.rut || '',
      Faena: t.faena_obra || '',
      Cargo: t.funcion_cargo || '',
      'Fecha Ingreso': fmt(t.fecha_ingreso),
      Estado: t.estado === 'activo' ? 'Activo' : 'Inactivo',
      Contrato: cont ? 'Firmado' : 'Pendiente',
      'Fecha Firma Contrato': fmt(cont?.fecha_firma),
      'Sueldo Base': cont?.sueldo_monto ? '$' + parseInt(cont.sueldo_monto).toLocaleString('es-CL') : '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  // Ajustar ancho de columnas automáticamente según contenido
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

function limpiarFiltroFecha(){
  const el = document.getElementById('filtro-fecha-ingreso');
  if(el){ el.value = ''; cargarTrabajadores(); }
}

function switchTabTrabajadores(tab){
  const todos      = document.getElementById('sub-tab-todos-trab');
  const extTab     = document.getElementById('sub-tab-extranjeros-trab');
  const btnTodos   = document.getElementById('tab-todos-trab');
  const btnExt     = document.getElementById('tab-extranjeros-trab');
  if(tab === 'extranjeros'){
    if(todos)    todos.style.display    = 'none';
    if(extTab)   extTab.style.display   = 'block';
    if(btnTodos) { btnTodos.style.background=  'var(--gris-bg)'; btnTodos.style.color='var(--texto2)'; }
    if(btnExt)   { btnExt.style.background  = 'var(--azul)';    btnExt.style.color  = '#fff'; }
    cargarExtranjeros();
  } else {
    if(todos)    todos.style.display    = 'block';
    if(extTab)   extTab.style.display   = 'none';
    if(btnTodos) { btnTodos.style.background= 'var(--azul)';    btnTodos.style.color= '#fff'; }
    if(btnExt)   { btnExt.style.background = 'var(--gris-bg)'; btnExt.style.color  = 'var(--texto2)'; }
    cargarTrabajadores();
  }
}

function semaforo(fechaVenc, tipoDoc){
  if(!fechaVenc) return { emoji:'⚫', label:'Sin documento', clase:'vencido' };
  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const venc  = new Date(fechaVenc); venc.setHours(0,0,0,0);
  const dias  = Math.round((venc - hoy) / 86400000);
  if(dias < 0)  return { emoji:'⚫', label:'Vencido',              clase:'vencido',    dias };
  if(dias <= 30) return { emoji:'🔴', label:'Urgente',             clase:'urgente',    dias };
  if(dias <= 90) return { emoji:'🟡', label:'Iniciar trámite',     clase:'advertencia',dias };
  return              { emoji:'🟢', label:'Vigente',               clase:'vigente',    dias };
}

function cargarExtranjeros(){
  const buscar  = (document.getElementById('buscar-extranjero')?.value||'').toLowerCase().trim();
  const tbody   = document.getElementById('tbody-extranjeros');
  if(!tbody) return;

  const extranjeros = trabajadores.filter(t =>
    t.nacionalidad && t.nacionalidad !== 'Chileno' && t.estado === 'activo'
  );

  const filtrados = buscar
    ? extranjeros.filter(t =>
        (t.nombre||'').toLowerCase().includes(buscar) ||
        (t.rut||'').toLowerCase().includes(buscar))
    : extranjeros;

  if(!filtrados.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--texto3);">Sin trabajadores extranjeros registrados</td></tr>`;
    actualizarBadgeExtranjeros(extranjeros);
    return;
  }

  tbody.innerHTML = filtrados.map(t => {
    const sem   = semaforo(t.fecha_venc_mig, t.tipo_doc_mig);
    const dias  = sem.dias !== undefined
      ? (sem.dias < 0 ? `${Math.abs(sem.dias)} días vencido` : `${sem.dias} días`)
      : '—';
    const venc  = t.fecha_venc_mig
      ? new Date(t.fecha_venc_mig).toLocaleDateString('es-CL')
      : '—';
    return `<tr>
      <td>${t.rut||'—'}</td>
      <td><strong>${t.nombre||'—'}</strong></td>
      <td>${t.nacionalidad||'—'}</td>
      <td>${t.tipo_doc_mig||'Sin registrar'}</td>
      <td>${venc}</td>
      <td style="text-align:center;">${dias}</td>
      <td style="text-align:center;font-size:18px;" title="${sem.label}">${sem.emoji}</td>
    </tr>`;
  }).join('');

  actualizarBadgeExtranjeros(extranjeros);
}

function actualizarBadgeExtranjeros(lista){
  const badge = document.getElementById('badge-extranjeros-urgente');
  if(!badge) return;
  const urgentes = lista.filter(t => {
    const s = semaforo(t.fecha_venc_mig, t.tipo_doc_mig);
    return s.clase === 'urgente' || s.clase === 'vencido';
  }).length;
  badge.style.display = urgentes > 0 ? 'inline' : 'none';
  badge.textContent   = urgentes > 0 ? urgentes : '';
}
