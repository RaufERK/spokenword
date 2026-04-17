import { useState } from "react";
import { Upload, Calendar, Clock, Eye, Trash2, Archive, AlertCircle } from "lucide-react";

export function AdminConferenceUpload() {
  const [uploadForm, setUploadForm] = useState({
    title: "",
    file: null as File | null,
    eventId: 1,
  });

  // Список мероприятий (будет загружаться из API)
  const availableEvents = [
    { id: 1, name: "Весенняя конференция 2026", startDate: "15.04.2026" },
    { id: 2, name: "Весенний класс 2026", startDate: "20.04.2026" },
    { id: 3, name: "Зимняя конференция 2026", startDate: "15.01.2026" },
  ];

  const [conferences, setConferences] = useState([
    {
      id: 1,
      title: "Тест",
      date: "10.02.2026, 14:27:42",
      size: "632.7 MB",
      views: 0,
      status: "НЕ ВИДНО ВСЕМ",
    },
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadForm.title && uploadForm.file && uploadForm.eventId) {
      const selectedEvent = availableEvents.find(ev => ev.id === uploadForm.eventId);
      const newConference = {
        id: conferences.length + 1,
        title: uploadForm.title,
        date: new Date().toLocaleString("ru-RU"),
        size: (uploadForm.file.size / (1024 * 1024)).toFixed(1) + " MB",
        views: 0,
        status: selectedEvent ? selectedEvent.name : "НЕ ВИДНО ВСЕМ",
      };
      setConferences([newConference, ...conferences]);
      setUploadForm({ title: "", file: null, eventId: 1 });

      // Reset file input
      const fileInput = document.getElementById("conf-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Вы уверены, что хотите удалить эту конференцию?")) {
      setConferences(conferences.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center space-x-3 mb-3">
          <Archive className="w-8 h-8 text-purple-400" />
          <h1 className="text-4xl text-white">Загрузка в Архив</h1>
        </div>
        <p className="text-purple-200">Загрузка видеофайлов в архив</p>
      </div>

      {/* Upload Form */}
      <div className="bg-gradient-to-br from-blue-900/60 to-purple-900/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-blue-400/30 mb-8">
        <h2 className="text-2xl text-white mb-6">Загрузка файла в архив конференций</h2>
        
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label htmlFor="conf-title" className="block text-white mb-2">
              Название файла для архива:
            </label>
            <input
              id="conf-title"
              type="text"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              placeholder="Название конференции"
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="conf-event" className="block text-white mb-2">
              Мероприятие: *
            </label>
            <select
              id="conf-event"
              value={uploadForm.eventId}
              onChange={(e) => setUploadForm({ ...uploadForm, eventId: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            >
              {availableEvents.map(event => (
                <option key={event.id} value={event.id} className="bg-purple-900">
                  {event.name} ({event.startDate})
                </option>
              ))}
            </select>
            <p className="text-purple-300 text-sm mt-2">
              Видео будет доступно только пользователям, оплатившим это мероприятие
            </p>
          </div>

          <div>
            <label htmlFor="conf-file" className="block text-white mb-2">
              Файл (только .mp4):
            </label>
            <div className="relative">
              <input
                id="conf-file"
                type="file"
                accept=".mp4"
                onChange={handleFileChange}
                className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                required
              />
            </div>
            {!uploadForm.file && (
              <p className="text-purple-300 text-sm mt-2">Choose file No file chosen</p>
            )}
            {uploadForm.file && (
              <p className="text-green-300 text-sm mt-2">
                Выбран файл: {uploadForm.file.name} ({(uploadForm.file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Загрузить</span>
          </button>
        </form>

        <div className="mt-6 bg-yellow-900/40 border border-yellow-400/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-200 text-sm">
              Внимание: Вы можете загрузить только видеофайл, следующих типов: mp4. Файлы обрабатываются в очередь.
            </p>
          </div>
        </div>
      </div>

      {/* Conference List */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-pink-400/20 overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl text-white mb-6">Управление архивом конференций</h2>
          
          <div className="space-y-4">
            {conferences.map((conference) => (
              <div
                key={conference.id}
                className="bg-white rounded-lg p-6 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl text-gray-800 mb-2">{conference.title}</h3>
                    <div className="flex items-center space-x-6 text-gray-600 text-sm mb-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Создано: {conference.date}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>📁 {conference.size}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span>{conference.views} просмотров</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600 text-sm">✖ {conference.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition-colors text-sm">
                    Смотреть
                  </button>
                  <button
                    onClick={() => handleDelete(conference.id)}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg transition-colors text-sm"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}

            {conferences.length === 0 && (
              <div className="text-center py-12">
                <Archive className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
                <p className="text-purple-300">Архив конференций пуст</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}