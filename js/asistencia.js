/* ════ ASISTENCIA ════ */

function initAsistencia(){
  document.getElementById('asist-fecha').value = new Date().toISOString().split('T')[0];
  cargarAsistencia();
}

function calcularHoras(entrada, salida){
  if(!entrada || !salida) return null;
  const h1 = new Date('1970-01-01T' + entrada);
  let   h2 = new Date('1970-01-01T' + salida);
  // Manejo trabajo nocturno
  if(h2 <= h1) h2 = new Date('1970-01-02T' + salida);
  const horas = (h2 - h1) / (1000 * 60 * 60);
  return Math.round(horas * 10) / 10; // redondear a 1 decimal
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

function cargarAsistencia(){
  const filtro = document.getElementById('asist-empresa').value;
  const fecha  = document.getElementById('asist-fecha').value;
  const clave  = 'asistencia_' + fecha;
  const data   = JSON.parse(localStorage.getItem(clave) || '[]');

  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(filtro) lista = lista.filter(t => (t.mandante_id === filtro || t.empresa_rut === filtro || t.empresa === filtro));

  // KPIs — basados en nuevo estado
  let pendientes = 0, activos = 0, cerrados = 0;
  lista.forEach(t => {
    const r = data.find(x => x.rut === t.rut);
    if(!r)             pendientes++;
    else if(!r.hora_salida) activos++;
    else               cerrados++;
  });

  document.getElementById('asist-total').textContent      = lista.length;
  document.getElementById('asist-presentes').textContent  = activos;
  document.getElementById('asist-media').textContent      = cerrados;
  const anticipadas = data.filter(r => {
    const h = r.horas_trabajadas;
    return h !== null && h !== undefined && h > 0 && h <= 5;
  }).length;
  const elAnt = document.getElementById('asist-anticipada');
  if(elAnt) elAnt.textContent = anticipadas;

  // Actualizar labels KPIs
  const lPresentes = document.getElementById('asist-label-presentes');
  const lMedia     = document.getElementById('asist-label-media');
  if(lPresentes) lPresentes.textContent = 'Activos';
  if(lMedia)     lMedia.textContent     = 'Cerrados';

  const tbody = document.getElementById('tbody-asistencia');
  const cols  = ['av-1','av-2','av-3','av-4','av-5','av-6'];

  if(!lista.length){
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--texto3);">Sin trabajadores activos</td></tr>`;
    return;
  }

  // Obtener nombre del administrador/usuario actual
  const registradoPor = (typeof cfg !== 'undefined' && cfg.admin_nombre)
    ? cfg.admin_nombre.split(' ')[0]
    : 'Admin';

  tbody.innerHTML = lista.map((t, i) => {
    const ini      = (t.nombre||'??').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
    const rid      = t.rut.replace(/\./g,'').replace('-','');
    const registro = data.find(x => x.rut === t.rut);
    const bloq     = !!registro;

    // Calcular horas y jornada desde datos guardados
    const horasGuardadas = registro ? registro.horas_trabajadas : null;
    const { jornada }    = calcularJornada(horasGuardadas);
    const horasTxt       = horasGuardadas !== null && horasGuardadas !== undefined
      ? horasGuardadas.toFixed(1) + ' h' : '—';

    return `<tr id="fila-${rid}">
      <td style="text-align:center;">
        <input type="checkbox" class="asist-check" data-rut="${t.rut}"
          ${bloq ? 'disabled' : ''}
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
        ${registro?.registrado_por || registradoPor}
      </td>
      <td>
        <input type="time" id="hora-entrada-${rid}"
          value="${registro?.hora_entrada||''}"
          ${bloq ? 'disabled' : ''}
          style="width:90px;padding:4px 7px;font-size:12px;"
          onchange="previewHoras('${rid}')">
      </td>
      <td>
        <input type="time" id="hora-salida-${rid}"
          value="${registro?.hora_salida||''}"
          ${bloq ? 'disabled' : ''}
          style="width:90px;padding:4px 7px;font-size:12px;"
          onchange="previewHoras('${rid}')">
      </td>
      <td id="total-horas-${rid}" style="font-size:13px;font-weight:500;text-align:center;">
        ${horasTxt}
      </td>
      <td id="jornada-badge-${rid}">
        ${badgeJornada(jornada)}
      </td>
      <td>${badgeEstado(registro)}</td>
      <td>
        ${bloq
          ? `<button class="btn btn-secondary btn-sm" onclick="editarAsistencia('${t.rut}')" title="Editar"><i class="ti ti-edit"></i></button>`
          : `<button class="btn btn-primary btn-sm" onclick="guardarMarcacion('${t.rut}')"><i class="ti ti-check"></i> Marcar</button>`
        }
      </td>
    </tr>`;
  }).join('');
}

