/* ════ ANEXOS DE CONTRATO DE TRABAJO ════
   Arquitectura: Plantilla Base (fija) + Catálogo de tipos + Librería de segundas cláusulas.
   La plantilla base (PRIMERA, TERCERA, CUARTA, QUINTA + comparecencia + firmas) nunca cambia.
   Lo único que varía por tipo de anexo es: la materia modificada (PRIMERA), el título del
   documento, el formulario, y el cuerpo de la SEGUNDA cláusula.
*/

/* Cláusula del contrato de origen que cada materia modifica. Posiciones FIJAS dentro de
   contratos.js — idénticas en Temporada, Plazo Fijo e Indefinido, porque esas cláusulas se
   insertan siempre en el mismo orden antes de cualquier bifurcación por tipo de contrato:
     1a Funciones del cargo · 2a Lugar de prestación de servicios (faena/mandante)
     3a Jornada de trabajo · 4a Remuneración · 9a Vigencia/Plazo del contrato
   Por eso el número de cláusula se obtiene automáticamente, sin tabla por tipo de contrato. */
const FUENTE_CLAUSULA_CONTRATO = {
  cargo:        { ordinal:'Primero' },
  lugar:        { ordinal:'Segundo' },
  jornada:      { ordinal:'Tercero' },
  remuneracion: { ordinal:'Cuarto'  },
  vigencia:     { ordinal:'Noveno'  },
};

/* Catálogo de Anexos. Cada entrada define:
   - materia:  texto para la PRIMERA ("...modificar exclusivamente las condiciones relativas a...")
   - fuente:   clave de FUENTE_CLAUSULA_CONTRATO (o null si no modifica una cláusula existente)
   - campos:   formulario específico de este anexo
   - detalle:  texto corto para historial/lista
   - segunda:  arma el cuerpo de la SEGUNDA cláusula (la única realmente variable) */
