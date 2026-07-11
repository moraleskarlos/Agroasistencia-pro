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
    const empEmpleadora = getEmpresaEmpleadora(t.empresa_propia_id);
    const empPrincipal = empEmpleadora?.razon_social || empEmpleadora?.nombre || '—';
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
            onclick="verPerfilTrabajador('${t.rut}')" title="Carpeta laboral">
            <i class="ti ti-folder"></i>
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
          ${!_tieneMovimientosTrabajador(t.rut) ? `
          <button class="btn btn-danger btn-sm"
            onclick="eliminarTrabajadorDefinitivo('${t.rut}')" title="Eliminar definitivamente (sin movimientos registrados)">
            <i class="ti ti-trash"></i>
          </button>` : ''}
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

/* Un trabajador solo se puede eliminar de verdad si nunca tuvo movimientos reales:
   ni contrato/anexo/liquidación/finiquito/novedad (todo eso queda en carpeta[]),
   ni haberes/descuentos/jornada especial, ni asistencia marcada. */
function _tieneMovimientosTrabajador(rut){
  if(typeof cargarGestionLaboral === 'function') cargarGestionLaboral();

  const enCarpeta = (carpeta || []).some(d => d.trabajador_rut === rut);
  if(enCarpeta) return true;

  const enHaberes    = (typeof haberes_variables !== 'undefined' ? haberes_variables : []).some(h => h.trabajador_rut === rut);
  const enDescuentos = (typeof descuentos !== 'undefined' ? descuentos : []).some(d => d.trabajador_rut === rut);
  const enJornada    = (typeof jornada_especial !== 'undefined' ? jornada_especial : []).some(j => j.trabajador_rut === rut);
  if(enHaberes || enDescuentos || enJornada) return true;

  // Asistencia marcada (no queda registrada en carpeta, hay que revisar localStorage directo)
  for(let i = 0; i < localStorage.length; i++){
    const key = localStorage.key(i);
    if(!key || !key.startsWith('asistencia_')) continue;
    let data;
    try{ data = JSON.parse(localStorage.getItem(key)) || []; } catch { continue; }
    if(data.some(m => m.rut === rut)) return true;
  }

  return false;
}

