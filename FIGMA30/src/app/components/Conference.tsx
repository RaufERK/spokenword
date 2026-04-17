import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Youtube, Play, Music, GraduationCap, AlertCircle } from "lucide-react";

export function Conference() {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [conferenceLinks, setConferenceLinks] = useState({
    youtube: "",
    rutube: "",
  });

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Проверка активности пользователя (оплатил меньше месяца назад)
    const paymentDate = localStorage.getItem("userPaymentDate");
    if (paymentDate) {
      const paid = new Date(paymentDate);
      const now = new Date();
      const daysSincePaid = Math.floor((now.getTime() - paid.getTime()) / (1000 * 60 * 60 * 24));
      setHasAccess(daysSincePaid < 30);
    }

    // Получаем ссылки конференции (в реальном приложении - из API)
    const youtubeLink = localStorage.getItem("conferenceYoutubeLink") || "";
    const rutubeLink = localStorage.getItem("conferenceRutubeLink") || "";
    setConferenceLinks({
      youtube: youtubeLink,
      rutube: rutubeLink,
    });
  }, [navigate]);

  const streamLinks = [
    {
      id: 1,
      platform: "YouTube",
      icon: Youtube,
      color: "from-purple-600 to-purple-800",
      url: conferenceLinks.youtube,
      available: !!conferenceLinks.youtube,
    },
    {
      id: 2,
      platform: "Rutube",
      icon: Play,
      color: "from-blue-600 to-blue-800",
      url: conferenceLinks.rutube,
      available: !!conferenceLinks.rutube,
    },
    {
      id: 3,
      platform: "Audio",
      icon: Music,
      color: "from-green-600 to-green-800",
      url: "https://audio.spoken-word.ru",
      available: true,
    },
  ];

  const availableLinks = streamLinks.filter((link) => link.available);

  if (!hasAccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-gradient-to-br from-red-900/40 to-red-800/30 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 max-w-4xl w-full border border-red-400/20">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-600 mb-4">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl text-white mb-3">
                Доступ ограничен
              </h1>
              <p className="text-red-200 mb-6">
                Ваша оплата неактивна. Для доступа к конференции необходимо продлить подписку.
              </p>
              <button
                onClick={() => navigate("/profile")}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Перейти в профиль
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 max-w-4xl w-full border border-white/10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl text-white mb-3">
              Трансляция конференции
            </h1>
            <p className="text-purple-200">
              Выберите платформу для просмотра текущей конференции
            </p>
          </div>

          {availableLinks.length > 0 ? (
            <>
              <div className={`grid grid-cols-1 ${availableLinks.length === 3 ? 'md:grid-cols-3' : availableLinks.length === 2 ? 'md:grid-cols-2' : ''} gap-6`}>
                {availableLinks.map((link) => {
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

              <div className="mt-8 p-4 bg-green-900/30 rounded-lg border border-green-400/30">
                <p className="text-green-200 text-sm text-center">
                  ✅ У вас есть активный доступ к конференции
                </p>
              </div>
            </>
          ) : (
            <div className="mt-6 p-6 bg-yellow-900/30 rounded-lg border border-yellow-400/30">
              <p className="text-yellow-200 text-center">
                ⚠️ В данный момент нет активных трансляций конференции. Ссылки будут добавлены администратором.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-purple-200 text-sm">
            Пропустили конференцию?{" "}
            <a href="/archive" className="text-green-400 hover:text-green-300 underline">
              Смотрите записи в архиве
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
