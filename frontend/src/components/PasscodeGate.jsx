import React, { useState, useEffect, useRef } from "react";
import { Lock, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Building2 } from "lucide-react";

const REQUIRED_PASSCODE = "242628";

export default function PasscodeGate({ onUnlock, companyProfile, theme = "light" }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef([]);

  const companyName = companyProfile?.company_name || "Krishna Industrial Works";
  const tagline = companyProfile?.tagline || "CNC Pipe & Tube Bending CPQ Studio";

  useEffect(() => {
    // Focus first digit box on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  function handleDigitChange(idx, val) {
    // Take only the last entered digit
    const cleaned = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = cleaned;
    setDigits(newDigits);
    setError(false);

    // Auto advance to next input
    if (cleaned && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }

    // If all 6 digits filled, automatically verify
    if (cleaned && idx === 5) {
      const code = newDigits.join("");
      if (code.length === 6) {
        verifyCode(code);
      }
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === "Backspace") {
      if (!digits[idx] && idx > 0) {
        // Go to previous input if current is empty
        const newDigits = [...digits];
        newDigits[idx - 1] = "";
        setDigits(newDigits);
        inputRefs.current[idx - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[idx] = "";
        setDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    } else if (e.key === "Enter") {
      verifyCode(digits.join(""));
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    if (pasted.length === 6) {
      verifyCode(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  }

  function verifyCode(code) {
    if (code === REQUIRED_PASSCODE) {
      localStorage.setItem("tube-cpq-authenticated", "true");
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }

  function handleKeypadClick(num) {
    const firstEmptyIndex = digits.findIndex((d) => d === "");
    if (firstEmptyIndex !== -1) {
      handleDigitChange(firstEmptyIndex, String(num));
    }
  }

  function handleBackspaceClick() {
    const lastFilledIndex = [...digits].reverse().findIndex((d) => d !== "");
    if (lastFilledIndex !== -1) {
      const realIndex = 5 - lastFilledIndex;
      const newDigits = [...digits];
      newDigits[realIndex] = "";
      setDigits(newDigits);
      inputRefs.current[realIndex]?.focus();
    }
  }

  function handleClear() {
    setDigits(["", "", "", "", "", ""]);
    setError(false);
    inputRefs.current[0]?.focus();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          theme === "dark"
            ? "radial-gradient(circle at center, #111827 0%, #080D1A 100%)"
            : "radial-gradient(circle at center, #FFFFFF 0%, #E2E8F0 100%)",
        padding: 20
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: 24,
          padding: "36px 28px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.12)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          animation: shake ? "shake 0.4s ease" : "fadeIn 0.3s ease"
        }}
      >
        {/* Brand Icon Badge */}
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 18,
            background: "var(--accent-primary-subtle)",
            color: "var(--accent-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            boxShadow: "0 4px 14px rgba(0, 102, 255, 0.18)"
          }}
        >
          <Lock size={26} />
        </div>

        {/* Titles */}
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.35rem",
            fontWeight: 800,
            color: "var(--text-main)",
            margin: "0 0 4px 0",
            letterSpacing: "-0.01em"
          }}
        >
          {companyName}
        </h1>

        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            margin: "0 0 24px 0",
            fontWeight: 500
          }}
        >
          Software Protected &bull; Enter 6-Digit Passcode
        </p>

        {/* 6 PIN Input Cells */}
        <div
          onPaste={handlePaste}
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 16,
            width: "100%"
          }}
        >
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              style={{
                width: 48,
                height: 54,
                borderRadius: 12,
                border: error
                  ? "2px solid #EF4444"
                  : digit
                  ? "2px solid var(--accent-primary)"
                  : "1px solid var(--border-color)",
                background: digit ? "var(--accent-primary-subtle)" : "var(--bg-card)",
                textAlign: "center",
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "var(--accent-primary)",
                outline: "none",
                transition: "all 0.15s ease",
                boxShadow: digit ? "0 2px 8px rgba(0, 102, 255, 0.15)" : "none"
              }}
            />
          ))}
        </div>

        {/* Error message */}
        {error ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#EF4444",
              fontSize: "0.78rem",
              fontWeight: 600,
              marginBottom: 16
            }}
          >
            <AlertCircle size={14} />
            <span>Incorrect password. Please try again.</span>
          </div>
        ) : (
          <div style={{ height: 20, marginBottom: 12 }} />
        )}

        {/* Numeric Onscreen Keypad */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            width: "100%",
            maxWidth: 280,
            marginBottom: 18
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadClick(num)}
              className="btn btn-secondary"
              style={{
                height: 48,
                fontSize: "1.15rem",
                fontWeight: 700,
                borderRadius: 14,
                justifyContent: "center"
              }}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="btn btn-secondary"
            style={{
              height: 48,
              fontSize: "0.74rem",
              fontWeight: 700,
              borderRadius: 14,
              justifyContent: "center",
              color: "var(--text-muted)"
            }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeypadClick(0)}
            className="btn btn-secondary"
            style={{
              height: 48,
              fontSize: "1.15rem",
              fontWeight: 700,
              borderRadius: 14,
              justifyContent: "center"
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspaceClick}
            className="btn btn-secondary"
            style={{
              height: 48,
              fontSize: "0.74rem",
              fontWeight: 700,
              borderRadius: 14,
              justifyContent: "center",
              color: "var(--text-muted)"
            }}
          >
            ⌫
          </button>
        </div>

        {/* Unlock Button */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => verifyCode(digits.join(""))}
          style={{
            width: "100%",
            maxWidth: 280,
            height: 46,
            borderRadius: 14,
            fontSize: "0.92rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 4px 14px rgba(0, 102, 255, 0.28)"
          }}
        >
          <span>Unlock CPQ Studio</span>
          <ArrowRight size={16} />
        </button>

        <div
          style={{
            marginTop: 18,
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 5
          }}
        >
          <ShieldCheck size={13} style={{ color: "var(--accent-primary)" }} />
          <span>Internal Industrial Tooling &bull; Passcode Protected</span>
        </div>
      </div>
    </div>
  );
}
