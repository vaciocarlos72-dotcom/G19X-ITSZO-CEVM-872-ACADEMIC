import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../api'

const coloresOrigen = [
  '#4f46e5',
  '#9333ea',
  '#ec4899',
  '#0891b2',
  '#16a34a',
  '#ea580c',
]

function Dashboard() {
  const [totalVacantes, setTotalVacantes] = useState(0)
  const [totalCandidatos, setTotalCandidatos] = useState(0)
  const [candidatos, setCandidatos] = useState([])
  const [postulacionesPorVacante, setPostulacionesPorVacante] = useState([])
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
        const postulacionesResponse = await Promise.all(
          vacantesResponse.data.map(async (vacante) => {
            const response = await api.get(
              `/vacantes/${vacante.id}/postulaciones`,
            )
            return {
              name: vacante.titulo,
              postulaciones: response.data.length,
            }
          }),
        )

        if (isMounted) {
          setTotalVacantes(vacantesResponse.data.length)
          setTotalCandidatos(candidatosResponse.data.length)
          setCandidatos(candidatosResponse.data)
          setPostulacionesPorVacante(postulacionesResponse)
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

  if (loading) {
    return <p className="text-gray-600">Cargando resumen...</p>
  }

  if (error) {
    return <p className="text-red-700" role="alert">{error}</p>
  }

  return (
    <section>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        Resumen de Reclutamiento
      </h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-gray-100 bg-blue-600 p-8 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <p className="text-lg font-medium text-blue-100">Total de Vacantes</p>
          <p className="mt-2 text-5xl font-bold">{totalVacantes}</p>
        </article>
        <article className="rounded-xl border border-gray-100 bg-slate-800 p-8 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <p className="text-lg font-medium text-slate-300">
            Candidatos Registrados
          </p>
          <p className="mt-2 text-5xl font-bold">{totalCandidatos}</p>
        </article>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Postulaciones por vacante
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={postulacionesPorVacante}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="postulaciones" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Origen de candidatos
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={origenCandidatos}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={100}
                  label
                >
                  {origenCandidatos.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={coloresOrigen[index % coloresOrigen.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  )
}

export default Dashboard
