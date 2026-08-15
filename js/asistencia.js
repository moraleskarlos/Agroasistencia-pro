/* ════ ASISTENCIA ════ */

function initAsistencia(){
  const hoy = hoyISO();
  document.getElementById('asist-fecha-desde').value = hoy;
  document.getElementById('asist-fecha-hasta').value = hoy;
  const manualFecha = document.getElementById('manual-fecha');
  if(manualFecha) manualFecha.value = hoy;
  if(typeof poblarSelectsEmpresaPropia === 'function') poblarSelectsEmpresaPropia();
  switchTabAsistencia('dia');
  cambiarModoManualAsistencia('individual');
  cargarAsistencia();
}

function switchTabAsistencia(tab){
  const esDia = tab === 'dia';
  document.getElementById('tab-asist-dia').style.borderBottomColor = esDia ? 'var(--azul)' : 'transparent';
  document.getElementById('tab-asist-dia').style.color = esDia ? '#fff' : 'var(--texto2)';
  document.getElementById('tab-asist-dia').style.background = esDia ? 'var(--azul)' : 'none';
  document.getElementById('tab-asist-manual').style.borderBottomColor = esDia ? 'transparent' : 'var(--azul)';
  document.getElementById('tab-asist-manual').style.color = esDia ? 'var(--texto2)' : '#fff';
  document.getElementById('tab-asist-manual').style.background = esDia ? 'none' : 'var(--azul)';
  document.getElementById('sub-tab-asist-dia').style.display = esDia ? '' : 'none';
  document.getElementById('sub-tab-asist-manual').style.display = esDia ? 'none' : '';
}

function calcularHoras(entrada, salida, colacionMin){
  if(!entrada || !salida) return null;
  const h1 = new Date('1970-01-01T' + entrada);
  let   h2 = new Date('1970-01-01T' + salida);
  // Manejo trabajo nocturno
  if(h2 <= h1) h2 = new Date('1970-01-02T' + salida);
  const horas = (h2 - h1) / (1000 * 60 * 60) - ((colacionMin||0) / 60);
  return Math.round(Math.max(0, horas) * 10) / 10; // redondear a 1 decimal
}

/* Busca el contrato vigente del trabajador para la fecha de la marcación
   y devuelve sus minutos de colación — la fuente real es el Contrato, no
   un valor inventado en Asistencia. */
function _colacionMinutosTrabajador(rut, fecha){
  const periodo   = (fecha||'').slice(0,7);
  const contrato  = (typeof _getContratoVigente === 'function') ? _getContratoVigente(rut, periodo) : null;
  return _colacionMinutosContrato(contrato);
}

const _NOMBRES_DIA_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

/* Horas esperadas para un trabajador en un día puntual, según su jornada
   vigente (anexo de Cambio de Jornada si existe, si no el contrato base —
   ver _jornadaVigenteTrabajador en anexos.js). Devuelve null si no hay
   jornada configurada (no se puede comparar), o el número de horas
   esperadas (0 si ese día no le corresponde trabajar). */
function _horasEsperadasDia(rut, fecha){
  const jornada = (typeof _jornadaVigenteTrabajador === 'function') ? _jornadaVigenteTrabajador(rut, fecha) : null;
  if(!jornada) return null;

  const diaSemana = _NOMBRES_DIA_SEMANA[new Date(fecha + 'T00:00:00').getDay()];
  const d = jornada[diaSemana];
  if(!d || !d.activo || !d.inicio || !d.fin) return 0;

  const colMin = _colacionMinutosTrabajador(rut, fecha);
  return calcularHoras(d.inicio, d.fin, colMin) || 0;
}

/* Horas extra ya cargadas como novedad (Bonos y Horas Extras) para ese
   trabajador y fecha — para no avisar dos veces algo que ya está
   registrado como corresponde. */
function _horasExtraRegistradasDia(rut, fecha){
  const lista = (typeof novedades !== 'undefined') ? novedades : [];
  return lista
    .filter(n => n.trabajador_rut === rut && n.tipo === 'hora_extra' && n.fecha === fecha)
    .reduce((s,n) => s + (parseFloat(n.horas) || 0), 0);
}

/* Suma las horas trabajadas de la semana (lunes a domingo) que contiene
   la fecha dada, para validar el máximo legal de 42 horas semanales. */
function _horasSemanaTrabajador(rut, fecha){
  const d = new Date(fecha + 'T00:00:00');
  const diaISO = (d.getDay() + 6) % 7; // lunes=0 ... domingo=6
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - diaISO);

  let total = 0;
  for(let i = 0; i < 7; i++){
    const f = new Date(lunes);
    f.setDate(lunes.getDate() + i);
    const fechaStr = f.toISOString().split('T')[0];
    const data = JSON.parse(localStorage.getItem('asistencia_' + fechaStr) || '[]');
    const reg = data.find(x => x.rut === rut);
    if(reg?.horas_trabajadas) total += reg.horas_trabajadas;
  }
  return Math.round(total * 10) / 10;
}

/* Aviso de horas para una marcación puntual — compara contra lo esperado
   ese día, cruza con Horas Extra ya cargadas, y valida los 2 topes legales
   (2h extra diarias, 42h semanales). Devuelve null si no hay nada que
   avisar, o { nivel: 'info'|'aviso'|'critico', texto }. No bloquea nada,
   es solo informativo para quien revisa Asistencia. */
