/* ════ CORE — estado global, utilidades, navegación ════ */

const CFG_KEY='agro_cfg', LOCAL_T='agro_trabajadores', LOCAL_E='agro_empresas', LOCAL_EP='agro_empresas_propias';
const LOCAL_C='agro_contratos', LOCAL_AN='agro_anexos', LOCAL_CARPETA='agro_carpeta';
let cfg={}, supabaseClient=null, trabajadores=[], empresas=[], datosExcel=[];
let contratos=[], anexos=[], empresas_propias=[], carpeta=[];
let novedades=[], haberes_variables=[], descuentos=[], jornada_especial=[];
let contratoEditandoId=null, _rutPrecontratoTemp=null;
let tabEmpresasActivo='mis-empresas', tabContratosActivo='contratos';
let toastTimer;
let sesionActiva=null;
const SUPERADMIN={usuario:'admin',password:'agro2024',rol:'superadmin'};
const DIAS_JORNADA=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const TIPOS_ANEXO={
  cambio_labor:'Cambio de Labor',cambio_cargo:'Cambio de Cargo',
  cambio_faena:'Cambio de Faena',cambio_mandante:'Cambio de Empresa Mandante',
  cambio_jornada:'Cambio de Jornada',cambio_remuneracion:'Cambio de Remuneración',
  prorroga:'Prórroga de Contrato',cambio_domicilio:'Cambio de Domicilio Laboral',
  asignacion_especial:'Asignación Especial',otro:'Otro',
};
const PI={
  dashboard:{title:'Dashboard',sub:()=>`Hoy: ${new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}`},
  registro:{title:'Registro de Personal',sub:()=>'Ingresa trabajadores al sistema'},
  trabajadores:{title:'Trabajadores',sub:()=>`${trabajadores.length} trabajadores en el sistema`},
  contratistas:{title:'Empresas',sub:()=>`${empresas_propias.length} propias · ${empresas.length} mandantes`},
  contratos:{title:'Contratos',sub:()=>'Registro y generación de contratos de trabajo'},
  qr:{title:'Generar QR',sub:()=>'Credenciales de identificación'},
  asistencia:{title:'Control de Asistencia',sub:()=>'Tareo diario y registro de jornadas'},
  exportar:{title:'Exportar datos',sub:()=>'Descarga reportes en distintos formatos'},
  config:{title:'Configuración',sub:()=>'Sistema y gestión de accesos'},
};

function cargarConfig(){
  try{ cfg=JSON.parse(localStorage.getItem(CFG_KEY))||{}; }
  catch(e){ cfg={}; console.warn('localStorage no disponible:', e.message); }
}

function guardarCfg(){localStorage.setItem(CFG_KEY,JSON.stringify(cfg))}

function iniciarSupabase(){
  const url=cfg.supabase_url||'', key=cfg.supabase_key||'';
  if(!url||!key){setDB(false,'Sin configurar — ve a Configuración');return false}
  try{
    supabaseClient=supabase.createClient(url,key);
    verificarConexion(); return true;
  }catch{setDB(false,'Error al inicializar');return false}
}

async function verificarConexion(){
  if(!supabaseClient)return;
  try{
    const{error}=await supabaseClient.from('trabajadores').select('id').limit(1);
    if(error)throw error;
    setDB(true,'Conectado correctamente');
    document.getElementById('top-conexion').textContent='● Supabase OK';
    await cargarDatos();
  }catch{setDB(false,'Error — verifica credenciales')}
}

function setDB(ok,txt){
  const b=document.getElementById('db-status-badge'), l=document.getElementById('db-status-txt');
  if(!b||!l)return;
  b.textContent=ok?'● Conectado':'● Desconectado';
  b.className='badge '+(ok?'badge-verde':'badge-rojo');
  l.textContent=txt;
}

