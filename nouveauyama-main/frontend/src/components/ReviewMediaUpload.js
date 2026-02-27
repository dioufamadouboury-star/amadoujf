import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image, Film, Star, Trash2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ReviewMediaUpload({ productId, onSuccess, onCancel }) {
  const { token } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate number of files
    if (mediaFiles.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} fichiers autorisés`);
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    files.forEach((file) => {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast.error(`${file.name}: Type de fichier non supporté`);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: Fichier trop volumineux (max 10MB)`);
        return;
      }

      validFiles.push(file);

      // Create preview
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push({
            type: 'image',
            url: e.target.result,
            name: file.name
          });
          setPreviews([...previews, ...newPreviews]);
        };
        reader.readAsDataURL(file);
      } else {
        newPreviews.push({
          type: 'video',
          url: URL.createObjectURL(file),
          name: file.name
        });
        setPreviews([...previews, ...newPreviews]);
      }
    });

    setMediaFiles([...mediaFiles, ...validFiles]);
  };

  const removeFile = (index) => {
    const newFiles = [...mediaFiles];
    const newPreviews = [...previews];
    
    // Revoke object URL if it's a video
    if (newPreviews[index].type === 'video') {
      URL.revokeObjectURL(newPreviews[index].url);
    }
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setMediaFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast.error("Veuillez ajouter un commentaire");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('rating', rating);
      formData.append('title', title);
      formData.append('comment', comment);
      
      mediaFiles.forEach((file) => {
        formData.append('media', file);
      });

      await axios.post(
        `${API_URL}/api/products/${productId}/reviews/with-media`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      toast.success("Avis publié avec succès !");
      onSuccess?.();
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de la publication";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">Écrire un avis</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">Note</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Titre (optionnel)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Résumez votre expérience"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              maxLength={100}
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre avis *</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience avec ce produit..."
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={4}
              required
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {comment.length}/1000 caractères
            </p>
          </div>

          {/* Media Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Photos / Vidéos (optionnel)
            </label>
            
            {/* Previews */}
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    {preview.type === 'image' ? (
                      <img
                        src={preview.url}
                        alt={preview.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <Film className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {mediaFiles.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center gap-2"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Ajouter des photos ou vidéos ({mediaFiles.length}/{MAX_FILES})
                </span>
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <p className="text-xs text-muted-foreground mt-2">
              Formats acceptés: JPG, PNG, MP4, MOV (max 10MB par fichier)
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={uploading || !comment.trim()}
              className="flex-1 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
