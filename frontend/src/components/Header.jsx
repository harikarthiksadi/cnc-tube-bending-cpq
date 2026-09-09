import React from "react";
import { Sliders, Cpu, History, Shield, Activity } from "lucide-react";

export default function Header({ activeTab, onTabChange }) {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <Cpu size={20} />
        </div>
        <div>
          <div className="brand-title">Precision Tube & Bending CPQ</div>
          <div className="brand-subtitle">Automated CAD Geometry & Excel Costing Engine</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === "cpq" ? "active" : ""}`}
          onClick={() => onTabChange("cpq")}
        >
          <Sliders size={16} />
          <span>Sales CPQ Studio</span>
        </button>

        <button
          className={`nav-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => onTabChange("history")}
        >
          <History size={16} />
          <span>Quote Archive</span>
        </button>

        <button
          className={`nav-tab ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => onTabChange("admin")}
        >
          <Shield size={16} />
          <span>Admin Rate Master</span>
        </button>
      </nav>

      {/* Backend Engine Status */}
      <div className="nav-status">
        <div className="status-badge">
          <div className="status-dot" />
          <span>CAD Engine: Online</span>
        </div>
      </div>
    </header>
  );
}
