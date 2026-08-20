import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { normalizeUnit } from "./domain";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId,
);

const firebaseApp = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firestoreDb = firebaseApp ? getFirestore(firebaseApp) : null;

if (firebaseAuth) void setPersistence(firebaseAuth, browserLocalPersistence);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export type AuthorizationResult = {
  authorized: boolean;
  email: string;
  uid: string;
  role: string;
  reason?: string;
};

export const observeAuth = (callback: (user: User | null) => void) => {
  if (!firebaseAuth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth, callback);
};

export const signInWithGoogle = async () => {
  if (!firebaseAuth) throw new Error("Firebase ainda não foi configurado.");
  try {
    await signInWithPopup(firebaseAuth, googleProvider);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
      await signInWithRedirect(firebaseAuth, googleProvider);
      return;
    }
    throw error;
  }
};

export const signOutFirebase = async () => {
  if (firebaseAuth) await signOut(firebaseAuth);
};

export const verifyAuthorizedUser = async (user: User): Promise<AuthorizationResult> => {
  const email = (user.email ?? "").trim().toLowerCase();
  if (!firestoreDb || !email) return { authorized: false, email, uid: user.uid, role: "", reason: "Conta Google sem e-mail válido." };
  const snapshot = await getDoc(doc(firestoreDb, "authorizedUsers", user.uid));
  if (!snapshot.exists()) return { authorized: false, email, uid: user.uid, role: "", reason: "Este usuário ainda não foi incluído na lista autorizada." };
  const data = snapshot.data() as { email?: string; active?: boolean; role?: string };
  const authorizedEmail = (data.email ?? "").trim().toLowerCase();
  if (data.active !== true || authorizedEmail !== email) return { authorized: false, email, uid: user.uid, role: data.role ?? "", reason: "A autorização está inativa ou pertence a outro e-mail." };
  return { authorized: true, email, uid: user.uid, role: data.role ?? "operator" };
};

export const subscribeToCollection = <T extends { id: string }>(
  collectionName: string,
  fallback: T[],
  onValue: (records: T[]) => void,
  onError: (message: string) => void,
) => {
  if (!firestoreDb) {
    onValue(fallback);
    return () => undefined;
  }
  return onSnapshot(collection(firestoreDb, collectionName), (snapshot) => {
    onValue(snapshot.docs.map((record) => {
      const value = { ...record.data(), id: record.id } as Record<string, unknown> & { id: string };
      if (collectionName === "products") return { ...value, unit: normalizeUnit(value.unit) } as unknown as T;
      if (collectionName === "orders" && Array.isArray(value.items)) {
        return {
          ...value,
          items: value.items.map((item) => {
            const orderItem = item as Record<string, unknown>;
            return { ...orderItem, unit: normalizeUnit(orderItem.unit) };
          }),
        } as unknown as T;
      }
      return value as T;
    }));
  }, (error) => onError(error.message));
};

export const saveFirestoreRecord = async <T extends { id: string }>(collectionName: string, record: T) => {
  if (!firestoreDb) return;
  const currentUser = firebaseAuth?.currentUser;
  await setDoc(doc(firestoreDb, collectionName, record.id), {
    ...record,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser?.uid ?? "unknown",
  }, { merge: true });
};

export const saveFirestoreRecords = async <T extends { id: string }>(collectionName: string, records: T[]) => {
  if (!firestoreDb || !records.length) return;
  const db = firestoreDb;
  const currentUser = firebaseAuth?.currentUser;
  for (let start = 0; start < records.length; start += 450) {
    const batch = writeBatch(db);
    records.slice(start, start + 450).forEach((record) => {
      batch.set(doc(db, collectionName, record.id), {
        ...record,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid ?? "unknown",
      }, { merge: true });
    });
    await batch.commit();
  }
};

export const deleteFirestoreRecord = async (collectionName: string, id: string) => {
  if (!firestoreDb) return;
  await deleteDoc(doc(firestoreDb, collectionName, id));
};

export const seedFirestore = async (collections: Record<string, Array<{ id: string }>>) => {
  if (!firestoreDb) return;
  const db = firestoreDb;
  const batch = writeBatch(db);
  const currentUser = firebaseAuth?.currentUser;
  Object.entries(collections).forEach(([collectionName, records]) => {
    records.forEach((record) => {
      batch.set(doc(db, collectionName, record.id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid ?? "unknown",
      }, { merge: true });
    });
  });
  await batch.commit();
};

export type FirebaseUser = User;
