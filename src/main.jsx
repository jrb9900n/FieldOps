import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ExpensePortal from './ExpensePortal.jsx'
import ExpenseConsent from './ExpenseConsent.jsx'
import PrivacyPolicy from './PrivacyPolicy.jsx'
import EnrollmentForm from './EnrollmentForm.jsx'
import './index.css'

const path = window.location.pathname
const expenseMatch = path.match(/^\/expense\/([0-9a-f-]{36})$/i)
const isConsent  = path === '/expense-consent'
const isPrivacy  = path === '/privacy-policy'
const isEnroll   = path === '/enroll'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {expenseMatch
      ? <ExpensePortal token={expenseMatch[1]} />
      : isConsent
        ? <ExpenseConsent />
        : isPrivacy
          ? <PrivacyPolicy />
          : isEnroll
            ? <EnrollmentForm />
            : <App />
    }
  </StrictMode>,
)
