import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PassGate from './components/PassGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PassGate>
      <App />
    </PassGate>
  </StrictMode>,
)
