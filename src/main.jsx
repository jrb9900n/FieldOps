import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ExpensePortal from './ExpensePortal.jsx'
import './index.css'

const expenseMatch = window.location.pathname.match(/^\/expense\/([0-9a-f-]{36})$/i)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {expenseMatch
      ? <ExpensePortal token={expenseMatch[1]} />
      : <App />
    }
  </StrictMode>,
)
