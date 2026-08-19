/* ════════════════════════════════════════════════════════
   VARIABLES.JS — Construcción de variables de remuneración
   Base legal: Art. 44, 55 CT · Dictamen DT 5308/230
   Divisor siempre 30 (mes comercial) independiente del mes
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

const DIVISOR_MES = 30; // Art. 44 CT + Dictamen DT 5308/230 — FIJO, no cambia

/* ════════════════════════════════════════════════════════
   FUNCIÓN PRINCIPAL — construye las variables de un
   trabajador para un período determinado
   Retorna objeto listo para calculo.js
   ════════════════════════════════════════════════════════ */
function construirVariablesRemuneracion(rut, periodo){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return { error: `Trabajador ${rut} no encontrado` };

  // ── 1. Contrato vigente ──────────────────────────────
  const contrato = _getContratoVigente(rut, periodo);
  if(!contrato) return { error: `Sin contrato vigente para ${rut} en período ${periodo}` };

  // ── 2. Sueldo base — contrato o último anexo de remuneración ──
  const sueldoInfo = _getSueldoBase(rut, periodo);
  if(!sueldoInfo) return { error: `Sin sueldo base definido para ${rut}` };

  const sueldo_base = sueldoInfo.monto;
  const sueldo_fuente = sueldoInfo.fuente;

  if(sueldo_base <= 0) return { error: `Sueldo base inválido para ${rut} — revisa el contrato o anexo` };

  // ── 2. Tipo de contrato → tasa AFC ──────────────────
  const tipo_contrato = _normalizarTipoContrato(contrato.tipo_contrato || contrato.tipo);
  const antiguedad_anios = _calcularAntiguedad(contrato.fecha_inicio || t.fecha_ingreso, periodo);

  // ── 3. Valor día (Art. 44 CT + Dictamen DT 5308/230) ─
  const valor_dia = Math.round(sueldo_base / DIVISOR_MES);

  // ── 4. Días trabajados y ausencias desde Asistencia ──
  const asistencia = _leerAsistenciaMes(rut, periodo);
  const dias_sin_clasificar = asistencia.dias_sin_clasificar || 0;

  // ── 5. Novedades del período desde Gestión Laboral ───
  const novedades_periodo = getNovedadesPorRut(rut, periodo);

  // Clasificar ausencias por tipo
  const dias_licencia_medica     = _contarDiasNovedad(novedades_periodo, 'licencia_medica');
  const dias_permiso_con_goce    = _contarDiasNovedad(novedades_periodo, 'permiso_goce');
  const dias_permiso_sin_goce    = _contarDiasNovedad(novedades_periodo, 'permiso_sin_goce');
  const dias_ausencia_injust     = _contarDiasNovedad(novedades_periodo, 'ausencia_injustificada');
  const dias_vacaciones          = _contarDiasNovedad(novedades_periodo, 'vacaciones');

  // Días que descuentan del sueldo base (sin goce + injustificadas +
  // sin clasificar). Licencia médica NO descuenta — la paga
  // Fonasa/Isapre vía subsidio. Vacaciones NO descuentan — se pagan con
  // remuneración íntegra (Art. 71 CT). Permiso con goce NO descuenta —
  // es de cargo del empleador. Los "sin clasificar" (sin marca de
  // Asistencia y sin novedad) se tratan igual que una falta
  // injustificada por defecto — ver _leerAsistenciaMes() más abajo.
  const dias_a_descontar = dias_permiso_sin_goce + dias_ausencia_injust + dias_sin_clasificar;

  // ── 6. Sueldo proporcional ───────────────────────────
  // Si el mes fue completo o las ausencias son con goce → sueldo íntegro
  // Solo se descuenta si hay días sin goce o injustificados
  const descuento_ausencias = dias_a_descontar * valor_dia;
  const sueldo_proporcional = Math.max(0, sueldo_base - descuento_ausencias);

  // ── 7. Haberes variables desde Gestión Laboral ───────
  const haberes_raw = getHaberesPorRut(rut, periodo);
  const haberes_clasificados = _clasificarHaberes(haberes_raw);

  // ── 8. Horas extra (Art. 32 CT — recargo 50% o 100%) ─
  const jornada_raw    = getJornadaEspecialPorRut(rut, periodo);
  const horas_extra    = _calcularHorasExtra(jornada_raw, sueldo_base, contrato);

  // ── 9. Totales ───────────────────────────────────────
  const total_imponible = _calcularTotalImponible(
    sueldo_proporcional,
    haberes_clasificados.imponibles,
    horas_extra.total_imponible
  );
  const total_no_imponible = haberes_clasificados.no_imponibles_total;
  const total_haberes = total_imponible + total_no_imponible;

  return {
    // Identificación
    rut,
    nombre:          t.nombre,
    periodo,
    afp:             (t.afiliacion_afp || '').toLowerCase(),
    sistema_salud:   t.sistema_salud || 'Fonasa',
    pensionado_invalidez_parcial: !!t.pensionado_invalidez_parcial,

    // Contrato
    tipo_contrato,
    antiguedad_anios,
    fecha_inicio_contrato: contrato.fecha_inicio || t.fecha_ingreso,
    horas_semanales: parseFloat(contrato.horas_semanales) || 45,

    // Sueldo base
    sueldo_base,
    sueldo_fuente,         // 'Contrato' o 'Anexo cambio remuneración...'
    valor_dia,             // sueldo_base / 30

    // Asistencia
    dias_trabajados:        asistencia.dias_trabajados,
    dias_sin_clasificar,     // ✅ nuevo — sin marca de Asistencia y sin novedad (se descuenta por defecto)
    fechas_sin_clasificar:  asistencia.fechas_sin_clasificar || [],
    dias_licencia_medica,
    dias_permiso_con_goce,
    dias_permiso_sin_goce,
    dias_ausencia_injust,
    dias_vacaciones,
    dias_a_descontar,

    // Sueldo proporcional
    descuento_ausencias,
    sueldo_proporcional,   // base real para cotizaciones

    // Haberes variables
    haberes_imponibles:     haberes_clasificados.imponibles,
    haberes_no_imponibles:  haberes_clasificados.no_imponibles,
    total_haberes_imponibles:    haberes_clasificados.imponibles_total,
    total_haberes_no_imponibles: haberes_clasificados.no_imponibles_total,

    // Horas extra
    horas_extra:            horas_extra.detalle,
    total_horas_extra_imponible: horas_extra.total_imponible,

    // Totales para calculo.js
    total_imponible,       // base AFP + salud + AFC + SIS
    total_no_imponible,    // colación + movilización (no cotizan)
    total_haberes,         // total bruto antes de descuentos legales
  };
}

