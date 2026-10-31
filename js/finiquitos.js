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
  necesidades_empresa: { label: 'Necesidades de la empresa',       articulo: 'Art. 161 CT',     indemniza: true,  carta: true, requiereHechos: true },
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

/* ✅ Paso 5 — Al elegir al trabajador: si su contrato es a PLAZO FIJO y
   tiene fecha de término, se proponen esa fecha, la causal "Vencimiento
   del plazo" (Art. 159 N°4) y la fecha de aviso = término (todo
   editable). Solo plazo fijo, por decisión del usuario: un contrato de
   temporada puede terminar antes o después de la fecha estimada. Lo
   propuesto se marca (data-auto) para limpiarlo si se cambia a otro
   trabajador; lo que el usuario escribió no se toca. */
function onCambioTrabajadorFiniquito(){
  const rut = document.getElementById('fin-sel-trabajador')?.value;
  const elF = document.getElementById('fin-fecha-termino');
  const elC = document.getElementById('fin-causal');
  const elA = document.getElementById('fin-fecha-aviso');
  [elF, elC, elA].forEach(el => { if(el && el.dataset.auto === '1'){ el.value = ''; delete el.dataset.auto; } });
  const c = rut ? _getContratoVigente(rut, hoyISO().slice(0,7)) : null;
  const tipo = (c?.tipo_contrato || c?.tipo || '').toLowerCase();
  if(c && /plazo/.test(tipo) && c.fecha_termino){
    const ter = c.fecha_termino.slice(0,10);
    if(elF && !elF.value){ elF.value = ter; elF.dataset.auto = '1'; }
    if(elC && !elC.value){ elC.value = 'vencimiento_plazo'; elC.dataset.auto = '1'; }
    if(elA && !elA.value){ elA.value = ter; elA.dataset.auto = '1'; }
  }
  onCambioCausalFiniquito();
}

