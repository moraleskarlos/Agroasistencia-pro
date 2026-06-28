/* ════════════════════════════════════════════════════════
   AYUDA.JS — Panel de ayuda contextual por módulo
   AgroAsistencia Pro · Versión 1.0
   ════════════════════════════════════════════════════════ */

/* ── 1. CONTENIDO DE AYUDA POR MÓDULO ─────────────────── */
const AYUDA_CONTENIDO = {

  dashboard: {
    titulo: '📊 Dashboard',
    secciones: [
      {
        icono: '🎯',
        titulo: 'Objetivo',
        contenido: 'Vista general del estado operativo: cuántos trabajadores están activos, la asistencia del día y el desempeño por mandante. Es el punto de partida cada vez que ingresas al sistema.'
      },
      {
        icono: '📋',
        titulo: 'Qué muestra',
        contenido: '<ul><li><strong>Presentes hoy:</strong> marcaciones del día (requiere Supabase)</li><li><strong>Total trabajadores:</strong> todos los registrados en el sistema</li><li><strong>Mandantes:</strong> empresas contratantes activas</li><li><strong>Asistencia mes:</strong> promedio general del período</li><li><strong>Barras por mandante:</strong> activos vs total de cada empresa</li><li><strong>Gráfico semanal:</strong> asistencia de los últimos 7 días</li></ul>'
      },
      {
        icono: '💡',
        titulo: 'Consejo',
        contenido: 'Antes de comenzar el día, revisa el Dashboard para detectar trabajadores sin marcación. Las barras de mandantes te avisan si hay grupos con baja asistencia.'
      },
      {
        icono: '🔗',
        titulo: 'Flujo relacionado',
        contenido: 'Dashboard → Asistencia (registrar marcaciones) → Exportar (descarga de reportes del período)'
      }
    ],
    faq: [
      { p: '¿Por qué aparece "—" en Presentes hoy?', r: 'Las marcaciones en tiempo real requieren conexión a Supabase. Configura las credenciales en el módulo Configuración.' },
      { p: '¿Cómo actualizo los datos?', r: 'El Dashboard se recarga cada vez que haces clic en él desde el menú lateral.' }
    ]
  },

  contratistas: {
    titulo: '🏢 Empresas',
    secciones: [
      {
        icono: '🎯',
        titulo: 'Objetivo',
        contenido: 'Administra las empresas que intervienen en tu operación: tus propias empresas contratistas y las empresas mandantes para las cuales prestas servicios.'
      },
      {
        icono: '📂',
        titulo: 'Mis Empresas (Contratistas)',
        contenido: 'Son las empresas que tú administras como contratista. Cada empresa propia tiene su RUT, razón social, representante legal y datos de contacto. Esta información se usa para generar contratos y documentos legales.'
      },
      {
        icono: '🏗️',
        titulo: 'Mandantes',
        contenido: 'Son las empresas que te contratan para proveer mano de obra. Puedes registrar múltiples mandantes y asociarles faenas específicas. Cada trabajador queda vinculado a un mandante.'
      },
      {
        icono: '📋',
        titulo: 'Paso a paso — Agregar empresa propia',
        contenido: '<ol><li>Ir a la pestaña <strong>Mis Empresas</strong></li><li>Clic en <strong>+ Agregar empresa</strong></li><li>Completar RUT, razón social, representante legal y cargo</li><li>Guardar — aparecerá en los contratos automáticamente</li></ol>'
      },
      {
        icono: '🏭',
        titulo: 'Paso a paso — Agregar mandante',
        contenido: '<ol><li>Ir a la pestaña <strong>Mandantes</strong></li><li>Clic en <strong>+ Nuevo mandante</strong></li><li>Completar RUT y nombre de la empresa</li><li>Opcionalmente, agregar faenas con su código y descripción</li><li>Guardar</li></ol>'
      },
      {
        icono: '💡',
        titulo: 'Consejo',
        contenido: 'Registra el representante legal con nombre exacto como aparece en el Registro de Comercio. Esa información se trasladará automáticamente a todos los contratos de trabajo.'
      },
      {
        icono: '🔗',
        titulo: 'Flujo relacionado',
        contenido: 'Empresas → Registro Personal (asignar mandante) → Contratos (datos del empleador)'
      }
    ],
    faq: [
      { p: '¿Puedo tener más de una empresa propia?', r: 'Sí. Puedes registrar todas las razones sociales que administres. Al crear un contrato, seleccionas cuál actúa como empleadora.' },
      { p: '¿Qué es una faena?', r: 'Una faena es el lugar o proyecto específico donde trabajan los operarios dentro de un mandante. Ejemplo: "Temporada uva 2025 — Fundo El Rosario".' },
      { p: '¿Puedo editar un mandante después de asignarle trabajadores?', r: 'Sí. Los cambios en los datos del mandante no afectan los contratos ya generados.' }
    ]
  },

  registro: {
    titulo: '👤 Registro de Personal',
    secciones: [
      {
        icono: '🎯',
        titulo: 'Objetivo',
        contenido: 'Incorporar trabajadores al sistema de forma individual o mediante carga masiva desde Excel. Una vez registrado, el trabajador queda disponible para asignarle contratos, registrar asistencia y generar documentos.'
      },
      {
        icono: '📋',
        titulo: 'Paso a paso — Registro individual',
        contenido: '<ol><li>Ingresa la <strong>fecha de ingreso</strong> (obligatoria)</li><li>Escribe el <strong>RUT</strong> — el sistema valida el dígito verificador automáticamente</li><li>Completa nombre completo y nacionalidad</li><li>Si es extranjero: aparecerán los campos migratorios (tipo de documento y vencimiento)</li><li>Completa datos de contacto, previsión y AFP</li><li>Selecciona el <strong>mandante</strong> al que pertenece</li><li>Clic en <strong>Guardar trabajador</strong></li></ol>'
      },
      {
        icono: '📊',
        titulo: 'Carga masiva desde Excel',
        contenido: '<ol><li>Descarga la plantilla con el botón <strong>Descargar plantilla</strong></li><li>Completa los datos en Excel respetando las columnas</li><li>Guarda el archivo como .xlsx</li><li>Arrastra el archivo o usa el botón para cargarlo</li><li>Revisa la vista previa y confirma la importación</li></ol>'
      },
      {
        icono: '🌍',
        titulo: 'Trabajadores extranjeros',
        contenido: 'Al seleccionar una nacionalidad distinta a "Chileno", aparecerán automáticamente los campos de documento migratorio: tipo (Residencia Temporal, Visa de Temporada, etc.) y fecha de vencimiento. Estos datos alimentan el <strong>semáforo migratorio</strong> en el módulo Trabajadores.'
      },
      {
        icono: '⚠️',
        titulo: 'Errores frecuentes',
        contenido: '<ul><li><strong>RUT inválido:</strong> verifica que el dígito verificador sea correcto</li><li><strong>Trabajador duplicado:</strong> usa "Buscar RUT existente" para verificar antes de registrar</li><li><strong>Campos requeridos vacíos:</strong> RUT, nombre, fecha de ingreso y mandante son obligatorios</li></ul>'
      },
      {
        icono: '🔗',
        titulo: 'Flujo relacionado',
        contenido: 'Registro → Contratos (generar contrato) → Asistencia (registrar jornada)'
      }
    ],
    faq: [
      { p: '¿Puedo registrar un trabajador sin mandante?', r: 'No. El mandante es obligatorio para que el trabajador aparezca correctamente en los reportes y contratos.' },
      { p: '¿Qué pasa si el RUT ya existe?', r: 'El sistema mostrará los datos existentes para que puedas actualizarlos en lugar de duplicar el registro.' },
      { p: '¿Dónde quedan los documentos migratorios del trabajador?', r: 'En el perfil del trabajador, pestaña Carpeta Laboral, y en el módulo Trabajadores → pestaña Extranjeros.' }
    ]
  },

  trabajadores: {
    titulo: '👥 Trabajadores',
    secciones: [
      {
        icono: '🎯',
        titulo: 'Objetivo',
        contenido: 'Consultar, buscar y gestionar todos los trabajadores del sistema. Acceder al perfil individual, revisar documentación y controlar el estado migratorio de trabajadores extranjeros.'
      },
      {
        icono: '🔍',
        titulo: 'Búsqueda y filtros',
        contenido: 'Puedes filtrar la tabla por <strong>nombre o RUT</strong> usando el buscador, y además filtrar por <strong>mandante</strong> y <strong>estado</strong> (activo/inactivo) con los selectores superiores. Los filtros se combinan entre sí.'
      },
      {
        icono: '🌍',
        titulo: 'Pestaña Extranjeros — Semáforo migratorio',
        contenido: '<ul><li>🟢 <strong>Vigente:</strong> más de 90 días para el vencimiento — sin acción requerida</li><li>🟡 <strong>Iniciar trámite:</strong> entre 31 y 90 días — coordinar renovación</li><li>🔴 <strong>Urgente:</strong> 30 días o menos — gestionar de inmediato</li><li>⚫ <strong>Vencido:</strong> documento expirado — revisar situación legal</li></ul>'
      },
      {
        icono: '📁',
        titulo: 'Carpeta Laboral',
        contenido: 'Cada trabajador tiene una Carpeta Laboral en su perfil que registra automáticamente todos los documentos generados: contratos, anexos, liquidaciones y finiquitos. Para acceder, haz clic en el nombre del trabajador.'
      },
      {
        icono: '💡',
        titulo: 'Consejo',
        contenido: 'Revisa la pestaña Extranjeros cada semana. Los trabajadores con estado 🟡 o 🔴 requieren gestión activa para evitar contingencias legales bajo la Ley N°21.325.'
      },
      {
        icono: '🔗',
        titulo: 'Flujo relacionado',
        contenido: 'Trabajadores → Perfil → Carpeta Laboral / Contratos / Asistencia'
      }
    ],
    faq: [
      { p: '¿Cómo inactivo un trabajador?', r: 'Desde la tabla, haz clic en el ícono de editar. Cambia el campo "Estado" a inactivo y guarda.' },
      { p: '¿Los trabajadores inactivos cuentan en los KPIs?', r: 'No. Los KPIs del Dashboard y los reportes filtran solo trabajadores activos por defecto.' },
      { p: '¿Puedo ver todos los contratos de un trabajador?', r: 'Sí. Ingresa al perfil del trabajador y navega a la pestaña Carpeta Laboral.' }
    ]
  },

  contratos: {
    titulo: '📄 Contratos',
    secciones: [
      {
        icono: '🎯',
        titulo: 'Objetivo',
        contenido: 'Generar contratos de trabajo legalmente válidos según la legislación laboral chilena. El sistema soporta tres tipos: Contrato de Temporada, Plazo Fijo e Indefinido.'
      },
      {
        icono: '📋',
        titulo: 'Tipos de contrato',
        contenido: '<ul><li><strong>Temporada:</strong> para labores cíclicas agrícolas. Requiere fecha inicio y término de la temporada. Aplica Art. 93 y ss. del Código del Trabajo.</li><li><strong>Plazo Fijo:</strong> para trabajos de duración determinada. Máximo 1 año prorrogable (o 2 años para profesionales). Requiere fecha de término.</li><li><strong>Indefinido:</strong> sin fecha de término. Más estabilidad para el trabajador.</li></ul>'
      },
      {
        icono: '📋',
        titulo: 'Paso a paso — Generar contrato',
        contenido: '<ol><li>Selecciona el <strong>trabajador</strong> desde el buscador</li><li>Elige el <strong>tipo de contrato</strong></li><li>Selecciona la <strong>empresa empleadora</strong> (tus empresas propias)</li><li>Completa las condiciones: labor, remuneración, jornada, lugar de trabajo</li><li>Revisa la vista previa</li><li>Clic en <strong>Generar PDF</strong> — el documento queda registrado en la Carpeta Laboral</li></ol>'
      },
      {
        icono: '📎',
        titulo: 'Anexos',
        contenido: 'Los anexos modifican cláusulas de un contrato vigente sin rescindirlo. Puedes generarlos desde el módulo Contratos → sección Anexos. Tipos disponibles: cambio de labor, cargo, faena, mandante, jornada, remuneración, prórroga, domicilio laboral, asignación especial y otros.'
      },
      {
        icono: '⚠️',
        titulo: 'Errores frecuentes',
        contenido: '<ul><li><strong>No aparece el trabajador:</strong> verifica que esté registrado y activo en el sistema</li><li><strong>Empresa empleadora vacía:</strong> debes tener al menos una empresa propia registrada en el módulo Empresas</li><li><strong>PDF en blanco:</strong> asegúrate de completar todos los campos obligatorios antes de generar</li></ul>'
      },
      {
        icono: '🔗',
        titulo: 'Flujo relacionado',
        contenido: 'Empresas (datos empleador) → Trabajadores (seleccionar) → Contratos → Carpeta Laboral (registro automático)'
      }
    ],
    faq: [
      { p: '¿Puedo modificar un contrato ya generado?', r: 'Los contratos PDF son documentos finales. Para modificar condiciones, genera un Anexo de modificación.' },
      { p: '¿El contrato se guarda en el sistema?', r: 'Sí. Queda registrado en la Carpeta Laboral del trabajador con fecha de generación y folio.' },
      { p: '¿Puedo generar contratos en masa?', r: 'Actualmente los contratos se generan uno por uno para garantizar precisión en los datos de cada trabajador.' }
    ]
  },

  asistencia: {
    titulo: '📅 Control de Asistencia',
    secciones: [
      {
        icono: '🎯',
        titulo: 'Objetivo',
        contenido: 'Registrar la asistencia diaria de los trabajadores: marcaciones de entrada y salida, ausencias, y el estado de la jornada por faena.'
      },
      {
        icono: '📋',
        titulo: 'Paso a paso — Tareo diario',
        contenido: '<ol><li>Selecciona la <strong>fecha</strong> del día a registrar</li><li>Filtra por <strong>mandante</strong> si trabajas con varias empresas</li><li>Marca la asistencia de cada trabajador: Presente / Ausente / Permiso / Licencia</li><li>Registra la <strong>hora de entrada y salida</strong> si corresponde</li><li>Guarda el registro del día</li></ol>'
      },
      {
        icono: '⏱️',
        titulo: 'Tipos de marcación',
        contenido: '<ul><li><strong>Presente (P):</strong> asistió y cumplió jornada</li><li><strong>Ausente (A):</strong> no asistió sin justificación</li><li><strong>Permiso (PE):</strong> ausencia autorizada con goce de sueldo</li><li><strong>Licencia Médica (LM):</strong> reposo médico certificado</li></ul>'
      },
      {
        icono: '💡',
        titulo: 'Consejo',
        contenido: 'Registra la asistencia al inicio de la jornada con los trabajadores presentes, y completa las ausencias al cierre del día. Esto garantiza datos limpios para el módulo de Remuneraciones.'
      },
      {
        icono: '🔗',
        titulo: 'Flujo relacionado',
        contenido: 'Asistencia (registro diario) → Exportar (reporte de asistencia) → Remuneraciones (días trabajados)'
      }
    ],
    faq: [
      { p: '¿Puedo editar asistencias de días anteriores?', r: 'Sí. Cambia la fecha en el selector y edita el registro correspondiente.' },
      { p: '¿La asistencia se sincroniza con Supabase?', r: 'En modo local los datos se guardan en el navegador. Con Supabase configurado, se sincroniza en la nube y puedes acceder desde cualquier dispositivo.' },
      { p: '¿Puedo usar la app móvil AppAsistencia.html para registrar?', r: 'Sí. La app móvil complementa este módulo y permite marcaciones desde terreno.' }
    ]
  },

  exportar: {
    titulo: '📥 Exportar datos',
    secciones: [
      {
        icono: '🎯',
        titulo: 'Objetivo',
        contenido: 'Descargar la información del sistema en formatos útiles para reportes, respaldos, contabilidad o auditorías laborales.'
      },
      {
        icono: '📊',
        titulo: 'Formatos disponibles',
        contenido: '<ul><li><strong>Excel (.xlsx):</strong> lista completa de trabajadores con todos sus datos</li><li><strong>CSV:</strong> compatible con cualquier sistema externo</li><li><strong>PDF:</strong> reportes formateados para imprimir o archivar</li></ul>'
      },
      {
        icono: '📋',
        titulo: 'Paso a paso',
        contenido: '<ol><li>Selecciona el tipo de reporte que necesitas</li><li>Aplica filtros si corresponde (mandante, período, estado)</li><li>Elige el formato de salida</li><li>Clic en <strong>Descargar</strong></li></ol>'
      },
      {
        icono: '💡',
        titulo: 'Consejo',
        contenido: 'Exporta el padrón de trabajadores al inicio de cada temporada para tener un respaldo independiente del sistema. El archivo Excel puede cargarse nuevamente si necesitas migrar datos.'
      },
      {
        icono: '🔗',
        titulo: 'Flujo relacionado',
        contenido: 'Exportar → Excel → Power BI (Control Diario Hortifrut) o archivo de respaldo'
      }
    ],
    faq: [
      { p: '¿Los datos exportados incluyen información migratoria?', r: 'Sí. El Excel completo incluye columnas de tipo de documento y fecha de vencimiento para trabajadores extranjeros.' },
      { p: '¿Puedo exportar solo un mandante?', r: 'Sí. Usa el filtro de mandante antes de exportar.' }
    ]
  },

  config: {
    titulo: '⚙️ Configuración',
    secciones: [
      {
        icono: '🎯',
        titulo: 'Objetivo',
        contenido: 'Configurar los parámetros del sistema: conexión a Supabase, datos de la empresa por defecto, usuarios del sistema y permisos por rol.'
      },
      {
        icono: '🔌',
        titulo: 'Conexión Supabase',
        contenido: '<ol><li>Ingresa la <strong>URL del proyecto</strong> de tu cuenta Supabase</li><li>Ingresa la <strong>API Key (anon)</strong></li><li>Clic en <strong>Verificar conexión</strong></li><li>Si es exitoso, los datos comenzarán a sincronizarse en la nube</li></ol>'
      },
      {
        icono: '👥',
        titulo: 'Usuarios y roles',
        contenido: '<ul><li><strong>Superadmin:</strong> acceso total al sistema</li><li><strong>Operador:</strong> puede registrar asistencia y consultar trabajadores, pero no modifica la configuración ni elimina registros</li></ul>'
      },
      {
        icono: '🏢',
        titulo: 'Empresa por defecto',
        contenido: 'Configura los datos de tu empresa principal para que aparezcan automáticamente en los documentos. Si tienes varias empresas propias, puedes configurarlas desde el módulo Empresas.'
      },
      {
        icono: '⚠️',
        titulo: 'Errores frecuentes',
        contenido: '<ul><li><strong>Error de conexión Supabase:</strong> verifica que la URL tenga el formato https://xxxxxxxx.supabase.co y que la API Key sea la "anon public"</li><li><strong>Edge bloquea localStorage:</strong> usa Chrome en lugar de Microsoft Edge para evitar problemas con el almacenamiento local</li></ul>'
      },
      {
        icono: '🔗',
        titulo: 'Flujo relacionado',
        contenido: 'Configuración → Todo el sistema (los cambios aquí afectan el comportamiento global)'
      }
    ],
    faq: [
      { p: '¿Qué pasa si no configuro Supabase?', r: 'El sistema funciona completamente en modo local (localStorage del navegador). Los datos se guardan solo en ese dispositivo y no se sincronizan.' },
      { p: '¿Puedo tener varios operadores?', r: 'Sí. Puedes crear múltiples usuarios operadores con contraseñas independientes.' },
      { p: '¿Dónde encuentro las credenciales de Supabase?', r: 'En tu proyecto de Supabase → Settings → API. Copia la "Project URL" y la "anon public key".' }
    ]
  }
};


