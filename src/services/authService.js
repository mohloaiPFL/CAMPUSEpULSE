import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db, firebaseConfigured, firebaseProjectId } from "../lib/Firebase";
import { validateRegistrationDetails } from "./registrationValidation";

export const ADMIN_EMAIL = "mohloaiqamo@gmail.com";
export const ADMIN_PASSWORD = "@63485293krm?";
export const STUDENT_FACULTIES = [
  "Faculty of Design and Innovation",
  "Faculty of Information Communication Technology",
  "Faculty of Communication, Media & Broadcasting",
  "Faculty of Business Management and Globalization",
  "Faculty of Creativity in Tourism and Hospitality",
  "Faculty of Architecture and Built Environment",
];
export const STUDENT_LEVELS = ["Diploma", "Degree", "TVET"];
export const SPONSOR_OPTIONS = ["Self-sponsored", "NMDS", "Other"];

export function isConfiguredAdminEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL;
}

export function verifyAdminPassword(password) {
  return String(password ?? "") === ADMIN_PASSWORD;
}

export function verifyStudentRemovalPassword(password) {
  const expectedPassword = process.env.REACT_APP_STUDENT_REMOVAL_PASSWORD || "";
  return Boolean(expectedPassword) && String(password ?? "") === expectedPassword;
}

function requireFirebase() {
  if (!firebaseConfigured || !auth || !db) {
    throw new Error("Firebase is not configured. Add the Firebase web app settings to .env.local and restart the app.");
  }
}

function requireUser() {
  requireFirebase();
  if (!auth.currentUser) {
    throw new Error("Sign in with Google before continuing.");
  }
  return auth.currentUser;
}

