const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

// ==========================================
// CONFIG
// ==========================================

const OFFICE_START_HOUR = 10;
const OFFICE_START_MINUTE = 0;

const OFFICE_END_HOUR = 18;
const OFFICE_END_MINUTE = 0;

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
// HELPER - TODAY DATE
// ==========================================

const getTodayDate = () => {
  return getDateString(new Date());
};

// ==========================================
// HELPER - VALIDATE EMPLOYEE ID
// ==========================================

const validateEmployeeId = (employeeId) => {
  return mongoose.Types.ObjectId.isValid(
    employeeId
  );
};

// ==========================================
// HELPER - OFFICE START TIME
// ==========================================

const getOfficeStartTime = (
  referenceDate
) => {
  const officeStart =
    new Date(referenceDate);

  officeStart.setHours(
    OFFICE_START_HOUR,
    OFFICE_START_MINUTE,
    0,
    0
  );

  return officeStart;
};

// ==========================================
// HELPER - OFFICE END TIME
// ==========================================

const getOfficeEndTime = (
  referenceDate
) => {
  const officeEnd =
    new Date(referenceDate);

  officeEnd.setHours(
    OFFICE_END_HOUR,
    OFFICE_END_MINUTE,
    0,
    0
  );

  return officeEnd;
};

// ==========================================
// HELPER - LATE MINUTES
// ==========================================

const calculateLateMinutes = (
  checkInTime
) => {
  if (!checkInTime) {
    return 0;
  }

  const checkIn =
    new Date(checkInTime);

  const officeStart =
    getOfficeStartTime(checkIn);

  if (checkIn <= officeStart) {
    return 0;
  }

  return Math.floor(
    (
      checkIn.getTime() -
      officeStart.getTime()
    ) / 60000
  );
};

// ==========================================
// HELPER - EARLY CHECKOUT MINUTES
// ==========================================

const calculateEarlyCheckoutMinutes = (
  checkOutTime
) => {
  if (!checkOutTime) {
    return 0;
  }

  const checkOut =
    new Date(checkOutTime);

  const officeEnd =
    getOfficeEndTime(checkOut);

  if (checkOut >= officeEnd) {
    return 0;
  }

  return Math.floor(
    (
      officeEnd.getTime() -
      checkOut.getTime()
    ) / 60000
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

  let totalBreakMilliseconds = 0;

  breaks.forEach((breakItem) => {
    if (
      !breakItem.start ||
      !breakItem.end
    ) {
      return;
    }

    const breakStart =
      new Date(
        breakItem.start
      ).getTime();

    const breakEnd =
      new Date(
        breakItem.end
      ).getTime();

    const breakDuration =
      breakEnd - breakStart;

    if (breakDuration > 0) {
      totalBreakMilliseconds +=
        breakDuration;
    }
  });

  return Math.floor(
    totalBreakMilliseconds /
      60000
  );
};

// ==========================================
// HELPER - WORKING MINUTES
// ==========================================

const calculateWorkingMinutes = ({
  checkIn,
  checkOut,
  breaks = [],
}) => {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const checkInTime =
    new Date(
      checkIn
    ).getTime();

  const checkOutTime =
    new Date(
      checkOut
    ).getTime();

  if (
    Number.isNaN(checkInTime) ||
    Number.isNaN(checkOutTime) ||
    checkOutTime <= checkInTime
  ) {
    return 0;
  }

  const totalMinutes =
    Math.floor(
      (
        checkOutTime -
        checkInTime
      ) / 60000
    );

  const totalBreakMinutes =
    calculateTotalBreakMinutes(
      breaks
    );

  return Math.max(
    totalMinutes -
      totalBreakMinutes,
    0
  );
};

// ==========================================
// HELPER - CHECK IN STATUS
// ==========================================

const getCheckInStatus = (
  checkInTime
) => {
  const lateMinutes =
    calculateLateMinutes(
      checkInTime
    );

  return lateMinutes > 0
    ? "Late"
    : "Present";
};

// ==========================================
// HELPER - FINAL STATUS
// ==========================================

const calculateFinalStatus = ({
  workingMinutes,
  lateMinutes,
}) => {
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
// HELPER - GET MONTH WORKING DATES
// MONDAY - FRIDAY ONLY
// ==========================================

const getWorkingDatesForMonth = (
  month
) => {
  const [
    year,
    monthNumber,
  ] = month
    .split("-")
    .map(Number);

  const today =
    getTodayDate();

  const currentMonth =
    today.slice(0, 7);

  const currentDay =
    Number(
      today.slice(8, 10)
    );

  const lastDayOfMonth =
    new Date(
      year,
      monthNumber,
      0
    ).getDate();

  let lastDateToCheck;

  // Future month
  if (month > currentMonth) {
    lastDateToCheck = 0;
  }

  // Current month
  else if (
    month === currentMonth
  ) {
    // Don't mark TODAY absent yet.
    // Only completed days.
    lastDateToCheck =
      Math.max(
        currentDay - 1,
        0
      );
  }

  // Past month
  else {
    lastDateToCheck =
      lastDayOfMonth;
  }

  const workingDates = [];

  for (
    let day = 1;
    day <= lastDateToCheck;
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

    // 0 = Sunday
    // 6 = Saturday
    if (
      dayOfWeek !== 0 &&
      dayOfWeek !== 6
    ) {
      workingDates.push(
        getDateString(date)
      );
    }
  }

  return workingDates;
};

// ==========================================
// CHECK IN
// ==========================================

const checkIn = async (
  req,
  res
) => {
  try {
    const {
      employeeId,
    } = req.body;

    if (!employeeId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Employee ID is required",
        });
    }

    if (
      !validateEmployeeId(
        employeeId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid Employee ID",
        });
    }

    const employee =
      await Employee.findById(
        employeeId
      );

    if (!employee) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Employee Not Found",
        });
    }

    const today =
      getTodayDate();

    const existingAttendance =
      await Attendance.findOne({
        employee:
          employeeId,

        date:
          today,
      });

    if (
      existingAttendance
    ) {
      if (
        existingAttendance
          .checkOut
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Employee has already completed attendance for today",
          });
      }

      return res
        .status(400)
        .json({
          success: false,
          message:
            "Employee already checked in today",
        });
    }

    const checkInTime =
      new Date();

    const lateMinutes =
      calculateLateMinutes(
        checkInTime
      );

    const attendance =
      await Attendance.create({
        employee:
          employeeId,

        date:
          today,

        checkIn:
          checkInTime,

        breaks:
          [],

        lateMinutes,

        earlyCheckoutMinutes:
          0,

        workingMinutes:
          0,

        status:
          getCheckInStatus(
            checkInTime
          ),

        finalStatus:
          null,
      });

    return res
      .status(201)
      .json({
        success: true,

        message:
          lateMinutes > 0
            ? `Employee Checked In - Late by ${lateMinutes} minute(s)`
            : "Employee Checked In Successfully",

        data:
          attendance,
      });
  } catch (error) {
    console.error(
      "Check in error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to check in employee",
      });
  }
};