const ANX_CATALOG = {

  cambio_cargo: {
    materia: 'el cargo desempeñado por el Trabajador',
    fuente:  'cargo',
    campos: [
      { id:'anx-nuevo-cargo', label:'Nuevo Cargo', tipo:'texto', ph:'Ej: Jefe de Cuadrilla' },
    ],
    detalle: v => `Nuevo cargo: ${v['anx-nuevo-cargo']||''}`,
    segunda: v => ({
      titulo: 'Modificación del cargo',
      html: `
        <p>A contar del día <strong>${v.fechaVigFmt}</strong>, las partes acuerdan modificar
        la cláusula <strong>${v.fuenteOrdinal}</strong> del contrato de trabajo suscrito con
        fecha <strong>${v.fechaContratoFmt}</strong>, relativa al cargo del Trabajador,
        estableciendo que, en lo sucesivo, desempeñará el cargo de
        <strong>${v['anx-nuevo-cargo'] || '___________'}</strong>.</p>
        <p>Las funciones inherentes al nuevo cargo serán aquellas que correspondan a su
        naturaleza y que le sean encomendadas por el Empleador, dentro del marco del contrato
        de trabajo y de la legislación laboral vigente.</p>
        <p>La presente modificación sustituye únicamente el cargo pactado, manteniéndose
        inalteradas las demás condiciones contractuales vigentes, salvo aquellas que hayan
        sido modificadas expresamente mediante otro instrumento celebrado válidamente entre
        las partes.</p>`,
    }),
  },

  cambio_labor: {
    materia: 'la labor específica asignada al Trabajador dentro de su cargo',
    fuente:  'cargo',
    campos: [
      { id:'anx-nueva-labor', label:'Nueva Labor', tipo:'texto', ph:'Ej: Packing, Poda, Raleo...' },
    ],
    detalle: v => `Nueva labor: ${v['anx-nueva-labor']||''}`,
    segunda: v => ({
      titulo: 'Modificación de la labor específica',
      html: `
        <p>A contar del día <strong>${v.fechaVigFmt}</strong>, dentro del marco de las
        funciones propias del cargo del Trabajador, establecidas en la cláusula
        <strong>${v.fuenteOrdinal}</strong> del contrato de trabajo suscrito con fecha
        <strong>${v.fechaContratoFmt}</strong>, las partes acuerdan que éste desempeñará
        específicamente la labor de
        <strong>${v['anx-nueva-labor'] || '___________'}</strong>.</p>
        <p>Lo anterior no importa un cambio de cargo ni de las demás condiciones
        contractuales vigentes, tratándose únicamente de una precisión de la labor operativa
        a desarrollar, dentro de las funciones agrícolas afines que el contrato ya
        contempla.</p>`,
    }),
  },

  cambio_faena: {
    materia: 'la faena en la cual el Trabajador presta sus servicios',
    fuente:  'lugar',
    campos: [
      { id:'anx-nueva-faena',     label:'Nueva Faena',     tipo:'texto', ph:'Ej: Cosecha Arándanos Sector Norte' },
      { id:'anx-nueva-ubicacion', label:'Nueva Ubicación', tipo:'texto', ph:'Ej: Curicó, Maule' },
    ],
    detalle: v => `Nueva faena: ${v['anx-nueva-faena']||''} — Ubicación: ${v['anx-nueva-ubicacion']||''}`,
    segunda: v => ({
      titulo: 'Modificación de la faena',
      html: `
        <p>A contar del día <strong>${v.fechaVigFmt}</strong>, las partes acuerdan modificar
        la cláusula <strong>${v.fuenteOrdinal}</strong> del contrato de trabajo suscrito con
        fecha <strong>${v.fechaContratoFmt}</strong>, relativa a la faena en la cual el
        Trabajador presta sus servicios, estableciendo que, en lo sucesivo, éstos serán
        desarrollados en la faena denominada
        <strong>${v['anx-nueva-faena'] || '___________'}</strong>, ubicada en
        <strong>${v['anx-nueva-ubicacion'] || '___________'}</strong>, conforme a las labores
        propias de su cargo.</p>
        <p>La presente modificación no altera la calidad de empleador de
        <strong>${v.empresaNombre}</strong>, ni modifica el cargo, la jornada ordinaria, la
        remuneración, ni las demás condiciones pactadas en el contrato de trabajo y en sus
        anexos vigentes.</p>
        <p>La presente modificación sustituye únicamente la faena originalmente pactada,
        manteniéndose plenamente vigentes las demás estipulaciones contractuales, salvo
        aquellas que hayan sido modificadas expresamente mediante otro instrumento celebrado
        válidamente entre las partes.</p>`,
    }),
  },

  cambio_mandante: {
    materia: 'la empresa mandante para la cual el Trabajador presta servicios',
    fuente:  'lugar',
    campos: [
      { id:'anx-nuevo-mandante',     label:'Nuevo Mandante',      tipo:'texto', ph:'Ej: Agrícola Los Olivos' },
      { id:'anx-nuevo-mandante-rut', label:'RUT Nuevo Mandante',  tipo:'texto', ph:'Ej: 76.123.456-7' },
    ],
    detalle: v => `Nuevo mandante: ${v['anx-nuevo-mandante']||''} RUT ${v['anx-nuevo-mandante-rut']||''}`,
    segunda: v => ({
      titulo: 'Modificación de la empresa mandante',
      html: `
        <p>A contar del día <strong>${v.fechaVigFmt}</strong>, las partes acuerdan modificar
        la cláusula <strong>${v.fuenteOrdinal}</strong> del contrato de trabajo suscrito con
        fecha <strong>${v.fechaContratoFmt}</strong>, relativa a la empresa mandante en la
        cual el Trabajador prestará sus servicios, estableciendo que, en lo sucesivo, éstos
        serán desarrollados para la empresa mandante
        <strong>${v['anx-nuevo-mandante'] || '___________'}</strong>, RUT
        <strong>${v['anx-nuevo-mandante-rut'] || '___________'}</strong>, en la faena o
        instalación que ésta determine, conforme a las labores contratadas.</p>
        <p>La presente modificación no altera la calidad de empleador de
        <strong>${v.empresaNombre}</strong>, quien continuará siendo responsable del
        cumplimiento íntegro de todas las obligaciones laborales, previsionales y
        contractuales derivadas de la relación laboral.</p>
        <p>La presente modificación sustituye únicamente la empresa mandante originalmente
        pactada, manteniéndose plenamente vigentes las demás condiciones contractuales,
        salvo aquellas que hayan sido modificadas expresamente mediante otro instrumento
        celebrado válidamente entre las partes.</p>`,
    }),
  },

  cambio_domicilio: {
    materia: 'el domicilio o lugar de prestación de servicios del Trabajador',
    fuente:  'lugar',
    campos: [
      { id:'anx-nuevo-domicilio', label:'Nuevo Domicilio Laboral', tipo:'texto', ph:'Ej: Av. Principal 456, Talca' },
    ],
    detalle: v => `Nuevo domicilio laboral: ${v['anx-nuevo-domicilio']||''}`,
    segunda: v => ({
      titulo: 'Modificación del lugar de prestación de servicios',
      html: `
        <p>A contar del día <strong>${v.fechaVigFmt}</strong>, las partes acuerdan modificar
        la cláusula <strong>${v.fuenteOrdinal}</strong> del contrato de trabajo suscrito con
        fecha <strong>${v.fechaContratoFmt}</strong>, relativa al lugar de prestación de
        servicios del Trabajador, estableciendo que, en lo sucesivo, éste prestará sus
        servicios en <strong>${v['anx-nuevo-domicilio'] || '___________'}</strong>.</p>
        <p>El Trabajador desempeñará sus funciones en el lugar antes señalado, manteniéndose
        inalteradas las labores propias de su cargo, la jornada de trabajo, la remuneración y
        las demás condiciones pactadas en el contrato de trabajo y en sus anexos vigentes,
        salvo aquellas que hayan sido modificadas expresamente mediante otro instrumento
        celebrado válidamente entre las partes.</p>
        <p>La presente modificación sustituye únicamente el lugar de prestación de servicios
        originalmente pactado.</p>`,
    }),
  },

  cambio_jornada: {
    materia: 'la jornada ordinaria de trabajo del Trabajador',
    fuente:  'jornada',
    campos: [
      { id:'anx-nueva-jornada', label:'Nueva Distribución de Jornada', tipo:'texto', ph:'Ej: Lunes a Sábado, 08:00 a 17:00' },
    ],
    detalle: v => `Nueva jornada: ${v['anx-nueva-jornada']||''}`,
    segunda: v => ({
      titulo: 'Modificación de la jornada ordinaria de trabajo',
      html: `
        <p>A contar del día <strong>${v.fechaVigFmt}</strong>, las partes acuerdan modificar
        la cláusula <strong>${v.fuenteOrdinal}</strong> del contrato de trabajo suscrito con
        fecha <strong>${v.fechaContratoFmt}</strong>, relativa a la jornada ordinaria de
        trabajo del Trabajador, estableciendo que, en lo sucesivo, ésta será la siguiente:</p>
        <p><strong>${v['anx-nueva-jornada'] || '___________'}</strong></p>
        <p>La jornada antes señalada se distribuirá de conformidad con la legislación laboral
        vigente y con las necesidades operacionales de la empresa, respetando los límites
        legales aplicables, los períodos de descanso y demás derechos que correspondan al
        Trabajador.</p>
        <p>La presente modificación sustituye únicamente la jornada ordinaria de trabajo
        pactada, manteniéndose inalteradas las demás condiciones contractuales vigentes,
        salvo aquellas que hayan sido modificadas expresamente mediante otro instrumento
        celebrado válidamente entre las partes.</p>`,
    }),
  },

  cambio_remuneracion: {
    materia: 'el sueldo base del Trabajador',
    fuente:  'remuneracion',
    campos: [
      { id:'anx-nuevo-sueldo',          label:'Nuevo Monto ($)', tipo:'numero', ph:'Ej: 600000' },
      { id:'anx-nuevo-sueldo-escrito',  label:'En palabras',     tipo:'texto',  ph:'Se completa automáticamente', soloLectura:true },
    ],
    detalle: v => `Nuevo sueldo: $${parseInt(v['anx-nuevo-sueldo']||0).toLocaleString('es-CL')} (${v['anx-nuevo-sueldo-escrito']||''})`,
    segunda: v => {
      const monto  = parseInt(v['anx-nuevo-sueldo']||0) || 0;
      const letras = monto ? (numeroALetras(monto).trim() + ' pesos') : '_______________________________________________';
      return {
        titulo: 'Modificación de la remuneración',
        html: `
          <p>A contar del día <strong>${v.fechaVigFmt}</strong>, las partes acuerdan
          modificar la cláusula <strong>${v.fuenteOrdinal}</strong> del contrato de trabajo
          suscrito con fecha <strong>${v.fechaContratoFmt}</strong>, relativa al sueldo base
          del Trabajador, estableciendo que éste percibirá, en lo sucesivo, un sueldo base
          mensual ascendente a la suma de
          <strong>${monto ? '$'+monto.toLocaleString('es-CL') : '$___________'}</strong>
          (<strong>${letras}</strong>).</p>
          <p>La presente modificación sustituye únicamente el monto del sueldo base pactado,
          manteniéndose inalteradas todas las demás condiciones remuneracionales y
          estipulaciones contenidas en el contrato de trabajo y en los anexos anteriormente
          suscritos, salvo aquellas que hayan sido modificadas expresamente mediante otro
          instrumento celebrado válidamente entre las partes.</p>`,
      };
    },
  },

  prorroga: {
    materia: 'la vigencia o plazo del contrato de trabajo',
    fuente:  'vigencia',
    campos: [
      { id:'anx-nueva-fecha-termino', label:'Nueva Fecha de Término', tipo:'fecha' },
    ],
    detalle: v => `Nueva fecha de término: ${v['anx-nueva-fecha-termino'] ? new Date(v['anx-nueva-fecha-termino']).toLocaleDateString('es-CL') : '—'}`,
    segunda: v => ({
      titulo: 'Prórroga del plazo del contrato',
      html: `
        <p>Las partes acuerdan prorrogar la vigencia del contrato de trabajo suscrito con
        fecha <strong>${v.fechaContratoFmt}</strong>, cuya duración se encuentra regulada en
        la cláusula <strong>${v.fuenteOrdinal}</strong> del mismo, estableciendo como nueva
        fecha de término el día
        <strong>${v['anx-nueva-fecha-termino'] ? new Date(v['anx-nueva-fecha-termino']).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}) : '___________'}</strong>.</p>
        <p>Se deja constancia de que, conforme al artículo 159 N°4 del Código del Trabajo, el
        contrato a plazo fijo solo admite una renovación; una segunda renovación, o la
        continuación de los servicios una vez expirado el plazo prorrogado, transformará la
        relación laboral en un contrato de duración indefinida.</p>
        <p>La presente modificación sustituye únicamente la fecha de término pactada,
        manteniéndose inalteradas todas las demás condiciones contractuales vigentes.</p>`,
    }),
  },

  asignacion_especial: {
    materia: 'las condiciones especiales que se detallan en el presente instrumento',
    fuente:  null,
    campos: [
      { id:'anx-descripcion-especial', label:'Descripción de la Asignación', tipo:'texto', ph:'Describe la asignación especial' },
    ],
    detalle: v => v['anx-descripcion-especial'] || '',
    segunda: v => ({
      titulo: 'Asignación especial',
      html: `
        <p>A contar del día <strong>${v.fechaVigFmt}</strong>, las partes acuerdan
        establecer la siguiente asignación especial en favor del Trabajador:</p>
        <p><strong>${v['anx-descripcion-especial'] || '___________'}</strong></p>
        <p>La presente asignación no constituye derecho adquirido para el Trabajador ni
        forma parte de su remuneración fija, salvo que las partes expresamente así lo
        señalen, manteniéndose inalteradas todas las demás condiciones contractuales
        vigentes.</p>`,
    }),
  },

  otro: {
    materia: 'las condiciones que se detallan en el presente instrumento',
    fuente:  null,
    campos: [
      { id:'anx-detalle-otro', label:'Detalle de la modificación', tipo:'texto', ph:'Describe el cambio acordado' },
    ],
    detalle: v => v['anx-detalle-otro'] || '',
    segunda: v => ({
      titulo: 'Modificación acordada por las partes',
      html: `
        <p>A contar del día <strong>${v.fechaVigFmt}</strong>, las partes acuerdan modificar
        el contrato de trabajo suscrito con fecha <strong>${v.fechaContratoFmt}</strong> en
        los siguientes términos:</p>
        <p><strong>${v['anx-detalle-otro'] || '___________'}</strong></p>
        <p>La presente modificación sustituye únicamente lo señalado precedentemente,
        manteniéndose inalteradas todas las demás condiciones contractuales vigentes, salvo
        aquellas que hayan sido modificadas expresamente mediante otro instrumento celebrado
        válidamente entre las partes.</p>`,
    }),
  },
};

