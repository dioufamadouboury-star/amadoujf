import SEO from "../components/SEO";

export default function ReturnPolicyPage() {
  return (
    <main className="min-h-screen pt-20">
      <SEO 
        title="Politique de Retour" 
        description="Conditions de retour et remboursement chez GROUPE YAMA+. Satisfait ou remboursé sous 7 jours."
        url="/retours"
      />
      <div className="container-lumina py-12">
        <h1 className="text-3xl font-bold mb-8">Politique de Retour</h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Délai de retour</h2>
            <p className="text-muted-foreground">
              Vous disposez de <strong>7 jours</strong> après réception de votre commande pour nous retourner 
              un article qui ne vous convient pas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Conditions de retour</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Le produit doit être dans son emballage d'origine, non utilisé</li>
              <li>Les étiquettes et accessoires doivent être intacts</li>
              <li>Le produit ne doit pas présenter de traces d'utilisation</li>
              <li>La preuve d'achat (facture) est obligatoire</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Produits non retournables</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Produits personnalisés ou sur mesure</li>
              <li>Produits d'hygiène descellés</li>
              <li>Produits alimentaires</li>
              <li>Cartes cadeaux et bons d'achat</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Procédure de retour</h2>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Contactez-nous via WhatsApp avec votre numéro de commande</li>
              <li>Nous vous confirmerons l'éligibilité au retour</li>
              <li>Emballez soigneusement le produit</li>
              <li>Déposez le colis à notre point de collecte ou attendez notre livreur</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Remboursement</h2>
            <p className="text-muted-foreground">
              Le remboursement est effectué sous <strong>5 à 7 jours ouvrés</strong> après réception et 
              vérification du produit retourné. Le remboursement se fait via le même mode de paiement utilisé 
              lors de l'achat (Wave, Orange Money, ou virement bancaire).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Frais de retour</h2>
            <p className="text-muted-foreground">
              Les frais de retour sont à la charge du client, sauf en cas de :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
              <li>Produit défectueux</li>
              <li>Erreur de notre part (mauvais produit livré)</li>
              <li>Produit non conforme à la description</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
