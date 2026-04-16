import { useState } from "react";
import { Users, Search, CheckCircle, XCircle, X, Settings, UserCircle, Trash2, ArrowUpDown, Plus, Filter, User } from "lucide-react";

interface User {
  id: number;
  name: string;
  surname: string;
  login: string;
  city: string;
  phone: string;
  hasPaid: boolean;
  paymentDate?: string;
  role: string;
  materials: string[];
}

type SortField = "name" | "surname" | "login" | "city" | "paymentDate" | "role";
type SortOrder = "asc" | "desc";
type PaymentFilter = "all" | "active" | "inactive" | "new" | "admins";

export function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const [users, setUsers] = useState<User[]>([
    { id: 1, name: "Елеонора", surname: "Брагиш", login: "eleonora", city: "Москва", phone: "37369372743", hasPaid: true, paymentDate: "15.03.2026", role: "USER", materials: ["Семинар по Евангелию от Иоанна"] },
    { id: 2, name: "Алексей", surname: "Карсунцев", login: "alexey", city: "Санкт-Петербург", phone: "79277835867", hasPaid: true, paymentDate: "20.02.2026", role: "USER", materials: [] },
    { id: 3, name: "Ирина", surname: "Білінок Salenska", login: "irina", city: "Киев", phone: "34667870473", hasPaid: false, role: "USER", materials: [] },
    { id: 4, name: "Rauf", surname: "Erk", login: "rauf", city: "Москва", phone: "+79629483300", hasPaid: true, paymentDate: "01.01.2026", role: "SUPER", materials: [] },
    { id: 5, name: "Мария", surname: "Иванова", login: "maria_i", city: "Москва", phone: "+79161234567", hasPaid: true, paymentDate: "10.04.2026", role: "USER", materials: [] },
    { id: 6, name: "Дмитрий", surname: "Петров", login: "dmitry_p", city: "Екатеринбург", phone: "+79267894561", hasPaid: false, role: "USER", materials: [] },
    { id: 7, name: "Анна", surname: "Смирнова", login: "anna_s", city: "Казань", phone: "+79151112233", hasPaid: true, paymentDate: "05.04.2026", role: "ADMIN", materials: [] },
    { id: 8, name: "Сергей", surname: "Кузнецов", login: "sergey_k", city: "Новосибирск", phone: "+79034445566", hasPaid: false, role: "USER", materials: [] },
    { id: 9, name: "Ольга", surname: "Попова", login: "olga_p", city: "Санкт-Петербург", phone: "+79217778899", hasPaid: true, paymentDate: "12.04.2026", role: "USER", materials: [] },
    { id: 10, name: "Павел", surname: "Соколов", login: "pavel_s", city: "Краснодар", phone: "+79180001122", hasPaid: false, role: "USER", materials: [] },
    { id: 11, name: "Екатерина", surname: "Морозова", login: "ekaterina_m", city: "Воронеж", phone: "+79204445566", hasPaid: true, paymentDate: "08.04.2026", role: "USER", materials: [] },
    { id: 12, name: "Андрей", surname: "Волков", login: "andrey_v", city: "Самара", phone: "+79277778899", hasPaid: false, role: "USER", materials: [] },
    { id: 13, name: "Наталья", surname: "Новикова", login: "natalia_n", city: "Омск", phone: "+79135556677", hasPaid: true, paymentDate: "14.04.2026", role: "USER", materials: [] },
    { id: 14, name: "Игорь", surname: "Федоров", login: "igor_f", city: "Ростов-на-Дону", phone: "+79198889900", hasPaid: false, role: "USER", materials: [] },
    { id: 15, name: "Светлана", surname: "Михайлова", login: "svetlana_m", city: "Уфа", phone: "+79171112233", hasPaid: true, paymentDate: "11.04.2026", role: "USER", materials: [] },
    { id: 16, name: "Виктор", surname: "Васильев", login: "viktor_v", city: "Пермь", phone: "+79224445566", hasPaid: false, role: "USER", materials: [] },
    { id: 17, name: "Татьяна", surname: "Павлова", login: "tatiana_p", city: "Волгоград", phone: "+79057778899", hasPaid: true, paymentDate: "09.04.2026", role: "USER", materials: [] },
    { id: 18, name: "Николай", surname: "Семенов", login: "nikolai_s", city: "Красноярск", phone: "+79139990011", hasPaid: false, role: "USER", materials: [] },
    { id: 19, name: "Юлия", surname: "Козлова", login: "yulia_k", city: "Тюмень", phone: "+79222223344", hasPaid: true, paymentDate: "13.04.2026", role: "USER", materials: [] },
    { id: 20, name: "Владимир", surname: "Романов", login: "vladimir_r", city: "Иркутск", phone: "+79145556677", hasPaid: false, role: "USER", materials: [] },
    { id: 21, name: "Елена", surname: "Соловьева", login: "elena_s", city: "Хабаровск", phone: "+79218889900", hasPaid: true, paymentDate: "07.04.2026", role: "USER", materials: [] },
    { id: 22, name: "Максим", surname: "Лебедев", login: "maxim_l", city: "Владивосток", phone: "+79021112233", hasPaid: false, role: "USER", materials: [] },
    { id: 23, name: "Людмила", surname: "Егорова", login: "ludmila_e", city: "Челябинск", phone: "+79194445566", hasPaid: true, paymentDate: "06.04.2026", role: "USER", materials: [] },
    { id: 24, name: "Артем", surname: "Макаров", login: "artem_m", city: "Саратов", phone: "+79277778899", hasPaid: false, role: "USER", materials: [] },
    { id: 25, name: "Вера", surname: "Кириллова", login: "vera_k", city: "Тула", phone: "+79100001122", hasPaid: true, paymentDate: "04.04.2026", role: "USER", materials: [] },
    { id: 26, name: "Станислав", surname: "Захаров", login: "stanislav_z", city: "Ярославль", phone: "+79153334455", hasPaid: false, role: "USER", materials: [] },
    { id: 27, name: "Валентина", surname: "Григорьева", login: "valentina_g", city: "Тверь", phone: "+79206667788", hasPaid: true, paymentDate: "03.04.2026", role: "USER", materials: [] },
    { id: 28, name: "Евгений", surname: "Степанов", login: "evgeniy_s", city: "Барнаул", phone: "+79139990011", hasPaid: false, role: "USER", materials: [] },
    { id: 29, name: "Галина", surname: "Белова", login: "galina_b", city: "Владимир", phone: "+79221112233", hasPaid: true, paymentDate: "02.04.2026", role: "USER", materials: [] },
    { id: 30, name: "Роман", surname: "Орлов", login: "roman_o", city: "Калининград", phone: "+79054445566", hasPaid: false, role: "USER", materials: [] },
    { id: 31, name: "Инна", surname: "Никитина", login: "inna_n", city: "Сочи", phone: "+79187778899", hasPaid: true, paymentDate: "01.04.2026", role: "USER", materials: [] },
    { id: 32, name: "Константин", surname: "Борисов", login: "konstantin_b", city: "Рязань", phone: "+79208889900", hasPaid: false, role: "USER", materials: [] },
    { id: 33, name: "Лариса", surname: "Антонова", login: "larisa_a", city: "Пенза", phone: "+79150001122", hasPaid: true, paymentDate: "31.03.2026", role: "USER", materials: [] },
    { id: 34, name: "Вячеслав", surname: "Ильин", login: "vyacheslav_i", city: "Липецк", phone: "+79223334455", hasPaid: false, role: "USER", materials: [] },
    { id: 35, name: "Зинаида", surname: "Данилова", login: "zinaida_d", city: "Киров", phone: "+79056667788", hasPaid: true, paymentDate: "30.03.2026", role: "USER", materials: [] },
    { id: 36, name: "Олег", surname: "Тимофеев", login: "oleg_t", city: "Чебоксары", phone: "+79199990011", hasPaid: false, role: "USER", materials: [] },
    { id: 37, name: "Раиса", surname: "Филиппова", login: "raisa_f", city: "Астрахань", phone: "+79211112233", hasPaid: true, paymentDate: "29.03.2026", role: "USER", materials: [] },
    { id: 38, name: "Леонид", surname: "Комаров", login: "leonid_k", city: "Ульяновск", phone: "+79024445566", hasPaid: false, role: "USER", materials: [] },
    { id: 39, name: "Алла", surname: "Сидорова", login: "alla_s", city: "Курск", phone: "+79197778899", hasPaid: true, paymentDate: "28.03.2026", role: "USER", materials: [] },
    { id: 40, name: "Геннадий", surname: "Матвеев", login: "gennadiy_m", city: "Магнитогорск", phone: "+79278889900", hasPaid: false, role: "USER", materials: [] },
    { id: 41, name: "Нина", surname: "Сергеева", login: "nina_s", city: "Сургут", phone: "+79100001122", hasPaid: true, paymentDate: "27.03.2026", role: "USER", materials: [] },
    { id: 42, name: "Борис", surname: "Денисов", login: "boris_d", city: "Томск", phone: "+79153334455", hasPaid: false, role: "USER", materials: [] },
    { id: 43, name: "Тамара", surname: "Афанасьева", login: "tamara_a", city: "Иваново", phone: "+79206667788", hasPaid: true, paymentDate: "26.03.2026", role: "USER", materials: [] },
    { id: 44, name: "Валерий", surname: "Медведев", login: "valeriy_m", city: "Брянск", phone: "+79139990011", hasPaid: false, role: "USER", materials: [] },
    { id: 45, name: "Маргарита", surname: "Дмитриева", login: "margarita_d", city: "Орел", phone: "+79221112233", hasPaid: true, paymentDate: "25.03.2026", role: "USER", materials: [] },
    { id: 46, name: "Анатолий", surname: "Калинин", login: "anatoliy_k", city: "Белгород", phone: "+79054445566", hasPaid: false, role: "USER", materials: [] },
    { id: 47, name: "Любовь", surname: "Яковлева", login: "lubov_y", city: "Смоленск", phone: "+79187778899", hasPaid: true, paymentDate: "24.03.2026", role: "USER", materials: [] },
    { id: 48, name: "Григорий", surname: "Марков", login: "grigoriy_m", city: "Тамбов", phone: "+79208889900", hasPaid: false, role: "USER", materials: [] },
    { id: 49, name: "Клавдия", surname: "Виноградова", login: "klavdia_v", city: "Кострома", phone: "+79150001122", hasPaid: true, paymentDate: "23.03.2026", role: "USER", materials: [] },
    { id: 50, name: "Федор", surname: "Алексеев", login: "fedor_a", city: "Вологда", phone: "+79223334455", hasPaid: false, role: "USER", materials: [] },
  ]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUserId, setPaymentUserId] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number>(1);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileLinks, setProfileLinks] = useState({ linkRF: "", linkNonRF: "" });
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"USER" | "ADMIN" | "SUPER">("USER");

  // Список мероприятий (будет загружаться из API)
  const availableEvents = [
    { id: 1, name: "Весенняя конференция 2026", startDate: "15.04.2026" },
    { id: 2, name: "Весенний класс 2026", startDate: "20.04.2026" },
    { id: 3, name: "Зимняя конференция 2026", startDate: "15.01.2026" },
  ];

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
  } else if (paymentFilter === "new") {
    filteredUsers = filteredUsers.filter(user => !user.hasPaid);
  } else if (paymentFilter === "admins") {
    filteredUsers = filteredUsers.filter(user => user.role === "ADMIN" || user.role === "SUPER");
  }

  // Сортировка
  filteredUsers.sort((a, b) => {
    let compareValue = 0;
    
    if (sortField === "name") {
      compareValue = a.name.localeCompare(b.name);
    } else if (sortField === "surname") {
      compareValue = a.surname.localeCompare(b.surname);
    } else if (sortField === "login") {
      compareValue = a.login.localeCompare(b.login);
    } else if (sortField === "city") {
      compareValue = a.city.localeCompare(b.city);
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

  const openPaymentModal = (id: number) => {
    setPaymentUserId(id);
    setShowPaymentModal(true);
  };

  const activatePayment = () => {
    if (paymentUserId === null) return;

    setUsers(users.map((user) => {
      if (user.id === paymentUserId) {
        return {
          ...user,
          hasPaid: true,
          paymentDate: new Date().toLocaleDateString("ru-RU")
        };
      }
      return user;
    }));

    setShowPaymentModal(false);
    setPaymentUserId(null);
  };

  const revokePayment = (id: number) => {
    if (confirm("Вы уверены, что хотите отозвать оплату?")) {
      setUsers(users.map((user) => {
        if (user.id === id) {
          return {
            ...user,
            hasPaid: false,
            paymentDate: undefined
          };
        }
        return user;
      }));
    }
  };

  const showProfileLinks = () => {
    const linkRF = "https://profile.example.com/rf/user123";
    const linkNonRF = "https://profile.example.com/global/user123";
    setProfileLinks({ linkRF, linkNonRF });
    setShowProfileModal(true);
  };

  const copyToClipboard = (text: string) => {
    // Fallback метод для копирования
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
    document.body.removeChild(textArea);
  };

  const massDeleteUsers = () => {
    if (selectedUserIds.length === 0) return;
    if (confirm(`Вы уверены, что хотите удалить ${selectedUserIds.length} пользователей?`)) {
      setUsers(users.filter(u => !selectedUserIds.includes(u.id)));
      setSelectedUserIds([]);
    }
  };

  const openMaterialsModal = () => {
    if (selectedUserIds.length === 0) return;
    setShowMaterialsModal(true);
  };

  const applyMaterials = () => {
    setUsers(users.map(user =>
      selectedUserIds.includes(user.id)
        ? { ...user, materials: selectedMaterials }
        : user
    ));
    setShowMaterialsModal(false);
    setSelectedMaterials([]);
    setSelectedUserIds([]);
  };

  const toggleMaterial = (material: string) => {
    if (selectedMaterials.includes(material)) {
      setSelectedMaterials(selectedMaterials.filter(m => m !== material));
    } else {
      setSelectedMaterials([...selectedMaterials, material]);
    }
  };

  const openRoleModal = () => {
    if (selectedUserIds.length === 0) return;
    setShowRoleModal(true);
  };

  const applyRole = () => {
    setUsers(users.map(user =>
      selectedUserIds.includes(user.id)
        ? { ...user, role: selectedRole }
        : user
    ));
    setShowRoleModal(false);
    setSelectedRole("USER");
    setSelectedUserIds([]);
  };

  // Массовые операции
  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: number) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(uid => uid !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const massActivatePayment = () => {
    if (selectedUserIds.length === 0) return;
    if (confirm(`Активировать оплату для ${selectedUserIds.length} пользователей?`)) {
      setUsers(users.map(user =>
        selectedUserIds.includes(user.id)
          ? { ...user, hasPaid: true, paymentDate: new Date().toLocaleDateString("ru-RU") }
          : user
      ));
      setSelectedUserIds([]);
    }
  };

  const massRevokePayment = () => {
    if (selectedUserIds.length === 0) return;
    if (confirm(`Отозвать оплату для ${selectedUserIds.length} пользователей?`)) {
      setUsers(users.map(user =>
        selectedUserIds.includes(user.id)
          ? { ...user, hasPaid: false, paymentDate: undefined }
          : user
      ));
      setSelectedUserIds([]);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Компактная панель управления */}
      <div className="mb-4 bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-xl p-4 border border-pink-400/20">
        <div className="flex flex-wrap items-center gap-3">
          {/* Поиск */}
          <div className="relative flex-grow min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-9 pr-3 py-2 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white text-sm placeholder-purple-300/50 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Фильтр по оплате */}
          <div className="flex items-center space-x-2 bg-purple-950/50 rounded-lg px-3 py-2 border border-purple-400/30">
            <Filter className="w-4 h-4 text-purple-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
            >
              <option value="all">Все</option>
              <option value="active">С оплатой</option>
              <option value="inactive">Без оплаты</option>
              <option value="new">Новые</option>
              <option value="admins">Админы</option>
            </select>
          </div>

          {/* Массовые операции - всегда видны */}
          <div className="text-purple-200 text-sm px-2">
            Выбрано: {selectedUserIds.length}
          </div>
          <button
            onClick={massActivatePayment}
            disabled={selectedUserIds.length === 0}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg flex items-center space-x-1"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Дать доступ</span>
          </button>
          <button
            onClick={massRevokePayment}
            disabled={selectedUserIds.length === 0}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg flex items-center space-x-1"
          >
            <XCircle className="w-4 h-4" />
            <span>Отозвать доступ</span>
          </button>
          <button
            onClick={openMaterialsModal}
            disabled={selectedUserIds.length === 0}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg flex items-center space-x-1"
          >
            <Settings className="w-4 h-4" />
            <span>Платный контент</span>
          </button>
          <button
            onClick={openRoleModal}
            disabled={selectedUserIds.length === 0}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg flex items-center space-x-1"
          >
            <User className="w-4 h-4" />
            <span>Роль</span>
          </button>
          <button
            onClick={massDeleteUsers}
            disabled={selectedUserIds.length === 0}
            className="bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg flex items-center space-x-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>Удалить</span>
          </button>
        </div>
      </div>

      {/* Users Table с фиксированным заголовком */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-pink-400/20 overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-200px)] relative">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-pink-700 to-purple-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-center text-sm text-white">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
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
                <th 
                  className="px-4 py-3 text-left text-sm text-white cursor-pointer hover:bg-white/10 transition-colors" 
                  onClick={() => handleSort("login")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Логин</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm text-white cursor-pointer hover:bg-white/10 transition-colors" 
                  onClick={() => handleSort("city")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Город</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm text-white">Телефон</th>
                <th
                  className="px-4 py-3 text-left text-sm text-white cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => handleSort("paymentDate")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Дата оплаты</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm text-white">Управление</th>
                <th className="px-4 py-3 text-center text-sm text-white">Профиль</th>
              </tr>
            </thead>
            <tbody className="bg-purple-900/30">
              {filteredUsers.map((user, index) => {
                // Упрощенная цветовая схема - только чередование строк
                const rowClass = index % 2 === 0
                  ? "bg-purple-950/20 hover:bg-purple-950/30"
                  : "bg-purple-950/10 hover:bg-purple-950/20";

                return (
                  <tr
                    key={user.id}
                    className={`transition-colors border-b border-purple-800/20 ${rowClass}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-white">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-white">{user.surname}</td>
                    <td className="px-4 py-3 text-sm text-white">{user.login}</td>
                    <td className="px-4 py-3 text-sm text-white">{user.city}</td>
                    <td className="px-4 py-3 text-sm text-white">{user.phone}</td>
                    <td className="px-4 py-3 text-sm text-white">
                      {user.hasPaid && user.paymentDate ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-white text-sm">{user.paymentDate}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.hasPaid ? (
                        <button
                          onClick={() => revokePayment(user.id)}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-3 py-1 rounded text-xs transition-all shadow-sm hover:shadow-md flex items-center space-x-1 mx-auto"
                          title="Отозвать оплату"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Отозвать</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openPaymentModal(user.id)}
                          className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-3 py-1 rounded text-xs font-bold transition-all shadow-sm hover:shadow-md flex items-center space-x-1 mx-auto"
                          title="Активировать оплату"
                        >
                          <Plus className="w-3 h-3" />
                          <span>ОПЛАТА</span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={showProfileLinks}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg flex items-center space-x-1 mx-auto"
                        title="Показать ссылки на профиль"
                      >
                        <UserCircle className="w-4 h-4" />
                        <span>Профиль</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-purple-900/30">
              <Users className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <p className="text-purple-200">Пользователи не найдены</p>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно управления платными материалами (массово) */}
      {showMaterialsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-white" />
                <h3 className="text-xl text-white">Управление доступом к платному контенту</h3>
              </div>
              <button
                onClick={() => {
                  setShowMaterialsModal(false);
                  setSelectedMaterials([]);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  Выбрано пользователей: <strong>{selectedUserIds.length}</strong>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Отметьте материалы, к которым нужно дать доступ выбранным пользователям
                </p>
              </div>

              <div className="space-y-3">
                {availableMaterials.map((material) => (
                  <label
                    key={material}
                    className="flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMaterials.includes(material)}
                      onChange={() => toggleMaterial(material)}
                      className="w-5 h-5 text-purple-600 rounded"
                    />
                    <span className="text-gray-800">{material}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowMaterialsModal(false);
                  setSelectedMaterials([]);
                }}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={applyMaterials}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно активации оплаты */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-white" />
                <h3 className="text-xl text-white">Активация оплаты</h3>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentUserId(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-gray-700 mb-3 font-medium">Выберите мероприятие:</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none text-gray-800"
              >
                {availableEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.startDate})
                  </option>
                ))}
              </select>

              <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  Пользователь получит доступ к архиву выбранного мероприятия на 1 месяц с текущей даты.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentUserId(null);
                }}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={activatePayment}
                className="px-6 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-bold"
              >
                Активировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно со ссылками профиля */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <UserCircle className="w-6 h-6 text-white" />
                <h3 className="text-xl text-white">Ссылки на профиль пользователя</h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Ссылка для доступа из РФ:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={profileLinks.linkRF}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(profileLinks.linkRF)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg"
                  >
                    Копировать
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2 font-medium">Ссылка для доступа вне РФ:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={profileLinks.linkNonRF}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(profileLinks.linkNonRF)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg"
                  >
                    Копировать
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <p className="text-sm text-gray-700">
                  <strong>Примечание:</strong> Используйте соответствующую ссылку в зависимости от местоположения пользователя.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-2xl">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно назначения роли (массово) */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <User className="w-6 h-6 text-white" />
                <h3 className="text-xl text-white">Назначение роли</h3>
              </div>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedRole("USER");
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  Выбрано пользователей: <strong>{selectedUserIds.length}</strong>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Выберите роль, которую нужно назначить выбранным пользователям
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors border-2 border-transparent has-[:checked]:border-blue-500">
                  <input
                    type="radio"
                    name="role"
                    value="USER"
                    checked={selectedRole === "USER"}
                    onChange={(e) => setSelectedRole(e.target.value as "USER" | "ADMIN" | "SUPER")}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="text-gray-800 font-medium">USER</span>
                    <p className="text-sm text-gray-600">Обычный пользователь</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg cursor-pointer transition-colors border-2 border-transparent has-[:checked]:border-orange-500">
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={selectedRole === "ADMIN"}
                    onChange={(e) => setSelectedRole(e.target.value as "USER" | "ADMIN" | "SUPER")}
                    className="w-5 h-5 text-orange-600"
                  />
                  <div className="flex-1">
                    <span className="text-gray-800 font-medium">ADMIN</span>
                    <p className="text-sm text-gray-600">Администратор</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-4 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-colors border-2 border-transparent has-[:checked]:border-red-500">
                  <input
                    type="radio"
                    name="role"
                    value="SUPER"
                    checked={selectedRole === "SUPER"}
                    onChange={(e) => setSelectedRole(e.target.value as "USER" | "ADMIN" | "SUPER")}
                    className="w-5 h-5 text-red-600"
                  />
                  <div className="flex-1">
                    <span className="text-gray-800 font-medium">SUPER</span>
                    <p className="text-sm text-gray-600">Супер-администратор</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedRole("USER");
                }}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={applyRole}
                className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Назначить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}