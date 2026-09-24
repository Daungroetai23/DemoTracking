import { Router } from 'express';
import { PrismaClient, AssetStatus, TransactionStatus } from '@prisma/client';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    const today = new Date();

    // 1. Automatically update overdue status of transactions whose dueDate has passed but returnDate is null
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

    // 2. Status Cards — Parallel execution for optimal performance
    const [totalAssets, readyAssets, borrowedAssets, maintenanceAssets] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: AssetStatus.READY } }),
      prisma.asset.count({ where: { status: AssetStatus.BORROWED } }),
      prisma.asset.count({ where: { status: AssetStatus.MAINTENANCE } })
    ]);

    const readyPercent = totalAssets > 0 ? Math.round((readyAssets / totalAssets) * 100) : 0;
    const borrowedPercent = totalAssets > 0 ? Math.round((borrowedAssets / totalAssets) * 100) : 0;
    const maintenancePercent = totalAssets > 0 ? Math.round((maintenanceAssets / totalAssets) * 100) : 0;

    // 3. 7-Day Borrowing Trends — Single optimized query instead of 7 sequential loop queries
    const trends = [];
    const now = new Date();
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    // Start of 6 days ago (7 days total including today)
    const startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const weekTransactions = await prisma.transaction.findMany({
      where: {
        borrowDate: {
          gte: startDate
        }
      },
      select: {
        borrowDate: true
      }
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);

      const count = weekTransactions.filter(t => {
        const bt = new Date(t.borrowDate).getTime();
        return bt >= d.getTime() && bt < nextD.getTime();
      }).length;

      const dateString = `${d.getDate()} ${thaiMonths[d.getMonth()]}`;
      trends.push({ date: dateString, count });
    }

    // 4. Recent Updates (Last 5 transactions)
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
      if (url.startsWith('data:')) return url;
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

    // 5. Notifications Panel — Actionable real-time alerts: Overdue, Due Soon (next 48h), Maintenance, and Ready status
    const notifications = [];
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const formatShortDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
    };

    // A. Overdue transactions (Danger / Urgent)
    const overdueTransactions = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.OVERDUE,
        returnDate: null
      },
      take: 10,
      include: {
        asset: { select: { assetCode: true, name: true, location: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    overdueTransactions.forEach(t => {
      notifications.push({
        type: 'danger',
        message: `เกินกำหนดส่งคืน: ${t.asset?.name || 'อุปกรณ์'} (${t.asset?.assetCode || ''}) ยืมโดย ${t.borrowerName} (ครบกำหนด: ${formatShortDate(t.dueDate)})`
      });
    });

    // B. Due soon within 48 hours (Warning)
    const dueSoonTransactions = await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.ACTIVE,
        returnDate: null,
        dueDate: {
          gte: today,
          lte: in48Hours
        }
      },
      take: 10,
      include: {
        asset: { select: { assetCode: true, name: true, location: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    dueSoonTransactions.forEach(t => {
      notifications.push({
        type: 'warning',
        message: `ใกล้ครบกำหนดคืนใน 48 ชม.: ${t.asset?.name || 'อุปกรณ์'} (${t.asset?.assetCode || ''}) ยืมโดย ${t.borrowerName} (ครบกำหนด: ${formatShortDate(t.dueDate)})`
      });
    });

    // C. Equipment under maintenance (Info)
    const maintenanceList = await prisma.asset.findMany({
      where: { status: AssetStatus.MAINTENANCE },
      take: 10,
      orderBy: { updatedAt: 'desc' }
    });

    maintenanceList.forEach(a => {
      notifications.push({
        type: 'info',
        message: `อุปกรณ์อยู่ระหว่างส่งซ่อม: ${a.name} (${a.assetCode}) สถานที่จัดเก็บ: ${a.location}`
      });
    });

    // D. Summary notification if no active urgent alerts
    if (overdueTransactions.length === 0 && dueSoonTransactions.length === 0 && maintenanceList.length === 0) {
      notifications.push({
        type: 'success',
        message: `พร้อมใช้งาน: มีอุปกรณ์พร้อมใช้งานทั้งหมด ${readyAssets} รายการในคลังสินค้า`
      });
    }

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
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสถิติ', error: error.message });
  }
});

export default router;
