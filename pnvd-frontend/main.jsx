import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import PNVDAuth from './pnvd-auth.jsx'
import PNVD from '../pnvd-senegal-v5.jsx'

function App() {
  const [user, setUser] = useState(null)

  if (!user) return <PNVDAuth onAuthenticated={setUser} />
  return <PNVD />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
