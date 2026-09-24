/* app.js — main app controller with edit + export functionality */
"use strict";

(function() {
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    PT.load();

    document.getElementById("mainNav").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-view]");
      if (!btn) return;
      switchView(btn.dataset.view);
    });

    document.getElementById("btnChangeFile").addEventListener("click", window.changeFile);
    document.getElementById("btnReset").addEventListener("click", window.resetData);
    document.getElementById("btnExcelSave").addEventListener("click", exportToExcel);

    document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);

    if (PT.state && PT.state.projects && PT.state.projects.length > 0) {
      document.getElementById("landing").hidden = true;
      document.getElementById("app").hidden = false;
      document.getElementById("dataMeta").textContent =
        `${PT.state.source?.fileName || "—"} · ${PT.state.projects.length} projects`;
      switchView("dashboard");
    }
  }

  function switchView(name) {
    document.querySelectorAll("#mainNav button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === name);
    });
    if (name === "dashboard") window.renderDashboard();
    else if (name === "projects") window.renderProjects();
    else if (name === "report") window.renderReport();
  }

  window.showAddProject = function() {
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("drawerBackdrop");

    drawer.innerHTML = `
      <div class="drawer-head">
        <div>
          <h3>Add New Project</h3>
          <div class="sub">Create a new project</div>
        </div>
        <button class="close" onclick="closeDrawer()">&times;</button>
      </div>
      <div class="drawer-body">
        <form class="frm" id="addProjectForm" onsubmit="return false;">
          <div class="row">
            <label>Customer</label>
            <input type="text" name="customer" placeholder="e.g. GSB, KTC" required>
          </div>
          <div class="row">
            <label>Project No</label>
            <input type="text" name="project_no" placeholder="e.g. BFS220100">
          </div>
          <div class="row wide">
            <label>Project Name</label>
            <textarea name="project_name" rows="2" placeholder="Project name" required></textarea>
          </div>
          <div class="row">
            <label>Start Date</label>
            <input type="date" name="start">
          </div>
          <div class="row">
            <label>End Date</label>
            <input type="date" name="end">
          </div>
          <div class="row">
            <label>Sale / PM</label>
            <input type="text" name="sale_pm" placeholder="e.g. P'Aey/Gap">
          </div>
          <div class="row">
            <label>Engineer</label>
            <input type="text" name="engineer" placeholder="e.g. Game/Hok">
          </div>
          <div class="row">
            <label>Status %</label>
            <input type="number" name="status_pct" value="0" min="0" max="100">
          </div>
          <div class="row wide">
            <label>MA (Customer)</label>
            <textarea name="ma_customer" rows="2" placeholder="MA customer details"></textarea>
          </div>
          <div class="row wide">
            <label>MA (Product)</label>
            <textarea name="ma_product" rows="2" placeholder="MA product details"></textarea>
          </div>
          <div class="row wide">
            <label>Action / History</label>
            <textarea name="action" rows="4" placeholder="Action history"></textarea>
          </div>
          <div class="row wide">
            <label>Next Action</label>
            <textarea name="next_action" rows="2" placeholder="Next action plan"></textarea>
          </div>
          <div class="row wide">
            <label>Note</label>
            <textarea name="note" rows="2" placeholder="Additional notes"></textarea>
          </div>
        </form>
      </div>
      <div class="drawer-foot">
        <button class="btn ghost" onclick="closeDrawer()">Cancel</button>
        <button class="btn primary" onclick="saveNewProject()">&#10003; Save</button>
      </div>
    `;

    backdrop.hidden = false;
    drawer.hidden = false;
  };

  window.saveNewProject = function() {
    const form = document.getElementById("addProjectForm");
    const formData = new FormData(form);

    if (!formData.get("customer") || !formData.get("project_name")) {
      PT.toast("Please enter customer and project name");
      return false;
    }

    const projects = PT.projects();
    const maxId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) : 0;

    const statusVal = formData.get("status_pct");

    PT.state.projects.push({
      id: maxId + 1,
      customer: formData.get("customer") || "",
      project_no: formData.get("project_no") || "",
      project_name: formData.get("project_name") || "",
      start: formData.get("start") || null,
      end: formData.get("end") || null,
      sale_pm: formData.get("sale_pm") || "",
      engineer: formData.get("engineer") || "",
      status_pct: statusVal ? parseInt(statusVal) : null,
      ma_customer: formData.get("ma_customer") || "",
      ma_product: formData.get("ma_product") || "",
      action: formData.get("action") || "",
      next_action: formData.get("next_action") || "",
      note: formData.get("note") || ""
    });

    PT.save();
    PT.toast("Project added successfully");
    closeDrawer();
    if (window.renderProjectTable) window.renderProjectTable();
    return false;
  };

  window.showDrawer = function(id) {
    const p = PT.byId(id);
    if (!p) return;

    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("drawerBackdrop");

    const status = PT.statusOf(p);
    const badgeClass = "st-" + status.replace(" ", "");

    drawer.innerHTML = `
      <div class="drawer-head">
        <div>
          <h3>${PT.esc(p.project_name || "—")}</h3>
          <div class="sub">
            <span class="customer-chip">${PT.esc(p.customer || "—")}</span>
            ${p.project_no ? `<span class="code" style="margin-left:6px">${PT.esc(p.project_no)}</span>` : ""}
          </div>
        </div>
        <button class="close" onclick="closeDrawer()">&times;</button>
      </div>
      <div class="drawer-body">
        <div class="tag-row" style="margin-bottom:14px">
          <span class="badge ${badgeClass}">${PT.statusLabel(status)} (${p.status_pct||0}%)</span>
          ${p.ma_customer ? `<span class="badge st-MA">MA Phase</span>` : ""}
        </div>
        <form class="frm" id="editForm" onsubmit="return false;">
          <div class="row">
            <label>Customer</label>
            <input type="text" name="customer" value="${PT.esc(p.customer)}" placeholder="e.g. GSB, KTC">
          </div>
          <div class="row">
            <label>Project No</label>
            <input type="text" name="project_no" value="${PT.esc(p.project_no)}" placeholder="e.g. BFS220100">
          </div>
          <div class="row wide">
            <label>Project Name</label>
            <textarea name="project_name" rows="2" placeholder="Project name">${PT.esc(p.project_name)}</textarea>
          </div>
          <div class="row">
            <label>Start Date</label>
            <input type="date" name="start" value="${p.start || ""}">
          </div>
          <div class="row">
            <label>End Date</label>
            <input type="date" name="end" value="${p.end || ""}">
          </div>
          <div class="row">
            <label>Sale / PM</label>
            <input type="text" name="sale_pm" value="${PT.esc(p.sale_pm)}" placeholder="e.g. P'Aey/Gap">
          </div>
          <div class="row">
            <label>Engineer</label>
            <input type="text" name="engineer" value="${PT.esc(p.engineer)}" placeholder="e.g. Game/Hok">
          </div>
          <div class="row">
            <label>Status %</label>
            <input type="number" name="status_pct" value="${p.status_pct || 0}" min="0" max="100">
          </div>
          <div class="row wide">
            <label>MA (Customer)</label>
            <textarea name="ma_customer" rows="2" placeholder="MA customer details">${PT.esc(p.ma_customer)}</textarea>
          </div>
          <div class="row wide">
            <label>MA (Product)</label>
            <textarea name="ma_product" rows="2" placeholder="MA product details">${PT.esc(p.ma_product)}</textarea>
          </div>
          <div class="row wide">
            <label>Action / History</label>
            <textarea name="action" rows="4" placeholder="Action history">${PT.esc(p.action)}</textarea>
          </div>
          <div class="row wide">
            <label>Next Action</label>
            <textarea name="next_action" rows="2" placeholder="Next action plan">${PT.esc(p.next_action)}</textarea>
          </div>
          <div class="row wide">
            <label>Note</label>
            <textarea name="note" rows="2" placeholder="Additional notes">${PT.esc(p.note)}</textarea>
          </div>
        </form>
      </div>
      <div class="drawer-foot">
        <button class="btn ghost" onclick="closeDrawer()">Cancel</button>
        <button class="btn" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5;margin-right:auto" onclick="deleteProject(${p.id})">
          &#128465; Delete
        </button>
        <button class="btn primary" onclick="saveProject(${p.id})">&#10003; Save</button>
      </div>
    `;

    backdrop.hidden = false;
    drawer.hidden = false;
  };

  function closeDrawer() {
    document.getElementById("drawer").hidden = true;
    document.getElementById("drawerBackdrop").hidden = true;
  }

  window.closeDrawer = closeDrawer;

  window.saveProject = function(id) {
    const p = PT.byId(id);
    if (!p) return false;

    const form = document.getElementById("editForm");
    const formData = new FormData(form);

    p.customer = formData.get("customer") || "";
    p.project_no = formData.get("project_no") || "";
    p.project_name = formData.get("project_name") || "";
    p.start = formData.get("start") || null;
    p.end = formData.get("end") || null;
    p.sale_pm = formData.get("sale_pm") || "";
    p.engineer = formData.get("engineer") || "";
    const statusVal = formData.get("status_pct");
    p.status_pct = statusVal ? parseInt(statusVal) : null;
    p.ma_customer = formData.get("ma_customer") || "";
    p.ma_product = formData.get("ma_product") || "";
    p.action = formData.get("action") || "";
    p.next_action = formData.get("next_action") || "";
    p.note = formData.get("note") || "";

    PT.save();
    PT.toast("Project saved successfully");
    closeDrawer();
    if (window.renderProjectTable) window.renderProjectTable();
    return false;
  };

  window.deleteProject = function(id) {
    const p = PT.byId(id);
    if (!p) return;
    if (!confirm(`Delete project "${p.project_name}"?`)) return;
    const idx = PT.state.projects.findIndex(x => x.id === id);
    if (idx >= 0) {
      PT.state.projects.splice(idx, 1);
      PT.save();
      PT.toast("Project deleted");
      closeDrawer();
      if (window.renderProjectTable) window.renderProjectTable();
    }
  };

  window.exportToExcel = function() {
    const projects = PT.projects();
    if (!projects.length) {
      PT.toast("No data to export");
      return;
    }

    const data = projects.map(p => ({
      "Customer": p.customer,
      "Project NO": p.project_no,
      "Project Name": p.project_name,
      "Start": p.start || "",
      "End": p.end || "",
      "Sale/PM": p.sale_pm,
      "Engineer": p.engineer,
      "Status %": p.status_pct || 0,
      "Start-End MA with Customer": p.ma_customer,
      "Start-End MA with Product": p.ma_product,
      "Action": p.action,
      "Next Action": p.next_action,
      "Note": p.note
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 12 }, { wch: 14 }, { wch: 50 },
      { wch: 12 }, { wch: 12 }, { wch: 16 },
      { wch: 16 }, { wch: 8 }, { wch: 35 },
      { wch: 35 }, { wch: 50 }, { wch: 30 }, { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
    const fileName = `MFEC_Project_Tracker_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
    PT.toast(`Excel exported: ${fileName}`);
  };

  window.onDataReady = function() {
    switchView("dashboard");
  };
})();
