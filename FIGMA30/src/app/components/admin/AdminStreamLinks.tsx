import { useState } from "react";
import { Link2, Save, AlertCircle, Trash2 } from "lucide-react";

export function AdminStreamLinks() {
  const [youtubeLink, setYoutubeLink] = useState("https://youtu.be/vU1KQ7HnA");
  const [rutubeLink, setRutubeLink] = useState("https://rutube.ru/video/d053422c4c6f2220c60e066de48a529/");
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleSave = () => {
    // Mock save
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDelete = () => {
    if (confirm("Вы уверены, что хотите удалить все ссылки стрима?")) {
      setYoutubeLink("");
      setRutubeLink("");
      setDeleted(true);
      setTimeout(() => setDeleted(false), 3000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl text-white mb-3">Управление ссылками на трансляцию</h1>
        <p className="text-purple-200">Ссылки для открытых мероприятий (Службы)</p>
      </div>

      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-pink-400/20">
        <div className="bg-blue-900/40 border border-blue-400/30 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
            <div className="text-blue-200 text-sm">
              <p className="mb-2">Текущие активные ссылки:</p>
              <p className="text-green-300">• YouTube: {youtubeLink || "не установлена"}</p>
              <p className="text-green-300">• Rutube: {rutubeLink || "не установлена"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="youtube" className="block text-white mb-2">
              Ссылка на YouTube:
            </label>
            <input
              id="youtube"
              type="url"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="https://youtu.be/vU1KQ7HnA"
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="rutube" className="block text-white mb-2">
              Ссылка на Rutube:
            </label>
            <input
              id="rutube"
              type="url"
              value={rutubeLink}
              onChange={(e) => setRutubeLink(e.target.value)}
              placeholder="https://rutube.ru/video/..."
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>Обновить ссылки</span>
          </button>

          {saved && (
            <div className="bg-green-900/40 border border-green-400/30 rounded-lg p-4 text-center">
              <p className="text-green-300">✓ Ссылки успешно обновлены</p>
            </div>
          )}

          <button
            onClick={handleDelete}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-5 h-5" />
            <span>Удалить все ссылки</span>
          </button>

          {deleted && (
            <div className="bg-red-900/40 border border-red-400/30 rounded-lg p-4 text-center">
              <p className="text-red-300">✓ Ссылки успешно удалены</p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-purple-900/40 border border-purple-400/30 rounded-lg p-6">
          <h3 className="text-white text-lg mb-3">Инструкция:</h3>
          <ul className="text-purple-200 space-y-2 text-sm">
            <li>• Вставьте ссылки на YouTube и Rutube для открытых мероприятий</li>
            <li>• Можно заполнить одну или обе ссылки</li>
            <li>• Ссылки будут отображаться на главной странице</li>
            <li>• Аудиотрансляция отображается автоматически (https://audio.spoken-word.ru)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}