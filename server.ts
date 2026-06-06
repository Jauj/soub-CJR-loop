import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for server-side meta injection
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function getArticleMeta(slug: string) {
  try {
    const q = query(collection(db, "articles"), where("slug", "==", slug));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const article = querySnapshot.docs[0].data();
      return {
        titre: article.titre,
        description: article.extrait,
        image: article.indexations?.[0]?.terme ? `https://cjr-soub.fr/logo-cjr.jpg` : `https://cjr-soub.fr/logo-cjr.jpg`
      };
    }
  } catch (e) {
    console.error("Error fetching article meta for server injection:", e);
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware Vite en développement
  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  // Route générique pour gérer le SEO "Multi-Page"
  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // On n'intercepte que les requêtes HTML
    if (url.includes(".") && !url.endsWith(".html")) {
      return next();
    }

    try {
      let template;
      if (process.env.NODE_ENV !== "production") {
        template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
      } else {
        template = fs.readFileSync(path.resolve(__dirname, "dist/index.html"), "utf-8");
      }

      let title = "Socialisme ou Barbarie";
      let description = "Bulletin de liaison du Cercle de Jeunes Révolutionnaires combattant pour le socialisme.";
      let articleMeta = null;

      // Injection dynamique pour les articles
      if (url.startsWith("/article/")) {
        const slug = url.split("/").pop();
        if (slug) {
          articleMeta = await getArticleMeta(slug);
          if (articleMeta) {
            title = `${articleMeta.titre} | Socialisme ou Barbarie`;
            description = articleMeta.description;
          }
        }
      } else if (url === "/publications") {
        title = "Analyses & Thèses | Socialisme ou Barbarie";
      }

      // Remplacement chirurgical des balises pour les robots SEO
      let html = template
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}" />`)
        .replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${title}" />`)
        .replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${description}" />`)
        .replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${title}" />`)
        .replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${description}" />`);

      // Ajout de la balise canonique dynamique
      const canonical = `https://cjr-soub.fr${url}`;
      html = html.replace(/<link rel="canonical" href=".*?"\s*\/?>/, `<link rel="canonical" href="${canonical}" />`);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
