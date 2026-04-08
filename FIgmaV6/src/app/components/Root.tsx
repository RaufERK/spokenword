import { Outlet, Link, useNavigate, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { LogOut, ShieldAlert } from "lucide-react";

export function Root() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"USER" | "ADMIN" | "MODERATOR">("USER");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is authenticated (mock check)
    const authStatus = localStorage.getItem("isAuthenticated") === "true";
    const role = (localStorage.getItem("userRole") as "USER" | "ADMIN" | "MODERATOR") || "USER";
    setIsAuthenticated(authStatus);
    setUserRole(role);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
    navigate("/login");
  };

  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isAdmin = userRole === "ADMIN" || userRole === "MODERATOR";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#4a148c] via-[#5e35b1] to-[#311b92]">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-[#1565c0] to-[#0d47a1] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              {isAuthenticated && (
                <>
                  <Link
                    to="/"
                    className={`text-white px-3 py-2 rounded-md transition-colors ${
                      location.pathname === "/" ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                  >
                    Главная
                  </Link>
                  <Link
                    to="/archive"
                    className={`text-white px-3 py-2 rounded-md transition-colors ${
                      location.pathname === "/archive" ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                  >
                    Архив
                  </Link>
                  <Link
                    to="/chat"
                    className={`text-white px-3 py-2 rounded-md transition-colors ${
                      location.pathname === "/chat" ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                  >
                    Чат
                  </Link>
                  <Link
                    to="/paid-materials"
                    className={`text-white px-3 py-2 rounded-md transition-colors ${
                      location.pathname === "/paid-materials" ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                  >
                    Платные материалы
                  </Link>
                  <Link
                    to="/profile"
                    className={`text-white px-3 py-2 rounded-md transition-colors ${
                      location.pathname === "/profile" ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                  >
                    Профиль
                  </Link>
                </>
              )}
              {!isAuthenticated && !isPublicRoute && (
                <Link to="/login" className="text-white px-3 py-2 rounded-md hover:bg-white/10 transition-colors">
                  Главная
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated && isAdmin && (
                <Link
                  to="/admin"
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md hover:shadow-lg"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>АДМИН</span>
                </Link>
              )}
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="text-[#4ade80] hover:text-[#22c55e] px-3 py-2 rounded-md flex items-center space-x-2 transition-colors"
                >
                  <span>Выйти</span>
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <>
                  {location.pathname !== "/login" && (
                    <Link
                      to="/login"
                      className="text-[#4ade80] hover:text-[#22c55e] px-3 py-2 rounded-md transition-colors"
                    >
                      Войти
                    </Link>
                  )}
                  {location.pathname !== "/register" && (
                    <Link
                      to="/register"
                      className="text-[#4ade80] hover:text-[#22c55e] px-3 py-2 rounded-md transition-colors"
                    >
                      Регистрация
                    </Link>
                  )}
                </>
              )}
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