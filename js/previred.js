/* ════════════════════════════════════════════════════════
   PREVIRED.JS — Archivo de pago de cotizaciones
   Formato oficial PreviRed — Estándar Largo Variable por
   Separador ";" — 105 campos — Versión 82 (jun 2025)
   Vigente desde remuneración de Agosto 2025
   Fuente: previred.com/wp-content/uploads/2025/07/
           FormatoLargoVariablePorSeparador-Reforma-1.pdf
   AgroContratista · Versión 1.0
   ════════════════════════════════════════════════════════ */

const LOCAL_PREVIRED_CFG = 'agro_previred_cfg'; // config por empresa propia (mutual/ccaf)
let previred_cfg = {};

/* ── CARGA / GUARDADO CONFIG ────────────────────────────── */
function cargarPreviredCfg(){
  try{ previred_cfg = JSON.parse(localStorage.getItem(LOCAL_PREVIRED_CFG)) || {}; }
  catch{ previred_cfg = {}; }
}
function guardarPreviredCfg(){
  localStorage.setItem(LOCAL_PREVIRED_CFG, JSON.stringify(previred_cfg));
}

/* ── INIT ───────────────────────────────────────────────── */
function initPrevired(){
  cargarLiquidaciones();
  cargarIndicadores();
  cargarPreviredCfg();
  switchTabPrevision('rem-previred');

  const hoy    = new Date();
  const mesAnt = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
  const periodoDefault = `${mesAnt.getFullYear()}-${String(mesAnt.getMonth()+1).padStart(2,'0')}`;

  const sel = document.getElementById('prev-periodo-selector');
  if(sel && !sel.value) sel.value = periodoDefault;

  _poblarFiltroEmpresaPrevired();
  renderPrevired();
}

