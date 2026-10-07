/* INIT */
try {
  cargarConfig();
  cargarLocal();
  cargarGestionLaboral();
  cargarIndicadores();
  cargarLiquidaciones();
  cargarMesesCerrados();
  cargarAjustes();
  migrarIDs();
  _migrarCarpetaIDsRetroactivo(); // ✅ Paso 5 — antes de la de empresa (usa el ID)
  _migrarEmpresaCarpetaRetroactivo();
  iniciarSupabase();
  poblarSelects();
  actualizarUI();
  renderDashboard();
  _restaurarSidebarColapsado();
} catch(e) {
  console.error('Error en init:', e);
}

// Restaurar sesión persistida o mostrar login
try {
  if (!restaurarSesion()) mostrarLogin();
} catch(e) {
  // Si algo falla, mostrar login manualmente
  const el = document.getElementById('pantalla-login');
  if(el) el.style.display = 'flex';
}
