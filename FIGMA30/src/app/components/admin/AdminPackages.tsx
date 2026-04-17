import { useState } from "react";
import { Package, Plus, Trash2, Edit } from "lucide-react";

export function AdminPackages() {
  const [packages, setPackages] = useState([
    {
      id: 1,
      title: "Семинар по Евангелию от Иоанна",
      lectures: 8,
      author: "Rauf Erik",
      created: "08/11/2023",
      purchases: 1,
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPackage, setNewPackage] = useState({
    title: "",
    lectures: 0,
    author: "",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = {
      id: packages.length + 1,
      title: newPackage.title,
      lectures: newPackage.lectures,
      author: newPackage.author,
      created: new Date().toLocaleDateString("ru-RU"),
      purchases: 0,
    };
    setPackages([pkg, ...packages]);
    setNewPackage({ title: "", lectures: 0, author: "" });
    setShowCreateForm(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("Вы уверены, что хотите удалить этот пакет?")) {
      setPackages(packages.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <Package className="w-8 h-8 text-blue-400" />
              <h1 className="text-4xl text-white">Управление пакетами материалов</h1>
            </div>
            <p className="text-purple-200">Создание и управление платными пакетами</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Создать пакет</span>
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-gradient-to-br from-green-900/60 to-green-800/40 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-green-400/30 mb-8">
          <h2 className="text-2xl text-white mb-6">Создать новый пакет</h2>
          
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label htmlFor="pkg-title" className="block text-white mb-2">
                Название пакета:
              </label>
              <input
                id="pkg-title"
                type="text"
                value={newPackage.title}
                onChange={(e) => setNewPackage({ ...newPackage, title: e.target.value })}
                placeholder="Название курса или семинара"
                className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="pkg-lectures" className="block text-white mb-2">
                Количество лекций:
              </label>
              <input
                id="pkg-lectures"
                type="number"
                min="1"
                value={newPackage.lectures || ""}
                onChange={(e) => setNewPackage({ ...newPackage, lectures: parseInt(e.target.value) || 0 })}
                placeholder="8"
                className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="pkg-author" className="block text-white mb-2">
                Автор:
              </label>
              <input
                id="pkg-author"
                type="text"
                value={newPackage.author}
                onChange={(e) => setNewPackage({ ...newPackage, author: e.target.value })}
                placeholder="Имя автора"
                className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Создать
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg transition-all duration-200"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Packages List */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-pink-400/20 overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl text-white mb-6">Управление пакетами материалов</h2>
          
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-purple-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm text-white">Название</th>
                  <th className="px-6 py-3 text-left text-sm text-white">Лекций</th>
                  <th className="px-6 py-3 text-left text-sm text-white">Создано</th>
                  <th className="px-6 py-3 text-left text-sm text-white">Автор</th>
                  <th className="px-6 py-3 text-left text-sm text-white">Покупок</th>
                  <th className="px-6 py-3 text-center text-sm text-white">Действия</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg, index) => (
                  <tr
                    key={pkg.id}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td className="px-6 py-4 text-sm text-gray-800">{pkg.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-800">{pkg.lectures}</td>
                    <td className="px-6 py-4 text-sm text-gray-800">{pkg.created}</td>
                    <td className="px-6 py-4 text-sm text-gray-800">{pkg.author}</td>
                    <td className="px-6 py-4 text-sm text-gray-800">{pkg.purchases}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {packages.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Пакеты не созданы</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
