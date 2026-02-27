import { useState, useEffect } from "react";
import axios from "axios";
import {
  Search,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Star,
  BadgeCheck,
  Crown,
  Clock,
  Plus,
  Copy,
  ExternalLink,
  Filter,
  RefreshCw,
} from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Service Providers Admin Component
export function ServiceProvidersAdmin({ token }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [statusFilter]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const response = await axios.get(`${API_URL}/api/admin/service-providers${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProviders(response.data.providers || response.data || []);
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Erreur lors du chargement des prestataires");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (providerId) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/service-providers/${providerId}`,
        { is_active: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Prestataire approuvé !");
      fetchProviders();
    } catch (error) {
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleVerify = async (providerId, isVerified) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/service-providers/${providerId}`,
        { is_verified: isVerified },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(isVerified ? "Badge vérifié ajouté !" : "Badge retiré");
      fetchProviders();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeactivate = async (providerId) => {
    if (!window.confirm("Voulez-vous vraiment désactiver ce prestataire ?")) return;
    
    try {
      await axios.put(
        `${API_URL}/api/admin/service-providers/${providerId}`,
        { is_active: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Prestataire désactivé");
      fetchProviders();
    } catch (error) {
      toast.error("Erreur lors de la désactivation");
    }
  };

  const handleDelete = async (providerId) => {
    if (!window.confirm("Supprimer définitivement ce prestataire ?")) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/service-providers/${providerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Prestataire supprimé");
      fetchProviders();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/provider/register/YAMAPLUS2025`;
    navigator.clipboard.writeText(link);
    toast.success("Lien d'invitation copié !");
  };

  const filteredProviders = providers.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profession?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = providers.filter(p => !p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Prestataires de Services</h1>
          <p className="text-muted-foreground">
            {providers.length} prestataires • {pendingCount} en attente d'approbation
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black font-medium rounded-xl hover:bg-yellow-300"
          >
            <Copy className="w-4 h-4" />
            Copier lien d'invitation
          </button>
          <button
            onClick={fetchProviders}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un prestataire..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="active">Actifs</option>
          <option value="inactive">Désactivés</option>
        </select>
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{pendingCount} prestataire(s) en attente d'approbation</span>
          </div>
        </div>
      )}

      {/* Providers List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
          <p className="text-muted-foreground">Aucun prestataire trouvé</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProviders.map((provider) => (
            <div
              key={provider.provider_id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Photo */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {provider.photos?.[0] ? (
                      <img src={provider.photos[0]} alt={provider.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">👷</div>
                    )}
                  </div>
                  {!provider.is_active && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{provider.name}</h3>
                    {provider.is_verified && (
                      <BadgeCheck className="w-4 h-4 text-blue-500" />
                    )}
                    {provider.is_premium && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                    {!provider.is_active && (
                      <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full">
                        En attente
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{provider.profession}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {provider.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {provider.phone}
                    </span>
                    {provider.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {provider.rating}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!provider.is_active ? (
                    <button
                      onClick={() => handleApprove(provider.provider_id)}
                      className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Approuver
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleVerify(provider.provider_id, !provider.is_verified)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          provider.is_verified
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                        )}
                        title={provider.is_verified ? "Retirer le badge" : "Ajouter badge vérifié"}
                      >
                        <BadgeCheck className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(provider.provider_id)}
                        className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="Désactiver"
                      >
                        <XCircle className="w-5 h-5 text-orange-500" />
                      </button>
                    </>
                  )}
                  <a
                    href={`/provider/${provider.provider_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Voir le profil"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button
                    onClick={() => handleDelete(provider.provider_id)}
                    className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-500"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Service Requests Admin Component
export function ServiceRequestsAdmin({ token }) {
  const [requests, setRequests] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningProvider, setAssigningProvider] = useState("");

  useEffect(() => {
    fetchRequests();
    fetchProviders();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const response = await axios.get(`${API_URL}/api/admin/service-requests${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data.requests || response.data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/service-providers?status=active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProviders(response.data.providers || response.data || []);
    } catch (error) {
      console.error("Error fetching providers:", error);
    }
  };

  const handleUpdateStatus = async (requestId, status) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/service-requests/${requestId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Statut mis à jour !");
      fetchRequests();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAssignProvider = async () => {
    if (!selectedRequest || !assigningProvider) return;

    try {
      const provider = providers.find(p => p.provider_id === assigningProvider);
      await axios.put(
        `${API_URL}/api/admin/service-requests/${selectedRequest.request_id}`,
        { 
          status: "assigned",
          assigned_provider_id: assigningProvider,
          assigned_provider_name: provider?.name || ""
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Prestataire assigné !");
      setShowAssignModal(false);
      setSelectedRequest(null);
      setAssigningProvider("");
      fetchRequests();
    } catch (error) {
      toast.error("Erreur lors de l'assignation");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      assigned: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    const labels = {
      new: "Nouvelle",
      in_progress: "En cours",
      assigned: "Assignée",
      confirmed: "Confirmée",
      completed: "Terminée",
      cancelled: "Annulée",
    };
    return (
      <span className={cn("px-2 py-1 text-xs font-medium rounded-full", styles[status] || styles.new)}>
        {labels[status] || status}
      </span>
    );
  };

  const newCount = requests.filter(r => r.status === "new").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Demandes de Services</h1>
          <p className="text-muted-foreground">
            {requests.length} demandes • {newCount} nouvelles
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
        >
          <option value="all">Tous les statuts</option>
          <option value="new">Nouvelles</option>
          <option value="in_progress">En cours</option>
          <option value="assigned">Assignées</option>
          <option value="completed">Terminées</option>
          <option value="cancelled">Annulées</option>
        </select>
      </div>

      {/* New Requests Alert */}
      {newCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{newCount} nouvelle(s) demande(s) à traiter</span>
          </div>
        </div>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
          <p className="text-muted-foreground">Aucune demande trouvée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.request_id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Main Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm text-muted-foreground">{request.request_id}</span>
                    {getStatusBadge(request.status)}
                  </div>
                  <h3 className="font-semibold text-lg">{request.profession}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {request.city}{request.zone ? `, ${request.zone}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                  
                  {/* Client Info */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 text-sm">
                    <span><strong>Client:</strong> {request.client_name}</span>
                    <span><strong>Tél:</strong> {request.client_phone}</span>
                    {request.preferred_date && (
                      <span><strong>Date souhaitée:</strong> {new Date(request.preferred_date).toLocaleDateString("fr-FR")}</span>
                    )}
                  </div>

                  {/* Assigned Provider */}
                  {request.assigned_provider_name && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <BadgeCheck className="w-4 h-4 text-green-500" />
                      <span>Assigné à: <strong>{request.assigned_provider_name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 min-w-[140px]">
                  {request.status === "new" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowAssignModal(true);
                        }}
                        className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600"
                      >
                        Assigner
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(request.request_id, "in_progress")}
                        className="px-4 py-2 bg-yellow-400 text-black text-sm font-medium rounded-lg hover:bg-yellow-300"
                      >
                        En cours
                      </button>
                    </>
                  )}
                  {request.status === "assigned" && (
                    <button
                      onClick={() => handleUpdateStatus(request.request_id, "confirmed")}
                      className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600"
                    >
                      Confirmer
                    </button>
                  )}
                  {request.status === "confirmed" && (
                    <button
                      onClick={() => handleUpdateStatus(request.request_id, "completed")}
                      className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600"
                    >
                      Terminé
                    </button>
                  )}
                  {!["completed", "cancelled"].includes(request.status) && (
                    <button
                      onClick={() => handleUpdateStatus(request.request_id, "cancelled")}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500"
                    >
                      Annuler
                    </button>
                  )}
                  <a
                    href={`tel:${request.client_phone}`}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-medium rounded-lg text-center hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Phone className="w-4 h-4 inline mr-1" />
                    Appeler
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Assigner un prestataire</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Demande: <strong>{selectedRequest.profession}</strong> à {selectedRequest.city}
            </p>
            
            <select
              value={assigningProvider}
              onChange={(e) => setAssigningProvider(e.target.value)}
              className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 mb-4"
            >
              <option value="">Sélectionner un prestataire</option>
              {providers
                .filter(p => p.profession?.toLowerCase().includes(selectedRequest.profession?.toLowerCase()) || p.category === selectedRequest.category)
                .map((p) => (
                  <option key={p.provider_id} value={p.provider_id}>
                    {p.name} - {p.profession} ({p.city})
                  </option>
                ))}
              <option disabled>──────────</option>
              {providers.map((p) => (
                <option key={`all-${p.provider_id}`} value={p.provider_id}>
                  {p.name} - {p.profession} ({p.city})
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedRequest(null);
                  setAssigningProvider("");
                }}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleAssignProvider}
                disabled={!assigningProvider}
                className="flex-1 px-4 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