export function getAuthErrorMessage(error) {
  if (error?.code === "permission-denied") {
    return `Firestore denied saving or reading your student registration in project "${firebaseProjectId}". In Firebase Console, select this exact project, open Firestore Database → Rules, and publish the current firestore.rules. Confirm the rules allow a verified Google user to create or update and read registrations/{their own UID}, then retry.`;
  }
  if (["auth/configuration-not-found", "auth/operation-not-allowed"].includes(error?.code)) {
    return "Google sign-in is not enabled for this Firebase project. In Firebase Console, open Authentication → Sign-in method and enable Google.";
  }
  if (error?.code === "auth/unauthorized-domain") {
    return "This website address is not authorized for Firebase Authentication. Add the domain in Firebase Console → Authentication → Settings → Authorized domains.";
  }
  if (["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(error?.code)) {
    return "Google sign-in was interrupted. Allow pop-ups for this site and try again.";
  }
  if (["unavailable", "deadline-exceeded", "auth/network-request-failed"].includes(error?.code)) {
    return "Campus Pulse could not reach Firebase. Check your internet connection and try again.";
  }
  return error?.message || "Google sign-in failed. Please try again.";
}

export function subscribeToAuthState(onUser, onError) {
  requireFirebase();
  return onAuthStateChanged(auth, onUser, onError);
}

export async function signInWithGoogle() {
  requireFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export async function signOutUser() {
  requireFirebase();
  await signOut(auth);
}

export async function getAccessProfile(user) {
  requireFirebase();
  if (!user) {
    return { isAdmin: false, registration: null };
  }

  if (isConfiguredAdminEmail(user.email)) {
    return { isAdmin: true, registration: null };
  }

  const registrationSnapshot = await getDoc(doc(db, "registrations", user.uid));
  return {
    isAdmin: false,
    registration: registrationSnapshot.exists() ? registrationSnapshot.data() : null,
  };
}

export function listenToStudentRegistration(studentUid, onRegistration, onError) {
  const user = requireUser();
  if (user.uid !== studentUid) {
    throw new Error("You can only monitor your own student registration.");
  }
  return onSnapshot(
    doc(db, "registrations", studentUid),
    (registrationSnapshot) => {
      onRegistration(registrationSnapshot.exists() ? registrationSnapshot.data() : null);
    },
    onError,
  );
}

export async function submitRegistration(details) {
  const user = requireUser();
  if (!user.email || !user.emailVerified || user.providerData.every((provider) => provider.providerId !== "google.com")) {
    throw new Error("Use a verified Google account to register for the student portal.");
  }
  const validationErrors = validateRegistrationDetails(details);
  if (Object.keys(validationErrors).length) {
    throw new Error(Object.values(validationErrors)[0]);
  }

  const registration = {
    firstName: details.firstName.trim(),
    surname: details.surname.trim(),
    faculty: details.faculty,
    course: details.course.trim(),
    level: details.level,
    sponsorship: details.sponsorship,
    gender: details.gender,
    phoneNumber: details.phoneNumber.trim(),
    address: details.address.trim(),
    kinName: details.kinName.trim(),
    kinRelationship: details.kinRelationship.trim(),
    kinPhoneNumber: details.kinPhoneNumber.trim(),
  };
  if (details.sponsorship === "Other") {
    registration.sponsorDetails = details.sponsorDetails.trim();
  }
  if (details.gender === "Female") {
    registration.residence = details.residence;
  }
  await setDoc(doc(db, "registrations", user.uid), {
    ...registration,
    displayName: `${registration.firstName} ${registration.surname}`,
    email: user.email,
    status: "Pending",
    createdAt: serverTimestamp(),
  });
}

export function listenToAdminQueue(onRegistrations, onRequests, onError) {
  requireFirebase();
  const registrationsUnsubscribe = onSnapshot(
    collection(db, "registrations"),
    (snapshot) => {
      const registrations = snapshot.docs.map((registration) => ({
        id: registration.id,
        ...registration.data(),
      }));
      registrations.sort((first, second) => (
        (second.createdAt?.toMillis?.() || 0) - (first.createdAt?.toMillis?.() || 0)
      ));
      onRegistrations(registrations);
    },
    onError,
  );
  const requestsUnsubscribe = onSnapshot(
    collection(db, "requests"),
    (snapshot) => {
      const requests = snapshot.docs.map((request) => ({ id: request.id, ...request.data() }));
      requests.sort((first, second) => (
        (second.createdAt?.toMillis?.() || 0) - (first.createdAt?.toMillis?.() || 0)
      ));
      onRequests(requests);
    },
    onError,
  );
  return () => {
    registrationsUnsubscribe();
    requestsUnsubscribe();
  };
}

export async function updateRegistrationStatus(registrationId, status) {
  if (!["Approved", "Rejected"].includes(status)) {
    throw new Error("Choose a valid registration decision.");
  }
  const admin = requireUser();
  if (!isConfiguredAdminEmail(admin.email)) {
    throw new Error("This Google account is not authorized to review registrations.");
  }

  const registrationRef = doc(db, "registrations", registrationId);
  const activityRef = doc(collection(db, "activityLogs"));
  await runTransaction(db, async (transaction) => {
    const registrationSnapshot = await transaction.get(registrationRef);
    if (!registrationSnapshot.exists()) {
      throw new Error("This student registration no longer exists.");
    }
    const registration = registrationSnapshot.data();
    if (registration.status !== "Pending") {
      throw new Error("This student registration has already been reviewed.");
    }

    if (status === "Rejected") {
      transaction.update(registrationRef, { status });
      transaction.set(activityRef, {
        activityType: "registration-status-changed",
        actorEmail: admin.email,
        actorUid: admin.uid,
        createdAt: serverTimestamp(),
        newStatus: status,
        ownerUid: registrationId,
        previousStatus: registration.status,
        recordLabel: registration.displayName || registration.email,
        targetId: registrationId,
        targetType: "registration",
      });
      return;
    }

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      const studentId = `901019${suffix}`;
      const allocationRef = doc(db, "studentIdAllocations", studentId);
      const allocationSnapshot = await transaction.get(allocationRef);
      if (!allocationSnapshot.exists()) {
        transaction.set(allocationRef, {
          ownerUid: registrationId,
          createdAt: serverTimestamp(),
        });
        transaction.update(registrationRef, { status, studentId });
        transaction.set(activityRef, {
          activityType: "registration-status-changed",
          actorEmail: admin.email,
          actorUid: admin.uid,
          createdAt: serverTimestamp(),
          newStatus: status,
          ownerUid: registrationId,
          previousStatus: registration.status,
          recordLabel: registration.displayName || registration.email,
          targetId: registrationId,
          targetType: "registration",
        });
        return;
      }
    }
    throw new Error("All student ID suffixes are assigned. Contact the system administrator.");
  });
}

export async function deleteStudentFromPortal(studentUid) {
  const admin = requireUser();
  if (
    !isConfiguredAdminEmail(admin.email)
    || !admin.emailVerified
    || !admin.providerData.some((provider) => provider.providerId === "google.com")
  ) {
    throw new Error("Only the verified administrator Google account can remove a student.");
  }

  const registrationRef = doc(db, "registrations", studentUid);
  const registrationSnapshot = await getDoc(registrationRef);
  if (!registrationSnapshot.exists()) {
    throw new Error("This student registration no longer exists.");
  }

  const registration = registrationSnapshot.data();
  const { studentId } = registration;
  if (studentId && !/^901019[0-9]{3}$/.test(studentId)) {
    throw new Error("The student ID is invalid, so this student’s data could not be safely removed.");
  }

  try {
    const requestSnapshot = await getDocs(query(
      collection(db, "requests"),
      where("ownerUid", "==", studentUid),
    ));
    for (let start = 0; start < requestSnapshot.docs.length; start += 450) {
      const batch = writeBatch(db);
      requestSnapshot.docs.slice(start, start + 450).forEach((request) => {
        batch.delete(request.ref);
      });
      await batch.commit();
    }

    const cleanupBatch = writeBatch(db);
    if (studentId) {
      cleanupBatch.delete(doc(db, "studentIdAllocations", studentId));
    }
    cleanupBatch.delete(registrationRef);
    cleanupBatch.set(doc(collection(db, "activityLogs")), {
      activityType: "student-removed",
      actorEmail: admin.email,
      actorUid: admin.uid,
      createdAt: serverTimestamp(),
      newStatus: "Removed",
      ownerUid: studentUid,
      previousStatus: registration.status,
      recordLabel: registration.displayName || registration.email,
      targetId: studentUid,
      targetType: "registration",
    });
    await cleanupBatch.commit();
  } catch (error) {
    if (error?.code === "permission-denied") {
      throw new Error(
        `Firebase blocked student removal in project "${firebaseProjectId}". Publish the current firestore.rules file, including admin delete access for registrations and studentIdAllocations, then try again.`,
      );
    }
    throw error;
  }
}
