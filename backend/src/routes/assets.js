import { Router } from 'express';
import { PrismaClient, AssetStatus } from '@prisma/client';
import { authenticateJWT, authorizeRoles } from '../middleware/auth.js';
import { saveBase64Image, deleteImageFile } from '../utils/fileUpload.js';


const router = Router();
const prisma = new PrismaClient();

function formatAssetUrls(asset, baseUrl) {
  if (!asset) return asset;
  
  const formatUrl = (url) => {
    if (!url) return url;
    if (url.startsWith('/uploads/')) {
      return `${baseUrl}${url}`;
    }
    return url;
  };
  
  return {
    ...asset,
    imageUrl: formatUrl(asset.imageUrl),
    pdfUrl: formatUrl(asset.pdfUrl),
    images: asset.images ? asset.images.map(img => ({
      ...img,
      imageUrl: formatUrl(img.imageUrl)
    })) : []
  };
}

// GET all assets
router.get('/', authenticateJWT, async (req, res) => {
  const { search, category, status } = req.query;

  try {
    const whereClause = {};

    if (category) {
      whereClause.category = String(category);
    }

    if (status) {
      whereClause.status = String(status);
    }

    if (search) {
      const searchStr = String(search);
      whereClause.OR = [
        { name: { contains: searchStr } },
        { assetCode: { contains: searchStr } },
        { serialNumber: { contains: searchStr } }
      ];
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;
    const formattedAssets = assets.map(a => formatAssetUrls(a, baseUrl));

    return res.json(formattedAssets);
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลอุปกรณ์ได้', error: error.message });
  }
});

// GET single asset details with transaction history
router.get('/:id', authenticateJWT, async (req, res) => {
  const assetId = parseInt(req.params.id);

  if (isNaN(assetId)) {
    // Try to find by assetCode as fallback
    try {
      const asset = await prisma.asset.findUnique({
        where: { assetCode: req.params.id },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' }
          },
          transactions: {
            orderBy: { borrowDate: 'desc' }
          }
        }
      });

      if (!asset) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลอุปกรณ์' });
      }
      
      const host = req.get('host');
      const protocol = req.protocol;
      const baseUrl = `${protocol}://${host}`;
      return res.json(formatAssetUrls(asset, baseUrl));
    } catch (error) {
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์', error: error.message });
    }
  }

  try {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        transactions: {
          orderBy: { borrowDate: 'desc' }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลอุปกรณ์' });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;
    return res.json(formatAssetUrls(asset, baseUrl));
  } catch (error) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์', error: error.message });
  }
});