function _avisoHorasDia(rut, fecha, horasReales){
  if(horasReales === null || horasReales === undefined) return null;
  const avisos = [];

  const esperadas = _horasEsperadasDia(rut, fecha);
  if(esperadas !== null){
    const diff = Math.round((horasReales - esperadas) * 10) / 10;
    if(Math.abs(diff) >= 0.05){
      if(diff < 0){
        avisos.push({ nivel:'info', texto:`Se esperaban ${esperadas}h, se registraron ${horasReales}h` });
      } else {
        const horasExtraCargadas = _horasExtraRegistradasDia(rut, fecha);
        const sinExplicar = Math.round((diff - horasExtraCargadas) * 10) / 10;
        if(sinExplicar > 0.05){
          avisos.push({
            nivel: diff > 2 ? 'critico' : 'aviso',
            texto: diff > 2
              ? `Trabajó ${diff}h de más — supera el máximo legal de 2h extra diarias`
              : `Trabajó ${diff}h de más — ¿es hora extra? Cárgala en Bonos y Horas Extras`,
          });
        } else if(diff > 2){
          avisos.push({ nivel:'critico', texto:`Supera el máximo legal de 2h extra diarias (${diff}h de más)` });
        }
      }
    }
  }

  const totalSemana = _horasSemanaTrabajador(rut, fecha);
  if(totalSemana > 42){
    avisos.push({ nivel:'critico', texto:`Semana con ${totalSemana}h — supera el máximo legal de 42h semanales` });
  }

  if(!avisos.length) return null;
  const nivel = avisos.some(a => a.nivel === 'critico') ? 'critico'
    : avisos.some(a => a.nivel === 'aviso') ? 'aviso' : 'info';
  return { nivel, texto: avisos.map(a => a.texto).join(' · ') };
}

function calcularJornada(horas){
  if(horas === null || horas === undefined) return { jornada: '—', valor: null, alerta: false };
  if(horas === 0)   return { jornada: 'Ausente',   valor: 0,   alerta: false };
  if(horas <= 5)    return { jornada: 'Media',      valor: 0.5, alerta: false };
  if(horas <= 10)   return { jornada: 'Completa',   valor: 1,   alerta: false };
  if(horas <= 12)   return { jornada: 'Extendida',  valor: 1.5, alerta: false };
  return              { jornada: '⚠️ Revisar',   valor: null, alerta: true  };
}

function badgeJornada(jornada){
  const map = {
    'Ausente':     'badge-rojo',
    'Media':       'badge-amarillo',
    'Completa':    'badge-verde',
    'Extendida':   'badge-azul',
    '⚠️ Revisar': 'badge-rojo',
    '—':           'badge-gris',
  };
  const cls = map[jornada] || 'badge-gris';
  return `<span class="badge ${cls}">${jornada}</span>`;
}

function badgeEstado(registro){
  if(!registro)               return '<span class="badge badge-gris">Pendiente</span>';
  if(!registro.hora_salida)   return '<span class="badge badge-amarillo">Activo</span>';
  return                             '<span class="badge badge-verde">Cerrado</span>';
}

/* ════════════════════════════════════════════════════════
   ASISTENCIA DEL DÍA — unificada con "Ver rango de fechas"
   Si Desde === Hasta: vista de un solo día, editable (marcar,
   corregir, cierre masivo de turno).
   Si Desde !== Hasta: vista de rango, de solo lectura, con el
   detalle agregado del período (antes era un reporte aparte).
   ════════════════════════════════════════════════════════ */
function cargarAsistencia(){
  const desde = document.getElementById('asist-fecha-desde')?.value;
  const hasta = document.getElementById('asist-fecha-hasta')?.value;
  if(!desde || !hasta) return;

  if(desde > hasta){
    toast('⚠️ "Desde" no puede ser posterior a "Hasta"', 'error');
    return;
  }

  if(desde === hasta) _renderAsistenciaDia(desde);
  else _renderAsistenciaRango(desde, hasta);
}

