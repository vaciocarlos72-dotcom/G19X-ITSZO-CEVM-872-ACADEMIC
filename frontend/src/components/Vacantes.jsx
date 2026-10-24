import { useEffect, useState } from 'react'
import {
  Bot,
  Briefcase,
  Building2,
  CheckCircle,
  Edit,
  Laptop,
  MapPin,
  LoaderCircle,
  Trash2,
  Upload,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { API_BASE_URL } from '../api'
import CrearVacante from './CrearVacante'

const vacantesDemo = [
  {
    id: 'demo-react',
    titulo: 'Desarrollador React',
    descripcion: 'Construye experiencias web rápidas y accesibles para nuestros productos digitales.',
    estado: 'Activa',
    ubicacion: 'Remoto',
    contrato: 'Tiempo completo',
    postulacionesDemo: 18,
    limiteDemo: 30,
    esDemo: true,
  },
  {
    id: 'demo-data',
    titulo: 'Ingeniero de Datos',
    descripcion: 'Diseña pipelines de datos escalables y habilita decisiones basadas en información.',
    estado: 'Activa',
    ubicacion: 'Híbrido',
    contrato: 'Tiempo completo',
    postulacionesDemo: 12,
    limiteDemo: 24,
    esDemo: true,
  },
  {
    id: 'demo-product',
    titulo: 'Product Designer',
    descripcion: 'Lleva ideas de producto a soluciones intuitivas centradas en las personas.',
    estado: 'Activa',
    ubicacion: 'Remoto',
    contrato: 'Contrato',
    postulacionesDemo: 9,
    limiteDemo: 20,
    esDemo: true,
  },
  {
    id: 'demo-people',
    titulo: 'People & Culture Analyst',
    descripcion: 'Impulsa iniciativas de talento, cultura y desarrollo organizacional.',
    estado: 'Cerrada',
    ubicacion: 'Híbrido',
    contrato: 'Tiempo completo',
    postulacionesDemo: 20,
    limiteDemo: 20,
    esDemo: true,
  },
]

function Vacantes({ refreshTrigger }) {
  const [vacantes, setVacantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mostrarModalNueva, setMostrarModalNueva] = useState(false)
  const [refreshVacantes, setRefreshVacantes] = useState(0)
  const [usandoDatosDemo, setUsandoDatosDemo] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [datosEdicion, setDatosEdicion] = useState({})
  const [candidatosDisponibles, setCandidatosDisponibles] = useState([])
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState({})
  const [vacanteExpandida, setVacanteExpandida] = useState(null)
  const [postulacionesActivas, setPostulacionesActivas] = useState([])
  const [cvSeleccionados, setCvSeleccionados] = useState({})
  const [evaluacionesCv, setEvaluacionesCv] = useState({})
  const [erroresCv, setErroresCv] = useState({})
  const [evaluandoCv, setEvaluandoCv] = useState({})
  const [isLoading, setIsLoading] = useState({})

  const getEstadoBadge = (estado) => {
    const estadoNormalizado = (estado || '').toLowerCase()
    if (estadoNormalizado.includes('cerr')) {
      return 'bg-gray-100 text-gray-700'
    }
    if (estadoNormalizado.includes('paus')) {
      return 'bg-amber-100 text-amber-700'
    }
    return 'bg-emerald-100 text-emerald-700'
  }

  useEffect(() => {
    let isMounted = true

    const fetchVacantes = async () => {
      try {
        const response = await api.get('/vacantes/')
        if (isMounted) {
          setUsandoDatosDemo(response.data.length === 0)
          setVacantes(
            response.data.length === 0
              ? vacantesDemo
              : response.data.map((vacante, index) => ({
                  ...vacante,
                  ubicacion: vacante.ubicacion || (index % 2 ? 'Híbrido' : 'Remoto'),
                  contrato: vacante.contrato || 'Tiempo completo',
                  postulacionesDemo:
                    vacante.postulaciones?.length ??
                    [18, 12, 9, 20][index % 4],
                  limiteDemo: [30, 24, 20, 20][index % 4],
                })),
          )
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron cargar las vacantes.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchVacantes()

    return () => {
      isMounted = false
    }
  }, [refreshTrigger, refreshVacantes])

  useEffect(() => {
    let isMounted = true

    const fetchCandidatos = async () => {
      try {
        const response = await api.get('/candidatos/')
        if (isMounted) {
          setCandidatosDisponibles(response.data)
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron cargar los candidatos disponibles.')
        }
      }
    }

    fetchCandidatos()

    return () => {
      isMounted = false
    }
  }, [])

  const eliminarRegistro = async (id) => {
    setError('')
    try {
      await api.delete(`/vacantes/${id}`)
      setVacantes((currentVacantes) =>
        currentVacantes.filter((vacante) => vacante.id !== id),
      )
      setUsandoDatosDemo(false)
      toast.success('Vacante eliminada correctamente.')
    } catch {
      setError('No se pudo eliminar la vacante.')
      toast.error('No se pudo eliminar la vacante.')
    }
  }

  const iniciarEdicion = (vacante) => {
    setEditandoId(vacante.id)
    setDatosEdicion({
      titulo: vacante.titulo,
      descripcion: vacante.descripcion || '',
      estado: vacante.estado,
    })
    setError('')
  }

  const guardarEdicion = async (id) => {
    if (!datosEdicion.titulo?.trim() || !datosEdicion.estado?.trim()) {
      setError('El titulo y el estado son obligatorios.')
      return
    }

    try {
      const response = await api.put(`/vacantes/${id}`, {
        titulo: datosEdicion.titulo.trim(),
        descripcion: datosEdicion.descripcion?.trim() || null,
        estado: datosEdicion.estado.trim(),
      })
      setVacantes((currentVacantes) =>
        currentVacantes.map((vacante) =>
          vacante.id === id
            ? {
                ...response.data,
                ubicacion: vacante.ubicacion,
                contrato: vacante.contrato,
                postulacionesDemo: vacante.postulacionesDemo,
                limiteDemo: vacante.limiteDemo,
              }
            : vacante,
        ),
      )
      setEditandoId(null)
      setDatosEdicion({})
      setError('')
      toast.success('Vacante actualizada correctamente.')
    } catch {
      setError('No se pudo actualizar la vacante.')
      toast.error('No se pudo actualizar la vacante.')
    }
  }

  const asignarCandidato = async (vacanteId) => {
    const candidatoId = candidatoSeleccionado[vacanteId]
    if (!candidatoId) {
      toast.error('Selecciona un candidato antes de asignarlo.')
      return
    }

    try {
      await api.post('/postulaciones/', {
        candidato_id: Number(candidatoId),
        vacante_id: vacanteId,
      })
      toast.success('Candidato asignado correctamente.')
      setCandidatoSeleccionado((currentSelection) => ({
        ...currentSelection,
        [vacanteId]: '',
      }))
    } catch {
      toast.error('No se pudo asignar el candidato.')
    }
  }

  const mostrarPostulados = async (vacanteId) => {
    if (vacanteExpandida === vacanteId) {
      setVacanteExpandida(null)
      setPostulacionesActivas([])
      return
    }

    try {
      const response = await api.get(`/vacantes/${vacanteId}/postulaciones`)
      setPostulacionesActivas(response.data)
      setVacanteExpandida(vacanteId)
      setError('')
    } catch {
      setError('No se pudieron cargar los postulados.')
    }
  }

  const evaluarPostulacion = async (postulacionId) => {
    setIsLoading((actuales) => ({
      ...actuales,
      [postulacionId]: true,
    }))

    try {
      const response = await api.post(`/agente/evaluar/${postulacionId}`)
      setPostulacionesActivas((currentPostulaciones) =>
        currentPostulaciones.map((postulacion) =>
          postulacion.id === postulacionId
            ? { ...postulacion, ...response.data }
            : postulacion,
        ),
      )
      toast.success('Postulación evaluada correctamente.')
    } catch {
      toast.error('No se pudo evaluar la postulación.')
    } finally {
      setIsLoading((actuales) => ({
        ...actuales,
        [postulacionId]: false,
      }))
    }
  }

  const seleccionarCv = (postulacionId, archivo) => {
    setCvSeleccionados((actuales) => ({
      ...actuales,
      [postulacionId]: archivo,
    }))
    setEvaluacionesCv((actuales) => ({
      ...actuales,
      [postulacionId]: null,
    }))
    setErroresCv((actuales) => ({
      ...actuales,
      [postulacionId]: '',
    }))
  }

  const subirCvYEvaluar = async (postulacion, vacanteId) => {
    const archivo = cvSeleccionados[postulacion.id]
    if (!archivo) {
      setErroresCv((actuales) => ({
        ...actuales,
        [postulacion.id]: 'Selecciona un archivo PDF antes de evaluar.',
      }))
      return
    }

    if (!archivo.name.toLowerCase().endsWith('.pdf')) {
      setErroresCv((actuales) => ({
        ...actuales,
        [postulacion.id]: 'El archivo debe tener formato PDF.',
      }))
      return
    }

    if (archivo.size > 10 * 1024 * 1024) {
      setErroresCv((actuales) => ({
        ...actuales,
        [postulacion.id]: 'El PDF no puede superar los 10 MB.',
      }))
      return
    }

    setEvaluandoCv((actuales) => ({
      ...actuales,
      [postulacion.id]: true,
    }))
    setErroresCv((actuales) => ({
      ...actuales,
      [postulacion.id]: '',
    }))
    setEvaluacionesCv((actuales) => ({
      ...actuales,
      [postulacion.id]: null,
    }))

    const formData = new FormData()
    formData.append('archivo', archivo)

    try {
      const query = new URLSearchParams({ vacante_id: String(vacanteId) })
      const response = await fetch(
        `${API_BASE_URL}/api/v1/candidatos/${postulacion.candidato_id}/cv?${query}`,
        {
          method: 'POST',
          body: formData,
        },
      )
      const resultado = await response.json()

      if (!response.ok) {
        throw new Error(
          resultado.detail || 'No se pudo evaluar el CV. Intenta nuevamente.',
        )
      }

      setEvaluacionesCv((actuales) => ({
        ...actuales,
        [postulacion.id]: resultado,
      }))
      setPostulacionesActivas((actuales) =>
        actuales.map((actual) =>
          actual.id === postulacion.id
            ? {
                ...actual,
                score_compatibilidad: resultado.score,
                justificacion_agente: resultado.justificacion,
              }
            : actual,
        ),
      )
      setCvSeleccionados((actuales) => ({
        ...actuales,
        [postulacion.id]: null,
      }))
    } catch (error) {
      setErroresCv((actuales) => ({
        ...actuales,
        [postulacion.id]:
          error instanceof Error
            ? error.message
            : 'No se pudo conectar con el servicio de evaluación.',
      }))
    } finally {
      setEvaluandoCv((actuales) => ({
        ...actuales,
        [postulacion.id]: false,
      }))
    }
  }

  if (loading) {
    return <p className="text-gray-600">Cargando vacantes...</p>
  }

  if (error) {
    return <p className="text-red-700" role="alert">{error}</p>
  }

  return (
    <section className="space-y-5 pb-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Talento y oportunidades
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Vacantes disponibles
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona tus posiciones y consulta el avance de cada proceso.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            {vacantes.length} {vacantes.length === 1 ? 'posición' : 'posiciones'}
          </span>
          <button
            type="button"
            onClick={() => setMostrarModalNueva(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Briefcase size={16} aria-hidden="true" />
            Nueva Vacante
          </button>
        </div>
      </div>
      {usandoDatosDemo && (
        <p className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Mostrando 4 vacantes de demostración. Se reemplazarán al crear
          vacantes reales.
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {vacantes.map((vacante) => (
          <article
            key={vacante.id}
            className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
          >
            {editandoId === vacante.id ? (
              <div className="space-y-3">
                <input
                  value={datosEdicion.titulo || ''}
                  onChange={(event) =>
                    setDatosEdicion({
                      ...datosEdicion,
                      titulo: event.target.value,
                    })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-label="Titulo de la vacante"
                />
                <textarea
                  value={datosEdicion.descripcion || ''}
                  onChange={(event) =>
                    setDatosEdicion({
                      ...datosEdicion,
                      descripcion: event.target.value,
                    })
                  }
                  className="min-h-24 w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-label="Descripcion de la vacante"
                />
                <input
                  value={datosEdicion.estado || ''}
                  onChange={(event) =>
                    setDatosEdicion({
                      ...datosEdicion,
                      estado: event.target.value,
                    })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-label="Estado de la vacante"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => guardarEdicion(vacante.id)}
                    className="flex items-center gap-1 rounded bg-emerald-500 px-3 py-1 text-white transition hover:scale-105 hover:bg-emerald-600"
                  >
                    <CheckCircle size={16} aria-hidden="true" />
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoId(null)}
                    className="flex items-center gap-1 rounded bg-gray-500 px-3 py-1 text-white transition hover:scale-105 hover:bg-gray-600"
                  >
                    <X size={16} aria-hidden="true" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                      <Briefcase size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold leading-6 text-slate-900">
                        {vacante.titulo}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Proceso de selección
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getEstadoBadge(vacante.estado)}`}
                  >
                    {vacante.estado}
                  </span>
                </div>
                <p className="mt-4 min-h-10 text-sm leading-6 text-slate-600">
                  {vacante.descripcion || 'Sin descripcion'}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-100 pb-4 text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    {vacante.ubicacion === 'Remoto' ? (
                      <Laptop size={16} className="text-slate-400" aria-hidden="true" />
                    ) : (
                      <MapPin size={16} className="text-slate-400" aria-hidden="true" />
                    )}
                    {vacante.ubicacion || 'Ubicación flexible'}
                  </span>
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <Building2 size={16} className="text-slate-400" aria-hidden="true" />
                    {vacante.contrato || 'Tiempo completo'}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <UsersRound size={16} className="text-slate-400" aria-hidden="true" />
                      Candidatos postulados
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {vacante.postulacionesDemo} / {vacante.limiteDemo}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`Postulaciones para ${vacante.titulo}`}
                    aria-valuemin={0}
                    aria-valuemax={vacante.limiteDemo}
                    aria-valuenow={Math.min(
                      vacante.postulacionesDemo,
                      vacante.limiteDemo,
                    )}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        vacante.esDemo ? 'bg-indigo-500' : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (vacante.postulacionesDemo / vacante.limiteDemo) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-right text-xs text-slate-400">
                    Meta de postulaciones
                  </p>
                </div>
                {!vacante.esDemo && <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={candidatoSeleccionado[vacante.id] || ''}
                      onChange={(event) =>
                        setCandidatoSeleccionado((currentSelection) => ({
                          ...currentSelection,
                          [vacante.id]: event.target.value,
                        }))
                      }
                      className="flex-1 rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`Candidato para ${vacante.titulo}`}
                    >
                      <option value="">Seleccionar candidato</option>
                      {candidatosDisponibles.map((candidato) => (
                        <option key={candidato.id} value={candidato.id}>
                          {candidato.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => asignarCandidato(vacante.id)}
                      className="flex items-center justify-center gap-1 rounded bg-emerald-500 px-3 py-2 text-white transition hover:scale-105 hover:bg-emerald-600"
                    >
                      <UserPlus size={16} aria-hidden="true" />
                      Asignar Candidato
                    </button>
                  </div>
                </div>}
                {!vacante.esDemo && (
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => mostrarPostulados(vacante.id)}
                    className="rounded bg-blue-600 px-3 py-1 text-white transition hover:scale-105 hover:bg-blue-700"
                  >
                    {vacanteExpandida === vacante.id
                      ? 'Ocultar Postulados'
                      : 'Ver Postulados'}
                  </button>
                  <button
                    type="button"
                    onClick={() => iniciarEdicion(vacante)}
                    className="flex items-center gap-1 rounded bg-amber-500 px-3 py-1 text-white transition hover:scale-105 hover:bg-amber-600"
                  >
                    <Edit size={16} aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarRegistro(vacante.id)}
                    className="flex items-center gap-1 rounded bg-rose-500 px-3 py-1 text-white transition hover:scale-105 hover:bg-rose-600"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Eliminar
                  </button>
                </div>
                )}
                {vacanteExpandida === vacante.id && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-800">Postulados</h4>
                    {postulacionesActivas.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-600">
                        No hay postulados para esta vacante.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {postulacionesActivas.map((postulacion) => (
                          <li
                            key={postulacion.id}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm"
                          >
                            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800">
                                  {postulacion.candidato?.nombre || 'Candidato'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Estado: {postulacion.estado}
                                </p>
                                <p className="mt-2 text-sm italic text-slate-600">
                                  {postulacion.justificacion_agente ||
                                    'Aún no evaluada.'}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-lg px-2.5 py-1.5 text-sm font-bold ${
                                    postulacion.score_compatibilidad >= 80
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : postulacion.score_compatibilidad >= 50
                                        ? 'bg-amber-50 text-amber-700'
                                        : postulacion.score_compatibilidad !==
                                            null &&
                                          postulacion.score_compatibilidad !==
                                            undefined
                                          ? 'bg-rose-50 text-rose-700'
                                          : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {postulacion.score_compatibilidad ??
                                    'Sin score'}
                                  {postulacion.score_compatibilidad !== null &&
                                    postulacion.score_compatibilidad !==
                                      undefined &&
                                    '%'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => evaluarPostulacion(postulacion.id)}
                                  disabled={isLoading[postulacion.id]}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-70"
                                >
                                  {isLoading[postulacion.id] ? (
                                    <>
                                      <LoaderCircle
                                        size={14}
                                        className="animate-spin"
                                        aria-hidden="true"
                                      />
                                      Procesando...
                                    </>
                                  ) : (
                                    <>
                                      <Bot size={14} aria-hidden="true" />
                                      Evaluar con agente
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 border-t border-slate-200 pt-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Evaluar CV con Gemini
                              </p>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50/50">
                                  <Upload
                                    size={16}
                                    className="shrink-0 text-indigo-600"
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">
                                    {cvSeleccionados[postulacion.id]?.name ||
                                      'Seleccionar CV en PDF'}
                                  </span>
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="sr-only"
                                    aria-label={`Seleccionar CV de ${postulacion.candidato?.nombre || 'candidato'}`}
                                    onChange={(event) =>
                                      seleccionarCv(
                                        postulacion.id,
                                        event.target.files?.[0] || null,
                                      )
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    subirCvYEvaluar(postulacion, vacante.id)
                                  }
                                  disabled={evaluandoCv[postulacion.id]}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70"
                                >
                                  {evaluandoCv[postulacion.id] ? (
                                    <>
                                      <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                        aria-hidden="true"
                                      />
                                      La IA está evaluando el perfil...
                                    </>
                                  ) : (
                                    <>
                                      <Bot size={16} aria-hidden="true" />
                                      Subir y evaluar CV
                                    </>
                                  )}
                                </button>
                              </div>
                              {erroresCv[postulacion.id] && (
                                <p
                                  className="mt-2 text-xs font-medium text-rose-700"
                                  role="alert"
                                >
                                  {erroresCv[postulacion.id]}
                                </p>
                              )}
                              {evaluacionesCv[postulacion.id] && (
                                <div
                                  className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                                  role="status"
                                >
                                  <p className="text-sm font-semibold text-emerald-800">
                                    Afinidad: {evaluacionesCv[postulacion.id].score}%
                                  </p>
                                  <p className="mt-1 text-sm text-emerald-900">
                                    {evaluacionesCv[postulacion.id].justificacion}
                                  </p>
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </div>
      {mostrarModalNueva && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setMostrarModalNueva(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-nueva-vacante-titulo"
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <h3
                id="modal-nueva-vacante-titulo"
                className="text-lg font-semibold text-slate-900"
              >
                Nueva Vacante
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalNueva(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Cerrar formulario de vacante"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <CrearVacante
              onCreated={() => {
                setMostrarModalNueva(false)
                setRefreshVacantes((actual) => actual + 1)
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default Vacantes
