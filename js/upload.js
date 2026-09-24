/* upload.js — Excel file ingestion with precise column matching */
"use strict";

(function() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const btnBrowse = document.getElementById("btnBrowse");
  const btnContinue = document.getElementById("btnContinue");
  const landingError = document.getElementById("landingError");
  const landing = document.getElementById("landing");
  const app = document.getElementById("app");

  function checkExisting() {
    const raw = localStorage.getItem(PT.LS_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (s && s.projects && s.projects.length > 0 && s.source) {
          btnContinue.hidden = false;
        }
      } catch(e) {}
    }
  }
  checkExisting();

  btnContinue.addEventListener("click", () => {
    if (PT.state && PT.state.projects.length > 0) {
      showApp();
    }
  });

  btnBrowse.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("click", (e) => {
    if (e.target !== btnBrowse) fileInput.click();
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag");
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0]);
    }
  });

  function showError(msg) {
    landingError.textContent = msg;
    landingError.hidden = false;
  }

  function handleFile(file) {
    landingError.hidden = false;
    landingError.textContent = "Reading file...";
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        let sheetName = "IMP";
        if (!workbook.Sheets[sheetName]) {
          sheetName = workbook.SheetNames[0];
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        const projects = parseRows(rows);

        if (projects.length === 0) {
          showError("No project data found in file");
          return;
        }

        PT.ingest(projects, file.name, sheetName);
        showApp();
      } catch (err) {
        console.error(err);
        showError("Failed to read file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function findColumn(headers, patterns) {
    for (const h of headers) {
      const lower = h.toLowerCase().trim();
      for (const p of patterns) {
        if (lower === p || lower.startsWith(p + " ") || lower === p + ":") {
          return headers.indexOf(h);
        }
      }
    }
    for (const h of headers) {
      const lower = h.toLowerCase().trim();
      for (const p of patterns) {
        if (lower.includes(p)) {
          return headers.indexOf(h);
        }
      }
    }
    return -1;
  }

  function parseRows(rows) {
    let headerRow = -1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i].map(c => String(c).toLowerCase());
      if (row.some(c => c.includes("customer")) && row.some(c => c.includes("project no"))) {
        headerRow = i;
        break;
      }
    }
    if (headerRow === -1) return [];

    const headers = rows[headerRow].map(c => String(c).trim());

    const col = {};
    col.customer = findColumn(headers, ["customer"]);
    col.project_no = findColumn(headers, ["project no"]);
    col.project_name = findColumn(headers, ["project name"]);
    col.start = findColumn(headers, ["start "]) >= 0 ? findColumn(headers, ["start "]) : headers.findIndex(h => h.toLowerCase().trim() === "start");
    col.end = headers.findIndex(h => h.toLowerCase().trim() === "end");
    col.sale_pm = findColumn(headers, ["sale/pm"]);
    col.engineer = findColumn(headers, ["engineer"]);
    col.status_pct = findColumn(headers, ["status %"]);

    col.ma_customer = -1;
    col.ma_product = -1;
    headers.forEach((h, i) => {
      const lower = h.toLowerCase();
      if (lower.includes("ma") && lower.includes("customer")) {
        col.ma_customer = i;
      } else if (lower.includes("ma") && lower.includes("product")) {
        col.ma_product = i;
      }
    });

    col.action = findColumn(headers, ["action"]);
    col.next_action = findColumn(headers, ["next action"]);
    col.note = findColumn(headers, ["note"]);

    const projects = [];
    let id = 1;
    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const customer = col.customer >= 0 ? String(row[col.customer] || "").trim() : "";
      const pno = col.project_no >= 0 ? String(row[col.project_no] || "").trim() : "";
      const pname = col.project_name >= 0 ? String(row[col.project_name] || "").trim() : "";

      if (!customer && !pno && !pname) continue;

      const statusRaw = col.status_pct >= 0 ? row[col.status_pct] : null;
      let statusPct = null;
      if (statusRaw != null && statusRaw !== "") {
        const n = parseInt(String(statusRaw).replace("%", ""));
        if (!isNaN(n)) statusPct = n;
      }

      projects.push({
        id: id++,
        customer, project_no: pno, project_name: pname,
        start: col.start >= 0 ? parseExcelDateValue(row[col.start]) : null,
        end: col.end >= 0 ? parseExcelDateValue(row[col.end]) : null,
        sale_pm: col.sale_pm >= 0 ? String(row[col.sale_pm] || "").trim() : "",
        engineer: col.engineer >= 0 ? String(row[col.engineer] || "").trim() : "",
        status_pct: statusPct,
        ma_customer: col.ma_customer >= 0 ? String(row[col.ma_customer] || "").trim() : "",
        ma_product: col.ma_product >= 0 ? String(row[col.ma_product] || "").trim() : "",
        action: col.action >= 0 ? String(row[col.action] || "").trim() : "",
        next_action: col.next_action >= 0 ? String(row[col.next_action] || "").trim() : "",
        note: col.note >= 0 ? String(row[col.note] || "").trim() : ""
      });
    }
    return projects;
  }

  function parseExcelDateValue(v) {
    if (!v && v !== 0) return null;
    if (typeof v === "number" && v > 40000 && v < 60000) {
      const base = new Date(1899, 11, 30);
      return new Date(base.getTime() + v * 86400000).toISOString().slice(0, 10);
    }
    if (typeof v === "string") {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
      if (m) return v.slice(0, 10);
      return v || null;
    }
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return null;
  }

  function showApp() {
    landing.hidden = true;
    app.hidden = false;
    document.getElementById("dataMeta").textContent =
      `${PT.state.source.fileName} · ${PT.state.projects.length} projects`;
    if (window.onDataReady) window.onDataReady();
  }

  window.changeFile = function() {
    app.hidden = true;
    landing.hidden = false;
    checkExisting();
  };

  window.resetData = function() {
    if (confirm("Clear all data and return to upload page?")) {
      PT.reset();
      app.hidden = true;
      landing.hidden = false;
      btnContinue.hidden = true;
    }
  };
})();
