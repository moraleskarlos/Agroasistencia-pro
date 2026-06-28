/* INIT */
try {
  cargarConfig();
  cargarLocal();
  migrarIDs();
  iniciarSupabase();
  poblarSelects();
  actualizarUI();
  renderDashboard();
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
