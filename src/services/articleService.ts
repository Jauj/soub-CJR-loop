import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  query, 
  orderBy,
  where,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Article, LienRessource } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Wrapper standard pour les opérations Firestore
 */
async function executeFirestore<T>(
  operation: () => Promise<T>,
  operationType: OperationType,
  path: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleFirestoreError(error, operationType, path);
    throw error;
  }
}

const ADMIN_EMAILS = ["ferrierjonas@gmail.com", "cjr.soub@gmail.com", "admin@cjr.fr"];

/**
 * Génère un slug SEO-friendly à partir d'un titre.
 */
export const generateSlug = (titre: string): string => {
  return titre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^a-z0-9\s-]/g, "") // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, "-") // Remplace les espaces par des tirets
    .replace(/-+/g, "-") // Évite les tirets multiples
    .substring(0, 60); // Limite la longueur pour le SEO
};

const checkAuth = () => {
  const user = auth.currentUser;
  if (!user || !user.email || (user.email !== "admin@cjr.fr" && !user.emailVerified) || !ADMIN_EMAILS.includes(user.email)) {
    throw new Error("Accès non autorisé. Veuillez vous connecter avec un compte administrateur.");
  }
};

export const getArticles = async (): Promise<Article[]> => {
  const path = "articles";
  return executeFirestore(async () => {
    const q = query(collection(db, path), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Article));
  }, OperationType.LIST, path);
};

export const saveArticle = async (article: Omit<Article, 'id'> & { id?: string }) => {
  const path = "articles";
  checkAuth();
  return executeFirestore(async () => {
    const { id, ...data } = article;
    
    if (!data.slug) {
      data.slug = generateSlug(data.titre);
    }

    if (id) {
      const docRef = doc(db, path, id);
      await updateDoc(docRef, data);
      return { id, ...data };
    } else {
      const docRef = await addDoc(collection(db, path), data);
      return { id: docRef.id, ...data };
    }
  }, OperationType.WRITE, path);
};

export const removeArticle = async (id: string) => {
  const path = "articles";
  checkAuth();
  return executeFirestore(async () => {
    await deleteDoc(doc(db, path, id));
  }, OperationType.DELETE, path);
};

export const getContent = async (id: string): Promise<string> => {
  const path = `content/${id}`;
  return executeFirestore(async () => {
    const docRef = doc(db, "content", id);
    const snapshot = await getDocs(query(collection(db, "content"), where("__name__", "==", id)));
    // Better use getDoc for single doc
    const snap = await (import('firebase/firestore').then(f => f.getDoc(docRef)));
    if (snap.exists()) {
      return snap.data().content;
    }
    return "";
  }, OperationType.GET, path);
};

export const saveContent = async (id: string, text: string) => {
  const path = `content/${id}`;
  checkAuth();
  return executeFirestore(async () => {
    const docRef = doc(db, "content", id);
    await setDoc(docRef, { content: text });
  }, OperationType.WRITE, path);
};

export const getLiens = async (): Promise<LienRessource[]> => {
  const path = "liens";
  return executeFirestore(async () => {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LienRessource));
  }, OperationType.LIST, path);
};

export const saveLien = async (lien: Omit<LienRessource, 'id'> & { id?: string }) => {
  const path = "liens";
  checkAuth();
  return executeFirestore(async () => {
    const { id, ...data } = lien;
    if (id) {
      const docRef = doc(db, path, id);
      await updateDoc(docRef, data);
      return { id, ...data };
    } else {
      const docRef = await addDoc(collection(db, path), data);
      return { id: docRef.id, ...data };
    }
  }, OperationType.WRITE, path);
};

export const removeLien = async (id: string) => {
  const path = "liens";
  checkAuth();
  return executeFirestore(async () => {
    await deleteDoc(doc(db, path, id));
  }, OperationType.DELETE, path);
};

export const getCategories = async (): Promise<{ id: string, nom: string, ordre: number }[]> => {
  const path = "categories";
  return executeFirestore(async () => {
    const q = query(collection(db, path), orderBy("ordre", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any));
  }, OperationType.LIST, path);
};

export const saveCategory = async (category: { id?: string, nom: string, ordre: number }) => {
  const path = "categories";
  checkAuth();
  return executeFirestore(async () => {
    const { id, ...data } = category;
    if (id) {
      const docRef = doc(db, path, id);
      await updateDoc(docRef, data);
      return { id, ...data };
    } else {
      const docRef = await addDoc(collection(db, path), data);
      return { id: docRef.id, ...data };
    }
  }, OperationType.WRITE, path);
};

export const removeCategory = async (id: string) => {
  const path = "categories";
  checkAuth();
  return executeFirestore(async () => {
    await deleteDoc(doc(db, path, id));
  }, OperationType.DELETE, path);
};
