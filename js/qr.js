/* ════ QR ════ */

/* QR-008: registro de credenciales realmente impresas (no solo previsualizadas).
   Estructura en localStorage: [{ id, rut, fecha }] — una entrada por trabajador,
   se actualiza la fecha si se vuelve a imprimir.

   ✅ RUT vs ID: el registro ahora se identifica por el id del trabajador.
   Se sigue guardando también el rut, y se reconocen las entradas viejas
   (que solo traían rut) para no perder las credenciales ya registradas:
   al volver a imprimir, esa entrada vieja se actualiza con su id. */
function _credencialesQR(){
  return JSON.parse(localStorage.getItem('credenciales_qr') || '[]');
}

function _coincideCredencialQR(c, t){
  if(c.id) return c.id === t.id;
  return c.rut === t.rut; // entrada vieja, solo con rut
}

function _tieneCredencialQR(t){
  return _credencialesQR().some(c => _coincideCredencialQR(c, t));
}

function _registrarCredencialesQR(lista){
  const registro = _credencialesQR();
  const hoy = hoyISO();
  lista.forEach(t => {
    const existente = registro.find(c => _coincideCredencialQR(c, t));
    if(existente){ existente.id = t.id; existente.rut = t.rut; existente.fecha = hoy; }
    else registro.push({ id: t.id, rut: t.rut, fecha: hoy });
  });
  localStorage.setItem('credenciales_qr', JSON.stringify(registro));
}

function cargarListaQR(){
  const filtro  = document.getElementById('qr-filtro-empresa')?.value || '';
  const buscar  = (document.getElementById('qr-buscar')?.value || '').toLowerCase().trim();
  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(filtro) lista = lista.filter(t => t.mandante_id === filtro);

  if(buscar){
    lista = lista.filter(t =>
      (t.rut||'').toLowerCase().includes(buscar) ||
      (t.nombre||'').toLowerCase().includes(buscar)
    );
  }

  const el = document.getElementById('qr-lista');

  if(!lista.length){
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--texto-secundario);">
      ${buscar ? `Sin resultados para "${buscar}"` : 'Sin trabajadores activos'}</div>`;
    return;
  }

  // ✅ Corregido — alineación: antes el encabezado usaba flex con una
  // proporción por columna, pero la celda del RUT en las filas no tenía
  // ninguna (la clase .rut-mono solo define fuente y color), así que
  // tomaba el ancho de su texto y empujaba Cargo/Empresa/Credencial
  // fuera de sus títulos. Ahora encabezado y filas comparten UNA sola
  // definición de columnas (grilla) — quedan alineados por construcción.
  const COLS = '32px 2fr 1.1fr 1fr 1.5fr 1.3fr 1fr';
  const estiloCelda = 'min-width:0;';

  el.innerHTML = `
    <div style="background:var(--blanco);border:1px solid var(--borde);border-radius:var(--radius-lg);overflow:hidden;">

      <!-- CABECERA -->
      <div style="display:grid;grid-template-columns:${COLS};align-items:center;gap:12px;padding:10px 16px;
        font-size:11px;font-weight:600;color:var(--texto-secundario);
        text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid var(--borde);">
        <div style="text-align:center;">
          <input type="checkbox" id="qr-check-all"
            onchange="seleccionarTodosQR(this.checked)"
            style="width:16px;height:16px;accent-color:var(--verde);cursor:pointer;">
        </div>
        <div>Nombre</div>
        <div>RUT</div>
        <div>Cargo</div>
        <div>Empresa</div>
        <div style="text-align:center;">Estado</div>
        <div style="text-align:center;">Ver credencial</div>
      </div>

      <!-- FILAS -->
      ${lista.map((t, i) => {
        const emp    = findMandante(t);
        const empNom = emp ? emp.nombre : '—';
        const avColors = ['#DBEAFE|#1D4ED8','#D1FAE5|#065F46','#FEF3C7|#92400E',
                          '#FCE7F3|#9D174D','#EDE9FE|#5B21B6','#FEE2E2|#991B1B'];
        const [bg,fg] = avColors[i%6].split('|');
        const ini = (t.nombre||'??').split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase();
        const conCredencial = _tieneCredencialQR(t);

        return `
        <div style="display:grid;grid-template-columns:${COLS};align-items:center;gap:12px;padding:11px 16px;
          border-bottom:1px solid var(--borde);transition:.15s;"
          onmouseover="this.style.background='#f8fafc'"
          onmouseout="this.style.background=''">

          <!-- Checkbox individual -->
          <div style="text-align:center;">
            <input type="checkbox" class="qr-check"
              data-id="${t.id}" data-nombre="${t.nombre}"
              data-cargo="${t.funcion_cargo||''}" data-empresa="${empNom}"
              style="width:16px;height:16px;accent-color:var(--verde);cursor:pointer;">
          </div>

          <!-- Nombre con avatar -->
          <div style="${estiloCelda}display:flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
              background:${bg};color:${fg};display:flex;align-items:center;
              justify-content:center;font-size:10px;font-weight:700;">${ini}</div>
            <div style="font-weight:500;font-size:13px;">${t.nombre}</div>
          </div>

          <!-- RUT -->
          <div class="rut-mono" style="${estiloCelda}">${t.rut}</div>

          <!-- Cargo -->
          <div style="${estiloCelda}font-size:12px;color:var(--texto-secundario);">${t.funcion_cargo||'—'}</div>

          <!-- Empresa -->
          <div style="${estiloCelda}font-size:12px;color:var(--texto-secundario);">${empNom}</div>

          <!-- Estado: badge en vez del punto de color -->
          <div style="text-align:center;">
            <span style="display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap;
              background:${conCredencial ? '#D1FAE5' : '#FEE2E2'};
              color:${conCredencial ? '#065F46' : '#991B1B'};">
              ${conCredencial ? 'Credencial creada' : 'Credencial no creada'}
            </span>
          </div>

          <!-- Ver credencial: columna propia -->
          <div style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="generarQRIndividual('${t.id}')" style="font-size:11px;">
              <i class="ti ti-qrcode"></i> Ver credencial
            </button>
          </div>

        </div>`;
      }).join('')}
    </div>`;
}

/* Construye el HTML de una tarjeta de credencial QR para un trabajador */
function _tarjetaQR(t){
  const url     = `${window.location.origin}${window.location.pathname}?rut=${encodeURIComponent(t.rut)}`;
  const logoUrl = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/,'')}img/logo-icon.png`;

  return `
    <div style="border:2px solid #0f2942;border-radius:12px;overflow:hidden;
      width:100%;max-width:6cm;text-align:center;page-break-inside:avoid;background:#fff;
      display:flex;flex-direction:column;margin:0 auto;">
      <div style="background:#0f2942;color:#fff;padding:7px;font-size:11px;
        font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;
        -webkit-print-color-adjust:exact;print-color-adjust:exact;">
        <img src="${logoUrl}" alt="" style="width:14px;height:14px;object-fit:contain;flex-shrink:0;">
        AgroContratista
      </div>
      <div style="padding:10px 8px;flex:1;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}"
          style="width:150px;height:150px;">
        <div style="font-weight:700;font-size:12px;margin-top:6px;">${t.nombre}</div>
        <div class="rut-mono">${t.rut}</div>
        <div style="font-size:10px;color:#888;">${t.funcion_cargo||'—'}</div>
      </div>
      <div style="background:#10b981;height:8px;
        -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
    </div>`;
}

