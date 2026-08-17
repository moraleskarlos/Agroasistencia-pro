/* ════════════════════════════════════════════════════════
   LIQUIDACIONES.JS — Generación de liquidaciones de sueldo
   Diseño profesional · Cumple Art. 54 CT
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

const LOCAL_LIQUIDACIONES = 'agro_liquidaciones';
let liquidaciones_guardadas = [];
let _liquidacionPreview = null;

/* ── CARGA / GUARDADO ──────────────────────────────────── */
function cargarLiquidaciones(){
  try{ liquidaciones_guardadas = JSON.parse(localStorage.getItem(LOCAL_LIQUIDACIONES)) || []; }
  catch{ liquidaciones_guardadas = []; }
}

function guardarLiquidaciones(){
  localStorage.setItem(LOCAL_LIQUIDACIONES, JSON.stringify(liquidaciones_guardadas));
}

/* ── INIT ───────────────────────────────────────────────── */
function switchTabRemuneraciones(tab){
  const tabs = { generar:'sub-tab-rem-generar', emitidas:'sub-tab-rem-emitidas' };
  Object.entries(tabs).forEach(([key, id]) => {
    const panel = document.getElementById(id);
    const btn   = document.getElementById('tab-rem-' + key);
    if(panel) panel.style.display = key === tab ? '' : 'none';
    if(btn){
      btn.style.borderBottomColor = key === tab ? 'var(--azul)' : 'transparent';
      btn.style.color = key === tab ? 'var(--azul)' : 'var(--texto2)';
    }
  });
  if(tab === 'generar') renderReporteLiquidaciones();
  else renderListaLiquidaciones();
}

function initLiquidaciones(){
  cargarLiquidaciones();
  cargarIndicadores();

  const hoy   = new Date();
  const mesAnt= new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
  const periodoDefault = `${mesAnt.getFullYear()}-${String(mesAnt.getMonth()+1).padStart(2,'0')}`;

  const selGen = document.getElementById('rep-liq-periodo');
  if(selGen && !selGen.value) selGen.value = periodoDefault;
  const selEmit = document.getElementById('liq-periodo-selector');
  if(selEmit && !selEmit.value) selEmit.value = periodoDefault;

  _poblarSelectsLiquidacion();
  switchTabRemuneraciones('generar');
}

function limpiarFiltroEmpresaLiq(){
  const el = document.getElementById('liq-filtro-mandante');
  if(el){ el.value = ''; renderListaLiquidaciones(); }
}

function limpiarFiltroTrabajadorLiq(){
  const el = document.getElementById('liq-filtro-trabajador');
  if(el){ el.value = ''; renderListaLiquidaciones(); }
}

/* ════════════════════════════════════════════════════════
   PESTAÑA "GENERAR LIQUIDACIONES" — reporte en vivo
   ════════════════════════════════════════════════════════ */
let _seleccionadosRepLiq = new Set();