function eliminarTrabajadorDefinitivo(rut){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return;

  if(_tieneMovimientosTrabajador(rut)){
    toast('⚠️ No se puede eliminar: ya tiene movimientos registrados (usa Dar de baja)', 'error');
    return;
  }

  if(!confirm(`¿Eliminar definitivamente a ${t.nombre}?\n\nEsta acción no se puede deshacer. Se usa solo cuando el trabajador nunca llegó a tener movimientos reales en el sistema (ej: se arrepintió antes de ingresar).`)) return;

  trabajadores = trabajadores.filter(x => x.rut !== rut);
  guardarLocal();
  toast(`🗑️ ${t.nombre} eliminado del sistema`, 'exito');
  cargarTrabajadores();
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
  // Tabs: 'todos' y 'extranjeros'
  ['todos','extranjeros'].forEach(t => {
    const btn   = document.getElementById(`tab-${t}-trab`);
    const panel = document.getElementById(`sub-tab-${t}-trab`);
    const activo = t === tab;
    if(btn){
      btn.style.background = activo ? 'var(--azul)' : 'var(--gris-bg)';
      btn.style.color      = activo ? '#fff' : 'var(--texto2)';
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
    const semaforo  = _calcularSemaforo(t.fecha_venc_migratorio);
    const badge     = _badgeSemaforo(semaforo, t.fecha_venc_migratorio);
    const venc      = t.fecha_venc_migratorio
      ? new Date(t.fecha_venc_migratorio+'T12:00:00')
      : null;
    const diasRest  = venc
      ? Math.floor((venc - new Date()) / (1000*60*60*24))
      : null;
    const diasTxt   = diasRest !== null
      ? (diasRest < 0 ? `Vencido hace ${Math.abs(diasRest)} días` : `${diasRest} días`)
      : '—';
    const fechaTxt  = venc ? venc.toLocaleDateString('es-CL') : '—';

    return `<tr>
      <td style="font-size:12px;font-family:monospace;">${t.rut}</td>
      <td style="font-size:13px;font-weight:500;">${t.nombre}</td>
      <td style="font-size:12px;">${t.nacionalidad}</td>
      <td style="font-size:12px;">${t.tipo_doc_migratorio || '—'}</td>
      <td style="font-size:12px;">${fechaTxt}</td>
      <td style="font-size:12px;">${diasTxt}</td>
      <td style="text-align:center;">${badge}</td>
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

/* ════════════════════════════════════════════════════════
   PERFIL DE TRABAJADOR — Datos Personales + Carpeta Laboral
   ════════════════════════════════════════════════════════ */
let _perfil_rut_actual = null;

const _TIPO_DOC_CARPETA = {
  contrato:       { icono:'📄', label:'Contrato' },
  anexo:          { icono:'📎', label:'Anexo' },
  liquidacion:    { icono:'💰', label:'Liquidación' },
  finiquito:      { icono:'📝', label:'Finiquito' },
  epp_riohs_irl:  { icono:'⚠️', label:'RIOHS / IRL' },
  carta:          { icono:'✉️', label:'Carta' },
  otro:           { icono:'📁', label:'Otro' },
};

function verPerfilTrabajador(rut){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t){ toast('⚠️ Trabajador no encontrado', 'error'); return; }

  _perfil_rut_actual = rut;
  irA('perfil-trabajador');

  const ini = (t.nombre||'??').split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const header = document.getElementById('perfil-header');
  if(header){
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;border-radius:50%;background:#DBEAFE;color:#1D4ED8;
          display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;">${ini}</div>
        <div>
          <div class="sec-title" style="margin-bottom:2px;">${t.nombre}</div>
          <div class="sec-sub" style="display:flex;gap:8px;align-items:center;">
            <span style="font-family:monospace;">${t.rut}</span>
            <span class="badge ${t.estado==='activo'?'badge-verde':'badge-gris'}">${t.estado==='activo'?'Activo':'Inactivo'}</span>
          </div>
        </div>
      </div>`;
  }

  _renderDatosPersonalesPerfil(t);
  _renderCarpetaTrabajador(rut);
  switchTabPerfil('datos');
}

function switchTabPerfil(tab){
  const tabs  = { datos:'tab-perfil-datos', carpeta:'tab-perfil-carpeta' };
  const subs  = { datos:'sub-perfil-datos', carpeta:'sub-perfil-carpeta' };

  Object.keys(tabs).forEach(key => {
    const btn = document.getElementById(tabs[key]);
    const sub = document.getElementById(subs[key]);
    if(!btn || !sub) return;
    const activo = key === tab;
    sub.style.display = activo ? 'block' : 'none';
    btn.style.color = activo ? 'var(--azul)' : 'var(--texto2)';
    btn.style.borderBottom = activo ? '2px solid var(--azul)' : '2px solid transparent';
  });

  if(tab === 'carpeta' && _perfil_rut_actual) _renderCarpetaTrabajador(_perfil_rut_actual);
}

function _renderDatosPersonalesPerfil(t){
  const cont = document.getElementById('perfil-datos-resumen');
  if(!cont) return;

  const empEmpleadora = getEmpresaEmpleadora(t.empresa_propia_id);
  const mandante = findMandante(t);

  const fila = (label, valor) => `
    <div style="padding:8px 0;border-bottom:1px solid var(--borde);display:flex;justify-content:space-between;gap:12px;">
      <span style="font-size:12px;color:var(--texto3);">${label}</span>
      <span style="font-size:13px;font-weight:500;text-align:right;">${valor || '—'}</span>
    </div>`;

  let migratorioHTML = '';
  if(t.nacionalidad && t.nacionalidad !== 'Chileno'){
    const semaforo = _calcularSemaforo(t.fecha_venc_migratorio);
    migratorioHTML = `
      <div class="card-title" style="margin:18px 0 8px;font-size:13px;">
        <i class="ti ti-id"></i> Situación migratoria
      </div>
      ${fila('Tipo de documento', t.tipo_doc_migratorio)}
      ${fila('N° documento', t.num_doc_migratorio)}
      ${fila('Vencimiento', t.fecha_venc_migratorio ? fmtFecha(t.fecha_venc_migratorio) : null)}
      <div style="padding:8px 0;">${_badgeSemaforo(semaforo, t.fecha_venc_migratorio)}</div>`;
  }

  cont.innerHTML = `
    <div class="card-title" style="font-size:13px;margin-bottom:4px;">
      <i class="ti ti-user"></i> Datos personales
    </div>
    ${fila('Nacionalidad', t.nacionalidad)}
    ${fila('Fecha de nacimiento', t.fecha_nacimiento ? fmtFecha(t.fecha_nacimiento) : null)}
    ${fila('Estado civil', t.estado_civil)}
    ${fila('Domicilio', t.domicilio)}
    ${fila('Correo', t.correo_electronico)}

    <div class="card-title" style="margin:18px 0 8px;font-size:13px;">
      <i class="ti ti-heart-plus"></i> Previsión
    </div>
    ${fila('AFP', t.afiliacion_afp)}
    ${fila('Sistema de salud', t.sistema_salud)}

    <div class="card-title" style="margin:18px 0 8px;font-size:13px;">
      <i class="ti ti-building"></i> Relación laboral
    </div>
    ${fila('Empresa contratista', empEmpleadora?.razon_social || empEmpleadora?.nombre)}
    ${fila('Mandante', mandante?.nombre)}
    ${fila('Faena', t.faena_obra)}
    ${fila('Cargo', t.funcion_cargo)}
    ${fila('Fecha de ingreso', t.fecha_ingreso ? fmtFecha(t.fecha_ingreso) : null)}

    ${migratorioHTML}

    <div class="card-title" style="margin:18px 0 8px;font-size:13px;">
      <i class="ti ti-shield-check"></i> EPP entregados
    </div>
    ${fila('Elementos entregados', (t.epp_entregados&&t.epp_entregados.length) ? t.epp_entregados.join(', ') + (t.epp_entregados.includes('Otro')&&t.epp_otro?` (${t.epp_otro})`:'') : null)}
    ${fila('Fecha de entrega', t.epp_fecha_entrega ? fmtFecha(t.epp_fecha_entrega) : null)}

    <div class="card-title" style="margin:18px 0 8px;font-size:13px;">
      <i class="ti ti-notebook"></i> RIOHS / IRL
    </div>
    ${fila('Fecha de inducción', t.irl_fecha_induccion ? fmtFecha(t.irl_fecha_induccion) : null)}
    <div style="padding:8px 0;">${t.irl_declarado ? '<span class="badge badge-verde">✅ Declarado recibido</span>' : '<span class="badge badge-gris">Pendiente</span>'}</div>`;
}

function _renderCarpetaTrabajador(rut){
  const tbody = document.getElementById('tbody-carpeta');
  if(!tbody) return;

  const docs = (carpeta || [])
    .filter(d => d.trabajador_rut === rut)
    .sort((a,b) => new Date(b.fecha_generacion) - new Date(a.fecha_generacion));

  if(!docs.length){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--texto3);">
      Sin documentos registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = docs.map(d => {
    const tipoInfo = _TIPO_DOC_CARPETA[d.tipo] || _TIPO_DOC_CARPETA.otro;
    return `<tr>
      <td style="font-size:13px;white-space:nowrap;">${tipoInfo.icono} ${tipoInfo.label}</td>
      <td style="font-size:12px;color:var(--texto2);">${d.descripcion || '—'}</td>
      <td style="font-size:12px;font-family:monospace;">${d.folio || '—'}</td>
      <td style="font-size:12px;">${d.fecha_firma ? fmtFecha(d.fecha_firma) : '—'}</td>
      <td style="font-size:12px;color:var(--texto3);">${fmtFecha(d.fecha_generacion)}</td>
      <td style="font-size:12px;color:var(--texto3);">${d.generado_por || '—'}</td>
    </tr>`;
  }).join('');
}
