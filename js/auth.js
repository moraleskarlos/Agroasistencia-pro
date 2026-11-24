/* ════ AUTH — login, sesión, permisos ════ */

const SESSION_KEY   = 'agro_sesion';
const SESSION_HORAS = 8; // duración de sesión en horas
let _timerAviso  = null;
let _timerCierre = null;

/* ════════════════════════════════════════════════════════
   ✅ Paso 1 Seguridad (auditoría 23-11-2026)
   S1  se elimina el superadmin con clave escrita en el código (público
       en GitHub). En el primer ingreso se crea el usuario admin.
   S2  las contraseñas se guardan cifradas (SHA-256 con sal), nunca en
       texto ni se muestran en pantalla. Las antiguas se convierten
       solas al abrir el sistema.
   S3  el operador solo entra a Asistencia (también si escribe la página).
   S4  el operador queda amarrado a su mandante por ID, con el filtro fijo.
   S5  5 intentos fallidos bloquean el ingreso 1 minuto.
   NOTA: sin servidor, esto protege el uso normal del sistema; la
   seguridad completa llega con las cuentas de Supabase.
   ════════════════════════════════════════════════════════ */
const BLOQUEO_KEY       = 'agro_login_bloqueo';
const MAX_INTENTOS      = 5;
const BLOQUEO_SEGUNDOS  = 60;
const PAGINAS_OPERADOR  = ['asistencia'];

/* SHA-256 (implementación compacta, sin dependencias) */
function _sha256(ascii){
  const rotr = (v, a) => (v >>> a) | (v << (32 - a));
  const utf8 = unescape(encodeURIComponent(ascii));
  const K = [], H = [];
  let primo = 2, n = 0;
  const esPrimo = x => { for(let i=2;i*i<=x;i++) if(x%i===0) return false; return true; };
  while(n < 64){ if(esPrimo(primo)){ if(n < 8) H[n] = (Math.pow(primo,1/2)*4294967296)|0; K[n++] = (Math.pow(primo,1/3)*4294967296)|0; } primo++; }
  const bytes = [];
  for(let i=0;i<utf8.length;i++) bytes.push(utf8.charCodeAt(i));
  const largoBits = bytes.length * 8;
  bytes.push(0x80);
  while(bytes.length % 64 !== 56) bytes.push(0);
  for(let i=7;i>=0;i--) bytes.push(i >= 4 ? 0 : (largoBits >>> (i*8)) & 0xff);
  const h = H.slice();
  for(let j=0;j<bytes.length;j+=64){
    const w = [];
    for(let i=0;i<16;i++) w[i] = (bytes[j+i*4]<<24)|(bytes[j+i*4+1]<<16)|(bytes[j+i*4+2]<<8)|bytes[j+i*4+3];
    for(let i=16;i<64;i++){
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15]>>>3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2]>>>10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1)|0;
    }
    let [a,b,c,d,e,f,g,hh] = h;
    for(let i=0;i<64;i++){
      const t1 = (hh + (rotr(e,6)^rotr(e,11)^rotr(e,25)) + ((e&f)^(~e&g)) + K[i] + w[i])|0;
      const t2 = ((rotr(a,2)^rotr(a,13)^rotr(a,22)) + ((a&b)^(a&c)^(b&c)))|0;
      hh = g; g = f; f = e; e = (d + t1)|0; d = c; c = b; b = a; a = (t1 + t2)|0;
    }
    h[0]=(h[0]+a)|0; h[1]=(h[1]+b)|0; h[2]=(h[2]+c)|0; h[3]=(h[3]+d)|0;
    h[4]=(h[4]+e)|0; h[5]=(h[5]+f)|0; h[6]=(h[6]+g)|0; h[7]=(h[7]+hh)|0;
  }
  return h.map(x => (x>>>0).toString(16).padStart(8,'0')).join('');
}

