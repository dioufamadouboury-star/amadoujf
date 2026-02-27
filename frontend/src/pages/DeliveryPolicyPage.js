import SEO from "../components/SEO";

export default function DeliveryPolicyPage() {
  return (
    <main className="min-h-screen pt-20">
      <SEO 
        title="Politique de Livraison" 
        description="Découvrez nos conditions de livraison au Sénégal. Livraison rapide à Dakar et régions."
        url="/livraison"
      />
      <div className="container-lumina py-12">
        <h1 className="text-3xl font-bold mb-8">Politique de Livraison</h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Zones de livraison</h2>
            <p className="text-muted-foreground mb-4">Nous livrons partout au Sénégal avec des tarifs adaptés à chaque zone.</p>
            
            <div className="bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
                <div>
                  <p className="font-medium">Dakar Centre</p>
                  <p className="text-sm text-muted-foreground">Médina, Fass, Point E, Fann, HLM</p>
                </div>
                <p className="font-bold text-primary">1 500 FCFA</p>
              </div>
              <div className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
                <div>
                  <p className="font-medium">Dakar Périphérie</p>
                  <p className="text-sm text-muted-foreground">Parcelles, Almadies, Ouakam, Sacré-Cœur</p>
                </div>
                <p className="font-bold text-primary">2 000 - 2 500 FCFA</p>
              </div>
              <div className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
                <div>
                  <p className="font-medium">Banlieue</p>
                  <p className="text-sm text-muted-foreground">Pikine, Guédiawaye, Keur Massar</p>
                </div>
                <p className="font-bold text-primary">3 000 - 4 000 FCFA</p>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Régions</p>
                  <p className="text-sm text-muted-foreground">Thiès, Mbour, Saint-Louis, etc.</p>
                </div>
                <p className="font-bold text-primary">4 000 - 5 000 FCFA</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Délais de livraison</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Dakar :</strong> 24 à 48 heures ouvrées</li>
              <li><strong>Banlieue :</strong> 48 à 72 heures ouvrées</li>
              <li><strong>Régions :</strong> 3 à 5 jours ouvrés</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Suivi de commande</h2>
            <p className="text-muted-foreground">
              Après confirmation de votre commande, vous recevrez un SMS/WhatsApp avec les informations de suivi. 
              Vous pouvez également suivre votre commande depuis votre espace client.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Livraison gratuite</h2>
            <p className="text-muted-foreground">
              Bénéficiez de la livraison gratuite pour toute commande supérieure à <strong>50 000 FCFA</strong> 
              dans la zone de Dakar Centre.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
