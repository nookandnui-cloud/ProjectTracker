/* util.js — state, storage, formatting */
"use strict";

const PT = (() => {
  const LS_KEY = "mfec-project-tracker-v2";

  // ---------- date helpers ----------
  function parseExcelDate(v) {
    if (!v) return null;
    if (typeof v === "string") {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
      if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      return null;
    }
    if (typeof v === "number" && v > 40000 && v < 60000) {
      // Excel date serial (1900 date system)
      const base = new Date(1899, 11, 30);
      const d = new Date(base.getTime() + v * 86400000);
      return d;
    }
    if (v instanceof Date) return v;
    return null;
  }

  function fmtDate(d) {
    if (!d) return "—";
    const dt = parseExcelDate(d);
    if (!dt) return "—";
    return dt.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  }

  function fmtShort(d) {
    if (!d) return "—";
    const dt = parseExcelDate(d);
    if (!dt) return "—";
    return dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  }

  // ---------- status ----------
  function statusOf(p) {
    if (p.status_pct === 100) return "Completed";
    const end = parseExcelDate(p.end);
    if (end && end < new Date()) return "Overdue";
    if (p.status_pct > 0) return "InProgress";
    return "None";
  }

  function statusColor(s) {
    return {
      "Completed": "#15803d",
      "Overdue": "#b91c1c",
      "InProgress": "#1d4ed8",
      "None": "#92400e"
    }[s] || "#92400e";
  }

  function statusLabel(s) {
    return {
      "Completed": "Completed",
      "Overdue": "Overdue",
      "InProgress": "In Progress",
      "None": "N/A"
    }[s] || "—";
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>\"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ---------- state ----------
  let state = null;

  function defaultState() {
    return {
      version: 1,
      source: null,
      projects: []
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.version === 1 && Array.isArray(s.projects)) {
          state = s;
          return;
        }
      }
    } catch (e) { /* corrupt -> fresh */ }
    state = defaultState();
  }

  function ingest(projects, fileName, sheetName) {
    state = {
      version: 1,
      source: { fileName, sheetName, ingestedAt: new Date().toISOString(), count: projects.length },
      projects: JSON.parse(JSON.stringify(projects))
    };
    save();
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      setSaveState("บันทึกแล้ว " + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setSaveState("บันทึกไม่สำเร็จ (พื้นที่จำกัด)");
    }
  }

  function setSaveState(t) {
    const el = document.getElementById("saveState");
    if (el) el.textContent = t;
  }

  function reset() {
    localStorage.removeItem(LS_KEY);
    load();
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2200);
  }

  function projects() { return state.projects; }
  function byId(id) { return state.projects.find(p => p.id === id); }

  function unique(key) {
    return [...new Set(projects().map(p => p[key]).filter(Boolean))].sort();
  }

  return {
    LS_KEY,
    parseExcelDate, fmtDate, fmtShort,
    statusOf, statusColor, statusLabel, esc,
    load, ingest, save, reset, setSaveState,
    toast, projects, byId, unique,
    get state() { return state; }
  };
})();
