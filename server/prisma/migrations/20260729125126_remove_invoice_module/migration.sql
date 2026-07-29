/*
  Warnings:

  - You are about to drop the `invoice_line_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invoices` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `invoice_line_items` DROP FOREIGN KEY `invoice_line_items_invoiceId_fkey`;

-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_quotationId_fkey`;

-- DropTable
DROP TABLE `invoice_line_items`;

-- DropTable
DROP TABLE `invoices`;
