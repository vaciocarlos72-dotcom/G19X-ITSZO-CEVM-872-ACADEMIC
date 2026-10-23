import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  UsersRound,
} from 'lucide-react'
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
import api from '../api'

const coloresOrigen = ['#4f46e5', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981']

const tendenciaMensualDemo = [
  { name: 'Ene', postulaciones: 42 },
  { name: 'Feb', postulaciones: 58 },
  { name: 'Mar', postulaciones: 51 },
  { name: 'Abr', postulaciones: 76 },
  { name: 'May', postulaciones: 68 },
  { name: 'Jun', postulaciones: 93 },
  { name: 'Jul', postulaciones: 81 },
  { name: 'Ago', postulaciones: 106 },
  { name: 'Sep', postulaciones: 91 },
  { name: 'Oct', postulaciones: 119 },
  { name: 'Nov', postulaciones: 103 },
  { name: 'Dic', postulaciones: 132 },
]

const actividadDemo = [
  {
    id: 'demo-1',
    nombre: 'Valentina Ríos',
    vacante: 'Product Designer',
    estado: 'Evaluado',
    fecha: 'Hoy, 10:42',
  },
  {
    id: 'demo-2',
    nombre: 'Andrés Morales',
    vacante: 'Desarrollador Frontend',
    estado: 'Pendiente',
    fecha: 'Hoy, 09:18',
  },
  {
    id: 'demo-3',
    nombre: 'Camila Torres',
    vacante: 'People & Culture Analyst',
    estado: 'Evaluado',
    fecha: 'Ayer',
  },
  {
    id: 'demo-4',
    nombre: 'Mateo Herrera',
    vacante: 'Product Designer',
    estado: 'Descartado',
    fecha: 'Ayer',
  },
  {
    id: 'demo-5',
    nombre: 'Sofía Castillo',
    vacante: 'Desarrollador Frontend',
    estado: 'Pendiente',
    fecha: '12 oct.',
  },
]

const origenDemo = [
  { name: 'LinkedIn', value: 42 },
  { name: 'Referidos', value: 26 },
  { name: 'Portal de empleo', value: 18 },
  { name: 'Otros', value: 14 },
]

const formatearFecha = (fecha) => {
  if (!fecha) return '—'
  const date = new Date(fecha)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

const estiloEstado = (estado = '') => {
  const estadoNormalizado = estado.toLowerCase()

  if (
    estadoNormalizado.includes('evaluad') ||
    estadoNormalizado.includes('acept') ||
    estadoNormalizado.includes('contrat')
  ) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  }
  if (
    estadoNormalizado.includes('descart') ||
    estadoNormalizado.includes('rechaz')
  ) {
    return 'bg-rose-50 text-rose-700 ring-rose-600/20'
  }
  return 'bg-amber-50 text-amber-700 ring-amber-600/20'
}

function Dashboard() {
  const [vacantes, setVacantes] = useState([])
  const [candidatos, setCandidatos] = useState([])
  const [postulaciones, setPostulaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchSummary = async () => {
      try {
        const [vacantesResponse, candidatosResponse] = await Promise.all([
          api.get('/vacantes/'),
          api.get('/candidatos/'),
        ])
        const postulacionesPorVacante = await Promise.all(
          vacantesResponse.data.map(async (vacante) => {
            const response = await api.get(
              `/vacantes/${vacante.id}/postulaciones`,
            )
            return response.data.map((postulacion) => ({
              ...postulacion,
              vacante: vacante.titulo,
            }))
          }),
        )

        if (isMounted) {
          setVacantes(vacantesResponse.data)
          setCandidatos(candidatosResponse.data)
          setPostulaciones(postulacionesPorVacante.flat())
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron cargar los datos del resumen.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchSummary()

    return () => {
      isMounted = false
    }
  }, [])

  const vacantesActivas = useMemo(
    () =>
      vacantes.filter((vacante) => {
        const estado = (vacante.estado || '').toLowerCase()
        return !estado.includes('cerr') && !estado.includes('paus')
      }).length,
    [vacantes],
  )

  const postulacionesHoy = useMemo(() => {
    const hoy = new Date()
    return postulaciones.filter((postulacion) => {
      if (!postulacion.fecha_postulacion) return false
      const fecha = new Date(postulacion.fecha_postulacion)
      return (
        !Number.isNaN(fecha.getTime()) &&
        fecha.getDate() === hoy.getDate() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getFullYear() === hoy.getFullYear()
      )
    }).length
  }, [postulaciones])

  const compatibilidadPromedio = useMemo(() => {
    const puntuaciones = postulaciones
      .map((postulacion) => postulacion.score_compatibilidad)
      .filter((score) => typeof score === 'number')

    if (puntuaciones.length === 0) return null
    return Math.round(
      puntuaciones.reduce((total, score) => total + score, 0) /
        puntuaciones.length,
    )
  }, [postulaciones])

  const origenCandidatos = useMemo(() => {
    const agrupados = candidatos.reduce((totales, candidato) => {
      const canal = candidato.canal_origen?.trim() || 'No especificado'
      totales[canal] = (totales[canal] || 0) + 1
      return totales
    }, {})

    return Object.entries(agrupados).map(([name, value]) => ({
      name,
      value,
    }))
  }, [candidatos])

  const actividadReciente = useMemo(
    () =>
      [...postulaciones]
        .sort(
          (a, b) =>
            new Date(b.fecha_postulacion || 0) -
            new Date(a.fecha_postulacion || 0),
        )
        .slice(0, 5)
        .map((postulacion) => ({
          id: postulacion.id,
          nombre: postulacion.candidato?.nombre || 'Candidato',
          vacante: postulacion.vacante || 'Vacante',
          estado: postulacion.estado || 'Pendiente',
          fecha: formatearFecha(postulacion.fecha_postulacion),
        })),
    [postulaciones],
  )

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm font-medium text-slate-500" role="status">
          Cargando resumen...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
        {error}
      </p>
    )
  }

  const metricas = [
    {
      title: 'Candidatos',
      value: candidatos.length,
      helper: 'Perfiles registrados',
      icon: UsersRound,
      iconStyle: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Vacantes activas',
      value: vacantesActivas,
      helper: 'Posiciones abiertas',
      icon: BriefcaseBusiness,
      iconStyle: 'bg-sky-50 text-sky-600',
    },
    {
      title: 'Postulaciones de hoy',
      value: postulacionesHoy,
      helper: 'Nuevas aplicaciones',
      icon: ClipboardList,
      iconStyle: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Compatibilidad',
      value:
        compatibilidadPromedio === null
          ? '86%'
          : `${compatibilidadPromedio}%`,
      helper:
        compatibilidadPromedio === null
          ? 'Dato de demostración'
          : 'Promedio de evaluaciones',
      icon: Activity,
      iconStyle: 'bg-emerald-50 text-emerald-600',
    },
  ]

  const origenParaGrafico =
    origenCandidatos.length > 0 ? origenCandidatos : origenDemo
  const usarActividadDemo = actividadReciente.length === 0

  return (
    <section className="space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Panel de control
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Resumen de Reclutamiento
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Una vista general del rendimiento de tu proceso de selección.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
          <CalendarDays size={15} className="text-indigo-600" aria-hidden="true" />
          Actualizado hoy
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricas.map(({ title, value, helper, icon: Icon, iconStyle }) => (
          <article
            key={title}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {value}
                </p>
              </div>
              <span className={`rounded-xl p-3 ${iconStyle}`}>
                <Icon size={20} strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-xs text-slate-500">{helper}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Volumen de postulaciones
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tendencia mensual durante el año
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              <ArrowUpRight size={14} aria-hidden="true" />
              Vista anual
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tendenciaMensualDemo}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={8}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: '#eef2ff' }}
                  contentStyle={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                  }}
                />
                <Bar
                  dataKey="postulaciones"
                  name="Postulaciones"
                  fill="#4f46e5"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Datos de demostración para visualizar la tendencia.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-slate-900">
              Origen de candidatos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Canales de atracción de talento
            </p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={origenParaGrafico}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="none"
                >
                  {origenParaGrafico.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={coloresOrigen[index % coloresOrigen.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {origenParaGrafico.slice(0, 4).map((origen, index) => (
              <div
                key={origen.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        coloresOrigen[index % coloresOrigen.length],
                    }}
                  />
                  <span className="truncate">{origen.name}</span>
                </span>
                <span className="font-semibold text-slate-800">
                  {origen.value}
                </span>
              </div>
            ))}
          </div>
          {origenCandidatos.length === 0 && (
            <p className="mt-3 text-xs text-slate-400">
              Datos de demostración.
            </p>
          )}
        </article>
      </div>

      <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Actividad reciente
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Últimas postulaciones recibidas
            </p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Últimos 5 registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Candidato</th>
                <th className="px-6 py-3">Vacante</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(usarActividadDemo ? actividadDemo : actividadReciente).map(
                (actividad) => (
                  <tr
                    key={actividad.id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                          <CircleUserRound size={18} aria-hidden="true" />
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {actividad.nombre}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {actividad.vacante}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estiloEstado(actividad.estado)}`}
                      >
                        <CheckCircle2 size={13} aria-hidden="true" />
                        {actividad.estado}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {actividad.fecha}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        {usarActividadDemo && (
          <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
            Mostrando actividad de demostración; aparecerán registros reales al
            recibir postulaciones.
          </p>
        )}
      </article>
    </section>
  )
}

export default Dashboard
