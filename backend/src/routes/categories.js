import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET all categories
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลหมวดหมู่ได้', error: error.message });
  }
});

// POST add a category (ADMIN & IT_SUPPORT only)
router.post('/', authenticateJWT, authorizeRoles('ADMIN', 'IT_SUPPORT'), async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อหมวดหมู่' });
  }

  const trimmedName = name.trim();

  try {
    const existing = await prisma.category.findUnique({
      where: { name: trimmedName }
    });

    if (existing) {
      return res.status(400).json({ message: 'มีหมวดหมู่นี้ในระบบแล้ว' });
    }

    const newCategory = await prisma.category.create({
      data: { name: trimmedName }
    });

    return res.status(201).json(newCategory);
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถสร้างหมวดหมู่ได้', error: error.message });
  }
});

// DELETE a category (ADMIN & IT_SUPPORT only)
router.delete('/:id', authenticateJWT, authorizeRoles('ADMIN', 'IT_SUPPORT'), async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID ไม่ถูกต้อง' });
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่ที่ต้องการลบ' });
    }

    // Safety check: is any asset using this category?
    const assetCount = await prisma.asset.count({
      where: { category: category.name }
    });

    if (assetCount > 0) {
      return res.status(400).json({ message: 'ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากมีอุปกรณ์ที่อยู่ในหมวดหมู่นี้อยู่' });
    }

    await prisma.category.delete({
      where: { id }
    });

    return res.json({ message: 'ลบหมวดหมู่เรียบร้อยแล้ว' });
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถลบหมวดหมู่ได้', error: error.message });
  }
});

export default router;