/* Ver credencial de un solo trabajador — abre el modal directamente */
function generarQRIndividual(id){
  // ✅ RUT vs ID — ahora recibe el id del trabajador.
  const t = trabajadores.find(x => x.id === id);
  if(!t){ toast('⚠️ Trabajador no encontrado', 'error'); return; }
  abrirModalQR([t]);
}

/* Ver/generar credenciales de los trabajadores marcados */
function generarTodosQR(){
  const checks = [...document.querySelectorAll('.qr-check:checked')];
  if(!checks.length){ toast('⚠️ Selecciona al menos un trabajador', 'error'); return; }
  const lista = checks
    .map(cb => trabajadores.find(t => t.id === cb.dataset.id)) // ✅ RUT vs ID
    .filter(Boolean);
  abrirModalQR(lista);
}

function seleccionarTodosQR(val){
  document.querySelectorAll('.qr-check').forEach(c => c.checked = val);
}

/* ════════════════════════════════════════════════════════
   MODAL DE VISTA PREVIA — reemplaza el flujo de 2 pasos
   ════════════════════════════════════════════════════════ */
let _trabajadores_modal_qr = [];

function abrirModalQR(lista){
  _trabajadores_modal_qr = lista;
  const modal = document.getElementById('modal-qr-preview');
  const cont  = document.getElementById('qr-modal-cards');
  const contador = document.getElementById('qr-modal-contador');
  if(!modal || !cont) return;

  cont.innerHTML = lista.map(t => _tarjetaQR(t)).join('');
  if(contador) contador.textContent = `${lista.length} credencial${lista.length!==1?'es':''}`;
  modal.style.display = 'flex';
}

function cerrarModalQR(){
  const modal = document.getElementById('modal-qr-preview');
  if(modal) modal.style.display = 'none';
  _trabajadores_modal_qr = [];
}

function imprimirQRDesdeModal(){
  if(!_trabajadores_modal_qr.length){ toast('⚠️ Nada para imprimir', 'error'); return; }

  const empPrincipal = 'AgroContratista';
  const cards = _trabajadores_modal_qr.map(t => _tarjetaQR(t)).join('');

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>QR — ${empPrincipal}</title>
    <style>
      body{margin:0;padding:20px;background:#f1f5f9;font-family:'Segoe UI',sans-serif}
      h2{font-size:15px;color:#0f2942;margin-bottom:4px}
      p{font-size:12px;color:#64748B;margin-bottom:16px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:start;}
      @media print{
        .grid{gap:8px}
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
      }
    </style></head><body>
    <h2>Códigos QR — ${empPrincipal}</h2>
    <p>${_trabajadores_modal_qr.length} trabajador${_trabajadores_modal_qr.length>1?'es':''} · ${new Date().toLocaleDateString('es-CL')}</p>
    <div class="grid">${cards}</div>
    <script>window.onload = () => window.print();<\/script>
    </body></html>`);
  win.document.close();

  // QR-008: se marca "con credencial" recién aquí — imprimir es la acción
  // real, no la vista previa.
  _registrarCredencialesQR(_trabajadores_modal_qr); // ✅ RUT vs ID: se registra por trabajador (id), no por rut suelto

  cerrarModalQR();
  seleccionarTodosQR(false);
  cargarListaQR();
}