/* Muestra u oculta los campos propios de cada causal (Art. 160). */
function onCambioCausalFiniquito(){
  const c = CAUSALES_FINIQUITO[document.getElementById('fin-causal')?.value] || {};
  const gH = document.getElementById('fin-grupo-hechos');
  const gL = document.getElementById('fin-grupo-letra160');
  if(gH) gH.style.display = c.carta ? '' : 'none';
  const lH = document.getElementById('fin-label-hechos');
  if(lH) lH.textContent = c.requiereHechos ? 'Hechos en que se funda el término (obligatorio)' : 'Hechos en que se funda el término (opcional — si se deja vacío, la carta usa un texto estándar)';
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
  const alimentos  = document.getElementById('fin-alimentos')?.value || '';
  const alimentos_consultado = !!document.getElementById('fin-alimentos-consultado')?.checked;
  const forma_pago = document.getElementById('fin-forma-pago')?.value || '';

  if(!rut)    { toast('⚠️ Selecciona un trabajador', 'error'); return null; }
  if(!fecha)  { toast('⚠️ Ingresa la fecha de término', 'error'); return null; }
  if(!causal) { toast('⚠️ Selecciona la causal de término', 'error'); return null; }
  const ci = CAUSALES_FINIQUITO[causal] || {};
  if(ci.requiereLetra && !letra){ toast('⚠️ Indica cuál conducta del Art. 160 N°1 se invoca', 'error'); return null; }
  if(ci.requiereHechos && hechos.length < 20){
    toast('⚠️ Describe los hechos en que se funda el término (con fechas y datos concretos). La carta del Art. 162 debe indicarlos; sin ellos, el despido puede declararse injustificado', 'error');
    return null;
  }
  if(parseFloat(alimentos) < 0){ toast('⚠️ La retención por pensión de alimentos no puede ser negativa', 'error'); return null; }
  return { rut, fecha, causal, fechaAviso, hechos: ci.carta ? hechos : '', letra: ci.requiereLetra ? letra : '', afc_cuenta: ci.indemniza ? afc_cuenta : '', alimentos, alimentos_consultado, forma_pago };
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
  // ✅ F6 (paso 4) — antes se aceptaba un término anterior al inicio.
  if(fechaIngreso && fechaTermino < fechaIngreso.slice(0,10))
    return { error: `La fecha de término (${fmtFecha(fechaTermino)}) es anterior al inicio del contrato (${fmtFecha(fechaIngreso)})` };
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
  // ✅ Paso 4 — retención por pensión de alimentos (Ley 21.389). Se
  // retiene del finiquito y se paga en la cuenta que ordenó el tribunal.
  const retencion_alimentos = Math.max(0, Math.round(parseFloat(extra.alimentos) || 0));
  // ✅ F5 (paso 4) — si los descuentos superan lo que hay para pagar, el
  // total queda en $0 y la diferencia se informa (antes se perdía sin
  // aviso). Orden: AFC (rebaja la indemnización), alimentos (obligación
  // legal, prioridad) y luego préstamos/anticipos.
  const disponible = Math.max(0, total_haberes - descuento_afc);
  const alimentos_aplicado = Math.min(retencion_alimentos, disponible);
  const descuentos_aplicados = Math.min(total_descuentos, disponible - alimentos_aplicado);
  const saldo_descuentos_no_cubierto = total_descuentos - descuentos_aplicados;
  const alimentos_no_cubierto = retencion_alimentos - alimentos_aplicado;
  const total_a_pagar = Math.max(0, disponible - alimentos_aplicado - descuentos_aplicados);

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
    descuentos_aplicados,
    saldo_descuentos_no_cubierto,
    retencion_alimentos,
    alimentos_aplicado,
    alimentos_no_cubierto,
    alimentos_consultado: !!extra.alimentos_consultado,
    forma_pago: extra.forma_pago || '',
    tipo_contrato: contrato.tipo_contrato || contrato.tipo || '',
    contrato_fecha_termino: contrato.fecha_termino || '',

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

  // ✅ F6 (paso 4) — validaciones antes de guardar.
  const avisos = [];
  // Fecha de término original del contrato (si un finiquito anterior ya
  // la había cambiado, se usa la que tenía antes).
  const finQueCambio = finiquitos_guardados.find(x => x.rut === rut && x.contrato_id && x.fecha_termino === (fin.contrato_fecha_termino || '').slice(0,10));
  const ctoTer = (finQueCambio ? (finQueCambio.fecha_termino_contrato_anterior || '') : (fin.contrato_fecha_termino || '')).slice(0,10);
  if(causal === 'vencimiento_plazo'){
    if(!ctoTer) avisos.push('El contrato no tiene fecha de término (¿es indefinido?): "vencimiento del plazo" no corresponde a un contrato sin plazo.');
    else if(ctoTer !== fecha) avisos.push(`El contrato vence el ${fmtFecha(ctoTer)}, no el ${fmtFecha(fecha)}. Terminarlo antes por "vencimiento del plazo" puede declararse injustificado.`);
  }
  if(causal === 'conclusion_obra' && /indefinido/i.test(fin.tipo_contrato))
    avisos.push('El contrato es indefinido: la conclusión de la obra o faena (Art. 159 N°5) corresponde a contratos por obra o faena.');
  if(!f.alimentos_consultado)
    avisos.push('No marcaste que consultaste el Registro Nacional de Deudores de Pensiones de Alimentos (Ley 21.389). Si el trabajador figura y no se retiene, la multa es el doble del monto no retenido.');
  if(fin.saldo_descuentos_no_cubierto > 0)
    avisos.push(`Los descuentos superan lo que hay para pagar: quedan $${fin.saldo_descuentos_no_cubierto.toLocaleString('es-CL')} sin cubrir (el finiquito queda en $0 y ese saldo sigue pendiente).`);
  if(fin.alimentos_no_cubierto > 0)
    avisos.push(`La retención de alimentos supera lo que hay para pagar: faltan $${fin.alimentos_no_cubierto.toLocaleString('es-CL')} — infórmalo al tribunal.`);
  // Otro finiquito del mismo trabajador para el mismo contrato
  const inicioCto = (fin.fecha_ingreso || '').slice(0,10);
  const previo = finiquitos_guardados.find(x => x.rut === rut && x.fecha_termino !== fecha && (x.fecha_termino || '') >= inicioCto);
  if(previo){
    if(previo.estado === 'ratificado'){
      toast(`❌ ${fin.nombre} ya tiene un finiquito ratificado (folio ${previo.folio}, término ${fmtFecha(previo.fecha_termino)}) para este contrato`, 'error');
      return;
    }
    avisos.push(`Ya existe el finiquito folio ${previo.folio} con término ${fmtFecha(previo.fecha_termino)} para este contrato: se reemplazará por este.`);
  }
  if(avisos.length && !confirm('⚠️ Revisa antes de generar:\n\n• ' + avisos.join('\n\n• ') + '\n\n¿Generar el finiquito igual?')) return;
  if(previo) finiquitos_guardados = finiquitos_guardados.filter(x => x !== previo);

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

  // Regenerar el finiquito del mismo contrato conserva el folio.
  const anterior = previo || finiquitos_guardados.find(x => x.rut === rut && x.fecha_termino === fecha);
  fin.folio = anterior?.folio || ('FIN-' + Date.now().toString().slice(-8));
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
    ref_id: fin.folio, // un documento por finiquito (regenerar actualiza, no duplica)
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
      <button class="btn btn-secondary btn-sm" onclick="imprimirFiniquito('${f.folio}')" title="Imprimir finiquito"><i class="ti ti-printer"></i></button>
      ${(f.requiere_carta ?? (CAUSALES_FINIQUITO[f.causal]?.carta)) ? `<button class="btn btn-secondary btn-sm" onclick="imprimirCartaAviso('${f.folio}')" title="Carta de aviso de término (Art. 162)"><i class="ti ti-mail"></i></button>` : ''}
      ${f.causal === 'renuncia' ? `<button class="btn btn-secondary btn-sm" onclick="imprimirCartaRenuncia('${f.folio}')" title="Formato de carta de renuncia"><i class="ti ti-file-signature"></i></button>` : ''}
      ${f.estado!=='ratificado' ? `<button class="btn btn-primary btn-sm" onclick="marcarFiniquitoRatificado('${f.folio}')" title="Marcar ratificado"><i class="ti ti-check"></i></button>` : ''}
    </td>
  </tr>`).join('');
}

/* ════════════════════════════════════════════════════════
   DOCUMENTOS — finiquito, carta de aviso (Art. 162) y carta de renuncia
   ✅ Paso 5 (auditoría Finiquitos, 30-10-2026). Estructura tomada de los
   modelos que usa el usuario (finiquito ratificado ante notario y carta
   de aviso con acuse de recibo), ajustada a la DT:
   · Reserva de derechos: el trabajador puede hacerla al firmar (Art. 177)
     — se deja el espacio, no se niega de antemano.
   · Poder liberatorio limitado a lo expresamente consignado (Art. 177).
   · Declaraciones de hechos (accidente, fuero), sin renuncia anticipada
     a acciones de tutela.
   · Sin cláusulas de confidencialidad ni de computador (no aplican a
     trabajadores de campo — decisión del usuario).
   · Sin recuadro de ratificación: al final queda un espacio en blanco
     que usan el notario o inspector para su timbre y firma, y el
     trabajador para una reserva de derechos (criterio del usuario).
   · Ley 21.389: retención o declaración jurada de no haber retenciones.
   ════════════════════════════════════════════════════════ */

const FORMAS_PAGO_FINIQUITO = {
  transferencia: 'transferencia electrónica a la cuenta del trabajador',
  vale_vista:    'vale vista nominativo a nombre del trabajador',
  cheque:        'cheque nominativo a nombre del trabajador',
  efectivo:      'dinero en efectivo',
};

function _escFin(s){ return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _fmtMFin(v){ return '$' + Math.round(v||0).toLocaleString('es-CL'); }
function _fmtDiasFin(v){ return String(+(+v||0).toFixed(2)).replace('.', ','); }

/* Fecha + N días hábiles (lunes a viernes sin feriados). Art. 177: el
   finiquito se otorga y paga dentro de 10 días hábiles desde la
   separación. */
function _sumarDiasHabilesFin(fecha, n){
  let f = fecha.slice(0,10), k = 0;
  while(k < n){ f = _diaSiguienteISO(f); if(_diasHabilesFeriado(f, f) === 1) k++; }
  return f;
}

/* Fecha larga: "31 de agosto de 2026" */
function _fechaLargaFin(f){
  if(!f) return '____ de __________ de 20__';
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${+f.slice(8,10)} de ${meses[+f.slice(5,7)-1]} de ${f.slice(0,4)}`;
}

