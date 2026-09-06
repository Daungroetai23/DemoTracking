import { Router } from 'express';
import { PrismaClient, AssetStatus, TransactionStatus } from '@prisma/client';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    // 1. Status Cards
    const totalAssets = await prisma.asset.count();
    const readyAssets = await prisma.asset.count({ where: { status: AssetStatus.READY } });
    const borrowedAssets = await prisma.asset.count({ where: { status: AssetStatus.BORROWED } });
    const maintenanceAssets = await prisma.asset.count({ where: { status: AssetStatus.MAINTENANCE } });

    const readyPercent = totalAssets > 0 ? Math.round((readyAssets / totalAssets) * 100) : 0;
    const borrowedPercent = totalAssets > 0 ? Math.round((borrowedAssets / totalAssets) * 100) : 0;
    const maintenancePercent = totalAssets > 0 ? Math.round((maintenanceAssets / totalAssets) * 100) : 0;

    // 2. 7-Day Borrowing Trends
    const trends = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);

      const count = await prisma.transaction.count({
        where: {
          borrowDate: {
            gte: d,
            lt: nextD
          }
        }
      });

      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const dateString = `${d.getDate()} ${thaiMonths[d.getMonth()]}`;

      trends.push({ date: dateString, count });
    }

    // Update overdue status of transactions whose dueDate has passed but returnDate is null
    const today = new Date();
    await prisma.transaction.updateMany({
      where: {
        returnDate: null,
        dueDate: { lt: today },
        status: TransactionStatus.ACTIVE
      },
      data: {
        status: TransactionStatus.OVERDUE
      }
    });

    // 3. Recent Updates (Last 5 transactions)
    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      include: {
        asset: {
          include: {
            images: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      },
      orderBy: { borrowDate: 'desc' }
    });

    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    const formatUrl = (url) => {
      if (!url) return url;
      if (url.startsWith('/uploads/')) {
        return `${baseUrl}${url}`;
      }
      return url;
    };

    const formattedTransactions = recentTransactions.map(t => {
      if (t.asset) {
        return {
          ...t,
          asset: {
            ...t.asset,
            imageUrl: formatUrl(t.asset.imageUrl),
            images: t.asset.images ? t.asset.images.map(img => ({
              ...img,
              imageUrl: formatUrl(img.imageUrl)
            })) : []
          }
        };
      }
      return t;
    });

    // 4. Notifications Panel — แสดงเฉพาะสถานะอุปกรณ์ที่ว่าง/พร้อมใช้งาน
    const notifications = [];

    // Available/Ready assets notification
    const readyList = await prisma.asset.findMany({
      where: { status: AssetStatus.READY }
    });
    readyList.forEach(a => {
      notifications.push({
        type: 'success',
        message: `พร้อมใช้งาน: ${a.name} (${a.assetCode}) สถานที่จัดเก็บ: ${a.location}`
      });
    });

    // Assets under maintenance (keep these for visibility)
    const maintenanceList = await prisma.asset.findMany({
      where: { status: AssetStatus.MAINTENANCE }
    });
    maintenanceList.forEach(a => {
      notifications.push({
        type: 'info',
        message: `อุปกรณ์อยู่ระหว่างส่งซ่อม: ${a.name} (${a.assetCode}) สถานที่จัดเก็บ: ${a.location}`
      });
    });

    return res.json({
      summary: {
        total: totalAssets,
        ready: { count: readyAssets, percent: readyPercent },
        borrowed: { count: borrowedAssets, percent: borrowedPercent },
        maintenance: { count: maintenanceAssets, percent: maintenancePercent }
      },
      statusDistribution: [
        { name: 'พร้อมใช้งาน', value: readyAssets },
        { name: 'ถูกยืม', value: borrowedAssets },
        { name: 'ส่งซ่อมบำรุง', value: maintenanceAssets }
      ],
      borrowTrends: trends,
      recentTransactions: formattedTransactions,
      notifications
    });
  } catch (error) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสถิติ', error: error.message });
  }
});

export default router;
