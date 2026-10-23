import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CandidatosList from './components/CandidatosList'
import CrearCandidato from './components/CrearCandidato'
import CrearVacante from './components/CrearVacante'
import Dashboard from './components/Dashboard'
import Navbar from './components/Navbar'
import VacantesList from './components/VacantesList'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
        <Navbar />
        <main className="ml-64 min-h-screen flex-1">
          <div className="mx-auto max-w-5xl p-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vacantes" element={<VacantesRoute />} />
              <Route path="/candidatos" element={<CandidatosRoute />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}

function VacantesRoute() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <>
      <h1>PluriOne - Portal de Reclutamiento</h1>
      <CrearVacante
        onCreated={() => setRefreshTrigger((value) => value + 1)}
      />
      <VacantesList refreshTrigger={refreshTrigger} />
    </>
  )
}

function CandidatosRoute() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <>
      <h1>PluriOne - Portal de Reclutamiento</h1>
      <CrearCandidato
        onCreated={() => setRefreshTrigger((value) => value + 1)}
      />
      <CandidatosList refreshTrigger={refreshTrigger} />
    </>
  )
}

export default App
