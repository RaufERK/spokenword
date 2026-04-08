import { useState } from "react";
import { Users, Search, CheckCircle, XCircle, X, Settings, UserCircle, Trash2, ArrowUpDown } from "lucide-react";

interface User {
  id: number;
  name: string;
  surname: string;
  phone: string;
  hasPaid: boolean;
  paymentDate?: string;
  role: string;
  materials: string[];
}

type SortField = "name" | "surname" | "paymentDate" | "role";
type SortOrder = "asc" | "desc";
type PaymentFilter = "all" | "active" | "inactive";

export function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: "Елеонора",
      surname: "Брагиш",
      phone: "37369372743",
      hasPaid: true,
      paymentDate: "15.03.2026",
      role: "USER",
      materials: ["Семинар по Евангелию от Иоанна"],
    },
    {
      id: 2,
      name: "Алексей",
      surname: "Карсунцев",
      phone: "79277835867",
      hasPaid: true,
      paymentDate: "20.02.2026",
      role: "USER",
      materials: [],
    },
    {
      id: 3,
      name: "Ирина",
      surname: "Білінок Salenska",
      phone: "34667870473",
      hasPaid: false,
      role: "USER",
      materials: [],
    },
    {
      id: 4,
      name: "Rauf",
      surname: "Erk",
      phone: "+79629483300",
      hasPaid: true,
      paymentDate: "01.01.2026",
      role: "SUPER",
      materials: [],
    },
  ]);

  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Список доступных платных материалов
  const availableMaterials = [
    "Семинар по Евангелию от Иоанна",
    "Курс по медитации",
    "Астрология для начинающих",
    "Таро: практический курс",
    "Основы нумерологии",
  ];

  // Проверка активна ли оплата (менее месяца назад)
  const isPaymentActive = (paymentDate?: string): boolean => {
    if (!paymentDate) return false;
    const [day, month, year] = paymentDate.split(".").map(Number);
    const paidDate = new Date(year, month - 1, day);
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return paidDate >= monthAgo;
  };

  // Фильтрация и сортировка
  let filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Фильтр по оплате
  if (paymentFilter === "active") {
    filteredUsers = filteredUsers.filter(user => user.hasPaid && isPaymentActive(user.paymentDate));
  } else if (paymentFilter === "inactive") {
    filteredUsers = filteredUsers.filter(user => !user.hasPaid || !isPaymentActive(user.paymentDate));
  }

  // Сортировка
  filteredUsers.sort((a, b) => {
    let compareValue = 0;
    
    if (sortField === "name") {
      compareValue = a.name.localeCompare(b.name);
    } else if (sortField === "surname") {
      compareValue = a.surname.localeCompare(b.surname);
    } else if (sortField === "role") {
      compareValue = a.role.localeCompare(b.role);
    } else if (sortField === "paymentDate") {
      const dateA = a.paymentDate || "01.01.1900";
      const dateB = b.paymentDate || "01.01.1900";
      const [dayA, monthA, yearA] = dateA.split(".").map(Number);
      const [dayB, monthB, yearB] = dateB.split(".").map(Number);
      const timeA = new Date(yearA, monthA - 1, dayA).getTime();
      const timeB = new Date(yearB, monthB - 1, dayB).getTime();
      compareValue = timeA - timeB;
    }

    return sortOrder === "asc" ? compareValue : -compareValue;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleRole = (id: number) => {
    setUsers(users.map((user) => {
      if (user.id === id) {
        let newRole = user.role;
        if (user.role === "USER") newRole = "ADMIN";
        else if (user.role === "ADMIN") newRole = "SUPER";
        else newRole = "USER";
        return { ...user, role: newRole };
      }
      return user;
    }));
  };

  const togglePayment = (id: number) => {
    setUsers(users.map((user) => {
      if (user.id === id) {
        const newPaidStatus = !user.hasPaid;
        return { 
          ...user, 
          hasPaid: newPaidStatus,
          paymentDate: newPaidStatus ? new Date().toLocaleDateString("ru-RU") : undefined
        };
      }
      return user;
    }));
  };

  const openManageModal = (user: User) => {
    setSelectedUser(user);
    setShowManageModal(true);
  };

  const toggleMaterial = (material: string) => {
    if (!selectedUser) return;
    
    const updatedMaterials = selectedUser.materials.includes(material)
      ? selectedUser.materials.filter(m => m !== material)
      : [...selectedUser.materials, material];
    
    setSelectedUser({ ...selectedUser, materials: updatedMaterials });
  };

  const saveMaterialsAccess = () => {
    if (!selectedUser) return;
    
    setUsers(users.map(user => 
      user.id === selectedUser.id ? selectedUser : user
    ));
    setShowManageModal(false);
    setSelectedUser(null);
  };

  const deleteUser = (id: number) => {
    if (confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center space-x-3 mb-3">
          <Users className="w-8 h-8 text-green-400" />
          <h1 className="text-4xl text-white">Пользователи</h1>
        </div>
        <p className="text-purple-200">Управление пользователями системы</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск пользователей..."
            className="w-full pl-10 pr-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* Payment Filter */}
      <div className="mb-6 bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-xl p-6 border border-pink-400/20">
        <h3 className="text-white mb-4 font-medium">Фильтр по оплате:</h3>
        <div className="flex space-x-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="paymentFilter"
              value="all"
              checked={paymentFilter === "all"}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="w-5 h-5 text-purple-600"
            />
            <span className="text-white">Все пользователи</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="paymentFilter"
              value="active"
              checked={paymentFilter === "active"}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="w-5 h-5 text-green-600"
            />
            <span className="text-white">С активной оплатой (менее месяца)</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="paymentFilter"
              value="inactive"
              checked={paymentFilter === "inactive"}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="w-5 h-5 text-red-600"
            />
            <span className="text-white">Без активной оплаты (более месяца)</span>
          </label>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-pink-400/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-pink-700 to-purple-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm text-white">№</th>
                <th 
                  className="px-4 py-3 text-left text-sm text-white cursor-pointer hover:bg-white/10 transition-colors" 
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Имя</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm text-white cursor-pointer hover:bg-white/10 transition-colors" 
                  onClick={() => handleSort("surname")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Фамилия</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm text-white">Телефон</th>
                <th 
                  className="px-4 py-3 text-left text-sm text-white cursor-pointer hover:bg-white/10 transition-colors" 
                  onClick={() => handleSort("paymentDate")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Оплата</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center text-sm text-white cursor-pointer hover:bg-white/10 transition-colors" 
                  onClick={() => handleSort("role")}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Роль</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm text-white">Пл. материалы</th>
                <th className="px-4 py-3 text-center text-sm text-white">Профиль</th>
                <th className="px-4 py-3 text-center text-sm text-white">Удалить</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredUsers.map((user, index) => (
                <tr
                  key={user.id}
                  className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="px-4 py-3 text-sm text-gray-800">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{user.surname}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{user.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    <div className="flex items-center space-x-2">
                      {user.hasPaid ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-green-700 text-xs whitespace-nowrap">{user.paymentDate}</span>
                        </>
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={user.role}
                      onChange={() => toggleRole(user.id)}
                      className={`px-3 py-1 rounded text-sm border-2 ${
                        user.role === "SUPER"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : user.role === "ADMIN"
                          ? "bg-orange-100 text-orange-800 border-orange-300"
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      }`}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPER">SUPER</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openManageModal(user)}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg flex items-center space-x-1 mx-auto"
                      title="Управлять доступом к материалам"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Управлять</span>
                    </button>
                    {user.materials.length > 0 && (
                      <span className="text-xs text-green-700 mt-1 block">{user.materials.length} пакет(ов)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg flex items-center space-x-1 mx-auto"
                      title="Просмотр профиля"
                    >
                      <UserCircle className="w-4 h-4" />
                      <span>Профиль</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg mx-auto"
                      title="Удалить пользователя"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-white">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Пользователи не найдены</p>
            </div>
          )}
        </div>
      </div>

      {/* Manage Materials Modal */}
      {showManageModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl text-white">Управление доступом</h3>
                <p className="text-green-100 text-sm">
                  {selectedUser.name} {selectedUser.surname}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedUser(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="mb-6">
                <label className="flex items-center space-x-3 mb-4 p-4 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedUser.hasPaid}
                    onChange={() => togglePayment(selectedUser.id)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-gray-800 font-medium">Оплата класса</span>
                    {selectedUser.hasPaid && selectedUser.paymentDate && (
                      <span className="ml-2 text-sm text-green-600">({selectedUser.paymentDate})</span>
                    )}
                  </div>
                </label>
              </div>

              <div>
                <h4 className="text-lg text-gray-800 mb-4">Выберите платные материалы:</h4>
                <div className="space-y-3">
                  {availableMaterials.map((material) => (
                    <label
                      key={material}
                      className="flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUser.materials.includes(material)}
                        onChange={() => toggleMaterial(material)}
                        className="w-5 h-5 text-green-600 rounded"
                      />
                      <span className="text-gray-800">{material}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedUser(null);
                }}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={saveMaterialsAccess}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}