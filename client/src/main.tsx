import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useAuth } from './store/auth';
import 'flag-icons/css/flag-icons.min.css';
import './styles/globals.css'
import './styles/account.css'
import './styles/theme.css'
import './styles/responsive.css'
import App from './App.tsx'

useAuth.getState().loadFromStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
