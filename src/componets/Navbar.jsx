import { Link, NavLink } from "react-router-dom";
import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-container">

        <Link to="/" className="brand">
          <div className="brand-icon">
            <GraduationCap size={27} />
          </div>

          <div>
            <h2>Campus<span>Pulse</span></h2>
            <small>STUDENT SERVICE PORTAL</small>
          </div>
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>

        <div className={`nav-links ${open ? "active" : ""}`}>

          <NavLink to="/" end onClick={() => setOpen(false)}>
            Home
          </NavLink>

          <NavLink to="/services" onClick={() => setOpen(false)}>
            Services
          </NavLink>

          <NavLink to="/requests" onClick={() => setOpen(false)}>
            My Requests
          </NavLink>

          <Link
            to="/services"
            className="nav-button"
            onClick={() => setOpen(false)}
          >
            Submit Request
          </Link>

        </div>

      </div>
    </nav>
  );
}