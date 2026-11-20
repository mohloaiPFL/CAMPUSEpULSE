import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import {
  createRequest,
  deleteRequest,
  getFirebaseErrorMessage,
  listenToAdminActivity,
  listenToRequests,
  listenToStudentActivity,
  updateRequestStatus,
} from "./services/requestService";
import { downloadRecommendationLetter } from "./utils/recommendationLetter";
import { downloadTranscript } from "./utils/transcript";
import {
  deleteStudentFromPortal,
  getAccessProfile,
  listenToAdminQueue,
  listenToStudentRegistration,
  submitRegistration,
  signInWithGoogle,
  subscribeToAuthState,
} from "./services/authService";

let mockRegistration;
let mockAdminRegistrations;
let mockAdminRequests;
let mockAdminActivity;
let mockStudentRequests;
let mockStudentActivity;

jest.mock("./lib/Firebase", () => ({
  auth: { currentUser: null },
  db: {},
  firebaseConfigured: true,
}));

jest.mock("./services/authService", () => ({
  ADMIN_EMAIL: "mohloaiqamo@gmail.com",
  ADMIN_PASSWORD: "@63485293krm?",
  STUDENT_FACULTIES: [
    "Faculty of Design and Innovation",
    "Faculty of Information Communication Technology",
    "Faculty of Communication, Media & Broadcasting",
    "Faculty of Business Management and Globalization",
    "Faculty of Creativity in Tourism and Hospitality",
    "Faculty of Architecture and Built Environment",
  ],
  STUDENT_LEVELS: ["Diploma", "Degree", "TVET"],
  SPONSOR_OPTIONS: ["Self-sponsored", "NMDS", "Other"],
  getAccessProfile: jest.fn(),
  getAuthErrorMessage: (error) => error?.message || "Google sign-in failed.",
  deleteStudentFromPortal: jest.fn(),
  listenToAdminQueue: jest.fn(),
  listenToStudentRegistration: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOutUser: jest.fn(),
  submitRegistration: jest.fn(),
  subscribeToAuthState: jest.fn(() => jest.fn()),
  updateRegistrationStatus: jest.fn(),
  verifyAdminPassword: (password) => password === "@63485293krm?",
  verifyStudentRemovalPassword: (password) => password === "test-removal-password",
}));

jest.mock("./services/requestService", () => {
  const actual = jest.requireActual("./services/requestService");
  return {
    ...actual,
    createRequest: jest.fn(),
    deleteRequest: jest.fn(),
    listenToAdminActivity: jest.fn(),
    listenToRequests: jest.fn(),
    listenToStudentActivity: jest.fn(),
    updateRequestStatus: jest.fn(),
  };
});

jest.mock("./utils/recommendationLetter", () => ({
  downloadRecommendationLetter: jest.fn(),
}));

jest.mock("./utils/transcript", () => ({
  downloadTranscript: jest.fn(),
}));

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  mockRegistration = null;
  mockAdminRegistrations = [];
  mockAdminRequests = [];
  mockAdminActivity = [];
  mockStudentRequests = [];
  mockStudentActivity = [];
  window.localStorage.clear();
  createRequest.mockResolvedValue("request-demo-id");
  deleteRequest.mockResolvedValue(undefined);
  updateRequestStatus.mockResolvedValue(undefined);
  signInWithGoogle.mockClear();
  listenToRequests.mockImplementation(async (onRequests) => {
    onRequests(mockStudentRequests);
    return jest.fn();
  });
  listenToStudentActivity.mockImplementation(async (onActivities) => {
    onActivities(mockStudentActivity);
    return jest.fn();
  });
  listenToAdminActivity.mockImplementation((onActivities) => {
    onActivities(mockAdminActivity);
    return jest.fn();
  });
  downloadRecommendationLetter.mockReset();
  downloadTranscript.mockReset();
  getAccessProfile.mockImplementation(async () => ({
    isAdmin: false,
    registration: mockRegistration,
  }));
  listenToStudentRegistration.mockImplementation((studentUid, onRegistration) => {
    onRegistration(mockRegistration);
    return jest.fn();
  });
  deleteStudentFromPortal.mockResolvedValue(undefined);
  listenToAdminQueue.mockImplementation((onRegistrations, onRequests) => {
    onRegistrations(mockAdminRegistrations);
    onRequests(mockAdminRequests);
    return jest.fn();
  });
  submitRegistration.mockImplementation(async (details) => {
    mockRegistration = {
      ...details,
      displayName: `${details.firstName} ${details.surname}`,
      email: "student@gmail.com",
      status: "Pending",
    };
  });
});

