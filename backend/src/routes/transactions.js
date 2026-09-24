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
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (รหัสอุปกรณ์, ผู้ยืม, กำหนดวันคืน)' });
  }

  // Date validation
  const parsedBorrowDate = borrowDate ? new Date(borrowDate) : new Date();
  const parsedDueDate = new Date(dueDate);

  if (isNaN(parsedBorrowDate.getTime()) || isNaN(parsedDueDate.getTime())) {
    return res.status(400).json({ message: 'รูปแบบวันที่ยืมหรือกำหนดวันคืนไม่ถูกต้อง' });
  }

  const borrowDay = new Date(parsedBorrowDate).setHours(0, 0, 0, 0);
  const dueDay = new Date(parsedDueDate).setHours(0, 0, 0, 0);
  if (dueDay < borrowDay) {
    return res.status(400).json({ message: 'กำหนดวันคืนต้องไม่น้อยกว่าวันที่ยืม' });
  }

  try {
    // Create transaction and update asset status atomically inside a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Find asset inside the transaction to ensure atomic check
      const asset = await tx.asset.findUnique({
        where: { assetCode }
      });

      if (!asset) {
        const err = new Error('ไม่พบรหัสอุปกรณ์นี้ในระบบ');
        err.statusCode = 404;
        throw err;
      }

      if (asset.status !== AssetStatus.READY) {
        const statusText = asset.status === AssetStatus.BORROWED ? 'ถูกยืมอยู่' : 'อยู่ระหว่างการซ่อมบำรุง';
        const err = new Error(`อุปกรณ์นี้ไม่พร้อมสำหรับการยืม (สถานะขณะนี้: ${statusText})`);
        err.statusCode = 400;
        throw err;
      }

      const transaction = await tx.transaction.create({
        data: {
          assetId: asset.id,
          borrowerName,
          customerName: customerName || '',
          salesTeam: salesTeam || '',
          department: department || '',
          organization: organization || '',
          borrowDate: parsedBorrowDate,
          dueDate: parsedDueDate,
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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการทำรายการยืม', error: error.message });
  }
});

// POST return transaction
router.post('/return', authenticateJWT, async (req, res) => {
  const { assetCode, returnLocation, condition, status: newStatus, notes } = req.body;

  if (!assetCode) {
    return res.status(400).json({ message: 'กรุณาระบุรหัสอุปกรณ์' });
  }

  // Determine target asset status: MAINTENANCE if condition is damaged, otherwise READY
  const isMaintenance = condition === 'MAINTENANCE' || newStatus === 'MAINTENANCE';
  const targetAssetStatus = isMaintenance ? AssetStatus.MAINTENANCE : AssetStatus.READY;
  const cleanReturnLocation = returnLocation ? returnLocation.trim() : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find asset inside transaction
      const asset = await tx.asset.findUnique({
        where: { assetCode }
      });

      if (!asset) {
        const err = new Error('ไม่พบรหัสอุปกรณ์นี้ในระบบ');
        err.statusCode = 404;
        throw err;
      }

      // Find the active/overdue transaction
      const activeTransaction = await tx.transaction.findFirst({
        where: {
          assetId: asset.id,
          status: { in: [TransactionStatus.ACTIVE, TransactionStatus.OVERDUE] }
        }
      });

      if (!activeTransaction) {
        if (asset.status === AssetStatus.BORROWED) {
          const assetUpdateData = { status: targetAssetStatus };
          if (cleanReturnLocation) {
            assetUpdateData.location = cleanReturnLocation;
          }

          const updatedAsset = await tx.asset.update({
            where: { id: asset.id },
            data: assetUpdateData
          });

          return {
            message: isMaintenance
              ? 'ปลดล็อกสถานะอุปกรณ์และส่งซ่อมบำรุงเรียบร้อย'
              : 'ปลดล็อกสถานะอุปกรณ์เป็นพร้อมใช้งานเรียบร้อย แม้ไม่พบประวัติธุรกรรมค้างส่ง',
            asset: updatedAsset
          };
        }
        const err = new Error('อุปกรณ์นี้ไม่ได้อยู่ในสถานะถูกยืม หรือไม่มีการบันทึกการยืม');
        err.statusCode = 400;
        throw err;
      }

      const conditionTag = isMaintenance ? '[ชำรุด/ส่งซ่อมบำรุง]' : '[สภาพสมบูรณ์ปกติ]';
      const formattedNote = notes
        ? `${activeTransaction.notes ? activeTransaction.notes + ' | ' : ''}คืน (${conditionTag}): ${notes}`
        : `${activeTransaction.notes ? activeTransaction.notes + ' | ' : ''}คืน (${conditionTag})`;

      const transaction = await tx.transaction.update({
        where: { id: activeTransaction.id },
        data: {
          returnDate: new Date(),
          returnLocation: cleanReturnLocation,
          status: TransactionStatus.RETURNED,
          notes: formattedNote
        }
      });

      // Update asset status and location to new return location if provided
      const assetUpdateData = { status: targetAssetStatus };
      if (cleanReturnLocation) {
        assetUpdateData.location = cleanReturnLocation;
      }

      const updatedAsset = await tx.asset.update({
        where: { id: asset.id },
        data: assetUpdateData
      });

      return {
        ...transaction,
        asset: updatedAsset,
        message: isMaintenance ? 'บันทึกรับคืนและส่งซ่อมบำรุงเรียบร้อย' : 'บันทึกส่งคืนเข้าคลังพร้อมใช้งานเรียบร้อย'
      };
    });

    return res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการทำรายการคืน', error: error.message });
  }
});

export default router;