function _mesAdyacente(periodo, delta){
  const [anio, mes] = periodo.split('-').map(Number);
  const d = new Date(anio, (mes-1)+delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

/* ¿Este trabajador tiene bonos, horas extra o descuentos fechados en el
   mes anterior o siguiente al que se está viendo? No es un error — solo
   un aviso, para que un dato mal fechado por accidente no pase
   desapercibido como "no tiene nada" (el caso real que encontramos). */
function _tieneDatosFueraDePeriodo(rut, periodo){
  const antes   = _mesAdyacente(periodo, -1);
  const despues = _mesAdyacente(periodo, 1);
  const cerca   = p => p === antes || p === despues;
  const enHaberes  = haberes_variables.filter(h => h.trabajador_rut===rut && cerca(h.periodo)).length;
  const enJornada  = jornada_especial.filter(j => j.trabajador_rut===rut && cerca(j.periodo)).length;
  const enDescuentos = descuentos.filter(d => d.trabajador_rut===rut && cerca(d.periodo)).length;
  return enHaberes + enJornada + enDescuentos;
}

function renderReporteLiquidaciones(){
  const periodo  = document.getElementById('rep-liq-periodo')?.value;
  const empresa  = document.getElementById('rep-liq-empresa')?.value;
  const tbody    = document.getElementById('tbody-reporte-liquidaciones');
  if(!tbody) return;

  _seleccionadosRepLiq.clear();
  _actualizarBotonGenerarSeleccionadas();

  if(!periodo || !empresa){
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--texto3);">Selecciona un período y una empresa</td></tr>';
    return;
  }

  const lista = trabajadores.filter(t => t.estado==='activo' && t.empresa_propia_id===empresa);
  if(!lista.length){
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--texto3);">No hay trabajadores activos en esta empresa</td></tr>';
    return;
  }

  const ind = getIndicadoresPorPeriodo(periodo);
  if(!ind){
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--texto3);">⚠️ No hay indicadores previsionales para ${getNombreMes(periodo)} — regístralos primero en Previsión</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(t => {
    const vars = construirVariablesRemuneracion(t.rut, periodo);
    if(vars.error){
      return `<tr>
        <td></td><td>${t.nombre}</td>
        <td colspan="6" style="color:var(--texto3);font-size:12px;">⚠️ ${vars.error}</td>
        <td></td>
      </tr>`;
    }
    const liq = calcularLiquidacion(vars, periodo);
    const bonos       = [...vars.haberes_imponibles, ...vars.haberes_no_imponibles]
      .reduce((s,h) => s + (parseFloat(h.monto)||0), 0);
    const horasExtra  = vars.total_horas_extra_imponible;
    const descuentos_ = liq.total_descuentos;
    const fueraDePeriodo = _tieneDatosFueraDePeriodo(t.rut, periodo);

    return `<tr>
      <td><input type="checkbox" class="chk-rep-liq" data-rut="${t.rut}" onchange="toggleCheckRepLiq('${t.rut}', this.checked)" style="accent-color:var(--verde);width:16px;height:16px;"></td>
      <td style="font-weight:500;">${t.nombre}<div style="font-size:11px;color:var(--texto3);">${t.rut}</div></td>
      <td style="text-align:right;">$${liq.sueldo_base.toLocaleString('es-CL')}</td>
      <td style="text-align:right;">${bonos>0 ? '$'+bonos.toLocaleString('es-CL') : '—'}</td>
      <td style="text-align:right;">${horasExtra>0 ? '$'+horasExtra.toLocaleString('es-CL') : '—'}</td>
      <td style="text-align:right;color:var(--rojo);">${descuentos_>0 ? '-$'+descuentos_.toLocaleString('es-CL') : '—'}</td>
      <td style="text-align:right;font-weight:600;">$${liq.liquido.toLocaleString('es-CL')}</td>
      <td>${fueraDePeriodo ? `<span class="badge badge-amarillo" title="${fueraDePeriodo} registro(s) en el mes anterior o siguiente — revisa que no esté mal fechado">⚠️ ${fueraDePeriodo}</span>` : ''}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="previsualizarLiquidacion('${t.rut}')" title="Vista previa"><i class="ti ti-eye"></i></button>
        <button class="btn btn-secondary btn-sm" onclick="generarLiquidacionIndividualFila('${t.rut}')" title="Generar solo esta"><i class="ti ti-file-invoice"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function toggleCheckRepLiq(rut, checked){
  if(checked) _seleccionadosRepLiq.add(rut);
  else _seleccionadosRepLiq.delete(rut);
  _actualizarBotonGenerarSeleccionadas();
}

function toggleSeleccionarTodosRepLiq(checked){
  document.querySelectorAll('.chk-rep-liq').forEach(el => {
    el.checked = checked;
    if(checked) _seleccionadosRepLiq.add(el.dataset.rut);
    else _seleccionadosRepLiq.delete(el.dataset.rut);
  });
  _actualizarBotonGenerarSeleccionadas();
}

function _actualizarBotonGenerarSeleccionadas(){
  const btn = document.getElementById('btn-generar-seleccionadas');
  const txt = document.getElementById('txt-generar-seleccionadas');
  const n = _seleccionadosRepLiq.size;
  if(btn) btn.disabled = n === 0;
  if(txt) txt.textContent = n === 0 ? 'Generar liquidaciones seleccionadas'
    : n === 1 ? 'Generar liquidación seleccionada (1)'
    : `Generar liquidaciones seleccionadas (${n})`;
}

function generarLiquidacionIndividualFila(rut){
  const periodo = document.getElementById('rep-liq-periodo')?.value;
  if(!periodo || !_verificarPreCondiciones(periodo)) return;
  const liq = calcularYGuardarLiquidacion(rut, periodo);
  if(liq.error){ toast(`❌ ${liq.error}`, 'error'); return; }
  toast(`✅ Liquidación generada — ${liq.nombre}`, 'exito');
  _actualizarBadgeLiquidacionesEmitidas();
}

function generarLiquidacionesSeleccionadas(){
  const periodo = document.getElementById('rep-liq-periodo')?.value;
  if(!periodo || !_verificarPreCondiciones(periodo)) return;
  if(!_seleccionadosRepLiq.size){ toast('⚠️ Selecciona al menos un trabajador','error'); return; }

  let ok = 0, errores = 0;
  _seleccionadosRepLiq.forEach(rut => {
    const liq = calcularYGuardarLiquidacion(rut, periodo);
    if(liq.error) errores++; else ok++;
  });

  toast(`✅ ${ok} liquidación${ok===1?'':'es'} generada${ok===1?'':'s'}${errores?` — ${errores} con error`:''}`, errores ? 'error' : 'exito');
  _actualizarBadgeLiquidacionesEmitidas();
  const selEmit = document.getElementById('liq-periodo-selector');
  if(selEmit) selEmit.value = periodo;
  switchTabRemuneraciones('emitidas');
}

function _actualizarBadgeLiquidacionesEmitidas(){
  const periodo = document.getElementById('rep-liq-periodo')?.value || document.getElementById('liq-periodo-selector')?.value;
  const badge = document.getElementById('badge-tab-liq-emitidas');
  if(badge) badge.textContent = liquidaciones_guardadas.filter(l => l.periodo===periodo).length;
}

function _poblarSelectsLiquidacion(){
  const selEmpresa = document.getElementById('liq-filtro-mandante');
  if(selEmpresa){
    const val = selEmpresa.value;
    selEmpresa.innerHTML = '<option value="">Todas las empresas</option>'
      + (empresas_propias||[]).map(e => `<option value="${e.id}">${e.nombre||e.razon_social}</option>`).join('');
    if(val) selEmpresa.value = val;
  }
  const selRep = document.getElementById('rep-liq-empresa');
  if(selRep){
    const val = selRep.value;
    if((empresas_propias||[]).length === 1){
      selRep.innerHTML = `<option value="${empresas_propias[0].id}">${empresas_propias[0].nombre||empresas_propias[0].razon_social}</option>`;
      selRep.value = empresas_propias[0].id;
    } else {
      selRep.innerHTML = '<option value="">— Selecciona una empresa —</option>'
        + (empresas_propias||[]).map(e => `<option value="${e.id}">${e.nombre||e.razon_social}</option>`).join('');
      if(val) selRep.value = val;
    }
  }
}

/* ── VERIFICACIONES PREVIAS ─────────────────────────────── */
function _verificarPreCondiciones(periodo){
  const ind = getIndicadoresPorPeriodo(periodo);
  if(!ind){
    toast(`⚠️ No hay indicadores previsionales para ${getNombreMes(periodo)} — regístralos primero`, 'error');
    return false;
  }
  const trabActivos = trabajadores.filter(t => t.estado === 'activo');
  if(!trabActivos.length){
    toast('⚠️ No hay trabajadores activos en el sistema', 'error');
    return false;
  }
  return true;
}

/* ── CALCULAR PREVIEW (sin guardar) ─────────────────────── */
function previsualizarLiquidacion(rut){
  const periodo = document.getElementById('rep-liq-periodo')?.value || document.getElementById('liq-periodo-selector')?.value;
  if(!periodo){ toast('⚠️ Selecciona el período primero', 'error'); return; }
  if(!_verificarPreCondiciones(periodo)) return;

  const vars = construirVariablesRemuneracion(rut, periodo);
  if(vars.error){ toast(`❌ ${vars.error}`, 'error'); return; }

  const liq = calcularLiquidacion(vars, periodo);
  if(liq.error){ toast(`❌ ${liq.error}`, 'error'); return; }

  _liquidacionPreview = liq;
  _mostrarModalLiquidacion(liq, false);
}

/* previsualizarLiquidacionSeleccionada() se sacó junto con el resto —
   ver nota más abajo. */

/* ── CALCULAR Y GUARDAR ─────────────────────────────────── */
function calcularYGuardarLiquidacion(rut, periodo){
  const vars = construirVariablesRemuneracion(rut, periodo);
  if(vars.error) return { error: vars.error };
  const liq  = calcularLiquidacion(vars, periodo);
  if(liq.error) return { error: liq.error };

  // ✅ Corregido — antes se generaba un folio NUEVO cada vez que se
  // recalculaba una liquidación ya existente (ej. para corregir un
  // error), dejando folios huérfanos y pudiendo repetir el mismo folio
  // en otro trabajador distinto. Ahora: si ya existía para este rut+
  // período, se reusa su folio — es la misma liquidación, corregida,
  // no un documento nuevo.
  const idx = liquidaciones_guardadas.findIndex(l => l.rut === rut && l.periodo === periodo);
  liq.folio          = idx >= 0 ? liquidaciones_guardadas[idx].folio : _generarFolio(periodo);
  liq.fecha_emision  = hoyISO();
  liq.estado         = 'generada';

  if(idx >= 0) liquidaciones_guardadas[idx] = liq;
  else liquidaciones_guardadas.push(liq);

  guardarLiquidaciones();

  // Registrar en Carpeta Laboral
  registrarDocumentoCarpeta({
    trabajador_rut: rut,
    tipo:        'liquidacion',
    subtipo:     periodo,
    folio:       liq.folio,
    fecha_firma: liq.fecha_emision,
    descripcion: `Liquidación ${getNombreMes(periodo)} — Líquido $${liq.liquido.toLocaleString('es-CL')}`,
  });

  return liq;
}

/* ✅ generarLiquidacionIndividual(), generarLiquidacionesMasivas() y
   previsualizarLiquidacionSeleccionada() se sacaron — reemplazadas por
   generarLiquidacionIndividualFila()/generarLiquidacionesSeleccionadas()
   de la pestaña "Generar Liquidaciones" (tabla-reporte + checkboxes).
   previsualizarLiquidacion(rut) se mantiene — la sigue usando el botón
   de vista previa (👁) de cada fila de esa misma tabla. */

/* ── FOLIO CORRELATIVO ──────────────────────────────────── */
function _generarFolio(periodo){
  const [anio, mes] = periodo.split('-');
  const existentes  = liquidaciones_guardadas.filter(l => l.periodo === periodo).length;
  const num         = String(existentes + 1).padStart(4,'0');
  return `${anio}${mes}-${num}`;
}

/* ── LISTA DE LIQUIDACIONES ─────────────────────────────── */
function renderListaLiquidaciones(){
  const periodo    = document.getElementById('liq-periodo-selector')?.value || '';
  const mandante   = document.getElementById('liq-filtro-mandante')?.value  || '';
  const busqueda   = (document.getElementById('liq-filtro-trabajador')?.value || '').trim().toLowerCase();
  const tbody      = document.getElementById('tbody-liquidaciones');
  if(!tbody) return;

  let lista = liquidaciones_guardadas.filter(l => !periodo || l.periodo === periodo);
  if(mandante){
    // ✅ Corregido — antes tomaba "el primer contrato que encuentra" del
    // trabajador, sin importar el período. Con Carpeta Empresa (un
    // trabajador puede tener contratos con más de una empresa a lo
    // largo del tiempo), eso podía mostrar la empresa equivocada en
    // liquidaciones de meses viejos. Ahora usa el contrato vigente
    // específico de CADA liquidación, según su propio período.
    lista = lista.filter(l => {
      const c = _getContratoVigente(l.rut, l.periodo);
      return c?.empresa_propia_id === mandante;
    });
  }
  if(busqueda){
    lista = lista.filter(l =>
      (l.nombre||'').toLowerCase().includes(busqueda) ||
      (l.rut||'').toLowerCase().includes(busqueda));
  }

  const badge = document.getElementById('badge-tab-liq-emitidas');
  if(badge) badge.textContent = liquidaciones_guardadas.filter(l => !periodo || l.periodo === periodo).length;

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--texto3);">
      Sin liquidaciones para este período — genera las liquidaciones desde la pestaña "Generar Liquidaciones"</td></tr>`;
    _renderResumenPeriodo([]);
    return;
  }

  lista.sort((a,b) => a.nombre?.localeCompare(b.nombre));
  _listaLiqActual = lista;
  tbody.innerHTML = lista.map((l, i) => `<tr>
    <td style="font-size:13px;font-weight:500;">${l.nombre}</td>
    <td class="rut-mono">${l.rut}</td>
    <td style="font-size:12px;text-align:right;">$${l.total_haberes?.toLocaleString('es-CL')||'—'}</td>
    <td style="font-size:12px;text-align:right;color:var(--danger);">-$${l.total_descuentos?.toLocaleString('es-CL')||'—'}</td>
    <td style="font-size:13px;font-weight:600;text-align:right;color:var(--verde-dark);">$${l.liquido?.toLocaleString('es-CL')||'—'}</td>
    <td style="font-size:11px;color:var(--texto2);">${l.folio||'—'}</td>
    <td>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-secondary btn-sm" onclick="verLiquidacion('${l.rut}','${l.periodo}')" title="Ver">
          <i class="ti ti-eye"></i>
        </button>
        <button class="btn btn-primary btn-sm" onclick="imprimirLiquidacion('${l.rut}','${l.periodo}')" title="Imprimir/PDF">
          <i class="ti ti-printer"></i>
        </button>
      </div>
    </td>
  </tr>`).join('');

  _renderResumenPeriodo(lista);
}

