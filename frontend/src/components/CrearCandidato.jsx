import { useState } from 'react'
import api from '../api'

function CrearCandidato({ onCreated }) {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    canal_origen: '',
    habilidades: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (
      !form.nombre.trim() ||
      !form.email.trim() ||
      !form.telefono.trim() ||
      !form.canal_origen.trim()
    ) {
      setError('Todos los campos son obligatorios.')
      return
    }

    setSubmitting(true)

    try {
      await api.post('/candidatos/', {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        canal_origen: form.canal_origen.trim(),
        habilidades: form.habilidades.trim() || null,
      })
      setForm({
        nombre: '',
        email: '',
        telefono: '',
        canal_origen: '',
        habilidades: '',
      })
      setMessage('Candidato creado correctamente.')
      onCreated()
    } catch {
      setError('No se pudo crear el candidato.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <h2 className="mb-4 text-2xl font-semibold text-gray-800">Crear candidato</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="nombre" className="block font-medium text-gray-700">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            value={form.nombre}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className="block font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="habilidades" className="block font-medium text-gray-700">
            Habilidades
          </label>
          <textarea
            id="habilidades"
            name="habilidades"
            value={form.habilidades}
            onChange={handleChange}
            placeholder="Ej. Python, SQL, React"
            className="min-h-24 w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="telefono" className="block font-medium text-gray-700">
            Telefono
          </label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            value={form.telefono}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="canal_origen"
            className="block font-medium text-gray-700"
          >
            Canal de origen
          </label>
          <input
            id="canal_origen"
            name="canal_origen"
            type="text"
            value={form.canal_origen}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Guardando...' : 'Crear candidato'}
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-green-700" role="status">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  )
}

export default CrearCandidato
