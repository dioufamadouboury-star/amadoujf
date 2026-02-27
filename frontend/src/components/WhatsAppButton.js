import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Phone } from "lucide-react";

const WHATSAPP_NUMBER = "221783827575"; // Replace with actual number
const STORE_NAME = "YAMA+";

const quickMessages = [
  { id: 1, text: "Je voudrais des informations sur un produit", icon: "📱" },
  { id: 2, text: "J'ai une question sur ma commande", icon: "📦" },
  { id: 3, text: "Je souhaite connaître les délais de livraison", icon: "🚚" },
  { id: 4, text: "Je voudrais un devis", icon: "💰" },
  { id: 5, text: "Autre question", icon: "❓" },
];

export default function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const openWhatsApp = (message) => {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(url, "_blank");
    setIsOpen(false);
  };

  const handleQuickMessage = (msg) => {
    openWhatsApp(`Bonjour ${STORE_NAME} ! ${msg.text}`);
  };

  const handleCustomMessage = (e) => {
    e.preventDefault();
    if (customMessage.trim()) {
      openWhatsApp(`Bonjour ${STORE_NAME} ! ${customMessage}`);
      setCustomMessage("");
    }
  };

  return (
    <>
      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100%-2rem)] max-w-sm"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="bg-[#25D366] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">YAMA+ Support</h3>
                      <p className="text-xs text-white/80">Répond en quelques minutes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Welcome Message */}
              <div className="p-4 bg-[#ECE5DD] dark:bg-gray-800">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm max-w-[85%]">
                  <p className="text-sm">
                    👋 Bonjour ! Comment pouvons-nous vous aider aujourd'hui ?
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Quick Messages */}
              <div className="p-4 max-h-64 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-3">Choisissez un sujet :</p>
                <div className="space-y-2">
                  {quickMessages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => handleQuickMessage(msg)}
                      className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center gap-3 group"
                    >
                      <span className="text-lg">{msg.icon}</span>
                      <span className="text-sm flex-1">{msg.text}</span>
                      <Send className="w-4 h-4 text-[#25D366] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Message Input */}
              <form onSubmit={handleCustomMessage} className="p-4 border-t dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
                  />
                  <button
                    type="submit"
                    disabled={!customMessage.trim()}
                    className="p-2 bg-[#25D366] text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#20BA5A] transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>

              {/* Direct Call Option */}
              <div className="px-4 pb-4">
                <a
                  href={`tel:+${WHATSAPP_NUMBER}`}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Ou appelez-nous directement
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 md:right-6 z-50 w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#20BA5A] transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={isOpen ? { rotate: 0 } : { rotate: 0 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="whatsapp"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Pulse animation when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />
        )}
      </motion.button>
    </>
  );
}
