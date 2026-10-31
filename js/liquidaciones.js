/* ════════════════════════════════════════════════════════
   LIQUIDACIONES.JS — Generación de liquidaciones de sueldo
   Diseño profesional · Cumple Art. 54 CT
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

const LOCAL_LIQUIDACIONES = 'agro_liquidaciones';
let liquidaciones_guardadas = [];
let _liquidacionPreview = null;

/* ✅ Cierre de mes — "meses_cerrados" es por EMPRESA + PERÍODO (no un
   cierre global), porque cada empresa puede cerrar en momentos
   distintos. Un mes cerrado bloquea generar/recalcular liquidaciones
   de esa empresa+período — las correcciones posteriores se hacen vía
   "ajustes" (ver más abajo), nunca reabriendo el mes. */
const LOCAL_MESES_CERRADOS = 'agro_meses_cerrados';
let meses_cerrados = [];

function cargarMesesCerrados(){
  try{ meses_cerrados = JSON.parse(localStorage.getItem(LOCAL_MESES_CERRADOS)) || []; }
  catch{ meses_cerrados = []; }
}
function guardarMesesCerrados(){
  localStorage.setItem(LOCAL_MESES_CERRADOS, JSON.stringify(meses_cerrados));
}

/* ✅ Ajustes — la forma de corregir un mes YA CERRADO: nunca se reabre
   el mes viejo (queda intacto para siempre, como corresponde
   contablemente), el ajuste se aplica como una línea aparte, visible,
   en la PRÓXIMA liquidación abierta de esa persona (periodo_aplicado =
   el mes calendario siguiente al corregido). */
const LOCAL_AJUSTES = 'agro_ajustes';
let ajustes = [];

function cargarAjustes(){
  try{ ajustes = JSON.parse(localStorage.getItem(LOCAL_AJUSTES)) || []; }
  catch{ ajustes = []; }
}
function guardarAjustes(){
  localStorage.setItem(LOCAL_AJUSTES, JSON.stringify(ajustes));
}

function esMesCerrado(periodo, empresaId){
  return meses_cerrados.some(m => m.periodo === periodo && m.empresa_propia_id === empresaId);
}

/* ✅ Bloqueo centralizado — un solo lugar para el chequeo que se repite
   en los 13 puntos que escriben datos "de un período" (bonos, horas
   extra, descuentos, asistencia, novedades de un solo día, finiquitos).
   Se resuelve la empresa a partir del RUT (mismo campo que ya usan
   estos módulos desde antes — trabajador_rut — no es una dependencia
   nueva). Devuelve true si hay que bloquear (y ya mostró el toast). */
function _bloqueaPorMesCerrado(rut, fecha){
  if(!fecha) return false; // sin fecha no hay período que chequear (validaciones de campo obligatorio se encargan aparte)
  const t = trabajadores.find(x => x.rut === rut);
  const periodo = fecha.slice(0,7);
  if(esMesCerrado(periodo, t?.empresa_propia_id)){
    toast(`🔒 ${getNombreMes(periodo)} ya está cerrado para esta empresa — usa "Corrección" en Libro de Remuneraciones`, 'error');
    return true;
  }
  return false;
}

/* ✅ Variante para RANGOS (Novedades: licencias, permisos que pueden
   cruzar de un mes a otro). Solo bloquea si el rango completo cae
   DENTRO de un único mes ya cerrado — si cruza hacia un mes abierto,
   se deja cargar (el reparto por mes ya existe — _diasNovedadEnPeriodo
   — y el mes cerrado no se recalcula de todas formas, esa protección
   ya la tiene la Liquidación en sí). */
function _bloqueaPorMesCerradoRango(rut, inicio, fin){
  if(!inicio) return false;
  const periodoInicio = inicio.slice(0,7);
  const periodoFin     = (fin||inicio).slice(0,7);
  if(periodoInicio !== periodoFin) return false; // cruza de mes — no bloquea, se reparte
  return _bloqueaPorMesCerrado(rut, inicio);
}

/* ✅ Corrección de emergencia — NO reabre el mes cerrado. Registra un
   ajuste (monto + motivo) que se va a sumar como línea aparte en la
   próxima liquidación abierta del trabajador (periodo_aplicado = mes
   siguiente al corregido). El mes cerrado queda intacto para siempre. */
let _corPeriodoCorregido = null;

function abrirModalCorreccion(periodo, empresaId){
  _corPeriodoCorregido = periodo;
  const periodoAplicado = _mesSiguiente(periodo);

  const sel = document.getElementById('cor-trabajador');
  const activos = trabajadores.filter(t => t.estado === 'activo' && t.empresa_propia_id === empresaId);
  sel.innerHTML = '<option value="">— Seleccionar trabajador —</option>'
    + activos.map(t => `<option value="${t.rut}">${t.nombre} · ${t.rut}</option>`).join('');

  document.getElementById('cor-periodo-nombre').textContent   = getNombreMes(periodo);
  document.getElementById('cor-periodo-aplicado').textContent = getNombreMes(periodoAplicado);
  document.getElementById('cor-monto').value  = '';
  document.getElementById('cor-motivo').value = '';
  document.getElementById('modal-correccion').style.display = 'flex';
}

