/* ════ QR ════ */

function cargarListaQR(){
  const filtro = document.getElementById('qr-filtro-empresa')?.value || '';
  const lista  = filtro
    ? trabajadores.filter(t => (t.mandante_id||t.empresa||t.empresa_rut) === filtro)
    : trabajadores;
  const el = document.getElementById('qr-lista');

  if(!lista.length){
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--texto3);">Sin trabajadores registrados</div>';
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
        <div style="flex:0.8;text-align:center;">Generar QR</div>
        <div style="flex:0.8;text-align:center;">Estado</div>
      </div>
    

   <!-- FILAS -->
<div style="background:var(--blanco);border:1px solid var(--borde);border-top:none;">
      <div>
      ${lista.map((t, i) => {
        const emp    = findMandante(t);
        const empNom = emp ? emp.nombre : '—';
        const qrId   = 'qr-estado-' + t.rut.replace(/\./g,'').replace('-','');
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

          <!-- Botón generar -->
          <div style="flex:0.8;text-align:center;">
            <button class="btn btn-secondary btn-sm"
              id="btn-qr-${t.rut.replace(/\./g,'').replace('-','')}"
              onclick="generarQRIndividual('${t.rut}')"
              style="font-size:11px;">
              <i class="ti ti-qrcode"></i> Generar
            </button>
          </div>

          <!-- Estado -->
          <div style="flex:0.8;text-align:center;" id="${qrId}">
            <span style="font-size:12px;color:var(--texto3);">⬜ Pendiente</span>
          </div>

        </div>`;
      }).join('')}
    </div>`;
}

function generarQRIndividual(rut){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return;

  const url     = `${window.location.origin}${window.location.pathname}?rut=${encodeURIComponent(rut)}`;
  const rid     = rut.replace(/\./g,'').replace('-','');
  const estadoEl= document.getElementById('qr-estado-' + rid);
  const btnEl   = document.getElementById('btn-qr-' + rid);

  // Guardar URL del QR en dataset del checkbox para usar al imprimir
  const cb = document.querySelector(`.qr-check[data-rut="${rut}"]`);
  if(cb) cb.dataset.url = url;

  // Actualizar estado visual
  if(estadoEl){
    estadoEl.innerHTML = `<span style="font-size:12px;color:var(--verde-dark);font-weight:500;">
      ✅ Listo
    </span>`;
  }

  // Deshabilitar botón
  if(btnEl){
    btnEl.disabled = true;
    btnEl.style.opacity = '0.5';
  }

  toast(`✅ QR listo para ${t.nombre.split(' ')[0]} — selecciona e imprime`, 'exito');
}

function generarTodosQR(){
  const checks = document.querySelectorAll('.qr-check');
  if(!checks.length){ toast('⚠️ Sin trabajadores', 'error'); return; }
  checks.forEach(cb => generarQRIndividual(cb.dataset.rut));
  toast(`✅ QR generados para ${checks.length} trabajadores`, 'exito');
}

function seleccionarTodosQR(val){
  document.querySelectorAll('.qr-check').forEach(c => c.checked = val);
}

function imprimirQRSeleccionados(){
  const seleccionados = [...document.querySelectorAll('.qr-check:checked')];
  if(!seleccionados.length){
    toast('⚠️ Selecciona al menos un trabajador', 'error');
    return;
  }

  // Generar QR para los que no lo tienen aún
  seleccionados.forEach(cb => {
    if(!cb.dataset.url) generarQRIndividual(cb.dataset.rut);
  });

  setTimeout(() => {
    const empPrincipal = cfg.empresa?.razon_social || 'AgroContratista';
    const cards   = seleccionados.map(cb => {
      const url = cb.dataset.url ||
        `${window.location.origin}${window.location.pathname}?rut=${encodeURIComponent(cb.dataset.rut)}`;
      // Mandante específico de este trabajador
      const t        = trabajadores.find(x => x.rut === cb.dataset.rut);
      const mandante = findMandante(t);
      const nombreMandante = mandante?.nombre || empPrincipal;
     return `
      <div style="border:2px solid #0f2942;border-radius:12px;overflow:hidden;
        width:6cm;text-align:center;page-break-inside:avoid;background:#fff;
        display:flex;flex-direction:column;">
        <div style="background:#0f2942;color:#fff;padding:7px;font-size:11px;
          font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          ${nombreMandante}
        </div>
        <div style="padding:10px 8px;flex:1;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}"
            style="width:150px;height:150px;">
          <div style="font-weight:700;font-size:12px;margin-top:6px;">${cb.dataset.nombre}</div>
          <div style="font-size:10px;color:#666;font-family:monospace;">${cb.dataset.rut}</div>
          <div style="font-size:10px;color:#888;">${cb.dataset.cargo||'—'}</div>
        </div>
        <div style="background:#10b981;height:8px;
          -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
      </div>`;
    }).join('');

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
        button{padding:8px 18px;background:#10b981;color:#fff;border:none;
          border-radius:8px;cursor:pointer;font-size:13px;margin-bottom:16px}
        @media print{
          button{display:none}
          .grid{gap:8px}
          *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
        }
      </style></head><body>

      <h2>Códigos QR — ${empPrincipal}</h2>
      <p>${seleccionados.length} trabajador${seleccionados.length>1?'es':''} · ${new Date().toLocaleDateString('es-CL')}</p>
      <button onclick="window.print()">🖨️ Imprimir</button>
      <div class="grid">${cards}</div>
      </body></html>`);
    win.document.close();
seleccionarTodosQR(false);
  }, 500);
}