function googleStudent() {
  return {
    uid: "google-student-uid",
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    emailVerified: true,
    providerData: [{ providerId: "google.com" }],
  };
}

function emitAuthState(user) {
  act(() => subscribeToAuthState.mock.calls[0][0](user));
}

test("requires Google sign-in before showing the student portal", async () => {
  render(<App />);
  emitAuthState(null);

  expect(await screen.findByRole("heading", { name: /sign in to campus pulse/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Services" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
  emitAuthState(googleStudent());

  expect(await screen.findByRole("heading", { name: /start your student journey/i })).toBeInTheDocument();
  expect(screen.getByText("student@gmail.com")).toBeInTheDocument();
});

test("keeps sign-in and sign-up controls hidden and uses Google sign-in for new accounts", async () => {
  render(<App />);
  emitAuthState(null);

  expect(await screen.findByRole("heading", { name: /sign in to campus pulse/i })).toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Sign in" })).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Sign up" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
});

test("recognizes the configured admin email and unlocks the admin portal with the correct password", async () => {
  getAccessProfile.mockResolvedValueOnce({ isAdmin: true, registration: null });

  render(<App />);
  emitAuthState({
    uid: "admin-uid",
    displayName: "University Admin",
    email: "mohloaiqamo@gmail.com",
    emailVerified: true,
    providerData: [{ providerId: "google.com" }],
  });

  expect(await screen.findByRole("heading", { name: /university admin access/i })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/^Admin password/), { target: { value: "@63485293krm?" } });
  fireEvent.click(screen.getByRole("button", { name: /unlock admin portal/i }));

  expect(await screen.findByRole("heading", { name: /good work starts/i })).toBeInTheDocument();
  expect(screen.getByText("ADMINISTRATION")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /student registrations/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /service requests/i })).toBeInTheDocument();
});

test("admin directory lists students, filters by faculty and level, and sorts by faculty", async () => {
  mockAdminRegistrations = [
    {
      id: "student-ict",
      displayName: "Mpho Ndlovu",
      email: "mpho@example.com",
      studentId: "901019001",
      faculty: "Faculty of Information Communication Technology",
      level: "Diploma",
      status: "Approved",
    },
    {
      id: "student-design",
      displayName: "Neo Mokoena",
      email: "neo@example.com",
      studentId: "901019002",
      faculty: "Faculty of Design and Innovation",
      level: "Degree",
      status: "Approved",
    },
  ];

  getAccessProfile.mockResolvedValueOnce({ isAdmin: true, registration: null });
  render(<App />);
  emitAuthState({
    uid: "admin-uid",
    displayName: "University Admin",
    email: "mohloaiqamo@gmail.com",
    emailVerified: true,
    providerData: [{ providerId: "google.com" }],
  });
  fireEvent.change(await screen.findByLabelText(/^Admin password/), { target: { value: "@63485293krm?" } });
  fireEvent.click(screen.getByRole("button", { name: /unlock admin portal/i }));
  fireEvent.click(await screen.findByRole("button", { name: /registered students/i }));

  const directory = await screen.findByRole("region", { name: /student directory/i });
  expect(within(directory).getByText("Mpho Ndlovu")).toBeInTheDocument();
  expect(within(directory).getByText("Neo Mokoena")).toBeInTheDocument();

  fireEvent.change(within(directory).getByLabelText(/sort students by/i), { target: { value: "faculty" } });
  expect(within(directory).getAllByRole("article").map((row) => row.textContent))
    .toEqual(expect.arrayContaining([expect.stringContaining("Neo Mokoena"), expect.stringContaining("Mpho Ndlovu")]));
  expect(within(directory).getAllByRole("article")[0]).toHaveTextContent("Neo Mokoena");

  fireEvent.change(within(directory).getByLabelText(/filter students by faculty/i), {
    target: { value: "Faculty of Information Communication Technology" },
  });
  fireEvent.change(within(directory).getByLabelText(/filter students by study level/i), { target: { value: "Diploma" } });
  expect(within(directory).getByText("Mpho Ndlovu")).toBeInTheDocument();
  expect(within(directory).queryByText("Neo Mokoena")).not.toBeInTheDocument();
});

