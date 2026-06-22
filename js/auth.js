/* ════ AUTH — login, sesión, permisos ════ */

function mostrarLogin(){
  const el = document.getElementById('pantalla-login');
  if(el){ el.style.display = 'flex'; el.style.opacity = '1'; }
  // Ocultar sidebar y main
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
  ocultarLogin();
  aplicarPermisosPorRol();
  actualizarUI();
  renderDashboard();
  toast(`✅ Bienvenido, ${sesionActiva.nombre}`, 'exito');
}

function cerrarSesion(){
  sesionActiva = null;
  document.getElementById('login-usuario').value  = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').style.display = 'none';
  // Restablecer permisos
  document.querySelectorAll('.sidebar, .main').forEach(e => e.style.display = '');
  mostrarLogin();
}

function aplicarPermisosPorRol(){
  if(!sesionActiva) return;
  const { rol, mandante_rut } = sesionActiva;

  // Operador: solo ve asistencia de su mandante
  if(rol === 'operador'){
    // Ocultar módulos no permitidos
    const ocultarIds = ['registro','trabajadores','contratistas','contratos','qr','exportar','config'];
    document.querySelectorAll('.sb-item').forEach(btn => {
      const onclick = btn.getAttribute('onclick') || '';
      const esOculto = ocultarIds.some(id => onclick.includes(`'${id}'`));
      if(esOculto) btn.style.display = 'none';
    });
    // Ir directo a asistencia filtrada por su mandante
    setTimeout(() => {
      irA('asistencia', [...document.querySelectorAll('.sb-item')]
        .find(b => b.getAttribute('onclick')?.includes('asistencia')));
      // Preseleccionar su mandante en el filtro
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
