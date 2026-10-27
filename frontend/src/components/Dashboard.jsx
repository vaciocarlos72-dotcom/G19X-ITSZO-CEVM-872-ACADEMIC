import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  BriefcaseBusiness,
  Brain,
  Mail,
  MessageCircle,
  UsersRound,
} from 'lucide-react'
import { API_BASE_URL } from '../api'

const COLORES_CANALES = {
  Webhook: '#4f46e5',
  WhatsApp: '#16a34a',
  Email: '#0891b2',
  'Sin especificar': '#94a3b8',
}
const API_URL = API_BASE_URL.replace(/\/+$/, '')

const normalizarCanal = (canal) => {
  const origen = typeof canal === 'string' ? canal.trim() : ''
  if (!origen) return 'Sin especificar'
  const origenNormalizado = origen.toLowerCase()
  if (origenNormalizado.includes('whatsapp')) return 'WhatsApp'
  if (origenNormalizado.includes('email') || origenNormalizado.includes('correo')) return 'Email'
  if (
    origenNormalizado.includes('webhook') ||
    origenNormalizado.includes('api') ||
    origenNormalizado.includes('omnicanal')
  ) {
    return 'Webhook'
  }
  return origen
}

const formatearFecha = (fecha) => {
  if (!fecha) return 0
  const timestamp = new Date(fecha).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const nombreCorto = (nombre = '') => {
  const partes = nombre.trim().split(/\s+/)
  return partes.length > 1 ? `${partes[0]} ${partes[1][0]}.` : nombre
}

const parsePerfilJson = (perfilJson) => {
  if (!perfilJson) return null
  if (typeof perfilJson === 'object') return perfilJson
  if (typeof perfilJson !== 'string') return null

  try {
    const perfil = JSON.parse(perfilJson)
    return perfil && typeof perfil === 'object' && !Array.isArray(perfil)
      ? perfil
      : null
  } catch {
    return null
  }
}

function Dashboard() {
  const [candidatos, setCandidatos] = useState([])
  const [vacantes, setVacantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const controller = new AbortController()

    const cargarDatos = async () => {
      try {
        const [candidatosResponse, vacantesResponse] = await Promise.all([
          fetch(`${API_URL}/api/v1/candidatos`, {
            signal: controller.signal,
          }),
          fetch(`${API_URL}/api/v1/vacantes`, {
            signal: controller.signal,
          }),
        ])

        if (!candidatosResponse.ok || !vacantesResponse.ok) {
          throw new Error('La API no pudo devolver los datos del Dashboard.')
        }

        const [candidatosData, vacantesData] = await Promise.all([
          candidatosResponse.json(),
          vacantesResponse.json(),
        ])

        if (!Array.isArray(candidatosData) || !Array.isArray(vacantesData)) {
          throw new Error('La API devolvió un formato inesperado.')
        }

        if (isMounted) {
          setCandidatos(candidatosData)
          setVacantes(vacantesData)
        }
      } catch {
        if (isMounted && !controller.signal.aborted) {
          setError('No se pudieron cargar las métricas del Dashboard.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    cargarDatos()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  const resumen = useMemo(() => {
    const conteoPorCanal = new Map()
    const conteoHabilidades = new Map()
    const experiencias = []

    candidatos.filter(Boolean).forEach((candidato) => {
      const canal = normalizarCanal(candidato.canal_origen)
      conteoPorCanal.set(canal, (conteoPorCanal.get(canal) || 0) + 1)

      const perfil = parsePerfilJson(candidato.perfil_json)
      const habilidades = Array.isArray(perfil?.habilidades)
        ? perfil.habilidades
        : []
      const habilidadesDelCandidato = new Set()
      habilidades.forEach((habilidad) => {
        if (typeof habilidad !== 'string' || !habilidad.trim()) return
        const nombre = habilidad.trim()
        const clave = nombre.toLocaleLowerCase()
        if (!habilidadesDelCandidato.has(clave)) {
          habilidadesDelCandidato.add(clave)
          const actual = conteoHabilidades.get(clave)
          conteoHabilidades.set(clave, {
            habilidad: actual?.habilidad || nombre,
            total: (actual?.total || 0) + 1,
          })
        }
      })

      if (
        typeof perfil?.anios_experiencia === 'number' &&
        Number.isFinite(perfil.anios_experiencia) &&
        perfil.anios_experiencia >= 0
      ) {
        experiencias.push(perfil.anios_experiencia)
      }
    })
    const distribucion = [...conteoPorCanal.entries()]
      .map(([name, value]) => ({
        name,
        value,
        color: COLORES_CANALES[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value)

    const puntuaciones = candidatos.flatMap((candidato) =>
      (candidato.postulaciones || [])
        .filter(
          (postulacion) =>
            typeof postulacion.score_compatibilidad === 'number' &&
            Number.isFinite(postulacion.score_compatibilidad),
        )
        .map((postulacion) => ({
          candidato: candidato.nombre || 'Candidato',
          score: postulacion.score_compatibilidad,
          fecha: postulacion.fecha_postulacion,
          id: postulacion.id,
        })),
    )

    puntuaciones.sort((a, b) => formatearFecha(b.fecha) - formatearFecha(a.fecha))
    const scoresRecientes = puntuaciones.slice(0, 8).reverse()
    const promedio =
      puntuaciones.length > 0
        ? Math.round(
            puntuaciones.reduce((total, item) => total + item.score, 0) /
              puntuaciones.length,
          )
        : null
    const canalPrincipal = distribucion[0]
    const topHabilidades = [...conteoHabilidades.values()]
      .sort((a, b) => b.total - a.total || a.habilidad.localeCompare(b.habilidad))
      .slice(0, 5)
    const vacantesActivas = vacantes.filter((vacante) => {
      const estado = (vacante.estado || '').toLowerCase()
      return estado.includes('abiert') || estado.includes('activ')
    }).length
    const promedioExperiencia =
      experiencias.length > 0
        ? Math.round(
            (experiencias.reduce((total, anios) => total + anios, 0) /
              experiencias.length) *
              10,
          ) / 10
        : null

    return {
      distribucion,
      scoresRecientes,
      promedio,
      promedioExperiencia,
      topHabilidades,
      canalPrincipal:
        canalPrincipal?.name || 'Sin datos',
      vacantesActivas,
    }
  }, [candidatos, vacantes])

  const metricas = [
    {
      etiqueta: 'Total de candidatos',
      valor: candidatos.length,
      detalle: 'Perfiles registrados en la plataforma',
      icono: UsersRound,
      iconoClase: 'bg-indigo-50 text-indigo-600',
    },
    {
      etiqueta: 'Vacantes activas',
      valor: resumen.vacantesActivas,
      detalle: `De ${vacantes.length} vacantes registradas`,
      icono: BriefcaseBusiness,
      iconoClase: 'bg-sky-50 text-sky-600',
    },
    {
      etiqueta: 'Promedio general de score IA',
      valor: resumen.promedio === null ? '—' : `${resumen.promedio}%`,
      detalle:
        resumen.promedio === null
          ? 'Aún no hay evaluaciones con score'
          : 'Promedio de postulaciones evaluadas',
      icono: Activity,
      iconoClase: 'bg-violet-50 text-violet-600',
    },
    {
      etiqueta: 'Canal de recepción principal',
      valor: resumen.canalPrincipal,
      detalle: 'Canal con más candidatos registrados',
      icono:
        resumen.canalPrincipal === 'Email'
          ? Mail
          : resumen.canalPrincipal === 'WhatsApp'
            ? MessageCircle
            : UsersRound,
      iconoClase: 'bg-emerald-50 text-emerald-600',
    },
    {
      etiqueta: 'Promedio de años de experiencia',
      valor:
        resumen.promedioExperiencia === null
          ? '—'
          : `${resumen.promedioExperiencia} años`,
      detalle:
        resumen.promedioExperiencia === null
          ? 'Sin perfiles con experiencia extraída'
          : 'Según los perfiles procesados por IA',
      icono: Brain,
      iconoClase: 'bg-amber-50 text-amber-600',
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm font-medium text-slate-500" role="status">
          Cargando métricas...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <p
        className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        role="alert"
      >
        {error}
      </p>
    )
  }

  return (
    <section className="space-y-6 pb-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Panel de control
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Analítica de reclutamiento
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Canales de recepción y resultados de afinidad generados por IA.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {metricas.map(({ etiqueta, valor, detalle, icono: Icon, iconoClase }) => (
          <article
            key={etiqueta}
            className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-indigo-50/60 p-5 shadow-md shadow-slate-200/50 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">{etiqueta}</p>
                <p className="mt-3 truncate text-3xl font-bold tracking-tight text-slate-900">
                  {valor}
                </p>
              </div>
              <span className={`rounded-xl p-3 ${iconoClase}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-xs text-slate-500">{detalle}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-sky-50/50 p-5 shadow-md shadow-slate-200/50 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Candidatos por canal de recepción
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Distribución según el canal de origen registrado
            </p>
          </div>
          {resumen.distribucion.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Aún no hay candidatos registrados.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resumen.distribucion}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {resumen.distribucion.map((canal) => (
                      <Cell key={canal.name} fill={canal.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resumen.distribucion.map((canal) => {
              return (
                <div key={canal.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: canal.color }}
                  />
                  <span className="truncate text-xs text-slate-500">
                    {canal.name}
                  </span>
                  <span className="ml-auto text-xs font-semibold text-slate-800">
                    {canal.value}
                  </span>
                </div>
              )
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-violet-50/50 p-5 shadow-md shadow-slate-200/50 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Scores de afinidad IA
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Evaluaciones más recientes por candidato
            </p>
          </div>
          {resumen.scoresRecientes.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Aún no hay scores de afinidad evaluados.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resumen.scoresRecientes}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="candidato"
                    tickFormatter={nombreCorto}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={54}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Afinidad']}
                    labelFormatter={(label) => `Candidato: ${label}`}
                    contentStyle={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                    }}
                  />
                  <Bar
                    dataKey="score"
                    name="Score IA"
                    fill="#4f46e5"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">
            El score es una referencia para el equipo de reclutamiento.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-md shadow-slate-200/50 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Top 5 habilidades
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Habilidades más frecuentes en los perfiles extraídos
            </p>
          </div>
          {resumen.topHabilidades.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Aún no hay perfiles con habilidades extraídas.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resumen.topHabilidades}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="topSkillsGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0f766e" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    horizontal={false}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="habilidad"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [value, 'Candidatos']}
                    contentStyle={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                    }}
                  />
                  <Bar
                    dataKey="total"
                    name="Candidatos"
                    fill="url(#topSkillsGradient)"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

export default Dashboard
