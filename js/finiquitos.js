/* ════════════════════════════════════════════════════════
   FINIQUITOS.JS — Documento de finiquito
   Causales cubiertas (las más comunes en faenas agrícolas):
   · Art. 159 N°1 — Mutuo acuerdo de las partes
   · Art. 159 N°2 — Renuncia del trabajador
   · Art. 159 N°4 — Vencimiento del plazo del contrato
   · Art. 161    — Necesidades de la empresa
   Indemnizaciones (solo aplican a Art. 161):
   · Art. 162 — Sustitutiva del aviso previo (si no se avisó
     con 30 días de anticipación)
   · Art. 163 — Por años de servicio (tope 11 años, base
     tope 90 UF)
   AgroContratista · Versión 1.0
   ⚠️ Este módulo cubre los casos más frecuentes. Casos con
   causales del Art. 160, fuero, o pactos especiales deben
   revisarse con un abogado laboral antes de firmar.
   ════════════════════════════════════════════════════════ */

const LOCAL_FINIQUITOS = 'agro_finiquitos';
let finiquitos_guardados = [];

/* ✅ Paso 2 (auditoría Finiquitos, 29-10-2026) — causales para
   contratistas pymes, acordadas con el usuario. Se agregan Art. 159 N°5
   (conclusión de la obra o faena, muy usada en contratos por faena) y
   Art. 160 (despido disciplinario, sin indemnizaciones; exige describir
   los hechos). `carta`: requiere carta de aviso del Art. 162 (3 días
   hábiles desde la separación, copia a la Inspección del Trabajo).
   Quedan fuera por uso muy raro: 159 N°3 (muerte), 159 N°6 (caso
   fortuito) y desahucio (161 inc. 2, solo gerentes y casa particular). */
const CAUSALES_FINIQUITO = {
  mutuo_acuerdo:       { label: 'Mutuo acuerdo de las partes',     articulo: 'Art. 159 N°1 CT', indemniza: false, carta: false },
  renuncia:            { label: 'Renuncia voluntaria',             articulo: 'Art. 159 N°2 CT', indemniza: false, carta: false },
  vencimiento_plazo:   { label: 'Vencimiento del plazo convenido', articulo: 'Art. 159 N°4 CT', indemniza: false, carta: true },
  conclusion_obra:     { label: 'Conclusión del trabajo o servicio que dio origen al contrato', articulo: 'Art. 159 N°5 CT', indemniza: false, carta: true },
  art160_1:            { label: 'Conductas indebidas de carácter grave, debidamente comprobadas', articulo: 'Art. 160 N°1 CT', indemniza: false, carta: true, requiereHechos: true, requiereLetra: true },
  art160_3:            { label: 'No concurrencia a sus labores sin causa justificada', articulo: 'Art. 160 N°3 CT', indemniza: false, carta: true, requiereHechos: true },
  art160_4:            { label: 'Abandono del trabajo', articulo: 'Art. 160 N°4 CT', indemniza: false, carta: true, requiereHechos: true },
  art160_7:            { label: 'Incumplimiento grave de las obligaciones que impone el contrato', articulo: 'Art. 160 N°7 CT', indemniza: false, carta: true, requiereHechos: true },
  necesidades_empresa: { label: 'Necesidades de la empresa',       articulo: 'Art. 161 CT',     indemniza: true,  carta: true },
};

const LETRAS_160_1 = {
  a: 'Falta de probidad del trabajador en el desempeño de sus funciones',
  b: 'Conductas de acoso sexual',
  c: 'Vías de hecho ejercidas por el trabajador en contra del empleador o de cualquier trabajador que se desempeñe en la misma empresa',
  d: 'Injurias proferidas por el trabajador al empleador',
  e: 'Conducta inmoral del trabajador que afecte a la empresa donde se desempeña',
  f: 'Conductas de acoso laboral',
};

const DIAS_AVISO_PREVIO = 30; // Art. 161 inc. 1 / 162 inc. 4

