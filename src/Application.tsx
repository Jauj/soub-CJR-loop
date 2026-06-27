/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Instagram, Mail, ArrowLeft, LogIn, LogOut, Plus, Edit2, Settings, Hash, Bold, Italic, Image as ImageIcon, FileDown, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Toaster, toast } from 'sonner';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { Article, LienRessource, Bulletin, Subscriber, Newsletter } from './types';
import { convertToDirectLink } from './lib/utils';
import { getArticles, getContent, saveContent, getLiens, saveLien, removeLien, getCategories, saveCategory, removeCategory } from './services/articleService';
import { getBulletins } from './services/bulletinService';
import AdminEditor from './components/AdminEditor';
import BulletinEditor from './components/BulletinEditor';
import NewsletterForm from './components/NewsletterForm';
import NewsletterAdmin from './components/NewsletterAdmin';
import { auth, googleProvider, signInWithPopup, signOut, signInWithEmailAndPassword, logEvent, analytics } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';

const COULEUR_ROUGE = 'rgba(227, 36, 33, 1)';

// --- COMPOSANT D'ERREUR ---
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-12 bg-red-50 border-4 border-red-600 m-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-red-600 mb-4">Erreur Système</h1>
        <p className="font-serif italic mb-8">Une erreur critique est survenue dans l'application.</p>
        <pre className="bg-black text-white p-6 overflow-auto text-xs font-mono">
          {JSON.stringify(error, null, 2)}
        </pre>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 bg-red-600 text-white px-8 py-3 font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
        >
          Redémarrer l'application
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// --- SUIVI GOOGLE ANALYTICS ---
function GoogleAnalytics() {
  const location = useLocation();
  
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'page_view', {
        page_location: window.location.href,
        page_path: location.pathname + location.search,
        page_title: document.title
      });
    }
  }, [location]);

  return null;
}

// --- CONFIGURATION DU RENDU MARKDOWN ---
const MarkdownComponents = (naviguerVersPublications: (terme: string) => void, navigate: any, TOUS_LES_ARTICLES: Article[], currentArticle?: Article) => ({
  h2: ({ ...props }) => <h2 className="text-3xl font-black uppercase tracking-tighter mt-12 mb-6 border-b-2 border-black/5 pb-2" {...props} />,
  h3: ({ ...props }) => <h3 className="text-xl font-bold uppercase tracking-tight mt-8 mb-4" {...props} />,
  blockquote: ({ ...props }) => (
    <blockquote 
      className="border-l-4 pl-6 py-4 my-8 italic font-serif text-xl bg-black/[0.02] relative border-[rgba(227,36,33,1)]"
      {...props} 
    />
  ),
  a: ({ href, children, ...props }: any) => {
    if (href?.startsWith('meta:')) {
      const terme = href.replace('meta:', '');
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            naviguerVersPublications(terme);
          }}
          className="font-bold border-b border-red-600 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
        >
          {children}
        </button>
      );
    }
    
    if (href?.startsWith('article:')) {
      const id = href.replace('article:', '');
      const article = TOUS_LES_ARTICLES.find(a => String(a.id) === id);
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (article) {
              navigate(`/article/${article.slug || article.id}`);
              window.scrollTo(0, 0);
            }
          }}
          className="font-bold text-red-600 hover:underline cursor-pointer"
        >
          {children}
        </button>
      );
    }

    const isExternal = href?.startsWith('http');
    return (
      <a 
        href={href} 
        className="text-red-600 underline hover:no-underline transition-all" 
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt, style, width, ...props }: any) => (
    <img 
      src={convertToDirectLink(src)} 
      alt={alt || (currentArticle ? `Illustration pour l'article ${currentArticle.titre}` : "Socialisme ou Barbarie Illustration")} 
      style={style}
      width={width}
      className="max-w-full h-auto my-12 border border-black/10 shadow-lg" 
      referrerPolicy="no-referrer"
      {...props} 
    />
  )
});

// --- COMPOSANT APERÇU ARTICLE ---
const ArticlePreview = ({ article, onNavigate, color }: { article: Article, onNavigate: (slug: string) => void, color: string }) => (
  <article 
    className="group cursor-pointer mb-10 last:mb-0"
    onClick={() => onNavigate(article.slug || article.id)}
    itemScope 
    itemType="https://schema.org/NewsArticle"
  >
    <div className="flex items-center gap-4 mb-2">
      <time 
        dateTime={article.date}
        itemProp="datePublished"
        className="text-[10px] uppercase tracking-widest font-bold" 
        style={{ color }}
      >
        {article.dateAffichee}
      </time>
      <div className="h-[1px] flex-1 bg-black/10"></div>
    </div>
    <h3 
      itemProp="headline"
      className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none mb-4 group-hover:text-red-600 transition-colors"
    >
      {article.titre}
    </h3>
    <div className="flex flex-wrap gap-2 mb-4">
      {article.indexations?.map((idx, i) => (
        <span 
          key={i} 
          className="px-2.5 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-[0.15em]"
        >
          {idx.terme}
        </span>
      ))}
    </div>
    <p 
      itemProp="description"
      className="text-lg leading-relaxed text-black/70 text-justify"
    >
      {article.extrait}
    </p>
  </article>
);

export default function Application() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <GoogleAnalytics />
        <ErrorBoundary>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/publications" element={<MainApp />} />
            <Route path="/index" element={<MainApp />} />
            <Route path="/liens" element={<MainApp />} />
            <Route path="/qui-sommes-nous" element={<MainApp />} />
            <Route path="/admin" element={<MainApp />} />
            <Route path="/article/:slug" element={<MainApp />} />
            <Route path="*" element={<MainApp />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  );
}