test("admin navigation opens dedicated technical, recommendation, ID, and all-request queues", async () => {
  mockAdminRequests = [
    { id: "request-tech", serviceId: "technical", serviceName: "Technical Support", department: "ICT Department", studentName: "Mpho Ndlovu", email: "mpho@example.com", studentId: "901019001", status: "Pending", description: "Campus Wi-Fi is not working." },
    { id: "request-rec", serviceId: "recommendation", serviceName: "Letter of Recommendation", department: "Registry", studentName: "Neo Mokoena", email: "neo@example.com", studentId: "901019002", status: "Pending", description: "I need a letter for my internship application." },
    { id: "request-id", serviceId: "student-id", serviceName: "Student ID Replacement", department: "Student Affairs", studentName: "Lebo Khumalo", email: "lebo@example.com", studentId: "901019003", status: "In Progress", description: "My student card was damaged." },
  ];

  getAccessProfile.mockResolvedValueOnce({ isAdmin: true, registration: null });
  render(<App />);
  emitAuthState({
    uid: "admin-uid",
    displayName: "University Admin",
    email: "mohloaiqamo@gmail.com",
    emailVerified: true,
    providerData: [{ providerId: "google.com" }],
  });
  fireEvent.change(await screen.findByLabelText(/^Admin password/), { target: { value: "@63485293krm?" } });
  fireEvent.click(screen.getByRole("button", { name: /unlock admin portal/i }));

  fireEvent.click(await screen.findByRole("button", { name: /technical issues/i }));
  expect(screen.getByRole("heading", { level: 2, name: "Technical Support" })).toBeInTheDocument();
  expect(screen.getByText("Campus Wi-Fi is not working.")).toBeInTheDocument();
  expect(screen.queryByText("I need a letter for my internship application.")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /recommendation letters/i }));
  expect(screen.getByRole("heading", { level: 2, name: "Letter of Recommendation" })).toBeInTheDocument();
  expect(screen.getByText("I need a letter for my internship application.")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /id replacement/i }));
  expect(screen.getByRole("heading", { level: 2, name: "Student ID Replacement" })).toBeInTheDocument();
  expect(screen.getByText("My student card was damaged.")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /all requests/i }));
  expect(screen.getByRole("heading", { name: "All service requests" })).toBeInTheDocument();
  expect(screen.getByText("Campus Wi-Fi is not working.")).toBeInTheDocument();
  expect(screen.getByText("I need a letter for my internship application.")).toBeInTheDocument();
  expect(screen.getByText("My student card was damaged.")).toBeInTheDocument();
});

