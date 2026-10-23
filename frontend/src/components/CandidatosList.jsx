import { useEffect, useState } from 'react'
import { CheckCircle, Edit, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

function CandidatosList({ refreshTrigger }) {
  const [candidatos, setCandidatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [datosEdicion, setDatosEdicion] = useState({})
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchCandidatos = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await api.get('/candidatos/')
        if (isMounted) {
          setCandidatos(response.data)
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron cargar los candidatos.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchCandidatos()

    return () => {
      isMounted = false
    }
  }, [refreshTrigger])

  const eliminarRegistro = async (id) => {
    setError('')
    try {
      await api.delete(`/candidatos/${id}`)
      setCandidatos((currentCandidatos) =>
        currentCandidatos.filter((candidato) => candidato.id !== id),
      )
      toast.success('Candidato eliminado correctamente.')
    } catch {
      setError('No se pudo eliminar el candidato.')
      toast.error('No se pudo eliminar el candidato.')
    }
  }

  const iniciarEdicion = (candidato) => {
    setEditandoId(candidato.id)
    setDatosEdicion({
      nombre: candidato.nombre,
      email: candidato.email,
      telefono: candidato.telefono || '',
      canal_origen: candidato.canal_origen,
      habilidades: candidato.habilidades || '',
    })
    setError('')
  }

  const guardarEdicion = async (id) => {
    if (
      !datosEdicion.nombre?.trim() ||
      !datosEdicion.email?.trim() ||
      !datosEdicion.canal_origen?.trim()
    ) {
      setError('El nombre, email y canal de origen son obligatorios.')
      return
    }

    try {
      const response = await api.put(`/candidatos/${id}`, {
        nombre: datosEdicion.nombre.trim(),
        email: datosEdicion.email.trim(),
        telefono: datosEdicion.telefono?.trim() || null,
        canal_origen: datosEdicion.canal_origen.trim(),
        habilidades: datosEdicion.habilidades?.trim() || null,
      })
      setCandidatos((currentCandidatos) =>
        currentCandidatos.map((candidato) =>
          candidato.id === id ? response.data : candidato,
        ),
      )
      setEditandoId(null)
      setDatosEdicion({})
      setError('')
      toast.success('Candidato actualizado correctamente.')
    } catch {
      setError('No se pudo actualizar el candidato.')
      toast.error('No se pudo actualizar el candidato.')
    }
  }

  if (loading) {
    return <p className="text-gray-600">Cargando candidatos...</p>
  }

  if (error) {
    return <p className="text-red-700" role="alert">{error}</p>
  }

  if (candidatos.length === 0) {
    return <p className="text-gray-600">No hay candidatos registrados.</p>
  }

  const candidatosFiltrados = candidatos.filter((candidato) =>
    candidato.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  )

  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold text-gray-800">
        Candidatos registrados
      </h2>
      <input
        type="text"
        value={busqueda}
        onChange={(event) => setBusqueda(event.target.value)}
        placeholder="Buscar por nombre..."
        className="mb-6 w-full rounded border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        aria-label="Buscar candidatos por nombre"
      />
      {candidatosFiltrados.length === 0 ? (
        <p className="text-gray-600">No hay coincidencias.</p>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {candidatosFiltrados.map((candidato) => (
          <article
            key={candidato.id}
            className="flex flex-col rounded-xl border border-gray-100 bg-white p-4 shadow transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {editandoId === candidato.id ? (
              <div className="space-y-3">
                {[
                  ['nombre', 'Nombre'],
                  ['email', 'Email'],
                  ['telefono', 'Telefono'],
                  ['canal_origen', 'Canal de origen'],
                  ['habilidades', 'Habilidades'],
                ].map(([field, label]) => (
                  <input
                    key={field}
                    type={field === 'email' ? 'email' : 'text'}
                    value={datosEdicion[field] || ''}
                    onChange={(event) =>
                      setDatosEdicion({
                        ...datosEdicion,
                        [field]: event.target.value,
                      })
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    aria-label={label}
                  />
                ))}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => guardarEdicion(candidato.id)}
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
                <h3 className="text-xl font-semibold text-gray-900">
                  {candidato.nombre}
                </h3>
                <p className="mt-2 text-gray-600">{candidato.email}</p>
                <p className="mt-1 text-gray-600">
                  {candidato.telefono || 'Sin telefono'}
                </p>
                <p className="mt-4 text-sm font-medium text-blue-700">
                  Canal: {candidato.canal_origen}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => iniciarEdicion(candidato)}
                    className="flex items-center gap-1 rounded bg-amber-500 px-3 py-1 text-white transition hover:scale-105 hover:bg-amber-600"
                  >
                    <Edit size={16} aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarRegistro(candidato.id)}
                    className="flex items-center gap-1 rounded bg-rose-500 px-3 py-1 text-white transition hover:scale-105 hover:bg-rose-600"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      )}
    </section>
  )
}

export default CandidatosList
