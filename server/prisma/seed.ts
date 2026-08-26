import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@ashapura.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Abcd@1234";

type SeedComponent = {
  label: string;
  componentType: "FIXED" | "PER_CONTAINER";
  fixedValue?: number;
  percentageValue?: number;
  isTax?: boolean;
  sortOrder: number;
  rates?: Record<string, number>;
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
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

  const sizes = await prisma.containerSize.findMany();

  // Template 2: DPD+CFS Nhava Sheva
  const nhavaDpdTemplate = await prisma.rateTemplate.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: "DPD+CFS Nhava Sheva",
      quotationType: "DPD",
      isDefault: true,
      createdById: admin.id,
      location: "Nhava Sheva",
    },
  });

  // Create default components only when this template has none.
  const componentsDpd: SeedComponent[] = [
    { label: "Agency / Handling Charges", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 0 },
    { label: "CFS Charges", componentType: "PER_CONTAINER" as const, sortOrder: 1, rates: { "20FT": 7500, "40FT": 9000 } },
    { label: "CFS Free Days (10 Days)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 2 },
    { label: "Scanning Charges (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 3 },
    { label: "Statutory & Third-Party Charges (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 4 },
    { label: "Transportation", componentType: "PER_CONTAINER" as const, sortOrder: 5, rates: { "20FT": 21000, "40FT": 23000 } },
  ];

  const nhavaDpdComponentCount = await prisma.rateTemplateComponent.count({ where: { rateTemplateId: nhavaDpdTemplate.id } });
  if (nhavaDpdComponentCount === 0) for (const comp of componentsDpd) {
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
    update: {},
    create: {
      id: 3,
      name: "Non-DPD Nhava Sheva",
      quotationType: "NON_DPD",
      isDefault: true,
      createdById: admin.id,
      location: "Nhava Sheva",
    },
  });

  // Create default components only when this template has none.
  const componentsNonDpd: SeedComponent[] = [
    { label: "Agency / Handling Charges", componentType: "PER_CONTAINER" as const, sortOrder: 0, rates: { "20FT": 3000, "40FT": 3500 } },
    { label: "CFS Charges (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 1 },
    { label: "CFS Free Days (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 2 },
    { label: "Scanning Charges (As per Receipt)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 3 },
    { label: "Statutory & Third-Party Charges (At Actual)", componentType: "FIXED" as const, fixedValue: 0, sortOrder: 4 },
    { label: "Transportation", componentType: "PER_CONTAINER" as const, sortOrder: 5, rates: { "20FT": 21000, "40FT": 23000 } },
  ];

  const nhavaNonDpdComponentCount = await prisma.rateTemplateComponent.count({ where: { rateTemplateId: nhavaNonDpdTemplate.id } });
  if (nhavaNonDpdComponentCount === 0) for (const comp of componentsNonDpd) {
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

Payment terms – Third party complete advance // rest within 15 days from the billing date.`;

  const templatePath = path.resolve(process.cwd(), "src/lib/pdf/templates/quotation.hbs");
  const quotationHtml = fs.readFileSync(templatePath, "utf8");

  await prisma.pdfTemplate.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Default Template",
      isDefault: true,
      createdById: admin.id,
      headerHtml: "<h1>ashapura quotation</h1>",
      footerHtml: "<p>Thank you for your business.</p>",
      termsAndConditions: defaultTerms,
      htmlTemplate: quotationHtml,
    },
  });

  const coreFields = [
    { name: "quotationNumber", label: "Number", showInFilter: false },
    { name: "quotationType", label: "Type", showInFilter: true },
    { name: "status", label: "Status", showInFilter: true },
    { name: "createdBy", label: "Created By", showInFilter: false },
    { name: "approvedBy", label: "Approved By", showInFilter: false },
    { name: "createdAt", label: "Date", showInFilter: true },
  ];

  const systemFields: Array<{ name: string; label: string; required?: boolean }> = [
    { name: "clientName", label: "Client Name", required: true },
    { name: "location", label: "Location" },
    { name: "route", label: "Route" },
    { name: "title", label: "Title" },
    { name: "servicesOffered", label: "Services Offered" },
    { name: "commodityType", label: "Commodity Type" },
    { name: "containerDetails", label: "Container Details" },
    { name: "additionalRemarks", label: "Additional Remarks" },
    { name: "clientAddress", label: "Client Address" },
    { name: "clientGstin", label: "Client GSTIN" },
    { name: "clientContactPerson", label: "Client Contact Person" },
    { name: "clientPhone", label: "Client Phone" },
    { name: "clientEmail", label: "Client Email" },
  ];

  const defaultFields = [
    ...coreFields.map((field) => ({ ...field, category: "CORE" })),
    ...systemFields.map((field) => ({ ...field, category: "SYSTEM", showInFilter: true })),
  ];

  for (const [listOrder, field] of defaultFields.entries()) {
    await prisma.customField.upsert({
      where: { name: field.name },
      update: {},
      create: {
        name: field.name,
        label: field.label,
        type: "TEXT",
        required: field.required ?? false,
        isDefault: true,
        category: field.category,
        listOrder,
        isActive: true,
        showInPdf: true,
        showInFilter: field.showInFilter,
        showInExport: true,
        showInList: true,
      },
    });
  }

  console.log(`Seeded admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (change this password after first login)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
