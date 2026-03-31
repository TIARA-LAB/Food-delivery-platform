import { WalletRepository } from '../repository/walletRepository.js'
import { PrismaClient, Prisma } from '@prisma/client';


const repo = new WalletRepository(); 
const prisma = new PrismaClient();

export { validateTopUp, validateDeduct };


function validateTopUp(input) {
  const amount = Number(input.amount);
  
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Amount must be positive number');
  }
  
  if (amount < 100) {
    throw new Error('Minimum top-up: ₦100');
  }
  
  if (amount > 5000000) {
    throw new Error('Maximum top-up: ₦5,000,000');
  }
  
  return amount; 
}


function validateDeduct(input) {
  if (typeof input.amount !== 'number' || input.amount <= 0) {
    throw new Error('Amount must be positive number');
  }
  if (!input.orderId || typeof input.orderId !== 'string') {
    throw new Error('Valid orderId required');
  }
}


export class WalletService {
  async getBalance(userId) {
    return repo.getBalance(userId);
  }


  async getWalletHistory(userId, limit = 50, cursor) {
    return repo.getWalletWithTransactions(userId, limit, cursor);
  }


  async topUp(userId, input) {
    validateTopUp(input);
    const amount = new Prisma.Decimal(input.amount);


    return prisma.$transaction(async (tx) => {
      const wallet = await repo.getOrCreateWallet(userId);
      
      const updatedCount = await repo.updateBalance(wallet.id, amount, wallet.version);
      if (updatedCount === 0) {
        throw new Error('Wallet updated concurrently, please retry');
      }


      const updatedWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      
      
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'CREDIT',
          status: 'PAID',
          paymentId: input.paymentId,
          description: 'Wallet top-up',
          runningBalance: updatedWallet.balance
        }
      });


      return { balance: updatedWallet.balance.toNumber() };
    });
  }


  async deductForOrder(userId, input) {
    validateDeduct(input);
    const amount = new Prisma.Decimal(input.amount);


    return prisma.$transaction(async (tx) => {
      const wallet = await repo.getOrCreateWallet(userId);
      if (wallet.balance.lt(amount)) {
        throw new Error('Insufficient balance');
      }


      const updatedCount = await repo.updateBalance(wallet.id, amount.negated(), wallet.version);
      if (updatedCount === 0) {
        throw new Error('Wallet updated concurrently, please retry');
      }


      const updatedWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      
      
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: amount.negated(),
          type: 'DEBIT',
          status: 'PAID',
          orderId: input.orderId,
          description: 'Order payment',
          runningBalance: updatedWallet.balance
        }
      });


      return { balance: updatedWallet.balance.toNumber() };
    });
  }
}


export default new WalletService();