function _renderResumenPeriodo(lista){
  const setKPI = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  const total_sueldos   = lista.reduce((s,l) => s + (l.sueldo_base||0), 0);
  const total_variables = lista.reduce((s,l) => s + ((l.total_haberes||0) - (l.sueldo_proporcional||0)), 0);
  const total_desc_leg  = lista.reduce((s,l) => s + (l.total_prev_trab||0) + (l.iusc||0), 0);
  const total_desc_emp  = lista.reduce((s,l) => s + (l.total_desc_adicionales||0), 0);
  const total_liq       = lista.reduce((s,l) => s + (l.liquido||0), 0);
  const fmt = n => lista.length ? '$'+n.toLocaleString('es-CL') : '—';

  setKPI('liq-kpi-trabajadores', lista.length);
  setKPI('liq-kpi-sueldos',      fmt(total_sueldos));
  setKPI('liq-kpi-variables',    fmt(total_variables));
  setKPI('liq-kpi-desc-legales', fmt(total_desc_leg));
  setKPI('liq-kpi-desc-empresa', fmt(total_desc_emp));
  setKPI('liq-kpi-liquido',      fmt(total_liq));
}

/* ── VER LIQUIDACIÓN GUARDADA ───────────────────────────── */
let _listaLiqActual = [];
let _indiceLiqActual = -1;

