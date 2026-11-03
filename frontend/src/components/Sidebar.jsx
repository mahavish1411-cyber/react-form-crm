import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

import { readPreferences } from '../utils/workspacePreferences';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => { const update = () => setPreferences(readPreferences()); window.addEventListener('preferences-updated', update); window.addEventListener('storage', update); return () => { window.removeEventListener('preferences-updated', update); window.removeEventListener('storage', update); }; }, []);

  const menuItems = [
    {
      icon: "▦",
      label: "Dashboard",
      path: "/",
    },
    {
      icon: "👥",
      label: "Employees",
      path: "/employees",
    },
    {
      icon: "◷",
      label: "Attendance",
      path: "/attendance",
    },
    {
      icon: "▣",
      label: "Payroll",
      path: "/payroll",
    },
    {
      icon: "▤",
      label: "Reports",
      path: "/reports",
    },
  ];

  return (
    <aside className={`crm-sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/images/artic9-favicon.png" width="38" height="38" alt="ARTIC9" style={{ borderRadius: 8 }} />

        {!collapsed && (
          <div className="logo-content">
            <img src="/images/artic9-logo.png" width="110" alt="ARTIC9" style={{ display: "block", background: "#202b34", padding: "8px", borderRadius: 5 }} />
            <p>{preferences.company || 'ARTIC9'}</p>
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <button
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="sidebar-toggle"
        type="button"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? "›" : "‹"}
      </button>

      {/* Main Menu */}
      <div className="sidebar-section">
        {!collapsed && <span className="sidebar-title">MAIN MENU</span>}

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              aria-label={item.label}
              title={item.label}
              end={item.path === "/"}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="sidebar-icon">{item.icon}</span>

                  {!collapsed && <span>{item.label}</span>}

                  {isActive && <span className="active-line"></span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Management */}
      <div className="sidebar-section">
        {!collapsed && <span className="sidebar-title">MANAGEMENT</span>}

        <nav className="sidebar-menu">
          <NavLink
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                <span className="sidebar-icon">⚙</span>

                {!collapsed && <span>Settings</span>}

                {isActive && <span className="active-line"></span>}
              </>
            )}
          </NavLink>

          <NavLink to="/help" aria-label="Help Center" title="Help Center" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon">?</span>

            {!collapsed && <span>Help Center</span>}
          </NavLink>
        </nav>
      </div>

      {/* User */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{preferences.avatar ? <img src={preferences.avatar} alt="Your profile" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/> : preferences.name?.slice(0,1).toUpperCase() || 'A'}</div>

        {!collapsed && (
          <div className="sidebar-user-info">
            <strong>{preferences.name || 'Admin'}</strong>
            <span>{preferences.designation || 'Administrator'}</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