test("admin decision history shows who changed request and registration statuses", async () => {
  mockAdminActivity = [
    {
      id: "request-decision-1",
      activityType: "request-status-changed",
      targetType: "request",
      targetId: "request-1",
      recordLabel: "Technical Support",
      previousStatus: "Pending",
      newStatus: "In Progress",
      actorEmail: "mohloaiqamo@gmail.com",
      createdAt: { toDate: () => new Date("2026-11-18T11:00:00Z") },
    },
    {
      id: "registration-decision-1",
      activityType: "registration-status-changed",
      targetType: "registration",
      targetId: "student-uid",
      recordLabel: "Mpho Ndlovu",
      previousStatus: "Pending",
      newStatus: "Approved",
      actorEmail: "mohloaiqamo@gmail.com",
      createdAt: { toDate: () => new Date("2026-11-18T10:00:00Z") },
    },
  ];
  getAccessProfile.mockResolvedValueOnce({ isAdmin: true, registration: null });
  render(<App />);
  emitAuthState({
    uid: "admin-uid",
    displayName: "University Admin",
    email: "mohloaiqamo@gmail.com",
    emailVerified: true,
    providerData: [{ providerId: "google.com" }],
  });
  fireEvent.change(await screen.findByLabelText(/^Admin password/), { target: { value: "@63485293krm?" } });
  fireEvent.click(screen.getByRole("button", { name: /unlock admin portal/i }));
  fireEvent.click(await screen.findByRole("button", { name: /decision history/i }));

  const history = await screen.findByRole("region", { name: /administrator decision history/i });
  expect(within(history).getByRole("heading", { name: "Decision history" })).toBeInTheDocument();
  const registrationDecision = within(history).getByText("Mpho Ndlovu").closest("li");
  const requestDecision = within(history).getByText("Technical Support").closest("li");
  expect(registrationDecision).toHaveTextContent("Pending");
  expect(registrationDecision).toHaveTextContent("Approved");
  expect(requestDecision).toHaveTextContent("Pending");
  expect(requestDecision).toHaveTextContent("In Progress");
  expect(within(history).getAllByText(/By mohloaiqamo@gmail.com/)).toHaveLength(2);
});

