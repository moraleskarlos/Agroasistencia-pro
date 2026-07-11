/* ════ AUTH — login, sesión, permisos ════ */

const SESSION_KEY   = 'agro_sesion';
const SESSION_HORAS = 8; // duración de sesión en horas
let _timerAviso  = null;
let _timerCierre = null;

/* ── MOSTRAR / OCULTAR LOGIN ── */

function mostrarLogin(){
  const el = document.getElementById('pantalla-login');
  if(el){ el.style.display = 'flex'; el.style.opacity = '1'; }
  document.querySelectorAll('.sidebar, .main').forEach(e => e.style.display = 'none');
  setTimeout(() => document.getElementById('login-usuario')?.focus(), 100);
}

function ocultarLogin(){
  const el = document.getElementById('pantalla-login');
  if(el) el.style.display = 'none';
  document.querySelectorAll('.sidebar, .main').forEach(e => e.style.display = '');
}

function togglePasswordLogin(){
  const inp  = document.getElementById('login-password');
  const icon = document.getElementById('login-eye-icon');
  if(inp.type === 'password'){
    inp.type = 'text';
    icon.className = 'ti ti-eye-off';
  } else {
    inp.type = 'password';
    icon.className = 'ti ti-eye';
  }
}

/* ── INICIAR SESIÓN ── */

function iniciarSesion(){
  const usuario  = (document.getElementById('login-usuario')?.value  || '').trim().toLowerCase();
  const password = (document.getElementById('login-password')?.value || '').trim();
  const errEl    = document.getElementById('login-error');
  const btnEl    = document.getElementById('btn-login');

  errEl.style.display = 'none';

  // 1. Superadmin
  if(usuario === SUPERADMIN.usuario && password === SUPERADMIN.password){
    sesionActiva = { usuario, rol: 'superadmin', nombre: 'Superusuario' };
    onLoginExitoso();
    return;
  }

  // 2. Admin (contratista) — credenciales desde cfg
  const adminUser = (cfg.usuarios?.admin?.usuario || '').toLowerCase();
  const adminPass = cfg.usuarios?.admin?.password || '';
  if(adminUser && usuario === adminUser && password === adminPass){
    sesionActiva = { usuario, rol: 'admin', nombre: cfg.admin_nombre || 'Administrador' };
    onLoginExitoso();
    return;
  }

  // 3. Operadores por mandante
  const operadores = cfg.usuarios?.operadores || [];
  const op = operadores.find(o => o.usuario.toLowerCase() === usuario && o.password === password);
  if(op){
    sesionActiva = { usuario, rol: 'operador', nombre: op.nombre || usuario, mandante_rut: op.mandante_rut };
    onLoginExitoso();
    return;
  }

  // Fallo
  errEl.style.display = 'block';
  btnEl.style.background = 'linear-gradient(135deg,#dc2626,#b91c1c)';
  setTimeout(() => {
    btnEl.style.background = 'linear-gradient(135deg,#16a34a,#15803d)';
  }, 1200);
  document.getElementById('login-password').value = '';
  document.getElementById('login-password').focus();
}

function onLoginExitoso(){
  // Persistir sesión con timestamp de expiración
  const expira = Date.now() + SESSION_HORAS * 60 * 60 * 1000;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...sesionActiva, expira }));
  ocultarLogin();
  aplicarPermisosPorRol();
  actualizarUI();
  renderDashboard();
  _iniciarTemporizadorSesion(expira);
  toast(`✅ Bienvenido, ${sesionActiva.nombre}`, 'exito');
  if(typeof mostrarBienvenidaAlertas === 'function') setTimeout(mostrarBienvenidaAlertas, 400);
}

/* ── CERRAR SESIÓN ── */

function cerrarSesion(){
  clearTimeout(_timerAviso);
  clearTimeout(_timerCierre);
  _ocultarAvisoSesion();
  sesionActiva = null;
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('login-usuario').value  = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').style.display = 'none';
  document.querySelectorAll('.sidebar, .main').forEach(e => e.style.display = '');
  mostrarLogin();
}

/* ── RESTAURAR SESIÓN AL RECARGAR ── */

function restaurarSesion(){
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return false;
    const datos = JSON.parse(raw);
    if(!datos?.expira || Date.now() > datos.expira){
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    sesionActiva = {
      usuario:      datos.usuario,
      rol:          datos.rol,
      nombre:       datos.nombre,
      mandante_rut: datos.mandante_rut || null,
    };
    ocultarLogin();
    aplicarPermisosPorRol();
    actualizarUI();
    renderDashboard();
    _iniciarTemporizadorSesion(datos.expira);
    if(typeof mostrarBienvenidaAlertas === 'function') setTimeout(mostrarBienvenidaAlertas, 400);
    return true;
  } catch {
    return false;
  }
}

