import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { generateInvoicePdf, getInvoice, listInvoices, updatePaymentStatus } from "./invoices.service.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(
      await listInvoices({
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        paymentStatus: typeof req.query.paymentStatus === "string" ? req.query.paymentStatus : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      }),
    );
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ invoice: await getInvoice(Number(req.params.id)) });
  }),
);

router.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const { pdfBuffer, invoice } = await generateInvoicePdf(Number(req.params.id));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNumber.replace(/\//g, "-")}.pdf"`);
    res.send(pdfBuffer);
  }),
);

const paymentStatusSchema = z.object({ paymentStatus: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID"]) });

router.patch(
  "/:id/payment-status",
  asyncHandler(async (req, res) => {
    const { paymentStatus } = paymentStatusSchema.parse(req.body);
    res.json({ invoice: await updatePaymentStatus(Number(req.params.id), paymentStatus) });
  }),
);

export default router;
