import React, { useState, useEffect } from "react";
import {
  History, Download, Search, Trash2, CheckSquare, Square, AlertTriangle, X
} from "lucide-react";
import { getQuotes, getQuotePdfUrl, deleteQuote, bulkDeleteQuotes } from "../services/api";

export default function QuotesHistory() {
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // null | 'single' | 'bulk'
  const [singleDeleteId, setSingleDeleteId] = useState(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    setLoading(true);
    try {
      const data = await getQuotes();
      setQuotes(data);
    } catch (err) {
      alert("Error loading quotes: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = quotes.filter((q) => {
    const s = search.toLowerCase();
    return (
      q.quote_number.toLowerCase().includes(s) ||
      q.customer_company.toLowerCase().includes(s) ||
      q.customer_name.toLowerCase().includes(s) ||
      q.part_name.toLowerCase().includes(s)
    );
  });

  // ── Selection helpers ──────────────────────────────────────────────
  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((q) => q.id)));
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && selected.size < filtered.length;

  // ── Delete flow ────────────────────────────────────────────────────
  function promptDeleteSingle(id, e) {
    e.stopPropagation();
    setSingleDeleteId(id);
    setConfirmDelete("single");
  }

  function promptDeleteBulk() {
    setConfirmDelete("bulk");
  }

  async function confirmAndDelete() {
    setDeleting(true);
    try {
      if (confirmDelete === "single" && singleDeleteId != null) {
        await deleteQuote(singleDeleteId);
        setQuotes((prev) => prev.filter((q) => q.id !== singleDeleteId));
        setSelected((prev) => { const n = new Set(prev); n.delete(singleDeleteId); return n; });
      } else if (confirmDelete === "bulk") {
        const ids = [...selected];
        await bulkDeleteQuotes(ids);
        setQuotes((prev) => prev.filter((q) => !ids.includes(q.id)));
        setSelected(new Set());
      }
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
      setSingleDeleteId(null);
    }
  }

  function cancelDelete() {
    setConfirmDelete(null);
    setSingleDeleteId(null);
  }

  // ── Confirm dialog ─────────────────────────────────────────────────
  const ConfirmDialog = () => {
    const count = confirmDelete === "bulk" ? selected.size : 1;
    const label = confirmDelete === "single"
      ? `quote ${quotes.find((q) => q.id === singleDeleteId)?.quote_number || ""}`
      : `${count} selected quote${count > 1 ? "s" : ""}`;
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div className="card" style={{ maxWidth: 400, width: "90%", padding: "28px 28px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <AlertTriangle size={22} style={{ color: "#ef4444", flexShrink: 0 }} />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>Confirm Delete</h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: 22, lineHeight: 1.55 }}>
            This will permanently delete <strong>{label}</strong> and its PDF file. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={cancelDelete} disabled={deleting}>
              <X size={13} /> Cancel
            </button>
            <button
              className="btn btn-sm"
              onClick={confirmAndDelete}
              disabled={deleting}
              style={{ background: "#ef4444", color: "#fff", borderColor: "#ef4444" }}
            >
              <Trash2 size={13} />
              {deleting ? "Deleting…" : `Delete ${count > 1 ? count + " Quotes" : "Quote"}`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {confirmDelete && <ConfirmDialog />}

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <History size={22} style={{ color: "var(--accent-primary)" }} />
            <span>Quotation History &amp; Archived Invoices</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: 4 }}>
            Chronological audit log of all generated quotes with frozen immutable rate snapshots.
          </p>
        </div>

        {/* Search + Bulk Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {selected.size > 0 && (
            <button
              className="btn btn-sm"
              onClick={promptDeleteBulk}
              style={{ background: "#ef4444", color: "#fff", borderColor: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Trash2 size={13} />
              Delete {selected.size} Selected
            </button>
          )}
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-muted)" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36, width: 270 }}
              placeholder="Search by quote # or client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>
            Loading past quotes…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            No quotes found. Create a new quote from the CPQ Studio dashboard!
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                {/* Select-all checkbox */}
                <th style={{ width: 36, paddingLeft: 12 }}>
                  <button
                    title={allSelected ? "Deselect all" : "Select all"}
                    onClick={toggleSelectAll}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}
                  >
                    {allSelected
                      ? <CheckSquare size={16} style={{ color: "var(--accent-primary)" }} />
                      : someSelected
                        ? <CheckSquare size={16} style={{ color: "var(--accent-primary)", opacity: 0.5 }} />
                        : <Square size={16} />
                    }
                  </button>
                </th>
                <th>Quote #</th>
                <th>Date</th>
                <th>Client Company</th>
                <th>Part Description</th>
                <th>Qty</th>
                <th>Geometry</th>
                <th>Rate / Pc</th>
                <th>Total Value</th>
                <th>PDF</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const isChecked = selected.has(q.id);
                return (
                  <tr
                    key={q.id}
                    onClick={() => toggleSelect(q.id)}
                    style={{
                      cursor: "pointer",
                      background: isChecked ? "var(--accent-primary-subtle)" : undefined,
                      transition: "background 0.15s"
                    }}
                  >
                    {/* Row checkbox */}
                    <td style={{ paddingLeft: 12 }} onClick={(e) => { e.stopPropagation(); toggleSelect(q.id); }}>
                      {isChecked
                        ? <CheckSquare size={15} style={{ color: "var(--accent-primary)" }} />
                        : <Square size={15} style={{ color: "var(--text-muted)" }} />
                      }
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-cyan)" }}>
                      {q.quote_number}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {q.created_at}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.customer_company}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{q.customer_name}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{q.part_name}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{q.quantity} pcs</td>
                    <td style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      &Oslash;{q.tube_od_mm}mm &bull; {q.detected_bends} bends &bull; {q.flattened_length_mm.toFixed(0)}mm
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-main)" }}>
                      ₹{q.rate_per_piece.toFixed(2)}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-emerald)" }}>
                      ₹{q.total_job_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <a
                        href={getQuotePdfUrl(q.id)}
                        download={`${q.quote_number}.pdf`}
                        className="btn btn-secondary btn-sm"
                        style={{ textDecoration: "none" }}
                      >
                        <Download size={13} />
                        <span>PDF</span>
                      </a>
                    </td>
                    {/* Delete button */}
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                      <button
                        title="Delete this quote"
                        className="btn btn-sm"
                        onClick={(e) => promptDeleteSingle(q.id, e)}
                        style={{
                          background: "transparent",
                          border: "1px solid #ef444430",
                          color: "#ef4444",
                          padding: "4px 7px",
                          borderRadius: 6,
                          cursor: "pointer",
                          transition: "background 0.15s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#ef444415"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Bottom selection summary bar */}
        {selected.size > 0 && (
          <div style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--accent-primary-subtle)"
          }}>
            <span style={{ fontSize: "0.85rem", color: "var(--accent-primary)", fontWeight: 600 }}>
              {selected.size} quote{selected.size > 1 ? "s" : ""} selected
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
                <X size={12} /> Clear
              </button>
              <button
                className="btn btn-sm"
                onClick={promptDeleteBulk}
                style={{ background: "#ef4444", color: "#fff", borderColor: "#ef4444" }}
              >
                <Trash2 size={13} /> Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
