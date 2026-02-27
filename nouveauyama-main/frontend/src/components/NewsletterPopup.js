import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { X, Gift, Mail, Check, Copy } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if user has already seen the popup
    const hasSeenPopup = localStorage.getItem("newsletter_popup_seen");
    const lastSeen = localStorage.getItem("newsletter_popup_last_seen");
    
    // Show popup after 5 seconds if:
    // - Never seen before, OR
    // - Last seen more than 7 days ago
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const shouldShow = !hasSeenPopup || (lastSeen && parseInt(lastSeen) < sevenDaysAgo);
    
    if (shouldShow) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem("newsletter_popup_seen", "true");
        localStorage.setItem("newsletter_popup_last_seen", Date.now().toString());
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/newsletter/subscribe`, {
        email,
      });
      
      if (response.data.already_subscribed) {
        toast.info("Vous êtes déjà inscrit !");
        setIsOpen(false);
      } else {
        setPromoCode(response.data.promo_code);
        setSuccess(true);
      }
    } catch (error) {
      toast.error("Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const copyPromoCode = () => {
    navigator.clipboard.writeText(promoCode);
    setCopied(true);
    toast.success("Code copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const closePopup = () => {
    setIsOpen(false);
    setSuccess(false);
    setEmail("");
    setPromoCode("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closePopup}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
              data-testid="close-newsletter-popup"
            >
              <X className="w-4 h-4" />
            </button>

            {!success ? (
              /* Subscribe Form */
              <>
                {/* Header with gradient */}
                <div className="relative h-40 bg-gradient-to-br from-[#0071E3] to-[#00C6FB] flex items-center justify-center">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Gift className="w-10 h-10 text-[#0071E3]" />
                  </motion.div>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-2xl font-bold mb-2">
                      -10% sur votre 1ère commande
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Inscrivez-vous à notre newsletter et recevez un code promo exclusif
                    </p>
                  </motion.div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Votre adresse email"
                        className="w-full h-14 pl-12 pr-4 rounded-2xl border border-black/10 dark:border-white/10 bg-[#F5F5F7] dark:bg-black/30 focus:border-[#0071E3] outline-none transition-colors text-center"
                        data-testid="newsletter-email-input"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      data-testid="newsletter-submit-btn"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                          Inscription...
                        </span>
                      ) : (
                        "Recevoir mon code -10%"
                      )}
                    </button>
                  </form>

                  <p className="text-xs text-muted-foreground mt-4">
                    En vous inscrivant, vous acceptez de recevoir nos offres par email.
                    Désinscription possible à tout moment.
                  </p>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-10 h-10 text-green-600" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-2xl font-bold mb-2">Merci !</h2>
                  <p className="text-muted-foreground mb-6">
                    Voici votre code promo exclusif :
                  </p>

                  {/* Promo Code Box */}
                  <div className="relative mb-6">
                    <div className="flex items-center justify-center gap-3 p-4 bg-[#F5F5F7] dark:bg-black/30 rounded-2xl border-2 border-dashed border-[#0071E3]">
                      <span className="text-2xl font-bold tracking-wider text-[#0071E3]">
                        {promoCode}
                      </span>
                      <button
                        onClick={copyPromoCode}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      -10% sur votre prochaine commande
                    </p>
                  </div>

                  <button
                    onClick={closePopup}
                    className="w-full h-14 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    Commencer mes achats
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