/* Datos comunes de los documentos */
function _datosDocFin(fin){
  const t   = trabajadores.find(x => x.rut === fin.rut) || {};
  const ep  = getEmpresaEmpleadora(t.empresa_propia_id);
  const cto = (contratos||[]).find(c => c.id === fin.contrato_id)
           || _getContratoVigente(fin.rut, (fin.fecha_termino||'').slice(0,7)) || {};
  const causalTxt = `${fin.causal_label}${fin.causal_letra ? `, letra ${fin.causal_letra}) ${fin.causal_letra_texto}` : ''}`;
  return {
    t, ep, cto, causalTxt,
    ciudad: ep.ciudad || ep.comuna || '__________',
    empresa: ep.razon_social || '—',
    rutEmp: ep.rut || '—',
    repr: ep.representante || '______________________',
    rutRepr: ep.rut_representante || '______________',
    domEmp: [ep.direccion, ep.comuna].filter(Boolean).join(', ') || '______________________',
    nombre: fin.nombre, rut: fin.rut,
    domTrab: t.domicilio || '______________________',
    cargo: cto.funcion_cargo || t.funcion_cargo || '______________',
    afp: t.afiliacion_afp || 'AFP', salud: t.sistema_salud || 'Fonasa',
    contactoEmp: [ep.correo, ep.telefono].filter(Boolean).join(' / '),
    fechaPago: fin.fecha_termino ? _sumarDiasHabilesFin(fin.fecha_termino, 10) : '',
  };
}

