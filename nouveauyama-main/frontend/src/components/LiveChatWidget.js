import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function LiveChatWidget() {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const messagesEndRef = useRef(null);

  // Start chat session when opened
  useEffect(() => {
    if (isOpen && !session) {
      startSession();
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages
  useEffect(() => {
    if (!session?.session_id) return;

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/chat/${session.session_id}`);
        if (response.data.messages.length > messages.length) {
          setMessages(response.data.messages);
        }
      } catch (error) {
        console.error("Error polling messages:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [session, messages.length]);

  const startSession = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/chat/start`,
        {
          name: user?.name || "Visiteur",
          email: user?.email || "",
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      setSession(response.data);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !session?.session_id || sending) return;

    const messageText = input.trim();
    setInput("");
    setSending(true);

    // Optimistic update
    const tempMessage = {
      message_id: `temp_${Date.now()}`,
      message: messageText,
      sender_type: "customer",
      sender_name: user?.name || "Vous",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await axios.post(
        `${API_URL}/api/chat/${session.session_id}/message`,
        {
          message: messageText,
          sender_type: "customer",
        }
      );

      // Replace temp message with real one
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.message_id !== tempMessage.message_id);
        const newMessages = [response.data.message];
        if (response.data.auto_reply) {
          newMessages.push(response.data.auto_reply);
        }
        return [...filtered, ...newMessages];
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.message_id !== tempMessage.message_id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Chat Button - Compact like WhatsApp */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(true);
          setShowBadge(false);
        }}
        className={`fixed bottom-24 left-4 z-[60] w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white transition-all ${
          isOpen ? "hidden" : ""
        }`}
        aria-label="Ouvrir le chat"
        data-testid="chat-widget-button"
      >
        <MessageCircle className="w-5 h-5" />
        {showBadge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
            1
          </span>
        )}
      </motion.button>

      {/* Chat Window - Fixed size, no site expansion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-24 left-4 z-[70] w-80 h-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
            style={{ maxHeight: '400px' }}
            data-testid="chat-widget-window"
          >
            {/* Header - Compact */}
            <div className="bg-blue-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Support YAMA+</h3>
                  <p className="text-[10px] text-white/80">
                    {loading ? "Connexion..." : "En ligne"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-800">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div
                      key={msg.message_id || i}
                      className={`flex ${
                        msg.sender_type === "customer" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 ${
                          msg.sender_type === "customer"
                            ? "bg-blue-500 text-white rounded-br-sm"
                            : "bg-white dark:bg-gray-700 shadow-sm rounded-bl-sm"
                        }`}
                      >
                        <p className="text-xs whitespace-pre-wrap">{msg.message}</p>
                        <p
                          className={`text-[9px] mt-0.5 ${
                            msg.sender_type === "customer"
                              ? "text-white/70"
                              : "text-gray-400"
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input - Compact */}
            <div className="p-2 border-t bg-white dark:bg-gray-900 flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Votre message..."
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  disabled={loading || sending}
                  data-testid="chat-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading || sending}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  data-testid="chat-send-button"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