function MainApp() {
  // --- NAVIGATION ET ROUTAGE ---
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // --- HOOKS DE DONNÉES ET AUTH ---
  const { user, isAdmin, loading: isAuthLoading } = useAuth();
  const { 
    articles: articlesApi, 
    bulletins, 
    categories, 
    liens, 
    subscribers, 
    newsletters, 
    loading: isDataLoading, 
    adminLoading,
    loadAdminData,
    refreshPublicData 
  } = useAppData();

  // --- ÉTATS DE L'APPLICATION ---
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [termeFiltre, setTermeFiltre] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  
  const [apropos, setApropos] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const [isEditingBulletin, setIsEditingBulletin] = useState(false);
  const [bulletinToEdit, setBulletinToEdit] = useState<Bulletin | null>(null);
  const [adminSubTab, setAdminSubTab] = useState<'articles' | 'content' | 'liens' | 'index' | 'bulletins' | 'newsletter'>('articles');
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Charger Apropos séparément car c'est un contenu spécifique
  useEffect(() => {
    getContent('apropos').then(setApropos).catch(console.error);
  }, []);

  const ongletActif = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'Accueil';
    if (path.startsWith('/publications')) return 'Publications';
    if (path.startsWith('/index')) return 'Index';
    if (path.startsWith('/liens')) return 'Liens';
    if (path.startsWith('/qui-sommes-nous')) return 'Qui sommes nous ?';
    if (path.startsWith('/admin')) return 'Admin';
    if (path.startsWith('/article')) return 'Article';
    return 'Accueil';
  }, [location.pathname]);

  // Déchargement et chargement des données admin quand on change d'onglet
  useEffect(() => {
    if (ongletActif === 'Admin' && isAdmin) {
      loadAdminData();
    }
  }, [ongletActif, isAdmin, loadAdminData]);

  // Détermination de l'onglet actif et de l'article sélectionné via l'URL
  const articleSelectionne = useMemo(() => {
    if (params.slug && articlesApi.length > 0) {
      return articlesApi.find(a => a.slug === params.slug || a.id === params.slug) || null;
    }
    return null;
  }, [params.slug, articlesApi]);

  // État pour savoir si on a cherché un article mais qu'il n'existe pas
  const isArticleNotFound = useMemo(() => {
    return !!params.slug && !isDataLoading && !articleSelectionne;
  }, [params.slug, isDataLoading, articleSelectionne]);

  // --- GESTION DES DONNÉES STRUCTURÉES (JSON-LD) ---
  const structuredData = useMemo(() => {
    const brand = "Socialisme ou Barbarie";
    const urlBase = "https://cjr-soub.fr/";
    const keywords = ["marxisme", "trotskysme", "front unique", "Rosa Luxemburg", "révolution", "critique sociale", "bolchevisme", "mouvement ouvrier"];

    const breadcrumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Accueil",
          "item": urlBase
        },
        ongletActif !== 'Accueil' && {
          "@type": "ListItem",
          "position": 2,
          "name": ongletActif,
          "item": `${urlBase}${location.pathname.substring(1)}`
        }
      ].filter(Boolean)
    };

    if (articleSelectionne) {
      const imgMatch = articleSelectionne.contenuComplet.match(/!\[.*?\]\((.*?)\)/);
      const imageUrl = imgMatch ? imgMatch[1] : `${urlBase}logo-cjr.jpg`;

      return [
        {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": articleSelectionne.titre,
          "description": articleSelectionne.extrait,
          "image": [imageUrl],
          "datePublished": articleSelectionne.date,
          "keywords": [...keywords, ...(articleSelectionne.indexations?.map(i => i.terme) || [])].join(", "),
          "author": {
            "@type": "Organization",
            "name": brand,
            "url": urlBase,
            "logo": `${urlBase}logo-cjr.jpg`
          },
          "publisher": {
            "@type": "Organization",
            "name": brand,
            "logo": {
              "@type": "ImageObject",
              "url": `${urlBase}logo-cjr.jpg`
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${urlBase}article/${articleSelectionne.slug || articleSelectionne.id}`
          }
        },
        breadcrumbs
      ];
    } else {
      return [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": brand,
          "url": urlBase,
          "description": "Portail d'études et de combat du Cercle de Jeunes Révolutionnaires (CJR). Analyses approfondies sur le trotskysme, le front unique, le marxisme révolutionnaire et l'histoire de Socialisme ou Barbarie.",
          "keywords": keywords.join(", "),
          "publisher": {
            "@type": "Organization",
            "name": brand,
            "logo": `${urlBase}logo-cjr.jpg`,
            "knowsAbout": keywords
          }
        },
        breadcrumbs
      ];
    }
  }, [articleSelectionne, ongletActif, location.pathname]);

  // --- GESTION DU TITRE ET DE LA META DESCRIPTION (SEO) ---
  const seoData = useMemo(() => {
    const brand = "Socialisme ou Barbarie";
    const baseKeywords = "Cercle de Jeunes Révolutionnaires, CJR, trotskysme, marxisme, Rosa Luxemburg, front unique, révolution, organisation révolutionnaire, Socialisme ou Barbarie, lutte des classes";
    const baseUrl = "https://cjr-soub.fr"; // Sans slash final pour cohérence
    
    let title = brand;
    let description = "Bulletin de liaison du Cercle de Jeunes Révolutionnaires combattant pour le socialisme, pour la construction d'une Organisations Révolutionnaire de la jeunesse, d'une Internationale Révolutionnaire de la Jeunesse";
    let canonicalUrl = baseUrl + "/"; // Racine finit par / par convention
    let type = "website";

    if (articleSelectionne) {
      title = `${articleSelectionne.titre} | ${brand}`;
      description = articleSelectionne.extrait.length > 155 
        ? articleSelectionne.extrait.substring(0, 152) + "..." 
        : articleSelectionne.extrait;
      canonicalUrl = `${baseUrl}/article/${articleSelectionne.slug || articleSelectionne.id}`;
      type = "article";
    } else {
      switch (ongletActif) {
        case 'Accueil':
          title = `${brand} | Cercle de Jeunes Révolutionnaires`;
          canonicalUrl = baseUrl + "/";
          break;
        case 'Publications':
          title = `Analyses & Thèses | ${brand}`;
          description = `Découvrez les thèses du CJR sur le trotskysme, le marxisme et le front unique. Un fonds documentaire de combat pour la jeunesse révolutionnaire.`;
          canonicalUrl = `${baseUrl}/publications`;
          break;
        case 'Index':
          title = `Index Thématique (Marxisme, Trotskysme) | ${brand}`;
          description = "Naviguez par concepts : Front Unique, Dualité de pouvoir, Dialectique, Rosa Luxemburg. Le lexique de la révolution.";
          canonicalUrl = `${baseUrl}/index`;
          break;
        case 'Liens':
          title = `Ressources Révolutionnaires | ${brand}`;
          description = "Liens vers les archives marxistes, le projet Trotsky et les organisations sœurs pour la construction de l'Internationale.";
          canonicalUrl = `${baseUrl}/liens`;
          break;
        case 'Qui sommes nous ?':
          title = `Projet & Combat du CJR | ${brand}`;
          description = "Histoire et objectifs du Cercle de Jeunes Révolutionnaires. Notre lien avec Socialisme ou Barbarie et la Quatrième Internationale.";
          canonicalUrl = `${baseUrl}/qui-sommes-nous`;
          break;
      }
    }

    const imgMatch = articleSelectionne?.contenuComplet.match(/!\[.*?\]\((.*?)\)/);
    const imageUrl = imgMatch ? imgMatch[1] : `${baseUrl}/logo-cjr.jpg`;
    const finalKeywords = baseKeywords + (articleSelectionne ? `, ${articleSelectionne.indexations?.map(i => i.terme).join(", ")}` : '');

    return { title, description, canonicalUrl, type, imageUrl, keywords: finalKeywords };
  }, [articleSelectionne, ongletActif, location.pathname]);

  const handleLogin = async (password: string) => {
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, "admin@cjr.fr", password);
      setShowLogin(false);
      toast.success("Connecté avec succès");
    } catch (err: any) {
      setLoginError("Mot de passe incorrect ou compte non configuré");
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info("Déconnecté");
    } catch (err) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  // Fusion des articles statiques et de l'API
  const TOUS_LES_ARTICLES = useMemo(() => {
    const fusion = [...articlesApi];
    // Éviter les doublons si on migre (basé sur le titre pour l'instant)
    const unique = fusion.filter((v, i, a) => a.findIndex(t => t.titre === v.titre) === i);
    return unique.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [articlesApi]);

  // --- LOGIQUE DE NAVIGATION ---

  // Réinitialiser le filtre quand on change d'onglet (sauf si on va vers Publications)
  useEffect(() => {
    if (ongletActif !== 'Publications') {
      setTermeFiltre(null);
      setRecherche('');
    }
  }, [ongletActif]);

  // S'assurer que si on arrive sur Publications sans terme de filtre, on voit tout
  // (Utile si on clique sur Publications alors qu'on y était déjà avec un filtre)
  const naviguerVersPublications = (terme: string | null = null) => {
    setTermeFiltre(terme);
    setRecherche('');
    navigate('/publications');
    window.scrollTo(0, 0);
  };

  // Liste des éléments du menu
  const elementsNavigation = ['Accueil', 'Publications', 'Index', 'Liens', 'Qui sommes nous ?'];
  if (isAdmin) elementsNavigation.push('Admin');

  // --- TRAITEMENT DES DONNÉES (Calculs automatiques) ---

  // Récupère les 10 derniers articles pour la page d'accueil
  const articlesAccueil = useMemo(() => TOUS_LES_ARTICLES.slice(0, 10), [TOUS_LES_ARTICLES]);

  // Filtre la liste complète des articles si un terme d'index est sélectionné ou une recherche est active
  const articlesFiltres = useMemo(() => {
    let result = TOUS_LES_ARTICLES;
    
    // 1. Filtre par tag (Index)
    if (termeFiltre) {
      const termeNormalise = termeFiltre.trim().toLowerCase();
      result = result.filter(art => 
        art.indexations && art.indexations.some(idx => idx.terme.trim().toLowerCase() === termeNormalise)
      );
    }
    
    // 2. Filtre par recherche textuelle
    if (recherche.trim()) {
      const query = recherche.toLowerCase().trim();
      result = result.filter(art => 
        art.titre.toLowerCase().includes(query) || 
        art.extrait.toLowerCase().includes(query) || 
        art.contenuComplet.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [termeFiltre, recherche, TOUS_LES_ARTICLES]);

  // Organise tous les articles par Catégorie -> Terme pour l'onglet Index
  const indexCategorise = useMemo(() => {
    const index: Record<string, Record<string, Article[]>> = {};
    
    // 1. Initialiser avec les catégories dynamiques connues (pour respecter l'ordre)
    const categoriesTriees = [...categories].sort((a, b) => a.ordre - b.ordre);
    categoriesTriees.forEach(cat => {
      index[cat.nom] = {};
    });

    // 2. Remplir avec les articles
    TOUS_LES_ARTICLES.forEach(article => {
      if (!article.indexations) return;
      
      article.indexations.forEach(({ categorie, terme }) => {
        const catNom = categorie || 'Non classé';
        const termeNettoye = terme.trim();
        
        if (!termeNettoye) return;

        // Créer la catégorie si elle n'existe pas encore dans l'index
        if (!index[catNom]) {
          index[catNom] = {};
        }
        
        if (!index[catNom][termeNettoye]) {
          index[catNom][termeNettoye] = [];
        }
        
        // Éviter les doublons d'articles pour un même terme
        if (!index[catNom][termeNettoye].find(a => a.id === article.id)) {
          index[catNom][termeNettoye].push(article);
        }
      });
    });

    // 3. Supprimer les catégories vides qui n'ont aucun terme
    const finalIndex: Record<string, Record<string, Article[]>> = {};
    Object.entries(index).forEach(([cat, termes]) => {
      if (Object.keys(termes).length > 0) {
        finalIndex[cat] = termes;
      }
    });

    return finalIndex;
  }, [TOUS_LES_ARTICLES, categories]);

  // Configuration du rendu Markdown (Comment transformer le texte en HTML)
  const markdownConfig = useMemo(() => 
    MarkdownComponents(naviguerVersPublications, navigate, TOUS_LES_ARTICLES, articleSelectionne || undefined), 
    [TOUS_LES_ARTICLES, navigate, articleSelectionne]
  );

  if (isAuthLoading || (isDataLoading && !articlesApi.length)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-red-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // --- COMPOSANTS DE RENDU (Éléments visuels) ---

  // Barre latérale (Menu de navigation)
  const BarreLaterale = ({ estMobile = false }) => (
    <div className="flex flex-col min-h-full items-center text-center w-full">
      {/* Cacher le titre et sous-titre si c'est le menu mobile ouvert */}
      {!estMobile && (
        <div className="mb-12 flex flex-col items-center">
          {ongletActif === 'Accueil' && !articleSelectionne ? (
            <h1 className="text-5xl font-black uppercase tracking-tighter leading-[0.85] mb-6">
              Socialisme <br />
              <span style={{ color: COULEUR_ROUGE }}>ou</span> <br />
              Barbarie
            </h1>
          ) : (
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-[0.85] mb-6">
              Socialisme <br />
              <span style={{ color: COULEUR_ROUGE }}>ou</span> <br />
              Barbarie
            </h2>
          )}
          <p className="text-sm italic font-serif leading-relaxed border-l-4 pl-4 py-2 text-left" style={{ borderColor: COULEUR_ROUGE }}>
            "La société bourgeoise se trouve à la croisée des chemins : soit en transition vers le socialisme, soit en régression vers la barbarie."
            <br />
            <span className="font-bold not-italic font-sans mt-2 block">— Rosa Luxemburg citant F. Engels</span>
          </p>
        </div>
      )}

      <nav className={`flex flex-col gap-4 items-center ${estMobile ? 'mt-8' : ''} mb-12`}>
        {elementsNavigation.map((item) => (
          <button
            key={item}
            onClick={() => {
              const pathMap: Record<string, string> = {
                'Accueil': '/',
                'Publications': '/publications',
                'Index': '/index',
                'Liens': '/liens',
                'Qui sommes nous ?': '/qui-sommes-nous',
                'Admin': '/admin'
              };
              
              if (item === 'Publications') {
                naviguerVersPublications(null);
              } else {
                navigate(pathMap[item] || '/');
              }
              setMenuOuvert(false);
              window.scrollTo(0, 0);
            }}
            className={`text-center text-2xl font-bold uppercase tracking-tight transition-all duration-300 relative group w-fit`}
          >
            <span className={`relative z-10 ${ongletActif === item ? 'text-white' : 'text-black group-hover:text-red-600'}`}>
              {item}
            </span>
            {ongletActif === item && (
              <motion.div 
                layoutId={estMobile ? "ongletActifMobile" : "ongletActif"}
                className="absolute inset-0 -inset-x-4 z-0"
                style={{ backgroundColor: COULEUR_ROUGE }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Logo CJR entre Admin et la barre */}
      <div className="mt-auto mb-8">
        <img 
          src="/logo-cjr.jpg" 
          alt="Logo CJR" 
          className="w-32 h-auto transition-transform hover:scale-105"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="pt-6 border-t border-black/10 w-full flex flex-col items-center">
        {/* Intégration Newsletter */}
        <div className="mb-6 w-full flex justify-center">
          <NewsletterForm />
        </div>

        {/* Logos Instagram et Mail */}
        <div className="flex gap-4 mb-8 justify-center">
          <a 
            href="https://www.instagram.com/cjr.soub/" 
            target="_blank" 
            rel="noopener noreferrer"
            title="Instagram"
            className="p-3 rounded-full border border-black/10 hover:bg-red-600 hover:border-red-600 hover:text-white transition-all"
          >
            <Instagram size={20} />
          </a>
          <a 
            href="mailto:cjr.soub@gmail.com" 
            title="Email"
            className="p-3 rounded-full border border-black/10 hover:bg-red-600 hover:border-red-600 hover:text-white transition-all"
          >
            <Mail size={20} />
          </a>
          {/* Bouton Login */}
          {!user ? (
            <div className="relative">
              <button 
                onClick={() => setShowLogin(!showLogin)}
                title="Connexion Admin"
                className={`p-3 rounded-full border border-black/10 hover:bg-black hover:text-white transition-all ${showLogin ? 'bg-black text-white' : ''}`}
              >
                <LogIn size={20} />
              </button>
              
              <AnimatePresence>
                {showLogin && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="absolute left-full ml-4 top-0 bg-white border border-black/10 p-4 shadow-2xl z-50 min-w-[250px]"
                  >
                    <div className="space-y-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Accès Administrateur</div>
                      <p className="text-[10px] italic mb-4">Entrez le mot de passe administrateur.</p>
                      
                      {loginError && <div className="text-[9px] text-red-600 font-bold uppercase leading-tight mb-2">{loginError}</div>}
                      
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
                          handleLogin(password);
                        }}
                        className="space-y-3"
                      >
                        <input 
                          name="password"
                          type="password"
                          placeholder="Mot de passe"
                          className="w-full p-3 border border-black/10 outline-none focus:border-red-600 text-[10px]"
                          autoFocus
                        />
                        <button 
                          type="submit"
                          className="w-full bg-black text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                        >
                          <LogIn size={14} />
                          Se connecter
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={handleLogout}
              title="Déconnexion"
              className="p-3 rounded-full border border-black/10 hover:bg-black hover:text-white transition-all"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>

        <div className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-red-600 selection:text-white">
      {/* SEO avec React Helmet */}
      <Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <link rel="canonical" href={seoData.canonicalUrl} />
        <meta name="robots" content={ongletActif === 'Admin' ? 'noindex, nofollow' : 'index, follow'} />

        {/* Open Graph */}
        <meta property="og:title" content={seoData.title} />
        <meta property="og:description" content={seoData.description} />
        <meta property="og:url" content={seoData.canonicalUrl} />
        <meta property="og:type" content={seoData.type} />
        <meta property="og:image" content={seoData.imageUrl} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoData.title} />
        <meta name="twitter:description" content={seoData.description} />
        <meta name="twitter:image" content={seoData.imageUrl} />

        {/* Données Structurées JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* En-tête Mobile avec Burger */}
      <header className="md:hidden flex items-center justify-between px-4 py-6 border-b border-black/10 sticky top-0 bg-white z-50">
        {ongletActif === 'Accueil' && !articleSelectionne ? (
          <h1 className="text-2xl font-black uppercase tracking-tighter">
            S <span style={{ color: COULEUR_ROUGE }}>ou</span> B
          </h1>
        ) : (
          <div className="text-2xl font-black uppercase tracking-tighter">
            S <span style={{ color: COULEUR_ROUGE }}>ou</span> B
          </div>
        )}
        <button 
          onClick={() => setMenuOuvert(!menuOuvert)}
          className="p-2 hover:bg-black/5 rounded-full transition-colors"
          aria-label="Menu"
        >
          {menuOuvert ? <X size={28} /> : <Menu size={28} />}
        </button>
      </header>

      {/* Menu Mobile (Overlay) */}
      <AnimatePresence>
        {menuOuvert && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 bg-white z-40 p-8 pt-24 md:hidden overflow-y-auto"
          >
            <BarreLaterale estMobile={true} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex flex-col md:flex-row min-h-screen">
        
        {/* Sidebar - Version Bureau */}
        <aside className="hidden md:flex w-96 px-8 py-12 bg-white sticky top-0 h-screen flex-col border-r border-black/10 overflow-y-auto">
          <BarreLaterale />
        </aside>

        {/* Contenu Principal */}
        <main className="flex-1 min-w-0 px-8 md:px-16 py-8 md:py-16">
          <AnimatePresence mode="wait">
            {isArticleNotFound ? (
              <motion.div
                key="404"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <h2 className="text-6xl font-black uppercase tracking-tighter mb-4">404</h2>
                <p className="font-serif italic text-xl mb-8">Cet article semble avoir disparu dans les méandres de l'histoire.</p>
                <button 
                  onClick={() => navigate('/')}
                  className="bg-black text-white px-8 py-3 font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
                >
                  Retour à l'accueil
                </button>
              </motion.div>
            ) : articleSelectionne ? (
              <motion.article
                key="article-complet"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full"
              >
                <button 
                  onClick={() => navigate('/publications')}
                  className="mb-12 flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-red-600 transition-colors"
                >
                  ← Retour à la liste
                </button>
                <header className="mb-8">
                  <span className="text-xs font-bold uppercase tracking-widest text-red-600">
                    {articleSelectionne.dateAffichee}
                  </span>
                  <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mt-4 mb-8">
                    {articleSelectionne.titre}
                  </h1>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {articleSelectionne.indexations.map((idx, i) => (
                      <button 
                        key={i} 
                        onClick={() => naviguerVersPublications(idx.terme)}
                        className="px-3 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors"
                      >
                        {idx.terme}
                      </button>
                    ))}
                  </div>
                </header>

                <div className="prose prose-lg max-w-none">
                  <div className="text-lg leading-relaxed text-black/80">
                    <ReactMarkdown 
                      components={markdownConfig} 
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    >
                      {articleSelectionne.contenuComplet}
                    </ReactMarkdown>
                  </div>
                </div>
                {articleSelectionne.pdfUrl && (
                  <div className="mt-12 p-8 border-2 border-dashed border-black/10 flex flex-col items-center gap-6 bg-black/[0.01]">
                    <div className="text-center">
                      <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Version PDF disponible</h3>
                      <p className="text-sm text-black/50 italic">Téléchargez l'article complet pour une lecture hors-ligne ou impression.</p>
                    </div>
                    <a 
                      href={articleSelectionne.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-black text-white px-8 py-4 font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl hover:shadow-red-600/20"
                    >
                      <FileDown size={20} /> Télécharger le PDF
                    </a>
                  </div>
                )}
                {isAdmin && String(articleSelectionne.id).length > 5 && (
                  <footer className="mt-12 flex justify-end">
                    <button 
                      onClick={() => {
                        setArticleToEdit(articleSelectionne);
                        setIsEditing(true);
                      }}
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-black text-white px-6 py-2 hover:bg-red-600 transition-colors"
                    >
                      <Edit2 size={14} /> Modifier cet article
                    </button>
                  </footer>
                )}
              </motion.article>
            ) : (
              <motion.div 
                key={ongletActif}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-16"
              >
              {ongletActif === 'Accueil' && (
                <div className="space-y-24">
                  {bulletins.length > 0 && (
                    <section>
                      <div className="mb-12">
                        <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-red-600 mb-2">N° du bulletin</h2>
                        <div className="h-1 w-12 bg-red-600"></div>
                      </div>
                      <div className="flex overflow-x-auto gap-8 pb-8 scrollbar-hide snap-x">
                        {bulletins.map((b) => (
                          <motion.a 
                            key={b.id}
                            href={b.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ y: -10 }}
                            className="flex-shrink-0 w-48 snap-start group"
                          >
                            <div className="relative aspect-[3/4] mb-4 shadow-xl group-hover:shadow-red-600/20 transition-all duration-500">
                              <img 
                                src={convertToDirectLink(b.couvertureUrl)} 
                                alt={`Bulletin N°${b.numero}`} 
                                className="w-full h-full object-cover border border-black/5"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500 flex items-center justify-center">
                                <FileDown className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                              </div>
                            </div>
                            <div className="text-center">
                              <h3 className="text-sm font-black uppercase tracking-tighter">N° {b.numero}</h3>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{b.date}</p>
                            </div>
                          </motion.a>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <div className="mb-12">
                      <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-red-600 mb-2">Dernières publications</h2>
                      <div className="h-1 w-12 bg-red-600"></div>
                    </div>
                    {articlesAccueil.length > 0 ? (
                      articlesAccueil.map(art => (
                        <ArticlePreview 
                          key={art.id} 
                          article={art} 
                          onNavigate={(slug) => {
                            navigate(`/article/${slug}`);
                            window.scrollTo(0, 0);
                          }}
                          color={COULEUR_ROUGE}
                        />
                      ))
                    ) : (
                      <p className="text-sm italic opacity-50">Aucun article disponible pour le moment.</p>
                    )}
                  </section>
                </div>
              )}

              {ongletActif === 'Publications' && (
                <section className="space-y-4">
                  <div className="mb-12">
                    <h1 className="text-xs font-bold uppercase tracking-[0.3em] text-red-600 mb-2">
                      {termeFiltre ? `Publications indexées : ${termeFiltre}` : 'Toutes les publications'}
                    </h1>
                    <div className="h-1 w-12 bg-red-600 mb-8"></div>
                    
                    {/* Moteur de recherche */}
                    <div className="relative max-w-md mb-8 ml-auto">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-black/30">
                        <Search size={16} />
                      </div>
                      <input 
                        type="text" 
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        placeholder="Rechercher un mot-clé..."
                        className="w-full bg-black/[0.03] border-b-2 border-black/10 py-4 pl-12 pr-4 text-sm font-bold uppercase tracking-widest outline-none focus:border-red-600 transition-all"
                      />
                      {recherche && (
                        <button 
                          onClick={() => setRecherche('')}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-black/30 hover:text-red-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {termeFiltre && (
                      <button 
                        onClick={() => setTermeFiltre(null)}
                        className="mt-4 text-[10px] font-bold uppercase tracking-widest hover:text-red-600 flex items-center gap-2"
                      >
                        <X size={12} /> Effacer le filtre par tag
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-8">
                    {articlesFiltres.length > 0 ? (
                      articlesFiltres.map(article => (
                        <ArticlePreview 
                          key={article.id} 
                          article={article} 
                          onNavigate={(slug) => {
                            navigate(`/article/${slug}`);
                            window.scrollTo(0, 0);
                          }}
                          color={COULEUR_ROUGE}
                        />
                      ))
                    ) : (
                      <div className="py-12 text-center border-2 border-dashed border-black/5">
                        <p className="text-black/50 italic font-serif">
                          {recherche 
                            ? `Aucun article ne correspond à la recherche "${recherche}"` 
                            : "Aucun article trouvé pour ce terme d'indexation."}
                        </p>
                        {(recherche || termeFiltre) && (
                          <button 
                            onClick={() => { setRecherche(''); setTermeFiltre(null); }}
                            className="mt-4 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:underline"
                          >
                            Réinitialiser tous les filtres
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {ongletActif === 'Index' && (
                <section className="space-y-12">
                  <div className="mb-12">
                    <h1 className="text-xs font-bold uppercase tracking-[0.3em] text-red-600 mb-2">Index thématique</h1>
                    <div className="h-1 w-12 bg-red-600"></div>
                  </div>
                  <div className="space-y-16">
                    {Object.entries(indexCategorise).map(([categorie, termes]) => (
                      <div key={categorie} className="border-t border-black/10 pt-8">
                        <h3 className="text-4xl font-black uppercase tracking-tighter mb-8" style={{ color: COULEUR_ROUGE }}>
                          {categorie}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                          {Object.entries(termes).map(([terme, articles]) => (
                            <button 
                              key={terme}
                              onClick={() => naviguerVersPublications(terme)}
                              className="group w-full text-left flex items-center justify-between py-3 border-b border-black/5 hover:border-red-600 transition-colors"
                            >
                              <span className="text-xl font-bold uppercase tracking-tight group-hover:text-red-600 transition-colors">
                                {terme}
                              </span>
                              <span className="text-[10px] font-bold opacity-30 group-hover:opacity-100 group-hover:text-red-600 transition-all">
                                {articles.length} ARTICLES →
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

                  {ongletActif === 'Liens' && (
                    <section className="w-full">
                      <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">Liens</h1>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {liens.length === 0 && <p className="text-black/30 italic">Aucun lien disponible.</p>}
                        {liens.map(lien => (
                          <a 
                            key={lien.id} 
                            href={lien.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border border-black/10 hover:border-red-600 transition-colors cursor-pointer group overflow-hidden"
                          >
                            <div className="p-6">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold uppercase tracking-tight text-xl">{lien.nom}</span>
                                <span className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold">VISITER ↗</span>
                              </div>
                              <p className="text-sm text-black/60 group-hover:text-black/80 transition-colors text-justify">{lien.description}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

              {ongletActif === 'Qui sommes nous ?' && (
                <section className="w-full">
                  <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">Qui sommes nous ?</h1>
                  <div className="prose prose-lg max-w-none text-black/80">
                    <ReactMarkdown 
                      components={markdownConfig} 
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    >
                      {apropos || "Contenu en cours de rédaction..."}
                    </ReactMarkdown>
                  </div>
                </section>
              )}

              {ongletActif === 'Admin' && isAdmin && (
                <section className="space-y-12">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <h1 className="text-4xl font-black uppercase tracking-tighter">Administration</h1>
                      <nav className="flex gap-4 mt-4">
                        {['articles', 'bulletins', 'newsletter', 'content', 'liens', 'index'].map(tab => (
                          <button
                            key={tab}
                            onClick={() => setAdminSubTab(tab as any)}
                            className={`text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 border ${adminSubTab === tab ? 'bg-black text-white border-black' : 'border-black/10 hover:border-black'}`}
                          >
                            {tab === 'articles' ? 'Articles' : tab === 'bulletins' ? 'Bulletins' : tab === 'newsletter' ? 'Newsletter' : tab === 'content' ? 'Qui sommes nous ?' : tab === 'liens' ? 'Liens' : 'Index/Catégories'}
                          </button>
                        ))}
                      </nav>
                    </div>
                    {adminSubTab === 'articles' && (
                      <button 
                        onClick={() => {
                          setArticleToEdit(null);
                          setIsEditing(true);
                        }}
                        className="flex items-center gap-2 bg-red-600 text-white px-8 py-3 font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg"
                      >
                        <Plus size={20} /> Nouvel Article
                      </button>
                    )}
                  </div>

                  {adminSubTab === 'articles' && (
                    <div className="grid grid-cols-1 gap-4">
                      {articlesApi.length === 0 ? (
                        <div className="p-12 border-2 border-dashed border-black/10 text-center">
                          <p className="text-black/30 italic">Aucun article dynamique pour le moment.</p>
                        </div>
                      ) : (
                        articlesApi.map(article => (
                          <div key={article.id} className="p-6 border border-black/10 flex justify-between items-center group hover:border-red-600 transition-colors">
                            <div>
                              <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{article.dateAffichee}</span>
                              <h3 className="text-xl font-black uppercase tracking-tighter mt-1">{article.titre}</h3>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(String(article.id));
                                  alert(`ID copié : ${article.id}\nUtilisez [Texte](article:${article.id}) pour créer un lien interne.`);
                                }}
                                className="p-3 rounded-full hover:bg-black/5 text-black/20 hover:text-black transition-all"
                                title="Copier l'ID pour lien interne"
                              >
                                <Hash size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  setArticleToEdit(article);
                                  setIsEditing(true);
                                }}
                                className="p-3 rounded-full hover:bg-red-50 text-black/30 hover:text-red-600 transition-all"
                              >
                                <Edit2 size={20} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {adminSubTab === 'bulletins' && (
                    <div className="space-y-8">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold uppercase tracking-tight">Gestion des Bulletins PDF</h3>
                        <button 
                          onClick={() => {
                            setBulletinToEdit(null);
                            setIsEditingBulletin(true);
                          }}
                          className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg text-xs"
                        >
                          <Plus size={16} /> Nouveau Bulletin
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bulletins.length === 0 ? (
                          <div className="col-span-full p-12 border-2 border-dashed border-black/10 text-center">
                            <p className="text-black/30 italic">Aucun bulletin pour le moment.</p>
                          </div>
                        ) : (
                          bulletins.map(bulletin => (
                            <div key={bulletin.id} className="p-4 border border-black/10 flex gap-4 group hover:border-red-600 transition-colors">
                              <img 
                                src={bulletin.couvertureUrl} 
                                alt="" 
                                className="w-20 h-28 object-cover border border-black/5"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 flex flex-col justify-between">
                                <div>
                                  <h4 className="font-black uppercase tracking-tighter">N° {bulletin.numero}</h4>
                                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{bulletin.date}</p>
                                  {bulletin.titre && <p className="text-xs italic mt-1">{bulletin.titre}</p>}
                                </div>
                                <button 
                                  onClick={() => {
                                    setBulletinToEdit(bulletin);
                                    setIsEditingBulletin(true);
                                  }}
                                  className="self-end p-2 rounded-full hover:bg-red-50 text-black/30 hover:text-red-600 transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {adminSubTab === 'content' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold uppercase tracking-tight">Modifier "Qui sommes nous ?"</h3>
                        <div className="flex gap-1 bg-black/5 p-1 rounded-sm">
                          <button 
                            onClick={() => {
                              const textarea = document.getElementById('apropos-editor') as HTMLTextAreaElement;
                              const start = textarea.selectionStart;
                              const end = textarea.selectionEnd;
                              const text = textarea.value;
                              const newText = text.substring(0, start) + '**' + text.substring(start, end) + '**' + text.substring(end);
                              setApropos(newText);
                            }}
                            className="p-2 hover:bg-white hover:shadow-sm transition-all rounded-sm"
                            title="Gras"
                          >
                            <Bold size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              const textarea = document.getElementById('apropos-editor') as HTMLTextAreaElement;
                              const start = textarea.selectionStart;
                              const end = textarea.selectionEnd;
                              const text = textarea.value;
                              const newText = text.substring(0, start) + '*' + text.substring(start, end) + '*' + text.substring(end);
                              setApropos(newText);
                            }}
                            className="p-2 hover:bg-white hover:shadow-sm transition-all rounded-sm"
                            title="Italique"
                          >
                            <Italic size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              const url = prompt("URL de l'image :");
                              if (url) {
                                const size = prompt("Largeur (ex: 50%, 300px, auto) :", "100%");
                                const textarea = document.getElementById('apropos-editor') as HTMLTextAreaElement;
                                const start = textarea.selectionStart;
                                const text = textarea.value;
                                const imgTag = `<img src="${url}" alt="Image" style="width: ${size}; height: auto;" />`;
                                const newText = text.substring(0, start) + imgTag + text.substring(start);
                                setApropos(newText);
                              }
                            }}
                            className="p-2 hover:bg-white hover:shadow-sm transition-all rounded-sm"
                            title="Insérer une image"
                          >
                            <ImageIcon size={14} />
                          </button>
                        </div>
                      </div>
                      <textarea
                        id="apropos-editor"
                        value={apropos}
                        onChange={(e) => setApropos(e.target.value)}
                        className="w-full h-96 p-6 font-mono text-sm border-2 border-black/10 focus:border-red-600 outline-none transition-all"
                        placeholder="Contenu Markdown pour la page À Propos..."
                      />
                      <button
                        onClick={async () => {
                          try {
                            await saveContent('apropos', apropos);
                            toast.success("Contenu 'À Propos' mis à jour !");
                            refreshPublicData();
                          } catch (err: any) {
                            toast.error("Erreur lors de la mise à jour.");
                          }
                        }}
                        className="bg-black text-white px-8 py-3 font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
                      >
                        Enregistrer les modifications
                      </button>
                    </div>
                  )}

                  {adminSubTab === 'liens' && (
                    <div className="space-y-8">
                      <h3 className="text-xl font-bold uppercase tracking-tight">Gestion des Liens</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {liens.map(lien => (
                          <div key={lien.id} className="p-6 border border-black/10 flex justify-between items-start">
                            <div>
                              <h4 className="font-bold uppercase tracking-tight">{lien.nom}</h4>
                              <p className="text-xs text-black/50">{lien.url}</p>
                              <p className="text-sm mt-2">{lien.description}</p>
                            </div>
                            <button 
                              onClick={async () => {
                                try {
                                  await removeLien(lien.id);
                                  toast.success("Lien supprimé.");
                                  refreshPublicData();
                                } catch (err) {
                                  toast.error("Erreur lors de la suppression.");
                                }
                              }}
                              className="text-red-600 hover:text-red-800 p-2"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="p-8 bg-black/[0.02] border border-black/5 space-y-4">
                        <h4 className="font-bold uppercase tracking-tight">Ajouter un lien</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input id="new-lien-nom" placeholder="Nom du site" className="p-3 border border-black/10 outline-none focus:border-red-600" />
                          <input id="new-lien-url" placeholder="URL (https://...)" className="p-3 border border-black/10 outline-none focus:border-red-600" />
                        </div>
                        <textarea id="new-lien-desc" placeholder="Description courte" className="w-full p-3 border border-black/10 outline-none focus:border-red-600" />
                        <button 
                          onClick={async () => {
                            const nomInput = document.getElementById('new-lien-nom') as HTMLInputElement;
                            const urlInput = document.getElementById('new-lien-url') as HTMLInputElement;
                            const descInput = document.getElementById('new-lien-desc') as HTMLTextAreaElement;
                            
                            const nom = nomInput.value;
                            const url = urlInput.value;
                            const description = descInput.value;
                            
                            if (nom && url) {
                              try {
                                await saveLien({ nom, url, description });
                                toast.success("Lien ajouté !");
                                nomInput.value = '';
                                urlInput.value = '';
                                descInput.value = '';
                                refreshPublicData();
                              } catch (err) {
                                toast.error("Erreur lors de l'ajout.");
                              }
                            }
                          }}
                          className="bg-black text-white px-8 py-3 font-bold uppercase tracking-widest hover:bg-red-600 transition-all"
                        >
                          Ajouter ce lien
                        </button>
                      </div>
                    </div>
                  )}

                  {adminSubTab === 'index' && (
                    <div className="space-y-8">
                      <h3 className="text-xl font-bold uppercase tracking-tight">Gestion des Catégories d'Index</h3>
                      <p className="text-sm text-black/50 italic">Ces catégories apparaissent dans l'onglet "Index". L'ordre détermine leur position.</p>
                      <div className="grid grid-cols-1 gap-4">
                        {categories.map(cat => (
                          <div key={cat.id} className="p-4 border border-black/10 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <span className="bg-black text-white w-8 h-8 flex items-center justify-center font-bold text-xs">{cat.ordre}</span>
                              <span className="font-bold uppercase tracking-tight">{cat.nom}</span>
                            </div>
                            <button 
                              onClick={async () => {
                                try {
                                  await removeCategory(cat.id);
                                  toast.success("Catégorie supprimée.");
                                  refreshPublicData();
                                } catch (err) {
                                  toast.error("Erreur lors de la suppression.");
                                }
                              }}
                              className="text-red-600 hover:text-red-800 p-2"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="p-8 bg-black/[0.02] border border-black/5 space-y-4">
                        <h4 className="font-bold uppercase tracking-tight">Ajouter une catégorie</h4>
                        <div className="flex gap-4">
                          <input id="new-cat-nom" placeholder="Nom de la catégorie" className="flex-1 p-3 border border-black/10 outline-none focus:border-red-600" />
                          <input id="new-cat-ordre" type="number" placeholder="Ordre" className="w-24 p-3 border border-black/10 outline-none focus:border-red-600" />
                          <button 
                            onClick={async () => {
                              const nomInput = document.getElementById('new-cat-nom') as HTMLInputElement;
                              const ordreInput = document.getElementById('new-cat-ordre') as HTMLInputElement;
                              
                              const nom = nomInput.value;
                              const ordre = parseInt(ordreInput.value) || 0;
                              
                              if (nom) {
                                try {
                                  await saveCategory({ nom, ordre });
                                  toast.success("Catégorie ajoutée !");
                                  nomInput.value = '';
                                  ordreInput.value = '';
                                  refreshPublicData();
                                } catch (err) {
                                  toast.error("Erreur lors de l'ajout.");
                                }
                              }
                            }}
                            className="bg-black text-white px-8 py-3 font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminSubTab === 'newsletter' && (
                    <div className="space-y-8">
                      <NewsletterAdmin />
                    </div>
                  )}
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal d'édition */}
        <AnimatePresence>
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-white overflow-y-auto"
            >
              <AdminEditor 
                articleToEdit={articleToEdit}
                categories={categories}
                articles={articlesApi}
                onClose={() => {
                  setIsEditing(false);
                  setArticleToEdit(null);
                  refreshPublicData();
                }}
              />
            </motion.div>
          )}
          {isEditingBulletin && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-white overflow-y-auto"
            >
              <BulletinEditor 
                bulletinToEdit={bulletinToEdit}
                onClose={() => {
                  setIsEditingBulletin(false);
                  setBulletinToEdit(null);
                  refreshPublicData();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}