/* Tabla de prestaciones (compartida por finiquito y carta) */
function _tablaPrestacionesFin(fin){
  const m = _fmtMFin;
  const filas = [];
  if(fin.sueldo_pendiente > 0) filas.push([`Remuneración pendiente del mes (${fin.dia_termino} días)`, m(fin.sueldo_pendiente)]);
  filas.push([`Feriado proporcional: ${_fmtDiasFin(fin.dias_vacaciones_saldo)} días hábiles${fin.dias_vacaciones_corridos ? ` = ${_fmtDiasFin(fin.dias_vacaciones_corridos)} días a pagar (Art. 73 CT)` : ''}`, m(fin.monto_vacaciones)]);
  if(fin.monto_aviso_previo > 0) filas.push([`Indemnización sustitutiva del aviso previo (Art. 162 CT)`, m(fin.monto_aviso_previo)]);
  if(fin.monto_anios_servicio > 0) filas.push([`Indemnización por años de servicio: ${fin.anios_indemnizables} año${fin.anios_indemnizables!==1?'s':''} × ${m(fin.base_indemnizacion || fin.monto_anios_servicio/fin.anios_indemnizables)}${fin.base_con_tope ? ' (tope 90 UF)' : ''} (Art. 163 CT)`, m(fin.monto_anios_servicio)]);
  if(fin.descuento_afc > 0) filas.push([`Menos aporte del empleador al Seguro de Cesantía (Art. 13 Ley 19.728)`, '-' + m(fin.descuento_afc)]);
  if(fin.alimentos_aplicado > 0) filas.push([`Retención pensión de alimentos (Ley 21.389)`, '-' + m(fin.alimentos_aplicado)]);
  if(fin.total_descuentos > 0) filas.push([`Saldo de préstamos / anticipos${fin.saldo_descuentos_no_cubierto > 0 ? ` (quedan ${m(fin.saldo_descuentos_no_cubierto)} sin cubrir)` : ''}`, '-' + m(fin.descuentos_aplicados ?? fin.total_descuentos)]);
  return `<table class="fq-tabla">
    ${filas.map(([a,b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}
    <tr class="fq-total"><td>Total a pagar</td><td>${m(fin.total_a_pagar)}</td></tr>
  </table>`;
}

