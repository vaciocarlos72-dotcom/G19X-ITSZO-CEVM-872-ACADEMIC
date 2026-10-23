import { useEffect, useState } from 'react'
import {
  Bot,
  Briefcase,
  Calendar,
  CheckCircle,
  Edit,
  MapPin,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

function VacantesList({ refreshTrigger }) {
  const [vacantes, setVacantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [datosEdicion, setDatosEdicion] = useState({})
  const [candidatosDisponibles, setCandidatosDisponibles] = useState([])
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState({})
  const [vacanteExpandida, setVacanteExpandida] = useState(null)
  const [postulacionesActivas, setPostulacionesActivas] = useState([])

  const getEstadoBadge = (estado) => {
    const estadoNormalizado = estado.toLowerCase()
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
          setVacantes(response.data)
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
          vacante.id === id ? response.data : vacante,
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

  if (vacantes.length === 0) {
    return <p className="text-gray-600">No hay vacantes disponibles.</p>
  }

  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold text-gray-800">
        Vacantes disponibles
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {vacantes.map((vacante) => (
          <article
            key={vacante.id}
            className="flex flex-col rounded-xl border border-gray-100 bg-white p-4 shadow transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
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
                <div className="flex items-start gap-2">
                  <Briefcase className="mt-1 text-indigo-600" size={20} aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {vacante.titulo}
                  </h3>
                </div>
                <p className="mt-2 text-gray-600">
                  {vacante.descripcion || 'Sin descripcion'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <MapPin size={15} aria-hidden="true" />
                    Reclutamiento
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <Calendar size={15} aria-hidden="true" />
                    Publicada
                  </span>
                  <span className={`rounded-full px-3 py-1 font-semibold ${getEstadoBadge(vacante.estado)}`}>
                    {vacante.estado}
                  </span>
                </div>
                <div className="mt-4 border-t border-gray-200 pt-4">
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
                </div>
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

export default VacantesList
