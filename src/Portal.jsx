import { Children, cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  GraduationCap,
  Headphones,
  Menu,
  MessageCircle,
  Monitor,
  Search,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  X,
  Trash2,
  CreditCard,
  ClipboardList,
  CircleHelp,
  AlertCircle,
  LogOut,
  Download,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { services } from "./Data/Services";
import {
  ID_REPLACEMENT_DEMO_FEE_MALOTI,
  ID_REPLACEMENT_DEMO_PAYMENT_STATUS,
  ID_REPLACEMENT_PAYMENT_METHODS,
} from "./Data/Payments";
import { downloadRecommendationLetter } from "./utils/recommendationLetter";
import { downloadTranscript } from "./utils/transcript";
import {
  createRequest,
  deleteRequest,
  getFirebaseErrorMessage,
  listenToAdminActivity,
  listenToRequests,
  listenToStudentActivity,
  updateRequestStatus,
} from "./services/requestService";
import {
  ADMIN_EMAIL,
  SPONSOR_OPTIONS,
  STUDENT_LEVELS,
  STUDENT_FACULTIES,
  deleteStudentFromPortal,
  getAccessProfile,
  getAuthErrorMessage,
  listenToAdminQueue,
  listenToStudentRegistration,
  signInWithGoogle,
  signOutUser,
  submitRegistration,
  subscribeToAuthState,
  updateRegistrationStatus,
  verifyAdminPassword,
  verifyStudentRemovalPassword,
} from "./services/authService";
import {
  getRegistrationInputFilterMessage,
  sanitizeRegistrationInput,
  validateCourse,
  validateRegistrationDetails,
} from "./services/registrationValidation";
import { auth, firebaseConfigured } from "./lib/Firebase";

const serviceIcons = {
  FileText,
  Award,
  ClipboardList,
  CreditCard,
  Monitor,
  MessageCircle,
};

const statuses = ["Pending", "Approved", "In Progress", "Completed", "Rejected"];
const AuthContext = createContext(null);

function usePortalAuth() {
  return useContext(AuthContext);
}

function Brand({ compact = false }) {
  return (
    <Link className={`brand${compact ? " brand-compact" : ""}`} to="/" aria-label="Limkokwing University home">
      <img alt="" className="brand-logo" src="/logo.png" />
      <span className="brand-copy">
        <strong>Limkokwing</strong>
      </span>
    </Link>
  );
}

function Navbar({
  activityError = "",
  isAdmin,
  isPortalEnabled,
  unreadActivityCount = 0,
  user,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOutUser();
    } catch (error) {
      setSignOutError(getAuthErrorMessage(error));
    }
  }

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <Brand />
        <button
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          className="mobile-menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <div className={`nav-links${menuOpen ? " nav-links-open" : ""}`}>
          {isPortalEnabled && (
            <>
              <NavLink end onClick={() => setMenuOpen(false)} to="/">Home</NavLink>
              <NavLink onClick={() => setMenuOpen(false)} to="/services">Services</NavLink>
              {!isAdmin && (
                <>
                  <NavLink onClick={() => setMenuOpen(false)} to="/profile">Profile</NavLink>
                  <NavLink onClick={() => setMenuOpen(false)} to="/requests">
                    My requests
                    {unreadActivityCount > 0 && (
                      <span aria-label={`${unreadActivityCount} unread updates`} className="nav-notification-badge">
                        {unreadActivityCount > 9 ? "9+" : unreadActivityCount}
                      </span>
                    )}
                  </NavLink>
                </>
              )}
              {isAdmin
                ? <NavLink onClick={() => setMenuOpen(false)} to="/admin">Admin</NavLink>
                : <Link className="nav-cta" onClick={() => setMenuOpen(false)} to="/request">Make a request <ArrowUpRight size={15} /></Link>}
            </>
          )}
          {user && (
            <button className="nav-sign-out" onClick={handleSignOut} type="button">
              <LogOut size={15} /> Sign out
            </button>
          )}
        </div>
      </nav>
      {signOutError && <p className="nav-error" role="alert">{signOutError}</p>}
      {activityError && <p className="nav-error" role="alert">{activityError}</p>}
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Brand compact />
        <span>© {new Date().getFullYear()} Limkokwing University of Creative Technology</span>
      </div>
    </footer>
  );
}

function getSeenActivityStorageKey(userId) {
  return `campuspulse:seen-activity:${userId}`;
}

function readSeenActivityIds(userId) {
  let serialized;
  try {
    serialized = window.localStorage.getItem(getSeenActivityStorageKey(userId));
  } catch (error) {
    throw new Error(`Browser notification storage is unavailable: ${error.message}`);
  }
  const ids = serialized ? serialized.split(",").filter(Boolean) : [];
  if (ids.some((id) => !/^[a-zA-Z0-9_-]+$/.test(id))) {
    throw new Error("Saved notification data is invalid. Clear this site's saved data to reset notifications.");
  }
  return new Set(ids);
}

function saveSeenActivityIds(userId, activities) {
  try {
    const seenIds = readSeenActivityIds(userId);
    activities.forEach((activity) => seenIds.add(activity.id));
    window.localStorage.setItem(
      getSeenActivityStorageKey(userId),
      [...seenIds].slice(-200).join(","),
    );
  } catch (error) {
    throw new Error(`Notification status could not be saved: ${error.message}`);
  }
}

