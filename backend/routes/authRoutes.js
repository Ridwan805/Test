import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { sendOTPEmail } from '../utils/emailService.js';

import dns from 'dns/promises';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'aintuition_super_secret_jwt_access_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'aintuition_super_secret_jwt_refresh_key_2026';

const generateAccessToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '365d' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, JWT_REFRESH_SECRET, { expiresIn: '365d' });
};

// Helper: Real-time Email & Mailbox Verification via ZeroBounce & DNS
const verifyEmailDomain = async (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'Please provide a valid email address format (e.g. user@example.com)' };
  }

  const parts = email.split('@');
  if (parts.length !== 2) return { valid: false, reason: 'Invalid email format' };

  const domain = parts[1].toLowerCase();

  // 1. Explicitly block known fake/disposable/test domains
  const forbiddenDomains = ['example.com', 'test.com', 'fake.com', 'invalid.com', 'localhost', 'mailinator.com', 'tempmail.com'];
  if (forbiddenDomains.includes(domain) || domain.endsWith('.invalid') || domain.endsWith('.local')) {
    return { valid: false, reason: `The domain '${domain}' is not a valid email provider.` };
  }

  // 2. Real-time Mailbox Verification via ZeroBounce API
  const zeroBounceKey = (process.env.ZERO_BOUNCE_API_KEY || '').replace(/['"]/g, '').trim();
  if (zeroBounceKey) {
    try {
      const zbUrl = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(zeroBounceKey)}&email=${encodeURIComponent(email)}`;
      const res = await fetch(zbUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        console.log(`[ZeroBounce] Validated ${email}: status=${data.status}, sub_status=${data.sub_status}`);

        if (data.status === 'invalid') {
          let reason = 'This email address does not exist or cannot receive mail.';
          if (data.sub_status === 'mailbox_not_found') {
            reason = 'This email mailbox was not found. Please provide an active email address.';
          } else if (data.sub_status === 'disposable') {
            reason = 'Disposable email addresses are not permitted.';
          } else if (data.did_you_mean) {
            reason = `Email address not found. Did you mean ${data.did_you_mean}?`;
          }
          return { valid: false, reason };
        }

        if (['spamtrap', 'abuse', 'do_not_mail'].includes(data.status)) {
          return { valid: false, reason: 'This email address cannot be registered.' };
        }

        // status is 'valid', 'catch-all', or 'unknown'
        return { valid: true };
      }
    } catch (zbErr) {
      console.warn('[ZeroBounce Warning] Verification request failed or timed out:', zbErr.message);
      // Fallback to DNS MX checks if ZeroBounce API encounters network/quota issue
    }
  }

  // 3. Fallback: Trusted major email providers
  const trustedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com', 'aol.com', 'live.com', 'msn.com', 'zoho.com', 'yandex.com', 'gmx.com'];
  if (trustedDomains.includes(domain)) {
    return { valid: true };
  }

  // 4. Fallback: DNS MX record lookup for custom domains
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      return { valid: true };
    } else {
      return { valid: false, reason: `The domain '${domain}' does not have active mail servers.` };
    }
  } catch (err) {
    return { valid: false, reason: `The domain '${domain}' does not exist or cannot receive email.` };
  }
};

// @route   POST /api/auth/register/
// @desc    Register a new user & get tokens
router.post('/register/', async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    // Real-time DNS MX Record Validation (Checks if email domain actually exists)
    const domainVerification = await verifyEmailDomain(email);
    if (!domainVerification.valid) {
      return res.status(400).json({ email: [domainVerification.reason] });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ email: ['User with this email already exists.'] });
    }

    const user = await User.create({
      first_name: first_name || '',
      last_name: last_name || '',
      email: email.toLowerCase(),
      password
    });

    const access = generateAccessToken(user._id);
    const refresh = generateRefreshToken(user._id);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_staff: user.is_staff,
        is_active: user.is_active,
        date_joined: user.date_joined
      },
      access,
      refresh
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ detail: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login/
// @desc    Authenticate user & get tokens
router.post('/login/', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ detail: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user && (await user.matchPassword(password))) {
      const access = generateAccessToken(user._id);
      const refresh = generateRefreshToken(user._id);

      res.json({
        access,
        refresh
      });
    } else {
      res.status(401).json({ detail: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ detail: 'Server error during login' });
  }
});

// @route   POST /api/auth/token/refresh/
// @desc    Refresh access token using refresh token
router.post(['/token/refresh', '/token/refresh/'], async (req, res) => {
  const { refresh } = req.body;

  if (!refresh) {
    return res.status(400).json({ detail: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refresh, JWT_REFRESH_SECRET);
    const access = generateAccessToken(decoded.id);
    const newRefresh = generateRefreshToken(decoded.id);
    res.json({ access, refresh: newRefresh });
  } catch (error) {
    res.status(401).json({ detail: 'Invalid or expired refresh token' });
  }
});

// @route   GET /api/auth/me/
// @desc    Get current user profile & refresh active tokens
router.get('/me/', protect, async (req, res) => {
  res.json({
    id: req.user._id,
    email: req.user.email,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    is_staff: req.user.is_staff,
    is_active: req.user.is_active,
    date_joined: req.user.date_joined,
    access: generateAccessToken(req.user._id),
    refresh: generateRefreshToken(req.user._id)
  });
});

// @route   POST /api/auth/forgot-password/
// @desc    Generate and send 6-digit OTP to user's Gmail
router.post(['/forgot-password', '/forgot-password/'], async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ detail: 'Please provide your email address' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ detail: 'No scholar account found with this email address' });
    }

    // Generate secure 6-digit numeric OTP (e.g. 100000 - 999999)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.reset_password_otp = otp;
    user.reset_password_otp_expires = expires;
    await user.save();

    // Send email via Gmail / Nodemailer
    const emailResult = await sendOTPEmail(user.email, otp);

    res.json({
      detail: 'A 6-digit verification code has been sent to your email address.',
      email: user.email,
      simulated: emailResult.simulated || false
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ detail: 'Error sending verification code. Please try again.' });
  }
});

// @route   POST /api/auth/verify-otp/
// @desc    Verify that 6-digit OTP is valid and not expired
router.post(['/verify-otp', '/verify-otp/'], async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ detail: 'Email and verification code are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    if (!user.reset_password_otp || !user.reset_password_otp_expires) {
      return res.status(400).json({ detail: 'No active verification code found. Please request a new one.' });
    }

    if (new Date() > new Date(user.reset_password_otp_expires)) {
      return res.status(400).json({ detail: 'Verification code has expired. Please request a new one.' });
    }

    if (user.reset_password_otp !== String(otp).trim()) {
      return res.status(400).json({ detail: 'Invalid verification code. Please check and try again.' });
    }

    res.json({
      valid: true,
      detail: 'Verification code confirmed successfully.'
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ detail: 'Server error verifying code' });
  }
});

// @route   POST /api/auth/reset-password/
// @desc    Validate OTP and update user's password
router.post(['/reset-password', '/reset-password/'], async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return res.status(400).json({ detail: 'Email, verification code, and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ detail: 'Password must be at least 6 characters long' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ detail: 'User not found' });
    }

    if (!user.reset_password_otp || !user.reset_password_otp_expires) {
      return res.status(400).json({ detail: 'No active verification code found. Please request a new code.' });
    }

    if (new Date() > new Date(user.reset_password_otp_expires)) {
      return res.status(400).json({ detail: 'Verification code has expired. Please request a new code.' });
    }

    if (user.reset_password_otp !== String(otp).trim()) {
      return res.status(400).json({ detail: 'Invalid verification code. Please check and try again.' });
    }

    // Set new password (pre('save') hook will hash it) and clear OTP fields
    user.password = password;
    user.reset_password_otp = null;
    user.reset_password_otp_expires = null;
    await user.save();

    res.json({
      detail: 'Password has been reset successfully! You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ detail: 'Server error resetting password' });
  }
});

export default router;
