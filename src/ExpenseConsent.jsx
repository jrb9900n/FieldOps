export default function ExpenseConsent() {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px', fontFamily: 'sans-serif', color: '#111' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>J.R. Boehlke LLC — Company Card SMS Notifications</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>Effective June 2026</p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Program Description</h2>
      <p>
        Employees of J.R. Boehlke LLC who are issued a company credit card will receive automated
        SMS text messages from <strong>+1 (262) 240-6607</strong> for the following purposes:
      </p>
      <ul>
        <li>Transaction alerts when a charge posts to their card</li>
        <li>Receipt submission reminders for incomplete expense reports</li>
        <li>Confirmation when a receipt has been received</li>
      </ul>
      <p>Message frequency varies based on card usage. Standard message and data rates may apply.</p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>How Consent Is Obtained</h2>
      <p>
        Consent to receive SMS notifications is obtained at the time a company card is issued.
        Each employee signs a <strong>Company Card Agreement</strong> that includes the following
        acknowledgment:
      </p>
      <blockquote style={{ borderLeft: '3px solid #ccc', paddingLeft: 16, color: '#444', margin: '12px 0' }}>
        "By accepting this company credit card, I consent to receive automated SMS text messages
        at the mobile number I have provided to J.R. Boehlke LLC. These messages will notify me
        of card transactions and remind me to submit receipts for expense reporting. I understand
        that message and data rates may apply and that I may opt out at any time by replying STOP."
      </blockquote>
      <p>
        Employees provide their mobile number as part of their employment onboarding paperwork.
        No third-party sharing of mobile numbers occurs.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>How to Opt Out</h2>
      <p>
        Reply <strong>STOP</strong> to any message to unsubscribe. You will receive one confirmation
        message and no further messages will be sent. Reply <strong>HELP</strong> for assistance.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Privacy Policy</h2>
      <p>
        For information on how J.R. Boehlke LLC collects, uses, and protects your personal
        information, see our full{' '}
        <a href="/privacy-policy" style={{ color: '#0066cc' }}>Privacy Policy</a>.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Contact</h2>
      <p>
        J.R. Boehlke LLC<br />
        Phone: (262) 242-9924<br />
        Email: michael@jrboehlke.com
      </p>
    </div>
  )
}