/* ── 2. CREAR PANEL EN EL DOM ──────────────────────────── */
function initAyuda() {
  // Inyectar estilos
  const style = document.createElement('style');
  style.textContent = `
    /* ── Botón ayuda en topbar ── */
    #btn-ayuda-flotante {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: var(--azul, #2563EB);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s, transform .1s;
      white-space: nowrap;
    }
    #btn-ayuda-flotante:hover { background: #1d4ed8; transform: translateY(-1px); }
    #btn-ayuda-flotante:active { transform: translateY(0); }

    /* ── Panel flotante ── */
    #panel-ayuda {
      position: fixed;
      top: 80px;
      right: 24px;
      width: 380px;
      max-height: 80vh;
      background: var(--fondo, #fff);
      border: 1px solid var(--borde, #e5e7eb);
      border-radius: 14px;
      box-shadow: 0 8px 40px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08);
      z-index: 1200;
      display: none;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
    }
    #panel-ayuda.visible { display: flex; }

    /* Header del panel */
    #ayuda-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 12px;
      background: linear-gradient(135deg, #1e3a2f, #1e5631);
      color: #fff;
      border-radius: 14px 14px 0 0;
      cursor: grab;
      flex-shrink: 0;
    }
    #ayuda-header:active { cursor: grabbing; }
    #ayuda-titulo {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -.2px;
    }
    #ayuda-header-btns {
      display: flex;
      gap: 4px;
    }
    .ayuda-hbtn {
      background: rgba(255,255,255,.15);
      border: none;
      color: #fff;
      width: 28px;
      height: 28px;
      border-radius: 7px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .15s;
    }
    .ayuda-hbtn:hover { background: rgba(255,255,255,.28); }

    /* Estado minimizado */
    #panel-ayuda.minimizado { max-height: 52px; }
    #panel-ayuda.minimizado #ayuda-body { display: none; }
    #panel-ayuda.minimizado { border-radius: 14px; }

    /* Body scrollable */
    #ayuda-body {
      overflow-y: auto;
      flex: 1;
      padding: 0 0 12px;
      scrollbar-width: thin;
      scrollbar-color: #d1d5db transparent;
    }

    /* Secciones */
    .ayuda-seccion {
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--borde, #f0f0f0);
    }
    .ayuda-seccion:last-child { border-bottom: none; }
    .ayuda-sec-titulo {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: var(--verde-dark, #166534);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .ayuda-sec-cuerpo {
      font-size: 13px;
      color: var(--texto, #1f2937);
      line-height: 1.55;
    }
    .ayuda-sec-cuerpo ul, .ayuda-sec-cuerpo ol {
      margin: 4px 0 0 16px;
      padding: 0;
    }
    .ayuda-sec-cuerpo li { margin-bottom: 3px; }

    /* FAQ */
    #ayuda-faq { padding: 14px 16px 4px; }
    .ayuda-faq-titulo {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: var(--azul, #2563EB);
      margin-bottom: 8px;
    }
    .ayuda-faq-item {
      margin-bottom: 10px;
    }
    .ayuda-faq-p {
      font-size: 12px;
      font-weight: 600;
      color: var(--texto, #1f2937);
      margin-bottom: 2px;
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .ayuda-faq-p::before { content: 'Q'; font-size:10px; font-weight:800; color: var(--azul,#2563EB); flex-shrink:0; margin-top:1px; }
    .ayuda-faq-r {
      font-size: 12px;
      color: var(--texto2, #6b7280);
      line-height: 1.5;
      padding-left: 16px;
    }

    /* Consejo del día (highlight verde) */
    .ayuda-highlight {
      margin: 0 16px 12px;
      padding: 10px 12px;
      background: #f0fdf4;
      border-left: 3px solid #16a34a;
      border-radius: 0 6px 6px 0;
      font-size: 12px;
      color: #15803d;
      line-height: 1.5;
    }

    /* Empty state */
    .ayuda-empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--texto3, #9ca3af);
      font-size: 13px;
    }
  `;
  document.head.appendChild(style);

  // Crear panel
  const panel = document.createElement('div');
  panel.id = 'panel-ayuda';
  panel.innerHTML = `
    <div id="ayuda-header">
      <div id="ayuda-titulo">📖 Ayuda</div>
      <div id="ayuda-header-btns">
        <button class="ayuda-hbtn" id="ayuda-btn-min" title="Minimizar" onclick="toggleMinAyuda()">─</button>
        <button class="ayuda-hbtn" id="ayuda-btn-cerrar" title="Cerrar" onclick="cerrarAyuda()">✕</button>
      </div>
    </div>
    <div id="ayuda-body">
      <div class="ayuda-empty">Navega a un módulo para ver la ayuda</div>
    </div>
  `;
  document.body.appendChild(panel);

  // Crear botón en topbar
  const topActions = document.getElementById('top-actions');
  if (topActions) {
    // Botón Ayuda
    const btnAyuda = document.createElement('button');
    btnAyuda.id = 'btn-ayuda-flotante';
    btnAyuda.innerHTML = '📖 Ayuda';
    btnAyuda.onclick = toggleAyuda;
    // Insertar antes del indicador de conexión
    topActions.insertBefore(btnAyuda, topActions.firstChild);
  }

  // Hacer el panel movible (drag)
  _initDragAyuda();
}