/* Muestra u oculta los campos propios de cada causal (Art. 160). */
function onCambioCausalFiniquito(){
  const c = CAUSALES_FINIQUITO[document.getElementById('fin-causal')?.value] || {};
  const gH = document.getElementById('fin-grupo-hechos');
  const gL = document.getElementById('fin-grupo-letra160');
  if(gH) gH.style.display = c.requiereHechos ? '' : 'none';
  if(gL) gL.style.display = c.requiereLetra ? '' : 'none';
  // ✅ Paso 3 — aporte AFC del empleador (solo Art. 161)
  const gA = document.getElementById('fin-grupo-afc');
  if(gA) gA.style.display = c.indemniza ? '' : 'none';
  const sug = document.getElementById('fin-afc-sugerencia');
  const rut = document.getElementById('fin-sel-trabajador')?.value;
  const fecha = document.getElementById('fin-fecha-termino')?.value;
  if(sug && c.indemniza && rut && fecha){
    const est = _estimarAporteAFCEmpleador(rut, fecha);
    sug.textContent = `Art. 13 Ley 19.728: se descuenta de la indemnización por años de servicio. Estimación según liquidaciones guardadas: $${est.toLocaleString('es-CL')} (sin rentabilidad — usa el monto del certificado de la AFC). Vacío = no se descuenta.`;
  }
}

/* ✅ Paso 3 — Estimación del aporte del empleador a la cuenta individual
   de cesantía durante el contrato vigente, con las liquidaciones
   guardadas: del 2,4% (indefinido) van 1,6 puntos a la cuenta individual;
   del 3% (plazo fijo / obra), 2,8; con más de 11 años (0,8%), 0. No
   incluye rentabilidad: el monto real está en el certificado de la AFC. */
function _estimarAporteAFCEmpleador(rut, fechaTermino){
  const c = _getContratoVigente(rut, fechaTermino.slice(0,7));
  const desde = (c?.fecha_inicio || '').slice(0,7);
  return Math.round((typeof liquidaciones_guardadas !== 'undefined' ? liquidaciones_guardadas : [])
    .filter(l => l.rut === rut && (!desde || l.periodo >= desde) && l.periodo <= fechaTermino.slice(0,7))
    .reduce((s,l) => {
      const base = l.base_afc || 0, emp = l.monto_afc_emp || 0;
      if(!base || !emp) return s;
      const pct = emp / base * 100;
      const cuenta = pct > 2.7 ? 2.8 : pct > 1.2 ? 1.6 : 0;
      return s + base * cuenta / 100;
    }, 0));
}

/* Días corridos entre dos fechas ISO (b − a), sin zona horaria. */
function _diasEntreISO(a, b){
  const u = f => Date.UTC(+f.slice(0,4), +f.slice(5,7)-1, +f.slice(8,10));
  return Math.round((u(b) - u(a)) / 86400000);
}

/* Lee y valida el formulario. Devuelve los datos o null (con toast). */
function _leerFormularioFiniquito(){
  const rut       = document.getElementById('fin-sel-trabajador')?.value;
  const fecha     = document.getElementById('fin-fecha-termino')?.value;
  const causal    = document.getElementById('fin-causal')?.value;
  const fechaAviso= document.getElementById('fin-fecha-aviso')?.value || '';
  const hechos    = (document.getElementById('fin-hechos')?.value || '').trim();
  const letra     = document.getElementById('fin-letra160')?.value || '';
  const afc_cuenta = document.getElementById('fin-afc-cuenta')?.value || '';

  if(!rut)    { toast('⚠️ Selecciona un trabajador', 'error'); return null; }
  if(!fecha)  { toast('⚠️ Ingresa la fecha de término', 'error'); return null; }
  if(!causal) { toast('⚠️ Selecciona la causal de término', 'error'); return null; }
  const ci = CAUSALES_FINIQUITO[causal] || {};
  if(ci.requiereLetra && !letra){ toast('⚠️ Indica cuál conducta del Art. 160 N°1 se invoca', 'error'); return null; }
  if(ci.requiereHechos && hechos.length < 20){
    toast('⚠️ Describe los hechos en que se funda el despido (con fechas). Sin hechos concretos en la carta, el despido puede declararse injustificado', 'error');
    return null;
  }
  return { rut, fecha, causal, fechaAviso, hechos, letra, afc_cuenta: ci.indemniza ? afc_cuenta : '' };
}

