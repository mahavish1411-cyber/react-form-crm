const mongoose = require("mongoose");

// ==========================================
// BREAK SCHEMA
// ==========================================

const breakSchema = new mongoose.Schema(
  {
    start: {
      type: Date,
      required: true,
    },

    end: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

// ==========================================
// ATTENDANCE SCHEMA
// ==========================================

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    checkIn: {
      type: Date,
      default: null,
    },

    breaks: {
      type: [breakSchema],
      default: [],
    },

    checkOut: {
      type: Date,
      default: null,
    },

    // ======================================
    // ATTENDANCE CALCULATIONS
    // ======================================

    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    earlyCheckoutMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    workingMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ======================================
    // CURRENT STATUS
    // ======================================

    status: {
      type: String,

      enum: [
        "Not Checked In",
        "Present",
        "Late",
        "On Break",
        "Checked Out",
      ],

      default: "Not Checked In",
    },

    // ======================================
    // FINAL DAILY STATUS
    // ======================================

    finalStatus: {
      type: String,

      enum: [
  "Present",
  "Late",
  "Half Day",
  "Absent",
  "Checked Out",
],

      default: "Present",
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// PREVENT DUPLICATE DAILY ATTENDANCE
// ==========================================

attendanceSchema.index(
  {
    employee: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model(
  "Attendance",
  attendanceSchema
);