const mongoose = require("mongoose");

const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");

const calc = require("../services/payrollCalculator");
const { EMPLOYEE_POPULATE_FIELDS } = require("../constants/populateFields");

const isValidMonth = calc.isValidMonth;

const getTodayDate = () => calc.getDateString(new Date());

const monthAttendanceFilter = (month) => ({ $regex: `^${month}-` });

// Pure computation from already-loaded attendance records.
const computePayrollValues = ({ employee, month, records, manualOtherDeduction = 0 }) => {
  const summary = calc.summarizeAttendance({ month, records, today: getTodayDate() });
  const payroll = calc.calculatePayroll({
    employee,
    summary,
    otherDeduction: manualOtherDeduction,
  });
  return { ...summary, ...payroll };
};

const calculatePayrollValues = async ({ employee, month, manualOtherDeduction = 0 }) => {
  const records = await Attendance.find({
    employee: employee._id,
    date: monthAttendanceFilter(month),
  }).sort({ date: 1 });
  return computePayrollValues({ employee, month, records, manualOtherDeduction });
};

const payrollDocFromValues = (employeeId, month, values, remarks) => ({
  employee: employeeId,
  month,
  workingDays: values.workingDays,
  presentDays: values.presentDays,
  lateDays: values.lateDays,
  halfDays: values.halfDays,
  absentDays: values.absentDays,
  basicSalary: values.basicSalary,
  allowance: values.allowance,
  grossSalary: values.grossSalary,
  attendanceDeduction: values.attendanceDeduction,
  employeeDeduction: values.employeeDeduction,
  otherDeduction: values.otherDeduction,
  totalDeduction: values.totalDeduction,
  netSalary: values.netSalary,
  paymentStatus: "Pending",
  paidDate: null,
  remarks,
});

// ==========================================
// GENERATE SINGLE PAYROLL
// ==========================================

const generatePayroll = async (
  req,
  res
) => {
  try {
    const {
      employeeId,
      month,
      otherDeduction = 0,
      remarks = "",
    } = req.body;

    if (
      !employeeId ||
      !month
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Employee ID and month are required",
      });
    }

    if (
      !mongoose.Types
        .ObjectId
        .isValid(employeeId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid employee MongoDB ID",
      });
    }

    if (!isValidMonth(month)) {
      return res.status(400).json({
        success: false,
        message:
          "Month must use YYYY-MM format",
      });
    }

    const employee =
      await Employee.findById(
        employeeId
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "Employee not found",
      });
    }

    const existingPayroll =
      await Payroll.findOne({
        employee:
          employeeId,

        month,
      });

    if (existingPayroll) {
      return res.status(400).json({
        success: false,
        message:
          "Payroll already generated for this employee and month",
      });
    }

    const values =
      await calculatePayrollValues({
        employee,
        month,

        manualOtherDeduction:
          otherDeduction,
      });

    // ========================================
    // CREATE PAYROLL
    // ========================================

    const payroll =
      await Payroll.create({
        employee:
          employeeId,

        month,

        workingDays:
          values.workingDays,

        presentDays:
          values.presentDays,

        lateDays:
          values.lateDays,

        halfDays:
          values.halfDays,

        absentDays:
          values.absentDays,

        basicSalary:
          values.basicSalary,

        allowance:
          values.allowance,

        grossSalary:
          values.grossSalary,

        attendanceDeduction:
          values.attendanceDeduction,

        // NEW
        employeeDeduction:
          values.employeeDeduction,

        otherDeduction:
          values.otherDeduction,

        totalDeduction:
          values.totalDeduction,

        netSalary:
          values.netSalary,

        paymentStatus:
          "Pending",

        paidDate:
          null,

        remarks,
      });

    const populatedPayroll =
      await Payroll.findById(
        payroll._id
      ).populate(
        "employee",
        EMPLOYEE_POPULATE_FIELDS
      );

    return res.status(201).json({
      success: true,

      message:
        "Payroll generated successfully",

      calculation: {
        perDaySalary:
          values.perDaySalary,

        employeeDeduction:
          values.employeeDeduction,

        elapsedWorkingDays:
          values.elapsedWorkingDays,
      },

      data:
        populatedPayroll,
    });
  } catch (error) {
    console.error(
      "Generate payroll error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to generate payroll",

      error:
        error.message,
    });
  }
};

