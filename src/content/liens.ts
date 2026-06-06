// --- CONFIGURATION DES LIENS UTILES ---
// Modifiez ou ajoutez des liens dans ce tableau pour mettre à jour l'onglet "Liens"
export interface LienRessource {
  nom: string;
  url: string;
  description: string;
}

export const LISTE_LIENS: LienRessource[] = [
  {
    nom: 'Archives Rosa Luxemburg',
    url: 'https://www.marxists.org/francais/luxembur/index.htm',
    description: 'Textes fondamentaux de Rosa Luxemburg en français.'
  },
  {
    nom: 'Marxists Internet Archive',
    url: 'https://www.marxists.org/',
    description: 'La plus grande bibliothèque numérique de textes marxistes.'
  },
  {
    nom: 'Critique Sociale',
    url: 'https://www.critique-sociale.info/',
    description: 'Revue de réflexion et de combat pour l\'émancipation.'
  },
  {
    nom: 'Contretemps',
    url: 'https://www.contretemps.eu/',
    description: 'Revue de critique communiste et de réflexion stratégique.'
  }
];
