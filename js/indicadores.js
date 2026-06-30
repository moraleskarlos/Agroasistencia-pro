/* ════════════════════════════════════════════════════════
   INDICADORES.JS — Indicadores previsionales mensuales
   Lee PDF Previred, extrae valores, permite edición manual
   AgroAsistencia Pro · Versión 1.0
   ════════════════════════════════════════════════════════ */

/* ── TABS DEL MÓDULO REMUNERACIONES ────────────────────── */
function switchTabRem(tab){
  // Por ahora solo existe 'rem-indicadores'; se expande con calculo, liquidaciones, etc.
  document.querySelectorAll('[id^="tab-rem-"]').forEach(btn => {
    const activo = btn.id === 'tab-' + tab;
    btn.style.color = activo ? 'var(--verde-dark)' : 'var(--texto2)';
    btn.style.borderBottomColor = activo ? 'var(--verde-dark)' : 'transparent';
  });
  document.querySelectorAll('[id^="panel-rem-"]').forEach(panel => {
    panel.style.display = panel.id === 'panel-' + tab ? 'block' : 'none';
  });
}

const LOCAL_INDICADORES = 'agro_indicadores';

/* Estructura de un período de indicadores:
{
  periodo: '2025-09',           // mes de remuneración (no el mes de pago)
  uf: 39485.65,
  utm: 69265,
  uta: 831180,
  tope_imponible_afp: 3466840,  // 87.8 UF
  tope_imponible_afc: 5208157,  // 131.9 UF
  renta_minima: 529000,
  sis: 1.88,
  afp: {
    capital:  { trabajador: 11.44, empleador: 0.1, total: 11.54 },
    cuprum:   { trabajador: 11.44, empleador: 0.1, total: 11.54 },
    habitat:  { trabajador: 11.27, empleador: 0.1, total: 11.37 },
    planvital:{ trabajador: 11.16, empleador: 0.1, total: 11.26 },
    provida:  { trabajador: 11.45, empleador: 0.1, total: 11.55 },
    modelo:   { trabajador: 10.58, empleador: 0.1, total: 10.68 },
    uno:      { trabajador: 10.49, empleador: 0.1, total: 10.59 },
  },
  afc: {
    indefinido:           { empleador: 2.4, trabajador: 0.6 },
    fijo:                 { empleador: 3.0, trabajador: 0 },
    indefinido_11anios:   { empleador: 0.8, trabajador: 0 },
    casa_particular:      { empleador: 3.0, trabajador: 0 },
  },
  asignacion_familiar: [
    { tramo:'A', monto: 22007, hasta: 620251 },
    { tramo:'B', monto: 13505, hasta: 905941 },
    { tramo:'C', monto: 4267,  hasta: 1412957 },
    { tramo:'D', monto: 0,     hasta: null },
  ],
  fuente: 'pdf' | 'manual',
  campos_no_detectados: ['uta', 'afp.modelo.trabajador'], // para resaltar en UI
  fecha_registro: '2025-10-15',
}
*/

let indicadores = [];
let _indicadorEditando = null;
let _camposNoDetectados = [];

/* ── CARGA / GUARDADO ──────────────────────────────────── */
function cargarIndicadores(){
  try{ indicadores = JSON.parse(localStorage.getItem(LOCAL_INDICADORES)) || []; }
  catch{ indicadores = []; }
}

function guardarIndicadores(){
  localStorage.setItem(LOCAL_INDICADORES, JSON.stringify(indicadores));
}

function getIndicadoresPorPeriodo(periodo){
  return indicadores.find(i => i.periodo === periodo) || null;
}

/* ── INIT DEL MÓDULO ───────────────────────────────────── */
function initIndicadores(){
  cargarIndicadores();
  // Período por defecto: mes anterior (porque Previred publica para el mes en curso, remuneración del mes anterior)
  const hoy   = new Date();
  const mesAnt= new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
  const periodoDefault = `${mesAnt.getFullYear()}-${String(mesAnt.getMonth()+1).padStart(2,'0')}`;

  const selPeriodo = document.getElementById('ind-periodo-selector');
  if(selPeriodo && !selPeriodo.value) selPeriodo.value = periodoDefault;

  renderListaIndicadores();
  renderDetalleIndicador(selPeriodo?.value || periodoDefault);
}

