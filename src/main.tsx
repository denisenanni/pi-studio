import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { LandingPage } from './components/LandingPage.tsx'

// Lazy-load audio routes so Tone.js AudioContext is never created on the landing page
const App = lazy(() => import('./App.tsx'))
const StudioPage = lazy(() => import('./studio/StudioPage.tsx').then((m) => ({ default: m.StudioPage })))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/pi-studio">
      <Suspense>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/browser" element={<App />} />
          <Route path="/studio" element={<StudioPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
