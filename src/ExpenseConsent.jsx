export default function ExpenseConsent() {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px', fontFamily: 'sans-serif', color: '#111' }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>J.R. Boehlke LLC — Company Card SMS Program</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>Effective June 2026</p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Program Description</h2>
      <p>
        J.R. Boehlke LLC operates an automated SMS notification program for employees who are
        issued company credit cards. Messages are sent from <strong>+1 (262) 240-6607</strong> for:
      </p>
      <ul>
        <li>Transaction alerts when a charge posts to their card</li>
        <li>Receipt submission reminders for incomplete expense reports</li>
        <li>Confirmation when a receipt has been received</li>
      </ul>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Terms and Conditions</h2>
      <p>By enrolling in the J.R. Boehlke LLC company card SMS program, you agree to the following:</p>
      <ul>
        <li><strong>Who is eligible:</strong> Employees of J.R. Boehlke LLC who have been issued a company credit card.</li>
        <li><strong>How to enroll:</strong> Enrollment occurs when you provide your mobile phone number to J.R. Boehlke LLC during employment onboarding and accept a company card.</li>
        <li><strong>Message frequency:</strong> Varies based on card usage. Typically 1–5 messages per transaction (alert, reminders, confirmation).</li>
        <li><strong>Message and data rates:</strong> Standard message and data rates from your mobile carrier may apply.</li>
        <li><strong>How to opt out:</strong> Reply <strong>STOP</strong> to any message at any time. You will receive one final confirmation and no further messages will be sent. Reply <strong>START</strong> to re-enroll.</li>
        <li><strong>How to get help:</strong> Reply <strong>HELP</strong> to any message, or contact us at (262) 242-9924 or michael@jrboehlke.com.</li>
        <li><strong>Data sharing:</strong> Your mobile number will not be shared with or sold to third parties for marketing purposes.</li>
        <li><strong>Supported carriers:</strong> All major US carriers. Carrier is not liable for delayed or undelivered messages.</li>
      </ul>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>How Consent Is Obtained</h2>
      <p>
        Consent to receive SMS messages is obtained during employment onboarding. Employees
        provide their mobile phone number and are informed of this SMS program before their
        company card is activated. Enrollment is voluntary and employees may opt out at any
        time by replying STOP to any message.
      </p>
      <p>No third-party sharing of mobile numbers occurs.</p>

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
