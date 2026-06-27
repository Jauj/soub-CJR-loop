import fs from 'fs';
import path from 'path';
import https from 'https';

const PROJECT_ID = 'cjr-soub';
const BASE_URL = 'https://cjr-soub.fr';

// Helper function to create recursive directories if not exist
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// Simple and robust regex-based Markdown to HTML parser
function parseMarkdownToHtml(markdown) {
  if (!markdown) return '';

  let html = markdown
    // Escape HTML special characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Restore blocked code blocks or special syntax
    .replace(/&lt;br\s*\/&gt;/gi, '<br />');

  // Parse Headings
  html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

  // Parse Blockquotes (lines starting with >)
  html = html.replace(/^\s*&gt;\s+(.*?)$/gm, '<blockquote>$1</blockquote>');

  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br />');

  // Parse Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Parse Unordered Lists
  html = html.replace(/^\s*[-*+]\s+(.*?)$/gm, '<li>$1</li>');
  // Simple wrapping for lists
  html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1<\/ul>');
  // Remove consecutive ul wrappers
  html = html.replace(/<\/ul>\s*<ul>/g, '\n');

  // Parse Links: [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Parse Images: ![alt](url)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:20px 0;border:1px solid #ddd;" />');

  // Clean dual newlines and process remaining paragraphs
  const lines = html.split(/\n\s*\n/);
  const paragraphLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    // Skip wrapping if it is already a block element
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<div')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\ng/, '<br />')}</p>`;
  });

  return paragraphLines.join('\n');
}

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
// NOUVEAU : Generation JSON-LD
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

