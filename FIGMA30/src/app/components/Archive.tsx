import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Archive as ArchiveIcon, Calendar, Clock, Eye, PlayCircle } from "lucide-react";

export function Archive() {
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [navigate]);

  const recordings = [
    {
      id: 1,
      title: "Учебный класс - Занятие #12",
      type: "class",
      date: "28.03.2026",
      duration: "2ч 15мин",
      views: 89,
      status: "completed",
    },
    {
      id: 2,
      title: "Учебный класс - Занятие #11",
      type: "class",
      date: "21.03.2026",
      duration: "2ч 30мин",
      views: 134,
      status: "completed",
    },
    {
      id: 3,
      title: "Конференция Q1 2026",
      type: "conference",
      date: "15.03.2026",
      duration: "3ч 45мин",
      views: 245,
      status: "completed",
    },
    {
      id: 4,
      title: "Учебный класс - Занятие #10",
      type: "class",
      date: "14.03.2026",
      duration: "2ч 20мин",
      views: 156,
      status: "completed",
    },
    {
      id: 5,
      title: "Учебный класс - Занятие #9",
      type: "class",
      date: "07.03.2026",
      duration: "2ч 10мин",
      views: 142,
      status: "completed",
    },
    {
      id: 6,
      title: "Учебный класс - Занятие #8",
      type: "class",
      date: "28.02.2026",
      duration: "2ч 25мин",
      views: 178,
      status: "completed",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center space-x-3 mb-3">
          <ArchiveIcon className="w-8 h-8 text-purple-400" />
          <h1 className="text-4xl text-white">Архив</h1>
        </div>
        <p className="text-purple-200">Записи классов и конференций</p>
      </div>

      <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/30 backdrop-blur-sm rounded-xl p-6 mb-8 border border-blue-400/30">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <p className="text-white">
            <span className="text-green-400">Сейчас идёт:</span> Учебный класс - Занятие #12
          </p>
          <a
            href="/"
            className="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Смотреть трансляцию</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recordings.map((recording) => (
          <div
            key={recording.id}
            className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-xl shadow-lg border border-white/10 hover:border-purple-400/50 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl text-white">{recording.title}</h3>
                    {recording.type === "conference" && (
                      <span className="bg-blue-600/30 text-blue-300 px-2 py-1 rounded text-xs border border-blue-400/40">
                        Конференция
                      </span>
                    )}
                    {recording.type === "class" && (
                      <span className="bg-green-600/30 text-green-300 px-2 py-1 rounded text-xs border border-green-400/40">
                        Класс
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-purple-200 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{recording.date}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{recording.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-xs border border-green-400/30">
                  Завершено
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-purple-300 text-sm">
                  <Eye className="w-4 h-4" />
                  <span>{recording.views} просмотров</span>
                </div>
                <button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-2 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2">
                  <PlayCircle className="w-4 h-4" />
                  <span>Смотреть</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
