-- ============================================
-- DemoTrack - สร้างฐานข้อมูล
-- ใช้กับ XAMPP MySQL (phpMyAdmin)
-- ============================================

-- สร้าง Database
CREATE DATABASE IF NOT EXISTS `demotrack`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `demotrack`;

-- ============================================
-- ตาราง User (ผู้ใช้งาน)
-- ============================================
CREATE TABLE IF NOT EXISTS `User` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `email`     VARCHAR(191) NOT NULL,
  `password`  VARCHAR(191) NOT NULL,
  `name`      VARCHAR(191) NOT NULL,
  `role`      ENUM('ADMIN', 'IT_SUPPORT', 'SALES') NOT NULL DEFAULT 'ADMIN',
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ตาราง Category (หมวดหมู่อุปกรณ์)
-- ============================================
CREATE TABLE IF NOT EXISTS `Category` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Category_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ตาราง Asset (อุปกรณ์สาธิต)
-- ============================================
CREATE TABLE IF NOT EXISTS `Asset` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `assetCode`    VARCHAR(191) NOT NULL,
  `name`         VARCHAR(191) NOT NULL,
  `category`     VARCHAR(191) NOT NULL,
  `status`       ENUM('READY', 'BORROWED', 'MAINTENANCE') NOT NULL DEFAULT 'READY',
  `serialNumber` VARCHAR(191) NOT NULL,
  `spec`         TEXT         NOT NULL,
  `location`     VARCHAR(191) NOT NULL,
  `dateAdded`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `imageUrl`     LONGTEXT,
  `pdfUrl`       LONGTEXT,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Asset_assetCode_key` (`assetCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ตาราง AssetImage (รูปภาพอุปกรณ์)
-- ============================================
CREATE TABLE IF NOT EXISTS `AssetImage` (
  `id`        INT         NOT NULL AUTO_INCREMENT,
  `assetId`   INT         NOT NULL,
  `imageUrl`  LONGTEXT    NOT NULL,
  `sortOrder` INT         NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `AssetImage_assetId_fkey` (`assetId`),
  CONSTRAINT `AssetImage_assetId_fkey`
    FOREIGN KEY (`assetId`) REFERENCES `Asset` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ตาราง Transaction (รายการยืม-คืน)
-- ============================================
CREATE TABLE IF NOT EXISTS `Transaction` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `assetId`        INT          NOT NULL,
  `borrowerName`   VARCHAR(191) NOT NULL,
  `customerName`   VARCHAR(191) NOT NULL DEFAULT '',
  `salesTeam`      VARCHAR(191) NOT NULL DEFAULT '',
  `department`     VARCHAR(191) NOT NULL DEFAULT '',
  `organization`   VARCHAR(191) NOT NULL DEFAULT '',
  `borrowDate`     DATETIME(3)  NOT NULL,
  `dueDate`        DATETIME(3)  NOT NULL,
  `returnDate`     DATETIME(3),
  `locationFrom`   VARCHAR(191) NOT NULL DEFAULT '',
  `locationTo`     VARCHAR(191) NOT NULL DEFAULT '',
  `returnLocation` VARCHAR(191),
  `status`         ENUM('ACTIVE', 'RETURNED', 'OVERDUE') NOT NULL DEFAULT 'ACTIVE',
  `notes`          TEXT,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Transaction_assetId_fkey` (`assetId`),
  CONSTRAINT `Transaction_assetId_fkey`
    FOREIGN KEY (`assetId`) REFERENCES `Asset` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Prisma Migrations Table (ให้ Prisma ติดตาม migrations)
-- ============================================
CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
  `id`                  VARCHAR(36)  NOT NULL,
  `checksum`            VARCHAR(64)  NOT NULL,
  `finished_at`         DATETIME(3),
  `migration_name`      VARCHAR(255) NOT NULL,
  `logs`                TEXT,
  `rolled_back_at`      DATETIME(3),
  `started_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- เสร็จสิ้นการสร้างฐานข้อมูล!
-- ============================================
SELECT 'Database demotrack สร้างเรียบร้อยแล้ว!' AS result;
