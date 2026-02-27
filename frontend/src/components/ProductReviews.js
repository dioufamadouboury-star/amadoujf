import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Star, ThumbsUp, User, CheckCircle, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { formatDate, cn } from "../lib/utils";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProductReviews({ productId }) {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    total_reviews: 0,
    average_rating: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    title: "",
    comment: "",
  });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products/${productId}/reviews`);
      setReviews(response.data.reviews);
      setStats({
        total_reviews: response.data.total_reviews,
        average_rating: response.data.average_rating,
        distribution: response.data.distribution,
      });
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour donner votre avis");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/products/${productId}/reviews`,
        { product_id: productId, ...formData },
        { withCredentials: true }
      );
      toast.success("Merci pour votre avis !");
      setShowForm(false);
      setFormData({ rating: 5, title: "", comment: "" });
      fetchReviews();
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'envoi";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    try {
      await axios.post(`${API_URL}/api/reviews/${reviewId}/helpful`);
      fetchReviews();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const StarRating = ({ rating, size = "md", interactive = false, onChange }) => {
    const sizes = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            onClick={() => interactive && onChange?.(star)}
            className={interactive ? "cursor-pointer" : "cursor-default"}
            disabled={!interactive}
          >
            <Star
              className={cn(
                sizes[size],
                star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
              )}
            />
          </button>
        ))}
      </div>
    );
  };

  const RatingBar = ({ rating, count, total }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-3">{rating}</span>
        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-8 text-muted-foreground">{count}</span>
      </div>
    );
  };

  return (
    <div className="mt-16 pt-16 border-t border-black/10 dark:border-white/10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-2">
            Avis clients
          </h2>
          <p className="text-muted-foreground">
            {stats.total_reviews} avis pour ce produit
          </p>
        </div>
        {isAuthenticated && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
            data-testid="write-review-btn"
          >
            Donner mon avis
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {stats.total_reviews > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 p-6 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl">
          {/* Average Rating */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold">{stats.average_rating}</div>
              <StarRating rating={Math.round(stats.average_rating)} size="md" />
              <p className="text-sm text-muted-foreground mt-1">
                {stats.total_reviews} avis
              </p>
            </div>
          </div>

          {/* Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <RatingBar
                key={rating}
                rating={rating}
                count={stats.distribution[rating] || 0}
                total={stats.total_reviews}
              />
            ))}
          </div>
        </div>
      )}

      {/* Review Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Donner mon avis</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Votre note
                  </label>
                  <StarRating
                    rating={formData.rating}
                    size="lg"
                    interactive
                    onChange={(rating) => setFormData({ ...formData, rating })}
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Titre de l'avis
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    placeholder="Résumez votre expérience"
                    className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                    data-testid="review-title-input"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Votre avis
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) =>
                      setFormData({ ...formData, comment: e.target.value })
                    }
                    required
                    rows={4}
                    placeholder="Partagez votre expérience avec ce produit..."
                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors resize-none"
                    data-testid="review-comment-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-primary justify-center py-4"
                  data-testid="submit-review-btn"
                >
                  {submitting ? "Envoi en cours..." : "Publier mon avis"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl">
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Aucun avis pour le moment</p>
          <p className="text-muted-foreground mb-4">
            Soyez le premier à donner votre avis !
          </p>
          {isAuthenticated && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              Donner mon avis
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review, index) => (
            <motion.div
              key={review.review_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl"
            >
              {/* Review Header */}
              <div className="flex items-start gap-4 mb-4">
                {review.user_picture ? (
                  <img
                    src={review.user_picture}
                    alt={review.user_name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{review.user_name}</span>
                    {review.verified_purchase && (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Achat vérifié
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <h4 className="font-semibold mb-2">{review.title}</h4>
              <p className="text-muted-foreground leading-relaxed">
                {review.comment}
              </p>

              {/* Helpful Button */}
              <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => handleHelpful(review.review_id)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Utile ({review.helpful_count})
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