test("admin confirms removal of a student and requests complete portal data deletion", async () => {
  mockAdminRegistrations = [{
    id: "student-uid",
    displayName: "Mpho Ndlovu",
    email: "mpho@example.com",
    studentId: "901019001",
    faculty: "Faculty of Design and Innovation",
    level: "Degree",
    status: "Approved",
  }];

  getAccessProfile.mockResolvedValueOnce({ isAdmin: true, registration: null });
  render(<App />);
  emitAuthState({
    uid: "admin-uid",
    displayName: "University Admin",
    email: "mohloaiqamo@gmail.com",
    emailVerified: true,
    providerData: [{ providerId: "google.com" }],
  });
  fireEvent.change(await screen.findByLabelText(/^Admin password/), { target: { value: "@63485293krm?" } });
  fireEvent.click(screen.getByRole("button", { name: /unlock admin portal/i }));
  fireEvent.click(await screen.findByRole("button", { name: /registered students/i }));

  const directory = await screen.findByRole("region", { name: /student directory/i });
  fireEvent.click(within(directory).getByRole("button", { name: /remove student/i }));

  expect(await screen.findByRole("dialog", { name: /confirm student removal/i })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/administrator password/i), { target: { value: "wrong-password" } });
  fireEvent.click(screen.getByRole("button", { name: /confirm removal/i }));
  expect(await screen.findByText(/administrator password is incorrect/i)).toBeInTheDocument();
  expect(deleteStudentFromPortal).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText(/administrator password/i), { target: { value: "test-removal-password" } });
  fireEvent.click(screen.getByRole("button", { name: /confirm removal/i }));
  await waitFor(() => expect(deleteStudentFromPortal).toHaveBeenCalledWith("student-uid"));
  expect(await screen.findByRole("status")).toHaveTextContent(/was removed/i);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("a removed student loses portal access immediately and is shown the registration form", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "901019001",
    status: "Approved",
  };
  render(<App />);
  emitAuthState(googleStudent());

  expect(await screen.findByRole("heading", { name: /student services,/i })).toBeInTheDocument();
  const [, onRegistrationChanged] = listenToStudentRegistration.mock.calls[0];
  act(() => onRegistrationChanged(null));

  expect(await screen.findByRole("heading", { name: /start your student journey/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Services" })).not.toBeInTheDocument();
});

test("keeps a Google-verified student out of the portal until registration is approved", async () => {
  render(<App />);
  emitAuthState(null);
  fireEvent.click(await screen.findByRole("button", { name: /continue with google/i }));
  emitAuthState(googleStudent());

  expect(await screen.findByRole("heading", { name: /start your student journey/i })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^First name/), { target: { value: "Mpho" } });
  fireEvent.change(screen.getByLabelText(/^Surname/), { target: { value: "Ndlovu" } });
  fireEvent.change(screen.getByLabelText(/^Faculty/), { target: { value: "Faculty of Design and Innovation" } });
  fireEvent.change(screen.getByLabelText(/^Course \/ programme/), { target: { value: "Bachelor of Design" } });
  fireEvent.change(screen.getByLabelText(/^Study level/), { target: { value: "Degree" } });
  fireEvent.change(screen.getByLabelText(/^Gender/), { target: { value: "Female" } });
  fireEvent.change(screen.getByLabelText(/^Fee sponsor/), { target: { value: "Other" } });
  fireEvent.change(screen.getByLabelText(/^Sponsor name/), { target: { value: "Community Trust" } });
  fireEvent.change(screen.getByLabelText(/^Campus residence/), { target: { value: "On campus" } });
  fireEvent.change(screen.getByLabelText(/^Your phone number/), { target: { value: "+266 50123456" } });
  fireEvent.change(screen.getByLabelText(/^Residential address/), { target: { value: "Maseru, Lesotho" } });
  fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: "Palesa Ndlovu" } });
  fireEvent.change(screen.getByLabelText(/^Relationship to you/), { target: { value: "Parent" } });
  fireEvent.change(screen.getByLabelText(/^Next of kin phone number/), { target: { value: "+266 58881234" } });
  fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

  expect(await screen.findByRole("heading", { name: /you’re in the queue/i })).toBeInTheDocument();
  expect(submitRegistration).toHaveBeenCalledWith(expect.objectContaining({
    firstName: "Mpho",
    surname: "Ndlovu",
    faculty: "Faculty of Design and Innovation",
    course: "Bachelor of Design",
    level: "Degree",
    gender: "Female",
    sponsorship: "Other",
    sponsorDetails: "Community Trust",
    residence: "On campus",
    kinName: "Palesa Ndlovu",
  }));
  expect(screen.getByText(/Student ID assigned after approval/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /back to registration form/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Services" })).not.toBeInTheDocument();
});

