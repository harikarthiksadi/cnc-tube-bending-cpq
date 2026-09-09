import React from "react";
import { Sliders, Cpu, History, Shield, Sun, Moon } from "lucide-react";

export default function Header({ activeTab, onTabChange, theme = "light", onToggleTheme }) {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <Cpu size={20} />
        </div>
        <div>
          <div className="brand-title">Tube Bending CPQ</div>
          <div className="brand-subtitle">Automated Geometry & Costing</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === "cpq" ? "active" : ""}`}
          onClick={() => onTabChange("cpq")}
        >
          <Sliders size={15} />
          <span>Quote Studio</span>
        </button>

        <button
          className={`nav-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => onTabChange("history")}
        >
          <History size={15} />
          <span>Quote History</span>
        </button>

        <button
          className={`nav-tab ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => onTabChange("admin")}
        >
          <Shield size={15} />
          <span>Rate Master</span>
        </button>
      </nav>

      {/* Backend Engine Status & Theme Toggle */}
      <div className="nav-status">
        {/* Light / Dark Mode Toggle */}
        <button
          className="theme-toggle-btn"
          onClick={() => onToggleTheme && onToggleTheme(theme === "light" ? "dark" : "light")}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
          aria-label="Toggle Color Theme"
        >
          {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          <span>{theme === "light" ? "Dark" : "Light"}</span>
        </button>

        <div className="status-badge">
          <div className="status-dot" />
          <span>Ready</span>
        </div>
      </div>
    </header>
  );
}
