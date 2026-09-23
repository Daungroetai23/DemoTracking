import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding (Admin only)...');

  // Hash password for admin account
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Seed Admin User only
  await prisma.user.upsert({
    where: { email: 'admin@demotrack.com' },
    update: { name: 'ผู้ดูแลระบบ', role: Role.ADMIN, password: passwordHash },
    create: {
      email: 'admin@demotrack.com',
      name: 'ผู้ดูแลระบบ',
      role: Role.ADMIN,
      password: passwordHash,
    },
  });
  console.log('✅ Admin account seeded successfully!');

  // 2. Seed Default Categories
  const categories = ['โน้ตบุ๊ก', 'แท็บเล็ต', 'โปรเจกเตอร์', 'จอมอนิเตอร์', 'กล้องถ่ายภาพ'];
  for (const catName of categories) {
    await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });
  }
  console.log('✅ Categories seeded successfully!');

  console.log('🎉 Seeding process completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