// ==========================================
// GENERATE PAYROLL FOR ALL ACTIVE EMPLOYEES
// ==========================================
//
// Fixed number of queries regardless of employee count:
// employees, existing payrolls, month attendance, insertMany, populate.

const generateAllPayrolls = async (req, res) => {
  try {
    const { month, otherDeduction = 0, remarks = "" } = req.body;

    if (!month) {
      return res.status(400).json({ success: false, message: "Month is required" });
    }
    if (!isValidMonth(month)) {
      return res.status(400).json({
        success: false,
        message: "Month must use YYYY-MM format",
      });
    }

    const employees = await Employee.find({ status: "Active" });
    if (!employees.length) {
      return res.status(404).json({ success: false, message: "No active employees found" });
    }

    const ids = employees.map((e) => e._id);

    const existing = await Payroll.find({ employee: { $in: ids }, month });
    const existingIds = new Set(existing.map((p) => String(p.employee)));

    const skippedEmployees = [];
    const failedEmployees = [];
    const toCreate = employees.filter((employee) => {
      if (existingIds.has(String(employee._id))) {
        skippedEmployees.push({
          employeeId: employee.employeeId,
          name: employee.name,
          reason: "Payroll already exists",
        });
        return false;
      }
      return true;
    });

    const recordsByEmployee = new Map();
    if (toCreate.length) {
      const records = await Attendance.find({
        employee: { $in: toCreate.map((e) => e._id) },
        date: monthAttendanceFilter(month),
      });
      for (const record of records) {
        const key = String(record.employee);
        if (!recordsByEmployee.has(key)) recordsByEmployee.set(key, []);
        recordsByEmployee.get(key).push(record);
      }
    }

    const docs = [];
    const docEmployees = [];
    for (const employee of toCreate) {
      try {
        const values = computePayrollValues({
          employee,
          month,
          records: recordsByEmployee.get(String(employee._id)) || [],
          manualOtherDeduction: Number(otherDeduction || 0),
        });
        docs.push(
          payrollDocFromValues(employee._id, month, values, remarks || `${month} Payroll`)
        );
        docEmployees.push(employee);
      } catch (error) {
        failedEmployees.push({
          employeeId: employee.employeeId,
          name: employee.name,
          error: error.message,
        });
      }
    }

    let createdPayrolls = [];
    if (docs.length) {
      try {
        const inserted = await Payroll.insertMany(docs);
        createdPayrolls = await Payroll.find({
          _id: { $in: inserted.map((p) => p._id) },
        }).populate("employee", EMPLOYEE_POPULATE_FIELDS);
      } catch (error) {
        docEmployees.forEach((employee) =>
          failedEmployees.push({
            employeeId: employee.employeeId,
            name: employee.name,
            error: error.message,
          })
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: "Bulk payroll generation completed",
      summary: {
        totalEmployees: employees.length,
        created: createdPayrolls.length,
        skipped: skippedEmployees.length,
        failed: failedEmployees.length,
      },
      createdPayrolls,
      skippedEmployees,
      failedEmployees,
    });
  } catch (error) {
    console.error("Generate all payrolls error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to generate bulk payroll",
      error: error.message,
    });
  }
};

// ==========================================
// RECALCULATE PAYROLL
// ==========================================