function _poblarFiltroEmpresaPrevired(){
  const sel = document.getElementById('prev-empresa-selector');
  if(!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">— Selecciona empresa propia —</option>'
    + (empresas_propias||[]).map(e => `<option value="${e.id}">${e.nombre||e.razon_social}</option>`).join('');
  if(val) sel.value = val;
}

/* ── OBTENER LIQUIDACIONES + TRABAJADOR DE LA EMPRESA PROPIA SELECCIONADA ── */
function _getLiqConTrabajadorPrevired(periodo, empresaId){
  let lista = liquidaciones_guardadas.filter(l => l.periodo === periodo);
  if(empresaId){
    lista = lista.filter(l => {
      const t = trabajadores.find(x => x.rut === l.rut);
      return t?.empresa_propia_id === empresaId;
    });
  }
  return lista
    .map(l => ({ liq: l, t: trabajadores.find(x => x.rut === l.rut) }))
    .filter(x => x.t)
    .sort((a,b) => (a.t.nombre||'').localeCompare(b.t.nombre||''));
}

/* ── RENDER PRINCIPAL ───────────────────────────────────── */
function renderPrevired(){
  const periodo   = document.getElementById('prev-periodo-selector')?.value || '';
  const empresaId = document.getElementById('prev-empresa-selector')?.value || '';
  const cont      = document.getElementById('prev-contenido');
  if(!cont) return;

  if(!empresaId){
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--texto3);">
      Selecciona una empresa propia para generar su archivo de Previred.</div>`;
    return;
  }
  if(!periodo){
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--texto3);">
      Selecciona el período.</div>`;
    return;
  }

  const lista = _getLiqConTrabajadorPrevired(periodo, empresaId);
  if(!lista.length){
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--texto3);">
      Sin liquidaciones generadas para esta empresa en este período.<br><br>
      <button class="btn btn-primary btn-sm" onclick="irA('remuneraciones')">
        <i class="ti ti-file-invoice"></i> Ir a Liquidaciones
      </button>
    </div>`;
    return;
  }

  const faltantes = lista.filter(x => _faltanDatosObligatorios(x.t, x.liq));
  const cfgEmp    = previred_cfg[empresaId] || {};
  const errGen    = _erroresGeneralesPrevired(periodo, cfgEmp);
  const multiMov  = lista.map(x => ({ x, movs: _movimientosPrevired(x.t, x.liq, periodo) })).filter(m => m.movs.length > 1);
  const bloqueado = faltantes.length || errGen.length;

  cont.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-title card-title-oscuro"><i class="ti ti-settings"></i> Configuración de la empresa (Mutual / CCAF)</div>
      <div style="font-size:12px;color:var(--texto2);margin-bottom:10px;">
        Estos códigos son por empresa y se piden una sola vez. Si no tienes Mutual o CCAF, deja "Sin Mutual" / "Sin CCAF".
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Mutual de seguridad</label>
          <select id="prev-cfg-mutual">
            <option value="00" ${!cfgEmp.mutual||cfgEmp.mutual==='00'?'selected':''}>Sin Mutual (cotiza a ISL)</option>
            <option value="01" ${cfgEmp.mutual==='01'?'selected':''}>01 · ACHS</option>
            <option value="02" ${cfgEmp.mutual==='02'?'selected':''}>02 · Mutual de Seguridad CChC</option>
            <option value="03" ${cfgEmp.mutual==='03'?'selected':''}>03 · Instituto de Seguridad del Trabajo (IST)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tasa cotización accidentes del trabajo (%)</label>
          <input type="text" id="prev-cfg-tasa-mutual" placeholder="0,93" value="${cfgEmp.tasa_mutual||''}">
          <div style="font-size:11px;color:var(--texto3);margin-top:3px;">Básica 0,93% + adicional de tu empresa. Sin Mutual, se paga al ISL con esta misma tasa (0,93% si la dejas vacía).</div>
        </div>
        <div class="form-group">
          <label>Sucursal de pago Mutual</label>
          <input type="text" id="prev-cfg-sucursal-mutual" placeholder="Código asignado por la Mutual" value="${cfgEmp.sucursal_mutual||''}">
        </div>
        <div class="form-group">
          <label>Caja de Compensación (CCAF)</label>
          <select id="prev-cfg-ccaf">
            <option value="00" ${!cfgEmp.ccaf||cfgEmp.ccaf==='00'?'selected':''}>Sin CCAF</option>
            <option value="01" ${cfgEmp.ccaf==='01'?'selected':''}>01 · Los Andes</option>
            <option value="02" ${cfgEmp.ccaf==='02'?'selected':''}>02 · La Araucana</option>
            <option value="03" ${cfgEmp.ccaf==='03'?'selected':''}>03 · Los Héroes</option>
            <option value="06" ${cfgEmp.ccaf==='06'||cfgEmp.ccaf==='04'?'selected':''}>06 · 18 de Septiembre</option>
          </select>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="_guardarCfgPrevired('${empresaId}')">
        <i class="ti ti-device-floppy"></i> Guardar configuración
      </button>
    </div>

    ${errGen.length ? `
    <div class="card" style="margin-bottom:14px;border:1px solid #FCA5A5;background:#FEF2F2;">
      <div class="card-title" style="color:#991B1B;"><i class="ti ti-alert-triangle"></i> No se puede generar el archivo</div>
      ${errGen.map(e => `<div style="font-size:13px;color:#7F1D1D;margin-bottom:4px;">• ${e}</div>`).join('')}
    </div>` : ''}

    ${faltantes.length ? `
    <div class="card" style="margin-bottom:14px;border:1px solid #FCA5A5;background:#FEF2F2;">
      <div class="card-title" style="color:#991B1B;"><i class="ti ti-alert-triangle"></i>
        Datos obligatorios faltantes (${faltantes.length} trabajador${faltantes.length>1?'es':''})</div>
      <div style="font-size:12px;color:#7F1D1D;margin-bottom:10px;">
        PreviRed exige sexo, apellidos por separado y el nombre de la Isapre. Los apellidos vienen sugeridos desde el nombre
        completo — revísalos y confirma. Se guardan en la ficha del trabajador.
      </div>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Nombre</th><th>Apellido paterno</th><th>Apellido materno</th><th>Sexo</th><th>Isapre</th><th></th></tr></thead>
          <tbody>
            ${faltantes.map(x => { const sug = _apellidosSugeridos(x.t); const sx = _sexoPrevired(x.t.sexo);
              const necesitaIsapre = _codSaludTrabajador(x.t, x.liq) === null;
              return `<tr>
              <td style="font-size:12px;">${x.t.nombre}</td>
              <td><input type="text" id="prev-ap-${x.t.rut}" value="${sug.paterno}" style="width:120px;"></td>
              <td><input type="text" id="prev-am-${x.t.rut}" value="${sug.materno}" style="width:120px;"></td>
              <td>
                <select id="prev-sx-${x.t.rut}" style="width:100px;">
                  <option value="">—</option>
                  <option value="Hombre" ${sx==='M'?'selected':''}>Hombre</option>
                  <option value="Mujer" ${sx==='F'?'selected':''}>Mujer</option>
                </select>
              </td>
              <td>${necesitaIsapre ? `<select id="prev-is-${x.t.rut}" style="width:150px;">
                  <option value="">— Elegir —</option>
                  ${PREVIRED_ISAPRES.map(n => `<option value="${n}">${n}</option>`).join('')}
                </select>` : '<span style="font-size:12px;color:var(--texto3);">—</span>'}</td>
              <td><button class="btn btn-secondary btn-sm" onclick="_guardarDatoFaltante('${x.t.rut}')"><i class="ti ti-check"></i></button></td>
            </tr>`; }).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="_guardarTodosFaltantes()">
        <i class="ti ti-checks"></i> Confirmar todos
      </button>
    </div>` : ''}

    ${multiMov.length ? `
    <div class="card" style="margin-bottom:14px;border:1px solid #FDE68A;background:#FFFBEB;">
      <div class="card-title" style="color:#92400E;"><i class="ti ti-info-circle"></i>
        Trabajadores con más de un movimiento en el mes (${multiMov.length})</div>
      <div style="font-size:12px;color:#92400E;margin-bottom:8px;">
        El archivo los informa en líneas adicionales (tipo de línea 01), justo después de la línea principal. Revisa en la validación de PreviRed que los acepte.
      </div>
      ${multiMov.map(m => `<div style="font-size:12px;color:#78350F;margin-bottom:3px;">• <strong>${m.x.t.nombre}</strong>: ${m.movs.map(_textoMovimiento).join(' · ')}</div>`).join('')}
    </div>` : ''}

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
        <div>
          <div style="font-size:14px;font-weight:700;">Archivo Previred — ${getNombreMes(periodo)}</div>
          <div style="font-size:12px;color:var(--texto2);">${lista.length} trabajador${lista.length>1?'es':''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" onclick="exportarPreviredExcel()">
            <i class="ti ti-table-export"></i> Excel detallado
          </button>
          <button class="btn btn-primary btn-sm" onclick="exportarPreviredTXT()" ${bloqueado?'disabled title="Completa los datos obligatorios primero"':''}>
            <i class="ti ti-file-type-txt"></i> Archivo TXT Previred
          </button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--texto3);line-height:1.5;">
        <i class="ti ti-info-circle"></i> Formato "Estándar por Separador — 105 campos" versión 82 (vigente desde remuneración
        de agosto 2025). Antes de usarlo en la carga real, sube el archivo a PreviRed y verifica que no arroje errores —
        si tu empresa tiene convenios especiales (APV, segundos contratos, trabajo pesado) no cubiertos aquí, coordina con tu contador.
      </div>
    </div>`;
}

function _guardarCfgPrevired(empresaId){
  previred_cfg[empresaId] = {
    mutual:          document.getElementById('prev-cfg-mutual')?.value || '00',
    tasa_mutual:      document.getElementById('prev-cfg-tasa-mutual')?.value.trim() || '',
    sucursal_mutual:  document.getElementById('prev-cfg-sucursal-mutual')?.value.trim() || '',
    ccaf:            document.getElementById('prev-cfg-ccaf')?.value || '00',
  };
  guardarPreviredCfg();
  toast('✅ Configuración guardada', 'exito');
}

/* ✅ Paso 2 Previsión (23-11-2026) — P1: el registro guarda el sexo como
   "Hombre"/"Mujer"; PreviRed exige M/F (campo 6). Antes se escribía
   "Hombre" en el archivo. Se acepta también M/F de datos antiguos. */
function _sexoPrevired(sexo){
  const v = String(sexo||'').trim().toLowerCase();
  if(['hombre','masculino','m'].includes(v)) return 'M';
  if(['mujer','femenino','f'].includes(v))   return 'F';
  return '';
}

/* P2 — el registro guarda el nombre completo en un solo campo. Se sugieren
   los apellidos como las 2 últimas palabras (o la última si son 2). */
function _apellidosSugeridos(t){
  if((t.apellido_paterno||'').trim()) return { paterno: t.apellido_paterno, materno: t.apellido_materno||'' };
  const p = String(t.nombre||'').trim().split(/\s+/).filter(Boolean);
  if(p.length >= 3) return { paterno: p[p.length-2], materno: p[p.length-1] };
  if(p.length === 2) return { paterno: p[1], materno: '' };
  return { paterno: '', materno: '' };
}

/* Campo 5 — nombres: el nombre completo sin los apellidos guardados. */
function _nombresPrevired(t){
  const p = String(t.nombre||'').trim().split(/\s+/).filter(Boolean);
  const norm = x => String(x||'').trim().toLowerCase();
  const ap = [t.apellido_paterno, t.apellido_materno].map(norm).filter(Boolean);
  let fin = p.length;
  while(fin > 1 && ap.length && ap.includes(norm(p[fin-1]))) fin--;
  if(fin === p.length && p.length >= 3) fin = p.length - 2; // apellidos escritos distinto al nombre
  return p.slice(0, fin).join(' ') || t.nombre || '';
}

function _faltanDatosObligatorios(t, liq){
  return !_sexoPrevired(t.sexo) || !(t.apellido_paterno||'').trim() || _codSaludTrabajador(t, liq) === null;
}

function _guardarDatoFaltante(rut, silencioso){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return;
  t.apellido_paterno = document.getElementById(`prev-ap-${rut}`)?.value.trim() || '';
  t.apellido_materno = document.getElementById(`prev-am-${rut}`)?.value.trim() || '';
  // Se guarda en el formato del registro ("Hombre"/"Mujer") para no
  // romper la ficha; el archivo lo convierte a M/F.
  const sx = document.getElementById(`prev-sx-${rut}`)?.value || '';
  if(sx) t.sexo = sx;
  const is = document.getElementById(`prev-is-${rut}`)?.value || '';
  if(is) t.isapre_nombre = is;
  guardarLocal();
  if(!silencioso){ toast(`✅ Datos de ${t.nombre} actualizados`, 'exito'); renderPrevired(); }
}

function _guardarTodosFaltantes(){
  const filas = Array.from(document.querySelectorAll('[id^="prev-ap-"]')).map(el => el.id.replace('prev-ap-',''));
  filas.forEach(rut => _guardarDatoFaltante(rut, true));
  toast(`✅ ${filas.length} trabajador${filas.length>1?'es':''} actualizado${filas.length>1?'s':''}`, 'exito');
  renderPrevired();
}

/* Errores que bloquean el archivo completo (no de un trabajador). */
function _erroresGeneralesPrevired(periodo, cfgEmp){
  const err = [];
  const ind = getIndicadoresPorPeriodo(periodo);
  const tieneCcaf = cfgEmp.ccaf && cfgEmp.ccaf !== '00';
  if(tieneCcaf && !(ind?.salud_ccaf?.ccaf > 0 || ind?.salud_ccaf?.fonasa > 0)){
    err.push(`La empresa está afiliada a una CCAF: ingresa la "Distribución del 7% de salud" (sección G) en los Indicadores de ${getNombreMes(periodo)}.`);
  }
  return err;
}

/* ════════════════════════════════════════════════════════
   TABLAS DE EQUIVALENCIA OFICIALES PREVIRED
   ════════════════════════════════════════════════════════ */
const PREVIRED_COD_AFP = {
  capital:'33', cuprum:'03', habitat:'05', planvital:'29',
  provida:'08', modelo:'34', uno:'35',
};

const PREVIRED_COD_SALUD = {
  'fonasa':'07',
  'isapre banmédica':'01', 'isapre banmedica':'01',
  'isapre consalud':'02',
  'isapre vida tres':'03',
  'isapre colmena':'04',
  'isapre cruz blanca':'05',
  'isapre nueva masvida':'10',
  'isapre isalud':'11',
  'isapre fundación':'12', 'isapre fundacion':'12',
  'isapre cruz del norte':'25',
  'isapre esencial':'28',
};

const PREVIRED_ISAPRES = ['Isapre Banmédica','Isapre Consalud','Isapre Vida Tres','Isapre Colmena','Isapre Cruz Blanca',
  'Isapre Nueva Masvida','Isapre Isalud','Isapre Fundación','Isapre Cruz del Norte','Isapre Esencial'];

/* P12 — código de salud del trabajador. Devuelve null cuando la ficha dice
   solo "Isapre" sin el nombre: antes se enviaba como Fonasa (07) sin
   avisar. Busca el nombre en la liquidación, la ficha o el dato
   completado en esta pantalla (t.isapre_nombre). */
function _codSaludTrabajador(t, liq){
  const cands = [liq?.sistema_salud, t?.sistema_salud, t?.isapre_nombre];
  const esIsapre = cands.some(c => String(c||'').toLowerCase().includes('isapre'));
  if(!esIsapre) return '07';
  for(const c of cands){
    const k = String(c||'').toLowerCase().trim();
    if(PREVIRED_COD_SALUD[k] && k !== 'fonasa') return PREVIRED_COD_SALUD[k];
  }
  return null;
}

function _codAFPPrevired(afpKey){ return PREVIRED_COD_AFP[_normalizarAfpKey(afpKey)] || '00'; }
function _codSaludPrevired(sistemaSalud){
  const key = (sistemaSalud||'fonasa').toLowerCase().trim();
  return PREVIRED_COD_SALUD[key] || '07';
}

/* ── Separar RUT en cuerpo numérico + DV ────────────────── */
function _splitRUT(rut){
  const limpio = (rut||'').replace(/[^0-9kK]/g,'').toUpperCase();
  return { cuerpo: limpio.slice(0,-1), dv: limpio.slice(-1) };
}

/* ── Período mmaaaa ──────────────────────────────────────── */
function _periodoMMAAAA(periodo){
  const [anio, mes] = periodo.split('-');
  return `${mes}${anio}`;
}

/* ── Movimientos de personal del período (P3–P6) ──────────
   Devuelve la lista de movimientos [{codigo, desde, hasta}] ordenada: la
   primera va en la línea principal y el resto en líneas adicionales (tipo
   de línea 01). La licencia va primero porque la RIMA (campo 92) solo se
   acepta en una línea con código 3. Fechas como texto 'AAAA-MM-DD' (sin
   new Date(): '2026-09-01' en Chile se leía como 31-08 y el ingreso del
   día 1 no se informaba). */
function _movimientosPrevired(t, liq, periodo){
  const { desde: ini, hasta: fin } = _rangoPeriodo(periodo);
  const clip = (d, h) => ({ desde: d < ini ? ini : d, hasta: (h||d) > fin ? fin : (h||d) });
  const contrato = _getContratoVigente(t.rut, periodo);
  const movs = [];

  // Licencias médicas (3), permisos sin goce (4), ausentismos (11)
  const COD = { licencia_medica:'3', permiso_sin_goce:'4', ausencia_injustificada:'11' };
  const novs = (typeof getNovedadesPorRut === 'function' ? getNovedadesPorRut(t.rut, periodo) : [])
    .filter(n => n.aprobado && COD[n.tipo])
    .map(n => ({ codigo: COD[n.tipo], ...clip(n.fecha_inicio, n.fecha_fin) }))
    .sort((a,b) => a.desde.localeCompare(b.desde));
  // une tramos seguidos del mismo tipo (ej: faltas registradas día a día)
  const unidas = [];
  novs.forEach(m => {
    const u = unidas.filter(x => x.codigo === m.codigo).pop();
    if(u){
      const sig = new Date(u.hasta+'T12:00:00'); sig.setDate(sig.getDate()+1);
      if(sig.toISOString().slice(0,10) >= m.desde){ if(m.hasta > u.hasta) u.hasta = m.hasta; return; }
    }
    unidas.push({ ...m });
  });

  // Ingreso (1 indefinido / 7 plazo fijo o temporada)
  if(contrato?.fecha_inicio && contrato.fecha_inicio >= ini && contrato.fecha_inicio <= fin){
    const tipo = (contrato.tipo_contrato||contrato.tipo||'').toLowerCase();
    movs.push({ codigo: tipo.includes('indefinido') ? '1' : '7', desde: contrato.fecha_inicio, hasta: '' });
  }
  // Retiro (2): término del contrato o finiquito dentro del mes
  const fq = (typeof finiquitos_guardados !== 'undefined' ? finiquitos_guardados : [])
    .find(f => f.rut === t.rut && f.fecha_termino >= ini && f.fecha_termino <= fin);
  const termino = fq?.fecha_termino || (contrato?.fecha_termino && contrato.fecha_termino >= ini && contrato.fecha_termino <= fin ? contrato.fecha_termino : '');
  if(termino) movs.push({ codigo: '2', desde: '', hasta: termino });

  const lic = unidas.filter(m => m.codigo === '3');
  return [...lic, ...movs, ...unidas.filter(m => m.codigo !== '3')];
}

const PREVIRED_MOV_NOMBRE = { '1':'Ingreso indefinido', '2':'Retiro', '3':'Licencia', '4':'Permiso sin goce', '7':'Ingreso plazo fijo', '11':'Ausentismo' };
function _textoMovimiento(m){
  const f = d => d ? _fmtFechaPrevired(d) : '';
  const rango = m.desde && m.hasta ? `${f(m.desde)} al ${f(m.hasta)}` : f(m.desde || m.hasta);
  return `${PREVIRED_MOV_NOMBRE[m.codigo]||m.codigo} (cód. ${m.codigo}) ${rango}`;
}

function _fmtFechaPrevired(fecha){
  if(!fecha) return '';
  const d = new Date(fecha+'T12:00:00');
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}

/* ════════════════════════════════════════════════════════
   CONSTRUCCIÓN DE LA LÍNEA (105 CAMPOS) DE UN TRABAJADOR
   ════════════════════════════════════════════════════════ */
/* Devuelve las líneas del trabajador (principal + adicionales) unidas
   por salto de línea. Ver los cambios P1–P12 del Paso 2 Previsión. */
function _construirLineaPrevired(liq, t, periodo, cfgEmp){
  const contrato  = _getContratoVigente(t.rut, periodo);
  const rutT      = _splitRUT(t.rut);
  const movs      = _movimientosPrevired(t, liq, periodo);
  const mov       = movs[0] || { codigo:'0', desde:'', hasta:'' };
  const esAFP     = !!liq.afp && liq.afp !== 'no cotiza';
  const regimen   = esAFP ? 'AFP' : 'SIP';
  const diasTrab  = Math.max(0, Math.min(30, 30 - (liq.dias_a_descontar||0)));
  const jornadaCompleta = (parseFloat(contrato?.horas_semanales)||45) >= 30;
  const codSalud  = _codSaludTrabajador(t, liq) || '07';
  const esIsapre  = codSalud !== '07';
  const base      = Math.round(liq.base_afp||0);
  const ind       = getIndicadoresPorPeriodo(periodo) || {};

  const f = new Array(105).fill('');

  // 1. Datos del trabajador
  f[0]  = rutT.cuerpo;
  f[1]  = rutT.dv;
  f[2]  = t.apellido_paterno || '';
  f[3]  = t.apellido_materno || '';
  f[4]  = _nombresPrevired(t);
  f[5]  = _sexoPrevired(t.sexo);                       // P1 — M/F
  f[6]  = esNacionalidadExtranjera(t.nacionalidad) ? '1' : '0';
  f[7]  = '01'; // Tipo pago: 01 remuneraciones del mes
  f[8]  = _periodoMMAAAA(periodo);
  f[9]  = '';
  f[10] = regimen;
  f[11] = liq.pensionado_invalidez_parcial ? '9' : '0'; // tipo trabajador: 0=Activo, 9=Pensionado Invalidez Parcial
  f[12] = String(diasTrab);
  f[13] = '00'; // tipo de línea: principal
  f[14] = mov.codigo;                                  // P3–P6
  f[15] = mov.desde ? _fmtFechaPrevired(mov.desde) : '';
  f[16] = mov.hasta ? _fmtFechaPrevired(mov.hasta) : '';
  f[17] = 'D'; // tramo asignación familiar — no se registran cargas en el sistema (decisión del usuario)
  f[18] = '0'; f[19] = '0'; f[20] = '0'; f[21] = '0'; f[22] = '0'; f[23] = '0'; f[24] = 'N';

  // 2. AFP — P9: el 0,1% del empleador a la cuenta individual (Reforma)
  // va en el mismo campo 28 que la cotización obligatoria del trabajador.
  if(esAFP){
    f[25] = _codAFPPrevired(liq.afp);
    f[26] = String(base);
    f[27] = String(Math.round(liq.monto_afp||0) + Math.round(liq.monto_afp_emp||0));
    f[28] = String(Math.round(liq.monto_sis||0));
  } else {
    f[25]='0'; f[26]='0'; f[27]='0'; f[28]='0';
  }
  for(let i=29;i<=38;i++) f[i] = i===31||i===37 ? '00,00' : '0'; // ahorro voluntario / trabajo pesado — no aplican

  // 3-4. APV — no gestionado por el sistema
  for(let i=39;i<=48;i++) f[i] = '0';
  f[39]='000'; f[44]='000';

  // 5. Afiliado voluntario — no aplica
  for(let i=49;i<=60;i++) f[i] = '0';

  // 6. IPS - ISL - Fonasa
  for(let i=61;i<=73;i++) f[i] = '0';

  // 8. CCAF (se calcula antes porque reparte el 7% de Fonasa)
  const ccaf = cfgEmp.ccaf && cfgEmp.ccaf !== '00' ? (cfgEmp.ccaf === '04' ? '06' : cfgEmp.ccaf) : '';
  let ccafSalud = 0;
  if(ccaf && !esIsapre){
    // P8 — el 7% de Fonasa se REPARTE entre CCAF y Fonasa según el % que
    // publica Previred (Indicadores, sección G). Antes se cobraba 5,2% a
    // la CCAF además del 7% completo.
    ccafSalud = Math.round(base * (ind.salud_ccaf?.ccaf || 0) / 100);
  }

  // P7 — Fonasa: campo 70 (cotización) sobre la renta del campo 64.
  // Antes iba en el campo 80, que es de Isapre.
  // P10/P11 — ISL (campo 71) cuando la empresa no tiene Mutual: misma
  // tasa que la liquidación (0,93% si no se configuró).
  const mutual    = cfgEmp.mutual && cfgEmp.mutual !== '00' ? cfgEmp.mutual : '';
  const montoAcc  = liq.monto_mutual != null ? Math.round(liq.monto_mutual)
                  : Math.round(base * _tasaMutualEmpresa(liq.empresa_propia_id || t.empresa_propia_id).tasa / 100);
  if(!esIsapre) f[69] = String(Math.round(liq.monto_salud||0) - ccafSalud);
  if(!mutual)   f[70] = String(montoAcc);
  if(!esIsapre || !mutual) f[63] = String(base);

  // 7. Salud
  f[74] = codSalud;
  f[75] = '';
  if(esIsapre){
    f[76] = String(base);
    f[77] = '1';
    f[78] = String(Math.round(liq.monto_salud||0));
    f[79] = String(Math.round(liq.monto_salud||0));
    f[80] = '0'; // cotización adicional — el sistema solo calcula el mínimo legal 7%
  } else {
    f[76] = '0'; f[77] = '0'; f[78] = '0'; f[79] = '0'; f[80] = '0';
  }
  f[81] = '0'; // GES — uso futuro

  f[82] = ccaf || '0';
  f[83] = ccaf ? String(base) : '0';
  for(let i=84;i<=89;i++) f[i] = '0';
  f[89] = String(ccafSalud);
  f[90] = '0';
  // RIMA (campo 92): solo se acepta con movimiento 3 (licencia) en la línea.
  f[91] = mov.codigo === '3' ? String(Math.round(liq.rima||0)) : '0';
  f[92] = jornadaCompleta ? '1' : '2';
  f[93] = String(Math.round(liq.monto_exp_vida||0));
  f[94] = String(Math.round(liq.monto_rentabilidad_protegida||0)); // Campo 95 — Reforma Previsional, agosto 2026

  // 9. Mutual — misma tasa que la liquidación
  f[95] = mutual || '0';
  f[96] = mutual ? String(base) : '0';
  f[97] = mutual ? String(montoAcc) : '0';
  f[98] = mutual ? (cfgEmp.sucursal_mutual || '') : '';

  // 10. AFC
  f[99]  = String(Math.round(liq.base_afc||0));
  f[100] = String(Math.round(liq.monto_afc_trab||0));
  f[101] = String(Math.round(liq.monto_afc_emp||0));

  // 11. Pagador de subsidios — no aplica
  f[102] = ''; f[103] = '';

  // 12. Centro de costos — faena del contrato vigente en el período
  f[104] = _faenaVigente(t.rut, liq.periodo) || '';

  const lineas = [f.join(';')];

  // Líneas adicionales (tipo 01): un movimiento más cada una. Datos del
  // trabajador + movimiento; días, rentas y cotizaciones en 0.
  movs.slice(1).forEach(m => {
    const a = f.map(() => '0');
    for(let i=0;i<=11;i++) a[i] = f[i];
    a[9] = ''; a[12] = '0'; a[13] = '01';
    a[14] = m.codigo;
    a[15] = m.desde ? _fmtFechaPrevired(m.desde) : '';
    a[16] = m.hasta ? _fmtFechaPrevired(m.hasta) : '';
    a[17] = ''; a[24] = '';
    a[25] = f[25];
    a[31] = '00,00'; a[37] = '00,00'; a[39] = '000'; a[44] = '000';
    a[74] = f[74]; a[75] = ''; a[82] = f[82]; a[92] = f[92]; a[95] = f[95];
    a[98] = ''; a[102] = ''; a[103] = ''; a[104] = f[104];
    lineas.push(a.join(';'));
  });

  return lineas.join('\r\n');
}

/* ════════════════════════════════════════════════════════
   EXPORTAR TXT
   ════════════════════════════════════════════════════════ */
function exportarPreviredTXT(){
  const periodo   = document.getElementById('prev-periodo-selector')?.value || '';
  const empresaId = document.getElementById('prev-empresa-selector')?.value || '';
  if(!periodo || !empresaId){ toast('⚠️ Selecciona empresa y período', 'error'); return; }

  const lista = _getLiqConTrabajadorPrevired(periodo, empresaId);
  if(!lista.length){ toast('⚠️ Sin liquidaciones para este período', 'error'); return; }

  const faltantes = lista.filter(x => _faltanDatosObligatorios(x.t, x.liq));
  if(faltantes.length){
    toast(`⚠️ Completa sexo, apellidos o Isapre de ${faltantes.length} trabajador(es) primero`, 'error');
    return;
  }

  const ep     = empresas_propias.find(e => e.id === empresaId);
  const cfgEmp = previred_cfg[empresaId] || {};
  const errGen = _erroresGeneralesPrevired(periodo, cfgEmp);
  if(errGen.length){ toast('⚠️ ' + errGen[0], 'error'); return; }

  const lineas = lista.map(x => _construirLineaPrevired(x.liq, x.t, periodo, cfgEmp));
  const contenido = lineas.join('\r\n') + '\r\n';

  const blob = new Blob([contenido], { type: 'text/plain;charset=windows-1252' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const rutEmpresa = (ep?.rut||'empresa').replace(/[.\-]/g,'');
  a.href = url;
  a.download = `previred_${rutEmpresa}_${periodo}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);

  toast(`⬇️ Archivo Previred generado — ${lista.length} trabajadores`, 'exito');
}

/* ════════════════════════════════════════════════════════
   EXPORTAR EXCEL DETALLADO (para revisión del contador)
   ════════════════════════════════════════════════════════ */
function exportarPreviredExcel(){
  const periodo   = document.getElementById('prev-periodo-selector')?.value || '';
  const empresaId = document.getElementById('prev-empresa-selector')?.value || '';
  if(!periodo || !empresaId){ toast('⚠️ Selecciona empresa y período', 'error'); return; }

  const lista = _getLiqConTrabajadorPrevired(periodo, empresaId);
  if(!lista.length){ toast('⚠️ Sin liquidaciones para este período', 'error'); return; }

  const ep = empresas_propias.find(e => e.id === empresaId);
  const cfgEmp = previred_cfg[empresaId] || {};

  const rows = lista.map(({liq, t}) => { const c = _construirLineaPrevired(liq, t, periodo, cfgEmp).split('\r\n')[0].split(';'); return ({
    'RUT':                    liq.rut,
    'Nombre':                 liq.nombre,
    'Sexo':                   _sexoPrevired(t.sexo) || '—',
    'Movimientos':            _movimientosPrevired(t, liq, periodo).map(_textoMovimiento).join(' · ') || 'Sin movimiento',
    'Nacionalidad':           t.nacionalidad || 'Chileno',
    'Días trabajados':        Math.max(0, 30 - (liq.dias_a_descontar||0)),
    'AFP':                    _capitalizar(liq.afp||''),
    'Código AFP':             _codAFPPrevired(liq.afp),
    'Renta imponible AFP':    Math.round(liq.base_afp||0),
    'Cotización AFP trab.':   Math.round(liq.monto_afp||0),
    '0,1% cuenta indiv. (empleador)': Math.round(liq.monto_afp_emp||0),
    'Campo 28 (AFP + 0,1%)':  Number(c[27]),
    'Tipo trabajador':        liq.pensionado_invalidez_parcial ? 'Pensionado Invalidez Parcial' : 'Activo',
    'Días licencia médica':   liq.dias_licencia_medica || 0,
    'RIMA (Campo 92)':        Math.round(liq.rima||0),
    'SIS (cargo empleador)':  Math.round(liq.monto_sis||0),
    'Expectativa de Vida':    Math.round(liq.monto_exp_vida||0),
    'Rentabilidad Protegida': Math.round(liq.monto_rentabilidad_protegida||0),
    'Institución salud':      liq.sistema_salud||'Fonasa',
    'Código salud':           _codSaludTrabajador(t, liq) || '—',
    'Cotización salud':       Math.round(liq.monto_salud||0),
    'Fonasa (campo 70)':      Number(c[69]),
    'CCAF salud (campo 90)':  Number(c[89]),
    'ISL (campo 71)':         Number(c[70]),
    'Mutual (campo 98)':      Number(c[97]),
    'Renta imponible AFC':    Math.round(liq.base_afc||0),
    'AFC trabajador':         Math.round(liq.monto_afc_trab||0),
    'AFC empleador':          Math.round(liq.monto_afc_emp||0),
    'IUSC':                   Math.round(liq.iusc||0),
    'Tipo contrato':          _tipoContratoLabel(typeof _tipoContratoReal === 'function' ? _tipoContratoReal(liq) : liq.tipo_contrato),
    'Faena / centro costo':   _faenaVigente(t.rut, periodo) || '—',
  }); });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.min(Math.max(k.length+2, 10), 26) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Previred detallado');
  XLSX.writeFile(wb, `Previred_Detallado_${(ep?.rut||'empresa').replace(/[.\-]/g,'')}_${periodo}.xlsx`);
  toast('⬇️ Excel detallado exportado', 'exito');
}
