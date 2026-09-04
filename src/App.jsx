import { useEffect, useMemo, useRef, useState } from 'react'
import './index.css'
import { supabase } from './lib/supabase'
import logoGP from './assets/logo-gp.png'

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

  function calcularFechaFinDate(inicio, duracion) {
    const fecha = parseDate(inicio)

    if (!fecha) return null

    const fin = new Date(fecha)

    fin.setDate(
      fin.getDate() + Number(duracion) - 1
    )

    return fin
  }

  function calcularFin(inicio, duracion) {
    const fecha = calcularFechaFinDate(inicio, duracion)

    if (!fecha) return ''

    return fecha.toLocaleDateString('es-AR')
  }

  function calcularAvance(tarea) {
    if (tarea.estado === 'Finalizado') {
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

    const diasPasados =
      Math.floor(
        (hoy - inicio) / 86400000
      ) + 1

    return Math.min(
      100,
      Math.round(
        (diasPasados /
          Number(tarea.duracion_dias)) *
          100
      )
    )
  }

  function estaAtrasada(tarea) {
    if (tarea.estado === 'Finalizado') {
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
      (
        !form.responsableAnalista ||
        !form.responsableDesarrollador
      )
    ) {
      alert(
        'Para una tarea completá responsable analista y responsable desarrollador.'
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
            form.estado === 'Finalizado'
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
      cargarHistorial(),
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
      cargarHistorial(),
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
      cargarHistorial(),
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
    'Fecha fin',
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
    const total = tareas.length

    const finalizadas =
      tareas.filter(
        (t) => t.estado === 'Finalizado'
      ).length

    const enCurso =
      tareas.filter(
        (t) => t.estado === 'En curso'
      ).length

    const atrasadas =
      tareas.filter(estaAtrasada).length

    const promedio =
      total === 0
        ? 0
        : Math.round(
            tareas.reduce(
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
        tarea.estado === 'Finalizado'
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

  const dashboardProyectos = useMemo(() => {
    return proyectos.map((proyectoItem) => {
      const tareasProyecto =
        todasLasTareas.filter(
          (tarea) =>
            tarea.project_id === proyectoItem.id
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

    const totalTareas =
      todasLasTareas.length

    const vencidas =
      todasLasTareas.filter(
        (tarea) => estaAtrasada(tarea)
      ).length

    const bloqueadas =
      todasLasTareas.filter(
        (tarea) =>
          tarea.estado === 'Bloqueado'
      ).length

    const avancePromedio =
      totalTareas === 0
        ? 0
        : Math.round(
            todasLasTareas.reduce(
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
    <div className="app">

      <header className="topbar">

        <div className="brand-area">

          <div className="logo image-logo">
  <img src={logoGP} alt="Grupo Petersen" />
</div>

          <div>
            <h1>Grupo Petersen</h1>

<p>
  Proyecto: {
    proyectoSeleccionadoId === '__all__'
      ? 'Todos los proyectos'
      : proyecto?.nombre || 'Sin proyecto'
  }
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

        </div>

      </header>

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
            className={vista === 'historial' ? 'active' : ''}
            onClick={() =>
              setVista('historial')
            }
          >
            Historial
          </button>

          <button
            className={vista === 'capacity' ? 'active' : ''}
            onClick={() =>
              setVista('capacity')
            }
          >
            Capacity
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
                  {tareasFiltradas.length} de {tareas.length}
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

              {tareasVisuales.map((tarea) => (

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

  <span>
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

                    {tareasVisuales.map((tarea) => {
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

                  <span>
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


      {proyectoSeleccionadoId !== '__all__' && vista === 'capacity' && (
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

      {proyectoSeleccionadoId !== '__all__' && vista === 'historial' && (
        <section className="history-page">
          <div className="history-page-header">
            <div>
              <h2>Historial de actividad</h2>
              <p>
                Todos los cambios registrados en tareas de todos los proyectos.
              </p>
            </div>

            <span className="history-count">
              {historial.length} movimientos
            </span>
          </div>

          <div className="history-table-header">
            <div>Fecha</div>
            <div>Proyecto</div>
            <div>Tarea</div>
            <div>Usuario</div>
            <div>Acción</div>
            <div>Detalle</div>
          </div>

          <div className="history-page-list">
            {historial.map((item) => (
              <div
                className="history-table-row"
                key={item.id}
              >
                <div className="history-date">
                  {formatoFechaHora(item.created_at)}
                </div>

                <div className="history-project">
                  {item.proyecto_nombre}
                </div>

                <div className="history-task">
                  {item.tarea_nombre}
                </div>

                <div>
                  {item.usuario_nombre}
                </div>

                <div>
                  <span className="history-action-chip">
                    {item.accion}
                  </span>
                </div>

                <div className="history-detail">
                  {item.detalle || '—'}
                </div>
              </div>
            ))}

            {historial.length === 0 && (
              <div className="history-empty">
                Todavía no hay movimientos registrados.
              </div>
            )}
          </div>
        </section>
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
                      Seleccionar desarrollador
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
  )
}

export default App