/* ───────── Formulario dinámico según catálogo ───────── */

function onCambioTipoAnexo(){
  const tipo = document.getElementById('anexo-tipo').value;
  const zona = document.getElementById('anexo-campos-variables');
  const def  = ANX_CATALOG[tipo];

  if(!tipo || !def){ zona.innerHTML=''; actualizarPreviaAnexo(); return; }

  const campoHTML = c => {
    const inputTag = c.tipo === 'fecha'
      ? `<input type="date" id="${c.id}" oninput="actualizarPreviaAnexo()"
          style="width:100%;padding:9px;border-radius:var(--radius);border:1px solid var(--borde);font-size:13px;margin-top:5px;">`
      : `<input type="${c.tipo === 'numero' ? 'number' : 'text'}" id="${c.id}" placeholder="${c.ph||''}"
          ${c.soloLectura ? 'readonly style="width:100%;padding:9px;border-radius:var(--radius);border:1px solid var(--borde);font-size:13px;margin-top:5px;background:#F8FAFC;color:var(--texto2);"' : `oninput="${c.tipo==='numero' ? 'onCambioMontoAnexo();' : ''}actualizarPreviaAnexo()" style="width:100%;padding:9px;border-radius:var(--radius);border:1px solid var(--borde);font-size:13px;margin-top:5px;"`}>`;
    return `
      <div class="form-group" style="margin-bottom:12px;">
        <label style="font-size:12px;font-weight:600;color:var(--texto2);">${c.label} *</label>
        ${inputTag}
      </div>`;
  };

  zona.innerHTML = `
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:var(--radius);padding:14px;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px;">
        <i class="ti ti-edit"></i> ${TIPOS_ANEXO[tipo]}
      </div>
      ${def.campos.map(campoHTML).join('')}
    </div>`;
  actualizarPreviaAnexo();
}