// Template wrapping function containing theme HTML
// ============================================================
// CORRECTION P0 : suppression de <script type="module" src="/src/Entree.tsx">
// CORRECTION P1 : ajout du parametre jsonLd pour les donnees structurees
// ============================================================
function getHtmlWrapper(title, description, contentHtml, canonicalUrl, jsonLd = null) {
  const metaDesc = cleanMetaDescription(description || 'Socialisme ou Barbarie - Cercle de Jeunes Revolutionnaires');
  const jsonLdBlock = jsonLd
    ? `\n    <script type="application/ld+json">${jsonLd}</script>`
    : '';

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} | Socialisme ou Barbarie</title>
    <meta name="description" content="${metaDesc}" />
    <meta name="keywords" content="marxisme, trotskysme, front unique, Rosa Luxemburg, Socialisme ou Barbarie, CJR, revolution, marxisme revolutionnaire, lutte des classes, bolchevisme" />
    <meta name="robots" content="index, follow" />
    <link rel="icon" type="image/jpeg" href="/logo-cjr.jpg" />
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- Open Graph -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${title} | Socialisme ou Barbarie" />
    <meta property="og:description" content="${metaDesc}" />
    <meta property="og:image" content="https://cjr-soub.fr/logo-cjr.jpg" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${title} | Socialisme ou Barbarie" />
    <meta name="twitter:description" content="${metaDesc}" />
    <meta name="twitter:image" content="https://cjr-soub.fr/logo-cjr.jpg" />${jsonLdBlock}

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Libre+Baskerville:italic&display=swap');

      body {
        font-family: 'Inter', sans-serif;
        color: #111111;
        background-color: #fafafa;
        margin: 0;
        padding: 0;
        line-height: 1.6;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 40px 20px;
      }
      header {
        border-bottom: 2px solid #000;
        padding-bottom: 20px;
        margin-bottom: 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .brand-title {
        font-size: 20px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: -0.05em;
        text-decoration: none;
        color: #000;
      }
      .red-accent {
        color: rgba(227, 36, 33, 1);
      }
      h1 {
        font-size: 48px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: -0.03em;
        line-height: 1.05;
        margin-top: 10px;
        margin-bottom: 20px;
      }
      .date-badge {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: rgba(227, 36, 33, 1);
      }
      .chapo {
        font-family: 'Libre Baskerville', serif;
        font-style: italic;
        font-size: 20px;
        line-height: 1.6;
        color: #333333;
        border-left: 6px solid rgba(227, 36, 33, 1);
        padding-left: 24px;
        margin: 30px 0;
      }
      .article-content {
        font-size: 18px;
        line-height: 1.8;
        color: #1f1f1f;
      }
      .article-content h2, .article-content h3 {
        font-size: 28px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: -0.02em;
        margin-top: 40px;
        margin-bottom: 20px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 8px;
      }
      .article-content p {
        margin-bottom: 24px;
      }
      .article-content blockquote {
        border-left: 4px solid rgba(227, 36, 33, 1);
        padding-left: 20px;
        font-family: 'Libre Baskerville', serif;
        font-style: italic;
        font-size: 19px;
        margin: 30px 0;
        color: #555;
      }
      .article-content a {
        color: rgba(227, 36, 33, 1);
        text-decoration: underline;
        font-weight: 500;
      }
      .article-content img {
        max-width: 100%;
        height: auto;
        margin: 30px 0;
        border: 1px solid #ddd;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      }
      .indexation {
        margin-top: 40px;
        border-top: 1px solid #eee;
        padding-top: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .tag {
        background: #000;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 4px 10px;
        letter-spacing: 0.1em;
      }
      .btn-back {
        display: inline-block;
        background: #000;
        color: #fff;
        text-transform: uppercase;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        padding: 10px 20px;
        text-decoration: none;
        margin-top: 40px;
        border: 2px solid #000;
        transition: all 0.2s;
      }
      .btn-back:hover {
        background: transparent;
        color: #000;
      }
      .article-card {
        border: 2px solid #000;
        padding: 30px;
        margin-bottom: 24px;
        background: #fff;
      }
      .article-card a {
        text-decoration: none;
        color: #000;
      }
      .article-card h2 {
        font-size: 28px;
        font-weight: 900;
        text-transform: uppercase;
        margin: 10px 0;
        line-height: 1.1;
      }
      .article-card p {
        font-size: 14px;
        color: #666;
        margin-bottom: 0;
      }
    </style>
  </head>
  <body>
    <div id="root">
      <div class="container">
        <header>
          <a href="/" class="brand-title">Socialisme <span class="red-accent">ou</span> Barbarie</a>
          <a href="/publications" class="btn-back" style="margin: 0; padding: 6px 15px;">Dernieres publications</a>
        </header>

        ${contentHtml}

      </div>
    </div>
  </body>
</html>`;
}

// Function to call Firestore REST API natively
function fetchFirestoreArticles() {
  return new Promise((resolve, reject) => {
    // REST API url syntax inside default databases
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

          // Map REST response elements back to standard structures
          const articles = parsed.documents.map(doc => {
            const fields = doc.fields || {};

            // Extract indexations
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

    // Sort articles by date descending
    articles.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Ensure the output build directories exist inside dist
    const distPath = path.resolve('dist');
    if (!fs.existsSync(distPath)) {
      console.error('❌ Erreur : Dossier "dist/" absent. Veuillez lancer "vite build" en premier.');
      process.exit(1);
    }

    // ============================================================
    // 0. NOUVEAU : PRE-RENDU DES PAGES STATIQUES (/, /qui-sommes-nous, /liens)
    //    Corrige le P0-2 : duplicate content sur pages SPA vides
    //    Corrige le probleme de canonical URL incorrect sur les fallbacks
    // ============================================================

    // --- Homepage ---
    console.log('   ✍️  Generation statique de : / (homepage)');
    const latestArticles = articles.slice(0, 6);
    let homepageContent = `
      <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">Bulletin de liaison</h2>
      <h1 style="margin-bottom: 40px; font-size: 40px; font-weight: 950; text-transform: uppercase;">Socialisme <span style="color: rgba(227, 36, 33, 1);">ou</span> Barbarie</h1>
      <p style="font-family: 'Libre Baskerville', serif; font-style: italic; font-size: 20px; line-height: 1.6; color: #333; border-left: 6px solid rgba(227, 36, 33, 1); padding-left: 24px; margin: 0 0 40px 0;">
        Cercle de Jeunes Revolutionnaires combattant pour le socialisme, pour la construction d'une Organisation Revolutionnaire de la jeunesse, d'une Internationale Revolutionnaire de la Jeunesse.
      </p>
      <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 16px;">Dernieres publications</h2>
    `;
    if (latestArticles.length > 0) {
      latestArticles.forEach(article => {
        const slug = article.slug || generateSlug(article.titre);
        homepageContent += `
          <div class="article-card">
            <a href="/article/${slug}">
              <div class="date-badge">${article.dateAffichee || article.date}</div>
              <h2 style="font-weight: 900; text-transform: uppercase; font-size: 24px; margin: 8px 0;">${article.titre}</h2>
              <p>${article.extrait || ""}</p>
            </a>
          </div>
        `;
      });
      homepageContent += `<a href="/publications" class="btn-back">Voir toutes les publications</a>`;
    } else {
      homepageContent += `<p style="font-style: italic; color: #666;">Aucune publication pour le moment.</p>`;
    }

    const homepageHtml = getHtmlWrapper(
      'Socialisme ou Barbarie',
      'Bulletin de liaison du Cercle de Jeunes Revolutionnaires combattant pour le socialisme.',
      homepageContent,
      `${BASE_URL}/`,
      generateStaticPageJsonLd('Accueil', BASE_URL)
    );
    fs.writeFileSync(path.join(distPath, 'index.html'), homepageHtml, 'utf-8');

    // --- Qui sommes-nous ---
    console.log('   ✍️  Generation statique de : /qui-sommes-nous');
    const qsnContent = `
      <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">Qui sommes-nous</h2>
      <h1 style="margin-bottom: 30px;">Cercle de Jeunes Revolutionnaires</h1>
      <div class="article-content">
        <p>Le Cercle de Jeunes Revolutionnaires (CJR) est une organisation de jeunesse combattant pour le socialisme et la construction d'une Internationale Revolutionnaire de la Jeunesse.</p>
        <p>Nous publions regulierement des analyses theoriques, des bulletins de liaison et des interventions militantes sur les enjeux politiques contemporains, ancrees dans la tradition du marxisme revolutionnaire et du trotskysme.</p>
        <p>Nos travaux portent sur la lutte des classes, le front unique ouvrier, les mouvements de liberation nationale, la defense de l'environnement et la solidarite internationale.</p>
      </div>
      <a href="/publications" class="btn-back">Lire nos publications</a>
    `;
    const qsnHtml = getHtmlWrapper(
      'Qui sommes-nous',
      'Decouvrez le Cercle de Jeunes Revolutionnaires (CJR) - notre histoire, nos positions et notre combat pour le socialisme.',
      qsnContent,
      `${BASE_URL}/qui-sommes-nous`,
      generateStaticPageJsonLd('Qui sommes-nous', `${BASE_URL}/qui-sommes-nous`)
    );
    const qsnDir = path.join(distPath, 'qui-sommes-nous');
    ensureDirectoryExistence(qsnDir);
    fs.writeFileSync(path.join(qsnDir, 'index.html'), qsnHtml, 'utf-8');

    // --- Liens ---
    console.log('   ✍️  Generation statique de : /liens');
    const liensContent = `
      <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">Ressources</h2>
      <h1 style="margin-bottom: 30px;">Liens utiles</h1>
      <div class="article-content">
        <p>Retrouvez ici une selection de ressources et de liens vers des organisations, publications et outils militants en lien avec nos combats politiques.</p>
      </div>
    `;
    const liensHtml = getHtmlWrapper(
      'Liens utiles',
      'Ressources et liens vers des organisations et publications militantes en lien avec le Cercle de Jeunes Revolutionnaires.',
      liensContent,
      `${BASE_URL}/liens`,
      generateStaticPageJsonLd('Liens utiles', `${BASE_URL}/liens`)
    );
    const liensDir = path.join(distPath, 'liens');
    ensureDirectoryExistence(liensDir);
    fs.writeFileSync(path.join(liensDir, 'index.html'), liensHtml, 'utf-8');

    // ============================================================
    // 1. GENERATE STATIC INDIVIDUAL ARTICLE PAGES
    // ============================================================
    for (const article of articles) {
      const slug = article.slug || generateSlug(article.titre);
      const outputPageFile = path.join(distPath, 'article', `${slug}.html`);

      console.log(`   ✍️  Generation statique de : /article/${slug}`);

      const parsedMarkdownHTML = parseMarkdownToHtml(article.contenuComplet || '');

      let indexationHtml = '';
      if (article.indexations && article.indexations.length > 0) {
        indexationHtml = `<div class="indexation">`;
        article.indexations.forEach(idx => {
          indexationHtml += `<span class="tag">${idx.categorie} : ${idx.terme}</span>`;
        });
        indexationHtml += `</div>`;
      }

      const articleBodyHtml = `
        <article>
          <span class="date-badge">${article.dateAffichee || article.date}</span>
          <h1 style="color: #000; font-weight: 900;">${article.titre}</h1>
          ${article.extrait ? `<div class="chapo">${article.extrait}</div>` : ''}

          <div class="article-content">
            ${parsedMarkdownHTML}
          </div>

          ${indexationHtml}

          <div style="margin-top: 60px; display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
            <a href="/publications" class="btn-back" style="margin: 0;">← Toutes les publications</a>
            ${article.pdfUrl ? `<a href="${article.pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn-back" style="margin: 0; background-color: rgba(227, 36, 33, 1); border-color: rgba(227, 36, 33, 1);">Telecharger la version PDF </a>` : ''}
          </div>
        </article>
      `;

      // CORRECTION P1 : injection du JSON-LD dans le HTML statique
      const jsonLd = generateArticleJsonLd(article, slug);

      const rawHtml = getHtmlWrapper(
        article.titre,
        article.extrait || article.contenuComplet,
        articleBodyHtml,
        `${BASE_URL}/article/${slug}`,
        jsonLd
      );

      ensureDirectoryExistence(outputPageFile);
      fs.writeFileSync(outputPageFile, rawHtml, 'utf-8');
    }

    // ============================================================
    // 2. GENERATE STATIC INDEX PUBLICATIONS PAGE
    // ============================================================
    const publicationsHtmlFile = path.join(distPath, 'publications', 'index.html');
    console.log('   ✍️  Generation statique de : /publications');

    let listHtml = `
      <h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">Bulletins de liaison</h2>
      <h1 style="margin-bottom: 40px; font-size: 40px; font-weight: 950; text-transform: uppercase;">Analyses & Theses Militantes</h1>
      <div class="articles-grid">
    `;

    if (articles.length === 0) {
      listHtml += `<p style="font-style: italic; color: #666;">Aucune analyse publiee pour le moment.</p>`;
    } else {
      articles.forEach(article => {
        const slug = article.slug || generateSlug(article.titre);
        const articleUrl = `/article/${slug}`;

        listHtml += `
          <div class="article-card">
            <a href="${articleUrl}">
              <div class="date-badge">${article.dateAffichee || article.date}</div>
              <h2 style="font-weight: 900; text-transform: uppercase; font-size: 24px; margin: 8px 0;">${article.titre}</h2>
              <p>${article.extrait || ""}</p>
            </a>
          </div>
        `;
      });
    }
    listHtml += `</div>`;

    const publicationsRawHtml = getHtmlWrapper(
      "Analyses, Theses & Archives",
      "Retrouvez l'index complet de toutes nos publications, analyses theoriques et bulletins de liaison du Cercle de Jeunes Revolutionnaires.",
      listHtml,
      `${BASE_URL}/publications`,
      generateStaticPageJsonLd('Publications', `${BASE_URL}/publications`)
    );

    ensureDirectoryExistence(publicationsHtmlFile);
    fs.writeFileSync(publicationsHtmlFile, publicationsRawHtml, 'utf-8');

    // Also build a copy at /articles/index.html to satisfy fallback endpoints
    const articlesHtmlFile = path.join(distPath, 'articles', 'index.html');
    ensureDirectoryExistence(articlesHtmlFile);
    fs.writeFileSync(articlesHtmlFile, publicationsRawHtml, 'utf-8');

    // ============================================================
    // 3. GENERATE DYNAMIC SITEMAP.XML
    //    CORRECTION MINEUR N°6 : sitemap coherent (pas de /index)
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

    // Static pages
    staticRoutes.forEach(route => {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${route.path}</loc>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Dynamic articles
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