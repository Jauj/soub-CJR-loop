import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Subscriber, Newsletter } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const ADMIN_EMAILS = ["ferrierjonas@gmail.com", "cjr.soub@gmail.com", "admin@cjr.fr"];

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
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

const checkAdmin = () => {
  const user = auth.currentUser;
  if (!user || !user.email || (user.email !== "admin@cjr.fr" && !user.emailVerified) || !ADMIN_EMAILS.includes(user.email)) {
    throw new Error("Accès non autorisé. Veuillez vous connecter avec un compte administrateur.");
  }
};

// --- SUBSCRIBERS ---

export const subscribeNewsletter = async (email: string) => {
  const path = "subscribers";
  return executeFirestore(async () => {
    // Tenter de vérifier si déjà abonné (risqué si permissions strictes)
    try {
      const q = query(collection(db, path), where("email", "==", email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { success: true, message: "Déjà abonné !" };
      }
    } catch (e) {
      // On ignore l'erreur de permission pour le check car public n'a pas le droit de LIST
      // On procède directement à l'ajout.
    }

    await addDoc(collection(db, path), {
      email,
      dateInscription: new Date().toISOString()
    });
    return { success: true };
  }, OperationType.WRITE, path);
};

export const fetchSubscribers = async (): Promise<Subscriber[]> => {
  const path = "subscribers";
  checkAdmin();
  return executeFirestore(async () => {
    const q = query(collection(db, path), orderBy("dateInscription", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Subscriber));
  }, OperationType.LIST, path);
};

export const removeSubscriber = async (id: string) => {
  const path = "subscribers";
  checkAdmin();
  return executeFirestore(async () => {
    await deleteDoc(doc(db, path, id));
  }, OperationType.DELETE, path);
};

// --- NEWSLETTERS (BULLETINS) ---

export const fetchNewsletters = async (): Promise<Newsletter[]> => {
  const path = "newsletters";
  checkAdmin();
  return executeFirestore(async () => {
    const q = query(collection(db, path), orderBy("dateCreation", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Newsletter));
  }, OperationType.LIST, path);
};

export const saveNewsletter = async (newsletter: Omit<Newsletter, 'id'> & { id?: string }) => {
  const path = "newsletters";
  checkAdmin();
  return executeFirestore(async () => {
    const { id, ...data } = newsletter;

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

export const removeNewsletter = async (id: string) => {
  const path = "newsletters";
  checkAdmin();
  return executeFirestore(async () => {
    await deleteDoc(doc(db, path, id));
  }, OperationType.DELETE, path);
};
