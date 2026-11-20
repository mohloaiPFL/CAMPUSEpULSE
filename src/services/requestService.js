import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db, firebaseConfigured } from "../lib/Firebase";
import {
  ID_REPLACEMENT_DEMO_FEE_MALOTI,
  ID_REPLACEMENT_DEMO_PAYMENT_STATUS,
  ID_REPLACEMENT_PAYMENT_METHODS,
} from "../Data/Payments";
import { validateCourse } from "./registrationValidation";

const requestsCollection = "requests";
const activityCollection = "activityLogs";

export function getFirebaseErrorMessage(error) {
  if (["auth/configuration-not-found", "auth/operation-not-allowed"].includes(error?.code)) {
    return "Google sign-in is not enabled for this Firebase project. In Firebase Console, open Authentication → Sign-in method and enable Google.";
  }
  if (error?.code === "auth/unauthorized-domain") {
    return "This website address is not authorized for Firebase Authentication. In Firebase Console, open Authentication → Settings → Authorized domains and add the domain used to open this site.";
  }
  if (["unavailable", "deadline-exceeded", "auth/network-request-failed"].includes(error?.code)) {
    return "The request could not reach the service. Check your internet connection, switch between Wi-Fi and mobile data, then send it again. Your form details are still here.";
  }
  if (error?.code === "permission-denied") {
    return "Firebase blocked this request. Publish the current firestore.rules file, including activityLogs access, then try again or contact university support.";
  }
  return error?.message || "A Firebase error occurred. Please try again.";
}

function requireFirebase() {
  if (!firebaseConfigured || !auth || !db) {
    throw new Error("Requests are unavailable because Firebase is not configured. Add the Firebase web app settings to .env.local and restart the app.");
  }
  if (!auth.currentUser) {
    throw new Error("Sign in with your approved Google account before continuing.");
  }
  return auth.currentUser;
}

async function getApprovedRegistration(user) {
  const registrationSnapshot = await getDoc(doc(db, "registrations", user.uid));
  const registration = registrationSnapshot.exists() ? registrationSnapshot.data() : null;
  if (registration?.status !== "Approved") {
    throw new Error("Your student registration must be approved before you can submit or view requests.");
  }
  return registration;
}

export async function createRequest(request) {
  const user = requireFirebase();
  const registration = await getApprovedRegistration(user);
  const isIdReplacement = request.serviceId === "student-id";
  const isTranscript = request.serviceId === "transcript";
  const courseError = validateCourse(request.course);
  if (isTranscript && courseError) {
    throw new Error(courseError);
  }
  if (!isTranscript && request.course !== undefined) {
    throw new Error("Course details can only be included with an academic transcript request.");
  }
  if (
    isIdReplacement
    && (
      !ID_REPLACEMENT_PAYMENT_METHODS.includes(request.paymentMethod)
      || request.paymentAmount !== ID_REPLACEMENT_DEMO_FEE_MALOTI
    )
  ) {
    throw new Error("Choose a valid demo payment method for the student ID replacement request.");
  }
  if (!isIdReplacement && (request.paymentMethod || request.paymentAmount !== undefined)) {
    throw new Error("Payment details can only be included with a student ID replacement request.");
  }

  const requestRef = doc(collection(db, requestsCollection));
  const activityRef = doc(collection(db, activityCollection));
  const batch = writeBatch(db);
  batch.set(requestRef, {
    ...request,
    ...(isTranscript ? { course: request.course.trim() } : {}),
    studentName: registration.displayName,
    studentId: registration.studentId,
    email: user.email,
    ownerUid: user.uid,
    status: "Pending",
    createdAt: serverTimestamp(),
    ...(isIdReplacement ? { paymentStatus: ID_REPLACEMENT_DEMO_PAYMENT_STATUS } : {}),
  });
  batch.set(activityRef, {
    activityType: "request-submitted",
    actorEmail: user.email,
    actorUid: user.uid,
    createdAt: serverTimestamp(),
    newStatus: "Pending",
    ownerUid: user.uid,
    previousStatus: null,
    recordLabel: request.serviceName,
    targetId: requestRef.id,
    targetType: "request",
  });
  await batch.commit();
  return requestRef.id;
}

export async function listenToRequests(onRequests, onError) {
  const user = requireFirebase();
  await getApprovedRegistration(user);
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

export async function listenToStudentActivity(onActivities, onError) {
  const user = requireFirebase();
  await getApprovedRegistration(user);
  const activityQuery = query(
    collection(db, activityCollection),
    where("ownerUid", "==", user.uid),
  );
  return onSnapshot(activityQuery, (snapshot) => {
    const activities = snapshot.docs.map((activity) => ({ id: activity.id, ...activity.data() }));
    activities.sort((first, second) => (
      (second.createdAt?.toMillis?.() || 0) - (first.createdAt?.toMillis?.() || 0)
    ));
    onActivities(activities);
  }, onError);
}

export function listenToAdminActivity(onActivities, onError) {
  const user = requireFirebase();
  if (user.email?.trim().toLowerCase() !== "mohloaiqamo@gmail.com") {
    throw new Error("Only the approved administrator can view the decision history.");
  }
  const activityQuery = query(
    collection(db, activityCollection),
    orderBy("createdAt", "desc"),
    limit(100),
  );
  return onSnapshot(activityQuery, (snapshot) => {
    const activities = snapshot.docs.map((activity) => ({ id: activity.id, ...activity.data() }));
    onActivities(activities);
  }, onError);
}

export async function updateRequestStatus(requestId, status) {
  if (!["Pending", "Approved", "In Progress", "Completed", "Rejected"].includes(status)) {
    throw new Error("Choose a valid request status.");
  }
  const user = requireFirebase();
  const requestRef = doc(db, requestsCollection, requestId);
  const activityRef = doc(collection(db, activityCollection));
  await runTransaction(db, async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) {
      throw new Error("This request no longer exists.");
    }
    const request = requestSnapshot.data();
    if (request.status === status) {
      throw new Error("This request already has that status.");
    }

    transaction.update(requestRef, { status });
    transaction.set(activityRef, {
      activityType: "request-status-changed",
      actorEmail: user.email,
      actorUid: user.uid,
      createdAt: serverTimestamp(),
      newStatus: status,
      ownerUid: request.ownerUid,
      previousStatus: request.status,
      recordLabel: request.serviceName,
      targetId: requestId,
      targetType: "request",
    });
  });
}

export async function deleteRequest(requestId) {
  requireFirebase();
  await deleteDoc(doc(db, requestsCollection, requestId));
}