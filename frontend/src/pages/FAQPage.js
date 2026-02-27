import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { MessageCircle, CreditCard, Truck, RotateCcw, HelpCircle } from "lucide-react";

const faqCategories = [
  {
    id: "payment",
    title: "Paiement",
    icon: CreditCard,
    questions: [
      {
        q: "Quels modes de paiement acceptez-vous ?",
        a: "Nous acceptons Wave, Orange Money, les cartes bancaires (Visa/Mastercard) et le paiement à la livraison pour Dakar.",
      },
      {
        q: "Le paiement est-il sécurisé ?",
        a: "Absolument. Toutes les transactions sont sécurisées par cryptage SSL. Vos informations de paiement ne sont jamais stockées sur nos serveurs.",
      },
      {
        q: "Puis-je payer en plusieurs fois ?",
        a: "Pour le moment, nous n'offrons pas le paiement en plusieurs fois. Nous travaillons sur cette option pour l'avenir.",
      },
      {
        q: "Comment fonctionne le paiement Wave/Orange Money ?",
        a: "Après votre commande, vous recevrez les instructions par WhatsApp pour effectuer le paiement. Une fois confirmé, votre commande sera expédiée.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Livraison",
    icon: Truck,
    questions: [
      {
        q: "Quels sont les délais de livraison ?",
        a: "Dakar : 24-48h. Régions : 3-5 jours ouvrés. Les délais peuvent varier selon la disponibilité du produit.",
      },
      {
        q: "Quels sont les frais de livraison ?",
        a: "Dakar : 2 500 FCFA. Régions : 3 500 FCFA. Livraison gratuite à partir de 50 000 FCFA d'achats.",
      },
      {
        q: "Puis-je suivre ma commande ?",
        a: "Oui, vous recevrez des notifications par WhatsApp à chaque étape : confirmation, expédition et livraison.",
      },
      {
        q: "Livrez-vous dans toutes les régions ?",
        a: "Nous livrons dans les 14 régions du Sénégal. Pour certaines zones éloignées, des délais supplémentaires peuvent s'appliquer.",
      },
    ],
  },
  {
    id: "returns",
    title: "Retours & Remboursements",
    icon: RotateCcw,
    questions: [
      {
        q: "Quelle est votre politique de retour ?",
        a: "Vous disposez de 7 jours après réception pour retourner un produit non utilisé dans son emballage d'origine.",
      },
      {
        q: "Comment faire un retour ?",
        a: "Contactez-nous via WhatsApp avec votre numéro de commande. Nous vous guiderons dans la procédure de retour.",
      },
      {
        q: "Quand serai-je remboursé ?",
        a: "Le remboursement est effectué sous 5-7 jours ouvrés après réception et vérification du produit retourné.",
      },
      {
        q: "Les frais de retour sont-ils à ma charge ?",
        a: "Les frais de retour sont à la charge du client, sauf en cas de produit défectueux ou d'erreur de notre part.",
      },
    ],
  },
  {
    id: "general",
    title: "Questions générales",
    icon: HelpCircle,
    questions: [
      {
        q: "Les produits sont-ils authentiques ?",
        a: "Oui, tous nos produits sont 100% authentiques et proviennent de distributeurs agréés. Nous garantissons l'authenticité de chaque article.",
      },
      {
        q: "Proposez-vous une garantie ?",
        a: "Oui, tous nos produits électroniques bénéficient d'une garantie constructeur. La durée varie selon le produit (généralement 1-2 ans).",
      },
      {
        q: "Comment créer un compte ?",
        a: "Cliquez sur 'Connexion' puis 'S'inscrire'. Vous pouvez aussi utiliser votre compte Google pour un accès rapide.",
      },
      {
        q: "Comment contacter le service client ?",
        a: "Le moyen le plus rapide est WhatsApp au +221 77 000 00 00. Vous pouvez aussi nous envoyer un email ou utiliser le formulaire de contact.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen pt-20" data-testid="faq-page">
      {/* Hero */}
      <section className="py-16 md:py-24 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="text-caption mb-4">Aide</p>
            <h1 className="heading-hero mb-6">FAQ</h1>
            <p className="text-body-lg">
              Trouvez rapidement des réponses à vos questions. 
              Si vous ne trouvez pas ce que vous cherchez, contactez-nous.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="section-padding bg-white dark:bg-[#0B0B0B]">
        <div className="container-lumina">
          <div className="max-w-3xl mx-auto space-y-12">
            {faqCategories.map((category, categoryIndex) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: categoryIndex * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center">
                    <category.icon className="w-5 h-5 text-white dark:text-black" />
                  </div>
                  <h2 className="text-2xl font-semibold">{category.title}</h2>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`${category.id}-${index}`}
                      className="border-b border-black/10 dark:border-white/10"
                    >
                      <AccordionTrigger className="text-left font-medium py-4 hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            ))}
          </div>

          {/* Still Need Help */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto mt-16 text-center"
          >
            <div className="bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-3xl p-8">
              <h3 className="text-2xl font-semibold mb-4">
                Vous n'avez pas trouvé votre réponse ?
              </h3>
              <p className="text-muted-foreground mb-6">
                Notre équipe est disponible pour vous aider via WhatsApp.
              </p>
              <a
                href="https://wa.me/221783827575"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary bg-[#25D366] border-[#25D366] hover:bg-[#25D366]/90 inline-flex"
              >
                <MessageCircle className="w-5 h-5" />
                Contacter via WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
