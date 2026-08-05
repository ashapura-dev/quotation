import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./src/config/db.js";
import { createQuotation } from "./src/modules/quotations/quotations.service.js";
import { generateQuotationPdf } from "./src/modules/quotations/pdf.service.js";

async function run() {
  console.log("Generating final verification PDF...");

  // 1. Get first user in DB
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in the database. Please seed first.");
    process.exit(1);
  }

  // 2. Define quotation input with both static fields and custom fields
  const testInput = {
    quotationType: "DPD" as const,
    clientName: "Ashapura Logistics Limited",
    clientAddress: "Nhava Sheva Warehouse B, Sector 3",
    clientGstin: "27AAAAA1111A1Z1",
    clientContactPerson: "Bhavin Gusai",
    clientPhone: "+91 99999 88888",
    clientEmail: "bhavin@ashapura.com",
    location: "Nhava Sheva",
    route: "Nhava Sheva to Dharavi",
    title: "Import Clearance For DPD Cargo",
    servicesOffered: "Custom Clearance & Logistics",
    commodityType: "Industrial Valves & Tubes",
    additionalRemarks: "Subject to scanning mismatch / seal mismatch or examination (if applicable).",
    customFields: {
      vessel_name: "MSC Daniela V.28",
      voyage_no: "284E",
      arrival_date: "2026-08-10",
      line_manager: "Bhavin Gusai",
    },
    containers: [
      { containerSizeId: 1, containerSizeLabel: "20ft Standard", quantity: 2 },
      { containerSizeId: 2, containerSizeLabel: "40ft Standard", quantity: 1 }
    ],
    components: [
      {
        label: "Documentation Charges",
        componentType: "FIXED" as const,
        isTax: false,
        fixedValue: 2000
      },
      {
        label: "Clearance Charges",
        componentType: "FIXED" as const,
        isTax: false,
        fixedValue: 2000
      }
    ]
  };

  // 3. Create Quotation
  const quotation = await createQuotation(user.id, testInput);

  // 4. Generate PDF
  const { pdfBuffer } = await generateQuotationPdf(quotation.id);

  // 5. Save to artifacts directory
  const destDir = "C:\\Users\\Bhavin Gusai\\.gemini\\antigravity-ide\\brain\\9105ebd4-c09d-439d-b908-8cd553b0d24a";
  const destPath = path.join(destDir, "verify_layout_final2.pdf");
  await fs.writeFile(destPath, pdfBuffer);
  console.log(`PDF saved to: ${destPath}`);

  // 6. Clean up DB
  await prisma.quotation.delete({ where: { id: quotation.id } });
  console.log("DB cleaned up successfully.");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
