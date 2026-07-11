/* ════════════════════════════════════════════════════════
   ALERTAS.JS — Motor de alertas laborales
   No guarda alertas: se recalculan cada vez a partir de los
   datos reales de Trabajadores, Contratos, Remuneraciones,
   Finiquitos, Vacaciones, Empresas, Asistencia y Gestión Laboral.
   Solo se guarda qué alertas marcó el usuario como "leídas"
   (no afecta el conteo de la campana, que siempre refleja
   la realidad de los datos).
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

const LOCAL_ALERTAS_LEIDAS = 'agro_alertas_leidas';
let _alertasLeidas = [];
let _ultimasAlertas = [];
let _filtroAlertaActivo = 'todas';

function _cargarAlertasLeidas(){
  try{ _alertasLeidas = JSON.parse(localStorage.getItem(LOCAL_ALERTAS_LEIDAS)) || []; }
  catch{ _alertasLeidas = []; }
}
function _guardarAlertasLeidas(){
  localStorage.setItem(LOCAL_ALERTAS_LEIDAS, JSON.stringify(_alertasLeidas));
}

function _alerta(severidad, modulo, id, titulo, detalle, accion){
  return { id, severidad, modulo, titulo, detalle, accion, leida: _alertasLeidas.includes(id) };
}

/* ════════════════════════════════════════════════════════
   HELPERS DE ASISTENCIA (turnos abiertos / jornadas +12h)
   ════════════════════════════════════════════════════════ */
function _turnosAbiertos(ruts, hoy){
  const resultado = [];
  const hoyStr = hoy.toISOString().slice(0,10);
  for(let i = 0; i < localStorage.length; i++){
    const key = localStorage.key(i);
    if(!key || !key.startsWith('asistencia_')) continue;
    const fecha = key.replace('asistencia_', '');
    if(fecha >= hoyStr) continue; // solo días anteriores a hoy
    let data;
    try{ data = JSON.parse(localStorage.getItem(key)) || []; } catch { continue; }
    data.forEach(m => {
      if(ruts.includes(m.rut) && m.hora_entrada && !m.hora_salida){
        const t = trabajadores.find(x => x.rut === m.rut);
        resultado.push({ rut: m.rut, nombre: t?.nombre || m.rut, fecha });
      }
    });
  }
  return resultado;
}

function _jornadasPorRevisar(ruts, periodoActual){
  const resultado = [];
  for(let i = 0; i < localStorage.length; i++){
    const key = localStorage.key(i);
    if(!key || !key.startsWith('asistencia_' + periodoActual)) continue;
    const fecha = key.replace('asistencia_', '');
    let data;
    try{ data = JSON.parse(localStorage.getItem(key)) || []; } catch { continue; }
    data.forEach(m => {
      if(ruts.includes(m.rut) && m.jornada === '⚠️ Revisar'){
        const t = trabajadores.find(x => x.rut === m.rut);
        resultado.push({ rut: m.rut, nombre: t?.nombre || m.rut, fecha });
      }
    });
  }
  return resultado;
}

/* ════════════════════════════════════════════════════════
   MOTOR PRINCIPAL
   ════════════════════════════════════════════════════════ */
