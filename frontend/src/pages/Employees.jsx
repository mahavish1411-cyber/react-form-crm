import { useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../api/client";

const errorMessage = (error) => error.response?.data?.message ||
  (error.code === "ECONNABORTED"
    ? "Request timed out. Refresh the employee list before retrying."
    : "Cannot connect to the server. Please check that the backend is running.");

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================
  // FORM DATA
  // ==========================================

  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",

    // Salary
    basicSalary: "",
    allowance: "",
    deduction: "",

    status: "Active",
  });

  // ==========================================
  // FETCH EMPLOYEES
  // ==========================================

  const fetchEmployees = async () => {
    try {
      setListError("");
      const response = await axios.get(
        `${API_BASE_URL}/employees`
      );

      setEmployees(response.data.data || []);
    } catch (error) {
      console.error(
        "Fetch employees error:",
        error
      );

      setListError(errorMessage(error));
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // ==========================================
  // SALARY CALCULATIONS
  // ==========================================

  const salaryCalculation = useMemo(() => {
    const basicSalary = Number(
      formData.basicSalary || 0
    );

    const allowance = Number(
      formData.allowance || 0
    );

    const deduction = Number(
      formData.deduction || 0
    );

    const grossSalary =
      basicSalary + allowance;

    const estimatedNetSalary = Math.max(
      grossSalary - deduction,
      0
    );

    return {
      basicSalary,
      allowance,
      deduction,
      grossSalary,
      estimatedNetSalary,
    };
  }, [
    formData.basicSalary,
    formData.allowance,
    formData.deduction,
  ]);

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
  // RESET FORM
  // ==========================================

  const resetForm = () => {
    setFormData({
      employeeId: "",
      name: "",
      email: "",
      phone: "",
      department: "",
      designation: "",

      basicSalary: "",
      allowance: "",
      deduction: "",

      status: "Active",
    });

    setEditingId(null);
  };

  // ==========================================
  // CREATE / UPDATE EMPLOYEE
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setFormError("");
    setSuccessMessage("");

    try {
      setLoading(true);

      // Convert salary inputs to numbers
      const payload = {
        ...formData,

        basicSalary: Number(
          formData.basicSalary || 0
        ),

        allowance: Number(
          formData.allowance || 0
        ),

        deduction: Number(
          formData.deduction || 0
        ),
      };

      if (editingId) {
        await axios.put(
          `${API_BASE_URL}/employees/${editingId}`,
          payload
        );

        setSuccessMessage(
          "Employee Updated Successfully"
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/employees`,
          payload
        );

        setSuccessMessage(
          "Employee Created Successfully"
        );
      }

      resetForm();

      await fetchEmployees();
    } catch (error) {
      console.error(
        "Employee operation error:",
        error
      );

      setFormError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // EDIT EMPLOYEE
  // ==========================================

  const handleEdit = (employee) => {
    setEditingId(employee._id);

    setFormData({
      employeeId:
        employee.employeeId || "",

      name:
        employee.name || "",

      email:
        employee.email || "",

      phone:
        employee.phone || "",

      department:
        employee.department || "",

      designation:
        employee.designation || "",

      basicSalary:
        employee.basicSalary ?? "",

      allowance:
        employee.allowance ?? "",

      deduction:
        employee.deduction ?? "",

      status:
        employee.status || "Active",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================
  // DELETE EMPLOYEE
  // ==========================================

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this employee?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/employees/${id}`
      );

      if (editingId === id) {
        resetForm();
      }

      await fetchEmployees();
    } catch (error) {
      console.error(
        "Delete employee error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Unable to delete employee"
      );
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="crm-page">
      {/* BACKGROUND EFFECT */}

      <div className="crm-glow crm-glow-one"></div>
      <div className="crm-glow crm-glow-two"></div>

      <div className="crm-container">

        {/* =====================================
            HEADER
        ====================================== */}

        <header className="crm-header">
          <div>
            <span className="crm-kicker">
              Employee CRM
            </span>

            <h1>
              Employee Management
            </h1>

            <p>
              Manage employee information,
              salary structure and employment
              status from one workspace.
            </p>
          </div>

          <div className="crm-total-card">
            <span>
              Total Employees
            </span>

            <strong>
              {employees.length}
            </strong>
          </div>
        </header>

        {/* =====================================
            EMPLOYEE FORM
        ====================================== */}

        <section className="crm-form-card">

          <div className="section-heading">

            <div>
              <span className="section-label">
                {editingId
                  ? "Edit Mode"
                  : "New Employee"}
              </span>

              <h2>
                {editingId
                  ? "Update Employee"
                  : "Add Employee"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                className="btn btn-light"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}

          </div>

          {formError && <p role="alert" style={{ color: "#b42318" }}>{formError}</p>}
          {successMessage && <p role="status" style={{ color: "#18794e" }}>{successMessage}</p>}
          {listError && <p role="alert" style={{ color: "#b42318" }}>{listError} <button type="button" onClick={fetchEmployees}>Retry loading employees</button></p>}
          <form onSubmit={handleSubmit}>

            {/* =================================
                PERSONAL / WORK INFORMATION
            ================================== */}

            <div
              style={{
                marginBottom: "18px",
              }}
            >
              <span className="section-label">
                Employee Information
              </span>
            </div>

            <div className="form-grid">

              {/* EMPLOYEE ID */}

              <div className="form-group">
                <label>
                  Employee ID
                </label>

                <input
                  type="text"
                  name="employeeId"
                  placeholder="EMP001"
                  value={
                    formData.employeeId
                  }
                  onChange={handleChange}
                  required
                />
              </div>

              {/* NAME */}

              <div className="form-group">
                <label>
                  Employee Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter employee name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* EMAIL */}

              <div className="form-group">
                <label>
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* PHONE */}

              <div className="form-group">
                <label>
                  Phone Number
                </label>

                <input
                  type="text"
                  name="phone"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* DEPARTMENT */}

              <div className="form-group">
                <label>
                  Department
                </label>

                <input
                  type="text"
                  name="department"
                  placeholder="Development"
                  value={
                    formData.department
                  }
                  onChange={handleChange}
                  required
                />
              </div>

              {/* DESIGNATION */}

              <div className="form-group">
                <label>
                  Designation
                </label>

                <input
                  type="text"
                  name="designation"
                  placeholder="React Developer"
                  value={
                    formData.designation
                  }
                  onChange={handleChange}
                  required
                />
              </div>

              {/* STATUS */}

              <div className="form-group">
                <label>
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>

            </div>

            {/* =================================
                SALARY STRUCTURE
            ================================== */}

            <div
              style={{
                marginTop: "30px",
                marginBottom: "18px",
              }}
            >
              <span className="section-label">
                Salary Structure
              </span>

              <h3
                style={{
                  margin:
                    "6px 0 0",
                }}
              >
                Employee Salary Details
              </h3>
            </div>

            <div className="form-grid">

              {/* BASIC SALARY */}

              <div className="form-group">
                <label>
                  Basic Salary
                </label>

                <input
                  type="number"
                  name="basicSalary"
                  min="0"
                  step="0.01"
                  placeholder="30000"
                  value={
                    formData.basicSalary
                  }
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ALLOWANCE */}

              <div className="form-group">
                <label>
                  Allowance
                </label>

                <input
                  type="number"
                  name="allowance"
                  min="0"
                  step="0.01"
                  placeholder="3000"
                  value={
                    formData.allowance
                  }
                  onChange={handleChange}
                />
              </div>

              {/* EMPLOYEE DEDUCTION */}

              <div className="form-group">
                <label>
                  Employee Deduction
                </label>

                <input
                  type="number"
                  name="deduction"
                  min="0"
                  step="0.01"
                  placeholder="1000"
                  value={
                    formData.deduction
                  }
                  onChange={handleChange}
                />
              </div>

            </div>

            {/* =================================
                SALARY PREVIEW
            ================================== */}

            <div
              style={{
                marginTop: "22px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
              }}
            >

              {/* BASIC */}

              <div className="payroll-summary-card">
                <span>
                  Basic Salary
                </span>

                <strong>
                  {formatCurrency(
                    salaryCalculation
                      .basicSalary
                  )}
                </strong>
              </div>

              {/* ALLOWANCE */}

              <div className="payroll-summary-card">
                <span>
                  Allowance
                </span>

                <strong>
                  {formatCurrency(
                    salaryCalculation
                      .allowance
                  )}
                </strong>
              </div>

              {/* GROSS */}

              <div className="payroll-summary-card">
                <span>
                  Gross Salary
                </span>

                <strong>
                  {formatCurrency(
                    salaryCalculation
                      .grossSalary
                  )}
                </strong>
              </div>

              {/* DEDUCTION */}

              <div className="payroll-summary-card">
                <span>
                  Employee Deduction
                </span>

                <strong>
                  {formatCurrency(
                    salaryCalculation
                      .deduction
                  )}
                </strong>
              </div>

              {/* ESTIMATED */}

              <div className="payroll-summary-card">
                <span>
                  Salary After Fixed Deduction
                </span>

                <strong>
                  {formatCurrency(
                    salaryCalculation
                      .estimatedNetSalary
                  )}
                </strong>
              </div>

            </div>

            {/* NOTE */}

            <div
              style={{
                marginTop: "14px",
                fontSize: "12px",
                opacity: 0.7,
              }}
            >
              Final payroll net salary may be
              lower after attendance and other
              payroll deductions are applied.
            </div>

            {/* ACTION */}

            <div className="form-actions">

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : editingId
                  ? "Update Employee"
                  : "Add Employee"}
              </button>

            </div>

          </form>

        </section>

        {/* =====================================
            EMPLOYEE LIST
        ====================================== */}

        <section className="crm-table-card">

          <div className="section-heading">

            <div>
              <span className="section-label">
                Team Directory
              </span>

              <h2>
                Employee List
              </h2>
            </div>

            <span className="employee-count">
              {employees.length}{" "}
              {employees.length === 1
                ? "record"
                : "records"}
            </span>

          </div>

          {employees.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                👥
              </div>

              <h3>
                No employees found
              </h3>

              <p>
                Add your first employee using
                the form above.
              </p>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>
                      Employee
                    </th>

                    <th>
                      Contact
                    </th>

                    <th>
                      Department
                    </th>

                    <th>
                      Designation
                    </th>

                    <th>
                      Basic
                    </th>

                    <th>
                      Allowance
                    </th>

                    <th>
                      Deduction
                    </th>

                    <th>
                      Gross
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {employees.map(
                    (employee, index) => {

                      const basicSalary =
                        Number(
                          employee.basicSalary ||
                            0
                        );

                      const allowance =
                        Number(
                          employee.allowance ||
                            0
                        );

                      const deduction =
                        Number(
                          employee.deduction ||
                            0
                        );

                      const grossSalary =
                        basicSalary +
                        allowance;

                      return (
                        <tr
                          key={employee._id}
                          style={{
                            animationDelay:
                              `${
                                index * 0.08
                              }s`,
                          }}
                        >

                          {/* EMPLOYEE */}

                          <td>

                            <div className="employee-name">

                              <div className="avatar">
                                {employee.name
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {employee.name}
                                </strong>

                                <div>
                                  <span className="employee-id">
                                    {
                                      employee.employeeId
                                    }
                                  </span>
                                </div>
                              </div>

                            </div>

                          </td>

                          {/* CONTACT */}

                          <td>
                            <div>
                              {employee.email}
                            </div>

                            <small>
                              {employee.phone}
                            </small>
                          </td>

                          {/* DEPARTMENT */}

                          <td>
                            {
                              employee.department
                            }
                          </td>

                          {/* DESIGNATION */}

                          <td>
                            {
                              employee.designation
                            }
                          </td>

                          {/* BASIC */}

                          <td>
                            {formatCurrency(
                              basicSalary
                            )}
                          </td>

                          {/* ALLOWANCE */}

                          <td>
                            {formatCurrency(
                              allowance
                            )}
                          </td>

                          {/* DEDUCTION */}

                          <td>
                            {formatCurrency(
                              deduction
                            )}
                          </td>

                          {/* GROSS */}

                          <td>
                            <strong>
                              {formatCurrency(
                                grossSalary
                              )}
                            </strong>
                          </td>

                          {/* STATUS */}

                          <td>

                            <span
                              className={`status-badge ${
                                employee.status ===
                                "Active"
                                  ? "status-active"
                                  : "status-inactive"
                              }`}
                            >

                              <span className="status-dot"></span>

                              {
                                employee.status
                              }

                            </span>

                          </td>

                          {/* ACTION */}

                          <td>

                            <div className="action-buttons">

                              <button
                                type="button"
                                className="btn-edit"
                                onClick={() =>
                                  handleEdit(
                                    employee
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn-delete"
                                onClick={() =>
                                  handleDelete(
                                    employee._id
                                  )
                                }
                              >
                                Delete
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

          )}

        </section>

      </div>

    </div>
  );
}

export default Employees;
