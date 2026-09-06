import { PrismaClient, Role, AssetStatus, TransactionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for 10 users...');

  // Hash password for test accounts
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Seed 10 Users
  const users = [
    { email: 'admin@demotrack.com', name: 'สมชาย ผู้ดูแลระบบ', role: Role.ADMIN },
    { email: 'it.wichai@demotrack.com', name: 'วิชัย ไอทีสนับสนุน', role: Role.IT_SUPPORT },
    { email: 'it.nattapol@demotrack.com', name: 'ณัฐพล ไอทีสนับสนุน', role: Role.IT_SUPPORT },
    { email: 'sales.kittisak@demotrack.com', name: 'กิตติศักดิ์ ทีมขาย กทม.', role: Role.SALES },
    { email: 'sales.thongchai@demotrack.com', name: 'ธงชัย ทีมขาย กทม.', role: Role.SALES },
    { email: 'sales.ploy@demotrack.com', name: 'พลอยไพลิน ทีมขาย ภาคเหนือ', role: Role.SALES },
    { email: 'sales.manop@demotrack.com', name: 'มานพ ทีมขาย ภาคเหนือ', role: Role.SALES },
    { email: 'sales.ananda@demotrack.com', name: 'อนันต์ ทีมขาย ภาคใต้', role: Role.SALES },
    { email: 'sales.siriporn@demotrack.com', name: 'ศิริพร ทีมขาย ภาคใต้', role: Role.SALES },
    { email: 'sales.teerapat@demotrack.com', name: 'ธีรภัทร์ ทีมขาย ภาคตะวันออก', role: Role.SALES },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: passwordHash },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: passwordHash,
      },
    });
  }
  console.log('✅ 10 User accounts created successfully!');

  // 2. Seed Categories
  const categories = ['โน้ตบุ๊ก', 'แท็บเล็ต', 'โปรเจกเตอร์', 'จอมอนิเตอร์', 'กล้องถ่ายภาพ'];
  for (const catName of categories) {
    await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });
  }

  // 3. Seed Assets if none exist
  const count = await prisma.asset.count();
  if (count === 0) {
    const assetsData = [
      { assetCode: 'DT-NB001', name: 'MacBook Pro 16 M3 Max', category: 'โน้ตบุ๊ก', serialNumber: 'SN-MBP16-001', spec: 'Apple M3 Max, 36GB RAM, 1TB SSD, 16" Liquid Retina XDR', location: 'คลังสินค้า A', status: AssetStatus.BORROWED },
      { assetCode: 'DT-NB002', name: 'Dell XPS 15 9530', category: 'โน้ตบุ๊ก', serialNumber: 'SN-DELL-9530', spec: 'Intel i7-13700H, 32GB RAM, 512GB SSD, 15.6" OLED 3.5K', location: 'คลังสินค้า A', status: AssetStatus.READY },
      { assetCode: 'DT-TAB01', name: 'iPad Pro 12.9 M2', category: 'แท็บเล็ต', serialNumber: 'SN-IPAD-129', spec: 'Apple M2 Chip, 256GB, Wi-Fi + Cellular, 12.9" Liquid Retina XDR', location: 'ห้องไอที', status: AssetStatus.BORROWED },
      { assetCode: 'DT-PJ001', name: 'Epson EB-FH52 Projector', category: 'โปรเจกเตอร์', serialNumber: 'SN-EPSON-FH52', spec: '4000 Lumens, Full HD 1080p, Wi-Fi, HDMI x2', location: 'คลังสินค้า B', status: AssetStatus.MAINTENANCE },
      { assetCode: 'DT-MN001', name: 'LG UltraFine 27 4K Monitor', category: 'จอมอนิเตอร์', serialNumber: 'SN-LG-274K', spec: '27" IPS 4K UHD 3840x2160, USB-C, HDR400', location: 'คลังสินค้า A', status: AssetStatus.READY },
    ];

    for (const a of assetsData) {
      const createdAsset = await prisma.asset.create({ data: a });

      // Create transactions for borrowed assets
      if (a.status === AssetStatus.BORROWED) {
        const now = new Date();
        const past = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const due = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

        await prisma.transaction.create({
          data: {
            assetId: createdAsset.id,
            borrowerName: 'กิตติศักดิ์ ทีมขาย กทม.',
            customerName: 'บริษัท ไทยเทค โซลูชั่น จำกัด',
            salesTeam: 'ทีมขาย กทม.',
            department: 'ฝ่ายขายเทคโนโลยี',
            organization: 'บริษัท ไทยเทค โซลูชั่น จำกัด',
            borrowDate: past,
            dueDate: due,
            locationFrom: 'คลังสินค้า A',
            locationTo: 'สำนักงานลูกค้า กทม.',
            status: TransactionStatus.ACTIVE,
            notes: 'ยืมเพื่อนำไปเสนอสาธิตผลิตภัณฑ์ให้ลูกค้า'
          }
        });
      }
    }
    console.log('✅ Sample assets and transactions seeded!');
  }

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
