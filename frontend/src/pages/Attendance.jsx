import { useEffect, useRef, useState } from "react";
import axios, { API_BASE_URL } from "../api/client";


function Attendance() {
  // ==========================================
  // TODAY DATE
  // ==========================================

  const getTodayDate = () => {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const today = getTodayDate();

  // ==========================================
  // STATE
  // ==========================================

  const [selectedDate, setSelectedDate] =
    useState(today);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  // ==========================================
  // MONTHLY STATE
  // ==========================================

  const [selectedMonth, setSelectedMonth] =
    useState(
      today.slice(0, 7)
    );

  // IMPORTANT:
  // Use the backend monthly count directly.
  const [
    monthlyCount,
    setMonthlyCount,
  ] = useState(0);

  const [
    monthlySummary,
    setMonthlySummary,
  ] = useState({
    presentDays: 0,
    lateDays: 0,
    halfDays: 0,
    totalWorkingMinutes: 0,
    totalBreakMinutes: 0,
  });

  const [
    monthlyLoading,
    setMonthlyLoading,
  ] = useState(false);

  const [
    monthlyError,
    setMonthlyError,
  ] = useState("");

  // ==========================================
  // DAILY STATE
  // ==========================================

  const [
    employees,
    setEmployees,
  ] = useState([]);

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    dailyError,
    setDailyError,
  ] = useState("");

  const [
    actionLoading,
    setActionLoading,
  ] = useState(null);

  const [
    currentTime,
    setCurrentTime,
  ] = useState(
    Date.now()
  );

  // ==========================================
  // PAGINATION
  // ==========================================

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const recordsPerPage = 10;

  // ==========================================
  // TOAST
  // ==========================================

  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
  });

  const toastTimerRef =
    useRef(null);

  const showToast = (
    type,
    message
  ) => {
    if (
      toastTimerRef.current
    ) {
      clearTimeout(
        toastTimerRef.current
      );
    }

    setToast({
      show: true,
      type,
      message,
    });

    toastTimerRef.current =
      setTimeout(() => {
        setToast({
          show: false,
          type: "",
          message: "",
        });
      }, 3000);
  };

  const closeToast = () => {
    if (
      toastTimerRef.current
    ) {
      clearTimeout(
        toastTimerRef.current
      );
    }

    setToast({
      show: false,
      type: "",
      message: "",
    });
  };

  // ==========================================
  // GET ALL EMPLOYEES
  // ==========================================

  const fetchEmployees =
    async () => {
      try {
        const response =
          await axios.get(
            `${API_BASE_URL}/employees`
          );

        setEmployees(
          response.data.data ||
            []
        );
      } catch (error) {
        console.error(
          "Employee fetch error:",
          error
        );

        setEmployees([]);
      }
    };

  // ==========================================
  // GET DAILY ATTENDANCE
  // ==========================================

  const fetchAttendance =
    async (
      date = selectedDate
    ) => {
      try {
        setDailyError("");

        const response =
          await axios.get(
            `${API_BASE_URL}/attendance?date=${date}`
          );

        setAttendanceRecords(
          response.data.data ||
            []
        );
      } catch (error) {
        console.error(
          "Attendance fetch error:",
          error
        );

        setAttendanceRecords(
          []
        );

        setDailyError(
          error.code ===
            "ERR_NETWORK"
            ? "Cannot connect to backend. Make sure the server is running on port 5000."
            : error.response
                ?.data
                ?.message ||
                "Unable to load daily attendance."
        );
      }
    };

  // ==========================================
  // GET MONTHLY ATTENDANCE
  // ==========================================

  const fetchMonthlyAttendance =
    async (
      month =
        selectedMonth
    ) => {
      try {
        setMonthlyLoading(
          true
        );

        setMonthlyError("");

        const response =
          await axios.get(
            `${API_BASE_URL}/attendance/monthly?month=${month}`
          );

        // IMPORTANT FIX:
        // Store API count directly.
        setMonthlyCount(
          response.data.count ||
            0
        );

        setMonthlySummary(
          response.data
            .summary || {
            presentDays: 0,
            lateDays: 0,
            halfDays: 0,
            totalWorkingMinutes: 0,
            totalBreakMinutes: 0,
          }
        );
      } catch (error) {
        console.error(
          "Monthly attendance fetch error:",
          error
        );

        setMonthlyCount(
          0
        );

        setMonthlyError(
          error.code ===
            "ERR_NETWORK"
            ? "Cannot connect to backend. Start the backend server and try again."
            : error.response
                ?.data
                ?.message ||
                "Unable to load monthly attendance."
        );

        setMonthlySummary({
          presentDays: 0,
          lateDays: 0,
          halfDays: 0,
          totalWorkingMinutes: 0,
          totalBreakMinutes: 0,
        });
      } finally {
        setMonthlyLoading(
          false
        );
      }
    };

  // ==========================================
  // RETRY DATA
  // ==========================================

  const retryAttendanceData =
    async () => {
      try {
        setLoading(true);

        await Promise.all([
          fetchEmployees(),

          fetchAttendance(
            selectedDate
          ),

          fetchMonthlyAttendance(
            selectedMonth
          ),
        ]);
      } finally {
        setLoading(false);
      }
    };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  const loadAttendancePage =
    async () => {
      try {
        setLoading(true);

        await Promise.all([
          fetchEmployees(),

          fetchAttendance(
            selectedDate
          ),
        ]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadAttendancePage();
  }, []);

  // ==========================================
  // MONTH CHANGE
  // ==========================================

  useEffect(() => {
    fetchMonthlyAttendance(
      selectedMonth
    );
  }, [selectedMonth]);

  // ==========================================
  // LIVE TIMER
  // ==========================================

  useEffect(() => {
    const timer =
      setInterval(() => {
        setCurrentTime(
          Date.now()
        );
      }, 60000);

    return () =>
      clearInterval(
        timer
      );
  }, []);

  // ==========================================
  // CLEANUP TOAST
  // ==========================================

  useEffect(() => {
    return () => {
      if (
        toastTimerRef.current
      ) {
        clearTimeout(
          toastTimerRef.current
        );
      }
    };
  }, []);

  // ==========================================
  // RESET PAGINATION
  // ==========================================

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    selectedDate,
  ]);

  // ==========================================
  // DATE CHANGE
  // ==========================================

  const handleDateChange =
    async (e) => {
      const date =
        e.target.value;

      setSelectedDate(
        date
      );

      try {
        setLoading(true);

        await fetchAttendance(
          date
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================
  // FORMAT TIME
  // ==========================================

  const formatTime = (
    dateValue
  ) => {
    if (!dateValue) {
      return "--";
    }

    return new Date(
      dateValue
    ).toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  };

  // ==========================================
  // FORMAT DURATION
  // ==========================================

  const formatDuration = (
    milliseconds
  ) => {
    if (
      !milliseconds ||
      milliseconds <= 0
    ) {
      return "--";
    }

    const totalMinutes =
      Math.floor(
        milliseconds /
          60000
      );

    const hours =
      Math.floor(
        totalMinutes / 60
      );

    const minutes =
      totalMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
  };

  // ==========================================
  // FORMAT MINUTES TO HOURS
  // ==========================================

  const formatMinutesToHours =
    (minutes) => {
      if (
        !minutes ||
        minutes <= 0
      ) {
        return "0h 0m";
      }

      const hours =
        Math.floor(
          minutes / 60
        );

      const mins =
        minutes % 60;

      return `${hours}h ${mins}m`;
    };

  // ==========================================
  // BREAK HELPERS
  // ==========================================

  const getActiveBreak = (
    breaks = []
  ) => {
    return (
      breaks.find(
        (breakItem) =>
          !breakItem.end
      ) || null
    );
  };

  const getLastBreak = (
    breaks = []
  ) => {
    if (!breaks.length) {
      return null;
    }

    return breaks[
      breaks.length - 1
    ];
  };

  // ==========================================
  // TOTAL BREAK + LIVE WORKING HOURS
  // ==========================================

  const calculateAttendanceTime =
    (employee) => {
      if (
        !employee.checkIn
      ) {
        return {
          totalBreakDuration:
            "--",

          workingHours:
            "--",
        };
      }

      const checkInTime =
        new Date(
          employee.checkIn
        ).getTime();

      const endTime =
        employee.checkOut
          ? new Date(
              employee.checkOut
            ).getTime()
          : currentTime;

      const totalDuration =
        endTime -
        checkInTime;

      let totalBreakMilliseconds =
        0;

      employee.breaks.forEach(
        (breakItem) => {
          if (
            !breakItem.start
          ) {
            return;
          }

          const breakStartTime =
            new Date(
              breakItem.start
            ).getTime();

          let breakEndTime =
            breakStartTime;

          if (
            breakItem.end
          ) {
            breakEndTime =
              new Date(
                breakItem.end
              ).getTime();
          } else if (
            employee.status ===
            "On Break"
          ) {
            breakEndTime =
              currentTime;
          }

          const breakDuration =
            breakEndTime -
            breakStartTime;

          if (
            breakDuration >
            0
          ) {
            totalBreakMilliseconds +=
              breakDuration;
          }
        }
      );

      const actualWorkingTime =
        Math.max(
          totalDuration -
            totalBreakMilliseconds,
          0
        );

      return {
        totalBreakDuration:
          totalBreakMilliseconds >
          0
            ? formatDuration(
                totalBreakMilliseconds
              )
            : "--",

        workingHours:
          actualWorkingTime >
          0
            ? formatDuration(
                actualWorkingTime
              )
            : "--",
      };
    };

  // ==========================================
  // MERGE EMPLOYEE + DAILY ATTENDANCE
  // ==========================================

  const attendanceData =
    employees.map(
      (employee) => {
        const attendance =
          attendanceRecords.find(
            (record) =>
              record.employee
                ?._id ===
                employee._id ||
              record.employee ===
                employee._id
          );

        return {
          _id:
            employee._id,

          name:
            employee.name,

          employeeId:
            employee.employeeId,

          email:
            employee.email,

          department:
            employee.department,

          designation:
            employee.designation,

          attendanceId:
            attendance?._id ||
            null,

          checkIn:
            attendance?.checkIn ||
            null,

          breaks:
            Array.isArray(
              attendance?.breaks
            )
              ? attendance.breaks
              : [],

          checkOut:
            attendance?.checkOut ||
            null,

          lateMinutes:
            attendance
              ?.lateMinutes ||
            0,

          earlyCheckoutMinutes:
            attendance
              ?.earlyCheckoutMinutes ||
            0,

          workingMinutes:
            attendance
              ?.workingMinutes ||
            0,

          finalStatus:
            attendance
              ?.finalStatus ||
            null,

          status:
            attendance?.status
              ? attendance.status
              : selectedDate <
                today
              ? "Absent"
              : "Not Checked In",
        };
      }
    );

  // ==========================================
  // SEARCH + STATUS FILTER
  // ==========================================

  const filteredAttendance =
    attendanceData.filter(
      (employee) => {
        const searchValue =
          search
            .toLowerCase()
            .trim();

        const matchesSearch =
          employee.name
            ?.toLowerCase()
            .includes(
              searchValue
            ) ||
          employee.employeeId
            ?.toLowerCase()
            .includes(
              searchValue
            );

        let matchesStatus =
          true;

        if (
          statusFilter ===
          "Present"
        ) {
          matchesStatus =
            employee.status ===
            "Present";
        } else if (
          statusFilter ===
          "Late"
        ) {
          matchesStatus =
            employee.status ===
              "Late" ||
            employee.finalStatus ===
              "Late";
        } else if (
          statusFilter ===
          "On Break"
        ) {
          matchesStatus =
            employee.status ===
            "On Break";
        } else if (
          statusFilter ===
          "Checked Out"
        ) {
          matchesStatus =
            employee.status ===
            "Checked Out";
        } else if (
          statusFilter ===
          "Not Checked In"
        ) {
          matchesStatus =
            employee.status ===
            "Not Checked In";
        } else if (
          statusFilter ===
          "Absent"
        ) {
          matchesStatus =
            employee.status ===
            "Absent";
        } else if (
          statusFilter ===
          "Half Day"
        ) {
          matchesStatus =
            employee.finalStatus ===
            "Half Day";
        }

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  // ==========================================
  // PAGINATION
  // ==========================================

  const totalPages =
    Math.ceil(
      filteredAttendance.length /
        recordsPerPage
    );

  const startIndex =
    (currentPage - 1) *
    recordsPerPage;

  const endIndex =
    startIndex +
    recordsPerPage;

  const paginatedAttendance =
    filteredAttendance.slice(
      startIndex,
      endIndex
    );

  // ==========================================
  // REFRESH DAILY + MONTHLY
  // ==========================================

  const refreshAttendance =
    async () => {
      await Promise.all([
        fetchAttendance(
          selectedDate
        ),

        fetchMonthlyAttendance(
          selectedMonth
        ),
      ]);
    };

  // ==========================================
  // CHECK IN
  // ==========================================

  const handleCheckIn =
    async (
      employeeId
    ) => {
      try {
        setActionLoading(
          `checkin-${employeeId}`
        );

        const response =
          await axios.post(
            `${API_BASE_URL}/attendance/check-in`,
            {
              employeeId,
            }
          );

        showToast(
          "success",

          response.data
            .message ||
            "Employee checked in successfully"
        );

        await refreshAttendance();
      } catch (error) {
        console.error(
          "Check In error:",
          error
        );

        showToast(
          "error",

          error.response
            ?.data
            ?.message ||
            "Unable to check in"
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  // ==========================================
  // START BREAK
  // ==========================================

  const handleStartBreak =
    async (
      employeeId
    ) => {
      try {
        setActionLoading(
          `startbreak-${employeeId}`
        );

        const response =
          await axios.put(
            `${API_BASE_URL}/attendance/start-break`,
            {
              employeeId,
            }
          );

        showToast(
          "success",

          response.data
            .message ||
            "Break started successfully"
        );

        await refreshAttendance();
      } catch (error) {
        console.error(
          "Start Break error:",
          error
        );

        showToast(
          "error",

          error.response
            ?.data
            ?.message ||
            "Unable to start break"
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  // ==========================================
  // END BREAK
  // ==========================================

  const handleEndBreak =
    async (
      employeeId
    ) => {
      try {
        setActionLoading(
          `endbreak-${employeeId}`
        );

        const response =
          await axios.put(
            `${API_BASE_URL}/attendance/end-break`,
            {
              employeeId,
            }
          );

        showToast(
          "success",

          response.data
            .message ||
            "Break ended successfully"
        );

        await refreshAttendance();
      } catch (error) {
        console.error(
          "End Break error:",
          error
        );

        showToast(
          "error",

          error.response
            ?.data
            ?.message ||
            "Unable to end break"
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  // ==========================================
  // CHECK OUT
  // ==========================================

  const handleCheckOut =
    async (
      employeeId
    ) => {
      try {
        setActionLoading(
          `checkout-${employeeId}`
        );

        const response =
          await axios.put(
            `${API_BASE_URL}/attendance/check-out`,
            {
              employeeId,
            }
          );

        showToast(
          "success",

          response.data
            .message ||
            "Employee checked out successfully"
        );

        await refreshAttendance();
      } catch (error) {
        console.error(
          "Check Out error:",
          error
        );

        showToast(
          "error",

          error.response
            ?.data
            ?.message ||
            "Unable to check out"
        );
      } finally {
        setActionLoading(
          null
        );
      }
    };

  // ==========================================
  // DAILY COUNTS
  // ==========================================

  const presentCount =
    attendanceData.filter(
      (employee) =>
        employee.status ===
        "Present"
    ).length;

  const lateCount =
    attendanceData.filter(
      (employee) =>
        employee.status ===
          "Late" ||
        employee.finalStatus ===
          "Late"
    ).length;

  const breakCount =
    attendanceData.filter(
      (employee) =>
        employee.status ===
        "On Break"
    ).length;

  const checkedOutCount =
    attendanceData.filter(
      (employee) =>
        employee.status ===
        "Checked Out"
    ).length;

  const notCheckedInCount =
    attendanceData.filter(
      (employee) =>
        employee.status ===
        "Not Checked In"
    ).length;

  const absentCount =
    attendanceData.filter(
      (employee) =>
        employee.status ===
        "Absent"
    ).length;

  const isToday =
    selectedDate ===
    today;

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="crm-page attendance-page">

      {/* TOAST */}

      {toast.show && (
        <div
          className={`crm-toast ${
            toast.type ===
            "success"
              ? "crm-toast-success"
              : "crm-toast-error"
          }`}
        >
          <div className="crm-toast-icon">

            {toast.type ===
            "success"
              ? "✓"
              : "!"}

          </div>

          <div className="crm-toast-content">

            <strong>

              {toast.type ===
              "success"
                ? "Success"
                : "Error"}

            </strong>

            <span>
              {toast.message}
            </span>

          </div>

          <button
            type="button"
            className="crm-toast-close"
            onClick={
              closeToast
            }
          >
            ×
          </button>
        </div>
      )}

      {/* BACKGROUND */}

      <div className="crm-glow crm-glow-one"></div>

      <div className="crm-glow crm-glow-two"></div>

      <div className="crm-container">

        {/* ======================================
            HEADER
        ====================================== */}

        <header className="crm-header">

          <div>

            <span className="crm-kicker">
              Attendance Management
            </span>

            <h1>
              Attendance
            </h1>

            <p>
              Track employee check-in,
              multiple breaks,
              check-out and daily
              attendance.
            </p>

          </div>

        </header>

        {/* ======================================
            DAILY SUMMARY
        ====================================== */}

        <section className="attendance-stats">

          <div className="attendance-stat-card">

            <div className="attendance-stat-icon attendance-present">
              ✓
            </div>

            <div>

              <span>
                Present
              </span>

              <strong>
                {presentCount}
              </strong>

            </div>

          </div>

          <div className="attendance-stat-card">

            <div className="attendance-stat-icon attendance-late">
              !
            </div>

            <div>

              <span>
                Late
              </span>

              <strong>
                {lateCount}
              </strong>

            </div>

          </div>

          <div className="attendance-stat-card">

            <div className="attendance-stat-icon attendance-break">
              ☕
            </div>

            <div>

              <span>
                On Break
              </span>

              <strong>
                {breakCount}
              </strong>

            </div>

          </div>

          <div className="attendance-stat-card">

            <div className="attendance-stat-icon attendance-leave">
              ✓
            </div>

            <div>

              <span>
                Checked Out
              </span>

              <strong>
                {checkedOutCount}
              </strong>

            </div>

          </div>

          <div className="attendance-stat-card">

            <div className="attendance-stat-icon attendance-absent">
              ×
            </div>

            <div>

              <span>

                {selectedDate <
                today
                  ? "Absent"
                  : "Not Checked In"}

              </span>

              <strong>

                {selectedDate <
                today
                  ? absentCount
                  : notCheckedInCount}

              </strong>

            </div>

          </div>

        </section>

        {/* ======================================
            FILTERS
        ====================================== */}

        <section className="attendance-toolbar">

          <div className="attendance-toolbar-left">

            <div className="attendance-filter-group">

              <label>
                Date
              </label>

              <input
                type="date"
                value={
                  selectedDate
                }
                onChange={
                  handleDateChange
                }
              />

            </div>

            <div className="attendance-filter-group">

              <label>
                Search Employee
              </label>

              <input
                type="text"
                placeholder="Search by name or ID"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>

            <div className="attendance-filter-group">

              <label>
                Status
              </label>

              <select
                value={
                  statusFilter
                }
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
              >

                <option value="All">
                  All
                </option>

                <option value="Present">
                  Present
                </option>

                <option value="Late">
                  Late
                </option>

                <option value="On Break">
                  On Break
                </option>

                <option value="Checked Out">
                  Checked Out
                </option>

                <option value="Not Checked In">
                  Not Checked In
                </option>

                <option value="Absent">
                  Absent
                </option>

                <option value="Half Day">
                  Half Day
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* ======================================
            DAILY TABLE
        ====================================== */}

        <section className="attendance-table-card">

          <div className="section-heading">

            <div>

              <span className="section-label">
                Daily Records
              </span>

              <h2>
                Attendance List
              </h2>

            </div>

            <span className="employee-count">

              {
                filteredAttendance.length
              }{" "}

              {filteredAttendance.length ===
              1
                ? "record"
                : "records"}

            </span>

          </div>

          {loading ? (

            <div className="empty-state">

              <h3>
                Loading attendance...
              </h3>

            </div>

          ) : dailyError ? (

            <div className="empty-state">

              <div className="empty-icon">
                !
              </div>

              <h3>
                Backend connection failed
              </h3>

              <p>
                {dailyError}
              </p>

              <button
                type="button"
                className="attendance-retry-btn"
                onClick={
                  retryAttendanceData
                }
              >
                Retry
              </button>

            </div>

          ) : filteredAttendance.length ===
            0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                👥
              </div>

              <h3>
                No attendance records found
              </h3>

              <p>
                No employees match the selected filters.
              </p>

            </div>

          ) : (

            <>

              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>

                      <th>
                        Employee
                      </th>

                      <th>
                        Employee ID
                      </th>

                      <th>
                        Check In
                      </th>

                      <th>
                        Last Break Start
                      </th>

                      <th>
                        Last Break End
                      </th>

                      <th>
                        Total Break
                      </th>

                      <th>
                        Check Out
                      </th>

                      <th>
                        Working Hours
                      </th>

                      <th>
                        Late By
                      </th>

                      <th>
                        Early Out
                      </th>

                      <th>
                        Current Status
                      </th>

                      <th>
                        Final Status
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {paginatedAttendance.map(
                      (
                        employee,
                        index
                      ) => {

                        const lastBreak =
                          getLastBreak(
                            employee.breaks
                          );

                        const activeBreak =
                          getActiveBreak(
                            employee.breaks
                          );

                        const {
                          totalBreakDuration,
                          workingHours,
                        } =
                          calculateAttendanceTime(
                            employee
                          );

                        return (

                          <tr
                            key={
                              employee._id
                            }
                            style={{
                              animationDelay: `${
                                index *
                                0.08
                              }s`,
                            }}
                          >

                            {/* EMPLOYEE */}

                            <td>

                              <div className="employee-name">

                                <div className="avatar">

                                  {employee.name
                                    ?.charAt(
                                      0
                                    )
                                    .toUpperCase()}

                                </div>

                                <span>
                                  {
                                    employee.name
                                  }
                                </span>

                              </div>

                            </td>

                            {/* EMPLOYEE ID */}

                            <td>

                              <span className="employee-id">

                                {
                                  employee.employeeId
                                }

                              </span>

                            </td>

                            {/* CHECK IN */}

                            <td>

                              {formatTime(
                                employee.checkIn
                              )}

                            </td>

                            {/* LAST BREAK START */}

                            <td>

                              {formatTime(
                                lastBreak?.start
                              )}

                            </td>

                            {/* LAST BREAK END */}

                            <td>

                              {formatTime(
                                lastBreak?.end
                              )}

                            </td>

                            {/* TOTAL BREAK */}

                            <td>

                              <span className="attendance-duration">

                                {
                                  totalBreakDuration
                                }

                              </span>

                            </td>

                            {/* CHECK OUT */}

                            <td>

                              {formatTime(
                                employee.checkOut
                              )}

                            </td>

                            {/* WORKING HOURS */}

                            <td>

                              <span className="attendance-working-hours">

                                {
                                  workingHours
                                }

                              </span>

                            </td>

                            {/* LATE */}

                            <td>

                              <span className="attendance-late-minutes">

                                {employee.lateMinutes >
                                0
                                  ? `${employee.lateMinutes}m`
                                  : "--"}

                              </span>

                            </td>

                            {/* EARLY OUT */}

                            <td>

                              <span className="attendance-early-minutes">

                                {employee.earlyCheckoutMinutes >
                                0
                                  ? `${employee.earlyCheckoutMinutes}m`
                                  : "--"}

                              </span>

                            </td>

                            {/* CURRENT STATUS */}

                            <td>

                              <span
                                className={`attendance-status ${
                                  employee.status ===
                                  "Present"
                                    ? "attendance-status-present"
                                    : employee.status ===
                                      "Late"
                                    ? "attendance-status-late"
                                    : employee.status ===
                                      "On Break"
                                    ? "attendance-status-break"
                                    : employee.status ===
                                      "Checked Out"
                                    ? "attendance-status-leave"
                                    : "attendance-status-absent"
                                }`}
                              >

                                {
                                  employee.status
                                }

                              </span>

                            </td>

                            {/* FINAL STATUS */}

                            <td>

                              {employee.checkOut ? (

                                <span
                                  className={`attendance-final-status ${
                                    employee.finalStatus ===
                                    "Present"
                                      ? "final-present"
                                      : employee.finalStatus ===
                                        "Late"
                                      ? "final-late"
                                      : employee.finalStatus ===
                                        "Half Day"
                                      ? "final-halfday"
                                      : employee.finalStatus ===
                                        "Absent"
                                      ? "final-absent"
                                      : "final-default"
                                  }`}
                                >

                                  {employee.finalStatus ||
                                    "--"}

                                </span>

                              ) : selectedDate <
                                  today &&
                                employee.status ===
                                  "Absent" ? (

                                <span className="attendance-final-status final-absent">

                                  Absent

                                </span>

                              ) : (

                                <span className="attendance-final-pending">

                                  Pending

                                </span>

                              )}

                            </td>

                            {/* ACTION */}

                            <td>

                              <div className="attendance-actions">

                                <button
                                  type="button"
                                  className="attendance-btn checkin-btn"
                                  onClick={() =>
                                    handleCheckIn(
                                      employee._id
                                    )
                                  }
                                  disabled={
                                    !isToday ||
                                    employee.checkIn ||
                                    actionLoading !==
                                      null
                                  }
                                >

                                  {actionLoading ===
                                  `checkin-${employee._id}`
                                    ? "..."
                                    : "Check In"}

                                </button>

                                <button
                                  type="button"
                                  className="attendance-btn checkout-btn"
                                  onClick={() =>
                                    handleCheckOut(
                                      employee._id
                                    )
                                  }
                                  disabled={
                                    !isToday ||
                                    !employee.checkIn ||
                                    employee.checkOut ||
                                    activeBreak ||
                                    actionLoading !==
                                      null
                                  }
                                >

                                  {actionLoading ===
                                  `checkout-${employee._id}`
                                    ? "..."
                                    : "Check Out"}

                                </button>

                                <button
                                  type="button"
                                  className="attendance-btn break-btn"
                                  onClick={() =>
                                    handleStartBreak(
                                      employee._id
                                    )
                                  }
                                  disabled={
                                    !isToday ||
                                    !employee.checkIn ||
                                    employee.checkOut ||
                                    activeBreak ||
                                    actionLoading !==
                                      null
                                  }
                                >

                                  {actionLoading ===
                                  `startbreak-${employee._id}`
                                    ? "..."
                                    : "Start Break"}

                                </button>

                                <button
                                  type="button"
                                  className="attendance-btn endbreak-btn"
                                  onClick={() =>
                                    handleEndBreak(
                                      employee._id
                                    )
                                  }
                                  disabled={
                                    !isToday ||
                                    !activeBreak ||
                                    employee.checkOut ||
                                    actionLoading !==
                                      null
                                  }
                                >

                                  {actionLoading ===
                                  `endbreak-${employee._id}`
                                    ? "..."
                                    : "End Break"}

                                </button>

                              </div>

                            </td>

                          </tr>

                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

              {/* ==================================
                  PAGINATION
              ================================== */}

              <div className="attendance-pagination">

                <div className="pagination-info">

                  Showing{" "}

                  <strong>

                    {filteredAttendance.length >
                    0
                      ? startIndex +
                        1
                      : 0}

                  </strong>

                  {" "}to{" "}

                  <strong>

                    {Math.min(
                      endIndex,
                      filteredAttendance.length
                    )}

                  </strong>

                  {" "}of{" "}

                  <strong>

                    {
                      filteredAttendance.length
                    }

                  </strong>

                  {" "}records

                </div>

                <div className="pagination-controls">

                  <button
                    type="button"
                    disabled={
                      currentPage ===
                      1
                    }
                    onClick={() =>
                      setCurrentPage(
                        (prev) =>
                          Math.max(
                            prev -
                              1,
                            1
                          )
                      )
                    }
                  >
                    Previous
                  </button>

                  {Array.from(
                    {
                      length:
                        totalPages,
                    },

                    (_, index) =>
                      index + 1
                  ).map(
                    (page) => (

                      <button
                        type="button"
                        key={page}
                        className={
                          currentPage ===
                          page
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setCurrentPage(
                            page
                          )
                        }
                      >
                        {page}
                      </button>

                    )
                  )}

                  <button
                    type="button"
                    disabled={
                      currentPage ===
                        totalPages ||
                      totalPages ===
                        0
                    }
                    onClick={() =>
                      setCurrentPage(
                        (prev) =>
                          Math.min(
                            prev +
                              1,
                            totalPages
                          )
                      )
                    }
                  >
                    Next
                  </button>

                </div>

              </div>

            </>

          )}

        </section>

        {/* ======================================
            MONTHLY ATTENDANCE SUMMARY
        ====================================== */}

        <section className="monthly-attendance-card">

          <div className="monthly-attendance-header">

            <div>

              <span className="section-label">
                Monthly Overview
              </span>

              <h2>
                Attendance Summary
              </h2>

              <p>
                Monthly attendance performance,
                working hours and break overview.
              </p>

            </div>

            <div className="monthly-filter-group">

              <label>
                Month
              </label>

              <input
                type="month"
                value={
                  selectedMonth
                }
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {monthlyLoading ? (

            <div className="monthly-summary-loading">

              Loading monthly attendance...

            </div>

          ) : monthlyError ? (

            <div className="monthly-summary-loading">

              <strong>
                Monthly data unavailable
              </strong>

              <p>
                {monthlyError}
              </p>

              <button
                type="button"
                className="attendance-retry-btn"
                onClick={() =>
                  fetchMonthlyAttendance(
                    selectedMonth
                  )
                }
              >
                Retry Monthly Data
              </button>

            </div>

          ) : (

            <div className="monthly-summary-grid">

              {/* PRESENT DAYS */}

              <div className="monthly-summary-card">

                <span>
                  Present Days
                </span>

                <strong>
                  {
                    monthlySummary.presentDays
                  }
                </strong>

                <small>
                  Completed attendance
                </small>

              </div>

              {/* LATE DAYS */}

              <div className="monthly-summary-card">

                <span>
                  Late Days
                </span>

                <strong>
                  {
                    monthlySummary.lateDays
                  }
                </strong>

                <small>
                  Late attendance records
                </small>

              </div>

              {/* HALF DAYS */}

              <div className="monthly-summary-card">

                <span>
                  Half Days
                </span>

                <strong>
                  {
                    monthlySummary.halfDays
                  }
                </strong>

                <small>
                  Under required working hours
                </small>

              </div>

              {/* TOTAL RECORDS */}

              <div className="monthly-summary-card">

                <span>
                  Total Records
                </span>

                <strong>
                  {monthlyCount}
                </strong>

                <small>
                  Attendance entries
                </small>

              </div>

              {/* TOTAL WORKING HOURS */}

              <div className="monthly-summary-card">

                <span>
                  Total Working Hours
                </span>

                <strong>

                  {formatMinutesToHours(
                    monthlySummary.totalWorkingMinutes
                  )}

                </strong>

                <small>
                  Net working duration
                </small>

              </div>

              {/* TOTAL BREAK TIME */}

              <div className="monthly-summary-card">

                <span>
                  Total Break Time
                </span>

                <strong>

                  {formatMinutesToHours(
                    monthlySummary.totalBreakMinutes
                  )}

                </strong>

                <small>
                  Recorded break duration
                </small>

              </div>

            </div>

          )}

        </section>

      </div>

    </div>
  );
}

export default Attendance;