const recalculatePayroll =
  async (
    req,
    res
  ) => {
    try {
      if (
        !mongoose.Types
          .ObjectId
          .isValid(
            req.params.id
          )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid payroll ID",
          });
      }

      const payroll =
        await Payroll.findById(
          req.params.id
        );

      if (!payroll) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Payroll record not found",
          });
      }

      const employee =
        await Employee.findById(
          payroll.employee
        );

      if (!employee) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Employee not found",
          });
      }

      // If request contains a new
      // otherDeduction, use it.
      //
      // Otherwise preserve existing
      // manual other deduction.

      const manualOtherDeduction =
        req.body.otherDeduction !==
        undefined
          ? Number(
              req.body
                .otherDeduction || 0
            )
          : Number(
              payroll
                .otherDeduction || 0
            );

      const values =
        await calculatePayrollValues({
          employee,

          month:
            payroll.month,

          manualOtherDeduction,
        });

      // ========================================
      // UPDATE ATTENDANCE
      // ========================================

      payroll.workingDays =
        values.workingDays;

      payroll.presentDays =
        values.presentDays;

      payroll.lateDays =
        values.lateDays;

      payroll.halfDays =
        values.halfDays;

      payroll.absentDays =
        values.absentDays;

      // ========================================
      // UPDATE SALARY
      // ========================================

      payroll.basicSalary =
        values.basicSalary;

      payroll.allowance =
        values.allowance;

      payroll.grossSalary =
        values.grossSalary;

      // ========================================
      // UPDATE DEDUCTIONS
      // ========================================

      payroll.attendanceDeduction =
        values.attendanceDeduction;

      // NEW:
      // Save employee fixed deduction
      payroll.employeeDeduction =
        values.employeeDeduction;

      payroll.otherDeduction =
        values.otherDeduction;

      payroll.totalDeduction =
        values.totalDeduction;

      // ========================================
      // UPDATE NET SALARY
      // ========================================

      payroll.netSalary =
        values.netSalary;

      // ========================================
      // OPTIONAL REMARK UPDATE
      // ========================================

      if (
        req.body.remarks !==
        undefined
      ) {
        payroll.remarks =
          req.body.remarks;
      }

      // IMPORTANT:
      // We intentionally do NOT reset
      // paymentStatus or paidDate here.
      //
      // Paid payroll can be recalculated
      // while keeping its payment state.

      await payroll.save();

      const populatedPayroll =
        await Payroll.findById(
          payroll._id
        ).populate(
          "employee",
          EMPLOYEE_POPULATE_FIELDS
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Payroll recalculated successfully",

          calculation: {
            perDaySalary:
              values.perDaySalary,

            employeeDeduction:
              values.employeeDeduction,

            elapsedWorkingDays:
              values.elapsedWorkingDays,
          },

          data:
            populatedPayroll,
        });
    } catch (error) {
      console.error(
        "Recalculate payroll error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to recalculate payroll",

          error:
            error.message,
        });
    }
  };

// ==========================================
// GET PAYROLL LIST
// ==========================================

const getPayrolls = async (
  req,
  res
) => {
  try {
    const {
      month,
      paymentStatus,
    } = req.query;

    const filter = {};

    if (month) {
      filter.month =
        month;
    }

    if (paymentStatus) {
      filter.paymentStatus =
        paymentStatus;
    }

    const payrolls =
      await Payroll.find(
        filter
      )
        .populate(
          "employee",
          EMPLOYEE_POPULATE_FIELDS
        )
        .sort({
          createdAt:
            -1,
        });

    return res.status(200).json({
      success: true,

      count:
        payrolls.length,

      data:
        payrolls,
    });
  } catch (error) {
    console.error(
      "Get payrolls error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to fetch payroll records",

      error:
        error.message,
    });
  }
};

// ==========================================
// GET ONE PAYROLL
// ==========================================

const getPayrollById = async (
  req,
  res
) => {
  try {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.id
        )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid payroll ID",
      });
    }

    const payroll =
      await Payroll.findById(
        req.params.id
      ).populate(
        "employee",
        EMPLOYEE_POPULATE_FIELDS
      );

    if (!payroll) {
      return res.status(404).json({
        success: false,

        message:
          "Payroll record not found",
      });
    }

    return res.status(200).json({
      success: true,

      data:
        payroll,
    });
  } catch (error) {
    console.error(
      "Get payroll error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to fetch payroll record",

      error:
        error.message,
    });
  }
};

// ==========================================
// MARK PAYROLL AS PAID
// ==========================================

const markPayrollPaid = async (
  req,
  res
) => {
  try {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          req.params.id
        )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Invalid payroll ID",
      });
    }

    const payroll =
      await Payroll.findById(
        req.params.id
      );

    if (!payroll) {
      return res.status(404).json({
        success: false,

        message:
          "Payroll record not found",
      });
    }

    if (
      payroll.paymentStatus ===
      "Paid"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Payroll is already marked as paid",
      });
    }

    payroll.paymentStatus =
      "Paid";

    payroll.paidDate =
      new Date();

    await payroll.save();

    const populatedPayroll =
      await Payroll.findById(
        payroll._id
      ).populate(
        "employee",
        EMPLOYEE_POPULATE_FIELDS
      );

    return res.status(200).json({
      success: true,

      message:
        "Payroll marked as paid",

      data:
        populatedPayroll,
    });
  } catch (error) {
    console.error(
      "Mark payroll paid error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to update payroll payment status",

      error:
        error.message,
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  generatePayroll,
  generateAllPayrolls,
  recalculatePayroll,
  getPayrolls,
  getPayrollById,
  markPayrollPaid,
};