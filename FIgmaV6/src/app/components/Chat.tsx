import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { MessageCircle, Send, Link as LinkIcon, Trash2 } from "lucide-react";

interface Message {
  id: number;
  author: string;
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
}

export function Chat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messageText, setMessageText] = useState("");
  const [messageLink, setMessageLink] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      author: "Rauf Erik",
      authorRole: "SUPER",
      text: "Добро пожаловать в общий чат нашей общины!",
      date: "08.04.2026",
      time: "10:30",
      reactions: { like: 12, heart: 8, smile: 3, fire: 5, clap: 2 },
      userReacted: [],
    },
    {
      id: 2,
      author: "Елеонора",
      authorRole: "USER",
      text: "Спасибо! Рада быть здесь",
      date: "08.04.2026",
      time: "10:35",
      reactions: { like: 5, heart: 3, smile: 1, fire: 0, clap: 0 },
      userReacted: [],
    },
    {
      id: 3,
      author: "Алексей",
      authorRole: "ADMIN",
      text: "Друзья, делюсь интересной статьёй по теме нашего последнего занятия",
      link: "https://example.com/article",
      date: "08.04.2026",
      time: "11:20",
      reactions: { like: 8, heart: 4, smile: 0, fire: 6, clap: 3 },
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
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() && !messageLink.trim()) return;

    const now = new Date();
    const newMessage: Message = {
      id: messages.length + 1,
      author: "Вы",
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

  // Проверка, является ли пользователь админом или модератором
  const isAdminOrModerator = userRole === "ADMIN" || userRole === "SUPER";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 h-[calc(100vh-8rem)]">
      <div className="h-full flex flex-col bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-2xl text-white">Чат общины</h1>
              <p className="text-purple-200 text-sm">Общение участников</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => {
            const isAdminMessage = message.authorRole === "ADMIN" || message.authorRole === "SUPER";
            
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
                    <span className={`font-semibold ${
                      isAdminMessage ? "text-pink-200" : "text-purple-300"
                    }`}>
                      {message.author}
                    </span>
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
                    <span className={`text-xs ${
                      isAdminMessage ? "text-pink-300/60" : "text-purple-400/60"
                    }`}>
                      •
                    </span>
                    <span className={`text-xs ${
                      isAdminMessage ? "text-pink-300/60" : "text-purple-400/60"
                    }`}>
                      {message.date}
                    </span>
                    <span className={`text-xs ${
                      isAdminMessage ? "text-pink-300/60" : "text-purple-400/60"
                    }`}>
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

        {/* Input Form */}
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
  );
}