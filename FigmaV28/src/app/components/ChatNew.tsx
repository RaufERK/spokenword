import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { MessageCircle, Send, Link as LinkIcon, Trash2, User, Users as UsersIcon, HelpCircle, X } from "lucide-react";

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

  const [activeChatId, setActiveChatId] = useState("general");

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 h-[calc(100vh-8rem)]">
      <div className="h-full flex bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">

        {/* Левая панель - список чатов */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xl text-white font-medium flex items-center space-x-2">
              <MessageCircle className="w-6 h-6 text-purple-400" />
              <span>Чаты</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => switchChat(chat.id)}
                className={`w-full p-4 text-left transition-all border-b border-white/5 ${
                  activeChatId === chat.id
                    ? "bg-purple-600/30 border-l-4 border-l-purple-400"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-2xl">{chat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{chat.name}</h3>
                      {chat.lastMessage && (
                        <p className="text-purple-300 text-sm truncate">
                          {chat.lastMessage.text}
                        </p>
                      )}
                    </div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold ml-2">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                {chat.lastMessage && (
                  <div className="text-purple-400 text-xs mt-1 ml-11">
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
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{activeChat?.icon}</span>
                <div>
                  <h1 className="text-2xl text-white">{activeChat?.name}</h1>
                  <p className="text-purple-200 text-sm">
                    {activeChat?.type === "general" && "Общение участников"}
                    {activeChat?.type === "support" && "Обращения к администрации"}
                    {activeChat?.type === "private" && "Личная переписка"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {currentMessages.map((message) => {
              const isAdminMessage = message.authorRole === "ADMIN" || message.authorRole === "SUPER";
              const isOwnMessage = message.authorId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`backdrop-blur-sm rounded-lg p-4 border transition-all ${
                    isAdminMessage
                      ? "bg-gradient-to-br from-pink-900/50 to-rose-900/40 border-pink-500/40 shadow-lg shadow-pink-500/20"
                      : "bg-white/10 border-white/5 hover:border-purple-400/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => !isOwnMessage && handleUserClick(message.authorId, message.author)}
                        className={`font-semibold ${
                          isAdminMessage ? "text-pink-200" : "text-purple-300"
                        } ${!isOwnMessage && activeChatId === "general" ? "hover:underline cursor-pointer" : ""}`}
                      >
                        {message.author}
                      </button>
                      {message.authorRole === "SUPER" && (
                        <span className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-2 py-0.5 rounded text-xs border border-pink-400/50">
                          SUPER
                        </span>
                      )}
                      {message.authorRole === "ADMIN" && (
                        <span className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-2 py-0.5 rounded text-xs border border-rose-400/50">
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
                    <p className="text-white mb-2">{message.text}</p>
                  )}

                  {message.link && (
                    <a
                      href={message.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center space-x-2 underline text-sm mb-3 ${
                        isAdminMessage ? "text-pink-300 hover:text-pink-200" : "text-blue-400 hover:text-blue-300"
                      }`}
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>{message.link}</span>
                    </a>
                  )}

                  {/* Reactions */}
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-white/5">
                    <button
                      onClick={() => handleReaction(message.id, "like")}
                      className={`flex items-center space-x-1 px-2 py-1 rounded transition-all ${
                        message.userReacted?.includes("like")
                          ? "bg-blue-600/30 text-blue-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Лайк"
                    >
                      <span>👍</span>
                      {message.reactions.like > 0 && (
                        <span className="text-xs">{message.reactions.like}</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleReaction(message.id, "heart")}
                      className={`flex items-center space-x-1 px-2 py-1 rounded transition-all ${
                        message.userReacted?.includes("heart")
                          ? "bg-pink-600/30 text-pink-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Сердце"
                    >
                      <span>❤️</span>
                      {message.reactions.heart > 0 && (
                        <span className="text-xs">{message.reactions.heart}</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleReaction(message.id, "smile")}
                      className={`flex items-center space-x-1 px-2 py-1 rounded transition-all ${
                        message.userReacted?.includes("smile")
                          ? "bg-yellow-600/30 text-yellow-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Улыбка"
                    >
                      <span>😊</span>
                      {message.reactions.smile > 0 && (
                        <span className="text-xs">{message.reactions.smile}</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleReaction(message.id, "fire")}
                      className={`flex items-center space-x-1 px-2 py-1 rounded transition-all ${
                        message.userReacted?.includes("fire")
                          ? "bg-orange-600/30 text-orange-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Огонь"
                    >
                      <span>🔥</span>
                      {message.reactions.fire > 0 && (
                        <span className="text-xs">{message.reactions.fire}</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleReaction(message.id, "clap")}
                      className={`flex items-center space-x-1 px-2 py-1 rounded transition-all ${
                        message.userReacted?.includes("clap")
                          ? "bg-green-600/30 text-green-300"
                          : "bg-white/5 text-purple-300 hover:bg-white/10"
                      }`}
                      title="Аплодисменты"
                    >
                      <span>👏</span>
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
          <div className="p-6 border-t border-white/10">
            <form onSubmit={handleSendMessage} className="space-y-3">
              <div>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите сообщение..."
                  rows={2}
                  className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>

              <div>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="url"
                    value={messageLink}
                    onChange={(e) => setMessageLink(e.target.value)}
                    placeholder="Ссылка (необязательно)"
                    className="w-full pl-10 pr-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Отправить</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
