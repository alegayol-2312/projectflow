import { useEffect, useMemo, useRef, useState } from 'react'
import './index.css'
import { supabase } from './lib/supabase'
import logoGP from './assets/logo-gp.png'
import ganttIcon from './assets/icon-gantt.png'
import cardsIcon from './assets/icon-cards.png'
import archiveIcon from './assets/icon-archive.png'
import processIcon from './assets/icon-process.png'

import processTerminatorIcon from './assets/process/process-terminador.png'
import processReferenceIcon from './assets/process/process-referencia.png'
import processDecisionIcon from './assets/process/process-decision.png'
import processDatabaseIcon from './assets/process/process-basededatos.png'
import processPreparationIcon from './assets/process/process-preparacion.png'
import processActivityIcon from './assets/process/process-proceso.png'
import processPredefinedIcon from './assets/process/process-predefinido.png'
import processDocumentIcon from './assets/process/process-documento.png'
import processNoteIcon from './assets/process/process-nota.png'
import processDataIcon from './assets/process/process-datos.png'
import processManualInputIcon from './assets/process/process-entradamanual.png'
import processManualOperationIcon from './assets/process/process-operacionmanual.png'
import processVerticalConnectorIcon from './assets/process/process-conectorvertical.png'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'


const formularioVacio = {
  nombre: '',
  tipo: 'Tarea',
  responsableAnalista: '',
  responsableDesarrollador: '',
  comentario: '',
  inicio: '',
  duracion: 1,
  horasEstimadas: 6.5,
  estado: 'Pendiente',
  prioridad: 'Media',
  dependencia: '',
  hitoPadre: '',
}


const PROCESO_COMPONENTES = [
  {
    tipo: 'InicioFin',
    label: 'Proceso',
    tituloDefault: 'Inicio / Fin',
    color: '#cfe3cd',
    icon: processTerminatorIcon,
  },
  {
    tipo: 'Actividad',
    label: 'Texto',
    tituloDefault: 'Actividad',
    color: '#cfe3cd',
    icon: processActivityIcon,
  },
  {
    tipo: 'Documento',
    label: 'Documento',
    tituloDefault: 'Documento',
    color: '#cfe3cd',
    icon: processDocumentIcon,
  },
  {
    tipo: 'Decision',
    label: 'Decisión',
    tituloDefault: 'Decisión',
    color: '#cfe3cd',
    icon: processDecisionIcon,
  },
  {
    tipo: 'BaseDeDatos',
    label: 'Base de datos',
    tituloDefault: 'Base de datos',
    color: '#cfe3cd',
    icon: processDatabaseIcon,
  },
  {
    tipo: 'ProcesoPredefinido',
    label: 'Proceso predefinido',
    tituloDefault: 'Proceso predefinido',
    color: '#cfe3cd',
    icon: processPredefinedIcon,
  },
  {
    tipo: 'Referencia',
    label: 'Inicio-Fin',
    tituloDefault: 'Referencia',
    color: '#cfe3cd',
    icon: processReferenceIcon,
  },
  {
    tipo: 'Preparacion',
    label: 'Preparación',
    tituloDefault: 'Preparación',
    color: '#cfe3cd',
    icon: processPreparationIcon,
  },
  {
    tipo: 'NotaProceso',
    label: 'Nota',
    tituloDefault: 'Nota',
    color: '#fff4b8',
    icon: processNoteIcon,
  },
  {
    tipo: 'Datos',
    label: 'Datos',
    tituloDefault: 'Datos',
    color: '#cfe3cd',
    icon: processDataIcon,
  },
  {
    tipo: 'EntradaManual',
    label: 'Entrada manual',
    tituloDefault: 'Entrada manual',
    color: '#cfe3cd',
    icon: processManualInputIcon,
  },
  {
    tipo: 'OperacionManual',
    label: 'Operación manual',
    tituloDefault: 'Operación manual',
    color: '#cfe3cd',
    icon: processManualOperationIcon,
  },
  {
    tipo: 'ConectorVertical',
    label: 'Conector',
    tituloDefault: 'Conector',
    color: '#cfe3cd',
    icon: processVerticalConnectorIcon,
  },
]

function plantillaProceso(tipo) {
  return (
    PROCESO_COMPONENTES.find((item) => item.tipo === tipo) ||
    PROCESO_COMPONENTES.find((item) => item.tipo === 'Actividad')
  )
}

function etiquetaTipoProceso(tipo) {
  return plantillaProceso(tipo)?.label || 'Proceso'
}


function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [proyecto, setProyecto] = useState(null)
  const [proyectos, setProyectos] = useState([])
const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState('')

const [modalProyectoOpen, setModalProyectoOpen] = useState(false)

const [nuevoProyecto, setNuevoProyecto] = useState({
  nombre: '',
  descripcion: '',
})
  const [tareas, setTareas] = useState([])
  const [todasLasTareas, setTodasLasTareas] = useState([])
  const [historial, setHistorial] = useState([])
  const [perfiles, setPerfiles] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [tareaEditando, setTareaEditando] = useState(null)

  const [form, setForm] = useState(formularioVacio)

  const [filtroResponsable, setFiltroResponsable] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [vista, setVista] = useState('gantt')
  const [filtroPrioridad, setFiltroPrioridad] = useState('Todas')

  // AÑO QUE ESTAMOS MIRANDO EN EL GANTT
  const hoyReal = new Date()

  const [anioVisualizado, setAnioVisualizado] = useState(
    hoyReal.getFullYear()
  )

  const ganttScrollRef = useRef(null)

  const finMesActual = new Date(
    hoyReal.getFullYear(),
    hoyReal.getMonth() + 1,
    0
  )

  const fechaClaveInicial = [
    finMesActual.getFullYear(),
    String(finMesActual.getMonth() + 1).padStart(2, '0'),
    String(finMesActual.getDate()).padStart(2, '0'),
  ].join('-')

  const [fechaClave, setFechaClave] = useState(
    fechaClaveInicial
  )

  const mesHeatmapInicial = [
    hoyReal.getFullYear(),
    String(hoyReal.getMonth() + 1).padStart(2, '0'),
  ].join('-')

  const [mesHeatmap, setMesHeatmap] = useState(
    mesHeatmapInicial
  )

  const [offsetSemana, setOffsetSemana] = useState(0)

  const [asignandoBacklogId, setAsignandoBacklogId] =
    useState(null)

  // =========================
  // VISTA PRINCIPAL + CARDS
  // =========================

  const [vistaPrincipal, setVistaPrincipal] = useState('gantt')

  const [boards, setBoards] = useState([])
  const [boardSeleccionadoId, setBoardSeleccionadoId] = useState('')
  const [cards, setCards] = useState([])
  const [cardsArchivadas, setCardsArchivadas] = useState([])
  const [archivoOpen, setArchivoOpen] = useState(false)

  const [cardLinks, setCardLinks] = useState([])
  const [boardZones, setBoardZones] = useState([])

  const [zoneDrawerOpen, setZoneDrawerOpen] = useState(false)
  const [zoneEditando, setZoneEditando] = useState(null)
  const [zoneDragInfo, setZoneDragInfo] = useState(null)
  const [zoneResizeInfo, setZoneResizeInfo] = useState(null)

  const zoneVacia = {
    titulo: '',
    color: '#5b8def',
    pos_x: 120,
    pos_y: 120,
    ancho: 520,
    alto: 300,
  }

  const [formZone, setFormZone] = useState(zoneVacia)

  const [processMaps, setProcessMaps] = useState([])
  const [processSeleccionadoId, setProcessSeleccionadoId] = useState(null)
  const [processNodes, setProcessNodes] = useState([])
  const [processLinks, setProcessLinks] = useState([])
  const [processMapDrawerOpen, setProcessMapDrawerOpen] = useState(false)
  const [processNodeDrawerOpen, setProcessNodeDrawerOpen] = useState(false)
  const [processNodeEditando, setProcessNodeEditando] = useState(null)
  const [processDragInfo, setProcessDragInfo] = useState(null)
  const [processResizeInfo, setProcessResizeInfo] = useState(null)
  const [processConnectSource, setProcessConnectSource] = useState(null)
  const [processLinkDraft, setProcessLinkDraft] = useState(null)
  const [processLinkDrawerOpen, setProcessLinkDrawerOpen] = useState(false)
  const [processLinkEditando, setProcessLinkEditando] = useState(null)
  const [processLinkLabel, setProcessLinkLabel] = useState('')
  const [processLinkStyle, setProcessLinkStyle] = useState('continua')
  const [processLinkColor, setProcessLinkColor] = useState('#b9c5cf')
  const [processArchiveOpen, setProcessArchiveOpen] = useState(false)
  const [processMapsArchivados, setProcessMapsArchivados] = useState([])
  const [nuevoProcessMap, setNuevoProcessMap] = useState({
    nombre: '',
    descripcion: '',
  })
  const [formProcessNode, setFormProcessNode] = useState({
    tipo: 'Actividad',
    titulo: '',
    color: plantillaProceso('Actividad').color,
    rotacion: 0,
  })

  const processListRef = useRef(null)
  const processCanvasPrintRef = useRef(null)


  const [boardEditando, setBoardEditando] = useState(null)
  const [linkDraft, setLinkDraft] = useState(null)

  const [conexionPendiente, setConexionPendiente] = useState(null)
  const [tipoConexion, setTipoConexion] = useState('Relacionada')

  const [resizeInfo, setResizeInfo] = useState(null)

  const [boardZoom, setBoardZoom] = useState(0.8)
  const [panInfo, setPanInfo] = useState(null)

  const [comentariosCard, setComentariosCard] = useState([])
  const [nuevoComentario, setNuevoComentario] = useState('')

  const [modalBoardOpen, setModalBoardOpen] = useState(false)
  const [modalCardOpen, setModalCardOpen] = useState(false)

  const [nuevoBoard, setNuevoBoard] = useState({
    nombre: '',
    descripcion: '',
  })

  const [cardEditando, setCardEditando] = useState(null)
  const [cardGanttOpen, setCardGanttOpen] = useState(false)
  const [cardGanttProjectId, setCardGanttProjectId] = useState('')

  const cardVacia = {
    titulo: '',
    descripcion: '',
    tipo: 'Card',
    estado: 'Pendiente',
    responsable: '',
    fecha_inicio: '',
    fecha_fin: '',
    color: 'yellow',
    pos_x: 80,
    pos_y: 80,
    ancho: 250,
    alto: 190,
    z_index: 10,
    checklist: [],
  }

  const [formCard, setFormCard] = useState(cardVacia)

  const [dragInfo, setDragInfo] = useState(null)
  const boardCanvasRef = useRef(null)

  useEffect(() => {
    iniciarApp()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
  if (session) {
    cargarProyectos()
    cargarPerfiles()
    cargarHistorial()
    cargarTodasLasTareas()
  }
}, [session])

