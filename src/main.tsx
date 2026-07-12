import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import CloudRoot from './cloud'
import { cloudEnabled } from './supabase'
import './styles.css'

// Com credenciais do Supabase → nuvem (login + workspace compartilhado).
// Sem credenciais → modo local (localStorage), idêntico ao protótipo.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {cloudEnabled ? <CloudRoot /> : <App />}
  </React.StrictMode>,
)

// PWA: registra o service worker apenas em produção (no dev atrapalharia o HMR).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
