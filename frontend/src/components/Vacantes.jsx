import { useEffect, useState } from 'react'
import {
  Bot,
  Briefcase,
  Building2,
  CheckCircle,
  Edit,
  Laptop,
  MapPin,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

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
  const [usandoDatosDemo, setUsandoDatosDemo] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [datosEdicion, setDatosEdicion] = useState({})
  const [candidatosDisponibles, setCandidatosDisponibles] = useState([])
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState({})
  const [vacanteExpandida, setVacanteExpandida] = useState(null)
  const [postulacionesActivas, setPostulacionesActivas] = useState([])

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
  }, [refreshTrigger])

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
        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          {vacantes.length} {vacantes.length === 1 ? 'posición' : 'posiciones'}
        </span>
      </div>
      {usandoDatosDemo && (
        <p className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Mostrando 4 vacantes de demostración. Se reemplazarán al crear
          vacantes reales.
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                            className="flex justify-between rounded bg-gray-50 px-3 py-2 text-sm"
                          >
                            <span className="font-medium text-gray-800">
                              <span className="block">
                                {postulacion.candidato?.nombre || 'Candidato'}
                              </span>
                              <span className="mt-1 block text-sm text-gray-600 italic">
                                {postulacion.justificacion_agente ||
                                  'Aún no evaluada por el agente.'}
                              </span>
                            </span>
                            <span className="text-gray-600">
                              {postulacion.estado}
                            </span>
                            <span
                              className={
                                postulacion.score_compatibilidad > 80
                                  ? 'font-semibold text-green-600'
                                  : postulacion.score_compatibilidad > 50
                                    ? 'font-semibold text-orange-500'
                                    : 'font-semibold text-red-600'
                              }
                            >
                              Score:{' '}
                              {postulacion.score_compatibilidad ?? 'Sin evaluar'}
                              {postulacion.score_compatibilidad !== null &&
                                postulacion.score_compatibilidad !== undefined &&
                                '%'}
                            </span>
                            <button
                              type="button"
                              onClick={() => evaluarPostulacion(postulacion.id)}
                              className="flex items-center gap-1 rounded bg-violet-600 px-2 py-1 text-xs text-white transition hover:scale-105 hover:bg-violet-700"
                            >
                              <Bot size={14} aria-hidden="true" />
                              Evaluar con Agente
                            </button>
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
    </section>
  )
}

export default Vacantes
