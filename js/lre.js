/* ════════════════════════════════════════════════════════
   LRE.JS — Libro de Remuneraciones Electrónico (Dirección del Trabajo)
   ✅ Auditoría Libro, paso 3 (23-11-2026).
   Art. 62 bis CT: los empleadores con 5 o más trabajadores deben subir
   cada mes el LRE al portal de la DT (mi.dt.gob.cl), a más tardar el
   día 15 del mes siguiente.
   Formato según el "Suplemento: Manual LRE" y las "Instrucciones de
   carga" de la DT:
   · CSV separado por punto y coma (;), codificación ANSI (Windows-1252).
   · Encabezado "Nombre(código)" por columna; montos enteros sin puntos;
     fechas dd/mm/aaaa; RUT sin puntos con guion.
   · Nombre del archivo: rutempleador_aaaamm.csv.
   · Cuadraturas: 5201 = 5210+5220+5230+5240; 5301 = 5341+5361+5302;
     5501 = 5201 − 5301.
   Los aportes de la reforma de pensiones (Ley 21.735) se informan en
   4155 junto al SIS, como hacen otros sistemas, mientras la DT no
   publique códigos propios.
   ════════════════════════════════════════════════════════ */

const LRE_COMUNAS = [[1101,'Iquique'],[1102,'Alto Hospicio'],[1401,'Pozo Almonte'],[1402,'Camiña'],[1403,'Colchane'],[1404,'Huara'],[1405,'Pica'],[2101,'Antofagasta'],[2102,'Mejillones'],[2103,'Sierra Gorda'],[2104,'Taltal'],[2201,'Calama'],[2202,'Ollagüe'],[2203,'San Pedro de Atacama'],[2301,'Tocopilla'],[2302,'María Elena'],[3101,'Copiapó'],[3102,'Caldera'],[3103,'Tierra Amarilla'],[3201,'Chañaral'],[3202,'Diego de Almagro'],[3301,'Vallenar'],[3302,'Alto del Carmen'],[3303,'Freirina'],[3304,'Huasco'],[4101,'La Serena'],[4102,'Coquimbo'],[4103,'Andacollo'],[4104,'La Higuera'],[4105,'Paiguano'],[4106,'Vicuña'],[4201,'Illapel'],[4202,'Canela'],[4203,'Los Vilos'],[4204,'Salamanca'],[4301,'Ovalle'],[4302,'Combarbalá'],[4303,'Monte Patria'],[4304,'Punitaqui'],[4305,'Río Hurtado'],[5101,'Valparaíso'],[5102,'Casablanca'],[5103,'Concón'],[5104,'Juan Fernández'],[5105,'Puchuncaví'],[5107,'Quintero'],[5109,'Viña del Mar'],[5201,'Isla de Pascua'],[5301,'Los Andes'],[5302,'Calle Larga'],[5303,'Rinconada'],[5304,'San Esteban'],[5401,'La Ligua'],[5402,'Cabildo'],[5403,'Papudo'],[5404,'Petorca'],[5405,'Zapallar'],[5501,'Quillota'],[5502,'Calera'],[5503,'Hijuelas'],[5504,'La Cruz'],[5506,'Nogales'],[5601,'San Antonio'],[5602,'Algarrobo'],[5603,'Cartagena'],[5604,'El Quisco'],[5605,'El Tabo'],[5606,'Santo Domingo'],[5701,'San Felipe'],[5702,'Catemu'],[5703,'Llaillay'],[5704,'Panquehue'],[5705,'Putaendo'],[5706,'Santa María'],[5801,'Quilpué'],[5802,'Limache'],[5803,'Olmué'],[5804,'Villa Alemana'],[6101,'Rancagua'],[6102,'Codegua'],[6103,'Coinco'],[6104,'Coltauco'],[6105,'Doñihue'],[6106,'Graneros'],[6107,'Las Cabras'],[6108,'Machalí'],[6109,'Malloa'],[6110,'Mostazal'],[6111,'Olivar'],[6112,'Peumo'],[6113,'Pichidegua'],[6114,'Quinta de Tilcoco'],[6115,'Rengo'],[6116,'Requínoa'],[6117,'San Vicente'],[6201,'Pichilemu'],[6202,'La Estrella'],[6203,'Litueche'],[6204,'Marchihue'],[6205,'Navidad'],[6206,'Paredones'],[6301,'San Fernando'],[6302,'Chépica'],[6303,'Chimbarongo'],[6304,'Lolol'],[6305,'Nancagua'],[6306,'Palmilla'],[6307,'Peralillo'],[6308,'Placilla'],[6309,'Pumanque'],[6310,'Santa Cruz'],[7101,'Talca'],[7102,'Constitución'],[7103,'Curepto'],[7104,'Empedrado'],[7105,'Maule'],[7106,'Pelarco'],[7107,'Pencahue'],[7108,'Río Claro'],[7109,'San Clemente'],[7110,'San Rafael'],[7201,'Cauquenes'],[7202,'Chanco'],[7203,'Pelluhue'],[7301,'Curicó'],[7302,'Hualañé'],[7303,'Licantén'],[7304,'Molina'],[7305,'Rauco'],[7306,'Romeral'],[7307,'Sagrada Familia'],[7308,'Teno'],[7309,'Vichuquén'],[7401,'Linares'],[7402,'Colbún'],[7403,'Longaví'],[7404,'Parral'],[7405,'Retiro'],[7406,'San Javier'],[7407,'Villa Alegre'],[7408,'Yerbas Buenas'],[8101,'Concepción'],[8102,'Coronel'],[8103,'Chiguayante'],[8104,'Florida'],[8105,'Hualqui'],[8106,'Lota'],[8107,'Penco'],[8108,'San Pedro de la Paz'],[8109,'Santa Juana'],[8110,'Talcahuano'],[8111,'Tomé'],[8112,'Hualpén'],[8201,'Lebu'],[8202,'Arauco'],[8203,'Cañete'],[8204,'Contulmo'],[8205,'Curanilahue'],[8206,'Los Alamos'],[8207,'Tirúa'],[8301,'Los Angeles'],[8302,'Antuco'],[8303,'Cabrero'],[8304,'Laja'],[8305,'Mulchén'],[8306,'Nacimiento'],[8307,'Negrete'],[8308,'Quilaco'],[8309,'Quilleco'],[8310,'San Rosendo'],[8311,'Santa Bárbara'],[8312,'Tucapel'],[8313,'Yumbel'],[8314,'Alto Biobío'],[9101,'Temuco'],[9102,'Carahue'],[9103,'Cunco'],[9104,'Curarrehue'],[9105,'Freire'],[9106,'Galvarino'],[9107,'Gorbea'],[9108,'Lautaro'],[9109,'Loncoche'],[9110,'Melipeuco'],[9111,'Nueva Imperial'],[9112,'Padre Las Casas'],[9113,'Perquenco'],[9114,'Pitrufquén'],[9115,'Pucón'],[9116,'Saavedra'],[9117,'Teodoro Schmidt'],[9118,'Toltén'],[9119,'Vilcún'],[9120,'Villarrica'],[9121,'Cholchol'],[9201,'Angol'],[9202,'Collipulli'],[9203,'Curacautín'],[9204,'Ercilla'],[9205,'Lonquimay'],[9206,'Los Sauces'],[9207,'Lumaco'],[9208,'Purén'],[9209,'Renaico'],[9210,'Traiguén'],[9211,'Victoria'],[10101,'Puerto Montt'],[10102,'Calbuco'],[10103,'Cochamó'],[10104,'Fresia'],[10105,'Frutillar'],[10106,'Los Muermos'],[10107,'Llanquihue'],[10108,'Maullín'],[10109,'Puerto Varas'],[10201,'Castro'],[10202,'Ancud'],[10203,'Chonchi'],[10204,'Curaco de Vélez'],[10205,'Dalcahue'],[10206,'Puqueldón'],[10207,'Queilén'],[10208,'Quellón'],[10209,'Quemchi'],[10210,'Quinchao'],[10301,'Osorno'],[10302,'Puerto Octay'],[10303,'Purranque'],[10304,'Puyehue'],[10305,'Río Negro'],[10306,'San Juan de la Costa'],[10307,'San Pablo'],[10401,'Chaitén'],[10402,'Futaleufú'],[10403,'Hualaihué'],[10404,'Palena'],[11101,'Coyhaique'],[11102,'Lago Verde'],[11201,'Aysén'],[11202,'Cisnes'],[11203,'Guaitecas'],[11301,'Cochrane'],[11302,'O\'Higgins'],[11303,'Tortel'],[11401,'Chile Chico'],[11402,'Río Ibáñez'],[12101,'Punta Arenas'],[12102,'Laguna Blanca'],[12103,'Río Verde'],[12104,'San Gregorio'],[12201,'Cabo de Hornos'],[12202,'Antártica'],[12301,'Porvenir'],[12302,'Primavera'],[12303,'Timaukel'],[12401,'Natales'],[12402,'Torres del Paine'],[13101,'Santiago'],[13102,'Cerrillos'],[13103,'Cerro Navia'],[13104,'Conchalí'],[13105,'El Bosque'],[13106,'Estación Central'],[13107,'Huechuraba'],[13108,'Independencia'],[13109,'La Cisterna'],[13110,'La Florida'],[13111,'La Granja'],[13112,'La Pintana'],[13113,'La Reina'],[13114,'Las Condes'],[13115,'Lo Barnechea'],[13116,'Lo Espejo'],[13117,'Lo Prado'],[13118,'Macul'],[13119,'Maipú'],[13120,'Ñuñoa'],[13121,'Pedro Aguirre Cerda'],[13122,'Peñalolén'],[13123,'Providencia'],[13124,'Pudahuel'],[13125,'Quilicura'],[13126,'Quinta Normal'],[13127,'Recoleta'],[13128,'Renca'],[13129,'San Joaquín'],[13130,'San Miguel'],[13131,'San Ramón'],[13132,'Vitacura'],[13201,'Puente Alto'],[13202,'Pirque'],[13203,'San José de Maipo'],[13301,'Colina'],[13302,'Lampa'],[13303,'Tiltil'],[13401,'San Bernardo'],[13402,'Buin'],[13403,'Calera de Tango'],[13404,'Paine'],[13501,'Melipilla'],[13502,'Alhué'],[13503,'Curacaví'],[13504,'María Pinto'],[13505,'San Pedro'],[13601,'Talagante'],[13602,'El Monte'],[13603,'Isla de Maipo'],[13604,'Padre Hurtado'],[13605,'Peñaflor'],[14101,'Valdivia'],[14102,'Corral'],[14103,'Lanco'],[14104,'Los Lagos'],[14105,'Máfil'],[14106,'Mariquina'],[14107,'Paillaco'],[14108,'Panguipulli'],[14201,'La Unión'],[14202,'Futrono'],[14203,'Lago Ranco'],[14204,'Río Bueno'],[15101,'Arica'],[15102,'Camarones'],[15201,'Putre'],[15202,'General Lagos'],[16101,'Chillán'],[16102,'Bulnes'],[16103,'Chillán Viejo'],[16104,'El Carmen'],[16105,'Pemuco'],[16106,'Pinto'],[16107,'Quillón'],[16108,'San Ignacio'],[16109,'Yungay'],[16201,'Quirihue'],[16202,'Cobquecura'],[16203,'Coelemu'],[16204,'Ninhue'],[16205,'Portezuelo'],[16206,'Ranquil'],[16207,'Treguaco'],[16301,'San Carlos'],[16302,'Coihueco'],[16303,'Ñiquén'],[16304,'San Fabián'],[16305,'San Nicolás']];

