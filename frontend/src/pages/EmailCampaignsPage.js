import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import {
  Mail,
  Plus,
  Send,
  Edit,
  Trash2,
  Eye,
  Users,
  BarChart3,
  FileText,
  TestTube,
  Loader2,
  Check,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Email templates
const EMAIL_TEMPLATES = [
  {
    id: "promo",
    name: "Promotion",
    subject: "🔥 Offre spéciale chez YAMA+ !",
    content: `
      <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Offre Exceptionnelle ! 🎉</h2>
      <p style="color: #333; line-height: 1.6; margin: 0 0 15px 0;">
        Profitez de <strong style="color: #E53935;">-20%</strong> sur tous nos produits !
      </p>
      <p style="color: #666; margin: 0 0 25px 0;">
        Offre valable jusqu'au [DATE]. Ne manquez pas cette opportunité !
      </p>
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="background-color: #1a1a1a; padding: 15px 30px; border-radius: 8px;">
            <a href="https://groupeyamaplus.com" style="color: #ffffff; text-decoration: none; font-weight: 600;">
              Découvrir les offres →
            </a>
          </td>
        </tr>
      </table>
    `
  },
  {
    id: "new_products",
    name: "Nouveaux produits",
    subject: "✨ Découvrez nos nouveautés !",
    content: `
      <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Nouveautés en magasin ! ✨</h2>
      <p style="color: #333; line-height: 1.6; margin: 0 0 15px 0;">
        De nouveaux produits viennent d'arriver chez YAMA+ !
      </p>
      <p style="color: #666; margin: 0 0 25px 0;">
        Smartphones, accessoires, décoration... Il y en a pour tous les goûts.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="background-color: #1a1a1a; padding: 15px 30px; border-radius: 8px;">
            <a href="https://groupeyamaplus.com/nouveautes" style="color: #ffffff; text-decoration: none; font-weight: 600;">
              Voir les nouveautés →
            </a>
          </td>
        </tr>
      </table>
    `
  },
  {
    id: "flash_sale",
    name: "Vente Flash",
    subject: "⚡ VENTE FLASH - 24h seulement !",
    content: `
      <h2 style="color: #E53935; margin: 0 0 20px 0;">⚡ VENTE FLASH !</h2>
      <p style="color: #333; line-height: 1.6; margin: 0 0 15px 0;">
        <strong>24 heures seulement</strong> pour profiter de prix exceptionnels !
      </p>
      <p style="color: #666; margin: 0 0 25px 0;">
        Jusqu'à <strong style="color: #E53935;">-50%</strong> sur une sélection de produits.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="background-color: #E53935; padding: 15px 30px; border-radius: 8px;">
            <a href="https://groupeyamaplus.com/promotions" style="color: #ffffff; text-decoration: none; font-weight: 600;">
              J'en profite maintenant →
            </a>
          </td>
        </tr>
      </table>
    `
  },
  {
    id: "custom",
    name: "Personnalisé",
    subject: "",
    content: `
      <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Votre titre ici</h2>
      <p style="color: #333; line-height: 1.6; margin: 0 0 15px 0;">
        Votre message ici...
      </p>
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="background-color: #1a1a1a; padding: 15px 30px; border-radius: 8px;">
            <a href="https://groupeyamaplus.com" style="color: #ffffff; text-decoration: none; font-weight: 600;">
              Bouton d'action →
            </a>
          </td>
        </tr>
      </table>
    `
  }
];

export default function EmailCampaignsPage({ onBack }) {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list, create, edit
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [sending, setSending] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    target_audience: "all"
  });

  useEffect(() => {
    fetchCampaigns();
    fetchStats();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/email/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.subject || !formData.content) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/admin/campaigns`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns([response.data, ...campaigns]);
      setView("list");
      setFormData({ name: "", subject: "", content: "", target_audience: "all" });
      toast.success("Campagne créée !");
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleUpdateCampaign = async () => {
    if (!selectedCampaign) return;

    try {
      await axios.put(`${API_URL}/api/admin/campaigns/${selectedCampaign.campaign_id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCampaigns();
      setView("list");
      toast.success("Campagne mise à jour !");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm("Supprimer cette campagne ?")) return;

    try {
      await axios.delete(`${API_URL}/api/admin/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(campaigns.filter(c => c.campaign_id !== campaignId));
      toast.success("Campagne supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSendTest = async (campaignId) => {
    const email = window.prompt("Email pour le test:", "");
    if (!email) return;

    try {
      await axios.post(`${API_URL}/api/admin/campaigns/${campaignId}/test`, 
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Email test envoyé à ${email}`);
    } catch (error) {
      toast.error("Erreur lors de l'envoi du test");
    }
  };

  const handleSendCampaign = async (campaign) => {
    if (!window.confirm(`Envoyer "${campaign.name}" à tous les destinataires ?`)) return;

    setSending(campaign.campaign_id);
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/campaigns/${campaign.campaign_id}/send`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      await fetchCampaigns();
      await fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setFormData({
      ...formData,
      subject: template.subject,
      content: template.content
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      sending: "bg-blue-100 text-blue-700",
      sent: "bg-green-100 text-green-700"
    };
    const labels = {
      draft: "Brouillon",
      sending: "En cours",
      sent: "Envoyée"
    };
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[status])}>
        {labels[status]}
      </span>
    );
  };

  if (view === "create" || view === "edit") {
    return (
      <div className="p-6">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour aux campagnes
        </button>

        <h2 className="text-2xl font-semibold mb-6">
          {view === "create" ? "Nouvelle campagne" : "Modifier la campagne"}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Nom de la campagne</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Promo Noël 2025"
                className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Objet de l&apos;email</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ex: 🎄 -30% sur tout le site !"
                className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Audience cible</label>
              <select
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent"
              >
                <option value="all">Tous (Newsletter + Clients)</option>
                <option value="newsletter">Abonnés newsletter uniquement</option>
                <option value="customers">Clients uniquement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Templates prédéfinis</label>
              <div className="grid grid-cols-2 gap-2">
                {EMAIL_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-3 text-left rounded-xl border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 transition-colors"
                  >
                    <span className="text-sm font-medium">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contenu HTML</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                placeholder="<h2>Votre titre</h2><p>Votre message...</p>"
                className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={view === "create" ? handleCreateCampaign : handleUpdateCampaign}
                className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90"
              >
                {view === "create" ? "Créer la campagne" : "Enregistrer"}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium mb-2">Aperçu</label>
            <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-[#f5f5f7]">
              <div className="bg-[#1a1a1a] text-white p-4 text-center">
                <h3 className="font-semibold">GROUPE YAMA+</h3>
                <p className="text-xs text-gray-400">Votre boutique premium au Sénégal</p>
              </div>
              <div 
                className="p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: formData.content || "<p class='text-gray-400'>Aperçu du contenu...</p>" }}
              />
              <div className="bg-[#f8f8f8] p-4 text-center text-xs text-gray-500">
                © 2025 GROUPE YAMA+ - Tous droits réservés
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Mail className="w-7 h-7" />
            Campagnes Email
          </h1>
          <p className="text-muted-foreground mt-1">
            Créez et envoyez des emails marketing à vos clients
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", subject: "", content: "", target_audience: "all" });
            setView("create");
          }}
          className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Nouvelle campagne
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.total_campaigns}</p>
                <p className="text-sm text-muted-foreground">Campagnes</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.total_emails_sent}</p>
                <p className="text-sm text-muted-foreground">Emails envoyés</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.newsletter_subscribers}</p>
                <p className="text-sm text-muted-foreground">Abonnés newsletter</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.registered_users}</p>
                <p className="text-sm text-muted-foreground">Clients inscrits</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune campagne pour le moment</p>
            <button
              onClick={() => setView("create")}
              className="mt-4 text-sm font-medium text-blue-600 hover:underline"
            >
              Créer votre première campagne
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-black/20">
              <tr>
                <th className="text-left p-4 font-medium">Campagne</th>
                <th className="text-left p-4 font-medium">Audience</th>
                <th className="text-left p-4 font-medium">Statut</th>
                <th className="text-left p-4 font-medium">Envoyés</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.campaign_id} className="border-t border-black/5 dark:border-white/5">
                  <td className="p-4">
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                  </td>
                  <td className="p-4">
                    <span className="capitalize">{campaign.target_audience}</span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(campaign.status)}
                  </td>
                  <td className="p-4">
                    {campaign.status === "sent" ? (
                      <span>{campaign.sent_count}/{campaign.total_recipients}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {campaign.status === "draft" && (
                        <>
                          <button
                            onClick={() => handleSendTest(campaign.campaign_id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                            title="Envoyer un test"
                          >
                            <TestTube className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCampaign(campaign);
                              setFormData({
                                name: campaign.name,
                                subject: campaign.subject,
                                content: campaign.content,
                                target_audience: campaign.target_audience
                              });
                              setView("edit");
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendCampaign(campaign)}
                            disabled={sending === campaign.campaign_id}
                            className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg text-green-600"
                            title="Envoyer"
                          >
                            {sending === campaign.campaign_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(campaign.campaign_id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {campaign.status === "sent" && (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Envoyée
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
