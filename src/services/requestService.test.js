import { auth, db } from "../lib/Firebase";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { createRequest, updateRequestStatus } from "./requestService";

jest.mock("../lib/Firebase", () => ({
  auth: { currentUser: { uid: "student-uid", email: "student@example.com" } },
  db: {},
  firebaseConfigured: true,
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((database, name) => ({ path: name })),
  doc: jest.fn((first, second, third) => {
    if (third !== undefined) return { id: third, path: `${second}/${third}` };
    return { id: "generated", path: `${first.path}/generated` };
  }),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => "server-time"),
  writeBatch: jest.fn(),
}));

let batch;

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = { uid: "student-uid", email: "student@example.com" };
  collection.mockImplementation((database, name) => ({ path: name }));
  doc.mockImplementation((first, second, third) => {
    if (third !== undefined) return { id: third, path: `${second}/${third}` };
    return { id: "generated", path: `${first.path}/generated` };
  });
  serverTimestamp.mockReturnValue("server-time");
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      displayName: "Mpho Ndlovu",
      studentId: "901019001",
      status: "Approved",
    }),
  });
  batch = { commit: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
  writeBatch.mockReturnValue(batch);
});

test("creates the request and its initial timeline event atomically", async () => {
  const requestId = await createRequest({
    department: "ICT Department",
    description: "Campus Wi-Fi is not working.",
    requestDate: "2026-11-18",
    serviceId: "technical",
    serviceName: "Technical Support",
  });

  expect(requestId).toBe("generated");
  expect(batch.set).toHaveBeenCalledTimes(2);
  expect(batch.set).toHaveBeenNthCalledWith(
    1,
    { id: "generated", path: "requests/generated" },
    expect.objectContaining({ ownerUid: "student-uid", status: "Pending" }),
  );
  expect(batch.set).toHaveBeenNthCalledWith(
    2,
    { id: "generated", path: "activityLogs/generated" },
    expect.objectContaining({
      activityType: "request-submitted",
      newStatus: "Pending",
      ownerUid: "student-uid",
      targetId: "generated",
      targetType: "request",
    }),
  );
  expect(batch.commit).toHaveBeenCalledTimes(1);
});

test("requires and stores a course for transcript requests", async () => {
  await createRequest({
    course: "Bachelor of Design",
    department: "Registry",
    description: "Please prepare my sample transcript.",
    requestDate: "2026-11-18",
    serviceId: "transcript",
    serviceName: "Academic Transcript",
  });

  expect(batch.set).toHaveBeenNthCalledWith(
    1,
    { id: "generated", path: "requests/generated" },
    expect.objectContaining({ course: "Bachelor of Design" }),
  );
});

test("rejects transcript requests without a course before writing", async () => {
  await expect(createRequest({
    department: "Registry",
    description: "Please prepare my sample transcript.",
    requestDate: "2026-11-18",
    serviceId: "transcript",
    serviceName: "Academic Transcript",
  })).rejects.toThrow(/enter your course or programme/i);

  expect(batch.set).not.toHaveBeenCalled();
});

test("records an administrator status change with the previous and new values", async () => {
  auth.currentUser = { uid: "admin-uid", email: "mohloaiqamo@gmail.com" };
  const transaction = {
    get: jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({
        ownerUid: "student-uid",
        serviceName: "Technical Support",
        status: "Pending",
      }),
    }),
    set: jest.fn(),
    update: jest.fn(),
  };
  runTransaction.mockImplementation((database, callback) => callback(transaction));

  await updateRequestStatus("request-1", "In Progress");

  expect(transaction.update).toHaveBeenCalledWith(
    { id: "request-1", path: "requests/request-1" },
    { status: "In Progress" },
  );
  expect(transaction.set).toHaveBeenCalledWith(
    { id: "generated", path: "activityLogs/generated" },
    expect.objectContaining({
      activityType: "request-status-changed",
      actorEmail: "mohloaiqamo@gmail.com",
      newStatus: "In Progress",
      ownerUid: "student-uid",
      previousStatus: "Pending",
      targetId: "request-1",
      targetType: "request",
    }),
  );
});
