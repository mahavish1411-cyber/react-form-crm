const mongoose = require("mongoose");

const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");

// ==========================================
// CONFIG
// ==========================================

const HALF_DAY_MINUTES = 240;

// ==========================================
// HELPER - LOCAL DATE YYYY-MM-DD
// ==========================================

const getDateString = (dateValue = new Date()) => {
  const date = new Date(dateValue);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// ==========================================
// HELPER - TODAY
// ==========================================

const getTodayDate = () => {
  return getDateString(new Date());
};

// ==========================================
// HELPER - VALID MONTH
// ==========================================

const isValidMonth = (month) => {
  if (
    !month ||
    !/^\d{4}-\d{2}$/.test(month)
  ) {
    return false;
  }

  const monthNumber =
    Number(month.slice(5, 7));

  return (
    monthNumber >= 1 &&
    monthNumber <= 12
  );
};

// ==========================================
// HELPER - TOTAL BREAK MINUTES
// ==========================================

const calculateTotalBreakMinutes = (
  breaks = []
) => {
  if (!Array.isArray(breaks)) {
    return 0;
  }

  let totalMilliseconds = 0;

  breaks.forEach((breakItem) => {
    if (
      !breakItem.start ||
      !breakItem.end
    ) {
      return;
    }

    const start =
      new Date(
        breakItem.start
      ).getTime();

    const end =
      new Date(
        breakItem.end
      ).getTime();

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      end <= start
    ) {
      return;
    }

    totalMilliseconds +=
      end - start;
  });

  return Math.floor(
    totalMilliseconds / 60000
  );
};

// ==========================================
// HELPER - WORKING MINUTES
// ==========================================

const calculateWorkingMinutes = (
  record
) => {
  if (
    !record?.checkIn ||
    !record?.checkOut
  ) {
    return 0;
  }

  const checkIn =
    new Date(
      record.checkIn
    ).getTime();

  const checkOut =
    new Date(
      record.checkOut
    ).getTime();

  if (
    Number.isNaN(checkIn) ||
    Number.isNaN(checkOut) ||
    checkOut <= checkIn
  ) {
    return 0;
  }

  const totalMinutes =
    Math.floor(
      (checkOut - checkIn) /
        60000
    );

  const breakMinutes =
    calculateTotalBreakMinutes(
      record.breaks
    );

  return Math.max(
    totalMinutes - breakMinutes,
    0
  );
};

// ==========================================
// HELPER - RESOLVE FINAL STATUS
// ==========================================

const resolveFinalStatus = (
  record
) => {
  if (!record?.checkOut) {
    return null;
  }

  let workingMinutes =
    Number(
      record.workingMinutes || 0
    );

  // Support older attendance records
  if (workingMinutes === 0) {
    workingMinutes =
      calculateWorkingMinutes(
        record
      );
  }

  const lateMinutes =
    Number(
      record.lateMinutes || 0
    );

  if (
    workingMinutes <
    HALF_DAY_MINUTES
  ) {
    return "Half Day";
  }

  if (lateMinutes > 0) {
    return "Late";
  }

  return "Present";
};

// ==========================================
// HELPER - SCHEDULED WORKING DATES
// ==========================================
//
// IMPORTANT:
//
// Salary denominator always uses ALL
// Monday-Friday dates in selected month.
//
// Example:
//
// September 2026 = 22 Mon-Fri days
//
// Gross = 33000
//
// Per Day = 33000 / 22
//
// ==========================================

const getScheduledWorkingDatesForMonth = (
  month
) => {
  const [
    year,
    monthNumber,
  ] = month
    .split("-")
    .map(Number);

  const lastDayOfMonth =
    new Date(
      year,
      monthNumber,
      0
    ).getDate();

  const scheduledWorkingDates = [];

  for (
    let day = 1;
    day <= lastDayOfMonth;
    day += 1
  ) {
    const date =
      new Date(
        year,
        monthNumber - 1,
        day
      );

    const dayOfWeek =
      date.getDay();

    // Sunday = 0
    // Saturday = 6
    //
    // Monday-Friday only
    if (
      dayOfWeek !== 0 &&
      dayOfWeek !== 6
    ) {
      scheduledWorkingDates.push(
        getDateString(date)
      );
    }
  }

  return scheduledWorkingDates;
};

// ==========================================
// HELPER - ATTENDANCE EVALUATION DATES
// ==========================================
//
// Past month:
//   Check all scheduled working dates.
//
// Current month:
//   Check completed working dates.
//
//   Today is evaluated only when an
//   attendance record already exists.
//
// Future month:
//   Do not mark anyone absent.
//
// ==========================================