function verLiquidacion(rut, periodo){
  const liq = liquidaciones_guardadas.find(l => l.rut === rut && l.periodo === periodo);
  if(!liq){ toast('⚠️ Liquidación no encontrada', 'error'); return; }
  _indiceLiqActual = _listaLiqActual.findIndex(l => l.rut === rut && l.periodo === periodo);
  _mostrarModalLiquidacion(liq, true);
}

function _navModalLiquidacion(delta){
  if(_indiceLiqActual < 0 || !_listaLiqActual.length) return;
  _indiceLiqActual = (_indiceLiqActual + delta + _listaLiqActual.length) % _listaLiqActual.length;
  _mostrarModalLiquidacion(_listaLiqActual[_indiceLiqActual], true);
}

/* ── MODAL CON LA LIQUIDACIÓN ───────────────────────────── */
function _mostrarModalLiquidacion(liq, guardada){
  const overlay = document.getElementById('liq-modal-overlay');
  const cont    = document.getElementById('liq-modal-contenido');
  if(!overlay || !cont) return;

  cont.innerHTML = _generarHTMLLiquidacion(liq, guardada);
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Navegación ◀▶ — solo si venimos de la lista (guardada) y hay más de una
  const nav = document.getElementById('liq-modal-nav');
  const mostrarNav = guardada && _indiceLiqActual >= 0 && _listaLiqActual.length > 1;
  if(nav) nav.style.display = mostrarNav ? 'flex' : 'none';
  if(mostrarNav){
    const contador = document.getElementById('liq-modal-nav-contador');
    if(contador) contador.textContent = `${_indiceLiqActual+1} / ${_listaLiqActual.length}`;
  }
}