test("lets a student return to and resubmit a rejected registration with details prefilled", async () => {
  mockRegistration = {
    firstName: "Mpho",
    surname: "Ndlovu",
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    faculty: "Faculty of Design and Innovation",
    course: "Bachelor of Design",
    level: "Degree",
    sponsorship: "Self-sponsored",
    gender: "Male",
    phoneNumber: "+266 50123456",
    address: "Maseru, Lesotho",
    kinName: "Palesa Ndlovu",
    kinRelationship: "Parent",
    kinPhoneNumber: "+266 58881234",
    status: "Rejected",
  };

  render(<App />);
  emitAuthState(null);
  fireEvent.click(await screen.findByRole("button", { name: /continue with google/i }));
  emitAuthState(googleStudent());

  expect(await screen.findByRole("heading", { name: /registration not approved/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /back to registration form/i }));

  expect(await screen.findByRole("heading", { name: /update your details/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/^First name/)).toHaveValue("Mpho");
  expect(screen.getByLabelText(/^Surname/)).toHaveValue("Ndlovu");
  expect(screen.getByLabelText(/^Course \/ programme/)).toHaveValue("Bachelor of Design");
  expect(screen.getByLabelText(/^Residential address/)).toHaveValue("Maseru, Lesotho");
  fireEvent.click(screen.getByRole("button", { name: /submit registration/i }));

  expect(await screen.findByRole("heading", { name: /you’re in the queue/i })).toBeInTheDocument();
  expect(submitRegistration).toHaveBeenCalledWith(expect.objectContaining({
    firstName: "Mpho",
    surname: "Ndlovu",
    faculty: "Faculty of Design and Innovation",
    course: "Bachelor of Design",
    phoneNumber: "+266 50123456",
  }));
  expect(mockRegistration.status).toBe("Pending");
});

test("asks female students about residence and does not ask male students", async () => {
  render(<App />);
  emitAuthState(null);
  fireEvent.click(await screen.findByRole("button", { name: /continue with google/i }));
  emitAuthState(googleStudent());

  expect(await screen.findByRole("heading", { name: /start your student journey/i })).toBeInTheDocument();
  expect(screen.queryByLabelText(/^Campus residence/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Gender/), { target: { value: "Female" } });
  expect(screen.getByLabelText(/^Campus residence/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Gender/), { target: { value: "Male" } });
  expect(screen.queryByLabelText(/^Campus residence/)).not.toBeInTheDocument();
});

test("filters unsupported name and phone characters and explains what was removed", async () => {
  render(<App />);
  emitAuthState(null);
  fireEvent.click(await screen.findByRole("button", { name: /continue with google/i }));
  emitAuthState(googleStudent());

  const firstName = await screen.findByLabelText(/^First name/);
  fireEvent.change(firstName, { target: { value: "Mpho...,/5677?" } });

  expect(firstName).toHaveValue("Mpho");
  expect(await screen.findByText(/only letters, spaces, apostrophes, and hyphens are accepted/i)).toBeInTheDocument();
  expect(firstName).toHaveAttribute("aria-invalid", "true");

  fireEvent.change(firstName, { target: { value: "Mpho Ndlovu" } });
  expect(screen.queryByText(/only letters, spaces, apostrophes, and hyphens are accepted/i)).not.toBeInTheDocument();
  expect(firstName).toHaveAttribute("aria-invalid", "false");

  const phone = screen.getByLabelText(/^Your phone number/);
  fireEvent.change(phone, { target: { value: "jbjvgvv][';]" } });
  expect(phone).toHaveValue("");
  expect(await screen.findByText(/only digits and basic phone formatting/i)).toBeInTheDocument();
  expect(phone).toHaveAttribute("aria-invalid", "true");

  expect(submitRegistration).not.toHaveBeenCalled();
});

test("allows an approved student to access the service catalogue", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "123456",
    status: "Approved",
  };
  render(<App />);
  emitAuthState(null);
  fireEvent.click(await screen.findByRole("button", { name: /continue with google/i }));
  emitAuthState(googleStudent());

  expect(await screen.findByRole("heading", { name: /student services,/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Services" }));
  expect(await screen.findByRole("heading", { name: /what do you need a hand with/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Academic Transcript" })).toBeInTheDocument();
});

test("shows approved academic, contact, and next-of-kin details on the student profile", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "901019001",
    faculty: "Faculty of Design and Innovation",
    level: "Degree",
    sponsorship: "NMDS",
    gender: "Female",
    residence: "On campus",
    phoneNumber: "+266 50123456",
    address: "Maseru, Lesotho",
    kinName: "Palesa Ndlovu",
    kinRelationship: "Parent",
    kinPhoneNumber: "+266 58881234",
    status: "Approved",
  };

  render(<App />);
  emitAuthState(googleStudent());
  fireEvent.click(await screen.findByRole("link", { name: "Profile" }));

  expect(await screen.findByRole("heading", { name: "Academic details" })).toBeInTheDocument();
  expect(screen.getByText(/Student ID 901019001/)).toBeInTheDocument();
  expect(screen.getByText("901019001")).toBeInTheDocument();
  expect(screen.getByText("Faculty of Design and Innovation")).toBeInTheDocument();
  expect(screen.getByText("On campus")).toBeInTheDocument();
  expect(screen.getByText("Palesa Ndlovu")).toBeInTheDocument();
});

test("requires a demo payment method for ID replacement and saves only the prototype details", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "901019001",
    faculty: "Faculty of Design and Innovation",
    status: "Approved",
  };
  window.history.replaceState({}, "", "/request/student-id");
  render(<App />);
  emitAuthState(googleStudent());

  expect(await screen.findByRole("heading", { name: /make a request/i })).toBeInTheDocument();
  expect(screen.getByText(/M250/)).toBeInTheDocument();
  expect(screen.getByText(/no money is moved/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Tell us a little more/), {
    target: { value: "My student card is damaged and needs replacement." },
  });
  fireEvent.click(screen.getByRole("button", { name: /submit demo request/i }));
  expect(await screen.findByText(/choose a demo payment method/i)).toBeInTheDocument();
  expect(createRequest).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText(/^Payment method/), { target: { value: "CPay" } });
  fireEvent.click(screen.getByRole("button", { name: /submit demo request/i }));

  await waitFor(() => expect(createRequest).toHaveBeenCalledWith(expect.objectContaining({
    serviceId: "student-id",
    paymentMethod: "CPay",
    paymentAmount: 250,
    paymentStatus: "Demo only - not charged",
  })));
});

