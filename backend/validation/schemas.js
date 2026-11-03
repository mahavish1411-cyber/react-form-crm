const { z } = require("zod");

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

// Accepts numbers or numeric strings; rejects NaN and negatives.
const money = z.coerce.number({ message: "Must be a number" }).min(0, "Must not be negative");
const requiredText = z.string().trim().min(1, "Required");
const month = z.string().regex(MONTH, "Month must use YYYY-MM format");

const employeeFields = {
  employeeId: requiredText,
  name: requiredText,
  email: requiredText,
  phone: requiredText,
  department: requiredText,
  designation: requiredText,
  basicSalary: money.optional(),
  allowance: money.optional(),
  deduction: money.optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
};

const employeeCreate = z.looseObject(employeeFields);
const employeeUpdate = z.looseObject(employeeFields).partial();

const otherDeduction = money.optional();

const payrollGenerate = z.looseObject({
  employeeId: z.string().min(1),
  month,
  otherDeduction,
  remarks: z.string().optional(),
});

const payrollGenerateAll = z.looseObject({
  month,
  otherDeduction,
  remarks: z.string().optional(),
});

const payrollRecalculate = z.looseObject({
  otherDeduction,
  remarks: z.string().optional(),
});

const payrollListQuery = z.looseObject({
  month: month.optional(),
  paymentStatus: z.enum(["Pending", "Paid"]).optional(),
});

module.exports = {
  employeeCreate,
  employeeUpdate,
  payrollGenerate,
  payrollGenerateAll,
  payrollRecalculate,
  payrollListQuery,
};
