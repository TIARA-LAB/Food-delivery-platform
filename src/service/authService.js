import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthRepository } from '../repository/authRepository.js';
import { sendOtpEmail } from '../utils/resendEmail.js';

const authRepo = new AuthRepository();

export class AuthService {
  static async register(data) {
    // Check for pending registration first
    let user = await authRepo.findByEmail(data.email);
    
    if (user && user.isPending) {
      // Resend OTP for pending user
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await authRepo.generateOtp(data.email, otp, otpExpiresAt);
      await sendOtpEmail(data.email, otp);
      
      return {
        success: true,
        message: 'OTP resent. Please verify your email to complete registration.',
        data: { email: data.email, status: 'pending' }
      };
    }

    // Create new pending user
    const hashedPassword = await bcrypt.hash(data.password, 12);
    const newUser = await authRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      role: data.role
    });

    // Send first OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await authRepo.generateOtp(data.email, otp, otpExpiresAt);
    await sendOtpEmail(data.email, otp);

    return {
      success: true,
      message: 'Registration started. Please verify your email to activate account.',
      data: { 
        email: data.email, 
        status: 'pending',
        userId: newUser.id 
      }
    };
  }

  static async verifyOtp(data) {
    const user = await authRepo.findByEmail(data.email);
    
    if (!user) throw new Error('No registration found for this email');
    if (!user.isPending) throw new Error('Account already active');
    if (user.otpToken !== data.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new Error('Invalid or expired OTP');
    }
    const activatedUser = await authRepo.activateUser(user.id);
    
    return {
      success: true,
      message: 'Account activated successfully! You can now login.',
      data: activatedUser
    };
  }

  static async resendOtp(email) {
    const user = await authRepo.findByEmail(email);
    if (!user || !user.isPending) throw new Error('No pending registration found');

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await authRepo.generateOtp(email, otp, otpExpiresAt);
    await sendOtpEmail(email, otp);
    
    return { 
      success: true,
      message: 'OTP resent successfully' 
    };
  }

 static async login(data) {
  const user = await authRepo.findByEmail(data.email);
  
  if (!user || !user.emailVerified || !user.isActive || user.isPending) {
    throw new Error('Please complete email verification first');
  }

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) throw new Error('Invalid credentials');

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role }, 
    process.env.JWT_SECRET, 
    { expiresIn: '15m' }
  );
  const refreshToken = crypto.randomBytes(32).toString('hex');
  
  await authRepo.updateRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role, 
      phone: user.phone 
    }
  };
}

  static async refreshToken(refreshToken) {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await authRepo.findByRefreshToken(refreshToken);
    if (!user) throw new Error('Invalid refresh token');

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '15m' }
    );
    return { 
      accessToken, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    };
  }

  static async logout(userId) {
    await authRepo.clearRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  static async getProfile(userId) {
    const user = await authRepo.findById(userId);
    if (!user || !user.isActive || user.isPending) {
      throw new Error('User not found or not active');
    }
    return user;
  }

  static async updateProfile(userId, data) {
    const user = await authRepo.findById(userId);
    if (!user || !user.isActive || user.isPending) {
      throw new Error('User not active');
    }
    return authRepo.updateProfile(userId, data);
  }
}
