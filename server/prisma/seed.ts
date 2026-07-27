import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@ashapura.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: "Admin",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: "ADMIN",
    },
  });

  const containerSizes = [
    { code: "20FT", label: "20ft Standard", sortOrder: 0 },
    { code: "40FT", label: "40ft Standard", sortOrder: 1 },
  ];
  for (const size of containerSizes) {
    await prisma.containerSize.upsert({
      where: { code: size.code },
      update: {},
      create: size,
    });
  }

  const dpdTemplate = await prisma.rateTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "DPD Standard",
      quotationType: "DPD",
      isDefault: true,
      createdById: admin.id,
      components: {
        create: [
          { label: "Customs Clearance", componentType: "FIXED", fixedValue: 5000, sortOrder: 0 },
          { label: "Statutory & Third-Party Charges", componentType: "FIXED", fixedValue: 2000, sortOrder: 1 },
          { label: "CGST", componentType: "PERCENTAGE", isTax: true, percentageValue: 9, sortOrder: 3 },
          { label: "SGST", componentType: "PERCENTAGE", isTax: true, percentageValue: 9, sortOrder: 4 },
        ],
      },
    },
  });

  const transportComponent = await prisma.rateTemplateComponent.create({
    data: {
      rateTemplateId: dpdTemplate.id,
      label: "Transportation",
      componentType: "PER_CONTAINER",
      sortOrder: 2,
    },
  });

  const sizes = await prisma.containerSize.findMany();
  const defaultRates: Record<string, number> = { "20FT": 8000, "40FT": 12000 };
  for (const size of sizes) {
    await prisma.rateTemplateContainerRate.upsert({
      where: { rateTemplateComponentId_containerSizeId: { rateTemplateComponentId: transportComponent.id, containerSizeId: size.id } },
      update: {},
      create: {
        rateTemplateComponentId: transportComponent.id,
        containerSizeId: size.id,
        rateValue: defaultRates[size.code] ?? 0,
      },
    });
  }

  await prisma.pdfTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Default Template",
      isDefault: true,
      createdById: admin.id,
      headerHtml: "<h1>Ashapura Impex</h1>",
      footerHtml: "<p>Thank you for your business.</p>",
      termsAndConditions: "Standard terms and conditions apply.",
    },
  });

  console.log(`Seeded admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (change this password after first login)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
