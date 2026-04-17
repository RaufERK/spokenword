import { useEffect } from "react";
import { useNavigate } from "react-router";
import { User, Mail, Phone, MapPin, Key, Shield } from "lucide-react";

export function Profile() {
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [navigate]);

  // Mock user data
  const user = {
    name: "Елеонора",
    surname: "Брагиш",
    phone: "37369372743",
    email: "beleonora@mail.ru",
    login: "Eleonora",
    password: "436523",
    role: "USER",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl text-white mb-3">Ваш профиль</h1>
        <p className="text-purple-200">Личная информация и настройки аккаунта</p>
      </div>

      <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700/50 to-purple-700/50 p-6 border-b border-white/10">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-3xl shadow-lg">
              {user.name[0]}
              {user.surname[0]}
            </div>
            <div>
              <h2 className="text-2xl text-white">
                {user.name} {user.surname}
              </h2>
              <p className="text-purple-200">@{user.login}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-purple-300 text-sm">
                <User className="w-4 h-4" />
                <span>Имя:</span>
              </label>
              <p className="text-green-400 text-lg pl-6">{user.name}</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-purple-300 text-sm">
                <User className="w-4 h-4" />
                <span>Фамилия:</span>
              </label>
              <p className="text-green-400 text-lg pl-6">{user.surname}</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-purple-300 text-sm">
                <Phone className="w-4 h-4" />
                <span>Телефон:</span>
              </label>
              <p className="text-green-400 text-lg pl-6">{user.phone}</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-purple-300 text-sm">
                <Mail className="w-4 h-4" />
                <span>Email:</span>
              </label>
              <p className="text-green-400 text-lg pl-6">{user.email}</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-purple-300 text-sm">
                <Key className="w-4 h-4" />
                <span>Логин:</span>
              </label>
              <p className="text-green-400 text-lg pl-6">{user.login}</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-purple-300 text-sm">
                <Shield className="w-4 h-4" />
                <span>Пароль:</span>
              </label>
              <p className="text-green-400 text-lg pl-6">{user.password}</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-purple-300 text-sm">
                <Shield className="w-4 h-4" />
                <span>Роль:</span>
              </label>
              <p className="text-green-400 text-lg pl-6">{user.role}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <button className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-8 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
              Редактировать профиль
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
