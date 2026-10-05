// Source unique des données SEO, utilisée à la fois par l'application React
// (src/Application.tsx, via react-helmet-async) et par le pré-rendu statique
// (scripts/build-seo.js). Toute balise doit être identique des deux côtés,
// sinon Google reçoit des signaux contradictoires (canonique, titre...).

export const BASE_URL = 'https://cjr-soub.fr';
export const SITE_NAME = 'Socialisme ou Barbarie';
export const DEFAULT_IMAGE = `${BASE_URL}/logo-cjr.jpg`;
export const KEYWORDS = [
  'Cercle de Jeunes Révolutionnaires', 'CJR', 'trotskysme', 'marxisme', 'Rosa Luxemburg',
  'front unique', 'révolution', 'organisation révolutionnaire', 'Socialisme ou Barbarie', 'lutte des classes',
];

/** Pages fixes indexables. La clé est le chemin canonique (sans slash final). */
export const PAGES = {
  '/': {
    name: 'Accueil',
    title: `${SITE_NAME} | Cercle de Jeunes Révolutionnaires`,
    description: "Bulletin de liaison du Cercle de Jeunes Révolutionnaires combattant pour le socialisme, pour la construction d'une Organisation Révolutionnaire de la jeunesse, d'une Internationale Révolutionnaire de la Jeunesse.",
    changefreq: 'daily', priority: '1.0',
  },
  '/publications': {
    name: 'Publications',
    title: `Analyses & Thèses | ${SITE_NAME}`,
    description: 'Découvrez les thèses du CJR sur le trotskysme, le marxisme et le front unique. Un fonds documentaire de combat pour la jeunesse révolutionnaire.',
    changefreq: 'daily', priority: '0.9',
  },
  '/index-thematique': {
    name: 'Index thématique',
    title: `Index Thématique (Marxisme, Trotskysme) | ${SITE_NAME}`,
    description: 'Naviguez par concepts : Front Unique, Dualité de pouvoir, Dialectique, Rosa Luxemburg. Le lexique de la révolution.',
    changefreq: 'weekly', priority: '0.6',
  },
  '/liens': {
    name: 'Liens',
    title: `Ressources Révolutionnaires | ${SITE_NAME}`,
    description: "Liens vers les archives marxistes, le projet Trotsky et les organisations sœurs pour la construction de l'Internationale.",
    changefreq: 'weekly', priority: '0.6',
  },
  '/qui-sommes-nous': {
    name: 'Qui sommes-nous ?',
    title: `Projet & Combat du CJR | ${SITE_NAME}`,
    description: 'Histoire et objectifs du Cercle de Jeunes Révolutionnaires. Notre lien avec Socialisme ou Barbarie et la Quatrième Internationale.',
    changefreq: 'monthly', priority: '0.7',
  },
};

/** URL absolue canonique d'un chemin (la racine garde son slash, pas les autres). */
export const canonicalUrl = (path) => (path === '/' ? `${BASE_URL}/` : `${BASE_URL}${path.replace(/\/+$/, '')}`);

/** Slug SEO (60 car. max) calculé à partir d'un titre. */
export function generateSlug(titre) {
  if (!titre) return 'article';
  return titre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Supprime les accents
    .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/-+/g, '-') // Évite les tirets multiples
    .substring(0, 60);
}

/** Slug effectif d'un article (certains anciens articles n'ont pas de champ slug). */
export const articleSlug = (article) => article.slug || generateSlug(article.titre);

export const articleUrl = (article) => canonicalUrl(`/article/${articleSlug(article)}`);

/** Première image Markdown absolue de l'article, sinon le logo. */
export function articleImage(article) {
  const match = (article.contenuComplet || '').match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)/);
  return match ? match[1] : DEFAULT_IMAGE;
}

/** Texte brut pour meta description (Markdown/HTML retirés, ~155 caractères). */
export function cleanDescription(text, max = 155) {
  const plain = (text || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // liens -> texte
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*`_>~|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return plain.substring(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

/** Données SEO d'un article. */
export function articleSeo(article) {
  return {
    title: `${article.titre} | ${SITE_NAME}`,
    description: cleanDescription(article.extrait || article.contenuComplet),
    canonical: articleUrl(article),
    image: articleImage(article),
    type: 'article',
    keywords: [...KEYWORDS, ...(article.indexations || []).map((i) => i.terme).filter(Boolean)].join(', '),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.titre,
        description: cleanDescription(article.extrait || article.contenuComplet),
        image: [articleImage(article)],
        datePublished: article.date,
        inLanguage: 'fr-FR',
        author: { '@type': 'Organization', name: SITE_NAME, url: `${BASE_URL}/` },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl(article) },
      },
      breadcrumb([
        ['Accueil', canonicalUrl('/')],
        ['Publications', canonicalUrl('/publications')],
        [article.titre, articleUrl(article)],
      ]),
    ],
  };
}

/** Données SEO d'une page fixe (clé de PAGES). */
export function pageSeo(path) {
  const page = PAGES[path] || PAGES['/'];
  const items = [['Accueil', canonicalUrl('/')]];
  if (path !== '/') items.push([page.name, canonicalUrl(path)]);
  return {
    title: page.title,
    description: page.description,
    canonical: canonicalUrl(path),
    image: DEFAULT_IMAGE,
    type: 'website',
    keywords: KEYWORDS.join(', '),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${BASE_URL}/`,
        inLanguage: 'fr-FR',
        publisher: { '@type': 'Organization', name: SITE_NAME, logo: DEFAULT_IMAGE },
      },
      breadcrumb(items),
    ],
  };
}

function breadcrumb(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  };
}