function toggleMenuRangoAsistencia(){
  const menu = document.getElementById('menu-rango-asist');
  if(!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

/* Atajos rápidos de rango — fijan Desde/Hasta y recargan */
function rangoRapidoAsistencia(tipo){
  const hoy = fechaLocal(hoyISO());
  const fmt = d => d.toISOString().slice(0,10);
  let inicio, fin;

  if(tipo === 'hoy'){
    inicio = fin = new Date(hoy);
  } else if(tipo === 'ayer'){
    inicio = fin = new Date(hoy); inicio.setDate(inicio.getDate()-1); fin = new Date(inicio);
  } else if(tipo === 'semana'){
    const diaSemana = (hoy.getDay() + 6) % 7; // lunes=0
    inicio = new Date(hoy); inicio.setDate(hoy.getDate() - diaSemana);
    fin = new Date(hoy);
  } else if(tipo === 'semana_pasada'){
    const diaSemana = (hoy.getDay() + 6) % 7;
    fin = new Date(hoy); fin.setDate(hoy.getDate() - diaSemana - 1);
    inicio = new Date(fin); inicio.setDate(fin.getDate() - 6);
  } else if(tipo === 'mes'){
    inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    fin = new Date(hoy);
  } else if(tipo === 'mes_pasado'){
    inicio = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
    fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  }

  document.getElementById('asist-fecha-desde').value = fmt(inicio);
  document.getElementById('asist-fecha-hasta').value = fmt(fin);
  toggleMenuRangoAsistencia();
  cargarAsistencia();
}

function _fechasEnRango(inicio, fin){
  const fechas = [];
  const d = new Date(inicio + 'T00:00:00');
  const dFin = new Date(fin + 'T00:00:00');
  while(d <= dFin){
    fechas.push(d.toISOString().slice(0,10));
    d.setDate(d.getDate()+1);
  }
  return fechas;
}

/* ── Vista de un solo día (editable) ─────────────────────── */
function _renderAsistenciaDia(fecha){
  const filtro  = document.getElementById('asist-empresa').value;
  const buscar  = (document.getElementById('asist-buscar')?.value || '').toLowerCase().trim();
  const clave   = 'asistencia_' + fecha;
  const data    = JSON.parse(localStorage.getItem(clave) || '[]');

  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(filtro) lista = lista.filter(t => (t.mandante_id === filtro));
  if(buscar) lista = lista.filter(t => t.nombre?.toLowerCase().includes(buscar) || t.rut?.toLowerCase().includes(buscar));

  let activos = 0, cerrados = 0;
  lista.forEach(t => {
    const r = data.find(x => x.rut === t.rut);
    if(r){ if(!r.hora_salida) activos++; else cerrados++; }
  });
  const sinMarcar = lista.length - activos - cerrados;
  const anticipadas = data.filter(r => {
    const h = r.horas_trabajadas;
    return h !== null && h !== undefined && h > 0 && h <= 5;
  }).length;

  const kpis = document.getElementById('asist-kpi-grid');
  if(kpis) kpis.innerHTML = `
    <div class="kpi azul"><div class="kpi-label">Trabajadores</div><div class="kpi-value">${lista.length}</div><div class="kpi-sub">activos ese día</div></div>
    <div class="kpi verde"><div class="kpi-label">Activos</div><div class="kpi-value">${activos}</div><div class="kpi-sub">jornada en curso</div></div>
    <div class="kpi"><div class="kpi-label">Cerrados</div><div class="kpi-value">${cerrados}</div><div class="kpi-sub">jornada completa</div></div>
    <div class="kpi"><div class="kpi-label">Sin marcar</div><div class="kpi-value">${sinMarcar}</div><div class="kpi-sub">sin registro hoy</div></div>
    <div class="kpi amarillo"><div class="kpi-label">Salidas anticipadas</div><div class="kpi-value">${anticipadas}</div><div class="kpi-sub">≤5 horas</div></div>`;

  const titulo = document.getElementById('asist-card-title');
  if(titulo) titulo.innerHTML = `<i class="ti ti-calendar-check"></i> Asistencia del Día — ${fmtFecha(fecha)}`;

  const accionesDia = document.getElementById('asist-acciones-dia');
  if(accionesDia) accionesDia.style.display = 'contents';

  const thead = document.getElementById('thead-asistencia');
  if(thead) thead.innerHTML = `<tr>
    <th style="width:30px;"><input type="checkbox" id="check-all" onchange="seleccionarTodosAsist(this.checked)" style="accent-color:var(--verde);width:16px;height:16px;"></th>
    <th style="width:22%;">Trabajador</th>
    <th style="width:12%;">RUT</th>
    <th style="width:9%;">Registrado por</th>
    <th style="width:11%;">Ingreso</th>
    <th style="width:11%;">Salida</th>
    <th style="width:10%;">Total Horas</th>
    <th style="width:9%;">Jornada</th>
    <th style="width:8%;">Estado</th>
    <th style="width:8%;">Acción</th>
  </tr>`;

  const tbody = document.getElementById('tbody-asistencia');
  const cols  = ['av-1','av-2','av-3','av-4','av-5','av-6'];

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--texto3);">Sin trabajadores activos</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map((t, i) => {
    const ini      = (t.nombre||'??').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
    const rid      = t.rut.replace(/\./g,'').replace('-','');
    const registro = data.find(x => x.rut === t.rut);
    const editando = _filasEditandoAsist.has(t.rut);
    const activo   = !!registro && !registro.hora_salida;

    const horasGuardadas = registro ? registro.horas_trabajadas : null;
    const { jornada }    = calcularJornada(horasGuardadas);
    const horasTxt        = horasGuardadas !== null && horasGuardadas !== undefined
      ? horasGuardadas.toFixed(1) + ' h' : '—';

    let celdaIngreso, celdaSalida, celdaAccion;

    if(editando){
      celdaIngreso = `<input type="time" id="hora-entrada-${rid}" value="${registro?.hora_entrada||''}"
          style="width:90px;padding:4px 7px;font-size:12px;" onchange="previewHoras('${rid}')">`;
      celdaSalida  = `<input type="time" id="hora-salida-${rid}" value="${registro?.hora_salida||''}"
          style="width:90px;padding:4px 7px;font-size:12px;" onchange="previewHoras('${rid}')">`;
      celdaAccion  = `<button class="btn btn-primary btn-sm" onclick="guardarMarcacion('${t.rut}')"><i class="ti ti-check"></i> Guardar</button>
                      <button class="btn btn-secondary btn-sm" onclick="cancelarEdicionAsistencia('${t.rut}')" title="Cancelar"><i class="ti ti-x"></i></button>`;
    } else if(registro){
      celdaIngreso = `<span style="font-size:13px;">${registro.hora_entrada || '—'}</span>`;
      celdaSalida  = `<span style="font-size:13px;">${registro.hora_salida || '—'}</span>`;
      celdaAccion  = `<button class="btn btn-secondary btn-sm" onclick="habilitarEdicionAsistencia('${t.rut}')"><i class="ti ti-edit"></i> Corregir</button>
                      <button class="btn btn-secondary btn-sm" onclick="eliminarMarcacionAsistencia('${t.rut}')" title="Eliminar"><i class="ti ti-trash"></i></button>`;
    } else {
      celdaIngreso = `<span style="font-size:13px;color:var(--texto3);">Sin marcar</span>`;
      celdaSalida  = `<span style="font-size:13px;color:var(--texto3);">Sin marcar</span>`;
      celdaAccion  = `<span style="font-size:12px;color:var(--texto3);">—</span>`;
    }

    const aviso = registro ? _avisoHorasDia(t.rut, fecha, horasGuardadas) : null;
    const colorAviso = aviso?.nivel === 'critico' ? '#DC2626' : aviso?.nivel === 'aviso' ? '#D97706' : '#2563EB';
    const iconoAviso = aviso ? `<i class="ti ${aviso.nivel==='critico'?'ti-alert-triangle':'ti-info-circle'}" title="${aviso.texto.replace(/"/g,'&quot;')}" style="color:${colorAviso};margin-left:4px;cursor:help;font-size:14px;vertical-align:middle;"></i>` : '';

    return `<tr id="fila-${rid}">
      <td style="text-align:center;">
        <input type="checkbox" class="asist-check" data-rut="${t.rut}"
          ${activo ? '' : 'disabled'} title="${activo ? 'Seleccionar para cierre masivo' : 'Solo disponible para turnos activos'}"
          style="width:16px;height:16px;accent-color:var(--verde);cursor:pointer;">
      </td>
      <td>
        <div class="row-av">
          <div class="av ${cols[i%6]}">${ini}</div>
          <div class="row-av-info"><div class="nombre">${t.nombre||'—'}</div></div>
        </div>
      </td>
      <td class="rut-mono">${t.rut}</td>
      <td style="font-size:12px;color:var(--texto2);">
        ${registro?.registrado_por || '—'}
      </td>
      <td>${celdaIngreso}</td>
      <td>${celdaSalida}</td>
      <td id="total-horas-${rid}" style="font-size:13px;font-weight:500;text-align:center;">
        ${horasTxt}${iconoAviso}
      </td>
      <td id="jornada-badge-${rid}">
        ${badgeJornada(jornada)}
      </td>
      <td>${badgeEstado(registro)}</td>
      <td style="white-space:nowrap;">${celdaAccion}</td>
    </tr>`;
  }).join('');
}