function calcularAlertas(){
  _cargarAlertasLeidas();
  cargarLocal();
  if(typeof cargarContratos === 'function') cargarContratos();
  if(typeof cargarLiquidaciones === 'function') cargarLiquidaciones();
  if(typeof cargarIndicadores === 'function') cargarIndicadores();
  if(typeof cargarFiniquitos === 'function') cargarFiniquitos();
  if(typeof cargarGestionLaboral === 'function') cargarGestionLaboral();
  if(typeof cargarVacacionesExtra === 'function') cargarVacacionesExtra();

  const hoy = new Date();
  const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
  const alertas = [];
  const activos = (trabajadores || []).filter(t => t.estado === 'activo');
  const rutsActivos = activos.map(t => t.rut);

  /* ═══ CRÍTICAS ═══ */

  activos.forEach(t => {
    if(!t.empresa_propia_id){
      alertas.push(_alerta('critico','Trabajadores',`sin_empresa_propia_${t.rut}`,
        'Sin empresa contratista asignada', `${t.nombre} no tiene empresa contratista asignada`,
        () => verPerfilTrabajador(t.rut)));
    }
    if(!(t.mandante_id || t.empresa_rut || t.empresa)){
      alertas.push(_alerta('critico','Trabajadores',`sin_mandante_${t.rut}`,
        'Sin mandante asignado', `${t.nombre} no tiene mandante asignado`,
        () => verPerfilTrabajador(t.rut)));
    }
    if(!t.domicilio){
      alertas.push(_alerta('critico','Trabajadores',`sin_domicilio_${t.rut}`,
        'Sin domicilio registrado', `${t.nombre} no tiene domicilio registrado`,
        () => verPerfilTrabajador(t.rut)));
    }
    if(!t.afiliacion_afp){
      alertas.push(_alerta('critico','Trabajadores',`sin_afp_${t.rut}`,
        'Sin AFP definida', `${t.nombre} no tiene AFP definida`,
        () => verPerfilTrabajador(t.rut)));
    }
    if(!t.sistema_salud){
      alertas.push(_alerta('critico','Trabajadores',`sin_salud_${t.rut}`,
        'Sin sistema de salud definido', `${t.nombre} no tiene sistema de salud definido`,
        () => verPerfilTrabajador(t.rut)));
    }
  });

  // Documento migratorio (usa el mismo semáforo que ya se ve en Trabajadores)
  activos.forEach(t => {
    if(t.nacionalidad && t.nacionalidad !== 'Chileno'){
      const sem = _calcularSemaforo(t.fecha_venc_migratorio);
      if(sem === 'gris'){
        alertas.push(_alerta('critico','Trabajadores',`mig_sin_fecha_${t.rut}`,
          'Documento migratorio sin fecha registrada', `${t.nombre} es extranjero y no tiene fecha de vencimiento registrada`,
          () => verPerfilTrabajador(t.rut)));
      } else if(sem === 'negro'){
        alertas.push(_alerta('critico','Trabajadores',`mig_vencido_${t.rut}`,
          'Documento migratorio vencido', `El documento de ${t.nombre} está vencido`,
          () => verPerfilTrabajador(t.rut)));
      } else if(sem === 'rojo'){
        alertas.push(_alerta('importante','Trabajadores',`mig_por_vencer_${t.rut}`,
          'Documento migratorio vence pronto', `El documento de ${t.nombre} vence en menos de 30 días`,
          () => verPerfilTrabajador(t.rut)));
      }
    }
  });

  // Contrato: sin contrato / vencido / por vencer
  activos.forEach(t => {
    const contrato = (typeof contratos !== 'undefined' ? contratos : []).find(c => c.trabajador_id === t.id);
    if(!contrato){
      alertas.push(_alerta('critico','Contratos',`sin_contrato_${t.rut}`,
        'Sin contrato registrado', `${t.nombre} no tiene contrato registrado en el sistema`,
        () => irA('contratos')));
      return;
    }
    if(contrato.tipo !== 'indefinido' && contrato.fecha_termino){
      const dias = Math.floor((new Date(contrato.fecha_termino) - hoy) / (1000*60*60*24));
      if(dias < 0){
        alertas.push(_alerta('critico','Contratos',`contrato_vencido_${t.rut}`,
          'Contrato vencido', `El contrato de ${t.nombre} venció hace ${Math.abs(dias)} día(s)`,
          () => irA('contratos')));
      } else if(dias <= 15){
        alertas.push(_alerta('importante','Contratos',`contrato_por_vencer_${t.rut}`,
          'Contrato vence pronto', `El contrato de ${t.nombre} vence en ${dias} día(s)`,
          () => irA('contratos')));
      }
    }
  });

  // Indicadores previsionales del período
  if(typeof getIndicadoresPorPeriodo === 'function' && !getIndicadoresPorPeriodo(periodoActual)){
    alertas.push(_alerta('critico','Remuneraciones','indicadores_faltantes',
      'Indicadores previsionales no cargados',
      `Faltan los indicadores de ${typeof getNombreMes==='function' ? getNombreMes(periodoActual) : periodoActual}`,
      () => irA('remuneraciones')));
  }

  // Liquidación del período vigente
  activos.forEach(t => {
    const tieneLiq = (typeof liquidaciones_guardadas !== 'undefined' ? liquidaciones_guardadas : [])
      .some(l => l.rut === t.rut && l.periodo === periodoActual);
    if(!tieneLiq){
      alertas.push(_alerta('critico','Remuneraciones',`sin_liquidacion_${t.rut}_${periodoActual}`,
        'Sin liquidación generada', `${t.nombre} no tiene liquidación generada este período`,
        () => irA('remuneraciones')));
    }
  });

  // Ausencias sin clasificar (solo días ya transcurridos del período actual)
  if(typeof _leerAusenciasAsistencia === 'function'){
    const ausencias = _leerAusenciasAsistencia(periodoActual, rutsActivos)
      .filter(a => new Date(a.fecha+'T12:00:00') <= hoy);
    const novsPeriodo = (typeof novedades !== 'undefined' ? novedades : []).filter(n => n.periodo === periodoActual);
    ausencias.forEach(a => {
      const clasificada = novsPeriodo.some(n => n.trabajador_rut === a.rut && n.fecha_inicio === a.fecha);
      if(!clasificada){
        const t = trabajadores.find(x => x.rut === a.rut);
        alertas.push(_alerta('critico','Gestión Laboral',`ausencia_sin_clasificar_${a.rut}_${a.fecha}`,
          'Ausencia sin clasificar', `${t?.nombre||a.rut} faltó el ${fmtFecha(a.fecha)} sin justificación registrada`,
          () => irA('gestion-laboral')));
      }
    });
  }

  // Turnos de asistencia abiertos (días anteriores)
  _turnosAbiertos(rutsActivos, hoy).forEach(x => {
    alertas.push(_alerta('critico','Asistencia',`turno_abierto_${x.rut}_${x.fecha}`,
      'Turno de asistencia sin cerrar', `${x.nombre} marcó entrada el ${fmtFecha(x.fecha)} y no registró salida`,
      () => irA('asistencia')));
  });

  /* ═══ IMPORTANTES ═══ */

  activos.forEach(t => {
    if(!t.epp_entregados || !t.epp_entregados.length){
      alertas.push(_alerta('importante','Contratos',`sin_epp_${t.rut}`,
        'EPP no registrado', `${t.nombre} no tiene elementos de protección personal registrados`,
        () => irA('contratos')));
    }
    if(!t.irl_declarado){
      alertas.push(_alerta('importante','Contratos',`sin_irl_${t.rut}`,
        'RIOHS / IRL no declarado', `${t.nombre} no ha declarado haber recibido la inducción RIOHS/IRL`,
        () => irA('contratos')));
    }
  });

  (typeof finiquitos_guardados !== 'undefined' ? finiquitos_guardados : []).forEach(f => {
    if(f.estado !== 'ratificado'){
      alertas.push(_alerta('importante','Finiquitos',`finiquito_sin_ratificar_${f.folio}`,
        'Finiquito sin ratificar', `El finiquito de ${f.nombre} (folio ${f.folio}) sigue pendiente de ratificación`,
        () => irA('remuneraciones')));
    }
  });

  (typeof empresas !== 'undefined' ? empresas : []).forEach(e => {
    if(typeof estadoVencimiento !== 'function') return;
    const est = estadoVencimiento(e.vigencia_contrato);
    if(est.dias !== null && est.dias <= 30){
      alertas.push(_alerta('importante','Empresas',`mandante_vigencia_${e.id||e.rut}`,
        est.dias < 0 ? 'Vigencia con mandante vencida' : 'Vigencia con mandante próxima a vencer',
        `${e.nombre}: ${est.dias<0 ? 'vencida' : 'vence en '+Math.ceil(est.dias)+' día(s)'}`,
        () => irA('contratistas')));
    }
  });

  /* ═══ PREVENTIVAS ═══ */

  activos.forEach(t => {
    if(!t.correo_electronico){
      alertas.push(_alerta('preventivo','Trabajadores',`sin_correo_${t.rut}`,
        'Correo electrónico vacío', `${t.nombre} no tiene correo registrado`,
        () => verPerfilTrabajador(t.rut)));
    }
    if(typeof calcularSaldoVacaciones === 'function'){
      const vac = calcularSaldoVacaciones(t.rut);
      if(!vac.error && vac.dias_saldo > 20){
        alertas.push(_alerta('preventivo','Vacaciones',`vacaciones_alto_${t.rut}`,
          'Saldo de vacaciones alto', `${t.nombre} acumula ${vac.dias_saldo} días de vacaciones pendientes`,
          () => irA('remuneraciones')));
      }
    }
  });

  (typeof novedades !== 'undefined' ? novedades : []).forEach(n => {
    if(!n.aprobado){
      const t = trabajadores.find(x => x.rut === n.trabajador_rut);
      alertas.push(_alerta('preventivo','Gestión Laboral',`novedad_pendiente_${n.id}`,
        'Novedad pendiente de aprobar', `Novedad de ${t?.nombre||n.trabajador_rut} sin aprobar`,
        () => irA('gestion-laboral')));
    }
  });

  _jornadasPorRevisar(rutsActivos, periodoActual).forEach(x => {
    alertas.push(_alerta('preventivo','Asistencia',`jornada_revisar_${x.rut}_${x.fecha}`,
      'Jornada por revisar (+12h)', `${x.nombre} registró más de 12 horas el ${fmtFecha(x.fecha)}`,
      () => irA('asistencia')));
  });

  return alertas;
}

