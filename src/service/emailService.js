import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const resend = new Resend(config.RESEND_API_KEY);

export class EmailService {
  static async sendVerificationEmail(userId, email) {
    if (!config.JWT_VERIFY_SECRET) {
      throw new Error('JWT_VERIFY_SECRET not configured');
    }

    const verificationToken = jwt.sign(
      { userId },
      config.JWT_VERIFY_SECRET,
      { expiresIn: '24h' }
    );

    const verifyUrl = `${config.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const { data, error } = await resend.emails.send({
      from: config.FROM_EMAIL,
      to: [email],
      subject: 'Verify your email address',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
          <h2>Verify Your Email</h2>
          <p>Click below to verify your email:</p>
          <a href="${verifyUrl}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Verify Email
          </a>
          <p style="font-size: 12px; color: #6B7280;">This link expires in 24 hours.</p>
        </div>
      `
    });

    if (error) {
      throw new Error(`Email failed: ${error.message}`);
    }
    return data;
  }
}

export default new EmailService();