test("collects a course with transcript requests from existing students who lack a profile course", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "901019001",
    status: "Approved",
  };
  window.history.replaceState({}, "", "/request/transcript");
  render(<App />);
  emitAuthState(googleStudent());

  expect(await screen.findByRole("heading", { name: /make a request/i })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Tell us a little more/), {
    target: { value: "Please prepare my sample transcript." },
  });
  fireEvent.click(screen.getByRole("button", { name: /send my request/i }));
  expect(await screen.findByText(/enter your course or programme/i)).toBeInTheDocument();
  expect(createRequest).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText(/^Course \/ programme/), {
    target: { value: "Bachelor of Design;;;;.,/,[98877]" },
  });
  expect(screen.getByLabelText(/^Course \/ programme/)).toHaveValue("Bachelor of Design");
  fireEvent.click(screen.getByRole("button", { name: /send my request/i }));

  await waitFor(() => expect(createRequest).toHaveBeenCalledWith(expect.objectContaining({
    serviceId: "transcript",
    course: "Bachelor of Design",
  })));
});

test("shows the recommendation PDF download only after an administrator approves the request", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "901019001",
    faculty: "Faculty of Design and Innovation",
    status: "Approved",
  };
  mockStudentRequests = [{
    id: "recommendation-request",
    serviceId: "recommendation",
    serviceName: "Letter of Recommendation",
    department: "Registry",
    studentName: "Mpho Ndlovu",
    studentId: "901019001",
    status: "Approved",
    description: "I need a letter for my internship application.",
  }];
  render(<App />);
  emitAuthState(googleStudent());
  fireEvent.click(await screen.findByRole("link", { name: "My requests" }));
  fireEvent.click(await screen.findByRole("button", { name: /download approved a4 letter/i }));

  expect(downloadRecommendationLetter).toHaveBeenCalledWith({
    faculty: "Faculty of Design and Innovation",
    studentId: "901019001",
    studentName: "Mpho Ndlovu",
  });
});

test("shows request status history and marks updates as read when the student opens requests", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "901019001",
    faculty: "Faculty of Design and Innovation",
    status: "Approved",
  };
  mockStudentRequests = [{
    id: "request-1",
    serviceId: "technical",
    serviceName: "Technical Support",
    department: "ICT Department",
    studentName: "Mpho Ndlovu",
    studentId: "901019001",
    status: "In Progress",
    description: "Campus Wi-Fi is not working.",
    createdAt: { toDate: () => new Date("2026-11-17T10:00:00Z"), toMillis: () => 1 },
  }];
  mockStudentActivity = [
    {
      id: "request-submitted-1",
      activityType: "request-submitted",
      targetType: "request",
      targetId: "request-1",
      newStatus: "Pending",
      createdAt: { toDate: () => new Date("2026-11-17T10:00:00Z"), toMillis: () => 1 },
    },
    {
      id: "request-updated-1",
      activityType: "request-status-changed",
      targetType: "request",
      targetId: "request-1",
      previousStatus: "Pending",
      newStatus: "In Progress",
      createdAt: { toDate: () => new Date("2026-11-18T10:00:00Z"), toMillis: () => 2 },
    },
  ];

  render(<App />);
  emitAuthState(googleStudent());
  expect(await screen.findByRole("link", { name: /my requests.*1 unread update/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: /my requests/i }));

  expect(await screen.findByText("Status updated to In Progress")).toBeInTheDocument();
  await waitFor(() => expect(window.localStorage.getItem("campuspulse:seen-activity:google-student-uid")).toContain("request-updated-1"));
  expect(screen.getByRole("link", { name: "My requests" })).toBeInTheDocument();
});