/* ── Vista de rango (solo lectura, detalle del período) ──── */
function _renderAsistenciaRango(inicio, fin){
  const filtroEmp = document.getElementById('asist-empresa')?.value || '';
  const buscar    = (document.getElementById('asist-buscar')?.value || '').toLowerCase().trim();

  const fechas = _fechasEnRango(inicio, fin);
  const filas = [];

  fechas.forEach(fecha => {
    const data = JSON.parse(localStorage.getItem('asistencia_' + fecha) || '[]');
    data.forEach(m => {
      const t = trabajadores.find(x => x.rut === m.rut);
      if(!t) return;
      if(filtroEmp && !(t.mandante_id === filtroEmp)) return;
      if(buscar && !(t.nombre?.toLowerCase().includes(buscar) || t.rut?.toLowerCase().includes(buscar))) return;

      const mandante = (typeof findMandante === 'function') ? findMandante(t) : null;
      filas.push({
        fecha, nombre: t.nombre, rut: t.rut,
        mandante: mandante?.nombre || '—',
        hora_entrada: m.hora_entrada || '—',
        hora_salida: m.hora_salida || '—',
        horas: m.horas_trabajadas || 0,
        jornada: m.jornada || '—',
      });
    });
  });

  filas.sort((a,b) => a.fecha === b.fecha ? a.nombre.localeCompare(b.nombre) : a.fecha.localeCompare(b.fecha));

  const diasConDatos = new Set(filas.map(f => f.fecha)).size;
  const totalHoras   = filas.reduce((s,f) => s + (parseFloat(f.horas)||0), 0);
  const promedio     = filas.length ? (totalHoras / filas.length) : 0;
  const porRevisar   = filas.filter(f => f.jornada === '⚠️ Revisar').length;

  const kpis = document.getElementById('asist-kpi-grid');
  if(kpis) kpis.innerHTML = `
    <div class="kpi azul"><div class="kpi-label">Días con datos</div><div class="kpi-value">${diasConDatos}</div><div class="kpi-sub">en el rango</div></div>
    <div class="kpi verde"><div class="kpi-label">Total horas</div><div class="kpi-value">${totalHoras.toFixed(1)}</div><div class="kpi-sub">trabajadas</div></div>
    <div class="kpi azul"><div class="kpi-label">Promedio diario</div><div class="kpi-value">${promedio.toFixed(1)}</div><div class="kpi-sub">horas / marcación</div></div>
    <div class="kpi amarillo"><div class="kpi-label">Por revisar</div><div class="kpi-value">${porRevisar}</div><div class="kpi-sub">jornadas +12h</div></div>`;

  const titulo = document.getElementById('asist-card-title');
  if(titulo) titulo.innerHTML = `<i class="ti ti-calendar-stats"></i> Detalle del período — ${fmtFecha(inicio)} a ${fmtFecha(fin)}`;

  const accionesDia = document.getElementById('asist-acciones-dia');
  if(accionesDia) accionesDia.style.display = 'none';

  const thead = document.getElementById('thead-asistencia');
  if(thead) thead.innerHTML = `<tr>
    <th>Fecha</th><th>Trabajador</th><th>RUT</th><th>Mandante</th>
    <th>Entrada</th><th>Salida</th><th>Horas</th><th>Jornada</th>
  </tr>`;

  const tbody = document.getElementById('tbody-asistencia');
  if(!filas.length){
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--texto3);">Sin marcaciones en este rango</td></tr>`;
  } else {
    tbody.innerHTML = filas.map(f => `<tr>
      <td style="font-size:12px;">${fmtFecha(f.fecha)}</td>
      <td style="font-size:13px;font-weight:500;">${f.nombre}</td>
      <td class="rut-mono">${f.rut}</td>
      <td style="font-size:12px;">${f.mandante}</td>
      <td style="font-size:12px;">${f.hora_entrada}</td>
      <td style="font-size:12px;">${f.hora_salida}</td>
      <td style="font-size:12px;text-align:center;">${f.horas || '—'}</td>
      <td>${badgeJornada(f.jornada)}</td>
    </tr>`).join('');
  }

  _reporteAsistenciaActual = filas;
}

let _reporteAsistenciaActual = [];

/* El botón único "Excel" de la barra de filtros exporta según el modo activo */
function _exportarAsistenciaSegunModo(){
  const desde = document.getElementById('asist-fecha-desde')?.value;
  const hasta = document.getElementById('asist-fecha-hasta')?.value;
  if(desde === hasta) exportarAsistenciaExcel();
  else exportarReporteAsistenciaExcel();
}