/* El monto en número siempre manda; el campo "en palabras" es solo informativo/solo-lectura */
function onCambioMontoAnexo(){
  const montoEl = document.getElementById('anx-nuevo-sueldo');
  const letrasEl = document.getElementById('anx-nuevo-sueldo-escrito');
  if(!montoEl || !letrasEl) return;
  const monto = parseInt(montoEl.value||0) || 0;
  letrasEl.value = monto ? (numeroALetras(monto).trim() + ' pesos') : '';
}

/* Lee todos los valores de los campos del formulario activo, según el catálogo */
function leerValoresAnexo(tipo){
  const def = ANX_CATALOG[tipo];
  const v = {};
  if(def) def.campos.forEach(c => { v[c.id] = document.getElementById(c.id)?.value?.trim() || ''; });
  return v;
}

function obtenerDetalleAnexo(){
  const tipo = document.getElementById('anexo-tipo').value;
  const def  = ANX_CATALOG[tipo];
  if(!def) return '';
  return def.detalle(leerValoresAnexo(tipo)) || '';
}

/* ───────── Constructor único del documento (usado en Vista Previa y en el PDF) ───────── */

function construirDocumentoAnexo({ t, emp, cont, tipo, valores, fechaVig, ciudad, obs, folioLinea }){
  const def = ANX_CATALOG[tipo];
  if(!def) return '';

  const fmtFecha = v => v ? new Date(v).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}) : '___________';
  const fechaContratoOrig = cont?.fecha_firma || t?.fecha_ingreso;

  const fuente = def.fuente ? FUENTE_CLAUSULA_CONTRATO[def.fuente] : null;

  const v = {
    ...valores,
    fechaVigFmt:     fmtFecha(fechaVig),
    fechaContratoFmt:fmtFecha(fechaContratoOrig),
    fuenteOrdinal:   fuente ? fuente.ordinal : '',
    empresaNombre:   emp?.razon_social || '___________',
  };

  const segunda = def.segunda(v);
  const ciudadFinal = ciudad || emp?.ciudad || '___________';

  return `
${folioLinea ? `<div class="doc-folio">${folioLinea}</div>` : ''}
<h1>Anexo de Contrato de Trabajo</h1>
<h2>Por ${TIPOS_ANEXO[tipo] || ''}</h2>

<p>En <strong>${ciudadFinal}</strong>, a ${fmtFecha(fechaVig)}, entre
<strong>${emp?.razon_social || '___________'}</strong>,
RUT <strong>${emp?.rut || '___________'}</strong>,
representada legalmente por don(ña) <strong>${emp?.representante || '___________'}</strong>,
RUT <strong>${emp?.rut_representante || '___________'}</strong>,
en su calidad de <strong>${emp?.cargo_representante || 'Representante Legal'}</strong>,
domiciliada en <strong>${emp?.direccion || '______________'}</strong>,
en adelante <em>"el Empleador"</em>,
y don(ña) <strong>${t?.nombre || '___________'}</strong>,
RUT <strong>${t?.rut || '___________'}</strong>,
con domicilio en <strong>${t?.domicilio || '______________'}</strong>,
en adelante <em>"el Trabajador"</em>,
se acuerda celebrar el presente Anexo de Contrato de Trabajo, respecto del contrato
suscrito con fecha <strong>${fmtFecha(fechaContratoOrig)}</strong>, de acuerdo con las
siguientes cláusulas:</p>

<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">01</span><span class="clausula-tit">Primera — Antecedentes</span></div>
  <p>Las partes dejan constancia de que con fecha <strong>${fmtFecha(fechaContratoOrig)}</strong>
  suscribieron un contrato individual de trabajo, el cual se encuentra actualmente vigente.</p>
  <p>De común acuerdo, las partes han convenido modificar exclusivamente las condiciones
  relativas a <strong>${def.materia}</strong>, manteniéndose plenamente vigentes todas las
  demás estipulaciones contenidas en el contrato de trabajo y en sus anexos anteriores que
  no sean expresamente modificadas por el presente instrumento.</p>
</div>

<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">02</span><span class="clausula-tit">Segunda — ${segunda.titulo}</span></div>
  ${segunda.html}
  ${obs ? `<p><strong>Observaciones:</strong> ${obs}</p>` : ''}
</div>

<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">03</span><span class="clausula-tit">Tercera — Vigencia de la modificación</span></div>
  <p>Las partes acuerdan que la modificación establecida en el presente Anexo de Contrato de
  Trabajo comenzará a regir a contar del día <strong>${fmtFecha(fechaVig)}</strong>, fecha
  desde la cual la presente modificación producirá todos sus efectos legales y
  contractuales.</p>
</div>

<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">04</span><span class="clausula-tit">Cuarta — Ratificación del contrato</span></div>
  <p>Las partes declaran expresamente que el presente Anexo de Contrato de Trabajo modifica
  única y exclusivamente la estipulación señalada en la cláusula segunda del presente
  instrumento, manteniéndose plenamente vigentes e inalteradas todas las demás cláusulas,
  derechos y obligaciones contenidas en el contrato individual de trabajo suscrito con fecha
  <strong>${fmtFecha(fechaContratoOrig)}</strong>, así como aquellas establecidas en los
  anexos celebrados con anterioridad que no sean incompatibles con la presente
  modificación.</p>
</div>

<div class="firma-cierre">
<div class="clausula">
  <div class="clausula-head"><span class="clausula-badge">05</span><span class="clausula-tit">Quinta — Ejemplares y aceptación</span></div>
  <p>El presente Anexo de Contrato de Trabajo se extiende en dos ejemplares de un mismo
  tenor y fecha, declarando las partes haber leído íntegramente su contenido, comprender el
  alcance de las modificaciones que en él se establecen y manifestar su plena conformidad
  con cada una de sus cláusulas, firmando ambos ejemplares en señal de aceptación, quedando
  uno en poder del Empleador y otro en poder del Trabajador.</p>
  <p>El empleador se obliga a registrar el presente anexo en el sitio electrónico de la
  Dirección del Trabajo (www.direcciondeltrabajo.cl) dentro de los quince días hábiles
  siguientes a su celebración, conforme a lo dispuesto en el artículo 9 bis del Código del
  Trabajo.</p>
</div>

<div class="firma-grid">
  <div class="firma-box">
    <div class="firma-linea"></div>
    <div class="firma-nombre">${emp?.razon_social || '___________'}</div>
    <div class="firma-rol">Representante legal: ${emp?.representante || '___________'}</div>
    <div class="firma-rol">RUT: ${emp?.rut_representante || '___________'}</div>
  </div>
  <div class="firma-box">
    <div class="firma-linea"></div>
    <div class="firma-nombre">${t?.nombre || '___________'}</div>
    <div class="firma-rol">Trabajador(a)</div>
    <div class="firma-rol">RUT: ${t?.rut || '___________'}</div>
  </div>
</div>
</div>`;
}

