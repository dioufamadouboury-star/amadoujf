import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { formatPrice } from "../lib/utils";
import { cn } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const periods = [
  { value: "day", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "year", label: "Cette année" },
];

function StatCard({ title, value, icon: Icon, trend, trendValue, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            trend === "up" ? "text-green-600" : "text-red-600"
          )}>
            {trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trendValue}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold mt-4">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </div>
  );
}

function SimpleBarChart({ data }) {
  if (!data || data.length === 0) return null;
  
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  
  return (
    <div className="h-48 flex items-end gap-1">
      {data.slice(-14).map((item, index) => {
        const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
        return (
          <div
            key={index}
            className="flex-1 group relative"
          >
            <div
              className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-t"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
              {formatPrice(item.revenue)}
              <br />
              {item.orders} commandes
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Erreur lors du chargement des analytics</p>
      </div>
    );
  }

  const { summary, orders_by_status, payment_methods, daily_chart, top_products, customers, inventory } = analytics;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <BarChart3 className="w-7 h-7" />
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble des performances</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent"
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chiffre d'affaires"
          value={formatPrice(summary.total_revenue)}
          icon={DollarSign}
          trend={summary.revenue_growth >= 0 ? "up" : "down"}
          trendValue={Math.abs(summary.revenue_growth)}
          color="green"
        />
        <StatCard
          title="Commandes"
          value={summary.total_orders}
          icon={ShoppingCart}
          trend={summary.orders_growth >= 0 ? "up" : "down"}
          trendValue={Math.abs(summary.orders_growth)}
          color="blue"
        />
        <StatCard
          title="Panier moyen"
          value={formatPrice(summary.average_order_value)}
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Clients"
          value={customers.total}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Revenus journaliers
          </h3>
          <SimpleBarChart data={daily_chart} />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{daily_chart[0]?.date || ""}</span>
            <span>{daily_chart[daily_chart.length - 1]?.date || ""}</span>
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Statut des commandes
          </h3>
          <div className="space-y-3">
            {Object.entries(orders_by_status).map(([status, count]) => {
              const total = Object.values(orders_by_status).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              const statusLabels = {
                pending: { label: "En attente", color: "bg-yellow-500" },
                processing: { label: "En préparation", color: "bg-blue-500" },
                shipped: { label: "Expédiées", color: "bg-purple-500" },
                delivered: { label: "Livrées", color: "bg-green-500" },
                cancelled: { label: "Annulées", color: "bg-red-500" }
              };
              const { label, color } = statusLabels[status] || { label: status, color: "bg-gray-500" };
              
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
          <h3 className="font-semibold mb-4">🏆 Produits les plus vendus</h3>
          {top_products.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune vente pour cette période</p>
          ) : (
            <div className="space-y-3">
              {top_products.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.quantity} vendus</p>
                  </div>
                  <span className="font-semibold">{formatPrice(product.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Alerts */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Alertes Stock
          </h3>
          
          {inventory.out_of_stock_count > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-xl mb-3">
              <p className="font-medium">{inventory.out_of_stock_count} produit(s) en rupture</p>
            </div>
          )}
          
          {inventory.low_stock_products.length === 0 ? (
            <p className="text-muted-foreground text-sm">✅ Tous les stocks sont OK</p>
          ) : (
            <div className="space-y-2">
              {inventory.low_stock_products.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-sm truncate flex-1">{product.name}</span>
                  <span className="text-orange-600 font-medium text-sm ml-2">
                    {product.stock} restants
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
        <h3 className="font-semibold mb-4">💳 Méthodes de paiement</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(payment_methods).map(([method, count]) => {
            const methodLabels = {
              wave: { label: "Wave", emoji: "🌊" },
              orange_money: { label: "Orange Money", emoji: "🍊" },
              card: { label: "Carte", emoji: "💳" },
              cash: { label: "À la livraison", emoji: "💵" }
            };
            const { label, emoji } = methodLabels[method] || { label: method, emoji: "💰" };
            
            return (
              <div key={method} className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <span className="text-2xl">{emoji}</span>
                <p className="font-bold text-xl mt-2">{count}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
