import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Star, Trophy, Coins, ChevronRight, Sparkles } from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../lib/utils";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Points configuration
const POINTS_PER_1000_FCFA = 10; // 10 points per 1000 FCFA spent
const TIERS = [
  { name: "Bronze", minPoints: 0, maxPoints: 999, discount: 0, color: "#CD7F32", icon: Star },
  { name: "Argent", minPoints: 1000, maxPoints: 4999, discount: 5, color: "#C0C0C0", icon: Trophy },
  { name: "Or", minPoints: 5000, maxPoints: 14999, discount: 10, color: "#FFD700", icon: Sparkles },
  { name: "Platine", minPoints: 15000, maxPoints: Infinity, discount: 15, color: "#E5E4E2", icon: Gift },
];

const REWARDS = [
  { id: 1, name: "5% de réduction", points: 500, type: "discount", value: 5 },
  { id: 2, name: "10% de réduction", points: 1000, type: "discount", value: 10 },
  { id: 3, name: "Livraison gratuite", points: 750, type: "free_shipping", value: 0 },
  { id: 4, name: "15% de réduction", points: 1500, type: "discount", value: 15 },
  { id: 5, name: "2000 FCFA de crédit", points: 2000, type: "credit", value: 2000 },
  { id: 6, name: "5000 FCFA de crédit", points: 4500, type: "credit", value: 5000 },
];

export function useLoyalty() {
  const { user, isAuthenticated, token } = useAuth();
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchLoyalty();
    } else {
      setLoyalty(null);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchLoyalty = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/loyalty/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoyalty(response.data);
    } catch (error) {
      console.error("Error fetching loyalty:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTier = () => {
    if (!loyalty) return TIERS[0];
    return TIERS.find(t => loyalty.points >= t.minPoints && loyalty.points <= t.maxPoints) || TIERS[0];
  };

  const getNextTier = () => {
    const currentIndex = TIERS.findIndex(t => t.name === getCurrentTier().name);
    return currentIndex < TIERS.length - 1 ? TIERS[currentIndex + 1] : null;
  };

  const getProgressToNextTier = () => {
    if (!loyalty) return 0;
    const current = getCurrentTier();
    const next = getNextTier();
    if (!next) return 100;
    const progress = ((loyalty.points - current.minPoints) / (next.minPoints - current.minPoints)) * 100;
    return Math.min(progress, 100);
  };

  const redeemReward = async (rewardId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/loyalty/redeem`,
        { reward_id: rewardId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Récompense échangée avec succès !");
      fetchLoyalty();
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'échange";
      toast.error(message);
      return null;
    }
  };

  return {
    loyalty,
    loading,
    getCurrentTier,
    getNextTier,
    getProgressToNextTier,
    redeemReward,
    refreshLoyalty: fetchLoyalty,
    TIERS,
    REWARDS
  };
}

export function LoyaltyBadge({ className = "" }) {
  const { loyalty, getCurrentTier, loading } = useLoyalty();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated || loading || !loyalty) return null;

  const tier = getCurrentTier();
  const TierIcon = tier.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: tier.color }}
      >
        <TierIcon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="text-sm">
        <span className="font-medium">{loyalty.points}</span>
        <span className="text-muted-foreground"> pts</span>
      </div>
    </div>
  );
}

export function LoyaltyCard() {
  const { loyalty, loading, getCurrentTier, getNextTier, getProgressToNextTier } = useLoyalty();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 text-center">
        <Gift className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <h3 className="font-semibold mb-2">Programme Fidélité</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connectez-vous pour gagner des points à chaque achat
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 animate-pulse">
        <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  const tier = getCurrentTier();
  const nextTier = getNextTier();
  const progress = getProgressToNextTier();
  const TierIcon = tier.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl"
      style={{ background: `linear-gradient(135deg, ${tier.color}20, ${tier.color}40)` }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: tier.color }}
              >
                <TierIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">{tier.name}</span>
            </div>
            {tier.discount > 0 && (
              <p className="text-sm text-muted-foreground">
                {tier.discount}% de réduction permanente
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{loyalty?.points || 0}</p>
            <p className="text-sm text-muted-foreground">points</p>
          </div>
        </div>

        {nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Prochain niveau: {nextTier.name}</span>
              <span>{nextTier.minPoints - (loyalty?.points || 0)} pts restants</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: nextTier.color }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function LoyaltyPage() {
  const { loyalty, loading, getCurrentTier, redeemReward, REWARDS, TIERS } = useLoyalty();
  const { isAuthenticated } = useAuth();
  const [redeeming, setRedeeming] = useState(null);

  const handleRedeem = async (reward) => {
    if (!loyalty || loyalty.points < reward.points) {
      toast.error("Points insuffisants");
      return;
    }
    setRedeeming(reward.id);
    await redeemReward(reward.id);
    setRedeeming(null);
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pt-20">
        <div className="container-lumina py-16 text-center">
          <Gift className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Programme Fidélité YAMA+</h1>
          <p className="text-muted-foreground mb-6">
            Connectez-vous pour accéder à votre espace fidélité
          </p>
        </div>
      </main>
    );
  }

  const tier = getCurrentTier();

  return (
    <main className="min-h-screen pt-20">
      <div className="container-lumina py-8">
        <h1 className="text-2xl font-bold mb-6">Programme Fidélité</h1>
        
        {/* Loyalty Card */}
        <LoyaltyCard />

        {/* How it works */}
        <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Achetez</p>
                <p className="text-sm text-muted-foreground">Gagnez {POINTS_PER_1000_FCFA} points par 1000 FCFA dépensés</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Montez en niveau</p>
                <p className="text-sm text-muted-foreground">Débloquez des réductions permanentes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Échangez</p>
                <p className="text-sm text-muted-foreground">Utilisez vos points pour des récompenses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tiers */}
        <div className="mt-8">
          <h2 className="font-semibold mb-4">Niveaux de fidélité</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {TIERS.map((t) => {
              const TIcon = t.icon;
              const isCurrent = t.name === tier.name;
              return (
                <div
                  key={t.name}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isCurrent
                      ? 'border-primary shadow-lg scale-105'
                      : 'border-transparent bg-gray-50 dark:bg-gray-800/50'
                  }`}
                  style={isCurrent ? { borderColor: t.color } : {}}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: t.color }}
                  >
                    <TIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.minPoints === 0 ? '0' : t.minPoints.toLocaleString()}+ points
                  </p>
                  {t.discount > 0 && (
                    <p className="text-sm font-medium text-green-600 mt-1">
                      -{t.discount}% permanent
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rewards */}
        <div className="mt-8">
          <h2 className="font-semibold mb-4">Récompenses disponibles</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {REWARDS.map((reward) => {
              const canRedeem = loyalty && loyalty.points >= reward.points;
              return (
                <div
                  key={reward.id}
                  className={`p-4 rounded-xl border ${
                    canRedeem
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{reward.name}</h3>
                    <span className="text-sm font-bold text-primary">
                      {reward.points} pts
                    </span>
                  </div>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!canRedeem || redeeming === reward.id}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                      canRedeem
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {redeeming === reward.id ? 'Échange...' : 'Échanger'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* History */}
        {loyalty?.history && loyalty.history.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold mb-4">Historique</h2>
            <div className="space-y-2">
              {loyalty.history.slice(0, 10).map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-sm text-muted-foreground">{entry.date}</p>
                  </div>
                  <span className={`font-bold ${entry.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {entry.points > 0 ? '+' : ''}{entry.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
