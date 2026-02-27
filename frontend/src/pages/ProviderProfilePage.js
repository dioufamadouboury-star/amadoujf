import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  MapPin,
  Star,
  Phone,
  MessageCircle,
  BadgeCheck,
  Crown,
  Clock,
  Briefcase,
  ChevronLeft,
  Share2,
  Image as ImageIcon,
  User,
  X,
  Copy,
  Check,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Youtube,
  Heart,
  Award,
  Zap,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Calendar,
  Shield,
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Social media icons mapping
const socialIcons = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  ),
  whatsapp: MessageCircle,
  website: Globe,
};

export default function ProviderProfilePage() {
  const { providerId } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("about");
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
    client_name: "",
    client_phone: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchProvider();
  }, [providerId]);

  const fetchProvider = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/services/providers/${providerId}`);
      setProvider(response.data);
    } catch (error) {
      console.error("Error fetching provider:", error);
      toast.error("Prestataire non trouvé");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim() || !reviewForm.client_name.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSubmittingReview(true);
    try {
      await axios.post(
        `${API_URL}/api/services/providers/${providerId}/reviews`,
        null,
        { params: reviewForm }
      );
      toast.success("Avis envoyé avec succès !");
      setShowReviewForm(false);
      setReviewForm({ rating: 5, comment: "", client_name: "", client_phone: "" });
      fetchProvider();
    } catch (error) {
      toast.error("Erreur lors de l'envoi de l'avis");
    } finally {
      setSubmittingReview(false);
    }
  };

  const profileUrl = window.location.href;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (platform) => {
    const text = `Découvrez ${provider.name}, ${provider.profession} sur YAMA+ Services`;
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + profileUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
    };
    
    if (platform === "native" && navigator.share) {
      try {
        await navigator.share({ title: provider.name, text, url: profileUrl });
      } catch (e) {
        console.log("Share cancelled");
      }
    } else if (urls[platform]) {
      window.open(urls[platform], "_blank", "width=600,height=400");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-3 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl mb-6">😕</motion.div>
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Prestataire non trouvé</h1>
        <Link to="/services" className="px-6 py-3 bg-yellow-400 text-black font-medium rounded-full hover:bg-yellow-300 transition-colors">
          Retour aux services
        </Link>
      </div>
    );
  }

  const whatsappLink = `https://wa.me/${provider.whatsapp?.replace(/[^0-9]/g, "") || provider.phone?.replace(/[^0-9]/g, "")}?text=Bonjour ${provider.name}, je vous contacte via YAMA+ Services...`;
  const socialLinks = provider.social_links || {};
  const gallery = provider.gallery || provider.photos?.map((url, i) => ({ photo_id: i, image_url: url })) || [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Helmet>
        <title>{provider.name} - {provider.profession} | YAMA+ Services</title>
        <meta name="description" content={`${provider.name}, ${provider.profession} à ${provider.city}. ${provider.description?.substring(0, 150)}`} />
        <meta property="og:title" content={`${provider.name} - ${provider.profession}`} />
        <meta property="og:description" content={provider.description?.substring(0, 150)} />
        <meta property="og:image" content={provider.photos?.[0] || ""} />
      </Helmet>

      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              to="/services"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-full transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Services</span>
            </Link>
            {/* Share button removed - Link sharing is managed by admin/provider only */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Shield className="w-4 h-4 text-yellow-500" />
              <span>YAMA+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section - Light Theme */}
      <section className="relative py-8 lg:py-12 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-200 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Profile Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative mx-auto lg:mx-0"
            >
              <div className="w-40 h-40 lg:w-52 lg:h-52 rounded-3xl overflow-hidden bg-gradient-to-br from-yellow-100 to-yellow-50 shadow-xl border-4 border-white">
                {provider.photos?.[0] ? (
                  <img
                    src={provider.photos[0]}
                    alt={provider.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    👷
                  </div>
                )}
              </div>
              {/* Premium Badge */}
              {provider.is_premium && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <Crown className="w-6 h-6 text-white" />
                </motion.div>
              )}
            </motion.div>

            {/* Profile Info */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4"
              >
                {provider.is_verified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-full">
                    <BadgeCheck className="w-4 h-4" />
                    Vérifié YAMA+
                  </span>
                )}
                {provider.experience_years && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                    <Award className="w-4 h-4" />
                    {provider.experience_years} ans d'expérience
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-full">
                  <Shield className="w-4 h-4" />
                  Profil certifié
                </span>
              </motion.div>

              {/* Name & Profession */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2"
              >
                {provider.name}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl lg:text-2xl text-yellow-600 font-semibold mb-4"
              >
                {provider.profession}
              </motion.p>

              {/* Location & Stats */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap justify-center lg:justify-start items-center gap-4 text-gray-600 mb-6"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-yellow-500" />
                  {provider.city}{provider.zone ? `, ${provider.zone}` : ""}
                </span>
                {provider.review_count > 0 && (
                  <span className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold text-gray-900">{provider.rating}</span>
                    <span>({provider.review_count} avis)</span>
                  </span>
                )}
                {provider.price_from && (
                  <span className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-full">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    À partir de <span className="font-bold text-gray-900">{provider.price_from.toLocaleString()} FCFA</span>
                  </span>
                )}
              </motion.div>

              {/* CTA Buttons - REMOVED: Client should not contact provider directly */}
              {/* Contact goes through YAMA+ platform */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap justify-center lg:justify-start gap-3"
              >
                <div className="flex items-center gap-2 px-6 py-3 bg-yellow-50 border-2 border-yellow-200 text-yellow-800 font-medium rounded-xl">
                  <BadgeCheck className="w-5 h-5" />
                  Prestataire vérifié YAMA+
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Navigation Tabs */}
            <div className="bg-white rounded-2xl p-2 shadow-sm flex gap-2 overflow-x-auto">
              {[
                { id: "about", label: "À propos", icon: User },
                { id: "gallery", label: "Galerie", icon: ImageIcon },
                { id: "reviews", label: "Avis", icon: Star },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all flex-1 justify-center",
                    activeTab === tab.id
                      ? "bg-yellow-400 text-black shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === "about" && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Description */}
                  {provider.description && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                        Présentation
                      </h2>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                        {provider.description}
                      </p>
                    </div>
                  )}

                  {/* Services */}
                  {provider.services?.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                        <Briefcase className="w-5 h-5 text-yellow-500" />
                        Services proposés
                      </h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {provider.services.map((service, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                          >
                            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                              <Check className="w-5 h-5 text-yellow-600" />
                            </div>
                            <span className="font-medium text-gray-800">{service}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Années d'exp.", value: provider.experience_years || "N/A", icon: Award, color: "bg-blue-50 text-blue-600" },
                      { label: "Projets", value: provider.projects_count || "50+", icon: Briefcase, color: "bg-green-50 text-green-600" },
                      { label: "Clients", value: provider.review_count || "0", icon: Heart, color: "bg-pink-50 text-pink-600" },
                      { label: "Note", value: provider.rating || "N/A", icon: Star, color: "bg-yellow-50 text-yellow-600" },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white rounded-2xl p-5 text-center shadow-sm"
                      >
                        <div className={cn("w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center", stat.color)}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "gallery" && (
                <motion.div
                  key="gallery"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                      <ImageIcon className="w-5 h-5 text-yellow-500" />
                      Galerie Photos
                    </h2>
                    <span className="text-gray-500">{gallery.length} photos</span>
                  </div>

                  {gallery.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {gallery.map((photo, i) => (
                        <motion.button
                          key={photo.photo_id || i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setSelectedImage(photo.image_url || photo)}
                          className="aspect-square rounded-2xl overflow-hidden bg-gray-100 hover:ring-4 hover:ring-yellow-400 transition-all group relative shadow-sm"
                        >
                          <img
                            src={photo.image_url || photo}
                            alt={photo.caption || `Photo ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl">
                      <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">Pas encore de photos dans la galerie</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "reviews" && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Avis clients
                    </h2>
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="px-4 py-2 bg-yellow-400 text-black font-medium rounded-xl hover:bg-yellow-300 transition-colors"
                    >
                      Laisser un avis
                    </button>
                  </div>

                  {provider.reviews?.length > 0 ? (
                    <div className="space-y-4">
                      {provider.reviews.map((review, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-gray-50 rounded-2xl p-5"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {review.client_name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{review.client_name}</h4>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, j) => (
                                    <Star
                                      key={j}
                                      className={cn(
                                        "w-4 h-4",
                                        j < review.rating
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-gray-200"
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-gray-600">{review.comment}</p>
                              <p className="text-xs text-gray-400 mt-2">{review.created_at}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl">
                      <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-4">Pas encore d'avis</p>
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="px-6 py-3 bg-yellow-400 text-black font-medium rounded-xl hover:bg-yellow-300 transition-colors"
                      >
                        Soyez le premier à donner votre avis
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Info Card - No direct contact */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <h3 className="text-lg font-bold mb-4 text-gray-900">À propos de {provider.name}</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-yellow-200 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-yellow-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Prestataire Certifié</p>
                    <p className="text-gray-500 text-sm">Vérifié par YAMA+</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{provider.profession}</p>
                    <p className="text-gray-500 text-sm">{provider.experience_years ? `${provider.experience_years} ans d'expérience` : "Professionnel expérimenté"}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-500 text-center mt-4">
                  Pour contacter ce prestataire, veuillez passer par YAMA+
                </p>
              </div>
            </motion.div>

            {/* Location Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                <MapPin className="w-5 h-5 text-yellow-500" />
                Localisation
              </h3>
              <p className="text-gray-800 font-medium">{provider.city}</p>
              {provider.zone && <p className="text-gray-500">{provider.zone}</p>}
              {provider.address && <p className="text-gray-500 mt-2">{provider.address}</p>}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Form Modal */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowReviewForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Laisser un avis</h3>
                <button onClick={() => setShowReviewForm(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Note</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="p-1"
                      >
                        <Star
                          className={cn(
                            "w-8 h-8 transition-colors",
                            star <= reviewForm.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-200"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Votre nom *</label>
                  <input
                    type="text"
                    required
                    value={reviewForm.client_name}
                    onChange={(e) => setReviewForm({ ...reviewForm, client_name: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none"
                    placeholder="Jean Dupont"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Téléphone (optionnel)</label>
                  <input
                    type="tel"
                    value={reviewForm.client_phone}
                    onChange={(e) => setReviewForm({ ...reviewForm, client_phone: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none"
                    placeholder="77 123 45 67"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Votre avis *</label>
                  <textarea
                    required
                    rows={4}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none resize-none"
                    placeholder="Partagez votre expérience..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50"
                >
                  {submittingReview ? "Envoi..." : "Envoyer mon avis"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Partager le profil</h3>
                <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { platform: "whatsapp", label: "WhatsApp", color: "bg-green-500", icon: MessageCircle },
                  { platform: "facebook", label: "Facebook", color: "bg-blue-600", icon: Facebook },
                  { platform: "twitter", label: "Twitter", color: "bg-sky-500", icon: Twitter },
                  { platform: "linkedin", label: "LinkedIn", color: "bg-blue-700", icon: Linkedin },
                ].map(({ platform, label, color, icon: Icon }) => (
                  <button
                    key={platform}
                    onClick={() => handleShare(platform)}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-gray-600">{label}</span>
                  </button>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 truncate text-sm text-gray-600">{profileUrl}</div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black font-medium rounded-lg hover:bg-yellow-300 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copié" : "Copier"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
