import fs from 'fs';
import path from 'path';
import https from 'https';

const PROJECT_ID = 'cjr-soub';
const BASE_URL = 'https://cjr-soub.fr';

// Helper to clean markdown out of strings for meta descriptions
function cleanMetaDescription(text) {
  if (!text) return '';
  return text
    .replace(/[#*`_\[\]()]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160);
}

// Generate standard slug matching the frontend's generateSlug function
function generateSlug(titre) {
  if (!titre) return 'article';
  return titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 60);
}

// ============================================================
// Generation JSON-LD
// ============================================================

function generateArticleJsonLd(article, slug) {
  const imgMatch = (article.contenuComplet || '').match(/!\[.*?\]\((.*?)\)/);
  const imageUrl = imgMatch ? imgMatch[1] : `${BASE_URL}/logo-cjr.jpg`;
  const keywords = ["marxisme", "trotskysme", "front unique", "Rosa Luxemburg", "revolution", "critique sociale", "bolchevisme", "mouvement ouvrier"];
  const articleKeywords = article.indexations ? article.indexations.map(i => i.terme).filter(Boolean) : [];
  const allKeywords = [...keywords, ...articleKeywords].join(", ");

  return JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": article.titre,
      "description": article.extrait || '',
      "image": [imageUrl],
      "datePublished": article.date,
      "keywords": allKeywords,
      "author": {
        "@type": "Organization",
        "name": "Socialisme ou Barbarie",
        "url": BASE_URL,
        "logo": `${BASE_URL}/logo-cjr.jpg`
      },
      "publisher": {
        "@type": "Organization",
        "name": "Socialisme ou Barbarie",
        "logo": {
          "@type": "ImageObject",
          "url": `${BASE_URL}/logo-cjr.jpg`
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${BASE_URL}/article/${slug}`
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Accueil",
          "item": BASE_URL
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Publications",
          "item": `${BASE_URL}/publications`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": article.titre,
          "item": `${BASE_URL}/article/${slug}`
        }
      ]
    }
  ]);
}

function generateStaticPageJsonLd(pageName, pageUrl) {
  const items = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Accueil",
      "item": BASE_URL
    }
  ];
  if (pageName !== 'Accueil') {
    items.push({
      "@type": "ListItem",
      "position": 2,
      "name": pageName,
      "item": pageUrl
    });
  }

  return JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Socialisme ou Barbarie",
      "url": BASE_URL,
      "description": "Portail d'etudes et de combat du Cercle de Jeunes Revolutionnaires (CJR). Analyses approfondies sur le trotskysme, le front unique, le marxisme revolutionnaire et l'histoire de Socialisme ou Barbarie.",
      "publisher": {
        "@type": "Organization",
        "name": "Socialisme ou Barbarie",
        "logo": `${BASE_URL}/logo-cjr.jpg`
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items
    }
  ]);
}

// ============================================================
// APPROCHE ROBUSTE : Modification chirurgicale du <head> UNIQUEMENT.
//
// PRINCIPE : On NE RECONSTRUIT JAMAIS le HTML à partir de zéro.
// On copie le shell Vite (dist/index.html) TEL QUEL et on ne modifie
// que les méta-tags par des remplacements string ciblés dans le <head>.
//
// GARANTIES :
// - Le <body> reste 100% identique (skeleton, #root, __hideSkeleton)
// - Les assets Vite (JS, CSS, modulepreload) restent à leur place exacte
// - Le JS principal reste dans <head> comme Vite l'a placé
// - React se charge de manière identique au shell original
// - L'UI est VISUELLEMENT IDENTIQUE au shell Vite original
// ============================================================

function loadViteShell() {
  const shellPath = path.join(process.cwd(), 'dist', 'index.html');
  return fs.readFileSync(shellPath, 'utf-8');
}

function buildSeoPage(title, description, canonicalUrl, jsonLd = null, viteShell, ogType = 'website') {
  const metaDesc = cleanMetaDescription(description || 'Socialisme ou Barbarie - Cercle de Jeunes Revolutionnaires');
  // Eviter de dupliquer le nom du site si le titre est deja "Socialisme ou Barbarie"
  const fullTitle = title === 'Socialisme ou Barbarie'
    ? title
    : `${title} | Socialisme ou Barbarie`;

  // Partir du shell Vite INTACT — zéro reconstruction
  let html = viteShell;

  // 1. Remplacer <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${fullTitle}</title>`);

  // 2. Remplacer <meta name="description" ...>
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${metaDesc}" />`
  );

  // 3. Remplacer <link rel="canonical" ...>
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // 4. Supprimer TOUS les OG tags existants (mais PAS les autres meta)
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '');
  html = html.replace(/<!--\s*Open\s*Graph[^>]*>\s*/gi, '');

  // 5. Supprimer TOUS les Twitter tags existants
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '');
  html = html.replace(/<!--\s*Twitter[^>]*>\s*/gi, '');

  // 6. Injecter les nouveaux blocs OG + Twitter + JSON-LD avant </head>
  const newHeadBlocks = `    <!-- Open Graph -->
    <meta property="og:type" content="${ogType}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${fullTitle}">
    <meta property="og:description" content="${metaDesc}">
    <meta property="og:image" content="https://cjr-soub.fr/logo-cjr.jpg">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${canonicalUrl}">
    <meta name="twitter:title" content="${fullTitle}">
    <meta name="twitter:description" content="${metaDesc}">
    <meta name="twitter:image" content="https://cjr-soub.fr/logo-cjr.jpg">${jsonLd ? `\n    <script type="application/ld+json">${jsonLd}</script>` : ''}
`;

  html = html.replace('</head>', newHeadBlocks + '  </head>');

  return html;
}

