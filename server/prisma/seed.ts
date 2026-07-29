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

  // Template 2: DPD+CFS Nhava Sheva
  const nhavaDpdTemplate = await prisma.rateTemplate.upsert({
    where: { id: 2 },
    update: {
      name: "DPD+CFS Nhava Sheva",
      quotationType: "DPD",
    },
    create: {
      id: 2,
      name: "DPD+CFS Nhava Sheva",
      quotationType: "DPD",
      createdById: admin.id,
    },
  });

  // Clean components for Template 2
  await prisma.rateTemplateComponent.deleteMany({
    where: { rateTemplateId: 2 },
  });

  // Create components for DPD+CFS Nhava Sheva
  const componentsDpd = [
    { label: "Agency / Handling Charges", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 0 },
    { label: "CFS Charges", componentType: "PER_CONTAINER" as const, sortOrder: 1, rates: { "20FT": 7500, "40FT": 9000 } },
    { label: "CFS Free Days (10 Days)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 2 },
    { label: "Scanning Charges (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 3 },
    { label: "Statutory & Third-Party Charges (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 4 },
    { label: "Transportation", componentType: "PER_CONTAINER" as const, sortOrder: 5, rates: { "20FT": 21000, "40FT": 23000 } },
    { label: "CGST", componentType: "PERCENTAGE" as const, isTax: true, percentageValue: 9, sortOrder: 6 },
    { label: "SGST", componentType: "PERCENTAGE" as const, isTax: true, percentageValue: 9, sortOrder: 7 },
  ];

  for (const comp of componentsDpd) {
    const createdComp = await prisma.rateTemplateComponent.create({
      data: {
        rateTemplateId: nhavaDpdTemplate.id,
        label: comp.label,
        componentType: comp.componentType,
        isTax: comp.isTax ?? false,
        fixedValue: comp.fixedValue ?? null,
        percentageValue: comp.percentageValue ?? null,
        sortOrder: comp.sortOrder,
      },
    });

    if (comp.componentType === "PER_CONTAINER" && comp.rates) {
      for (const size of sizes) {
        const rateVal = comp.rates[size.code as keyof typeof comp.rates] ?? 0;
        await prisma.rateTemplateContainerRate.create({
          data: {
            rateTemplateComponentId: createdComp.id,
            containerSizeId: size.id,
            rateValue: rateVal,
          },
        });
      }
    }
  }

  // Template 3: Non-DPD Nhava Sheva
  const nhavaNonDpdTemplate = await prisma.rateTemplate.upsert({
    where: { id: 3 },
    update: {
      name: "Non-DPD Nhava Sheva",
      quotationType: "NON_DPD",
    },
    create: {
      id: 3,
      name: "Non-DPD Nhava Sheva",
      quotationType: "NON_DPD",
      createdById: admin.id,
    },
  });

  // Clean components for Template 3
  await prisma.rateTemplateComponent.deleteMany({
    where: { rateTemplateId: 3 },
  });

  // Create components for Non-DPD Nhava Sheva
  const componentsNonDpd = [
    { label: "Agency / Handling Charges", componentType: "PER_CONTAINER" as const, sortOrder: 0, rates: { "20FT": 3000, "40FT": 3500 } },
    { label: "CFS Charges (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 1 },
    { label: "CFS Free Days (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 2 },
    { label: "Scanning Charges (As per Receipt)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 3 },
    { label: "Statutory & Third-Party Charges (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 4 },
    { label: "Transportation", componentType: "PER_CONTAINER" as const, sortOrder: 5, rates: { "20FT": 21000, "40FT": 23000 } },
    { label: "CGST", componentType: "PERCENTAGE" as const, isTax: true, percentageValue: 9, sortOrder: 6 },
    { label: "SGST", componentType: "PERCENTAGE" as const, isTax: true, percentageValue: 9, sortOrder: 7 },
  ];

  for (const comp of componentsNonDpd) {
    const createdComp = await prisma.rateTemplateComponent.create({
      data: {
        rateTemplateId: nhavaNonDpdTemplate.id,
        label: comp.label,
        componentType: comp.componentType,
        isTax: comp.isTax ?? false,
        fixedValue: comp.fixedValue ?? null,
        percentageValue: comp.percentageValue ?? null,
        sortOrder: comp.sortOrder,
      },
    });

    if (comp.componentType === "PER_CONTAINER" && comp.rates) {
      for (const size of sizes) {
        const rateVal = comp.rates[size.code as keyof typeof comp.rates] ?? 0;
        await prisma.rateTemplateContainerRate.create({
          data: {
            rateTemplateComponentId: createdComp.id,
            containerSizeId: size.id,
            rateValue: rateVal,
          },
        });
      }
    }
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