const ANEXO_DOC_CSS = `
  :root{ --verde-doc:#0F4C3A; }
  @page{ size:letter; margin:2.2cm 2.4cm; }
  *{ box-sizing:border-box; }
  body{ font-family:'Times New Roman',serif; font-size:11pt; line-height:1.75;
    margin:0; padding:0; color:#1a1a1a; }
  .doc-wrap{ max-width:76ch; margin:0 auto; }
  h1{ font-size:13pt; text-align:center; text-transform:uppercase;
    letter-spacing:1.2px; margin:0 0 4px; font-weight:bold; }
  h2{ font-size:11pt; text-align:center; text-transform:uppercase;
    letter-spacing:0.5px; margin:0 0 16px; font-weight:normal; color:#555; }
  p{ text-align:justify; margin:0 0 9px; orphans:3; widows:3; }
  .clausula{ margin-bottom:18px; }
  .clausula-head{ display:flex; align-items:center; gap:8px; margin-bottom:6px;
    page-break-after:avoid; break-after:avoid; }
  .clausula-badge{ font-family:Arial,Helvetica,sans-serif; background:var(--verde-doc);
    color:#fff; font-size:8pt; font-weight:bold; width:18px; height:18px; border-radius:4px;
    display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .clausula-tit{ font-family:Arial,Helvetica,sans-serif; font-size:10.5pt; font-weight:700;
    color:var(--verde-doc); letter-spacing:-0.01em; }
  .firma-grid{ display:grid; grid-template-columns:1fr 1fr; gap:50px; margin-top:28px; break-inside:avoid; page-break-inside:avoid; }
  .firma-cierre{ page-break-inside:avoid; break-inside:avoid; }
  .firma-box{ text-align:center; }
  .firma-linea{ border-top:1px solid #000; padding-top:6px; margin-top:28px; }
  .firma-nombre{ font-weight:bold; font-size:10pt; }
  .firma-rol{ font-size:9pt; color:#444; margin-top:1px; }
  .doc-folio{ font-family:Arial,Helvetica,sans-serif; font-size:6.5pt; color:#aaa;
    text-align:center; margin-bottom:8px; letter-spacing:0.2px; text-transform:uppercase; }
`;

function _folioAnexo(t){
  const base = (t?.rut||'').replace(/[^0-9kK]/g,'') + (t?.id||'') + new Date().toISOString().slice(0,10);
  let hash = 0;
  for(let i=0;i<base.length;i++){ hash = ((hash<<5)-hash + base.charCodeAt(i))|0; }
  return Math.abs(hash).toString(36).toUpperCase().slice(0,8);
}

