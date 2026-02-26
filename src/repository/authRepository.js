import prisma from '../config/db.js';

export class AuthRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        emailVerified: true,
        isActive: true,
        isPending: true,
        phone: true,
        otpToken: true,
        otpExpiresAt: true,
        refreshToken: true
      }
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        emailVerified: true,
        isActive: true,
        isPending: true,
        createdAt: true
      }
    });
  }

  async findByRefreshToken(refreshToken) {
    return prisma.user.findFirst({
      where: {
        refreshToken,
        isActive: true,
        emailVerified: true,
        isPending: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
  }

  async create(userData) {
    return prisma.user.create({
      data: {
        ...userData,
        emailVerified: false,
        isActive: false,
        isPending: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        isPending: true
      }
    });
  }

  async markEmailVerified(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        otpToken: null,
        otpExpiresAt: null
      }
    });
  }

  async activateUser(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        isActive: true,
        isPending: false,
        otpToken: null,
        otpExpiresAt: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isPending: false,
        emailVerified: true
      }
    });
  }

  async generateOtp(email, otp, otpExpiresAt) {
    const user = await this.findByEmail(email);
    if (!user) throw new Error('User not found');

    return prisma.user.update({
      where: { id: user.id },
      data: {
        otpToken: otp,
        otpExpiresAt
      }
    });
  }

  async updateRefreshToken(userId, refreshToken) {
    return prisma.user.update({
      where: { id: userId },
      data: { refreshToken }
    });
  }

  async clearRefreshToken(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
  }

  async updateProfile(userId, data) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: data.phone
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isPending: false
      }
    });
  }
}
