import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Trophy, Truck, Percent, Loader2, PartyPopper } from "lucide-react";
import axios from "axios";
import { cn } from "../lib/utils";
import confetti from 'canvas-confetti';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Wheel segments configuration - Vibrant colors
const WHEEL_SEGMENTS = [
  { type: "discount_5", label: "-5%", color: "#2DD4BF", textColor: "#000", gradient: "from-teal-400 to-emerald-400" },
  { type: "discount_10", label: "-10%", color: "#8B5CF6", textColor: "#fff", gradient: "from-violet-500 to-purple-500" },
  { type: "free_shipping", label: "Livraison\nGratuite", color: "#F472B6", textColor: "#000", gradient: "from-pink-400 to-rose-400" },
  { type: "discount_5", label: "-5%", color: "#FBBF24", textColor: "#000", gradient: "from-amber-400 to-yellow-400" },
  { type: "discount_20", label: "-20%", color: "#F97316", textColor: "#fff", gradient: "from-orange-500 to-red-500" },
  { type: "discount_5", label: "-5%", color: "#60A5FA", textColor: "#000", gradient: "from-blue-400 to-cyan-400" },
  { type: "discount_15", label: "-15%", color: "#EC4899", textColor: "#fff", gradient: "from-pink-500 to-fuchsia-500" },
  { type: "discount_10", label: "-10%", color: "#34D399", textColor: "#000", gradient: "from-emerald-400 to-green-400" },
];

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