/* Arma el contexto (trabajador/empresa/contrato) desde el formulario en vivo */
function _contextoAnexoDesdeForm(){
  const id  = document.getElementById('anexo-trabajador-select')?.value;
  const tipo = document.getElementById('anexo-tipo')?.value;
  if(!id || !tipo) return null;

  const t    = trabajadores.find(x => x.id === id);
  const epId = document.getElementById('anexo-empresa-propia')?.value || t?.empresa_propia_id || '';
  const emp  = getEmpresaEmpleadora(epId);
  const cont = contratos.find(c => c.trabajador_id === id || c.trabajador_rut === t?.rut);

  return {
    t, emp, cont, tipo,
    valores:  leerValoresAnexo(tipo),
    fechaVig: document.getElementById('anexo-fecha-vigencia')?.value,
    ciudad:   document.getElementById('anexo-ciudad')?.value?.trim(),
    obs:      document.getElementById('anexo-observaciones')?.value?.trim(),
  };
}

/* ───────── Vista previa en vivo ───────── */

function actualizarPreviaAnexo(){
  const p = document.getElementById('anexo-preview');
  if(!p) return;

  const ctx = _contextoAnexoDesdeForm();
  if(!ctx){
    p.innerHTML = `<div style="text-align:center;padding:24px;color:var(--texto3);font-size:13px;">
      Selecciona trabajador y tipo de anexo
    </div>`;
    return;
  }

  const docHTML = construirDocumentoAnexo(ctx);

  p.innerHTML = `
    <div style="background:#0f2942;color:#fff;padding:9px 12px;border-radius:var(--radius) var(--radius) 0 0;font-size:12px;font-weight:600;text-align:center;">
      Vista previa del documento
    </div>
    <div style="border:1px solid var(--borde);border-top:none;border-radius:0 0 var(--radius) var(--radius);
      max-height:520px;overflow-y:auto;background:#fff;padding:20px;">
      <style>#anexo-preview .doc-wrap{max-width:none;font-size:9.5pt;line-height:1.55;}</style>
      <div class="doc-wrap">${docHTML}</div>
    </div>`;
}

/* ───────── Guardar / Generar PDF / Historial ───────── */

function guardarAnexo(){
  const tipo         = document.getElementById('anexo-tipo').value;
  const fechaVig     = document.getElementById('anexo-fecha-vigencia').value;
  const trabajadorId = document.getElementById('anexo-trabajador-select')?.value
                    || document.getElementById('c-trabajador')?.value;

  if(!tipo)        { toast('⚠️ Selecciona el tipo de anexo','error'); return; }
  if(!fechaVig)    { toast('⚠️ Ingresa la fecha de vigencia','error'); return; }
  if(!trabajadorId){ toast('⚠️ Selecciona un trabajador primero','error'); return; }

  const t       = trabajadores.find(x => x.id === trabajadorId);
  const valores = leerValoresAnexo(tipo);
  const detalle = ANX_CATALOG[tipo].detalle(valores);
  if(!detalle){ toast('⚠️ Completa los campos del anexo','error'); return; }

  const nuevoAnexo = {
    id:             Date.now().toString(),
    trabajador_rut: t?.rut,
    trabajador_id:  trabajadorId,
    tipo,
    tipo_texto:     TIPOS_ANEXO[tipo],
    detalle,
    valores,          // valores crudos del formulario — permiten regenerar el documento exacto después
    fecha_vigencia: fechaVig,
    ciudad:         document.getElementById('anexo-ciudad')?.value.trim() || '',
    observaciones:  document.getElementById('anexo-observaciones')?.value.trim() || '',
    fecha_creacion: new Date().toISOString(),
    // Campo numérico para cambio_remuneracion — usado por variables.js
    nuevo_sueldo:   tipo === 'cambio_remuneracion'
      ? (parseFloat(valores['anx-nuevo-sueldo'] || 0) || null)
      : null,
  };

  anexos.push(nuevoAnexo);
  guardarLocal();
  actualizarBadgesContratos();

  toast(`✅ Anexo "${TIPOS_ANEXO[tipo]}" guardado`, 'exito');
  renderHistorialAnexos(t?.rut);

  // Limpiar campos del formulario (no el trabajador)
  document.getElementById('anexo-tipo').value = '';
  document.getElementById('anexo-campos-variables').innerHTML = '';
  document.getElementById('anexo-fecha-vigencia').value = '';
  document.getElementById('anexo-observaciones').value = '';
  actualizarPreviaAnexo();
}