/* ════════════════════════════════════════════════════════
   CAMPANA (SIDEBAR) — siempre refleja el total real
   ════════════════════════════════════════════════════════ */
function actualizarBadgeAlertas(){
  const alertas = calcularAlertas();
  const badge = document.getElementById('badge-alertas');
  if(!badge) return alertas;

  const criticas = alertas.filter(a => a.severidad === 'critico').length;
  const importantes = alertas.filter(a => a.severidad === 'importante').length;

  badge.textContent = alertas.length;
  badge.style.display = alertas.length ? 'inline-flex' : 'none';
  badge.style.background = criticas > 0 ? '#dc2626' : (importantes > 0 ? '#d97706' : '#ca8a04');
  badge.style.color = '#fff';

  return alertas;
}

/* ════════════════════════════════════════════════════════
   SALUDO SEGÚN HORA + MODAL DE BIENVENIDA
   ════════════════════════════════════════════════════════ */
function _saludoHora(){
  const h = new Date().getHours();
  if(h < 12) return { emoji:'☀️', texto:'Buenos días' };
  if(h < 19) return { emoji:'🌤️', texto:'Buenas tardes' };
  return { emoji:'🌙', texto:'Buenas noches' };
}

function mostrarBienvenidaAlertas(){
  const modal = document.getElementById('modal-bienvenida-alertas');
  const cont  = document.getElementById('ba-contenido');
  if(!modal || !cont) return;

  const alertas = actualizarBadgeAlertas();
  const nombre  = (typeof sesionActiva !== 'undefined' && sesionActiva?.nombre) ? sesionActiva.nombre.split(' ')[0] : '';
  const { emoji, texto } = _saludoHora();
  const fechaTxt = new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' });

  const criticas    = alertas.filter(a => a.severidad === 'critico').length;
  const importantes = alertas.filter(a => a.severidad === 'importante').length;
  const preventivas = alertas.filter(a => a.severidad === 'preventivo').length;

  if(!alertas.length){
    cont.innerHTML = `
      <div style="font-size:34px;text-align:center;margin-bottom:8px;">${emoji}</div>
      <div style="font-size:16px;font-weight:700;text-align:center;margin-bottom:6px;">${texto}${nombre?', '+nombre:''}.</div>
      <div style="font-size:13px;color:var(--texto2);text-align:center;margin-bottom:22px;line-height:1.5;">
        Hoy, ${fechaTxt}, no se detectaron alertas pendientes.<br>Todo está al día.
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="cerrarBienvenidaAlertas()">Continuar</button>`;
  } else {
    cont.innerHTML = `
      <div style="font-size:34px;text-align:center;margin-bottom:8px;">${emoji}</div>
      <div style="font-size:16px;font-weight:700;text-align:center;margin-bottom:6px;">${texto}${nombre?', '+nombre:''}.</div>
      <div style="font-size:13px;color:var(--texto2);text-align:center;margin-bottom:16px;">
        Hoy, ${fechaTxt}, el sistema detectó lo siguiente:
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:22px;">
        ${criticas ? `<div style="display:flex;justify-content:space-between;padding:9px 14px;background:#FEF2F2;border-radius:8px;font-size:13px;"><span>🔴 Críticas</span><strong>${criticas}</strong></div>` : ''}
        ${importantes ? `<div style="display:flex;justify-content:space-between;padding:9px 14px;background:#FFF7ED;border-radius:8px;font-size:13px;"><span>🟠 Importantes</span><strong>${importantes}</strong></div>` : ''}
        ${preventivas ? `<div style="display:flex;justify-content:space-between;padding:9px 14px;background:#FEFCE8;border-radius:8px;font-size:13px;"><span>🟡 Preventivas</span><strong>${preventivas}</strong></div>` : ''}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" style="flex:1;justify-content:center;" onclick="cerrarBienvenidaAlertas()">Más tarde</button>
        <button class="btn btn-primary" style="flex:1;justify-content:center;" onclick="cerrarBienvenidaAlertas();irA('alertas');">Revisar Alertas</button>
      </div>`;
  }

  modal.style.display = 'flex';
}

