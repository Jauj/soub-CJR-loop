import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Subscriber, Newsletter } from '../types';
import { isAdminUser } from '../config/admins';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

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
  if (!isAdminUser(auth.currentUser)) {
    throw new Error("Accès non autorisé. Veuillez vous connecter avec un compte administrateur.");
  }
};

// --- SUBSCRIBERS ---

/**
 * Inscription publique. L'identifiant du document est l'e-mail normalisé :
 * le public ne peut que créer (pas lire ni lister, cf. firestore.rules), donc
 * une réinscription est une mise à jour refusée => traitée comme « déjà abonné ».
 */
export const subscribeNewsletter = async (email: string) => {
  const path = "subscribers";
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(normalized) || normalized.length >= 128) {
    throw new Error("Adresse e-mail invalide");
  }
  try {
    await setDoc(doc(db, path, normalized), {
      email: normalized,
      dateInscription: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    if ((error as { code?: string })?.code === 'permission-denied') {
      return { success: true, message: "Déjà abonné !" };
    }
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
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
