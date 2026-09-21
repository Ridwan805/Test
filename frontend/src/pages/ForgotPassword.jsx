import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify & Reset, 3 = Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const navigate = useNavigate();

  // Cooldown countdown timer for resending OTP
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Step 1: Send OTP to user's Gmail
  const handleRequestOTP = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Unable to send verification code. Please check your email.');
      }

      setStep(2);
      setCooldown(60); // 60-second cooldown before resend
      setInfoMessage(
        data.simulated
          ? 'Verification code generated! (Dev Notice: Check your backend terminal for the code)'
          : `A 6-digit verification code has been sent to ${email}.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otp || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to reset password. Please check your verification code.');
      }

      setStep(3);
      // Automatically redirect after 3.5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page container">
      <div className="auth-card">
        {step === 1 && (
          <>
            <div className="auth-header">
              <h2>Forgot Password</h2>
              <p>Enter your account email to receive a 6-digit verification code</p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleRequestOTP} className="auth-form">
              <div className="form-group">
                <label htmlFor="reset-email">Email Address</label>
                <input
                  type="email"
                  id="reset-email"
                  placeholder="scholar@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.8rem' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>

            <p className="auth-footer-text">
              Remember your password? <Link to="/login">Back to Sign In</Link>
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="auth-header">
              <h2>Reset Password</h2>
              <p>
                Enter the code sent to <strong>{email}</strong> and set a new password
              </p>
            </div>

            {infoMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(31, 58, 95, 0.08)',
                  borderLeft: '3px solid var(--color-brand)',
                  color: 'var(--color-brand)',
                  padding: '0.8rem 1.2rem',
                  marginBottom: '1.5rem',
                  borderRadius: '0 4px 4px 0',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                }}
              >
                {infoMessage}
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="reset-otp">6-Digit Verification Code</label>
                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={cooldown > 0 || isSubmitting}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: cooldown > 0 ? 'var(--color-muted)' : 'var(--color-accent)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.78rem',
                      cursor: cooldown > 0 ? 'default' : 'pointer',
                      padding: 0,
                    }}
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                  </button>
                </div>
                <input
                  type="text"
                  id="reset-otp"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={isSubmitting}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.25rem',
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-new-password">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm-new-password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.8rem' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Resetting Password...' : 'Update Password'}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.88rem' }}>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.88rem',
                }}
              >
                &larr; Change Email
              </button>

              <Link to="/login" style={{ color: 'var(--color-brand)', fontWeight: 500 }}>
                Cancel & Sign In
              </Link>
            </div>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(168, 130, 60, 0.15)',
                color: 'var(--color-accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginBottom: '1rem',
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-brand)', marginBottom: '0.5rem' }}>
              Password Reset Complete
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Your password has been successfully updated. You can now sign in with your new credentials.
            </p>

            <Link
              to="/login"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem' }}
            >
              Sign In Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
