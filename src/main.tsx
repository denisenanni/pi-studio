import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { LandingPage } from './components/LandingPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/pi-studio">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/browser" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
