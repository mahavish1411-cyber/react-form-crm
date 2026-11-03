const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    // ==========================================
    // EMPLOYEE
    // ==========================================

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // Example: 2026-08
    month: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // ATTENDANCE SUMMARY
    // ==========================================

    workingDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    presentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    lateDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    halfDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    absentDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // SALARY DETAILS
    // ==========================================

    basicSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    allowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    grossSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // DEDUCTIONS
    // ==========================================

    // Deduction calculated from
    // absent days and half days
    attendanceDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Fixed deduction configured
    // in the Employee record
    employeeDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Manual deduction entered
    // while generating payroll
    otherDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Attendance Deduction
    // + Employee Deduction
    // + Other Deduction
    totalDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // FINAL SALARY
    // ==========================================

    netSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // PAYMENT
    // ==========================================

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },

    paidDate: {
      type: Date,
      default: null,
    },

    // ==========================================
    // OPTIONAL REMARKS
    // ==========================================

    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// PREVENT DUPLICATE MONTHLY PAYROLL
// ==========================================
//
// One employee should only have
// one payroll record for the same month.
//
// Example:
//
// Employee A + 2026-09 = only one record
//
// ==========================================

payrollSchema.index(
  {
    employee: 1,
    month: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model(
  "Payroll",
  payrollSchema
);