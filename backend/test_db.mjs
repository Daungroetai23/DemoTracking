import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

const prisma = new PrismaClient();
try {
  const result = await prisma.$queryRaw`SELECT 1 as test`;
  console.log('DB connected OK:', result);
  const users = await prisma.user.findMany({ take: 5, select: { email: true, role: true, id: true } });
  console.log('Users in DB:', users);
} catch (e) {
  console.error('DB ERROR:', e.message);
  console.error('Full error:', e);
} finally {
  await prisma.$disconnect();
}