function exportarReporteAsistenciaExcel(){
  if(!_reporteAsistenciaActual.length){ toast('⚠️ No hay datos para exportar en este rango', 'error'); return; }

  const inicio = document.getElementById('asist-fecha-desde').value;
  const fin    = document.getElementById('asist-fecha-hasta').value;

  const rows = _reporteAsistenciaActual.map(f => ({
    'Fecha': f.fecha, 'Trabajador': f.nombre, 'RUT': f.rut, 'Mandante': f.mandante,
    'Entrada': f.hora_entrada, 'Salida': f.hora_salida, 'Horas': f.horas, 'Jornada': f.jornada,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:12},{wch:26},{wch:14},{wch:24},{wch:10},{wch:10},{wch:8},{wch:14}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
  XLSX.writeFile(wb, `Reporte_Asistencia_${inicio}_a_${fin}.xlsx`);
  toast('⬇️ Excel exportado', 'exito');
}

function previewHoras(rid){
  const entrada = document.getElementById(`hora-entrada-${rid}`)?.value;
  const salida  = document.getElementById(`hora-salida-${rid}`)?.value;
  const rut     = document.querySelector(`#fila-${rid} .asist-check`)?.dataset.rut || '';
  const fecha   = document.getElementById('asist-fecha-desde').value;
  const colMin  = _colacionMinutosTrabajador(rut, fecha);
  const horas   = calcularHoras(entrada, salida, colMin);
  const { jornada } = calcularJornada(horas);

  const totalEl   = document.getElementById(`total-horas-${rid}`);
  const jornadaEl = document.getElementById(`jornada-badge-${rid}`);

  const aviso = horas !== null ? _avisoHorasDia(rut, fecha, horas) : null;
  const colorAviso = aviso?.nivel === 'critico' ? '#DC2626' : aviso?.nivel === 'aviso' ? '#D97706' : '#2563EB';
  const iconoAviso = aviso ? `<i class="ti ${aviso.nivel==='critico'?'ti-alert-triangle':'ti-info-circle'}" title="${aviso.texto.replace(/"/g,'&quot;')}" style="color:${colorAviso};margin-left:4px;cursor:help;font-size:14px;vertical-align:middle;"></i>` : '';

  if(totalEl)   totalEl.innerHTML     = (horas !== null ? horas.toFixed(1) + ' h' : '—') + iconoAviso;
  if(jornadaEl) jornadaEl.innerHTML   = badgeJornada(jornada);
}

function guardarMarcacion(rut){
  const rid     = rut.replace(/\./g,'').replace('-','');
  const entrada = document.getElementById(`hora-entrada-${rid}`)?.value
    || new Date().toTimeString().slice(0,5);
  const salida  = document.getElementById(`hora-salida-${rid}`)?.value || '';
  const fecha   = document.getElementById('asist-fecha-desde').value;

  const colMin           = _colacionMinutosTrabajador(rut, fecha);
  const horas           = calcularHoras(entrada, salida, colMin);
  const { jornada, alerta } = calcularJornada(horas);

  if(alerta){
    toast(`⚠️ ${rut} — más de 12 horas, revisar`, 'error');
  }

  const registradoPor = (typeof cfg !== 'undefined' && cfg.admin_nombre)
    ? cfg.admin_nombre.split(' ')[0] : 'Admin';

  const marcacion = {
    rut,
    fecha,
    hora_entrada:     entrada,
    hora_salida:      salida,
    horas_trabajadas: horas,
    jornada_valor:    calcularJornada(horas).valor,
    jornada,
    registrado_por:   registradoPor
  };

  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]');
  const idx   = data.findIndex(x => x.rut === rut);
  if(idx >= 0) data[idx] = marcacion; else data.push(marcacion);
  localStorage.setItem(clave, JSON.stringify(data));

  const t = trabajadores.find(x => x.rut === rut);
  toast(`✅ ${t?.nombre?.split(' ')[0]||rut} — ${entrada}${salida ? ' → ' + salida : ''}`, 'exito');
  _filasEditandoAsist.delete(rut);
  cargarAsistencia();
}

let _filasEditandoAsist = new Set();

function habilitarEdicionAsistencia(rut){
  _filasEditandoAsist.add(rut);
  cargarAsistencia();
}

function cancelarEdicionAsistencia(rut){
  _filasEditandoAsist.delete(rut);
  cargarAsistencia();
}

function eliminarMarcacionAsistencia(rut){
  const t = trabajadores.find(x => x.rut === rut);
  if(!confirm(`¿Eliminar la marcación de ${t?.nombre||rut}? Esta acción no se puede deshacer.`)) return;

  const fecha = document.getElementById('asist-fecha-desde').value;
  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]');
  const idx   = data.findIndex(x => x.rut === rut);
  if(idx >= 0) data.splice(idx, 1);
  localStorage.setItem(clave, JSON.stringify(data));

  _filasEditandoAsist.delete(rut);
  toast('🗑️ Marcación eliminada', 'exito');
  cargarAsistencia();
}

/* Recorre las marcaciones ya guardadas en el rango de fechas elegido en el
   filtro (funciona en modo día o rango) y vuelve a calcular horas/jornada
   de cada una, usando la colación real del contrato vigente de cada
   trabajador en esa fecha. No borra ni agrega marcaciones — solo corrige
   los números de lo que ya existe. Útil para corregir datos cargados
   antes de que Asistencia descontara la colación (o si algún otro
   criterio de cálculo cambia más adelante). */
function recalcularHorasRango(){
  const desde = document.getElementById('asist-fecha-desde')?.value;
  const hasta = document.getElementById('asist-fecha-hasta')?.value;
  if(!desde || !hasta){ toast('⚠️ Selecciona un rango de fechas primero', 'error'); return; }

  const fechas = _fechasEnRango(desde, hasta);
  if(!confirm(`¿Recalcular las horas de todas las marcaciones guardadas entre ${fmtFecha(desde)} y ${fmtFecha(hasta)}?\n\nSe vuelve a calcular horas y jornada de cada marcación existente, usando la colación del contrato de cada trabajador. No se borra ni se agrega ninguna marcación.`)) return;

  let corregidas = 0;
  let revisadas  = 0;

  fechas.forEach(fecha => {
    const clave = 'asistencia_' + fecha;
    const data  = JSON.parse(localStorage.getItem(clave) || '[]');
    if(!data.length) return;

    let cambioEnEsteDia = false;
    data.forEach(m => {
      if(!m.hora_entrada || !m.hora_salida) return;
      revisadas++;

      const colMin = _colacionMinutosTrabajador(m.rut, fecha);
      const horasNuevas = calcularHoras(m.hora_entrada, m.hora_salida, colMin);
      const { jornada, valor } = calcularJornada(horasNuevas);

      if(horasNuevas !== m.horas_trabajadas){
        m.horas_trabajadas = horasNuevas;
        m.jornada          = jornada;
        m.jornada_valor    = valor;
        cambioEnEsteDia    = true;
        corregidas++;
      }
    });

    if(cambioEnEsteDia) localStorage.setItem(clave, JSON.stringify(data));
  });

  toast(`✅ ${corregidas} de ${revisadas} marcaciones corregidas`, 'exito');
  cargarAsistencia();
}

