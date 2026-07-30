import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@ashapura.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Abcd@1234";

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
    },
    create: {
      name: "Admin",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: "SUPER_ADMIN",
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

  // Delete the old "DPD Standard" template (id: 1) if it exists
  await prisma.rateTemplate.deleteMany({
    where: { id: 1 }
  });

  const sizes = await prisma.containerSize.findMany();

  // Template 2: DPD+CFS Nhava Sheva
  const nhavaDpdTemplate = await prisma.rateTemplate.upsert({
    where: { id: 2 },
    update: {
      name: "DPD+CFS Nhava Sheva",
      quotationType: "DPD",
      isDefault: true,
      location: "Nhava Sheva",
    },
    create: {
      id: 2,
      name: "DPD+CFS Nhava Sheva",
      quotationType: "DPD",
      isDefault: true,
      createdById: admin.id,
      location: "Nhava Sheva",
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
      isDefault: true,
      location: "Nhava Sheva",
    },
    create: {
      id: 3,
      name: "Non-DPD Nhava Sheva",
      quotationType: "NON_DPD",
      isDefault: true,
      createdById: admin.id,
      location: "Nhava Sheva",
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

  const defaultTerms = `Please note:-
NN must be shared at least 8 working days prior to the shipment's arrival at nn@ashapura.in id. Failure to do so may attract additional charges.
Scanning/ Scan Mismatch/Seal mismatch / examination (if applicable) will be at actual asper CFS tariff & customs norms.
Any incidental or additional charges will be on actuals with prior approval, if applicable.
All relevant documents or justification to be presented in case if any query is raised by customs.
Vehicle Detention: In case of transportation, Rs.2500 per container per day will be applicable if the vehicle is held for more than 24 hours at both port/plant.
Outside Weighment charges at actual (if required).

Payment terms – Third party complete advance // rest within 15 days from date of Ashapura E-invoice.`;

  await prisma.pdfTemplate.upsert({
    where: { id: 1 },
    update: {
      termsAndConditions: defaultTerms,
    },
    create: {
      id: 1,
      name: "Default Template",
      isDefault: true,
      createdById: admin.id,
      headerHtml: "<h1>ashapura quotation</h1>",
      footerHtml: "<p>Thank you for your business.</p>",
      termsAndConditions: defaultTerms,
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
