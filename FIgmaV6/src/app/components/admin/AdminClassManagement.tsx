import { useState } from "react";
import { GraduationCap, Save, Upload, Calendar, Clock, Eye, Trash2, AlertCircle } from "lucide-react";

export function AdminClassManagement() {
  const [youtubeLink, setYoutubeLink] = useState("https://youtube.com/live/example");
  const [rutubeLink, setRutubeLink] = useState("https://rutube.ru/live/example");
  const [linksSaved, setLinksSaved] = useState(false);
  
  const [uploadForm, setUploadForm] = useState({
    title: "",
    file: null as File | null,
  });

  const [uploadedVideos, setUploadedVideos] = useState([
    {
      id: 1,
      title: "Учебный класс - Занятие #11",
      date: "21.03.2026",
      duration: "2ч 30мин",
      views: 134,
      size: "632.7 MB",
    },
  ]);

  const handleSaveLinks = () => {
    setLinksSaved(true);
    setTimeout(() => setLinksSaved(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadForm.title && uploadForm.file) {
      // Mock upload
      const newVideo = {
        id: uploadedVideos.length + 1,
        title: uploadForm.title,
        date: new Date().toLocaleDateString("ru-RU"),
        duration: "2ч 15мин",
        views: 0,
        size: (uploadForm.file.size / (1024 * 1024)).toFixed(1) + " MB",
      };
      setUploadedVideos([newVideo, ...uploadedVideos]);
      setUploadForm({ title: "", file: null });
    }
  };

  const handleDelete = (id: number) => {
    setUploadedVideos(uploadedVideos.filter((v) => v.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center space-x-3 mb-3">
          <GraduationCap className="w-8 h-8 text-green-400" />
          <h1 className="text-4xl text-white">Управление учебным классом</h1>
        </div>
        <p className="text-purple-200">Ссылки на текущую трансляцию и загрузка видео в архив</p>
      </div>

      {/* Ссылки на трансляцию */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-pink-400/20 mb-8">
        <h2 className="text-2xl text-white mb-6">Ссылки на текущую трансляцию класса</h2>
        
        <div className="bg-yellow-900/40 border border-yellow-400/30 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div className="text-yellow-200 text-sm">
              <p className="mb-2">⚠️ Эти ссылки доступны только пользователям, оплатившим класс!</p>
              <p className="text-yellow-300">Текущие ссылки:</p>
              <p>• YouTube: {youtubeLink}</p>
              <p>• Rutube: {rutubeLink}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="class-youtube" className="block text-white mb-2">
              Ссылка YouTube для класса:
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
              Ссылка Rutube для класса:
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
            <span>Обновить ссылки класса</span>
          </button>

          {linksSaved && (
            <div className="bg-green-900/40 border border-green-400/30 rounded-lg p-4 text-center">
              <p className="text-green-300">✓ Ссылки класса успешно обновлены</p>
            </div>
          )}
        </div>
      </div>

      {/* Загрузка видео в архив */}
      <div className="bg-gradient-to-br from-blue-900/60 to-purple-900/40 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-blue-400/20 mb-8">
        <h2 className="text-2xl text-white mb-6">Загрузка видео в архив класса</h2>
        
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label htmlFor="video-title" className="block text-white mb-2">
              Название файла для архива:
            </label>
            <input
              id="video-title"
              type="text"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              placeholder="Учебный класс - Занятие #12"
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="video-file" className="block text-white mb-2">
              Файл (только .mp4):
            </label>
            <div className="relative">
              <input
                id="video-file"
                type="file"
                accept=".mp4"
                onChange={handleFileChange}
                className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                required
              />
            </div>
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
            <span>Загрузить видео</span>
          </button>
        </form>

        <div className="mt-6 bg-purple-900/40 border border-purple-400/30 rounded-lg p-4">
          <p className="text-purple-200 text-sm">
            ⚠️ Внимание: Вы можем загрузить файл только mp4 формата. Файлы обрабатываются автоматически.
          </p>
        </div>
      </div>

      {/* Управление архивом */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-pink-400/20">
        <h2 className="text-2xl text-white mb-6">Управление архивом класса</h2>
        
        <div className="space-y-4">
          {uploadedVideos.map((video) => (
            <div
              key={video.id}
              className="bg-purple-950/50 border border-purple-400/30 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <h3 className="text-white text-lg mb-2">{video.title}</h3>
                <div className="flex items-center space-x-6 text-purple-300 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{video.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{video.duration}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>{video.views} просмотров</span>
                  </div>
                  <div className="text-blue-300">📁 {video.size}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                  Смотреть
                </button>
                <button
                  onClick={() => handleDelete(video.id)}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {uploadedVideos.length === 0 && (
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
              <p className="text-purple-300">Архив пуст. Загрузите первое видео.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
