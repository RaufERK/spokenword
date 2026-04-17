import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Youtube, Play, Music } from "lucide-react";

export function Home() {
  const navigate = useNavigate();
  const [hasClassAccess, setHasClassAccess] = useState(false);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuthenticated) {
      navigate("/login");
    }
    
    // Mock: check if user has paid for class
    // In real app, this would be fetched from backend
    const mockHasAccess = Math.random() > 0.5; // 50% chance for demo
    setHasClassAccess(mockHasAccess);
  }, [navigate]);

  const streamLinks = [
    {
      id: 1,
      platform: "YouTube",
      icon: Youtube,
      color: "from-purple-600 to-purple-800",
      url: "https://youtube.com/live/example",
    },
    {
      id: 2,
      platform: "Rutube",
      icon: Play,
      color: "from-blue-600 to-blue-800",
      url: "https://rutube.ru/live/example",
    },
    {
      id: 3,
      platform: "Audio",
      icon: Music,
      color: "from-green-600 to-green-800",
      url: "/audio-stream",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 max-w-4xl w-full border border-white/10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 mb-4">
              <Play className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl text-white mb-3">
              {hasClassAccess ? "Подключение к трансляции класса" : "Подключение к трансляции"}
            </h1>
            <p className="text-purple-200">
              {hasClassAccess 
                ? "Выберите платформу для просмотра текущего учебного класса"
                : "Выберите платформу для просмотра текущего мероприятия"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {streamLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`bg-gradient-to-br ${link.color} rounded-xl p-6 flex flex-col items-center justify-center space-y-3 hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-xl`}
                >
                  <Icon className="w-12 h-12 text-white" />
                  <span className="text-white text-lg">{link.platform}</span>
                </a>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-blue-900/30 rounded-lg border border-blue-400/30">
            <p className="text-blue-200 text-sm text-center">
              {hasClassAccess 
                ? "📅 Текущая трансляция: Учебный класс • Занятие #12"
                : "📅 Текущая трансляция: Открытое мероприятие"}
            </p>
          </div>

          {!hasClassAccess && (
            <div className="mt-6 p-4 bg-yellow-900/30 rounded-lg border border-yellow-400/30">
              <p className="text-yellow-200 text-sm text-center">
                ⚠️ У вас пока нет доступа к учебному классу. Свяжитесь с администратором для получения доступа.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-purple-200 text-sm">
            Пропустили занятие?{" "}
            <a href="/class-archive" className="text-green-400 hover:text-green-300 underline">
              Смотрите записи в архиве
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}