function SpinWheel({ onSpinComplete, isSpinning, setIsSpinning, prizeIndex }) {
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef(null);

  useEffect(() => {
    if (isSpinning && prizeIndex !== null) {
      // Calculate rotation to land on prize
      const baseRotations = 5; // Number of full rotations
      const targetAngle = 360 - (prizeIndex * SEGMENT_ANGLE) - (SEGMENT_ANGLE / 2);
      const totalRotation = (baseRotations * 360) + targetAngle + Math.random() * 20 - 10;
      
      setRotation(prev => prev + totalRotation);
      
      // Call complete after animation
      setTimeout(() => {
        setIsSpinning(false);
        onSpinComplete();
      }, 5000);
    }
  }, [isSpinning, prizeIndex]);

  return (
    <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80">
      {/* Outer glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse" />
      
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
        <div className="w-0 h-0 border-l-[12px] sm:border-l-[18px] border-r-[12px] sm:border-r-[18px] border-t-[20px] sm:border-t-[30px] border-l-transparent border-r-transparent border-t-orange-500 drop-shadow-lg" />
      </div>
      
      {/* Wheel */}
      <motion.div
        ref={wheelRef}
        className="relative w-full h-full rounded-full border-4 sm:border-8 border-white dark:border-gray-800 overflow-hidden shadow-2xl"
        style={{
          rotate: rotation,
          transition: isSpinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          boxShadow: "0 0 0 4px rgba(0,0,0,0.1), 0 25px 50px -12px rgba(0,0,0,0.25)"
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {WHEEL_SEGMENTS.map((segment, index) => {
            const startAngle = index * SEGMENT_ANGLE;
            const endAngle = startAngle + SEGMENT_ANGLE;
            
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            
            const x1 = 50 + 50 * Math.cos(startRad);
            const y1 = 50 + 50 * Math.sin(startRad);
            const x2 = 50 + 50 * Math.cos(endRad);
            const y2 = 50 + 50 * Math.sin(endRad);
            
            const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
            
            const textAngle = startAngle + SEGMENT_ANGLE / 2;
            const textRad = (textAngle - 90) * Math.PI / 180;
            const textX = 50 + 32 * Math.cos(textRad);
            const textY = 50 + 32 * Math.sin(textRad);
            
            return (
              <g key={index}>
                <path
                  d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={segment.color}
                  stroke="#333"
                  strokeWidth="0.5"
                />
                <text
                  x={textX}
                  y={textY}
                  fill={segment.textColor}
                  fontSize="6"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                >
                  {segment.label.split('\n').map((line, i) => (
                    <tspan key={i} x={textX} dy={i === 0 ? 0 : 7}>{line}</tspan>
                  ))}
                </text>
              </g>
            );
          })}
          {/* Center circle */}
          <circle cx="50" cy="50" r="8" fill="#000" className="dark:fill-white" />
          <text x="50" y="50" fill="#fff" className="dark:fill-black" fontSize="3" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
            YAMA+
          </text>
        </svg>
      </motion.div>
    </div>
  );
}

export default function SpinWheelGame({ isOpen, onClose }) {
  const [gameConfig, setGameConfig] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [prizeIndex, setPrizeIndex] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [step, setStep] = useState("form"); // form, spinning, result
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchGameConfig();
    }
  }, [isOpen]);

  const fetchGameConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/game/config`);
      setGameConfig(response.data);
    } catch (err) {
      console.error("Error fetching game config:", err);
    }
  };

  const checkEligibility = async () => {
    if (!email) return;
    try {
      const response = await axios.get(`${API_URL}/api/game/check-eligibility?email=${encodeURIComponent(email)}`);
      setEligibility(response.data);
    } catch (err) {
      console.error("Error checking eligibility:", err);
    }
  };

  const handleSpin = async () => {
    if (!email) {
      setError("Veuillez entrer votre email");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/game/spin`, {
        email,
        name
      });
      
      setResult(response.data);
      
      // Find prize index on wheel
      const prizeType = response.data.prize_type;
      const index = WHEEL_SEGMENTS.findIndex(s => s.type === prizeType);
      setPrizeIndex(index >= 0 ? index : 0);
      
      setStep("spinning");
      setIsSpinning(true);
      
    } catch (err) {
      setError(err.response?.data?.detail || "Une erreur est survenue");
      setLoading(false);
    }
  };

  const handleSpinComplete = () => {
    setLoading(false);
    setStep("result");
    
    // Confetti for big prizes (20% discount or free shipping)
    if (result?.prize_type === "discount_20" || result?.prize_type === "discount_15") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleClose = () => {
    setStep("form");
    setResult(null);
    setEmail("");
    setName("");
    setError("");
    setEligibility(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white p-4 sm:p-8 text-center overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 w-20 h-20 bg-white rounded-full blur-xl" />
              <div className="absolute bottom-4 right-4 w-32 h-32 bg-yellow-300 rounded-full blur-2xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-pink-300 rounded-full blur-3xl" />
            </div>
            
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors z-10"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <span className="text-2xl sm:text-4xl animate-bounce">🎁</span>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <Gift className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <span className="text-2xl sm:text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight">ROUE DE LA FORTUNE</h2>
              <p className="text-white/90 text-sm sm:text-base mt-1 sm:mt-2 font-medium">
                Tentez votre chance et gagnez des réductions !
              </p>
              
              {gameConfig && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <span className="bg-white/25 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                    🎯 100% Gagnant !
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {step === "form" && (
              <div className="space-y-3 sm:space-y-4">
                <div className="text-center mb-4 sm:mb-6">
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Inscrivez-vous pour tourner la roue gratuitement !
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 sm:mb-2">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    onBlur={checkEligibility}
                    placeholder="votre@email.com"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm sm:text-base"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 sm:mb-2">Nom (optionnel)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm sm:text-base"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                {eligibility && !eligibility.can_spin && eligibility.is_subscribed && (
                  <div className="bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 p-3 sm:p-4 rounded-xl text-xs sm:text-sm text-center">
                    Vous avez déjà utilisé votre tour gratuit. 
                    <br />
                    <strong>Achetez pour +25 000 FCFA</strong> pour un nouveau tour !
                  </div>
                )}

                <button
                  onClick={handleSpin}
                  disabled={loading || (eligibility && !eligibility.can_spin && eligibility.is_subscribed)}
                  className={cn(
                    "w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-white text-base sm:text-lg transition-all flex items-center justify-center gap-2 sm:gap-3 shadow-lg",
                    loading || (eligibility && !eligibility.can_spin && eligibility.is_subscribed)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                  ) : (
                    <>
                      <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
                      TOURNER LA ROUE !
                    </>
                  )}
                </button>

                {/* Prizes preview */}
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-black/10 dark:border-white/10">
                  <p className="text-xs sm:text-sm text-center font-semibold text-foreground mb-3 sm:mb-4">🎁 Prix à gagner</p>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                      <span className="text-sm sm:text-lg font-bold text-teal-600 dark:text-teal-400">-5%</span>
                    </div>
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                      <span className="text-sm sm:text-lg font-bold text-violet-600 dark:text-violet-400">-10%</span>
                    </div>
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                      <span className="text-sm sm:text-lg font-bold text-pink-600 dark:text-pink-400">-15%</span>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center col-span-1">
                      <span className="text-sm sm:text-lg font-bold text-orange-600 dark:text-orange-400">-20%</span>
                      <p className="text-[8px] sm:text-[10px] text-orange-500">JACKPOT</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center col-span-2 flex items-center justify-center gap-1 sm:gap-2">
                      <Truck className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">Livraison gratuite</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "spinning" && (
              <div className="flex flex-col items-center py-2 sm:py-4">
                <SpinWheel
                  isSpinning={isSpinning}
                  setIsSpinning={setIsSpinning}
                  prizeIndex={prizeIndex}
                  onSpinComplete={handleSpinComplete}
                />
                <p className="mt-3 sm:mt-4 text-muted-foreground animate-pulse text-sm sm:text-base">
                  La roue tourne...
                </p>
              </div>
            )}

            {step === "result" && result && (
              <div className="text-center py-2 sm:py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                >
                  {result.prize_type === "discount_20" ? (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                      <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-amber-600" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                      <PartyPopper className="w-8 h-8 sm:w-12 sm:h-12 text-violet-600" />
                    </div>
                  )}
                </motion.div>

                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  {result.prize_type === "discount_20" ? "🎉 JACKPOT !" : "Félicitations !"}
                </h3>
                
                <p className="text-base sm:text-lg mb-3 sm:mb-4">{result.message}</p>

                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Votre code promo</p>
                  <p className="text-xl sm:text-2xl font-mono font-bold tracking-wider">
                    {result.prize_code}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Utilisez ce code lors de votre prochaine commande
                </p>

                <button
                  onClick={handleClose}
                  className="w-full py-2.5 sm:py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold hover:opacity-90 transition-opacity text-sm sm:text-base"
                >
                  Utiliser maintenant
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
