/* ════════════════════════════════════════════════════════
   CALCULO.JS — Motor de descuentos legales previsionales
   Base legal:
   · AFP:     Art. 17 DL 3500 — tasa según administradora
   · Salud:   Art. 84 DFL 1/2005 — 7% con tope AFP
   · AFC:     Art. 5 Ley 19728 — según tipo contrato
   · SIS:     Art. 59 DL 3500 — cargo empleador
   · IUSC:    Art. 42 N°1 LIR — tabla progresiva mensual
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════
   FUNCIÓN PRINCIPAL — recibe variables de variables.js
   y retorna la liquidación completa calculada
   ════════════════════════════════════════════════════════ */
function calcularLiquidacion(vars, periodo){
  const ind = getIndicadoresPorPeriodo(periodo);
  if(!ind) return { error: `Sin indicadores previsionales para período ${periodo}` };

  const afpKey   = _normalizarAfpKey(vars.afp);
  const tasaAFP  = ind.afp?.[afpKey];
  if(!tasaAFP) return { error: `AFP "${vars.afp}" no encontrada en indicadores de ${periodo}` };

  // ── Tope imponible AFP (87,8 UF) ────────────────────
  const tope_afp = ind.tope_imponible_afp || 0;
  const tope_afc = ind.tope_imponible_afc || 0;
  const base_afp = Math.min(vars.total_imponible, tope_afp);
  const base_afc = Math.min(vars.total_imponible, tope_afc);

  // ── AFP trabajador (Art. 17 DL 3500) ────────────────
  const pct_afp_trab   = (tasaAFP.trabajador || 0) / 100;
  const monto_afp      = Math.round(base_afp * pct_afp_trab);

  // ── Salud (Art. 84 DFL 1/2005) ──────────────────────
  // Fonasa: 7% sobre base AFP (con tope)
  // Isapre: mínimo 7% — el trabajador puede cotizar más según plan
  const es_isapre       = vars.sistema_salud?.toLowerCase().includes('isapre');
  const pct_salud       = 0.07; // piso legal 7%
  const monto_salud     = Math.round(base_afp * pct_salud);
  // Para Isapre, el exceso sobre el 7% es cotización adicional voluntaria
  // En esta versión calculamos el mínimo legal (7%). La diferencia con el plan se agrega como desc. adicional

  // ── AFC trabajador (Art. 5 Ley 19728) ────────────────
  const monto_afc_trab = _calcularAFCTrabajador(vars, ind, base_afc);

  // ── Total descuentos previsionales trabajador ────────
  const total_prev_trab = monto_afp + monto_salud + monto_afc_trab;

  // ── Renta imponible IUSC (base AFP menos prev) ───────
  // La base para el impuesto es el total imponible menos las cotizaciones previsionales
  const base_iusc       = Math.max(0, vars.total_imponible - total_prev_trab);
  const iusc            = _calcularIUSC(base_iusc, ind);

  // ── Descuentos adicionales (anticipos, cuotas, etc.) ─
  const descuentos_adicionales = getDescuentosPorRut(vars.rut, periodo);
  const total_desc_adicionales = descuentos_adicionales
    .reduce((s,d) => s + (parseFloat(d.monto)||0), 0);

  // ── Líquido a pagar ──────────────────────────────────
  const total_descuentos = total_prev_trab + iusc + total_desc_adicionales;
  const liquido          = Math.max(0, vars.total_haberes - total_descuentos);

  // ── Cargo empleador ──────────────────────────────────
  const pct_afp_emp    = (tasaAFP.empleador || 0.1) / 100;
  const monto_afp_emp  = Math.round(base_afp * pct_afp_emp);
  const monto_sis      = Math.round(base_afp * ((ind.sis || 0) / 100));
  const monto_afc_emp  = _calcularAFCEmpleador(vars, ind, base_afc);
  const total_cargo_emp = monto_afp_emp + monto_sis + monto_afc_emp;

  // ── Costo total empresa ──────────────────────────────
  const costo_empresa  = vars.total_haberes + total_cargo_emp;

  return {
    // Identificación
    rut:             vars.rut,
    nombre:          vars.nombre,
    periodo,

    // Haberes
    sueldo_base:              vars.sueldo_base,
    descuento_ausencias:      vars.descuento_ausencias,
    sueldo_proporcional:      vars.sueldo_proporcional,
    total_haberes_imponibles: vars.total_imponible,
    total_haberes_no_imponibles: vars.total_no_imponible,
    total_haberes:            vars.total_haberes,

    // Bases de cálculo
    base_afp,
    base_afc,
    base_iusc,

    // Descuentos trabajador
    monto_afp,
    pct_afp_trab:    tasaAFP.trabajador,
    monto_salud,
    es_isapre,
    monto_afc_trab,
    iusc,
    total_prev_trab,
    total_desc_adicionales,
    total_descuentos,

    // Cargo empleador
    monto_afp_emp,
    pct_afp_emp:     tasaAFP.empleador,
    monto_sis,
    pct_sis:         ind.sis,
    monto_afc_emp,
    total_cargo_emp,

    // Resultado
    liquido,
    costo_empresa,

    // Referencias
    afp:             vars.afp,
    tipo_contrato:   vars.tipo_contrato,
    antiguedad_anios: vars.antiguedad_anios,
    descuentos_adicionales,
    haberes_variables: vars.haberes_imponibles.concat(vars.haberes_no_imponibles),
    horas_extra:     vars.horas_extra,
  };
}

