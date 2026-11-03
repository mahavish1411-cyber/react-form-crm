import { useEffect, useState } from "react";
import axios from "axios";

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    status: "Active",
  });

  // ================================
  // GET EMPLOYEES
  // ================================

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/employees"
      );

      setEmployees(response.data.data || []);
    } catch (error) {
      console.error("Fetch employees error:", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ================================
  // INPUT CHANGE
  // ================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // ================================
  // RESET FORM
  // ================================

  const resetForm = () => {
    setFormData({
      employeeId: "",
      name: "",
      email: "",
      phone: "",
      department: "",
      designation: "",
      status: "Active",
    });

    setEditingId(null);
  };

  // ================================
  // CREATE / UPDATE
  // ================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (editingId) {
        await axios.put(
          `http://localhost:5000/api/employees/${editingId}`,
          formData
        );

        alert("Employee Updated Successfully");
      } else {
        await axios.post(
          "http://localhost:5000/api/employees",
          formData
        );

        alert("Employee Created Successfully");
      }

      resetForm();
      await fetchEmployees();
    } catch (error) {
      console.error("Employee operation error:", error);

      alert(
        error.response?.data?.message ||
          "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // EDIT
  // ================================

  const handleEdit = (employee) => {
    setEditingId(employee._id);

    setFormData({
      employeeId: employee.employeeId || "",
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      designation: employee.designation || "",
      status: employee.status || "Active",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ================================
  // DELETE
  // ================================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this employee?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(
        `http://localhost:5000/api/employees/${id}`
      );

      if (editingId === id) {
        resetForm();
      }

      await fetchEmployees();
    } catch (error) {
      console.error("Delete employee error:", error);

      alert(
        error.response?.data?.message ||
          "Unable to delete employee"
      );
    }
  };

  return (
    <div className="crm-page">
      {/* BACKGROUND EFFECT */}

      <div className="crm-glow crm-glow-one"></div>
      <div className="crm-glow crm-glow-two"></div>

      <div className="crm-container">
        {/* ================================
            HEADER
        ================================= */}

        <header className="crm-header">
          <div>
            <span className="crm-kicker">
              Employee CRM
            </span>

            <h1>Employee Management</h1>

            <p>
              Manage your team with a clean and modern
              employee workspace.
            </p>
          </div>

          <div className="crm-total-card">
            <span>Total Employees</span>

            <strong>{employees.length}</strong>
          </div>
        </header>

        {/* ================================
            FORM
        ================================= */}

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

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Employee ID</label>

                <input
                  type="text"
                  name="employeeId"
                  placeholder="EMP001"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Employee Name</label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter employee name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>

                <input
                  type="text"
                  name="phone"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Department</label>

                <input
                  type="text"
                  name="department"
                  placeholder="Development"
                  value={formData.department}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Designation</label>

                <input
                  type="text"
                  name="designation"
                  placeholder="React Developer"
                  value={formData.designation}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>

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

        {/* ================================
            EMPLOYEE LIST
        ================================= */}

        <section className="crm-table-card">
          <div className="section-heading">
            <div>
              <span className="section-label">
                Team Directory
              </span>

              <h2>Employee List</h2>
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

              <h3>No employees found</h3>

              <p>
                Add your first employee using the
                form above.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map(
                    (employee, index) => (
                      <tr
                        key={employee._id}
                        style={{
                          animationDelay: `${
                            index * 0.08
                          }s`,
                        }}
                      >
                        <td>
                          <span className="employee-id">
                            {employee.employeeId}
                          </span>
                        </td>

                        <td>
                          <div className="employee-name">
                            <div className="avatar">
                              {employee.name
                                ?.charAt(0)
                                .toUpperCase()}
                            </div>

                            <span>
                              {employee.name}
                            </span>
                          </div>
                        </td>

                        <td>
                          {employee.email}
                        </td>

                        <td>
                          {employee.phone}
                        </td>

                        <td>
                          {employee.department}
                        </td>

                        <td>
                          {employee.designation}
                        </td>

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

                            {employee.status}
                          </span>
                        </td>

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
                    )
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