test("does not offer a recommendation letter download before administrator approval", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "901019001",
    faculty: "Faculty of Design and Innovation",
    status: "Approved",
  };
  mockStudentRequests = [{
    id: "recommendation-request",
    serviceId: "recommendation",
    serviceName: "Letter of Recommendation",
    department: "Registry",
    studentName: "Mpho Ndlovu",
    studentId: "901019001",
    status: "Pending",
    description: "I need a letter for my internship application.",
  }];
  render(<App />);
  emitAuthState(googleStudent());
  fireEvent.click(await screen.findByRole("link", { name: "My requests" }));

  expect(await screen.findByText("Letter of Recommendation")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /download approved a4 letter/i })).not.toBeInTheDocument();
  expect(downloadRecommendationLetter).not.toHaveBeenCalled();
});

test("offers a sample transcript PDF only after administrator approval", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "901019001",
    status: "Approved",
  };
  mockStudentRequests = [{
    id: "transcript-request",
    serviceId: "transcript",
    serviceName: "Academic Transcript",
    department: "Registry",
    studentName: "Mpho Ndlovu",
    studentId: "901019001",
    status: "Approved",
    description: "I need a transcript sample.",
    course: "Bachelor of Design",
  }];
  render(<App />);
  emitAuthState(googleStudent());
  fireEvent.click(await screen.findByRole("link", { name: "My requests" }));
  fireEvent.click(await screen.findByRole("button", { name: /download sample transcript/i }));

  expect(downloadTranscript).toHaveBeenCalledWith({
    course: "Bachelor of Design",
    studentId: "901019001",
    studentName: "Mpho Ndlovu",
  });
});

test("does not offer a transcript download before administrator approval", async () => {
  mockRegistration = {
    displayName: "Mpho Ndlovu",
    email: "student@gmail.com",
    studentId: "901019001",
    course: "Bachelor of Design",
    status: "Approved",
  };
  mockStudentRequests = [{
    id: "transcript-request",
    serviceId: "transcript",
    serviceName: "Academic Transcript",
    department: "Registry",
    studentName: "Mpho Ndlovu",
    studentId: "901019001",
    status: "Pending",
    description: "I need a transcript sample.",
  }];
  render(<App />);
  emitAuthState(googleStudent());
  fireEvent.click(await screen.findByRole("link", { name: "My requests" }));

  expect(await screen.findByText("Academic Transcript")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /download sample transcript/i })).not.toBeInTheDocument();
  expect(downloadTranscript).not.toHaveBeenCalled();
});

test("explains how to fix Firebase Google Authentication configuration errors", () => {
  expect(getFirebaseErrorMessage({ code: "auth/configuration-not-found" })).toMatch(/enable Google/i);
  expect(getFirebaseErrorMessage({ code: "auth/operation-not-allowed" })).toMatch(/enable Google/i);
  expect(getFirebaseErrorMessage({ code: "auth/unauthorized-domain" })).toMatch(/authorized domains/i);
});

test("explains how to recover from a temporary Firebase network failure", () => {
  expect(getFirebaseErrorMessage({ code: "unavailable" })).toMatch(/switch between Wi-Fi and mobile data/i);
  expect(getFirebaseErrorMessage({ code: "auth/network-request-failed" })).toMatch(/form details are still here/i);
});
