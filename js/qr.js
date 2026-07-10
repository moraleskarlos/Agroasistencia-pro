/* ════ QR ════ */

function cargarListaQR(){
  const filtro  = document.getElementById('qr-filtro-empresa')?.value || '';
  const buscar  = (document.getElementById('qr-buscar')?.value || '').toLowerCase().trim();
  let lista = filtro
    ? trabajadores.filter(t => (t.mandante_id||t.empresa||t.empresa_rut) === filtro)
    : trabajadores;

  if(buscar){
    lista = lista.filter(t =>
      (t.rut||'').toLowerCase().includes(buscar) ||
      (t.nombre||'').toLowerCase().includes(buscar)
    );
  }

  const el = document.getElementById('qr-lista');

  if(!lista.length){
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--texto3);">
      ${buscar ? `Sin resultados para "${buscar}"` : 'Sin trabajadores registrados'}</div>`;
    return;
  }

  el.innerHTML = `
    <div style="background:var(--blanco);border:1px solid var(--borde);border-radius:var(--radius-lg);overflow:hidden;">

      <!-- CABECERA -->
      <div style="display:flex;align-items:center;padding:10px 16px;
        font-size:11px;font-weight:600;color:var(--texto3);
        text-transform:uppercase;letter-spacing:0.4px;gap:12px;">
        <div style="width:32px;text-align:center;">
          <input type="checkbox" id="qr-check-all"
            onchange="seleccionarTodosQR(this.checked)"
            style="width:16px;height:16px;accent-color:var(--verde);cursor:pointer;">
        </div>
        <div style="flex:2;">Nombre</div>
        <div style="flex:1;">RUT</div>
        <div style="flex:1;">Cargo</div>
        <div style="flex:1.5;">Empresa</div>
        <div style="flex:0.8;text-align:center;">Credencial</div>
      </div>
    

   <!-- FILAS -->
<div style="background:var(--blanco);border:1px solid var(--borde);border-top:none;">
      <div>
      ${lista.map((t, i) => {
        const emp    = findMandante(t);
        const empNom = emp ? emp.nombre : '—';
        const avColors = ['#DBEAFE|#1D4ED8','#D1FAE5|#065F46','#FEF3C7|#92400E',
                          '#FCE7F3|#9D174D','#EDE9FE|#5B21B6','#FEE2E2|#991B1B'];
        const [bg,fg] = avColors[i%6].split('|');
        const ini = (t.nombre||'??').split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase();

        return `
        <div style="display:flex;align-items:center;padding:11px 16px;gap:12px;
          border-bottom:1px solid var(--borde);transition:.15s;"
          onmouseover="this.style.background='#f8fafc'"
          onmouseout="this.style.background=''">

          <!-- Checkbox individual -->
          <div style="width:32px;text-align:center;">
            <input type="checkbox" class="qr-check"
              data-rut="${t.rut}" data-nombre="${t.nombre}"
              data-cargo="${t.funcion_cargo||''}" data-empresa="${empNom}"
              style="width:16px;height:16px;accent-color:var(--verde);cursor:pointer;">
          </div>

          <!-- Nombre con avatar -->
          <div style="flex:2;display:flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
              background:${bg};color:${fg};display:flex;align-items:center;
              justify-content:center;font-size:10px;font-weight:700;">${ini}</div>
            <div style="font-weight:500;font-size:13px;">${t.nombre}</div>
          </div>

          <!-- RUT -->
          <div style="flex:1;font-family:monospace;font-size:12px;color:var(--texto2);">${t.rut}</div>

          <!-- Cargo -->
          <div style="flex:1;font-size:12px;color:var(--texto2);">${t.funcion_cargo||'—'}</div>

          <!-- Empresa -->
          <div style="flex:1.5;font-size:12px;color:var(--texto2);">${empNom}</div>

          <!-- Ver credencial individual -->
          <div style="flex:0.8;text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="generarQRIndividual('${t.rut}')" style="font-size:11px;">
              <i class="ti ti-qrcode"></i> Ver
            </button>
          </div>

        </div>`;
      }).join('')}
    </div>`;
}

/* Construye el HTML de una tarjeta de credencial QR para un trabajador */
function _tarjetaQR(t){
  const url      = `${window.location.origin}${window.location.pathname}?rut=${encodeURIComponent(t.rut)}`;
  const mandante = findMandante(t);
  const empPrincipal  = cfg.empresa?.razon_social || 'AgroContratista';
  const nombreMandante = mandante?.nombre || empPrincipal;

  return `
    <div style="border:2px solid #0f2942;border-radius:12px;overflow:hidden;
      width:100%;max-width:6cm;text-align:center;page-break-inside:avoid;background:#fff;
      display:flex;flex-direction:column;margin:0 auto;">
      <div style="background:#0f2942;color:#fff;padding:7px;font-size:11px;
        font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
        ${nombreMandante}
      </div>
      <div style="padding:10px 8px;flex:1;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}"
          style="width:150px;height:150px;">
        <div style="font-weight:700;font-size:12px;margin-top:6px;">${t.nombre}</div>
        <div style="font-size:10px;color:#666;font-family:monospace;">${t.rut}</div>
        <div style="font-size:10px;color:#888;">${t.funcion_cargo||'—'}</div>
      </div>
      <div style="background:#10b981;height:8px;
        -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
    </div>`;
}

/* Ver credencial de un solo trabajador — abre el modal directamente */
function generarQRIndividual(rut){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t){ toast('⚠️ Trabajador no encontrado', 'error'); return; }
  abrirModalQR([t]);
}

/* Ver/generar credenciales de los trabajadores marcados */
function generarTodosQR(){
  const checks = [...document.querySelectorAll('.qr-check:checked')];
  if(!checks.length){ toast('⚠️ Selecciona al menos un trabajador', 'error'); return; }
  const lista = checks
    .map(cb => trabajadores.find(t => t.rut === cb.dataset.rut))
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

  const empPrincipal = cfg.empresa?.razon_social || 'AgroContratista';
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
    <script>setTimeout(()=>window.print(),400);<\/script>
    </body></html>`);
  win.document.close();

  cerrarModalQR();
  seleccionarTodosQR(false);
}
