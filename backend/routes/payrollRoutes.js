const express = require("express");

const {
  generatePayroll,
  generateAllPayrolls,
  recalculatePayroll,
  getPayrolls,
  getPayrollById,
  markPayrollPaid,
} = require("../controllers/payrollController");

const router = express.Router();

// ==========================================
// GET ALL PAYROLLS
// GET /api/payroll
// GET /api/payroll?month=2026-08
// GET /api/payroll?month=2026-08&paymentStatus=Pending
// ==========================================

router.get(
  "/",
  getPayrolls
);

// ==========================================
// GENERATE ALL ACTIVE EMPLOYEE PAYROLLS
// POST /api/payroll/generate-all
// ==========================================

router.post(
  "/generate-all",
  generateAllPayrolls
);

// ==========================================
// GENERATE SINGLE EMPLOYEE PAYROLL
// POST /api/payroll/generate
// ==========================================

router.post(
  "/generate",
  generatePayroll
);

// ==========================================
// RECALCULATE PAYROLL
// PUT /api/payroll/:id/recalculate
// ==========================================

router.put(
  "/:id/recalculate",
  recalculatePayroll
);

// ==========================================
// MARK PAYROLL AS PAID
// PUT /api/payroll/:id/paid
// ==========================================

router.put(
  "/:id/paid",
  markPayrollPaid
);

// ==========================================
// GET SINGLE PAYROLL
// GET /api/payroll/:id
//
// Keep this route after specific routes.
// ==========================================

router.get(
  "/:id",
  getPayrollById
);

module.exports = router;