function cerrarBienvenidaAlertas(){
  const modal = document.getElementById('modal-bienvenida-alertas');
  if(modal) modal.style.display = 'none';
}

/* ════════════════════════════════════════════════════════
   PÁGINA DE ALERTAS
   ════════════════════════════════════════════════════════ */
function initAlertas(){
  _cargarAlertasLeidas();
  _filtroAlertaActivo = 'todas';
  renderAlertas();
}

function filtrarAlertas(filtro){
  _filtroAlertaActivo = filtro;
  ['todas','criticas','importantes','preventivas','leidas'].forEach(f => {
    const btn = document.getElementById('btn-al-'+f);
    if(btn) btn.className = (f === filtro) ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
  });
  renderAlertas();
}

function renderAlertas(){
  const alertas = actualizarBadgeAlertas();
  _ultimasAlertas = alertas;

  const setKPI = (id,v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  setKPI('al-kpi-criticas', alertas.filter(a=>a.severidad==='critico' && !a.leida).length);
  setKPI('al-kpi-importantes', alertas.filter(a=>a.severidad==='importante' && !a.leida).length);
  setKPI('al-kpi-preventivas', alertas.filter(a=>a.severidad==='preventivo' && !a.leida).length);
  setKPI('al-kpi-total', alertas.filter(a=>!a.leida).length);

  let lista;
  if(_filtroAlertaActivo === 'criticas')        lista = alertas.filter(a => a.severidad==='critico' && !a.leida);
  else if(_filtroAlertaActivo === 'importantes')lista = alertas.filter(a => a.severidad==='importante' && !a.leida);
  else if(_filtroAlertaActivo === 'preventivas') lista = alertas.filter(a => a.severidad==='preventivo' && !a.leida);
  else if(_filtroAlertaActivo === 'leidas')      lista = alertas.filter(a => a.leida);
  else                                           lista = alertas.filter(a => !a.leida);

  const cont = document.getElementById('lista-alertas');
  if(!cont) return;

  if(!lista.length){
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--texto3);">
      ${_filtroAlertaActivo === 'leidas' ? 'Sin alertas marcadas como leídas' : '✅ Sin alertas pendientes en esta categoría'}
    </div>`;
    return;
  }

  const iconos  = { critico:'🔴', importante:'🟠', preventivo:'🟡' };
  const bordes  = { critico:'#dc2626', importante:'#ea580c', preventivo:'#ca8a04' };

  cont.innerHTML = lista.map(a => `
    <div class="card" style="margin-bottom:10px;border-left:4px solid ${bordes[a.severidad]};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <div style="font-size:11px;color:var(--texto3);text-transform:uppercase;font-weight:600;margin-bottom:4px;">
            ${iconos[a.severidad]} ${a.modulo}
          </div>
          <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${a.titulo}</div>
          <div style="font-size:13px;color:var(--texto2);">${a.detalle}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-primary btn-sm" onclick='_ejecutarAccionAlerta("${a.id}")'><i class="ti ti-arrow-right"></i> Revisar</button>
          ${a.leida
            ? `<button class="btn btn-secondary btn-sm" onclick="marcarAlertaNoLeida('${a.id}')">Marcar como no leído</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="marcarAlertaLeida('${a.id}')">Marcar como leído</button>`}
        </div>
      </div>
    </div>`).join('');
}

function _ejecutarAccionAlerta(id){
  const a = _ultimasAlertas.find(x => x.id === id);
  if(a && typeof a.accion === 'function') a.accion();
}

function marcarAlertaLeida(id){
  if(!_alertasLeidas.includes(id)) _alertasLeidas.push(id);
  _guardarAlertasLeidas();
  renderAlertas();
}

function marcarAlertaNoLeida(id){
  _alertasLeidas = _alertasLeidas.filter(x => x !== id);
  _guardarAlertasLeidas();
  renderAlertas();
}