/* ── 3. MOSTRAR CONTENIDO SEGÚN MÓDULO ─────────────────── */
let _moduloAyudaActual = null;

function actualizarAyuda(moduloId) {
  // Normalizar ID (quitar 'p-')
  const id = moduloId.replace(/^p-/, '');
  _moduloAyudaActual = id;

  const datos = AYUDA_CONTENIDO[id];
  const body  = document.getElementById('ayuda-body');
  const titulo = document.getElementById('ayuda-titulo');
  if (!body) return;

  if (!datos) {
    body.innerHTML = `<div class="ayuda-empty">No hay ayuda disponible<br>para este módulo aún.</div>`;
    if (titulo) titulo.textContent = '📖 Ayuda';
    return;
  }

  if (titulo) titulo.textContent = datos.titulo;

  // Construir secciones
  let html = '';
  datos.secciones.forEach(sec => {
    html += `
      <div class="ayuda-seccion">
        <div class="ayuda-sec-titulo">${sec.icono} ${sec.titulo}</div>
        <div class="ayuda-sec-cuerpo">${sec.contenido}</div>
      </div>`;
  });

  // FAQ
  if (datos.faq && datos.faq.length) {
    html += `<div id="ayuda-faq"><div class="ayuda-faq-titulo">❓ Preguntas frecuentes</div>`;
    datos.faq.forEach(item => {
      html += `
        <div class="ayuda-faq-item">
          <div class="ayuda-faq-p">${item.p}</div>
          <div class="ayuda-faq-r">${item.r}</div>
        </div>`;
    });
    html += `</div>`;
  }

  body.innerHTML = html;
  body.scrollTop = 0;
}


