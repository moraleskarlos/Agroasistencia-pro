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
// Mostrar login siempre, incluso si algo falló antes
try { mostrarLogin(); } catch(e) { 
  // Si mostrarLogin falla, mostrar login manualmente
  const el = document.getElementById('pantalla-login');
  if(el) el.style.display = 'flex';
}
