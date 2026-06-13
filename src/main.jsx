import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ExpensePortal from './ExpensePortal.jsx'
import ExpenseConsent from './ExpenseConsent.jsx'
import './index.css'

const path = window.location.pathname
const expenseMatch = path.match(/^\/expense\/([0-9a-f-]{36})$/i)
const isConsent = path === '/expense-consent'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {expenseMatch
      ? <ExpensePortal token={expenseMatch[1]} />
      : isConsent
        ? <ExpenseConsent />
        : <App />
    }
  </StrictMode>,
)
