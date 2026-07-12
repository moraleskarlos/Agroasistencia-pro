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
      if(idPagina === 'trabajadores' || idPagina === 'p-trabajadores'){ poblarSelects(); cargarTrabajadores(); actualizarBadgeExtranjeros(trabajadores.filter(t=>t.nacionalidad&&t.nacionalidad!=='Chileno'&&t.estado==='activo')); }
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

function renderDashboard(){
  const total=trabajadores.length, activos=trabajadores.filter(t=>t.estado==='activo').length;
  document.getElementById('kpi-total').textContent=total;
  document.getElementById('kpi-activos-sub').textContent=activos+' activos';
  document.getElementById('kpi-contratistas').textContent=empresas.length;
  document.getElementById('kpi-presentes').textContent='—';
  document.getElementById('kpi-presentes-sub').textContent='Conecta Supabase';
  document.getElementById('kpi-asistencia').textContent='—%';
  const colors=['#10b981','#2563EB','#D97706','#7C3AED','#DC2626'];
  const barEl=document.getElementById('barras-contratistas');
  if(!empresas.length){barEl.innerHTML='<div style="font-size:13px;color:var(--texto3);text-align:center;padding:20px 0;">Agrega mandantes para ver el resumen</div>';return;}
  barEl.innerHTML=empresas.map((e,i)=>{
    const t=trabajadores.filter(w=>(w.mandante_id||w.empresa_rut||w.empresa)===( e.id||e.rut)).length;
    const a=trabajadores.filter(w=>(w.mandante_id||w.empresa_rut||w.empresa)===( e.id||e.rut)&&w.estado==='activo').length;
    const pct=t?Math.round(a/t*100):0;
    return`<div class="barra-row"><div class="barra-header"><span>${e.nombre}</span><span>${a}/${t} activos</span></div><div class="barra-track"><div class="barra-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div></div>`;
  }).join('');
  const dias=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],vals=[0,0,0,0,0,0,0],max=Math.max(...vals,1);
  document.getElementById('chart-semanal').innerHTML=dias.map((d,i)=>`<div class="chart-col"><div class="chart-val">${vals[i]||''}</div><div class="chart-bar" style="height:${Math.round(vals[i]/max*60)+4}px;background:${i===4?'#2563EB':'#D1FAE5'}"></div><div class="chart-lbl">${d}</div></div>`).join('');
  document.getElementById('badge-trabajadores').textContent=total;
  document.getElementById('badge-contratistas').textContent=empresas_propias.length+empresas.length;
  const bMan=document.getElementById('badge-mandantes-tab'); if(bMan) bMan.textContent=empresas.length;
  const bMis=document.getElementById('badge-mis-empresas'); if(bMis) bMis.textContent=empresas_propias.length;
  poblarSelectsEmpresaPropia();
  document.getElementById('ultimas-marcaciones').innerHTML='<div style="font-size:13px;color:var(--texto3);text-align:center;padding:20px 0;">Usa el módulo de Asistencia para registrar marcaciones</div>';
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
  const ids=['m-empresa','filtro-empresa','asist-empresa','qr-filtro-empresa'];
  ids.forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    const val=el.value;
    const isFilter=(id!=='m-empresa');
    el.innerHTML=(isFilter
      ?'<option value="">Todos los mandantes</option>'
      :'<option value="">— Seleccionar mandante —</option>'
    )+empresas.map(e=>`<option value="${e.id||e.rut}">${e.nombre}</option>`).join('');
    if(val)el.value=val;
  });

  document.getElementById('badge-contratistas').textContent=empresas_propias.length+empresas.length;
  const bMan=document.getElementById('badge-mandantes-tab'); if(bMan) bMan.textContent=empresas.length;
  const bMis=document.getElementById('badge-mis-empresas'); if(bMis) bMis.textContent=empresas_propias.length;
  poblarSelectsEmpresaPropia();
  document.getElementById('badge-trabajadores').textContent=trabajadores.length;

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