function cerrarModalCorreccion(){
  document.getElementById('modal-correccion').style.display = 'none';
  _corPeriodoCorregido = null;
}

function guardarAjuste(){
  const rut    = document.getElementById('cor-trabajador')?.value;
  const monto  = parseFloat(document.getElementById('cor-monto')?.value);
  const motivo = document.getElementById('cor-motivo')?.value?.trim();

  if(!rut){ toast('⚠️ Selecciona el trabajador','error'); return; }
  if(!monto || isNaN(monto)){ toast('⚠️ Ingresa un monto distinto de cero','error'); return; }
  if(!motivo){ toast('⚠️ El motivo es obligatorio','error'); return; }
  if(!_corPeriodoCorregido){ toast('⚠️ Error interno — vuelve a abrir el formulario','error'); return; }

  const periodoAplicado = _mesSiguiente(_corPeriodoCorregido);
  const t = trabajadores.find(x => x.rut === rut);

  ajustes.push({
    id: Date.now().toString(),
    trabajador_rut:   rut,
    periodo_corregido: _corPeriodoCorregido,
    periodo_aplicado:  periodoAplicado,
    monto,
    motivo,
    creado_en: hoyISO(),
    creado_por: sesionActiva?.usuario || 'admin',
  });
  guardarAjustes();

  toast(`✅ Ajuste registrado — se va a aplicar en la liquidación de ${getNombreMes(periodoAplicado)} de ${t?.nombre||rut}`, 'exito');
  cerrarModalCorreccion();
}

/* Mes calendario siguiente, en formato 'YYYY-MM' (mismo criterio de
   siempre — string ISO, sin pasar por Date salvo para el cálculo). */
