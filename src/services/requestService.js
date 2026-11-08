import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, db, firebaseConfigured } from "../lib/Firebase";

const requestsCollection = "requests";
let studentSessionPromise;

export function getFirebaseErrorMessage(error) {
  if (["auth/configuration-not-found", "auth/operation-not-allowed"].includes(error?.code)) {
    return "Firebase Authentication is not enabled for this project. In Firebase Console, open Authentication → Sign-in method, enable Anonymous, and confirm this app uses the same Firebase project as Firestore.";
  }
  if (error?.code === "auth/unauthorized-domain") {
    return "This website domain is not authorized for Firebase Authentication. In Firebase Console, open Authentication → Settings → Authorized domains and add localhost.";
  }
  return error?.message || "A Firebase error occurred. Please try again.";
}

async function resolveStudentSession() {
  if (!firebaseConfigured || !auth || !db) {
    throw new Error("Requests are temporarily unavailable because Firebase is not configured. Please contact the university support team.");
  }

  const existingUser = auth.currentUser || await new Promise((resolve, reject) => {
    let unsubscribe;
    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (unsubscribe) unsubscribe();
      resolve(user);
    }, reject);
  });

  if (existingUser) return existingUser;
  return (await signInAnonymously(auth)).user;
}

function getStudentSession() {
  if (!studentSessionPromise) {
    studentSessionPromise = resolveStudentSession().catch((error) => {
      studentSessionPromise = undefined;
      throw new Error(getFirebaseErrorMessage(error));
    });
  }
  return studentSessionPromise;
}

export async function createRequest(request) {
  const user = await getStudentSession();
  const result = await addDoc(collection(db, requestsCollection), {
    ...request,
    ownerUid: user.uid,
    status: "Pending",
    createdAt: serverTimestamp(),
  });
  return result.id;
}

export async function listenToRequests(onRequests, onError) {
  const user = await getStudentSession();
  const requestsQuery = query(
    collection(db, requestsCollection),
    where("ownerUid", "==", user.uid),
  );

  return onSnapshot(requestsQuery, (snapshot) => {
    const requests = snapshot.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() }));
    requests.sort((first, second) => (
      (second.createdAt?.toMillis?.() || 0) - (first.createdAt?.toMillis?.() || 0)
    ));
    onRequests(requests);
  }, onError);
}

export async function updateRequestStatus(requestId, status) {
  if (!["Pending", "In Progress", "Completed", "Rejected"].includes(status)) {
    throw new Error("Choose a valid request status.");
  }
  await getStudentSession();
  await updateDoc(doc(db, requestsCollection, requestId), { status });
}

export async function deleteRequest(requestId) {
  await getStudentSession();
  await deleteDoc(doc(db, requestsCollection, requestId));
}