function irA(idPagina, botonEl) {

  document.querySelectorAll('.pagina').forEach(pag => {
    pag.classList.remove('activa');
    pag.style.display = 'none';
  });

  let idDestino = idPagina.startsWith('p-') ? idPagina : 'p-' + idPagina;
  const paginaActiva = document.getElementById(idDestino);
  
  // 1. Manejar estado visual del botón activo PRIMERO (antes de cualquier init)
  document.querySelectorAll('.sb-item').forEach(btn => btn.classList.remove('activo'));

  if (botonEl) {
    botonEl.classList.add('activo');
  } else {
    document.querySelectorAll('.sb-item').forEach(btn => {
      const attrClick = btn.getAttribute('onclick') || '';
      if (attrClick.includes(`'${idPagina.replace('p-', '')}'`)) {
        btn.classList.add('activo');
      }
    });
  }

  // 2. Mostrar página
  if (paginaActiva) {
    paginaActiva.classList.add('activa');
    paginaActiva.style.display = 'block';

    // 3. Inicializar módulo en siguiente tick para no bloquear el render visual
    setTimeout(() => {
      if(idPagina === 'gestion-laboral' || idPagina === 'p-gestion-laboral'){ initGestionLaboral(); }
      if(idPagina === 'remuneraciones' || idPagina === 'p-remuneraciones'){ initIndicadores(); initLiquidaciones(); initLibro(); switchTabRem('rem-indicadores'); }
      if(idPagina === 'trabajadores' || idPagina === 'p-trabajadores'){ poblarSelects(); poblarSelectsEmpresaPropia(); cargarTrabajadores(); actualizarBadgeExtranjeros(trabajadores.filter(t=>t.nacionalidad&&t.nacionalidad!=='Chileno'&&t.estado==='activo')); }
      if(idPagina === 'registro'      || idPagina === 'p-registro'){      poblarSelects(); poblarSelectsEmpresaPropia(); switchTabRegistro('individual'); }
      if(idPagina === 'p-perfil-trabajador'){ /* contenido se carga desde verPerfilTrabajador */ }
      if(idPagina === 'contratistas' || idPagina === 'p-contratistas'){ switchTabEmpresas(tabEmpresasActivo||'mis-empresas'); }
      if(idPagina === 'qr'           || idPagina === 'p-qr'){           poblarSelects(); cargarListaQR(); }
      if(idPagina === 'asistencia'   || idPagina === 'p-asistencia'){   initAsistencia(); }
      if(idPagina === 'contratos'    || idPagina === 'p-contratos'){
        const rut = _rutPrecontratoTemp;
        _rutPrecontratoTemp = null;
        initContratos(rut);
      }
      if(idPagina === 'dashboard'    || idPagina === 'p-dashboard'){    renderDashboard(); }
      if(idPagina === 'alertas'      || idPagina === 'p-alertas'){      initAlertas(); }
      if(idPagina === 'config'       || idPagina === 'p-config'){       cargarFormConfig(); }
    }, 0);

  } else {
    console.error(`La página con ID "${idDestino}" no existe en el HTML.`);
  }

  // 4. Notificar al módulo de ayuda
  if (typeof onCambioModuloAyuda === 'function') {
    onCambioModuloAyuda(idPagina);
  }
}

/* Fecha de hoy en formato 'YYYY-MM-DD', usada por las funciones de
   Asistencia del Dashboard. */
function _fechaHoyISO(){
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
}

/* Presentes hoy: cuenta trabajadores activos con marcación de entrada
   registrada en el día de hoy. Mismo criterio ('hora_entrada' presente)
   que ya usa variables.js (_leerAsistenciaMes) para no tener dos
   definiciones distintas de "asistió". */
function _presentesHoyDashboard(){
  const fecha = _fechaHoyISO();
  const data = JSON.parse(localStorage.getItem('asistencia_' + fecha) || '[]');
  const activos = trabajadores.filter(t => t.estado === 'activo');
  const presentes = activos.filter(t => data.some(x => x.rut === t.rut && x.hora_entrada)).length;
  return { presentes, total: activos.length };
}

/* Asistencia promedio del mes en curso: promedio del % de trabajadores
   activos presentes, calculado día hábil por día hábil transcurrido.
   Los días sin ningún dato de Asistencia guardado se omiten (no cuentan
   como 0% ni afectan el promedio) — mismo criterio ya usado en
   gestion-laboral.js (_leerAusenciasAsistencia) para no generar falsos
   negativos en meses/días sin uso del módulo de Asistencia. */
function _asistenciaMesPromedio(){
  const hoy = new Date();
  const anio = hoy.getFullYear(), mes = hoy.getMonth() + 1;
  const activos = trabajadores.filter(t => t.estado === 'activo');
  if(!activos.length) return null;

  let sumaPct = 0, diasContados = 0;
  for(let d = 1; d <= hoy.getDate(); d++){
    const fecha = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const diaSemana = new Date(fecha + 'T12:00:00').getDay();
    if(diaSemana === 0 || diaSemana === 6) continue; // solo días hábiles
    const data = JSON.parse(localStorage.getItem('asistencia_' + fecha) || '[]');
    if(!data.length) continue; // día sin ningún dato registrado: se omite
    const presentes = activos.filter(t => data.some(x => x.rut === t.rut && x.hora_entrada)).length;
    sumaPct += (presentes / activos.length) * 100;
    diasContados++;
  }
  return diasContados ? Math.round(sumaPct / diasContados) : null;
}

