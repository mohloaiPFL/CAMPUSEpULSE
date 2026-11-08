import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { services } from "./Data/Services";
import {
  createRequest,
  deleteRequest,
  listenToRequests,
  updateRequestStatus,
} from "./services/requestService";

const serviceIcons = {
  FileText,
  Award,
  ClipboardList,
  CreditCard,
  Monitor,
  MessageCircle,
};

const statuses = ["Pending", "In Progress", "Completed", "Rejected"];

function Brand({ compact = false }) {
  return (
    <Link className={`brand${compact ? " brand-compact" : ""}`} to="/" aria-label="Limkokwing University home">
      <span className="brand-mark"><GraduationCap size={24} strokeWidth={1.8} /></span>
      <span className="brand-copy">
        <strong>Limkokwing<span>.</span></strong>
        <small>CAMPUS PULSE</small>
      </span>
    </Link>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

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
          <NavLink end onClick={() => setMenuOpen(false)} to="/">Home</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/services">Services</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/requests">My requests</NavLink>
          <Link className="nav-cta" onClick={() => setMenuOpen(false)} to="/request">
            Make a request <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Brand compact />
        <p>Here for every step of your student journey.</p>
        <span>© {new Date().getFullYear()} Limkokwing University of Creative Technology</span>
      </div>
    </footer>
  );
}

function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content"><Outlet /></main>
      <Footer />
    </div>
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

function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker"><span className="live-dot" /> CAMPUS PULSE HUB</span>
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
              <div className="art-sheet-top"><span className="art-mini-mark"><GraduationCap size={17} /></span><span>STUDENT PORTAL</span><span className="art-dots">•••</span></div>
              <div className="art-sheet-title">What can we<br />help you with?</div>
              <div className="art-service-row"><span className="art-row-icon art-icon-blue"><FileText size={17} /></span><span><b>Academic transcript</b><small>REGISTRY</small></span><ArrowUpRight size={16} /></div>
              <div className="art-service-row"><span className="art-row-icon art-icon-orange"><CreditCard size={17} /></span><span><b>Student ID replacement</b><small>Student Affairs</small></span><ArrowUpRight size={16} /></div>
              <div className="art-status"><span className="status-check"><Check size={13} /></span><span><b>Request received</b><small>You’re all set — we’ll take it from here.</small></span></div>
            </div>
            <div className="art-note"><span className="note-icon"><Headphones size={17} /></span><span><b>We’re here to help</b><small>Every step of the way</small></span></div>
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
          <div><strong>Need a hand with something else?</strong><span>We’re just a few clicks away.</span></div>
          <Link to="/services">Find your service <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="how-section">
        <div className="how-inner">
          <div className="how-copy">
            <span className="eyebrow eyebrow-light">THE EASY WAY</span>
            <h2>Three steps.<br />That’s all it takes.</h2>
            <p>Skip the paperwork and get back to the things you came here to do.</p>
            <Link className="how-link" to="/services">Get started <ArrowRight size={16} /></Link>
          </div>
          <div className="steps-list">
            <div className="step-item"><span className="step-number">01</span><div><h3>Find your service</h3><p>Browse what’s available and choose what you need.</p></div><Search size={20} /></div>
            <div className="step-item"><span className="step-number">02</span><div><h3>Tell us a little more</h3><p>Fill in a short form so we can get right to it.</p></div><FileText size={20} /></div>
            <div className="step-item"><span className="step-number">03</span><div><h3>We’ll take it from here</h3><p>Keep an eye on your request as it moves along.</p></div><CheckCircle2 size={20} /></div>
          </div>
        </div>
      </section>
    </>
  );
}

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
      <div className="page-help"><span className="help-mark"><MessageCircle size={18} /></span><p><strong>Can’t find what you’re looking for?</strong><br />Send us a general enquiry and our team will point you in the right direction.</p><Link to="/request/enquiry">Ask us <ArrowRight size={15} /></Link></div>
    </section>
  );
}

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

function RequestFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const selectedService = services.find((service) => service.id === id);
  const [form, setForm] = useState({
    studentName: "",
    studentId: "",
    email: "",
    serviceId: selectedService?.id || "",
    description: "",
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
    let { value } = event.target;

    if (name === "studentId" && /[^0-9]/.test(value)) {
      value = value.replace(/[^0-9]/g, "");
      setErrors((current) => ({
        ...current,
        studentId: "Student ID can contain numbers only; letters are not allowed.",
      }));
    } else if (name === "studentName") {
      const enteredNumbers = /\d/.test(value);
      value = value.replace(/[^\p{L} ]/gu, "").slice(0, 20);
      if (enteredNumbers) {
        setErrors((current) => ({
          ...current,
          studentName: "Numbers are not allowed in the name field.",
        }));
      } else {
        setErrors((current) => ({ ...current, studentName: "" }));
      }
    } else {
      setErrors((current) => ({ ...current, [name]: "" }));
    }

    setForm((current) => ({ ...current, [name]: value }));
    setSubmitError("");
  }

  function validate() {
    const nextErrors = {};
    if (!form.studentName.trim()) {
      nextErrors.studentName = "Please enter your full name.";
    } else if (/\d/.test(form.studentName)) {
      nextErrors.studentName = "Numbers are not allowed in the name field.";
    } else if (form.studentName.length > 20 || !/^\p{L}+(?: \p{L}+)*$/u.test(form.studentName.trim())) {
      nextErrors.studentName = "Use letters and spaces only (maximum 20 characters).";
    }
    if (!form.studentId.trim()) {
      nextErrors.studentId = "Please enter your student ID.";
    } else if (!/^[0-9]{1,9}$/.test(form.studentId)) {
      nextErrors.studentId = "Student ID can contain numbers only; use 1 to 9 digits.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!services.some((service) => service.id === form.serviceId)) nextErrors.serviceId = "Please choose a service.";
    if (form.description.trim().length < 10) nextErrors.description = "Please add at least 10 characters so we can help.";
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
    };

    try {
      const requestId = await createRequest(submittedRequest);
      setForm({ studentName: "", studentId: "", email: "", serviceId: "", description: "", requestDate: new Date().toLocaleDateString("en-CA") });
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
        <span className="eyebrow">LET’S GET STARTED</span>
        <h1>Make a request<span>.</span></h1>
        <p>A few details and we’ll get the right people on it.</p>
      </div>
      <form className="request-form" noValidate onSubmit={handleSubmit}>
        <div className="form-section-title"><span>01</span><div><h2>Your details</h2><p>So we know who we’re helping.</p></div></div>
        <div className="form-grid">
          <FormField error={errors.studentName} htmlFor="studentName" label="Full name">
            <input autoComplete="name" id="studentName" maxLength={20} name="studentName" onChange={handleChange} placeholder="e.g. Mpho Ndlovu" required value={form.studentName} />
          </FormField>
          <FormField error={errors.studentId} htmlFor="studentId" label="Student ID">
            <input autoComplete="off" id="studentId" inputMode="numeric" maxLength={9} name="studentId" onChange={handleChange} placeholder="Up to 9 digits" required value={form.studentId} />
          </FormField>
          <FormField error={errors.email} htmlFor="email" label="Student email">
            <input autoComplete="email" id="email" name="email" onChange={handleChange} placeholder="you@university.edu" required type="email" value={form.email} />
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
        <FormField error={errors.description} htmlFor="description" label="Tell us a little more">
          <textarea id="description" maxLength={1000} name="description" onChange={handleChange} placeholder="Share any details that will help us understand your request..." required rows={5} value={form.description} />
          <span className="character-count">{form.description.length}/1000</span>
        </FormField>
        {submitError && <div className="form-alert" role="alert"><AlertCircle size={18} /><span>{submitError}</span></div>}
        <div className="form-submit-row">
          <span><ShieldCheck size={16} /> Your details stay private.</span>
          <button className="button button-dark" disabled={submitting} type="submit">{submitting ? "Sending request..." : "Send my request"}<ArrowRight size={17} /></button>
        </div>
      </form>
    </section>
  );
}

function FormField({ children, error, htmlFor, label, required = true }) {
  return (
    <div className={`form-field${error ? " field-invalid" : ""}`}>
      <label htmlFor={htmlFor}>{label}{required && <span aria-hidden="true">*</span>}</label>
      {children}
      {error && <small className="field-error" role="alert"><AlertCircle size={13} />{error}</small>}
    </div>
  );
}

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

function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");

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
          setLoadError(error.message || "We couldn’t load your requests.");
          setLoading(false);
        }
      },
    ).then((stopListening) => {
      if (active) unsubscribe = stopListening;
      else stopListening();
    }).catch((error) => {
      if (active) {
        setLoadError(error.message || "We couldn’t load your requests.");
        setLoading(false);
      }
    });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function changeStatus(request, status) {
    setBusyId(request.id);
    setActionError("");
    try {
      await updateRequestStatus(request.id, status);
    } catch (error) {
      setActionError(error.message || "We couldn’t update this request.");
    } finally {
      setBusyId("");
    }
  }

  async function removeRequest(request) {
    if (!window.confirm(`Delete your ${request.serviceName} request? This can’t be undone.`)) return;
    setBusyId(request.id);
    setActionError("");
    try {
      await deleteRequest(request.id);
    } catch (error) {
      setActionError(error.message || "We couldn’t delete this request.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="page-section requests-page">
      <div className="page-intro requests-intro">
        <span className="eyebrow">YOUR REQUESTS</span>
        <h1>We’re on it<span>.</span></h1>
        <p>Keep up with the little things we’re taking care of for you.</p>
      </div>
      {actionError && <div className="form-alert requests-alert" role="alert"><AlertCircle size={18} />{actionError}</div>}
      {loading ? <div className="loading-panel"><span className="loading-spinner" /> Loading your requests...</div> : null}
      {!loading && loadError && <div className="empty-panel error-panel"><AlertCircle size={24} /><h2>We couldn’t load your requests</h2><p>{loadError}</p><Link className="button button-dark" to="/services">Browse services <ArrowRight size={16} /></Link></div>}
      {!loading && !loadError && requests.length === 0 && (
        <div className="empty-panel"><span className="empty-icon"><FileText size={25} /></span><h2>Nothing on your plate. Yet.</h2><p>When you send in a request, you’ll find it here.</p><Link className="button button-dark" to="/services">Find a service <ArrowRight size={16} /></Link></div>
      )}
      {!loading && !loadError && requests.length > 0 && (
        <div className="requests-list">
          <div className="requests-list-heading"><span>{requests.length} {requests.length === 1 ? "request" : "requests"}</span><span>Update a status or remove a request below.</span></div>
          {requests.map((request) => (
            <article className="request-card" key={request.id}>
              <div className="request-card-icon"><FileText size={20} /></div>
              <div className="request-card-main">
                <span className="request-department">{request.department}</span>
                <h2>{request.serviceName}</h2>
                <p>{request.description}</p>
                <div className="request-meta"><span><CalendarDays size={14} /> {request.requestDate}</span><span>Ref. {request.id}</span></div>
              </div>
              <div className="request-card-controls">
                <span className={`status-pill status-${request.status.toLowerCase().replace(" ", "-")}`}><i className="status-dot" />{request.status}</span>
                <label className="status-select-label">Update status
                  <span className="select-wrap compact-select"><select aria-label={`Update status for ${request.serviceName}`} disabled={busyId === request.id} onChange={(event) => changeStatus(request, event.target.value)} value={request.status}><option disabled value="">Set status</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><ChevronDown size={14} /></span>
                </label>
                <button aria-label={`Delete ${request.serviceName} request`} className="delete-button" disabled={busyId === request.id} onClick={() => removeRequest(request)} type="button"><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="requests-footnote"><ShieldCheck size={16} /> Only you can see and manage the requests you submitted from this browser.</div>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section className="page-section not-found-page">
      <span className="not-found-number">404</span>
      <span className="eyebrow">A LITTLE OFF TRACK</span>
      <h1>This page isn’t<br />where it should be<span>.</span></h1>
      <p>Let’s get you back to somewhere useful.</p>
      <Link className="button button-dark" to="/">Back to home <ArrowRight size={16} /></Link>
    </section>
  );
}

export default function Portal() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route element={<Layout />} path="/">
          <Route element={<Home />} index />
          <Route element={<ServicesPage />} path="services" />
          <Route element={<ServiceDetailsPage />} path="services/:id" />
          <Route element={<RequestFormPage />} path="request" />
          <Route element={<RequestFormPage />} path="request/:id" />
          <Route element={<ConfirmationPage />} path="confirmation" />
          <Route element={<RequestsPage />} path="requests" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