const _ESTILO_DOC_FIN = `<style>
  .fq-doc{max-width:760px;margin:0 auto;font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;font-size:12.5px;line-height:1.5;}
  .fq-bloque{break-inside:avoid;page-break-inside:avoid;}
  .fq-doc h1{font-size:18px;text-align:center;margin:0 0 4px;letter-spacing:.5px;}
  .fq-doc .fq-folio{text-align:center;font-size:11px;color:#64748b;margin-bottom:18px;}
  .fq-doc p{text-align:justify;margin:0 0 10px;}
  .fq-doc .fq-cl{font-weight:700;}
  .fq-tabla{width:100%;border-collapse:collapse;margin:8px 0 14px;}
  .fq-tabla td{padding:6px 8px;border:1px solid #cbd5e1;}
  .fq-tabla td:last-child{text-align:right;white-space:nowrap;width:130px;}
  .fq-tabla .fq-total td{font-weight:700;background:#f1f5f9;}
  .fq-firmas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:56px;}
  .fq-firma{text-align:center;border-top:1px solid #334155;padding-top:6px;font-size:12px;}
  .fq-huella{width:70px;height:85px;border:1px dashed #94a3b8;margin:0 auto 8px;font-size:9px;color:#94a3b8;display:flex;align-items:flex-end;justify-content:center;}
  .fq-nota{font-size:11px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;padding:8px 10px;margin-top:18px;}
  .fq-derecha{text-align:right;}
  @media print{.fq-no-print{display:none;} body{margin:0;}}
</style>`;

