import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  User,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Lock,
  FileText,
  DollarSign,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProviderRegisterPage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState({ cities: [], dakar_zones: [] });
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(true);
  const [codeValid, setCodeValid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
    category: "",
    profession: "",
    city: "",
    zone: "",
    description: "",
    experience_years: "",
    price_from: "",
    price_description: "",
    invitation_code: inviteCode || "",
  });

  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    validateInviteCode();
    fetchCategories();
    fetchLocations();
  }, [inviteCode]);

  useEffect(() => {
    if (form.category && categories.length > 0) {
      const cat = categories.find(c => c.category_id === form.category);
      setSelectedCategory(cat || null);
    }
  }, [form.category, categories]);

  const validateInviteCode = async () => {
    // For now, accept any non-empty code or specific valid codes
    // In production, this would validate against the database
    const validCodes = ["YAMA2024", "PROVIDER", "WELCOME", inviteCode];
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    
    if (inviteCode && inviteCode.length >= 4) {
      setCodeValid(true);
    } else {
      setCodeValid(false);
    }
    setValidatingCode(false);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      toast.error("Veuillez indiquer votre nom");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Veuillez indiquer votre numéro de téléphone");
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (!form.category) {
      toast.error("Veuillez sélectionner une catégorie");
      return;
    }
    if (!form.profession.trim()) {
      toast.error("Veuillez indiquer votre métier");
      return;
    }
    if (!form.city) {
      toast.error("Veuillez sélectionner votre ville");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Veuillez décrire vos services");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email || null,
        phone: form.phone,
        whatsapp: form.whatsapp || form.phone,
        password: form.password,
        category: form.category,
        profession: form.profession,
        city: form.city,
        zone: form.zone || null,
        description: form.description,
        experience_years: form.experience_years ? parseInt(form.experience_years) : null,
        price_from: form.price_from ? parseInt(form.price_from.replace(/\D/g, '')) : null,
        price_description: form.price_description || null,
        invitation_code: inviteCode,
        photos: [],
      };

      await axios.post(`${API_URL}/api/services/providers`, payload);

      setSubmitted(true);
      toast.success("Inscription envoyée avec succès !");
    } catch (error) {
      console.error("Error registering:", error);
      const errorMsg = error.response?.data?.detail || "Erreur lors de l'inscription";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Loading state
  if (validatingCode) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Vérification du code d'invitation...</p>
        </div>
      </main>
    );
  }

  // Invalid code
  if (!codeValid) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A] px-4">
        <Helmet>
          <title>Code invalide - YAMA+ Services</title>
        </Helmet>
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Code d'invitation invalide</h1>
          <p className="text-muted-foreground mb-6">
            Ce lien d'inscription n'est pas valide ou a expiré. L'inscription des prestataires est uniquement sur invitation.
          </p>
          <Link
            to="/services"
            className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Parcourir les services
          </Link>
        </div>
      </main>
    );
  }

  // Success state
  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A] px-4">
        <Helmet>
          <title>Inscription envoyée - YAMA+ Services</title>
        </Helmet>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Inscription envoyée !</h1>
          <p className="text-muted-foreground mb-6">
            Votre demande d'inscription a été reçue. Notre équipe va examiner votre profil et vous contacter pour activer votre compte.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note :</strong> Vous recevrez un email de confirmation une fois votre profil approuvé par notre équipe.
            </p>
          </div>
          <Link
            to="/services"
            className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Parcourir les services
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] py-12">
      <Helmet>
        <title>Devenir prestataire - YAMA+ Services</title>
        <meta name="description" content="Inscrivez-vous comme prestataire sur YAMA+ et développez votre activité." />
      </Helmet>

      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Link to="/" className="inline-block mb-4">
              <img 
                src="/assets/images/logo_yama_full.png" 
                alt="Groupe YAMA+" 
                className="h-20 w-auto mx-auto"
              />
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium mb-4">
              <CheckCircle className="w-4 h-4" />
              Code d'invitation validé
            </div>
            <h1 className="text-3xl font-bold mb-3">Devenir prestataire YAMA+</h1>
            <p className="text-muted-foreground">
              Créez votre profil professionnel et recevez des clients
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Personal Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="Prénom et Nom"
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                    required
                    data-testid="provider-name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Téléphone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      placeholder="+221 77 000 00 00"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                      required
                      data-testid="provider-phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) => updateForm("whatsapp", e.target.value)}
                      placeholder="Si différent du téléphone"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                      data-testid="provider-whatsapp"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                    data-testid="provider-email"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        placeholder="Min. 6 caractères"
                        className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400 pr-10"
                        required
                        data-testid="provider-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Confirmer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => updateForm("confirmPassword", e.target.value)}
                      placeholder="Répétez le mot de passe"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                      required
                      data-testid="provider-confirm-password"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Activité professionnelle
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      updateForm("category", e.target.value);
                      updateForm("profession", "");
                    }}
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                    required
                    data-testid="provider-category"
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.icon} {cat.name_fr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Métier <span className="text-red-500">*</span>
                  </label>
                  {selectedCategory?.subcategories?.length > 0 ? (
                    <select
                      value={form.profession}
                      onChange={(e) => updateForm("profession", e.target.value)}
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                      required
                      data-testid="provider-profession"
                    >
                      <option value="">Sélectionnez votre métier</option>
                      {selectedCategory.subcategories.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="Autre">Autre</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.profession}
                      onChange={(e) => updateForm("profession", e.target.value)}
                      placeholder="Ex: Plombier, Électricien, Peintre..."
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                      required
                      data-testid="provider-profession-input"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Années d'expérience</label>
                  <input
                    type="number"
                    value={form.experience_years}
                    onChange={(e) => updateForm("experience_years", e.target.value)}
                    placeholder="Ex: 5"
                    min="0"
                    max="50"
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                    data-testid="provider-experience"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description de vos services <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    rows={4}
                    placeholder="Décrivez vos compétences, vos spécialités, les types de travaux que vous réalisez..."
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                    required
                    data-testid="provider-description"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Zone d'intervention
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ville principale <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.city}
                    onChange={(e) => {
                      updateForm("city", e.target.value);
                      updateForm("zone", "");
                    }}
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                    required
                    data-testid="provider-city"
                  >
                    <option value="">Sélectionnez une ville</option>
                    {locations.cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {form.city === "Dakar" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Quartier principal</label>
                    <select
                      value={form.zone}
                      onChange={(e) => updateForm("zone", e.target.value)}
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                      data-testid="provider-zone"
                    >
                      <option value="">Tous les quartiers</option>
                      {locations.dakar_zones.map((zone) => (
                        <option key={zone} value={zone}>{zone}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Tarification (optionnel)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Prix de départ (FCFA)</label>
                  <input
                    type="text"
                    value={form.price_from}
                    onChange={(e) => updateForm("price_from", e.target.value)}
                    placeholder="Ex: 5000"
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                    data-testid="provider-price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Précisions tarif</label>
                  <input
                    type="text"
                    value={form.price_description}
                    onChange={(e) => updateForm("price_description", e.target.value)}
                    placeholder="Ex: par heure, par m², devis gratuit..."
                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400"
                    data-testid="provider-price-desc"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="submit-provider-btn"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Soumettre mon inscription
                </>
              )}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Votre profil sera examiné par notre équipe avant d'être publié
            </p>
          </motion.form>
        </div>
      </div>
    </main>
  );
}
