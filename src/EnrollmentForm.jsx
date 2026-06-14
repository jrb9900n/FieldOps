import { useState } from 'react'

const AGENT_URL = 'https://agent.jrboehlke.com';

/** Strip all non-digit characters from a phone string. */
function digitsOnly(str) {
  return str.replace(/\D/g, '');
}

/**
 * Validate and normalize a US phone number to E.164 format (+1XXXXXXXXXX).
 * Returns the E.164 string on success, or null if invalid.
 */
function normalizePhone(raw) {
  let digits = digitsOnly(raw);
  // Accept 10-digit (local) or 11-digit starting with 1 (with country code)
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

/** Format an E.164 US number for human-readable display: +1 (XXX) XXX-XXXX */
function displayPhone(e164) {
  const digits = e164.replace(/^\+1/, '');
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Cap server-supplied error strings to prevent enormous messages rendering. */
const MAX_ERROR_LENGTH = 200;
function sanitizeErrorMsg(msg) {
  if (typeof msg !== 'string') return 'An unexpected error occurred.';
  const trimmed = msg.trim();
  if (trimmed.length === 0) return 'An unexpected error occurred.';
  return trimmed.length > MAX_ERROR_LENGTH
    ? trimmed.slice(0, MAX_ERROR_LENGTH) + '\u2026'
    : trimmed;
}

export default function EnrollmentForm() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [consented, setConsented] = useState(false);
  const [state, setState] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    if (!consented) {
      setErrorMsg('You must check the consent box to enroll.');
      return;
    }

    const e164 = normalizePhone(phone);
    if (!e164) {
      setErrorMsg('Please enter a valid 10-digit US mobile phone number.');
      return;
    }

    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${AGENT_URL}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const raw = data.error || `Server error ${res.status}`;
        throw new Error(sanitizeErrorMsg(raw));
      }
      setNormalizedPhone(e164);
      setState('success');
    } catch (err) {
      setErrorMsg(sanitizeErrorMsg(err.message));
      setState('error');
    }
  }

  const inputStyle = {
    display: 'block', width: '100%', padding: '10px 12px',
    border: '1px solid #ccc', borderRadius: 6, fontSize: 16,
    boxSizing: 'border-box', marginTop: 6,
  };

  if (state === 'success') {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 24px', fontFamily: 'sans-serif', textAlign: 'center', color: '#111' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
        <h2 style={{ color: '#16a34a' }}>Check your phone!</h2>
        <p>We sent a confirmation text to <strong>{displayPhone(normalizedPhone)}</strong>.</p>
        <p>Reply <strong>YES</strong> to complete enrollment in J.R. Boehlke company card alerts.</p>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 20 }}>
          Didn&apos;t receive it? Double-check the number and{' '}
          <button onClick={() => setState('idle')} style={{ background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', padding: 0, fontSize: 13 }}>
            try again
          </button>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 24px', fontFamily: 'sans-serif', color: '#111' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Company Card SMS Enrollment</h1>
      <p style={{ color: '#555', marginBottom: 28 }}>J.R. Boehlke LLC &mdash; receive alerts when your card is charged</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Your Name</label>
          <input
            type="text"
            placeholder="First Last"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>
            Mobile Phone Number <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="tel"
            placeholder="(414) 555-1234"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 24, padding: '14px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={consented}
              onChange={e => setConsented(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0, width: 18, height: 18 }}
            />
            <span style={{ fontSize: 13, lineHeight: 1.6 }}>
              I agree to receive automated SMS text messages from <strong>J.R. Boehlke LLC</strong> at
              the number above for company card transaction alerts and expense reminders.
              Message frequency varies. Message and data rates may apply.
              Reply <strong>STOP</strong> to opt out, <strong>HELP</strong> for help.{' '}
              <a href="/expense-consent.html" style={{ color: '#0066cc' }}>Terms</a>
              {' | '}
              <a href="/privacy-policy.html" style={{ color: '#0066cc' }}>Privacy Policy</a>
            </span>
          </label>
        </div>

        {errorMsg && (
          <p style={{ color: '#dc2626', marginBottom: 12, fontSize: 14 }}>{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={state === 'loading'}
          style={{
            width: '100%', padding: '12px', background: '#2563eb', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600,
            cursor: state === 'loading' ? 'wait' : 'pointer', opacity: state === 'loading' ? 0.7 : 1,
          }}
        >
          {state === 'loading' ? 'Sending...' : 'Enroll \u2014 Send Confirmation Text'}
        </button>

        <p style={{ color: '#6b7280', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
          You will receive a confirmation text. Reply YES to complete enrollment.
        </p>
      </form>
    </div>
  );
}