/* ── FINIQUITO ─────────────────────────────────────────── */
function _generarHTMLFiniquito(fin){
  const d = _datosDocFin(fin);
  const n = `<strong>${_escFin(d.nombre)}</strong>`;
  const emp = `<strong>${_escFin(d.empresa)}</strong>`;
  const mesUlt = fin.fecha_termino ? getNombreMes(fin.fecha_termino.slice(0,7)) : '';
  const formaPago = FORMAS_PAGO_FINIQUITO[fin.forma_pago] || 'transferencia electrónica, vale vista, cheque nominativo o dinero en efectivo';
  const cl = ['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO','SEXTO','SÉPTIMO','OCTAVO','NOVENO','DÉCIMO'];
  let i = 0; const C = () => `<span class="fq-cl">${cl[i++]}:</span>`;

  const alimentos = fin.alimentos_aplicado > 0
    ? `De conformidad con la Ley N° 21.389, que crea el Registro Nacional de Deudores de Pensiones de Alimentos, el empleador retiene del presente finiquito la suma de <strong>${_fmtMFin(fin.alimentos_aplicado)}</strong>, que será pagada en la cuenta ordenada por el tribunal${fin.alimentos_no_cubierto > 0 ? `; el saldo no cubierto de ${_fmtMFin(fin.alimentos_no_cubierto)} será informado al tribunal` : ''}.`
    : `El empleador declara bajo juramento que consultó el Registro Nacional de Deudores de Pensiones de Alimentos y que no se le han notificado retenciones judiciales por concepto de pensiones de alimentos que afecten a ${n}, de conformidad con la Ley N° 21.389.`;

  return `${_ESTILO_DOC_FIN}
  <div class="fq-doc">
    <h1>FINIQUITO DE CONTRATO DE TRABAJO</h1>
    <div class="fq-folio">Folio ${_escFin(fin.folio || '(borrador)')}</div>

    <p>En ${_escFin(d.ciudad)}, a ${_fechaLargaFin(fin.fecha_emision || fin.fecha_termino)}, entre ${emp}, RUT ${_escFin(d.rutEmp)},
    representada por don(ña) <strong>${_escFin(d.repr)}</strong>, cédula de identidad N° ${_escFin(d.rutRepr)}, ambos domiciliados en
    ${_escFin(d.domEmp)}, en adelante "el empleador", y don(ña) ${n}, cédula de identidad N° ${_escFin(d.rut)}, domiciliado(a) en
    ${_escFin(d.domTrab)}, en adelante "el trabajador", se ha convenido el siguiente finiquito:</p>

    <p>${C()} El trabajador prestó servicios al empleador en calidad de <strong>${_escFin(d.cargo)}</strong> desde el
    ${_fechaLargaFin(fin.fecha_ingreso)} hasta el ${_fechaLargaFin(fin.fecha_termino)}, fecha esta última en que se puso término a su
    contrato de trabajo por la causal <strong>${_escFin(fin.causal_articulo)}: ${_escFin(d.causalTxt)}</strong>${fin.requiere_carta ? `,
    comunicada por escrito${fin.fecha_aviso ? ` el ${_fechaLargaFin(fin.fecha_aviso)}` : ''} conforme al artículo 162 del Código del Trabajo` : ''}.</p>
    ${fin.hechos ? `<p>Los hechos en que se funda el término son: ${_escFin(fin.hechos)}</p>` : ''}

    <p>${C()} Como consecuencia del término de la relación laboral, el trabajador tiene derecho a las siguientes prestaciones:</p>
    ${_tablaPrestacionesFin(fin)}
    ${fin.sueldo_pendiente > 0 ? '' : `<p>La remuneración de ${mesUlt}${fin.dias_ultimo_mes != null ? ` (${fin.dias_ultimo_mes} día${fin.dias_ultimo_mes!==1?'s':''})` : ''} se paga en la liquidación de sueldo de ese período${fin.liquidacion_ultimo_mes ? `, folio ${_escFin(fin.liquidacion_ultimo_mes.folio)}, por un líquido de ${_fmtMFin(fin.liquidacion_ultimo_mes.liquido)}` : ''}, con sus cotizaciones previsionales.</p>`}
    <p>La suma de <strong>${_fmtMFin(fin.total_a_pagar)}</strong> se paga al trabajador mediante ${formaPago}, quien la recibe en este acto
    a su entera satisfacción.</p>

    <p>${C()} El trabajador declara haber recibido del empleador, correcta y oportunamente, las remuneraciones, feriados y demás
    prestaciones convenidas en su contrato de trabajo, y que con el pago indicado en la cláusula anterior nada se le adeuda por
    los conceptos aquí consignados. De acuerdo con el artículo 177 del Código del Trabajo, el poder liberatorio de este finiquito
    se limita a lo expresamente pactado en él.</p>

    <p>${C()} El trabajador declara que durante la relación laboral no sufrió accidentes del trabajo ni contrajo enfermedades
    profesionales que se encuentren pendientes de declaración o de pago de prestaciones, y que no es titular de fuero laboral
    alguno al término de su contrato.</p>

    <p>${C()} El empleador declara haber pagado íntegramente las cotizaciones previsionales, de salud y del seguro de cesantía del
    trabajador devengadas hasta el último día del mes anterior al término del contrato, lo que acredita con los certificados de
    ${_escFin(d.afp)} y ${_escFin(d.salud)} que se entregan al trabajador (artículos 162 y 177 del Código del Trabajo). Las cotizaciones
    del último mes se pagan en la liquidación de ese período.</p>

    <p>${C()} ${alimentos}</p>

    <p>${C()} El trabajador declara que otorga este finiquito libre y voluntariamente, con pleno conocimiento de sus derechos. Si
    lo estima necesario, puede dejar constancia de reserva de derechos para demandar al empleador, lo que no impide el pago de las
    sumas no disputadas (artículo 177 del Código del Trabajo).</p>

    <div class="fq-bloque">
    <p>${C()} Para constancia, las partes firman el presente finiquito en dos ejemplares, quedando uno en poder de cada parte.</p>

    <div class="fq-firmas">
      <div><div class="fq-huella">Huella</div><div class="fq-firma">${_escFin(d.nombre)}<br>RUT ${_escFin(d.rut)}<br><strong>TRABAJADOR(A)</strong></div></div>
      <div><div style="height:93px;"></div><div class="fq-firma">${_escFin(d.empresa)}<br>RUT ${_escFin(d.rutEmp)}<br>p.p. ${_escFin(d.repr)}<br><strong>EMPLEADOR</strong></div></div>
    </div>

    <!-- ✅ Espacio en blanco, sin recuadro (pedido del usuario): lo usan el
         notario o inspector para su timbre y firma de ratificación, y el
         trabajador si quiere escribir una reserva de derechos. -->
    <div style="height:200px;"></div>
    </div>
  </div>`;
}