function _salAleatoria(){
  const a = new Uint8Array(16);
  if(typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
  else for(let i=0;i<16;i++) a[i] = Math.floor(Math.random()*256);
  return Array.from(a, b => b.toString(16).padStart(2,'0')).join('');
}
function _hashClave(clave){ const sal = _salAleatoria(); return `sha256$${sal}$${_sha256(sal + ':' + clave)}`; }
function _verificarClave(clave, guardado){
  const [alg, sal, h] = String(guardado||'').split('$');
  return alg === 'sha256' && !!sal && _sha256(sal + ':' + clave) === h;
}

/* Convierte claves antiguas en texto a hash y el mandante del operador de
   RUT a ID (BL-023). Se ejecuta al abrir el sistema. */
function _migrarClaves(){
  const u = cfg.usuarios; if(!u) return;
  let cambio = false;
  if(u.admin && u.admin.password){ u.admin.hash = _hashClave(u.admin.password); delete u.admin.password; cambio = true; }
  (u.operadores || []).forEach(op => {
    if(op.password){ op.hash = _hashClave(op.password); delete op.password; cambio = true; }
    if(op.mandante_rut && !op.mandante_id){
      const e = (empresas || []).find(x => x.rut === op.mandante_rut);
      if(e){ op.mandante_id = e.id || e.rut; cambio = true; }
    }
  });
  if(cambio) guardarCfg();
}
function _hayAdmin(){ return !!(cfg.usuarios?.admin?.usuario && cfg.usuarios.admin.hash); }

/* Nombre con que se firman los registros (S8). */
function _nombreRegistrador(){
  if(typeof sesionActiva !== 'undefined' && sesionActiva?.rol === 'operador') return sesionActiva.usuario;
  return (cfg.admin_nombre || '').split(' ')[0] || 'Admin';
}

function _bloqueoLogin(){
  try{ return JSON.parse(localStorage.getItem(BLOQUEO_KEY)) || { intentos:0, hasta:0 }; }catch{ return { intentos:0, hasta:0 }; }
}
function _mostrarErrorLogin(texto){
  const errEl = document.getElementById('login-error');
  if(!errEl) return;
  errEl.textContent = texto;
  errEl.style.display = 'block';
}

/* ── MOSTRAR / OCULTAR LOGIN ── */

function mostrarLogin(){
  _migrarClaves();
  _modoLogin(_hayAdmin() ? 'ingresar' : 'crear');
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

/* ── PRIMER INGRESO: CREAR ADMINISTRADOR ── */
function _modoLogin(modo){
  const crear = modo === 'crear';
  const tit = document.getElementById('login-titulo');
  if(tit) tit.textContent = crear ? 'Crear administrador' : 'Iniciar sesión';
  const extra = document.getElementById('login-crear-extra');
  if(extra) extra.style.display = crear ? 'block' : 'none';
  const btn = document.getElementById('btn-login');
  if(btn){
    btn.innerHTML = crear ? '<i class="ti ti-user-plus"></i> Crear y entrar' : '<i class="ti ti-login"></i> Entrar al sistema';
    btn.setAttribute('onclick', crear ? 'crearAdministradorInicial()' : 'iniciarSesion()');
  }
  const pass = document.getElementById('login-password');
  if(pass){
    pass.setAttribute('onkeydown', crear ? '' : "if(event.key==='Enter') iniciarSesion()");
    pass.setAttribute('autocomplete', crear ? 'new-password' : 'current-password');
  }
  const err = document.getElementById('login-error'); if(err) err.style.display = 'none';
}

function crearAdministradorInicial(){
  if(_hayAdmin()){ _modoLogin('ingresar'); return; }
  const usuario = (document.getElementById('login-usuario')?.value || '').trim().toLowerCase();
  const clave   = (document.getElementById('login-password')?.value || '').trim();
  const clave2  = (document.getElementById('login-password2')?.value || '').trim();
  const nombre  = (document.getElementById('login-nombre')?.value || '').trim();
  if(!usuario || /\s/.test(usuario)) return _mostrarErrorLogin('⚠️ Escribe un usuario, sin espacios');
  if(clave.length < 6)               return _mostrarErrorLogin('⚠️ La contraseña debe tener al menos 6 caracteres');
  if(clave !== clave2)               return _mostrarErrorLogin('⚠️ Las contraseñas no coinciden');
  if(!cfg.usuarios) cfg.usuarios = {};
  cfg.usuarios.admin = { usuario, hash: _hashClave(clave) };
  if(nombre) cfg.admin_nombre = nombre;
  guardarCfg();
  sesionActiva = { usuario, rol: 'admin', nombre: cfg.admin_nombre || 'Administrador' };
  ['login-password','login-password2'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  onLoginExitoso();
}

/* ── INICIAR SESIÓN ── */

function iniciarSesion(){
  const usuario  = (document.getElementById('login-usuario')?.value  || '').trim().toLowerCase();
  const password = (document.getElementById('login-password')?.value || '').trim();
  const errEl    = document.getElementById('login-error');
  const btnEl    = document.getElementById('btn-login');

  errEl.style.display = 'none';
  _migrarClaves();
  if(!_hayAdmin()){ _modoLogin('crear'); return; }

  // S5 — bloqueo temporal tras varios intentos fallidos
  const bl = _bloqueoLogin();
  if(bl.hasta > Date.now()){
    const seg = Math.ceil((bl.hasta - Date.now()) / 1000);
    _mostrarErrorLogin(`🔒 Demasiados intentos. Espera ${seg} segundo${seg!==1?'s':''} e inténtalo de nuevo.`);
    return;
  }

  // 1. Admin (contratista)
  const admin = cfg.usuarios.admin;
  if(usuario === admin.usuario.toLowerCase() && _verificarClave(password, admin.hash)){
    localStorage.removeItem(BLOQUEO_KEY);
    sesionActiva = { usuario, rol: 'admin', nombre: cfg.admin_nombre || 'Administrador' };
    onLoginExitoso();
    return;
  }

  // 2. Operadores por mandante
  const operadores = cfg.usuarios?.operadores || [];
  const op = operadores.find(o => (o.usuario||'').toLowerCase() === usuario && _verificarClave(password, o.hash));
  if(op){
    localStorage.removeItem(BLOQUEO_KEY);
    sesionActiva = { usuario, rol: 'operador', nombre: op.nombre || usuario, mandante_id: op.mandante_id || '' };
    onLoginExitoso();
    return;
  }

  // Fallo
  const intentos = (bl.hasta && bl.hasta <= Date.now() ? 0 : bl.intentos) + 1;
  const bloqueo = intentos >= MAX_INTENTOS ? { intentos: 0, hasta: Date.now() + BLOQUEO_SEGUNDOS*1000 } : { intentos, hasta: 0 };
  localStorage.setItem(BLOQUEO_KEY, JSON.stringify(bloqueo));
  _mostrarErrorLogin(bloqueo.hasta
    ? `🔒 Demasiados intentos. El ingreso queda bloqueado ${BLOQUEO_SEGUNDOS} segundos.`
    : `❌ Usuario o contraseña incorrectos (intento ${intentos} de ${MAX_INTENTOS})`);
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
    _migrarClaves();
    if(!_hayAdmin()) return false; // primer ingreso: hay que crear el administrador
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return false;
    const datos = JSON.parse(raw);
    // sesiones antiguas de "superadmin" (eliminado) o roles desconocidos → login
    if(!datos?.expira || Date.now() > datos.expira || !['admin','operador'].includes(datos.rol)){
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    sesionActiva = {
      usuario:      datos.usuario,
      rol:          datos.rol,
      nombre:       datos.nombre,
      mandante_id:  datos.mandante_id || '',
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

/* S3 — ¿puede el usuario actual abrir esta página? (lo usa irA) */
function _paginaPermitida(idPagina){
  if(typeof sesionActiva === 'undefined' || sesionActiva?.rol !== 'operador') return true;
  return PAGINAS_OPERADOR.includes(String(idPagina||'').replace(/^p-/, ''));
}

/* S4 — el operador ve solo la asistencia de su mandante, con el filtro fijo. */
function _aplicarFiltroOperadorAsistencia(){
  const sel = document.getElementById('asist-empresa');
  if(!sel) return;
  if(sesionActiva?.rol === 'operador'){
    if(sesionActiva.mandante_id) sel.value = sesionActiva.mandante_id;
    sel.disabled = true;
  } else {
    sel.disabled = false;
  }
}

function aplicarPermisosPorRol(){
  if(!sesionActiva) return;
  const { rol } = sesionActiva;

  if(rol === 'operador'){
    document.querySelectorAll('.sb-item').forEach(btn => {
      const m = (btn.getAttribute('onclick') || '').match(/irA\('([^']+)'/);
      btn.style.display = (m && PAGINAS_OPERADOR.includes(m[1])) ? '' : 'none';
    });
    setTimeout(() => {
      irA('asistencia', [...document.querySelectorAll('.sb-item')]
        .find(b => b.getAttribute('onclick')?.includes("'asistencia'")));
      _aplicarFiltroOperadorAsistencia();
    }, 100);
    return;
  }

  // Admin: todo visible
  document.querySelectorAll('.sb-item').forEach(btn => btn.style.display = '');
  _aplicarFiltroOperadorAsistencia();
  // Supabase aún no se usa (los datos viven en el navegador): se oculta.
  const supaRow = document.getElementById('config-url')?.closest('.card');
  if(supaRow) supaRow.style.display = 'none';
}
