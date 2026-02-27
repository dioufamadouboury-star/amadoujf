import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  MapPin, 
  Home,
  Clock,
  XCircle
} from "lucide-react";
import { cn } from "../lib/utils";

const ORDER_STATUSES = [
  { key: "pending", label: "Confirmée", icon: CheckCircle2, description: "Commande reçue" },
  { key: "processing", label: "En préparation", icon: Package, description: "Préparation en cours" },
  { key: "shipped", label: "Expédiée", icon: Truck, description: "En route vers le transporteur" },
  { key: "in_transit", label: "En livraison", icon: MapPin, description: "En cours d'acheminement" },
  { key: "delivered", label: "Livrée", icon: Home, description: "Livraison effectuée" },
];

const STATUS_INDEX = {
  pending: 0,
  confirmed: 0,
  processing: 1,
  shipped: 2,
  in_transit: 3,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: -1
};

export default function OrderTimeline({ currentStatus, statusHistory = [], createdAt }) {
  const currentIndex = STATUS_INDEX[currentStatus] ?? 0;
  const isCancelled = currentStatus === "cancelled";

  // Build a map of timestamps from history
  const historyMap = {};
  statusHistory.forEach(h => {
    historyMap[h.status] = h.timestamp;
  });

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isCancelled) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-600">Commande annulée</h3>
            <p className="text-sm text-muted-foreground">
              Cette commande a été annulée
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
      <h3 className="font-semibold mb-6 flex items-center gap-2">
        <Truck className="w-5 h-5" />
        Suivi de commande
      </h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
        <div 
          className="absolute left-6 top-0 w-0.5 bg-green-500 transition-all duration-500"
          style={{ height: `${(currentIndex / (ORDER_STATUSES.length - 1)) * 100}%` }}
        />
        
        {/* Steps */}
        <div className="space-y-6">
          {ORDER_STATUSES.map((status, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const StatusIcon = status.icon;
            const timestamp = historyMap[status.key] || (index === 0 ? createdAt : null);

            return (
              <motion.div
                key={status.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start gap-4 pl-12"
              >
                {/* Icon Circle */}
                <div 
                  className={cn(
                    "absolute left-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted 
                      ? "bg-green-500 text-white" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400",
                    isCurrent && "ring-4 ring-green-500/20"
                  )}
                >
                  <StatusIcon className={cn(
                    "w-5 h-5",
                    isCurrent && "animate-pulse"
                  )} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={cn(
                      "font-medium",
                      isCompleted ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {status.label}
                    </h4>
                    {timestamp && isCompleted && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(timestamp)}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm",
                    isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"
                  )}>
                    {status.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
