import { useEffect } from "react";
import { useNavigate } from "react-router";
import { BookOpen, Clock, Users, Lock } from "lucide-react";

export function PaidMaterials() {
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [navigate]);

  const materials = [
    {
      id: 1,
      title: "Семинар по Евангелию от Иоанна",
      lectures: 8,
      duration: "13ч 33мин",
      purchased: 1,
      price: "3500₽",
      available: true,
    },
    {
      id: 2,
      title: "Продвинутый курс медитации",
      lectures: 12,
      duration: "18ч 20мин",
      purchased: 0,
      price: "4500₽",
      available: false,
    },
    {
      id: 3,
      title: "Основы эзотерической философии",
      lectures: 10,
      duration: "15ч 45мин",
      purchased: 0,
      price: "3800₽",
      available: false,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center space-x-3 mb-3">
          <BookOpen className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl text-white">Платные материалы</h1>
        </div>
        <p className="text-purple-200">Специальные курсы и семинары для углубленного изучения</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {materials.map((material) => (
          <div
            key={material.id}
            className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-white/10 hover:border-blue-400/50 transition-all duration-300"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl text-white flex-1">{material.title}</h3>
                {!material.available && (
                  <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 ml-2" />
                )}
              </div>
              
              <div className="space-y-2 text-purple-200 text-sm mb-6">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{material.lectures} лекций</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{material.duration}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{material.purchased} покупок</span>
                </div>
              </div>

              {material.available ? (
                <div>
                  <div className="text-green-400 text-sm mb-3 flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span>Доступно для покупки</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl text-white">{material.price}</span>
                    <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
                      Связаться с администратором
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm text-center">
                    ⚠️ У вас пока нет доступа к платным материалам
                  </p>
                  <p className="text-yellow-300 text-xs text-center mt-2">
                    Свяжитесь с администратором для получения доступа к интересующим вас материалам.
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gradient-to-br from-blue-900/40 to-blue-800/30 backdrop-blur-sm rounded-xl p-8 border border-blue-400/30">
        <h2 className="text-2xl text-white mb-4">Как получить доступ к материалам?</h2>
        <div className="space-y-3 text-purple-200">
          <p>1. Выберите интересующий вас курс или семинар</p>
          <p>2. Свяжитесь с администратором для уточнения деталей оплаты</p>
          <p>3. После оплаты вам будет предоставлен доступ к материалам</p>
          <p className="text-blue-300 mt-4">
            📧 Контакт администратора: admin@example.com
          </p>
        </div>
      </div>
    </div>
  );
}
