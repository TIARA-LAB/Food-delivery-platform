import { PrismaClient, Prisma } from '@prisma/client';


export class WalletRepository {
  constructor() {
    this.prisma = new PrismaClient();
  }


  async getOrCreateWallet(userId) {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { 
        userId, 
        balance: new Prisma.Decimal(0),
        version: 0 
      }
    });
  }


  async updateBalance(walletId, amount, version) {
    const result = await this.prisma.wallet.updateMany({
      where: { id: walletId, version },
      data: { 
        balance: { increment: amount },
        version: { increment: 1 }
      }
    });
    return result.count;
  }


  async getWalletWithTransactions(userId, limit = 50, cursor) {
    return this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: { 
          take: limit,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }


  async getBalance(userId) {
    const wallet = await this.prisma.wallet.findUnique({ 
      where: { userId }, 
      select: { balance: true } 
    });
    return wallet?.balance ? wallet.balance.toNumber() : 0;
  }


  async disconnect() {
    await this.prisma.$disconnect();
  }
}


export default new WalletRepository();