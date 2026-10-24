import { useEffect, useMemo, useState } from 'react'
import {
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Eye,
  Mail,
  Pencil,
  Search,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import CrearCandidato from './CrearCandidato'

const puntajesDemo = [92, 85, 78, 96]
const diasDemo = [0, 1, 2, 4]

const candidatosDemo = [
  {
    id: 'demo-valentina',
    nombre: 'Valentina Ríos',
    email: 'valentina.rios@example.com',
    telefono: '+52 55 0101 0202',
    canal_origen: 'LinkedIn',
    habilidades: 'React, TypeScript, diseño de sistemas',
    puesto: 'Desarrollador React',
    fechaVista: new Date().toISOString(),
    estadoVista: 'En Entrevista',
    matchVista: 92,
    esDemo: true,
  },
  {
    id: 'demo-andres',
    nombre: 'Andrés Morales',
    email: 'andres.morales@example.com',
    telefono: '+52 55 0101 0303',
    canal_origen: 'Referido',
    habilidades: 'Python, SQL, modelado de datos',
    puesto: 'Ingeniero de Datos',
    fechaVista: new Date(Date.now() - 86_400_000).toISOString(),
    estadoVista: 'Nuevo',
    matchVista: 85,
    esDemo: true,
  },
  {
    id: 'demo-camila',
    nombre: 'Camila Torres',
    email: 'camila.torres@example.com',
    telefono: '+52 55 0101 0404',
    canal_origen: 'Portal de empleo',
    habilidades: 'Figma, investigación UX, prototipado',
    puesto: 'Product Designer',
    fechaVista: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    estadoVista: 'Contratado',
    matchVista: 78,
    esDemo: true,
  },
  {
    id: 'demo-mateo',
    nombre: 'Mateo Herrera',
    email: 'mateo.herrera@example.com',
    telefono: '+52 55 0101 0505',
    canal_origen: 'LinkedIn',
    habilidades: 'People Analytics, Excel, comunicación',
    puesto: 'People & Culture Analyst',
    fechaVista: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    estadoVista: 'Nuevo',
    matchVista: 96,
    esDemo: true,
  },
]

const obtenerIniciales = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase()

const formatearFecha = (fecha) => {
  if (!fecha) return '—'
  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const obtenerEstado = (estado = '') => {
  const normalizado = estado.toLowerCase()
  if (normalizado.includes('contrat')) return 'Contratado'
  if (
    normalizado.includes('entrevist') ||
    normalizado.includes('evaluad') ||
    normalizado.includes('revisión') ||
    normalizado.includes('revision')
  ) {
    return 'En Entrevista'
  }
  if (normalizado.includes('descart') || normalizado.includes('rechaz')) {
    return 'Descartado'
  }
  return 'Nuevo'
}

const estilosEstado = {
  Nuevo: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  'En Entrevista': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Contratado: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Descartado: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

function Candidatos({ refreshTrigger }) {
  const [candidatos, setCandidatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false)
  const [refreshCandidatos, setRefreshCandidatos] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')
  const [perfilAbierto, setPerfilAbierto] = useState(null)
  const [editandoId, setEditandoId] = useState(null)
  const [datosEdicion, setDatosEdicion] = useState({})

  useEffect(() => {
    let isMounted = true

    const fetchCandidatos = async () => {
      setLoading(true)
      setError('')
      try {
        const [candidatosResponse, vacantesResponse] = await Promise.all([
          api.get('/candidatos/'),
          api.get('/vacantes/'),
        ])

        if (!isMounted) return

        if (candidatosResponse.data.length === 0) {
          setCandidatos(candidatosDemo)
          return
        }

        const vacantesPorId = new Map(
          vacantesResponse.data.map((vacante) => [vacante.id, vacante.titulo]),
        )
        const candidatosEnriquecidos = candidatosResponse.data.map(
          (candidato, index) => {
            const postulaciones = [...(candidato.postulaciones || [])].sort(
              (a, b) =>
                new Date(b.fecha_postulacion || 0) -
                new Date(a.fecha_postulacion || 0),
            )
            const postulacionReciente = postulaciones[0]
            const fechaSimulada = new Date(
              Date.now() - diasDemo[index % diasDemo.length] * 86_400_000,
            ).toISOString()

            return {
              ...candidato,
              puesto: postulacionReciente
                ? vacantesPorId.get(postulacionReciente.vacante_id) ||
                  'Vacante no disponible'
                : 'Sin postulación asignada',
              fechaVista:
                postulacionReciente?.fecha_postulacion ||
                candidato.fecha_postulacion ||
                fechaSimulada,
              estadoVista: postulacionReciente
                ? obtenerEstado(postulacionReciente.estado)
                : 'Nuevo',
              matchVista:
                postulacionReciente?.score_compatibilidad ??
                puntajesDemo[index % puntajesDemo.length],
              postulacionId: postulacionReciente?.id,
              esDemo: false,
            }
          },
        )
        setCandidatos(candidatosEnriquecidos)
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
  }, [refreshTrigger, refreshCandidatos])

  const candidatosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return candidatos.filter((candidato) => {
      const coincideBusqueda =
        candidato.nombre?.toLowerCase().includes(termino) ||
        candidato.email?.toLowerCase().includes(termino) ||
        candidato.puesto?.toLowerCase().includes(termino)
      const coincideEstado =
        estadoFiltro === 'Todos' || candidato.estadoVista === estadoFiltro
      return coincideBusqueda && coincideEstado
    })
  }, [busqueda, candidatos, estadoFiltro])

  const iniciarEdicion = (candidato) => {
    setEditandoId(candidato.id)
    setDatosEdicion({
      nombre: candidato.nombre || '',
      email: candidato.email || '',
      telefono: candidato.telefono || '',
      canal_origen: candidato.canal_origen || '',
      habilidades: candidato.habilidades || '',
    })
    setError('')
  }

  const guardarEdicion = async (id) => {
    if (
      !datosEdicion.nombre.trim() ||
      !datosEdicion.email.trim() ||
      !datosEdicion.canal_origen.trim()
    ) {
      setError('El nombre, email y canal de origen son obligatorios.')
      return
    }

    try {
      const response = await api.put(`/candidatos/${id}`, {
        nombre: datosEdicion.nombre.trim(),
        email: datosEdicion.email.trim(),
        telefono: datosEdicion.telefono.trim() || null,
        canal_origen: datosEdicion.canal_origen.trim(),
        habilidades: datosEdicion.habilidades.trim() || null,
      })
      setCandidatos((actuales) =>
        actuales.map((candidato) =>
          candidato.id === id
            ? {
                ...candidato,
                ...response.data,
                puesto: candidato.puesto,
                fechaVista: candidato.fechaVista,
                estadoVista: candidato.estadoVista,
                matchVista: candidato.matchVista,
              }
            : candidato,
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

  const descartarCandidato = (candidato) => {
    setCandidatos((actuales) =>
      actuales.map((actual) =>
        actual.id === candidato.id
          ? { ...actual, estadoVista: 'Descartado' }
          : actual,
      ),
    )
    toast.success('Candidato descartado de esta vista.')
  }

  if (loading) {
    return (
      <p className="py-10 text-center text-sm font-medium text-slate-500" role="status">
        Cargando candidatos...
      </p>
    )
  }

  if (error && candidatos.length === 0) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
        {error}
      </p>
    )
  }

  const candidatosActivos = candidatos.filter(
    (candidato) => candidato.estadoVista !== 'Descartado',
  ).length

  return (
    <section className="space-y-5 pb-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Pipeline de selección
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Candidatos
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Da seguimiento a cada perfil a lo largo del proceso.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <UsersRound size={18} className="text-indigo-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-800">
              {candidatosActivos}
            </span>
            <span className="text-sm text-slate-500">en proceso</span>
          </div>
          <button
            type="button"
            onClick={() => setMostrarModalNuevo(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <UserPlus size={16} aria-hidden="true" />
            Nuevo Candidato
          </button>
        </div>
      </header>

      {candidatos.some((candidato) => candidato.esDemo) && (
        <p className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Mostrando perfiles de demostración. Se reemplazarán al registrar
          candidatos reales.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar candidato, correo o puesto..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            aria-label="Buscar candidatos"
          />
        </label>
        <select
          value={estadoFiltro}
          onChange={(event) => setEstadoFiltro(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          aria-label="Filtrar candidatos por estado"
        >
          {['Todos', 'Nuevo', 'En Entrevista', 'Contratado', 'Descartado'].map(
            (estado) => (
              <option key={estado} value={estado}>
                {estado === 'Todos' ? 'Todos los estados' : estado}
              </option>
            ),
          )}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-5 py-4">Candidato</th>
                <th scope="col" className="px-5 py-4">Puesto</th>
                <th scope="col" className="px-5 py-4">Postulación</th>
                <th scope="col" className="px-5 py-4">Estado</th>
                <th scope="col" className="px-5 py-4">Afinidad (Match)</th>
                <th scope="col" className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidatosFiltrados.map((candidato) => {
                const match = Math.max(0, Math.min(100, candidato.matchVista))
                const matchColor =
                  match >= 90
                    ? 'text-emerald-700 bg-emerald-50'
                    : match >= 80
                      ? 'text-amber-700 bg-amber-50'
                      : 'text-slate-600 bg-slate-100'

                return (
                  <FragmentRow
                    key={candidato.id}
                    candidato={candidato}
                    match={match}
                    matchColor={matchColor}
                    editando={editandoId === candidato.id}
                    datosEdicion={datosEdicion}
                    setDatosEdicion={setDatosEdicion}
                    onProfile={() => setPerfilAbierto(candidato)}
                    onDiscard={() => descartarCandidato(candidato)}
                    onEdit={() => iniciarEdicion(candidato)}
                    onSave={() => guardarEdicion(candidato.id)}
                    onCancel={() => {
                      setEditandoId(null)
                      setDatosEdicion({})
                      setError('')
                    }}
                  />
                )
              })}
              {candidatosFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No hay candidatos que coincidan con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {perfilAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPerfilAbierto(null)
          }}
        >
          <section
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfil-candidato-titulo"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Perfil del candidato
                </p>
                <h3
                  id="perfil-candidato-titulo"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  {perfilAbierto.nombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPerfilAbierto(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar perfil"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Correo</dt>
                <dd className="mt-1 text-slate-800">{perfilAbierto.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Teléfono</dt>
                <dd className="mt-1 text-slate-800">
                  {perfilAbierto.telefono || 'No especificado'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Habilidades</dt>
                <dd className="mt-1 text-slate-800">
                  {perfilAbierto.habilidades || 'No especificadas'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Canal de origen</dt>
                <dd className="mt-1 text-slate-800">
                  {perfilAbierto.canal_origen || 'No especificado'}
                </dd>
              </div>
            </dl>
            <a
              href={`mailto:${perfilAbierto.email}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Mail size={16} aria-hidden="true" />
              Contactar candidato
            </a>
          </section>
        </div>
      )}
      {mostrarModalNuevo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setMostrarModalNuevo(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-nuevo-candidato-titulo"
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <h3
                id="modal-nuevo-candidato-titulo"
                className="text-lg font-semibold text-slate-900"
              >
                Nuevo Candidato
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalNuevo(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Cerrar formulario de candidato"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <CrearCandidato
              onCreated={() => {
                setMostrarModalNuevo(false)
                setRefreshCandidatos((actual) => actual + 1)
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}

function FragmentRow({
  candidato,
  match,
  matchColor,
  editando,
  datosEdicion,
  setDatosEdicion,
  onProfile,
  onDiscard,
  onEdit,
  onSave,
  onCancel,
}) {
  return (
    <>
      <tr className="transition-colors hover:bg-slate-50/70">
        <td className="whitespace-nowrap px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-sm">
              {obtenerIniciales(candidato.nombre)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {candidato.nombre}
              </p>
              <p className="truncate text-xs text-slate-500">
                {candidato.email}
              </p>
            </div>
          </div>
        </td>
        <td className="px-5 py-4">
          <span className="inline-flex items-center gap-2 text-sm text-slate-700">
            <BriefcaseBusiness
              size={15}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />
            {candidato.puesto}
          </span>
        </td>
        <td className="whitespace-nowrap px-5 py-4">
          <span className="inline-flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays
              size={15}
              className="text-slate-400"
              aria-hidden="true"
            />
            {formatearFecha(candidato.fechaVista)}
          </span>
        </td>
        <td className="whitespace-nowrap px-5 py-4">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              estilosEstado[candidato.estadoVista] || estilosEstado.Nuevo
            }`}
          >
            {candidato.estadoVista}
          </span>
        </td>
        <td className="whitespace-nowrap px-5 py-4">
          <span
            className={`inline-flex min-w-14 items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-bold ${matchColor}`}
            aria-label={`Afinidad ${match} por ciento`}
          >
            {match}%
          </span>
        </td>
        <td className="whitespace-nowrap px-5 py-4">
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={onProfile}
              title="Ver perfil"
              aria-label={`Ver perfil de ${candidato.nombre}`}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Eye size={16} aria-hidden="true" />
            </button>
            {!candidato.esDemo && (
              <button
                type="button"
                onClick={onEdit}
                title="Editar candidato"
                aria-label={`Editar ${candidato.nombre}`}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
            )}
            <a
              href={`mailto:${candidato.email}`}
              title="Contactar candidato"
              aria-label={`Contactar a ${candidato.nombre}`}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              <Mail size={16} aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={onDiscard}
              disabled={candidato.estadoVista === 'Descartado'}
              title="Descartar candidato"
              aria-label={`Descartar a ${candidato.nombre}`}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Ban size={16} aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
      {editando && (
        <tr className="bg-indigo-50/40">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['nombre', 'Nombre'],
                ['email', 'Correo electrónico'],
                ['telefono', 'Teléfono'],
                ['canal_origen', 'Canal de origen'],
                ['habilidades', 'Habilidades'],
              ].map(([campo, etiqueta]) => (
                <label
                  key={campo}
                  className="text-xs font-medium text-slate-600"
                >
                  {etiqueta}
                  <input
                    type={campo === 'email' ? 'email' : 'text'}
                    value={datosEdicion[campo] || ''}
                    onChange={(event) =>
                      setDatosEdicion((actuales) => ({
                        ...actuales,
                        [campo]: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              ))}
              <div className="flex items-end justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <X size={15} aria-hidden="true" />
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Check size={15} aria-hidden="true" />
                  Guardar
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default Candidatos