// ==========================================
// START BREAK
// ==========================================

const startBreak = async (
  req,
  res
) => {
  try {
    const {
      employeeId,
    } = req.body;

    if (!employeeId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Employee ID is required",
        });
    }

    if (
      !validateEmployeeId(
        employeeId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid Employee ID",
        });
    }

    const today =
      getTodayDate();

    const attendance =
      await Attendance.findOne({
        employee:
          employeeId,

        date:
          today,
      });

    if (!attendance) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Employee has not checked in today",
        });
    }

    if (
      !attendance.checkIn
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Please check in before starting break",
        });
    }

    if (
      attendance.checkOut
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Employee has already checked out",
        });
    }

    const activeBreak =
      attendance.breaks.find(
        (breakItem) =>
          !breakItem.end
      );

    if (activeBreak) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Employee is already on break",
        });
    }

    attendance
      .breaks
      .push({
        start:
          new Date(),

        end:
          null,
      });

    attendance.status =
      "On Break";

    await attendance.save();

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Break Started Successfully",

        data:
          attendance,
      });
  } catch (error) {
    console.error(
      "Start break error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to start break",
      });
  }
};

// ==========================================
// END BREAK
// ==========================================

const endBreak = async (
  req,
  res
) => {
  try {
    const {
      employeeId,
    } = req.body;

    if (!employeeId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Employee ID is required",
        });
    }

    if (
      !validateEmployeeId(
        employeeId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Invalid Employee ID",
        });
    }

    const today =
      getTodayDate();

    const attendance =
      await Attendance.findOne({
        employee:
          employeeId,

        date:
          today,
      });

    if (!attendance) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Attendance record not found",
        });
    }

    if (
      !attendance.checkIn
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Employee has not checked in",
        });
    }

    if (
      attendance.checkOut
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Employee has already checked out",
        });
    }

    const activeBreakIndex =
      attendance.breaks
        .findIndex(
          (breakItem) =>
            !breakItem.end
        );

    if (
      activeBreakIndex ===
      -1
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Employee is not currently on break",
        });
    }

    attendance.breaks[
      activeBreakIndex
    ].end =
      new Date();

    attendance.status =
      getCheckInStatus(
        attendance.checkIn
      );

    await attendance.save();

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Break Ended Successfully",

        data:
          attendance,
      });
  } catch (error) {
    console.error(
      "End break error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to end break",
      });
  }
};

