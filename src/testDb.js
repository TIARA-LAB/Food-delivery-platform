import prisma from './config/db.js';

async function test() {
  try {
    const [result] = await prisma.$queryRaw`SELECT NOW() AS server_time`;
    console.log('✅ MySQL connected! Server time:', result.server_time);
  } catch (err) {
    console.error('❌ DB connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
