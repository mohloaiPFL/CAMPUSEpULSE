import { GraduationCap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">

      <div className="footer-content">

        <div className="footer-brand">
          <GraduationCap size={30} />

          <div>
            <h3>CampusPulse</h3>
            <p>Student Service Request Portal</p>
          </div>
        </div>

        <p>
          Making university services easier, faster and more accessible.
        </p>

        <div className="footer-bottom">
          © {new Date().getFullYear()} Limkokwing University Student Services.
          All rights reserved.
        </div>

      </div>

    </footer>
  );
}