// ==========================================
// CHECK OUT
// ==========================================

const checkOut = async (
  req,
  res
) => {
  try {
    const {
      employeeId,
    } = req.body;

    if (!employeeId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Employee ID is required",
        });
    }

    if (
      !validateEmployeeId(
        employeeId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid Employee ID",
        });
    }

    const today =
      getTodayDate();

    const attendance =
      await Attendance.findOne({
        employee:
          employeeId,

        date:
          today,
      });

    if (!attendance) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Employee has not checked in today",
        });
    }

    if (
      !attendance.checkIn
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Please check in before checking out",
        });
    }

    if (
      attendance.checkOut
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Employee has already checked out",
        });
    }

    const activeBreak =
      attendance.breaks.find(
        (breakItem) =>
          !breakItem.end
      );

    if (activeBreak) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Please end the break before checking out",
        });
    }

    const checkOutTime =
      new Date();

    const lateMinutes =
      calculateLateMinutes(
        attendance.checkIn
      );

    const earlyCheckoutMinutes =
      calculateEarlyCheckoutMinutes(
        checkOutTime
      );

    const workingMinutes =
      calculateWorkingMinutes({
        checkIn:
          attendance.checkIn,

        checkOut:
          checkOutTime,

        breaks:
          attendance.breaks,
      });

    const finalStatus =
      calculateFinalStatus({
        workingMinutes,
        lateMinutes,
      });

    attendance.checkOut =
      checkOutTime;

    attendance.lateMinutes =
      lateMinutes;

    attendance.earlyCheckoutMinutes =
      earlyCheckoutMinutes;

    attendance.workingMinutes =
      workingMinutes;

    attendance.status =
      "Checked Out";

    attendance.finalStatus =
      finalStatus;

    await attendance.save();

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Employee Checked Out Successfully",

        data:
          attendance,

        summary: {
          lateMinutes,

          earlyCheckoutMinutes,

          workingMinutes,

          totalBreakMinutes:
            calculateTotalBreakMinutes(
              attendance.breaks
            ),

          finalStatus,
        },
      });
  } catch (error) {
    console.error(
      "Check out error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Unable to check out employee",
      });
  }
};

// ==========================================
// GET DAILY ATTENDANCE
// ==========================================

const getDailyAttendance =
  async (
    req,
    res
  ) => {
    try {
      const {
        date,
      } = req.query;

      const selectedDate =
        date ||
        getTodayDate();

      const attendance =
        await Attendance.find({
          date:
            selectedDate,
        })
          .populate(
            "employee",
            "employeeId name email phone department designation status"
          )
          .sort({
            createdAt:
              -1,
          });

      return res
        .status(200)
        .json({
          success: true,

          date:
            selectedDate,

          count:
            attendance.length,

          data:
            attendance,
        });
    } catch (error) {
      console.error(
        "Get attendance error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to fetch attendance records",
        });
    }
  };

// ==========================================
// GET MONTHLY ATTENDANCE
// ==========================================