function Layout() {
  const authState = usePortalAuth();
  const { isAdmin, loading, registration, refreshProfile, user } = authState;
  const userId = user?.uid;
  const currentLocation = useLocation();
  const [signInError, setSignInError] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [editingRejectedRegistration, setEditingRejectedRegistration] = useState(false);
  const [activityRecords, setActivityRecords] = useState([]);
  const [activityError, setActivityError] = useState("");
  const [unreadActivityCount, setUnreadActivityCount] = useState(0);

  const isConfiguredAdmin = user?.email && user.email.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (!isConfiguredAdmin) {
      setAdminUnlocked(false);
    }
  }, [isConfiguredAdmin]);

  useEffect(() => {
    if (loading || !userId || isAdmin || registration?.status !== "Approved") {
      setActivityRecords([]);
      setActivityError("");
      setUnreadActivityCount(0);
      return undefined;
    }

    let active = true;
    let unsubscribe;
    listenToStudentActivity(
      (items) => {
        if (!active) return;
        setActivityRecords(items);
        try {
          const seenIds = readSeenActivityIds(userId);
          setUnreadActivityCount(items.filter((activity) => (
            ["request-status-changed", "registration-status-changed"].includes(activity.activityType)
            && !seenIds.has(activity.id)
          )).length);
          setActivityError("");
        } catch (error) {
          setUnreadActivityCount(0);
          setActivityError(error.message || "Student notifications could not be loaded.");
        }
      },
      (error) => {
        if (!active) return;
        setActivityError(getFirebaseErrorMessage(error));
      },
    ).then((stopListening) => {
      if (active) unsubscribe = stopListening;
      else stopListening();
    }).catch((error) => {
      if (active) setActivityError(getFirebaseErrorMessage(error));
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [isAdmin, loading, registration?.status, userId]);

  useEffect(() => {
    if (currentLocation.pathname !== "/requests" || !userId || activityRecords.length === 0) return;
    try {
      saveSeenActivityIds(userId, activityRecords);
      setUnreadActivityCount(0);
      setActivityError("");
    } catch (error) {
      setActivityError(error.message || "Notification status could not be saved.");
    }
  }, [activityRecords, currentLocation.pathname, userId]);

  async function handleGoogleAuth() {
    setSignInError("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setSignInError(getAuthErrorMessage(error));
    }
  }

  if (loading) {
    return (
      <PortalFrame user={user}>
        <section className="access-panel"><span className="loading-spinner" /><h1>Checking your account...</h1></section>
      </PortalFrame>
    );
  }

  if (!firebaseConfigured) {
    return (
      <PortalFrame>
        <AccessMessage
          title="Portal setup required"
          message="Firebase is not configured for this app. Add the Firebase web app settings to .env.local, enable Google Authentication, and restart the app."
        />
      </PortalFrame>
    );
  }

  if (authState.error) {
    return (
      <PortalFrame user={user}>
        <AccessMessage
          action={<button className="button button-dark" onClick={refreshProfile} type="button">Try again</button>}
          message={authState.error}
          title="We couldn’t verify your access"
        />
      </PortalFrame>
    );
  }

  // Sign-in page for visitors who have not authenticated with Google.
  if (!user) {
    return (
      <PortalFrame
        className="student-sign-in"
        style={{ "--student-signin-image": `url("${process.env.PUBLIC_URL}/image/eyebrow.png")` }}
      >
        <section className="access-panel student-sign-in-panel">
          <span className="eyebrow">STUDENT PORTAL</span>
          <h1>Welcome back. Sign in to Limkokwing student services.</h1>
          <p>Sign in with Google to explore student services, send a request, and keep track of updates. New here? Sign in first, then complete your registration for university review.</p>
          {signInError && <div className="form-alert" role="alert">{signInError}</div>}
          <button
            className="button button-dark google-sign-in"
            onClick={handleGoogleAuth}
            type="button"
          >
            Continue with Google
          </button>
          <small>We use Google to confirm it’s you. We never see or store your Google password.</small>
        </section>
      </PortalFrame>
    );
  }

  if (isAdmin && isConfiguredAdmin && !adminUnlocked) {
    return (
      <AdminShell user={user}>
        <AdminPasswordGate onUnlock={() => setAdminUnlocked(true)} />
      </AdminShell>
    );
  }

  if (isAdmin) {
    return currentLocation.pathname === "/admin"
      ? <AdminShell user={user}><Outlet /></AdminShell>
      : <Navigate replace to="/admin" />;
  }

  if (!isAdmin && (!registration || (registration.status === "Rejected" && editingRejectedRegistration))) {
    return (
      <PortalFrame user={user}>
        <RegistrationPage
          initialRegistration={registration?.status === "Rejected" ? registration : null}
          onSubmitted={async () => {
            setEditingRejectedRegistration(false);
            await refreshProfile();
          }}
          user={user}
        />
      </PortalFrame>
    );
  }

  if (!isAdmin && registration.status !== "Approved") {
    return (
      <PortalFrame user={user}>
        <RegistrationStatusPage
          onEditRegistration={() => setEditingRejectedRegistration(true)}
          onRefresh={refreshProfile}
          registration={registration}
        />
      </PortalFrame>
    );
  }

  return (
    <div className="app-shell">
      <Navbar
        activityError={activityError}
        isAdmin={isAdmin}
        isPortalEnabled
        unreadActivityCount={unreadActivityCount}
        user={user}
      />
      <main className="main-content">
        <Outlet context={{ activityRecords }} />
      </main>
      <Footer />
    </div>
  );
}

function PortalFrame({ children, className = "", style, user }) {
  return (
    <div className={`app-shell${className ? ` ${className}` : ""}`} style={style}>
      <Navbar isAdmin={false} isPortalEnabled={false} user={user} />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  );
}

function AdminShell({ children, user }) {
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOutUser();
    } catch (error) {
      setSignOutError(getAuthErrorMessage(error));
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-brand">
            <img alt="" className="admin-brand-logo" src="/logo.png" />
            <span><strong>Limkokwing</strong><small>ADMINISTRATION</small></span>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-live"><i /> STAFF WORKSPACE</span>
            <span className="admin-user"><span>{(user?.displayName || user?.email || "A").charAt(0).toUpperCase()}</span>{user?.email}</span>
            <button className="admin-sign-out" onClick={handleSignOut} type="button"><LogOut size={15} /> Sign out</button>
          </div>
        </div>
        {signOutError && <p className="admin-topbar-error" role="alert">{signOutError}</p>}
      </header>
      <main className="admin-main">{children}</main>
      <Footer />
    </div>
  );
}

function AccessMessage({ action, message, title }) {
  return (
    <section className="page-section narrow-page">
      <div className="access-panel">
        <span className="access-icon"><AlertCircle size={25} /></span>
        <h1>{title}</h1>
        <p>{message}</p>
        {action}
      </div>
    </section>
  );
}

// Collects a student's details for university review.
function RegistrationPage({ initialRegistration, onSubmitted, user }) {
  const accountName = (user.displayName || "").trim().split(/\s+/);
  const [details, setDetails] = useState(() => ({
    firstName: initialRegistration?.firstName || accountName[0] || "",
    surname: initialRegistration?.surname || accountName.slice(1).join(" "),
    faculty: initialRegistration?.faculty || "",
    course: initialRegistration?.course || "",
    level: initialRegistration?.level || "",
    sponsorship: initialRegistration?.sponsorship || "",
    sponsorDetails: initialRegistration?.sponsorDetails || "",
    gender: initialRegistration?.gender || "",
    residence: initialRegistration?.residence || "",
    phoneNumber: initialRegistration?.phoneNumber || "",
    address: initialRegistration?.address || "",
    kinName: initialRegistration?.kinName || "",
    kinRelationship: initialRegistration?.kinRelationship || "",
    kinPhoneNumber: initialRegistration?.kinPhoneNumber || "",
  }));
  const [errors, setErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name } = event.target;
    const rawValue = event.target.value;
    const value = sanitizeRegistrationInput(name, rawValue);
    const filterMessage = rawValue === value ? "" : getRegistrationInputFilterMessage(name);
    const updatedDetails = {
      ...details,
      [name]: value,
      ...(name === "gender" && value !== "Female" ? { residence: "" } : {}),
      ...(name === "sponsorship" && value !== "Other" ? { sponsorDetails: "" } : {}),
    };
    setDetails(updatedDetails);

    const currentErrors = validateRegistrationDetails(updatedDetails);
    setErrors((previous) => ({
      ...previous,
      ...(filterMessage || hasSubmitted || previous[name]
        ? { [name]: filterMessage || currentErrors[name] || "" }
        : {}),
      ...(name === "gender" && value !== "Female" ? { residence: "" } : {}),
      ...(name === "sponsorship" && value !== "Other" ? { sponsorDetails: "" } : {}),
    }));

    setSubmitError("");
  }

  function handleBlur(event) {
    const { name } = event.target;
    if (!name) return;
    const validationErrors = validateRegistrationDetails(details);
    setErrors((current) => ({ ...current, [name]: validationErrors[name] || "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setHasSubmitted(true);
    const validationErrors = validateRegistrationDetails(details);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setSubmitError("");
      return;
    }

    setSubmitError("");
    setSubmitting(true);
    try {
      await submitRegistration(details);
      await onSubmitted();
    } catch (submitError) {
      setSubmitError(getAuthErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  const errorCount = Object.keys(errors).filter((field) => errors[field]).length;

  return (
    <section className="page-section narrow-page">
      <div className="access-panel registration-panel">
        <span className="access-icon"><UserRound size={25} /></span>
        <span className="eyebrow">{initialRegistration ? "UPDATE REGISTRATION" : "STUDENT REGISTRATION"}</span>
        <h1>{initialRegistration ? "Update your details" : "Start your student journey"}<span>.</span></h1>
        <p>{initialRegistration
          ? "Your previous application was rejected. Correct your details and submit it again for university review."
          : "Complete your enrolment details and submit them for university review. Your student ID will be generated after approval."}</p>
        <div className="verified-account"><span><CheckCircle2 size={17} /></span><div><strong>{user.displayName || "Google account"}</strong><small>{user.email}</small></div></div>
        <div className="registration-guidance"><ShieldCheck size={16} /><span>Use your official details. Names accept letters, spaces, apostrophes, or hyphens; phone numbers need 7–15 digits.</span></div>
        <form className="registration-form" noValidate onBlur={handleBlur} onSubmit={handleSubmit}>
          {hasSubmitted && errorCount > 0 && (
            <div className="registration-error-summary" role="status" aria-live="polite">
              <AlertCircle size={17} />
              <span>Please correct the {errorCount} highlighted {errorCount === 1 ? "field" : "fields"} before submitting.</span>
            </div>
          )}
          <div className="registration-section-heading"><span>01</span><div><strong>Your details</strong><small>Tell us about yourself and your programme.</small></div></div>
          <div className="registration-grid">
            <FormField error={errors.firstName} htmlFor="registrationFirstName" label="First name">
              <input autoCapitalize="words" autoComplete="given-name" id="registrationFirstName" maxLength={49} name="firstName" onChange={handleChange} placeholder="e.g. Neo" required value={details.firstName} />
            </FormField>
            <FormField error={errors.surname} htmlFor="registrationSurname" label="Surname">
              <input autoCapitalize="words" autoComplete="family-name" id="registrationSurname" maxLength={49} name="surname" onChange={handleChange} placeholder="e.g. Mokoena" required value={details.surname} />
            </FormField>
            <FormField error={errors.faculty} htmlFor="registrationFaculty" label="Faculty">
              <span className="select-wrap"><select id="registrationFaculty" name="faculty" onChange={handleChange} required value={details.faculty}><option value="">Select your faculty</option>{STUDENT_FACULTIES.map((faculty) => <option key={faculty} value={faculty}>{faculty}</option>)}</select><ChevronDown size={16} /></span>
            </FormField>
            <FormField error={errors.course} htmlFor="registrationCourse" label="Course / programme">
              <input autoCapitalize="words" autoComplete="off" id="registrationCourse" maxLength={35} name="course" onChange={handleChange} placeholder="e.g. Multimedia and Software Engineering" required value={details.course} />
            </FormField>
            <FormField error={errors.level} htmlFor="registrationLevel" label="Study level">
              <span className="select-wrap"><select id="registrationLevel" name="level" onChange={handleChange} required value={details.level}><option value="">Choose your level</option>{STUDENT_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select><ChevronDown size={16} /></span>
            </FormField>
            <FormField error={errors.gender} htmlFor="registrationGender" label="Gender">
              <span className="select-wrap"><select id="registrationGender" name="gender" onChange={handleChange} required value={details.gender}><option value="">Select gender</option><option value="Female">Female</option><option value="Male">Male</option></select><ChevronDown size={16} /></span>
            </FormField>
            <FormField error={errors.sponsorship} htmlFor="registrationSponsorship" label="Fee sponsor">
              <span className="select-wrap"><select id="registrationSponsorship" name="sponsorship" onChange={handleChange} required value={details.sponsorship}><option value="">Choose a sponsor</option>{SPONSOR_OPTIONS.map((sponsor) => <option key={sponsor} value={sponsor}>{sponsor}</option>)}</select><ChevronDown size={16} /></span>
            </FormField>
            {details.sponsorship === "Other" && (
                <FormField error={errors.sponsorDetails} htmlFor="registrationSponsorDetails" label="Sponsor name">
                  <input autoCapitalize="words" autoComplete="organization" id="registrationSponsorDetails" maxLength={100} name="sponsorDetails" onChange={handleChange} placeholder="Enter sponsor name" required value={details.sponsorDetails} />
              </FormField>
            )}
            {details.gender === "Female" && (
              <FormField error={errors.residence} htmlFor="registrationResidence" label="Campus residence">
                <span className="select-wrap"><select id="registrationResidence" name="residence" onChange={handleChange} required value={details.residence}><option value="">Choose residence</option><option value="On campus">On campus</option><option value="Off campus">Off campus</option></select><ChevronDown size={16} /></span>
              </FormField>
            )}
            <FormField error={errors.phoneNumber} htmlFor="registrationPhone" label="Your phone number">
              <input autoComplete="tel" id="registrationPhone" inputMode="tel" maxLength={20} name="phoneNumber" onChange={handleChange} placeholder="+266 5XXX XXXX" required type="tel" value={details.phoneNumber} />
            </FormField>
            <div className="registration-grid-full">
              <FormField error={errors.address} htmlFor="registrationAddress" label="Residential address">
                <textarea autoComplete="street-address" id="registrationAddress" maxLength={300} name="address" onChange={handleChange} placeholder="House/plot, area, town or city" required rows={2} value={details.address} />
              </FormField>
            </div>
          </div>
          <div className="registration-section-heading"><span>02</span><div><strong>Next of kin</strong><small>Who should the university contact if needed?</small></div></div>
          <div className="registration-grid">
            <FormField error={errors.kinName} htmlFor="registrationKinName" label="Full name">
              <input autoCapitalize="words" autoComplete="off" id="registrationKinName" maxLength={100} name="kinName" onChange={handleChange} placeholder="Full name" required value={details.kinName} />
            </FormField>
            <FormField error={errors.kinRelationship} htmlFor="registrationKinRelationship" label="Relationship to you">
              <input autoCapitalize="words" autoComplete="off" id="registrationKinRelationship" maxLength={50} name="kinRelationship" onChange={handleChange} placeholder="e.g. Parent, guardian, sibling" required value={details.kinRelationship} />
            </FormField>
            <FormField error={errors.kinPhoneNumber} htmlFor="registrationKinPhone" label="Next of kin phone number">
              <input autoComplete="off" id="registrationKinPhone" inputMode="tel" maxLength={20} name="kinPhoneNumber" onChange={handleChange} placeholder="+266 5XXX XXXX" required type="tel" value={details.kinPhoneNumber} />
            </FormField>
          </div>
          {submitError && <div className="form-alert" role="alert"><AlertCircle size={18} />{submitError}</div>}
          <button className="button button-dark" disabled={submitting} type="submit">
            {submitting ? "Sending for approval..." : "Submit registration"} <ArrowRight size={17} />
          </button>
        </form>
        <small>Access stays locked until an administrator approves your registration. Your student ID will be assigned automatically after approval.</small>
      </div>
    </section>
  );
}

// Shows whether a student's registration is pending, approved, or rejected.
function RegistrationStatusPage({ onEditRegistration, onRefresh, registration }) {
  const rejected = registration.status === "Rejected";
  return (
    <section className="page-section narrow-page">
      <div className="access-panel">
        <span className={`access-icon${rejected ? " access-icon-rejected" : ""}`}>
          {rejected ? <AlertCircle size={25} /> : <Clock3 size={25} />}
        </span>
        <span className="eyebrow">REGISTRATION {rejected ? "UPDATE" : "IN REVIEW"}</span>
        <h1>{rejected ? "Registration not approved" : "You’re in the queue"}<span>.</span></h1>
        <p>{rejected
          ? "Your registration was not approved. Review your details and submit the application again, or contact the university support team if you need help."
          : "The university team is reviewing your student details. You can access the portal as soon as your registration is approved."}</p>
        <div className="verified-account"><span><CheckCircle2 size={17} /></span><div><strong>{registration.displayName}</strong><small>{registration.email} · {registration.studentId ? `Student ID ${registration.studentId}` : "Student ID assigned after approval"}</small></div></div>
        {rejected
          ? <button className="button button-dark" onClick={onEditRegistration} type="button"><ArrowLeft size={17} /> Back to registration form</button>
          : <button className="button button-dark" onClick={onRefresh} type="button">Check approval status <ArrowRight size={17} /></button>}
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ServiceCard({ service, index = 0 }) {
  const Icon = serviceIcons[service.icon] || FileText;
  return (
    <article className="service-card" style={{ "--card-index": index }}>
      <div className="service-card-top">
        <span className="service-icon"><Icon size={21} strokeWidth={1.8} /></span>
        <span className="service-department">{service.department}</span>
      </div>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <div className="service-card-bottom">
        <span className="processing-time"><Clock3 size={15} />{service.processingTime}</span>
        <Link aria-label={`View ${service.name}`} className="round-link" to={`/services/${service.id}`}>
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </article>
  );
}

// Home page introducing the portal and its featured student services.
function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker"><span className="live-dot" /> LIMKOKWING STUDENT SERVICES</span>
            <h1>Student services,<br /><span>made simple.</span></h1>

            <p className="hero-description">
              Less time in queues. More time for what matters. Request the university services
              you need, all in one place.
            </p>

            <div className="hero-actions">
              <Link className="button button-dark" to="/services">Explore services <ArrowRight size={17} /></Link>
              <Link className="button button-light" to="/requests">Track a request</Link>
            </div>

            <div className="hero-assurance">
              <span><ShieldCheck size={16} /> Secure & private</span>
              <span><Clock3 size={16} /> Available 24/7</span>
            </div>
            
          </div>
          <div className="hero-art" aria-label="Illustration of the student service portal">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-sun"><Sparkles size={22} /></div>
            <div className="art-sheet">
              <div className="art-sheet-top"><span className="art-mini-mark"><GraduationCap size={17} /></span><span>LIMKOKWING PORTAL</span><span className="art-dots">•••</span></div>

              <div className="art-sheet-title">
                What can we<br />help you with?
                </div>

              <div className="art-service-row"><span className="art-row-icon art-icon-blue"><FileText size={17} /></span><span><b>Academic transcript</b><small>REGISTRY</small></span><ArrowUpRight size={16} /></div>
              <div className="art-service-row"><span className="art-row-icon art-icon-orange"><CreditCard size={17} /></span><span><b>Student ID replacement</b><small>Student Affairs</small></span><ArrowUpRight size={16} /></div>
              <div className="art-status"><span className="status-check"><Check size={13} /></span><span><b>Request received</b><small>You're all set — we'll take it from here.</small></span></div>
            </div>
            <div className="art-note"><span className="note-icon"><Headphones size={17} /></span><span><b>We're here to help</b><small>Every step of the way</small></span></div>
            <span className="art-sparkle sparkle-a">✳</span>
            <span className="art-sparkle sparkle-b">✳</span>
          </div>
        </div>
        <div className="hero-bottom">
          <span>MADE FOR YOUR CAMPUS LIFE</span>
          <span className="hero-bottom-line" />
          <span>LIMKOKWING UNIVERSITY <ArrowDownRight size={14} /></span>
        </div>
      </section>

      <section className="home-services content-section">
        <SectionHeading
          action={<Link className="text-link" to="/services">All services <ArrowRight size={16} /></Link>}
          description="From the everyday essentials to a helping hand, find the support you need."
          eyebrow="HOW CAN WE HELP?"
          title={<>A little help goes<br />a long way.</>}
        />
        <div className="services-grid">
          {services.slice(0, 3).map((service, index) => <ServiceCard index={index} key={service.id} service={service} />)}
        </div>
        <div className="home-cta-strip">
          <div className="cta-emblem"><TicketCheck size={22} /></div>
          <div><strong>Need a hand with something else?</strong><span>We're just a few clicks away.</span></div>
          <Link to="/services">Find your service <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="how-section">
        <div className="how-inner">
          <div className="how-copy">
            <span className="eyebrow eyebrow-light">THE EASY WAY</span>
            <h2>Three steps.<br />That's all it takes.</h2>
            <p>Skip the paperwork and get back to the things you came here to do.</p>
            <Link className="how-link" to="/services">Get started <ArrowRight size={16} /></Link>
          </div>
          <div className="steps-list">
            <div className="step-item"><span className="step-number">01</span><div><h3>Find your service</h3><p>Browse what's available and choose what you need.</p></div><Search size={20} /></div>
            <div className="step-item"><span className="step-number">02</span><div><h3>Tell us a little more</h3><p>Fill in a short form so we can get right to it.</p></div><FileText size={20} /></div>
            <div className="step-item"><span className="step-number">03</span><div><h3>We'll take it from here</h3><p>Keep an eye on your request as it moves along.</p></div><CheckCircle2 size={20} /></div>
          </div>
        </div>
      </section>
    </>
  );
}

function ProfileDetail({ label, value }) {
  return (
    <div className="student-profile-detail">
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}

// Profile page displaying the approved student's saved details.
function StudentProfilePage() {
  const { registration, user } = usePortalAuth();
  const studentName = registration?.displayName
    || `${registration?.firstName || ""} ${registration?.surname || ""}`.trim()
    || user?.displayName
    || "Student";
  const initials = studentName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <section className="page-section student-profile-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Back to home</Link>
      <header className="student-profile-header">
        <span aria-hidden="true" className="student-profile-avatar">{initials}</span>
        <div>
          <span className="eyebrow">YOUR PROFILE</span>
          <h1>{studentName}</h1>
          <p>Approved student account · Student ID {registration?.studentId || "Not assigned"}</p>
        </div>
        <span className="student-profile-status"><CheckCircle2 size={16} /> Portal access approved</span>
      </header>

      <div className="student-profile-grid">
        <section aria-labelledby="student-profile-academic" className="student-profile-panel">
          <div className="student-profile-panel-heading">
            <GraduationCap size={20} />
            <div><h2 id="student-profile-academic">Academic details</h2><p>Your approved university record.</p></div>
          </div>
          <dl className="student-profile-details">
            <ProfileDetail label="Student ID" value={registration?.studentId} />
            <ProfileDetail label="Faculty" value={registration?.faculty} />
            <ProfileDetail label="Course / programme" value={registration?.course} />
            <ProfileDetail label="Study level" value={registration?.level} />
            <ProfileDetail label="Fee sponsor" value={registration?.sponsorDetails
              ? `${registration.sponsorship} · ${registration.sponsorDetails}`
              : registration?.sponsorship} />
            <ProfileDetail label="Gender" value={registration?.gender} />
            {registration?.residence && <ProfileDetail label="Residence" value={registration.residence} />}
          </dl>
        </section>

        <section aria-labelledby="student-profile-contact" className="student-profile-panel">
          <div className="student-profile-panel-heading">
            <UserRound size={20} />
            <div><h2 id="student-profile-contact">Contact details</h2><p>Information linked to your verified account.</p></div>
          </div>
          <dl className="student-profile-details">
            <ProfileDetail label="Google account" value={registration?.email || user?.email} />
            <ProfileDetail label="Phone number" value={registration?.phoneNumber} />
            <ProfileDetail label="Address" value={registration?.address} />
          </dl>
        </section>

        <section aria-labelledby="student-profile-kin" className="student-profile-panel">
          <div className="student-profile-panel-heading">
            <UsersRound size={20} />
            <div><h2 id="student-profile-kin">Next of kin</h2><p>Your emergency contact on file.</p></div>
          </div>
          <dl className="student-profile-details">
            <ProfileDetail label="Name" value={registration?.kinName} />
            <ProfileDetail label="Relationship" value={registration?.kinRelationship} />
            <ProfileDetail label="Phone number" value={registration?.kinPhoneNumber} />
          </dl>
        </section>
      </div>
      <p className="student-profile-note"><ShieldCheck size={16} /> These details are the approved registration record used to verify your requests. Contact the Registry if you need to correct them.</p>
    </section>
  );
}

// Services page listing support available through the portal.
function ServicesPage() {
  const [search, setSearch] = useState("");
  const filteredServices = useMemo(() => services.filter((service) => (
    `${service.name} ${service.description} ${service.department}`.toLowerCase().includes(search.trim().toLowerCase())
  )), [search]);

  return (
    <section className="page-section">
      <div className="page-intro">
        <span className="eyebrow">HERE FOR YOU</span>
        <h1>What do you need<br /><span>a hand with?</span></h1>
        <p>Explore student services and find the right support for your next step.</p>
      </div>
      <div className="service-toolbar">
        <span>{filteredServices.length} services to make campus life easier</span>
        <label className="search-field">
          <Search size={17} />
          <input aria-label="Search services" onChange={(event) => setSearch(event.target.value)} placeholder="Search services..." value={search} />
        </label>
      </div>
      {filteredServices.length ? (
        <div className="services-grid services-grid-wide">
          {filteredServices.map((service, index) => <ServiceCard index={index} key={service.id} service={service} />)}
        </div>
      ) : (
        <div className="empty-panel"><CircleHelp size={25} /><h2>No services found</h2><p>Try a different search or browse all available services.</p><button className="text-button" onClick={() => setSearch("")} type="button">Clear search</button></div>
      )}
      <div className="page-help"><span className="help-mark"><MessageCircle size={18} /></span><p><strong>Can't find what you're looking for?</strong><br />Send us a general enquiry and our team will point you in the right direction.</p><Link to="/request/enquiry">Ask us <ArrowRight size={15} /></Link></div>
    </section>
  );
}

// Service details page describing one selected service.
function ServiceDetailsPage() {
  const { id } = useParams();
  const service = services.find((item) => item.id === id);
  if (!service) return <NotFoundPage />;
  const Icon = serviceIcons[service.icon] || FileText;

  return (
    <section className="page-section narrow-page">
      <Link className="back-link" to="/services"><ArrowLeft size={16} /> All services</Link>
      <article className="details-panel">
        <div className="details-banner"><span className="details-icon"><Icon size={25} /></span><span className="details-department">{service.department}</span></div>
        <span className="eyebrow">SERVICE OVERVIEW</span>
        <h1>{service.name}</h1>
        <p className="details-description">{service.description}</p>
        <div className="details-facts">
          <div><span className="fact-icon"><Clock3 size={17} /></span><span><small>ESTIMATED PROCESSING</small><strong>{service.processingTime}</strong></span></div>
          <div><span className="fact-icon"><ShieldCheck size={17} /></span><span><small>HANDLED BY</small><strong>{service.department}</strong></span></div>
        </div>
        <div className="details-note"><Sparkles size={17} /><p>Have your student details ready so our team can help you as quickly as possible.</p></div>
        <Link className="button button-dark" to={`/request/${service.id}`}>Start this request <ArrowRight size={17} /></Link>
      </article>
    </section>
  );
}

// Request page for submitting a service request.
function RequestFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { registration, user } = usePortalAuth();
  const selectedService = services.find((service) => service.id === id);
  const [form, setForm] = useState({
    studentName: registration?.displayName || user?.displayName || "",
    studentId: registration?.studentId || "",
    email: user?.email || "",
    serviceId: selectedService?.id || "",
    course: registration?.course || "",
    description: "",
    paymentMethod: "",
    requestDate: new Date().toLocaleDateString("en-CA"),
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id && !selectedService) navigate("/services", { replace: true });
  }, [id, navigate, selectedService]);

  function handleChange(event) {
    const { name } = event.target;
    const rawValue = event.target.value;
    const value = sanitizeRegistrationInput(name, rawValue);
    const filterMessage = rawValue === value ? "" : getRegistrationInputFilterMessage(name);
    setErrors((current) => ({ ...current, [name]: filterMessage }));
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "serviceId" && value !== "student-id" ? { paymentMethod: "" } : {}),
    }));
    setSubmitError("");
  }

  function validate() {
    const nextErrors = {};
    if (!services.some((service) => service.id === form.serviceId)) nextErrors.serviceId = "Please choose a service.";
    if (form.serviceId === "transcript") {
      const courseError = validateCourse(form.course || registration?.course || "");
      if (courseError) nextErrors.course = courseError;
    }
    if (form.description.trim().length < 10) nextErrors.description = "Please add at least 10 characters so we can help.";
    if (
      form.serviceId === "student-id"
      && !ID_REPLACEMENT_PAYMENT_METHODS.includes(form.paymentMethod)
    ) {
      nextErrors.paymentMethod = "Choose payment method to continue.";
    }
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    setSubmitError("");
    const service = services.find((item) => item.id === form.serviceId);
    const submittedRequest = {
      studentName: form.studentName.trim(),
      studentId: form.studentId.trim(),
      email: form.email.trim(),
      serviceId: service.id,
      serviceName: service.name,
      department: service.department,
      description: form.description.trim(),
      requestDate: form.requestDate,
      ...(service.id === "transcript" ? { course: (form.course || registration?.course || "").trim() } : {}),
      ...(service.id === "student-id" ? {
        paymentMethod: form.paymentMethod,
        paymentAmount: ID_REPLACEMENT_DEMO_FEE_MALOTI,
        paymentStatus: ID_REPLACEMENT_DEMO_PAYMENT_STATUS,
      } : {}),
    };

    try {
      const requestId = await createRequest(submittedRequest);
      setForm((current) => ({
        ...current,
        serviceId: "",
        description: "",
        paymentMethod: "",
        requestDate: new Date().toLocaleDateString("en-CA"),
      }));
      setErrors({});
      navigate("/confirmation", { state: { request: { ...submittedRequest, id: requestId, status: "Pending" } } });
    } catch (error) {
      setSubmitError(error.message || "We couldn’t submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (id && !selectedService) return null;

  return (
    <section className="page-section narrow-page request-page">
      <Link className="back-link" to={selectedService ? `/services/${selectedService.id}` : "/services"}><ArrowLeft size={16} /> {selectedService ? "Back to service" : "All services"}</Link>
      <div className="form-page-heading">
        <span className="eyebrow">LET'S GET STARTED</span>
        <h1>Make a request<span>.</span></h1>
        <p>A few details and we'll get the right people on it.</p>
      </div>
      <form className="request-form" noValidate onSubmit={handleSubmit}>
        <div className="form-section-title"><span>01</span><div><h2>Your details</h2><p>So we know who we're helping.</p></div></div>
        <div className="form-grid">
          <FormField error={errors.studentName} htmlFor="studentName" label="Full name">
            <input autoComplete="name" id="studentName" readOnly value={form.studentName} />
          </FormField>
          <FormField error={errors.studentId} htmlFor="studentId" label="Student ID">
            <input autoComplete="off" id="studentId" readOnly value={form.studentId} />
          </FormField>
          <FormField error={errors.email} htmlFor="email" label="Student email">
            <input autoComplete="email" id="email" readOnly type="email" value={form.email} />
          </FormField>
          <FormField htmlFor="requestDate" label="Date of request" required={false}>
            <span className="input-with-icon"><CalendarDays size={16} /><input id="requestDate" readOnly value={form.requestDate} /></span>
          </FormField>
        </div>
        <div className="form-divider" />
        <div className="form-section-title"><span>02</span><div><h2>How can we help?</h2><p>Tell us what you need.</p></div></div>
        <FormField error={errors.serviceId} htmlFor="serviceId" label="Service">
          <span className="select-wrap"><select id="serviceId" name="serviceId" onChange={handleChange} required value={form.serviceId}><option value="">Choose a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><ChevronDown size={16} /></span>
        </FormField>
        {form.serviceId === "student-id" && (
          <section aria-label="Student ID replacement payment" className="payment-prototype">
            <div className="payment-prototype-heading">
              <span><CreditCard size={19} /></span>
              <div><h3>Replacement fee</h3><p>M{ID_REPLACEMENT_DEMO_FEE_MALOTI}</p></div>
            </div>
            <FormField error={errors.paymentMethod} htmlFor="paymentMethod" label="Payment method">
              <span className="select-wrap">
                <select id="paymentMethod" name="paymentMethod" onChange={handleChange} required value={form.paymentMethod}>
                  <option value="">Choose a payment method</option>
                  {ID_REPLACEMENT_PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
                <ChevronDown size={16} />
              </span>
            </FormField>
            <p className="payment-prototype-note">
              THNK YOU
            </p>
          </section>
        )}
        {form.serviceId === "transcript" && !registration?.course && (
          <FormField error={errors.course} htmlFor="transcriptCourse" label="Course / programme">
            <input autoCapitalize="words" autoComplete="off" id="transcriptCourse" maxLength={35} name="course" onChange={handleChange} placeholder="e.g. Multimedia Engineering" required value={form.course} />
          </FormField>
        )}
        <FormField error={errors.description} htmlFor="description" label="Tell us a little more">
          <textarea id="description" maxLength={1000} name="description" onChange={handleChange} placeholder="Share any details that will help us understand your request..." required rows={5} value={form.description} />
          <span className="character-count">{form.description.length}/1000</span>
        </FormField>
        {submitError && <div className="form-alert" role="alert"><AlertCircle size={18} /><span>{submitError}</span></div>}
        <div className="form-submit-row">
          <span><ShieldCheck size={16} /> Your details stay private.</span>
          <button className="button button-dark" disabled={submitting} type="submit">{submitting ? "Sending request..." : form.serviceId === "student-id" ? "Submit demo request" : "Send my request"}<ArrowRight size={17} /></button>
        </div>
      </form>
    </section>
  );
}

function addFieldAccessibility(element, errorId, hasError) {
  if (!isValidElement(element)) return element;
  if (["input", "select", "textarea"].includes(element.type)) {
    return cloneElement(element, {
      "aria-invalid": hasError,
      "aria-describedby": hasError ? errorId : undefined,
      "aria-errormessage": hasError ? errorId : undefined,
    });
  }
  if (!element.props.children) return element;
  return cloneElement(element, {}, Children.map(element.props.children, (child) => (
    addFieldAccessibility(child, errorId, hasError)
  )));
}

function FormField({ children, error, htmlFor, label, required = true }) {
  const errorId = `${htmlFor}-error`;
  return (
    <div className={`form-field${error ? " field-invalid" : ""}`}>
      <label htmlFor={htmlFor}>{label}{required && <span aria-hidden="true">*</span>}</label>
      {Children.map(children, (child) => addFieldAccessibility(child, errorId, Boolean(error)))}
      {error && <small className="field-error" id={errorId} role="alert"><AlertCircle size={13} />{error}</small>}
    </div>
  );
}

// Confirmation page summarizing a submitted request.
function ConfirmationPage() {
  const location = useLocation();
  const request = location.state?.request;

  return (
    <section className="page-section narrow-page confirmation-page">
      <div className="confirmation-panel">
        <div className="confirmation-icon"><CheckCircle2 size={32} /></div>
        <span className="eyebrow">ALL SENT</span>
        <h1>We’ve got it<span>.</span></h1>
        <p className="confirmation-lede">Your request has been submitted successfully. Our team will take it from here.</p>
        {request && (
          <div className="confirmation-summary">
            <div><span>REQUEST</span><strong>{request.serviceName}</strong></div>
            <div><span>SUBMITTED BY</span><strong>{request.studentName} · {request.studentId}</strong></div>
            <div><span>REFERENCE</span><strong className="reference-code">{request.id}</strong></div>
            <div><span>STATUS</span><strong><i className="status-dot" /> Pending</strong></div>
            {request.paymentMethod && (
              <>
                <div><span>PAYMENT METHOD</span><strong>{request.paymentMethod}</strong></div>
                <div><span>PAID FEE</span><strong>M{request.paymentAmount} </strong></div>
              </>
            )}
          </div>
        )}
        {!request && <div className="confirmation-info"><ShieldCheck size={18} /><span>You can view the status of your requests any time from your requests page.</span></div>}
        <div className="confirmation-actions">
          <Link className="button button-dark" to="/requests">View my requests <ArrowRight size={16} /></Link>
          <Link className="text-link" to="/services">Explore more services</Link>
        </div>
      </div>
    </section>
  );
}

// Requests page where students track their submitted requests.
function RequestsPage() {
  const { registration } = usePortalAuth();
  const { activityRecords } = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe;
    listenToRequests(
      (items) => {
        if (active) {
          setRequests(items);
          setLoading(false);
          setLoadError("");
        }
      },
      (error) => {
        if (active) {
          setLoadError(error.message || "We couldn't load your requests.");
          setLoading(false);
        }
      },
    ).then((stopListening) => {
      if (active) unsubscribe = stopListening;
      else stopListening();
    }).catch((error) => {
      if (active) {
        setLoadError(error.message || "We couldn't load your requests.");
        setLoading(false);
      }
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function removeRequest(request) {
    if (!window.confirm(`Delete your ${request.serviceName} request? This can't be undone.`)) return;
    setActionError("");
    try {
      await deleteRequest(request.id);
    } catch (error) {
      setActionError(error.message || "We couldn't delete this request.");
    }
  }

  function downloadLetter(request) {
    setActionError("");
    try {
      downloadRecommendationLetter({
        faculty: registration?.faculty,
        studentId: registration?.studentId || request.studentId,
        studentName: registration?.displayName || request.studentName,
      });
    } catch (error) {
      setActionError(error.message || "The approved recommendation letter could not be created.");
    }
  }

  function downloadApprovedTranscript(request) {
    setActionError("");
    try {
      downloadTranscript({
        course: request.course || registration?.course,
        studentId: registration?.studentId || request.studentId,
        studentName: registration?.displayName || request.studentName,
      });
    } catch (error) {
      setActionError(error.message || "The sample transcript could not be created.");
    }
  }

  return (
    <section className="page-section requests-page">
      <div className="page-intro requests-intro">
        <span className="eyebrow">YOUR REQUESTS</span>
        <h1>We're on it<span>.</span></h1>
        <p>Keep up with the little things we're taking care of for you.</p>
      </div>
      {actionError && <div className="form-alert requests-alert" role="alert"><AlertCircle size={18} />{actionError}</div>}
      {loading ? <div className="loading-panel"><span className="loading-spinner" /> Loading your requests...</div> : null}
      {!loading && loadError && <div className="empty-panel error-panel"><AlertCircle size={24} /><h2>We couldn't load your requests</h2><p>{loadError}</p><Link className="button button-dark" to="/services">Browse services <ArrowRight size={16} /></Link></div>}
      {!loading && !loadError && requests.length === 0 && (
        <div className="empty-panel"><span className="empty-icon"><FileText size={25} /></span><h2>Nothing on your plate. Yet.</h2><p>When you send in a request, you’ll find it here.</p><Link className="button button-dark" to="/services">Find a service <ArrowRight size={16} /></Link></div>
      )}
      {!loading && !loadError && requests.length > 0 && (
        <div className="requests-list">
          <div className="requests-list-heading"><span>{requests.length} {requests.length === 1 ? "request" : "requests"}</span><span>Only university staff can update request statuses.</span></div>
          {requests.map((request) => (
            <article className="request-card" key={request.id}>
              <div className="request-card-icon"><FileText size={20} /></div>
              <div className="request-card-main">
                <span className="request-department">{request.department}</span>
                <h2>{request.serviceName}</h2>
                <p>{request.description}</p>
                <div className="request-meta"><span><CalendarDays size={14} /> {request.requestDate}</span><span>Ref. {request.id}</span></div>
                {request.paymentMethod && (
                  <p className="request-payment-summary">
                    Payment: {request.paymentMethod} · M{request.paymentAmount} 
                  </p>
                )}
                <ol aria-label={`Timeline for ${request.serviceName}`} className="request-timeline">
                  {getRequestTimeline(request, activityRecords).map((activity) => (
                    <li className="request-timeline-event" key={activity.id}>
                      <span aria-hidden="true" className={`request-timeline-marker${activity.newStatus === request.status ? " request-timeline-marker-current" : ""}`} />
                      <div>
                        <strong>{activity.activityType === "request-submitted"
                          ? "Request submitted"
                          : activity.activityType === "legacy-status"
                            ? `Current status: ${activity.newStatus}`
                            : `Status updated to ${activity.newStatus}`}</strong>
                        <span>{activity.activityType === "request-submitted"
                          ? "Submitted by you"
                          : activity.activityType === "legacy-status"
                            ? "Earlier status history is unavailable"
                            : "Updated by university staff"}</span>
                        <time dateTime={getActivityDateTime(activity.createdAt) || undefined}>
                          {formatActivityDate(activity.createdAt)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
                {request.serviceId === "recommendation" && request.status === "Approved" && (
                  <button className="download-letter-button" onClick={() => downloadLetter(request)} type="button">
                    <Download size={16} /> Download approved A4 letter (PDF)
                  </button>
                )}
                {request.serviceId === "transcript" && request.status === "Approved" && (
                  <button className="download-letter-button" onClick={() => downloadApprovedTranscript(request)} type="button">
                    <Download size={16} /> Download transcript (PDF)
                  </button>
                )}
              </div>
              <div className="request-card-controls">
                <span className={`status-pill status-${request.status.toLowerCase().replace(" ", "-")}`}><i className="status-dot" />{request.status}</span>
                {request.status === "Pending" && <button aria-label={`Delete ${request.serviceName} request`} className="delete-button" onClick={() => removeRequest(request)} type="button"><Trash2 size={16} /></button>}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="requests-footnote"><ShieldCheck size={16} /> Your Google account keeps your requests private. University staff will review each submission.</div>
    </section>
  );
}

// Admin password gate shown before opening the staff workspace.
function AdminPasswordGate({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!verifyAdminPassword(password)) {
      setError("Incorrect admin password.");
      return;
    }
    setError("");
    onUnlock();
  }

  return (
    <section className="admin-auth-page">
      <div className="access-panel admin-auth-panel">
        <span className="access-icon"><ShieldCheck size={25} /></span>
        <span className="eyebrow">ADMIN SECURITY CHECK</span>
        <h1>University admin access<span>.</span></h1>
        <p>Only the approved university administrator can access this portal. Enter the admin password to continue.</p>
        <form className="registration-form" noValidate onSubmit={handleSubmit}>
          <FormField error={error} htmlFor="adminPassword" label="Admin password">
            <input
              autoComplete="current-password"
              id="adminPassword"
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="Enter YOUR password"
              required
              type="password"
              value={password}
            />
          </FormField>
          {error && <div className="form-alert" role="alert"><AlertCircle size={18} />{error}</div>}
          <button className="button button-dark" type="submit">Unlock admin PG <ArrowRight size={17} /></button>
        </form>
      </div>
    </section>
  );
}

// Admin page for reviewing registrations and managing student requests.
function AdminPage() {
  const { isAdmin } = usePortalAuth();
  const [registrations, setRegistrations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activityRecords, setActivityRecords] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [registrationView, setRegistrationView] = useState("Pending");
  const [requestView, setRequestView] = useState("All");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFaculty, setStudentFaculty] = useState("");
  const [studentLevel, setStudentLevel] = useState("");
  const [studentSort, setStudentSort] = useState("name");
  const [workspaceView, setWorkspaceView] = useState("overview");
  const [requestSearch, setRequestSearch] = useState("");
  const [studentToRemove, setStudentToRemove] = useState(null);
  const [removalPassword, setRemovalPassword] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [removalBusy, setRemovalBusy] = useState(false);
  const [removalNotice, setRemovalNotice] = useState("");

  useEffect(() => {
    if (!isAdmin) return undefined;
    try {
      return listenToAdminQueue(
        (items) => {
          setRegistrations(items);
          setLoading(false);
          setLoadError("");
        },
        (items) => {
          setRequests(items);
          setLoading(false);
          setLoadError("");
        },
        (error) => {
          setLoadError(error.message || "The admin queues could not be loaded.");
          setLoading(false);
        },
      );
    } catch (error) {
      setLoadError(error.message || "The admin queues could not be loaded.");
      setLoading(false);
      return undefined;
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    try {
      return listenToAdminActivity(
        (items) => {
          setActivityRecords(items);
          setActivityLoading(false);
          setActivityError("");
        },
        (error) => {
          setActivityError(error.message || "Decision history could not be loaded.");
          setActivityLoading(false);
        },
      );
    } catch (error) {
      setActivityError(error.message || "Decision history could not be loaded.");
      setActivityLoading(false);
      return undefined;
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <AccessMessage message="This account does not have administration access." title="Admin access required" />;
  }

  async function reviewRegistration(registration, status) {
    setBusyId(registration.id);
    setActionError("");
    try {
      await updateRegistrationStatus(registration.id, status);
    } catch (error) {
      setActionError(error.message || "The registration decision could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  async function reviewRequest(request, status) {
    setBusyId(request.id);
    setActionError("");
    try {
      await updateRequestStatus(request.id, status);
    } catch (error) {
      setActionError(error.message || "The request decision could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  function openStudentRemoval(registration) {
    setStudentToRemove(registration);
    setRemovalPassword("");
    setRemovalError("");
    setRemovalNotice("");
  }

  function closeStudentRemoval() {
    if (removalBusy) return;
    setStudentToRemove(null);
    setRemovalPassword("");
    setRemovalError("");
  }

  async function confirmStudentRemoval(event) {
    event.preventDefault();
    if (!studentToRemove) return;
    if (!verifyStudentRemovalPassword(removalPassword)) {
      setRemovalError("The administrator password is incorrect.");
      return;
    }

    setRemovalBusy(true);
    setRemovalError("");
    try {
      await deleteStudentFromPortal(studentToRemove.id);
      setRemovalNotice(`${studentToRemove.displayName || studentToRemove.email || "Student"} was removed. They must register again before accessing the portal.`);
      setStudentToRemove(null);
      setRemovalPassword("");
    } catch (error) {
      setRemovalError(error.message || "The student could not be removed.");
    } finally {
      setRemovalBusy(false);
    }
  }

  const pendingRegistrations = registrations.filter((registration) => registration.status === "Pending");
  const pendingRequests = requests.filter((request) => request.status === "Pending");
  const activeRequests = requests.filter((request) => !["Completed", "Rejected"].includes(request.status));
  const visibleRegistrations = registrationView === "Pending" ? pendingRegistrations : registrations;
  const selectedRequestServiceId = {
    technical: "technical",
    recommendations: "recommendation",
    idReplacement: "student-id",
  }[workspaceView];
  const requestViewSource = requestView === "Pending" ? pendingRequests : requests;
  const visibleRequests = requestViewSource
    .filter((request) => !selectedRequestServiceId || request.serviceId === selectedRequestServiceId)
    .filter((request) => (
      `${request.studentName || ""} ${request.email || ""} ${request.studentId || ""} ${request.serviceName || ""} ${request.description || ""}`
        .toLowerCase().includes(requestSearch.trim().toLowerCase())
    ));
  const activeRequestService = services.find((service) => service.id === selectedRequestServiceId);
  const pendingRequestCount = (serviceId) => pendingRequests.filter((request) => request.serviceId === serviceId).length;
  const adminDecisions = activityRecords.filter((activity) => (
    ["request-status-changed", "registration-status-changed", "student-removed"].includes(activity.activityType)
  ));
  const requestViewHeading = activeRequestService?.name || "All service requests";
  const requestViewDescription = activeRequestService
    ? `Review and update student ${activeRequestService.name.toLowerCase()} requests.`
    : "Review student requests across every campus service.";
  const visibleStudents = registrations
    .filter((student) => (
      (!studentFaculty || student.faculty === studentFaculty)
      && (!studentLevel || student.level === studentLevel)
      && `${student.displayName || ""} ${student.email || ""} ${student.studentId || ""}`
        .toLowerCase().includes(studentSearch.trim().toLowerCase())
    ))
    .sort((first, second) => {
      if (studentSort === "faculty") {
        return (first.faculty || "").localeCompare(second.faculty || "")
          || (first.level || "").localeCompare(second.level || "")
          || (first.displayName || "").localeCompare(second.displayName || "");
      }
      if (studentSort === "level") {
        return (first.level || "").localeCompare(second.level || "")
          || (first.faculty || "").localeCompare(second.faculty || "")
          || (first.displayName || "").localeCompare(second.displayName || "");
      }
      return (first.displayName || "").localeCompare(second.displayName || "");
    });

  return (
    <div className="admin-dashboard">
      <section className="admin-welcome">
        <div className="admin-welcome-copy">
          <span className="admin-kicker"><ShieldCheck size={14} /> LIMKOKWING UNIVERSITY OPERATIONS</span>
          <h1>Good work starts<br />with a clear overview<span>.</span></h1>
          <p>Review student registrations, manage service requests, and keep campus support moving.</p>
        </div>
        <div className="admin-welcome-side">
          <span className="admin-date-label">TODAY</span>
          <strong>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</strong>
          <span className="admin-sync"><i /> Live queue updates enabled</span>
        </div>
        <div className="admin-welcome-decoration" aria-hidden="true"><GraduationCap size={136} strokeWidth={0.8} /></div>
      </section>

      <section aria-label="Administration overview" className="admin-metrics">
        <article className="admin-metric metric-attention">
          <span className="admin-metric-icon"><UsersRound size={19} /></span>
          <div><small>STUDENT APPLICATIONS</small><strong>{pendingRegistrations.length}</strong><span>awaiting review</span></div>
          <span className="admin-metric-mark">01</span>
        </article>
        <article className="admin-metric metric-requests">
          <span className="admin-metric-icon"><FileText size={19} /></span>
          <div><small>NEW REQUESTS</small><strong>{pendingRequests.length}</strong><span>need a decision</span></div>
          <span className="admin-metric-mark">02</span>
        </article>
        <article className="admin-metric metric-active">
          <span className="admin-metric-icon"><Clock3 size={19} /></span>
          <div><small>ACTIVE CASES</small><strong>{activeRequests.length}</strong><span>in the service queue</span></div>
          <span className="admin-metric-mark">03</span>
        </article>
        <article className="admin-metric metric-total">
          <span className="admin-metric-icon"><CheckCircle2 size={19} /></span>
          <div><small>REGISTERED STUDENTS</small><strong>{registrations.filter((registration) => registration.status === "Approved").length}</strong><span>approved for access</span></div>
          <span className="admin-metric-mark">04</span>
        </article>
      </section>

      <nav aria-label="Administration pages" className="admin-page-navigation">
        <button aria-current={workspaceView === "overview" ? "page" : undefined} onClick={() => setWorkspaceView("overview")} type="button">Overview</button>
        <button aria-current={workspaceView === "students" ? "page" : undefined} onClick={() => setWorkspaceView("students")} type="button">Registered students <span>{registrations.filter((registration) => registration.status === "Approved").length}</span></button>
        <button aria-current={workspaceView === "registrations" ? "page" : undefined} onClick={() => setWorkspaceView("registrations")} type="button">Registration review <span>{pendingRegistrations.length}</span></button>
        <button aria-current={workspaceView === "requests" ? "page" : undefined} onClick={() => setWorkspaceView("requests")} type="button">All requests <span>{requests.length}</span></button>
        <button aria-current={workspaceView === "technical" ? "page" : undefined} onClick={() => setWorkspaceView("technical")} type="button">Technical issues <span>{pendingRequestCount("technical")}</span></button>
        <button aria-current={workspaceView === "recommendations" ? "page" : undefined} onClick={() => setWorkspaceView("recommendations")} type="button">Recommendation letters <span>{pendingRequestCount("recommendation")}</span></button>
        <button aria-current={workspaceView === "idReplacement" ? "page" : undefined} onClick={() => setWorkspaceView("idReplacement")} type="button">ID replacement <span>{pendingRequestCount("student-id")}</span></button>
        <button aria-current={workspaceView === "activity" ? "page" : undefined} onClick={() => setWorkspaceView("activity")} type="button">Decision history <span>{adminDecisions.length}</span></button>
      </nav>

      {actionError && <div className="admin-alert" role="alert"><AlertCircle size={18} />{actionError}</div>}
      {loadError && <div className="admin-alert" role="alert"><AlertCircle size={18} />{loadError}</div>}
      {removalNotice && <div className="admin-removal-notice" role="status">{removalNotice}</div>}
      {loading && <div className="admin-loading"><span className="loading-spinner" /> Loading live administration queues...</div>}

      {!loading && !loadError && (
        <>
          {workspaceView === "students" && <section aria-label="Student directory" className="admin-panel admin-directory">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon"><UsersRound size={20} /></span>
              <div><span className="admin-panel-overline">STUDENT RECORDS</span><h2>Student directory</h2><p>View all registered students and organize them by faculty or study level.</p></div>
              <span className="admin-count">{registrations.length} students</span>
            </div>
            <div className="admin-directory-filters">
              <label>
                Search students
                <input aria-label="Search students" onChange={(event) => setStudentSearch(event.target.value)} placeholder="Name, email, or student ID" value={studentSearch} />
              </label>
              <label>
                Faculty
                <span className="select-wrap">
                  <select aria-label="Filter students by faculty" onChange={(event) => setStudentFaculty(event.target.value)} value={studentFaculty}>
                    <option value="">All faculties</option>
                    {STUDENT_FACULTIES.map((faculty) => <option key={faculty} value={faculty}>{faculty}</option>)}
                  </select>
                  <ChevronDown size={14} />
                </span>
              </label>
              <label>
                Study level
                <span className="select-wrap">
                  <select aria-label="Filter students by study level" onChange={(event) => setStudentLevel(event.target.value)} value={studentLevel}>
                    <option value="">All levels</option>
                    {STUDENT_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                  <ChevronDown size={14} />
                </span>
              </label>
              <label>
                Sort by
                <span className="select-wrap">
                  <select aria-label="Sort students by" onChange={(event) => setStudentSort(event.target.value)} value={studentSort}>
                    <option value="name">Name</option>
                    <option value="faculty">Faculty</option>
                    <option value="level">Study level</option>
                  </select>
                  <ChevronDown size={14} />
                </span>
              </label>
            </div>
            <div className="admin-directory-list">
              {visibleStudents.length === 0
                ? <div className="admin-empty-state"><span><UsersRound size={19} /></span><strong>No matching students</strong><p>Try changing the search, faculty, or study-level filters.</p></div>
                : visibleStudents.map((student) => (
                  <article className="admin-directory-row" key={student.id}>
                    <span className="admin-record-avatar">{(student.displayName || student.email || "S").charAt(0).toUpperCase()}</span>
                    <div className="admin-directory-student">
                      <div className="admin-record-title">
                        <h3>{student.displayName || "Student name unavailable"}</h3>
                        <span className={`admin-status status-${student.status.toLowerCase()}`}><i />{student.status}</span>
                      </div>
                      <p>{student.email}</p>
                      <div className="admin-directory-meta">
                        <span><strong>Student ID</strong>{student.studentId || "Not assigned"}</span>
                        <span><strong>Faculty</strong>{student.faculty || "Not selected"}</span>
                        <span><strong>Course / programme</strong>{student.course || "Not provided"}</span>
                        <span><strong>Study level</strong>{student.level || "Not selected"}</span>
                      </div>
                    </div>
                    <button
                      className="admin-delete-student"
                      disabled={removalBusy}
                      onClick={() => openStudentRemoval(student)}
                      type="button"
                    >
                      <Trash2 size={15} />Remove student
                    </button>
                  </article>
                ))}
            </div>
          </section>}

          <div className={`admin-workspace${workspaceView === "overview" ? "" : " admin-workspace-single"}`}>
          {(workspaceView === "overview" || workspaceView === "registrations") && <section className="admin-panel">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon"><UsersRound size={20} /></span>
              <div><span className="admin-panel-overline">ACCESS CONTROL</span><h2>Student registrations</h2><p>Verify student details and approve portal access.</p></div>
              <span className="admin-count">{pendingRegistrations.length} pending</span>
            </div>
            <div className="admin-panel-toolbar">
              <span>{registrationView === "Pending" ? "Needs your attention" : "Complete registration history"}</span>
              <div className="admin-filter" aria-label="Filter registrations">
                {["Pending", "All"].map((view) => (
                  <button aria-pressed={registrationView === view} key={view} onClick={() => setRegistrationView(view)} type="button">{view}</button>
                ))}
              </div>
            </div>
            <div className="admin-record-list">
              {visibleRegistrations.length === 0
                ? <div className="admin-empty-state"><span><Check size={20} /></span><strong>{registrationView === "Pending" ? "All caught up" : "No registrations yet"}</strong><p>{registrationView === "Pending" ? "There are no student applications waiting for review." : "New student registrations will appear here."}</p></div>
                : visibleRegistrations.map((registration) => (
                  <article className="admin-record" key={registration.id}>
                    <span className="admin-record-avatar">{(registration.displayName || registration.email || "S").charAt(0).toUpperCase()}</span>
                    <div className="admin-record-main">
                      <div className="admin-record-title"><h3>{registration.displayName}</h3><span className={`admin-status status-${registration.status.toLowerCase()}`}><i />{registration.status}</span></div>
                      <p>{registration.email}</p>
                      <div className="admin-record-meta"><span>Student ID <strong>{registration.studentId || "Assigned after approval"}</strong></span><span>{formatDate(registration.createdAt)}</span></div>
                      {registration.faculty && (
                        <div className="admin-applicant-details">
                          <span><strong>Faculty</strong>{registration.faculty}</span>
                          <span><strong>Course / programme</strong>{registration.course || "Not provided"}</span>
                          <span><strong>Study level</strong>{registration.level}</span>
                          <span><strong>Gender</strong>{registration.gender}</span>
                          <span><strong>Fee sponsor</strong>{registration.sponsorship}{registration.sponsorDetails ? ` · ${registration.sponsorDetails}` : ""}</span>
                          {registration.residence && <span><strong>Residence</strong>{registration.residence}</span>}
                          <span><strong>Phone</strong>{registration.phoneNumber}</span>
                          <span><strong>Address</strong>{registration.address}</span>
                          <span><strong>Next of kin</strong>{registration.kinName} · {registration.kinRelationship} · {registration.kinPhoneNumber}</span>
                        </div>
                      )}
                    </div>
                    {registration.status === "Pending" && (
                      <div className="admin-record-actions">
                        <button className="admin-approve" disabled={busyId === registration.id} onClick={() => reviewRegistration(registration, "Approved")} type="button"><Check size={15} /> Approve</button>
                        <button className="admin-reject" disabled={busyId === registration.id} onClick={() => reviewRegistration(registration, "Rejected")} type="button">Reject</button>
                      </div>
                    )}
                  </article>
                ))}
            </div>
          </section>}

          {["overview", "requests", "technical", "recommendations", "idReplacement"].includes(workspaceView) && <section className="admin-panel admin-request-panel">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon request-panel-icon"><FileText size={20} /></span>
              <div><span className="admin-panel-overline">{activeRequestService?.department || "STUDENT SUPPORT"}</span><h2>{requestViewHeading}</h2><p>{requestViewDescription}</p></div>
              <span className="admin-count request-count">{visibleRequests.length} shown</span>
            </div>
            <div className="admin-panel-toolbar">
              <label className="admin-request-search">Search requests
                <input aria-label="Search service requests" onChange={(event) => setRequestSearch(event.target.value)} placeholder="Student, service, reference, or details" value={requestSearch} />
              </label>
              <div className="admin-filter" aria-label="Filter requests">
                {["Pending", "All"].map((view) => (
                  <button aria-pressed={requestView === view} key={view} onClick={() => setRequestView(view)} type="button">{view}</button>
                ))}
              </div>
            </div>
            <div className="admin-request-list">
              {visibleRequests.length === 0
                ? <div className="admin-empty-state"><span><FileText size={19} /></span><strong>No matching requests</strong><p>{requestView === "Pending" ? "There are no pending requests in this queue." : "Try another search or check a different request queue."}</p></div>
                : visibleRequests.map((request) => (
                  <article className="admin-request-card" key={request.id}>
                    <div className="admin-request-card-top">
                      <span className="admin-request-type"><FileText size={14} /> {request.department}</span>
                      <span className={`admin-status status-${request.status.toLowerCase().replace(" ", "-")}`}><i />{request.status}</span>
                    </div>
                    <h3>{request.serviceName}</h3>
                    <p className="admin-request-student">{request.studentName} <span>·</span> ID {request.studentId}</p>
                    <p className="admin-request-email">{request.email}</p>
                    <div className="admin-request-description">{request.description}</div>
                    {request.serviceId === "transcript" && request.course && (
                      <p className="admin-request-course">Course / programme: {request.course}</p>
                    )}
                    {request.paymentMethod && (
                      <p className="admin-request-payment">
                        Payment: {request.paymentMethod} · M{request.paymentAmount} 
                      </p>
                    )}
                    <div className="admin-request-card-bottom">
                      <span><CalendarDays size={14} /> {formatDate(request.createdAt)}</span>
                      <label>Update status
                        <span className="select-wrap compact-select">
                          <select
                            aria-label={`Set status for ${request.serviceName} request from ${request.studentName}`}
                            disabled={busyId === request.id}
                            onChange={(event) => reviewRequest(request, event.target.value)}
                            value={request.status}
                          >
                            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <ChevronDown size={14} />
                        </span>
                      </label>
                    </div>
                  </article>
                ))}
            </div>
          </section>}
          </div>
          {workspaceView === "activity" && (
            <section aria-label="Administrator decision history" className="admin-panel admin-activity-panel">
              <div className="admin-panel-heading">
                <span className="admin-panel-icon"><ClipboardList size={20} /></span>
                <div><span className="admin-panel-overline">ADMINISTRATIVE AUDIT</span><h2>Decision history</h2><p>Latest registration and request decisions, including who made each change.</p></div>
                <span className="admin-count">{adminDecisions.length} recent</span>
              </div>
              {activityError && <div className="admin-alert" role="alert"><AlertCircle size={18} />{activityError}</div>}
              {activityLoading && <div className="admin-loading"><span className="loading-spinner" /> Loading decision history...</div>}
              {!activityLoading && !activityError && adminDecisions.length === 0 && (
                <div className="admin-empty-state"><span><ClipboardList size={19} /></span><strong>No decisions recorded yet</strong><p>Administrator registration and request decisions will appear here.</p></div>
              )}
              {!activityLoading && !activityError && adminDecisions.length > 0 && (
                <ol className="admin-activity-list">
                  {adminDecisions.map((activity) => (
                    <li className="admin-activity-item" key={activity.id}>
                      <span className="admin-activity-icon">
                        {activity.targetType === "registration" ? <UsersRound size={17} /> : <FileText size={17} />}
                      </span>
                      <div className="admin-activity-content">
                        <strong>{activity.recordLabel || "Student record"}</strong>
                        <span>{activity.targetType === "registration" ? "Registration" : "Service request"}</span>
                        <p>{activity.previousStatus || "Active"} <ArrowRight size={14} /> {activity.newStatus}</p>
                        <small>By {activity.actorEmail || "Administrator"} · {formatActivityDate(activity.createdAt)}</small>
                      </div>
                      <code>{activity.targetId}</code>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
          {studentToRemove && (
            <div className="admin-modal-backdrop">
              <section aria-labelledby="student-removal-title" aria-modal="true" className="admin-removal-modal" role="dialog">
                <span className="admin-modal-icon"><Trash2 size={20} /></span>
                <h2 id="student-removal-title">Confirm student removal</h2>
                <p>Enter the administrator password to remove <strong>{studentToRemove.displayName || studentToRemove.email}</strong>. Their portal registration, requests, and allocated student ID will be deleted. They will need to register again to use the portal.</p>
                <form onSubmit={confirmStudentRemoval}>
                  <label htmlFor="studentRemovalPassword">Administrator password</label>
                  <input
                    autoComplete="current-password"
                    autoFocus
                    id="studentRemovalPassword"
                    onChange={(event) => {
                      setRemovalPassword(event.target.value);
                      setRemovalError("");
                    }}
                    required
                    type="password"
                    value={removalPassword}
                  />
                  {removalError && <p className="admin-removal-error" role="alert">{removalError}</p>}
                  <div className="admin-removal-actions">
                    <button className="admin-modal-cancel" disabled={removalBusy} onClick={closeStudentRemoval} type="button">Cancel</button>
                    <button className="admin-modal-confirm" disabled={removalBusy || !removalPassword} type="submit">
                      <Trash2 size={15} />{removalBusy ? "Removing student..." : "Confirm removal"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  return date ? date.toLocaleDateString() : "Just now";
}

function getRequestTimeline(request, activities) {
  const timeline = activities
    .filter((activity) => activity.targetType === "request" && activity.targetId === request.id)
    .sort((first, second) => (
      (first.createdAt?.toMillis?.() || 0) - (second.createdAt?.toMillis?.() || 0)
    ));

  if (timeline.length === 0) {
    timeline.push({
      activityType: "request-submitted",
      createdAt: request.createdAt,
      id: `${request.id}-submitted`,
      newStatus: "Pending",
    });
  }
  if (timeline[timeline.length - 1].newStatus !== request.status) {
    timeline.push({
      activityType: "legacy-status",
      createdAt: request.updatedAt,
      id: `${request.id}-current`,
      newStatus: request.status,
    });
  }
  return timeline;
}

function getActivityDateTime(timestamp) {
  const date = timestamp?.toDate?.();
  return date ? date.toISOString() : "";
}

function formatActivityDate(timestamp) {
  const date = timestamp?.toDate?.();
  return date ? date.toLocaleString() : "Date not available";
}

// Not-found page shown when the URL does not match a portal route.
function NotFoundPage() {
  return (
    <section className="page-section not-found-page">
      <span className="not-found-number">404</span>
      <span className="eyebrow">A LITTLE OFF TRACK</span>
      <h1>This page isn't<br />where it should be<span>.</span></h1>
      <p>Let's get you back to somewhere useful.</p>
      <Link className="button button-dark" to="/">Back to home <ArrowRight size={16} /></Link>
    </section>
  );
}

function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    registration: null,
    isAdmin: false,
    loading: true,
    error: "",
  });
  const profileLoadId = useRef(0);
  const registrationUnsubscribe = useRef(null);

  const loadProfile = useCallback(async (user) => {
    registrationUnsubscribe.current?.();
    registrationUnsubscribe.current = null;
    const loadId = profileLoadId.current + 1;
    profileLoadId.current = loadId;
    setState((current) => ({ ...current, user, loading: true, error: "" }));
    try {
      const profile = await getAccessProfile(user);
      if (profileLoadId.current === loadId) {
        setState({ user, ...profile, loading: false, error: "" });
        if (user && !profile.isAdmin) {
          registrationUnsubscribe.current = listenToStudentRegistration(
            user.uid,
            (registration) => {
              if (profileLoadId.current === loadId) {
                setState((current) => (
                  current.user?.uid === user.uid
                    ? { ...current, registration, loading: false, error: "" }
                    : current
                ));
              }
            },
            (error) => {
              if (profileLoadId.current === loadId) {
                setState((current) => (
                  current.user?.uid === user.uid
                    ? { ...current, registration: null, loading: false, error: getAuthErrorMessage(error) }
                    : current
                ));
              }
            },
          );
        }
      }
    } catch (error) {
      if (profileLoadId.current === loadId) {
        setState({ user, registration: null, isAdmin: false, loading: false, error: getAuthErrorMessage(error) });
      }
    }
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setState({ user: null, registration: null, isAdmin: false, loading: false, error: "" });
      return undefined;
    }
    const unsubscribeAuth = subscribeToAuthState(
      (user) => {
        if (user) {
          loadProfile(user);
        } else {
          registrationUnsubscribe.current?.();
          registrationUnsubscribe.current = null;
          profileLoadId.current += 1;
          setState({ user: null, registration: null, isAdmin: false, loading: false, error: "" });
        }
      },
      (error) => {
        registrationUnsubscribe.current?.();
        registrationUnsubscribe.current = null;
        setState({ user: null, registration: null, isAdmin: false, loading: false, error: getAuthErrorMessage(error) });
      },
    );
    return () => {
      profileLoadId.current += 1;
      if (typeof unsubscribeAuth === "function") unsubscribeAuth();
      registrationUnsubscribe.current?.();
      registrationUnsubscribe.current = null;
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(() => (
    state.user ? loadProfile(state.user) : Promise.resolve()
  ), [loadProfile, state.user]);

  return (
    <AuthContext.Provider value={{ ...state, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function Portal() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route element={<Layout />} path="/">
            <Route element={<Home />} index />
            <Route element={<StudentProfilePage />} path="profile" />
            <Route element={<ServicesPage />} path="services" />
            <Route element={<ServiceDetailsPage />} path="services/:id" />
            <Route element={<RequestFormPage />} path="request" />
            <Route element={<RequestFormPage />} path="request/:id" />
            <Route element={<ConfirmationPage />} path="confirmation" />
            <Route element={<RequestsPage />} path="requests" />
            <Route element={<AdminPage />} path="admin" />
            <Route element={<NotFoundPage />} path="*" />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
