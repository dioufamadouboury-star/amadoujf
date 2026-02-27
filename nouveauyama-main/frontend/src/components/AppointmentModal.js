import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Calendar, Clock, User, Phone, Mail, MessageSquare, X, CheckCircle, MapPin } from "lucide-react";
import { getImageUrl } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AppointmentModal({ isOpen, onClose, product = null, category = null }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferred_date: "",
    preferred_time: "",
    message: "",
    contact_method: "whatsapp"
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/appointments`, {
        ...formData,
        product_id: product?.product_id,
        product_name: product?.name,
        category: category || product?.category
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSuccess(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      preferred_date: "",
      preferred_time: "",
      message: "",
      contact_method: "whatsapp"
    });
    onClose();
  };

  // Generate time slots
  const timeSlots = [];
  for (let h = 9; h <= 18; h++) {
    timeSlots.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < 18) timeSlots.push(`${h.toString().padStart(2, "0")}:30`);
  }

  // Min date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={resetAndClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <button
              onClick={resetAndClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Prendre Rendez-vous</h2>
            </div>
            <p className="text-white/80">
              Planifiez une visite pour voir nos produits en personne
            </p>
          </div>

          {success ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Demande envoyée !</h3>
              <p className="text-muted-foreground mb-6">
                Nous vous contacterons très bientôt pour confirmer votre rendez-vous.
              </p>
              <button
                onClick={resetAndClose}
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium"
              >
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {product && (
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-4">
                  {product.images?.[0] && (
                    <img
                      src={getImageUrl(product.images[0])}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.price?.toLocaleString()} FCFA</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Nom complet *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Votre nom"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="77 123 45 67"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@exemple.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date souhaitée *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="date"
                      name="preferred_date"
                      value={formData.preferred_date}
                      onChange={handleChange}
                      required
                      min={minDate}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Heure souhaitée *</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <select
                      name="preferred_time"
                      value={formData.preferred_time}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choisir</option>
                      {timeSlots.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Mode de contact préféré</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="contact_method"
                        value="whatsapp"
                        checked={formData.contact_method === "whatsapp"}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>WhatsApp</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="contact_method"
                        value="email"
                        checked={formData.contact_method === "email"}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>Email</span>
                    </label>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Message (optionnel)</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Des précisions sur votre visite..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  L'adresse exacte vous sera communiquée lors de la confirmation
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Envoi en cours..." : "Demander un rendez-vous"}
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
