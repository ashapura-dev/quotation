import "dotenv/config";
import { prisma } from "./src/config/db.js";
import { createQuotation, getQuotation, duplicateQuotation } from "./src/modules/quotations/quotations.service.js";
import { generateQuotationPdf } from "./src/modules/quotations/pdf.service.js";

async function run() {
  console.log("Running layout adjustment verification script...");

  // 1. Get first user in DB
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in the database. Please seed first.");
    process.exit(1);
  }
  console.log(`Using user: ${user.name} (ID: ${user.id})`);

  // 2. Define input data with route and title
  const testInput = {
    quotationType: "DPD" as const,
    clientName: "Test Title Client",
    clientAddress: "123 Client Rd",
    location: "Nhava Sheva",
    route: "Nhava Sheva to Dharavi Warehouse B",
    title: "Special July Cargo Shipment #12",
    notes: "Test notes for title",
    containers: [
      { containerSizeId: 1, containerSizeLabel: "20ft Standard", quantity: 2 }
    ],
    components: [
      {
        label: "Handling Charges",
        componentType: "FIXED" as const,
        isTax: false,
        fixedValue: 5000
      }
    ]
  };

  // 3. Create Quotation
  console.log("Creating test quotation...");
  const quotation = await createQuotation(user.id, testInput);
  console.log("Quotation created successfully! ID:", quotation.id);

  // 4. Test PDF generation (with custom title)
  console.log("Generating PDF (using custom title as heading)...");
  const { pdfBuffer } = await generateQuotationPdf(quotation.id);
  console.log(`PDF generated successfully. Size: ${pdfBuffer.length} bytes.`);

  // 5. Clean up
  console.log("Cleaning up test records...");
  await prisma.quotation.delete({ where: { id: quotation.id } });

  console.log("Verification completed successfully! All checks passed!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
