/* ════ CONFIGURACIÓN ════ */

function guardarConfig(){
  cfg.supabase_url=document.getElementById('config-url').value.trim();
  cfg.supabase_key=document.getElementById('config-key').value.trim();
  guardarCfg(); iniciarSupabase(); toast('✅ Configuración guardada','exito');
}

function guardarDatosAdmin(){
  cfg.admin_nombre=document.getElementById('config-admin-nombre').value.trim();
  cfg.faena=document.getElementById('config-faena').value.trim();

  guardarCfg();
  actualizarUI();

  toast('✅ Datos guardados','exito');
}

function cargarFormConfig(){
  document.getElementById('config-url').value=cfg.supabase_url||'';
  document.getElementById('config-key').value=cfg.supabase_key||'';
  document.getElementById('config-admin-nombre').value=cfg.admin_nombre||'';
  document.getElementById('config-faena').value=cfg.faena||'';
  cargarFormUsuarios();
}

function cargarFormUsuarios(){
  const u = cfg.usuarios || {};
  const adminUser = u.admin?.usuario || '';
  const adminPass = u.admin?.password || '';
  const el1 = document.getElementById('cfg-admin-user');
  const el2 = document.getElementById('cfg-admin-pass');
  if(el1) el1.value = adminUser;
  if(el2) el2.value = adminPass;
  renderOperadores();
}

function renderOperadores(){
  const lista = document.getElementById('cfg-operadores-lista');
  if(!lista) return;
  const operadores = cfg.usuarios?.operadores || [];
  if(!operadores.length){
    lista.innerHTML = '<div style="font-size:12px;color:var(--texto3);text-align:center;padding:8px;">Sin operadores — usa "Agregar operador"</div>';
    return;
  }
  lista.innerHTML = operadores.map((op, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr auto auto;gap:6px;align-items:center;margin-bottom:8px;">
      <input type="text" value="${op.usuario}" placeholder="Usuario"
        onchange="editarOperador(${i},'usuario',this.value)"
        style="padding:7px 9px;border-radius:7px;border:1px solid var(--borde);font-size:12px;">
      <input type="password" value="${op.password}" placeholder="Contraseña"
        onchange="editarOperador(${i},'password',this.value)"
        style="padding:7px 9px;border-radius:7px;border:1px solid var(--borde);font-size:12px;">
      <select onchange="editarOperador(${i},'mandante_rut',this.value)"
        style="padding:7px 9px;border-radius:7px;border:1px solid var(--borde);font-size:12px;">
        <option value="">— Mandante —</option>
        ${empresas.map(e => `<option value="${e.rut}" ${op.mandante_rut===e.rut?'selected':''}>${e.nombre}</option>`).join('')}
      </select>
      <button onclick="eliminarOperador(${i})" class="btn btn-danger btn-sm" title="Eliminar">
        <i class="ti ti-trash"></i>
      </button>
    </div>`).join('');
}

function agregarOperador(){
  if(!cfg.usuarios) cfg.usuarios = {};
  if(!cfg.usuarios.operadores) cfg.usuarios.operadores = [];
  cfg.usuarios.operadores.push({ usuario:'', password:'', mandante_rut:'' });
  renderOperadores();
}

function editarOperador(i, campo, valor){
  if(cfg.usuarios?.operadores?.[i]) cfg.usuarios.operadores[i][campo] = valor;
}

function eliminarOperador(i){
  cfg.usuarios?.operadores?.splice(i, 1);
  renderOperadores();
}

function guardarUsuarios(){
  const user = document.getElementById('cfg-admin-user')?.value.trim();
  const pass = document.getElementById('cfg-admin-pass')?.value.trim();
  if(!cfg.usuarios) cfg.usuarios = {};
  if(user && pass){
    if(pass.length < 6){ toast('⚠️ La contraseña debe tener al menos 6 caracteres','error'); return; }
    cfg.usuarios.admin = { usuario: user, password: pass };
  }
  guardarCfg();
  toast('✅ Usuarios guardados','exito');
}
