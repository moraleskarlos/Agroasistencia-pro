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
    const empPrincipal = cfg.empresa?.razon_social || '—';
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


function limpiarFiltroFecha(){
  const el = document.getElementById('filtro-fecha-ingreso');
  if(el){ el.value = ''; cargarTrabajadores(); }
}

/* ── MÓDULO EXTRANJEROS ─────────────────────────────────── */
function actualizarBadgeExtranjeros(extranjeros){
  const badge = document.getElementById('badge-extranjeros-urgente');
  if(!badge) return;
  const urgentes = extranjeros.filter(t => {
    const semaforo = _calcularSemaforo(t.fecha_venc_migratorio);
    return semaforo === 'rojo' || semaforo === 'negro';
  });
  badge.style.display = urgentes.length ? 'inline' : 'none';
  badge.textContent   = urgentes.length;
}

function switchTabTrabajadores(tab){
  ['lista','extranjeros'].forEach(t => {
    const btn   = document.getElementById(`tab-${t}-trab`);
    const panel = document.getElementById(`sub-tab-${t}-trab`);
    const activo = t === tab;
    if(btn){
      btn.style.color            = activo ? 'var(--verde-dark)' : 'var(--texto2)';
      btn.style.borderBottomColor= activo ? 'var(--verde-dark)' : 'transparent';
      btn.style.fontWeight       = activo ? '700' : '600';
    }
    if(panel) panel.style.display = activo ? 'block' : 'none';
  });
  if(tab === 'extranjeros') renderTablaExtranjeros();
}

function renderTablaExtranjeros(){
  const buscar = (document.getElementById('buscar-extranjero')?.value || '').toLowerCase();
  const tbody  = document.getElementById('tbody-extranjeros');
  if(!tbody) return;

  const extranjeros = trabajadores.filter(t => {
    const esExtranjero = t.nacionalidad && t.nacionalidad !== 'Chileno';
    if(!esExtranjero) return false;
    if(!buscar) return true;
    return t.nombre?.toLowerCase().includes(buscar) ||
           t.rut?.toLowerCase().replace(/\./g,'').includes(buscar.replace(/\./g,''));
  });

  if(!extranjeros.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--texto3);">
      Sin trabajadores extranjeros registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = extranjeros.map(t => {
    const semaforo = _calcularSemaforo(t.fecha_venc_migratorio);
    const badge    = _badgeSemaforo(semaforo, t.fecha_venc_migratorio);
    const mandante = findMandante(t);
    return `<tr>
      <td style="font-size:13px;font-weight:500;">${t.nombre}</td>
      <td style="font-size:12px;font-family:monospace;">${t.rut}</td>
      <td style="font-size:12px;">${t.nacionalidad}</td>
      <td style="font-size:12px;">${t.tipo_doc_migratorio || '—'}</td>
      <td style="font-size:12px;">${t.num_doc_migratorio || '—'}</td>
      <td style="font-size:12px;">${t.fecha_venc_migratorio
        ? new Date(t.fecha_venc_migratorio+'T12:00:00').toLocaleDateString('es-CL')
        : '—'}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}

function _calcularSemaforo(fechaVenc){
  if(!fechaVenc) return 'gris';
  const hoy      = new Date();
  const venc     = new Date(fechaVenc+'T12:00:00');
  const diasRest = Math.floor((venc - hoy) / (1000*60*60*24));
  if(diasRest < 0)   return 'negro';   // vencido
  if(diasRest <= 30) return 'rojo';    // urgente
  if(diasRest <= 90) return 'amarillo';// iniciar trámite
  return 'verde';                      // vigente
}

function _badgeSemaforo(semaforo, fechaVenc){
  const hoy      = new Date();
  const venc     = fechaVenc ? new Date(fechaVenc+'T12:00:00') : null;
  const diasRest = venc ? Math.floor((venc - hoy) / (1000*60*60*24)) : null;

  const map = {
    verde:    ['🟢', 'badge-verde',    'Vigente'],
    amarillo: ['🟡', 'badge-amarillo', `Vence en ${diasRest} días`],
    rojo:     ['🔴', 'badge-rojo',     `⚠️ ${diasRest} días`],
    negro:    ['⚫', 'badge-rojo',     'Vencido'],
    gris:     ['⚪', 'badge-gris',     'Sin fecha'],
  };
  const [icono, cls, texto] = map[semaforo] || map.gris;
  return `<span class="badge ${cls}">${icono} ${texto}</span>`;
}
