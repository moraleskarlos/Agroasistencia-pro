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
  switchTabRem('rem-previred');

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
      <button class="btn btn-primary btn-sm" onclick="switchTabRem('rem-liquidaciones')">
        <i class="ti ti-file-invoice"></i> Ir a Liquidaciones
      </button>
    </div>`;
    return;
  }

  const faltantes = lista.filter(x => _faltanDatosObligatorios(x.t));
  const cfgEmp    = previred_cfg[empresaId] || {};

  cont.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-title"><i class="ti ti-settings"></i> Configuración de la empresa (Mutual / CCAF)</div>
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
          <input type="text" id="prev-cfg-tasa-mutual" placeholder="0,95" value="${cfgEmp.tasa_mutual||''}">
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
            <option value="04" ${cfgEmp.ccaf==='04'?'selected':''}>04 · 18 de Septiembre</option>
          </select>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="_guardarCfgPrevired('${empresaId}')">
        <i class="ti ti-device-floppy"></i> Guardar configuración
      </button>
    </div>

    ${faltantes.length ? `
    <div class="card" style="margin-bottom:14px;border:1px solid #FCA5A5;background:#FEF2F2;">
      <div class="card-title" style="color:#991B1B;"><i class="ti ti-alert-triangle"></i>
        Datos obligatorios faltantes (${faltantes.length} trabajador${faltantes.length>1?'es':''})</div>
      <div style="font-size:12px;color:#7F1D1D;margin-bottom:10px;">
        PreviRed exige sexo y apellidos por separado. Complétalos aquí — se guardan en la ficha del trabajador.
      </div>
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Nombre</th><th>Apellido paterno</th><th>Apellido materno</th><th>Sexo</th><th></th></tr></thead>
          <tbody>
            ${faltantes.map(x => `<tr>
              <td style="font-size:12px;">${x.t.nombre}</td>
              <td><input type="text" id="prev-ap-${x.t.rut}" value="${x.t.apellido_paterno||''}" style="width:120px;"></td>
              <td><input type="text" id="prev-am-${x.t.rut}" value="${x.t.apellido_materno||''}" style="width:120px;"></td>
              <td>
                <select id="prev-sx-${x.t.rut}" style="width:90px;">
                  <option value="">—</option>
                  <option value="M" ${x.t.sexo==='M'?'selected':''}>Masculino</option>
                  <option value="F" ${x.t.sexo==='F'?'selected':''}>Femenino</option>
                </select>
              </td>
              <td><button class="btn btn-secondary btn-sm" onclick="_guardarDatoFaltante('${x.t.rut}')"><i class="ti ti-check"></i></button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
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
          <button class="btn btn-primary btn-sm" onclick="exportarPreviredTXT()" ${faltantes.length?'disabled title="Completa los datos obligatorios primero"':''}>
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

function _faltanDatosObligatorios(t){
  return !t.sexo || !(t.apellido_paterno||'').trim();
}

function _guardarDatoFaltante(rut){
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return;
  t.apellido_paterno = document.getElementById(`prev-ap-${rut}`)?.value.trim() || '';
  t.apellido_materno = document.getElementById(`prev-am-${rut}`)?.value.trim() || '';
  t.sexo             = document.getElementById(`prev-sx-${rut}`)?.value || '';
  guardarLocal();
  toast(`✅ Datos de ${t.nombre} actualizados`, 'exito');
  renderPrevired();
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

/* ── Movimiento de personal del período (altas) ─────────── */
function _movimientoPersonal(t, contrato, periodo){
  const [anio, mes] = periodo.split('-').map(Number);
  const inicioPeriodo = new Date(anio, mes-1, 1);
  const finPeriodo    = new Date(anio, mes, 0);
  const fechaInicio   = contrato?.fecha_inicio ? new Date(contrato.fecha_inicio) : null;

  if(fechaInicio && fechaInicio >= inicioPeriodo && fechaInicio <= finPeriodo){
    const esFijo = (contrato.tipo_contrato||contrato.tipo||'').toLowerCase().includes('fijo')
      || (contrato.tipo_contrato||contrato.tipo||'').toLowerCase().includes('temporada');
    return { codigo: esFijo ? '7' : '1', fecha_desde: contrato.fecha_inicio };
  }
  // Nota: "Retiro" (código 2) requiere fecha de baja, que hoy no se registra
  // en el trabajador — queda pendiente para una futura versión.
  return { codigo: '0', fecha_desde: '' };
}

function _fmtFechaPrevired(fecha){
  if(!fecha) return '';
  const d = new Date(fecha+'T12:00:00');
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}

/* ════════════════════════════════════════════════════════
   CONSTRUCCIÓN DE LA LÍNEA (105 CAMPOS) DE UN TRABAJADOR
   ════════════════════════════════════════════════════════ */
function _construirLineaPrevired(liq, t, periodo, cfgEmp){
  const ind       = getIndicadoresPorPeriodo(periodo);
  const contrato  = _getContratoVigente(t.rut, periodo);
  const rutT      = _splitRUT(t.rut);
  const mov       = _movimientoPersonal(t, contrato, periodo);
  const esAFP     = !!liq.afp && liq.afp !== 'no cotiza';
  const regimen   = esAFP ? 'AFP' : 'SIP';
  const diasTrab  = Math.max(0, Math.min(30, 30 - (liq.dias_a_descontar||0)));
  const jornadaCompleta = (parseFloat(contrato?.horas_semanales)||45) >= 30;
  const esIsapre  = (liq.sistema_salud||'').toLowerCase().includes('isapre');
  const cotExpVida= esAFP ? Math.round((liq.base_afp||0) * 0.009) : 0; // Ley reforma previsional — cargo empleador

  const f = new Array(105).fill('');

  // 1. Datos del trabajador
  f[0]  = rutT.cuerpo;
  f[1]  = rutT.dv;
  f[2]  = t.apellido_paterno || '';
  f[3]  = t.apellido_materno || '';
  f[4]  = (t.nombre||'').split(' ').slice(0, -2).join(' ') || t.nombre || '';
  f[5]  = t.sexo || 'M';
  f[6]  = (t.nacionalidad && t.nacionalidad !== 'Chileno') ? '1' : '0';
  f[7]  = '01'; // Tipo pago: 01 remuneraciones del mes
  f[8]  = _periodoMMAAAA(periodo);
  f[9]  = '';
  f[10] = regimen;
  f[11] = '0'; // tipo trabajador: activo
  f[12] = String(diasTrab);
  f[13] = '00'; // tipo de línea: principal
  f[14] = mov.codigo;
  f[15] = mov.fecha_desde ? _fmtFechaPrevired(mov.fecha_desde) : '';
  f[16] = '';
  f[17] = 'D'; // tramo asignación familiar — no se registran cargas en el sistema aún
  f[18] = '0'; f[19] = '0'; f[20] = '0'; f[21] = '0'; f[22] = '0'; f[23] = '0'; f[24] = 'N';

  // 2. AFP
  if(esAFP){
    f[25] = _codAFPPrevired(liq.afp);
    f[26] = String(Math.round(liq.base_afp||0));
    f[27] = String(Math.round(liq.monto_afp||0));
    f[28] = String(Math.round(liq.monto_sis||0));
  } else {
    f[25]='0'; f[26]='0'; f[27]='0'; f[28]='0';
  }
  for(let i=29;i<=38;i++) f[i] = i===31||i===37 ? '00,00' : '0'; // ahorro voluntario / trabajo pesado — no aplican

  // 3-4. APV — no gestionado por el sistema
  for(let i=39;i<=48;i++) f[i] = (i===41||i===46) ? '0' : (i===40||i===45)?'0':'0';
  f[39]='000'; f[44]='000';

  // 5. Afiliado voluntario — no aplica
  for(let i=49;i<=60;i++) f[i] = '0';

  // 6. IPS - ISL - Fonasa (solo si régimen SIP/INP — hoy el sistema solo maneja AFP)
  for(let i=61;i<=73;i++) f[i] = '0';

  // 7. Salud
  const codSalud = _codSaludPrevired(liq.sistema_salud);
  f[74] = codSalud;
  f[75] = '';
  if(esIsapre){
    f[76] = String(Math.round(liq.base_afp||0));
    f[77] = '1';
    f[78] = String(Math.round(liq.monto_salud||0));
    f[79] = String(Math.round(liq.monto_salud||0));
    f[80] = '0'; // cotización adicional — el sistema solo calcula el mínimo legal 7%
  } else {
    f[76] = String(Math.round(liq.base_afp||0));
    f[77] = '1'; f[78]='0';
    f[79] = String(Math.round(liq.monto_salud||0));
    f[80] = '0';
  }
  f[81] = '0'; // GES — uso futuro

  // 8. CCAF
  const ccaf = cfgEmp.ccaf && cfgEmp.ccaf !== '00' ? cfgEmp.ccaf : '';
  f[82] = ccaf || '0';
  f[83] = ccaf ? String(Math.round(liq.base_afp||0)) : '0';
  for(let i=84;i<=89;i++) f[i] = '0';
  f[89] = (!esIsapre && ccaf) ? String(Math.round((liq.base_afp||0)*0.052)) : '0';
  f[90] = '0';
  f[91] = '0'; // RIMA — solo aplica con licencia médica
  f[92] = jornadaCompleta ? '1' : '2';
  f[93] = String(cotExpVida);
  f[94] = '0'; // rentabilidad protegida — uso futuro (agosto 2026)

  // 9. Mutual
  const mutual = cfgEmp.mutual && cfgEmp.mutual !== '00' ? cfgEmp.mutual : '';
  f[95] = mutual || '0';
  f[96] = mutual ? String(Math.round(liq.base_afp||0)) : '0';
  f[97] = (mutual && cfgEmp.tasa_mutual) ? String(Math.round((liq.base_afp||0) * (parseFloat(cfgEmp.tasa_mutual.replace(',','.'))||0)/100)) : '0';
  f[98] = cfgEmp.sucursal_mutual || '';

  // 10. AFC
  f[99]  = String(Math.round(liq.base_afc||0));
  f[100] = String(Math.round(liq.monto_afc_trab||0));
  f[101] = String(Math.round(liq.monto_afc_emp||0));

  // 11. Pagador de subsidios — no aplica (sin licencias en curso gestionadas aquí)
  f[102] = ''; f[103] = '';

  // 12. Centro de costos — usamos la faena/obra si existe
  f[104] = t.faena_obra || '';

  return f.join(';');
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

  const faltantes = lista.filter(x => _faltanDatosObligatorios(x.t));
  if(faltantes.length){
    toast(`⚠️ Completa sexo y apellidos de ${faltantes.length} trabajador(es) primero`, 'error');
    return;
  }

  const ep     = empresas_propias.find(e => e.id === empresaId);
  const cfgEmp = previred_cfg[empresaId] || {};

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

  const rows = lista.map(({liq, t}) => ({
    'RUT':                    liq.rut,
    'Nombre':                 liq.nombre,
    'Sexo':                   t.sexo || '—',
    'Nacionalidad':           t.nacionalidad || 'Chileno',
    'Días trabajados':        Math.max(0, 30 - (liq.dias_a_descontar||0)),
    'AFP':                    _capitalizar(liq.afp||''),
    'Código AFP':             _codAFPPrevired(liq.afp),
    'Renta imponible AFP':    Math.round(liq.base_afp||0),
    'Cotización AFP trab.':   Math.round(liq.monto_afp||0),
    'SIS (cargo empleador)':  Math.round(liq.monto_sis||0),
    'Institución salud':      liq.sistema_salud||'Fonasa',
    'Código salud':           _codSaludPrevired(liq.sistema_salud),
    'Cotización salud':       Math.round(liq.monto_salud||0),
    'Renta imponible AFC':    Math.round(liq.base_afc||0),
    'AFC trabajador':         Math.round(liq.monto_afc_trab||0),
    'AFC empleador':          Math.round(liq.monto_afc_emp||0),
    'IUSC':                   Math.round(liq.iusc||0),
    'Tipo contrato':          _tipoContratoLabel(liq.tipo_contrato),
    'Faena / centro costo':   t.faena_obra || '—',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.min(Math.max(k.length+2, 10), 26) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Previred detallado');
  XLSX.writeFile(wb, `Previred_Detallado_${(ep?.rut||'empresa').replace(/[.\-]/g,'')}_${periodo}.xlsx`);
  toast('⬇️ Excel detallado exportado', 'exito');
}
