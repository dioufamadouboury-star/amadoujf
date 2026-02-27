import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Gift,
  Share2,
  Copy,
  Check,
  Trophy,
  Wallet,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { formatPrice } from "../lib/utils";
import SEO from "../components/SEO";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ReferralPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [referralData, setReferralData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      // Get leaderboard (public)
      const leaderboardRes = await axios.get(`${API_URL}/api/referral/leaderboard`);
      setLeaderboard(leaderboardRes.data);

      // Get personal referral data if authenticated
      if (isAuthenticated && token) {
        const myDataRes = await axios.get(`${API_URL}/api/referral/my-code`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReferralData(myDataRes.data);
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (referralData?.code) {
      navigator.clipboard.writeText(referralData.code);
      setCopied(true);
      toast.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyLink = () => {
    if (referralData?.share_link) {
      navigator.clipboard.writeText(referralData.share_link);
      toast.success("Lien copié !");
    }
  };

  const shareWhatsApp = () => {
    const text = `🎁 Utilise mon code parrain ${referralData?.code} sur YAMA+ et obtiens -${referralData?.config?.referee_discount}% sur ta première commande ! ${referralData?.share_link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Parrainage - GROUPE YAMA+"
        description="Parrainez vos amis et gagnez des récompenses sur YAMA+"
      />

      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-white dark:from-primary/10 dark:to-gray-900">
        {/* Hero Section */}
        <section className="py-16 px-4">
          <div className="container-lumina max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Gift className="w-4 h-4" />
                Programme de Parrainage
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Parrainez & Gagnez !
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Invitez vos amis sur YAMA+ et gagnez{" "}
                <span className="text-primary font-semibold">
                  {formatPrice(referralData?.config?.referrer_reward || 5000)}
                </span>{" "}
                pour chaque parrainage réussi !
              </p>
            </motion.div>

            {/* How it works */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid md:grid-cols-3 gap-6 mb-12"
            >
              {[
                {
                  step: 1,
                  title: "Partagez votre code",
                  description: "Envoyez votre code parrain unique à vos amis",
                  icon: Share2,
                },
                {
                  step: 2,
                  title: "Ils passent commande",
                  description: `Vos amis obtiennent -${referralData?.config?.referee_discount || 10}% sur leur première commande`,
                  icon: Gift,
                },
                {
                  step: 3,
                  title: "Vous gagnez",
                  description: `Recevez ${formatPrice(referralData?.config?.referrer_reward || 5000)} de crédit`,
                  icon: Wallet,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm border"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-xs text-primary font-medium mb-2">
                    Étape {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* User's Referral Section */}
            {isAuthenticated && referralData ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border mb-12"
              >
                <h2 className="text-xl font-bold mb-6 text-center">
                  Votre Code Parrain
                </h2>

                {/* Code Display */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-xl px-8 py-4 font-mono text-2xl font-bold tracking-wider">
                    {referralData.code}
                  </div>
                  <button
                    onClick={copyCode}
                    className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <Copy className="w-6 h-6" />
                    )}
                  </button>
                </div>

                {/* Share Buttons */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  <button
                    onClick={shareWhatsApp}
                    className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#20bd5a] transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Partager sur WhatsApp
                  </button>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                    Copier le lien
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-2xl font-bold text-primary">
                      {referralData.referrals_count}
                    </p>
                    <p className="text-sm text-muted-foreground">Invitations</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">
                      {referralData.successful_referrals}
                    </p>
                    <p className="text-sm text-muted-foreground">Réussies</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <p className="text-2xl font-bold">
                      {formatPrice(referralData.total_earnings)}
                    </p>
                    <p className="text-sm text-muted-foreground">Gagnés</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border text-center mb-12"
              >
                <Users className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h2 className="text-xl font-bold mb-2">
                  Connectez-vous pour participer
                </h2>
                <p className="text-muted-foreground mb-6">
                  Créez un compte pour obtenir votre code parrain unique
                </p>
                <a href="/login" className="btn-primary inline-flex items-center gap-2">
                  Créer un compte
                  <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            )}

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-xl font-bold">Top Parrains</h2>
                </div>

                <div className="space-y-3">
                  {leaderboard.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-4 p-4 rounded-xl ${
                        i === 0
                          ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                          : i === 1
                          ? "bg-gray-100 dark:bg-gray-700/50"
                          : i === 2
                          ? "bg-orange-50 dark:bg-orange-900/20"
                          : "bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          i === 0
                            ? "bg-yellow-400 text-yellow-900"
                            : i === 1
                            ? "bg-gray-300 text-gray-700"
                            : i === 2
                            ? "bg-orange-400 text-orange-900"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {item.rank}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.referrals} parrainage{item.referrals > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">
                          {formatPrice(item.earnings)}
                        </p>
                        <p className="text-xs text-muted-foreground">gagnés</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