const TOPE_ANIOS_INDEMNIZACION = 11;
const TOPE_UF_INDEMNIZACION    = 90;

/* ── CARGA / GUARDADO ───────────────────────────────────── */
function cargarFiniquitos(){
  try{ finiquitos_guardados = JSON.parse(localStorage.getItem(LOCAL_FINIQUITOS)) || []; }
  catch{ finiquitos_guardados = []; }
}
function guardarFiniquitos(){
  localStorage.setItem(LOCAL_FINIQUITOS, JSON.stringify(finiquitos_guardados));
}

/* ── INIT ───────────────────────────────────────────────── */
function initFiniquitos(){
  cargarFiniquitos();
  cargarGestionLaboral();
  cargarIndicadores();
  cargarVacacionesExtra();
  _poblarSelectTrabajadorFiniquito();
  renderListaFiniquitos();
}

function _poblarSelectTrabajadorFiniquito(){
  const sel = document.getElementById('fin-sel-trabajador');
  if(!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar trabajador —</option>'
    + trabajadores.filter(t => t.estado === 'activo')
      .map(t => `<option value="${t.rut}">${t.nombre} · ${t.rut}</option>`).join('');
  if(val) sel.value = val;
}

/* ════════════════════════════════════════════════════════
   MOTOR DE CÁLCULO
   ════════════════════════════════════════════════════════ */
/* `aviso`: fecha ISO en que se avisó al trabajador ('' si no hubo), o
   un booleano (formato antiguo: true = se avisó con 30 días). */
function calcularFiniquito(rut, fechaTermino, causal, aviso, extra = {}){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return { error: `Trabajador ${rut} no encontrado` };

  const causalInfo = CAUSALES_FINIQUITO[causal];
  if(!causalInfo) return { error: `Causal "${causal}" no reconocida` };

  const periodo = fechaTermino.slice(0,7);
  const ind = getIndicadoresPorPeriodo(periodo);
  if(!ind) return { error: `Sin indicadores previsionales para ${getNombreMes(periodo)} — regístralos primero` };

  const contrato = _getContratoVigente(rut, periodo);
  if(!contrato) return { error: `Sin contrato vigente para ${rut}` };

  const fechaIngreso = contrato.fecha_inicio || t.fecha_ingreso;
  // ✅ F2 (paso 3) — antigüedad con meses y días, contando el día de
  // término (antes: 01-01-2025 → 31-12-2025 = 11 meses; ahora 12).
  const ant = _antiguedadFeriado(fechaIngreso, fechaTermino);
  const antiguedadMeses = ant.meses;
  const antiguedadAnios = antiguedadMeses / 12;

  // ── 1. Remuneración del último mes ──
  // ✅ F1 + F7 (auditoría Finiquitos, 29-10-2026) — antes el finiquito
  // pagaba valor día × día del mes de término: sin descontar AFP, salud
  // ni AFC, sin faltas ni bonos, con errores (término el 31 → 31 días;
  // ingreso el 15 → mes completo) y además la liquidación del mes volvía
  // a pagar ese sueldo. Ahora (opción A, igual que Buk) los días
  // trabajados del último mes se pagan en la LIQUIDACIÓN de ese período,
  // que los prorratea hasta la fecha de término (H3) y los informa a
  // PreviRed y al Libro. El finiquito solo la referencia.
  const sueldoInfo = _getSueldoBase(rut, periodo);
  const sueldo_base = sueldoInfo?.monto || parseFloat(contrato.sueldo_monto) || 0;
  const valor_dia = Math.round(sueldo_base / DIVISOR_MES);
  const diaTermino = +fechaTermino.slice(8,10);
  const dias_ultimo_mes = _diasContratoEnMes({ ...contrato, fecha_termino: fechaTermino }, periodo);
  const liqUltimoMes = (typeof liquidaciones_guardadas !== 'undefined' ? liquidaciones_guardadas : [])
    .find(l => l.rut === rut && l.periodo === periodo);
  const liquidacion_ultimo_mes = liqUltimoMes
    ? { periodo, folio: liqUltimoMes.folio || '', liquido: liqUltimoMes.liquido || 0,
        dias: Math.max(0, DIVISOR_MES - (liqUltimoMes.dias_a_descontar||0)),
        prorrateada: (liqUltimoMes.dias_contrato_mes ?? DIVISOR_MES) === dias_ultimo_mes }
    : null;
  const sueldo_pendiente = 0; // se paga en la liquidación del mes

  // ── 2. Vacaciones proporcionales (reutiliza vacaciones.js) ──
  const vac = calcularSaldoVacaciones(rut, fechaTermino);
  const monto_vacaciones = vac.error ? 0 : Math.max(0, vac.monto_saldo_pendiente);

  // ── 3. Indemnización sustitutiva de aviso previo (Art. 162) ──
  // Solo aplica en necesidades de la empresa, y solo si NO se avisó con 30 días de anticipación.
  // ✅ Paso 2 — se calcula desde la fecha de aviso (antes, una casilla).
  const fecha_aviso = typeof aviso === 'string' ? aviso : '';
  const dias_anticipacion_aviso = fecha_aviso ? _diasEntreISO(fecha_aviso, fechaTermino) : null;
  const avisoPrevioDado = typeof aviso === 'boolean' ? aviso
    : (dias_anticipacion_aviso != null && dias_anticipacion_aviso >= DIAS_AVISO_PREVIO);
  // ✅ F3 (paso 3) — base del Art. 172 ("última remuneración mensual"):
  // sueldo + promedio de los últimos 3 meses calendario de bonos y
  // demás haberes, incluidas colación y movilización mensuales
  // (Dictamen DT 4466/308; CS unificación Rol 32.609-2014). Se excluyen
  // horas extra, asignación familiar, viático y beneficios esporádicos.
  // Meses con licencia o permiso sin goce se saltan. Tope 90 UF. Antes
  // era solo el sueldo base.
  const var172 = _promedioVariablesArt71(rut, fechaTermino, fechaIngreso, { incluirAsignaciones: ['colacion','movilizacion'] });
  const remuneracion_art172 = sueldo_base + var172.promedio;
  const base_indemnizacion = Math.round(Math.min(remuneracion_art172, ind.uf * TOPE_UF_INDEMNIZACION));
  const base_con_tope = remuneracion_art172 > ind.uf * TOPE_UF_INDEMNIZACION;

  let monto_aviso_previo = 0;
  if(causalInfo.indemniza && !avisoPrevioDado){
    monto_aviso_previo = base_indemnizacion;
  }

  // ── 4. Indemnización por años de servicio (Art. 163) ──
  // 1 mes de remuneración por año y fracción superior a 6 meses, tope 11 años
  let monto_anios_servicio = 0;
  let anios_indemnizables = 0;
  // ✅ F2 (paso 3) — solo si el contrato duró 1 año o más (antes, con 7
  // meses pagaba 1 año). "Fracción superior a seis meses" cuenta los
  // días: 6 meses y 1 día ya es superior (antes 1 año, 6 meses y 15
  // días pagaba 1 año en vez de 2).
  if(causalInfo.indemniza && antiguedadMeses >= 12){
    const aniosCompletos  = Math.floor(antiguedadMeses / 12);
    const mesesResto      = antiguedadMeses - (aniosCompletos * 12);
    const fraccionMayor6  = mesesResto > 6 || (mesesResto === 6 && ant.dias > 0);
    anios_indemnizables   = Math.min(TOPE_ANIOS_INDEMNIZACION, aniosCompletos + (fraccionMayor6 ? 1 : 0));
    monto_anios_servicio  = Math.round(base_indemnizacion * anios_indemnizables);
  }

  // ✅ Paso 3 — Art. 13 Ley 19.728: en la causal Art. 161 se imputa a la
  // indemnización por años de servicio el aporte del empleador a la
  // cuenta individual de cesantía (+ rentabilidad), según certificado de
  // la AFC. Nunca más que la propia indemnización.
  const aporte_afc_informado = Math.max(0, Math.round(parseFloat(extra.afc_cuenta) || 0));
  const descuento_afc = monto_anios_servicio > 0 ? Math.min(aporte_afc_informado, monto_anios_servicio) : 0;

  // ── 5. Descuentos pendientes ──
  // ✅ F1 — los descuentos del mes de término ya se aplican en la
  // liquidación de ese mes (antes se descontaban dos veces). En el
  // finiquito van las cuotas de meses POSTERIORES al término (saldo de
  // préstamos — F4).
  const descuentos_pendientes = (descuentos || []).filter(d => d.trabajador_rut === rut && d.periodo > periodo);
  const total_descuentos = descuentos_pendientes.reduce((s,d) => s + (parseFloat(d.monto)||0), 0);

  const total_haberes = sueldo_pendiente + monto_vacaciones + monto_aviso_previo + monto_anios_servicio;
  const total_a_pagar = Math.max(0, total_haberes - descuento_afc - total_descuentos);

  return {
    rut, nombre: t.nombre,
    fecha_ingreso: fechaIngreso,
    fecha_termino: fechaTermino,
    causal, causal_label: causalInfo.label, causal_articulo: causalInfo.articulo,
    causal_letra: extra.letra || '',
    causal_letra_texto: extra.letra ? (LETRAS_160_1[extra.letra] || '') : '',
    hechos: extra.hechos || '',
    requiere_carta: !!causalInfo.carta,
    fecha_aviso,
    dias_anticipacion_aviso,
    aviso_previo_dado: !!avisoPrevioDado,
    antiguedad_anios: +antiguedadAnios.toFixed(2),
    antiguedad_meses: antiguedadMeses,

    sueldo_base, valor_dia, dia_termino: diaTermino,
    sueldo_pendiente,
    dias_ultimo_mes,
    liquidacion_ultimo_mes,

    dias_vacaciones_saldo: vac.error ? 0 : vac.dias_saldo,
    dias_vacaciones_corridos: vac.error ? 0 : (vac.dias_corridos_pago || 0), // ✅ V5
    monto_vacaciones,

    antiguedad_dias_fraccion: ant.dias,
    anios_indemnizables,
    tope_uf_aplicado: TOPE_UF_INDEMNIZACION,
    remuneracion_art172,
    promedio_variables_art172: var172.promedio,
    meses_promedio_art172: var172.meses,
    base_indemnizacion,
    base_con_tope,
    descuento_afc,
    monto_aviso_previo,
    monto_anios_servicio,

    descuentos_pendientes,
    total_descuentos,

    total_haberes,
    total_a_pagar,
  };
}

/* ── VISTA PREVIA ───────────────────────────────────────── */
function previsualizarFiniquito(){
  const f = _leerFormularioFiniquito();
  if(!f) return;
  const { rut, fecha, causal } = f;

  const fin = calcularFiniquito(rut, fecha, causal, f.fechaAviso, f);
  if(fin.error){ toast(`❌ ${fin.error}`, 'error'); return; }

  _mostrarModalFiniquito(fin, false);
}

/* ── GENERAR Y GUARDAR ──────────────────────────────────── */
function generarFiniquito(){
  const f = _leerFormularioFiniquito();
  if(!f) return;
  const { rut, fecha, causal } = f;

  if(typeof _bloqueaPorMesCerrado === 'function' && _bloqueaPorMesCerrado(rut, fecha)) return;

  const fin = calcularFiniquito(rut, fecha, causal, f.fechaAviso, f);
  if(fin.error){ toast(`❌ ${fin.error}`, 'error'); return; }

  // ✅ F7 — la liquidación del mes de término debe pagar solo hasta esa
  // fecha: se registra en el contrato (antes quedaba sin fecha de
  // término y la liquidación pagaba el mes completo). Se guarda la fecha
  // anterior por trazabilidad.
  const cto = _getContratoVigente(rut, fecha.slice(0,7));
  if(cto && cto.fecha_termino !== fecha){
    fin.contrato_id = cto.id;
    fin.fecha_termino_contrato_anterior = cto.fecha_termino || null;
    cto.fecha_termino = fecha;
    if(typeof guardarContratos === 'function') guardarContratos();
  }

  fin.folio = 'FIN-' + Date.now().toString().slice(-8);
  fin.fecha_emision = hoyISO();
  fin.estado = 'generado'; // generado → ratificado

  const idx = finiquitos_guardados.findIndex(f => f.rut === rut && f.fecha_termino === fecha);
  if(idx >= 0) finiquitos_guardados[idx] = fin;
  else finiquitos_guardados.push(fin);
  guardarFiniquitos();

  registrarDocumentoCarpeta({
    trabajador_rut: rut,
    empresa_propia_id: trabajadores.find(x => x.rut === rut)?.empresa_propia_id || '',
    tipo: 'finiquito',
    subtipo: causal,
    folio: fin.folio,
    fecha_firma: fecha,
    descripcion: `Finiquito — ${fin.causal_label} — Total $${fin.total_a_pagar.toLocaleString('es-CL')}`,
  });

  toast(`✅ Finiquito generado — Folio ${fin.folio}`, 'exito');
  if(!fin.liquidacion_ultimo_mes){
    toast(`⚠️ Falta generar la liquidación de ${getNombreMes(fecha.slice(0,7))} de ${fin.nombre} (paga ${fin.dias_ultimo_mes} día${fin.dias_ultimo_mes!==1?'s':''} hasta el término)`, 'error');
  } else if(!fin.liquidacion_ultimo_mes.prorrateada){
    toast(`⚠️ La liquidación de ${getNombreMes(fecha.slice(0,7))} de ${fin.nombre} se generó antes del finiquito — recalcúlala para que pague solo hasta el término`, 'error');
  }
  renderListaFiniquitos();
  _mostrarModalFiniquito(fin, true);
}

/* ── MARCAR COMO RATIFICADO (ante Notaría / Inspección del Trabajo) ── */
function marcarFiniquitoRatificado(folio){
  const f = finiquitos_guardados.find(x => x.folio === folio);
  if(!f) return;
  if(!confirm(`¿Confirmas que el finiquito de ${f.nombre} fue ratificado ante ministro de fe?`)) return;
  f.estado = 'ratificado';
  f.fecha_ratificacion = hoyISO();
  guardarFiniquitos();

  // ✅ NUEVO — hasta ahora nada marcaba al trabajador como inactivo al
  // ratificar su finiquito, quedaba 'activo' para siempre en el
  // sistema. Esto es lo que permite detectar un reingreso más adelante.
  const t = trabajadores.find(x => x.rut === f.rut);
  if(t){ t.estado = 'inactivo'; guardarLocal(); }

  renderListaFiniquitos();
  toast('✅ Finiquito marcado como ratificado', 'exito');
}

/* ── LISTA DE FINIQUITOS ─────────────────────────────────── */
function renderListaFiniquitos(){
  const tbody = document.getElementById('tbody-finiquitos');
  if(!tbody) return;

  if(!finiquitos_guardados.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--texto3);">
      Sin finiquitos generados</td></tr>`;
    return;
  }

  const ordenados = [...finiquitos_guardados].sort((a,b) => new Date(b.fecha_termino) - new Date(a.fecha_termino));
  tbody.innerHTML = ordenados.map(f => `<tr id="fila-finiquito-${f.folio}">
    <td style="font-size:12px;">${f.folio}</td>
    <td style="font-size:13px;font-weight:500;">${f.nombre}</td>
    <td style="font-size:12px;">${fmtFecha(f.fecha_termino)}</td>
    <td style="font-size:12px;">${f.causal_label}</td>
    <td style="font-size:12px;text-align:right;font-weight:600;">$${f.total_a_pagar.toLocaleString('es-CL')}</td>
    <td>
      <span class="badge ${f.estado==='ratificado'?'badge-verde':'badge-amarillo'}">
        ${f.estado==='ratificado' ? '✅ Ratificado' : '⏳ Pendiente ratificar'}
      </span>
    </td>
    <td style="display:flex;gap:5px;">
      <button class="btn btn-secondary btn-sm" onclick="imprimirFiniquito('${f.folio}')" title="Imprimir"><i class="ti ti-printer"></i></button>
      ${f.estado!=='ratificado' ? `<button class="btn btn-primary btn-sm" onclick="marcarFiniquitoRatificado('${f.folio}')" title="Marcar ratificado"><i class="ti ti-check"></i></button>` : ''}
    </td>
  </tr>`).join('');
}

/* ════════════════════════════════════════════════════════
   DOCUMENTO IMPRIMIBLE
   ════════════════════════════════════════════════════════ */
function _generarHTMLFiniquito(fin){
  const t  = trabajadores.find(x => x.rut === fin.rut);
  const ep = getEmpresaEmpleadora(t?.empresa_propia_id);
  const fmtM = v => '$' + Math.round(v||0).toLocaleString('es-CL');

  return `
  <style>
    .fq-wrap{max-width:760px;margin:0 auto;background:#fff;font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;}
    .fq-header{background:#0f2942;color:#fff;padding:18px 24px;border-radius:10px 10px 0 0;}
    .fq-body{padding:22px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;}
    .fq-titulo{font-size:17px;font-weight:700;margin-bottom:4px;}
    .fq-sub{font-size:12px;color:#94a3b8;}
    p{font-size:13px;line-height:1.7;text-align:justify;}
    table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;}
    td{padding:6px 8px;border-bottom:1px solid #f1f5f9;}
    td:last-child{text-align:right;font-weight:500;}
    .fq-total{background:#0f2942;color:#fff;font-weight:700;font-size:15px;}
    .fq-firmas{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:50px;}
    .fq-firma{text-align:center;border-top:1px dashed #cbd5e1;padding-top:8px;font-size:11px;color:#475569;}
    @media print{.fq-no-print{display:none;}}
  </style>
  <div class="fq-wrap">
    <div class="fq-header">
      <div class="fq-titulo">Finiquito de Contrato de Trabajo</div>
      <div class="fq-sub">Folio ${fin.folio||'(borrador)'} · ${fin.causal_articulo}</div>
    </div>
    <div class="fq-body">
      <p>En ${ep?.ciudad||'—'}, a ${fmtFecha(fin.fecha_emision||fin.fecha_termino)}, entre
      <strong>${ep?.razon_social||ep?.nombre||'—'}</strong>, RUT ${ep?.rut||'—'}, representada por
      ${ep?.representante||ep?.nombre_representante||'—'}, en adelante "el empleador", y don(ña)
      <strong>${fin.nombre}</strong>, RUT ${fin.rut}, en adelante "el trabajador", se deja constancia
      del finiquito del contrato de trabajo celebrado entre ambas partes con fecha ${fmtFecha(fin.fecha_ingreso)},
      cuya causal de término es <strong>${fin.causal_label}${fin.causal_letra ? `, letra ${fin.causal_letra}) ${fin.causal_letra_texto}` : ''}</strong> (${fin.causal_articulo}), con
      fecha de término ${fmtFecha(fin.fecha_termino)}.</p>
      ${fin.hechos ? `<p><strong>Hechos en que se funda:</strong> ${String(fin.hechos).replace(/</g,'&lt;')}</p>` : ''}

      <table>
        ${fin.sueldo_pendiente > 0 ? `<tr><td>Remuneración pendiente del mes (${fin.dia_termino} día${fin.dia_termino>1?'s':''} trabajados)</td><td>${fmtM(fin.sueldo_pendiente)}</td></tr>` : ''}
        <tr><td>Feriado proporcional — ${fin.dias_vacaciones_saldo} días hábiles pendientes${fin.dias_vacaciones_corridos ? ` (${fin.dias_vacaciones_corridos} días a pagar, Art. 73)` : ''}</td><td>${fmtM(fin.monto_vacaciones)}</td></tr>
        ${fin.monto_aviso_previo > 0 ? `<tr><td>Indemnización sustitutiva del aviso previo (Art. 162 CT)${fin.base_indemnizacion ? ` — base ${fmtM(fin.base_indemnizacion)}${fin.base_con_tope ? ' (tope 90 UF)' : ''}` : ''}</td><td>${fmtM(fin.monto_aviso_previo)}</td></tr>` : ''}
        ${fin.monto_anios_servicio > 0 ? `<tr><td>Indemnización por años de servicio — ${fin.anios_indemnizables} año${fin.anios_indemnizables!==1?'s':''} × ${fmtM(fin.base_indemnizacion || (fin.monto_anios_servicio/fin.anios_indemnizables))} (Art. 163 CT, tope ${fin.tope_uf_aplicado} UF)</td><td>${fmtM(fin.monto_anios_servicio)}</td></tr>` : ''}
        ${fin.descuento_afc > 0 ? `<tr><td>Menos aporte del empleador al Seguro de Cesantía (Art. 13 Ley 19.728)</td><td>-${fmtM(fin.descuento_afc)}</td></tr>` : ''}
        ${fin.total_descuentos > 0 ? `<tr><td>Descuentos pendientes (anticipos / préstamos)</td><td>-${fmtM(fin.total_descuentos)}</td></tr>` : ''}
        <tr class="fq-total"><td>Total líquido a pagar</td><td>${fmtM(fin.total_a_pagar)}</td></tr>
      </table>

      ${fin.sueldo_pendiente ? '' : `<p style="font-size:12px;">La remuneración de ${getNombreMes(fin.fecha_termino.slice(0,7))}${fin.dias_ultimo_mes != null ? ` (${fin.dias_ultimo_mes} día${fin.dias_ultimo_mes!==1?'s':''})` : ''} se paga en la liquidación de sueldo de ese período${fin.liquidacion_ultimo_mes ? `, folio ${fin.liquidacion_ultimo_mes.folio}, por un líquido de ${fmtM(fin.liquidacion_ultimo_mes.liquido)}` : ''}, con sus cotizaciones previsionales.</p>`}

      <p>El trabajador declara recibir en este acto, a su entera satisfacción, la suma antes indicada,
      no teniendo cargo ni cobro alguno pendiente en contra del empleador por concepto de remuneraciones,
      feriados, indemnizaciones, o cualquier otra prestación derivada de la relación laboral o de su
      término, dando en consecuencia el más amplio y total finiquito.</p>

      ${fin.causal === 'necesidades_empresa' ? `<p style="font-size:11px;color:#94a3b8;">Este finiquito debe ser ratificado ante notario público, inspector del trabajo, o
      ministro de fe autorizado, conforme al Art. 177 CT, para que produzca pleno efecto liberatorio.</p>` : ''}

      <div class="fq-firmas">
        <div class="fq-firma">Firma empleador<br><strong>${ep?.razon_social||ep?.nombre||'—'}</strong></div>
        <div class="fq-firma">Firma trabajador<br><strong>${fin.nombre}</strong><br>RUT ${fin.rut}</div>
      </div>
    </div>
  </div>`;
}

function _mostrarModalFiniquito(fin, guardado){
  const html = _generarHTMLFiniquito(fin);
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Finiquito ${fin.nombre}</title></head><body style="margin:20px;">
    ${html}
    ${guardado ? '<script>setTimeout(()=>window.print(),700);<\/script>' : ''}
  </body></html>`);
  win.document.close();
}

function imprimirFiniquito(folio){
  const fin = finiquitos_guardados.find(f => f.folio === folio);
  if(!fin){ toast('⚠️ Finiquito no encontrado', 'error'); return; }
  _mostrarModalFiniquito(fin, true);
}
