const express = require("express");

const {
  checkIn,
  startBreak,
  endBreak,
  checkOut,
  getDailyAttendance,
  getMonthlyAttendance,
} = require("../controllers/attendanceController");

const router = express.Router();

// ==========================================
// MONTHLY ATTENDANCE
// ==========================================

router.get("/monthly", getMonthlyAttendance);

// ==========================================
// DAILY ATTENDANCE
// ==========================================

router.get("/", getDailyAttendance);

// ==========================================
// CHECK IN
// ==========================================

router.post("/check-in", checkIn);

// ==========================================
// START BREAK
// ==========================================

router.put("/start-break", startBreak);

// ==========================================
// END BREAK
// ==========================================

router.put("/end-break", endBreak);

// ==========================================
// CHECK OUT
// ==========================================

router.put("/check-out", checkOut);

module.exports = router;