/* ── CARTA DE AVISO DE TÉRMINO (Art. 162) ──────────────── */
function _generarHTMLCartaAviso(fin){
  const d = _datosDocFin(fin);
  const fechaCarta = fin.fecha_aviso || fin.fecha_emision || fin.fecha_termino;
  const esFortuito = /159 N°6/.test(fin.causal_articulo);
  const plazoDias = esFortuito ? 6 : 3;
  const limite = _sumarDiasHabilesFin(fin.fecha_termino, plazoDias);
  const hechos = fin.hechos
    || (fin.causal === 'vencimiento_plazo' ? `Se cumplió el plazo convenido en su contrato de trabajo, que vence el ${_fechaLargaFin(fin.fecha_termino)}.` : '')
    || (fin.causal === 'conclusion_obra' ? `Concluyó la obra o faena para la cual fue contratado(a)${d.cto.faena ? ` (${_escFin(d.cto.faena)})` : ''}.` : '');
  return `${_ESTILO_DOC_FIN}
  <div class="fq-doc">
    <p class="fq-derecha">${_escFin(d.ciudad)}, ${_fechaLargaFin(fechaCarta)}</p>
    <p>Señor(a)<br><strong>${_escFin(d.nombre)}</strong><br>RUT ${_escFin(d.rut)}<br>${_escFin(d.domTrab)}<br><u>PRESENTE</u></p>
    <p class="fq-derecha"><strong>Ref.:</strong> Comunica término de contrato de trabajo.</p>

    <p>Por medio de la presente, comunicamos a usted que ${_escFin(d.empresa)} ha resuelto poner término al contrato de trabajo que lo(a)
    vincula con la empresa a contar del <strong>${_fechaLargaFin(fin.fecha_termino)}</strong>, por la causal del
    <strong>${_escFin(fin.causal_articulo)}: "${_escFin(d.causalTxt)}"</strong>.</p>
    ${hechos ? `<p>Los hechos en que se funda esta decisión son los siguientes: ${_escFin(hechos)}</p>` : ''}

    <p>El monto que corresponde pagarle por el término de la relación laboral se desglosa de la siguiente forma:</p>
    ${_tablaPrestacionesFin(fin)}
    <p>A estos montos se aplicarán los descuentos legales que correspondan. La remuneración de los días trabajados en
    ${fin.fecha_termino ? getNombreMes(fin.fecha_termino.slice(0,7)) : 'el último mes'} se pagará en la liquidación de sueldo de ese período.</p>

    <p>Conforme al inciso 5° del artículo 162 del Código del Trabajo, le informamos que sus cotizaciones previsionales se encuentran
    pagadas hasta el último día del mes anterior al término de su contrato, y se adjuntan a esta carta los certificados de pago de
    ${_escFin(d.afp)} y ${_escFin(d.salud)} que lo acreditan.</p>

    <p>Su finiquito estará disponible a contar del <strong>${_fechaLargaFin(d.fechaPago)}</strong> para ser firmado y recibir el pago
    indicado${d.domEmp ? `, en ${_escFin(d.domEmp)}` : ''}. Si prefiere firmarlo de forma electrónica en el portal de la Dirección del
    Trabajo, avísenos${d.contactoEmp ? ` a ${_escFin(d.contactoEmp)}` : ''}; esta opción es voluntaria y puede siempre optar por firmarlo
    presencialmente ante un ministro de fe. Le recordamos que al firmar el finiquito puede formular reserva de derechos.</p>

    <div class="fq-bloque">
    <p>Sin otro particular, saluda atentamente,</p>
    <div style="width:280px;margin-top:56px;" class="fq-firma">${_escFin(d.empresa)}<br>RUT ${_escFin(d.rutEmp)}<br>p.p. ${_escFin(d.repr)}</div>

    <div style="margin-top:40px;border-top:1px dashed #94a3b8;padding-top:12px;">
      <p>Declaro que hoy ____ / ____ / ________ he recibido una comunicación idéntica a la que consta en esta carta, además de los
      certificados de cotizaciones previsionales pagadas.</p>
      <div style="width:280px;margin-top:46px;" class="fq-firma">${_escFin(d.nombre)}<br>RUT ${_escFin(d.rut)}</div>
    </div>
    </div>

    <div class="fq-nota fq-no-print">
      <strong>Recordatorio (no se imprime):</strong> entregar personalmente o por carta certificada al domicilio señalado en el contrato,
      a más tardar el <strong>${_fechaLargaFin(limite)}</strong> (${plazoDias} días hábiles desde la separación${fin.causal === 'necesidades_empresa' ? '; en necesidades de la empresa, idealmente con 30 días de anticipación para no pagar aviso previo' : ''}).
      Enviar copia a la Inspección del Trabajo en el mismo plazo (puede hacerse en línea en el sitio de la DT).
      Si hay cotizaciones impagas, el despido no pone término al contrato (Ley Bustos, art. 162 inc. 5°).
    </div>
  </div>`;
}

