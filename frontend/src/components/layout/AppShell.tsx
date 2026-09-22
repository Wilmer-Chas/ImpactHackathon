import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-10 relative">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-brand-blue" />
          <span className="font-semibold text-gray-800">Impact</span>
          <span className="text-xs text-gray-400 hidden sm:inline">Presentation Generator</span>
        </div>
        <nav className="flex space-x-6 text-sm text-gray-600">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "text-brand-blue font-medium" : "hover:text-brand-blue"
            }
          >
            Employee Home
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              isActive ? "text-brand-blue font-medium" : "hover:text-brand-blue"
            }
          >
            Admin Dashboard
          </NavLink>
          <NavLink
            to="/report"
            className={({ isActive }) =>
              isActive ? "text-brand-blue font-medium" : "hover:text-brand-blue"
            }
          >
            Report View
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
