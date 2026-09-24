/* projects.js — projects list with filters, countdown, delete */
"use strict";

(function() {
  let sortCol = "customer";
  let sortAsc = true;
  let filter = { customer: "", status: "", engineer: "", search: "", ma: "", month: "", quarter: "", year: "" };
  let debounceTimer = null;

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
  }

  function formatCountdown(days) {
    if (days === null) return `<span style="color:#94a3b8">—</span>`;
    if (days < 0) return `<span style="color:#b91c1c;font-weight:700">เกิน ${Math.abs(days)} วัน</span>`;
    if (days === 0) return `<span style="color:#f59e0b;font-weight:700">วันนี้</span>`;
    if (days <= 30) return `<span style="color:#f59e0b;font-weight:700">${days} วัน</span>`;
    const months = Math.floor(days / 30);
    const remain = days % 30;
    if (remain > 0) return `<span style="color:#15803d;font-weight:600">${months} เดือน ${remain} วัน</span>`;
    return `<span style="color:#15803d;font-weight:600">${months} เดือน</span>`;
  }

  function render() {
    const view = document.getElementById("view");
    const projects = PT.projects();

    if (!projects.length) {
      view.innerHTML = '<div class="empty">ไม่มีข้อมูล — อัปโหลดไฟล์ Excel ก่อน</div>';
      return;
    }

    const customers = PT.unique("customer");
    const engineers = PT.unique("engineer");
    const years = [...new Set(projects.map(p => p.end ? p.end.slice(0,4) : (p.start ? p.start.slice(0,4) : null)).filter(Boolean))].sort();
    const quarters = ["Q1", "Q2", "Q3", "Q4"];

    const months = [
      { v: "01", n: "ม.ค." }, { v: "02", n: "ก.พ." }, { v: "03", n: "มี.ค." },
      { v: "04", n: "เม.ย." }, { v: "05", n: "พ.ค." }, { v: "06", n: "มิ.ย." },
      { v: "07", n: "ก.ค." }, { v: "08", n: "ส.ค." }, { v: "09", n: "ก.ย." },
      { v: "10", n: "ต.ค." }, { v: "11", n: "พ.ย." }, { v: "12", n: "ธ.ค." }
    ];

    view.innerHTML = `
      <div class="view-head">
        <h1>โครงการทั้งหมด</h1>
        <span class="sub">${projects.length} โครงการ</span>
        <div class="spacer"></div>
        <button class="btn primary" onclick="showAddProject()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          เพิ่มโครงการ
        </button>
      </div>

      <div class="card mb-4">
        <div class="filters">
          <div>
            <label>ค้นหา</label>
            <input type="search" id="search-input" placeholder="Project name, customer..." value="${PT.esc(filter.search)}" style="width:200px">
          </div>
          <div>
            <label>ลูกค้า</label>
            <select id="filter-customer">
              <option value="">ทั้งหมด</option>
              ${customers.map(c => `<option value="${PT.esc(c)}" ${filter.customer===c?"selected":""}>${PT.esc(c)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>สถานะ</label>
            <select id="filter-status">
              <option value="">ทั้งหมด</option>
              <option value="completed" ${filter.status==="completed"?"selected":""}>Completed</option>
              <option value="progress" ${filter.status==="progress"?"selected":""}>In Progress</option>
              <option value="overdue" ${filter.status==="overdue"?"selected":""}>Overdue</option>
            </select>
          </div>
          <div>
            <label>วิศวกร</label>
            <select id="filter-engineer">
              <option value="">ทั้งหมด</option>
              ${engineers.map(e => `<option value="${PT.esc(e)}" ${filter.engineer===e?"selected":""}>${PT.esc(e)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>เดือน</label>
            <select id="filter-month">
              <option value="">ทั้งหมด</option>
              ${months.map(m => `<option value="${m.v}" ${filter.month===m.v?"selected":""}>${m.n}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Quarter</label>
            <select id="filter-quarter">
              <option value="">ทั้งหมด</option>
              ${quarters.map(q => `<option value="${q}" ${filter.quarter===q?"selected":""}>${q}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>ปี</label>
            <select id="filter-year">
              <option value="">ทั้งหมด</option>
              ${years.map(y => `<option value="${y}" ${filter.year===y?"selected":""}>${y}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>MA</label>
            <select id="filter-ma">
              <option value="">ทั้งหมด</option>
              <option value="yes" ${filter.ma==="yes"?"selected":""}>Active MA</option>
              <option value="no" ${filter.ma==="no"?"selected":""}>No MA</option>
            </select>
          </div>
          <div style="margin-left:auto">
            <label>&nbsp;</label>
            <button class="btn ghost small" onclick="resetProjectFilters()">
              ล้างตัวกรอง
            </button>
          </div>
        </div>
        <div class="tbl-wrap">
          <table class="tbl" id="projectTable">
            <thead>
              <tr>
                <th class="sortable" data-sort="customer">ลูกค้า</th>
                <th class="sortable" data-sort="project_no">Project No</th>
                <th class="sortable" data-sort="project_name">Project Name</th>
                <th class="sortable" data-sort="start">Start</th>
                <th class="sortable" data-sort="end">End</th>
                <th>เหลือเวลา</th>
                <th class="sortable" data-sort="status_pct">Status</th>
                <th class="sortable" data-sort="sale_pm">Sale/PM</th>
                <th class="sortable" data-sort="engineer">Engineer</th>
                <th>MA</th>
              </tr>
            </thead>
            <tbody id="projectTableBody"></tbody>
          </table>
        </div>
        <div id="no-results" class="empty" hidden>ไม่มีโครงการที่ตรงกับตัวกรอง</div>
      </div>
    `;

    document.getElementById("search-input").addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filter.search = e.target.value;
        renderTable();
      }, 200);
    });
    document.getElementById("filter-customer").addEventListener("change", (e) => {
      filter.customer = e.target.value; renderTable();
    });
    document.getElementById("filter-status").addEventListener("change", (e) => {
      filter.status = e.target.value; renderTable();
    });
    document.getElementById("filter-engineer").addEventListener("change", (e) => {
      filter.engineer = e.target.value; renderTable();
    });
    document.getElementById("filter-month").addEventListener("change", (e) => {
      filter.month = e.target.value; renderTable();
    });
    document.getElementById("filter-quarter").addEventListener("change", (e) => {
      filter.quarter = e.target.value; renderTable();
    });
    document.getElementById("filter-year").addEventListener("change", (e) => {
      filter.year = e.target.value; renderTable();
    });
    document.getElementById("filter-ma").addEventListener("change", (e) => {
      filter.ma = e.target.value; renderTable();
    });

    document.querySelectorAll("#projectTable thead th.sortable").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.dataset.sort;
        if (sortCol === col) { sortAsc = !sortAsc; }
        else { sortCol = col; sortAsc = true; }
        renderTable();
      });
    });

    renderTable();
  }

  function dateInMonthYear(p, month, year) {
    const start = p.start;
    const end = p.end;
    if (year) {
      if (start && start.startsWith(year)) return true;
      if (end && end.startsWith(year)) return true;
    }
    if (month) {
      const m2 = "-" + month + "-";
      if (start && start.includes(m2)) return true;
      if (end && end.includes(m2)) return true;
    }
    return false;
  }

  function dateInQuarter(p, quarter, year) {
    const q = { Q1: ["01","02","03"], Q2: ["04","05","06"], Q3: ["07","08","09"], Q4: ["10","11","12"] }[quarter];
    if (!q) return true;
    const start = p.start;
    const end = p.end;
    const check = (d) => {
      if (!d) return false;
      if (year && !d.startsWith(year)) return false;
      const m = d.slice(5, 7);
      return q.includes(m);
    };
    return check(start) || check(end);
  }

  function applyFilters() {
    return PT.projects().filter(p => {
      if (filter.customer && p.customer !== filter.customer) return false;
      if (filter.engineer && !p.engineer.toLowerCase().includes(filter.engineer.toLowerCase())) return false;
      if (filter.status === "completed" && p.status_pct !== 100) return false;
      if (filter.status === "progress") {
        if (PT.statusOf(p) !== "InProgress") return false;
      }
      if (filter.status === "overdue" && PT.statusOf(p) !== "Overdue") return false;
      if (filter.ma === "yes" && !p.ma_customer) return false;
      if (filter.ma === "no" && p.ma_customer) return false;
      if (filter.search) {
        const hay = `${p.customer} ${p.project_no} ${p.project_name} ${p.sale_pm} ${p.engineer}`.toLowerCase();
        if (!hay.includes(filter.search.toLowerCase())) return false;
      }
      if (filter.year || filter.month) {
        if (!dateInMonthYear(p, filter.month, filter.year)) return false;
      }
      if (filter.quarter) {
        if (!dateInQuarter(p, filter.quarter, filter.year)) return false;
      }
      return true;
    });
  }

  function sortProjects(list) {
    list.sort((a, b) => {
      let av, bv;
      if (sortCol === "status_pct") {
        av = a.status_pct || 0; bv = b.status_pct || 0;
      } else if (sortCol === "start" || sortCol === "end") {
        av = a[sortCol] || ""; bv = b[sortCol] || "";
      } else {
        av = (a[sortCol]||"").toString().toLowerCase();
        bv = (b[sortCol]||"").toString().toLowerCase();
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  function renderTable() {
    const tbody = document.getElementById("projectTableBody");
    const noResults = document.getElementById("no-results");
    if (!tbody) return;

    let list = applyFilters();
    sortProjects(list);

    document.querySelectorAll("#projectTable thead th[data-sort] .arrow").forEach(el => el.textContent = "");
    const activeTh = document.querySelector(`#projectTable thead th[data-sort="${sortCol}"]`);
    if (activeTh) {
      let arrowEl = activeTh.querySelector(".arrow");
      if (!arrowEl) {
        arrowEl = document.createElement("span");
        arrowEl.className = "arrow";
        activeTh.appendChild(arrowEl);
      }
      arrowEl.textContent = sortAsc ? " ↑" : " ↓";
    }

    if (list.length === 0) {
      tbody.innerHTML = "";
      noResults.hidden = false;
      return;
    }
    noResults.hidden = true;

    tbody.innerHTML = list.map(p => {
      const status = PT.statusOf(p);
      const badgeClass = "st-" + status.replace(" ", "");
      const maBadge = p.ma_customer ? `<span class="badge st-MA">MA</span>` : `<span style="color:#94a3b8">—</span>`;
      const days = daysUntil(p.end);
      return `<tr onclick="showDrawer(${p.id})">
        <td><span class="customer-chip">${PT.esc(p.customer || "—")}</span></td>
        <td><span class="code">${PT.esc(p.project_no || "—")}</span></td>
        <td class="clamp2 strong">${PT.esc(p.project_name || "—")}</td>
        <td class="nowrap">${PT.fmtDate(p.start)}</td>
        <td class="nowrap">${PT.fmtDate(p.end)}</td>
        <td class="nowrap" style="font-size:12px">${formatCountdown(days)}</td>
        <td>
          <span class="badge ${badgeClass}">${p.status_pct||0}%</span>
          <div class="pbar" style="margin-top:3px">
            <div class="track"><div class="fill f-${status.toLowerCase().replace(" ","")}" style="width:${p.status_pct||0}%"></div></div>
          </div>
        </td>
        <td>${PT.esc(p.sale_pm || "—")}</td>
        <td>${PT.esc(p.engineer || "—")}</td>
        <td>${maBadge}</td>
      </tr>`;
    }).join("");
  }

  window.resetProjectFilters = function() {
    filter = { customer: "", status: "", engineer: "", search: "", ma: "", month: "", quarter: "", year: "" };
    render();
  };

  window.renderProjects = render;
  window.renderProjectTable = renderTable;
})();