/* ── CARTA DE RENUNCIA (formato para el trabajador) ────── */
function _generarHTMLCartaRenuncia(fin){
  const d = _datosDocFin(fin);
  return `${_ESTILO_DOC_FIN}
  <div class="fq-doc">
    <p class="fq-derecha">${_escFin(d.ciudad)}, ____ de ______________ de ________</p>
    <p>Señores<br><strong>${_escFin(d.empresa)}</strong><br>RUT ${_escFin(d.rutEmp)}<br>${_escFin(d.domEmp)}<br><u>PRESENTE</u></p>
    <p class="fq-derecha"><strong>Ref.:</strong> Renuncia voluntaria.</p>

    <p>Yo, <strong>${_escFin(d.nombre)}</strong>, cédula de identidad N° ${_escFin(d.rut)}, que me desempeño como
    ${_escFin(d.cargo)}, por medio de la presente comunico mi <strong>renuncia voluntaria</strong> a mi cargo, conforme al
    artículo 159 N°2 del Código del Trabajo, a contar del <strong>${_fechaLargaFin(fin.fecha_termino)}</strong>.</p>
    <p>Declaro que esta decisión es libre y voluntaria.</p>

    <p>Sin otro particular, saluda atentamente,</p>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:end;margin-top:46px;">
      <div class="fq-huella">Huella</div>
      <div style="width:280px;" class="fq-firma">${_escFin(d.nombre)}<br>RUT ${_escFin(d.rut)}</div>
    </div>

    <div style="height:160px;"></div><!-- espacio para timbre y firma del ministro de fe -->
    <div class="fq-nota fq-no-print"><strong>Recordatorio (no se imprime):</strong> el trabajador debe dar aviso con al menos
    30 días de anticipación (art. 159 N°2), aunque el empleador puede aceptar una fecha anterior. Para que el empleador
    pueda invocarla, debe firmarse ante ministro de fe (notario, inspector del trabajo, oficial del Registro Civil o
    secretario municipal) o electrónicamente en el sitio de la DT (art. 177).</div>
  </div>`;
}

function _abrirDocumentoFin(titulo, html, imprimir){
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>${_escFin(titulo)}</title></head><body style="margin:24px;">
    ${html}
    ${imprimir ? '<script>setTimeout(()=>window.print(),700);<\/script>' : ''}
  </body></html>`);
  win.document.close();
}

function _mostrarModalFiniquito(fin, guardado){
  _abrirDocumentoFin(`Finiquito ${fin.nombre}`, _generarHTMLFiniquito(fin), guardado);
}

function imprimirFiniquito(folio){
  const fin = finiquitos_guardados.find(f => f.folio === folio);
  if(!fin){ toast('⚠️ Finiquito no encontrado', 'error'); return; }
  _mostrarModalFiniquito(fin, true);
}

function imprimirCartaAviso(folio){
  const fin = finiquitos_guardados.find(f => f.folio === folio);
  if(!fin){ toast('⚠️ Finiquito no encontrado', 'error'); return; }
  _abrirDocumentoFin(`Carta de aviso ${fin.nombre}`, _generarHTMLCartaAviso(fin), true);
}

function imprimirCartaRenuncia(folio){
  const fin = finiquitos_guardados.find(f => f.folio === folio);
  if(!fin){ toast('⚠️ Finiquito no encontrado', 'error'); return; }
  _abrirDocumentoFin(`Carta de renuncia ${fin.nombre}`, _generarHTMLCartaRenuncia(fin), true);
}
