import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate
} from "react-router-dom";

import {
  ArrowRight,
  Search,
  ShieldCheck,
  Clock,
  Headphones,
  FileText,
  CheckCircle,
  Trash2,
  GraduationCap
} from "lucide-react";

import { useState, useEffect } from "react";

import { services } from "/data/services";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";


// HOME PAGE
function Home() {

  return (
    <>
      <section className="hero">

        <div className="hero-content">

          <span className="hero-label">
            <span className="online-dot"></span>
            Campus Pulse
          </span>

          <h1>
            Your University Services
            <span> All in 1</span>
          </h1>

          <p>
            Access university services, submit requests and monitor
            your applications from one convenient platform which is Campus Pulse.
          </p>

          <div className="hero-actions">

            <Link to="/services" className="primary-btn">
              Explore Services <ArrowRight size={18} />
            </Link>

            <Link to="/requests" className="secondary-btn">
              Track My Requests
            </Link>

          </div>

          <div className="hero-features">
            <span><ShieldCheck size={17} /> Secure Requests</span>
            <span><Clock size={17} /> Easy Tracking</span>
            <span><Headphones size={17} /> Student Support</span>
          </div>

        </div>

        <div className="hero-visual">

          <div className="visual-card">

            <div className="visual-top">
              <GraduationCap size={32} />
              <span>STUDENTCONNECT</span>
            </div>

            <div className="visual-icon">
              <FileText size={65} />
            </div>

            <h3>Students Services</h3>

            <p>Everything you need, in one place.</p>

            <div className="visual-progress">
              <span></span>
            </div>

            <small>YOUR EDUCATION. YOUR CONVENIENCE.</small>

          </div>

        </div>

      </section>

      <section className="section stats-section">

        <div className="stat-item">
          <h2>06+</h2>
          <p>Available Services</p>
        </div>

        <div className="stat-item">
          <h2>24/7</h2>
          <p>Online Access</p>
        </div>

        <div className="stat-item">
          <h2>100%</h2>
          <p>Digital Requests</p>
        </div>

      </section>

      <section className="section">

        <div className="section-heading">
          <div>
            <span className="eyebrow">WHAT WE OFFER</span>
            <h2>University Services</h2>
            <p>Find the service you need and submit your request online.</p>
          </div>

          <Link to="/services" className="text-link">
            View All Services <ArrowRight size={17} />
          </Link>
        </div>

        <div className="services-grid">

          {services.slice(0, 3).map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}

        </div>

      </section>
    </>
  );
}


// SERVICE CARD
function ServiceCard({ service }) {

  return (
    <div className="service-card">

      <div className="service-icon">
        <FileText size={27} />
      </div>

      <span className="department">{service.department}</span>

      <h3>{service.name}</h3>

      <p>{service.description}</p>

      <div className="processing-time">
        <Clock size={15} /> {service.processingTime}
      </div>

      <Link
        to={`/services/${service.id}`}
        className="service-link"
      >
        View Details <ArrowRight size={17} />
      </Link>

    </div>
  );
}


// SERVICES PAGE
function Services() {

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");

  const filtered = services.filter(service => {

    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.description.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment =
      department === "All" || service.department === department;

    return matchesSearch && matchesDepartment;

  });

  return (
    <section className="page-container">

      <div className="page-heading">
        <span className="eyebrow">OUR SERVICES</span>
        <h1>Explore Campus Pulse</h1>
        <p>Select a service to view its details and submit your request.</p>
      </div>

      <div className="filter-bar">

        <div className="search-box">
          <Search size={20} />

          <input
            type="text"
            placeholder="Search for a service..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

        </div>

        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
        >
          <option value="All">All Departments</option>
          <option value="Academic Affairs">Academic Affairs</option>
          <option value="Registry Department">Registry Department</option>
          <option value="Student Affairs">Student Service Department</option>
          <option value="ICT Department">ICT Department</option>
        </select>

      </div>

      <div className="services-grid">

        {filtered.map(service => (
          <ServiceCard key={service.id} service={service} />
        ))}

      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <Search size={35} />
          <h3>No services found</h3>
          <p>Try another search term or department.</p>
        </div>
      )}

    </section>
  );
}


