import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './app'
import { isFullScreen } from './layout'

// Set before the first paint: the stylesheet sizes the page as a popup or as a tab from it.
if (isFullScreen) {
  document.documentElement.dataset.view = 'full'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
