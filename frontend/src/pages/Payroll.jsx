import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const COMPANY = {
  name: "ARTIC9",
  address: "30A, Gnanai St, Nagercoil - 629 001, Tamil Nadu",
  email: "hi@artic9.com",
  phone: "+91 95003 09310",
  logo: "/images/artic9-logo.png",
};

function Payroll() {
  // ==========================================
  // CURRENT MONTH
  // ==========================================

  const getCurrentMonth = () => {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  };

  // ==========================================
  // STATES
  // ==========================================

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const [payrolls, setPayrolls] = useState([]);

  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState(null);

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [generateMode, setGenerateMode] = useState("single");

  const [bulkResult, setBulkResult] = useState(null);

  const [selectedPayroll, setSelectedPayroll] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);

  const recordsPerPage = 5;

  const [formData, setFormData] = useState({
    employeeId: "",
    otherDeduction: 0,
    remarks: "",
  });

  // ==========================================
  // FORMAT CURRENCY
  // ==========================================

  const formatCurrency = (value) => {
    const amount = Number(value || 0);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (value) => {
    if (!value) {
      return "--";
    }

    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ==========================================
  // MONTH DISPLAY
  // ==========================================

  const formatMonth = (monthValue) => {
    if (!monthValue) {
      return "";
    }

    const [year, month] = monthValue.split("-");

    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
      "en-GB",
      {
        month: "long",
        year: "numeric",
      },
    );
  };

  // ==========================================
  // FETCH EMPLOYEES
  // ==========================================

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);

      setEmployees(response.data.data || []);
    } catch (error) {
      console.error("Employee fetch error:", error);

      setEmployees([]);
    }
  };

  // ==========================================
  // FETCH PAYROLL
  // ==========================================

  const fetchPayrolls = async (month = selectedMonth) => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/payroll?month=${month}`,
      );

      setPayrolls(response.data.data || []);
    } catch (error) {
      console.error("Payroll fetch error:", error);

      setPayrolls([]);

      setError(
        error.response?.data?.message || "Unable to load payroll records",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchPayrolls(selectedMonth);

    setSearchTerm("");
    setStatusFilter("All");
    setCurrentPage(1);
  }, [selectedMonth]);

  // ==========================================
  // SUMMARY
  // ==========================================

  const summary = useMemo(() => {
    const totalPayroll = payrolls.reduce(
      (total, item) => total + Number(item.netSalary || 0),
      0,
    );

    const totalGross = payrolls.reduce(
      (total, item) => total + Number(item.grossSalary || 0),
      0,
    );

    const totalDeduction = payrolls.reduce(
      (total, item) => total + Number(item.totalDeduction || 0),
      0,
    );

    const paidCount = payrolls.filter(
      (item) => item.paymentStatus === "Paid",
    ).length;

    const pendingCount = payrolls.filter(
      (item) => item.paymentStatus === "Pending",
    ).length;

    return {
      totalPayroll,
      totalGross,
      totalDeduction,
      paidCount,
      pendingCount,
    };
  }, [payrolls]);

  // ==========================================
  // FILTER PAYROLL
  // ==========================================

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((item) => {
      const employeeName = item.employee?.name?.toLowerCase() || "";

      const employeeId = item.employee?.employeeId?.toLowerCase() || "";

      const search = searchTerm.toLowerCase().trim();

      const matchesSearch =
        employeeName.includes(search) || employeeId.includes(search);

      const matchesStatus =
        statusFilter === "All" || item.paymentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payrolls, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.max(
    Math.ceil(filteredPayrolls.length / recordsPerPage),
    1,
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * recordsPerPage;

  const endIndex = Math.min(
    startIndex + recordsPerPage,
    filteredPayrolls.length,
  );

  const paginatedPayrolls = filteredPayrolls.slice(
    startIndex,
    endIndex,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ==========================================
  // GENERATE PAYROLL
  // ==========================================

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();

    if (
      generateMode === "single" &&
      !formData.employeeId
    ) {
      alert("Please select an employee");
      return;
    }

    try {
      setActionLoading("generate");
      setBulkResult(null);

      if (generateMode === "all") {
        const response = await axios.post(
          `${API_BASE_URL}/payroll/generate-all`,
          {
            month: selectedMonth,
            otherDeduction: Number(
              formData.otherDeduction || 0
            ),
            remarks: formData.remarks,
          }
        );

        setBulkResult(
          response.data.summary || {
            totalEmployees: 0,
            created: 0,
            skipped: 0,
            failed: 0,
          }
        );

        await fetchPayrolls(selectedMonth);
        return;
      }

      await axios.post(
        `${API_BASE_URL}/payroll/generate`,
        {
          employeeId: formData.employeeId,
          month: selectedMonth,
          otherDeduction: Number(
            formData.otherDeduction || 0
          ),
          remarks: formData.remarks,
        }
      );

      setShowGenerateModal(false);
      setGenerateMode("single");
      setBulkResult(null);

      setFormData({
        employeeId: "",
        otherDeduction: 0,
        remarks: "",
      });

      await fetchPayrolls(selectedMonth);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Unable to generate payroll"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // RECALCULATE
  // ==========================================

  const handleRecalculate = async (payrollId) => {
    try {
      setActionLoading(`recalculate-${payrollId}`);

      await axios.put(
        `${API_BASE_URL}/payroll/${payrollId}/recalculate`,
        {},
      );

      await fetchPayrolls(selectedMonth);

      if (selectedPayroll?._id === payrollId) {
        const response = await axios.get(
          `${API_BASE_URL}/payroll/${payrollId}`,
        );

        setSelectedPayroll(response.data.data);
      }
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Unable to recalculate payroll"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // MARK AS PAID
  // ==========================================

  const handleMarkPaid = async (payrollId) => {
    const confirmed = window.confirm(
      "Are you sure you want to mark this payroll as Paid?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`paid-${payrollId}`);

      await axios.put(
        `${API_BASE_URL}/payroll/${payrollId}/paid`,
        {},
      );

      await fetchPayrolls(selectedMonth);

      if (selectedPayroll?._id === payrollId) {
        const response = await axios.get(
          `${API_BASE_URL}/payroll/${payrollId}`,
        );

        setSelectedPayroll(response.data.data);
      }
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Unable to mark payroll as paid"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // OPEN PAYROLL DETAILS
  // ==========================================

  const handleViewDetails = async (payrollId) => {
    try {
      setActionLoading(`view-${payrollId}`);

      const response = await axios.get(
        `${API_BASE_URL}/payroll/${payrollId}`
      );

      setSelectedPayroll(response.data.data);
    } catch (error) {
      console.error("Payroll details error:", error);

      alert(
        error.response?.data?.message ||
          "Unable to load payroll details"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // PRINT / SAVE PROFESSIONAL PAYSLIP
  // ==========================================

  const handlePrintPayslip = () => {
    if (!selectedPayroll) return;

    const payroll = selectedPayroll;
    const employee = payroll.employee || {};

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const employeeName = escapeHtml(employee.name || "Employee");
    const rawEmployeeId = String(employee.employeeId || "EMP");
    const employeeId = escapeHtml(rawEmployeeId);
    const department = escapeHtml(employee.department || "--");
    const designation = escapeHtml(employee.designation || "--");
    const remarks = escapeHtml(payroll.remarks || "--");
    const monthCode = String(payroll.month || "").replace("-", "");
    const cleanEmployeeId =
      rawEmployeeId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "EMP";
    const payslipNumber = `PAY-${monthCode}-${cleanEmployeeId}`;
    const logoUrl = `${window.location.origin}${COMPANY.logo}`;

    const payslipWindow = window.open("", "_blank", "width=1000,height=1100");

    if (!payslipWindow) {
      alert("Please allow pop-ups to open the payslip.");
      return;
    }

    payslipWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Payslip - ${employeeName} - ${escapeHtml(formatMonth(payroll.month))}</title>
          <link rel="icon" type="image/png" href="${window.location.origin}/images/artic9-favicon.png" />
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; }
            body {
              padding: 30px;
              background: #eef1f5;
              color: #171717;
              font-family: "Segoe UI", Arial, sans-serif;
              font-variant-numeric: tabular-nums;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-actions {
              width: 794px; max-width: 100%; margin: 0 auto 16px;
              display: flex; justify-content: flex-end;
            }
            .print-btn {
              border: 0; border-radius: 8px; background: #111827; color: #fff;
              padding: 11px 18px; font-size: 13px; font-weight: 700; cursor: pointer;
            }
            .payslip {
              width: 794px; max-width: 100%; min-height: 1050px; margin: 0 auto;
              background: #fff; border: 1px solid #dedede;
              box-shadow: 0 12px 35px rgba(0,0,0,.08);
            }
            .top-accent { height: 7px; background: #2db0e6; }
            .company-header {
              display: flex; align-items: flex-start; justify-content: space-between;
              gap: 30px; padding: 30px 36px 25px; border-bottom: 1px solid #e6e6e6;
            }
            .brand-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; min-width: 0; }
            .company-logo { width: 150px; height: auto; padding: 12px; background: #202b34; border-radius: 6px; object-fit: contain; }
            .company-name { margin: 0 0 7px; font-size: 12px; font-weight: 700; letter-spacing: .12em; }
            .company-meta { margin: 3px 0; color: #666; font-size: 11px; line-height: 1.45; }
            .title-wrap { text-align: right; flex-shrink: 0; }
            .title-wrap h1 { margin: 0; color: #147aa6; font-size: 22px; letter-spacing: .04em; }
            .month { margin: 7px 0 8px; font-size: 14px; font-weight: 700; }
            .payslip-no { color: #666; font-size: 10px; letter-spacing: .04em; }
            .status-badge {
              display: inline-block; margin-top: 10px; padding: 5px 10px;
              border: 1px solid #222; border-radius: 999px; font-size: 10px;
              font-weight: 800; letter-spacing: .06em;
            }
            .section { padding: 22px 36px; border-bottom: 1px solid #e8e8e8; }
            .section-title {
              margin: 0 0 15px; color: #777; font-size: 10px; font-weight: 800;
              letter-spacing: .12em; text-transform: uppercase;
            }
            .employee-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px 32px; }
            .info-item span, .attendance-item span { display: block; margin-bottom: 5px; color: #888; font-size: 10px; }
            .info-item strong { display: block; font-size: 13px; font-weight: 700; }
            .attendance-grid {
              display: grid; grid-template-columns: repeat(5,1fr); border: 1px solid #e5e5e5;
              border-radius: 8px; overflow: hidden;
            }
            .attendance-item { padding: 14px 10px; text-align: center; border-right: 1px solid #e5e5e5; }
            .attendance-item:last-child { border-right: 0; }
            .attendance-item strong { font-size: 17px; }
            .salary-section { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #e8e8e8; }
            .salary-column { padding: 22px 36px; }
            .salary-column:first-child { border-right: 1px solid #e8e8e8; }
            .salary-title {
              margin: 0 0 15px; color: #777; font-size: 10px; font-weight: 800;
              letter-spacing: .12em; text-transform: uppercase;
            }
            .salary-row {
              min-height: 34px; display: flex; align-items: center; justify-content: space-between;
              gap: 15px; border-bottom: 1px dashed #e5e5e5; font-size: 12px;
            }
            .salary-row span:first-child { color: #555; }
            .salary-row strong { white-space: nowrap; }
            .salary-total {
              margin-top: 10px; padding-top: 10px; border-top: 1px solid #222;
              border-bottom: 0; font-size: 13px; font-weight: 800;
            }
            .net-pay {
              margin: 24px 36px; padding: 20px 24px; display: flex; align-items: center;
              justify-content: space-between; gap: 20px; border: 2px solid #1f2937;
              border-radius: 10px; background: #edf8fd; border-color: #2db0e6;
            }
            .net-pay-label {
              display: block; margin-bottom: 4px; color: #666; font-size: 10px;
              font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
            }
            .net-pay-note { color: #777; font-size: 10px; }
            .net-pay-amount { font-size: 25px; font-weight: 800; white-space: nowrap; }
            .payment-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
            .remarks-box {
              min-height: 48px; padding: 12px 14px; background: #f8f9fa;
              border: 1px solid #ececec; border-radius: 7px; font-size: 12px; line-height: 1.55;
            }
            .signature-section {
              padding: 55px 36px 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 90px;
            }
            .signature { padding-top: 9px; border-top: 1px solid #444; text-align: center; color: #555; font-size: 10px; }
            .footer { padding: 16px 36px 24px; color: #8a8a8a; font-size: 9px; text-align: center; }
            .info-item strong, .remarks-box { overflow-wrap: anywhere; }
            .salary-column { display: flex; flex-direction: column; }
            .salary-total { margin-top: auto; }
            .salary-column .salary-row:last-child { padding-top: 14px; }
            @media screen and (max-width: 700px) {
              body { padding: 12px; }
              .company-header { display: block; }
              .title-wrap { margin-top: 22px; text-align: left; }
              .employee-grid, .payment-grid { grid-template-columns: 1fr; }
              .attendance-grid { grid-template-columns: repeat(2,1fr); }
              .salary-section { display: block; }
              .salary-column:first-child { border-right: 0; border-bottom: 1px solid #e8e8e8; }
              .net-pay { align-items: flex-start; flex-direction: column; }
            }
            @media print {
              @page { size: A4 portrait; margin: 8mm; }
              html, body { width: 100%; margin: 0; padding: 0; background: #fff; }
              .print-actions { display: none; }
              .payslip { width: 100%; min-height: auto; border: 0; box-shadow: none; }
              .company-header { padding: 20px 28px; }
              .section { padding: 12px 28px; }
              .section-title, .salary-title { margin-bottom: 10px; }
              .employee-grid { gap: 10px 32px; }
              .salary-column { padding: 14px 28px; }
              .salary-row { min-height: 30px; }
              .net-pay { margin: 14px 28px; padding: 14px 20px; }
              .signature-section { padding: 36px 28px 14px; }
              .footer { padding: 10px 28px 12px; }
              .company-header, .section, .salary-section, .net-pay, .signature-section {
                break-inside: avoid; page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-actions">
            <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
          </div>

          <main class="payslip">
            <div class="top-accent"></div>

            <header class="company-header">
              <div class="brand-wrap">
                <img class="company-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(COMPANY.name)}" onerror="this.style.display='none'" />
                <div>
                  <h2 class="company-name">${escapeHtml(COMPANY.name)}</h2>
                  <p class="company-meta">${escapeHtml(COMPANY.address)}</p>
                  <p class="company-meta">${escapeHtml(COMPANY.email)} &nbsp; | &nbsp; ${escapeHtml(COMPANY.phone)}</p>
                </div>
              </div>

              <div class="title-wrap">
                <h1>SALARY PAYSLIP</h1>
                <div class="month">${escapeHtml(formatMonth(payroll.month))}</div>
                <div class="payslip-no">Payslip No: ${escapeHtml(payslipNumber)}</div>
                <span class="status-badge">${escapeHtml(payroll.paymentStatus || "Pending")}</span>
              </div>
            </header>

            <section class="section">
              <h3 class="section-title">Employee Information</h3>
              <div class="employee-grid">
                <div class="info-item"><span>Employee Name</span><strong>${employeeName}</strong></div>
                <div class="info-item"><span>Employee ID</span><strong>${employeeId}</strong></div>
                <div class="info-item"><span>Department</span><strong>${department}</strong></div>
                <div class="info-item"><span>Designation</span><strong>${designation}</strong></div>
              </div>
            </section>

            <section class="section">
              <h3 class="section-title">Attendance Summary</h3>
              <div class="attendance-grid">
                <div class="attendance-item"><span>Working Days</span><strong>${Number(payroll.workingDays || 0)}</strong></div>
                <div class="attendance-item"><span>Present</span><strong>${Number(payroll.presentDays || 0)}</strong></div>
                <div class="attendance-item"><span>Late</span><strong>${Number(payroll.lateDays || 0)}</strong></div>
                <div class="attendance-item"><span>Half Days</span><strong>${Number(payroll.halfDays || 0)}</strong></div>
                <div class="attendance-item"><span>Absent</span><strong>${Number(payroll.absentDays || 0)}</strong></div>
              </div>
            </section>

            <section class="salary-section">
              <div class="salary-column">
                <h3 class="salary-title">Earnings</h3>
                <div class="salary-row"><span>Basic Salary</span><strong>${escapeHtml(formatCurrency(payroll.basicSalary))}</strong></div>
                <div class="salary-row"><span>Allowance</span><strong>${escapeHtml(formatCurrency(payroll.allowance))}</strong></div>
                <div class="salary-row salary-total"><span>Gross Salary</span><strong>${escapeHtml(formatCurrency(payroll.grossSalary))}</strong></div>
              </div>

              <div class="salary-column">
                <h3 class="salary-title">Deductions</h3>
                <div class="salary-row"><span>Attendance Deduction</span><strong>${escapeHtml(formatCurrency(payroll.attendanceDeduction))}</strong></div>
                <div class="salary-row"><span>Employee Deduction</span><strong>${escapeHtml(formatCurrency(payroll.employeeDeduction))}</strong></div>
                <div class="salary-row"><span>Other Deduction</span><strong>${escapeHtml(formatCurrency(payroll.otherDeduction))}</strong></div>
                <div class="salary-row salary-total"><span>Total Deduction</span><strong>${escapeHtml(formatCurrency(payroll.totalDeduction))}</strong></div>
              </div>
            </section>

            <div class="net-pay">
              <div>
                <span class="net-pay-label">Net Pay</span>
                <div class="net-pay-note">Gross Salary minus Total Deductions</div>
              </div>
              <div class="net-pay-amount">${escapeHtml(formatCurrency(payroll.netSalary))}</div>
            </div>

            <section class="section">
              <h3 class="section-title">Payment Information</h3>
              <div class="payment-grid">
                <div class="info-item"><span>Payment Status</span><strong>${escapeHtml(payroll.paymentStatus || "Pending")}</strong></div>
                <div class="info-item"><span>Paid Date</span><strong>${escapeHtml(formatDate(payroll.paidDate))}</strong></div>
                <div class="info-item"><span>Payslip Number</span><strong>${escapeHtml(payslipNumber)}</strong></div>
              </div>
            </section>

            <section class="section">
              <h3 class="section-title">Remarks</h3>
              <div class="remarks-box">${remarks}</div>
            </section>

            <section class="signature-section">
              <div class="signature">Employee Signature</div>
              <div class="signature">Authorized Signatory</div>
            </section>

            <footer class="footer">This is a computer-generated payslip.</footer>
          </main>
        </body>
      </html>
    `);

    payslipWindow.document.close();
    payslipWindow.focus();
  };

  // ==========================================
  // CLOSE GENERATE MODAL
  // ==========================================

  const closeGenerateModal = () => {
    setShowGenerateModal(false);
    setGenerateMode("single");
    setBulkResult(null);

    setFormData({
      employeeId: "",
      otherDeduction: 0,
      remarks: "",
    });
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="crm-page payroll-page">
      <div className="crm-glow crm-glow-one"></div>
      <div className="crm-glow crm-glow-two"></div>

      <div className="crm-container">

        {/* HEADER */}

        <header className="crm-header">
          <div>
            <span className="crm-kicker">
              Payroll Management
            </span>

            <h1>Payroll</h1>

            <p>
              Manage monthly employee salary, attendance
              deductions and payment status.
            </p>
          </div>

          <button
            type="button"
            className="payroll-primary-btn"
            onClick={() => setShowGenerateModal(true)}
          >
            + Generate Payroll
          </button>
        </header>

        {/* MONTH */}

        <section className="payroll-toolbar">
          <div className="payroll-filter-group">
            <label>Payroll Month</label>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value)
              }
            />
          </div>
        </section>

        {/* SUMMARY */}

        <section className="payroll-summary-grid">

          <div className="payroll-summary-card">
            <span>Total Gross Salary</span>
            <strong>
              {formatCurrency(summary.totalGross)}
            </strong>
          </div>

          <div className="payroll-summary-card">
            <span>Total Deductions</span>
            <strong>
              {formatCurrency(summary.totalDeduction)}
            </strong>
          </div>

          <div className="payroll-summary-card">
            <span>Total Net Payroll</span>
            <strong>
              {formatCurrency(summary.totalPayroll)}
            </strong>
          </div>

          <div className="payroll-summary-card">
            <span>Paid</span>
            <strong>{summary.paidCount}</strong>
          </div>

          <div className="payroll-summary-card">
            <span>Pending</span>
            <strong>{summary.pendingCount}</strong>
          </div>

        </section>

        {/* PAYROLL RECORDS */}

        <section className="payroll-table-card">

          <div className="section-heading">
            <div>
              <span className="section-label">
                Monthly Payroll
              </span>

              <h2>Payroll Records</h2>
            </div>

            <span className="employee-count">
              {filteredPayrolls.length}{" "}
              {filteredPayrolls.length === 1
                ? "record"
                : "records"}
            </span>
          </div>

          {/* FILTERS */}

          <div className="payroll-table-filters">

            <div className="payroll-search-box">
              <label>Search Employee</label>

              <input
                type="text"
                placeholder="Search by name or employee ID"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>

            <div className="payroll-status-filter">
              <label>Payment Status</label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

          </div>

          {loading ? (
            <div className="empty-state">
              <h3>Loading payroll...</h3>
            </div>
          ) : error ? (
            <div className="empty-state">
              <h3>Unable to load payroll</h3>
              <p>{error}</p>
            </div>
          ) : filteredPayrolls.length === 0 ? (
            <div className="empty-state">
              <h3>No payroll records found</h3>
              <p>
                No employees match the selected filters.
              </p>
            </div>
          ) : (
            <div className="payroll-clean-table-wrapper">

              <table className="payroll-clean-table">

                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Attendance</th>
                    <th>Gross Salary</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th>Paid Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {paginatedPayrolls.map((item) => (
                    <tr key={item._id}>

                      <td>
                        <div className="employee-name">

                          <div className="avatar">
                            {item.employee?.name
                              ?.charAt(0)
                              .toUpperCase() || "E"}
                          </div>

                          <div className="employee-info">
                            <strong>
                              {item.employee?.name ||
                                "Unknown Employee"}
                            </strong>

                            <small>
                              {item.employee?.employeeId ||
                                "--"}
                            </small>
                          </div>

                        </div>
                      </td>

                      <td>
                        <div className="payroll-attendance-summary">

                          <span className="attendance-present">
                            {Number(item.presentDays || 0)}P
                          </span>

                          <span className="attendance-half">
                            {Number(item.halfDays || 0)}H
                          </span>

                          <span className="attendance-absent">
                            {Number(item.absentDays || 0)}A
                          </span>

                        </div>
                      </td>

                      <td>
                        <span className="salary-normal">
                          {formatCurrency(
                            item.grossSalary
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="salary-deduction">
                          {formatCurrency(
                            item.totalDeduction
                          )}
                        </span>
                      </td>

                      <td>
                        <strong className="salary-net">
                          {formatCurrency(
                            item.netSalary
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`payroll-status ${
                            item.paymentStatus === "Paid"
                              ? "payroll-status-paid"
                              : "payroll-status-pending"
                          }`}
                        >
                          {item.paymentStatus ||
                            "Pending"}
                        </span>
                      </td>

                      <td>
                        <span className="payroll-paid-date">
                          {formatDate(item.paidDate)}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="payroll-view-btn"
                          onClick={() =>
                            handleViewDetails(item._id)
                          }
                          disabled={
                            actionLoading ===
                            `view-${item._id}`
                          }
                        >
                          {actionLoading ===
                          `view-${item._id}`
                            ? "Loading..."
                            : "View Details"}
                        </button>
                      </td>

                    </tr>
                  ))}

                </tbody>
              </table>

              {/* PAGINATION */}

              <div className="payroll-pagination">

                <div className="payroll-pagination-info">
                  {filteredPayrolls.length > 0
                    ? `Showing ${startIndex + 1} to ${endIndex} of ${filteredPayrolls.length} records`
                    : "Showing 0 records"}
                </div>

                <div className="payroll-pagination-controls">

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.max(page - 1, 1)
                      )
                    }
                    disabled={safeCurrentPage === 1}
                  >
                    Previous
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, index) => {
                      const pageNumber = index + 1;

                      return (
                        <button
                          type="button"
                          key={pageNumber}
                          className={
                            safeCurrentPage ===
                            pageNumber
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setCurrentPage(pageNumber)
                          }
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(
                          page + 1,
                          totalPages
                        )
                      )
                    }
                    disabled={
                      safeCurrentPage === totalPages
                    }
                  >
                    Next
                  </button>

                </div>
              </div>

            </div>
          )}

        </section>
      </div>

      {/* ======================================
          GENERATE PAYROLL MODAL
      ======================================= */}

      {showGenerateModal && (
        <div
          className="payroll-modal-overlay"
          onClick={closeGenerateModal}
        >
          <div
            className="payroll-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="payroll-modal-header">
              <div>
                <span className="section-label">
                  New Payroll
                </span>

                <h2>Generate Payroll</h2>

                <p>
                  {formatMonth(selectedMonth)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeGenerateModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll}>

              <div className="payroll-form-group">
                <label>Generate For</label>

                <div className="payroll-generate-mode">

                  <button
                    type="button"
                    className={
                      generateMode === "single"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setGenerateMode("single");
                      setBulkResult(null);
                    }}
                  >
                    Single Employee
                  </button>

                  <button
                    type="button"
                    className={
                      generateMode === "all"
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setGenerateMode("all");
                      setBulkResult(null);
                    }}
                  >
                    All Active Employees
                  </button>

                </div>
              </div>

              {generateMode === "single" && (
                <div className="payroll-form-group">

                  <label>Employee</label>

                  <select
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employeeId:
                          e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Select Employee
                    </option>

                    {employees.map((employee) => (
                      <option
                        key={employee._id}
                        value={employee._id}
                      >
                        {employee.name}
                        {" - "}
                        {employee.employeeId}
                      </option>
                    ))}
                  </select>

                </div>
              )}

              {generateMode === "all" && (
                <div className="payroll-bulk-note">
                  Payroll will be generated for all
                  active employees. Existing payroll
                  records for this month will be
                  skipped.
                </div>
              )}

              <div className="payroll-form-group">

                <label>Other Deduction</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.otherDeduction}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      otherDeduction:
                        e.target.value,
                    })
                  }
                />

              </div>

              <div className="payroll-form-group">

                <label>Remarks</label>

                <textarea
                  rows="4"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      remarks:
                        e.target.value,
                    })
                  }
                  placeholder={
                    generateMode === "all"
                      ? `Example: ${formatMonth(
                          selectedMonth
                        )} Payroll`
                      : "Optional remarks"
                  }
                />

              </div>

              {bulkResult && (
                <div className="payroll-bulk-result">

                  <div>
                    <span>Total Employees</span>
                    <strong>
                      {bulkResult.totalEmployees || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Created</span>
                    <strong>
                      {bulkResult.created || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Skipped</span>
                    <strong>
                      {bulkResult.skipped || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Failed</span>
                    <strong>
                      {bulkResult.failed || 0}
                    </strong>
                  </div>

                </div>
              )}

              <div className="payroll-modal-actions">

                <button
                  type="button"
                  className="payroll-cancel-btn"
                  onClick={closeGenerateModal}
                >
                  {bulkResult
                    ? "Close"
                    : "Cancel"}
                </button>

                {!bulkResult && (
                  <button
                    type="submit"
                    className="payroll-primary-btn"
                    disabled={
                      actionLoading ===
                      "generate"
                    }
                  >
                    {actionLoading ===
                    "generate"
                      ? "Generating..."
                      : generateMode ===
                          "all"
                        ? "Generate All Payrolls"
                        : "Generate Payroll"}
                  </button>
                )}

              </div>

            </form>

          </div>
        </div>
      )}

      {/* ======================================
          PAYROLL DETAILS MODAL
      ======================================= */}

      {selectedPayroll && (
        <div
          className="payroll-modal-overlay"
          onClick={() =>
            setSelectedPayroll(null)
          }
        >
          <div
            className="payroll-modal payroll-details-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="payroll-modal-header">
              <div>
                <span className="section-label">
                  Payroll Details
                </span>

                <h2>
                  {selectedPayroll.employee
                    ?.name || "Employee"}
                </h2>

                <p>
                  {formatMonth(
                    selectedPayroll.month
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPayroll(null)
                }
              >
                ×
              </button>
            </div>

            {/* EMPLOYEE */}

            <div className="payroll-details-employee">

              <div className="avatar">
                {selectedPayroll.employee?.name
                  ?.charAt(0)
                  .toUpperCase() || "E"}
              </div>

              <div>
                <strong>
                  {selectedPayroll.employee?.name}
                </strong>

                <span>
                  {
                    selectedPayroll.employee
                      ?.employeeId
                  }
                </span>
              </div>

            </div>

            {/* ATTENDANCE */}

            <div className="payroll-details-grid">

              <div>
                <span>Working Days</span>
                <strong>
                  {selectedPayroll.workingDays || 0}
                </strong>
              </div>

              <div>
                <span>Present</span>
                <strong>
                  {selectedPayroll.presentDays || 0}
                </strong>
              </div>

              <div>
                <span>Late</span>
                <strong>
                  {selectedPayroll.lateDays || 0}
                </strong>
              </div>

              <div>
                <span>Half Days</span>
                <strong>
                  {selectedPayroll.halfDays || 0}
                </strong>
              </div>

              <div>
                <span>Absent</span>
                <strong>
                  {selectedPayroll.absentDays || 0}
                </strong>
              </div>

            </div>

            {/* SALARY */}

            <div className="payroll-details-grid">

              <div>
                <span>Basic Salary</span>

                <strong>
                  {formatCurrency(
                    selectedPayroll.basicSalary
                  )}
                </strong>
              </div>

              <div>
                <span>Allowance</span>

                <strong>
                  {formatCurrency(
                    selectedPayroll.allowance
                  )}
                </strong>
              </div>

              <div>
                <span>Gross Salary</span>

                <strong>
                  {formatCurrency(
                    selectedPayroll.grossSalary
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Attendance Deduction
                </span>

                <strong>
                  {formatCurrency(
                    selectedPayroll
                      .attendanceDeduction
                  )}
                </strong>
              </div>

              {/* NEW EMPLOYEE DEDUCTION */}

              <div>
                <span>
                  Employee Deduction
                </span>

                <strong>
                  {formatCurrency(
                    selectedPayroll
                      .employeeDeduction
                  )}
                </strong>
              </div>

              <div>
                <span>Other Deduction</span>

                <strong>
                  {formatCurrency(
                    selectedPayroll
                      .otherDeduction
                  )}
                </strong>
              </div>

              <div>
                <span>Total Deduction</span>

                <strong>
                  {formatCurrency(
                    selectedPayroll
                      .totalDeduction
                  )}
                </strong>
              </div>

              <div>
                <span>Net Salary</span>

                <strong className="salary-net">
                  {formatCurrency(
                    selectedPayroll.netSalary
                  )}
                </strong>
              </div>

              <div>
                <span>Payment Status</span>

                <strong>
                  {selectedPayroll.paymentStatus}
                </strong>
              </div>

              <div>
                <span>Paid Date</span>

                <strong>
                  {formatDate(
                    selectedPayroll.paidDate
                  )}
                </strong>
              </div>

            </div>

            {/* REMARKS */}

            {selectedPayroll.remarks && (
              <div className="payroll-details-remarks">

                <span>Remarks</span>

                <p>
                  {selectedPayroll.remarks}
                </p>

              </div>
            )}

            {/* ACTIONS */}

            <div className="payroll-modal-actions">

              <button
                type="button"
                className="payroll-view-btn"
                onClick={handlePrintPayslip}
              >
                Print / Save Payslip
              </button>

              <button
                type="button"
                className="payroll-cancel-btn"
                disabled={
                  actionLoading ===
                  `recalculate-${selectedPayroll._id}`
                }
                onClick={() =>
                  handleRecalculate(
                    selectedPayroll._id
                  )
                }
              >
                {actionLoading ===
                `recalculate-${selectedPayroll._id}`
                  ? "Recalculating..."
                  : "Recalculate"}
              </button>

              {selectedPayroll.paymentStatus !==
                "Paid" && (
                <button
                  type="button"
                  className="payroll-primary-btn"
                  disabled={
                    actionLoading ===
                    `paid-${selectedPayroll._id}`
                  }
                  onClick={() =>
                    handleMarkPaid(
                      selectedPayroll._id
                    )
                  }
                >
                  {actionLoading ===
                  `paid-${selectedPayroll._id}`
                    ? "Updating..."
                    : "Mark as Paid"}
                </button>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Payroll;