// POST create asset
router.post('/', authenticateJWT, authorizeRoles('ADMIN', 'IT_SUPPORT'), async (req, res) => {
  const { assetCode, name, category, serialNumber, spec, location, imageUrl, pdfUrl, images } = req.body;

  if (!assetCode || !name || !category || !serialNumber || !location) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
  }

  try {
    // Check if assetCode is unique
    const existing = await prisma.asset.findUnique({ where: { assetCode } });
    if (existing) {
      return res.status(400).json({ message: 'รหัสอุปกรณ์นี้มีอยู่แล้วในระบบ' });
    }

    let savedImageUrl = null;
    let savedPdfUrl = pdfUrl ? saveBase64Image(pdfUrl, `asset_pdf_${assetCode}`) : null;
    const savedImages = [];
    
    if (images && images.length > 0) {
      for (let idx = 0; idx < images.length; idx++) {
        const savedUrl = saveBase64Image(images[idx], `asset_${assetCode}_${idx}`);
        if (savedUrl) {
          savedImages.push({ imageUrl: savedUrl, sortOrder: idx });
        }
      }
      if (savedImages.length > 0) {
        savedImageUrl = savedImages[0].imageUrl;
      }
    } else if (imageUrl) {
      savedImageUrl = saveBase64Image(imageUrl, `asset_${assetCode}`);
    }

    const newAsset = await prisma.asset.create({
      data: {
        assetCode,
        name,
        category,
        serialNumber,
        spec: spec || '',
        location,
        status: AssetStatus.READY,
        imageUrl: savedImageUrl,
        pdfUrl: savedPdfUrl,
        images: savedImages.length > 0
          ? {
              create: savedImages.map(img => ({
                imageUrl: img.imageUrl,
                sortOrder: img.sortOrder
              }))
            }
          : undefined
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    return res.status(201).json({
      message: 'บันทึกอุปกรณ์สำเร็จ',
      id: newAsset.id,
      assetCode: newAsset.assetCode
    });
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถบันทึกอุปกรณ์ได้', error: error.message });
  }
});

// PUT update asset
router.put('/:id', authenticateJWT, authorizeRoles('ADMIN', 'IT_SUPPORT'), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID ไม่ถูกต้อง' });
  }

  const { assetCode, name, category, status, serialNumber, spec, location, imageUrl, pdfUrl, images } = req.body;

  try {
    const existingAsset = await prisma.asset.findUnique({ where: { id } });
    if (!existingAsset) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์ที่ต้องการแก้ไข' });
    }

    // Check if updating assetCode and if it conflicts with another
    if (assetCode && assetCode !== existingAsset.assetCode) {
      const codeConflict = await prisma.asset.findUnique({ where: { assetCode } });
      if (codeConflict) {
        return res.status(400).json({ message: 'รหัสอุปกรณ์ใหม่ซ้ำกับอุปกรณ์อื่นในระบบ' });
      }
    }

    let oldImageUrls = [];

    // Update asset and manage images in a transaction
    const updatedAsset = await prisma.$transaction(async (tx) => {
      const currentAsset = await tx.asset.findUnique({
        where: { id },
        include: { images: true }
      });
      if (currentAsset) {
        if (currentAsset.imageUrl) oldImageUrls.push(currentAsset.imageUrl);
        if (currentAsset.images) {
          currentAsset.images.forEach(img => {
            if (img.imageUrl) oldImageUrls.push(img.imageUrl);
          });
        }
      }

      let savedImageUrl = imageUrl;
      let savedPdfUrl = pdfUrl !== undefined ? saveBase64Image(pdfUrl, `asset_pdf_${assetCode || existingAsset.assetCode}`) : existingAsset.pdfUrl;
      const savedImages = [];

      // If images array is provided, replace all existing images
      if (images !== undefined) {
        // Delete existing images in DB
        await tx.assetImage.deleteMany({ where: { assetId: id } });

        // Save new files and map them
        if (images && images.length > 0) {
          for (let idx = 0; idx < images.length; idx++) {
            const savedUrl = saveBase64Image(images[idx], `asset_${assetCode || existingAsset.assetCode}_${idx}`);
            if (savedUrl) {
              savedImages.push({ imageUrl: savedUrl, sortOrder: idx });
            }
          }
          if (savedImages.length > 0) {
            savedImageUrl = savedImages[0].imageUrl;
          }
        } else {
          savedImageUrl = null;
        }

        // Create new images in db
        if (savedImages.length > 0) {
          await tx.assetImage.createMany({
            data: savedImages.map(img => ({
              assetId: id,
              imageUrl: img.imageUrl,
              sortOrder: img.sortOrder
            }))
          });
        }
      } else if (imageUrl) {
        savedImageUrl = saveBase64Image(imageUrl, `asset_${assetCode || existingAsset.assetCode}`);
      }

      // Update asset fields
      const asset = await tx.asset.update({
        where: { id },
        data: {
          assetCode: assetCode || existingAsset.assetCode,
          name: name || existingAsset.name,
          category: category || existingAsset.category,
          status: status || existingAsset.status,
          serialNumber: serialNumber || existingAsset.serialNumber,
          spec: spec !== undefined ? spec : existingAsset.spec,
          location: location || existingAsset.location,
          imageUrl: savedImageUrl !== undefined ? savedImageUrl : existingAsset.imageUrl,
          pdfUrl: savedPdfUrl
        },
        include: {
          images: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });

      return asset;
    });

    // Collect new image URLs
    const newImageUrls = [];
    if (updatedAsset.imageUrl) {
      newImageUrls.push(updatedAsset.imageUrl);
    }
    if (updatedAsset.images && updatedAsset.images.length > 0) {
      updatedAsset.images.forEach(img => {
        if (img.imageUrl) newImageUrls.push(img.imageUrl);
      });
    }

    // Find URLs that are in oldImageUrls but not in newImageUrls (and unique them)
    const uniqueOldUrls = [...new Set(oldImageUrls)];
    const urlsToDelete = uniqueOldUrls.filter(url => !newImageUrls.includes(url));

    // Delete physical files
    urlsToDelete.forEach(url => {
      deleteImageFile(url);
    });

    return res.json({
      message: 'อัปเดตข้อมูลอุปกรณ์สำเร็จ',
      id: updatedAsset.id,
      assetCode: updatedAsset.assetCode
    });
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถอัปเดตข้อมูลอุปกรณ์ได้', error: error.message });
  }
});

// DELETE asset
router.delete('/:id', authenticateJWT, authorizeRoles('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID ไม่ถูกต้อง' });
  }

  try {
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      include: { images: true }
    });
    
    if (!existingAsset) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์ที่ต้องการลบ' });
    }

    // Collect all image paths to delete on disk later
    const imageUrls = [];
    if (existingAsset.imageUrl) {
      imageUrls.push(existingAsset.imageUrl);
    }
    if (existingAsset.images && existingAsset.images.length > 0) {
      existingAsset.images.forEach(img => {
        if (img.imageUrl) imageUrls.push(img.imageUrl);
      });
    }

    // Unique the urls
    const uniqueUrls = [...new Set(imageUrls)];

    await prisma.asset.delete({ where: { id } });

    // Delete physical files
    uniqueUrls.forEach(url => {
      deleteImageFile(url);
    });

    return res.json({ message: 'ลบอุปกรณ์เรียบร้อยแล้ว' });
  } catch (error) {
    return res.status(500).json({ message: 'ไม่สามารถลบอุปกรณ์ได้', error: error.message });
  }
});

export default router;
