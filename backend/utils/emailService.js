import nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * Generates the HTML template for the 6-digit OTP verification email.
 * 
 * @param {string} toEmail 
 * @param {string} otp 
 * @returns {string}
 */
const getOTPHtmlContent = (toEmail, otp) => `
  <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #F7F5F0; border-radius: 8px; border: 1px solid #D4CFC5; color: #101826;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #1F3A5F; color: #FFFFFF; font-weight: 800; font-size: 20px; width: 42px; height: 42px; line-height: 42px; border-radius: 4px; margin-bottom: 8px;">E</div>
      <h2 style="margin: 0; color: #1F3A5F; font-size: 22px; font-weight: 700;">EcoIntuition Academy</h2>
      <p style="margin: 4px 0 0; color: #6E7681; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">Password Reset Request</p>
    </div>

    <div style="background-color: #FFFFFF; border: 1px solid #D4CFC5; border-radius: 6px; padding: 28px; box-shadow: 0 4px 12px rgba(16, 24, 38, 0.03);">
      <p style="font-size: 15px; margin-top: 0; line-height: 1.6;">Hello,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #101826;">
        We received a request to reset the password for your EcoIntuition Academy scholar account associated with <strong>${toEmail}</strong>.
      </p>

      <p style="font-size: 15px; line-height: 1.6; color: #101826; margin-bottom: 8px;">
        Use the following 6-digit One-Time Passcode (OTP) to proceed:
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <div style="display: inline-block; background-color: #1F3A5F; color: #FFFFFF; font-family: 'IBM Plex Mono', monospace, Courier; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 14px 28px; border-radius: 6px; border: 1px solid #152842;">
          ${otp}
        </div>
      </div>

      <p style="font-size: 13px; color: #A8823C; font-weight: 600; text-align: center; margin-bottom: 20px;">
        ⏱️ This verification code will expire in 10 minutes.
      </p>

      <p style="font-size: 13px; color: #6E7681; line-height: 1.5; border-top: 1px solid #E8E4DC; padding-top: 16px; margin-bottom: 0;">
        If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged and your account is secure.
      </p>
    </div>

    <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #8E96A4;">
      &copy; ${new Date().getFullYear()} EcoIntuition Academy. All rights reserved.<br />
      Rigorous Learning &bull; Intuitive Understanding
    </div>
  </div>
`;

/**
 * Sends a 6-digit OTP verification email for password reset.
 * Supports:
 *  1. Resend API (via RESEND_API_KEY)
 *  2. Gmail SMTP (via EMAIL_USER & EMAIL_PASS)
 *  3. Simulated Console Delivery (fallback in development)
 * 
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit one-time passcode
 * @returns {Promise<{ success: boolean, simulated?: boolean, error?: string }>}
 */
export const sendOTPEmail = async (toEmail, otp) => {
  const resendApiKey = (process.env.RESEND_API_KEY || '').replace(/['"]/g, '').trim();
  const emailUser = (process.env.EMAIL_USER || '').replace(/['"]/g, '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').replace(/['"\s]/g, '').trim();
  const htmlContent = getOTPHtmlContent(toEmail, otp);
  const textContent = `Your EcoIntuition Academy password reset code is: ${otp}. It will expire in 10 minutes. If you did not request this, please ignore this email.`;

  // 1. Resend API Delivery
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const fromAddress = process.env.RESEND_FROM || 'EcoIntuition Academy <onboarding@resend.dev>';
      
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [toEmail],
        subject: `[${otp}] Your Password Reset Code - EcoIntuition Academy`,
        text: textContent,
        html: htmlContent
      });

      if (error) {
        console.error('[Resend Error]:', error);
        // Fallback to console print if Resend fails (e.g. unverified domain or unconfirmed recipient)
        console.log(`\n⚠️ [FALLBACK DEV OTP] Code for ${toEmail} is: [ ${otp} ]\n`);
        return { success: true, simulated: true, error: error.message };
      }

      console.log(`[Resend Email Service] OTP successfully sent to ${toEmail} (ID: ${data.id})`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error('[Resend Exception]:', err.message);
      console.log(`\n⚠️ [FALLBACK DEV OTP] Code for ${toEmail} is: [ ${otp} ]\n`);
      return { success: true, simulated: true, error: err.message };
    }
  }

  // 2. Gmail SMTP Delivery via Nodemailer
  if (emailUser && emailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });

      const info = await transporter.sendMail({
        from: `"EcoIntuition Academy" <${emailUser}>`,
        to: toEmail,
        subject: `[${otp}] Your Password Reset Code - EcoIntuition Academy`,
        text: textContent,
        html: htmlContent
      });

      console.log(`[Gmail SMTP Service] OTP successfully sent to ${toEmail} (Message ID: ${info.messageId})`);
      return { success: true, simulated: false };
    } catch (error) {
      console.error(`[Email Service Error] Failed to send email via Gmail SMTP:`, error.message);
      console.log(`\n⚠️ [FALLBACK DEV OTP] Code for ${toEmail} is: [ ${otp} ]\n`);
      return { success: false, simulated: true, error: error.message };
    }
  }

  // 3. Fallback Dev Simulation
  console.log(`\n======================================================`);
  console.log(`🔐 [ECOINTUITION ACADEMY - DEV EMAIL SIMULATION]`);
  console.log(`📩 To: ${toEmail}`);
  console.log(`🔢 One-Time Password (OTP): [ ${otp} ]`);
  console.log(`⏱️ Expiration: 10 minutes`);
  console.log(`💡 Note: To send real emails, add RESEND_API_KEY to backend/.env`);
  console.log(`======================================================\n`);
  return { success: true, simulated: true };
};
