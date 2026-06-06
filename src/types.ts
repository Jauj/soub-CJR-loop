// --- DÉFINITIONS DES TYPES DE DONNÉES ---

// Structure pour l'indexation d'un article
export interface Indexation {
  // Les catégories pour l'index (dynamiques via Firestore)
  categorie: string;
  // Le mot-clé spécifique (ex: "Népal", "Hégémonie")
  terme: string;
}

// Structure complète d'un article
export interface Article {
  id?: string;               // Identifiant unique (Firestore ID)
  titre: string;            // Titre de l'article
  slug?: string;            // URL-friendly version of the title
  extrait: string;          // Court résumé affiché dans les listes
  contenuComplet: string;   // Texte complet au format Markdown
  date: string;             // Date au format AAAA-MM-JJ (pour le tri)
  dateAffichee: string;     // Date telle qu'elle apparaîtra sur le site
  indexations: Indexation[]; // Liste des tags pour l'index
  authorUid?: string;       // UID de l'auteur
  pdfUrl?: string;          // URL vers un fichier PDF (ex: Google Drive)
}

// Structure pour un bulletin (PDF)
export interface Bulletin {
  id?: string;
  numero: string;           // Numéro du bulletin (ex: "1", "Spécial")
  titre?: string;           // Titre optionnel
  date: string;             // Date de parution (ex: "Janvier 1949")
  couvertureUrl: string;    // URL de l'image de couverture
  pdfUrl: string;          // URL du fichier PDF
  ordre: number;            // Pour le tri
}

// Structure pour un lien utile
export interface LienRessource {
  id?: string;
  nom: string;
  url: string;
  description: string;
}

// Structure pour un abonné à la newsletter
export interface Subscriber {
  id?: string;
  email: string;
  dateInscription: string;
}

// Structure pour un bulletin de newsletter
export interface Newsletter {
  id?: string;
  titre: string;
  contenuMarkdown: string;
  dateCreation: string;
  temp?: boolean; // Pour l'état local dans l'admin
}
