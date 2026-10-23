import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="fixed inset-y-0 left-0 z-10 flex h-screen w-64 flex-col bg-slate-900 px-6 py-8 text-white">
      <Link to="/" className="text-2xl font-bold tracking-tight">
        PluriOne
      </Link>
      <p className="mt-2 text-sm text-slate-400">Portal de Reclutamiento</p>
      <div className="mt-10 flex flex-col gap-2">
        <Link to="/" className="rounded-lg px-4 py-3 transition hover:bg-slate-800 hover:text-slate-200">
          Inicio
        </Link>
        <Link to="/vacantes" className="rounded-lg px-4 py-3 transition hover:bg-slate-800 hover:text-slate-200">
          Vacantes
        </Link>
        <Link to="/candidatos" className="rounded-lg px-4 py-3 transition hover:bg-slate-800 hover:text-slate-200">
          Candidatos
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
