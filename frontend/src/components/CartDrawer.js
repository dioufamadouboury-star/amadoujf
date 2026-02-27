import { Fragment } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { formatPrice } from "../lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";

export default function CartDrawer() {
  const {
    cart,
    isOpen,
    setIsOpen,
    updateQuantity,
    removeFromCart,
    loading,
  } = useCart();

  const shippingThreshold = 50000; // Free shipping over 50,000 FCFA
  const remainingForFreeShipping = Math.max(0, shippingThreshold - cart.total);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <ShoppingBag className="w-5 h-5" />
            Votre panier
            <span className="text-muted-foreground font-normal">
              ({cart.items.length})
            </span>
          </SheetTitle>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Votre panier est vide</h3>
            <p className="text-muted-foreground mb-6">
              Découvrez nos produits et ajoutez vos favoris
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-primary"
            >
              Continuer mes achats
            </button>
          </div>
        ) : (
          <>
            {/* Free Shipping Progress */}
            {remainingForFreeShipping > 0 && (
              <div className="p-4 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
                <p className="text-sm text-center mb-2">
                  Plus que{" "}
                  <span className="font-semibold">
                    {formatPrice(remainingForFreeShipping)}
                  </span>{" "}
                  pour la livraison gratuite
                </p>
                <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (cart.total / shippingThreshold) * 100)}%`,
                    }}
                    className="h-full bg-[#0071E3] rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence mode="popLayout">
                {cart.items.map((item) => (
                  <motion.div
                    key={item.product_id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4"
                    data-testid={`cart-item-${item.product_id}`}
                  >
                    {/* Image */}
                    <Link
                      to={`/product/${item.product_id}`}
                      onClick={() => setIsOpen(false)}
                      className="w-24 h-24 rounded-xl overflow-hidden bg-[#F5F5F7] dark:bg-[#2C2C2E] flex-shrink-0"
                    >
                      <img
                        src={item.image || "/placeholder.jpg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${item.product_id}`}
                        onClick={() => setIsOpen(false)}
                        className="font-medium text-[#1D1D1F] dark:text-white hover:text-[#0071E3] transition-colors line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(item.price)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-black/10 dark:border-white/10 rounded-lg">
                          <button
                            onClick={() =>
                              updateQuantity(item.product_id, item.quantity - 1)
                            }
                            disabled={loading || item.quantity <= 1}
                            className="quantity-btn rounded-l-lg"
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product_id, item.quantity + 1)
                            }
                            disabled={loading || item.quantity >= item.stock}
                            className="quantity-btn rounded-r-lg"
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          disabled={loading}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                          aria-label="Supprimer"
                          data-testid={`remove-item-${item.product_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t p-6 space-y-4 bg-white dark:bg-black">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-semibold text-lg price-fcfa">
                  {formatPrice(cart.total)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Frais de livraison calculés à la commande
              </p>
              <Link
                to="/checkout"
                onClick={() => setIsOpen(false)}
                className="btn-primary w-full justify-center group"
                data-testid="checkout-btn"
              >
                Passer la commande
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="btn-secondary w-full justify-center"
              >
                Continuer mes achats
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