// SERVICE DETAILS PAGE
function ServiceDetails() {

  const { id } = useParams();

  const service = services.find(item => item.id === id);

  if (!service) return <NotFound />;

  return (
    <section className="page-container">

      <div className="details-card">

        <span className="eyebrow">SERVICE INFORMATION</span>

        <div className="service-icon">
          <FileText size={35} />
        </div>

        <h1>{service.name}</h1>

        <p>{service.description}</p>

        <div className="details-info">
          <p><strong>Department:</strong> {service.department}</p>
          <p><strong>Processing Time:</strong> {service.processingTime}</p>
        </div>

        <Link
          to={`/request/${service.id}`}
          className="primary-btn"
        >
          Proceed to Request <ArrowRight size={18} />
        </Link>

      </div>

    </section>
  );
}


// REQUEST PAGE
function NewRequest() {

  const { id } = useParams();
  const navigate = useNavigate();

  const selectedService = services.find(s => s.id === id);

  const [form, setForm] = useState({
    studentName: "",
    studentId: "",
    email: "",
    serviceId: id || "",
    description: "",
    requestDate: new Date().toISOString().split("T")[0]
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id && !selectedService) {
      navigate("/services");
    }
  }, [id, selectedService, navigate]);

  function handleChange(e) {

    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value
    }));

    setErrors(prev => ({
      ...prev,
      [name]: ""
    }));

  }

  function validate() {

    const newErrors = {};

    if (!form.studentName.trim()) {
      newErrors.studentName = "Full name is required.";
    }

    if (!form.studentId.trim()) {
      newErrors.studentId = "Student ID is required.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!form.serviceId) {
      newErrors.serviceId = "Please select a service to send a request to...";
    }

    if (form.description.trim().length < 10) {
      newErrors.description = "Please provide at least 10 characters.";
    }

    return newErrors;
  }

  async function handleSubmit(e) {

    e.preventDefault();

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {

      const service = services.find(
        s => s.id === form.serviceId
      );

      const request = {
        ...form,
        serviceName: service.name,
        status: "Pending",
        createdAt: new Date().toISOString()
      };

      const existing = JSON.parse(
        localStorage.getItem("studentRequests") || "[]"
      );

      const updated = [
        ...existing,
        { ...request, id: crypto.randomUUID() }
      ];

      localStorage.setItem(
        "studentRequests",
        JSON.stringify(updated)
      );

      setForm({
        studentName: "",
        studentId: "",
        email: "",
        serviceId: "",
        description: "",
        requestDate: new Date().toISOString().split("T")[0]
      });

      navigate("/confirmation");

    } catch (error) {

      alert("Something went wrong. Please try again.");

    } finally {

      setLoading(false);

    }

  }

  return (
    <section className="page-container">

      <div className="page-heading">
        <span className="eyebrow">NEW APPLICATION</span>
        <h1>Submit a Service Request</h1>
        <p>Complete the form below with accurate information.</p>
      </div>

      <form className="request-form" onSubmit={handleSubmit} noValidate>

        <h3>Student Information</h3>

        <div className="form-grid">

          <div className="form-group">
            <label>Full Name *</label>

            <input
              name="studentName"
              value={form.studentName}
              onChange={handleChange}
              placeholder="Enter your full name"
            />

            {errors.studentName && <small className="error">{errors.studentName}</small>}
          </div>

          <div className="form-group">
            <label>Student ID *</label>

            <input
              name="studentId"
              value={form.studentId}
              onChange={handleChange}
              placeholder="Enter your student ID"
            />

            {errors.studentId && <small className="error">{errors.studentId}</small>}
          </div>

          <div className="form-group">
            <label>Email Address *</label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
            />

            {errors.email && <small className="error">{errors.email}</small>}
          </div>

          <div className="form-group">
            <label>Date of Request</label>

            <input
              type="date"
              value={form.requestDate}
              readOnly
            />
          </div>

        </div>

        <h3>Request Information</h3>

        <div className="form-group">
          <label>Select Service *</label>

          <select
            name="serviceId"
            value={form.serviceId}
            onChange={handleChange}
          >
            <option value="">Choose a service</option>

            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}

          </select>

          {errors.serviceId && <small className="error">{errors.serviceId}</small>}
        </div>

        <div className="form-group">
          <label>Reason for Request *</label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Explain why you need this service..."
            rows="5"
          />

          <small>{form.description.length} characters (minimum 10)</small>

          {errors.description && <small className="error">{errors.description}</small>}
        </div>

        <button
          type="submit"
          className="primary-btn submit-btn"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Request"}
          {!loading && <ArrowRight size={18} />}
        </button>

      </form>

    </section>
  );
}


