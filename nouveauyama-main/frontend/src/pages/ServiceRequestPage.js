import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  Send,
  MapPin,
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  Upload,
  ChevronLeft,
  CheckCircle,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ServiceRequestPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState({ cities: [], dakar_zones: [] });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState("");

  const [formData, setFormData] = useState({
    category: searchParams.get("category") || "",
    profession: searchParams.get("profession") || "",
    city: "",
    zone: "",
    description: "",
    preferred_date: "",
    preferred_time: "",
    client_name: "",
    client_phone: "",
    client_whatsapp: "",
    client_email: "",
    address: "",
    budget: "",
    photos: [],
  });

  useEffect(() => {
    fetchCategories();
    fetchLocations();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/services/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/services/locations`);
      setLocations(response.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "city" && value !== "Dakar" ? { zone: "" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.profession || !formData.city || !formData.description || !formData.client_name || !formData.client_phone) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/services/requests`, formData);
      setRequestId(response.data.request_id);
      setSubmitted(true);
      toast.success("Demande envoyée avec succès !");
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((c) => c.category_id === formData.category);

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Demande envoyée !</h1>
          <p className="text-muted-foreground mb-4">
            Votre demande #{requestId} a été reçue. Notre équipe vous contactera très bientôt.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/services")}
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-medium rounded-xl"
            >
              Retour aux services
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  category: "",
                  profession: "",
                  city: "",
                  zone: "",
                  description: "",
                  preferred_date: "",
                  preferred_time: "",
                  client_name: "",
                  client_phone: "",
                  client_whatsapp: "",
                  client_email: "",
                  address: "",
                  budget: "",
                  photos: [],
                });
              }}
              className="w-full py-3 border border-gray-200 dark:border-gray-700 font-medium rounded-xl"
            >
              Nouvelle demande
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] py-8">
      <Helmet>
        <title>Demander un service - YAMA+ Services</title>
        <meta name="description" content="Publiez votre demande de service et recevez des propositions de professionnels qualifiés au Sénégal." />
      </Helmet>

      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back Link */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">Demander un service</h1>
            <p className="text-muted-foreground">
              Décrivez votre besoin et recevez des propositions de professionnels
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-6"
          >
            {/* Service Info */}
            <div>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Type de service
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Catégorie *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-black dark:focus:ring-white"
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.icon} {cat.name_fr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Métier recherché *</label>
                  {selectedCategory ? (
                    <select
                      name="profession"
                      value={formData.profession}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                      required
                    >
                      <option value="">Sélectionner...</option>
                      {selectedCategory.subcategories.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="profession"
                      value={formData.profession}
                      onChange={handleChange}
                      placeholder="Ex: Plombier, Électricien..."
                      className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localisation
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ville *</label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {locations.cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                {formData.city === "Dakar" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Quartier</label>
                    <select
                      name="zone"
                      value={formData.zone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">Tous quartiers</option>
                      {locations.dakar_zones.map((zone) => (
                        <option key={zone} value={zone}>{zone}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Adresse précise (optionnel)</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Ex: 123 Rue 10, Médina"
                  className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description du travail *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Décrivez précisément ce dont vous avez besoin..."
                className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>

            {/* Date & Time */}
            <div>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Disponibilité souhaitée
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date préférée</label>
                  <input
                    type="date"
                    name="preferred_date"
                    value={formData.preferred_date}
                    onChange={handleChange}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Heure préférée</label>
                  <select
                    name="preferred_time"
                    value={formData.preferred_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Flexible</option>
                    <option value="08:00-10:00">08h - 10h</option>
                    <option value="10:00-12:00">10h - 12h</option>
                    <option value="14:00-16:00">14h - 16h</option>
                    <option value="16:00-18:00">16h - 18h</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium mb-2">Budget estimé (optionnel)</label>
              <select
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">Non défini</option>
                <option value="< 10 000 FCFA">Moins de 10 000 FCFA</option>
                <option value="10 000 - 25 000 FCFA">10 000 - 25 000 FCFA</option>
                <option value="25 000 - 50 000 FCFA">25 000 - 50 000 FCFA</option>
                <option value="50 000 - 100 000 FCFA">50 000 - 100 000 FCFA</option>
                <option value="> 100 000 FCFA">Plus de 100 000 FCFA</option>
              </select>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Vos coordonnées
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom complet *</label>
                  <input
                    type="text"
                    name="client_name"
                    value={formData.client_name}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Téléphone *</label>
                  <input
                    type="tel"
                    name="client_phone"
                    value={formData.client_phone}
                    onChange={handleChange}
                    placeholder="77 123 45 67"
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">WhatsApp (si différent)</label>
                  <input
                    type="tel"
                    name="client_whatsapp"
                    value={formData.client_whatsapp}
                    onChange={handleChange}
                    placeholder="WhatsApp"
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email (optionnel)</label>
                  <input
                    type="email"
                    name="client_email"
                    value={formData.client_email}
                    onChange={handleChange}
                    placeholder="votre@email.com"
                    className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer ma demande
                </>
              )}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              En envoyant cette demande, vous acceptez d'être contacté par notre équipe et les prestataires.
            </p>
          </motion.form>
        </div>
      </div>
    </main>
  );
}