const getAttendanceEvaluationDates = (
  month,
  scheduledWorkingDates,
  attendanceDates = new Set()
) => {
  const today =
    getTodayDate();

  const currentMonth =
    today.slice(0, 7);

  // Past month
  if (month < currentMonth) {
    return scheduledWorkingDates;
  }

  // Future month
  if (month > currentMonth) {
    return [];
  }

  // Current month
  return scheduledWorkingDates.filter(
    (workingDate) => {
      if (workingDate < today) {
        return true;
      }

      if (
        workingDate === today &&
        attendanceDates.has(today)
      ) {
        return true;
      }

      return false;
    }
  );
};

// ==========================================
// HELPER - ATTENDANCE SUMMARY
// ==========================================

const calculateAttendanceSummary =
  async (
    employeeId,
    month
  ) => {
    const attendance =
      await Attendance.find({
        employee:
          employeeId,

        date: {
          $regex:
            `^${month}-`,
        },
      }).sort({
        date: 1,
      });

    const attendanceMap =
      new Map();

    const attendanceDates =
      new Set();

    attendance.forEach(
      (record) => {
        attendanceMap.set(
          record.date,
          record
        );

        attendanceDates.add(
          record.date
        );
      }
    );

    // ========================================
    // FULL MONTH WORKING DAYS
    // ========================================

    const scheduledWorkingDates =
      getScheduledWorkingDatesForMonth(
        month
      );

    // ========================================
    // DAYS ELIGIBLE FOR ATTENDANCE CHECK
    // ========================================

    const evaluationDates =
      getAttendanceEvaluationDates(
        month,
        scheduledWorkingDates,
        attendanceDates
      );

    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let absentDays = 0;

    evaluationDates.forEach(
      (workingDate) => {
        const record =
          attendanceMap.get(
            workingDate
          );

        // No attendance on completed
        // working day = Absent
        if (!record) {
          absentDays += 1;
          return;
        }

        const finalStatus =
          resolveFinalStatus(
            record
          );

        if (
          finalStatus ===
          "Half Day"
        ) {
          halfDays += 1;
        } else if (
          finalStatus ===
          "Late"
        ) {
          lateDays += 1;
        } else if (
          finalStatus ===
          "Present"
        ) {
          presentDays += 1;
        }
      }
    );

    return {
      // Full month's Mon-Fri count
      workingDays:
        scheduledWorkingDates.length,

      // Current elapsed/evaluated
      // working days
      elapsedWorkingDays:
        evaluationDates.length,

      presentDays,
      lateDays,
      halfDays,
      absentDays,
    };
  };

// ==========================================
// HELPER - CALCULATE PAYROLL VALUES
// ==========================================