// CONFIRMATION PAGE
function Confirmation() {

  return (
    <section className="page-container">

      <div className="confirmation-card">

        <CheckCircle size={75} />

        <h1>Request Submitted!</h1>

        <p>
          Your service request has been recorded successfully.
          You can visit the Requests Centre to view its status.
          And you can feel free to delete the request ....
          You are Anonymous to us no need to panic....
        </p>

        <Link to="/requests" className="primary-btn">
          View My Requests
        </Link>

        <Link to="/services" className="text-link">
          Explore More Services
        </Link>

      </div>

    </section>
  );
}


// REQUESTS PAGE
function Requests() {

  const [requests, setRequests] = useState([]);

  useEffect(() => {
    loadRequests();
  }, []);

  function loadRequests() {

    const data = JSON.parse(
      localStorage.getItem("studentRequests") || "[]"
    );

    setRequests(data);

  }

  function updateStatus(id, status) {

    const updated = requests.map(request =>
      request.id === id ? { ...request, status } : request
    );

    localStorage.setItem(
      "studentRequests",
      JSON.stringify(updated)
    );

    setRequests(updated);

  }

  function deleteRequest(id) {

    if (!window.confirm("You are anonymous are you sure you want to delete this request?")) {
      return;
    }

    const updated = requests.filter(request => request.id !== id);

    localStorage.setItem(
      "studentRequests",
      JSON.stringify(updated)
    );

    setRequests(updated);

  }

  return (
    <section className="page-container">

      <div className="page-heading">
        <span className="eyebrow">APPLICATION MANAGEMENT</span>
        <h1>Requests Centre</h1>
        <p>View and manage submitted service requests.</p>
      </div>

      <div className="requests-list">

        {requests.length === 0 ? (

          <div className="empty-state">
            <FileText size={45} />
            <h3>No requests yet</h3>
            <p>Your submitted applications will appear here.</p>

            <Link to="/services" className="primary-btn">
              Submit a Request
            </Link>
          </div>

        ) : (

          requests.map(request => (

            <div className="request-card" key={request.id}>

              <div>
                <span className="department">{request.studentId}</span>
                <h3>{request.serviceName}</h3>
                <p>{request.studentName}</p>
                <small>{request.requestDate}</small>
              </div>

              <div className="request-actions">

                <select
                  value={request.status}
                  onChange={e => updateStatus(request.id, e.target.value)}
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Rejected</option>
                </select>

                <button
                  className="delete-btn"
                  onClick={() => deleteRequest(request.id)}
                  aria-label="Delete request"
                >
                  <Trash2 size={18} />
                </button>

              </div>

            </div>

          ))

        )}

      </div>

    </section>
  );
}


// 404 PAGE
function NotFound() {

  return (
    <section className="confirmation-card">
      <h1>404</h1>
      <h2>Page Not Found</h2>

      <Link to="/" className="primary-btn">
        Return Home
      </Link>
    </section>
  );
}


// MAIN APPLICATION
export default function App() {

  return (
    <BrowserRouter>

      <Navbar />

      <main>

        <Routes>

          <Route path="/" element={<Home />} />

          <Route path="/services" element={<Services />} />

          <Route path="/services/:id" element={<ServiceDetails />} />

          <Route path="/request" element={<NewRequest />} />

          <Route path="/request/:id" element={<NewRequest />} />

          <Route path="/confirmation" element={<Confirmation />} />

          <Route path="/requests" element={<Requests />} />

          <Route path="*" element={<NotFound />} />

        </Routes>

      </main>

      <Footer />

    </BrowserRouter>
  );
}