/* Últimas marcaciones del día de hoy, más recientes primero. */
function _ultimasMarcacionesHoy(limite){
  const fecha = _fechaHoyISO();
  const data = JSON.parse(localStorage.getItem('asistencia_' + fecha) || '[]');
  return data
    .filter(x => x.hora_entrada)
    .map(x => ({ ...x, t: trabajadores.find(tr => tr.rut === x.rut) }))
    .sort((a, b) => (b.hora_entrada || '').localeCompare(a.hora_entrada || ''))
    .slice(0, limite);
}

/* Asistencia de la semana actual (lunes a domingo): cantidad de
   trabajadores activos presentes cada día. Los días futuros de la
   semana en curso muestran 0 (todavía no hay marcación posible). */
function _asistenciaSemanalDashboard(){
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0 = domingo
  const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + offsetLunes);

  const activos = trabajadores.filter(t => t.estado === 'activo');
  const vals = [];
  let idxHoy = 0;
  for(let i = 0; i < 7; i++){
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(fecha === _fechaHoyISO()) idxHoy = i;
    if(d > hoy){ vals.push(0); continue; }
    const data = JSON.parse(localStorage.getItem('asistencia_' + fecha) || '[]');
    const presentes = activos.filter(t => data.some(x => x.rut === t.rut && x.hora_entrada)).length;
    vals.push(presentes);
  }
  return { vals, idxHoy };
}

function renderDashboard(){
  const total=trabajadores.length, activos=trabajadores.filter(t=>t.estado==='activo').length;
  document.getElementById('kpi-total').textContent=total;
  document.getElementById('kpi-activos-sub').textContent=activos+' activos';
  document.getElementById('kpi-contratistas').textContent=empresas.length;

  // ✅ Presentes hoy — conectado a Asistencia real (localStorage)
  const { presentes, total: totalActivosHoy } = _presentesHoyDashboard();
  document.getElementById('kpi-presentes').textContent = totalActivosHoy ? presentes : '—';
  document.getElementById('kpi-presentes-sub').textContent = totalActivosHoy
    ? `de ${totalActivosHoy} activos`
    : 'sin trabajadores activos';

  // ✅ Asistencia mes — conectado a Asistencia real (localStorage)
  const pctMes = _asistenciaMesPromedio();
  document.getElementById('kpi-asistencia').textContent = pctMes !== null ? pctMes + '%' : '—%';

  const colors=['#10b981','#2563EB','#D97706','#7C3AED','#DC2626'];
  const barEl=document.getElementById('barras-contratistas');
  if(!empresas.length){
    barEl.innerHTML='<div style="font-size:13px;color:var(--texto3);text-align:center;padding:20px 0;">Agrega mandantes para ver el resumen</div>';
  } else {
    barEl.innerHTML=empresas.map((e,i)=>{
      const t=trabajadores.filter(w=>(w.mandante_id||w.empresa_rut||w.empresa)===( e.id||e.rut)).length;
      const a=trabajadores.filter(w=>(w.mandante_id||w.empresa_rut||w.empresa)===( e.id||e.rut)&&w.estado==='activo').length;
      const pct=t?Math.round(a/t*100):0;
      return`<div class="barra-row"><div class="barra-header"><span>${e.nombre}</span><span>${a}/${t} activos</span></div><div class="barra-track"><div class="barra-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div></div>`;
    }).join('');
  }
  // ✅ Asistencia semanal — conectado a Asistencia real; se resalta la
  // columna del día de HOY (antes resaltaba siempre "Viernes" a la fuerza,
  // sin relación con la fecha real).
  const dias=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const { vals, idxHoy } = _asistenciaSemanalDashboard();
  const max=Math.max(...vals,1);
  document.getElementById('chart-semanal').innerHTML=dias.map((d,i)=>`<div class="chart-col"><div class="chart-val">${vals[i]||''}</div><div class="chart-bar" style="height:${Math.round(vals[i]/max*60)+4}px;background:${i===idxHoy?'#2563EB':'#D1FAE5'}"></div><div class="chart-lbl">${d}</div></div>`).join('');

  const bMan=document.getElementById('badge-mandantes-tab'); if(bMan) bMan.textContent=empresas.length;
  const bMis=document.getElementById('badge-mis-empresas'); if(bMis) bMis.textContent=empresas_propias.length;
  poblarSelectsEmpresaPropia();

  // ✅ Últimas marcaciones — conectado a Asistencia real
  const ultimas = _ultimasMarcacionesHoy(5);
  document.getElementById('ultimas-marcaciones').innerHTML = ultimas.length
    ? ultimas.map(m => `<div class="barra-row" style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:500;">${m.t?.nombre || m.rut}</span>
        <span style="font-size:12px;color:var(--texto2);">${m.hora_entrada}</span>
      </div>`).join('')
    : '<div style="font-size:13px;color:var(--texto3);text-align:center;padding:20px 0;">Sin marcaciones registradas hoy</div>';

  // Verificar alerta de indicadores
  if(typeof verificarAlertaIndicadores === 'function') verificarAlertaIndicadores();
}

