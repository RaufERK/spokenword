import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { MessageCircle, Send, Link as LinkIcon, Trash2, User, Users as UsersIcon, HelpCircle, X, Search } from "lucide-react";

interface Message {
  id: number;
  author: string;
  authorId: number;
  authorRole?: "USER" | "ADMIN" | "SUPER";
  text: string;
  link?: string;
  date: string;
  time: string;
  reactions: {
    like: number;
    heart: number;
    smile: number;
    fire: number;
    clap: number;
  };
  userReacted?: string[];
  chatId: string; // ID чата к которому принадлежит сообщение
}

interface ChatRoom {
  id: string;
  type: "general" | "support" | "private";
  name: string;
  icon: string;
  participantId?: number; // Для личных чатов - ID собеседника
  unreadCount: number;
  lastMessage?: {
    text: string;
    time: string;
  };
}

export function ChatNew() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messageText, setMessageText] = useState("");
  const [messageLink, setMessageLink] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId] = useState(1); // ID текущего пользователя (из auth)
  const [searchQuery, setSearchQuery] = useState("");

  const [activeChatId, setActiveChatId] = useState("general");

  // Список всех пользователей для поиска
  const allUsers = [
    { id: 1, name: "Елеонора", surname: "Брагиш", role: "USER" },
    { id: 2, name: "Алексей", surname: "Петров", role: "ADMIN" },
    { id: 3, name: "Мария", surname: "Иванова", role: "USER" },
    { id: 4, name: "Rauf", surname: "Erik", role: "SUPER" },
    { id: 5, name: "Дмитрий", surname: "Сидоров", role: "USER" },
    { id: 6, name: "Анна", surname: "Козлова", role: "USER" },
    { id: 7, name: "Павел", surname: "Морозов", role: "ADMIN" },
    { id: 8, name: "Екатерина", surname: "Новикова", role: "USER" },
  ];

  // Фильтрация пользователей по поисковому запросу
  const filteredUsers = allUsers.filter(user => {
    if (!searchQuery.trim()) return false;
    if (user.id === currentUserId) return false;

    const query = searchQuery.toLowerCase();
    const fullName = `${user.name} ${user.surname}`.toLowerCase();
    return fullName.includes(query);
  });

  const [chats, setChats] = useState<ChatRoom[]>([
    {
      id: "general",
      type: "general",
      name: "Общий чат",
      icon: "📢",
      unreadCount: 0,
      lastMessage: { text: "Добро пожаловать в общий чат!", time: "10:30" }
    },
    {
      id: "support",
      type: "support",
      name: "Поддержка",
      icon: "🛟",
      unreadCount: 2,
      lastMessage: { text: "Не могу войти в архив", time: "11:20" }
    },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      chatId: "general",
      author: "Rauf Erik",
      authorId: 4,
      authorRole: "SUPER",
      text: "Добро пожаловать в общий чат нашей общины!",
      date: "08.04.2026",
      time: "10:30",
      reactions: { like: 12, heart: 8, smile: 3, fire: 5, clap: 2 },
      userReacted: [],
    },
    {
      id: 2,
      chatId: "general",
      author: "Елеонора",
      authorId: 1,
      authorRole: "USER",
      text: "Спасибо! Рада быть здесь",
      date: "08.04.2026",
      time: "10:35",
      reactions: { like: 5, heart: 3, smile: 1, fire: 0, clap: 0 },
      userReacted: [],
    },
    {
      id: 3,
      chatId: "support",
      author: "Вы",
      authorId: 1,
      authorRole: "USER",
      text: "Здравствуйте! Не могу получить доступ к архиву после оплаты",
      date: "10.04.2026",
      time: "11:20",
      reactions: { like: 0, heart: 0, smile: 0, fire: 0, clap: 0 },
      userReacted: [],
    },
    {
      id: 4,
      chatId: "support",
      author: "Алексей (Админ)",
      authorId: 2,
      authorRole: "ADMIN",
      text: "Здравствуйте! Сейчас проверю ваш доступ и активирую его.",
      date: "10.04.2026",
      time: "11:25",
      reactions: { like: 0, heart: 0, smile: 0, fire: 0, clap: 0 },
      userReacted: [],
    },
  ]);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuthenticated) {
      navigate("/login");
    }
    const role = localStorage.getItem("userRole") || "USER";
    setUserRole(role);
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() && !messageLink.trim()) return;

    const now = new Date();
    const newMessage: Message = {
      id: messages.length + 1,
      chatId: activeChatId,
      author: "Вы",
      authorId: currentUserId,
      text: messageText,
      link: messageLink || undefined,
      date: now.toLocaleDateString("ru-RU"),
      time: now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      reactions: { like: 0, heart: 0, smile: 0, fire: 0, clap: 0 },
      userReacted: [],
    };

    setMessages([...messages, newMessage]);
    setMessageText("");
    setMessageLink("");

    // Обновить последнее сообщение в чате
    setChats(chats.map(chat =>
      chat.id === activeChatId
        ? { ...chat, lastMessage: { text: messageText, time: newMessage.time } }
        : chat
    ));
  };

  const handleDeleteMessage = (messageId: number) => {
    if (confirm("Вы уверены, что хотите удалить это сообщение?")) {
      setMessages(messages.filter(msg => msg.id !== messageId));
    }
  };

  const handleReaction = (messageId: number, reactionType: keyof Message["reactions"]) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const hasReacted = msg.userReacted?.includes(reactionType);
        return {
          ...msg,
          reactions: {
            ...msg.reactions,
            [reactionType]: hasReacted
              ? msg.reactions[reactionType] - 1
              : msg.reactions[reactionType] + 1
          },
          userReacted: hasReacted
            ? msg.userReacted.filter(r => r !== reactionType)
            : [...(msg.userReacted || []), reactionType]
        };
      }
      return msg;
    }));
  };

  const handleUserClick = (authorId: number, authorName: string) => {
    // Не создавать чат с самим собой
    if (authorId === currentUserId) return;

    // Проверить, существует ли уже чат с этим пользователем
    const existingChat = chats.find(
      chat => chat.type === "private" && chat.participantId === authorId
    );

    if (existingChat) {
      // Переключиться на существующий чат
      setActiveChatId(existingChat.id);
    } else {
      // Создать новый личный чат
      const newChat: ChatRoom = {
        id: `private-${authorId}`,
        type: "private",
        name: authorName,
        icon: "💬",
        participantId: authorId,
        unreadCount: 0,
      };

      setChats([...chats, newChat]);
      setActiveChatId(newChat.id);
    }
  };

  const switchChat = (chatId: string) => {
    setActiveChatId(chatId);

    // Сбросить счётчик непрочитанных
    setChats(chats.map(chat =>
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ));
  };

  // Проверка, является ли пользователь админом или модератором
  const isAdminOrModerator = userRole === "ADMIN" || userRole === "SUPER";

  // Фильтрация сообщений для текущего чата
  const currentMessages = messages.filter(msg => msg.chatId === activeChatId);

  // Найти активный чат
  const activeChat = chats.find(chat => chat.id === activeChatId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-[calc(100vh-2rem)]">
      <div className="h-full flex bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">

        {/* Левая панель - список чатов */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          <div className="p-3 border-b border-white/10">
            <h2 className="text-lg text-white font-medium flex items-center space-x-2 mb-2">
              <MessageCircle className="w-6 h-6 text-purple-400" />
              <span>Чаты</span>
            </h2>

            {/* Поле поиска контактов */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени..."
                className="w-full pl-9 pr-3 py-2 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Результаты поиска */}
            {searchQuery.trim() && (
              <div className="border-b border-white/10">
                <div className="px-3 py-1.5 bg-purple-900/30">
                  <p className="text-purple-300 text-xs font-medium">
                    {filteredUsers.length > 0 ? `Найдено: ${filteredUsers.length}` : "Ничего не найдено"}
                  </p>
                </div>
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      handleUserClick(user.id, `${user.name} ${user.surname}`);
                      setSearchQuery(""); // Очистить поиск после выбора
                    }}
                    className="w-full p-2 text-left hover:bg-white/5 transition-all border-b border-white/5"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-purple-600/40 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-300" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{user.name} {user.surname}</p>
                        <p className="text-purple-400 text-xs">
                          {user.role === "SUPER" && "Супер-администратор"}
                          {user.role === "ADMIN" && "Администратор"}
                          {user.role === "USER" && "Пользователь"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Список чатов */}
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => switchChat(chat.id)}
                className={`w-full p-2.5 text-left transition-all border-b border-white/5 ${
                  activeChatId === chat.id
                    ? "bg-purple-600/30 border-l-4 border-l-purple-400"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-xl">{chat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white text-sm font-medium truncate">{chat.name}</h3>
                      {chat.lastMessage && (
                        <p className="text-purple-300 text-xs truncate">
                          {chat.lastMessage.text}
                        </p>
                      )}
                    </div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-2">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                {chat.lastMessage && (
                  <div className="text-purple-400 text-xs mt-0.5 ml-9">
                    {chat.lastMessage.time}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Правая панель - активный чат */}
        <div className="flex-1 flex flex-col">
          {/* Заголовок чата */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{activeChat?.icon}</span>
                <div>
                  <h1 className="text-xl text-white">{activeChat?.name}</h1>
                  <p className="text-purple-200 text-xs">
                    {activeChat?.type === "general" && "Общение участников"}
                    {activeChat?.type === "support" && "Обращения к администрации"}
                    {activeChat?.type === "private" && "Личная переписка"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {currentMessages.map((message) => {
              const isAdminMessage = message.authorRole === "ADMIN" || message.authorRole === "SUPER";
              const isOwnMessage = message.authorId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`backdrop-blur-sm rounded-lg p-3 border transition-all ${
                    isAdminMessage
                      ? "bg-gradient-to-br from-pink-900/50 to-rose-900/40 border-pink-500/40 shadow-lg shadow-pink-500/20"
                      : "bg-white/10 border-white/5 hover:border-purple-400/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => !isOwnMessage && handleUserClick(message.authorId, message.author)}
                        className={`font-semibold text-sm ${
                          isAdminMessage ? "text-pink-200" : "text-purple-300"
                        } ${!isOwnMessage && activeChatId === "general" ? "hover:underline cursor-pointer" : ""}`}
                      >
                        {message.author}
                      </button>
                      {message.authorRole === "SUPER" && (
                        <span className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-1.5 py-0.5 rounded text-[10px] border border-pink-400/50">
                          SUPER
                        </span>
                      )}
                      {message.authorRole === "ADMIN" && (
                        <span className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-1.5 py-0.5 rounded text-[10px] border border-rose-400/50">
                          ADMIN
                        </span>
                      )}
                      <span className={`text-xs ${isAdminMessage ? "text-pink-300/60" : "text-purple-400/60"}`}>
                        •
                      </span>
                      <span className={`text-xs ${isAdminMessage ? "text-pink-300/60" : "text-purple-400/60"}`}>
                        {message.date}
                      </span>
                      <span className={`text-xs ${isAdminMessage ? "text-pink-300/60" : "text-purple-400/60"}`}>
                        {message.time}
                      </span>
                    </div>
                    {isAdminOrModerator && (
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Удалить сообщение"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {message.text && (
                    <p className="text-white text-sm mb-1.5">{message.text}</p>
                  )}

                  {message.link && (
                    <a
                      href={message.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center space-x-1 underline text-xs mb-2 ${
                        isAdminMessage ? "text-pink-300 hover:text-pink-200" : "text-blue-400 hover:text-blue-300"
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{message.link}</span>
                    </a>
                  )}

                  {/* Reactions */}
                  <div className="flex items-center space-x-1.5 mt-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleReaction(message.id, "like")}
                      className={`flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-sm transition-all ${
                        message.userReacted?.includes("like")
                          ? "bg-blue-600/30 text-blue-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Лайк"
                    >
                      <span className="text-sm">👍</span>
                      {message.reactions.like > 0 && (
                        <span className="text-xs">{message.reactions.like}</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleReaction(message.id, "heart")}
                      className={`flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-sm transition-all ${
                        message.userReacted?.includes("heart")
                          ? "bg-pink-600/30 text-pink-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Сердце"
                    >
                      <span className="text-sm">❤️</span>
                      {message.reactions.heart > 0 && (
                        <span className="text-xs">{message.reactions.heart}</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleReaction(message.id, "smile")}
                      className={`flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-sm transition-all ${
                        message.userReacted?.includes("smile")
                          ? "bg-yellow-600/30 text-yellow-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Улыбка"
                    >
                      <span className="text-sm">😊</span>
                      {message.reactions.smile > 0 && (
                        <span className="text-xs">{message.reactions.smile}</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleReaction(message.id, "fire")}
                      className={`flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-sm transition-all ${
                        message.userReacted?.includes("fire")
                          ? "bg-orange-600/30 text-orange-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Огонь"
                    >
                      <span className="text-sm">🔥</span>
                      {message.reactions.fire > 0 && (
                        <span className="text-xs">{message.reactions.fire}</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleReaction(message.id, "clap")}
                      className={`flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-sm transition-all ${
                        message.userReacted?.includes("clap")
                          ? "bg-green-600/30 text-green-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Аплодисменты"
                    >
                      <span className="text-sm">👏</span>
                      {message.reactions.clap > 0 && (
                        <span className="text-xs">{message.reactions.clap}</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Форма ввода */}
          <div className="p-4 border-t border-white/10">
            <form onSubmit={handleSendMessage} className="space-y-2">
              <div>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите сообщение..."
                  rows={2}
                  className="w-full px-3 py-2 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                />
              </div>

              <div>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    type="url"
                    value={messageLink}
                    onChange={(e) => setMessageLink(e.target.value)}
                    placeholder="Ссылка (необязательно)"
                    className="w-full pl-9 pr-3 py-2 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Отправить</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