function _mesSiguiente(periodo){
  const [anio, mes] = periodo.split('-').map(Number);
  const d = new Date(anio, mes, 1); // mes (0-index) ya es "el siguiente"
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

/* ✅ Cerrar mes — valida ANTES de dejar cerrar (no se puede cerrar a
   ciegas). Bloquea si hay trabajadores activos sin liquidación
   generada, o con días de asistencia sin clasificar pendientes. El
   aviso de "datos fuera de período" es informativo, no bloquea (podría
   ser un dato legítimo cerca del borde del mes). Un mes cerrado nunca
   se reabre — las correcciones posteriores se hacen vía "Corrección"
   (ver guardarAjuste), que aplica el ajuste al mes siguiente, ya
   abierto, sin tocar el que se acaba de cerrar. */
function cerrarMes(){
  const periodo  = document.getElementById('libro-periodo-selector')?.value;
  const empresa  = document.getElementById('libro-filtro-empresa')?.value;

  if(!periodo){ toast('⚠️ Selecciona un período','error'); return; }
  if(!empresa){ toast('⚠️ Selecciona una empresa específica para cerrar su mes (no "Todas las empresas")','error'); return; }

  if(esMesCerrado(periodo, empresa)){ toast('Este mes ya está cerrado para esta empresa','error'); return; }

  const activos = _trabajadoresDelPeriodo(empresa, periodo); // ✅ H6 — incluye finiquitados con días en el mes
  const problemas = [];

  activos.forEach(t => {
    const tieneLiq = liquidaciones_guardadas.some(l => l.rut === t.rut && l.periodo === periodo);
    if(!tieneLiq){
      problemas.push(`${t.nombre} — sin liquidación generada`);
      return; // si no tiene liquidación, no tiene sentido chequear asistencia todavía
    }
    const asist = (typeof _leerAsistenciaMes === 'function') ? _leerAsistenciaMes(t.rut, periodo) : { dias_sin_clasificar: 0 };
    if(asist.dias_sin_clasificar > 0){
      problemas.push(`${t.nombre} — ${asist.dias_sin_clasificar} día(s) de asistencia sin clasificar`);
    }
  });

  if(problemas.length){
    alert(`⚠️ No se puede cerrar el mes todavía. Faltan resolver ${problemas.length} caso(s):\n\n${problemas.join('\n')}\n\nRevisá "Generar Liquidaciones" para verlos con el semáforo y los avisos.`);
    return;
  }

  const nombreEmp = getEmpresaEmpleadora(empresa)?.razon_social || getEmpresaEmpleadora(empresa)?.nombre || empresa;
  if(!confirm(`¿Cerrar ${getNombreMes(periodo)} para ${nombreEmp}?\n\nUna vez cerrado, no se van a poder generar ni recalcular liquidaciones de este período para esta empresa. Cualquier corrección posterior se aplica como ajuste en el mes siguiente.`)) return;

  meses_cerrados.push({
    id: Date.now().toString(),
    periodo, empresa_propia_id: empresa,
    cerrado_en: hoyISO(),
    cerrado_por: sesionActiva?.usuario || 'admin',
  });
  guardarMesesCerrados();
  toast(`🔒 ${getNombreMes(periodo)} cerrado para ${nombreEmp}`, 'exito');
  if(typeof renderLibro === 'function') renderLibro();
}

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

/* ✅ El aviso "⚠️ N" de datos fuera de período era solo un contador con
   tooltip, sin llevar a ningún lado — el usuario tenía que adivinar en
   cuál de los 3 posibles orígenes (Bonificaciones, Horas Extra o
   Descuentos) estaba el o los registros mal fechados. Este click lleva
   directo al primero que encuentre con datos, con el mes y el
   trabajador ya filtrados — mismo patrón que ya usa el aviso de "sin
   clasificar" (irA + setTimeout + rellenar filtros). */
function verDatosFueraDePeriodo(rut, periodo){
  const antes   = _mesAdyacente(periodo, -1);
  const despues = _mesAdyacente(periodo, 1);
  const cerca   = p => p === antes || p === despues;

  const enHaberes    = haberes_variables.filter(h => h.trabajador_rut===rut && cerca(h.periodo));
  const enJornada    = jornada_especial.filter(j => j.trabajador_rut===rut && cerca(j.periodo));
  const enDescuentos = descuentos.filter(d => d.trabajador_rut===rut && cerca(d.periodo));

  // Prioridad: el primer origen que efectivamente tenga registros — así
  // el click siempre lleva a algo concreto, nunca a una pantalla vacía.
  let destino = null;
  if(enHaberes.length)         destino = { pagina:'bonos', tab:'gl-haberes', prefix:'hab', periodo: enHaberes[0].periodo, render: (typeof renderHaberes==='function') ? renderHaberes : null };
  else if(enJornada.length)    destino = { pagina:'bonos', tab:'gl-jornada',  prefix:'jor', periodo: enJornada[0].periodo, render: (typeof renderJornada==='function') ? renderJornada : null };
  else if(enDescuentos.length) destino = { pagina:'descuentos', tab:null,     prefix:'des', periodo: enDescuentos[0].periodo, render: (typeof renderDescuentos==='function') ? renderDescuentos : null };
  if(!destino) return;

  const t = trabajadores.find(x => x.rut === rut);

  irA(destino.pagina);
  setTimeout(() => {
    if(destino.tab && typeof switchTabBonos === 'function') switchTabBonos(destino.tab);

    const mesSel = document.getElementById(`gl-${destino.prefix}-rev-mes`);
    if(mesSel) mesSel.value = destino.periodo;

    // Mismo efecto que elegir al trabajador en el buscador con autocompletado
    const hidden = document.getElementById(`gl-${destino.prefix}-rev-trabajador`);
    const input  = document.getElementById(`gl-${destino.prefix}-rev-trabajador-input`);
    if(hidden) hidden.value = rut;
    if(input)  input.value  = t ? `${t.nombre} · ${t.rut}` : rut;

    if(destino.render) destino.render();
    if(typeof _renderKPIsGL === 'function') _renderKPIsGL();
  }, 150);
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

  const lista = _trabajadoresDelPeriodo(empresa, periodo); // ✅ H6 — incluye finiquitados con días en el mes
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

    // ✅ Aviso de sueldo bajo el mínimo legal — se compara el sueldo
    // PACTADO en el contrato (vars.sueldo_base, antes de cualquier
    // descuento por ausencia de este mes en particular) contra el
    // mínimo vigente para el período, proporcional a la jornada. Solo
    // informativo — no bloquea, capaz de que ya se corrija con un
    // anexo antes de generar.
    const minimoAplicable = (typeof _sueldoMinimoAplicable === 'function') ? _sueldoMinimoAplicable(t, periodo) : null;
    let avisoSueldoMinimo = '';
    if(minimoAplicable){
      // ✅ H10 — la jornada de referencia para el mínimo es la máxima legal
      // DEL PERÍODO (44/42/40h según Ley 21.561), no 45h fijas. Con 42h
      // (jornada completa hoy) corresponde el mínimo entero.
      const jornadaRef = vars.jornada_maxima_legal || _jornadaMaximaLegal(periodo);
      const horasSem = vars.horas_semanales || jornadaRef;
      const minimoProporcional = Math.round(minimoAplicable.monto * Math.min(horasSem, jornadaRef) / jornadaRef);
      if(vars.sueldo_base > 0 && vars.sueldo_base < minimoProporcional){
        avisoSueldoMinimo = `<span class="badge badge-amarillo" style="margin-left:4px;" title="Sueldo pactado $${vars.sueldo_base.toLocaleString('es-CL')} — mínimo legal proporcional a ${horasSem}h (tramo ${minimoAplicable.tramo}): $${minimoProporcional.toLocaleString('es-CL')}">⚠️ Bajo el mínimo</span>`;
      }
    }

    // ✅ Aviso de días sin clasificar (sin marca de Asistencia y sin
    // novedad) — se están descontando por defecto en este cálculo, así
    // que hay que verlo ANTES de generar, no como sorpresa después.
    // Clickeable — mismo patrón que ya usa Alertas para este caso
    // (irA + clasificarAusencia con la primera fecha pendiente).
    const sinClasificar = vars.dias_sin_clasificar || 0;
    const primeraFechaSinClasificar = (vars.fechas_sin_clasificar||[])[0] || '';
    // ✅ D3 (auditoría Descuentos) — si los descuentos superan lo que hay
    // para pagar, el líquido queda en $0 y la diferencia no se descuenta
    // en ninguna parte. Se avisa para ajustar la cuota antes de generar.
    const disponibleLiq = (liq.total_haberes || 0) + (liq.total_ajustes || 0);
    const excesoDesc = Math.round((liq.total_descuentos || 0) - disponibleLiq);
    const avisoExcesoDesc = excesoDesc > 0
      ? `<span class="badge badge-rojo" style="margin-left:4px;cursor:help;" title="Los descuentos ($${Math.round(liq.total_descuentos).toLocaleString('es-CL')}) superan lo que hay para pagar ($${Math.round(disponibleLiq).toLocaleString('es-CL')}). El líquido queda en $0 y $${excesoDesc.toLocaleString('es-CL')} no se descuentan en ninguna parte. Reduce la cuota en Descuentos antes de generar.">⚠️ Descuentos exceden $${excesoDesc.toLocaleString('es-CL')}</span>`
      : '';
    const avisoSinClasificar = sinClasificar > 0
      ? `<span class="badge badge-amarillo" style="margin-left:4px;cursor:pointer;" title="Sin marca de asistencia ni novedad: ${(vars.fechas_sin_clasificar||[]).map(fmtFecha).join(', ')} — se están descontando como falta injustificada por defecto. Click para ir a clasificar el primer día pendiente." onclick="irA('ausencias'); setTimeout(() => { if(typeof clasificarAusencia==='function') clasificarAusencia('${t.rut}','${primeraFechaSinClasificar}'); }, 150);">⚠️ ${sinClasificar} sin clasificar</span>`
      : '';

    // ✅ Semáforo — ¿ya existe una liquidación GUARDADA para este
    // trabajador+período? (liquidaciones_guardadas es la fuente real,
    // no lo que se está calculando en vivo acá arriba). Si ya existe,
    // el botón "Generar" se reemplaza por "Recalcular" (con
    // confirmación) para no volver a pisarla en silencio.
    const yaGenerada = (liquidaciones_guardadas||[]).some(l => l.rut === t.rut && l.periodo === periodo);
    // ✅ Cierre de mes — si esta empresa+período ya está cerrada, nada
    // de generar/recalcular acá — se reemplaza por un candado.
    const mesCerrado = (typeof esMesCerrado === 'function') && esMesCerrado(periodo, empresa);
    const semaforo = mesCerrado
      ? `<span class="badge badge-gris" title="Mes cerrado — usa el botón Corrección en Libro de Remuneraciones para ajustar" style="margin-left:6px;">🔒 Cerrado</span>`
      : yaGenerada
      ? `<span class="badge badge-verde" title="Ya generada — folio ${(liquidaciones_guardadas.find(l=>l.rut===t.rut&&l.periodo===periodo)||{}).folio||''}" style="margin-left:6px;">🟢 Generada</span>`
      : `<span class="badge badge-gris" title="Todavía no se generó la liquidación de este período" style="margin-left:6px;">🔴 Pendiente</span>`;
    const botonAccion = mesCerrado
      ? `<span class="badge badge-gris" title="Mes cerrado — no se puede generar ni recalcular"><i class="ti ti-lock"></i></span>`
      : yaGenerada
      ? `<button class="btn btn-secondary btn-sm" onclick="recalcularLiquidacion('${t.rut}','${periodo}')" title="Recalcular (reemplaza la ya generada)"><i class="ti ti-refresh"></i></button>`
      : `<button class="btn btn-secondary btn-sm" onclick="generarLiquidacionIndividualFila('${t.rut}')" title="Generar solo esta"><i class="ti ti-file-invoice"></i></button>`;

    return `<tr>
      <td><input type="checkbox" class="chk-rep-liq" data-rut="${t.rut}" onchange="toggleCheckRepLiq('${t.rut}', this.checked)" style="accent-color:var(--verde);width:16px;height:16px;"></td>
      <td style="font-weight:500;">${t.nombre}${semaforo}${avisoSueldoMinimo}<div style="font-size:11px;color:var(--texto3);">${t.rut}</div></td>
      <td style="text-align:right;">$${liq.sueldo_base.toLocaleString('es-CL')}</td>
      <td style="text-align:right;">${bonos>0 ? '$'+bonos.toLocaleString('es-CL') : '—'}</td>
      <td style="text-align:right;">${horasExtra>0 ? '$'+horasExtra.toLocaleString('es-CL') : '—'}</td>
      <td style="text-align:right;color:var(--rojo);">${descuentos_>0 ? '-$'+descuentos_.toLocaleString('es-CL') : '—'}</td>
      <td style="text-align:right;font-weight:600;">$${liq.liquido.toLocaleString('es-CL')}</td>
      <td>${fueraDePeriodo ? `<span class="badge badge-amarillo" style="cursor:pointer;" title="${fueraDePeriodo} registro(s) en el mes anterior o siguiente — revisa que no esté mal fechado. Click para ir a revisarlo." onclick="verDatosFueraDePeriodo('${t.rut}','${periodo}')">⚠️ ${fueraDePeriodo}</span>` : ''}${avisoSinClasificar}${avisoExcesoDesc}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="previsualizarLiquidacion('${t.rut}')" title="Vista previa"><i class="ti ti-eye"></i></button>
        ${botonAccion}
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
  const btnVer = document.getElementById('btn-ver-seleccionadas');
  const txtVer = document.getElementById('txt-ver-seleccionadas');
  const n = _seleccionadosRepLiq.size;
  if(btn) btn.disabled = n === 0;
  if(txt) txt.textContent = n === 0 ? 'Generar liquidaciones seleccionadas'
    : n === 1 ? 'Generar liquidación seleccionada (1)'
    : `Generar liquidaciones seleccionadas (${n})`;
  if(btnVer) btnVer.disabled = n === 0;
  if(txtVer) txtVer.textContent = n <= 1 ? 'Ver seleccionadas' : `Ver seleccionadas (${n})`;
}

/* Vista previa masiva — recorre con ◀▶ las liquidaciones de los
   trabajadores tildados, calculadas al vuelo, SIN guardar nada.
   Para revisar antes de confirmar "Generar liquidaciones seleccionadas". */
function verSeleccionadas(){
  const periodo = document.getElementById('rep-liq-periodo')?.value;
  if(!periodo || !_seleccionadosRepLiq.size) return;
  if(!_verificarPreCondiciones(periodo)) return;

  const lista = [..._seleccionadosRepLiq].map(rut => {
    const vars = construirVariablesRemuneracion(rut, periodo);
    return vars.error ? null : calcularLiquidacion(vars, periodo);
  }).filter(Boolean);

  if(!lista.length){ toast('⚠️ No se pudo calcular ninguna de las seleccionadas', 'error'); return; }

  lista.sort((a,b) => a.nombre?.localeCompare(b.nombre));
  _listaLiqActual = lista;
  _indiceLiqActual = 0;
  _mostrarModalLiquidacion(lista[0], true); // guardada:true solo para activar la navegación ◀▶ — el HTML igual muestra "vista previa, no guardada" porque estas liq no están en liquidaciones_guardadas
}

function generarLiquidacionIndividualFila(rut){
  const periodo = document.getElementById('rep-liq-periodo')?.value;
  if(!periodo || !_verificarPreCondiciones(periodo)) return;
  const t = trabajadores.find(x => x.rut === rut);
  if((typeof esMesCerrado === 'function') && esMesCerrado(periodo, t?.empresa_propia_id)){
    toast('🔒 Este mes ya está cerrado para esta empresa — usa "Corrección" en Libro de Remuneraciones','error'); return;
  }
  const liq = calcularYGuardarLiquidacion(rut, periodo);
  if(liq.error){ toast(`❌ ${liq.error}`, 'error'); return; }
  toast(`✅ Liquidación generada — ${liq.nombre}`, 'exito');
  _actualizarBadgeLiquidacionesEmitidas();
  renderReporteLiquidaciones(); // ✅ refresca el semáforo de esta fila (🔴→🟢)
}

/* ✅ Recalcular — para cuando YA existe una liquidación guardada y hay
   que corregirla (ej. se agregó un bono que faltaba, se corrigió una
   ausencia). A diferencia de "Generar" (que no pregunta nada), acá se
   pide confirmación explícita porque se va a REEMPLAZAR la liquidación
   ya generada — mismo motor de cálculo de siempre
   (calcularYGuardarLiquidacion ya reusa el folio original, ver BL-061),
   solo que ahora el usuario sabe conscientemente que está pisando algo
   que ya existía, en vez de que pase en silencio. Bloqueado si el mes
   ya está cerrado — la corrección de un mes cerrado se hace vía
   "Corrección" (ajuste al mes siguiente), nunca recalculando el viejo. */
function recalcularLiquidacion(rut, periodo){
  const t = trabajadores.find(x => x.rut === rut);
  const nombre = t?.nombre || rut;

  if((typeof esMesCerrado === 'function') && esMesCerrado(periodo, t?.empresa_propia_id)){
    toast('🔒 Este mes ya está cerrado — usa "Corrección" en Libro de Remuneraciones para ajustarlo en el mes siguiente','error'); return;
  }

  if(!confirm(`⚠️ ${nombre} ya tiene una liquidación generada para este período — esto la va a reemplazar con los datos actuales (folio y monto pueden cambiar). ¿Continuar?`)) return;

  if(!_verificarPreCondiciones(periodo)) return;
  const liq = calcularYGuardarLiquidacion(rut, periodo);
  if(liq.error){ toast(`❌ ${liq.error}`, 'error'); return; }
  toast(`✅ Liquidación recalculada — ${liq.nombre}`, 'exito');
  _actualizarBadgeLiquidacionesEmitidas();
  renderReporteLiquidaciones();
}

function generarLiquidacionesSeleccionadas(){
  const periodo = document.getElementById('rep-liq-periodo')?.value;
  const empresa = document.getElementById('rep-liq-empresa')?.value;
  if(!periodo || !_verificarPreCondiciones(periodo)) return;
  if(!_seleccionadosRepLiq.size){ toast('⚠️ Selecciona al menos un trabajador','error'); return; }
  if((typeof esMesCerrado === 'function') && esMesCerrado(periodo, empresa)){
    toast('🔒 Este mes ya está cerrado para esta empresa — usa "Corrección" en Libro de Remuneraciones','error'); return;
  }

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

  // Registrar en Carpeta Laboral — empresa del contrato VIGENTE en ESE
  // período (no la actual del trabajador), mismo criterio período-aware
  // que el filtro de Empresa en Liquidaciones Emitidas y Libro de
  // Remuneraciones (BL-061 punto 7) — así la liquidación de un ciclo
  // anterior queda etiquetada con la empresa correcta de ese ciclo,
  // aunque el trabajador haya cambiado de empresa después.
  const empresaDelPeriodo = _getContratoVigente(rut, periodo)?.empresa_propia_id || '';
  registrarDocumentoCarpeta({
    trabajador_rut: rut,
    empresa_propia_id: empresaDelPeriodo,
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
  tbody.innerHTML = lista.map((l, i) => {
    // ✅ Cierre de mes — badge informativo si esta liquidación pertenece
    // a un período+empresa ya cerrado (la empresa se resuelve vía el
    // contrato vigente de esa persona en ese período específico).
    const empresaLiq = _getContratoVigente(l.rut, l.periodo)?.empresa_propia_id;
    const cerrado = (typeof esMesCerrado === 'function') && esMesCerrado(l.periodo, empresaLiq);
    return `<tr>
    <td style="font-size:13px;font-weight:500;">${l.nombre}</td>
    <td class="rut-mono">${l.rut}</td>
    <td style="font-size:12px;text-align:right;">$${l.total_haberes?.toLocaleString('es-CL')||'—'}</td>
    <td style="font-size:12px;text-align:right;color:var(--danger);">-$${l.total_descuentos?.toLocaleString('es-CL')||'—'}</td>
    <td style="font-size:13px;font-weight:600;text-align:right;color:var(--verde-dark);">$${l.liquido?.toLocaleString('es-CL')||'—'}</td>
    <td style="font-size:11px;color:var(--texto2);">${l.folio||'—'}${cerrado ? ` <span class="badge badge-gris" title="Mes cerrado" style="margin-left:4px;"><i class="ti ti-lock"></i></span>` : ''}</td>
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
  </tr>`;
  }).join('');

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
/* ════════════════════════════════════════════════════════
   DOCUMENTO DE LIQUIDACIÓN — rediseño (propuesta, muestra)
   Objetivo: que el trabajador entienda qué se le pagó y por qué.
   · Encabezado del EMPLEADOR (el documento es suyo; AgroContratista
     solo al pie).
   · "Tus días del mes" con las fechas de faltas, licencias, vacaciones
     y permisos.
   · Lenguaje simple y explicación de los descuentos en $0.
   · Monto en palabras. Recibo sin renuncia ("recibí conforme").
   · Diseño para imprimir: fondo blanco, alto contraste, legible en
     fotocopia en blanco y negro.
   ════════════════════════════════════════════════════════ */

function _fechasLiq(lista){
  // ['2026-07-16','2026-07-17','2026-07-20'] → "16, 17 y 20 de julio"
  if(!lista.length) return '';
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const porMes = {};
  [...new Set(lista)].sort().forEach(f => { const k = f.slice(0,7); (porMes[k] = porMes[k] || []).push(+f.slice(8,10)); });
  return Object.entries(porMes).map(([k, ds]) => {
    const t = ds.length > 1 ? ds.slice(0,-1).join(', ') + ' y ' + ds[ds.length-1] : String(ds[0]);
    return `${t} de ${meses[+k.slice(5,7)-1]}`;
  }).join('; ');
}

function _diasNovedadLiq(liq, tipos, soloLaborales){
  const per = liq.periodo, out = [];
  (typeof getNovedadesPorRut === 'function' ? getNovedadesPorRut(liq.rut, per) : [])
    .filter(n => tipos.includes(n.tipo))
    .forEach(n => {
      for(let f = n.fecha_inicio; f <= (n.fecha_fin || n.fecha_inicio); f = _diaSiguienteISO(f)){
        if(f.slice(0,7) !== per) continue;
        if(soloLaborales === 'laboral' && typeof _esDiaLaboral === 'function' && !_esDiaLaboral(liq.rut, f)) continue;
        if(soloLaborales === 'habil' && _diasHabilesFeriado(f, f) === 0) continue;
        out.push(f);
      }
    });
  return out;
}

function _generarHTMLLiquidacion(liq, guardada){
  /* ✅ Rediseño (30-10-2026) — modelo elegido por el usuario (estilo
     Buk): ordenado y limpio. Encabezado del empleador, ficha en 3
     columnas, haberes a la izquierda y descuentos a la derecha, bases y
     líquido en barras. Se agregan solo datos útiles para el trabajador:
     fechas de faltas/licencias, cuotas de préstamos y tasa de AFP. */
  const t    = trabajadores.find(x => x.rut === liq.rut) || {};
  const cont = _getContratoVigente(liq.rut, liq.periodo) || {};
  const ep   = getEmpresaEmpleadora(cont.empresa_propia_id || t.empresa_propia_id);
  const ind  = getIndicadoresPorPeriodo(liq.periodo);
  const m   = v => '$ ' + Math.round(v || 0).toLocaleString('es-CL');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const fLarga = f => f ? `${String(+f.slice(8,10)).padStart(2,'0')} ${meses[+f.slice(5,7)-1]} ${f.slice(0,4)}` : '—';
  const nombreMes = _capitalizar(getNombreMes(liq.periodo));
  const tipoC = (cont.tipo_contrato || cont.tipo || liq.tipo_contrato || '').toLowerCase();
  const tipoTxt = { indefinido:'Indefinido', plazo_fijo:'Plazo fijo', temporada:'Temporada', fijo:'Plazo fijo' }[tipoC] || '—';
  const afpN = t.afiliacion_afp || _capitalizar(liq.afp || '') || '—';
  const diasTrab = Math.max(0, 30 - (liq.dias_a_descontar || 0));
  const valorDia = Math.round((liq.sueldo_base || 0) / 30);

  /* Haberes imponibles */
  const faltas   = [..._diasNovedadLiq(liq, ['ausencia_injustificada','otro'], 'laboral'), ...(liq.fechas_sin_clasificar || [])];
  const sinGoce  = _diasNovedadLiq(liq, ['permiso_sin_goce'], 'laboral');
  const licencia = _diasNovedadLiq(liq, ['licencia_medica']);
  const fCorta = l => l.length ? ` (${_fechasLiq(l)})` : '';
  const habImp = [['Sueldo base', m(liq.sueldo_base)]];
  if((liq.descuento_fuera_contrato || 0) > 0) habImp.push([`Días sin contrato en el mes (${liq.dias_fuera_contrato} × ${m(valorDia)})`, '-' + m(liq.descuento_fuera_contrato)]);
  if(liq.descuento_ausencias > 0) habImp.push([`Inasistencia ${liq.dias_ausencia} día${liq.dias_ausencia!==1?'s':''}${fCorta([...faltas, ...sinGoce])}`, '-' + m(liq.descuento_ausencias)]);
  if(liq.descuento_licencia > 0){
    const dl = (liq.dias_a_descontar||0) - (liq.dias_ausencia||0) - (liq.dias_fuera_contrato||0);
    habImp.push([`Licencia médica ${dl} día${dl!==1?'s':''}${fCorta(licencia)}`, '-' + m(liq.descuento_licencia)]);
  }
  (liq.haberes_variables || []).filter(h => h.imponible !== false).forEach(h => habImp.push([esc(_labelHaber(h.tipo)), m(h.monto)]));
  (liq.horas_extra || []).forEach(h => habImp.push([`Horas extra ${String(h.horas).replace('.',',')} h ${h.recargo} (${(h.fecha||'').slice(8,10)}/${(h.fecha||'').slice(5,7)})`, m(h.monto_imponible)]));
  const habNoImp = (liq.haberes_variables || []).filter(h => h.imponible === false).map(h => [esc(_labelHaber(h.tipo)), m(h.monto)]);

  /* Descuentos */
  const descLeg = [
    [`Cotiz. previsional obligatoria (${String(liq.pct_afp_trab).replace('.',',')}%)`, m(liq.monto_afp)],
    [`Cotiz. salud obligatoria (7%)`, m(liq.monto_salud)],
    [`Seguro cesantía${liq.monto_afc_trab > 0 ? ' (0,6%)' : ' (0%, cargo empleador)'}`, m(liq.monto_afc_trab)],
    ['Impuesto único', m(liq.iusc)],
  ];
  const otros = (liq.descuentos_adicionales || []).map(d => {
    const nom = (d.tipo === 'otro' && d.observacion) ? 'Descuento: ' + esc(d.observacion) : esc(_labelDescuento(d.tipo));
    return [d.cuotas_total > 1 ? `${nom} Cuota ${d.numero_cuota || 1}/${d.cuotas_total}` : nom, m(d.monto)];
  });
  (liq.detalle_ajustes || []).forEach(a => otros.push([`Ajuste corrección ${_capitalizar(getNombreMes(a.periodo_corregido))}`, (a.monto >= 0 ? '-' : '') + m(Math.abs(a.monto))]));

  const filas = arr => arr.map(([a,b]) => `<tr><td>${a}</td><td class="lq-m">${b}</td></tr>`).join('');
  const bloque = (titulo, total, arr) => `<table class="lq-tab">
      <tr class="lq-th"><th>${titulo}</th><th class="lq-m">${total}</th></tr>${filas(arr)}</table>`;

  return `
  <style>
    .lq{-webkit-print-color-adjust:exact;print-color-adjust:exact;max-width:780px;margin:0 auto;padding:30px 36px 22px;box-sizing:border-box;background:#fff;color:#1f2937;font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;font-size:13px;line-height:1.5;}
    .lq-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;}
    .lq-top h1{font-size:21px;font-weight:400;margin:0 0 2px;color:#111827;}
    .lq-top div{font-size:13.5px;}
    .lq-folio{text-align:right;font-size:11px;color:#6b7280;}
    .lq-ficha{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px 24px;margin-bottom:16px;}
    .lq-ficha div{font-size:12.5px;} .lq-ficha b{font-weight:600;}
    .lq-cols{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:28px;align-items:start;}
    .lq-tab{width:100%;border-collapse:collapse;margin-bottom:22px;}
    .lq-th th{background:#f3f4f6;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.2px;padding:10px 10px;text-align:center;}
    .lq-th th.lq-m{text-align:right;}
    .lq-tab td{padding:9px 10px;border-bottom:1px solid #edeff2;}
    .lq-m{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;}
    .lq-vacio{color:#9ca3af;font-style:italic;}
    .lq-tot{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:4px;}
    .lq-bar{background:#f1f4fb;border:1px solid #d5dcef;text-align:center;font-weight:700;font-size:14px;padding:12px;}
    .lq-bases{display:grid;grid-template-columns:1fr 1fr 1fr;background:#f3f4f6;text-align:center;font-size:11px;font-weight:700;padding:10px;margin-top:10px;text-transform:uppercase;}
    .lq-liq{background:#f1f4fb;border:1px solid #c3cde8;text-align:center;font-weight:700;font-size:16px;padding:15px;margin-top:10px;}
    .lq-cert{margin:34px 8px 0;font-size:12.5px;}
    .lq-firma{width:250px;margin:58px 0 0 60px;border-top:1px solid #374151;text-align:center;padding-top:6px;font-size:11px;text-transform:uppercase;}
    .lq-pie{margin-top:36px;text-align:center;font-size:10px;color:#9ca3af;}
    @media print{body{margin:0;} .lq{padding:0;} .ld-no-print{display:none!important;}}
  </style>
  <div class="lq">
    <div class="lq-top">
      <div>
        <h1>Liquidación de Sueldo</h1>
        <div><b>Empleador:</b> ${esc(ep.razon_social || '—')} (${esc(ep.rut || '—')})</div>
        <div><b>Mes:</b> ${esc(nombreMes)}</div>
      </div>
      <div class="lq-folio">${liq.folio ? `Folio ${esc(liq.folio)}` : '<b style="color:#b45309;">Vista previa — no generada</b>'}</div>
    </div>

    <div class="lq-ficha">
      <div><b>Sr(a):</b> ${esc(liq.nombre)}</div>
      <div><b>Tipo Contrato:</b> ${tipoTxt}</div>
      <div><b>Previsión:</b> ${esc(afpN)} (${String(liq.pct_afp_trab ?? '—').replace('.',',')}%)</div>
      <div><b>RUT:</b> ${esc(liq.rut)}</div>
      <div><b>Inicio Contrato:</b> ${fLarga(liq.fecha_inicio_contrato)}</div>
      <div><b>Salud:</b> ${esc(liq.sistema_salud || 'Fonasa')}</div>
      <div><b>Cargo:</b> ${esc(cont.funcion_cargo || t.funcion_cargo || '—')}</div>
      <div><b>Días Trabajados:</b> ${diasTrab} días</div>
      <div><b>UF:</b> ${ind?.uf ? '$ ' + ind.uf.toLocaleString('es-CL',{minimumFractionDigits:2}) : '—'}</div>
    </div>
    <div style="font-size:12.5px;"><b>Sueldo Base:</b> ${m(liq.sueldo_base)}${cont.horas_semanales ? ` &nbsp;·&nbsp; <b>Jornada:</b> ${cont.horas_semanales} horas semanales` : ''}</div>

    <div class="lq-cols">
      <div>
        ${bloque('Haberes imponibles', m(liq.total_haberes_imponibles), habImp)}
        ${bloque('Haberes no imponibles', m(liq.total_haberes_no_imponibles), habNoImp)}
      </div>
      <div>
        ${bloque('Descuentos legales', m((liq.total_prev_trab || 0) + (liq.iusc || 0)), descLeg)}
        ${bloque('Otros descuentos', m(liq.total_desc_adicionales || 0), otros)}
      </div>
    </div>

    <div class="lq-tot">
      <div class="lq-bar">TOTAL HABERES ${m(liq.total_haberes)}</div>
      <div class="lq-bar">TOTAL DESCUENTOS ${m(liq.total_descuentos)}</div>
    </div>
    <div class="lq-bases">
      <div>Imp. Prev./Salud: ${m(liq.base_afp)}</div><div>Imp. Cesantía: ${m(liq.base_afc)}</div><div>Base Tributable: ${m(liq.base_iusc)}</div>
    </div>
    <div class="lq-liq">LÍQUIDO A RECIBIR: ${m(liq.liquido)}</div>

    <div class="lq-cert">Certifico que he recibido de ${esc(ep.razon_social || 'mi empleador')} (${esc(ep.rut || '—')}) el monto líquido indicado en la presente liquidación.</div>
    <div class="lq-firma">Firma conforme</div>
    <div class="lq-pie">Generado con AgroContratista</div>
  </div>`;
}

/* ── IMPRIMIR / GUARDAR PDF ─────────────────────────────── */
function imprimirLiquidacion(rut, periodo){
  const liq = liquidaciones_guardadas.find(l => l.rut === rut && l.periodo === periodo);
  if(!liq){ toast('⚠️ Liquidación no encontrada', 'error'); return; }

  const ventana = window.open('', '_blank', 'width=900,height=700');
  ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"><title>Liquidación ${liq.nombre} ${liq.periodo}</title>
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
