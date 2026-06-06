import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Bulletin } from '../types';

const COLLECTION_NAME = 'bulletins';

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

export const saveBulletin = async (bulletin: Bulletin) => {
  return executeFirestore(async () => {
    const { id, ...data } = bulletin;
    
    if (id) {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, data as any);
      return id;
    } else {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
      return docRef.id;
    }
  }, OperationType.WRITE, COLLECTION_NAME);
};

export const removeBulletin = async (id: string) => {
  return executeFirestore(async () => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }, OperationType.DELETE, COLLECTION_NAME);
};

export const getBulletins = async (): Promise<Bulletin[]> => {
  return executeFirestore(async () => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('ordre', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Bulletin));
  }, OperationType.LIST, COLLECTION_NAME);
};
