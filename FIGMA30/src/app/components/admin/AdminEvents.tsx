import { useState } from "react";
import { Calendar, Plus, Users, Video, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";

interface Event {
  id: number;
  name: string;
  type: "conference" | "class";
  format: "online" | "offline";
  startDate: string;
  status: "upcoming" | "active" | "completed";
  paidUsers: number;
  videosCount: number;
}

export function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([
    {
      id: 1,
      name: "Весенняя конференция 2026",
      type: "conference",
      format: "online",
      startDate: "15.04.2026",
      status: "upcoming",
      paidUsers: 23,
      videosCount: 0,
    },
    {
      id: 2,
      name: "Весенний класс 2026",
      type: "class",
      format: "offline",
      startDate: "20.04.2026",
      status: "upcoming",
      paidUsers: 12,
      videosCount: 0,
    },
    {
      id: 3,
      name: "Зимняя конференция 2026",
      type: "conference",
      format: "online",
      startDate: "15.01.2026",
      status: "completed",
      paidUsers: 45,
      videosCount: 8,
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: "",
    type: "conference" as "conference" | "class",
    format: "online" as "online" | "offline",
    startDate: "",
  });

  const createEvent = () => {
    if (!newEvent.name || !newEvent.startDate) {
      alert("Заполните все обязательные поля");
      return;
    }

    const event: Event = {
      id: events.length + 1,
      name: newEvent.name,
      type: newEvent.type,
      format: newEvent.format,
      startDate: newEvent.startDate,
      status: "upcoming",
      paidUsers: 0,
      videosCount: 0,
    };

    setEvents([event, ...events]);
    setShowCreateModal(false);
    setNewEvent({ name: "", type: "conference", format: "online", startDate: "" });
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const updateEvent = () => {
    if (!editingEvent) return;

    if (!editingEvent.name || !editingEvent.startDate) {
      alert("Заполните все обязательные поля");
      return;
    }

    setEvents(events.map(e => e.id === editingEvent.id ? editingEvent : e));
    setShowEditModal(false);
    setEditingEvent(null);
  };

  const deleteEvent = (id: number) => {
    if (confirm("Вы уверены, что хотите удалить это мероприятие?")) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const formatDateForInput = (dateStr: string): string => {
    // Конвертирует "15.04.2026" в "2026-04-15"
    const parts = dateStr.split(".");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return "";
  };

  const formatDateFromInput = (dateStr: string): string => {
    // Конвертирует "2026-04-15" в "15.04.2026"
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU");
  };

  const getStatusBadge = (status: Event["status"]) => {
    if (status === "upcoming") {
      return <span className="px-2 py-1 bg-blue-600/80 text-blue-100 rounded text-xs">Предстоящее</span>;
    } else if (status === "active") {
      return <span className="px-2 py-1 bg-green-600/80 text-green-100 rounded text-xs">Активное</span>;
    } else {
      return <span className="px-2 py-1 bg-gray-600/80 text-gray-100 rounded text-xs">Завершено</span>;
    }
  };

  const getTypeBadge = (type: Event["type"]) => {
    return type === "conference"
      ? <span className="px-2 py-1 bg-purple-600/80 text-purple-100 rounded text-xs">Конференция</span>
      : <span className="px-2 py-1 bg-orange-600/80 text-orange-100 rounded text-xs">Класс</span>;
  };

  const getFormatBadge = (format: Event["format"]) => {
    return format === "online"
      ? <span className="px-2 py-1 bg-indigo-600/80 text-indigo-100 rounded text-xs">Онлайн</span>
      : <span className="px-2 py-1 bg-pink-600/80 text-pink-100 rounded text-xs">Очное</span>;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Заголовок и кнопка создания */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl text-white">Мероприятия</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Создать мероприятие</span>
        </button>
      </div>

      {/* Список мероприятий */}
      <div className="grid grid-cols-1 gap-4">
        {events.map(event => (
          <div
            key={event.id}
            className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-xl p-6 border border-pink-400/20 hover:border-pink-400/40 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className="text-xl text-white font-medium">{event.name}</h3>
                  {getStatusBadge(event.status)}
                  {getTypeBadge(event.type)}
                  {getFormatBadge(event.format)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-300" />
                    <div>
                      <div className="text-xs text-purple-300">Дата начала</div>
                      <div className="text-sm text-white">{event.startDate}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-300" />
                    <div>
                      <div className="text-xs text-purple-300">Оплатили</div>
                      <div className="text-sm text-white">{event.paidUsers} чел.</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Video className="w-4 h-4 text-blue-300" />
                    <div>
                      <div className="text-xs text-purple-300">Видео в архиве</div>
                      <div className="text-sm text-white">{event.videosCount} шт.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => openEditModal(event)}
                  className="bg-blue-600/80 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                  title="Редактировать"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteEvent(event.id)}
                  className="bg-red-600/80 hover:bg-red-700 text-white p-2 rounded transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12 bg-purple-900/30 rounded-xl">
          <Calendar className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <p className="text-purple-200">Мероприятия не найдены</p>
        </div>
      )}

      {/* Модальное окно создания мероприятия */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <Plus className="w-6 h-6 text-white" />
                <h3 className="text-xl text-white">Создать новое мероприятие</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Название мероприятия *</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  placeholder="Например: Весенняя конференция 2026"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Тип мероприятия *</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as "conference" | "class" })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    <option value="conference">Конференция</option>
                    <option value="class">Класс</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Формат *</label>
                  <select
                    value={newEvent.format}
                    onChange={(e) => setNewEvent({ ...newEvent, format: e.target.value as "online" | "offline" })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    <option value="online">Онлайн</option>
                    <option value="offline">Очное</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Дата начала *</label>
                <input
                  type="date"
                  onChange={(e) => setNewEvent({ ...newEvent, startDate: formatDateFromInput(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Примечание:</strong> После создания мероприятия оно станет доступным для выбора при активации оплаты пользователей.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={createEvent}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования мероприятия */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <Edit className="w-6 h-6 text-white" />
                <h3 className="text-xl text-white">Редактировать мероприятие</h3>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Название мероприятия *</label>
                <input
                  type="text"
                  value={editingEvent.name}
                  onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                  placeholder="Например: Весенняя конференция 2026"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Тип мероприятия *</label>
                  <select
                    value={editingEvent.type}
                    onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value as "conference" | "class" })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="conference">Конференция</option>
                    <option value="class">Класс</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Формат *</label>
                  <select
                    value={editingEvent.format}
                    onChange={(e) => setEditingEvent({ ...editingEvent, format: e.target.value as "online" | "offline" })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="online">Онлайн</option>
                    <option value="offline">Очное</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Дата начала *</label>
                <input
                  type="date"
                  value={formatDateForInput(editingEvent.startDate)}
                  onChange={(e) => setEditingEvent({ ...editingEvent, startDate: formatDateFromInput(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                }}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={updateEvent}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
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
