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
    emailVerified: true
   }
  });
 }

 async create(userData) {
  return prisma.user.create({
   data: {
    ...userData,
    emailVerified: false
   }
  });
 }

 async updateRefreshToken(userId, refreshToken) {
  return prisma.user.update({
   where: { id: userId },
   data: { refreshToken }
  });
 }

 async updateEmailVerified(userId, verified = true) {
  return prisma.user.update({
   where: { id: userId },
   data: { emailVerified: verified }
  });
 }
}
