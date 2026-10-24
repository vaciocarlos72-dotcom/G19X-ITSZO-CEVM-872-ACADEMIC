import { useState } from 'react'
import { FileText, Upload } from 'lucide-react'
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
  const [archivoCv, setArchivoCv] = useState(null)

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

    if (archivoCv && !archivoCv.name.toLowerCase().endsWith('.pdf')) {
      setError('El archivo del CV debe estar en formato PDF.')
      return
    }

    if (archivoCv && archivoCv.size > 10 * 1024 * 1024) {
      setError('El CV no puede superar los 10 MB.')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('nombre', form.nombre.trim())
      formData.append('email', form.email.trim())
      formData.append('telefono', form.telefono.trim())
      formData.append('canal_origen', form.canal_origen.trim())
      formData.append('habilidades', form.habilidades.trim())
      if (archivoCv) formData.append('archivo', archivoCv)

      await api.post('/api/v1/candidatos/con-cv', formData)
      setForm({
        nombre: '',
        email: '',
        telefono: '',
        canal_origen: '',
        habilidades: '',
      })
      setArchivoCv(null)
      setMessage(
        archivoCv
          ? 'Candidato creado y CV adjuntado correctamente.'
          : 'Candidato creado correctamente.',
      )
      onCreated()
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          'No se pudo crear el candidato.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bg-white">
      <h2 className="mb-4 text-xl font-semibold text-slate-800">Crear candidato</h2>
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
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
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="archivo-cv"
            className="block font-medium text-gray-700"
          >
            CV en PDF <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <label
            htmlFor="archivo-cv"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-indigo-400 hover:bg-indigo-50/60"
          >
            <span className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm">
              {archivoCv ? (
                <FileText size={20} aria-hidden="true" />
              ) : (
                <Upload size={20} aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-800">
                {archivoCv?.name || 'Selecciona o arrastra tu CV'}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                PDF · máximo 10 MB
              </span>
            </span>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              Explorar
            </span>
            <input
              key={archivoCv?.name || 'sin-archivo'}
              id="archivo-cv"
              name="archivo"
              type="file"
              accept=".pdf"
              onChange={(event) => {
                setArchivoCv(event.target.files?.[0] || null)
                setError('')
              }}
              className="sr-only"
              aria-describedby="archivo-cv-ayuda"
            />
          </label>
          <p id="archivo-cv-ayuda" className="text-xs text-slate-500">
            Se extraerá el texto del documento; el archivo original no se guarda.
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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