/* ════════════════════════════════════════════════════════
   AFC — Seguro de Cesantía
   ════════════════════════════════════════════════════════ */
function _calcularAFCTrabajador(vars, ind, base_afc){
  // Solo cotiza el trabajador en contratos INDEFINIDOS (0,6%)
  // Indefinido 11+ años: solo empleador (0,8%), trabajador NO cotiza
  // Plazo fijo, temporada, casa particular: solo empleador
  if(vars.tipo_contrato !== 'indefinido') return 0;
  if(vars.antiguedad_anios >= 11) return 0; // 11+ años: tasa diferida, solo empleador
  const pct = (ind.afc?.indefinido?.trabajador || 0.6) / 100;
  return Math.round(base_afc * pct);
}

function _calcularAFCEmpleador(vars, ind, base_afc){
  let pct = 0;
  const afc = ind.afc || {};
  if(vars.tipo_contrato === 'fijo'){
    pct = (afc.fijo?.empleador || 3.0) / 100;
  } else if(vars.antiguedad_anios >= 11){
    pct = (afc.indefinido_11anios?.empleador || 0.8) / 100;
  } else {
    pct = (afc.indefinido?.empleador || 2.4) / 100;
  }
  return Math.round(base_afc * pct);
}

/* ════════════════════════════════════════════════════════
   IUSC — Impuesto Único de Segunda Categoría
   Art. 42 N°1 LIR — tabla progresiva mensual en UTM
   Tabla vigente a partir de 2025 (en UTM)
   ════════════════════════════════════════════════════════ */
function _calcularIUSC(base_mensual, ind){
  const utm = ind.utm || 0;
  if(!utm || base_mensual <= 0) return 0;

  // Tabla en UTM (Art. 43 N°1 LIR actualizada)
  // Tramos: [tope_utm, tasa, factor_deduccion_utm]
  const tabla = [
    { hasta: 13.5,  tasa: 0,     deduccion: 0      },
    { hasta: 30,    tasa: 0.04,  deduccion: 0.54   },
    { hasta: 50,    tasa: 0.08,  deduccion: 1.74   },
    { hasta: 70,    tasa: 0.135, deduccion: 4.49   },
    { hasta: 90,    tasa: 0.23,  deduccion: 11.14  },
    { hasta: 120,   tasa: 0.304, deduccion: 17.80  },
    { hasta: 310,   tasa: 0.35,  deduccion: 23.32  },
    { hasta: null,  tasa: 0.40,  deduccion: 38.82  },
  ];

  const base_utm = base_mensual / utm;
  let iusc = 0;

  for(const tramo of tabla){
    if(tramo.hasta === null || base_utm <= tramo.hasta){
      if(tramo.tasa === 0){
        iusc = 0;
      } else {
        iusc = Math.round((base_mensual * tramo.tasa) - (tramo.deduccion * utm));
      }
      break;
    }
  }

  return Math.max(0, iusc);
}

/* ── Normalizar clave AFP ───────────────────────────────── */
function _normalizarAfpKey(afp){
  if(!afp) return '';
  const a = afp.toLowerCase().trim();
  if(a.includes('capital'))   return 'capital';
  if(a.includes('cuprum'))    return 'cuprum';
  if(a.includes('habitat'))   return 'habitat';
  if(a.includes('planvital')) return 'planvital';
  if(a.includes('provida'))   return 'provida';
  if(a.includes('modelo'))    return 'modelo';
  if(a.includes('uno'))       return 'uno';
  return a;
}

/* ════════════════════════════════════════════════════════
   FUNCIÓN MASIVA — calcula todas las liquidaciones del período
   ════════════════════════════════════════════════════════ */
function calcularLiquidacionesPeriodo(periodo){
  const vars = construirVariablesPeriodo(periodo);
  return vars.map(v => calcularLiquidacion(v, periodo));
}

function calcularLiquidacionesMandante(periodo, mandanteId){
  const vars = construirVariablesMandante(periodo, mandanteId);
  return vars.map(v => calcularLiquidacion(v, periodo));
}

/* ── Resumen del período para UI ────────────────────────── */
function resumenLiquidacionesPeriodo(periodo){
  const liqs = calcularLiquidacionesPeriodo(periodo).filter(l => !l.error);
  return {
    total_trabajadores:  liqs.length,
    total_haberes:       liqs.reduce((s,l) => s + l.total_haberes, 0),
    total_desc_prev:     liqs.reduce((s,l) => s + l.total_prev_trab, 0),
    total_iusc:          liqs.reduce((s,l) => s + l.iusc, 0),
    total_liquido:       liqs.reduce((s,l) => s + l.liquido, 0),
    total_cargo_emp:     liqs.reduce((s,l) => s + l.total_cargo_emp, 0),
    total_costo_empresa: liqs.reduce((s,l) => s + l.costo_empresa, 0),
    liquidaciones:       liqs,
  };
}