/* ════════════════════════════════════════════════════════
   FUNCIONES AUXILIARES
   ════════════════════════════════════════════════════════ */

/* ── Sueldo base: contrato vigente + último anexo cambio_remuneracion ── */
function _getSueldoBase(rut, periodo){
  const contrato = _getContratoVigente(rut, periodo);
  if(!contrato) return null;

  const sueldoContrato = parseFloat(contrato.sueldo_monto) || 0;

  // Buscar último anexo de cambio_remuneracion vigente para el período
  const [anio, mes] = periodo.split('-').map(Number);
  const fechaPeriodo = new Date(anio, mes-1, 1, 12); // mismo ancla de mediodía que el resto

  const anexoRem = (anexos || [])
    .filter(a =>
      (a.trabajador_rut === rut) &&
      a.tipo === 'cambio_remuneracion' &&
      a.nuevo_sueldo > 0 &&
      fechaLocal(a.fecha_vigencia) <= fechaPeriodo
    )
    .sort((a,b) => fechaLocal(b.fecha_vigencia) - fechaLocal(a.fecha_vigencia))[0];

  // El anexo más reciente vigente prevalece sobre el contrato
  if(anexoRem?.nuevo_sueldo){
    return {
      monto:  anexoRem.nuevo_sueldo,
      fuente: `Anexo cambio remuneración vigente desde ${new Date(anexoRem.fecha_vigencia).toLocaleDateString('es-CL')}`,
    };
  }

  return {
    monto:  sueldoContrato,
    fuente: 'Contrato de trabajo',
  };
}

