/* dashboard.js — overview stats and charts */
"use strict";

(function() {
  function render() {
    const view = document.getElementById("view");
    const projects = PT.projects();

    if (!projects.length) {
      view.innerHTML = '<div class="empty">No data — upload Excel file first</div>';
      return;
    }

    const stats = computeStats(projects);
    const customers = countBy(projects, "customer");
    const engineers = countByEngineers(projects);
    const statuses = countByStatus(projects);

    view.innerHTML = `
      <div class="view-head">
        <h1>Project Overview</h1>
        <span class="sub">${projects.length} projects · Updated ${PT.state.source ? new Date(PT.state.source.ingestedAt).toLocaleDateString("en-US") : "—"}</span>
        <div class="spacer"></div>
      </div>

      <div class="grid cols-5 mb-4">
        <div class="kpi-card total">
          <div class="kpi-value">${stats.total}</div>
          <div class="kpi-label">Total</div>
        </div>
        <div class="kpi-card active">
          <div class="kpi-value">${stats.inProgress}</div>
          <div class="kpi-label">In Progress</div>
        </div>
        <div class="kpi-card completed">
          <div class="kpi-value">${stats.completed}</div>
          <div class="kpi-label">Completed</div>
        </div>
        <div class="kpi-card overdue">
          <div class="kpi-value">${stats.overdue}</div>
          <div class="kpi-label">Overdue</div>
        </div>
        <div class="kpi-card ma">
          <div class="kpi-value">${stats.inMA}</div>
          <div class="kpi-label">In MA</div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="card-head"><h2>Status Distribution</h2></div>
          <div class="card-body">
            ${renderStatusBars(statuses)}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Top 5 Customers</h2></div>
          <div class="card-body">
            ${renderCustomerBars(customers)}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Top 5 Engineers</h2></div>
          <div class="card-body">
            ${renderEngineerBars(engineers)}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Latest Projects</h2></div>
          <div class="card-body tight">
            <div class="tbl-wrap">
              <table class="tbl">
                <tbody>
                  ${projects.slice(-8).reverse().map(p => `
                    <tr onclick="showDrawer(${p.id})">
                      <td>
                        <span class="customer-chip">${PT.esc(p.customer)}</span>
                      </td>
                      <td class="clamp2">${PT.esc(p.project_name)}</td>
                      <td class="nowrap">
                        <span class="badge st-${PT.statusOf(p).replace(" ", "")}">${PT.statusLabel(PT.statusOf(p))}</span>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function computeStats(projects) {
    let completed = 0, inProgress = 0, overdue = 0, inMA = 0;
    projects.forEach(p => {
      const status = PT.statusOf(p);
      if (status === "Completed") completed++;
      else if (status === "Overdue") overdue++;
      else if (status === "InProgress") inProgress++;
      if (p.ma_customer) inMA++;
    });
    return { total: projects.length, completed, inProgress, overdue, inMA };
  }

  function countBy(projects, key) {
    const m = {};
    projects.forEach(p => {
      const k = p[key] || "—";
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

  function countByEngineers(projects) {
    const m = {};
    projects.forEach(p => {
      const engs = p.engineer.split(/[\/,&]+/).map(e => e.trim()).filter(Boolean);
      engs.forEach(e => { m[e] = (m[e] || 0) + 1; });
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

  function countByStatus(projects) {
    const m = { Completed: 0, InProgress: 0, Overdue: 0, None: 0 };
    projects.forEach(p => { m[PT.statusOf(p)] = (m[PT.statusOf(p)] || 0) + 1; });
    return Object.entries(m);
  }

  function renderStatusBars(statuses) {
    const total = statuses.reduce((s, [_, v]) => s + v, 0) || 1;
    const colors = { Completed: "#22c55e", InProgress: "#3b82f6", Overdue: "#ef4444", None: "#f59e0b" };
    return `<div class="chart-bar-container">
      ${statuses.map(([k, v]) => {
        const pct = Math.max(2, (v / total) * 60);
        const color = colors[k] || "#64748b";
        return `<div class="chart-col" title="${k}: ${v}">
          <div class="chart-bar-outer">
            <div class="chart-bar" style="height:${pct}px;background:${color}"></div>
          </div>
          <div class="chart-bar-label">${PT.statusLabel(k)}</div>
          <div class="chart-bar-val" style="color:${color}">${v}</div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function renderCustomerBars(data) {
    const max = Math.max(...data.map(d => d[1]), 1);
    return `<div class="chart-bar-container">
      ${data.map(([k, v]) => {
        const pct = Math.max(2, (v / max) * 60);
        return `<div class="chart-col" title="${k}: ${v}">
          <div class="chart-bar-outer">
            <div class="chart-bar" style="height:${pct}px;background:#c8102e"></div>
          </div>
          <div class="chart-bar-label">${PT.esc(k)}</div>
          <div class="chart-bar-val">${v}</div>
        </div>`;
      }).join("")}
    </div>`;
  }

  function renderEngineerBars(data) {
    const max = Math.max(...data.map(d => d[1]), 1);
    return `<div class="chart-bar-container">
      ${data.map(([k, v]) => {
        const pct = Math.max(2, (v / max) * 60);
        return `<div class="chart-col" title="${k}: ${v}">
          <div class="chart-bar-outer">
            <div class="chart-bar" style="height:${pct}px;background:#86198f"></div>
          </div>
          <div class="chart-bar-label">${PT.esc(k)}</div>
          <div class="chart-bar-val">${v}</div>
        </div>`;
      }).join("")}
    </div>`;
  }

  window.renderDashboard = render;
})();