useEffect(() => {
  if (!proyectoSeleccionadoId) {
    return
  }

  setFiltroResponsable('Todos')
  setFiltroEstado('Todos')
  setFiltroPrioridad('Todas')

  if (proyectoSeleccionadoId === '__all__') {
    setProyecto(null)
    setTareas([])
    cargarTodasLasTareas()
    return
  }

  const proyectoActivo = proyectos.find(
    (item) => item.id === proyectoSeleccionadoId
  )

  if (!proyectoActivo) {
    return
  }

  setProyecto(proyectoActivo)
  cargarTareas(proyectoSeleccionadoId)

}, [proyectoSeleccionadoId, proyectos])

  async function iniciarApp() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    setSession(session)
    setLoading(false)
  }

  async function login(event) {
    event.preventDefault()
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginError('Usuario o contraseña incorrectos.')
    }
  }

  async function logout() {
    await supabase.auth.signOut()

    setProyecto(null)
    setTareas([])
    setHistorial([])
    setPerfiles([])
  }

  async function cargarProyectos() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error cargando proyectos:', error)
    return
  }

  const lista = data || []

  setProyectos(lista)

  if (lista.length === 0) {
    setProyecto(null)
    setProyectoSeleccionadoId('')
    setTareas([])
    return
  }

  // Si ya había uno seleccionado, lo mantenemos
  const seleccionadoExiste = lista.find(
    (item) => item.id === proyectoSeleccionadoId
  )

  if (seleccionadoExiste) {
    setProyecto(seleccionadoExiste)
    return
  }

  // Si no, elegimos el primero
  setProyecto(lista[0])
  setProyectoSeleccionadoId(lista[0].id)
}

  async function cargarPerfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error cargando perfiles:', error)
      return
    }

    setPerfiles(data || [])
  }

  async function cargarTodasLasTareas() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('fecha_inicio', { ascending: true })

    if (error) {
      console.error('Error cargando todas las tareas:', error)
      return
    }

    setTodasLasTareas(data || [])
  }

  async function cargarTareas(projectId) {
    const { data: tareasData, error: tareasError } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('fecha_inicio', { ascending: true })

    if (tareasError) {
      console.error('Error cargando tareas:', tareasError)
      return
    }

    const { data: dependenciasData } = await supabase
      .from('task_dependencies')
      .select('*')

    const tareasConDependencias = (tareasData || []).map((tarea) => {
      const dependencia = dependenciasData?.find(
        (dep) => dep.task_id === tarea.id
      )

      return {
        ...tarea,
        dependencia_id: dependencia?.depends_on_task_id || '',
      }
    })

    setTareas(tareasConDependencias)
  }

  async function cargarHistorial() {
    const { data: historyData, error: historyError } = await supabase
      .from('task_history')
      .select('*')
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('Error historial:', historyError)
      return
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('id, nombre, project_id')

    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, nombre')

    const historialCompleto = (historyData || []).map((item) => {
      const perfil = profilesData?.find(
        (profile) => profile.id === item.user_id
      )

      const tarea = tasksData?.find(
        (task) => task.id === item.task_id
      )

      const proyectoHistorial = projectsData?.find(
        (project) => project.id === tarea?.project_id
      )

      return {
        ...item,
        usuario_nombre:
          perfil?.nombre ||
          perfil?.email ||
          'Usuario',
        tarea_nombre:
          tarea?.nombre ||
          'Tarea eliminada',
        proyecto_nombre:
          proyectoHistorial?.nombre ||
          'Sin proyecto',
      }
    })

    setHistorial(historialCompleto)
  }

  function parseDate(fecha) {
    if (!fecha) return null

    const [year, month, day] = fecha.split('-').map(Number)

    return new Date(year, month - 1, day)
  }


  function parseDateTime(fecha) {
    if (!fecha) return null

    const parsed = new Date(fecha)

    if (Number.isNaN(parsed.getTime())) {
      return null
    }

    parsed.setHours(0, 0, 0, 0)
    return parsed
  }

  function diferenciaDiasHabiles(fechaDesde, fechaHasta) {
    if (!fechaDesde || !fechaHasta) {
      return null
    }

    const desde = fechaSinHora(fechaDesde)
    const hasta = fechaSinHora(fechaHasta)

    if (mismaFecha(desde, hasta)) {
      return 0
    }

    const sentido = hasta > desde ? 1 : -1
    let total = 0
    const cursor = new Date(desde)

    while (!mismaFecha(cursor, hasta)) {
      cursor.setDate(
        cursor.getDate() + sentido
      )

      if (
        cursor.getDay() !== 0 &&
        cursor.getDay() !== 6
      ) {
        total += sentido
      }
    }

    return total
  }

  function fechaFinRealTarea(tarea) {
    if (
      tarea.es_hito ||
      !['Finalizado', 'Desestimado'].includes(
        tarea.estado
      ) ||
      !tarea.fecha_finalizacion
    ) {
      return null
    }

    return parseDateTime(
      tarea.fecha_finalizacion
    )
  }

  function desvioTarea(tarea) {
    const finReal =
      fechaFinRealTarea(tarea)

    if (!finReal || tarea.es_hito) {
      return null
    }

    const finEstimado =
      calcularFechaFinDate(
        tarea.fecha_inicio,
        tarea.duracion_dias
      )

    if (!finEstimado) {
      return null
    }

    return diferenciaDiasHabiles(
      finEstimado,
      finReal
    )
  }

  function calcularFechaFinDate(inicio, duracion) {
    const fecha = parseDate(inicio)

    if (!fecha) return null

    const diasObjetivo =
      Math.max(1, Number(duracion) || 1)

    const fin = new Date(fecha)
    fin.setHours(0, 0, 0, 0)

    // La duración se interpreta como DÍAS HÁBILES.
    // Si el inicio cae en fin de semana, comienza a contar
    // desde el siguiente día hábil.
    while (
      fin.getDay() === 0 ||
      fin.getDay() === 6
    ) {
      fin.setDate(fin.getDate() + 1)
    }

    let diasContados = 1

    while (diasContados < diasObjetivo) {
      fin.setDate(fin.getDate() + 1)

      if (
        fin.getDay() !== 0 &&
        fin.getDay() !== 6
      ) {
        diasContados += 1
      }
    }

    return fin
  }

  function calcularFin(inicio, duracion) {
    const fecha = calcularFechaFinDate(inicio, duracion)

    if (!fecha) return ''

    return fecha.toLocaleDateString('es-AR')
  }

  function calcularAvance(tarea) {
    if (
      tarea.estado === 'Finalizado' ||
      tarea.estado === 'Desestimado'
    ) {
      return 100
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const inicio = parseDate(tarea.fecha_inicio)

    if (!inicio) return 0

    const fin = calcularFechaFinDate(
      tarea.fecha_inicio,
      tarea.duracion_dias
    )

    if (hoy < inicio) return 0
    if (hoy > fin) return 100

    if (Number(tarea.duracion_dias) <= 1) {
      return 100
    }

    let diasHabilesPasados = 0
    const cursor = new Date(inicio)

    while (cursor <= hoy) {
      if (
        cursor.getDay() !== 0 &&
        cursor.getDay() !== 6
      ) {
        diasHabilesPasados += 1
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    return Math.min(
      100,
      Math.round(
        (diasHabilesPasados /
          Number(tarea.duracion_dias)) *
          100
      )
    )
  }

  function estaAtrasada(tarea) {
    if (
      tarea.estado === 'Finalizado' ||
      tarea.estado === 'Desestimado'
    ) {
      return false
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const fin = calcularFechaFinDate(
      tarea.fecha_inicio,
      tarea.duracion_dias
    )

    return fin ? hoy > fin : false
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((actual) => ({
      ...actual,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))
  }

  function abrirNuevaTarea() {
    setTareaEditando(null)
    setForm(formularioVacio)
    setModalOpen(true)
  }

  function abrirEditar(tarea) {
    setTareaEditando(tarea)

    setForm({
      nombre: tarea.nombre,
      tipo: tarea.es_hito ? 'Hito' : 'Tarea',
      responsableAnalista:
        tarea.responsable_analista ||
        tarea.responsable ||
        '',
      responsableDesarrollador:
        tarea.responsable_desarrollador ||
        '',
      comentario: tarea.comentario || '',
      inicio: tarea.fecha_inicio,
      duracion: tarea.duracion_dias,
      horasEstimadas:
        tarea.horas_estimadas ??
        Number(tarea.duracion_dias || 1) * 6.5,
      estado: tarea.estado,
      prioridad: tarea.prioridad,
      dependencia: tarea.dependencia_id || '',
      hitoPadre: tarea.hito_padre_id || '',
    })

    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    setTareaEditando(null)
    setForm(formularioVacio)
  }

  async function guardarTarea(event) {
    event.preventDefault()

    if (!form.nombre || !form.inicio) {
      alert('Completá nombre y fecha de inicio.')
      return
    }

    if (
      form.tipo === 'Tarea' &&
      !form.responsableAnalista
    ) {
      alert(
        'Para una tarea completá al menos el responsable analista.'
      )
      return
    }

    if (tareaEditando) {
      const { error } = await supabase
        .from('tasks')
        .update({
          nombre: form.nombre,
          responsable:
            form.tipo === 'Tarea'
              ? form.responsableAnalista
              : '',
          responsable_analista:
            form.tipo === 'Tarea'
              ? form.responsableAnalista
              : null,
          responsable_desarrollador:
            form.tipo === 'Tarea'
              ? form.responsableDesarrollador
              : null,
          comentario: form.comentario.trim(),
          fecha_inicio: form.inicio,
          horas_estimadas:
            form.tipo === 'Tarea'
              ? Number(form.horasEstimadas || 0)
              : 0,
          duracion_dias:
            form.tipo === 'Hito'
              ? 1
              : Number(form.duracion),
          estado:
            form.tipo === 'Hito'
              ? 'Pendiente'
              : form.estado,
          prioridad: form.prioridad,
          es_hito: form.tipo === 'Hito',
          hito_padre_id:
            form.tipo === 'Tarea' && form.hitoPadre
              ? form.hitoPadre
              : null,

          fecha_finalizacion:
            form.tipo === 'Tarea' &&
            ['Finalizado', 'Desestimado'].includes(
              form.estado
            )
              ? tareaEditando.fecha_finalizacion ||
                new Date().toISOString()
              : null,

          updated_at: new Date().toISOString(),
        })
        .eq('id', tareaEditando.id)

      if (error) {
        alert(`No se pudo editar: ${error.message}`)
        return
      }

      await supabase
        .from('task_dependencies')
        .delete()
        .eq('task_id', tareaEditando.id)

      if (form.dependencia) {
        await supabase
          .from('task_dependencies')
          .insert({
            task_id: tareaEditando.id,
            depends_on_task_id: form.dependencia,
          })
      }

      await supabase
        .from('task_history')
        .insert({
          task_id: tareaEditando.id,
          user_id: session.user.id,
          accion: 'Tarea modificada',
          detalle: `Se modificó la tarea "${form.nombre}"`,
        })
    } else {
      const { data: nuevaTarea, error } = await supabase
        .from('tasks')
        .insert({
          project_id: proyecto.id,
          nombre: form.nombre,
          responsable:
            form.tipo === 'Tarea'
              ? form.responsableAnalista
              : '',
          responsable_analista:
            form.tipo === 'Tarea'
              ? form.responsableAnalista
              : null,
          responsable_desarrollador:
            form.tipo === 'Tarea'
              ? form.responsableDesarrollador
              : null,
          comentario: form.comentario.trim(),
          fecha_inicio: form.inicio,
          horas_estimadas:
            form.tipo === 'Tarea'
              ? Number(form.horasEstimadas || 0)
              : 0,
          duracion_dias:
            form.tipo === 'Hito'
              ? 1
              : Number(form.duracion),
          estado:
            form.tipo === 'Hito'
              ? 'Pendiente'
              : form.estado,
          prioridad: form.prioridad,
          es_hito: form.tipo === 'Hito',
          hito_padre_id:
            form.tipo === 'Tarea' && form.hitoPadre
              ? form.hitoPadre
              : null,
          created_by: session.user.id,

          fecha_finalizacion:
            form.tipo === 'Tarea' &&
            form.estado === 'Finalizado'
              ? new Date().toISOString()
              : null,
        })
        .select()
        .single()

      if (error) {
        alert(`No se pudo guardar: ${error.message}`)
        return
      }

      if (form.dependencia) {
        await supabase
          .from('task_dependencies')
          .insert({
            task_id: nuevaTarea.id,
            depends_on_task_id: form.dependencia,
          })
      }

      await supabase
        .from('task_history')
        .insert({
          task_id: nuevaTarea.id,
          user_id: session.user.id,
          accion: 'Tarea creada',
          detalle: `Se creó la tarea "${form.nombre}"`,
        })
    }

    cerrarModal()

    await Promise.all([
      cargarTareas(proyecto.id),
      cargarTodasLasTareas(),
    ])
  }
async function crearProyecto(event) {
  event.preventDefault()

  const nombre = nuevoProyecto.nombre.trim()

  if (!nombre) {
    alert('Ingresá el nombre del proyecto.')
    return
  }

  const yaExiste = proyectos.some(
    (item) =>
      item.nombre.trim().toLowerCase() ===
      nombre.toLowerCase()
  )

  if (yaExiste) {
    alert('Ya existe un proyecto con ese nombre.')
    return
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      nombre,
      descripcion: nuevoProyecto.descripcion.trim(),
      estado: 'En curso',
    })
    .select()
    .single()

  if (error) {
    console.error(error)
    alert(`No se pudo crear el proyecto: ${error.message}`)
    return
  }

  setNuevoProyecto({
    nombre: '',
    descripcion: '',
  })

  setModalProyectoOpen(false)

  await cargarProyectos()

  setProyectoSeleccionadoId(data.id)
}

  async function finalizarTarea(tarea) {
    if (tarea.es_hito) {
      const hijas = tareasDelHito(tarea.id)

      if (hijas.length === 0) {
        alert(
          'El hito no tiene tareas vinculadas. Vinculá tareas antes de finalizarlo.'
        )
        return
      }

      const pendientes =
        hijas.filter(
          (item) =>
            item.estado !== 'Finalizado'
        )

      if (pendientes.length > 0) {
        alert(
          `El hito no puede finalizarse: quedan ${pendientes.length} tarea(s) sin finalizar.`
        )
        return
      }
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        estado: 'Finalizado',
        fecha_finalizacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tarea.id)

    if (error) {
      alert('No se pudo finalizar.')
      return
    }

    await supabase
      .from('task_history')
      .insert({
        task_id: tarea.id,
        user_id: session.user.id,
        accion: 'Tarea finalizada',
        detalle: `Se finalizó "${tarea.nombre}"`,
      })

    await Promise.all([
      cargarTareas(proyecto.id),
      cargarTodasLasTareas(),
    ])
  }

  async function eliminarTarea(tarea) {
    const confirmar = window.confirm(
      `¿Eliminar "${tarea.nombre}"?`
    )

    if (!confirmar) return false

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', tarea.id)

    if (error) {
      alert('No se pudo eliminar.')
      return false
    }

    await Promise.all([
      cargarTareas(proyecto.id),
      cargarTodasLasTareas(),
    ])

    return true
  }

  function exportarCSV() {
  if (!tareasFiltradas.length) {
    alert('No hay tareas para exportar.')
    return
  }

  const encabezados = [
    'Tarea',
    'Responsable Analista',
    'Responsable Desarrollador',
    'Comentario',
    'Horas estimadas',
    'Inicio',
    'Duración',
    'Fin estimado',
    'Fin real',
    'Desvío días hábiles',
    'Estado',
    'Prioridad',
    'Hito',
  ]

  const filas = tareasFiltradas.map((tarea) => [
    tarea.nombre || '',
    tarea.responsable_analista || tarea.responsable || '',
    tarea.responsable_desarrollador || '',
    tarea.comentario || '',
    tarea.horas_estimadas || '',
    tarea.fecha_inicio || '',
    tarea.duracion_dias || '',
    calcularFin(
      tarea.fecha_inicio,
      tarea.duracion_dias
    ),
    fechaFinRealTarea(tarea)
      ?.toLocaleDateString('es-AR') ||
      '',
    desvioTarea(tarea) ?? '',
    estadoVisual(tarea),
    tarea.prioridad || '',
    tarea.es_hito ? 'Sí' : 'No',
  ])

  const contenido = [
    encabezados,
    ...filas,
  ]
    .map((fila) =>
      fila
        .map((valor) => {
          const texto = String(valor ?? '')
            .replace(/"/g, '""')

          return `"${texto}"`
        })
        .join(';')
    )
    .join('\n')

  const blob = new Blob(
    ['\ufeff' + contenido],
    {
      type: 'text/csv;charset=utf-8;',
    }
  )

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')

  const nombreProyecto =
    proyecto?.nombre
      ?.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_') ||
    'proyecto'

  const fecha = new Date()
    .toISOString()
    .slice(0, 10)

  link.href = url
  link.download =
    `${nombreProyecto}_${fecha}.csv`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}


// =========================
// CARDS / BOARDS
// =========================

async function cargarBoards() {
  const { data, error } = await supabase
    .from('card_boards')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error cargando boards:', error)
    return
  }

  const lista = data || []
  setBoards(lista)

  if (lista.length === 0) {
    setBoardSeleccionadoId('')
    setCards([])
    return
  }

  if (
    !boardSeleccionadoId ||
    !lista.some(
      (board) => board.id === boardSeleccionadoId
    )
  ) {
    setBoardSeleccionadoId(lista[0].id)
  }
}

async function cargarCards(boardId) {
  if (!boardId) {
    setCards([])
    return
  }

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('board_id', boardId)
    .eq('archivada', false)
    .order('z_index', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error cargando cards:', error)
    return
  }

  setCards(data || [])
}


async function cargarCardsArchivadas(boardId) {
  if (!boardId) {
    setCardsArchivadas([])
    return
  }

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('board_id', boardId)
    .eq('archivada', true)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error cargando cards archivadas:', error)
    return
  }

  setCardsArchivadas(data || [])
}

async function cargarBoardZones(boardId) {
  if (!boardId) {
    setBoardZones([])
    return
  }

  const { data, error } = await supabase
    .from('board_zones')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error cargando zonas:', error)
    return
  }

  setBoardZones(data || [])
}

function abrirNuevaZona() {
  if (!boardSeleccionadoId) {
    alert('Primero seleccioná un board.')
    return
  }

  setZoneEditando(null)
  setFormZone({
    ...zoneVacia,
    pos_x: 120 + Math.min(boardZones.length, 4) * 35,
    pos_y: 120 + Math.min(boardZones.length, 4) * 30,
  })
  setZoneDrawerOpen(true)
}

function abrirEditarZona(zona) {
  setZoneEditando(zona)
  setFormZone({
    titulo: zona.titulo || '',
    color: zona.color || '#5b8def',
    pos_x: Number(zona.pos_x) || 120,
    pos_y: Number(zona.pos_y) || 120,
    ancho: Number(zona.ancho) || 520,
    alto: Number(zona.alto) || 300,
  })
  setZoneDrawerOpen(true)
}

function cerrarZonaDrawer() {
  setZoneDrawerOpen(false)
  setZoneEditando(null)
  setFormZone(zoneVacia)
}

async function guardarZona(event) {
  event.preventDefault()

  if (!formZone.titulo.trim()) {
    alert('Ingresá un título para la zona.')
    return
  }

  const payload = {
    board_id: boardSeleccionadoId,
    titulo: formZone.titulo.trim(),
    color: formZone.color,
    pos_x: Number(formZone.pos_x) || 120,
    pos_y: Number(formZone.pos_y) || 120,
    ancho: Number(formZone.ancho) || 520,
    alto: Number(formZone.alto) || 300,
    updated_at: new Date().toISOString(),
  }

  if (zoneEditando) {
    const { error } = await supabase
      .from('board_zones')
      .update(payload)
      .eq('id', zoneEditando.id)

    if (error) {
      alert(`No se pudo editar la zona: ${error.message}`)
      return
    }
  } else {
    const { error } = await supabase
      .from('board_zones')
      .insert(payload)

    if (error) {
      alert(`No se pudo crear la zona: ${error.message}`)
      return
    }
  }

  cerrarZonaDrawer()
  await cargarBoardZones(boardSeleccionadoId)
}

async function eliminarZona(zona) {
  const confirmar = window.confirm(
    `¿Eliminar la zona "${zona.titulo}"?`
  )

  if (!confirmar) return

  const { error } = await supabase
    .from('board_zones')
    .delete()
    .eq('id', zona.id)

  if (error) {
    alert(`No se pudo eliminar la zona: ${error.message}`)
    return
  }

  cerrarZonaDrawer()
  await cargarBoardZones(boardSeleccionadoId)
}

function iniciarDragZona(event, zona) {
  if (event.button !== 0) return
  event.stopPropagation()

  const rect =
    event.currentTarget.getBoundingClientRect()

  setZoneDragInfo({
    id: zona.id,
    offsetX:
      (event.clientX - rect.left) / boardZoom,
    offsetY:
      (event.clientY - rect.top) / boardZoom,
  })
}

function moverZona(event) {
  if (!zoneDragInfo || !boardCanvasRef.current) {
    return
  }

  const canvasRect =
    boardCanvasRef.current.getBoundingClientRect()

  const nuevoX =
    (
      event.clientX -
      canvasRect.left +
      boardCanvasRef.current.scrollLeft
    ) / boardZoom -
    zoneDragInfo.offsetX

  const nuevoY =
    (
      event.clientY -
      canvasRect.top +
      boardCanvasRef.current.scrollTop
    ) / boardZoom -
    zoneDragInfo.offsetY

  setBoardZones((actual) =>
    actual.map((zona) =>
      zona.id === zoneDragInfo.id
        ? {
            ...zona,
            pos_x: Math.max(10, nuevoX),
            pos_y: Math.max(10, nuevoY),
          }
        : zona
    )
  )
}

async function terminarDragZona() {
  if (!zoneDragInfo) return

  const zona = boardZones.find(
    (item) => item.id === zoneDragInfo.id
  )

  setZoneDragInfo(null)

  if (!zona) return

  const { error } = await supabase
    .from('board_zones')
    .update({
      pos_x: Number(zona.pos_x),
      pos_y: Number(zona.pos_y),
      updated_at: new Date().toISOString(),
    })
    .eq('id', zona.id)

  if (error) {
    console.error('No se pudo mover la zona:', error)
  }
}

function iniciarResizeZona(event, zona) {
  event.stopPropagation()
  event.preventDefault()

  setZoneResizeInfo({
    id: zona.id,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: Number(zona.ancho) || 520,
    startHeight: Number(zona.alto) || 300,
  })
}

function moverResizeZona(event) {
  if (!zoneResizeInfo) return

  const dx =
    (event.clientX - zoneResizeInfo.startX) /
    boardZoom

  const dy =
    (event.clientY - zoneResizeInfo.startY) /
    boardZoom

  setBoardZones((actual) =>
    actual.map((zona) =>
      zona.id === zoneResizeInfo.id
        ? {
            ...zona,
            ancho: Math.max(
              260,
              zoneResizeInfo.startWidth + dx
            ),
            alto: Math.max(
              160,
              zoneResizeInfo.startHeight + dy
            ),
          }
        : zona
    )
  )
}

async function terminarResizeZona() {
  if (!zoneResizeInfo) return

  const zona = boardZones.find(
    (item) => item.id === zoneResizeInfo.id
  )

  setZoneResizeInfo(null)

  if (!zona) return

  const { error } = await supabase
    .from('board_zones')
    .update({
      ancho: Number(zona.ancho),
      alto: Number(zona.alto),
      updated_at: new Date().toISOString(),
    })
    .eq('id', zona.id)

  if (error) {
    console.error('No se pudo redimensionar la zona:', error)
  }
}

async function archivarCard(card) {
  if (!card) return

  const confirmar = window.confirm(
    `¿Archivar "${card.titulo}"?`
  )

  if (!confirmar) return

  const { error } = await supabase
    .from('cards')
    .update({
      archivada: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', card.id)

  if (error) {
    alert(`No se pudo archivar la card: ${error.message}`)
    return
  }

  cerrarModalCard()
  await cargarCards(boardSeleccionadoId)
  await cargarCardsArchivadas(boardSeleccionadoId)
}

async function restaurarCard(card) {
  const { error } = await supabase
    .from('cards')
    .update({
      archivada: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', card.id)

  if (error) {
    alert(`No se pudo restaurar la card: ${error.message}`)
    return
  }

  await cargarCards(boardSeleccionadoId)
  await cargarCardsArchivadas(boardSeleccionadoId)
}

async function eliminarCardArchivada(card) {
  const confirmar = window.confirm(
    `¿Eliminar definitivamente "${card.titulo}"?`
  )

  if (!confirmar) return

  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', card.id)

  if (error) {
    alert(`No se pudo eliminar: ${error.message}`)
    return
  }

  await cargarCardsArchivadas(boardSeleccionadoId)
}

function agregarChecklistItem() {
  setFormCard((actual) => ({
    ...actual,
    checklist: [
      ...(Array.isArray(actual.checklist)
        ? actual.checklist
        : []),
      {
        id:
          globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random()}`,
        texto: '',
        hecho: false,
      },
    ],
  }))
}

function actualizarChecklistItem(id, cambios) {
  setFormCard((actual) => ({
    ...actual,
    checklist: (
      Array.isArray(actual.checklist)
        ? actual.checklist
        : []
    ).map((item) =>
      item.id === id
        ? { ...item, ...cambios }
        : item
    ),
  }))
}

function eliminarChecklistItem(id) {
  setFormCard((actual) => ({
    ...actual,
    checklist: (
      Array.isArray(actual.checklist)
        ? actual.checklist
        : []
    ).filter((item) => item.id !== id),
  }))
}


async function cargarProcessMaps() {
  const { data, error } = await supabase
    .from('process_maps')
    .select('*')
    .eq('archivado', false)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error cargando procesos:', error)
    return
  }

  const lista = data || []
  setProcessMaps(lista)

  if (!processSeleccionadoId && lista.length > 0) {
    setProcessSeleccionadoId(lista[0].id)
  } else if (
    processSeleccionadoId &&
    !lista.some((item) => item.id === processSeleccionadoId)
  ) {
    setProcessSeleccionadoId(lista[0]?.id || null)
  }
}

async function cargarProcessMapsArchivados() {
  const { data, error } = await supabase
    .from('process_maps')
    .select('*')
    .eq('archivado', true)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error cargando procesos archivados:', error)
    return
  }

  setProcessMapsArchivados(data || [])
}

async function cargarProcessCanvas(processId) {
  if (!processId) {
    setProcessNodes([])
    setProcessLinks([])
    return
  }

  const [{ data: nodes, error: nodesError }, { data: links, error: linksError }] =
    await Promise.all([
      supabase
        .from('process_nodes')
        .select('*')
        .eq('process_id', processId)
        .order('created_at', { ascending: true }),
      supabase
        .from('process_links')
        .select('*')
        .eq('process_id', processId)
        .order('created_at', { ascending: true }),
    ])

  if (nodesError) console.error('Error cargando nodos:', nodesError)
  if (linksError) console.error('Error cargando enlaces:', linksError)

  setProcessNodes(nodes || [])
  setProcessLinks(links || [])
}

function abrirNuevoProcessMap() {
  setNuevoProcessMap({ nombre: '', descripcion: '' })
  setProcessMapDrawerOpen(true)
}

async function guardarProcessMap(event) {
  event.preventDefault()

  if (!nuevoProcessMap.nombre.trim()) {
    alert('Ingresá un nombre para el proceso.')
    return
  }

  const { data, error } = await supabase
    .from('process_maps')
    .insert({
      nombre: nuevoProcessMap.nombre.trim(),
      descripcion: nuevoProcessMap.descripcion.trim() || null,
      canvas_bg: '#0b1220',
      archivado: false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    alert(`No se pudo crear el proceso: ${error.message}`)
    return
  }

  setProcessMapDrawerOpen(false)
  await cargarProcessMaps()
  setProcessSeleccionadoId(data.id)
}

async function eliminarProcessMap(process) {
  const confirmar = window.confirm(
    `¿Eliminar el proceso "${process.nombre}" y todo su contenido?`
  )
  if (!confirmar) return

  const { error } = await supabase
    .from('process_maps')
    .delete()
    .eq('id', process.id)

  if (error) {
    alert(`No se pudo eliminar el proceso: ${error.message}`)
    return
  }

  const restantes = processMaps.filter((item) => item.id !== process.id)
  setProcessMaps(restantes)
  setProcessSeleccionadoId(restantes[0]?.id || null)
}

async function archivarProcessMap(process) {
  const confirmar = window.confirm(
    `¿Archivar el proceso "${process.nombre}"?`
  )
  if (!confirmar) return

  const { error } = await supabase
    .from('process_maps')
    .update({
      archivado: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', process.id)

  if (error) {
    alert(`No se pudo archivar el proceso: ${error.message}`)
    return
  }

  if (processSeleccionadoId === process.id) {
    setProcessSeleccionadoId(null)
    setProcessNodes([])
    setProcessLinks([])
  }

  await Promise.all([
    cargarProcessMaps(),
    cargarProcessMapsArchivados(),
  ])
}

async function restaurarProcessMap(process) {
  const { error } = await supabase
    .from('process_maps')
    .update({
      archivado: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', process.id)

  if (error) {
    alert(`No se pudo restaurar el proceso: ${error.message}`)
    return
  }

  await Promise.all([
    cargarProcessMaps(),
    cargarProcessMapsArchivados(),
  ])
  setProcessSeleccionadoId(process.id)
}

async function actualizarProcessCanvasBg(color) {
  if (!processSeleccionadoId) return

  const { error } = await supabase
    .from('process_maps')
    .update({
      canvas_bg: color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', processSeleccionadoId)

  if (error) {
    alert(`No se pudo actualizar el fondo: ${error.message}`)
    return
  }

  setProcessMaps((actual) =>
    actual.map((item) =>
      item.id === processSeleccionadoId
        ? { ...item, canvas_bg: color }
        : item
    )
  )
}

async function imprimirProcessFlow() {
  if (!processCanvasPrintRef.current || !processSeleccionadoId) {
    return
  }

  if (processNodes.length === 0) {
    alert('El proceso no tiene componentes para imprimir.')
    return
  }

  try {
    const padding = 80

    const minX = Math.max(
      0,
      Math.min(...processNodes.map((node) => Number(node.pos_x))) -
        padding
    )

    const minY = Math.max(
      0,
      Math.min(...processNodes.map((node) => Number(node.pos_y))) -
        padding
    )

    const maxX =
      Math.max(
        ...processNodes.map(
          (node) =>
            Number(node.pos_x) + Number(node.ancho)
        )
      ) + padding

    const maxY =
      Math.max(
        ...processNodes.map(
          (node) =>
            Number(node.pos_y) + Number(node.alto)
        )
      ) + padding

    const captureWidth = Math.max(400, maxX - minX)
    const captureHeight = Math.max(280, maxY - minY)

    const canvas = await html2canvas(
      processCanvasPrintRef.current,
      {
        backgroundColor: processCanvasBgActual,
        scale: 1.2,
        useCORS: true,
        x: minX,
        y: minY,
        width: captureWidth,
        height: captureHeight,
        scrollX: 0,
        scrollY: 0,
      }
    )

    const imgData = canvas.toDataURL('image/png')

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    const margin = 8
    const usableWidth = pageWidth - margin * 2
    const usableHeight = pageHeight - margin * 2

    const ratio = Math.min(
      usableWidth / canvas.width,
      usableHeight / canvas.height
    )

    const renderWidth = canvas.width * ratio
    const renderHeight = canvas.height * ratio

    const x = (pageWidth - renderWidth) / 2
    const y = (pageHeight - renderHeight) / 2

    doc.addImage(
      imgData,
      'PNG',
      x,
      y,
      renderWidth,
      renderHeight
    )

    const nombre =
      processMaps.find(
        (item) => item.id === processSeleccionadoId
      )?.nombre || 'proceso'

    doc.save(`${nombre}.pdf`)
  } catch (error) {
    console.error(error)
    alert('No se pudo generar el PDF del flujo.')
  }
}

function abrirNuevoProcessNode(tipo) {
  if (!processSeleccionadoId) {
    alert('Primero creá o seleccioná un proceso.')
    return
  }

  const base = plantillaProceso(tipo)

  setProcessNodeEditando(null)
  setFormProcessNode({
    tipo,
    titulo: '',
    color: base?.color || '#cfe3cd',
    rotacion: 0,
  })
  setProcessNodeDrawerOpen(true)
}

function abrirEditarProcessNode(node) {
  setProcessNodeEditando(node)
  setFormProcessNode({
    tipo: node.tipo || 'Actividad',
    titulo: node.titulo || '',
    color:
      node.color ||
      plantillaProceso(node.tipo || 'Actividad')?.color ||
      '#cfe3cd',
    rotacion: Number(node.rotacion) || 0,
  })
  setProcessNodeDrawerOpen(true)
}

function cerrarProcessNodeDrawer() {
  setProcessNodeDrawerOpen(false)
  setProcessNodeEditando(null)
  setFormProcessNode({
    tipo: 'Actividad',
    titulo: '',
    color: plantillaProceso('Actividad').color,
    rotacion: 0,
  })
}

function dimensionesProcessNode(tipo) {
  // Las proporciones respetan los PNG recortados.
  // Así la figura ocupa realmente el contenedor y los conectores
  // quedan pegados al borde visual.
  if (tipo === 'Decision') return { ancho: 126, alto: 126 }
  if (tipo === 'InicioFin') return { ancho: 190, alto: 96 }
  if (tipo === 'Documento') return { ancho: 180, alto: 119 }
  if (tipo === 'BaseDeDatos') return { ancho: 100, alto: 132 }
  if (tipo === 'ProcesoPredefinido') return { ancho: 190, alto: 96 }
  if (tipo === 'Referencia') return { ancho: 100, alto: 100 }
  if (tipo === 'Preparacion') return { ancho: 180, alto: 120 }
  if (tipo === 'NotaProceso') return { ancho: 140, alto: 143 }
  if (tipo === 'Datos') return { ancho: 180, alto: 90 }
  if (tipo === 'EntradaManual') return { ancho: 180, alto: 90 }
  if (tipo === 'OperacionManual') return { ancho: 180, alto: 90 }
  if (tipo === 'ConectorVertical') return { ancho: 70, alto: 143 }
  return { ancho: 120, alto: 120 }
}

function scrollProcessList(direction) {
  if (!processListRef.current) return
  processListRef.current.scrollBy({
    top: direction === 'up' ? -140 : 140,
    behavior: 'smooth',
  })
}

function iniciarArrastreProcessPalette(event, tipo) {
  event.dataTransfer.setData('application/process-node', tipo)
  event.dataTransfer.effectAllowed = 'copy'
}

async function crearNodoProcesoEnCanvas(tipo, x, y) {
  if (!processSeleccionadoId) {
    alert('Primero creá o seleccioná un proceso.')
    return
  }

  const base = plantillaProceso(tipo)
  const dims = dimensionesProcessNode(tipo)

  const { error } = await supabase
    .from('process_nodes')
    .insert({
      process_id: processSeleccionadoId,
      tipo,
      titulo: '',
      color: base?.color || '#cfe3cd',
      rotacion: 0,
      pos_x: Math.max(24, Math.round(x)),
      pos_y: Math.max(24, Math.round(y)),
      ancho: dims.ancho,
      alto: dims.alto,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    alert(`No se pudo crear el bloque: ${error.message}`)
    return
  }

  await cargarProcessCanvas(processSeleccionadoId)
}

async function soltarNodoProceso(event) {
  const tipo = event.dataTransfer.getData('application/process-node')
  if (!tipo) return
  event.preventDefault()

  const rect = event.currentTarget.getBoundingClientRect()
  const dims = dimensionesProcessNode(tipo)
  const x =
    event.clientX -
    rect.left +
    event.currentTarget.scrollLeft -
    dims.ancho / 2
  const y =
    event.clientY -
    rect.top +
    event.currentTarget.scrollTop -
    dims.alto / 2

  await crearNodoProcesoEnCanvas(tipo, x, y)
}

async function guardarProcessNode(event) {
  event.preventDefault()

  if (!formProcessNode.titulo.trim()) {
    alert('Ingresá un texto para el bloque.')
    return
  }

  const colorFinal =
    formProcessNode.color ||
    plantillaProceso(formProcessNode.tipo)?.color ||
    '#cfe3cd'

  if (processNodeEditando) {
    const { error } = await supabase
      .from('process_nodes')
      .update({
        titulo: formProcessNode.titulo.trim(),
        tipo: formProcessNode.tipo,
        color: colorFinal,
        rotacion: Number(formProcessNode.rotacion) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', processNodeEditando.id)

    if (error) {
      alert(`No se pudo editar el bloque: ${error.message}`)
      return
    }
  } else {
    const dims = dimensionesProcessNode(formProcessNode.tipo)
    const offset = Math.min(processNodes.length, 8) * 28

    const { error } = await supabase
      .from('process_nodes')
      .insert({
        process_id: processSeleccionadoId,
        tipo: formProcessNode.tipo,
        titulo: formProcessNode.titulo.trim(),
        color: colorFinal,
        rotacion: Number(formProcessNode.rotacion) || 0,
        pos_x: 150 + offset,
        pos_y: 150 + offset,
        ancho: dims.ancho,
        alto: dims.alto,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      alert(`No se pudo crear el bloque: ${error.message}`)
      return
    }
  }

  cerrarProcessNodeDrawer()
  await cargarProcessCanvas(processSeleccionadoId)
}

async function eliminarProcessNode(node) {
  const confirmar = window.confirm(`¿Eliminar "${node.titulo}"?`)
  if (!confirmar) return

  const { error } = await supabase
    .from('process_nodes')
    .delete()
    .eq('id', node.id)

  if (error) {
    alert(`No se pudo eliminar el bloque: ${error.message}`)
    return
  }

  cerrarProcessNodeDrawer()
  await cargarProcessCanvas(processSeleccionadoId)
}

function iniciarDragProcessNode(event, node) {
  if (event.button !== 0) return
  if (
    event.target.closest('.process-node-connector') ||
    event.target.closest('.process-node-resize')
  ) {
    return
  }

  event.stopPropagation()

  const rect = event.currentTarget.getBoundingClientRect()
  setProcessDragInfo({
    id: node.id,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  })
}

function moverProcessNode(event) {
  if (!processDragInfo) return

  const canvas = event.currentTarget
  const rect = canvas.getBoundingClientRect()

  const x =
    event.clientX -
    rect.left +
    canvas.scrollLeft -
    processDragInfo.offsetX

  const y =
    event.clientY -
    rect.top +
    canvas.scrollTop -
    processDragInfo.offsetY

  setProcessNodes((actual) =>
    actual.map((node) =>
      node.id === processDragInfo.id
        ? {
            ...node,
            pos_x: Math.max(20, x),
            pos_y: Math.max(20, y),
          }
        : node
    )
  )
}

async function terminarDragProcessNode() {
  if (!processDragInfo) return

  const node = processNodes.find(
    (item) => item.id === processDragInfo.id
  )

  setProcessDragInfo(null)

  if (!node) return

  await supabase
    .from('process_nodes')
    .update({
      pos_x: Number(node.pos_x),
      pos_y: Number(node.pos_y),
      updated_at: new Date().toISOString(),
    })
    .eq('id', node.id)
}

function iniciarResizeProcessNode(event, node) {
  event.preventDefault()
  event.stopPropagation()

  const startWidth = Number(node.ancho) || 180
  const startHeight = Number(node.alto) || 90

  setProcessResizeInfo({
    id: node.id,
    startX: event.clientX,
    startY: event.clientY,
    startWidth,
    startHeight,
    aspectRatio:
      startHeight > 0
        ? startWidth / startHeight
        : 1,
  })
}

function moverResizeProcessNode(event) {
  if (!processResizeInfo) return

  const dx = event.clientX - processResizeInfo.startX
  const dy = event.clientY - processResizeInfo.startY

  // Usa el eje que más se movió y conserva la proporción original.
  // Esto evita que el PNG quede "flotando" dentro de un rectángulo
  // más grande y mantiene los conectores sobre la figura.
  const usaX = Math.abs(dx) >= Math.abs(dy)

  let scale = usaX
    ? (processResizeInfo.startWidth + dx) /
      processResizeInfo.startWidth
    : (processResizeInfo.startHeight + dy) /
      processResizeInfo.startHeight

  scale = Math.max(0.45, scale)

  const nuevoAncho = Math.max(
    64,
    processResizeInfo.startWidth * scale
  )

  const nuevoAlto = Math.max(
    54,
    processResizeInfo.startHeight * scale
  )

  setProcessNodes((actual) =>
    actual.map((node) =>
      node.id === processResizeInfo.id
        ? {
            ...node,
            ancho: nuevoAncho,
            alto: nuevoAlto,
          }
        : node
    )
  )
}

async function terminarResizeProcessNode() {
  if (!processResizeInfo) return

  const node = processNodes.find(
    (item) => item.id === processResizeInfo.id
  )

  setProcessResizeInfo(null)

  if (!node) return

  await supabase
    .from('process_nodes')
    .update({
      ancho: Number(node.ancho),
      alto: Number(node.alto),
      updated_at: new Date().toISOString(),
    })
    .eq('id', node.id)
}

function puntoConectorProcess(node, lado) {
  const x = Number(node.pos_x)
  const y = Number(node.pos_y)
  const ancho = Number(node.ancho)
  const alto = Number(node.alto)
  const rotacion =
    ((Number(node.rotacion) || 0) * Math.PI) / 180

  const cx = x + ancho / 2
  const cy = y + alto / 2

  let dx = 0
  let dy = 0

  if (lado === 'top') {
    dy = -alto / 2
  } else if (lado === 'bottom') {
    dy = alto / 2
  } else if (lado === 'left') {
    dx = -ancho / 2
  } else {
    dx = ancho / 2
  }

  return {
    x:
      cx +
      dx * Math.cos(rotacion) -
      dy * Math.sin(rotacion),
    y:
      cy +
      dx * Math.sin(rotacion) +
      dy * Math.cos(rotacion),
  }
}

function iniciarConexionProcess(event, node, lado) {
  if (event.button !== 0) return

  event.preventDefault()
  event.stopPropagation()

  const punto = puntoConectorProcess(node, lado)

  setProcessConnectSource({
    id: node.id,
    titulo: node.titulo,
    lado,
  })

  setProcessLinkDraft({
    sourceNodeId: node.id,
    sourceSide: lado,
    startX: punto.x,
    startY: punto.y,
    currentX: punto.x,
    currentY: punto.y,
  })
}

function moverConexionProcess(event) {
  if (!processLinkDraft) return

  const canvas = event.currentTarget
  const rect = canvas.getBoundingClientRect()

  setProcessLinkDraft((actual) => ({
    ...actual,
    currentX:
      event.clientX -
      rect.left +
      canvas.scrollLeft,
    currentY:
      event.clientY -
      rect.top +
      canvas.scrollTop,
  }))
}

function cancelarConexionProcess() {
  setProcessConnectSource(null)
  setProcessLinkDraft(null)
}

async function finalizarConexionProcess(event, targetNode, targetSide) {
  if (!processLinkDraft) return

  event.preventDefault()
  event.stopPropagation()

  if (processLinkDraft.sourceNodeId === targetNode.id) {
    cancelarConexionProcess()
    return
  }

  const { error } = await supabase
    .from('process_links')
    .insert({
      process_id: processSeleccionadoId,
      source_node_id: processLinkDraft.sourceNodeId,
      target_node_id: targetNode.id,
      source_side: processLinkDraft.sourceSide,
      target_side: targetSide,
      etiqueta: null,
      estilo: 'continua',
      color: '#b9c5cf',
    })

  if (error) {
    if (error.code !== '23505') {
      alert(`No se pudo crear la conexión: ${error.message}`)
    }
    cancelarConexionProcess()
    return
  }

  cancelarConexionProcess()
  await cargarProcessCanvas(processSeleccionadoId)
}

function abrirEditarProcessLink(link) {
  setProcessLinkEditando(link)
  setProcessLinkLabel(link.etiqueta || '')
  setProcessLinkStyle(link.estilo || 'continua')
  setProcessLinkColor(link.color || '#b9c5cf')
  setProcessLinkDrawerOpen(true)
}

function cerrarProcessLinkDrawer() {
  setProcessLinkDrawerOpen(false)
  setProcessLinkEditando(null)
  setProcessLinkLabel('')
  setProcessLinkStyle('continua')
  setProcessLinkColor('#b9c5cf')
}

async function guardarProcessLink(event) {
  event.preventDefault()

  if (!processLinkEditando) return

  const { error } = await supabase
    .from('process_links')
    .update({
      etiqueta: processLinkLabel.trim() || null,
      estilo: processLinkStyle,
      color: processLinkColor,
    })
    .eq('id', processLinkEditando.id)

  if (error) {
    alert(`No se pudo guardar el texto de la flecha: ${error.message}`)
    return
  }

  cerrarProcessLinkDrawer()
  await cargarProcessCanvas(processSeleccionadoId)
}

async function eliminarProcessLink(link) {
  const confirmar = window.confirm('¿Eliminar esta conexión?')
  if (!confirmar) return

  const { error } = await supabase
    .from('process_links')
    .delete()
    .eq('id', link.id)

  if (error) {
    alert(`No se pudo eliminar la conexión: ${error.message}`)
    return
  }

  cerrarProcessLinkDrawer()
  await cargarProcessCanvas(processSeleccionadoId)
}

function processNodeById(id) {
  return processNodes.find((item) => item.id === id)
}

function processLine(link) {
  const source = processNodeById(link.source_node_id)
  const target = processNodeById(link.target_node_id)

  if (!source || !target) return null

  const sourceSide = link.source_side || 'right'
  const targetSide = link.target_side || 'left'

  const p1 = puntoConectorProcess(source, sourceSide)
  const p2 = puntoConectorProcess(target, targetSide)

  const horizontal =
    sourceSide === 'left' ||
    sourceSide === 'right'

  const targetHorizontal =
    targetSide === 'left' ||
    targetSide === 'right'

  let d

  if (horizontal && targetHorizontal) {
    const control = Math.max(70, Math.abs(p2.x - p1.x) * 0.45)
    const dir1 = sourceSide === 'left' ? -1 : 1
    const dir2 = targetSide === 'left' ? -1 : 1

    d =
      `M ${p1.x} ${p1.y} ` +
      `C ${p1.x + control * dir1} ${p1.y}, ` +
      `${p2.x + control * dir2} ${p2.y}, ` +
      `${p2.x} ${p2.y}`
  } else {
    const control = Math.max(70, Math.abs(p2.y - p1.y) * 0.45)
    const dir1 = sourceSide === 'top' ? -1 : 1
    const dir2 = targetSide === 'top' ? -1 : 1

    d =
      `M ${p1.x} ${p1.y} ` +
      `C ${p1.x} ${p1.y + control * dir1}, ` +
      `${p2.x} ${p2.y + control * dir2}, ` +
      `${p2.x} ${p2.y}`
  }

  return {
    d,
    midX: (p1.x + p2.x) / 2,
    midY: (p1.y + p2.y) / 2,
  }
}

async function cargarCardLinks(boardId) {
  if (!boardId) {
    setCardLinks([])
    return
  }

  const { data, error } = await supabase
    .from('card_links')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error cargando conexiones:', error)
    return
  }

  setCardLinks(data || [])
}


async function cargarComentariosCard(cardId) {
  if (!cardId) {
    setComentariosCard([])
    return
  }

  const { data, error } = await supabase
    .from('card_comments')
    .select('*')
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error cargando comentarios:', error)
    return
  }

  setComentariosCard(data || [])
}

async function agregarComentario() {
  if (
    !cardEditando ||
    !nuevoComentario.trim()
  ) {
    return
  }

  const autor =
    session?.user?.email || 'Usuario'

  const { error } = await supabase
    .from('card_comments')
    .insert({
      card_id: cardEditando.id,
      autor,
      comentario:
        nuevoComentario.trim(),
    })

  if (error) {
    alert(
      `No se pudo guardar el comentario: ${error.message}`
    )
    return
  }

  setNuevoComentario('')
  await cargarComentariosCard(cardEditando.id)
}

async function eliminarComentario(comentario) {
  const confirmar = window.confirm(
    '¿Eliminar este comentario?'
  )

  if (!confirmar) return

  const { error } = await supabase
    .from('card_comments')
    .delete()
    .eq('id', comentario.id)

  if (error) {
    alert(
      `No se pudo eliminar el comentario: ${error.message}`
    )
    return
  }

  await cargarComentariosCard(cardEditando.id)
}

function cambiarZoom(delta) {
  setBoardZoom((actual) =>
    Math.min(
      1.4,
      Math.max(
        0.5,
        Math.round(
          (actual + delta) * 10
        ) / 10
      )
    )
  )
}

function iniciarPanCanvas(event) {
  if (
    event.button !== 0 ||
    !boardCanvasRef.current
  ) {
    return
  }

  const esFondo =
    event.target.classList.contains(
      'cards-canvas'
    ) ||
    event.target.classList.contains(
      'board-zoom-spacer'
    ) ||
    event.target.classList.contains(
      'board-world'
    ) ||
    event.target.classList.contains(
      'cards-cork-texture'
    )

  if (!esFondo) return

  setPanInfo({
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft:
      boardCanvasRef.current.scrollLeft,
    scrollTop:
      boardCanvasRef.current.scrollTop,
  })

  event.preventDefault()
}

function moverPanCanvas(event) {
  if (
    !panInfo ||
    !boardCanvasRef.current
  ) {
    return
  }

  boardCanvasRef.current.scrollLeft =
    panInfo.scrollLeft -
    (event.clientX - panInfo.startX)

  boardCanvasRef.current.scrollTop =
    panInfo.scrollTop -
    (event.clientY - panInfo.startY)
}

function terminarPanCanvas() {
  setPanInfo(null)
}

function centrarBoard() {
  if (!boardCanvasRef.current) return

  const canvas =
    boardCanvasRef.current

  const cardsActivas = cards

  if (cardsActivas.length === 0) {
    canvas.scrollTo({
      left: 0,
      top: 0,
      behavior: 'smooth',
    })
    return
  }

  const minX = Math.min(
    ...cardsActivas.map(
      (card) => Number(card.pos_x) || 0
    )
  )

  const maxX = Math.max(
    ...cardsActivas.map(
      (card) =>
        (Number(card.pos_x) || 0) +
        (Number(card.ancho) || 250)
    )
  )

  const minY = Math.min(
    ...cardsActivas.map(
      (card) => Number(card.pos_y) || 0
    )
  )

  const maxY = Math.max(
    ...cardsActivas.map(
      (card) =>
        (Number(card.pos_y) || 0) +
        (Number(card.alto) || 190)
    )
  )

  const centroX =
    ((minX + maxX) / 2) *
    boardZoom

  const centroY =
    ((minY + maxY) / 2) *
    boardZoom

  canvas.scrollTo({
    left:
      Math.max(
        0,
        centroX -
          canvas.clientWidth / 2
      ),
    top:
      Math.max(
        0,
        centroY -
          canvas.clientHeight / 2
      ),
    behavior: 'smooth',
  })
}

async function duplicarCard(card) {
  if (!card) return

  const maxZ =
    Math.max(
      10,
      ...cards.map(
        (item) =>
          Number(item.z_index) || 10
      )
    ) + 1

  const { data, error } = await supabase
    .from('cards')
    .insert({
      board_id: card.board_id,
      titulo: `${card.titulo} copia`,
      descripcion:
        card.descripcion || '',
      tipo: card.tipo || 'Card',
      estado:
        card.estado || 'Pendiente',
      responsable:
        card.tipo === 'Nota'
          ? null
          : card.responsable || null,
      fecha_inicio:
        card.tipo === 'Nota'
          ? null
          : card.fecha_inicio || null,
      fecha_fin:
        card.tipo === 'Nota'
          ? null
          : card.fecha_fin || null,
      color: card.color || 'yellow',
      pos_x:
        (Number(card.pos_x) || 80) +
        30,
      pos_y:
        (Number(card.pos_y) || 80) +
        30,
      ancho:
        Number(card.ancho) || 250,
      alto:
        Number(card.alto) || 190,
      z_index: maxZ,
      checklist:
        Array.isArray(card.checklist)
          ? card.checklist
          : [],
      archivada: false,
    })
    .select()
    .single()

  if (error) {
    alert(
      `No se pudo duplicar la card: ${error.message}`
    )
    return
  }

  cerrarModalCard()
  await cargarCards(boardSeleccionadoId)

  if (data) {
    abrirEditarCard(data)
  }
}

async function moverCardCapa(card, direccion) {
  if (!card) return

  const valores = cards.map(
    (item) =>
      Number(item.z_index) || 10
  )

  const nuevoZ =
    direccion === 'frente'
      ? Math.max(10, ...valores) + 1
      : Math.min(10, ...valores) - 1

  const { error } = await supabase
    .from('cards')
    .update({
      z_index: nuevoZ,
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', card.id)

  if (error) {
    alert(
      `No se pudo cambiar la capa: ${error.message}`
    )
    return
  }

  setCards((actual) =>
    actual.map((item) =>
      item.id === card.id
        ? {
            ...item,
            z_index: nuevoZ,
          }
        : item
    )
  )

  setCardEditando((actual) =>
    actual
      ? {
          ...actual,
          z_index: nuevoZ,
        }
      : actual
  )
}

function iniciarConexion(event, card) {
  event.stopPropagation()
  event.preventDefault()

  const canvasRect =
    boardCanvasRef.current?.getBoundingClientRect()

  if (!canvasRect) return

  const scrollLeft =
    boardCanvasRef.current.scrollLeft || 0

  const scrollTop =
    boardCanvasRef.current.scrollTop || 0

  setLinkDraft({
    sourceCardId: card.id,
    x1:
      Number(card.pos_x || 0) +
      Number(card.ancho || 250),
    y1:
      Number(card.pos_y || 0) +
      Number(card.alto || 190) / 2,
    x2:
      (
        event.clientX -
        canvasRect.left +
        scrollLeft
      ) / boardZoom,
    y2:
      (
        event.clientY -
        canvasRect.top +
        scrollTop
      ) / boardZoom,
  })
}

function moverConexion(event) {
  if (!linkDraft || !boardCanvasRef.current) {
    return
  }

  const canvasRect =
    boardCanvasRef.current.getBoundingClientRect()

  const scrollLeft =
    boardCanvasRef.current.scrollLeft || 0

  const scrollTop =
    boardCanvasRef.current.scrollTop || 0

  setLinkDraft((actual) => ({
    ...actual,
    x2:
      (
        event.clientX -
        canvasRect.left +
        scrollLeft
      ) / boardZoom,
    y2:
      (
        event.clientY -
        canvasRect.top +
        scrollTop
      ) / boardZoom,
  }))
}

function terminarConexion(event, targetCard) {
  event.stopPropagation()
  event.preventDefault()

  if (!linkDraft) return

  const sourceCardId = linkDraft.sourceCardId

  if (sourceCardId === targetCard.id) {
    setLinkDraft(null)
    return
  }

  const duplicada = cardLinks.some(
    (link) =>
      link.source_card_id === sourceCardId &&
      link.target_card_id === targetCard.id
  )

  if (duplicada) {
    setLinkDraft(null)
    alert('Estas cards ya están conectadas.')
    return
  }

  setConexionPendiente({
    sourceCardId,
    targetCardId: targetCard.id,
  })

  setTipoConexion('Relacionada')
  setLinkDraft(null)
}

async function guardarConexion() {
  if (!conexionPendiente) return

  const { error } = await supabase
    .from('card_links')
    .insert({
      board_id: boardSeleccionadoId,
      source_card_id:
        conexionPendiente.sourceCardId,
      target_card_id:
        conexionPendiente.targetCardId,
      tipo_relacion: tipoConexion,
    })

  if (error) {
    alert(
      `No se pudo crear la conexión: ${error.message}`
    )
    return
  }

  setConexionPendiente(null)
  setTipoConexion('Relacionada')

  await cargarCardLinks(boardSeleccionadoId)
}

async function eliminarConexion(link) {
  const confirmar = window.confirm(
    `¿Eliminar la conexión "${link.tipo_relacion}"?`
  )

  if (!confirmar) return

  const { error } = await supabase
    .from('card_links')
    .delete()
    .eq('id', link.id)

  if (error) {
    alert(`No se pudo eliminar la conexión: ${error.message}`)
    return
  }

  await cargarCardLinks(boardSeleccionadoId)
}


function iniciarResizeCard(event, card) {
  event.stopPropagation()
  event.preventDefault()

  setResizeInfo({
    id: card.id,
    startY: event.clientY,
    startHeight:
      Number(card.alto) || 190,
  })
}

function moverResizeCard(event) {
  if (!resizeInfo) return

  const diferencia =
    (
      event.clientY -
      resizeInfo.startY
    ) / boardZoom

  const nuevaAltura =
    Math.max(
      150,
      resizeInfo.startHeight +
        diferencia
    )

  setCards((actual) =>
    actual.map((card) =>
      card.id === resizeInfo.id
        ? {
            ...card,
            alto: nuevaAltura,
          }
        : card
    )
  )
}

async function terminarResizeCard() {
  if (!resizeInfo) return

  const cardActual =
    cards.find(
      (card) => card.id === resizeInfo.id
    )

  setResizeInfo(null)

  if (!cardActual) return

  const { error } = await supabase
    .from('cards')
    .update({
      alto:
        Number(cardActual.alto) || 190,
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', cardActual.id)

  if (error) {
    console.error(
      'No se pudo guardar el tamaño:',
      error
    )
  }
}

function cardPorId(id) {
  return cards.find((card) => card.id === id)
}

function geometriaLink(link) {
  const source = cardPorId(link.source_card_id)
  const target = cardPorId(link.target_card_id)

  if (!source || !target) return null

  const x1 =
    Number(source.pos_x || 0) +
    Number(source.ancho || 250)

  const y1 =
    Number(source.pos_y || 0) +
    Number(source.alto || 190) / 2

  const x2 =
    Number(target.pos_x || 0)

  const y2 =
    Number(target.pos_y || 0) +
    Number(target.alto || 190) / 2

  const curvatura =
    Math.max(80, Math.abs(x2 - x1) * 0.45)

  return {
    x1,
    y1,
    x2,
    y2,
    path:
      `M ${x1} ${y1} ` +
      `C ${x1 + curvatura} ${y1}, ` +
      `${x2 - curvatura} ${y2}, ` +
      `${x2} ${y2}`,
  }
}

async function guardarBoard(event) {
  event.preventDefault()

  if (!nuevoBoard.nombre.trim()) {
    alert('Ingresá un nombre para el board.')
    return
  }

  if (boardEditando) {
    const { error } = await supabase
      .from('card_boards')
      .update({
        nombre: nuevoBoard.nombre.trim(),
        descripcion: nuevoBoard.descripcion.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', boardEditando.id)

    if (error) {
      alert(`No se pudo editar el board: ${error.message}`)
      return
    }
  } else {
    const { data, error } = await supabase
      .from('card_boards')
      .insert({
        nombre: nuevoBoard.nombre.trim(),
        descripcion: nuevoBoard.descripcion.trim(),
      })
      .select()
      .single()

    if (error) {
      alert(`No se pudo crear el board: ${error.message}`)
      return
    }

    setBoardSeleccionadoId(data.id)
  }

  setNuevoBoard({
    nombre: '',
    descripcion: '',
  })
  setBoardEditando(null)
  setModalBoardOpen(false)

  await cargarBoards()
}

function abrirNuevoBoard() {
  setBoardEditando(null)
  setNuevoBoard({
    nombre: '',
    descripcion: '',
  })
  setModalBoardOpen(true)
}

function abrirEditarBoard(board) {
  setBoardEditando(board)
  setNuevoBoard({
    nombre: board.nombre || '',
    descripcion: board.descripcion || '',
  })
  setModalBoardOpen(true)
}

async function eliminarBoard(board) {
  const confirmar = window.confirm(
    `¿Eliminar el board "${board.nombre}"?\n\nSe eliminarán también todas sus cards y conexiones.`
  )

  if (!confirmar) return

  const { error } = await supabase
    .from('card_boards')
    .delete()
    .eq('id', board.id)

  if (error) {
    alert(`No se pudo eliminar el board: ${error.message}`)
    return
  }

  if (boardSeleccionadoId === board.id) {
    setBoardSeleccionadoId('')
    setCards([])
    setCardLinks([])
  }

  await cargarBoards()
}

async function actualizarBoardCanvasBg(color) {
  if (!boardSeleccionadoId) return

  const { error } = await supabase
    .from('card_boards')
    .update({
      canvas_bg: color,
      updated_at: new Date().toISOString(),
    })
    .eq('id', boardSeleccionadoId)

  if (error) {
    alert(`No se pudo actualizar el fondo del board: ${error.message}`)
    return
  }

  setBoards((actual) =>
    actual.map((board) =>
      board.id === boardSeleccionadoId
        ? { ...board, canvas_bg: color }
        : board
    )
  )
}


function abrirCardGantt(card) {
  if (!card || card.tipo === 'Nota') return

  setCardGanttProjectId(
    proyectos.find((item) => item.id !== '__all__')?.id || ''
  )
  setCardGanttOpen(true)
}

async function convertirCardEnGantt(card) {
  if (!card || card.tipo === 'Nota') return

  if (!cardGanttProjectId) {
    alert('Seleccioná un proyecto.')
    return
  }

  const proyectoDestino = proyectos.find(
    (item) => item.id === cardGanttProjectId
  )

  if (!proyectoDestino) {
    alert('No se encontró el proyecto seleccionado.')
    return
  }

  const hoyIso = new Date().toISOString().slice(0, 10)
  const inicio = card.fecha_inicio || hoyIso

  let duracion = 1

  if (card.fecha_inicio && card.fecha_fin) {
    const desde = parseDate(card.fecha_inicio)
    const hasta = parseDate(card.fecha_fin)

    if (desde && hasta) {
      duracion = Math.max(
        1,
        diasHabilesEntre(desde, hasta).length
      )
    }
  }

  const estadoPermitido = [
    'Pendiente',
    'En curso',
    'Finalizado',
    'Bloqueado',
    'Desestimado',
  ].includes(card.estado)
    ? card.estado
    : 'Pendiente'

  const { data: nuevaTarea, error } = await supabase
    .from('tasks')
    .insert({
      project_id: proyectoDestino.id,
      nombre: card.titulo || 'Card',
      responsable: card.responsable || '',
      responsable_analista:
        card.responsable || null,
      responsable_desarrollador: null,
      comentario: card.descripcion || '',
      fecha_inicio: inicio,
      horas_estimadas: Number(duracion) * 6.5,
      duracion_dias: Number(duracion),
      estado: estadoPermitido,
      prioridad: 'Media',
      es_hito: false,
      hito_padre_id: null,
      created_by: session.user.id,
      fecha_finalizacion:
        estadoPermitido === 'Finalizado'
          ? new Date().toISOString()
          : null,
    })
    .select()
    .single()

  if (error) {
    alert(`No se pudo crear la tarea Gantt: ${error.message}`)
    return
  }

  await supabase
    .from('task_history')
    .insert({
      task_id: nuevaTarea.id,
      user_id: session.user.id,
      accion: 'Tarea creada desde Cards',
      detalle: `Se creó la tarea "${card.titulo}" desde una Card`,
    })

  const { error: cardError } = await supabase
    .from('cards')
    .update({
      gantt_task_id: nuevaTarea.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', card.id)

  if (cardError) {
    console.error(
      'La tarea fue creada pero no se pudo vincular la card:',
      cardError
    )
  }

  setCardGanttOpen(false)
  setCardGanttProjectId('')

  await Promise.all([
    cargarCards(boardSeleccionadoId),
    cargarTodasLasTareas(),
  ])

  if (proyectoSeleccionadoId === proyectoDestino.id) {
    await cargarTareas(proyectoDestino.id)
  }

  alert(
    `Card convertida en tarea del proyecto "${proyectoDestino.nombre}".`
  )
}

function abrirNuevaCard(tipo = 'Card') {
  if (!boardSeleccionadoId) {
    alert('Primero creá o seleccioná un board.')
    return
  }

  setCardEditando(null)

  const maxZ =
    Math.max(
      10,
      ...cards.map(
        (item) =>
          Number(item.z_index) || 10
      )
    ) + 1

  setFormCard({
    ...cardVacia,
    tipo,
    estado:
      tipo === 'Nota'
        ? 'Nota'
        : 'Pendiente',
    pos_x: 90 + Math.min(cards.length, 6) * 28,
    pos_y: 90 + Math.min(cards.length, 6) * 24,
    z_index: maxZ,
  })

  setModalCardOpen(true)
}

function abrirEditarCard(card) {
  setCardEditando(card)

  setFormCard({
    titulo: card.titulo || '',
    descripcion: card.descripcion || '',
    tipo: card.tipo || 'Card',
    estado: card.estado || 'Pendiente',
    responsable: card.responsable || '',
    fecha_inicio: card.fecha_inicio || '',
    fecha_fin: card.fecha_fin || '',
    color: card.color || 'yellow',
    pos_x: Number(card.pos_x) || 80,
    pos_y: Number(card.pos_y) || 80,
    ancho: Number(card.ancho) || 250,
    alto: Number(card.alto) || 190,
    z_index: Number(card.z_index) || 10,
    checklist:
      Array.isArray(card.checklist)
        ? card.checklist
        : [],
  })

  setNuevoComentario('')
  cargarComentariosCard(card.id)
  setModalCardOpen(true)
}

function cerrarModalCard() {
  setModalCardOpen(false)
  setCardEditando(null)
  setFormCard(cardVacia)
  setComentariosCard([])
  setNuevoComentario('')
  setCardGanttOpen(false)
  setCardGanttProjectId('')
}

async function guardarCard(event) {
  event.preventDefault()

  if (!formCard.titulo.trim()) {
    alert('Ingresá un título para la card.')
    return
  }

  if (!boardSeleccionadoId) {
    alert('Seleccioná un board.')
    return
  }

  const esNota =
    formCard.tipo === 'Nota'

  const payload = {
    board_id: boardSeleccionadoId,
    titulo: formCard.titulo.trim(),
    descripcion: formCard.descripcion.trim(),
    tipo: formCard.tipo,
    estado:
      esNota
        ? 'Nota'
        : formCard.estado,
    responsable:
      esNota
        ? null
        : formCard.responsable || null,
    fecha_inicio:
      esNota
        ? null
        : formCard.fecha_inicio || null,
    fecha_fin:
      esNota
        ? null
        : formCard.fecha_fin || null,
    color: formCard.color,
    ancho: Number(formCard.ancho) || 250,
    alto: Number(formCard.alto) || 190,
    z_index:
      Number(formCard.z_index) || 10,
    checklist:
      Array.isArray(formCard.checklist)
        ? formCard.checklist.filter(
            (item) => item.texto?.trim()
          )
        : [],
    archivada: false,
    updated_at: new Date().toISOString(),
  }

  if (cardEditando) {
    const { error } = await supabase
      .from('cards')
      .update(payload)
      .eq('id', cardEditando.id)

    if (error) {
      alert(`No se pudo editar la card: ${error.message}`)
      return
    }
  } else {
    const { error } = await supabase
      .from('cards')
      .insert({
        ...payload,
        pos_x: Number(formCard.pos_x) || 80,
        pos_y: Number(formCard.pos_y) || 80,
        z_index:
          Number(formCard.z_index) || 10,
      })

    if (error) {
      alert(`No se pudo crear la card: ${error.message}`)
      return
    }
  }

  cerrarModalCard()
  await cargarCards(boardSeleccionadoId)
}

async function eliminarCard() {
  if (!cardEditando) return

  const confirmar = window.confirm(
    `¿Eliminar la card "${cardEditando.titulo}"?`
  )

  if (!confirmar) return

  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardEditando.id)

  if (error) {
    alert(`No se pudo eliminar la card: ${error.message}`)
    return
  }

  cerrarModalCard()
  await cargarCards(boardSeleccionadoId)
}

function iniciarDragCard(event, card) {
  if (event.button !== 0) return

  const rect =
    event.currentTarget.getBoundingClientRect()

  setDragInfo({
    id: card.id,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  })

  event.preventDefault()
}

function moverCardEnCanvas(event) {
  if (
    !dragInfo ||
    !boardCanvasRef.current
  ) {
    return
  }

  const canvasRect =
    boardCanvasRef.current.getBoundingClientRect()

  const scrollLeft =
    boardCanvasRef.current.scrollLeft || 0

  const scrollTop =
    boardCanvasRef.current.scrollTop || 0

  const nuevoX =
    (
      event.clientX -
      canvasRect.left +
      scrollLeft
    ) / boardZoom -
    dragInfo.offsetX / boardZoom

  const nuevoY =
    (
      event.clientY -
      canvasRect.top +
      scrollTop
    ) / boardZoom -
    dragInfo.offsetY / boardZoom

  setCards((actual) =>
    actual.map((card) =>
      card.id === dragInfo.id
        ? {
            ...card,
            pos_x: Math.max(12, nuevoX),
            pos_y: Math.max(12, nuevoY),
          }
        : card
    )
  )
}

async function terminarDragCard() {
  if (!dragInfo) return

  const cardActual =
    cards.find(
      (card) => card.id === dragInfo.id
    )

  setDragInfo(null)

  if (!cardActual) return

  const { error } = await supabase
    .from('cards')
    .update({
      pos_x: Number(cardActual.pos_x),
      pos_y: Number(cardActual.pos_y),
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardActual.id)

  if (error) {
    console.error(
      'No se pudo guardar la posición:',
      error
    )
  }
}

// =========================
// NAVEGACIÓN DEL GANTT CONTINUO
// =========================

const ANCHO_DIA_GANTT = 34

function mismaFecha(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function inicialDiaSemanaFecha(fecha) {
  const letras = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  return letras[fecha.getDay()]
}

function nombreMesCorto(fecha) {
  return fecha.toLocaleDateString('es-AR', {
    month: 'short',
  }).replace('.', '')
}

const diasHabilesAnio = useMemo(() => {
  const lista = []

  const fecha = new Date(anioVisualizado, 0, 1)
  const fin = new Date(anioVisualizado, 11, 31)

  while (fecha <= fin) {
    const numeroDia = fecha.getDay()

    if (numeroDia !== 0 && numeroDia !== 6) {
      lista.push(new Date(fecha))
    }

    fecha.setDate(fecha.getDate() + 1)
  }

  return lista
}, [anioVisualizado])

const anchoGanttAnio =
  diasHabilesAnio.length * ANCHO_DIA_GANTT

function posicionBarra(tarea) {
  const inicioTarea = parseDate(tarea.fecha_inicio)

  const finTarea =
    tarea.es_hito
      ? fechaFinHito(tarea)
      : calcularFechaFinDate(
          tarea.fecha_inicio,
          tarea.duracion_dias
        )

  if (
    !inicioTarea ||
    !finTarea ||
    diasHabilesAnio.length === 0
  ) {
    return null
  }

  const diasVisibles = diasHabilesAnio.filter((fecha) => {
    return (
      fecha >= inicioTarea &&
      fecha <= finTarea
    )
  })

  if (diasVisibles.length === 0) {
    return null
  }

  const primerDiaVisible = diasVisibles[0]

  const indiceInicio = diasHabilesAnio.findIndex((fecha) =>
    mismaFecha(fecha, primerDiaVisible)
  )

  return {
    left: `${indiceInicio * ANCHO_DIA_GANTT}px`,
    width: `${Math.max(
      diasVisibles.length * ANCHO_DIA_GANTT,
      8
    )}px`,
    center: `${
      (indiceInicio + diasVisibles.length / 2) *
      ANCHO_DIA_GANTT
    }px`,
  }
}

function posicionHoy() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  if (hoy.getFullYear() !== anioVisualizado) {
    return null
  }

  const indiceHoy = diasHabilesAnio.findIndex((fecha) =>
    mismaFecha(fecha, hoy)
  )

  if (indiceHoy === -1) {
    return null
  }

  return (
    (indiceHoy + 0.5) *
    ANCHO_DIA_GANTT
  )
}

function moverGantt(direccion) {
  const contenedor = ganttScrollRef.current

  if (!contenedor) return

  const desplazamiento =
    Math.max(contenedor.clientWidth * 0.8, 650)

  contenedor.scrollBy({
    left:
      direccion === 'derecha'
        ? desplazamiento
        : -desplazamiento,
    behavior: 'smooth',
  })
}

function irAHoy() {
  const hoy = new Date()
  const anioHoy = hoy.getFullYear()

  if (anioVisualizado !== anioHoy) {
    setAnioVisualizado(anioHoy)
    return
  }

  requestAnimationFrame(() => {
    scrollAHoy()
  })
}

function scrollAHoy() {
  const contenedor = ganttScrollRef.current

  if (!contenedor) return

  const hoy = new Date()

  if (hoy.getFullYear() !== anioVisualizado) {
    contenedor.scrollTo({
      left: 0,
      behavior: 'smooth',
    })
    return
  }

  const indiceHoy = diasHabilesAnio.findIndex((fecha) =>
    mismaFecha(fecha, hoy)
  )

  if (indiceHoy === -1) return

  const posicion =
    indiceHoy * ANCHO_DIA_GANTT

  contenedor.scrollTo({
    left: Math.max(
      0,
      posicion - contenedor.clientWidth * 0.25
    ),
    behavior: 'smooth',
  })
}

function cambiarAnio(valor) {
  const anio = Number(valor)

  if (!anio) return

  setAnioVisualizado(anio)
}

useEffect(() => {
  const contenedor = ganttScrollRef.current

  if (!contenedor) return

  const hoy = new Date()

  const timer = window.setTimeout(() => {
    if (anioVisualizado === hoy.getFullYear()) {
      scrollAHoy()
    } else {
      contenedor.scrollTo({
        left: 0,
        behavior: 'auto',
      })
    }
  }, 0)

  return () => window.clearTimeout(timer)
}, [anioVisualizado, diasHabilesAnio])

  const responsables = useMemo(() => {
    return perfiles
      .map((perfil) => perfil.nombre)
      .filter(Boolean)
      .sort()
  }, [perfiles])
const tareasFiltradas = useMemo(() => {
  return tareas.filter((tarea) => {
    const cumpleResponsable =
      filtroResponsable === 'Todos' ||
      tarea.responsable_analista === filtroResponsable ||
      tarea.responsable_desarrollador === filtroResponsable ||
      tarea.responsable === filtroResponsable

    const cumpleEstado =
      filtroEstado === 'Todos' ||
      estadoVisual(tarea) === filtroEstado

    const cumplePrioridad =
      filtroPrioridad === 'Todas' ||
      tarea.prioridad === filtroPrioridad

    return (
      cumpleResponsable &&
      cumpleEstado &&
      cumplePrioridad
    )
  })
}, [
  tareas,
  filtroResponsable,
  filtroEstado,
  filtroPrioridad,
])

  const metricas = useMemo(() => {
    const tareasContabilizables =
      tareas.filter(
        (tarea) =>
          tarea.estado !== 'Desestimado'
      )

    const total =
      tareasContabilizables.length

    const finalizadas =
      tareasContabilizables.filter(
        (t) => t.estado === 'Finalizado'
      ).length

    const enCurso =
      tareasContabilizables.filter(
        (t) => t.estado === 'En curso'
      ).length

    const atrasadas =
      tareasContabilizables.filter(
        estaAtrasada
      ).length

    const promedio =
      total === 0
        ? 0
        : Math.round(
            tareasContabilizables.reduce(
              (acc, tarea) =>
                acc + calcularAvance(tarea),
              0
            ) / total
          )

    return {
      total,
      finalizadas,
      enCurso,
      atrasadas,
      promedio,
    }
  }, [tareas])

  function estadoVisual(tarea) {
  if (tarea.es_hito) {
    return estadoHito(tarea)
  }

  if (estaAtrasada(tarea)) {
    return 'Vencido'
  }

  return tarea.estado
}

function tareasDelHito(hitoId) {
  return tareas.filter(
    (tarea) =>
      !tarea.es_hito &&
      tarea.hito_padre_id === hitoId
  )
}

function fechaFinHito(hito) {
  const hijas = tareasDelHito(hito.id)

  if (hijas.length === 0) {
    return parseDate(hito.fecha_inicio)
  }

  const fechasFin = hijas
    .map((tarea) =>
      calcularFechaFinDate(
        tarea.fecha_inicio,
        tarea.duracion_dias
      )
    )
    .filter(Boolean)

  if (fechasFin.length === 0) {
    return parseDate(hito.fecha_inicio)
  }

  return new Date(
    Math.max(
      ...fechasFin.map(
        (fecha) => fecha.getTime()
      )
    )
  )
}

function estadoHito(hito) {
  const hijas = tareasDelHito(hito.id)

  if (hijas.length === 0) {
    return 'Pendiente'
  }

  const todasFinalizadas =
    hijas.every(
      (tarea) =>
        ['Finalizado', 'Desestimado'].includes(
          tarea.estado
        )
    )

  if (todasFinalizadas) {
    return 'Finalizado'
  }

  const algunaBloqueada =
    hijas.some(
      (tarea) =>
        tarea.estado === 'Bloqueado'
    )

  if (algunaBloqueada) {
    return 'Bloqueado'
  }

  const algunaEnCurso =
    hijas.some(
      (tarea) =>
        tarea.estado === 'En curso'
    )

  if (algunaEnCurso) {
    return 'En curso'
  }

  return 'Pendiente'
}

function calcularAvanceHito(hito) {
  const hijas = tareasDelHito(hito.id)

  if (hijas.length === 0) return 0

  return Math.round(
    hijas.reduce(
      (acc, tarea) =>
        acc + calcularAvance(tarea),
      0
    ) / hijas.length
  )
}

function formatoFecha(fecha) {
  return fecha
    ? fecha.toLocaleDateString('es-AR')
    : ''
}

function claseEstadoPunto(tarea) {
  const estado = estadoVisual(tarea)

  if (estado === 'En curso') {
    return 'en-curso'
  }

  return estado.toLowerCase()
}

function colorEstadoTarea(tarea) {
  const estado = estadoVisual(tarea)

  if (estado === 'Vencido') {
    return 'estado vencido'
  }

  if (estado === 'Finalizado') {
    return 'estado finalizado'
  }

  if (estado === 'En curso') {
    return 'estado en-curso'
  }

  if (estado === 'Bloqueado') {
    return 'estado bloqueado'
  }

  return 'estado pendiente'
}



  function colorBarra(tarea) {
    if (estaAtrasada(tarea)) return 'bar-overdue'
    if (tarea.estado === 'Finalizado') return 'bar-green'
    if (tarea.estado === 'Bloqueado') return 'bar-blocked'
    if (tarea.estado === 'En curso') return 'bar-purple'

    return 'bar-blue'
  }

  function nombreDependencia(tarea) {
    const dependencia =
      tareas.find(
        (otra) =>
          otra.id === tarea.dependencia_id
      )

    return dependencia?.nombre || '—'
  }

  function formatoFechaHora(fecha) {
    return new Date(fecha).toLocaleString(
      'es-AR',
      {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }
    )
  }




  const tareasVisuales = useMemo(() => {
    const resultado = []

    const hitos = tareasFiltradas.filter(
      (tarea) => tarea.es_hito
    )

    const tareasSueltas = tareasFiltradas.filter(
      (tarea) =>
        !tarea.es_hito &&
        !tarea.hito_padre_id
    )

    hitos.forEach((hito) => {
      resultado.push(hito)

      const hijas = tareasFiltradas
        .filter(
          (tarea) =>
            !tarea.es_hito &&
            tarea.hito_padre_id === hito.id
        )
        .sort(
          (a, b) =>
            parseDate(a.fecha_inicio) -
            parseDate(b.fecha_inicio)
        )

      resultado.push(...hijas)
    })

    resultado.push(
      ...tareasSueltas.sort(
        (a, b) =>
          parseDate(a.fecha_inicio) -
          parseDate(b.fecha_inicio)
      )
    )

    return resultado
  }, [tareasFiltradas])



  const tareasVisualesGantt = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    return tareasVisuales.filter((tarea) => {
      if (tarea.estado === 'Desestimado') {
        return false
      }

      if (
        tarea.es_hito ||
        tarea.estado !== 'Finalizado'
      ) {
        return true
      }

      const finReal =
        fechaFinRealTarea(tarea)

      // Tareas históricas sin fecha real:
      // las conservamos para no ocultarlas por error.
      if (!finReal) {
        return true
      }

      const limite = new Date(finReal)
      limite.setDate(
        limite.getDate() + 10
      )

      return hoy <= limite
    })
  }, [tareasVisuales])

  const HORAS_DIA_CAPACITY = 6.5
  const ANCHO_DIA_CAPACITY = 38

  function fechaSinHora(fecha) {
    const copia = new Date(fecha)
    copia.setHours(0, 0, 0, 0)
    return copia
  }

  function esDiaHabil(fecha) {
    const dia = fecha.getDay()
    return dia !== 0 && dia !== 6
  }

  function diasHabilesEntre(inicio, fin) {
    if (!inicio || !fin || fin < inicio) {
      return []
    }

    const lista = []
    const cursor = fechaSinHora(inicio)
    const limite = fechaSinHora(fin)

    while (cursor <= limite) {
      if (esDiaHabil(cursor)) {
        lista.push(new Date(cursor))
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    return lista
  }

  const fechaClaveDate = useMemo(() => {
    return parseDate(fechaClave)
  }, [fechaClave])

  const hoyCapacity = useMemo(() => {
    return fechaSinHora(new Date())
  }, [])

  const diasCapacity = useMemo(() => {
    if (
      !fechaClaveDate ||
      fechaClaveDate < hoyCapacity
    ) {
      return []
    }

    return diasHabilesEntre(
      hoyCapacity,
      fechaClaveDate
    )
  }, [fechaClaveDate, hoyCapacity])

  const anchoCapacity =
    Math.max(
      diasCapacity.length * ANCHO_DIA_CAPACITY,
      760
    )

  function horasTareaEnVentana(tarea) {
    if (
      tarea.es_hito ||
      tarea.estado === 'Desestimado' ||
      !tarea.fecha_inicio ||
      !fechaClaveDate
    ) {
      return 0
    }

    const inicioTarea =
      parseDate(tarea.fecha_inicio)

    const finTarea =
      calcularFechaFinDate(
        tarea.fecha_inicio,
        tarea.duracion_dias
      )

    if (!inicioTarea || !finTarea) {
      return 0
    }

    const inicioVentana =
      inicioTarea > hoyCapacity
        ? inicioTarea
        : hoyCapacity

    const finVentana =
      finTarea < fechaClaveDate
        ? finTarea
        : fechaClaveDate

    const totalDiasTarea =
      diasHabilesEntre(
        inicioTarea,
        finTarea
      ).length

    const diasDentroVentana =
      diasHabilesEntre(
        inicioVentana,
        finVentana
      ).length

    if (
      totalDiasTarea === 0 ||
      diasDentroVentana === 0
    ) {
      return 0
    }

    // Si hay horas estimadas manuales, se distribuyen
    // sobre los días hábiles reales de la tarea.
    // Si no hay estimación, usamos 6,5 h por día hábil.
    const horasTotales =
      Number(tarea.horas_estimadas) > 0
        ? Number(tarea.horas_estimadas)
        : totalDiasTarea * HORAS_DIA_CAPACITY

    return (
      horasTotales *
      (
        diasDentroVentana /
        totalDiasTarea
      )
    )
  }

  function posicionCapacityTarea(tarea) {
    if (
      diasCapacity.length === 0 ||
      !tarea.fecha_inicio
    ) {
      return null
    }

    const inicioTarea =
      parseDate(tarea.fecha_inicio)

    const finTarea =
      calcularFechaFinDate(
        tarea.fecha_inicio,
        tarea.duracion_dias
      )

    if (!inicioTarea || !finTarea) {
      return null
    }

    const diasVisibles =
      diasCapacity.filter(
        (fecha) =>
          fecha >= inicioTarea &&
          fecha <= finTarea
      )

    if (diasVisibles.length === 0) {
      return null
    }

    const primerDia = diasVisibles[0]

    const indiceInicio =
      diasCapacity.findIndex(
        (fecha) =>
          mismaFecha(fecha, primerDia)
      )

    return {
      left:
        indiceInicio * ANCHO_DIA_CAPACITY,
      width:
        Math.max(
          diasVisibles.length *
            ANCHO_DIA_CAPACITY,
          12
        ),
      inicio: inicioTarea,
      fin: finTarea,
    }
  }


  function horasSuperpuestasDesarrollador(tareasVentana) {
    if (
      !fechaClaveDate ||
      diasCapacity.length === 0
    ) {
      return 0
    }

    let totalSuperpuesto = 0

    diasCapacity.forEach((dia) => {
      const cargasDelDia =
        tareasVentana
          .map((tarea) => {
            const inicioTarea =
              parseDate(tarea.fecha_inicio)

            const finTarea =
              calcularFechaFinDate(
                tarea.fecha_inicio,
                tarea.duracion_dias
              )

            if (
              !inicioTarea ||
              !finTarea ||
              dia < inicioTarea ||
              dia > finTarea
            ) {
              return 0
            }

            const diasHabilesTarea =
              diasHabilesEntre(
                inicioTarea,
                finTarea
              ).length

            if (diasHabilesTarea === 0) {
              return 0
            }

            const horasTotales =
              Number(tarea.horas_estimadas) > 0
                ? Number(tarea.horas_estimadas)
                : diasHabilesTarea *
                  HORAS_DIA_CAPACITY

            return (
              horasTotales /
              diasHabilesTarea
            )
          })
          .filter((horas) => horas > 0)

      if (cargasDelDia.length <= 1) {
        return
      }

      const horasTotalesDia =
        cargasDelDia.reduce(
          (acc, horas) =>
            acc + horas,
          0
        )

      const mayorCargaIndividual =
        Math.max(...cargasDelDia)

      totalSuperpuesto +=
        horasTotalesDia -
        mayorCargaIndividual
    })

    return totalSuperpuesto
  }

  const capacityDesarrolladores = useMemo(() => {
    if (
      !fechaClaveDate ||
      fechaClaveDate < hoyCapacity
    ) {
      return []
    }

    const nombres = Array.from(
      new Set(
        todasLasTareas
          .filter(
            (tarea) =>
              !tarea.es_hito &&
              tarea.estado !== 'Desestimado' &&
              tarea.responsable_desarrollador
          )
          .map(
            (tarea) =>
              tarea.responsable_desarrollador
          )
      )
    ).sort()

    const horasCapacidad =
      diasCapacity.length *
      HORAS_DIA_CAPACITY

    return nombres.map((nombre) => {
      const tareasDev =
        todasLasTareas.filter(
          (tarea) =>
            !tarea.es_hito &&
            tarea.estado !== 'Desestimado' &&
            tarea.responsable_desarrollador ===
              nombre
        )

      const tareasVentana =
        tareasDev.filter(
          (tarea) =>
            posicionCapacityTarea(tarea)
        )

      const horasAsignadas =
        tareasVentana.reduce(
          (acc, tarea) =>
            acc +
            horasTareaEnVentana(tarea),
          0
        )

      const horasDisponibles =
        horasCapacidad -
        horasAsignadas

      const horasSuperpuestas =
        horasSuperpuestasDesarrollador(
          tareasVentana
        )

      const finalizadas =
        tareasVentana.filter(
          (tarea) =>
            tarea.estado === 'Finalizado'
        ).length

      const tareasConPosicion =
        tareasVentana
          .map((tarea) => ({
            tarea,
            posicion:
              posicionCapacityTarea(tarea),
          }))
          .sort(
            (a, b) =>
              a.posicion.inicio -
              b.posicion.inicio
          )

      const finCarriles = []
      const asignaciones = []

      tareasConPosicion.forEach((item) => {
        let carril =
          finCarriles.findIndex(
            (fechaFin) =>
              fechaFin <
              item.posicion.inicio
          )

        if (carril === -1) {
          carril =
            finCarriles.length
          finCarriles.push(
            item.posicion.fin
          )
        } else {
          finCarriles[carril] =
            item.posicion.fin
        }

        asignaciones.push({
          ...item,
          carril,
        })
      })

      return {
        nombre,
        horasCapacidad,
        horasAsignadas,
        horasDisponibles,
        horasSuperpuestas,
        finalizadas,
        totalTareas:
          tareasVentana.length,
        asignaciones,
        rowHeight:
          Math.max(
            72,
            28 +
              Math.max(
                1,
                finCarriles.length
              ) *
                24
          ),
      }
    })
  }, [
    todasLasTareas,
    diasCapacity,
    fechaClaveDate,
    hoyCapacity,
  ])

  function nombreProyectoDeTarea(tarea) {
    return (
      proyectos.find(
        (item) =>
          item.id === tarea.project_id
      )?.nombre ||
      'Sin proyecto'
    )
  }


  function inicioSemana(fecha) {
    const base = fechaSinHora(fecha)
    const dia = base.getDay()
    const diferencia = dia === 0 ? -6 : 1 - dia
    base.setDate(base.getDate() + diferencia)
    return base
  }

  function finSemana(fecha) {
    const inicio = inicioSemana(fecha)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 4)
    return fin
  }

  function sumarDias(fecha, cantidad) {
    const copia = fechaSinHora(fecha)
    copia.setDate(copia.getDate() + cantidad)
    return copia
  }

  function horasTareaEnRango(tarea, inicioRango, finRango) {
    if (
      tarea.es_hito ||
      tarea.estado === 'Desestimado' ||
      !tarea.fecha_inicio ||
      !inicioRango ||
      !finRango
    ) {
      return 0
    }

    const inicioTarea = parseDate(tarea.fecha_inicio)
    const finTarea = calcularFechaFinDate(
      tarea.fecha_inicio,
      tarea.duracion_dias
    )

    if (!inicioTarea || !finTarea) {
      return 0
    }

    const inicioVentana =
      inicioTarea > inicioRango
        ? inicioTarea
        : inicioRango

    const finVentana =
      finTarea < finRango
        ? finTarea
        : finRango

    const totalDiasTarea =
      diasHabilesEntre(
        inicioTarea,
        finTarea
      ).length

    const diasDentro =
      diasHabilesEntre(
        inicioVentana,
        finVentana
      ).length

    if (
      totalDiasTarea === 0 ||
      diasDentro === 0
    ) {
      return 0
    }

    // Si hay horas estimadas manuales, se distribuyen
    // sobre los días hábiles reales de la tarea.
    // Si no hay estimación, usamos 6,5 h por día hábil.
    const horasTotales =
      Number(tarea.horas_estimadas) > 0
        ? Number(tarea.horas_estimadas)
        : totalDiasTarea * HORAS_DIA_CAPACITY

    return (
      horasTotales *
      (diasDentro / totalDiasTarea)
    )
  }

  function desarrolladoresConocidos() {
    const asignados = Array.from(
      new Set(
        todasLasTareas
          .filter(
            (tarea) =>
              !tarea.es_hito &&
              tarea.estado !== 'Desestimado' &&
              tarea.responsable_desarrollador
          )
          .map(
            (tarea) =>
              tarea.responsable_desarrollador
          )
      )
    ).sort()

    if (asignados.length > 0) {
      return asignados
    }

    return perfiles
      .map((perfil) => perfil.nombre)
      .filter(Boolean)
      .sort()
  }

  function ocupacionDesarrolladorEnRango(
    nombre,
    inicio,
    fin,
    excluirTareaId = null
  ) {
    const dias =
      diasHabilesEntre(inicio, fin)

    const capacidad =
      dias.length *
      HORAS_DIA_CAPACITY

    const asignadas =
      todasLasTareas
        .filter(
          (tarea) =>
            !tarea.es_hito &&
            tarea.estado !== 'Desestimado' &&
            tarea.id !== excluirTareaId &&
            tarea.responsable_desarrollador ===
              nombre
        )
        .reduce(
          (acc, tarea) =>
            acc +
            horasTareaEnRango(
              tarea,
              inicio,
              fin
            ),
          0
        )

    return {
      capacidad,
      asignadas,
      disponibles:
        capacidad - asignadas,
      porcentaje:
        capacidad > 0
          ? (asignadas / capacidad) * 100
          : 0,
    }
  }

  function sugerenciaParaTarea(tarea) {
    const desarrolladores =
      desarrolladoresConocidos()

    if (desarrolladores.length === 0) {
      return null
    }

    const inicio =
      hoyCapacity

    const finTarea =
      calcularFechaFinDate(
        tarea.fecha_inicio,
        tarea.duracion_dias
      )

    const fin =
      finTarea && finTarea > inicio
        ? finTarea
        : sumarDias(inicio, 20)

    const horasTarea =
      Number(tarea.horas_estimadas) > 0
        ? Number(tarea.horas_estimadas)
        : Math.max(
            1,
            diasHabilesEntre(
              parseDate(tarea.fecha_inicio),
              finTarea
            ).length
          ) *
          HORAS_DIA_CAPACITY

    const opciones =
      desarrolladores.map((nombre) => {
        const ocupacion =
          ocupacionDesarrolladorEnRango(
            nombre,
            inicio,
            fin,
            tarea.id
          )

        return {
          nombre,
          ...ocupacion,
          disponiblesPost:
            ocupacion.disponibles -
            horasTarea,
        }
      })

    return opciones.sort(
      (a, b) =>
        b.disponiblesPost -
        a.disponiblesPost
    )[0]
  }

  async function asignarBacklog(
    tarea,
    desarrollador
  ) {
    if (!desarrollador) {
      return
    }

    setAsignandoBacklogId(tarea.id)

    const { error } = await supabase
      .from('tasks')
      .update({
        responsable_desarrollador:
          desarrollador,
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', tarea.id)

    if (error) {
      alert(
        `No se pudo asignar: ${error.message}`
      )
      setAsignandoBacklogId(null)
      return
    }

    await supabase
      .from('task_history')
      .insert({
        task_id: tarea.id,
        user_id: session.user.id,
        accion: 'Desarrollador asignado',
        detalle:
          `Se asignó "${tarea.nombre}" a ${desarrollador}`,
      })

    await Promise.all([
      cargarTodasLasTareas(),
      proyecto?.id
        ? cargarTareas(proyecto.id)
        : Promise.resolve(),
    ])

    setAsignandoBacklogId(null)
  }

  const backlogSinAsignar = useMemo(() => {
    return todasLasTareas
      .filter(
        (tarea) =>
          !tarea.es_hito &&
          !tarea.responsable_desarrollador &&
          !['Finalizado', 'Desestimado'].includes(
            tarea.estado
          )
      )
      .sort(
        (a, b) =>
          parseDate(a.fecha_inicio) -
          parseDate(b.fecha_inicio)
      )
  }, [todasLasTareas])

  function colorHeatmap(porcentaje) {
    const valor = Math.max(0, porcentaje)

    if (valor === 0) {
      return 'hsl(210 18% 24%)'
    }

    if (valor <= 20) {
      return 'hsl(145 58% 31%)'
    }

    if (valor <= 40) {
      return 'hsl(145 62% 45%)'
    }

    if (valor <= 60) {
      return 'hsl(48 90% 52%)'
    }

    if (valor <= 80) {
      return 'hsl(28 92% 50%)'
    }

    if (valor <= 100) {
      return 'hsl(354 78% 52%)'
    }

    const exceso =
      Math.min(
        4,
        Math.floor((valor - 100) / 20)
      )

    return `hsl(278 58% ${
      52 - exceso * 5
    }%)`
  }

  const semanasHeatmap = useMemo(() => {
    const [anio, mes] =
      mesHeatmap
        .split('-')
        .map(Number)

    if (!anio || !mes) {
      return []
    }

    const primerDiaMes =
      new Date(anio, mes - 1, 1)

    const ultimoDiaMes =
      new Date(anio, mes, 0)

    const semanas = []
    let cursor =
      inicioSemana(primerDiaMes)

    while (cursor <= ultimoDiaMes) {
      const inicio = new Date(cursor)
      const fin = finSemana(cursor)

      const inicioUtil =
        inicio < primerDiaMes
          ? primerDiaMes
          : inicio

      const finUtil =
        fin > ultimoDiaMes
          ? ultimoDiaMes
          : fin

      const dias =
        diasHabilesEntre(
          inicioUtil,
          finUtil
        )

      if (dias.length > 0) {
        semanas.push({
          inicio: inicioUtil,
          fin: finUtil,
          dias,
          etiqueta:
            `${inicioUtil.toLocaleDateString(
              'es-AR',
              {
                day: '2-digit',
                month: '2-digit',
              }
            )} - ${finUtil.toLocaleDateString(
              'es-AR',
              {
                day: '2-digit',
                month: '2-digit',
              }
            )}`,
        })
      }

      cursor =
        sumarDias(cursor, 7)
    }

    return semanas
  }, [mesHeatmap])

  const heatmapDesarrolladores = useMemo(() => {
    return desarrolladoresConocidos()
      .map((nombre) => ({
        nombre,
        semanas:
          semanasHeatmap.map((semana) => {
            const diasHabilesSemana =
              semana.dias.length

            let diasTareaAsignados = 0
            let diasConOcupacion = 0

            semana.dias.forEach((dia) => {
              const tareasDelDia =
                todasLasTareas.filter(
                  (tarea) => {
                    if (
                      tarea.es_hito ||
                      tarea.estado === 'Desestimado' ||
                      tarea.responsable_desarrollador !==
                        nombre ||
                      !tarea.fecha_inicio
                    ) {
                      return false
                    }

                    const inicioTarea =
                      parseDate(
                        tarea.fecha_inicio
                      )

                    const finTarea =
                      calcularFechaFinDate(
                        tarea.fecha_inicio,
                        tarea.duracion_dias
                      )

                    if (
                      !inicioTarea ||
                      !finTarea
                    ) {
                      return false
                    }

                    return (
                      dia >= inicioTarea &&
                      dia <= finTarea
                    )
                  }
                )

              if (tareasDelDia.length > 0) {
                diasConOcupacion += 1
              }

              diasTareaAsignados +=
                tareasDelDia.length
            })

            const porcentaje =
              diasHabilesSemana > 0
                ? (
                    diasTareaAsignados /
                    diasHabilesSemana
                  ) * 100
                : 0

            const diasSuperpuestos =
              Math.max(
                0,
                diasTareaAsignados -
                  diasConOcupacion
              )

            return {
              ...semana,
              diasHabilesSemana,
              diasTareaAsignados,
              diasConOcupacion,
              diasSuperpuestos,
              porcentaje,
            }
          }),
      }))
  }, [
    todasLasTareas,
    semanasHeatmap,
    perfiles,
  ])

  const inicioSemanaActual = useMemo(() => {
    const inicio =
      inicioSemana(new Date())

    return sumarDias(
      inicio,
      offsetSemana * 7
    )
  }, [offsetSemana])

  const diasSemanaActual = useMemo(() => {
    return Array.from(
      { length: 5 },
      (_, indice) =>
        sumarDias(
          inicioSemanaActual,
          indice
        )
    )
  }, [inicioSemanaActual])

  const semanaDesarrolladores = useMemo(() => {
    const fin =
      diasSemanaActual[
        diasSemanaActual.length - 1
      ]

    return desarrolladoresConocidos()
      .map((nombre) => {
        const tareas =
          todasLasTareas.filter(
            (tarea) =>
              !tarea.es_hito &&
              tarea.estado !== 'Desestimado' &&
              tarea.responsable_desarrollador ===
                nombre &&
              horasTareaEnRango(
                tarea,
                inicioSemanaActual,
                fin
              ) > 0
          )

        const dias =
          diasSemanaActual.map((dia) => {
            const tareasDia =
              tareas
                .filter(
                  (tarea) =>
                    horasTareaEnRango(
                      tarea,
                      dia,
                      dia
                    ) > 0
                )
                .map((tarea) => ({
                  tarea,
                  horas:
                    horasTareaEnRango(
                      tarea,
                      dia,
                      dia
                    ),
                }))

            const asignadas =
              tareasDia.reduce(
                (acc, item) =>
                  acc + item.horas,
                0
              )

            return {
              fecha: dia,
              asignadas,
              disponibles:
                HORAS_DIA_CAPACITY -
                asignadas,
              porcentaje:
                (asignadas /
                  HORAS_DIA_CAPACITY) *
                100,
              tareasDia,
            }
          })

        return {
          nombre,
          tareas,
          dias,
          totalAsignado:
            dias.reduce(
              (acc, dia) =>
                acc + dia.asignadas,
              0
            ),
        }
      })
  }, [
    todasLasTareas,
    diasSemanaActual,
    inicioSemanaActual,
    perfiles,
  ])

  const dashboardProyectos = useMemo(() => {
    return proyectos.map((proyectoItem) => {
      const tareasProyecto =
        todasLasTareas.filter(
          (tarea) =>
            tarea.project_id === proyectoItem.id &&
            tarea.estado !== 'Desestimado'
        )

      const total = tareasProyecto.length

      const finalizadas =
        tareasProyecto.filter(
          (tarea) =>
            tarea.estado === 'Finalizado'
        ).length

      const enCurso =
        tareasProyecto.filter(
          (tarea) =>
            tarea.estado === 'En curso'
        ).length

      const vencidas =
        tareasProyecto.filter(
          (tarea) => estaAtrasada(tarea)
        ).length

      const bloqueadas =
        tareasProyecto.filter(
          (tarea) =>
            tarea.estado === 'Bloqueado'
        ).length

      const avance =
        total === 0
          ? 0
          : Math.round(
              tareasProyecto.reduce(
                (acc, tarea) =>
                  acc + calcularAvance(tarea),
                0
              ) / total
            )

      const hitosPendientes =
        tareasProyecto
          .filter(
            (tarea) =>
              tarea.es_hito &&
              tarea.estado !== 'Finalizado' &&
              tarea.fecha_inicio
          )
          .sort(
            (a, b) =>
              parseDate(a.fecha_inicio) -
              parseDate(b.fecha_inicio)
          )

      const proximoHito =
        hitosPendientes[0] || null

      const fechasFin =
        tareasProyecto
          .map((tarea) =>
            calcularFechaFinDate(
              tarea.fecha_inicio,
              tarea.duracion_dias
            )
          )
          .filter(Boolean)

      const fechaFin =
        fechasFin.length > 0
          ? new Date(
              Math.max(
                ...fechasFin.map(
                  (fecha) => fecha.getTime()
                )
              )
            )
          : null

      return {
        ...proyectoItem,
        total,
        finalizadas,
        enCurso,
        vencidas,
        bloqueadas,
        avance,
        proximoHito,
        fechaFin,
      }
    })
  }, [proyectos, todasLasTareas])

  const metricasGlobales = useMemo(() => {
    const totalProyectos =
      dashboardProyectos.length

    const activos =
      dashboardProyectos.filter(
        (proyectoItem) =>
          proyectoItem.estado !== 'Finalizado'
      ).length

    const tareasContabilizables =
      todasLasTareas.filter(
        (tarea) =>
          tarea.estado !== 'Desestimado'
      )

    const totalTareas =
      tareasContabilizables.length

    const vencidas =
      tareasContabilizables.filter(
        (tarea) => estaAtrasada(tarea)
      ).length

    const bloqueadas =
      tareasContabilizables.filter(
        (tarea) =>
          tarea.estado === 'Bloqueado'
      ).length

    const avancePromedio =
      totalTareas === 0
        ? 0
        : Math.round(
            tareasContabilizables.reduce(
              (acc, tarea) =>
                acc + calcularAvance(tarea),
              0
            ) / totalTareas
          )

    return {
      totalProyectos,
      activos,
      totalTareas,
      vencidas,
      bloqueadas,
      avancePromedio,
    }
  }, [dashboardProyectos, todasLasTareas])

  function abrirProyectoDesdeDashboard(projectId) {
    setProyectoSeleccionadoId(projectId)
    setVista('gantt')
  }


  useEffect(() => {
    if (
      session &&
      vistaPrincipal === 'cards'
    ) {
      cargarBoards()
    }
  }, [session, vistaPrincipal])

  useEffect(() => {
    if (
      session &&
      vistaPrincipal === 'cards'
    ) {
      cargarCards(boardSeleccionadoId)
      cargarCardsArchivadas(boardSeleccionadoId)
      cargarBoardZones(boardSeleccionadoId)
      cargarCardLinks(boardSeleccionadoId)
    }
  }, [
    session,
    vistaPrincipal,
    boardSeleccionadoId,
  ])

  useEffect(() => {
    if (session && vistaPrincipal === 'process') {
      cargarProcessMaps()
      cargarProcessMapsArchivados()
    }
  }, [session, vistaPrincipal])

  useEffect(() => {
    if (session && vistaPrincipal === 'process') {
      cargarProcessCanvas(processSeleccionadoId)
      setProcessConnectSource(null)
    }
  }, [session, vistaPrincipal, processSeleccionadoId])

  const processSeleccionado = processMaps.find(
    (item) => item.id === processSeleccionadoId
  )

  const processCanvasBgActual =
    processSeleccionado?.canvas_bg || '#0b1220'

  const boardSeleccionado = boards.find(
    (item) => item.id === boardSeleccionadoId
  )

  const boardCanvasBgActual =
    boardSeleccionado?.canvas_bg || '#5d6670'

  if (loading) {
    return (
      <div className="login-screen">
        Cargando...
      </div>
    )
  }

  if (!session) {
    return (
      <div className="login-screen">
        <div className="login-card">

          <div className="login-logo image-logo">
  <img src={logoGP} alt="Grupo Petersen" />
</div>

          <h1>Grupo Petersen</h1>

<p>
  Gestión colaborativa de proyectos
</p>

          <form onSubmit={login}>

            <label>Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <label>Contraseña</label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            {loginError && (
              <div className="login-error">
                {loginError}
              </div>
            )}

            <button
              className="btn-primary login-button"
            >
              Ingresar
            </button>

          </form>

        </div>
      </div>
    )
  }

  const hoyPos = posicionHoy()

  return (
    <div className="app-shell">
      <aside className="visual-sidebar">
        <a
          href="https://www.grupopetersen.com.ar/inicio"
          target="_blank"
          rel="noreferrer"
          className="visual-sidebar-gp"
          title="Grupo Petersen"
          aria-label="Abrir Grupo Petersen"
        >
          <img
            src={logoGP}
            alt="Grupo Petersen"
          />
        </a>

        <div className="visual-sidebar-divider" />

        <button
          type="button"
          className={
            vistaPrincipal === 'gantt'
              ? 'visual-sidebar-icon-button active'
              : 'visual-sidebar-icon-button'
          }
          onClick={() => setVistaPrincipal('gantt')}
          title="Gantt"
          aria-label="Gantt"
        >
          <img
            src={ganttIcon}
            alt=""
            className="visual-sidebar-user-icon"
          />
        </button>

        <button
          type="button"
          className={
            vistaPrincipal === 'cards'
              ? 'visual-sidebar-icon-button active'
              : 'visual-sidebar-icon-button'
          }
          onClick={() => setVistaPrincipal('cards')}
          title="Boards / Cards"
          aria-label="Boards / Cards"
        >
          <img
            src={cardsIcon}
            alt=""
            className="visual-sidebar-user-icon"
          />
        </button>

        <button
          type="button"
          className={
            vistaPrincipal === 'process'
              ? 'visual-sidebar-icon-button active'
              : 'visual-sidebar-icon-button'
          }
          onClick={() => setVistaPrincipal('process')}
          title="Process"
          aria-label="Process"
        >
          <img
            src={processIcon}
            alt=""
            className="visual-sidebar-user-icon"
          />
        </button>
      </aside>

      <div className="app app-main">

      <header className="topbar">

        <div className="brand-area brand-area-project">
          <div>
            <h1>
              {vistaPrincipal === 'cards'
                ? 'Boards'
                : vistaPrincipal === 'process'
                  ? 'Process'
                  : 'Gestión de proyectos'}
            </h1>

            <p>
              {vistaPrincipal === 'cards'
                ? 'Canvas colaborativo'
                : vistaPrincipal === 'process'
                  ? 'Mapeo simple de procesos'
                  : `Proyecto: ${
                    proyectoSeleccionadoId === '__all__'
                      ? 'Todos los proyectos'
                      : proyecto?.nombre || 'Sin proyecto'
                  }`}
            </p>
          </div>
        </div>

        <div className="top-actions">

          <span className="user-email">
            {session.user.email}
          </span>

          <button
            className="btn-secondary"
            onClick={logout}
          >
            Salir
          </button>

          {vistaPrincipal === 'gantt' && (
            <button
              className="btn-primary"
              onClick={abrirNuevaTarea}
              disabled={
                proyectoSeleccionadoId === '__all__'
              }
              title={
                proyectoSeleccionadoId === '__all__'
                  ? 'Seleccioná un proyecto para crear una tarea'
                  : 'Crear nueva tarea'
              }
            >
              + Nueva tarea
            </button>
          )}

        </div>

      </header>

      {vistaPrincipal === 'gantt' && (
        <>
      <section className="filters">

        <div className="project-selector-group">

  <select
    className="project-selector"
    value={proyectoSeleccionadoId}
    onChange={(e) =>
      setProyectoSeleccionadoId(e.target.value)
    }
  >
    <option value="__all__">
      Todos los proyectos
    </option>

    {proyectos.map((proyectoItem) => (

      <option
        key={proyectoItem.id}
        value={proyectoItem.id}
      >
        {proyectoItem.nombre}
      </option>

    ))}

  </select>

  <button
    type="button"
    className="new-project-button"
    onClick={() =>
      setModalProyectoOpen(true)
    }
  >
    + Proyecto
  </button>

</div>

        {proyectoSeleccionadoId !== '__all__' && (
          <>
        <select
          value={filtroResponsable}
          onChange={(e) =>
            setFiltroResponsable(e.target.value)
          }
        >
          <option value="Todos">
            Todos los responsables
          </option>

          {responsables.map((responsable) => (
            <option
              key={responsable}
              value={responsable}
            >
              {responsable}
            </option>
          ))}
        </select>

<select
  value={filtroPrioridad}
  onChange={(e) =>
    setFiltroPrioridad(e.target.value)
  }
>
  <option value="Todas">
    Todas las prioridades
  </option>

  <option value="Alta">
    Alta
  </option>

  <option value="Media">
    Media
  </option>

  <option value="Baja">
    Baja
  </option>
</select>

        <select
          value={filtroEstado}
          onChange={(e) =>
            setFiltroEstado(e.target.value)
          }
        >
          <option value="Todos">
            Todos los estados
          </option>

          <option>Pendiente</option>
          <option>En curso</option>
          <option>Finalizado</option>
          <option>Desestimado</option>
          <option>Vencido</option>
          <option>Bloqueado</option>
        </select>

        <div className="view-buttons">

          <button
            className={vista === 'gantt' ? 'active' : ''}
            onClick={() =>
              setVista('gantt')
            }
          >
            Gantt
          </button>

          <button
            className={vista === 'tabla' ? 'active' : ''}
            onClick={() =>
              setVista('tabla')
            }
          >
            Tabla
          </button>

          <button
            className={vista === 'capacity' ? 'active' : ''}
            onClick={() =>
              setVista('capacity')
            }
          >
            Capacity
          </button>

          <button
            className={vista === 'heatmap' ? 'active' : ''}
            onClick={() =>
              setVista('heatmap')
            }
          >
            Heatmap
          </button>

          <button
            className={vista === 'backlog' ? 'active' : ''}
            onClick={() =>
              setVista('backlog')
            }
          >
            Backlog
          </button>

          <button
            className={vista === 'semana' ? 'active' : ''}
            onClick={() =>
              setVista('semana')
            }
          >
            Semana
          </button>

{vista === 'tabla' && (
            <div className="export-actions">
              <button
                type="button"
                className="export-button"
                onClick={exportarCSV}
              >
                Exportar Excel
              </button>
            </div>
          )}

        </div>
          </>
        )}

      </section>

      {proyectoSeleccionadoId === '__all__' ? (
        <section className="kpis global-kpis">
          <div className="kpi">
            <span>Proyectos</span>
            <strong>{metricasGlobales.totalProyectos}</strong>
            <small>{metricasGlobales.activos} activos</small>
          </div>

          <div className="kpi green">
            <span>Total tareas</span>
            <strong>{metricasGlobales.totalTareas}</strong>
            <small>Todos los proyectos</small>
          </div>

          <div className="kpi orange">
            <span>Vencidas</span>
            <strong>{metricasGlobales.vencidas}</strong>
            <small>Requieren seguimiento</small>
          </div>

          <div className="kpi purple">
            <span>Bloqueadas</span>
            <strong>{metricasGlobales.bloqueadas}</strong>
            <small>Con impedimentos</small>
          </div>

          <div className="kpi pink">
            <span>Avance promedio</span>
            <strong>{metricasGlobales.avancePromedio}%</strong>
            <small>Cartera completa</small>
          </div>
        </section>
      ) : (
      <section className="kpis">

        <div className="kpi">
          <span>Total tareas</span>
          <strong>{metricas.total}</strong>
          <small>Todas las tareas</small>
        </div>

        <div className="kpi green">
          <span>Finalizadas</span>
          <strong>{metricas.finalizadas}</strong>
          <small>Tareas terminadas</small>
        </div>

        <div className="kpi purple">
          <span>En curso</span>
          <strong>{metricas.enCurso}</strong>
          <small>Tareas activas</small>
        </div>

        <div className="kpi orange">
          <span>Atrasadas</span>
          <strong>{metricas.atrasadas}</strong>
          <small>Fuera de fecha</small>
        </div>

        <div className="kpi pink">
          <span>Avance proyecto</span>
          <strong>{metricas.promedio}%</strong>
          <small>Avance automático</small>
        </div>

      </section>
      )}

      {proyectoSeleccionadoId === '__all__' && (
        <section className="portfolio-dashboard">
          <div className="portfolio-header">
            <div>
              <span className="portfolio-eyebrow">
                Vista ejecutiva
              </span>

              <h2>Todos los proyectos</h2>

              <p>
                Resumen general de avance, vencimientos, bloqueos e hitos.
              </p>
            </div>
          </div>

          <div className="portfolio-table-header">
            <div>Proyecto</div>
            <div>Estado</div>
            <div>Tareas</div>
            <div>Finalizadas</div>
            <div>En curso</div>
            <div>Vencidas</div>
            <div>Bloqueadas</div>
            <div>Avance</div>
            <div>Próximo hito</div>
            <div>Fin estimado</div>
          </div>

          <div className="portfolio-list">
            {dashboardProyectos.map(
              (proyectoItem) => (
                <div
                  className="portfolio-row"
                  key={proyectoItem.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    abrirProyectoDesdeDashboard(
                      proyectoItem.id
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' ||
                      event.key === ' '
                    ) {
                      abrirProyectoDesdeDashboard(
                        proyectoItem.id
                      )
                    }
                  }}
                  title={`Abrir ${proyectoItem.nombre}`}
                >
                  <div className="portfolio-project">
                    <span className="portfolio-project-dot" />
                    <strong>
                      {proyectoItem.nombre}
                    </strong>
                  </div>

                  <div>
                    <span className="portfolio-status">
                      {proyectoItem.estado || 'En curso'}
                    </span>
                  </div>

                  <div className="portfolio-number">
                    {proyectoItem.total}
                  </div>

                  <div className="portfolio-number done">
                    {proyectoItem.finalizadas}
                  </div>

                  <div className="portfolio-number progress">
                    {proyectoItem.enCurso}
                  </div>

                  <div className="portfolio-number late">
                    {proyectoItem.vencidas}
                  </div>

                  <div className="portfolio-number blocked">
                    {proyectoItem.bloqueadas}
                  </div>

                  <div>
                    <div className="portfolio-progress-cell">
                      <div className="portfolio-progress-track">
                        <div
                          className="portfolio-progress-fill"
                          style={{
                            width: `${proyectoItem.avance}%`,
                          }}
                        />
                      </div>

                      <span>
                        {proyectoItem.avance}%
                      </span>
                    </div>
                  </div>

                  <div className="portfolio-milestone">
                    {proyectoItem.proximoHito ? (
                      <>
                        <strong>
                          {proyectoItem.proximoHito.nombre}
                        </strong>

                        <span>
                          {parseDate(
                            proyectoItem.proximoHito.fecha_inicio
                          )?.toLocaleDateString('es-AR')}
                        </span>
                      </>
                    ) : (
                      <span>Sin hitos pendientes</span>
                    )}
                  </div>

                  <div className="portfolio-end-date">
                    {proyectoItem.fechaFin
                      ? proyectoItem.fechaFin.toLocaleDateString(
                          'es-AR'
                        )
                      : '—'}
                  </div>
                </div>
              )
            )}

            {dashboardProyectos.length === 0 && (
              <div className="empty-state">
                <h3>No hay proyectos</h3>
                <p>
                  Creá el primer proyecto para comenzar.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {proyectoSeleccionadoId !== '__all__' && vista === 'gantt' && (
        <>
          <section className="gantt-navigation">
            <div className="gantt-period-title">
              <span>Período visualizado</span>

              <strong>
                Año {anioVisualizado}
              </strong>
            </div>

            <div className="gantt-nav-right">
              <button
                type="button"
                className="gantt-scroll-button"
                onClick={() => moverGantt('izquierda')}
                title="Mover Gantt hacia la izquierda"
              >
                ←
              </button>

              <button
                className="today-button"
                onClick={irAHoy}
              >
                Hoy
              </button>

              <select
                className="year-picker"
                value={anioVisualizado}
                onChange={(e) =>
                  cambiarAnio(e.target.value)
                }
              >
                {Array.from(
                  { length: 7 },
                  (_, indice) =>
                    hoyReal.getFullYear() - 2 + indice
                ).map((anio) => (
                  <option
                    key={anio}
                    value={anio}
                  >
                    {anio}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="gantt-scroll-button"
                onClick={() => moverGantt('derecha')}
                title="Mover Gantt hacia la derecha"
              >
                →
              </button>
            </div>
          </section>

          <main className="workspace gantt-workspace">

            <section className="task-panel">

              <div className="section-title">
                <h2>Tareas</h2>

                <span>
                  {tareasVisualesGantt.length} visibles · {tareas.length} totales
                </span>
              </div>

              <div className="table-header task-grid">

                <div>Tarea</div>
                <div aria-label="Estado"></div>
                <div>Equipo</div>
                <div>Inicio</div>
                <div>Días</div>
                <div>Acciones</div>

              </div>

              {tareasVisualesGantt.map((tarea) => (

                <div
  className={`task-grid task-row ${
    posicionBarra(tarea)
      ? ''
      : 'task-outside-month'
  } ${
    tarea.hito_padre_id
      ? 'task-child-row'
      : ''
  } ${
    tarea.es_hito
      ? 'task-hito-row'
      : ''
  }`}
  key={tarea.id}
>

                  <div
                    className={`task-title-with-priority ${
                      tarea.es_hito
                        ? 'task-title-hito'
                        : ''
                    }`}
                  >
  <span
    className={`priority-icon ${tarea.prioridad?.toLowerCase()}`}
    title={`Prioridad ${tarea.prioridad || 'Media'}`}
  >
    {tarea.prioridad === 'Alta' && '▲'}
    {tarea.prioridad === 'Media' && '●'}
    {tarea.prioridad === 'Baja' && '▼'}
  </span>

  {tarea.hito_padre_id && !tarea.es_hito && (
    <span
      className="task-child-arrow"
      title="Tarea vinculada a un hito"
    >
      ↳
    </span>
  )}

  {tarea.es_hito && (
    <span className="hito-label">
      HITO
    </span>
  )}

  <span
    className="task-name-text"
    title={tarea.nombre}
  >
    {tarea.es_hito
      ? tarea.nombre.toUpperCase()
      : tarea.nombre}
  </span>

  {tarea.comentario?.trim() && (
    <button
      type="button"
      className="task-comment-icon"
      title={tarea.comentario}
      onClick={() =>
        window.alert(tarea.comentario)
      }
      aria-label={`Ver comentario de ${tarea.nombre}`}
    >
      💬
    </button>
  )}
</div>

                  <div className="status-dot-cell">
                    <span
                      className={`status-dot ${claseEstadoPunto(tarea)}`}
                      title={estadoVisual(tarea)}
                      aria-label={`Estado: ${estadoVisual(tarea)}`}
                    />
                  </div>

                  {tarea.hito_padre_id && (
                    <span className="task-parent-hito">
                      {tareas.find(
                        (hito) =>
                          hito.id === tarea.hito_padre_id
                      )?.nombre || 'Hito'}
                    </span>
                  )}

                  <div className="task-responsibles">
                    {tarea.es_hito ? (
                      <>
                        <span>
                          <b>Tareas:</b>{' '}
                          {tareasDelHito(tarea.id).length}
                        </span>
                        <span>
                          <b>Estado:</b>{' '}
                          {estadoHito(tarea)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          <b>A:</b>{' '}
                          {tarea.responsable_analista ||
                            tarea.responsable ||
                            '—'}
                        </span>
                        <span>
                          <b>D:</b>{' '}
                          {tarea.responsable_desarrollador ||
                            '—'}
                        </span>
                      </>
                    )}
                  </div>

                  <div>
                    {parseDate(
                      tarea.fecha_inicio
                    )?.toLocaleDateString('es-AR')}
                  </div>

                  <div>
                    {tarea.es_hito
                      ? (
                          fechaFinHito(tarea)
                            ? Math.max(
                                1,
                                Math.floor(
                                  (
                                    fechaFinHito(tarea) -
                                    parseDate(tarea.fecha_inicio)
                                  ) /
                                  86400000
                                ) + 1
                              )
                            : 1
                        )
                      : tarea.duracion_dias}
                  </div>

                  <div className="row-actions">

                    <button
                      className="mini-button edit"
                      onClick={() =>
                        abrirEditar(tarea)
                      }
                    >
                      ✎
                    </button>

                    {estadoVisual(tarea) !== 'Finalizado' && (
                      <button
                        className="mini-button success"
                        onClick={() =>
                          finalizarTarea(tarea)
                        }
                        title={
                          tarea.es_hito
                            ? 'Finalizar hito cuando todas sus tareas estén finalizadas'
                            : 'Finalizar tarea'
                        }
                      >
                        ✓
                      </button>
                    )}

                  </div>

                </div>

              ))}

            </section>

            <section className="gantt-panel dynamic-gantt">
              <div className="gantt-title-row">
                <div className="gantt-title-left">
                  <h2>Gantt de seguimiento</h2>

                  <div className="gantt-legend">
                    <span className="legend-chip pendiente">
                      <i />
                      Pendiente
                    </span>

                    <span className="legend-chip en-curso">
                      <i />
                      En curso
                    </span>

                    <span className="legend-chip finalizado">
                      <i />
                      Finalizado
                    </span>

                    <span className="legend-chip vencido">
                      <i />
                      Vencido
                    </span>

                    <span className="legend-chip bloqueado">
                      <i />
                      Bloqueado
                    </span>
                  </div>
                </div>

                <div className="gantt-title-scroll-controls">
                  <button
                    type="button"
                    className="gantt-scroll-button"
                    onClick={() => moverGantt('izquierda')}
                    title="Mover Gantt hacia la izquierda"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    className="gantt-scroll-button"
                    onClick={() => moverGantt('derecha')}
                    title="Mover Gantt hacia la derecha"
                  >
                    →
                  </button>
                </div>

              </div>

              <div
                className="gantt-horizontal-scroll"
                ref={ganttScrollRef}
              >
                <div
                  className="gantt-year-canvas"
                  style={{
                    width: `${anchoGanttAnio}px`,
                    minWidth: `${anchoGanttAnio}px`,
                  }}
                >
                  <div
                    className="days-header year-days-header"
                    style={{
                      gridTemplateColumns:
                        `repeat(${diasHabilesAnio.length}, ${ANCHO_DIA_GANTT}px)`,
                    }}
                  >
                    {diasHabilesAnio.map((fecha, indice) => {
                      const primerDiaMes =
                        indice === 0 ||
                        fecha.getMonth() !==
                          diasHabilesAnio[indice - 1].getMonth()

                      return (
                        <div
                          key={fecha.toISOString()}
                          className={`day-header ${
                            primerDiaMes
                              ? 'month-start'
                              : ''
                          }`}
                        >
                          {primerDiaMes && (
                            <span className="month-label">
                              {nombreMesCorto(fecha)}
                            </span>
                          )}

                          <span>
                            {inicialDiaSemanaFecha(fecha)}
                          </span>

                          <strong>
                            {fecha.getDate()}
                          </strong>
                        </div>
                      )
                    })}
                  </div>

                  <div
                    className="dynamic-gantt-body"
                    style={{
                      width: `${anchoGanttAnio}px`,
                      minWidth: `${anchoGanttAnio}px`,
                    }}
                  >
                    {hoyPos !== null && (
                      <div
                        className="today-line-real"
                        style={{
                          left: `${hoyPos}px`,
                        }}
                      >
                        <span>HOY</span>
                      </div>
                    )}

                    {tareasVisualesGantt.map((tarea) => {
                      const posicion =
                        posicionBarra(tarea)

                      return (
                        <div
                          className={`dynamic-gantt-row ${
                            tarea.hito_padre_id
                              ? 'gantt-child-row'
                              : ''
                          } ${
                            tarea.es_hito
                              ? 'gantt-hito-row'
                              : ''
                          }`}
                          key={tarea.id}
                        >
                          <div
                            className="day-background-grid"
                            style={{
                              gridTemplateColumns:
                                `repeat(${diasHabilesAnio.length}, ${ANCHO_DIA_GANTT}px)`,
                            }}
                          >
                            {diasHabilesAnio.map((fecha, indice) => {
                              const primerDiaMes =
                                indice === 0 ||
                                fecha.getMonth() !==
                                  diasHabilesAnio[indice - 1].getMonth()

                              return (
                                <div
                                  key={fecha.toISOString()}
                                  className={`day-cell ${
                                    primerDiaMes
                                      ? 'month-start'
                                      : ''
                                  }`}
                                />
                              )
                            })}
                          </div>

                          {posicion && (
                            tarea.es_hito
                              ? (
                                <div
                                  className="bar dynamic-bar bar-hito"
                                  style={posicion}
                                  title={`${tarea.nombre} · ${formatoFecha(
                                    fechaFinHito(tarea)
                                  )}`}
                                >
                                  HITO · {calcularAvanceHito(tarea)}%
                                </div>
                              )
                              : (
                                <div
                                  className={`bar dynamic-bar ${colorBarra(
                                    tarea
                                  )}`}
                                  style={posicion}
                                  title={`${tarea.nombre} · ${calcularFin(
                                    tarea.fecha_inicio,
                                    tarea.duracion_dias
                                  )}`}
                                >
                                  {calcularAvance(tarea)}%
                                </div>
                              )
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

          </main>
        </>
      )}

      {proyectoSeleccionadoId !== '__all__' && vista === 'tabla' && (
        <section className="table-view">
          <div className="section-title">
            <h2>Lista de tareas</h2>
            <span>
              {tareasFiltradas.length} de {tareas.length}
            </span>
          </div>

          <div className="table-header task-grid">
            <div>Tarea</div>
            <div aria-label="Estado"></div>
            <div>Equipo</div>
            <div>Inicio</div>
            <div>Días</div>
            <div>Fin estimado</div>
            <div>Fin real</div>
            <div>Desvío</div>
            <div>Acciones</div>
          </div>

          {tareasVisuales.map((tarea) => (
            <div
              className={`task-grid task-row ${
                tarea.hito_padre_id
                  ? 'task-child-row'
                  : ''
              } ${
                tarea.es_hito
                  ? 'task-hito-row'
                  : ''
              }`}
              key={tarea.id}
            >
              <div>
                <div
                  className={`task-title-with-priority ${
                    tarea.es_hito
                      ? 'task-title-hito'
                      : ''
                  }`}
                >
                  <span
                    className={`priority-icon ${tarea.prioridad?.toLowerCase()}`}
                    title={`Prioridad ${tarea.prioridad || 'Media'}`}
                  >
                    {tarea.prioridad === 'Alta' && '▲'}
                    {tarea.prioridad === 'Media' && '●'}
                    {tarea.prioridad === 'Baja' && '▼'}
                  </span>

                  {tarea.hito_padre_id && !tarea.es_hito && (
                    <span
                      className="task-child-arrow"
                      title="Tarea vinculada a un hito"
                    >
                      ↳
                    </span>
                  )}

                  {tarea.es_hito && (
                    <span className="hito-label">
                      HITO
                    </span>
                  )}

                  <span
    className="task-name-text"
    title={tarea.nombre}
  >
    {tarea.es_hito
      ? tarea.nombre.toUpperCase()
      : tarea.nombre}
  </span>

                  {tarea.comentario?.trim() && (
                    <button
                      type="button"
                      className="task-comment-icon"
                      title={tarea.comentario}
                      onClick={() =>
                        window.alert(tarea.comentario)
                      }
                      aria-label={`Ver comentario de ${tarea.nombre}`}
                    >
                      💬
                    </button>
                  )}
                </div>

                {tarea.dependencia_id && (
                  <span className="dependencia-text">
                    Depende de: {nombreDependencia(tarea)}
                  </span>
                )}
              </div>

              <div className="status-dot-cell">
                <span
                  className={`status-dot ${claseEstadoPunto(tarea)}`}
                  title={estadoVisual(tarea)}
                  aria-label={`Estado: ${estadoVisual(tarea)}`}
                />
              </div>

              <div className="task-responsibles">
                {tarea.es_hito ? (
                  <>
                    <span>
                      <b>Tareas:</b>{' '}
                      {tareasDelHito(tarea.id).length}
                    </span>
                    <span>
                      <b>Estado:</b>{' '}
                      {estadoHito(tarea)}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      <b>A:</b>{' '}
                      {tarea.responsable_analista ||
                        tarea.responsable ||
                        '—'}
                    </span>
                    <span>
                      <b>D:</b>{' '}
                      {tarea.responsable_desarrollador ||
                        '—'}
                    </span>
                  </>
                )}
              </div>

              <div>
                {parseDate(
                  tarea.fecha_inicio
                )?.toLocaleDateString('es-AR')}
              </div>

              <div>{tarea.duracion_dias}</div>

              <div className="task-date-cell">
                {tarea.es_hito
                  ? (
                      fechaFinHito(tarea)
                        ?.toLocaleDateString('es-AR') ||
                      '—'
                    )
                  : (
                      calcularFechaFinDate(
                        tarea.fecha_inicio,
                        tarea.duracion_dias
                      )?.toLocaleDateString('es-AR') ||
                      '—'
                    )}
              </div>

              <div className="task-date-cell">
                {fechaFinRealTarea(tarea)
                  ?.toLocaleDateString('es-AR') ||
                  '—'}
              </div>

              <div
                className={`task-deviation ${
                  desvioTarea(tarea) === null
                    ? ''
                    : desvioTarea(tarea) > 0
                      ? 'late'
                      : desvioTarea(tarea) < 0
                        ? 'early'
                        : 'on-time'
                }`}
                title="Desvío en días hábiles: Fin real - Fin estimado"
              >
                {desvioTarea(tarea) === null
                  ? '—'
                  : desvioTarea(tarea) === 0
                    ? '0'
                    : desvioTarea(tarea) > 0
                      ? `+${desvioTarea(tarea)}`
                      : desvioTarea(tarea)}
              </div>

              <div className="row-actions">
                <button
                  className="mini-button edit"
                  onClick={() => abrirEditar(tarea)}
                  title="Editar"
                >
                  ✎
                </button>

                {tarea.estado !== 'Finalizado' && (
                  <button
                    className="mini-button success"
                    onClick={() => finalizarTarea(tarea)}
                    title="Finalizar"
                  >
                    ✓
                  </button>
                )}

              </div>
            </div>
          ))}

          {tareasFiltradas.length === 0 && (
            <div className="empty-state">
              <h3>No hay tareas</h3>
              <p>No hay tareas que coincidan con los filtros seleccionados.</p>
            </div>
          )}
        </section>
      )}



      {vista === 'heatmap' && (
        <section className="planning-section">
          <div className="planning-toolbar">
            <div>
              <span className="planning-eyebrow">
                Ocupación semanal
              </span>
              <h2>Heatmap</h2>
              <p>
                Porcentaje de capacidad utilizada por desarrollador y semana.
              </p>
            </div>

            <label className="planning-control">
              <span>Mes</span>
              <input
                type="month"
                value={mesHeatmap}
                onChange={(e) =>
                  setMesHeatmap(e.target.value)
                }
              />
            </label>
          </div>

          <div className="heatmap-legend">
            <span><i className="heat-legend free" />0% Libre</span>
            <span><i className="heat-legend green-dark" />20% · 1 día</span>
            <span><i className="heat-legend green-light" />40% · 2 días</span>
            <span><i className="heat-legend yellow" />60% · 3 días</span>
            <span><i className="heat-legend orange" />80% · 4 días</span>
            <span><i className="heat-legend red" />100% · 5 días</span>
            <span><i className="heat-legend purple" />&gt;100% · Superposición</span>
          </div>

          {heatmapDesarrolladores.length === 0 ? (
            <div className="capacity-empty">
              No hay desarrolladores con asignaciones para mostrar.
            </div>
          ) : (
            <div
              className="heatmap-grid"
              style={{
                gridTemplateColumns:
                  `190px repeat(${semanasHeatmap.length}, minmax(120px, 1fr))`,
              }}
            >
              <div className="heatmap-header dev">
                Desarrollador
              </div>

              {semanasHeatmap.map((semana) => (
                <div
                  className="heatmap-header"
                  key={semana.etiqueta}
                >
                  {semana.etiqueta}
                </div>
              ))}

              {heatmapDesarrolladores.map((dev) => (
                <div
                  className="heatmap-row-fragment"
                  key={dev.nombre}
                  style={{ display: 'contents' }}
                >
                  <div className="heatmap-dev">
                    {dev.nombre}
                  </div>

                  {dev.semanas.map((semana) => (
                    <div
                      className="heatmap-cell"
                      key={`${dev.nombre}-${semana.etiqueta}`}
                      style={{
                        background: colorHeatmap(
                          semana.porcentaje
                        ),
                      }}
                      title={`${dev.nombre} · ${semana.diasTareaAsignados} día(s)-tarea sobre ${semana.diasHabilesSemana} día(s) hábil(es)${semana.diasSuperpuestos > 0 ? ` · ${semana.diasSuperpuestos} día(s) superpuesto(s)` : ''}`}
                    >
                      <strong>
                        {semana.porcentaje.toFixed(0)}%
                      </strong>

                      <small>
                        {semana.diasConOcupacion}/{semana.diasHabilesSemana} días ocupados
                      </small>

                      {semana.diasSuperpuestos > 0 && (
                        <small className="heatmap-overlap">
                          +{semana.diasSuperpuestos} superpuesto
                          {semana.diasSuperpuestos !== 1 ? 's' : ''}
                        </small>
                      )}

                      {semana.porcentaje === 0 && (
                        <small className="heatmap-free">
                          Libre
                        </small>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {vista === 'backlog' && (
        <section className="planning-section">
          <div className="planning-toolbar">
            <div>
              <span className="planning-eyebrow">
                Trabajo pendiente de asignación
              </span>
              <h2>Backlog sin asignar</h2>
              <p>
                La recomendación prioriza al desarrollador con mayor capacidad libre.
              </p>
            </div>

            <div className="backlog-count">
              {backlogSinAsignar.length}
              <span>sin asignar</span>
            </div>
          </div>

          {backlogSinAsignar.length === 0 ? (
            <div className="capacity-empty">
              No hay tareas pendientes de desarrollador.
            </div>
          ) : (
            <div className="backlog-list">
              <div className="backlog-header">
                <div>Tarea</div>
                <div>Proyecto</div>
                <div>Horas</div>
                <div>Fecha fin</div>
                <div>Sugerencia automática</div>
                <div>Acción</div>
              </div>

              {backlogSinAsignar.map((tarea) => {
                const sugerencia =
                  sugerenciaParaTarea(tarea)

                return (
                  <div
                    className="backlog-row"
                    key={tarea.id}
                  >
                    <div>
                      <strong>{tarea.nombre}</strong>
                      <small>
                        Analista:{' '}
                        {tarea.responsable_analista ||
                          tarea.responsable ||
                          '—'}
                      </small>
                    </div>

                    <div>
                      {nombreProyectoDeTarea(tarea)}
                    </div>

                    <div>
                      {Number(
                        tarea.horas_estimadas || 0
                      ).toFixed(1)} h
                    </div>

                    <div>
                      {calcularFechaFinDate(
                        tarea.fecha_inicio,
                        tarea.duracion_dias
                      )?.toLocaleDateString('es-AR')}
                    </div>

                    <div>
                      {sugerencia ? (
                        <div className="suggestion-box">
                          <strong>
                            {sugerencia.nombre}
                          </strong>
                          <small>
                            Quedaría con{' '}
                            {sugerencia.disponiblesPost.toFixed(
                              1
                            )}{' '}
                            h libres
                          </small>
                        </div>
                      ) : (
                        'Sin sugerencia'
                      )}
                    </div>

                    <div>
                      <button
                        className="assign-button"
                        disabled={
                          !sugerencia ||
                          asignandoBacklogId === tarea.id
                        }
                        onClick={() =>
                          asignarBacklog(
                            tarea,
                            sugerencia?.nombre
                          )
                        }
                      >
                        {asignandoBacklogId === tarea.id
                          ? 'Asignando...'
                          : 'Asignar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {vista === 'semana' && (
        <section className="planning-section">
          <div className="planning-toolbar">
            <div>
              <span className="planning-eyebrow">
                Extracción semanal
              </span>
              <h2>Vista semanal</h2>
              <p>
                Carga diaria por desarrollador para la semana seleccionada.
              </p>
            </div>

            <div className="week-nav">
              <button
                onClick={() =>
                  setOffsetSemana((actual) => actual - 1)
                }
              >
                ←
              </button>

              <button
                className="week-today"
                onClick={() => setOffsetSemana(0)}
              >
                Semana actual
              </button>

              <button
                onClick={() =>
                  setOffsetSemana((actual) => actual + 1)
                }
              >
                →
              </button>
            </div>
          </div>

          {semanaDesarrolladores.length === 0 ? (
            <div className="capacity-empty">
              No hay desarrolladores con carga para mostrar.
            </div>
          ) : (
            <div
              className="week-grid"
              style={{
                gridTemplateColumns:
                  '190px repeat(5, minmax(150px, 1fr))',
              }}
            >
              <div className="week-header dev">
                Desarrollador
              </div>

              {diasSemanaActual.map((dia) => (
                <div
                  className="week-header"
                  key={dia.toISOString()}
                >
                  <strong>
                    {dia.toLocaleDateString('es-AR', {
                      weekday: 'short',
                    })}
                  </strong>
                  <span>
                    {dia.toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
              ))}

              {semanaDesarrolladores.map((dev) => (
                <div
                  className="week-row-fragment"
                  key={dev.nombre}
                  style={{ display: 'contents' }}
                >
                  <div className="week-dev">
                    <strong>{dev.nombre}</strong>
                    <small>
                      {dev.totalAsignado.toFixed(1)} h asignadas
                    </small>
                  </div>

                  {dev.dias.map((dia) => (
                    <div
                      className="week-cell"
                      key={`${dev.nombre}-${dia.fecha.toISOString()}`}
                      style={{
                        borderTopColor: colorHeatmap(
                          dia.porcentaje
                        ),
                      }}
                    >
                      <div className="week-hours">
                        <strong>
                          {dia.asignadas.toFixed(1)} h
                        </strong>
                        <span>
                          {dia.disponibles.toFixed(1)} h libres
                        </span>
                      </div>

                      <div className="week-tasks">
                        {dia.tareasDia.map((item) => (
                          <span
                            key={item.tarea.id}
                            title={`${item.tarea.nombre} · ${item.horas.toFixed(
                              1
                            )} h`}
                          >
                            {item.tarea.nombre}
                          </span>
                        ))}

                        {dia.tareasDia.length === 0 && (
                          <em>Sin carga</em>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {vista === 'capacity' && (
        <section className="capacity-section">
          <div className="capacity-toolbar">
            <div>
              <span className="capacity-eyebrow">
                Disponibilidad del equipo
              </span>

              <h2>Capacity</h2>

              <p>
                6,5 horas disponibles por día hábil.
                La carga considera tareas de todos los proyectos.
              </p>
            </div>

            <label className="capacity-date-control">
              <span>Fecha Clave</span>

              <input
                type="date"
                value={fechaClave}
                min={[
                  hoyCapacity.getFullYear(),
                  String(
                    hoyCapacity.getMonth() + 1
                  ).padStart(2, '0'),
                  String(
                    hoyCapacity.getDate()
                  ).padStart(2, '0'),
                ].join('-')}
                onChange={(e) =>
                  setFechaClave(
                    e.target.value
                  )
                }
              />
            </label>
          </div>

          {!fechaClaveDate ||
          fechaClaveDate < hoyCapacity ? (
            <div className="capacity-empty">
              Elegí una Fecha Clave igual o posterior a hoy.
            </div>
          ) : capacityDesarrolladores.length === 0 ? (
            <div className="capacity-empty">
              Todavía no hay desarrolladores asignados a tareas.
            </div>
          ) : (
            <div className="capacity-workspace">
              <div className="capacity-team-panel">
                <div className="capacity-team-header">
                  <div>Desarrollador</div>
                  <div>Capacidad</div>
                </div>

                {capacityDesarrolladores.map(
                  (dev) => (
                    <div
                      className="capacity-team-row"
                      key={dev.nombre}
                      style={{
                        height: `${dev.rowHeight}px`,
                      }}
                    >
                      <div className="capacity-dev-name">
                        {dev.nombre}
                      </div>

                      <div className="capacity-dev-metrics">
                        <span>
                          <b>Capacidad:</b>{' '}
                          {dev.horasCapacidad.toFixed(1)} h
                        </span>

                        <span>
                          <b>Asignadas:</b>{' '}
                          {dev.horasAsignadas.toFixed(1)} h
                        </span>

                        <span
                          className={
                            dev.horasSuperpuestas > 0
                              ? 'overlap'
                              : ''
                          }
                        >
                          <b>Superpuesta:</b>{' '}
                          {dev.horasSuperpuestas.toFixed(1)} h
                        </span>

                        <span
                          className={
                            dev.horasDisponibles < 0
                              ? 'negative'
                              : 'available'
                          }
                        >
                          <b>Disponibles:</b>{' '}
                          {dev.horasDisponibles.toFixed(1)} h
                        </span>

                        <span>
                          <b>Tareas:</b>{' '}
                          {dev.finalizadas}/{dev.totalTareas}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="capacity-gantt-panel">
                <div className="capacity-gantt-scroll">
                  <div
                    className="capacity-canvas"
                    style={{
                      width: `${anchoCapacity}px`,
                      minWidth: `${anchoCapacity}px`,
                    }}
                  >
                    <div
                      className="capacity-days-header"
                      style={{
                        gridTemplateColumns:
                          `repeat(${diasCapacity.length}, ${ANCHO_DIA_CAPACITY}px)`,
                      }}
                    >
                      {diasCapacity.map(
                        (fecha, indice) => {
                          const cambioMes =
                            indice === 0 ||
                            fecha.getMonth() !==
                              diasCapacity[
                                indice - 1
                              ].getMonth()

                          return (
                            <div
                              className={`capacity-day ${
                                cambioMes
                                  ? 'month-start'
                                  : ''
                              }`}
                              key={fecha.toISOString()}
                            >
                              {cambioMes && (
                                <span className="capacity-month">
                                  {fecha
                                    .toLocaleDateString(
                                      'es-AR',
                                      {
                                        month:
                                          'short',
                                      }
                                    )
                                    .replace(
                                      '.',
                                      ''
                                    )
                                    .toUpperCase()}
                                </span>
                              )}

                              <small>
                                {inicialDiaSemanaFecha(
                                  fecha
                                )}
                              </small>

                              <strong>
                                {fecha.getDate()}
                              </strong>
                            </div>
                          )
                        }
                      )}
                    </div>

                    <div className="capacity-gantt-body">
                      {capacityDesarrolladores.map(
                        (dev) => (
                          <div
                            className="capacity-gantt-row"
                            key={dev.nombre}
                            style={{
                              height: `${dev.rowHeight}px`,
                            }}
                          >
                            <div
                              className="capacity-grid-bg"
                              style={{
                                gridTemplateColumns:
                                  `repeat(${diasCapacity.length}, ${ANCHO_DIA_CAPACITY}px)`,
                              }}
                            >
                              {diasCapacity.map(
                                (fecha, indice) => {
                                  const cambioMes =
                                    indice === 0 ||
                                    fecha.getMonth() !==
                                      diasCapacity[
                                        indice - 1
                                      ].getMonth()

                                  return (
                                    <div
                                      key={fecha.toISOString()}
                                      className={`capacity-grid-day ${
                                        cambioMes
                                          ? 'month-start'
                                          : ''
                                      }`}
                                    />
                                  )
                                }
                              )}
                            </div>

                            {dev.asignaciones.map(
                              ({
                                tarea,
                                posicion,
                                carril,
                              }) => (
                                <div
                                  key={tarea.id}
                                  className={`capacity-task-bar ${colorBarra(
                                    tarea
                                  )}`}
                                  style={{
                                    left: `${posicion.left}px`,
                                    width: `${posicion.width}px`,
                                    top: `${
                                      10 +
                                      carril * 24
                                    }px`,
                                  }}
                                  title={`${tarea.nombre} · ${nombreProyectoDeTarea(
                                    tarea
                                  )} · ${horasTareaEnVentana(
                                    tarea
                                  ).toFixed(1)} h en período`}
                                >
                                  <span>
                                    {tarea.nombre}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}


        </>
      )}


      {vistaPrincipal === 'process' && (
        <section className="process-page">
          <div className="process-toolbar">
            <div>
              <span className="process-eyebrow">Mapa de proceso</span>
              <h2>Process</h2>
              <p>
                Dibujá procesos de negocio simples, conectá pasos y movelos libremente.
              </p>
            </div>

            <div className="process-toolbar-actions">
              <button
                type="button"
                className="process-secondary-button"
                onClick={abrirNuevoProcessMap}
              >
                + Nuevo proceso
              </button>
            </div>
          </div>

          <div className="process-layout">
            <aside className="process-left-panel">
              <div className="process-left-top">
                <div className="process-list-header">
                  <div>
                    <span>Procesos</span>
                    <strong>{processMaps.length}</strong>
                  </div>

                  <div className="process-list-header-actions">
                    <button
                      type="button"
                      className="process-list-scroll-button"
                      onClick={() => scrollProcessList('up')}
                      title="Subir"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      className="process-list-scroll-button"
                      onClick={() => scrollProcessList('down')}
                      title="Bajar"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={abrirNuevoProcessMap}
                      title="Crear proceso"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="process-list" ref={processListRef}>
                  {processMaps.map((process) => (
                    <div
                      key={process.id}
                      className={
                        process.id === processSeleccionadoId
                          ? 'process-list-item active'
                          : 'process-list-item'
                      }
                    >
                      <button
                        type="button"
                        className="process-list-main"
                        onClick={() => setProcessSeleccionadoId(process.id)}
                      >
                        <strong>{process.nombre}</strong>
                        <span>{process.descripcion || 'Sin descripción'}</span>
                      </button>

                      <button
                        type="button"
                        className="process-list-delete"
                        onClick={() => eliminarProcessMap(process)}
                        title="Eliminar proceso"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {processMaps.length === 0 && (
                    <div className="process-list-empty">
                      Todavía no hay procesos.
                    </div>
                  )}
                </div>
              </div>

              <div className="process-left-divider" />

              <div className="process-components-panel">
                <div className="process-components-header">
                  <div>
                    <span>Componentes</span>
                    <strong>{PROCESO_COMPONENTES.length}</strong>
                  </div>
                  <small>Arrastrá al canvas</small>
                </div>

                <div className="process-components-grid">
                  {PROCESO_COMPONENTES.map((component) => (
                    <button
                      key={component.tipo}
                      type="button"
                      className={`process-component-chip process-node-${component.tipo.toLowerCase()}`}
                      draggable
                      onDragStart={(event) =>
                        iniciarArrastreProcessPalette(event, component.tipo)
                      }
                      onClick={() => abrirNuevoProcessNode(component.tipo)}
                      title="Arrastrar al canvas"
                    >
                      <div
                        className="process-component-icon"
                        style={{
                          '--process-icon':
                            `url(${component.icon})`,
                          '--process-color':
                            component.color,
                        }}
                      >
                        <div className="process-icon-fill" />
                        <img
                          src={component.icon}
                          alt=""
                        />
                      </div>

                      <span>{component.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="process-workspace">
              {!processSeleccionadoId ? (
                <div className="process-no-selection">
                  <strong>Creá tu primer proceso</strong>
                  <span>
                    Empezá con un proceso simple y arrastrá componentes al canvas.
                  </span>
                  <button type="button" onClick={abrirNuevoProcessMap}>
                    + Nuevo proceso
                  </button>
                </div>
              ) : (
                <>
                  <div className="process-canvas-header">
                    <div>
                      <strong>
                        {processSeleccionado?.nombre || 'Proceso'}
                      </strong>
                      <span>
                        {processConnectSource
                          ? `Conectando desde: ${processConnectSource.titulo}`
                          : 'Arrastrá componentes al canvas. Doble click para editar. Arrastrá desde cualquiera de los 4 puntos verdes para conectar.'}
                      </span>
                    </div>

                    <div className="process-canvas-actions">
                      <button type="button" className="btn-secondary" onClick={imprimirProcessFlow}>
                        Imprimir flujo
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setProcessArchiveOpen(true)} title="Procesos archivados">
                        <img src={archiveIcon} alt="" />
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => archivarProcessMap(processSeleccionado)}>
                        Archivar
                      </button>
                      <button type="button" className="btn-danger-inline" onClick={() => eliminarProcessMap(processSeleccionado)}>
                        Borrar
                      </button>
                    </div>
                  </div>

                  <div
                    className="process-canvas"
                    style={{ '--process-canvas-bg': processCanvasBgActual }}
                    onMouseMove={(event) => {
                      moverProcessNode(event)
                      moverResizeProcessNode(event)
                      moverConexionProcess(event)
                    }}
                    onMouseUp={() => {
                      terminarDragProcessNode()
                      terminarResizeProcessNode()
                      if (processLinkDraft) {
                        cancelarConexionProcess()
                      }
                    }}
                    onMouseLeave={() => {
                      terminarDragProcessNode()
                      terminarResizeProcessNode()
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={soltarNodoProceso}
                  >
                    <div className="process-canvas-bg-picker">
                      {[
                        { key: '#ffffff', label: 'Blanco', className: 'white' },
                        { key: '#0b1220', label: 'Negro', className: 'black' },
                        { key: '#5d6670', label: 'Board', className: 'board' },
                      ].map((bg) => (
                        <button
                          key={bg.key}
                          type="button"
                          className={`process-bg-dot ${bg.className} ${processCanvasBgActual === bg.key ? 'active' : ''}`}
                          onClick={() => actualizarProcessCanvasBg(bg.key)}
                          title={bg.label}
                        />
                      ))}
                    </div>

                    <div ref={processCanvasPrintRef} className="process-world">
                      <svg className="process-links-layer" viewBox="0 0 2400 1500">
                        <defs>
                          <marker
                            id="process-arrow"
                            markerWidth="10"
                            markerHeight="10"
                            refX="8"
                            refY="3"
                            orient="auto"
                            markerUnits="strokeWidth"
                          >
                            <path d="M0,0 L0,6 L9,3 z" />
                          </marker>
                        </defs>

                        {processLinks.map((link) => {
                          const line = processLine(link)
                          if (!line) return null

                          return (
                            <g
                              key={link.id}
                              className="process-link-group"
                            >
                              <path
                                d={line.d}
                                className={`process-link-path ${
                                  link.estilo === 'punteada'
                                    ? 'dashed'
                                    : ''
                                }`}
                                style={{
                                  stroke:
                                    link.color || '#b9c5cf',
                                }}
                                markerEnd="url(#process-arrow)"
                                onDoubleClick={(event) => {
                                  event.stopPropagation()
                                  abrirEditarProcessLink(link)
                                }}
                              />

                              {link.etiqueta && (
                                <g
                                  className="process-link-label"
                                  transform={`translate(${line.midX} ${line.midY})`}
                                  onDoubleClick={(event) => {
                                    event.stopPropagation()
                                    abrirEditarProcessLink(link)
                                  }}
                                >
                                  <rect
                                    x="-52"
                                    y="-13"
                                    width="104"
                                    height="26"
                                    rx="8"
                                  />
                                  <text
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                  >
                                    {link.etiqueta}
                                  </text>
                                </g>
                              )}
                            </g>
                          )
                        })}

                        {processLinkDraft && (
                          <path
                            d={`M ${processLinkDraft.startX} ${processLinkDraft.startY} L ${processLinkDraft.currentX} ${processLinkDraft.currentY}`}
                            className="process-link-path process-link-draft"
                            markerEnd="url(#process-arrow)"
                          />
                        )}
                      </svg>

                      {processNodes.map((node) => (
                        <div
                          key={node.id}
                          className={`process-node ${
                            processConnectSource?.id === node.id
                              ? 'connecting'
                              : ''
                          }`}
                          style={{
                            left: `${Number(node.pos_x)}px`,
                            top: `${Number(node.pos_y)}px`,
                            width: `${Number(node.ancho)}px`,
                            height: `${Number(node.alto)}px`,
                            transform: `rotate(${Number(node.rotacion) || 0}deg)`,
                            '--process-icon':
                              `url(${plantillaProceso(node.tipo)?.icon})`,
                            '--process-color':
                              node.color ||
                              plantillaProceso(node.tipo)?.color ||
                              '#cfe3cd',
                          }}
                          onMouseDown={(event) =>
                            iniciarDragProcessNode(event, node)
                          }
                          onDoubleClick={() =>
                            abrirEditarProcessNode(node)
                          }
                        >
                          <div className="process-node-visual">
                            <div className="process-icon-fill" />

                            <img
                              src={plantillaProceso(node.tipo)?.icon}
                              alt=""
                              draggable="false"
                            />
                          </div>

                          <div
                            className="process-node-copy"
                            style={{
                              transform: `rotate(${-(
                                Number(node.rotacion) || 0
                              )}deg)`,
                            }}
                          >
                            <strong>{node.titulo}</strong>
                          </div>

                          {['top', 'right', 'bottom', 'left'].map(
                            (lado) => (
                              <button
                                key={lado}
                                type="button"
                                className={`process-node-connector ${lado}`}
                                onMouseDown={(event) =>
                                  iniciarConexionProcess(
                                    event,
                                    node,
                                    lado
                                  )
                                }
                                onMouseUp={(event) =>
                                  finalizarConexionProcess(
                                    event,
                                    node,
                                    lado
                                  )
                                }
                                title="Arrastrá desde acá para conectar"
                              />
                            )
                          )}

                          <button
                            type="button"
                            className="process-node-resize"
                            onMouseDown={(event) =>
                              iniciarResizeProcessNode(
                                event,
                                node
                              )
                            }
                            title="Agrandar o achicar"
                          />
                        </div>
                      ))}

                      {processNodes.length === 0 && (
                        <div className="process-empty-canvas">
                          <strong>Proceso vacío</strong>
                          <span>Arrastrá componentes desde el panel izquierdo para empezar.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {vistaPrincipal === 'cards' && (
        <section className="cards-page">
          <div className="cards-toolbar">
            <div>
              <span className="cards-eyebrow">
                Canvas colaborativo
              </span>

              <h2>Cards</h2>

              <p>
                Elegí un board y organizá cards libres, Se libre
              </p>
            </div>

            <div className="cards-toolbar-actions">
              <button
                type="button"
                className="cards-secondary-button"
                onClick={abrirNuevoBoard}
              >
                + Nuevo board
              </button>


            </div>
          </div>

          <div className="cards-layout">
            <aside className="boards-panel">
              <div className="boards-panel-header">
                <div>
                  <span>Mis boards</span>
                  <strong>
                    {boards.length}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={abrirNuevoBoard}
                  title="Crear board"
                >
                  +
                </button>
              </div>

              <div className="boards-list">
                {boards.map((board) => (
                  <div
                    key={board.id}
                    className={
                      board.id === boardSeleccionadoId
                        ? 'board-list-item active'
                        : 'board-list-item'
                    }
                  >
                    <button
                      type="button"
                      className="board-list-main"
                      onClick={() =>
                        setBoardSeleccionadoId(
                          board.id
                        )
                      }
                      title={board.descripcion || board.nombre}
                    >
                      <span className="board-list-pin">
                        ●
                      </span>

                      <span className="board-list-copy">
                        <strong>
                          {board.nombre}
                        </strong>

                        <small>
                          {board.descripcion ||
                            'Sin descripción'}
                        </small>
                      </span>
                    </button>

                    <div className="board-list-actions">
                      <button
                        type="button"
                        onClick={() =>
                          abrirEditarBoard(board)
                        }
                        title="Editar board"
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() =>
                          eliminarBoard(board)
                        }
                        title="Eliminar board"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                {boards.length === 0 && (
                  <div className="boards-list-empty">
                    <span>
                      Todavía no hay boards.
                    </span>

                    <button
                      type="button"
                      onClick={abrirNuevoBoard}
                    >
                      Crear el primero
                    </button>
                  </div>
                )}
              </div>
            </aside>

            <div className="cards-board-area">
              {!boardSeleccionadoId ? (
                <div className="board-welcome">
                  <div className="board-welcome-note">
                    <div className="board-welcome-pin" />

                    <strong>
                      Seleccioná un board
                    </strong>

                    <span>
                      Elegí uno del panel izquierdo
                      para entrar al canvas y ver sus cards.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="cards-board-meta">
                    <div>
                      <strong>
                        {boards.find(
                          (board) =>
                            board.id ===
                            boardSeleccionadoId
                        )?.nombre || 'Board'}
                      </strong>

                      <span>
                        {boards.find(
                          (board) =>
                            board.id ===
                            boardSeleccionadoId
                        )?.descripcion ||
                          'Canvas colaborativo'}
                      </span>
                    </div>

                    <div className="cards-board-meta-actions">
                      <span className="cards-counter">
                        {cards.length} card
                        {cards.length === 1 ? '' : 's'}
                      </span>

                      <div className="card-create-actions">
                        <button
                          type="button"
                          className="cards-primary-button compact"
                          onClick={() =>
                            abrirNuevaCard('Card')
                          }
                        >
                          + Card
                        </button>

                        <button
                          type="button"
                          className="cards-note-button compact"
                          onClick={() =>
                            abrirNuevaCard('Nota')
                          }
                        >
                          + Note
                        </button>

                        <button
                          type="button"
                          className="cards-zone-button compact"
                          onClick={abrirNuevaZona}
                        >
                          + Zona
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className="cards-canvas-shell"
                    style={{
                      '--cards-board-bg':
                        boardCanvasBgActual,
                    }}
                  >
                    <div className="cards-canvas-bg-picker">
                      {[
                        {
                          key: '#ffffff',
                          label: 'Blanco',
                          className: 'white',
                        },
                        {
                          key: '#0b1220',
                          label: 'Negro',
                          className: 'black',
                        },
                        {
                          key: '#5d6670',
                          label: 'Board',
                          className: 'board',
                        },
                      ].map((bg) => (
                        <button
                          key={bg.key}
                          type="button"
                          className={`cards-bg-dot ${bg.className} ${
                            boardCanvasBgActual === bg.key
                              ? 'active'
                              : ''
                          }`}
                          onClick={() =>
                            actualizarBoardCanvasBg(bg.key)
                          }
                          title={bg.label}
                        />
                      ))}
                    </div>

                    <div className="board-zoom-overlay">
                    <button
                      type="button"
                      onClick={() =>
                        cambiarZoom(-0.1)
                      }
                      title="Alejar"
                    >
                      −
                    </button>

                    <span>
                      {Math.round(
                        boardZoom * 100
                      )}%
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        cambiarZoom(0.1)
                      }
                      title="Acercar"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      className="board-center-button"
                      onClick={centrarBoard}
                      title="Centrar board"
                    >
                      Centrar
                    </button>
                  </div>

                    
                    <button
                      type="button"
                      className="board-archive-button"
                      onClick={() => {
                        setArchivoOpen(true)
                        cargarCardsArchivadas(
                          boardSeleccionadoId
                        )
                      }}
                      title="Cards archivadas"
                      aria-label="Cards archivadas"
                    >
                      <img
                        src={archiveIcon}
                        alt=""
                      />

                      {cardsArchivadas.length > 0 && (
                        <span>
                          {cardsArchivadas.length}
                        </span>
                      )}
                    </button>

<div
                      ref={boardCanvasRef}
                    className={`cards-canvas ${
                      panInfo ? 'panning' : ''
                    }`}
                    onMouseDown={iniciarPanCanvas}
                    onMouseMove={(event) => {
                      moverCardEnCanvas(event)
                      moverConexion(event)
                      moverResizeCard(event)
                      moverZona(event)
                      moverResizeZona(event)
                      moverPanCanvas(event)
                    }}
                    onMouseUp={() => {
                      terminarDragCard()
                      terminarResizeCard()
                      terminarDragZona()
                      terminarResizeZona()
                      terminarPanCanvas()
                    }}
                    onMouseLeave={() => {
                      terminarDragCard()
                      terminarResizeCard()
                      terminarDragZona()
                      terminarResizeZona()
                      terminarPanCanvas()
                      setLinkDraft(null)
                    }}
                  >
                    <div
                      className="board-zoom-spacer"
                      style={{
                        width: `${2400 * boardZoom}px`,
                        height: `${1600 * boardZoom}px`,
                      }}
                    >
                      <div
                        className="board-world"
                        style={{
                          width: '2400px',
                          height: '1600px',
                          transform: `scale(${boardZoom})`,
                        }}
                      >
                        <div className="cards-cork-texture" />

                    {boardZones.map((zona) => (
                      <section
                        key={zona.id}
                        className={`board-zone ${
                          zoneDragInfo?.id === zona.id
                            ? 'dragging'
                            : ''
                        }`}
                        style={{
                          left: `${Number(zona.pos_x) || 120}px`,
                          top: `${Number(zona.pos_y) || 120}px`,
                          width: `${Number(zona.ancho) || 520}px`,
                          height: `${Number(zona.alto) || 300}px`,
                          backgroundColor:
                            `${zona.color || '#5b8def'}2e`,
                          borderColor:
                            `${zona.color || '#5b8def'}99`,
                        }}
                        onMouseDown={(event) =>
                          iniciarDragZona(event, zona)
                        }
                        onDoubleClick={(event) => {
                          event.stopPropagation()
                          abrirEditarZona(zona)
                        }}
                        title="Arrastrá para mover · Doble click para editar"
                      >
                        <div
                          className="board-zone-title"
                          style={{
                            backgroundColor:
                              `${zona.color || '#5b8def'}d9`,
                          }}
                        >
                          {zona.titulo}
                        </div>

                        <button
                          type="button"
                          className="board-zone-edit"
                          onMouseDown={(e) =>
                            e.stopPropagation()
                          }
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirEditarZona(zona)
                          }}
                          title="Editar zona"
                        >
                          •••
                        </button>

                        <button
                          type="button"
                          className="board-zone-resize"
                          onMouseDown={(event) =>
                            iniciarResizeZona(
                              event,
                              zona
                            )
                          }
                          title="Cambiar tamaño de zona"
                        />
                      </section>
                    ))}

                    <svg
                      className="card-links-layer"
                      width="2400"
                      height="1600"
                      viewBox="0 0 2400 1600"
                    >
                      <defs>
                        <marker
                          id="arrow-blue"
                          markerWidth="10"
                          markerHeight="10"
                          refX="8"
                          refY="3"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path
                            d="M0,0 L0,6 L9,3 z"
                            fill="#4188ff"
                          />
                        </marker>

                        <marker
                          id="arrow-red"
                          markerWidth="10"
                          markerHeight="10"
                          refX="8"
                          refY="3"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path
                            d="M0,0 L0,6 L9,3 z"
                            fill="#ef4b5e"
                          />
                        </marker>
                      </defs>

                      {cardLinks.map((link) => {
                        const geo =
                          geometriaLink(link)

                        if (!geo) return null

                        const esBloqueo =
                          link.tipo_relacion === 'Bloquea'

                        const esDependencia =
                          link.tipo_relacion === 'Depende de'

                        const stroke =
                          esBloqueo
                            ? '#ef4b5e'
                            : esDependencia
                              ? '#4188ff'
                              : '#f3c747'

                        return (
                          <g key={link.id}>
                            <path
                              d={geo.path}
                              className="card-link-hit"
                              onClick={() =>
                                eliminarConexion(link)
                              }
                            />

                            <path
                              d={geo.path}
                              className="card-link-line"
                              stroke={stroke}
                              markerEnd={
                                esBloqueo
                                  ? 'url(#arrow-red)'
                                  : esDependencia
                                    ? 'url(#arrow-blue)'
                                    : undefined
                              }
                            />

                            <circle
                              cx={geo.x1}
                              cy={geo.y1}
                              r="7"
                              className="card-link-pin source"
                            />

                            <circle
                              cx={geo.x2}
                              cy={geo.y2}
                              r="7"
                              className="card-link-pin target"
                            />

                            <text
                              x={(geo.x1 + geo.x2) / 2}
                              y={(geo.y1 + geo.y2) / 2 - 8}
                              className="card-link-label"
                            >
                              {link.tipo_relacion}
                            </text>
                          </g>
                        )
                      })}

                      {linkDraft && (
                        <path
                          d={
                            `M ${linkDraft.x1} ${linkDraft.y1} ` +
                            `C ${linkDraft.x1 + 90} ${linkDraft.y1}, ` +
                            `${linkDraft.x2 - 90} ${linkDraft.y2}, ` +
                            `${linkDraft.x2} ${linkDraft.y2}`
                          }
                          className="card-link-draft"
                        />
                      )}
                    </svg>

                    {cards.map((card) => (
                      <article
                        key={card.id}
                        className={`postit-card ${card.color} ${
                          dragInfo?.id === card.id
                            ? 'dragging'
                            : ''
                        }`}
                        style={{
                          left: `${Number(card.pos_x) || 80}px`,
                          top: `${Number(card.pos_y) || 80}px`,
                          width: `${Number(card.ancho) || 250}px`,
                          height: `${Number(card.alto) || 190}px`,
                          zIndex:
                            dragInfo?.id === card.id ||
                            resizeInfo?.id === card.id
                              ? 999
                              : Number(card.z_index) || 10,
                        }}
                        onMouseDown={(event) =>
                          iniciarDragCard(event, card)
                        }
                        onDoubleClick={() =>
                          abrirEditarCard(card)
                        }
                        title="Arrastrá para mover · Doble click para editar"
                      >
                        <div className="postit-pin">
                          <span />
                        </div>

                        <button
                          type="button"
                          className="card-thread-pin card-thread-pin-left"
                          onMouseDown={(e) =>
                            e.stopPropagation()
                          }
                          onMouseUp={(e) =>
                            terminarConexion(e, card)
                          }
                          title="Soltar aquí una conexión"
                          aria-label="Recibir conexión"
                        />

                        <button
                          type="button"
                          className="card-thread-pin card-thread-pin-right"
                          onMouseDown={(e) =>
                            iniciarConexion(e, card)
                          }
                          title="Arrastrar hilo desde esta card"
                          aria-label="Crear conexión"
                        />

                        <button
                          type="button"
                          className="postit-menu"
                          onMouseDown={(e) =>
                            e.stopPropagation()
                          }
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirEditarCard(card)
                          }}
                          title="Editar card"
                        >
                          •••
                        </button>

                        <div className="postit-badges">
                          <span className="postit-type-badge">
                            {card.tipo === 'Nota'
                              ? 'NOTA'
                              : 'CARD'}
                          </span>

                          {card.tipo !== 'Nota' && (
                            <span
                              className={`postit-status-badge ${(
                                card.estado || 'Pendiente'
                              )
                                .toLowerCase()
                                .replaceAll(' ', '-')}`}
                            >
                              {card.estado || 'Pendiente'}
                            </span>
                          )}
                        </div>

                        <h3>{card.titulo}</h3>

                        <p className="postit-description">
                          {card.descripcion ||
                            'Sin descripción'}
                        </p>

                        {Array.isArray(card.checklist) &&
                          card.checklist.length > 0 && (
                            <div className="postit-checklist-preview">
                              {card.checklist.map((item) => (
                                <div
                                  key={item.id}
                                  className={
                                    item.hecho
                                      ? 'done'
                                      : ''
                                  }
                                >
                                  <span>
                                    {item.hecho ? '✓' : '○'}
                                  </span>

                                  <span>
                                    {item.texto}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                        {card.tipo !== 'Nota' && (
                          <div className="postit-info">
                            <span>
                              <b>Responsable</b>
                              {card.responsable ||
                                'Sin asignar'}
                            </span>

                            <span>
                              <b>Fechas</b>
                              {card.fecha_inicio || '—'}
                              {' → '}
                              {card.fecha_fin || '—'}
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          className="postit-resize-handle"
                          onMouseDown={(event) =>
                            iniciarResizeCard(
                              event,
                              card
                            )
                          }
                          title="Arrastrá hacia abajo para cambiar el alto"
                          aria-label="Cambiar alto de la card"
                        >
                          <span />
                        </button>
                      </article>
                    ))}

                    {cards.length === 0 && (
                      <div className="cards-empty">
                        <div className="cards-empty-pin" />

                        <strong>
                          Este board está vacío
                        </strong>

                        <span>
                          Creá una card o una nota
                          para empezar a armar el mapa visual.
                        </span>

                        <div className="cards-empty-actions">
                          <button
                            type="button"
                            onClick={() =>
                              abrirNuevaCard('Card')
                            }
                          >
                            + Card
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              abrirNuevaCard('Nota')
                            }
                          >
                            + Note
                          </button>
                        </div>
                      </div>
                    )}
                      </div>
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}


      {conexionPendiente && (
        <div
          className="card-drawer-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setConexionPendiente(null)
              setTipoConexion('Relacionada')
            }
          }}
        >
          <aside className="card-editor-drawer connection-drawer">
            <div className="card-modal-heading">
              <div>
                <span>Nuevo hilo</span>
                <h3>Tipo de conexión</h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConexionPendiente(null)
                  setTipoConexion('Relacionada')
                }}
              >
                ×
              </button>
            </div>

            <div className="connection-preview connection-preview-drawer">
              <div>
                <span>Origen</span>
                <strong>
                  {cardPorId(
                    conexionPendiente.sourceCardId
                  )?.titulo || 'Card'}
                </strong>
              </div>

              <span className="connection-preview-arrow">
                →
              </span>

              <div>
                <span>Destino</span>
                <strong>
                  {cardPorId(
                    conexionPendiente.targetCardId
                  )?.titulo || 'Card'}
                </strong>
              </div>
            </div>

            <div className="form-group">
              <label>Relación</label>

              <select
                value={tipoConexion}
                onChange={(event) =>
                  setTipoConexion(
                    event.target.value
                  )
                }
              >
                <option value="Relacionada">
                  Relacionada
                </option>

                <option value="Depende de">
                  Depende de
                </option>

                <option value="Bloquea">
                  Bloquea
                </option>
              </select>
            </div>

            <div className="connection-type-help">
              {tipoConexion === 'Relacionada' && (
                <span>
                  Hilo amarillo: relación visual entre ambas cards.
                </span>
              )}

              {tipoConexion === 'Depende de' && (
                <span>
                  Hilo azul con flecha: la card destino depende de la card origen.
                </span>
              )}

              {tipoConexion === 'Bloquea' && (
                <span>
                  Hilo rojo con flecha: la card origen bloquea a la card destino.
                </span>
              )}
            </div>

            <div className="connection-drawer-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setConexionPendiente(null)
                  setTipoConexion('Relacionada')
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={guardarConexion}
              >
                Crear hilo
              </button>
            </div>
          </aside>
        </div>
      )}

      {modalBoardOpen && (
        <div className="modal-overlay">
          <div className="modal-card card-modal-small">
            <form onSubmit={guardarBoard}>
              <div className="card-modal-heading">
                <div>
                  <span>
                    {boardEditando
                      ? 'Editar espacio'
                      : 'Nuevo espacio'}
                  </span>
                  <h3>
                    {boardEditando
                      ? 'Editar board'
                      : 'Crear board'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalBoardOpen(false)
                    setBoardEditando(null)
                    setNuevoBoard({
                      nombre: '',
                      descripcion: '',
                    })
                  }}
                >
                  ×
                </button>
              </div>

              <div className="form-group">
                <label>Nombre del board</label>

                <input
                  type="text"
                  value={nuevoBoard.nombre}
                  onChange={(e) =>
                    setNuevoBoard((actual) => ({
                      ...actual,
                      nombre: e.target.value,
                    }))
                  }
                  placeholder="Ej: Migración Banco1"
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>

                <textarea
                  rows="4"
                  value={nuevoBoard.descripcion}
                  onChange={(e) =>
                    setNuevoBoard((actual) => ({
                      ...actual,
                      descripcion: e.target.value,
                    }))
                  }
                  placeholder="Objetivo o alcance del board..."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setModalBoardOpen(false)
                    setBoardEditando(null)
                    setNuevoBoard({
                      nombre: '',
                      descripcion: '',
                    })
                  }}
                >
                  Cancelar
                </button>

                <button
                  className="btn-primary"
                  type="submit"
                >
                  {boardEditando
                    ? 'Guardar cambios'
                    : 'Crear board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {processArchiveOpen && (
        <div
          className="card-drawer-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setProcessArchiveOpen(false)
            }
          }}
        >
          <aside className="card-editor-drawer archive-drawer">
            <div className="card-modal-heading">
              <div>
                <span>Process</span>
                <h3>Procesos archivados</h3>
              </div>
              <button type="button" onClick={() => setProcessArchiveOpen(false)}>×</button>
            </div>

            <div className="archive-list">
              {processMapsArchivados.map((process) => (
                <div key={process.id} className="archive-list-item">
                  <div>
                    <strong>{process.nombre}</strong>
                    <span>{process.descripcion || 'Sin descripción'}</span>
                  </div>

                  <div className="archive-list-actions">
                    <button type="button" className="btn-secondary" onClick={() => restaurarProcessMap(process)}>
                      Restaurar
                    </button>
                    <button type="button" className="btn-delete-task" onClick={() => eliminarProcessMap(process)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}

              {processMapsArchivados.length === 0 && (
                <div className="archive-empty">
                  No hay procesos archivados.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {processMapDrawerOpen && (
        <div className="card-drawer-overlay">
          <aside className="card-editor-drawer process-drawer">
            <form onSubmit={guardarProcessMap}>
              <div className="card-modal-heading">
                <div>
                  <span>Process</span>
                  <h3>Nuevo proceso</h3>
                </div>
                <button type="button" onClick={() => setProcessMapDrawerOpen(false)}>×</button>
              </div>

              <div className="form-group">
                <label>Nombre</label>
                <input
                  value={nuevoProcessMap.nombre}
                  onChange={(e) => setNuevoProcessMap((actual) => ({ ...actual, nombre: e.target.value }))}
                  placeholder="Ej: Alta de cliente"
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={nuevoProcessMap.descripcion}
                  onChange={(e) => setNuevoProcessMap((actual) => ({ ...actual, descripcion: e.target.value }))}
                  placeholder="Descripción opcional"
                  rows="4"
                />
              </div>

              <div className="connection-drawer-actions">
                <button type="button" className="btn-secondary" onClick={() => setProcessMapDrawerOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">Crear proceso</button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {processNodeDrawerOpen && (
        <div className="card-drawer-overlay">
          <aside className="card-editor-drawer process-drawer">
            <form onSubmit={guardarProcessNode}>
              <div className="card-modal-heading">
                <div>
                  <span>Bloque de proceso</span>
                  <h3>{processNodeEditando ? 'Editar bloque' : 'Nuevo bloque'}</h3>
                </div>
                <button type="button" onClick={cerrarProcessNodeDrawer}>×</button>
              </div>

              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={formProcessNode.tipo}
                  onChange={(e) => {
                    const nuevoTipo = e.target.value
                    setFormProcessNode((actual) => ({
                      ...actual,
                      tipo: nuevoTipo,
                      color:
                        actual.color ||
                        plantillaProceso(nuevoTipo)?.color ||
                        '#cfe3cd',
                    }))
                  }}
                  disabled={Boolean(processNodeEditando)}
                >
                  {PROCESO_COMPONENTES.map((item) => (
                    <option key={item.tipo} value={item.tipo}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Texto</label>
                <textarea
                  value={formProcessNode.titulo}
                  onChange={(e) => setFormProcessNode((actual) => ({ ...actual, titulo: e.target.value }))}
                  placeholder="Escribí el texto que querés mostrar dentro del componente"
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <select
                  value={formProcessNode.color}
                  onChange={(e) =>
                    setFormProcessNode((actual) => ({
                      ...actual,
                      color: e.target.value,
                    }))
                  }
                >
                  <option value="#cfe3cd">Verde suave</option>
                  <option value="#fde68a">Amarillo</option>
                  <option value="#fecaca">Rosa claro</option>
                  <option value="#bfdbfe">Celeste</option>
                  <option value="#ddd6fe">Lila</option>
                  <option value="#fdba74">Naranja</option>
                  <option value="#e5e7eb">Gris claro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Rotación</label>

                <div className="process-rotation-select">
                  <select
                    value={Number(formProcessNode.rotacion) || 0}
                    onChange={(e) =>
                      setFormProcessNode((actual) => ({
                        ...actual,
                        rotacion: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={0}>360° · Original</option>
                    <option value={90}>90°</option>
                    <option value={180}>180°</option>
                    <option value={270}>270°</option>
                  </select>
                </div>
              </div>

              <div className="connection-drawer-actions">
                {processNodeEditando && (
                  <button
                    type="button"
                    className="btn-delete-task"
                    onClick={() => eliminarProcessNode(processNodeEditando)}
                  >
                    Eliminar
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={cerrarProcessNodeDrawer}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {processLinkDrawerOpen && processLinkEditando && (
        <div
          className="card-drawer-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cerrarProcessLinkDrawer()
            }
          }}
        >
          <aside className="card-editor-drawer process-drawer">
            <form onSubmit={guardarProcessLink}>
              <div className="card-modal-heading">
                <div>
                  <span>Conexión de proceso</span>
                  <h3>Editar flecha</h3>
                </div>

                <button
                  type="button"
                  onClick={cerrarProcessLinkDrawer}
                >
                  ×
                </button>
              </div>

              <div className="form-group">
                <label>Texto sobre la flecha</label>

                <input
                  type="text"
                  value={processLinkLabel}
                  onChange={(event) =>
                    setProcessLinkLabel(event.target.value)
                  }
                  placeholder="Ej: Sí, No, Aprobado..."
                />
              </div>

              <div className="form-group">
                <label>Tipo de línea</label>

                <select
                  value={processLinkStyle}
                  onChange={(event) =>
                    setProcessLinkStyle(event.target.value)
                  }
                >
                  <option value="continua">Continua</option>
                  <option value="punteada">Punteada</option>
                </select>
              </div>

              <div className="form-group">
                <label>Color</label>

                <div className="process-link-color-options">
                  {[
                    '#b9c5cf',
                    '#22d3c5',
                    '#4ea1ff',
                    '#f7c948',
                    '#ff6b6b',
                    '#a78bfa',
                    '#ffffff',
                    '#111111',
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={
                        processLinkColor === color
                          ? 'active'
                          : ''
                      }
                      style={{
                        backgroundColor: color,
                      }}
                      onClick={() =>
                        setProcessLinkColor(color)
                      }
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="process-link-drawer-help">
                Doble click sobre una flecha para volver a editarla.
              </div>

              <div className="connection-drawer-actions">
                <button
                  type="button"
                  className="btn-delete-task"
                  onClick={() =>
                    eliminarProcessLink(processLinkEditando)
                  }
                >
                  Eliminar conexión
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={cerrarProcessLinkDrawer}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                >
                  Guardar
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {archivoOpen && (
        <div
          className="card-drawer-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setArchivoOpen(false)
            }
          }}
        >
          <aside className="card-editor-drawer archive-drawer">
            <div className="card-modal-heading">
              <div>
                <span>Archivo</span>
                <h3>Cards archivadas</h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setArchivoOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="archive-list">
              {cardsArchivadas.map((card) => (
                <div
                  className="archive-list-item"
                  key={card.id}
                >
                  <div>
                    <strong>
                      {card.titulo}
                    </strong>

                    <span>
                      {card.tipo === 'Nota'
                        ? 'Nota'
                        : card.estado || 'Card'}
                    </span>
                  </div>

                  <div className="archive-list-actions">
                    <button
                      type="button"
                      onClick={() =>
                        restaurarCard(card)
                      }
                    >
                      Restaurar
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        eliminarCardArchivada(card)
                      }
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}

              {cardsArchivadas.length === 0 && (
                <div className="archive-empty">
                  No hay cards archivadas en este board.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {zoneDrawerOpen && (
        <div
          className="card-drawer-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              cerrarZonaDrawer()
            }
          }}
        >
          <aside className="card-editor-drawer zone-editor-drawer">
            <form onSubmit={guardarZona}>
              <div className="card-modal-heading">
                <div>
                  <span>Organización visual</span>
                  <h3>
                    {zoneEditando
                      ? 'Editar zona'
                      : 'Nueva zona'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={cerrarZonaDrawer}
                >
                  ×
                </button>
              </div>

              <div className="form-group">
                <label>Título de la zona</label>

                <input
                  type="text"
                  value={formZone.titulo}
                  onChange={(e) =>
                    setFormZone((actual) => ({
                      ...actual,
                      titulo: e.target.value,
                    }))
                  }
                  placeholder="Ej: Infraestructura"
                />
              </div>

              <div className="form-group zone-color-field">
                <label>Color</label>

                <div className="zone-color-options">
                  {[
                    '#5b8def',
                    '#2fbf8f',
                    '#f0b44d',
                    '#ed6a5a',
                    '#a97bdc',
                    '#d86f9e',
                    '#6f8794',
                    '#67b8c7',
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={
                        formZone.color === color
                          ? 'active'
                          : ''
                      }
                      style={{
                        backgroundColor: color,
                      }}
                      onClick={() =>
                        setFormZone((actual) => ({
                          ...actual,
                          color,
                        }))
                      }
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="zone-preview-card">
                <div
                  style={{
                    borderColor:
                      formZone.color,
                    backgroundColor:
                      `${formZone.color}2e`,
                  }}
                >
                  <strong
                    style={{
                      backgroundColor:
                        formZone.color,
                    }}
                  >
                    {formZone.titulo ||
                      'Título de zona'}
                  </strong>
                </div>
              </div>

              <div className="modal-actions modal-actions-task">
                {zoneEditando && (
                  <button
                    type="button"
                    className="btn-delete-task"
                    onClick={() =>
                      eliminarZona(zoneEditando)
                    }
                  >
                    Eliminar
                  </button>
                )}

                <div className="modal-actions-right">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cerrarZonaDrawer}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Guardar zona
                  </button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}

      {modalCardOpen && (
        <div className="card-drawer-overlay">
          <aside className="card-editor-drawer">
            <form onSubmit={guardarCard}>
              <div className="card-modal-heading">
                <div>
                  <span>
                    {cardEditando
                      ? 'Editar post-it'
                      : 'Nuevo post-it'}
                  </span>

                  <h3>
                    {cardEditando
                      ? 'Editar card'
                      : 'Nueva card'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={cerrarModalCard}
                >
                  ×
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo</label>

                  <div className="card-type-readonly">
                    {formCard.tipo === 'Nota'
                      ? 'Nota'
                      : 'Card'}
                  </div>
                </div>

                {formCard.tipo !== 'Nota' && (
                  <div className="form-group">
                    <label>Estado</label>

                    <select
                      value={formCard.estado}
                      onChange={(e) =>
                        setFormCard((actual) => ({
                          ...actual,
                          estado: e.target.value,
                        }))
                      }
                    >
                      <option>Pendiente</option>
                      <option>En curso</option>
                      <option>Finalizado</option>
                      <option>Bloqueado</option>
                    </select>
                  </div>
                )}

                <div className="form-group full">
                  <label>Título</label>

                  <input
                    type="text"
                    value={formCard.titulo}
                    onChange={(e) =>
                      setFormCard((actual) => ({
                        ...actual,
                        titulo: e.target.value,
                      }))
                    }
                    placeholder="Título de la card"
                  />
                </div>

                <div className="form-group full">
                  <label>Descripción</label>

                  <textarea
                    rows="4"
                    value={formCard.descripcion}
                    onChange={(e) =>
                      setFormCard((actual) => ({
                        ...actual,
                        descripcion: e.target.value,
                      }))
                    }
                    placeholder="Descripción breve..."
                  />
                </div>

                {formCard.tipo !== 'Nota' && (
                  <div className="form-group">
                  <label>Responsable</label>

                  <select
                    value={formCard.responsable}
                    onChange={(e) =>
                      setFormCard((actual) => ({
                        ...actual,
                        responsable: e.target.value,
                      }))
                    }
                  >
                    <option value="">
                      Sin asignar
                    </option>

                    {perfiles.map((perfil) => (
                      <option
                        key={perfil.id}
                        value={perfil.nombre}
                      >
                        {perfil.nombre}
                      </option>
                    ))}
                  </select>
                  </div>

                )}

                <div className="form-group">
                  <label>Color</label>

                  <select
                    value={formCard.color}
                    onChange={(e) =>
                      setFormCard((actual) => ({
                        ...actual,
                        color: e.target.value,
                      }))
                    }
                  >
                    <option value="yellow">
                      Amarillo
                    </option>
                    <option value="pink">
                      Rosa
                    </option>
                    <option value="blue">
                      Celeste
                    </option>
                    <option value="green">
                      Verde
                    </option>
                    <option value="peach">
                      Durazno
                    </option>
                    <option value="purple">
                      Violeta
                    </option>
                    <option value="orange">
                      Naranja
                    </option>
                    <option value="red">
                      Rojo suave
                    </option>
                    <option value="teal">
                      Turquesa
                    </option>
                    <option value="gray">
                      Gris
                    </option>
                    <option value="cream">
                      Crema
                    </option>
                    <option value="lavender">
                      Lavanda
                    </option>
                  </select>
                </div>

                {formCard.tipo !== 'Nota' && (
                  <>
                    <div className="form-group">
                  <label>Fecha inicio</label>

                  <input
                    type="date"
                    value={formCard.fecha_inicio}
                    onChange={(e) =>
                      setFormCard((actual) => ({
                        ...actual,
                        fecha_inicio: e.target.value,
                      }))
                    }
                  />
                    </div>

                    <div className="form-group">
                  <label>Fecha fin</label>

                  <input
                    type="date"
                    value={formCard.fecha_fin}
                    onChange={(e) =>
                      setFormCard((actual) => ({
                        ...actual,
                        fecha_fin: e.target.value,
                      }))
                    }
                  />
                    </div>
                  </>
                )}
              </div>

              <div className="card-checklist-editor">
                <div className="card-checklist-heading">
                  <div>
                    <span>Opcional</span>
                    <strong>Checklist</strong>
                  </div>

                  <button
                    type="button"
                    onClick={agregarChecklistItem}
                  >
                    + Ítem
                  </button>
                </div>

                {(formCard.checklist || []).map(
                  (item) => (
                    <div
                      className="card-checklist-row"
                      key={item.id}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(item.hecho)}
                        onChange={(e) =>
                          actualizarChecklistItem(
                            item.id,
                            {
                              hecho:
                                e.target.checked,
                            }
                          )
                        }
                      />

                      <input
                        type="text"
                        value={item.texto}
                        onChange={(e) =>
                          actualizarChecklistItem(
                            item.id,
                            {
                              texto:
                                e.target.value,
                            }
                          )
                        }
                        placeholder="Escribí un ítem..."
                      />

                      <button
                        type="button"
                        onClick={() =>
                          eliminarChecklistItem(
                            item.id
                          )
                        }
                        title="Eliminar ítem"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}

                {(formCard.checklist || []).length === 0 && (
                  <div className="card-checklist-empty">
                    Sin checklist. Agregala solo si la necesitás.
                  </div>
                )}
              </div>

              {cardEditando && (
                <>
                  <div className="card-layer-tools">
                    <span>Acciones</span>

                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          duplicarCard(cardEditando)
                        }
                      >
                        Duplicar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moverCardCapa(
                            cardEditando,
                            'frente'
                          )
                        }
                      >
                        Traer al frente
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moverCardCapa(
                            cardEditando,
                            'fondo'
                          )
                        }
                      >
                        Mandar atrás
                      </button>

                      <button
                        type="button"
                        className="archive-card-action"
                        onClick={() =>
                          archivarCard(cardEditando)
                        }
                      >
                        Archivar
                      </button>

                      {cardEditando.tipo !== 'Nota' && (
                        <button
                          type="button"
                          className={`card-gantt-action ${
                            cardEditando.gantt_task_id
                              ? 'linked'
                              : ''
                          }`}
                          onClick={() =>
                            abrirCardGantt(cardEditando)
                          }
                        >
                          {cardEditando.gantt_task_id
                            ? 'Gantt ✓'
                            : 'Gantt'}
                        </button>
                      )}
                    </div>

                    {cardGanttOpen &&
                      cardEditando.tipo !== 'Nota' && (
                        <div className="card-gantt-converter">
                          <label>
                            Proyecto destino
                          </label>

                          <select
                            value={cardGanttProjectId}
                            onChange={(event) =>
                              setCardGanttProjectId(
                                event.target.value
                              )
                            }
                          >
                            <option value="">
                              Seleccionar proyecto...
                            </option>

                            {proyectos
                              .filter(
                                (item) =>
                                  item.id !== '__all__'
                              )
                              .map((item) => (
                                <option
                                  key={item.id}
                                  value={item.id}
                                >
                                  {item.nombre}
                                </option>
                              ))}
                          </select>

                          <div className="card-gantt-converter-actions">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() =>
                                setCardGanttOpen(false)
                              }
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() =>
                                convertirCardEnGantt(
                                  cardEditando
                                )
                              }
                            >
                              Crear tarea
                            </button>
                          </div>

                          {cardEditando.gantt_task_id && (
                            <small>
                              Esta Card ya tiene una tarea
                              vinculada. Si creás otra,
                              se actualizará el vínculo a
                              la nueva tarea.
                            </small>
                          )}
                        </div>
                      )}
                  </div>

                  <div className="card-comments-section">
                    <div className="card-comments-title">
                      <div>
                        <span>Colaboración</span>
                        <strong>Comentarios</strong>
                      </div>

                      <small>
                        {comentariosCard.length}
                      </small>
                    </div>

                    <div className="card-comments-list">
                      {comentariosCard.map(
                        (comentario) => (
                          <div
                            className="card-comment"
                            key={comentario.id}
                          >
                            <div>
                              <strong>
                                {comentario.autor}
                              </strong>

                              <span>
                                {new Date(
                                  comentario.created_at
                                ).toLocaleString(
                                  'es-AR'
                                )}
                              </span>
                            </div>

                            <p>
                              {comentario.comentario}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarComentario(
                                  comentario
                                )
                              }
                              title="Eliminar comentario"
                            >
                              ×
                            </button>
                          </div>
                        )
                      )}

                      {comentariosCard.length === 0 && (
                        <div className="card-comments-empty">
                          Todavía no hay comentarios.
                        </div>
                      )}
                    </div>

                    <div className="card-comment-compose">
                      <textarea
                        rows="2"
                        value={nuevoComentario}
                        onChange={(e) =>
                          setNuevoComentario(
                            e.target.value
                          )
                        }
                        placeholder="Escribí un comentario..."
                      />

                      <button
                        type="button"
                        onClick={agregarComentario}
                        disabled={
                          !nuevoComentario.trim()
                        }
                      >
                        Comentar
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="modal-actions modal-actions-task">
                {cardEditando && (
                  <button
                    type="button"
                    className="btn-delete-task"
                    onClick={eliminarCard}
                  >
                    Eliminar
                  </button>
                )}

                <div className="modal-actions-right">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cerrarModalCard}
                  >
                    Cancelar
                  </button>

                  <button
                    className="btn-primary"
                    type="submit"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      )}

      {modalProyectoOpen && (
        <div className="modal-overlay">
          <div className="modal project-modal">
            <div className="modal-header">
              <div>
                <h2>Nuevo proyecto</h2>
                <p>Creá un nuevo espacio de planificación.</p>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={() => setModalProyectoOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={crearProyecto}>
              <div className="form-group full">
                <label>Nombre del proyecto</label>

                <input
                  value={nuevoProyecto.nombre}
                  onChange={(e) =>
                    setNuevoProyecto((actual) => ({
                      ...actual,
                      nombre: e.target.value,
                    }))
                  }
                  placeholder="Ej: Migración tecnológica"
                  autoFocus
                />
              </div>

              <div className="form-group full">
                <label>Descripción</label>

                <textarea
                  className="project-description"
                  value={nuevoProyecto.descripcion}
                  onChange={(e) =>
                    setNuevoProyecto((actual) => ({
                      ...actual,
                      descripcion: e.target.value,
                    }))
                  }
                  placeholder="Descripción breve del proyecto"
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalProyectoOpen(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                >
                  Crear proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalOpen && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>
                <h2>
                  {tareaEditando
                    ? 'Editar tarea'
                    : 'Nueva tarea'}
                </h2>

                <p>
                  {tareaEditando
                    ? 'Modificá los datos de la tarea.'
                    : 'Agregá una tarea al proyecto.'}
                </p>
              </div>

              <button
                className="close-btn"
                type="button"
                onClick={cerrarModal}
              >
                ×
              </button>

            </div>

            <form onSubmit={guardarTarea}>

              <div className="form-group full">

                <label>
                  Nombre de la tarea
                </label>

                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                />

              </div>

              <div className="form-group full">
                <label>
                  Tipo
                </label>

                <div className="task-type-selector">
                  <button
                    type="button"
                    className={
                      form.tipo === 'Tarea'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setForm((actual) => ({
                        ...actual,
                        tipo: 'Tarea',
                      }))
                    }
                  >
                    Tarea
                  </button>

                  <button
                    type="button"
                    className={
                      form.tipo === 'Hito'
                        ? 'active hito'
                        : 'hito'
                    }
                    onClick={() =>
                      setForm((actual) => ({
                        ...actual,
                        tipo: 'Hito',
                        responsableAnalista: '',
                        responsableDesarrollador: '',
                        dependencia: '',
                        hitoPadre: '',
                      }))
                    }
                  >
                    Hito
                  </button>
                </div>
              </div>

              <div className="form-grid">

                {form.tipo === 'Tarea' && (
                <div className="form-group">

                  <label>
                    Responsable Analista
                  </label>

                  <select
                    name="responsableAnalista"
                    value={form.responsableAnalista}
                    onChange={handleChange}
                  >
                    <option value="">
                      Seleccionar analista
                    </option>

                    {perfiles.map((perfil) => (
                      <option
                        key={perfil.id}
                        value={perfil.nombre}
                      >
                        {perfil.nombre}
                      </option>
                    ))}
                  </select>

                </div>
                )}

                {form.tipo === 'Tarea' && (
                <div className="form-group">

                  <label>
                    Responsable Desarrollador
                  </label>

                  <select
                    name="responsableDesarrollador"
                    value={form.responsableDesarrollador}
                    onChange={handleChange}
                  >
                    <option value="">
                      Sin asignar / Backlog
                    </option>

                    {perfiles.map((perfil) => (
                      <option
                        key={perfil.id}
                        value={perfil.nombre}
                      >
                        {perfil.nombre}
                      </option>
                    ))}
                  </select>

                </div>
                )}

                <div className="form-group">

                  <label>
                    Fecha inicio
                  </label>

                  <input
                    type="date"
                    name="inicio"
                    value={form.inicio}
                    onChange={handleChange}
                  />

                </div>

                {form.tipo === 'Tarea' && (
                <div className="form-group">

                  <label>
                    Duración en días
                  </label>

                  <input
                    type="number"
                    min="1"
                    name="duracion"
                    value={form.duracion}
                    onChange={handleChange}
                  />

                </div>
                )}

                {form.tipo === 'Tarea' && (
                  <div className="form-group">
                    <label>
                      Horas estimadas
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      name="horasEstimadas"
                      value={form.horasEstimadas}
                      onChange={handleChange}
                      placeholder="Ej: 13"
                    />
                  </div>
                )}

                {form.tipo === 'Tarea' && (
                <div className="form-group">

                  <label>
                    Estado
                  </label>

                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                  >
                    <option>Pendiente</option>
                    <option>En curso</option>
                    <option>Finalizado</option>
                    <option>Bloqueado</option>

                    {tareaEditando && (
                      <option>
                        Desestimado
                      </option>
                    )}
                  </select>

                </div>
                )}

                <div className="form-group">

                  <label>
                    Prioridad
                  </label>

                  <select
                    name="prioridad"
                    value={form.prioridad}
                    onChange={handleChange}
                  >
                    <option>Alta</option>
                    <option>Media</option>
                    <option>Baja</option>
                  </select>

                </div>

                {form.tipo === 'Tarea' && (
                <div className="form-group">

                  <label>
                    Dependencia
                  </label>

                  <select
                    name="dependencia"
                    value={form.dependencia}
                    onChange={handleChange}
                  >

                    <option value="">
                      Sin dependencia
                    </option>

                    {tareas
                      .filter(
                        (tarea) =>
                          tarea.id !== tareaEditando?.id
                      )
                      .map((tarea) => (
                        <option
                          key={tarea.id}
                          value={tarea.id}
                        >
                          {tarea.nombre}
                        </option>
                      ))}

                  </select>

                </div>
                )}

                {form.tipo === 'Tarea' && (
                  <div className="form-group">
                    <label>
                      Hito / Épica
                    </label>

                    <select
                      name="hitoPadre"
                      value={form.hitoPadre}
                      onChange={handleChange}
                    >
                      <option value="">
                        Sin hito
                      </option>

                      {tareas
                        .filter(
                          (tarea) =>
                            tarea.es_hito &&
                            tarea.id !== tareaEditando?.id
                        )
                        .map((tarea) => (
                          <option
                            key={tarea.id}
                            value={tarea.id}
                          >
                            {tarea.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

              </div>

              <div className="form-group full task-comment-field">
                <label>
                  Comentario de la tarea
                </label>

                <textarea
                  name="comentario"
                  value={form.comentario}
                  onChange={handleChange}
                  placeholder="Escribí un comentario, aclaración o seguimiento..."
                  rows="3"
                />
              </div>


              {form.inicio && (
                <div className="fecha-preview">
                  {form.tipo === 'Hito' ? (
                    <>
                      Fecha fin del hito:
                      <strong>
                        {' '}
                        automática según la tarea vinculada que finalice más tarde
                      </strong>
                    </>
                  ) : (
                    <>
                      Fecha fin calculada:
                      <strong>
                        {' '}
                        {calcularFin(
                          form.inicio,
                          form.duracion
                        )}
                      </strong>
                    </>
                  )}
                </div>
              )}

              <div className="modal-actions modal-actions-task">

                {tareaEditando && (
                  <button
                    type="button"
                    className="btn-delete-task"
                    onClick={async () => {
                      const eliminado =
                        await eliminarTarea(tareaEditando)

                      if (eliminado) {
                        cerrarModal()
                      }
                    }}
                  >
                    Eliminar
                  </button>
                )}

                <div className="modal-actions-right">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cerrarModal}
                  >
                    Cancelar
                  </button>

                  <button
                    className="btn-primary"
                    type="submit"
                  >
                    {tareaEditando
                      ? 'Guardar cambios'
                      : form.tipo === 'Hito'
                        ? 'Crear hito'
                        : 'Crear tarea'}
                  </button>
                </div>

              </div>

            </form>

          </div>

        </div>

      )}

      </div>
    </div>
  )
}

export default App