// Function to call Firestore REST API natively
function fetchFirestoreArticles() {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/articles`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'Error fetching articles'));
            return;
          }

          if (!parsed.documents) {
            resolve([]);
            return;
          }

          const articles = parsed.documents.map(doc => {
            const fields = doc.fields || {};

            let indexations = [];
            if (fields.indexations && fields.indexations.arrayValue && fields.indexations.arrayValue.values) {
              indexations = fields.indexations.arrayValue.values.map(val => {
                const mapFields = val.mapValue ? val.mapValue.fields || {} : {};
                return {
                  categorie: mapFields.categorie ? mapFields.categorie.stringValue : '',
                  terme: mapFields.terme ? mapFields.terme.stringValue : ''
                };
              });
            }

            return {
              id: doc.name.split('/').pop(),
              titre: fields.titre ? fields.titre.stringValue : '',
              slug: fields.slug ? fields.slug.stringValue : '',
              date: fields.date ? fields.date.stringValue : '',
              dateAffichee: fields.dateAffichee ? fields.dateAffichee.stringValue : '',
              extrait: fields.extrait ? fields.extrait.stringValue : '',
              contenuComplet: fields.contenuComplet ? fields.contenuComplet.stringValue : '',
              pdfUrl: fields.pdfUrl ? fields.pdfUrl.stringValue : '',
              indexations: indexations
            };
          });

          resolve(articles);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Main compiler runner
async function buildSEO() {
  console.log('🚀 Demarrage de la generation statique SEO...');

  try {
    const articles = await fetchFirestoreArticles();
    console.log(`📚 Article(s) recupere(s) : ${articles.length}`);

    articles.sort((a, b) => new Date(b.date) - new Date(a.date));

    const distPath = path.resolve('dist');
    if (!fs.existsSync(distPath)) {
      console.error('❌ Erreur : Dossier "dist/" absent. Veuillez lancer "vite build" en premier.');
      process.exit(1);
    }

    // Charger le shell Vite UNE SEULE FOIS
    const viteShell = loadViteShell();

    // ============================================================
    // 1. HOMEPAGE — /
    // ============================================================
    console.log('   ✍️  Generation statique de : / (homepage)');
    const homepageHtml = buildSeoPage(
      'Socialisme ou Barbarie',
      'Bulletin de liaison du Cercle de Jeunes Revolutionnaires combattant pour le socialisme.',
      `${BASE_URL}/`,
      generateStaticPageJsonLd('Accueil', BASE_URL),
      viteShell,
      'website'
    );
    fs.writeFileSync(path.join(distPath, 'index.html'), homepageHtml, 'utf-8');

    // ============================================================
    // 2. QUI SOMMES-NOUS — /qui-sommes-nous
    // ============================================================
    console.log('   ✍️  Generation statique de : /qui-sommes-nous');
    const qsnHtml = buildSeoPage(
      'Qui sommes-nous',
      'Decouvrez le Cercle de Jeunes Revolutionnaires (CJR) - notre histoire, nos positions et notre combat pour le socialisme.',
      `${BASE_URL}/qui-sommes-nous`,
      generateStaticPageJsonLd('Qui sommes-nous', `${BASE_URL}/qui-sommes-nous`),
      viteShell,
      'website'
    );
    const qsnDir = path.join(distPath, 'qui-sommes-nous');
    fs.mkdirSync(qsnDir, { recursive: true });
    fs.writeFileSync(path.join(qsnDir, 'index.html'), qsnHtml, 'utf-8');

    // ============================================================
    // 3. LIENS — /liens
    // ============================================================
    console.log('   ✍️  Generation statique de : /liens');
    const liensHtml = buildSeoPage(
      'Liens utiles',
      'Ressources et liens vers des organisations et publications militantes en lien avec le Cercle de Jeunes Revolutionnaires.',
      `${BASE_URL}/liens`,
      generateStaticPageJsonLd('Liens utiles', `${BASE_URL}/liens`),
      viteShell,
      'website'
    );
    const liensDir = path.join(distPath, 'liens');
    fs.mkdirSync(liensDir, { recursive: true });
    fs.writeFileSync(path.join(liensDir, 'index.html'), liensHtml, 'utf-8');

    // ============================================================
    // 4. PAGES ARTICLES INDIVIDUELLES — /article/{slug}
    // ============================================================
    for (const article of articles) {
      const slug = article.slug || generateSlug(article.titre);
      const outputPageFile = path.join(distPath, 'article', `${slug}.html`);

      console.log(`   ✍️  Generation statique de : /article/${slug}`);

      const jsonLd = generateArticleJsonLd(article, slug);

      const rawHtml = buildSeoPage(
        article.titre,
        article.extrait || article.contenuComplet,
        `${BASE_URL}/article/${slug}`,
        jsonLd,
        viteShell,
        'article'
      );

      fs.mkdirSync(path.dirname(outputPageFile), { recursive: true });
      fs.writeFileSync(outputPageFile, rawHtml, 'utf-8');
    }

    // ============================================================
    // 5. PUBLICATIONS — /publications
    // ============================================================
    const publicationsHtmlFile = path.join(distPath, 'publications', 'index.html');
    console.log('   ✍️  Generation statique de : /publications');

    const publicationsRawHtml = buildSeoPage(
      "Analyses, Theses & Archives",
      "Retrouvez l'index complet de toutes nos publications, analyses theoriques et bulletins de liaison du Cercle de Jeunes Revolutionnaires.",
      `${BASE_URL}/publications`,
      generateStaticPageJsonLd('Publications', `${BASE_URL}/publications`),
      viteShell,
      'website'
    );

    fs.mkdirSync(path.dirname(publicationsHtmlFile), { recursive: true });
    fs.writeFileSync(publicationsHtmlFile, publicationsRawHtml, 'utf-8');

    // Copie à /articles/ pour compatibilité
    const articlesHtmlFile = path.join(distPath, 'articles', 'index.html');
    fs.mkdirSync(path.dirname(articlesHtmlFile), { recursive: true });
    fs.writeFileSync(articlesHtmlFile, publicationsRawHtml, 'utf-8');

    // ============================================================
    // 6. SITEMAP.XML dynamique
    // ============================================================
    const sitemapFile = path.join(distPath, 'sitemap.xml');
    console.log('   ✍️  Generation statique de : /sitemap.xml');

    const staticRoutes = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/publications', priority: '0.9', changefreq: 'daily' },
      { path: '/liens', priority: '0.6', changefreq: 'weekly' },
      { path: '/qui-sommes-nous', priority: '0.7', changefreq: 'monthly' }
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    staticRoutes.forEach(route => {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${route.path}</loc>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    articles.forEach(article => {
      const slug = article.slug || generateSlug(article.titre);
      const articleUrl = `${BASE_URL}/article/${slug}`;

      let lastMod = new Date().toISOString().split('T')[0];
      if (article.date) {
        try {
          const parsedDate = new Date(article.date);
          if (!isNaN(parsedDate.getTime())) {
            lastMod = parsedDate.toISOString().split('T')[0];
          }
        } catch (_) {}
      }

      xml += `  <url>\n`;
      xml += `    <loc>${articleUrl}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>\n`;

    fs.writeFileSync(sitemapFile, xml, 'utf-8');

    console.log('✅ Generation statique SEO terminee avec succes !');

  } catch (error) {
    console.error('❌ Une erreur est survenue lors du pre-rendu SEO :', error);
    process.exit(1);
  }
}

buildSEO();