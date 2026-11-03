import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";
import { readPreferences } from "../utils/workspacePreferences";

function DashboardLayout() {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    const update = () => setPreferences(readPreferences());
    window.addEventListener('preferences-updated', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('preferences-updated', update); window.removeEventListener('storage', update); };
  }, []);
  return (
    <div className="crm-layout" data-appearance={preferences.appearance} data-density={preferences.density}>
      <Sidebar />

      <main className="crm-main">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