function formatearUF(input){
  // Permite formato 39.485,65 — miles con punto, decimales con coma
  let val = input.value.replace(/[^0-9,]/g,'');
  const partes = val.split(',');
  let entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  input.value = partes.length > 1 ? entero + ',' + partes[1].slice(0,2) : entero;
}

function formatearRUT(input){
  let v = input.value.replace(/[^0-9kK]/g,'').toUpperCase();

  if(v.length > 9) v = v.slice(0,9);

  if(v.length > 1){
    const dv = v.slice(-1);
    const num = v.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    input.value = num + '-' + dv;
  } else {
    input.value = v;
  }
}

function formatearRutBuscador(input){
  let val = input.value.replace(/[^0-9kK]/g,'');
  if(val.length > 1){
    const cuerpo = val.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    val = cuerpo + '-' + val.slice(-1).toUpperCase();
  }
  input.value = val;
}

function formatearRutInput(input){
  let val = input.value.replace(/[^0-9kK]/g,'').toUpperCase();
  if(val.length > 9) val = val.slice(0,9);
  if(val.length > 1){
    const cuerpo = val.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    val = cuerpo + '-' + val.slice(-1).toUpperCase();
  }
  input.value = val;
}

function validarRUT(rut){
  if(!rut) return false;
  const limpio = rut.replace(/[^0-9kK]/g,'');
  if(limpio.length < 2) return false;
  const cuerpo = limpio.slice(0,-1);
  const dv     = limpio.slice(-1).toUpperCase();
  let suma = 0, multiplo = 2;
  for(let i = cuerpo.length - 1; i >= 0; i--){
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvCalc = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado);
  return dv === dvCalc;
}

function normalizarEmpresa(ep){
  if(!ep) return {};
  return {
    ...ep,
    razon_social:  ep.razon_social  || ep.nombre || '',
    representante: ep.representante || ep.nombre_representante || '',
    rut_representante: ep.rut_representante || '',
    cargo_representante: ep.cargo_representante || '',
    correo: ep.correo || '',
    direccion: ep.direccion || '',
    ciudad: ep.ciudad || '',
  };
}

function getEmpresaEmpleadora(epId){
  const ep = epId ? empresas_propias.find(e => e.id === epId) : null;
  return normalizarEmpresa(ep || cfg.empresa);
}

function findMandante(t){
  if(!t) return null;
  const ref = t.mandante_id || t.empresa_rut || t.empresa || '';
  return empresas.find(e => e.id === ref || e.rut === ref) || null;
}

function toast(msg,tipo='exito'){
  const el=document.getElementById('toast');
  el.textContent=msg; el.className=`toast show ${tipo}`;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3500);
}

function guardarLocal(){localStorage.setItem(LOCAL_T,JSON.stringify(trabajadores));localStorage.setItem(LOCAL_E,JSON.stringify(empresas));localStorage.setItem(LOCAL_EP,JSON.stringify(empresas_propias));}
function guardarCarpeta(){ localStorage.setItem(LOCAL_CARPETA, JSON.stringify(carpeta)); }

