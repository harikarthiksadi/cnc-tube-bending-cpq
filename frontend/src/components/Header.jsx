import React, { useState } from "react";
import { Sliders, History, Shield, Sun, Moon, Building2, Lock } from "lucide-react";

export default function Header({
  activeTab,
  onTabChange,
  theme = "light",
  onToggleTheme,
  companyProfile,
  onOpenCompanySettings,
  onLock
}) {
  const companyName = companyProfile?.company_name || "Krishna Industrial Works";
  const tagline = companyProfile?.tagline || "Custom Sheet Metal & CNC Machining Solutions";
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="navbar">
      <div
        className="nav-brand"
        onClick={onOpenCompanySettings}
        title="Click to view/edit Company Profile & Branding"
        style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
      >
        {/* Company Logo / Fallback Icon */}
        <div className="brand-icon" style={{ background: "transparent", padding: 0, overflow: "hidden", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {!logoError ? (
            <img
              src="/static/krishna_logo.png"
              alt={companyName}
              onError={() => setLogoError(true)}
              style={{
                maxHeight: 42,
                maxWidth: 90,
                objectFit: "contain",
                filter: theme === "dark" ? "brightness(1.15) contrast(1.05)" : "none",
                borderRadius: 4
              }}
            />
          ) : (
            <Building2 size={22} />
          )}
        </div>

        <div>
          <div className="brand-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{companyName}</span>
            <span style={{
              fontSize: "0.62rem",
              padding: "2px 7px",
              borderRadius: 4,
              background: "var(--accent-primary-subtle)",
              color: "var(--accent-primary)",
              fontWeight: 800,
              letterSpacing: "0.04em"
            }}>
              CPQ STUDIO
            </span>
          </div>
          <div className="brand-subtitle">{tagline}</div>
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
          <span>Rate Master & Profile</span>
        </button>
      </nav>

      {/* Theme Toggle & Company Settings Shortcut */}
      <div className="nav-status" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenCompanySettings}
          title="Configure Company Details & Letterhead"
          style={{ fontSize: "0.75rem", padding: "5px 10px", height: 32 }}
        >
          <Building2 size={13} />
          <span>Company Profile</span>
        </button>

        {onLock && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onLock}
            title="Lock CPQ Studio (Passcode 242628)"
            style={{ fontSize: "0.75rem", padding: "5px 10px", height: 32 }}
          >
            <Lock size={13} />
            <span>Lock</span>
          </button>
        )}

        <button
          className="theme-toggle-btn"
          onClick={() => onToggleTheme && onToggleTheme(theme === "light" ? "dark" : "light")}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
          aria-label="Toggle Color Theme"
        >
          {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          <span>{theme === "light" ? "Dark" : "Light"}</span>
        </button>
      </div>
    </header>
  );
}
