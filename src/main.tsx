import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// GitHub Pages has no server rewrites, so a direct hit on a deep link is served
// public/404.html instead of the app. That page stashes the intended path in
// sessionStorage and redirects to the app root; restore it here before the
// router mounts so the user lands where they asked for.
const redirect = sessionStorage.getItem('spa:redirect')
if (redirect) {
  sessionStorage.removeItem('spa:redirect')
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  window.history.replaceState(null, '', base + redirect)
}

// BASE_URL carries a trailing slash; React Router's basename does not want one.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
