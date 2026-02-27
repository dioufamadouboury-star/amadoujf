import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, X, Check, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PromoCodeInput({ 
  cartTotal, 
  cartItems, 
  userId, 
  onApply, 
  appliedPromo,
  onRemove 
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post(`${API_URL}/api/promo-codes/validate`, {
        code: code.trim(),
        cart_total: cartTotal,
        cart_items: cartItems,
        user_id: userId
      });
      
      onApply(response.data);
      setCode("");
    } catch (err) {
      setError(err.response?.data?.detail || "Code promo invalide");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div className="space-y-3">
      {/* Applied Promo */}
      <AnimatePresence>
        {appliedPromo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    {appliedPromo.code}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {appliedPromo.message}
                    {appliedPromo.discount_amount > 0 && (
                      <span className="font-medium">
                        {" "}(-{appliedPromo.discount_amount.toLocaleString("fr-FR")} FCFA)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={onRemove}
                className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded-full transition-colors"
                aria-label="Supprimer le code promo"
              >
                <X className="w-5 h-5 text-green-600 dark:text-green-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      {!appliedPromo && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Code promo
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError("");
                }}
                onKeyPress={handleKeyPress}
                placeholder="Entrez votre code"
                className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 transition-all ${
                  error 
                    ? "border-red-300 focus:ring-red-500/20" 
                    : "border-gray-200 dark:border-gray-700 focus:ring-primary/20 focus:border-primary"
                }`}
                disabled={loading}
              />
              {error && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
              )}
            </div>
            <button
              onClick={handleApply}
              disabled={loading || !code.trim()}
              className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Appliquer"
              )}
            </button>
          </div>
          
          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-red-500 flex items-center gap-1"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Hint */}
      {!appliedPromo && !error && (
        <p className="text-xs text-muted-foreground">
          💡 Inscrivez-vous à la newsletter pour recevoir un code de réduction
        </p>
      )}
    </div>
  );
}