function cierreMasivoTurno(){
  const checks = [...document.querySelectorAll('.asist-check:checked')];
  if(!checks.length){ toast('⚠️ Selecciona trabajadores primero', 'error'); return; }

  const hora  = new Date().toTimeString().slice(0,5);
  const fecha = document.getElementById('asist-fecha-desde').value;
  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]');

  const registradoPor = (typeof cfg !== 'undefined' && cfg.admin_nombre)
    ? cfg.admin_nombre.split(' ')[0] : 'Admin';

  checks.forEach(cb => {
    const rut = cb.dataset.rut;
    const idx = data.findIndex(x => x.rut === rut);
    const entrada = idx >= 0 ? data[idx].hora_entrada : hora;

    const colMin           = _colacionMinutosTrabajador(rut, fecha);
    const horas           = calcularHoras(entrada, hora, colMin);
    const { jornada, alerta } = calcularJornada(horas);

    const marcacion = {
      rut, fecha,
      hora_entrada:     entrada,
      hora_salida:      hora,
      horas_trabajadas: horas,
      jornada_valor:    calcularJornada(horas).valor,
      jornada,
      registrado_por:   registradoPor
    };

    if(idx >= 0) data[idx] = marcacion;
    else data.push(marcacion);
  });

  localStorage.setItem(clave, JSON.stringify(data));
  toast(`✅ Cierre masivo a las ${hora} — ${checks.length} trabajador${checks.length>1?'es':''}`, 'exito');
  cargarAsistencia();
}

function seleccionarTodosAsist(checked){
  document.querySelectorAll('.asist-check:not(:disabled)').forEach(c => c.checked = checked);
}

/* ── EXPORTAR PDF (Asistencia del Día) — mismo patrón de ventana de impresión
   que ya usamos en Contratos y QR, sin agregar librerías nuevas ── */