/* Columnas del archivo, en orden (código, encabezado) */
const LRE_COLUMNAS = [
  [1101,'Rut trabajador'],[1102,'Fecha inicio contrato'],[1103,'Fecha término de contrato'],[1104,'Causal término de contrato'],
  [1105,'Región prestación de servicios'],[1106,'Comuna prestación de servicios'],[1170,'Tipo impuesto a la renta'],
  [1146,'Técnico extranjero exención cot. previsionales'],[1107,'Código tipo de jornada'],[1108,'Persona con discapacidad - pensionado por invalidez'],
  [1109,'Pensionado por vejez'],[1141,'AFP'],[1142,'IPS (ExINP)'],[1143,'FONASA - ISAPRE'],[1151,'AFC'],[1110,'CCAF'],
  [1152,'Org. administrador ley 16.744'],[1111,'Nro cargas familiares legales autorizadas'],[1112,'Nro de cargas familiares maternales'],
  [1113,'Nro de cargas familiares invalidez'],[1114,'Tramo asignación familiar'],
  [1171,'Rut org sindical 1'],[1172,'Rut org sindical 2'],[1173,'Rut org sindical 3'],[1174,'Rut org sindical 4'],[1175,'Rut org sindical 5'],
  [1176,'Rut org sindical 6'],[1177,'Rut org sindical 7'],[1178,'Rut org sindical 8'],[1179,'Rut org sindical 9'],[1180,'Rut org sindical 10'],
  [1115,'Nro días trabajados en el mes'],[1116,'Nro días de licencia médica en el mes'],[1117,'Nro días de vacaciones en el mes'],
  [1118,'Subsidio trabajador joven'],[1154,'Puesto trabajo pesado'],[1155,'APVI'],[1157,'APVC'],[1131,'Indemnización a todo evento'],
  [1132,'Tasa indemnización a todo evento'],
  [2101,'Sueldo'],[2102,'Sobresueldo'],[2103,'Comisiones'],[2104,'Semana corrida'],[2105,'Participación'],[2106,'Gratificación'],
  [2107,'Recargo 30% día domingo'],[2108,'Remun. variable pagada en vacaciones'],[2109,'Remun. variable pagada en clausura'],[2110,'Aguinaldo'],
  [2111,'Bonos u otras remun. fijas mensuales'],[2112,'Tratos'],[2113,'Bonos u otras remun. variables mensuales o superiores a un mes'],
  [2114,'Ejercicio opción no pactada en contrato'],[2115,'Beneficios en especie constitutivos de remun'],[2116,'Remuneraciones bimestrales'],
  [2117,'Remuneraciones trimestrales'],[2118,'Remuneraciones cuatrimestral'],[2119,'Remuneraciones semestrales'],[2120,'Remuneraciones anuales'],
  [2121,'Participación anual'],[2122,'Gratificación anual'],[2123,'Otras remuneraciones superiores a un mes'],[2124,'Pago por horas de trabajo sindical'],
  [2161,'Sueldo empresarial'],
  [2201,'Subsidio por incapacidad laboral por licencia médica'],[2202,'Beca de estudio'],[2203,'Gratificaciones de zona'],[2204,'Otros ingresos no constitutivos de renta'],
  [2301,'Colación'],[2302,'Movilización'],[2303,'Viáticos'],[2304,'Asignación de pérdida de caja'],[2305,'Asignación de desgaste herramienta'],
  [2311,'Asignación familiar legal'],[2306,'Gastos por causa del trabajo'],[2307,'Gastos por cambio de residencia'],[2308,'Sala cuna'],
  [2309,'Asignación trabajo a distancia o teletrabajo'],[2347,'Depósito convenido hasta UF 900'],[2310,'Alojamiento por razones de trabajo'],
  [2312,'Asignación de traslación'],[2313,'Indemnización por feriado legal'],[2314,'Indemnización años de servicio'],
  [2315,'Indemnización sustitutiva del aviso previo'],[2316,'Indemnización fuero maternal'],[2331,'Pago indemnización a todo evento'],
  [2417,'Indemnizaciones voluntarias tributables'],[2418,'Indemnizaciones contractuales tributables'],
  [3141,'Cotización obligatoria previsional (AFP o IPS)'],[3143,'Cotización obligatoria salud 7%'],[3144,'Cotización voluntaria para salud'],
  [3151,'Cotización AFC - trabajador'],[3146,'Cotizaciones técnico extranjero para seguridad social fuera de Chile'],
  [3147,'Descuento depósito convenido hasta UF 900 anual'],[3155,'Cotización APVi Mod A'],[3156,'Cotización APVi Mod B hasta UF50'],
  [3157,'Cotización APVc Mod A'],[3158,'Cotización APVc Mod B hasta UF50'],[3161,'Impuesto retenido por remuneraciones'],
  [3162,'Impuesto retenido por indemnizaciones'],[3163,'Mayor retención de impuestos solicitada por el trabajador'],
  [3164,'Impuesto retenido por reliquidación remun. devengadas otros períodos'],[3165,'Diferencia impuesto reliquidación remun. devengadas en este período'],
  [3166,'Retención préstamo clase media 2020 (Ley 21.252)'],[3167,'Rebaja zona extrema DL 889'],
  [3171,'Cuota sindical 1'],[3172,'Cuota sindical 2'],[3173,'Cuota sindical 3'],[3174,'Cuota sindical 4'],[3175,'Cuota sindical 5'],
  [3176,'Cuota sindical 6'],[3177,'Cuota sindical 7'],[3178,'Cuota sindical 8'],[3179,'Cuota sindical 9'],[3180,'Cuota sindical 10'],
  [3110,'Crédito social CCAF'],[3181,'Cuota vivienda o educación'],[3182,'Crédito cooperativas de ahorro'],
  [3183,'Otros descuentos autorizados y solicitados por el trabajador'],[3154,'Cotización adicional trabajo pesado - trabajador'],
  [3184,'Donaciones culturales y de reconstrucción'],[3185,'Otros descuentos'],[3186,'Pensiones de alimentos'],[3187,'Descuento mujer casada'],
  [3188,'Descuentos por anticipos y préstamos'],
  [4151,'AFC - aporte empleador'],[4152,'Aporte empleador seguro accidentes del trabajo y Ley SANNA'],[4131,'Aporte empleador indemnización a todo evento'],
  [4154,'Aporte adicional trabajo pesado - empleador'],[4155,'Aporte empleador seguro invalidez y sobrevivencia'],[4157,'APVC - aporte empleador'],
  [5201,'Total haberes'],[5210,'Total haberes imponibles y tributables'],[5220,'Total haberes imponibles no tributables'],
  [5230,'Total haberes no imponibles y no tributables'],[5240,'Total haberes no imponibles y tributables'],[5301,'Total descuentos'],
  [5361,'Total descuentos impuestos a las remuneraciones'],[5362,'Total descuentos impuestos por indemnizaciones'],
  [5341,'Total descuentos por cotizaciones del trabajador'],[5302,'Total otros descuentos'],[5410,'Total aportes empleador'],
  [5501,'Total líquido'],[5502,'Total indemnizaciones'],[5564,'Total indemnizaciones tributables'],[5565,'Total indemnizaciones no tributables'],
];
/* Campos de identificación que van vacíos si no corresponden (no numéricos en 0) */
const LRE_VACIOS = new Set([1103,1104,1132,1171,1172,1173,1174,1175,1176,1177,1178,1179,1180]);