function renderHistorialAnexos(rut){
  if(!rut) return;
  const lista = document.getElementById('anexo-historial-lista');
  if(!lista) return;
  const hist  = (anexos||[]).filter(a => a.trabajador_rut === rut)
    .sort((a,b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

  if(!hist.length){
    lista.innerHTML = '<div style="text-align:center;padding:20px;color:var(--texto3);font-size:13px;">Sin anexos registrados para este trabajador</div>';
    return;
  }

  lista.innerHTML = hist.map(a => `
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:10px 12px;border:1px solid var(--borde);border-radius:var(--radius);
      margin-bottom:6px;background:#fff;">
      <div>
        <div style="font-size:13px;font-weight:600;">
          <i class="ti ti-paperclip" style="color:var(--verde-dark);margin-right:4px;"></i>
          ${a.tipo_texto}
        </div>
        <div style="font-size:11px;color:var(--texto2);margin-top:2px;">${a.detalle}</div>
        <div style="font-size:11px;color:var(--texto3);margin-top:2px;">
          Vigente desde: ${new Date(a.fecha_vigencia).toLocaleDateString('es-CL')}
        </div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-secondary btn-sm" onclick="generarPDFAnexoPorId('${a.id}')">
          <i class="ti ti-file-type-pdf"></i> PDF
        </button>
        <button class="btn btn-secondary btn-sm" onclick="eliminarAnexo('${a.id}')"
          style="color:var(--danger);">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    </div>`).join('');
}

function eliminarAnexo(id){
  if(!confirm('¿Eliminar este anexo?')) return;
  const a = (anexos||[]).find(x => x.id === id);
  anexos = (anexos||[]).filter(x => x.id !== id);
  guardarLocal();
  if(a) renderHistorialAnexos(a.trabajador_rut);
  toast('🗑️ Anexo eliminado','exito');
}

/* Abre el documento en una ventana nueva, listo para imprimir/guardar como PDF */
function _abrirVentanaAnexo(docHTML, tituloVentana, contexto){
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="es"><head>
  <meta charset="UTF-8">
  <title>${tituloVentana}</title>
  <style>${ANEXO_DOC_CSS}
    .no-print{ margin-bottom:24px; }
    @media print{ .no-print{display:none !important;} }
  </style>
</head><body>
<div class="doc-wrap">
<div class="no-print" style="display:flex;gap:10px;align-items:center;">
  <button onclick="window.print()" style="padding:10px 24px;background:#0f2942;color:#fff;
    border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
    🖨️ Imprimir / Guardar PDF
  </button>
  <button onclick="window.close()" style="padding:10px 16px;background:#f1f5f9;
    border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;">
    Cerrar
  </button>
</div>
${docHTML}
</div>
</body></html>`);
  win.document.close();

  registrarDocumentoCarpeta({
    trabajador_id:  contexto.t?.id || '',
    trabajador_rut: contexto.t?.rut || '',
    tipo:           'anexo',
    subtipo:        contexto.tipo,
    folio:          contexto.folio,
    fecha_firma:    contexto.fechaVig || '',
    descripcion:    `Anexo — ${TIPOS_ANEXO[contexto.tipo] || contexto.tipo}`,
  });
}

/* Genera el PDF desde el formulario que se está completando ahora mismo */
function generarPDFAnexo(){
  const ctx = _contextoAnexoDesdeForm();
  if(!ctx){ toast('⚠️ Selecciona un trabajador y un tipo de anexo','error'); return; }
  if(!ctx.fechaVig){ toast('⚠️ Ingresa la fecha de vigencia','error'); return; }

  const detalle = ANX_CATALOG[ctx.tipo].detalle(ctx.valores);
  if(!detalle){ toast('⚠️ Completa los campos del anexo','error'); return; }

  const folioDoc   = _folioAnexo(ctx.t);
  const folioLinea = `Doc. N° ${folioDoc} · ${ctx.t?.nombre||'—'} · RUT ${ctx.t?.rut||'—'} · Emitido el ${new Date().toLocaleDateString('es-CL')}`;
  const docHTML    = construirDocumentoAnexo({ ...ctx, folioLinea });

  _abrirVentanaAnexo(docHTML, `Anexo — ${TIPOS_ANEXO[ctx.tipo]} — ${ctx.t?.nombre}`, { ...ctx, folio: folioDoc });
}

/* Regenera el PDF de un anexo YA GUARDADO, directamente desde sus datos —
   no depende del estado actual del formulario en pantalla. */
function generarPDFAnexoPorId(id){
  const a = (anexos||[]).find(x => x.id === id);
  if(!a) return;

  const t    = trabajadores.find(x => x.rut === a.trabajador_rut);
  const epId = t?.empresa_propia_id || '';
  const emp  = getEmpresaEmpleadora(epId);
  const cont = contratos.find(c => c.trabajador_id === t?.id || c.trabajador_rut === t?.rut);

  const ctx = {
    t, emp, cont,
    tipo:     a.tipo,
    valores:  a.valores || {},
    fechaVig: a.fecha_vigencia,
    ciudad:   a.ciudad,
    obs:      a.observaciones,
  };

  const folioLinea = `Doc. N° ${_folioAnexo(t)} · ${t?.nombre||'—'} · RUT ${t?.rut||'—'} · Emitido el ${new Date().toLocaleDateString('es-CL')}`;
  const docHTML    = construirDocumentoAnexo({ ...ctx, folioLinea });

  _abrirVentanaAnexo(docHTML, `Anexo — ${a.tipo_texto} — ${t?.nombre}`, { ...ctx, folio: a.folio || _folioAnexo(t) });
}

/* ───────── Selección de trabajador (lista visual) ───────── */

function poblarSelectAnexoTrabajador(){
  poblarSelectEmpresaAnexo();

  const sel = document.getElementById('anexo-trabajador-select');
  if(!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar trabajador —</option>'
    + trabajadores.filter(t => t.estado === 'activo')
      .sort((a,b) => a.nombre?.localeCompare(b.nombre))
      .map(t => `<option value="${t.id}">${t.nombre} — ${t.rut}</option>`)
      .join('');
  if(val){ sel.value = val; onSeleccionTrabajadorAnexo(); }
  _renderListaVisualTrabajadorAnexo();
}

function poblarSelectEmpresaAnexo(){
  const sel = document.getElementById('anexo-empresa-propia');
  if(!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">— Todas las empresas —</option>'
    + (empresas_propias||[])
      .map(e => `<option value="${e.id}">${e.razon_social || e.nombre}</option>`)
      .join('');
  if(val) sel.value = val;
}

/* Al cambiar la Empresa Empleadora: refiltra la lista y, si el trabajador ya
   seleccionado no pertenece a la empresa recién elegida, limpia la selección. */
function onCambioEmpresaFiltroAnexo(){
  const epFiltro = document.getElementById('anexo-empresa-propia')?.value || '';
  const sel = document.getElementById('anexo-trabajador-select');
  const actual = trabajadores.find(t => t.id === sel?.value);

  if(epFiltro && actual && (actual.empresa_propia_id || '') !== epFiltro){
    sel.value = '';
    onSeleccionTrabajadorAnexo();
  }

  _renderListaVisualTrabajadorAnexo();
}

function _renderListaVisualTrabajadorAnexo(){
  const cont = document.getElementById('lista-visual-trabajador-anexo');
  if(!cont) return;

  const buscar    = (document.getElementById('anx-buscar-visual')?.value || '').toLowerCase().trim();
  const valActual = document.getElementById('anexo-trabajador-select')?.value || '';
  const epFiltro  = document.getElementById('anexo-empresa-propia')?.value || '';

  let lista = trabajadores.filter(t => t.estado === 'activo');
  if(epFiltro){
    lista = lista.filter(t => (t.empresa_propia_id || '') === epFiltro);
  }
  if(buscar){
    lista = lista.filter(t => t.nombre?.toLowerCase().includes(buscar) || t.rut?.toLowerCase().includes(buscar));
  }
  lista.sort((a,b) => a.nombre?.localeCompare(b.nombre));

  if(!lista.length){
    cont.innerHTML = `<div style="padding:18px;text-align:center;color:var(--texto3);font-size:13px;">Sin resultados</div>`;
    return;
  }

  cont.innerHTML = lista.map(t => {
    const tieneAnexo   = (anexos||[]).some(a => a.trabajador_rut === t.rut);
    const seleccionado = valActual === t.id;
    return `<div onclick="_seleccionarTrabajadorAnexoVisual('${t.id}')"
        style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;
        border-bottom:1px solid var(--borde);background:${seleccionado?'#EFF6FF':'#fff'};"
        onmouseover="this.style.background='${seleccionado?'#EFF6FF':'#f8fafc'}'"
        onmouseout="this.style.background='${seleccionado?'#EFF6FF':'#fff'}'">
      <span style="width:22px;height:22px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:13px;color:#fff;background:${tieneAnexo?'#16a34a':'#dc2626'};">
        ${tieneAnexo ? '✓' : '✕'}
      </span>
      <span style="font-size:13px;font-weight:500;flex:1;">${t.nombre}</span>
      <span style="font-size:12px;font-family:monospace;color:var(--texto3);">${t.rut}</span>
      <span style="font-size:11px;font-weight:600;color:${tieneAnexo?'#16a34a':'#dc2626'};">${tieneAnexo?'con anexo':'sin anexo'}</span>
    </div>`;
  }).join('');
}

function _seleccionarTrabajadorAnexoVisual(id){
  const sel = document.getElementById('anexo-trabajador-select');
  if(!sel) return;
  sel.value = id;
  onSeleccionTrabajadorAnexo();
  _renderListaVisualTrabajadorAnexo();
}

function onSeleccionTrabajadorAnexo(){
  const id = document.getElementById('anexo-trabajador-select')?.value;
  if(!id){
    ['nombre','rut','empresa','rep','mandante','cargo','faena','fecha-contrato']
      .forEach(k => { const el=document.getElementById('anexo-pre-'+k); if(el) el.textContent='—'; });
    document.getElementById('anexo-historial-lista').innerHTML =
      '<div style="text-align:center;padding:20px;color:var(--texto3);font-size:13px;">Selecciona un trabajador</div>';
    actualizarPreviaAnexo();
    return;
  }
  const t    = trabajadores.find(x => x.id === id);
  const epId = document.getElementById('anexo-empresa-propia')?.value || t?.empresa_propia_id || '';
  const emp  = getEmpresaEmpleadora(epId);
  const man  = findMandante(t);
  const cont = contratos.find(c => c.trabajador_id === id || c.trabajador_rut === t?.rut);

  const set = (elId, val) => { const el=document.getElementById(elId); if(el) el.textContent = val||'—'; };
  set('anexo-pre-nombre',        t?.nombre);
  set('anexo-pre-rut',           t?.rut);
  set('anexo-pre-empresa',       emp.razon_social);
  set('anexo-pre-rep',           emp.representante);
  set('anexo-pre-mandante',      man?.nombre);
  set('anexo-pre-cargo',         cont?.funcion_cargo || t?.funcion_cargo);
  set('anexo-pre-faena',         cont?.nombre_faena  || t?.faena_obra);
  set('anexo-pre-fecha-contrato',
      cont?.fecha_firma ? new Date(cont.fecha_firma).toLocaleDateString('es-CL')
      : t?.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString('es-CL') : null);

  // Ciudad desde cfg
  const ciudad = document.getElementById('anexo-ciudad');
  if(ciudad && !ciudad.value) ciudad.value = emp.ciudad || '';

  renderHistorialAnexos(t?.rut);
  actualizarPreviaAnexo();
}

function limpiarFormAnexo(){
  document.getElementById('anexo-trabajador-select').value = '';
  document.getElementById('anexo-tipo').value = '';
  document.getElementById('anexo-campos-variables').innerHTML = '';
  document.getElementById('anexo-fecha-vigencia').value = '';
  document.getElementById('anexo-ciudad').value = '';
  document.getElementById('anexo-observaciones').value = '';
  ['nombre','rut','empresa','rep','mandante','cargo','faena','fecha-contrato']
    .forEach(k => { const el=document.getElementById('anexo-pre-'+k); if(el) el.textContent='—'; });
  document.getElementById('anexo-historial-lista').innerHTML =
    '<div style="text-align:center;padding:20px;color:var(--texto3);font-size:13px;">Selecciona un trabajador para ver su historial</div>';
  actualizarPreviaAnexo();
}
