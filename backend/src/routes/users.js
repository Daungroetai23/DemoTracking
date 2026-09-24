import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET all users (excluding passwords)
router.get('/', authenticateJWT, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้', error: error.message });
  }
});

// POST create user
router.post('/', authenticateJWT, authorizeRoles('ADMIN'), async (req, res) => {
  const { email, name, password, role } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
  }

  // Validate role
  const validRoles = ['ADMIN', 'IT_SUPPORT', 'SALES'];
  const userRole = validRoles.includes(role) ? role : 'ADMIN';

  try {
    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้วในระบบ' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: userRole
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(201).json(newUser);
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถบันทึกผู้ใช้ได้', error: error.message });
  }
});

// PUT update user (Admin can update anyone; users can update their own profile and password)
router.put('/:id', authenticateJWT, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID ไม่ถูกต้อง' });
  }

  const isSelf = req.user && req.user.id === id;
  const isAdmin = req.user && req.user.role === 'ADMIN';

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้งานนี้' });
  }

  const { email, name, password, role, oldPassword } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้งานที่ต้องการแก้ไข' });
    }

    // Check email conflict
    if (email && email.trim() !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (emailConflict) {
        return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานโดยผู้ใช้คนอื่นแล้ว' });
      }
    }

    const validRoles = ['ADMIN', 'IT_SUPPORT', 'SALES'];
    const updateData = {};
    if (email) updateData.email = email.trim();
    if (name) updateData.name = name.trim();

    // Only ADMIN can change user roles
    if (isAdmin && role && validRoles.includes(role)) {
      updateData.role = role;
    }

    if (password) {
      // If updating own password and oldPassword was passed, verify oldPassword
      if (isSelf && oldPassword) {
        const isMatch = bcrypt.compareSync(oldPassword, existingUser.password);
        if (!isMatch) {
          return res.status(400).json({ message: 'รหัสผ่านเดิมไม่ถูกต้อง' });
        }
      }
      updateData.password = bcrypt.hashSync(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    });

    return res.json(updatedUser);
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถอัปเดตข้อมูลผู้ใช้งานได้', error: error.message });
  }
});

// DELETE user
router.delete('/:id', authenticateJWT, authorizeRoles('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID ไม่ถูกต้อง' });
  }

  // Safety check 1: Prevent self-deletion
  if (id === req.user?.id) {
    return res.status(400).json({ message: 'คุณไม่สามารถลบบัญชีผู้ใช้ของคุณเองได้' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้งาน' });
    }

    // Safety check 2: Prevent deleting the last Admin
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'ไม่สามารถลบผู้ใช้งานนี้ได้ เนื่องจากต้องมีผู้ดูแลระบบ (Admin) อย่างน้อย 1 คน' });
      }
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: 'ลบผู้ใช้งานเรียบร้อยแล้ว' });
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถลบผู้ใช้งานได้', error: error.message });
  }
});

export default router;