const LRE_AFP = { provida:6, planvital:11, cuprum:13, habitat:14, uno:19, capital:31, modelo:103 };
const LRE_SALUD = [['fonasa',102],['cruz blanca',1],['banmedica',3],['colmena',4],['consalud',9],['vida tres',12],
  ['chuquicamata',37],['cruz del norte',38],['fusat',39],['fundacion',40],['rio blanco',41],['san lorenzo',42],['masvida',43],['mas vida',43]];
const LRE_CAUSAL = { mutuo_acuerdo:3, renuncia:4, vencimiento_plazo:6, conclusion_obra:7, art160_3:12, art160_4:13, art160_7:16, necesidades_empresa:18 };
const LRE_LETRA_160_1 = { a:24, b:25, c:26, d:27, e:28, f:29 };

function _lreNorm(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function _lreRut(r){ return String(r || '').replace(/\./g, '').replace(/^0+/, '').toUpperCase(); }
function _lreFecha(f){ return f ? `${f.slice(8,10)}/${f.slice(5,7)}/${f.slice(0,4)}` : ''; }
function _lreComuna(nombre){
  const n = _lreNorm(nombre);
  if(!n) return null;
  const hit = LRE_COMUNAS.find(([, c]) => _lreNorm(c) === n) || LRE_COMUNAS.find(([, c]) => n.includes(_lreNorm(c)) && _lreNorm(c).length > 4);
  return hit ? { comuna: hit[0], region: Math.floor(hit[0] / 1000), nombre: hit[1] } : null;
}
function _lreSalud(sistema){
  const n = _lreNorm(sistema);
  if(!n || n === 'fonasa') return 102;
  const hit = LRE_SALUD.find(([k]) => n.includes(k));
  return hit ? hit[1] : null;
}
function _lreBonoCodigo(h){
  if(/vacaci/i.test(h.observacion || '')) return 2108;
  const t = h.tipo || '';
  if(t === 'colacion') return 2301;
  if(t === 'movilizacion') return 2302;
  if(t === 'viatico') return 2303;
  if(t === 'bono_responsabilidad' || t === 'asignacion_especial') return 2111;
  return 2113; // producción, asistencia, puntualidad, otro: variables
}
function _lreDescCodigo(d){
  return ({ anticipo:3188, prestamo:3188, caja_compensacion:3110, retencion_judicial:3186 })[d.tipo] || 3185;
}

/* Arma la fila LRE de una liquidación. Devuelve { fila: {codigo: valor}, errores: [], avisos: [] } */
function _lreFila(l, periodo){
  const errores = [], avisos = [];
  const v = {}; LRE_COLUMNAS.forEach(([c]) => v[c] = LRE_VACIOS.has(c) ? '' : 0);
  const t   = trabajadores.find(x => x.rut === l.rut) || {};
  const c   = _getContratoVigente(l.rut, periodo) || {};
  const ep  = getEmpresaEmpleadora(c.empresa_propia_id || t.empresa_propia_id) || {};
  let cfg = (typeof previred_cfg !== 'undefined' && previred_cfg) ? previred_cfg : null;
  if(!cfg || !Object.keys(cfg).length){ try{ cfg = JSON.parse(localStorage.getItem('agro_previred_cfg')) || {}; }catch(e){ cfg = {}; } }
  const cfgEmp = cfg[c.empresa_propia_id || t.empresa_propia_id] || {};

  // ── Identificación ──
  v[1101] = _lreRut(l.rut);
  v[1102] = _lreFecha(c.fecha_inicio || t.fecha_ingreso);
  if(!v[1102]) errores.push('sin fecha de inicio de contrato');
  const fin = (typeof finiquitos_guardados !== 'undefined' ? finiquitos_guardados : [])
    .find(f => f.rut === l.rut && (f.fecha_termino || '').slice(0,7) === periodo);
  const ter = fin?.fecha_termino || ((c.fecha_termino || '').slice(0,7) === periodo ? c.fecha_termino : '');
  if(ter){
    v[1103] = _lreFecha(ter);
    if(fin){
      v[1104] = fin.causal === 'art160_1' ? (LRE_LETRA_160_1[fin.causal_letra] || '') : (LRE_CAUSAL[fin.causal] || '');
      if(!v[1104]) errores.push('causal de término sin código LRE');
    } else {
      errores.push(`el contrato termina el ${_lreFecha(ter)} y no tiene finiquito generado (falta la causal de término)`);
    }
  }
  const loc = _lreComuna(c.mandante_comuna) || _lreComuna(ep.comuna);
  if(loc){ v[1105] = loc.region; v[1106] = loc.comuna; if(!_lreComuna(c.mandante_comuna)) avisos.push(`comuna de la faena no reconocida; se usó la de la empresa (${loc.nombre})`); }
  else errores.push('sin comuna de prestación de servicios reconocible (revisa la comuna del mandante en el contrato o de la empresa)');
  v[1170] = 1;
  const hs = parseFloat(c.horas_semanales) || 0;
  const jMax = (typeof _jornadaMaximaLegal === 'function') ? _jornadaMaximaLegal(`${periodo}-15`) : 44;
  v[1107] = (hs > 0 && hs <= Math.round(jMax * 2 / 3)) ? 201 : 101;
  v[1108] = t.pensionado_invalidez_parcial ? 3 : 0;
  const afpK = _lreNorm(t.afiliacion_afp || l.afp).replace(/\s/g, '');
  v[1141] = LRE_AFP[afpK] ?? (afpK ? null : 100);
  if(v[1141] == null){ errores.push(`AFP "${t.afiliacion_afp || l.afp}" sin código LRE`); v[1141] = 0; }
  const salud = _lreSalud(t.sistema_salud || l.sistema_salud);
  if(salud == null){ errores.push(`indica el nombre de la Isapre (dice "${t.sistema_salud || l.sistema_salud}")`); v[1143] = 0; } else v[1143] = salud;
  v[1151] = 1;
  v[1110] = parseInt(cfgEmp.ccaf || '0', 10) || 0;
  v[1152] = parseInt(cfgEmp.mutual || '0', 10) || 0;
  v[1114] = 'D';

  // ── Días ──
  v[1115] = Math.max(0, 30 - (l.dias_a_descontar || 0));
  v[1116] = Math.min(30, l.dias_licencia_medica || 0);
  const [a, m] = periodo.split('-').map(Number);
  const ultimo = `${periodo}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2,'0')}`;
  v[1117] = (novedades || []).filter(n => n.trabajador_rut === l.rut && n.tipo === 'vacaciones' && n.aprobado !== false)
    .reduce((s, n) => {
      const d = n.fecha_inicio < `${periodo}-01` ? `${periodo}-01` : n.fecha_inicio;
      const h = (n.fecha_fin || n.fecha_inicio) > ultimo ? ultimo : (n.fecha_fin || n.fecha_inicio);
      return d > h ? s : s + (typeof _diasHabilesFeriado === 'function' ? _diasHabilesFeriado(d, h) : 0);
    }, 0);

  // ── Haberes ──
  const sueldo = l.sueldo_proporcional ?? l.sueldo_base ?? 0;
  v[2101] = Math.round(sueldo);
  v[2102] = (l.horas_extra || []).reduce((s, h) => s + (h.monto_imponible || 0), 0);
  v[2106] = Math.round(l.gratificacion || 0);
  (l.haberes_variables || []).forEach(h => { const k = _lreBonoCodigo(h); v[k] += Math.round(parseFloat(h.monto) || 0); });
  // Ajustes de meses cerrados (no cotizan): positivo como ingreso no
  // constitutivo de renta, negativo como otro descuento — así cuadra el
  // líquido. Se avisa para revisarlo con el contador.
  const ajustes = Math.round(l.total_ajustes || 0);
  if(ajustes > 0){ v[2204] += ajustes; avisos.push(`ajuste por corrección de $${ajustes.toLocaleString('es-CL')} informado en 2204 — revísalo con tu contador`); }

  // ── Descuentos ──
  v[3141] = Math.round(l.monto_afp || 0);
  v[3143] = Math.round(l.monto_salud || 0);
  v[3151] = Math.round(l.monto_afc_trab || 0);
  v[3161] = Math.round(l.iusc || 0);
  (l.descuentos_adicionales || []).forEach(d => { const k = _lreDescCodigo(d); v[k] += Math.round(parseFloat(d.monto) || 0); });
  if(ajustes < 0){ v[3185] += -ajustes; avisos.push(`ajuste negativo por corrección de $${(-ajustes).toLocaleString('es-CL')} informado en 3185`); }

  // ── Finiquito del mes (indemnizaciones) ──
  if(fin){
    v[2313] = Math.round(fin.monto_vacaciones || 0);
    v[2314] = Math.max(0, Math.round((fin.monto_anios_servicio || 0) - (fin.descuento_afc || 0)));
    v[2315] = Math.round(fin.monto_aviso_previo || 0);
    v[3186] += Math.round(fin.alimentos_aplicado || 0);
    v[3188] += Math.round(fin.descuentos_aplicados ?? fin.total_descuentos ?? 0);
    if(fin.sueldo_pendiente > 0) avisos.push('finiquito antiguo con sueldo pendiente dentro del finiquito: revisa que no se duplique con la liquidación');
  }

  // ── Aportes del empleador ──
  v[4151] = Math.round(l.monto_afc_emp || 0);
  v[4152] = (typeof _aportePatronal === 'function')
    ? Math.max(0, _aportePatronal(l) - (l.monto_afp_emp||0) - (l.monto_sis||0) - (l.monto_afc_emp||0) - (l.monto_exp_vida||0) - (l.monto_rentabilidad_protegida||0))
    : Math.round(l.monto_mutual || 0);
  v[4155] = Math.round((l.monto_sis||0) + (l.monto_afp_emp||0) + (l.monto_exp_vida||0) + (l.monto_rentabilidad_protegida||0));

  // ── Totales (cuadraturas de la DT) ──
  const suma = (desde, hasta) => LRE_COLUMNAS.filter(([c]) => c >= desde && c <= hasta).reduce((s, [c]) => s + (+v[c] || 0), 0);
  v[5210] = suma(2101, 2199);
  v[5220] = suma(2201, 2299);
  v[5230] = suma(2301, 2399);
  v[5240] = suma(2401, 2499);
  v[5201] = v[5210] + v[5220] + v[5230] + v[5240];
  v[5341] = v[3141] + v[3143] + v[3144] + v[3151] + v[3154];
  v[5361] = v[3161];
  v[5362] = v[3162];
  v[5302] = suma(3101, 3199) - v[5341] - v[5361] - v[5362];
  v[5301] = v[5341] + v[5361] + v[5362] + v[5302];
  v[5410] = suma(4101, 4199);
  v[5501] = v[5201] - v[5301];
  v[5502] = v[2313] + v[2314] + v[2315] + v[2316] + v[2331];
  v[5565] = v[5502];

  // Control: el líquido del LRE debe coincidir con lo pagado
  const pagado = Math.round((l.liquido || 0) + (fin ? (fin.total_a_pagar || 0) : 0));
  if(v[5501] !== pagado) errores.push(`el líquido del LRE ($${v[5501].toLocaleString('es-CL')}) no cuadra con lo pagado ($${pagado.toLocaleString('es-CL')})`);
  if(v[1115] + v[1116] > 30) avisos.push('días trabajados + licencia superan 30');
  return { fila: v, errores, avisos, nombre: l.nombre };
}

/* Genera el contenido del archivo y el reporte de validación */
function _lreConstruir(periodo, empresaId){
  const lista = _getLiquidacionesPeriodo(periodo, empresaId);
  const filas = lista.map(l => _lreFila(l, periodo));
  const generales = [];
  // trabajadores con contrato en el mes y sin liquidación generada
  if(typeof _trabajadoresDelPeriodo === 'function'){
    const sinLiq = _trabajadoresDelPeriodo(empresaId, periodo).filter(t => !lista.some(l => l.rut === t.rut));
    if(sinLiq.length) generales.push({ tipo:'error', texto: `${sinLiq.length} trabajador${sinLiq.length!==1?'es':''} con contrato en el mes sin liquidación generada: ${sinLiq.map(t => t.nombre).join(', ')}` });
  }
  if(typeof _estadoLiquidacion === 'function'){
    const desact = lista.filter(l => _estadoLiquidacion(l.rut, periodo).estado === 'desactualizada');
    if(desact.length) generales.push({ tipo:'aviso', texto: `${desact.length} liquidación${desact.length!==1?'es':''} con datos cambiados (🟡): ${desact.map(l => l.nombre).join(', ')} — reábrelas antes de subir el LRE` });
  }
  const encabezado = LRE_COLUMNAS.map(([c, n]) => `${n}(${c})`).join(';');
  const cuerpo = filas.map(f => LRE_COLUMNAS.map(([c]) => String(f.fila[c] ?? '')).join(';'));
  return { lista, filas, generales, csv: [encabezado, ...cuerpo].join('\r\n') + '\r\n' };
}

/* Codificación ANSI (Windows-1252): los acentos y la ñ ocupan 1 byte */
function _lreAnsi(texto){
  const bytes = new Uint8Array(texto.length);
  for(let i = 0; i < texto.length; i++){ const c = texto.charCodeAt(i); bytes[i] = c < 256 ? c : 63; }
  return bytes;
}

function _lreNombreArchivo(periodo, empresaId){
  const ep = getEmpresaEmpleadora(empresaId) || {};
  return `${_lreRut(ep.rut || 'sin-rut').replace('-', '')}_${periodo.replace('-', '')}.csv`;
}

function descargarLRE(){
  const periodo = document.getElementById('libro-periodo-selector')?.value || '';
  const empresa = document.getElementById('libro-filtro-empresa')?.value || '';
  if(!empresa){ toast('⚠️ Elige la empresa empleadora: el LRE se sube por cada RUT de empleador', 'error'); return; }
  const r = _lreConstruir(periodo, empresa);
  if(!r.lista.length){ toast('⚠️ Sin liquidaciones generadas para este período', 'error'); return; }
  const nErr = r.filas.reduce((s, f) => s + f.errores.length, 0) + r.generales.filter(g => g.tipo === 'error').length;
  if(nErr && !confirm(`⚠️ El archivo tiene ${nErr} error${nErr!==1?'es':''} que la DT probablemente rechazará (ver el detalle en pantalla).\n\n¿Descargarlo igual?`)) return;
  const blob = new Blob([_lreAnsi(r.csv)], { type: 'text/csv;charset=windows-1252' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = _lreNombreArchivo(periodo, empresa);
  document.body.appendChild(a); a.click(); a.remove();
  toast(`⬇️ LRE descargado: ${a.download}`, 'exito');
}

/* Vista 3 del Libro */
function _renderLRE(periodo){
  const empresa = document.getElementById('libro-filtro-empresa')?.value || '';
  const fmtM = v => '$' + Math.round(v || 0).toLocaleString('es-CL');
  const [a, m] = periodo.split('-').map(Number);
  const nombreMes = new Date(a, m-1, 1).toLocaleDateString('es-CL', { month:'long', year:'numeric' });
  const plazo = `15 de ${new Date(a, m, 1).toLocaleDateString('es-CL', { month:'long', year:'numeric' })}`;
  const cab = `<div style="font-size:15px;font-weight:700;">LRE — Archivo para la Dirección del Trabajo</div>
    <div style="font-size:12px;color:var(--texto2);margin-top:2px;">Libro de Remuneraciones Electrónico (Art. 62 bis CT) · obligatorio con 5 o más trabajadores · se sube en mi.dt.gob.cl hasta el ${plazo}</div>`;
  if(!empresa) return `<div class="card">${cab}<div style="margin-top:14px;padding:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;color:#1e3a8a;">
    Elige la <strong>empresa empleadora</strong> arriba: el LRE se sube por separado para cada RUT de empleador.</div></div>`;
  const r = _lreConstruir(periodo, empresa);
  const ep = getEmpresaEmpleadora(empresa) || {};
  if(!r.lista.length) return `<div class="card">${cab}<div style="margin-top:14px;color:var(--texto3);">Sin liquidaciones generadas para ${nombreMes}.</div></div>`;
  const errs = [], avis = [];
  r.generales.forEach(g => (g.tipo === 'error' ? errs : avis).push(g.texto));
  r.filas.forEach(f => { f.errores.forEach(e => errs.push(`${f.nombre}: ${e}`)); f.avisos.forEach(e => avis.push(`${f.nombre}: ${e}`)); });
  const T = k => r.filas.reduce((s, f) => s + (+f.fila[k] || 0), 0);
  const estado = errs.length
    ? `<div style="padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:13px;"><strong>❌ ${errs.length} error${errs.length!==1?'es':''} por corregir antes de subir:</strong><ul style="margin:6px 0 0 18px;">${errs.map(e => `<li>${e}</li>`).join('')}</ul></div>`
    : `<div style="padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#166534;font-size:13px;"><strong>✅ Listo para subir.</strong> Las cuadraturas de la DT (haberes, descuentos y líquido) calzan en todos los trabajadores.</div>`;
  const avisos = avis.length ? `<div style="margin-top:8px;padding:10px 12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;color:#92400e;font-size:12.5px;"><strong>⚠️ Revisar:</strong><ul style="margin:6px 0 0 18px;">${avis.map(e => `<li>${e}</li>`).join('')}</ul></div>` : '';
  const filas = r.filas.map((f, i) => `<tr style="${i%2?'background:#F8FAFC':''}">
      <td>${f.fila[1101]}</td><td>${f.nombre}</td><td style="text-align:center;">${f.fila[1115]}</td><td style="text-align:center;">${f.fila[1116]}</td>
      <td style="text-align:center;">${f.fila[1106] || '—'}</td><td style="text-align:center;">${f.fila[1104] || ''}</td>
      <td style="text-align:right;">${fmtM(f.fila[5201])}</td><td style="text-align:right;">${fmtM(f.fila[5301])}</td>
      <td style="text-align:right;font-weight:700;">${fmtM(f.fila[5501])}</td><td style="text-align:right;">${fmtM(f.fila[5410])}</td>
      <td style="text-align:center;">${f.errores.length ? '❌' : (f.avisos.length ? '⚠️' : '✅')}</td></tr>`).join('');
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
      <div>${cab}<div style="font-size:12px;color:var(--texto2);margin-top:4px;">${ep.razon_social || ep.nombre || ''} · RUT ${ep.rut || '—'} · ${_capitalizar(nombreMes)} · ${r.lista.length} trabajador${r.lista.length!==1?'es':''}</div></div>
      <button class="btn btn-primary btn-sm" onclick="descargarLRE()"><i class="ti ti-file-download"></i> Descargar archivo LRE (${_lreNombreArchivo(periodo, empresa)})</button>
    </div>
    ${estado}${avisos}
    <div class="tabla-wrap" style="margin-top:12px;"><table class="tabla" style="font-size:12px;">
      <thead><tr><th>RUT (1101)</th><th>Nombre</th><th>Días trab. (1115)</th><th>Días lic. (1116)</th><th>Comuna (1106)</th><th>Causal (1104)</th>
        <th style="text-align:right;">Total haberes (5201)</th><th style="text-align:right;">Total desc. (5301)</th><th style="text-align:right;">Líquido (5501)</th><th style="text-align:right;">Aportes emp. (5410)</th><th>Estado</th></tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr style="font-weight:700;background:var(--gris-bg);"><td colspan="6">TOTALES</td><td style="text-align:right;">${fmtM(T(5201))}</td><td style="text-align:right;">${fmtM(T(5301))}</td><td style="text-align:right;">${fmtM(T(5501))}</td><td style="text-align:right;">${fmtM(T(5410))}</td><td></td></tr></tfoot>
    </table></div>
    <div style="margin-top:12px;font-size:12px;color:var(--texto2);line-height:1.6;">
      <strong>Cómo subirlo:</strong> entra a mi.dt.gob.cl con la Clave Única o Clave DT del representante → Libro de Remuneraciones Electrónico → elige año y mes → "Archivo CSV" → selecciona el archivo descargado → "Enviar declaración". La DT valida la forma en segundos y el fondo en hasta 48 horas; si hay observaciones, corrige y vuelve a subirlo (el último archivo es el que vale).
      Incluye los finiquitos del mes (indemnizaciones en 2313–2315). Los aportes de la reforma de pensiones se informan en 4155 junto al SIS hasta que la DT publique códigos propios.
    </div>
  </div>`;
}
