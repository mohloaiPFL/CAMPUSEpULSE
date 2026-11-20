import { auth, db } from "../lib/Firebase";
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
import {
  deleteStudentFromPortal,
  listenToStudentRegistration,
  submitRegistration,
  updateRegistrationStatus,
  verifyStudentRemovalPassword,
} from "./authService";

jest.mock("../lib/Firebase", () => ({
  auth: {
    currentUser: {
      email: "mohloaiqamo@gmail.com",
      emailVerified: true,
      providerData: [{ providerId: "google.com" }],
    },
  },
  db: {},
  firebaseConfigured: true,
  firebaseProjectId: "test-project",
}));

jest.mock("firebase/auth", () => ({
  GoogleAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn((database, collectionName, id) => {
    if (collectionName === undefined) return { path: `${database.path}/generated` };
    return { path: `${collectionName}/${id}` };
  }),
  collection: jest.fn((database, collectionName) => ({ path: collectionName })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn((reference, constraint) => ({ reference, constraint })),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => "server-timestamp"),
  setDoc: jest.fn(),
  where: jest.fn((field, operator, value) => ({ field, operator, value })),
  writeBatch: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = {
    email: "mohloaiqamo@gmail.com",
    emailVerified: true,
    providerData: [{ providerId: "google.com" }],
  };
  collection.mockImplementation((database, collectionName) => ({ path: collectionName }));
  doc.mockImplementation((database, collectionName, id) => {
    if (collectionName === undefined) return { path: `${database.path}/generated` };
    return { path: `${collectionName}/${id}` };
  });
  jest.spyOn(Math, "random")
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(0.89);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("saves a valid student application as pending with its course", async () => {
  auth.currentUser = {
    uid: "student-uid",
    email: "student@example.com",
    emailVerified: true,
    providerData: [{ providerId: "google.com" }],
  };

  await submitRegistration({
    firstName: "Mpho",
    surname: "Ndlovu",
    faculty: "Faculty of Design and Innovation",
    course: "Bachelor of Design",
    level: "Degree",
    sponsorship: "Self-sponsored",
    gender: "Male",
    phoneNumber: "+266 5012 3456",
    address: "Plot 123, Maseru",
    kinName: "Palesa Mokoena",
    kinRelationship: "Parent",
    kinPhoneNumber: "+266 5888 1234",
  });

  expect(setDoc).toHaveBeenCalledWith(
    { path: "registrations/student-uid" },
    expect.objectContaining({
      course: "Bachelor of Design",
      status: "Pending",
      displayName: "Mpho Ndlovu",
    }),
  );
});

test("admin approval reserves a unique 901019 student ID and stores it on the registration", async () => {
  const transaction = {
    get: jest.fn(async (reference) => {
      if (reference.path === "registrations/student-uid") {
        return {
          exists: () => true,
          data: () => ({ displayName: "Mpho Ndlovu", email: "student@example.com", status: "Pending" }),
        };
      }
      return { exists: () => reference.path === "studentIdAllocations/901019000" };
    }),
    set: jest.fn(),
    update: jest.fn(),
  };
  runTransaction.mockImplementation((database, callback) => callback(transaction));

  await updateRegistrationStatus("student-uid", "Approved");

  expect(auth.currentUser.email).toBe("mohloaiqamo@gmail.com");
  expect(runTransaction).toHaveBeenCalledWith(db, expect.any(Function));
  expect(transaction.set).toHaveBeenCalledWith(
    { path: "studentIdAllocations/901019890" },
    { ownerUid: "student-uid", createdAt: serverTimestamp() },
  );
  expect(transaction.update).toHaveBeenCalledWith(
    { path: "registrations/student-uid" },
    { status: "Approved", studentId: "901019890" },
  );
  expect(transaction.set).toHaveBeenCalledWith(
    { path: "activityLogs/generated" },
    expect.objectContaining({
      activityType: "registration-status-changed",
      actorEmail: "mohloaiqamo@gmail.com",
      newStatus: "Approved",
      previousStatus: "Pending",
      recordLabel: "Mpho Ndlovu",
      targetId: "student-uid",
      targetType: "registration",
    }),
  );
});

test("admin deletion removes student requests, ID allocation, and registration", async () => {
  const requests = [
    { ref: { path: "requests/request-1" } },
    { ref: { path: "requests/request-2" } },
  ];
  const requestBatch = { delete: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
  const cleanupBatch = { delete: jest.fn(), set: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      displayName: "Mpho Ndlovu",
      email: "student@example.com",
      studentId: "901019890",
      status: "Approved",
    }),
  });
  getDocs.mockResolvedValue({ docs: requests });
  writeBatch.mockReturnValueOnce(requestBatch).mockReturnValueOnce(cleanupBatch);

  await deleteStudentFromPortal("student-uid");

  expect(query).toHaveBeenCalledWith(collection.mock.results[0].value, where.mock.results[0].value);
  expect(requestBatch.delete.mock.calls).toEqual([[requests[0].ref], [requests[1].ref]]);
  expect(requestBatch.commit).toHaveBeenCalledTimes(1);
  expect(cleanupBatch.delete.mock.calls).toEqual([
    [{ path: "studentIdAllocations/901019890" }],
    [{ path: "registrations/student-uid" }],
  ]);
  expect(cleanupBatch.set).toHaveBeenCalledWith(
    { path: "activityLogs/generated" },
    expect.objectContaining({
      activityType: "student-removed",
      actorEmail: "mohloaiqamo@gmail.com",
      newStatus: "Removed",
      previousStatus: "Approved",
      recordLabel: "Mpho Ndlovu",
      targetId: "student-uid",
      targetType: "registration",
    }),
  );
  expect(cleanupBatch.commit).toHaveBeenCalledTimes(1);
  expect(where).toHaveBeenCalledWith("ownerUid", "==", "student-uid");
  expect(collection).toHaveBeenCalledWith(db, "requests");
});

test("admin deletion stops when the registration does not exist", async () => {
  getDoc.mockResolvedValue({ exists: () => false });

  await expect(deleteStudentFromPortal("missing-student")).rejects.toThrow(/no longer exists/i);
  expect(getDocs).not.toHaveBeenCalled();
  expect(writeBatch).not.toHaveBeenCalled();
});

test("admin deletion explains when deployed Firestore rules deny removal", async () => {
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ studentId: "901019890" }),
  });
  getDocs.mockRejectedValue({ code: "permission-denied" });

  await expect(deleteStudentFromPortal("student-uid")).rejects.toThrow(
    /publish the current firestore\.rules file/i,
  );
  expect(writeBatch).not.toHaveBeenCalled();
});

test("student registration listener reports a deleted registration", () => {
  auth.currentUser.uid = "student-uid";
  const onRegistration = jest.fn();
  const unsubscribe = jest.fn();
  onSnapshot.mockImplementationOnce((reference, onNext) => {
    onNext({ exists: () => false });
    return unsubscribe;
  });

  expect(listenToStudentRegistration("student-uid", onRegistration)).toBe(unsubscribe);
  expect(onRegistration).toHaveBeenCalledWith(null);
});

test("student-removal password is read from private local app configuration", () => {
  const previousPassword = process.env.REACT_APP_STUDENT_REMOVAL_PASSWORD;
  process.env.REACT_APP_STUDENT_REMOVAL_PASSWORD = "test-removal-password";

  expect(verifyStudentRemovalPassword("test-removal-password")).toBe(true);
  expect(verifyStudentRemovalPassword("incorrect")).toBe(false);

  if (previousPassword === undefined) {
    delete process.env.REACT_APP_STUDENT_REMOVAL_PASSWORD;
  } else {
    process.env.REACT_APP_STUDENT_REMOVAL_PASSWORD = previousPassword;
  }
});
