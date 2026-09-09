import React, { useState, useEffect } from "react";
import { History, Download, Search, CheckCircle, ExternalLink, Filter } from "lucide-react";
import { getQuotes, getQuotePdfUrl } from "../services/api";

export default function QuotesHistory() {
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <History size={22} style={{ color: "var(--accent-primary)" }} />
            <span>Quotation History & Archived Invoices</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: 4 }}>
            Chronological audit log of all generated quotes with frozen immutable rate snapshots.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", width: 300 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by quote # or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>
            Loading past quotes...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            No quotes found. Create a new quote from the CPQ Studio dashboard!
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Date</th>
                <th>Client Company</th>
                <th>Part Description</th>
                <th>Quantity</th>
                <th>Geometry</th>
                <th>Rate / Pc</th>
                <th>Total Value</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id}>
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
                  <td>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