const getMonthlyAttendance =
  async (
    req,
    res
  ) => {
    try {
      const {
        month,
      } = req.query;

      // ------------------------------------------
      // VALIDATE MONTH
      // ------------------------------------------

      if (!month) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Month is required. Example: 2026-08",
          });
      }

      if (
        !/^\d{4}-\d{2}$/.test(
          month
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid month format. Use YYYY-MM",
          });
      }

      const [
        year,
        monthNumber,
      ] = month
        .split("-")
        .map(Number);

      if (
        monthNumber < 1 ||
        monthNumber > 12
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid month",
          });
      }

      // ------------------------------------------
      // GET MONTH ATTENDANCE
      // ------------------------------------------

      const attendance =
        await Attendance.find({
          date: {
            $regex:
              `^${month}-`,
          },
        })
          .populate(
            "employee",
            "employeeId name email phone department designation status"
          )
          .sort({
            date:
              1,

            createdAt:
              1,
          });

      // ------------------------------------------
      // NORMALIZE RECORDS
      // ------------------------------------------

      const normalizedAttendance =
        attendance.map(
          (record) => {
            const recordObject =
              record.toObject();

            const totalBreakMinutes =
              calculateTotalBreakMinutes(
                record.breaks
              );

            // ------------------------------
            // WORKING MINUTES
            // ------------------------------

            let workingMinutes =
              record.workingMinutes ||
              0;

            if (
              record.checkIn &&
              record.checkOut &&
              workingMinutes === 0
            ) {
              workingMinutes =
                calculateWorkingMinutes({
                  checkIn:
                    record.checkIn,

                  checkOut:
                    record.checkOut,

                  breaks:
                    record.breaks,
                });
            }

            // ------------------------------
            // LATE MINUTES
            // ------------------------------

            let lateMinutes =
              record.lateMinutes ||
              0;

            if (
              record.checkIn &&
              lateMinutes === 0
            ) {
              lateMinutes =
                calculateLateMinutes(
                  record.checkIn
                );
            }

            // ------------------------------
            // EARLY CHECKOUT
            // ------------------------------

            let earlyCheckoutMinutes =
              record
                .earlyCheckoutMinutes ||
              0;

            if (
              record.checkOut &&
              earlyCheckoutMinutes ===
                0
            ) {
              earlyCheckoutMinutes =
                calculateEarlyCheckoutMinutes(
                  record.checkOut
                );
            }

            // ------------------------------
            // FINAL STATUS
            // ------------------------------

            let finalStatus =
              null;

            if (
              record.checkOut
            ) {
              finalStatus =
                calculateFinalStatus({
                  workingMinutes,

                  lateMinutes,
                });
            }

            return {
              ...recordObject,

              workingMinutes,

              totalBreakMinutes,

              lateMinutes,

              earlyCheckoutMinutes,

              finalStatus,
            };
          }
        );

      // ------------------------------------------
      // PRESENT DAYS
      // ------------------------------------------

      const presentDays =
        normalizedAttendance.filter(
          (record) =>
            record.finalStatus ===
            "Present"
        ).length;

      // ------------------------------------------
      // LATE DAYS
      // ------------------------------------------

      const lateDays =
        normalizedAttendance.filter(
          (record) =>
            record.finalStatus ===
            "Late"
        ).length;

      // ------------------------------------------
      // HALF DAYS
      // ------------------------------------------

      const halfDays =
        normalizedAttendance.filter(
          (record) =>
            record.finalStatus ===
            "Half Day"
        ).length;

      // ------------------------------------------
      // WORKING MINUTES
      // ------------------------------------------

      const totalWorkingMinutes =
        normalizedAttendance.reduce(
          (
            total,
            record
          ) =>
            total +
            (
              record.workingMinutes ||
              0
            ),
          0
        );

      // ------------------------------------------
      // BREAK MINUTES
      // ------------------------------------------

      const totalBreakMinutes =
        normalizedAttendance.reduce(
          (
            total,
            record
          ) =>
            total +
            (
              record.totalBreakMinutes ||
              0
            ),
          0
        );

      // ==========================================
      // ABSENT DAYS
      // ==========================================

      // All employees.
      // We are NOT filtering status here.
      const employees =
        await Employee.find({})
          .select(
            "_id employeeId name"
          );

      const workingDates =
        getWorkingDatesForMonth(
          month
        );

      // ------------------------------------------
      // CREATE ATTENDANCE LOOKUP
      // employeeId|date
      // ------------------------------------------

      const attendanceKeys =
        new Set();

      normalizedAttendance.forEach(
        (record) => {
          if (
            !record.employee ||
            !record.date
          ) {
            return;
          }

          let employeeMongoId =
            null;

          // Populated employee
          if (
            record.employee._id
          ) {
            employeeMongoId =
              record.employee._id
                .toString();
          }

          // Raw ObjectId
          else {
            employeeMongoId =
              record.employee
                .toString();
          }

          attendanceKeys.add(
            `${employeeMongoId}|${record.date}`
          );
        }
      );

      // ------------------------------------------
      // COUNT ABSENCE
      // ------------------------------------------

      let absentDays = 0;

      employees.forEach(
        (employee) => {
          workingDates.forEach(
            (workingDate) => {
              const key =
                `${employee._id.toString()}|${workingDate}`;

              if (
                !attendanceKeys.has(
                  key
                )
              ) {
                absentDays +=
                  1;
              }
            }
          );
        }
      );

      // ------------------------------------------
      // EXPECTED DAYS
      // ------------------------------------------

      const expectedWorkingDays =
        workingDates.length;

      const employeeCount =
        employees.length;

      const totalExpectedAttendanceDays =
        expectedWorkingDays *
        employeeCount;

      // ==========================================
      // RESPONSE
      // ==========================================

      return res
        .status(200)
        .json({
          success: true,

          month,

          count:
            normalizedAttendance.length,

          summary: {
            presentDays,

            lateDays,

            halfDays,

            absentDays,

            expectedWorkingDays,

            employeeCount,

            totalExpectedAttendanceDays,

            totalWorkingMinutes,

            totalBreakMinutes,
          },

          data:
            normalizedAttendance,
        });
    } catch (error) {
      console.error(
        "Get monthly attendance error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to fetch monthly attendance",

          error:
            error.message,
        });
    }
  };

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  checkIn,
  startBreak,
  endBreak,
  checkOut,
  getDailyAttendance,
  getMonthlyAttendance,
};