const calculatePayrollValues =
  async ({
    employee,
    month,
    manualOtherDeduction = 0,
  }) => {
    const attendanceSummary =
      await calculateAttendanceSummary(
        employee._id,
        month
      );

    const basicSalary =
      Number(
        employee.basicSalary || 0
      );

    const allowance =
      Number(
        employee.allowance || 0
      );

    // ========================================
    // EMPLOYEE FIXED DEDUCTION
    // ========================================

    const employeeDeduction =
      Number(
        employee.deduction || 0
      );

    // ========================================
    // MANUAL OTHER DEDUCTION
    // ========================================

    const otherDeduction =
      Number(
        manualOtherDeduction || 0
      );

    // ========================================
    // GROSS SALARY
    // ========================================

    const grossSalary =
      basicSalary +
      allowance;

    // ========================================
    // FULL MONTH WORKING DAYS
    // ========================================

    const workingDays =
      attendanceSummary.workingDays;

    // ========================================
    // PER DAY SALARY
    // ========================================

    const perDaySalary =
      workingDays > 0
        ? grossSalary /
          workingDays
        : 0;

    // ========================================
    // ABSENT DEDUCTION
    // ========================================

    const absentDeduction =
      perDaySalary *
      attendanceSummary.absentDays;

    // ========================================
    // HALF DAY DEDUCTION
    // ========================================

    const halfDayDeduction =
      perDaySalary *
      0.5 *
      attendanceSummary.halfDays;

    // ========================================
    // ATTENDANCE DEDUCTION
    // ========================================

    const rawAttendanceDeduction =
      absentDeduction +
      halfDayDeduction;

    // Attendance deduction cannot
    // exceed gross salary.
    const attendanceDeduction =
      Math.min(
        rawAttendanceDeduction,
        grossSalary
      );

    // ========================================
    // TOTAL DEDUCTION
    // ========================================

    const rawTotalDeduction =
      attendanceDeduction +
      employeeDeduction +
      otherDeduction;

    // Total deduction cannot exceed
    // gross salary.
    const totalDeduction =
      Math.min(
        rawTotalDeduction,
        grossSalary
      );

    // ========================================
    // NET SALARY
    // ========================================

    const netSalary =
      Math.max(
        grossSalary -
          totalDeduction,
        0
      );

    return {
      workingDays:
        attendanceSummary.workingDays,

      presentDays:
        attendanceSummary.presentDays,

      lateDays:
        attendanceSummary.lateDays,

      halfDays:
        attendanceSummary.halfDays,

      absentDays:
        attendanceSummary.absentDays,

      basicSalary:
        Number(
          basicSalary.toFixed(2)
        ),

      allowance:
        Number(
          allowance.toFixed(2)
        ),

      grossSalary:
        Number(
          grossSalary.toFixed(2)
        ),

      attendanceDeduction:
        Number(
          attendanceDeduction.toFixed(2)
        ),

      // IMPORTANT:
      // Employee fixed deduction is now
      // returned AND stored in Payroll.
      employeeDeduction:
        Number(
          employeeDeduction.toFixed(2)
        ),

      // Manual deduction only
      otherDeduction:
        Number(
          otherDeduction.toFixed(2)
        ),

      totalDeduction:
        Number(
          totalDeduction.toFixed(2)
        ),

      netSalary:
        Number(
          netSalary.toFixed(2)
        ),

      perDaySalary:
        Number(
          perDaySalary.toFixed(2)
        ),

      elapsedWorkingDays:
        attendanceSummary.elapsedWorkingDays,
    };
  };

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
        "employeeId name email department designation basicSalary allowance deduction"
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

const generateAllPayrolls = async (
  req,
  res
) => {
  try {
    const {
      month,
      otherDeduction = 0,
      remarks = "",
    } = req.body;

    if (!month) {
      return res.status(400).json({
        success: false,
        message:
          "Month is required",
      });
    }

    if (!isValidMonth(month)) {
      return res.status(400).json({
        success: false,
        message:
          "Month must use YYYY-MM format",
      });
    }

    const employees =
      await Employee.find({
        status:
          "Active",
      });

    if (!employees.length) {
      return res.status(404).json({
        success: false,
        message:
          "No active employees found",
      });
    }

    const createdPayrolls = [];
    const skippedEmployees = [];
    const failedEmployees = [];

    for (
      const employee of employees
    ) {
      try {
        const existingPayroll =
          await Payroll.findOne({
            employee:
              employee._id,

            month,
          });

        if (existingPayroll) {
          skippedEmployees.push({
            employeeId:
              employee.employeeId,

            name:
              employee.name,

            reason:
              "Payroll already exists",
          });

          continue;
        }

        const values =
          await calculatePayrollValues({
            employee,

            month,

            manualOtherDeduction:
              Number(
                otherDeduction || 0
              ),
          });

        const payroll =
          await Payroll.create({
            employee:
              employee._id,

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

            remarks:
              remarks ||
              `${month} Payroll`,
          });

        const populatedPayroll =
          await Payroll.findById(
            payroll._id
          ).populate(
            "employee",
            "employeeId name email department designation basicSalary allowance deduction"
          );

        createdPayrolls.push(
          populatedPayroll
        );
      } catch (error) {
        failedEmployees.push({
          employeeId:
            employee.employeeId,

          name:
            employee.name,

          error:
            error.message,
        });
      }
    }

    return res.status(201).json({
      success: true,

      message:
        "Bulk payroll generation completed",

      summary: {
        totalEmployees:
          employees.length,

        created:
          createdPayrolls.length,

        skipped:
          skippedEmployees.length,

        failed:
          failedEmployees.length,
      },

      createdPayrolls,

      skippedEmployees,

      failedEmployees,
    });
  } catch (error) {
    console.error(
      "Generate all payrolls error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to generate bulk payroll",

      error:
        error.message,
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
          "employeeId name email department designation basicSalary allowance deduction"
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
          "employeeId name email department designation basicSalary allowance deduction"
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
        "employeeId name email department designation basicSalary allowance deduction"
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
        "employeeId name email department designation basicSalary allowance deduction"
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