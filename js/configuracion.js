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

/* ✅ Paso 1 Seguridad (23-11-2026) — S2: las contraseñas nunca se
   muestran (se guardan cifradas); el campo vacío mantiene la actual.
   S4: el operador se amarra al mandante por ID. S8: validaciones. */
function cargarFormUsuarios(){
  const u = cfg.usuarios || {};
  const el1 = document.getElementById('cfg-admin-user');
  const el2 = document.getElementById('cfg-admin-pass');
  const el3 = document.getElementById('cfg-admin-pass2');
  if(el1) el1.value = u.admin?.usuario || '';
  if(el2){ el2.value = ''; el2.placeholder = u.admin?.hash ? '•••••• (vacío = sin cambios)' : 'Mínimo 6 caracteres'; }
  if(el3) el3.value = '';
  // copia de trabajo: los cambios se aplican recién al "Guardar usuarios"
  _operadoresEdit = (u.operadores || []).map(op => ({ ...op, _nueva: '' }));
  renderOperadores();
}

let _operadoresEdit = [];

function renderOperadores(){
  const lista = document.getElementById('cfg-operadores-lista');
  if(!lista) return;
  if(!_operadoresEdit.length){
    lista.innerHTML = '<div style="font-size:12px;color:var(--texto3);text-align:center;padding:8px;">Sin operadores — usa "Agregar operador"</div>';
    return;
  }
  const esc = v => String(v||'').replace(/"/g,'&quot;');
  lista.innerHTML = _operadoresEdit.map((op, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:8px;">
      <input type="text" value="${esc(op.usuario)}" placeholder="Usuario"
        onchange="editarOperador(${i},'usuario',this.value)"
        style="padding:7px 9px;border-radius:7px;border:1px solid var(--borde);font-size:12px;">
      <input type="password" value="" autocomplete="new-password"
        placeholder="${op.hash ? '•••••• (vacío = sin cambios)' : 'Contraseña (mín. 6)'}"
        onchange="editarOperador(${i},'password',this.value)"
        style="padding:7px 9px;border-radius:7px;border:1px solid var(--borde);font-size:12px;">
      <select onchange="editarOperador(${i},'mandante_id',this.value)"
        style="padding:7px 9px;border-radius:7px;border:1px solid var(--borde);font-size:12px;">
        <option value="">— Mandante —</option>
        ${empresas.map(e => { const id = e.id || e.rut; return `<option value="${id}" ${op.mandante_id===id?'selected':''}>${e.nombre}</option>`; }).join('')}
      </select>
      <button onclick="eliminarOperador(${i})" class="btn btn-danger btn-sm" title="Eliminar">
        <i class="ti ti-trash"></i>
      </button>
    </div>`).join('');
}

function agregarOperador(){
  _operadoresEdit.push({ usuario:'', mandante_id:'', _nueva:'' });
  renderOperadores();
}

function editarOperador(i, campo, valor){
  const op = _operadoresEdit[i]; if(!op) return;
  if(campo === 'password') op._nueva = String(valor||'').trim();
  else if(campo === 'usuario') op.usuario = String(valor||'').trim().toLowerCase();
  else op[campo] = valor;
}

function eliminarOperador(i){
  _operadoresEdit.splice(i, 1);
  renderOperadores();
}

function guardarUsuarios(){
  const user  = (document.getElementById('cfg-admin-user')?.value || '').trim().toLowerCase();
  const pass  = (document.getElementById('cfg-admin-pass')?.value || '').trim();
  const pass2 = (document.getElementById('cfg-admin-pass2')?.value || '').trim();
  const u = cfg.usuarios || {};

  // ── Admin ──
  if(!user || /\s/.test(user)){ toast('⚠️ El usuario administrador no puede quedar vacío ni tener espacios','error'); return; }
  if(pass || pass2 || !u.admin?.hash){
    if(pass.length < 6){ toast('⚠️ La contraseña debe tener al menos 6 caracteres','error'); return; }
    if(pass !== pass2){ toast('⚠️ Las contraseñas del administrador no coinciden','error'); return; }
  }

  // ── Operadores ──
  const vistos = new Set([user]);
  for(const [i, op] of _operadoresEdit.entries()){
    const n = `Operador ${i+1}`;
    if(!op.usuario || /\s/.test(op.usuario)){ toast(`⚠️ ${n}: escribe un usuario, sin espacios`,'error'); return; }
    if(vistos.has(op.usuario)){ toast(`⚠️ El usuario "${op.usuario}" está repetido`,'error'); return; }
    vistos.add(op.usuario);
    if(!op.mandante_id){ toast(`⚠️ ${n} (${op.usuario}): elige su mandante`,'error'); return; }
    if(!op.hash && !op._nueva){ toast(`⚠️ ${n} (${op.usuario}): falta la contraseña`,'error'); return; }
    if(op._nueva && op._nueva.length < 6){ toast(`⚠️ ${n} (${op.usuario}): la contraseña debe tener al menos 6 caracteres`,'error'); return; }
  }

  // ── Aplicar ──
  if(!cfg.usuarios) cfg.usuarios = {};
  cfg.usuarios.admin = { usuario: user, hash: pass ? _hashClave(pass) : u.admin.hash };
  cfg.usuarios.operadores = _operadoresEdit.map(op => {
    const limpio = { usuario: op.usuario, mandante_id: op.mandante_id, hash: op._nueva ? _hashClave(op._nueva) : op.hash };
    if(op.nombre) limpio.nombre = op.nombre;
    return limpio;
  });
  guardarCfg();
  cargarFormUsuarios();
  toast('✅ Usuarios guardados','exito');
}
