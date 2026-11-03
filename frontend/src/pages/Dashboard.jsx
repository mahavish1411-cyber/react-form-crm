import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const [employees, setEmployees] = useState([]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/employees"
      );

      setEmployees(response.data.data || []);
    } catch (error) {
      console.error("Dashboard employee fetch error:", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const totalEmployees = employees.length;

  const activeEmployees = employees.filter(
    (employee) => employee.status === "Active"
  ).length;

  const inactiveEmployees = employees.filter(
    (employee) => employee.status === "Inactive"
  ).length;

  const departments = [
    ...new Set(
      employees
        .map((employee) => employee.department)
        .filter(Boolean)
    ),
  ];

  const recentEmployees = [...employees]
    .reverse()
    .slice(0, 5);

  return (
    <div className="crm-page dashboard-page">
      <div className="crm-glow crm-glow-one"></div>
      <div className="crm-glow crm-glow-two"></div>

      <div className="crm-container">
        <header className="crm-header">
          <div>
            <span className="crm-kicker">
              CRM Dashboard
            </span>

            <h1>Dashboard</h1>

            <p>
              Overview of your employee management workspace.
            </p>
          </div>
        </header>

        <section className="dashboard-stats">
          <div className="dashboard-stat-card">
            <div className="stat-icon stat-purple">
              👥
            </div>

            <div>
              <span>Total Employees</span>
              <strong>{totalEmployees}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-icon stat-green">
              ✓
            </div>

            <div>
              <span>Active Employees</span>
              <strong>{activeEmployees}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-icon stat-red">
              ×
            </div>

            <div>
              <span>Inactive Employees</span>
              <strong>{inactiveEmployees}</strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="stat-icon stat-blue">
              ▦
            </div>

            <div>
              <span>Departments</span>
              <strong>{departments.length}</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-panel">
            <div className="section-heading">
              <div>
                <span className="section-label">
                  Recent Activity
                </span>

                <h2>Recent Employees</h2>
              </div>
            </div>

            {recentEmployees.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>

                <h3>No employee data yet</h3>

                <p>
                  Employees added from the Employee page
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="recent-employee-list">
                {recentEmployees.map((employee) => (
                  <div
                    className="recent-employee-item"
                    key={employee._id}
                  >
                    <div className="employee-name">
                      <div className="avatar">
                        {employee.name
                          ?.charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>{employee.name}</strong>
                        <span>
                          {employee.designation}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`status-badge ${
                        employee.status === "Active"
                          ? "status-active"
                          : "status-inactive"
                      }`}
                    >
                      <span className="status-dot"></span>
                      {employee.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-panel">
            <div className="section-heading">
              <div>
                <span className="section-label">
                  Quick Overview
                </span>

                <h2>Employee Summary</h2>
              </div>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span>Total Employees</span>
                <strong>{totalEmployees}</strong>
              </div>

              <div className="summary-row">
                <span>Active</span>
                <strong>{activeEmployees}</strong>
              </div>

              <div className="summary-row">
                <span>Inactive</span>
                <strong>{inactiveEmployees}</strong>
              </div>

              <div className="summary-row">
                <span>Departments</span>
                <strong>{departments.length}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;