/* ── Contrato vigente para el período ──────────────────── */
function _getContratoVigente(rut, periodo){
  // ✅ Blindado — antes, si tanto el contrato como el trabajador no
  // tenían id (undefined === undefined), la comparación por
  // trabajador_id daba "true" por accidente y mezclaba el contrato de
  // OTRO trabajador. Ahora solo compara por id si el contrato
  // realmente tiene uno.
  const lista = (contratos || []).filter(c =>
    c.trabajador_rut === rut || (c.trabajador_id && c.trabajador_id === trabajadores.find(t=>t.rut===rut)?.id)
  );
  if(!lista.length) return null;

  // Ordenar por fecha de firma descendente → tomar el más reciente vigente
  const ordenados = [...lista].sort((a,b) =>
    new Date(b.fecha_firma||b.fecha_inicio||0) - new Date(a.fecha_firma||a.fecha_inicio||0)
  );

  const [anio, mes] = periodo.split('-').map(Number);
  // ✅ Corregido — antes fechaPeriodo se anclaba a medianoche mientras
  // fechaLocal() (usada abajo para inicio/fin) ancla a mediodía. Ese
  // desfase de 12 horas podía hacer fallar la comparación justo cuando
  // un contrato empezaba el día 1 exacto del período — y como el
  // fallback de más abajo devuelve "el más reciente" en silencio, el
  // error quedaba escondido en vez de notarse. Ahora ambas fechas usan
  // el mismo ancla de mediodía.
  const fechaPeriodo = new Date(anio, mes-1, 1, 12);

  // Buscar contrato cuya fecha de inicio ≤ período y sin término o término ≥ período
  const vigente = ordenados.find(c => {
    const inicio = c.fecha_inicio ? fechaLocal(c.fecha_inicio) : null;
    const fin    = c.fecha_termino ? fechaLocal(c.fecha_termino) : null;
    const inicia = !inicio || inicio <= fechaPeriodo;
    const termina= !fin || fin >= fechaPeriodo;
    return inicia && termina;
  });

  if(vigente) return vigente;

  // ✅ BL-067 — antes, si ningún contrato calzaba con el período (`vigente`
  // vacío), el fallback devolvía sin más "el contrato más reciente" —
  // que es exactamente el peligro que ya reconocía el comentario de
  // arriba. Esto se vuelve un problema real con el reingreso (BL-062):
  // `contratos[]` solo guarda el contrato VIGENTE, así que al iniciar un
  // ciclo nuevo se pisa el ciclo anterior — si después alguien recalcula
  // una liquidación (u otro cálculo) de un período que pertenece a ese
  // ciclo anterior YA FINIQUITADO, el fallback devolvía por error los
  // datos del ciclo nuevo (otro sueldo, otra faena), sin ningún aviso.
  //
  // Blindaje: el fallback "el más reciente" solo tiene sentido si el
  // período pedido es POSTERIOR al inicio de ese contrato (ej. quedó sin
  // fecha_termino y el período cae después, caso normal). Si el período
  // es ANTERIOR al inicio del contrato más reciente, es señal clara de
  // que pertenece a un ciclo anterior ya reemplazado — no hay datos
  // confiables para ese período, así que hay que devolver null (cada
  // llamador ya maneja este caso con su propio mensaje de error) en vez
  // de adivinar con datos de otro ciclo.
  //
  // 🐛 CORRECCIÓN — la primera versión de este blindaje comparaba contra
  // el DÍA exacto de inicio del contrato, no contra el mes. Un contrato
  // que arranca, por ejemplo, el 2 de julio quedaba "después" del 1° de
  // julio (ancla del período) y el sistema decía por error "sin contrato"
  // para julio — el mes correcto del propio contrato. La comparación
  // debe ser por MES: si el contrato empezó en ese mismo mes (cualquier
  // día) o antes, es válido; solo si empezó en un mes POSTERIOR al del
  // período pedido corresponde devolver null.
  const masReciente = ordenados[0];
  if(masReciente.fecha_inicio){
    const inicioMasReciente = fechaLocal(masReciente.fecha_inicio);
    const inicioMesContrato = new Date(inicioMasReciente.getFullYear(), inicioMasReciente.getMonth(), 1, 12);
    if(fechaPeriodo < inicioMesContrato){
      return null;
    }
  }

  return masReciente;
}