function exportarAsistenciaPDF(){
  const filtro = document.getElementById('asist-empresa').value;
  const fecha  = document.getElementById('asist-fecha-desde').value;
  const buscar = (document.getElementById('asist-buscar')?.value || '').toLowerCase().trim();
  const clave  = 'asistencia_' + fecha;
  const data   = JSON.parse(localStorage.getItem(clave) || '[]');

  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(filtro) lista = lista.filter(t => (t.mandante_id === filtro));
  if(buscar) lista = lista.filter(t => t.nombre?.toLowerCase().includes(buscar) || t.rut?.toLowerCase().includes(buscar));

  if(!lista.length){ toast('⚠️ Sin trabajadores para exportar', 'error'); return; }

  const filasHTML = lista.map(t => {
    const r = data.find(x => x.rut === t.rut);
    const horasTxt = r?.horas_trabajadas != null ? r.horas_trabajadas.toFixed(1)+' h' : '—';
    const estado = !r ? 'Pendiente' : !r.hora_salida ? 'Activo' : 'Cerrado';
    return `<tr>
      <td>${t.nombre||'—'}</td><td class="rut-mono">${t.rut}</td>
      <td>${r?.hora_entrada||'—'}</td><td>${r?.hora_salida||'—'}</td>
      <td>${horasTxt}</td><td>${r?.jornada||'—'}</td><td>${estado}</td>
    </tr>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Asistencia del Día — ${fecha}</title>
    <style>
      body{margin:0;padding:20px;font-family:'Segoe UI',sans-serif;color:#1E293B}
      h2{font-size:16px;color:#0f2942;margin-bottom:4px}
      p{font-size:12px;color:#64748B;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #E2E8F0;padding:6px 8px;text-align:left}
      th{background:#F1F5F9;}
    </style></head><body>
    <h2>Asistencia del Día</h2>
    <p>${fecha} · ${lista.length} trabajador${lista.length!==1?'es':''}</p>
    <table><thead><tr>
      <th>Trabajador</th><th>RUT</th><th>Ingreso</th><th>Salida</th><th>Total Horas</th><th>Jornada</th><th>Estado</th>
    </tr></thead><tbody>${filasHTML}</tbody></table>
    <script>setTimeout(()=>window.print(),300);<\/script>
    </body></html>`);
  win.document.close();
}

/* ══════════════════════════════════════════
   REGISTRO MANUAL (contingencia — sin app)
   Individual + Carga Masiva (para cuando no hay
   ningún teléfono disponible ese día — a diferencia
   del modo offline de la App, que solo cubre la falta
   de internet, no la falta del dispositivo en sí).
   ══════════════════════════════════════════ */
let _manualRutSeleccionado = null;

function cambiarModoManualAsistencia(modo){
  const esIndividual = modo === 'individual';
  document.getElementById('btn-manual-modo-individual').className = 'btn btn-sm ' + (esIndividual ? 'btn-primary' : 'btn-secondary');
  document.getElementById('btn-manual-modo-masivo').className     = 'btn btn-sm ' + (esIndividual ? 'btn-secondary' : 'btn-primary');
  document.getElementById('bloque-manual-individual').style.display = esIndividual ? '' : 'none';
  document.getElementById('bloque-manual-masivo').style.display     = esIndividual ? 'none' : '';
  if(esIndividual) _renderListaManualTrabajador();
}

function _renderListaManualTrabajador(){
  const empId  = document.getElementById('manual-empresa')?.value || '';
  const buscar = (document.getElementById('manual-buscar')?.value || '').toLowerCase().trim();
  const cont   = document.getElementById('manual-lista-trabajador');
  if(!cont) return;

  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(empId) lista = lista.filter(t => t.empresa_propia_id === empId);
  if(buscar) lista = lista.filter(t => t.nombre?.toLowerCase().includes(buscar) || t.rut?.toLowerCase().includes(buscar));
  lista.sort((a,b) => a.nombre?.localeCompare(b.nombre));

  if(!lista.length){
    cont.innerHTML = `<div style="padding:18px;text-align:center;color:var(--texto3);font-size:13px;">Sin trabajadores para mostrar</div>`;
    return;
  }

  cont.innerHTML = lista.map(t => {
    const seleccionado = _manualRutSeleccionado === t.rut;
    return `<div onclick="seleccionarTrabajadorManual('${t.rut}')"
        style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;
        border-bottom:1px solid var(--borde);background:${seleccionado?'#EFF6FF':'#fff'};"
        onmouseover="this.style.background='${seleccionado?'#EFF6FF':'#f8fafc'}'"
        onmouseout="this.style.background='${seleccionado?'#EFF6FF':'#fff'}'">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;">${t.nombre}</div>
        <div style="font-size:11px;color:var(--texto3);">${t.funcion_cargo||'—'}</div>
      </div>
      <span class="rut-mono">${t.rut}</span>
    </div>`;
  }).join('');
}

function seleccionarTrabajadorManual(rut){
  _manualRutSeleccionado = rut;
  _renderListaManualTrabajador();
  _cargarFormularioManual();
}

/* Carga en el formulario la marcación existente (si hay) del trabajador
   seleccionado para la fecha elegida — se usa al seleccionar y al cambiar fecha. */
function _cargarFormularioManual(){
  const rut = _manualRutSeleccionado;
  if(!rut) return;
  const t = trabajadores.find(x => x.rut === rut);
  if(!t) return;

  const fecha = document.getElementById('manual-fecha').value || hoyISO();
  const data  = JSON.parse(localStorage.getItem('asistencia_' + fecha) || '[]');
  const r     = data.find(x => x.rut === rut);

  document.getElementById('manual-trabajador-nombre').textContent = `${t.nombre} · ${t.rut}`;
  document.getElementById('manual-hora-entrada').value = r?.hora_entrada || '';
  document.getElementById('manual-hora-salida').value  = r?.hora_salida  || '';
  document.getElementById('manual-form-horas').style.display = 'block';
}

function _manualFechaCambio(){
  if(_manualRutSeleccionado) _cargarFormularioManual();
}

/* Botón Cancelar: limpia la selección/formulario sin guardar ni eliminar */
function cancelarFormularioManual(){
  _manualRutSeleccionado = null;
  document.getElementById('manual-form-horas').style.display = 'none';
  document.getElementById('manual-hora-entrada').value = '';
  document.getElementById('manual-hora-salida').value  = '';
  _renderListaManualTrabajador();
}

function guardarMarcacionManual(){
  const rut = _manualRutSeleccionado;
  if(!rut){ toast('⚠️ Busca y selecciona un trabajador', 'error'); return; }

  const t = trabajadores.find(x => x.rut === rut);
  if(!t){ toast('⚠️ Trabajador no encontrado', 'error'); return; }

  const fecha  = document.getElementById('manual-fecha').value;
  if(!fecha){ toast('⚠️ Selecciona una fecha', 'error'); return; }

  const entrada = document.getElementById('manual-hora-entrada').value;
  const salida  = document.getElementById('manual-hora-salida').value;
  if(!entrada){ toast('⚠️ Ingresa al menos la hora de entrada', 'error'); return; }

  const colMin = _colacionMinutosTrabajador(rut, fecha);
  const horas = salida ? calcularHoras(entrada, salida, colMin) : null;
  const { jornada, valor } = calcularJornada(horas);

  const registradoPor = (typeof cfg !== 'undefined' && cfg.admin_nombre) ? cfg.admin_nombre.split(' ')[0] : 'Admin';
  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]');
  const idx   = data.findIndex(x => x.rut === rut);

  const marcacion = {
    rut, fecha,
    hora_entrada: entrada,
    hora_salida: salida || null,
    horas_trabajadas: horas,
    jornada: salida ? jornada : null,
    jornada_valor: salida ? valor : null,
    registrado_por: registradoPor,
  };

  if(idx >= 0) data[idx] = { ...data[idx], ...marcacion };
  else data.push(marcacion);

  localStorage.setItem(clave, JSON.stringify(data));
  toast(`✅ Marcación guardada — ${t.nombre}`, 'exito');

  // Si la fecha coincide con la que se ve en Asistencia del Día, refresca esa vista también
  if(document.getElementById('asist-fecha-desde').value === fecha &&
     document.getElementById('asist-fecha-hasta').value === fecha) cargarAsistencia();
}

function eliminarMarcacionManual(){
  const rut = _manualRutSeleccionado;
  if(!rut) return;
  const fecha = document.getElementById('manual-fecha').value;
  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]').filter(x => x.rut !== rut);
  localStorage.setItem(clave, JSON.stringify(data));

  document.getElementById('manual-hora-entrada').value = '';
  document.getElementById('manual-hora-salida').value  = '';
  toast('🗑️ Marcación eliminada', 'exito');

  if(document.getElementById('asist-fecha-desde').value === fecha &&
     document.getElementById('asist-fecha-hasta').value === fecha) cargarAsistencia();
}

/* ══════════════════════════════════════════
   CARGA MASIVA DE MARCACIONES (contingencia)
   Columnas: RUT · Fecha · Hora Entrada · Hora Salida (opcional)
   ══════════════════════════════════════════ */
let _datosExcelAsist = [];
let _erroresExcelAsist = [];

function _clickZonaDropExcelAsist(){
  document.getElementById('archivo-excel-asist').click();
}

