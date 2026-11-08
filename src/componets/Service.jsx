import {
  FileText,
  Award,
  ClipboardList,
  CreditCard,
  Monitor,
  MessageCircle,
  ArrowUpRight,
  Clock
} from "lucide-react";

import { Link } from "react-router-dom";

const icons = {
  FileText,
  Award,
  ClipboardList,
  CreditCard,
  Monitor,
  MessageCircle
};

export default function ServiceCard({ service }) {

  const Icon = icons[service.icon] || FileText;

  return (
    <div className="service-card">

      <div
        className="service-icon"
        style={{ backgroundColor: `${service.color}15`,
         color: service.color }}
      >
        <Icon size={27} />
      </div>

      <div className="service-content">

        <span className="department">
          {service.department}
        </span>

        <h3>{service.name}</h3>

        <p>{service.description}</p>

        <div className="processing-time">
          <Clock size={15} />
          {service.processingTime} 
        </div>

        <Link
          to={`/services/${service.id}`}
          className="service-link"
        >
          View Service <ArrowUpRight size={17} />
        </Link>

      </div>

    </div>
  );
}