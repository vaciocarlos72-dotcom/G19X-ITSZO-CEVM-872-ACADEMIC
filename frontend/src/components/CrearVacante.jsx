import { useState } from 'react'
import api from '../api'

function CrearVacante({ onCreated }) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!titulo.trim() || !descripcion.trim()) {
      setError('El titulo y la descripcion son obligatorios.')
      return
    }

    setSubmitting(true)

    try {
      await api.post('/vacantes/', {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        estado: 'abierta',
      })
      setTitulo('')
      setDescripcion('')
      setMessage('Vacante creada correctamente.')
      onCreated()
    } catch {
      setError('No se pudo crear la vacante.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <h2 className="mb-4 text-2xl font-semibold text-gray-800">Crear vacante</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="titulo" className="block font-medium text-gray-700">
            Titulo
          </label>
          <input
            id="titulo"
            type="text"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="descripcion"
            className="block font-medium text-gray-700"
          >
            Descripcion
          </label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            className="min-h-28 w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : 'Crear vacante'}
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-green-700" role="status">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  )
}

export default CrearVacante