function procesarExcelAsistencia(event){
  const file = event.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb   = XLSX.read(e.target.result, {type:'binary', cellDates:true});
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {defval:''});

      if(!rows.length){ toast('⚠️ El archivo está vacío', 'error'); return; }

      const fmtFechaCelda = v => {
        if(!v) return null;
        if(v instanceof Date) return v.toISOString().split('T')[0];
        return v.toString().trim() || null;
      };
      const fmtHora = v => {
        if(!v) return '';
        if(v instanceof Date) return v.toTimeString().slice(0,5);
        return v.toString().trim();
      };

      _datosExcelAsist = [];
      _erroresExcelAsist = [];

      rows.forEach((row, i) => {
        const fila    = i + 2;
        const rut     = (row['RUT'] || row['Rut'] || row['rut'] || '').toString().trim();
        const fecha   = fmtFechaCelda(row['Fecha'] || row['fecha']);
        const entrada = fmtHora(row['Hora Entrada'] || row['hora_entrada']);
        const salida  = fmtHora(row['Hora Salida'] || row['hora_salida']);

        if(!rut){ _erroresExcelAsist.push({ fila, mensaje:'Falta el RUT' }); return; }
        const t = trabajadores.find(x => x.rut === rut);
        if(!t){ _erroresExcelAsist.push({ fila, rut, mensaje:`RUT "${rut}" no encontrado en el sistema` }); return; }
        if(!fecha){ _erroresExcelAsist.push({ fila, rut, nombre:t.nombre, mensaje:'Falta la Fecha (formato AAAA-MM-DD)' }); return; }
        if(!entrada){ _erroresExcelAsist.push({ fila, rut, nombre:t.nombre, mensaje:'Falta la Hora Entrada' }); return; }

        const clave = 'asistencia_' + fecha;
        const data  = JSON.parse(localStorage.getItem(clave) || '[]');
        const yaExiste = data.some(x => x.rut === rut);

        _datosExcelAsist.push({ fila, rut, nombre:t.nombre, fecha, entrada, salida, sobrescribe: yaExiste });
      });

      _renderPreviewExcelAsistencia();
    } catch(err){
      toast('❌ No se pudo leer el archivo — revisa que sea un Excel válido', 'error');
    }
  };
  reader.readAsBinaryString(file);
  event.target.value = '';
}

function _renderPreviewExcelAsistencia(){
  const seccion = document.getElementById('seccion-preview-asist');
  const cuerpo  = document.querySelector('#tabla-excel-asist tbody');
  const conteo  = document.getElementById('preview-count-asist');
  const avisos  = document.getElementById('preview-avisos-asist');
  const btn     = document.getElementById('btn-subir-masivo-asist');

  seccion.style.display = 'block';
  conteo.textContent = `${_datosExcelAsist.length} marcación${_datosExcelAsist.length!==1?'es':''} lista${_datosExcelAsist.length!==1?'s':''} para cargar` +
    (_erroresExcelAsist.length ? ` · ${_erroresExcelAsist.length} fila${_erroresExcelAsist.length!==1?'s':''} con error` : '');

  avisos.innerHTML = _erroresExcelAsist.length
    ? `<div style="background:#FEE2E2;border:1px solid #fca5a5;border-radius:8px;padding:10px 12px;font-size:12px;color:#991B1B;">
        ${_erroresExcelAsist.map(e => `Fila ${e.fila}${e.nombre?` (${e.nombre})`:''}: ${e.mensaje}`).join('<br>')}
       </div>`
    : '';

  cuerpo.innerHTML = _datosExcelAsist.map(d => `<tr>
    <td class="rut-mono">${d.rut}</td>
    <td>${d.nombre}</td>
    <td>${fmtFecha(d.fecha)}</td>
    <td>${d.entrada}</td>
    <td>${d.salida || '—'}</td>
    <td>${d.sobrescribe ? '<span class="badge badge-amarillo">Sobrescribe existente</span>' : '<span class="badge badge-verde">Nueva</span>'}</td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--texto3);">Sin filas válidas para cargar</td></tr>`;

  btn.disabled = !_datosExcelAsist.length;
}

function cancelarCargaMasivaAsistencia(){
  _datosExcelAsist = [];
  _erroresExcelAsist = [];
  document.getElementById('seccion-preview-asist').style.display = 'none';
  document.getElementById('archivo-excel-asist').value = '';
}

function subirMasivoAsistencia(){
  if(!_datosExcelAsist.length){ toast('⚠️ No hay marcaciones para cargar', 'error'); return; }
  if(!confirm(`Se cargarán ${_datosExcelAsist.length} marcación${_datosExcelAsist.length!==1?'es':''}. ¿Continuar?`)) return;

  const registradoPor = (typeof cfg !== 'undefined' && cfg.admin_nombre)
    ? cfg.admin_nombre.split(' ')[0] + ' (carga masiva)' : 'Admin (carga masiva)';

  // Agrupar por fecha para tocar cada clave de localStorage una sola vez
  const porFecha = {};
  _datosExcelAsist.forEach(d => {
    (porFecha[d.fecha] = porFecha[d.fecha] || []).push(d);
  });

  Object.keys(porFecha).forEach(fecha => {
    const clave = 'asistencia_' + fecha;
    const data  = JSON.parse(localStorage.getItem(clave) || '[]');

    porFecha[fecha].forEach(d => {
      const colMin = _colacionMinutosTrabajador(d.rut, fecha);
      const horas = d.salida ? calcularHoras(d.entrada, d.salida, colMin) : null;
      const { jornada, valor } = calcularJornada(horas);

      const marcacion = {
        rut: d.rut, fecha,
        hora_entrada: d.entrada,
        hora_salida: d.salida || null,
        horas_trabajadas: horas,
        jornada: d.salida ? jornada : null,
        jornada_valor: d.salida ? valor : null,
        registrado_por: registradoPor,
      };

      const idx = data.findIndex(x => x.rut === d.rut);
      if(idx >= 0) data[idx] = marcacion; else data.push(marcacion);
    });

    localStorage.setItem(clave, JSON.stringify(data));
  });

  toast(`✅ ${_datosExcelAsist.length} marcación${_datosExcelAsist.length!==1?'es':''} cargada${_datosExcelAsist.length!==1?'s':''}`, 'exito');
  cancelarCargaMasivaAsistencia();
  cargarAsistencia();
}
