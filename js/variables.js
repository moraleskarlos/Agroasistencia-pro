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

  const sueldo_base = parseFloat(contrato.sueldo_monto) || 0;
  if(sueldo_base <= 0) return { error: `Sueldo base inválido en contrato de ${rut}` };

  // ── 2. Tipo de contrato → tasa AFC ──────────────────
  const tipo_contrato = _normalizarTipoContrato(contrato.tipo_contrato || contrato.tipo);
  const antiguedad_anios = _calcularAntiguedad(contrato.fecha_inicio || t.fecha_ingreso, periodo);

  // ── 3. Valor día (Art. 44 CT + Dictamen DT 5308/230) ─
  const valor_dia = Math.round(sueldo_base / DIVISOR_MES);

  // ── 4. Días trabajados y ausencias desde Asistencia ──
  const asistencia = _leerAsistenciaMes(rut, periodo);

  // ── 5. Novedades del período desde Gestión Laboral ───
  const novedades_periodo = getNovedadesPorRut(rut, periodo);

  // Clasificar ausencias por tipo
  const dias_licencia_medica     = _contarDiasNovedad(novedades_periodo, 'licencia_medica');
  const dias_permiso_con_goce    = _contarDiasNovedad(novedades_periodo, 'permiso_goce');
  const dias_permiso_sin_goce    = _contarDiasNovedad(novedades_periodo, 'permiso_sin_goce');
  const dias_ausencia_injust     = _contarDiasNovedad(novedades_periodo, 'ausencia_injustificada');
  const dias_vacaciones          = _contarDiasNovedad(novedades_periodo, 'vacaciones');

  // Días que descuentan del sueldo base (sin goce + injustificadas)
  // Licencia médica NO descuenta — la paga Fonasa/Isapre vía subsidio
  // Vacaciones NO descuentan — se pagan con remuneración íntegra (Art. 71 CT)
  // Permiso con goce NO descuenta — es de cargo del empleador
  const dias_a_descontar = dias_permiso_sin_goce + dias_ausencia_injust;

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

    // Contrato
    tipo_contrato,
    antiguedad_anios,
    fecha_inicio_contrato: contrato.fecha_inicio || t.fecha_ingreso,
    horas_semanales: parseFloat(contrato.horas_semana) || 45,

    // Sueldo base
    sueldo_base,
    valor_dia,             // sueldo_base / 30

    // Asistencia
    dias_trabajados:        asistencia.dias_trabajados,
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

/* ── Contrato vigente para el período ──────────────────── */
function _getContratoVigente(rut, periodo){
  const lista = (contratos || []).filter(c =>
    (c.trabajador_rut === rut || c.trabajador_id === (trabajadores.find(t=>t.rut===rut)?.id))
  );
  if(!lista.length) return null;

  // Ordenar por fecha de firma descendente → tomar el más reciente vigente
  const ordenados = [...lista].sort((a,b) =>
    new Date(b.fecha_firma||b.fecha_inicio||0) - new Date(a.fecha_firma||a.fecha_inicio||0)
  );

  const [anio, mes] = periodo.split('-').map(Number);
  const fechaPeriodo = new Date(anio, mes-1, 1);

  // Buscar contrato cuya fecha de inicio ≤ período y sin término o término ≥ período
  const vigente = ordenados.find(c => {
    const inicio = c.fecha_inicio ? new Date(c.fecha_inicio) : null;
    const fin    = c.fecha_termino ? new Date(c.fecha_termino) : null;
    const inicia = !inicio || inicio <= fechaPeriodo;
    const termina= !fin || fin >= fechaPeriodo;
    return inicia && termina;
  });

  return vigente || ordenados[0]; // fallback al más reciente
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
  const inicio = new Date(fechaInicio);
  const [anio, mes] = periodo.split('-').map(Number);
  const fin = new Date(anio, mes, 0); // último día del mes
  const anios = (fin - inicio) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, anios);
}

/* ── Leer asistencia del mes desde localStorage ─────────── */
function _leerAsistenciaMes(rut, periodo){
  const [anio, mes] = periodo.split('-').map(Number);
  const diasMes = new Date(anio, mes, 0).getDate();
  let dias_trabajados = 0;

  for(let d = 1; d <= diasMes; d++){
    const fecha = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const clave = 'asistencia_' + fecha;
    const data  = JSON.parse(localStorage.getItem(clave) || '[]');
    const reg   = data.find(x => x.rut === rut);
    if(reg && reg.hora_entrada) dias_trabajados++;
  }

  return { dias_trabajados };
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
  const horas_semanales = parseFloat(contrato?.horas_semana) || 45;
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

/* Construye variables para TODOS los trabajadores activos del período */
function construirVariablesPeriodo(periodo){
  const mandante = null; // sin filtro por mandante
  return trabajadores
    .filter(t => t.estado === 'activo')
    .map(t => construirVariablesRemuneracion(t.rut, periodo))
    .filter(v => !v.error);
}

/* Construye variables para trabajadores de un mandante específico */
function construirVariablesMandante(periodo, mandanteId){
  return trabajadores
    .filter(t => {
      if(t.estado !== 'activo') return false;
      const m = findMandante(t);
      return (m?.id || m?.rut) === mandanteId;
    })
    .map(t => construirVariablesRemuneracion(t.rut, periodo))
    .filter(v => !v.error);
}

/* Resumen rápido para UI — sin calcular cotizaciones */
function resumenVariablesPeriodo(periodo){
  const vars = construirVariablesPeriodo(periodo);
  return {
    total_trabajadores: vars.length,
    total_sueldo_base:  vars.reduce((s,v) => s + v.sueldo_base, 0),
    total_imponible:    vars.reduce((s,v) => s + v.total_imponible, 0),
    total_haberes:      vars.reduce((s,v) => s + v.total_haberes, 0),
    con_descuento:      vars.filter(v => v.dias_a_descontar > 0).length,
    con_horas_extra:    vars.filter(v => v.total_horas_extra_imponible > 0).length,
    variables:          vars,
  };
}
