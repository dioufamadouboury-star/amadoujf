import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  User,
  Settings,
  Briefcase,
  Star,
  MapPin,
  Phone,
  Mail,
  Camera,
  Edit,
  Save,
  Clock,
  Eye,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  LogOut,
  BarChart3,
  Upload,
  X,
  Plus,
  Trash2,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Youtube,
  Share2,
  Image as ImageIcon,
  ExternalLink,
  Link as LinkIcon,
  FileText,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Document Upload Component for verification
function DocumentUploadSection({ provider, onRefresh }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const documentTypes = [
    { id: "cni_front", label: "CNI (recto)", icon: CreditCard, required: true },
    { id: "cni_back", label: "CNI (verso)", icon: CreditCard, required: false },
    { id: "photo", label: "Photo d'identité", icon: User, required: true },
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await axios.get(
        `${API_URL}/api/services/providers/${provider.provider_id}/verification-documents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDocs(response.data.documents || []);
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (docType, url) => {
    if (!url.trim()) {
      toast.error("Veuillez entrer une URL valide");
      return;
    }
    
    setUploading(true);
    try {
      const token = localStorage.getItem("auth_token");
      await axios.post(
        `${API_URL}/api/services/providers/${provider.provider_id}/verification-documents`,
        {
          document_type: docType,
          document_url: url.trim(),
          description: documentTypes.find(d => d.id === docType)?.label || docType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Document soumis avec succès !");
      fetchDocuments();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error("Erreur lors de l'envoi du document");
    } finally {
      setUploading(false);
    }
  };

  const getDocStatus = (docType) => {
    const doc = docs.find(d => d.document_type === docType);
    return doc ? doc.status : "not_uploaded";
  };

  const getDocUrl = (docType) => {
    const doc = docs.find(d => d.document_type === docType);
    return doc ? doc.document_url : "";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
      <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
        <FileText className="w-5 h-5 text-yellow-500" />
        Documents de vérification
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Soumettez votre CNI et photo pour valider votre profil. Ces documents sont confidentiels et ne seront pas partagés.
      </p>

      <div className="space-y-4">
        {documentTypes.map(({ id, label, icon: Icon, required }) => {
          const status = getDocStatus(id);
          const existingUrl = getDocUrl(id);
          
          return (
            <div key={id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    status === "approved" ? "bg-green-100 text-green-600" :
                    status === "pending" ? "bg-yellow-100 text-yellow-600" :
                    status === "rejected" ? "bg-red-100 text-red-600" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{label} {required && <span className="text-red-500">*</span>}</p>
                    <p className="text-xs text-muted-foreground">
                      {status === "approved" && "✓ Approuvé"}
                      {status === "pending" && "⏳ En cours de vérification"}
                      {status === "rejected" && "✗ Rejeté - Veuillez renvoyer"}
                      {status === "not_uploaded" && "Non soumis"}
                    </p>
                  </div>
                </div>
              </div>

              {status !== "approved" && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    id={`doc-url-${id}`}
                    placeholder="https://lien-vers-votre-document.jpg"
                    defaultValue={existingUrl}
                    className="flex-1 p-3 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`doc-url-${id}`);
                      handleUpload(id, input.value);
                    }}
                    disabled={uploading}
                    className="px-4 py-2 bg-yellow-400 text-black font-medium rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {status === "pending" ? "Renvoyer" : "Envoyer"}
                  </button>
                </div>
              )}

              {status === "approved" && existingUrl && (
                <a
                  href={existingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Voir le document
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>💡 Conseil :</strong> Pour télécharger vos documents, vous pouvez utiliser un service gratuit comme Google Drive, Imgur, ou nous envoyer directement vos images via WhatsApp au <strong>+221 78 382 75 75</strong>
        </p>
      </div>
    </div>
  );
}

export default function ProviderDashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [editForm, setEditForm] = useState({
    description: "",
    availability: "available",
    price_from: "",
    price_description: "",
    phone: "",
    whatsapp: "",
    email: "",
    services: [],
    social_links: {
      facebook: "",
      instagram: "",
      linkedin: "",
      twitter: "",
      tiktok: "",
      youtube: "",
      website: "",
    }
  });

  const [newService, setNewService] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (!user) {
      navigate("/login");
      return;
    }
    fetchProviderProfile();
  }, [user, authLoading, navigate]);

  const fetchProviderProfile = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await axios.get(`${API_URL}/api/services/provider/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProvider(response.data);
      setEditForm({
        description: response.data.description || "",
        availability: response.data.availability || "available",
        price_from: response.data.price_from?.toString() || "",
        price_description: response.data.price_description || "",
        phone: response.data.phone || "",
        whatsapp: response.data.whatsapp || "",
        email: response.data.email || "",
        services: response.data.services || [],
        social_links: {
          facebook: response.data.social_links?.facebook || "",
          instagram: response.data.social_links?.instagram || "",
          linkedin: response.data.social_links?.linkedin || "",
          twitter: response.data.social_links?.twitter || "",
          tiktok: response.data.social_links?.tiktok || "",
          youtube: response.data.social_links?.youtube || "",
          website: response.data.social_links?.website || "",
        }
      });
    } catch (error) {
      if (error.response?.status === 404) {
        // User is not a provider
        setProvider(null);
      } else {
        console.error("Error fetching provider:", error);
        toast.error("Erreur lors du chargement du profil");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      await axios.put(
        `${API_URL}/api/services/provider/me`,
        {
          ...editForm,
          price_from: editForm.price_from ? parseInt(editForm.price_from) : null,
          services: editForm.services,
          social_links: editForm.social_links,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Profil mis à jour !");
      setEditing(false);
      fetchProviderProfile();
    } catch (error) {
      console.error("Error updating provider:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();

  // Handle file upload for gallery photos
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop grande. Maximum 5 MB");
      return;
    }
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG ou WebP");
      return;
    }
    
    const uploadingToast = toast.loading("Upload en cours...");
    
    try {
      const token = localStorage.getItem("auth_token");
      
      // First upload the image to get URL
      const formData = new FormData();
      formData.append("file", file);
      
      const uploadResponse = await axios.post(
        `${API_URL}/api/upload/image`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          } 
        }
      );
      
      // Convert relative URL to absolute URL
      let imageUrl = uploadResponse.data.url;
      if (imageUrl.startsWith('/api/')) {
        imageUrl = `${API_URL}${imageUrl}`;
      }
      
      // Then add to gallery
      await axios.post(
        `${API_URL}/api/services/providers/${provider.provider_id}/gallery`,
        { image_url: imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.dismiss(uploadingToast);
      toast.success("Photo ajoutée à votre galerie !");
      fetchProviderProfile();
      
    } catch (error) {
      toast.dismiss(uploadingToast);
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Erreur lors de l'upload");
    }
  };
    navigate("/");
  };

  // Auth loading - show spinner while checking auth
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Vérification de la session...</p>
        </div>
      </main>
    );
  }

  // Loading provider data
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </main>
    );
  }

  // Not a provider
  if (!provider) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A] px-4">
        <Helmet>
          <title>Tableau de bord prestataire - YAMA+</title>
        </Helmet>
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Pas encore prestataire ?</h1>
          <p className="text-muted-foreground mb-6">
            Vous n'avez pas encore de profil prestataire. L'inscription est sur invitation uniquement.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/services"
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Parcourir les services
            </Link>
            <Link
              to="/account"
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Mon compte
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Pending approval - with document upload
  if (!provider.is_active) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] px-4 py-8">
        <Helmet>
          <title>En attente d'approbation - YAMA+</title>
        </Helmet>
        <div className="max-w-lg mx-auto">
          {/* Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold mb-3">En attente d'approbation</h1>
            <p className="text-muted-foreground mb-6">
              Votre profil prestataire est en cours de vérification. Pour accélérer le processus, veuillez soumettre vos documents d'identité.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold mb-2">Votre profil</h3>
              <p className="text-sm text-muted-foreground">
                <strong>Nom:</strong> {provider.name}<br />
                <strong>Métier:</strong> {provider.profession}<br />
                <strong>Ville:</strong> {provider.city}
              </p>
            </div>
          </div>

          {/* Document Upload Section */}
          <DocumentUploadSection provider={provider} onRefresh={fetchProviderProfile} />

          <div className="text-center mt-6">
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      <Helmet>
        <title>Tableau de bord - {provider.name} | YAMA+</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  {provider.photos?.[0] ? (
                    <img
                      src={provider.photos[0]}
                      alt={provider.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      👷
                    </div>
                  )}
                </div>
                {provider.is_verified && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{provider.name}</h1>
                <p className="text-muted-foreground">{provider.profession}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {provider.city}
                  </span>
                  {provider.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      {provider.rating} ({provider.review_count} avis)
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  to={`/provider/${provider.provider_id}`}
                  className="px-4 py-2 flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  target="_blank"
                >
                  <Eye className="w-4 h-4" />
                  Voir mon profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
              <span className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                provider.availability === "available"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : provider.availability === "busy"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                <Clock className="w-3 h-3" />
                {provider.availability === "available" ? "Disponible" :
                 provider.availability === "busy" ? "Occupé" : "Non disponible"}
              </span>
              {provider.is_verified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                  <CheckCircle className="w-3 h-3" />
                  Vérifié YAMA+
                </span>
              )}
              {provider.is_premium && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium">
                  <Star className="w-3 h-3" />
                  Premium
                </span>
              )}
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: "profile", label: "Mon profil", icon: User },
              { id: "gallery", label: "Galerie photos", icon: ImageIcon },
              { id: "stats", label: "Statistiques", icon: BarChart3 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                  activeTab === id
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Edit Form */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Informations
                  </h2>
                  {editing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(false)}
                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg flex items-center gap-2"
                      >
                        {saving ? (
                          <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Enregistrer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Availability */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Disponibilité</label>
                    <select
                      value={editForm.availability}
                      onChange={(e) => setEditForm({ ...editForm, availability: e.target.value })}
                      disabled={!editing}
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    >
                      <option value="available">Disponible</option>
                      <option value="busy">Occupé</option>
                      <option value="unavailable">Non disponible</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      disabled={!editing}
                      rows={4}
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    />
                  </div>

                  {/* Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        disabled={!editing}
                        className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">WhatsApp</label>
                      <input
                        type="tel"
                        value={editForm.whatsapp}
                        onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                        disabled={!editing}
                        className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Prix de départ (FCFA)</label>
                      <input
                        type="text"
                        value={editForm.price_from}
                        onChange={(e) => setEditForm({ ...editForm, price_from: e.target.value })}
                        disabled={!editing}
                        className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Précisions tarif</label>
                      <input
                        type="text"
                        value={editForm.price_description}
                        onChange={(e) => setEditForm({ ...editForm, price_description: e.target.value })}
                        disabled={!editing}
                        className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Email professionnel</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      disabled={!editing}
                      placeholder="contact@exemple.com"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    />
                  </div>

                  {/* Services */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      Services proposés
                    </label>
                    {editing && (
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={newService}
                          onChange={(e) => setNewService(e.target.value)}
                          placeholder="Ex: Réparation de fuites"
                          className="flex-1 p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                        />
                        <button
                          onClick={() => {
                            if (newService.trim()) {
                              setEditForm({
                                ...editForm,
                                services: [...editForm.services, newService.trim()]
                              });
                              setNewService("");
                            }
                          }}
                          className="px-4 py-2 bg-yellow-400 text-black font-medium rounded-xl"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {editForm.services.map((service, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                        >
                          {service}
                          {editing && (
                            <button
                              onClick={() => {
                                setEditForm({
                                  ...editForm,
                                  services: editForm.services.filter((_, idx) => idx !== i)
                                });
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                      {editForm.services.length === 0 && (
                        <p className="text-sm text-muted-foreground">Aucun service ajouté</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links Section */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <h2 className="font-semibold flex items-center gap-2 mb-4">
                  <Share2 className="w-5 h-5" />
                  Réseaux sociaux
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Ajoutez vos liens de réseaux sociaux pour que vos clients puissent vous suivre
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Facebook */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Facebook className="w-4 h-4 text-blue-600" />
                      Facebook
                    </label>
                    <input
                      type="url"
                      value={editForm.social_links.facebook}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, facebook: e.target.value }
                      })}
                      disabled={!editing}
                      placeholder="https://facebook.com/votre-page"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    />
                  </div>

                  {/* Instagram */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Instagram className="w-4 h-4 text-pink-600" />
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={editForm.social_links.instagram}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, instagram: e.target.value }
                      })}
                      disabled={!editing}
                      placeholder="https://instagram.com/votre-compte"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Linkedin className="w-4 h-4 text-blue-700" />
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={editForm.social_links.linkedin}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, linkedin: e.target.value }
                      })}
                      disabled={!editing}
                      placeholder="https://linkedin.com/in/votre-profil"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    />
                  </div>

                  {/* Twitter/X */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Twitter className="w-4 h-4 text-sky-500" />
                      Twitter / X
                    </label>
                    <input
                      type="url"
                      value={editForm.social_links.twitter}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, twitter: e.target.value }
                      })}
                      disabled={!editing}
                      placeholder="https://twitter.com/votre-compte"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    />
                  </div>

                  {/* TikTok */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                      </svg>
                      TikTok
                    </label>
                    <input
                      type="url"
                      value={editForm.social_links.tiktok}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, tiktok: e.target.value }
                      })}
                      disabled={!editing}
                      placeholder="https://tiktok.com/@votre-compte"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    />
                  </div>

                  {/* YouTube */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Youtube className="w-4 h-4 text-red-600" />
                      YouTube
                    </label>
                    <input
                      type="url"
                      value={editForm.social_links.youtube}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, youtube: e.target.value }
                      })}
                      disabled={!editing}
                      placeholder="https://youtube.com/@votre-chaine"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    />
                  </div>

                  {/* Website */}
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Globe className="w-4 h-4" />
                      Site web personnel
                    </label>
                    <input
                      type="url"
                      value={editForm.social_links.website}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        social_links: { ...editForm.social_links, website: e.target.value }
                      })}
                      disabled={!editing}
                      placeholder="https://votre-site.com"
                      className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              {/* Profile Link Card */}
              <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-2xl p-6">
                <h2 className="font-semibold flex items-center gap-2 mb-2">
                  <LinkIcon className="w-5 h-5 text-yellow-500" />
                  Votre lien de profil YAMA+
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Partagez ce lien sur vos réseaux sociaux, cartes de visite, etc.
                </p>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-xl">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/provider/${provider.provider_id}`}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/provider/${provider.provider_id}`);
                      toast.success("Lien copié !");
                    }}
                    className="px-4 py-2 bg-yellow-400 text-black font-medium rounded-lg text-sm flex items-center gap-2"
                  >
                    Copier
                  </button>
                </div>
                <div className="flex gap-3 mt-4">
                  <a
                    href={`https://wa.me/?text=Découvrez mon profil professionnel sur YAMA+ ${window.location.origin}/provider/${provider.provider_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + "/provider/" + provider.provider_id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </a>
                  <Link
                    to={`/provider/${provider.provider_id}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Ma galerie photos ({provider.photos?.length || 0})
                  </h2>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6">
                  Ajoutez des photos de vos réalisations pour attirer plus de clients. Les images de qualité augmentent la confiance.
                </p>

                {/* Photo Upload - Direct File Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Ajouter une photo</label>
                  
                  {/* File Upload Zone */}
                  <div 
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-yellow-400 transition-colors cursor-pointer mb-4"
                    onClick={() => document.getElementById("gallery-file-input").click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-yellow-400", "bg-yellow-50", "dark:bg-yellow-900/10"); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove("border-yellow-400", "bg-yellow-50", "dark:bg-yellow-900/10"); }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-yellow-400", "bg-yellow-50", "dark:bg-yellow-900/10");
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith("image/")) {
                        await handleFileUpload(file);
                      } else {
                        toast.error("Veuillez déposer une image (JPG, PNG, WebP)");
                      }
                    }}
                  >
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Cliquez ou glissez-déposez une image
                    </p>
                    <p className="text-sm text-gray-400 mt-1">JPG, PNG, WebP - Max 5 MB</p>
                  </div>
                  
                  <input
                    type="file"
                    id="gallery-file-input"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        await handleFileUpload(file);
                        e.target.value = "";
                      }
                    }}
                  />
                  
                  {/* Or URL input */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-sm text-gray-500">ou via URL</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="url"
                      id="new-photo-url"
                      placeholder="https://exemple.com/image.jpg"
                      className="flex-1 p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600"
                    />
                    <button
                      onClick={async () => {
                        const input = document.getElementById("new-photo-url");
                        const url = input.value.trim();
                        if (!url) {
                          toast.error("Veuillez entrer une URL d'image");
                          return;
                        }
                        try {
                          const token = localStorage.getItem("auth_token");
                          await axios.post(
                            `${API_URL}/api/services/providers/${provider.provider_id}/gallery`,
                            { image_url: url },
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          toast.success("Photo ajoutée !");
                          input.value = "";
                          fetchProviderProfile();
                        } catch (error) {
                          toast.error("Erreur lors de l'ajout");
                        }
                      }}
                      className="px-6 py-3 bg-yellow-400 text-black font-medium rounded-xl flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Ajouter
                    </button>
                  </div>
                </div>

                {/* Photo Grid */}
                {provider.photos?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {provider.photos.map((photo, i) => (
                      <div key={i} className="aspect-square relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img
                          src={photo}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={async () => {
                              if (!confirm("Supprimer cette photo ?")) return;
                              try {
                                const token = localStorage.getItem("auth_token");
                                // Get gallery to find photo_id
                                const response = await axios.get(
                                  `${API_URL}/api/services/providers/${provider.provider_id}/gallery`,
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                const gallery = response.data.gallery || [];
                                const photoItem = gallery.find(p => p.image_url === photo);
                                if (photoItem) {
                                  await axios.delete(
                                    `${API_URL}/api/services/providers/${provider.provider_id}/gallery/${photoItem.photo_id}`,
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  toast.success("Photo supprimée");
                                  fetchProviderProfile();
                                }
                              } catch (error) {
                                toast.error("Erreur lors de la suppression");
                              }
                            }}
                            className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-muted-foreground mb-4">Aucune photo dans votre galerie</p>
                    <p className="text-sm text-muted-foreground">
                      Ajoutez des photos de vos réalisations pour montrer votre travail
                    </p>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">💡 Conseils pour de bonnes photos</h3>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Prenez des photos en bonne lumière</li>
                  <li>• Montrez vos réalisations avant/après</li>
                  <li>• Utilisez des images de haute qualité</li>
                  <li>• Variez les types de travaux</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6"
            >
              <h2 className="font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Vos statistiques
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">{provider.review_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Avis reçus</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">{provider.rating || 0}</p>
                  <p className="text-sm text-muted-foreground">Note moyenne</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">{provider.completed_jobs || 0}</p>
                  <p className="text-sm text-muted-foreground">Travaux terminés</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">{provider.photos?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Photos</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-muted-foreground text-center">
                  Plus de statistiques détaillées seront disponibles prochainement.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