function previewHoras(rid){
  const entrada = document.getElementById(`hora-entrada-${rid}`)?.value;
  const salida  = document.getElementById(`hora-salida-${rid}`)?.value;
  const horas   = calcularHoras(entrada, salida);
  const { jornada } = calcularJornada(horas);

  const totalEl   = document.getElementById(`total-horas-${rid}`);
  const jornadaEl = document.getElementById(`jornada-badge-${rid}`);

  if(totalEl)   totalEl.textContent   = horas !== null ? horas.toFixed(1) + ' h' : '—';
  if(jornadaEl) jornadaEl.innerHTML   = badgeJornada(jornada);
}

function guardarMarcacion(rut){
  const rid     = rut.replace(/\./g,'').replace('-','');
  const entrada = document.getElementById(`hora-entrada-${rid}`)?.value
    || new Date().toTimeString().slice(0,5);
  const salida  = document.getElementById(`hora-salida-${rid}`)?.value || '';
  const fecha   = document.getElementById('asist-fecha').value;

  // Calcular horas y jornada automáticamente
  const horas           = calcularHoras(entrada, salida);
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
  cargarAsistencia();
}

function editarAsistencia(rut){
  const fecha = document.getElementById('asist-fecha').value;
  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]');
  const idx   = data.findIndex(x => x.rut === rut);
  if(idx >= 0) data.splice(idx, 1);
  localStorage.setItem(clave, JSON.stringify(data));
  cargarAsistencia();
}

function cierreMasivoTurno(){
  const checks = [...document.querySelectorAll('.asist-check:checked')];
  if(!checks.length){ toast('⚠️ Selecciona trabajadores primero', 'error'); return; }

  const hora  = new Date().toTimeString().slice(0,5);
  const fecha = document.getElementById('asist-fecha').value;
  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]');

  const registradoPor = (typeof cfg !== 'undefined' && cfg.admin_nombre)
    ? cfg.admin_nombre.split(' ')[0] : 'Admin';

  checks.forEach(cb => {
    const rut = cb.dataset.rut;
    const idx = data.findIndex(x => x.rut === rut);
    const rid = rut.replace(/\./g,'').replace('-','');
    const entrada = idx >= 0
      ? data[idx].hora_entrada
      : (document.getElementById(`hora-entrada-${rid}`)?.value || hora);

    const horas           = calcularHoras(entrada, hora);
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

function exportarAsistenciaExcel(){
  const fecha = document.getElementById('asist-fecha').value;
  const clave = 'asistencia_' + fecha;
  const data  = JSON.parse(localStorage.getItem(clave) || '[]');

  if(!data.length){ toast('⚠️ Sin marcaciones para exportar','error'); return; }

  const rows = data.map(r => {
    const t   = trabajadores.find(x => x.rut === r.rut);
    const emp = empresas.find(e => e.id===(t?.mandante_id||t?.empresa||t?.empresa_rut) || e.rut===(t?.empresa||t?.empresa_rut));
    const horas = r.horas_trabajadas;
    const estado = !r.hora_entrada ? 'Pendiente'
      : !r.hora_salida ? 'Activo' : 'Cerrado';

    return {
      Fecha:              r.fecha,
      RUT:                r.rut,
      Nombre:             t?.nombre || '',
      Mandante:           emp?.nombre || '',
      'Registrado por':   r.registrado_por || '',
      'Hora Entrada':     r.hora_entrada || '',
      'Hora Salida':      r.hora_salida || '',
      'Total Horas':      horas !== null && horas !== undefined ? Number(horas).toFixed(1) : '',
      Jornada:            r.jornada || '',
      'Valor Jornada':    r.jornada_valor !== null ? r.jornada_valor : '',
      Estado:             estado
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
  XLSX.writeFile(wb, `Asistencia_${fecha}.xlsx`);
  toast('⬇️ Asistencia exportada','exito');
}
