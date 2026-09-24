/* report.js — summary view with month/quarter/year filters */
"use strict";

(function() {
  let reportFilter = { month: "", quarter: "", year: "" };

  function render() {
    const view = document.getElementById("view");
    const projects = PT.projects();

    if (!projects.length) {
      view.innerHTML = '<div class="empty">No data</div>';
      return;
    }

    const years = [...new Set(projects.map(p => p.end ? p.end.slice(0,4) : (p.start ? p.start.slice(0,4) : null)).filter(Boolean))].sort();
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const months = [
      { v: "01", n: "Jan" }, { v: "02", n: "Feb" }, { v: "03", n: "Mar" },
      { v: "04", n: "Apr" }, { v: "05", n: "May" }, { v: "06", n: "Jun" },
      { v: "07", n: "Jul" }, { v: "08", n: "Aug" }, { v: "09", n: "Sep" },
      { v: "10", n: "Oct" }, { v: "11", n: "Nov" }, { v: "12", n: "Dec" }
    ];

    const filtered = applyReportFilter(projects);

    const customerStats = aggregateBy(filtered, "customer");
    const engineerStats = aggregateByEngineers(filtered);
    const statusCounts = countStatuses(filtered);

    view.innerHTML = `
      <div class="view-head">
        <h1>Report</h1>
        <span class="sub">${filtered.length} projects</span>
        <div class="spacer"></div>
        <button class="btn primary" onclick="exportToExcel()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7 9m5-5l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 17v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Export Excel
        </button>
      </div>

      <div class="card mb-4">
        <div class="filters">
          <div>
            <label>Month</label>
            <select id="report-month" onchange="updateReport()">
              <option value="">All</option>
              ${months.map(m => `<option value="${m.v}" ${reportFilter.month===m.v?"selected":""}>${m.n}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Quarter</label>
            <select id="report-quarter" onchange="updateReport()">
              <option value="">All</option>
              ${quarters.map(q => `<option value="${q}" ${reportFilter.quarter===q?"selected":""}>${q}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Year</label>
            <select id="report-year" onchange="updateReport()">
              <option value="">All</option>
              ${years.map(y => `<option value="${y}" ${reportFilter.year===y?"selected":""}>${y}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>&nbsp;</label>
            <button class="btn ghost small" onclick="resetReportFilters()">Reset</button>
          </div>
        </div>
        <div class="card-body">
          <div class="grid cols-4">
            <div class="kpi-card total">
              <div class="kpi-value">${filtered.length}</div>
              <div class="kpi-label">Projects</div>
            </div>
            <div class="kpi-card active">
              <div class="kpi-value">${statusCounts.InProgress}</div>
              <div class="kpi-label">In Progress</div>
            </div>
            <div class="kpi-card completed">
              <div class="kpi-value">${statusCounts.Completed}</div>
              <div class="kpi-label">Completed</div>
            </div>
            <div class="kpi-card overdue">
              <div class="kpi-value">${statusCounts.Overdue}</div>
              <div class="kpi-label">Overdue</div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="card-head"><h2>Summary by Customer</h2></div>
          <div class="card-body tight">
            <div class="tbl-wrap">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th class="num">Total</th>
                    <th class="num">In Progress</th>
                    <th class="num">Completed</th>
                    <th class="num">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  ${customerStats.length ? customerStats.map(([k, s]) => `
                    <tr>
                      <td><span class="customer-chip">${PT.esc(k)}</span></td>
                      <td class="num">${s.total}</td>
                      <td class="num" style="color:var(--prog)">${s.inProgress}</td>
                      <td class="num" style="color:var(--win)">${s.completed}</td>
                      <td class="num" style="color:var(--lost)">${s.overdue}</td>
                    </tr>
                  `).join("") : '<tr><td colspan="5" class="empty">No data</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>Summary by Engineer</h2></div>
          <div class="card-body tight">
            <div class="tbl-wrap">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>Engineer</th>
                    <th class="num">Total</th>
                    <th class="num">In Progress</th>
                    <th class="num">Completed</th>
                    <th class="num">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  ${engineerStats.length ? engineerStats.map(([k, s]) => `
                    <tr>
                      <td>${PT.esc(k)}</td>
                      <td class="num">${s.total}</td>
                      <td class="num" style="color:var(--prog)">${s.inProgress}</td>
                      <td class="num" style="color:var(--win)">${s.completed}</td>
                      <td class="num" style="color:var(--lost)">${s.overdue}</td>
                    </tr>
                  `).join("") : '<tr><td colspan="5" class="empty">No data</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function applyReportFilter(projects) {
    return projects.filter(p => {
      if (reportFilter.year || reportFilter.month) {
        if (!dateInMonthYear(p, reportFilter.month, reportFilter.year)) return false;
      }
      if (reportFilter.quarter && !dateInQuarter(p, reportFilter.quarter, reportFilter.year)) return false;
      return true;
    });
  }

  function dateInMonthYear(p, month, year) {
    const start = p.start; const end = p.end;
    if (year) { if (start && start.startsWith(year)) return true; if (end && end.startsWith(year)) return true; }
    if (month) { const m2 = "-" + month + "-"; if (start && start.includes(m2)) return true; if (end && end.includes(m2)) return true; }
    return false;
  }

  function dateInQuarter(p, quarter, year) {
    const q = { Q1: ["01","02","03"], Q2: ["04","05","06"], Q3: ["07","08","09"], Q4: ["10","11","12"] }[quarter];
    if (!q) return true;
    const check = (d) => { if (!d) return false; if (year && !d.startsWith(year)) return false; return q.includes(d.slice(5, 7)); };
    return check(p.start) || check(p.end);
  }

  function countStatuses(projects) {
    const m = { InProgress: 0, Completed: 0, Overdue: 0 };
    projects.forEach(p => { const s = PT.statusOf(p); if (s === "InProgress" || s === "Completed" || s === "Overdue") m[s]++; });
    return m;
  }

  function aggregateBy(projects, key) {
    const m = {};
    projects.forEach(p => {
      const k = p[key] || "—";
      if (!m[k]) m[k] = { total: 0, inProgress: 0, completed: 0, overdue: 0 };
      m[k].total++;
      const s = PT.statusOf(p);
      if (s === "InProgress") m[k].inProgress++; else if (s === "Completed") m[k].completed++; else if (s === "Overdue") m[k].overdue++;
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total);
  }

  function aggregateByEngineers(projects) {
    const m = {};
    projects.forEach(p => {
      const engs = p.engineer.split(/[\/,&]+/).map(e => e.trim()).filter(Boolean);
      engs.forEach(e => {
        if (!m[e]) m[e] = { total: 0, inProgress: 0, completed: 0, overdue: 0 };
        m[e].total++;
        const s = PT.statusOf(p);
        if (s === "InProgress") m[e].inProgress++; else if (s === "Completed") m[e].completed++; else if (s === "Overdue") m[e].overdue++;
      });
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total);
  }

  window.updateReport = function() {
    reportFilter.month = document.getElementById("report-month").value;
    reportFilter.quarter = document.getElementById("report-quarter").value;
    reportFilter.year = document.getElementById("report-year").value;
    render();
  };

  window.resetReportFilters = function() {
    reportFilter = { month: "", quarter: "", year: "" };
    render();
  };

  window.exportToExcel = function() {
    const projects = PT.projects();
    if (!projects.length) { PT.toast("No data to export"); return; }
    const data = projects.map(p => ({
      "Customer": p.customer, "Project NO": p.project_no, "Project Name": p.project_name,
      "Start": p.start || "", "End": p.end || "", "Sale/PM": p.sale_pm,
      "Engineer": p.engineer, "Status %": p.status_pct || 0,
      "Start-End MA with Customer": p.ma_customer, "Start-End MA with Product": p.ma_product,
      "Action": p.action, "Next Action": p.next_action, "Note": p.note
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 12 }, { wch: 14 }, { wch: 50 }, { wch: 12 }, { wch: 12 }, { wch: 16 },
      { wch: 16 }, { wch: 8 }, { wch: 35 }, { wch: 35 }, { wch: 50 }, { wch: 30 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
    XLSX.writeFile(wb, `MFEC_Project_Tracker_${dateStr}.xlsx`);
    PT.toast(`Excel exported: MFEC_Project_Tracker_${dateStr}.xlsx`);
  };

  window.renderReport = render;
})();