function cerrarModalLiquidacion(){
  const overlay = document.getElementById('liq-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  _indiceLiqActual = -1;
}

/* ── GENERAR HTML DE LIQUIDACIÓN ─────────────────────────── */
function _generarHTMLLiquidacion(liq, guardada){
  const ind     = getIndicadoresPorPeriodo(liq.periodo);
  const t       = trabajadores.find(x => x.rut === liq.rut);
  const cont    = contratos.find(c => c.trabajador_rut === liq.rut || (c.trabajador_id && c.trabajador_id === t?.id));
  const mandante= t ? findMandante(t) : null;
  const ep      = getEmpresaEmpleadora(cont?.empresa_propia_id);

  const [anio, mes] = liq.periodo.split('-');
  const nombreMes   = new Date(anio, mes-1, 1)
    .toLocaleDateString('es-CL', {month:'long', year:'numeric'});
  const fmtFecha = v => v ? new Date(v+'T12:00:00').toLocaleDateString('es-CL') : '—';
  const fmtM     = v => v != null ? '$'+Math.round(v).toLocaleString('es-CL') : '—';
  const badgeTipo = tipo => {
    // ✅ Corregido — el mapa usaba 'fijo' pero el valor real que guarda
    // el contrato es 'plazo_fijo'. Se mantiene 'fijo' como alias por si
    // en algún punto se pasa el valor ya normalizado para AFC.
    const map = { indefinido:'Indefinido', plazo_fijo:'Plazo Fijo', fijo:'Plazo Fijo', temporada:'Temporada' };
    return `<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:500;padding:2px 8px;border-radius:99px;">${map[tipo]||tipo}</span>`;
  };

  // Haberes imponibles detalle
  let habImpRows = `<tr><td class="ld-sub">Sueldo base mensual</td><td class="ld-amt">${fmtM(liq.sueldo_base)}</td><td></td></tr>`;
  if(liq.descuento_ausencias > 0){
    habImpRows += `<tr><td class="ld-sub" style="color:#dc2626;">Descuento ${liq.dias_a_descontar} día${liq.dias_a_descontar>1?'s':''} ausencia${liq.dias_permiso_sin_goce>0?' sin goce':' injustificada'} (× ${fmtM(Math.round(liq.sueldo_base/30))})</td><td class="ld-amt" style="color:#dc2626;">-${fmtM(liq.descuento_ausencias)}</td><td></td></tr>`;
    habImpRows += `<tr><td class="ld-sub">Sueldo proporcional</td><td class="ld-amt">${fmtM(liq.sueldo_proporcional)}</td><td></td></tr>`;
  }
  (liq.haberes_variables||[]).filter(h=>h.imponible!==false).forEach(h => {
    habImpRows += `<tr><td class="ld-sub">${_labelHaber(h.tipo)}</td><td class="ld-amt">${fmtM(h.monto)}</td><td></td></tr>`;
  });
  (liq.horas_extra||[]).forEach(h => {
    habImpRows += `<tr><td class="ld-sub">Horas extra ${h.horas}h (${h.recargo} recargo) — ${fmtFecha(h.fecha)}</td><td class="ld-amt">${fmtM(h.monto_imponible)}</td><td></td></tr>`;
  });

  // Haberes no imponibles
  const habNoImp = (liq.haberes_variables||[]).filter(h=>h.imponible===false);
  let habNoImpRows = habNoImp.length
    ? habNoImp.map(h => `<tr><td class="ld-sub">${_labelHaber(h.tipo)}</td><td class="ld-amt">${fmtM(h.monto)}</td><td></td></tr>`).join('')
    : `<tr><td class="ld-sub" style="color:var(--texto3);">Sin haberes no imponibles</td><td></td><td></td></tr>`;

  // Descuentos legales
  const afpNombreLabel = t?.afiliacion_afp || liq.afp || '—';
  let descLegRows = `
    <tr><td class="ld-sub">AFP ${afpNombreLabel} — ${liq.pct_afp_trab}% s/ ${fmtM(liq.base_afp)}</td><td></td><td class="ld-amt-neg">-${fmtM(liq.monto_afp)}</td></tr>
    <tr><td class="ld-sub">${liq.es_isapre ? 'Isapre' : 'Fonasa'} — 7% s/ ${fmtM(liq.base_afp)}</td><td></td><td class="ld-amt-neg">-${fmtM(liq.monto_salud)}</td></tr>`;
  if(liq.monto_afc_trab > 0){
    descLegRows += `<tr><td class="ld-sub">AFC Seg. Cesantía — 0,6% s/ ${fmtM(liq.base_afc)}</td><td></td><td class="ld-amt-neg">-${fmtM(liq.monto_afc_trab)}</td></tr>`;
  }
  if(liq.iusc > 0){
    descLegRows += `<tr><td class="ld-sub">IUSC Impuesto Único s/ ${fmtM(liq.base_iusc)}</td><td></td><td class="ld-amt-neg">-${fmtM(liq.iusc)}</td></tr>`;
  }

  // Otros descuentos
  let otrosDescRows = '';
  if((liq.descuentos_adicionales||[]).length){
    liq.descuentos_adicionales.forEach(d => {
      const label = d.cuotas_total > 1
        ? `${_labelDescuento(d.tipo)} — cuota ${d.cuotas_pagadas||1}/${d.cuotas_total}`
        : _labelDescuento(d.tipo);
      otrosDescRows += `<tr><td class="ld-sub">${label}</td><td></td><td class="ld-amt-neg">-${fmtM(d.monto)}</td></tr>`;
    });
  } else {
    otrosDescRows = `<tr><td class="ld-sub" style="color:var(--texto3);">Sin otros descuentos</td><td></td><td></td></tr>`;
  }

  return `
  <style>
    .ld-wrap{max-width:760px;margin:0 auto;background:#fff;font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;color:#1e293b;}
    .ld-header{background:#0f2942;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:flex-start;}
    .ld-logo-icon{width:38px;height:38px;background:#10b981;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0;}
    .ld-titulo-label{font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;}
    .ld-titulo-periodo{font-size:20px;font-weight:600;color:#fff;margin-top:2px;}
    .ld-folio{font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;}
    .ld-body{padding:20px 24px;}
    .ld-ficha{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}
    .ld-ficha-col{padding:14px 16px;}
    .ld-ficha-col:first-child{border-right:1px solid #e2e8f0;}
    .ld-ficha-col-title{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;}
    .ld-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;}
    .ld-row-label{color:#64748b;}
    .ld-row-val{font-weight:500;color:#1e293b;text-align:right;}
    .ld-sec{display:flex;align-items:center;gap:8px;background:#0f2942;color:#fff;padding:7px 12px;border-radius:6px;margin:14px 0 6px;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;}
    .ld-sec-rojo{background:#7f1d1d;}
    .ld-sec-cafe{background:#78350f;}
    .ld-table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:2px;}
    .ld-table td{padding:6px 10px;border-bottom:1px solid #f1f5f9;}
    .ld-table tr:last-child td{border-bottom:none;}
    .ld-sub{padding-left:22px!important;color:#475569;}
    .ld-amt{text-align:right;font-weight:500;color:#1e293b;}
    .ld-amt-neg{text-align:right;font-weight:500;color:#dc2626;}
    .ld-subtotal td{background:#f8fafc;font-weight:500;font-size:12px;}
    .ld-bases{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;text-align:center;}
    .ld-base-label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:3px;}
    .ld-base-val{font-size:13px;font-weight:500;color:#1e293b;}
    .ld-totales{display:flex;justify-content:flex-end;margin:14px 0;}
    .ld-totales-inner{width:52%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}
    .ld-tot-row{display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;}
    .ld-tot-liquido{background:#0f2942;color:#fff;display:flex;justify-content:space-between;padding:12px 14px;font-size:15px;font-weight:600;}
    .ld-legal{font-size:11px;color:#64748b;line-height:1.5;padding:12px 0;border-top:1px solid #e2e8f0;margin-top:4px;}
    .ld-firmas{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:20px 0 8px;}
    .ld-firma-box{text-align:center;}
    .ld-firma-linea{border-top:1px dashed #cbd5e1;padding-top:8px;margin-top:40px;font-size:11px;color:#475569;}
    .ld-footer{text-align:center;padding:10px 0 4px;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;}
    @media print{
      body{margin:0;padding:0;}
      .ld-no-print{display:none!important;}
      .ld-wrap{max-width:100%;box-shadow:none;border:none;}
    }
  </style>

  <div class="ld-wrap">
    <div class="ld-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="ld-logo-icon">AC</div>
        <div>
          <div style="font-size:16px;font-weight:600;">AgroContratista</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.5px;">La plataforma para contratistas agrícolas</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div class="ld-titulo-label">Liquidación de sueldo</div>
        <div class="ld-titulo-periodo">${_capitalizar(nombreMes)}</div>
        <div class="ld-folio">Folio N° ${liq.folio||'—'} · Emitido ${fmtFecha(liq.fecha_emision||hoyISO())}</div>
      </div>
    </div>

    <div class="ld-body">

      <div class="ld-ficha">
        <div class="ld-ficha-col">
          <div class="ld-ficha-col-title">Empleador</div>
          <div class="ld-row"><span class="ld-row-label">Empresa</span><span class="ld-row-val">${ep?.razon_social||ep?.nombre||'—'}</span></div>
          <div class="ld-row"><span class="ld-row-label">RUT</span><span class="ld-row-val">${ep?.rut||'—'}</span></div>
          ${mandante ? `<div class="ld-row"><span class="ld-row-label">Mandante</span><span class="ld-row-val">${mandante.nombre}</span></div>` : ''}
          ${_faenaVigente(t?.rut, liq.periodo) ? `<div class="ld-row"><span class="ld-row-label">Faena</span><span class="ld-row-val">${_faenaVigente(t?.rut, liq.periodo)}</span></div>` : ''}
        </div>
        <div class="ld-ficha-col">
          <div class="ld-ficha-col-title">Trabajador</div>
          <div class="ld-row"><span class="ld-row-label">Nombre</span><span class="ld-row-val">${liq.nombre}</span></div>
          <div class="ld-row"><span class="ld-row-label">RUT</span><span class="ld-row-val">${liq.rut}</span></div>
          ${t?.funcion_cargo ? `<div class="ld-row"><span class="ld-row-label">Cargo</span><span class="ld-row-val">${t.funcion_cargo}</span></div>` : ''}
          <div class="ld-row"><span class="ld-row-label">Contrato</span><span class="ld-row-val">${badgeTipo(cont?.tipo || cont?.tipo_contrato || liq.tipo_contrato)}</span></div>
          <div class="ld-row"><span class="ld-row-label">Inicio contrato</span><span class="ld-row-val">${fmtFecha(liq.fecha_inicio_contrato)}</span></div>
          <div class="ld-row"><span class="ld-row-label">Días mes / trabajados</span><span class="ld-row-val">30 / ${30 - (liq.dias_a_descontar||0)}</span></div>
          <div class="ld-row"><span class="ld-row-label">AFP</span><span class="ld-row-val">${_capitalizar(liq.afp||'—')} (${liq.pct_afp_trab||'—'}%)</span></div>
          <div class="ld-row"><span class="ld-row-label">Salud</span><span class="ld-row-val">${liq.sistema_salud||'Fonasa'} (7%)</span></div>
          <div class="ld-row"><span class="ld-row-label">Valor UF</span><span class="ld-row-val">${ind?.uf ? '$'+ind.uf.toLocaleString('es-CL',{minimumFractionDigits:2}) : '—'}</span></div>
        </div>
      </div>

      <div class="ld-sec"><i class="ti ti-trending-up"></i> Haberes imponibles</div>
      <table class="ld-table">
        ${habImpRows}
        <tr class="ld-subtotal"><td style="padding-left:10px;">Subtotal haberes imponibles</td><td class="ld-amt">${fmtM(liq.total_haberes_imponibles)}</td><td></td></tr>
      </table>

      <div class="ld-sec"><i class="ti ti-coffee"></i> Haberes no imponibles</div>
      <table class="ld-table">
        ${habNoImpRows}
        <tr class="ld-subtotal"><td style="padding-left:10px;">Subtotal no imponibles</td><td class="ld-amt">${fmtM(liq.total_haberes_no_imponibles)}</td><td></td></tr>
      </table>

      <div class="ld-sec ld-sec-rojo"><i class="ti ti-shield-check"></i> Descuentos legales previsionales</div>
      <table class="ld-table">
        ${descLegRows}
        <tr class="ld-subtotal"><td style="padding-left:10px;">Subtotal descuentos legales</td><td></td><td class="ld-amt-neg">-${fmtM(liq.total_prev_trab + liq.iusc)}</td></tr>
      </table>

      <div class="ld-sec ld-sec-cafe"><i class="ti ti-minus"></i> Otros descuentos</div>
      <table class="ld-table">
        ${otrosDescRows}
        <tr class="ld-subtotal"><td style="padding-left:10px;">Subtotal otros descuentos</td><td></td><td class="ld-amt-neg">-${fmtM(liq.total_desc_adicionales)}</td></tr>
      </table>

      <div class="ld-bases">
        <div><div class="ld-base-label">Base imponible AFP / Salud</div><div class="ld-base-val">${fmtM(liq.base_afp)}</div></div>
        <div><div class="ld-base-label">Base imponible AFC</div><div class="ld-base-val">${fmtM(liq.base_afc)}</div></div>
        <div><div class="ld-base-label">Base tributable IUSC</div><div class="ld-base-val">${fmtM(liq.base_iusc)}</div></div>
      </div>

      <div class="ld-totales">
        <div class="ld-totales-inner">
          <div class="ld-tot-row"><span>Total haberes</span><span style="font-weight:600;">${fmtM(liq.total_haberes)}</span></div>
          <div class="ld-tot-row"><span>Total descuentos</span><span style="font-weight:600;color:#dc2626;">-${fmtM(liq.total_descuentos)}</span></div>
          <div class="ld-tot-liquido"><span>Líquido a recibir</span><span>${fmtM(liq.liquido)}</span></div>
        </div>
      </div>

      <div class="ld-legal">
        Certifico que he recibido de <strong>${ep?.razon_social||ep?.nombre||'la empresa'}</strong> ${ep?.rut ? '(RUT '+ep.rut+')' : ''} a mi entera satisfacción la suma indicada en la presente liquidación y no tengo cargo ni cobro posterior que hacer por concepto de remuneraciones del período señalado.
      </div>

      <div class="ld-firmas">
        <div class="ld-firma-box">
          <div class="ld-firma-linea">Firma y timbre empleador<br><strong>${ep?.razon_social||ep?.nombre||'—'}</strong></div>
        </div>
        <div class="ld-firma-box">
          <div class="ld-firma-linea">Firma trabajador<br><strong>${liq.nombre}</strong><br>RUT ${liq.rut}</div>
        </div>
      </div>

      <div class="ld-footer">
        Documento generado por AgroContratista · Sistema de Gestión Laboral para Contratistas Agrícolas · Folio N° ${liq.folio||'—'}
      </div>

    </div>
  </div>`;
}

/* ── IMPRIMIR / GUARDAR PDF ─────────────────────────────── */
function imprimirLiquidacion(rut, periodo){
  const liq = liquidaciones_guardadas.find(l => l.rut === rut && l.periodo === periodo);
  if(!liq){ toast('⚠️ Liquidación no encontrada', 'error'); return; }

  const ventana = window.open('', '_blank', 'width=900,height=700');
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"><title>Liquidación ${liq.nombre} ${liq.periodo}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
    <style>body{margin:20px;background:#fff;}</style>
  </head><body>
    ${_generarHTMLLiquidacion(liq, true)}
    <script>setTimeout(()=>window.print(),800);<\/script>
  </body></html>`);
  ventana.document.close();
}

/* ── UTILIDADES ─────────────────────────────────────────── */
function _capitalizar(str){
  if(!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function _labelHaber(tipo){
  const map = {
    bono_produccion:'Bono producción', bono_asistencia:'Bono asistencia',
    bono_puntualidad:'Bono puntualidad', bono_responsabilidad:'Bono responsabilidad',
    colacion:'Colación', movilizacion:'Movilización', viatico:'Viático',
    asignacion_especial:'Asignación especial', otro:'Haber variable',
  };
  return map[tipo] || tipo;
}

function _labelDescuento(tipo){
  const map = {
    anticipo:'Anticipo', prestamo:'Préstamo',
    caja_compensacion:'Caja de Compensación', cuota_sindical:'Cuota sindical',
    retencion_judicial:'Retención judicial', otro:'Descuento',
  };
  return map[tipo] || tipo;
}
