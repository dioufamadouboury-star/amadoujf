import SEO from "../components/SEO";

export default function TermsPage() {
  return (
    <main className="min-h-screen pt-20">
      <SEO 
        title="Conditions Générales de Vente" 
        description="Consultez les conditions générales de vente de GROUPE YAMA+."
        url="/cgv"
      />
      <div className="container-lumina py-12">
        <h1 className="text-3xl font-bold mb-8">Conditions Générales de Vente</h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Article 1 - Objet</h2>
            <p>
              Les présentes conditions générales de vente régissent les relations contractuelles entre 
              GROUPE YAMA+, ci-après dénommé "le Vendeur", et toute personne effectuant un achat sur le site 
              groupeyamaplus.com, ci-après dénommé "le Client".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Article 2 - Prix</h2>
            <p>
              Les prix affichés sur le site sont en Francs CFA (FCFA) et incluent toutes les taxes applicables. 
              Les frais de livraison sont indiqués séparément avant la validation de la commande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Article 3 - Commandes</h2>
            <p>
              Le Client sélectionne les produits qu'il souhaite acheter et les ajoute à son panier. 
              La commande n'est validée qu'après confirmation du paiement. Un email de confirmation est 
              envoyé au Client.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Article 4 - Paiement</h2>
            <p>
              Le paiement peut être effectué par Wave, Orange Money, Free Money, carte bancaire ou 
              en espèces à la livraison. Le paiement est sécurisé via notre partenaire PayTech.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Article 5 - Livraison</h2>
            <p>
              Les délais de livraison sont indiqués sur la page de chaque produit. GROUPE YAMA+ s'engage 
              à livrer les produits dans les meilleurs délais. En cas de retard, le Client sera informé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Article 6 - Garantie</h2>
            <p>
              Tous nos produits bénéficient de la garantie légale de conformité. En cas de défaut de 
              conformité, le Client peut demander la réparation ou le remplacement du produit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Article 7 - Propriété intellectuelle</h2>
            <p>
              Tous les éléments du site (textes, images, logos) sont la propriété de GROUPE YAMA+ et 
              ne peuvent être reproduits sans autorisation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Article 8 - Contact</h2>
            <p>
              Pour toute question, contactez-nous :<br />
              Email : contact@groupeyamaplus.com<br />
              WhatsApp : +221 77 000 00 00<br />
              Adresse : Fass Paillote, Dakar, Sénégal
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
