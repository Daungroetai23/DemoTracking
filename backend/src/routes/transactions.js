import { Router } from 'express';
import { PrismaClient, AssetStatus, TransactionStatus } from '@prisma/client';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET all transactions
router.get('/', authenticateJWT, async (req, res) => {
  const { status } = req.query;

  try {
    const whereClause = {};
    if (status) {
      whereClause.status = String(status);
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        asset: true
      },
      orderBy: { borrowDate: 'desc' }
    });

    return res.json(transactions);
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการธุรกรรมได้', error: error.message });
  }
});

// GET borrower summary list
router.get('/borrowers', authenticateJWT, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        asset: true
      },
      orderBy: { borrowDate: 'desc' }
    });

    const borrowerMap = {};
    for (const t of transactions) {
      const key = `${t.borrowerName.trim()}_${(t.organization || '').trim()}`;
      if (!borrowerMap[key]) {
        borrowerMap[key] = {
          name: t.borrowerName,
          customerName: t.customerName || '',
          salesTeam: t.salesTeam || '',
          department: t.department || '',
          organization: t.organization || '',
          totalBorrows: 0,
          activeBorrows: 0,
          overdueBorrows: 0,
          history: []
        };
      }

      borrowerMap[key].totalBorrows += 1;
      if (t.status === TransactionStatus.ACTIVE) {
        borrowerMap[key].activeBorrows += 1;
      } else if (t.status === TransactionStatus.OVERDUE) {
        borrowerMap[key].overdueBorrows += 1;
        borrowerMap[key].activeBorrows += 1;
      }
      
      borrowerMap[key].history.push({
        id: t.id,
        assetCode: t.asset.assetCode,
        assetName: t.asset.name,
        borrowDate: t.borrowDate,
        dueDate: t.dueDate,
        returnDate: t.returnDate,
        locationFrom: t.locationFrom || '',
        locationTo: t.locationTo || '',
        returnLocation: t.returnLocation || '',
        status: t.status
      });
    }

    const borrowers = Object.values(borrowerMap);
    return res.json(borrowers);
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายชื่อลูกค้าได้', error: error.message });
  }
});

// DELETE a borrower's all transactions
router.delete('/borrowers', authenticateJWT, authorizeRoles('ADMIN'), async (req, res) => {
  const { name, organization } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อของผู้ยืม' });
  }

  try {
    // 1. Find all active/overdue transactions for this borrower
    const whereFilter = {
      borrowerName: name,
      status: { in: [TransactionStatus.ACTIVE, TransactionStatus.OVERDUE] }
    };
    if (organization) {
      whereFilter.organization = organization;
    }

    const activeTransactions = await prisma.transaction.findMany({
      where: whereFilter
    });

    // 2. Perform updates and deletes inside a transaction
    const deleteFilter = { borrowerName: name };
    if (organization) {
      deleteFilter.organization = organization;
    }

    await prisma.$transaction(async (tx) => {
      // Reset status of assets involved in active transactions
      if (activeTransactions.length > 0) {
        const assetIds = activeTransactions.map(t => t.assetId);
        await tx.asset.updateMany({
          where: { id: { in: assetIds } },
          data: { status: AssetStatus.READY }
        });
      }

      // Delete all transactions for this borrower
      await tx.transaction.deleteMany({
        where: deleteFilter
      });
    });

    return res.json({ message: 'ลบข้อมูลลูกค้าและประวัติการยืม-คืนเรียบร้อยแล้ว' });
  } catch (error) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบข้อมูลลูกค้า', error: error.message });
  }
});

// POST borrow transaction
router.post('/borrow', authenticateJWT, async (req, res) => {
  const { assetCode, borrowerName, customerName, salesTeam, department, organization, borrowDate, dueDate, locationFrom, locationTo, notes } = req.body;

  if (!assetCode || !borrowerName || !dueDate) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
  }

  try {
    // Find asset
    const asset = await prisma.asset.findUnique({
      where: { assetCode }
    });

    if (!asset) {
      return res.status(404).json({ message: 'ไม่พบรหัสอุปกรณ์นี้ในระบบ' });
    }

    if (asset.status !== AssetStatus.READY) {
      const statusText = asset.status === AssetStatus.BORROWED ? 'ถูกยืมอยู่' : 'อยู่ระหว่างการซ่อมบำรุง';
      return res.status(400).json({ message: `อุปกรณ์นี้ไม่พร้อมสำหรับการยืม (สถานะขณะนี้: ${statusText})` });
    }

    // Create transaction and update asset status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          assetId: asset.id,
          borrowerName,
          customerName: customerName || '',
          salesTeam: salesTeam || '',
          department: department || '',
          organization: organization || '',
          borrowDate: borrowDate ? new Date(borrowDate) : new Date(),
          dueDate: new Date(dueDate),
          locationFrom: locationFrom || asset.location,
          locationTo: locationTo || '',
          status: TransactionStatus.ACTIVE,
          notes
        }
      });

      await tx.asset.update({
        where: { id: asset.id },
        data: { status: AssetStatus.BORROWED }
      });

      return transaction;
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการทำรายการยืม', error: error.message });
  }
});

// POST return transaction
router.post('/return', authenticateJWT, async (req, res) => {
  const { assetCode, returnLocation, notes } = req.body;

  if (!assetCode) {
    return res.status(400).json({ message: 'กรุณาระบุรหัสอุปกรณ์' });
  }

  try {
    // Find asset
    const asset = await prisma.asset.findUnique({
      where: { assetCode }
    });

    if (!asset) {
      return res.status(404).json({ message: 'ไม่พบรหัสอุปกรณ์นี้ในระบบ' });
    }

    // Find the active/overdue transaction
    const activeTransaction = await prisma.transaction.findFirst({
      where: {
        assetId: asset.id,
        status: { in: [TransactionStatus.ACTIVE, TransactionStatus.OVERDUE] }
      }
    });

    if (!activeTransaction) {
      if (asset.status === AssetStatus.BORROWED) {
        const updatedAsset = await prisma.asset.update({
          where: { id: asset.id },
          data: { status: AssetStatus.READY }
        });
        return res.json({ message: 'ปลดล็อกสถานะอุปกรณ์เป็นพร้อมใช้งานเรียบร้อย แม้ไม่พบประวัติธุรกรรมค้างส่ง', asset: updatedAsset });
      }
      return res.status(400).json({ message: 'อุปกรณ์นี้ไม่ได้อยู่ในสถานะถูกยืม หรือไม่มีการบันทึกการยืม' });
    }

    // Update transaction and asset status — auto set READY
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.update({
        where: { id: activeTransaction.id },
        data: {
          returnDate: new Date(),
          returnLocation: returnLocation || null,
          status: TransactionStatus.RETURNED,
          notes: notes ? `${activeTransaction.notes || ''} | คืน: ${notes}` : activeTransaction.notes
        }
      });

      // Auto-update asset status to READY
      await tx.asset.update({
        where: { id: asset.id },
        data: { status: AssetStatus.READY }
      });

      return transaction;
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการทำรายการคืน', error: error.message });
  }
});

export default router;
