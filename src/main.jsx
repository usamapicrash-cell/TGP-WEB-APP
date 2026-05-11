// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'             // Add this
import { BrowserRouter } from 'react-router-dom'   // Add this
import { store } from './store'             // Import your store
import 'bootstrap/dist/css/bootstrap.min.css'     // Ensure Bootstrap is here
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}> 
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)