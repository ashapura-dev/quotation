import "dotenv/config";
import { prisma } from "./src/config/db.js";
import { createQuotation } from "./src/modules/quotations/quotations.service.js";
import { generateQuotationPdf } from "./src/modules/quotations/pdf.service.js";

async function run() {
  console.log("Running static fields PDF verification script...");

  // 1. Get first user in DB
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in the database. Please seed first.");
    process.exit(1);
  }
  console.log(`Using user: ${user.name} (ID: ${user.id})`);

  // 2. Define quotation input with new static fields
  const testInput = {
    quotationType: "DPD" as const,
    clientName: "Test Static Fields Client",
    clientAddress: "123 Client Rd",
    location: "Nhava Sheva",
    route: "Nhava Sheva to Dharavi",
    title: "Vessel Cargo Shipment #99",
    servicesOffered: "Origin Clearance & Local Delivery",
    commodityType: "Industrial Machinery Parts",
    additionalRemarks: "1. Subject to customs verification.\n2. Handle with care.",
    notes: "Standard terms and conditions notes",
    containers: [
      { containerSizeId: 1, containerSizeLabel: "20ft Standard", quantity: 2 },
      { containerSizeId: 2, containerSizeLabel: "40ft Standard", quantity: 1 }
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
  console.log("Services Offered:", quotation.servicesOffered);
  console.log("Commodity Type:", quotation.commodityType);
  console.log("Additional Remarks:", quotation.additionalRemarks);

  if (quotation.servicesOffered !== testInput.servicesOffered) {
    throw new Error("servicesOffered mismatch!");
  }
  if (quotation.commodityType !== testInput.commodityType) {
    throw new Error("commodityType mismatch!");
  }
  if (quotation.additionalRemarks !== testInput.additionalRemarks) {
    throw new Error("additionalRemarks mismatch!");
  }

  // 4. Test PDF generation (includes servicesOffered, commodityType, containers, additionalRemarks, preparedBy)
  console.log("Generating PDF to verify formatting...");
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
