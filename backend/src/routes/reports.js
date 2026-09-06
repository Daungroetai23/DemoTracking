import { Router } from 'express';
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/analytics', authenticateJWT, async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const start = startDate ? new Date(String(startDate)) : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate ? new Date(String(endDate)) : new Date();
    end.setHours(23, 59, 59, 999);

    // Filter transactions in date range
    const transactions = await prisma.transaction.findMany({
      where: {
        borrowDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        asset: true
      }
    });

    // 1. Summary Stats
    const totalBorrows = transactions.length;
    const overdueCount = transactions.filter(t => t.status === TransactionStatus.OVERDUE && !t.returnDate).length;

    // Find Most Borrowed Asset
    const assetCounts = {};
    transactions.forEach(t => {
      if (t.asset) {
        if (!assetCounts[t.asset.id]) {
          assetCounts[t.asset.id] = { name: t.asset.name, count: 0 };
        }
        assetCounts[t.asset.id].count += 1;
      }
    });

    let mostBorrowedAsset = 'ไม่มีข้อมูล';
    let maxAssetCount = 0;
    Object.keys(assetCounts).forEach(id => {
      if (assetCounts[id].count > maxAssetCount) {
        maxAssetCount = assetCounts[id].count;
        mostBorrowedAsset = assetCounts[id].name;
      }
    });

    // Find Top Borrower
    const borrowerCounts = {};
    transactions.forEach(t => {
      borrowerCounts[t.borrowerName] = (borrowerCounts[t.borrowerName] || 0) + 1;
    });

    let topBorrower = 'ไม่มีข้อมูล';
    let maxBorrowerCount = 0;
    Object.keys(borrowerCounts).forEach(name => {
      if (borrowerCounts[name] > maxBorrowerCount) {
        maxBorrowerCount = borrowerCounts[name];
        topBorrower = name;
      }
    });

    // 2. Daily activity chart data
    const dailyCounts = {};
    const tempDate = new Date(start);
    while (tempDate <= end) {
      const dateStr = tempDate.toISOString().split('T')[0];
      dailyCounts[dateStr] = 0;
      tempDate.setDate(tempDate.getDate() + 1);
    }

    transactions.forEach(t => {
      const dateStr = t.borrowDate.toISOString().split('T')[0];
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr] += 1;
      }
    });

    const dailyActivity = Object.keys(dailyCounts).map(date => {
      const d = new Date(date);
      const formattedDate = `${d.getDate()}/${d.getMonth() + 1}`;
      return { date: formattedDate, count: dailyCounts[date] };
    });

    // 3. Category distribution
    const categoryCounts = {};
    transactions.forEach(t => {
      if (t.asset) {
        categoryCounts[t.asset.category] = (categoryCounts[t.asset.category] || 0) + 1;
      }
    });

    const categoryData = Object.keys(categoryCounts).map(cat => ({
      name: cat,
      value: categoryCounts[cat]
    }));

    // 4. Department / Organization distribution (ข้อมูลการยืมของแต่ละหน่วยงาน)
    const departmentCounts = {};
    transactions.forEach(t => {
      const deptKey = t.organization || t.department || t.salesTeam || 'ทั่วไป / ไม่ระบุ';
      departmentCounts[deptKey] = (departmentCounts[deptKey] || 0) + 1;
    });

    const departmentDistribution = Object.keys(departmentCounts).map(dept => ({
      name: dept,
      value: departmentCounts[dept]
    })).sort((a, b) => b.value - a.value);

    // 5. Equipment Usage Statistics (ข้อมูลการใช้งานอุปกรณ์ที่ยืมเข้ามา)
    const assetUsageMap = {};
    transactions.forEach(t => {
      if (t.asset) {
        const key = t.asset.assetCode;
        if (!assetUsageMap[key]) {
          assetUsageMap[key] = {
            assetCode: t.asset.assetCode,
            assetName: t.asset.name,
            category: t.asset.category,
            totalBorrows: 0,
            totalDaysUsed: 0,
            activeBorrows: 0,
            lastBorrower: t.borrowerName,
            lastDepartment: t.organization || t.department || '-'
          };
        }
        assetUsageMap[key].totalBorrows += 1;
        if (t.status === TransactionStatus.ACTIVE || t.status === TransactionStatus.OVERDUE) {
          assetUsageMap[key].activeBorrows += 1;
        }

        // Calculate usage duration in days
        const startDate = new Date(t.borrowDate);
        const endDate = t.returnDate ? new Date(t.returnDate) : new Date();
        const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        assetUsageMap[key].totalDaysUsed += diffDays;
      }
    });

    const assetUsageStats = Object.values(assetUsageMap).sort((a, b) => b.totalBorrows - a.totalBorrows);

    return res.json({
      summary: {
        totalBorrows,
        mostBorrowedAsset: mostBorrowedAsset + (maxAssetCount > 0 ? ` (${maxAssetCount} ครั้ง)` : ''),
        topBorrower: topBorrower + (maxBorrowerCount > 0 ? ` (${maxBorrowerCount} ครั้ง)` : ''),
        overdueCount
      },
      dailyActivity,
      categoryDistribution: categoryData,
      departmentDistribution,
      assetUsageStats,
      transactions: transactions.map(t => {
        const startDate = new Date(t.borrowDate);
        const endDate = t.returnDate ? new Date(t.returnDate) : new Date();
        const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
        const usageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: t.id,
          assetCode: t.asset.assetCode,
          assetName: t.asset.name,
          category: t.asset.category,
          borrowerName: t.borrowerName,
          customerName: t.customerName || '',
          salesTeam: t.salesTeam || '',
          department: t.department || '',
          organization: t.organization || '',
          locationFrom: t.locationFrom || '',
          locationTo: t.locationTo || '',
          returnLocation: t.returnLocation || '',
          borrowDate: t.borrowDate,
          dueDate: t.dueDate,
          returnDate: t.returnDate,
          usageDays: usageDays || 1,
          status: t.status === TransactionStatus.ACTIVE ? 'กำลังยืม' :
                  t.status === TransactionStatus.RETURNED ? 'คืนแล้ว' : 'เกินกำหนดส่ง'
        };
      })
    });

  } catch (error) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการคำนวณรายงาน', error: error.message });
  }
});

export default router;