/* ── 4. TOGGLE / CERRAR / MINIMIZAR ────────────────────── */
function toggleAyuda() {
  const panel = document.getElementById('panel-ayuda');
  if (!panel) return;
  const abierto = panel.classList.contains('visible');
  if (abierto) {
    cerrarAyuda();
  } else {
    panel.classList.add('visible');
    panel.classList.remove('minimizado');
    // Cargar contenido del módulo activo si hay uno
    if (_moduloAyudaActual) {
      actualizarAyuda(_moduloAyudaActual);
    }
  }
}

function cerrarAyuda() {
  const panel = document.getElementById('panel-ayuda');
  if (panel) panel.classList.remove('visible', 'minimizado');
}

function toggleMinAyuda() {
  const panel = document.getElementById('panel-ayuda');
  const btn   = document.getElementById('ayuda-btn-min');
  if (!panel) return;
  const min = panel.classList.toggle('minimizado');
  if (btn) btn.textContent = min ? '□' : '─';
}


/* ── 5. DRAG (mover el panel) ──────────────────────────── */
function _initDragAyuda() {
  const panel  = document.getElementById('panel-ayuda');
  const header = document.getElementById('ayuda-header');
  if (!panel || !header) return;

  let dragging = false, startX, startY, origLeft, origTop;

  header.addEventListener('mousedown', e => {
    // Ignorar clicks en botones
    if (e.target.closest('.ayuda-hbtn')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    origLeft = rect.left;
    origTop  = rect.top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newLeft = origLeft + dx;
    let newTop  = origTop  + dy;
    // Mantener dentro del viewport
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth  - panel.offsetWidth));
    newTop  = Math.max(0, Math.min(newTop,  window.innerHeight - 60));
    panel.style.left  = newLeft + 'px';
    panel.style.right = 'auto';
    panel.style.top   = newTop  + 'px';
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    document.body.style.userSelect = '';
  });
}


/* ── 6. HOOK EN irA() ──────────────────────────────────── */
// Se llama desde irA() en core.js pasando el id del módulo
function onCambioModuloAyuda(idPagina) {
  _moduloAyudaActual = idPagina.replace(/^p-/, '');
  // Si el panel está abierto, actualizar contenido en tiempo real
  const panel = document.getElementById('panel-ayuda');
  if (panel && panel.classList.contains('visible')) {
    actualizarAyuda(_moduloAyudaActual);
  }
}
