-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'EMPLOYEE', 'TL') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tokenVersion` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `container_sizes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `container_sizes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `gstin` VARCHAR(191) NULL,
    `contactPerson` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `clients_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `quotationType` ENUM('DPD', 'NON_DPD') NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NOT NULL,
    `location` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_template_components` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rateTemplateId` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `componentType` ENUM('FIXED', 'PERCENTAGE', 'PER_CONTAINER', 'TEXT') NOT NULL,
    `isTax` BOOLEAN NOT NULL DEFAULT false,
    `fixedValue` DECIMAL(12, 2) NULL,
    `percentageValue` DECIMAL(5, 2) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `textValue` TEXT NULL,
    `remark` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_template_container_rates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rateTemplateComponentId` INTEGER NOT NULL,
    `containerSizeId` INTEGER NOT NULL,
    `rateValue` DECIMAL(12, 2) NOT NULL,

    UNIQUE INDEX `rate_template_container_rates_rateTemplateComponentId_contai_key`(`rateTemplateComponentId`, `containerSizeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pdf_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `quotationType` ENUM('DPD', 'NON_DPD') NULL,
    `logoPath` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#1c7ed6',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#495057',
    `fontFamily` VARCHAR(191) NOT NULL DEFAULT 'Inter, sans-serif',
    `headerHtml` TEXT NULL,
    `footerHtml` TEXT NULL,
    `termsAndConditions` TEXT NULL,
    `htmlTemplate` TEXT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_number_sequences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prefix` VARCHAR(191) NOT NULL,
    `periodKey` VARCHAR(191) NOT NULL,
    `lastSequence` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quotation_number_sequences_prefix_periodKey_key`(`prefix`, `periodKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `smtp_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `host` VARCHAR(191) NULL,
    `port` INTEGER NULL,
    `username` VARCHAR(191) NULL,
    `passwordEnc` VARCHAR(191) NULL,
    `fromAddress` VARCHAR(191) NULL,
    `fromName` VARCHAR(191) NULL,
    `isConfigured` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationNumber` VARCHAR(191) NOT NULL,
    `quotationType` ENUM('DPD', 'NON_DPD') NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'SENT_TO_CLIENT', 'APPROVED_BY_CLIENT', 'REJECTED_BY_CLIENT') NOT NULL DEFAULT 'DRAFT',
    `clientId` INTEGER NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientAddress` TEXT NULL,
    `clientGstin` VARCHAR(191) NULL,
    `clientContactPerson` VARCHAR(191) NULL,
    `clientPhone` VARCHAR(191) NULL,
    `clientEmail` VARCHAR(191) NULL,
    `rateTemplateId` INTEGER NULL,
    `pdfTemplateId` INTEGER NULL,
    `location` VARCHAR(191) NULL,
    `route` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `customFields` JSON NULL,
    `servicesOffered` VARCHAR(191) NULL,
    `commodityType` VARCHAR(191) NULL,
    `containerDetails` VARCHAR(191) NULL,
    `additionalRemarks` TEXT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `taxTotal` DECIMAL(12, 2) NOT NULL,
    `otherAdjustmentsTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdById` INTEGER NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quotations_quotationNumber_key`(`quotationNumber`),
    INDEX `quotations_status_idx`(`status`),
    INDEX `quotations_clientName_idx`(`clientName`),
    INDEX `quotations_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_containers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationId` INTEGER NOT NULL,
    `containerSizeId` INTEGER NULL,
    `containerSizeLabel` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_line_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationId` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `componentType` ENUM('FIXED', 'PERCENTAGE', 'PER_CONTAINER', 'TEXT') NOT NULL,
    `isTax` BOOLEAN NOT NULL DEFAULT false,
    `fixedValue` DECIMAL(12, 2) NULL,
    `percentageValue` DECIMAL(5, 2) NULL,
    `computedAmount` DECIMAL(12, 2) NOT NULL,
    `containerBreakdown` JSON NULL,
    `sourceTemplateComponentId` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `textValue` TEXT NULL,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_status_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationId` INTEGER NOT NULL,
    `fromStatus` ENUM('DRAFT', 'PENDING', 'APPROVED', 'SENT_TO_CLIENT', 'APPROVED_BY_CLIENT', 'REJECTED_BY_CLIENT') NOT NULL,
    `toStatus` ENUM('DRAFT', 'PENDING', 'APPROVED', 'SENT_TO_CLIENT', 'APPROVED_BY_CLIENT', 'REJECTED_BY_CLIENT') NOT NULL,
    `changedById` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('SUBMITTED_FOR_REVIEW', 'APPROVED', 'REJECTED', 'SENT_TO_CLIENT', 'APPROVED_BY_CLIENT', 'REJECTED_BY_CLIENT') NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `relatedQuotationId` INTEGER NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_isRead_idx`(`userId`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_fields` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `options` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `showInPdf` BOOLEAN NOT NULL DEFAULT true,
    `showInFilter` BOOLEAN NOT NULL DEFAULT true,
    `showInExport` BOOLEAN NOT NULL DEFAULT true,
    `showInList` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `custom_fields_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rate_templates` ADD CONSTRAINT `rate_templates_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rate_template_components` ADD CONSTRAINT `rate_template_components_rateTemplateId_fkey` FOREIGN KEY (`rateTemplateId`) REFERENCES `rate_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rate_template_container_rates` ADD CONSTRAINT `rate_template_container_rates_rateTemplateComponentId_fkey` FOREIGN KEY (`rateTemplateComponentId`) REFERENCES `rate_template_components`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rate_template_container_rates` ADD CONSTRAINT `rate_template_container_rates_containerSizeId_fkey` FOREIGN KEY (`containerSizeId`) REFERENCES `container_sizes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pdf_templates` ADD CONSTRAINT `pdf_templates_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_rateTemplateId_fkey` FOREIGN KEY (`rateTemplateId`) REFERENCES `rate_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_pdfTemplateId_fkey` FOREIGN KEY (`pdfTemplateId`) REFERENCES `pdf_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_containers` ADD CONSTRAINT `quotation_containers_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_containers` ADD CONSTRAINT `quotation_containers_containerSizeId_fkey` FOREIGN KEY (`containerSizeId`) REFERENCES `container_sizes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_line_items` ADD CONSTRAINT `quotation_line_items_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_line_items` ADD CONSTRAINT `quotation_line_items_sourceTemplateComponentId_fkey` FOREIGN KEY (`sourceTemplateComponentId`) REFERENCES `rate_template_components`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_status_history` ADD CONSTRAINT `quotation_status_history_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_status_history` ADD CONSTRAINT `quotation_status_history_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_relatedQuotationId_fkey` FOREIGN KEY (`relatedQuotationId`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
