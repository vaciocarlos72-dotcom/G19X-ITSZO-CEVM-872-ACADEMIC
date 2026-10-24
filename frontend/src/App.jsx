import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Candidatos from './components/Candidatos'
import Dashboard from './components/Dashboard'
import Navbar from './components/Navbar'
import Vacantes from './components/Vacantes'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="ml-64 min-h-screen flex-1">
          <div className="mx-auto max-w-7xl p-4 sm:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vacantes" element={<Vacantes />} />
              <Route path="/candidatos" element={<Candidatos />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
