import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom' 

import { PayPalScriptProvider } from "@paypal/react-paypal-js";

const initialOptions = {
    "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "sb",
    currency: "USD",
    intent: "capture"
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PayPalScriptProvider options={initialOptions}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PayPalScriptProvider>
  </StrictMode>,
)
