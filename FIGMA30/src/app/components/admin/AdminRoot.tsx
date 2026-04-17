import { Outlet, Link, useNavigate, useLocation } from "react-router";
import { useEffect } from "react";
import { User, Upload, Package, Users, Link2, Eye, Calendar } from "lucide-react";

export function AdminRoot() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    const userRole = localStorage.getItem("userRole");
    
    if (!isAuthenticated) {
      navigate("/login");
    } else if (userRole !== "ADMIN" && userRole !== "MODERATOR") {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#6a1b4d] via-[#8b2c5e] to-[#4a0e3a]">
      {/* Admin Navigation */}
      <nav className="bg-gradient-to-r from-[#c2185b] to-[#880e4f] shadow-lg border-b-2 border-pink-400/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-1">
              <Link
                to="/admin"
                className={`text-white px-3 py-2 rounded-md transition-colors text-sm ${
                  location.pathname === "/admin" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Стрим
              </Link>
              <Link
                to="/admin/class-management"
                className={`text-white px-3 py-2 rounded-md transition-colors text-sm ${
                  location.pathname === "/admin/class-management" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Конференция
              </Link>
              <Link
                to="/admin/conference-upload"
                className={`text-white px-3 py-2 rounded-md transition-colors text-sm ${
                  location.pathname === "/admin/conference-upload" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Загрузка
              </Link>
              <Link
                to="/admin/packages"
                className={`text-white px-3 py-2 rounded-md transition-colors text-sm ${
                  location.pathname === "/admin/packages" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Платные
              </Link>
              <Link
                to="/admin/users"
                className={`text-white px-3 py-2 rounded-md transition-colors text-sm ${
                  location.pathname === "/admin/users" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Пользователи
              </Link>
              <Link
                to="/admin/events"
                className={`text-white px-3 py-2 rounded-md transition-colors text-sm ${
                  location.pathname === "/admin/events" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Мероприятия
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md hover:shadow-lg"
              >
                <Eye className="w-4 h-4" />
                <span>Вид пользователя</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}