function registrarDocumentoCarpeta({ trabajador_id, trabajador_rut, tipo, subtipo, folio, fecha_firma, descripcion }){
  // Evita duplicar el mismo documento (ej. reabrir "Ver documento" o cargar el kit dos veces)
  const yaExiste = carpeta.find(d =>
    d.trabajador_rut === trabajador_rut && d.tipo === tipo &&
    d.subtipo === (subtipo||'') && d.fecha_firma === (fecha_firma||''));
  if(yaExiste) return yaExiste;

  const doc = {
    id:              Date.now().toString(),
    trabajador_id,
    trabajador_rut,
    tipo,            // 'contrato' | 'anexo' | 'epp_riohs_irl' | 'liquidacion' | 'finiquito' | 'carta' | 'otro'
    subtipo:         subtipo || '',
    folio:           folio   || '',
    fecha_generacion: new Date().toISOString().slice(0,10),
    fecha_firma:     fecha_firma || '',
    generado_por:    sesionActiva?.usuario || 'admin',
    descripcion:     descripcion || '',
  };
  carpeta.push(doc);
  guardarCarpeta();
  return doc;
}

function cargarLocal(){
  try{trabajadores=JSON.parse(localStorage.getItem(LOCAL_T))||[];}catch{trabajadores=[];}
  try{empresas=JSON.parse(localStorage.getItem(LOCAL_E))||[];}catch{empresas=[];}
  try{empresas_propias=JSON.parse(localStorage.getItem(LOCAL_EP))||[];}catch{empresas_propias=[];}
  try{carpeta=JSON.parse(localStorage.getItem(LOCAL_CARPETA))||[];}catch{carpeta=[];}
}

function migrarIDs(){
  // Asignar id a empresas que no lo tienen (datos legacy)
  let cambios = false;
  empresas.forEach(e => {
    if(!e.id){ e.id = crypto.randomUUID(); cambios = true; }
  });
  trabajadores.forEach(t => {
    if(!t.mandante_id && (t.empresa_rut || t.empresa)){
      // Buscar el id del mandante por rut
      const m = empresas.find(x => x.rut === (t.empresa_rut||t.empresa));
      t.mandante_id = m?.id || t.empresa_rut || t.empresa;
      cambios = true;
    }
  });
  if(cambios) guardarLocal();
}

async function cargarDatos(){
  if(!supabaseClient){cargarLocal();poblarSelects();return;}
  try{
    const[rt,re]=await Promise.all([supabaseClient.from('trabajadores').select('*'),supabaseClient.from('empresas').select('*')]);
    if(!rt.error)trabajadores=rt.data||[];
    if(!re.error)empresas=re.data||[];
    guardarLocal(); poblarSelects();
  }catch{cargarLocal();poblarSelects();}
}

function poblarSelects(){
  // Selects de mandantes (antes "contratistas")
  // ✅ Bypass de Mandante: m-empresa (Registro Personal individual) y
  // lote-mandante (carga masiva de Registro Personal) ya no existen —
  // el Mandante se elige en Contratos. Se agregan cp-mandante
  // (Contrato Individual) y masivo-mandante (Contrato Masivo).
  const ids=['cp-mandante','masivo-mandante','filtro-empresa','filtro-empresa-ext','asist-empresa','qr-filtro-empresa'];
  ids.forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    const val=el.value;
    const isFilter=(id!=='cp-mandante' && id!=='masivo-mandante');
    el.innerHTML=(isFilter
      ?'<option value="">Todos los mandantes</option>'
      :'<option value="">— Seleccionar mandante —</option>'
    )+empresas.map(e=>`<option value="${e.id||e.rut}">${e.nombre}</option>`).join('');
    if(val)el.value=val;
  });

  const bMan=document.getElementById('badge-mandantes-tab'); if(bMan) bMan.textContent=empresas.length;
  const bMis=document.getElementById('badge-mis-empresas'); if(bMis) bMis.textContent=empresas_propias.length;
  poblarSelectsEmpresaPropia();

  // Selector trabajador en liquidaciones
  const selLiqTrab = document.getElementById('liq-sel-trabajador');
  if(selLiqTrab){
    const val = selLiqTrab.value;
    selLiqTrab.innerHTML = '<option value="">— Seleccionar —</option>'
      + trabajadores.filter(t=>t.estado==='activo')
        .map(t=>`<option value="${t.rut}">${t.nombre} · ${t.rut}</option>`).join('');
    if(val) selLiqTrab.value = val;
  }
}

function actualizarUI(){
  const n=cfg.admin_nombre||'Administrador';
  document.getElementById('sb-nombre').textContent=n;
  document.getElementById('sb-av').textContent=n.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
}
