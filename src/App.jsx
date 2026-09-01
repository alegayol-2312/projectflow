import { useEffect, useMemo, useState } from 'react'
import './index.css'
import { supabase } from './lib/supabase'
import logoGP from './assets/logo-gp.png'

const formularioVacio = {
  nombre: '',
  responsable: '',
  inicio: '',
  duracion: 1,
  estado: 'Pendiente',
  prioridad: 'Media',
  dependencia: '',
  hito: false,
}

const nombresMeses = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [proyecto, setProyecto] = useState(null)
  const [tareas, setTareas] = useState([])
  const [historial, setHistorial] = useState([])
  const [historialExpandido, setHistorialExpandido] = useState(false)
  const [perfiles, setPerfiles] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [tareaEditando, setTareaEditando] = useState(null)

  const [form, setForm] = useState(formularioVacio)

  const [filtroResponsable, setFiltroResponsable] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [vista, setVista] = useState('gantt')

  // MES QUE ESTAMOS MIRANDO EN EL GANTT
  const hoyReal = new Date()

  const [mesVisualizado, setMesVisualizado] = useState(
    hoyReal.getMonth()
  )

  const [anioVisualizado, setAnioVisualizado] = useState(
    hoyReal.getFullYear()
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
      cargarProyecto()
    }
  }, [session])

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

  async function cargarProyecto() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('nombre', 'RPA & Automatización')
      .single()

    if (error) {
      console.error('Error cargando proyecto:', error)
      return
    }

    setProyecto(data)

    await Promise.all([
      cargarTareas(data.id),
      cargarHistorial(),
      cargarPerfiles(),
    ])
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

    const historialConUsuario = (historyData || []).map((item) => {
      const perfil = profilesData?.find(
        (profile) => profile.id === item.user_id
      )

      return {
        ...item,
        usuario_nombre:
          perfil?.nombre ||
          perfil?.email ||
          'Usuario',
      }
    })

    setHistorial(historialConUsuario)
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
      responsable: tarea.responsable,
      inicio: tarea.fecha_inicio,
      duracion: tarea.duracion_dias,
      estado: tarea.estado,
      prioridad: tarea.prioridad,
      dependencia: tarea.dependencia_id || '',
      hito: tarea.es_hito,
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

    if (!form.nombre || !form.responsable || !form.inicio) {
      alert('Completá nombre, responsable y fecha de inicio.')
      return
    }

    if (tareaEditando) {
      const { error } = await supabase
        .from('tasks')
        .update({
          nombre: form.nombre,
          responsable: form.responsable,
          fecha_inicio: form.inicio,
          duracion_dias: Number(form.duracion),
          estado: form.estado,
          prioridad: form.prioridad,
          es_hito: form.hito,

          fecha_finalizacion:
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
          responsable: form.responsable,
          fecha_inicio: form.inicio,
          duracion_dias: Number(form.duracion),
          estado: form.estado,
          prioridad: form.prioridad,
          es_hito: form.hito,
          created_by: session.user.id,

          fecha_finalizacion:
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
      cargarHistorial(),
    ])
  }

  async function finalizarTarea(tarea) {
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
      cargarHistorial(),
    ])
  }

  async function eliminarTarea(tarea) {
    const confirmar = window.confirm(
      `¿Eliminar "${tarea.nombre}"?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', tarea.id)

    if (error) {
      alert('No se pudo eliminar.')
      return
    }

    await Promise.all([
      cargarTareas(proyecto.id),
      cargarHistorial(),
    ])
  }

 // =========================
// NAVEGACIÓN DEL GANTT
// =========================

function irAHoy() {
  const hoy = new Date()

  setMesVisualizado(hoy.getMonth())
  setAnioVisualizado(hoy.getFullYear())
}

function cambiarMesDirecto(valor) {
  if (!valor) return

  const [anio, mes] = valor.split('-').map(Number)

  setAnioVisualizado(anio)
  setMesVisualizado(mes - 1)
}

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

const diasHabilesMes = useMemo(() => {
  const ultimoDia = new Date(
    anioVisualizado,
    mesVisualizado + 1,
    0
  ).getDate()

  const lista = []

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const fecha = new Date(
      anioVisualizado,
      mesVisualizado,
      dia
    )

    const numeroDia = fecha.getDay()

    if (numeroDia !== 0 && numeroDia !== 6) {
      lista.push(fecha)
    }
  }

  return lista
}, [mesVisualizado, anioVisualizado])

function posicionBarra(tarea) {
  const inicioTarea = parseDate(tarea.fecha_inicio)

  const finTarea = calcularFechaFinDate(
    tarea.fecha_inicio,
    tarea.duracion_dias
  )

  if (
    !inicioTarea ||
    !finTarea ||
    diasHabilesMes.length === 0
  ) {
    return null
  }

  const diasVisibles = diasHabilesMes.filter((fecha) => {
    return (
      fecha >= inicioTarea &&
      fecha <= finTarea
    )
  })

  if (diasVisibles.length === 0) {
    return null
  }

  const primerDiaVisible = diasVisibles[0]

  const indiceInicio = diasHabilesMes.findIndex((fecha) =>
    mismaFecha(fecha, primerDiaVisible)
  )

  return {
    left: `${
      (indiceInicio / diasHabilesMes.length) * 100
    }%`,

    width: `${
      (diasVisibles.length / diasHabilesMes.length) * 100
    }%`,

    center: `${
      (
        (indiceInicio + diasVisibles.length / 2) /
        diasHabilesMes.length
      ) * 100
    }%`,
  }
}

function posicionHoy() {
  const hoy = new Date()

  hoy.setHours(0, 0, 0, 0)

  const indiceHoy = diasHabilesMes.findIndex((fecha) =>
    mismaFecha(fecha, hoy)
  )

  if (indiceHoy === -1) {
    return null
  }

  return (
    ((indiceHoy + 0.5) / diasHabilesMes.length) *
    100
  )
}

  const responsables = useMemo(() => {
    return perfiles
      .map((perfil) => perfil.nombre)
      .filter(Boolean)
      .sort()
  }, [perfiles])

  const tareasFiltradas = useMemo(() => {
    return tareas.filter((tarea) => {
      const responsableOK =
        filtroResponsable === 'Todos' ||
        tarea.responsable === filtroResponsable

      const estadoOK =
        filtroEstado === 'Todos' ||
        tarea.estado === filtroEstado

      return responsableOK && estadoOK
    })
  }, [tareas, filtroResponsable, filtroEstado])

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

  function colorEstado(estado) {
    if (estado === 'Finalizado') return 'estado finalizado'
    if (estado === 'En curso') return 'estado en-curso'
    if (estado === 'Bloqueado') return 'estado bloqueado'

    return 'estado pendiente'
  }

  function colorBarra(tarea) {
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

  const historialVisible =
  historialExpandido
    ? historial
    : historial.slice(0, 5)

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

          <h1>Proyecto 1</h1>

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
            <h1>Proyecto 1</h1>

<p>
  Proyecto: RPA & Automatización
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
          >
            + Nueva tarea
          </button>

        </div>

      </header>

      <section className="filters">

        <select>
          <option>
  RPA & Automatización
</option>
        </select>

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

        </div>

      </section>

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

      {vista === 'gantt' && (
        <>
          <section className="gantt-navigation">

  <div className="gantt-period-title">

    <span>Período visualizado</span>

    <strong>
      {nombresMeses[mesVisualizado]} {anioVisualizado}
    </strong>

  </div>

  <div className="gantt-nav-right">

    <button
      className="today-button"
      onClick={irAHoy}
    >
      Hoy
    </button>

    <input
      className="month-picker"
      type="month"
      value={`${anioVisualizado}-${String(
        mesVisualizado + 1
      ).padStart(2, '0')}`}
      onChange={(e) =>
        cambiarMesDirecto(e.target.value)
      }
    />

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
                <div>Responsable</div>
                <div>Inicio</div>
                <div>Días</div>
                <div>Estado</div>
                <div>Acciones</div>

              </div>

              {tareasFiltradas.map((tarea) => (

                <div
  className={`task-grid task-row ${
    posicionBarra(tarea)
      ? ''
      : 'task-outside-month'
  }`}
  key={tarea.id}
>

                  <div className="task-name">

                    {estaAtrasada(tarea) && (
                      <span className="late-icon">
                        ⚠
                      </span>
                    )}

                    <div>

                      <div>
                        {tarea.nombre}

                        {tarea.es_hito && (
                          <span className="hito-badge">
                            ◆
                          </span>
                        )}
                      </div>

                      {tarea.dependencia_id && (
                        <small className="dependencia-text">
                          Depende de: {nombreDependencia(tarea)}
                        </small>
                      )}

                    </div>

                  </div>

                  <div>
                    {tarea.responsable}
                  </div>

                  <div>
                    {parseDate(
                      tarea.fecha_inicio
                    )?.toLocaleDateString('es-AR')}
                  </div>

                  <div>
                    {tarea.duracion_dias}
                  </div>

                  <div>
                    <span
                      className={colorEstado(
                        tarea.estado
                      )}
                    >
                      {tarea.estado}
                    </span>
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

                    {tarea.estado !== 'Finalizado' && (
                      <button
                        className="mini-button success"
                        onClick={() =>
                          finalizarTarea(tarea)
                        }
                      >
                        ✓
                      </button>
                    )}

                    <button
                      className="mini-button danger"
                      onClick={() =>
                        eliminarTarea(tarea)
                      }
                    >
                      ×
                    </button>

                  </div>

                </div>

              ))}

            </section>

            <section className="gantt-panel dynamic-gantt">

  <div className="gantt-title-row">

    <h2>
      Gantt de seguimiento
    </h2>

    <span>
      Lunes a viernes
    </span>

  </div>

  <div
    className="days-header"
    style={{
      gridTemplateColumns:
        `repeat(${diasHabilesMes.length}, 1fr)`,
    }}
  >
    {diasHabilesMes.map((fecha) => (
      <div
        key={fecha.toISOString()}
        className="day-header"
      >
        <span>
          {inicialDiaSemanaFecha(fecha)}
        </span>

        <strong>
          {fecha.getDate()}
        </strong>
      </div>
    ))}
  </div>

  <div className="dynamic-gantt-body">

                {hoyPos !== null && (
                  <div
                    className="today-line-real"
                    style={{
                      left: `${hoyPos}%`,
                    }}
                  >
                    <span>
                      HOY
                    </span>
                  </div>
                )}

                {tareasFiltradas.map((tarea) => {

                  const posicion =
                    posicionBarra(tarea)

                  return (
                    <div
                      className="dynamic-gantt-row"
                      key={tarea.id}
                    >

                      <div
  className="day-background-grid"
  style={{
    gridTemplateColumns:
      `repeat(${diasHabilesMes.length}, 1fr)`,
  }}
>
  {diasHabilesMes.map((fecha) => (
    <div
      key={fecha.toISOString()}
      className="day-cell"
    />
  ))}
</div>

                      {posicion && (
                        tarea.es_hito
                          ? (
                            <div
                            
  className="gantt-milestone"
  style={{
    left: posicion.center,
  }}
  title={tarea.nombre}
>
  ◆
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

            </section>

          </main>
        </>
      )}

      {vista === 'tabla' && (
        <section className="task-panel">

          <div className="section-title">
            <h2>Vista tabla</h2>

            <span>
              {tareasFiltradas.length} tareas
            </span>
          </div>

          <div className="table-header task-grid">

            <div>Tarea</div>
            <div>Responsable</div>
            <div>Inicio</div>
            <div>Días</div>
            <div>Estado</div>
            <div>Acciones</div>

          </div>

          {tareasFiltradas.map((tarea) => (
            <div
              className="task-grid task-row"
              key={tarea.id}
            >

              <div className="task-name">
                {tarea.nombre}
              </div>

              <div>
                {tarea.responsable}
              </div>

              <div>
                {parseDate(
                  tarea.fecha_inicio
                )?.toLocaleDateString('es-AR')}
              </div>

              <div>
                {tarea.duracion_dias}
              </div>

              <div>
                <span
                  className={colorEstado(tarea.estado)}
                >
                  {tarea.estado}
                </span>
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

                {tarea.estado !== 'Finalizado' && (
                  <button
                    className="mini-button success"
                    onClick={() =>
                      finalizarTarea(tarea)
                    }
                  >
                    ✓
                  </button>
                )}

                <button
                  className="mini-button danger"
                  onClick={() =>
                    eliminarTarea(tarea)
                  }
                >
                  ×
                </button>

              </div>

            </div>
          ))}

        </section>
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

              <div className="form-grid">

                <div className="form-group">

                  <label>
                    Responsable
                  </label>

                  <select
                    name="responsable"
                    value={form.responsable}
                    onChange={handleChange}
                  >
                    <option value="">
                      Seleccionar responsable
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

              </div>

              <div className="form-check-row">

                <input
                  type="checkbox"
                  id="hito"
                  name="hito"
                  checked={form.hito}
                  onChange={handleChange}
                />

                <label htmlFor="hito">
                  Marcar como hito
                </label>

              </div>

              {form.inicio && (

                <div className="fecha-preview">

                  Fecha fin calculada:

                  <strong>
                    {' '}
                    {calcularFin(
                      form.inicio,
                      form.duracion
                    )}
                  </strong>

                </div>

              )}

              <div className="modal-actions">

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
                    : 'Crear tarea'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  )
}

export default App