function renderListaIndicadores(){
  const tbody = document.getElementById('tbody-indicadores');
  if(!tbody) return;

  if(!indicadores.length){
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--texto3);">
      Sin períodos registrados — sube el primer PDF de Previred</td></tr>`;
    return;
  }

  const ordenados = [...indicadores].sort((a,b) => b.periodo.localeCompare(a.periodo));

  tbody.innerHTML = ordenados.map(ind => {
    const [anio, mes] = ind.periodo.split('-');
    const nombreMes = new Date(anio, mes-1, 1).toLocaleDateString('es-CL', {month:'long', year:'numeric'});
    const pendientes = (ind.campos_no_detectados||[]).length;
    return `<tr style="cursor:pointer;" onclick="seleccionarPeriodoIndicador('${ind.periodo}')">
      <td style="font-size:13px;font-weight:600;text-transform:capitalize;">${nombreMes}</td>
      <td style="font-size:12px;">UF $${ind.uf?.toLocaleString('es-CL')||'—'}</td>
      <td style="font-size:12px;">UTM $${ind.utm?.toLocaleString('es-CL')||'—'}</td>
      <td>${pendientes
        ? `<span class="badge badge-amarillo">⚠️ ${pendientes} campo${pendientes>1?'s':''} manual</span>`
        : `<span class="badge badge-verde">✅ Completo</span>`}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();seleccionarPeriodoIndicador('${ind.periodo}')">
        <i class="ti ti-eye"></i> Ver</button></td>
    </tr>`;
  }).join('');
}

function seleccionarPeriodoIndicador(periodo){
  const sel = document.getElementById('ind-periodo-selector');
  if(sel) sel.value = periodo;
  renderDetalleIndicador(periodo);
}

/* ── SUBIDA Y LECTURA DEL PDF ──────────────────────────── */
async function procesarPdfPrevired(event){
  const file = event.target.files[0];
  if(!file) return;

  const statusEl = document.getElementById('ind-pdf-status');
  if(statusEl) statusEl.innerHTML = '<i class="ti ti-loader"></i> Leyendo PDF...';

  try{
    if(typeof pdfjsLib === 'undefined'){
      toast('❌ El lector de PDF no está disponible — revisa tu conexión', 'error');
      if(statusEl) statusEl.innerHTML = '';
      return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textoCompleto = '';

    for(let i = 1; i <= pdf.numPages; i++){
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      textoCompleto += content.items.map(it => it.str).join(' ') + '\n';
    }

    const resultado = extraerIndicadoresDeTexto(textoCompleto);

    if(statusEl) statusEl.innerHTML = '<i class="ti ti-circle-check" style="color:var(--verde-dark);"></i> PDF leído correctamente';

    _camposNoDetectados = resultado.campos_no_detectados;
    mostrarFormularioIndicador(resultado);

  } catch(err){
    console.error('Error leyendo PDF:', err);
    toast('❌ No se pudo leer el PDF — completa los datos manualmente', 'error');
    if(statusEl) statusEl.innerHTML = '<i class="ti ti-alert-triangle" style="color:var(--danger);"></i> Error al leer — completa manualmente';
    mostrarFormularioIndicador(_indicadorVacio());
  }
}

function _indicadorVacio(){
  return {
    periodo: document.getElementById('ind-periodo-selector')?.value || '',
    uf: null, utm: null, uta: null,
    tope_imponible_afp: null, tope_imponible_afc: null, renta_minima: null,
    sis: null,
    afp: {
      capital:{trabajador:null,empleador:null,total:null}, cuprum:{trabajador:null,empleador:null,total:null},
      habitat:{trabajador:null,empleador:null,total:null}, planvital:{trabajador:null,empleador:null,total:null},
      provida:{trabajador:null,empleador:null,total:null}, modelo:{trabajador:null,empleador:null,total:null},
      uno:{trabajador:null,empleador:null,total:null},
    },
    afc: {
      indefinido:{empleador:null,trabajador:null}, fijo:{empleador:null,trabajador:null},
      indefinido_11anios:{empleador:null,trabajador:null}, casa_particular:{empleador:null,trabajador:null},
    },
    asignacion_familiar: [
      {tramo:'A',monto:null,hasta:null}, {tramo:'B',monto:null,hasta:null},
      {tramo:'C',monto:null,hasta:null}, {tramo:'D',monto:0,hasta:null},
    ],
    fuente: 'manual',
    campos_no_detectados: ['todos'],
  };
}

/* ── MOTOR DE EXTRACCIÓN (REGEX SOBRE TEXTO DEL PDF) ───── */
function extraerIndicadoresDeTexto(texto){
  const r = _indicadorVacio();
  const noDetectados = [];
  const t = texto.replace(/\s+/g, ' '); // normalizar espacios

  // Helper: convierte "$ 39.485,65" o "$39485,65" o "39.485,65" a número
  const parseMonto = (str) => {
    if(!str) return null;
    const limpio = str.replace(/\$/g,'').replace(/\./g,'').replace(/,/g,'.').trim();
    const num = parseFloat(limpio);
    return isNaN(num) ? null : num;
  };
  const parsePct = (str) => {
    if(!str) return null;
    const limpio = str.replace(/%/g,'').replace(/,/g,'.').trim();
    const num = parseFloat(limpio);
    return isNaN(num) ? null : num;
  };

  // ── Período (detectar mes de remuneración del encabezado) ──
  const mPeriodo = t.match(/Remuneraciones\s+(\w+)\s+(\d{4})/i);
  if(mPeriodo){
    const meses = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
    const numMes = meses[mPeriodo[1].toLowerCase()];
    if(numMes) r.periodo = `${mPeriodo[2]}-${String(numMes).padStart(2,'0')}`;
  } else { noDetectados.push('periodo'); }

  // ── Valor UF (toma el primero, que es el más reciente del mes) ──
  const mUF = t.match(/Al\s+\d+\s+de\s+\w+\s+del?\s+\d{4}\s*:\s*\$\s*([\d.,]+)/i);
  r.uf = mUF ? parseMonto(mUF[1]) : null;
  if(r.uf === null) noDetectados.push('uf');

  // ── UTM ──
  const mUTM = t.match(/UTM[\s\S]{0,40}?\$\s*([\d.,]+)/i);
  r.utm = mUTM ? parseMonto(mUTM[1]) : null;
  if(r.utm === null) noDetectados.push('utm');

  // ── UTA ──
  const mUTA = t.match(/UTA[\s\S]{0,40}?\$\s*([\d.,]+)/i);
  r.uta = mUTA ? parseMonto(mUTA[1]) : null;
  if(r.uta === null) noDetectados.push('uta');

  // ── Tope imponible AFP (87,8 UF) ──
  const mTopeAFP = t.match(/afiliados\s+a\s+una\s+AFP[\s\S]{0,30}?\$\s*([\d.,]+)/i);
  r.tope_imponible_afp = mTopeAFP ? parseMonto(mTopeAFP[1]) : null;
  if(r.tope_imponible_afp === null) noDetectados.push('tope_imponible_afp');

  // ── Tope imponible AFC (131,9 UF) ──
  const mTopeAFC = t.match(/Seguro\s+de\s+Cesant[ií]a[\s\S]{0,40}?\$\s*([\d.,]+)/i);
  r.tope_imponible_afc = mTopeAFC ? parseMonto(mTopeAFC[1]) : null;
  if(r.tope_imponible_afc === null) noDetectados.push('tope_imponible_afc');

  // ── Renta mínima imponible (dependientes) ──
  const mRentaMin = t.match(/Trab\.?\s+Dependientes[\s\S]{0,40}?\$\s*([\d.,]+)/i);
  r.renta_minima = mRentaMin ? parseMonto(mRentaMin[1]) : null;
  if(r.renta_minima === null) noDetectados.push('renta_minima');

  // ── Tasa SIS ──
  const mSIS = t.match(/Tasa\s+SIS\s+([\d.,]+)\s*%/i);
  r.sis = mSIS ? parsePct(mSIS[1]) : null;
  if(r.sis === null) noDetectados.push('sis');

  // ── Tasas AFP por administradora ──
  const afpNombres = {
    capital:'Capital', cuprum:'Cuprum', habitat:'Habitat',
    planvital:'PlanVital', provida:'Provida', modelo:'Modelo', uno:'Uno',
  };
  Object.entries(afpNombres).forEach(([key, nombre]) => {
    // Busca: "Habitat 11,27% 0,1% 11,37% 13,15%"
    const regex = new RegExp(nombre + '\\s+([\\d.,]+)\\s*%\\s+([\\d.,]+)\\s*%\\s+([\\d.,]+)\\s*%', 'i');
    const m = t.match(regex);
    if(m){
      r.afp[key] = {
        trabajador: parsePct(m[1]),
        empleador:  parsePct(m[2]),
        total:      parsePct(m[3]),
      };
    } else {
      noDetectados.push(`afp.${key}`);
    }
  });

  // ── AFC por tipo de contrato ──
  // Plazo Indefinido: 2,4% R.I. 0,6% R.I.
  const mAfcIndef = t.match(/Plazo\s+Indefinido\s+([\d.,]+)\s*%[\s\S]{0,10}?([\d.,]+)\s*%/i);
  if(mAfcIndef){
    r.afc.indefinido = { empleador: parsePct(mAfcIndef[1]), trabajador: parsePct(mAfcIndef[2]) };
  } else { noDetectados.push('afc.indefinido'); }

  const mAfcFijo = t.match(/Plazo\s+Fijo\s+([\d.,]+)\s*%/i);
  if(mAfcFijo){
    r.afc.fijo = { empleador: parsePct(mAfcFijo[1]), trabajador: 0 };
  } else { noDetectados.push('afc.fijo'); }

  const mAfc11 = t.match(/Plazo\s+Indefinido\s+11\s+a[ñn]os[\s\S]{0,20}?([\d.,]+)\s*%/i);
  if(mAfc11){
    r.afc.indefinido_11anios = { empleador: parsePct(mAfc11[1]), trabajador: 0 };
  } else { noDetectados.push('afc.indefinido_11anios'); }

  const mAfcCasa = t.match(/Trabajador\s+de\s+Casa\s+Particular[\s\S]{0,20}?([\d.,]+)\s*%/i);
  if(mAfcCasa){
    r.afc.casa_particular = { empleador: parsePct(mAfcCasa[1]), trabajador: 0 };
  } else { noDetectados.push('afc.casa_particular'); }

  // ── Asignación familiar por tramo ──
  // "1 (A) $ 22.007 Renta < ó = $ 620.251"
  const tramosRegex = [
    { tramo:'A', re: /1\s*\(A\)\s*\$?\s*([\d.,]+)[\s\S]{0,30}?\$?\s*([\d.,]+)/i },
    { tramo:'B', re: /2\s*\(B\)\s*\$?\s*([\d.,]+)[\s\S]{0,30}?\$?\s*([\d.,]+)/i },
    { tramo:'C', re: /3\s*\(C\)\s*\$?\s*([\d.,]+)[\s\S]{0,30}?\$?\s*([\d.,]+)/i },
  ];
  tramosRegex.forEach(({tramo, re}) => {
    const m = t.match(re);
    const idx = r.asignacion_familiar.findIndex(a => a.tramo === tramo);
    if(m && idx >= 0){
      r.asignacion_familiar[idx].monto = parseMonto(m[1]);
      r.asignacion_familiar[idx].hasta = parseMonto(m[2]);
    } else {
      noDetectados.push(`asignacion_familiar.${tramo}`);
    }
  });
  // Tramo D no tiene monto (es 0) y no tiene tope superior — no se marca como no detectado

  r.fuente = 'pdf';
  r.campos_no_detectados = noDetectados;
  return r;
}

/* ── FORMULARIO DE REVISIÓN / EDICIÓN ──────────────────── */
function mostrarFormularioIndicador(ind){
  _indicadorEditando = ind;
  const wrap = document.getElementById('ind-form-wrap');
  if(wrap) wrap.style.display = 'block';

  // Generar grid de AFP dinámicamente (una sola vez)
  const afpGrid = document.getElementById('ind-afp-grid');
  if(afpGrid && !afpGrid.dataset.generado){
    const afpNombres = {capital:'Capital', cuprum:'Cuprum', habitat:'Habitat', planvital:'PlanVital', provida:'Provida', modelo:'Modelo', uno:'Uno'};
    afpGrid.innerHTML = Object.entries(afpNombres).map(([key, nombre]) => `
      <div class="form-group full" style="display:grid;grid-template-columns:90px 1fr 1fr 1fr;gap:8px;align-items:center;">
        <label style="margin:0;">${nombre}</label>
        <input type="number" id="ind-f-afp-${key}-trab" placeholder="Trabajador %" step="0.01">
        <input type="number" id="ind-f-afp-${key}-emp" placeholder="Empleador %" step="0.01">
        <input type="number" id="ind-f-afp-${key}-tot" placeholder="Total %" step="0.01">
      </div>`).join('');
    afpGrid.dataset.generado = '1';
  }

  const marcaSiFalta = (campo) => _camposNoDetectados.includes(campo) ? 'style="border-color:#F59E0B;background:#FFFBEB;"' : '';

  const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val ?? ''; };

  set('ind-f-periodo', ind.periodo);
  set('ind-f-uf', ind.uf);
  set('ind-f-utm', ind.utm);
  set('ind-f-uta', ind.uta);
  set('ind-f-tope-afp', ind.tope_imponible_afp);
  set('ind-f-tope-afc', ind.tope_imponible_afc);
  set('ind-f-renta-min', ind.renta_minima);
  set('ind-f-sis', ind.sis);

  Object.keys(ind.afp).forEach(key => {
    set(`ind-f-afp-${key}-trab`, ind.afp[key].trabajador);
    set(`ind-f-afp-${key}-emp`,  ind.afp[key].empleador);
    set(`ind-f-afp-${key}-tot`,  ind.afp[key].total);
  });

  set('ind-f-afc-indef-emp',  ind.afc.indefinido.empleador);
  set('ind-f-afc-indef-trab', ind.afc.indefinido.trabajador);
  set('ind-f-afc-fijo-emp',   ind.afc.fijo.empleador);
  set('ind-f-afc-11-emp',     ind.afc.indefinido_11anios.empleador);
  set('ind-f-afc-casa-emp',   ind.afc.casa_particular.empleador);

  ind.asignacion_familiar.forEach(a => {
    set(`ind-f-af-${a.tramo}-monto`, a.monto);
    set(`ind-f-af-${a.tramo}-hasta`, a.hasta);
  });

  // Resaltar visualmente los campos que vinieron vacíos
  _camposNoDetectados.forEach(campo => {
    const mapaIds = {
      'uf':'ind-f-uf', 'utm':'ind-f-utm', 'uta':'ind-f-uta',
      'tope_imponible_afp':'ind-f-tope-afp', 'tope_imponible_afc':'ind-f-tope-afc',
      'renta_minima':'ind-f-renta-min', 'sis':'ind-f-sis',
      'afc.indefinido':'ind-f-afc-indef-emp', 'afc.fijo':'ind-f-afc-fijo-emp',
      'afc.indefinido_11anios':'ind-f-afc-11-emp', 'afc.casa_particular':'ind-f-afc-casa-emp',
    };
    if(campo.startsWith('afp.')){
      const key = campo.split('.')[1];
      ['trab','emp','tot'].forEach(suf => {
        const el = document.getElementById(`ind-f-afp-${key}-${suf}`);
        if(el) el.style.background = '#FFFBEB', el.style.borderColor = '#F59E0B';
      });
    } else if(campo.startsWith('asignacion_familiar.')){
      const tramo = campo.split('.')[1];
      const el = document.getElementById(`ind-f-af-${tramo}-monto`);
      if(el) el.style.background = '#FFFBEB', el.style.borderColor = '#F59E0B';
    } else if(mapaIds[campo]){
      const el = document.getElementById(mapaIds[campo]);
      if(el) el.style.background = '#FFFBEB', el.style.borderColor = '#F59E0B';
    }
  });

  const avisoEl = document.getElementById('ind-aviso-pendientes');
  if(avisoEl){
    if(_camposNoDetectados.length){
      avisoEl.style.display = 'flex';
      avisoEl.querySelector('span').textContent =
        `${_camposNoDetectados.length} campo${_camposNoDetectados.length>1?'s':''} resaltado${_camposNoDetectados.length>1?'s':''} en amarillo no se detectó automáticamente. Revísalos y complétalos antes de guardar.`;
    } else {
      avisoEl.style.display = 'none';
    }
  }

  wrap?.scrollIntoView({ behavior:'smooth', block:'start' });
}

function limpiarResaltadoCampos(){
  document.querySelectorAll('#ind-form-wrap input').forEach(el => {
    el.style.background = '';
    el.style.borderColor = '';
  });
}

/* ── GUARDAR INDICADOR ─────────────────────────────────── */
function guardarIndicadorPeriodo(){
  const get  = (id) => document.getElementById(id)?.value || null;
  const getN = (id) => { const v = get(id); return v === null || v === '' ? null : parseFloat(v); };

  const periodo = get('ind-f-periodo');
  if(!periodo){ toast('⚠️ Indica el período (formato AAAA-MM)', 'error'); return; }

  const afpKeys = ['capital','cuprum','habitat','planvital','provida','modelo','uno'];
  const afp = {};
  afpKeys.forEach(key => {
    afp[key] = {
      trabajador: getN(`ind-f-afp-${key}-trab`),
      empleador:  getN(`ind-f-afp-${key}-emp`),
      total:      getN(`ind-f-afp-${key}-tot`),
    };
  });

  const nuevoIndicador = {
    periodo,
    uf:  getN('ind-f-uf'),
    utm: getN('ind-f-utm'),
    uta: getN('ind-f-uta'),
    tope_imponible_afp: getN('ind-f-tope-afp'),
    tope_imponible_afc: getN('ind-f-tope-afc'),
    renta_minima: getN('ind-f-renta-min'),
    sis: getN('ind-f-sis'),
    afp,
    afc: {
      indefinido:         { empleador: getN('ind-f-afc-indef-emp'), trabajador: getN('ind-f-afc-indef-trab') },
      fijo:               { empleador: getN('ind-f-afc-fijo-emp'),  trabajador: 0 },
      indefinido_11anios: { empleador: getN('ind-f-afc-11-emp'),    trabajador: 0 },
      casa_particular:    { empleador: getN('ind-f-afc-casa-emp'),  trabajador: 0 },
    },
    asignacion_familiar: ['A','B','C','D'].map(tramo => ({
      tramo,
      monto: getN(`ind-f-af-${tramo}-monto`) ?? 0,
      hasta: getN(`ind-f-af-${tramo}-hasta`),
    })),
    fuente: _indicadorEditando?.fuente || 'manual',
    campos_no_detectados: [], // al guardar, se asume que el usuario ya revisó todo
    fecha_registro: new Date().toISOString().slice(0,10),
  };

  const idx = indicadores.findIndex(i => i.periodo === periodo);
  if(idx >= 0) indicadores[idx] = nuevoIndicador;
  else indicadores.push(nuevoIndicador);

  guardarIndicadores();
  toast(`✅ Indicadores de ${periodo} guardados correctamente`, 'exito');

  document.getElementById('ind-form-wrap').style.display = 'none';
  limpiarResaltadoCampos();
  renderListaIndicadores();

  const sel = document.getElementById('ind-periodo-selector');
  if(sel) sel.value = periodo;
  renderDetalleIndicador(periodo);
}

function cancelarFormularioIndicador(){
  document.getElementById('ind-form-wrap').style.display = 'none';
  limpiarResaltadoCampos();
  const fileInput = document.getElementById('ind-pdf-input');
  if(fileInput) fileInput.value = '';
  const statusEl = document.getElementById('ind-pdf-status');
  if(statusEl) statusEl.innerHTML = '';
}

function nuevoIndicadorManual(){
  _camposNoDetectados = [];
  mostrarFormularioIndicador(_indicadorVacio());
}

/* ── VISTA DE DETALLE (SOLO LECTURA) ───────────────────── */
function renderDetalleIndicador(periodo){
  const cont = document.getElementById('ind-detalle-cont');
  if(!cont) return;

  const ind = getIndicadoresPorPeriodo(periodo);
  if(!ind){
    cont.innerHTML = `<div class="card" style="text-align:center;padding:30px;color:var(--texto3);">
      No hay indicadores registrados para este período.<br>Sube el PDF de Previred o ingrésalos manualmente.</div>`;
    return;
  }

  const [anio, mes] = periodo.split('-');
  const nombreMes = new Date(anio, mes-1, 1).toLocaleDateString('es-CL', {month:'long', year:'numeric'});

  cont.innerHTML = `
    <div class="g4" style="margin-bottom:16px;">
      <div class="kpi azul"><div class="kpi-label">Valor UF</div><div class="kpi-value">$${ind.uf?.toLocaleString('es-CL')||'—'}</div><div class="kpi-sub">${nombreMes}</div></div>
      <div class="kpi verde"><div class="kpi-label">UTM</div><div class="kpi-value">$${ind.utm?.toLocaleString('es-CL')||'—'}</div><div class="kpi-sub">valor mensual</div></div>
      <div class="kpi amarillo"><div class="kpi-label">Tope AFP</div><div class="kpi-value">$${ind.tope_imponible_afp?.toLocaleString('es-CL')||'—'}</div><div class="kpi-sub">87,8 UF</div></div>
      <div class="kpi rojo"><div class="kpi-label">SIS</div><div class="kpi-value">${ind.sis||'—'}%</div><div class="kpi-sub">seguro invalidez</div></div>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <div class="card-title"><i class="ti ti-building-bank"></i> Tasas por AFP</div>
      <div class="tabla-wrap">
        <table class="tabla" style="min-width:500px;">
          <thead><tr><th>AFP</th><th style="text-align:center;">Trabajador</th><th style="text-align:center;">Empleador</th><th style="text-align:center;">Total</th></tr></thead>
          <tbody>
            ${Object.entries(ind.afp).map(([key, v]) => `<tr>
              <td style="font-size:13px;font-weight:500;text-transform:capitalize;">${key}</td>
              <td style="text-align:center;font-size:13px;">${v.trabajador??'—'}%</td>
              <td style="text-align:center;font-size:13px;">${v.empleador??'—'}%</td>
              <td style="text-align:center;font-size:13px;font-weight:600;">${v.total??'—'}%</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="g2" style="margin-bottom:14px;">
      <div class="card">
        <div class="card-title"><i class="ti ti-briefcase"></i> Seguro de Cesantía (AFC)</div>
        <div style="font-size:13px;line-height:1.8;">
          <div style="display:flex;justify-content:space-between;"><span>Plazo Indefinido</span><strong>${ind.afc.indefinido.empleador??'—'}% emp · ${ind.afc.indefinido.trabajador??'—'}% trab</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>Plazo Fijo</span><strong>${ind.afc.fijo.empleador??'—'}% emp</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>Indefinido 11+ años</span><strong>${ind.afc.indefinido_11anios.empleador??'—'}% emp</strong></div>
          <div style="display:flex;justify-content:space-between;"><span>Casa Particular</span><strong>${ind.afc.casa_particular.empleador??'—'}% emp</strong></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ti ti-users"></i> Asignación Familiar</div>
        <div style="font-size:13px;line-height:1.8;">
          ${ind.asignacion_familiar.map(a => `<div style="display:flex;justify-content:space-between;">
            <span>Tramo ${a.tramo}</span><strong>$${a.monto?.toLocaleString('es-CL')||'0'}${a.hasta?' · hasta $'+a.hasta.toLocaleString('es-CL'):''}</strong>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary btn-sm" onclick="editarIndicadorExistente('${periodo}')"><i class="ti ti-edit"></i> Editar este período</button>
      <button class="btn btn-danger btn-sm" onclick="eliminarIndicadorPeriodo('${periodo}')"><i class="ti ti-trash"></i> Eliminar</button>
    </div>
  `;
}

function editarIndicadorExistente(periodo){
  const ind = getIndicadoresPorPeriodo(periodo);
  if(!ind) return;
  _camposNoDetectados = [];
  mostrarFormularioIndicador(ind);
}

function eliminarIndicadorPeriodo(periodo){
  if(!confirm(`¿Eliminar los indicadores de ${periodo}? Esto puede afectar liquidaciones ya calculadas con estos valores.`)) return;
  indicadores = indicadores.filter(i => i.periodo !== periodo);
  guardarIndicadores();
  renderListaIndicadores();
  document.getElementById('ind-detalle-cont').innerHTML = `<div class="card" style="text-align:center;padding:30px;color:var(--texto3);">Período eliminado</div>`;
  toast('🗑️ Período eliminado', 'exito');
}