/* ✅ Helper compartido (Hallazgo Grande #13) — reemplaza a leer
   t.faena_obra directo (campo eliminado del trabajador). Busca la
   Faena en el Contrato vigente de la persona para el período dado
   (o el mes actual si no se especifica). Usado por anexos.js,
   exportar.js, liquidaciones.js, previred.js y trabajadores.js. */
function _faenaVigente(rut, periodo){
  const p = periodo || (() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`;
  })();
  const cont = typeof _getContratoVigente === 'function' ? _getContratoVigente(rut, p) : null;
  return cont?.nombre_faena || '';
}

/* ── Normalizar tipo de contrato → clave AFC ────────────── */
function _normalizarTipoContrato(tipo){
  if(!tipo) return 'indefinido';
  const t = tipo.toLowerCase();
  if(t.includes('temporada') || t.includes('plazo') || t.includes('fijo')) return 'fijo';
  if(t.includes('indefinido')) return 'indefinido';
  return 'indefinido';
}

/* ── Antigüedad en años (para AFC 11+ años) ─────────────── */
function _calcularAntiguedad(fechaInicio, periodo){
  if(!fechaInicio) return 0;
  const inicio = fechaLocal(fechaInicio);
  const [anio, mes] = periodo.split('-').map(Number);
  const fin = new Date(anio, mes, 0); // último día del mes (constructor numérico, seguro)
  const anios = (fin - inicio) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, anios);
}

/* ── Leer asistencia del mes desde localStorage ─────────── */
/* ✅ Reactivada — cuenta, para este trabajador+período, los días
   hábiles SIN marcación de asistencia (QR o manual) Y sin ninguna
   novedad que los cubra. Estos días se tratan como falta injustificada
   por defecto (acordado con el usuario, sesión 18-08-2026) — antes, un
   día sin ninguna acción humana se pagaba completo en silencio.
   Mismo resguardo que _leerAusenciasAsistencia (gestion-laboral.js):
   solo cuenta un día si el módulo de Asistencia tuvo actividad real
   ese día (alguien marcó algo, de cualquier trabajador) — así un mes
   futuro, o una empresa que no usa Asistencia, no generan faltas
   fantasma. Los caminos manuales de siempre (marcar asistencia a mano,
   cargar una novedad) resuelven el día exactamente igual que antes —
   esto solo cambia qué pasa cuando NADIE hizo ninguna de las dos cosas. */
function _leerAsistenciaMes(rut, periodo){
  const [anio, mes] = periodo.split('-').map(Number);
  const diasMes = new Date(anio, mes, 0).getDate();
  const novedadesRut = (typeof getNovedadesPorRut === 'function') ? getNovedadesPorRut(rut, periodo) : [];

  const cubiertoPorNovedad = (fecha) => novedadesRut.some(n => {
    const ini = n.fecha_inicio, fin = n.fecha_fin || n.fecha_inicio;
    return ini && fecha >= ini && fecha <= fin;
  });

  let dias_sin_clasificar = 0;
  const fechas_sin_clasificar = [];

  for(let d = 1; d <= diasMes; d++){
    const fecha = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const diaSemana = new Date(fecha+'T12:00:00').getDay();
    if(diaSemana === 0 || diaSemana === 6) continue; // sábado/domingo — el mes comercial ya los cubre

    let data = [];
    try{ data = JSON.parse(localStorage.getItem('asistencia_' + fecha) || '[]'); }catch{ data = []; }
    if(!data.length) continue; // el módulo no tuvo actividad ese día — no se asume nada

    const marcacion = data.find(x => x.rut === rut);
    if(marcacion) continue; // sí tiene marca (QR o manual)

    if(cubiertoPorNovedad(fecha)) continue; // ya está clasificado (permiso, licencia, etc.)

    dias_sin_clasificar++;
    fechas_sin_clasificar.push(fecha);
  }

  return { dias_sin_clasificar, fechas_sin_clasificar };
}

/* ── Contar días de un tipo de novedad ──────────────────── */
function _contarDiasNovedad(novedades, tipo){
  return novedades
    .filter(n => n.tipo === tipo && n.aprobado)
    .reduce((sum, n) => sum + (parseInt(n.dias) || 1), 0);
}

/* ── Clasificar haberes variables (imponibles vs no) ────── */
// Según Art. 41 CT:
// NO imponibles: colación, movilización, viáticos (asignaciones de gastos)
// IMPONIBLES: bonos de producción, responsabilidad, puntualidad, asistencia
function _clasificarHaberes(haberes){
  const NO_IMPONIBLES = ['colacion','movilizacion','viatico'];

  const imponibles    = [];
  const no_imponibles = [];

  haberes.forEach(h => {
    const esNoImp = NO_IMPONIBLES.some(tipo => h.tipo?.toLowerCase().includes(tipo));
    if(esNoImp){
      no_imponibles.push({ ...h, imponible: false });
    } else {
      imponibles.push({ ...h, imponible: true });
    }
  });

  return {
    imponibles,
    no_imponibles,
    imponibles_total:    imponibles.reduce((s,h)    => s + (parseFloat(h.monto)||0), 0),
    no_imponibles_total: no_imponibles.reduce((s,h) => s + (parseFloat(h.monto)||0), 0),
  };
}

/* ── Calcular horas extra con recargo legal ─────────────── */
// Art. 32 CT: recargo 50% día hábil, 100% festivo/domingo
// Valor hora ordinaria = (sueldo_base / 30) / (horas_semanales / 5)
function _calcularHorasExtra(jornada, sueldo_base, contrato){
  const horas_semanales = parseFloat(contrato?.horas_semanales) || 45;
  // Valor hora ordinaria según jornada pactada
  const valor_hora_ord  = Math.round((sueldo_base / DIVISOR_MES) / (horas_semanales / 5));

  const detalle = jornada
    .filter(j => j.tipo === 'hora_extra')
    .map(j => {
      const recargo     = parseFloat(j.recargo) === 100 ? 2.0 : 1.5; // 50% o 100%
      const horas       = parseFloat(j.horas) || 0;
      const monto       = Math.round(valor_hora_ord * recargo * horas);
      return {
        fecha:   j.fecha,
        horas,
        recargo: j.recargo === '100' ? '100%' : '50%',
        valor_hora_extra: Math.round(valor_hora_ord * recargo),
        monto_imponible: monto,
        observacion: j.observacion || '',
      };
    });

  return {
    detalle,
    total_imponible: detalle.reduce((s,h) => s + h.monto_imponible, 0),
  };
}

/* ── Total imponible (base para AFP + salud + AFC + SIS) ── */
function _calcularTotalImponible(sueldo_prop, haberes_imp, total_hex_imp){
  const base_haberes = haberes_imp.reduce((s,h) => s + (parseFloat(h.monto)||0), 0);
  return sueldo_prop + base_haberes + total_hex_imp;
}

/* ════════════════════════════════════════════════════════
   FUNCIONES DE ACCESO PARA OTROS MÓDULOS
   ════════════════════════════════════════════════════════ */

/* ✅ Limpieza — se sacaron construirVariablesPeriodo() y
   construirVariablesMandante(): solo las llamaba generarLiquidacionesMasivas()
   en liquidaciones.js, que también se sacó (reemplazada por la tabla-reporte
   con checkboxes de la pestaña "Generar Liquidaciones", que recorre
   trabajadores.filter() directamente en liquidaciones.js). */

/* ✅ Limpieza — se sacó resumenVariablesPeriodo(), nunca llamada desde
   ningún lado (misma limpieza que las 3 funciones análogas en
   calculo.js). construirVariablesPeriodo() sigue existiendo — sí se usa,
   desde liquidaciones.js. */
