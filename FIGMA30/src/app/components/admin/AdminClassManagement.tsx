import { useState } from "react";
import { GraduationCap, Save, AlertCircle, Trash2 } from "lucide-react";

export function AdminClassManagement() {
  const [youtubeLink, setYoutubeLink] = useState(() => {
    return localStorage.getItem("conferenceYoutubeLink") || "https://youtube.com/live/example";
  });
  const [rutubeLink, setRutubeLink] = useState(() => {
    return localStorage.getItem("conferenceRutubeLink") || "https://rutube.ru/live/example";
  });
  const [linksSaved, setLinksSaved] = useState(false);
  const [linksDeleted, setLinksDeleted] = useState(false);

  const handleSaveLinks = () => {
    // Сохраняем ссылки в localStorage
    localStorage.setItem("conferenceYoutubeLink", youtubeLink);
    localStorage.setItem("conferenceRutubeLink", rutubeLink);
    setLinksSaved(true);
    setTimeout(() => setLinksSaved(false), 3000);
  };

  const handleDeleteLinks = () => {
    if (confirm("Вы уверены, что хотите удалить все ссылки конференции?")) {
      setYoutubeLink("");
      setRutubeLink("");
      // Удаляем ссылки из localStorage
      localStorage.setItem("conferenceYoutubeLink", "");
      localStorage.setItem("conferenceRutubeLink", "");
      setLinksDeleted(true);
      setTimeout(() => setLinksDeleted(false), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center space-x-3 mb-3">
          <GraduationCap className="w-8 h-8 text-green-400" />
          <h1 className="text-4xl text-white">Ссылки на конференцию</h1>
        </div>
        <p className="text-purple-200">Ссылки на текущую трансляцию конференции</p>
      </div>

      {/* Ссылки на трансляцию */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-pink-400/20 mb-8">
        <h2 className="text-2xl text-white mb-6">Ссылки на трансляцию конференции</h2>
        
        <div className="bg-yellow-900/40 border border-yellow-400/30 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div className="text-yellow-200 text-sm">
              <p className="mb-2">⚠️ Эти ссылки доступны только пользователям, оплатившим класс!</p>
              <p className="text-yellow-300">Текущие ссылки:</p>
              <p>• YouTube: {youtubeLink || "не установлена"}</p>
              <p>• Rutube: {rutubeLink || "не установлена"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="class-youtube" className="block text-white mb-2">
              Ссылка YouTube для конференции:
            </label>
            <input
              id="class-youtube"
              type="url"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="https://youtube.com/live/..."
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="class-rutube" className="block text-white mb-2">
              Ссылка Rutube для конференции:
            </label>
            <input
              id="class-rutube"
              type="url"
              value={rutubeLink}
              onChange={(e) => setRutubeLink(e.target.value)}
              placeholder="https://rutube.ru/live/..."
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <button
            onClick={handleSaveLinks}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>Обновить ссылки конференции</span>
          </button>

          {linksSaved && (
            <div className="bg-green-900/40 border border-green-400/30 rounded-lg p-4 text-center">
              <p className="text-green-300">✓ Ссылки конференции успешно обновлены</p>
            </div>
          )}

          <button
            onClick={handleDeleteLinks}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-5 h-5" />
            <span>Удалить все ссылки</span>
          </button>

          {linksDeleted && (
            <div className="bg-red-900/40 border border-red-400/30 rounded-lg p-4 text-center">
              <p className="text-red-300">✓ Ссылки конференции успешно удалены</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}