/* ── TEMPORIZADOR Y AVISO DE EXPIRACIÓN ── */

function _iniciarTemporizadorSesion(expira){
  clearTimeout(_timerAviso);
  clearTimeout(_timerCierre);

  const ahora   = Date.now();
  const msTotal = expira - ahora;
  const msAviso = msTotal - 5 * 60 * 1000; // aviso 5 min antes

  if(msAviso > 0){
    _timerAviso = setTimeout(() => _mostrarAvisoSesion(expira), msAviso);
  } else {
    // Quedan menos de 5 min — mostrar aviso de inmediato
    _mostrarAvisoSesion(expira);
  }
  _timerCierre = setTimeout(() => cerrarSesion(), msTotal);
}

function _mostrarAvisoSesion(expira){
  let aviso = document.getElementById('aviso-sesion');
  if(!aviso){
    aviso = document.createElement('div');
    aviso.id = 'aviso-sesion';
    aviso.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      background:#1e293b; color:#fff; border-radius:12px;
      padding:14px 20px; z-index:9000; display:flex; align-items:center;
      gap:14px; box-shadow:0 4px 24px rgba(0,0,0,.3); font-size:13px;
      border:1px solid rgba(255,255,255,.1); min-width:320px;
    `;
    aviso.innerHTML = `
      <span style="font-size:20px;">⏱️</span>
      <div style="flex:1;">
        <div style="font-weight:600;margin-bottom:2px;">Sesión por expirar</div>
        <div id="aviso-sesion-countdown" style="color:#94a3b8;font-size:12px;">en 5:00 minutos</div>
      </div>
      <button onclick="renovarSesion()" style="
        background:#16a34a;border:none;color:#fff;border-radius:8px;
        padding:7px 14px;cursor:pointer;font-size:12px;font-weight:600;">
        Continuar
      </button>
      <button onclick="cerrarSesion()" style="
        background:rgba(239,68,68,.2);border:none;color:#fca5a5;border-radius:8px;
        padding:7px 14px;cursor:pointer;font-size:12px;">
        Salir
      </button>
    `;
    document.body.appendChild(aviso);
  }
  aviso.style.display = 'flex';

  // Countdown en tiempo real
  const intervalo = setInterval(() => {
    const restantes = Math.max(0, expira - Date.now());
    const min = Math.floor(restantes / 60000);
    const seg = Math.floor((restantes % 60000) / 1000);
    const cd  = document.getElementById('aviso-sesion-countdown');
    if(cd) cd.textContent = `Cierre automático en ${min}:${String(seg).padStart(2,'0')} min`;
    if(restantes <= 0) clearInterval(intervalo);
  }, 1000);
}

function _ocultarAvisoSesion(){
  const aviso = document.getElementById('aviso-sesion');
  if(aviso) aviso.style.display = 'none';
}

function renovarSesion(){
  if(!sesionActiva) return;
  const expira = Date.now() + SESSION_HORAS * 60 * 60 * 1000;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...sesionActiva, expira }));
  _ocultarAvisoSesion();
  _iniciarTemporizadorSesion(expira);
  toast('✅ Sesión renovada por 8 horas', 'exito');
}

/* ── PERMISOS POR ROL ── */

function aplicarPermisosPorRol(){
  if(!sesionActiva) return;
  const { rol, mandante_rut } = sesionActiva;

  // Operador: solo ve asistencia de su mandante
  if(rol === 'operador'){
    const ocultarIds = ['registro','trabajadores','contratistas','contratos','qr','exportar','config'];
    document.querySelectorAll('.sb-item').forEach(btn => {
      const onclick = btn.getAttribute('onclick') || '';
      const esOculto = ocultarIds.some(id => onclick.includes(`'${id}'`));
      if(esOculto) btn.style.display = 'none';
    });
    setTimeout(() => {
      irA('asistencia', [...document.querySelectorAll('.sb-item')]
        .find(b => b.getAttribute('onclick')?.includes('asistencia')));
      if(mandante_rut){
        const sel = document.getElementById('asist-empresa');
        if(sel){ sel.value = mandante_rut; cargarAsistencia?.(); }
      }
    }, 100);
    return;
  }

  // Admin y Superadmin: todo visible
  document.querySelectorAll('.sb-item').forEach(btn => btn.style.display = '');

  // Config: solo superadmin puede ver Supabase keys
  if(rol === 'admin'){
    const supaRow = document.getElementById('config-url')?.closest('.card');
    if(supaRow) supaRow.style.display = 'none';
  }
}
