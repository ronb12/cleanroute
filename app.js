(() => {
  const app = document.querySelector("#app");
  const tabs = [...document.querySelectorAll(".subnav-tab")];
  const state = { activeTab: "overview", jobs: [], crews: [], checkins: [], stats: {} };

  function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  async function post(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || "Request failed");
    }
    return response.json();
  }

  function renderCollection(items, mapper, emptyText) {
    return items.length ? items.map(mapper).join("") : `<div class="empty">${emptyText}</div>`;
  }

  function bindTabs() {
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === state.activeTab);
      tab.onclick = () => {
        state.activeTab = tab.dataset.tab;
        render();
      };
    });
  }

  function bindForms() {
    document.querySelector("#crewForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await post("/api/crews", {
        name: String(form.get("name")),
        zone: String(form.get("zone")),
        status: String(form.get("status")),
      });
      event.currentTarget.reset();
      await load();
    });

    document.querySelector("#jobForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await post("/api/jobs", {
        customerName: String(form.get("customerName")),
        address: String(form.get("address")),
        serviceType: String(form.get("serviceType")),
        zone: String(form.get("zone")),
        scheduledDate: String(form.get("scheduledDate")),
        durationMinutes: Number(form.get("durationMinutes") || 60),
        invoiceStatus: String(form.get("invoiceStatus")),
        priority: String(form.get("priority")),
        crewId: String(form.get("crewId")) || null,
      });
      event.currentTarget.reset();
      await load();
    });

    document.querySelector("#checkinForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await post("/api/checkins", {
        jobId: String(form.get("jobId")),
        status: String(form.get("status")),
        note: String(form.get("note")),
      });
      event.currentTarget.reset();
      await load();
    });
  }

  function renderOverview() {
    const nextJob = state.jobs[0];
    return `
      <section class="split-layout">
        <article class="panel spotlight">
          <span class="muted">Next route segment</span>
          ${nextJob ? `
            <h2>${nextJob.customer_name}</h2>
            <p>${nextJob.address}</p>
            <div class="spotlight-grid">
              <div><span class="muted">Service</span><strong>${nextJob.service_type}</strong></div>
              <div><span class="muted">Crew</span><strong>${nextJob.crew_name || "Unassigned"}</strong></div>
              <div><span class="muted">Duration</span><strong>${nextJob.duration_minutes} min</strong></div>
              <div><span class="muted">Invoice</span><strong>${nextJob.invoice_status}</strong></div>
            </div>
          ` : `<div class="empty">No jobs are scheduled yet.</div>`}
        </article>
        <article class="panel">
          <h2>Route Snapshot</h2>
          <div class="route-stack">
            ${renderCollection(
              state.jobs.slice(0, 4),
              (job, index) => `<div class="route-stop"><span>Stop ${index + 1}</span><strong>${job.customer_name}</strong><p>${job.zone} • ${job.service_type}</p></div>`,
              "No stops are queued yet."
            )}
          </div>
        </article>
      </section>
      <section class="panel">
        <h2>Recent Check-ins</h2>
        <div class="collection compact-cards">
          ${renderCollection(
            state.checkins,
            (checkin) => `
              <div class="card">
                <strong>${checkin.customer_name || "Job removed"}</strong>
                <span class="chip">${checkin.status}</span>
                <p>${checkin.note}</p>
              </div>
            `,
            "No route notes are logged yet."
          )}
        </div>
      </section>
    `;
  }

  function renderDispatch() {
    return `
      <section class="split-layout">
        <article class="panel">
          <h2>Crew Dispatch</h2>
          <p class="muted">Assign crews by zone and keep status visible for route planning.</p>
          <form id="crewForm">
            <input name="name" placeholder="Crew name" required>
            <div class="row">
              <select name="zone">
                <option>North</option>
                <option>Central</option>
                <option>South</option>
                <option>West</option>
              </select>
              <select name="status">
                <option>Rolling</option>
                <option>Loading</option>
                <option>On Site</option>
                <option>Offline</option>
              </select>
            </div>
            <button type="submit">Add crew</button>
          </form>
        </article>
        <article class="panel">
          <h2>Crew Board</h2>
          <div class="collection">
            ${renderCollection(
              state.crews,
              (crew) => `<div class="card"><strong>${crew.name}</strong><span class="chip">${crew.zone}</span><p>${crew.status}</p></div>`,
              "No crews have been dispatched yet."
            )}
          </div>
        </article>
      </section>
    `;
  }

  function renderJobs() {
    return `
      <section class="split-layout">
        <article class="panel">
          <h2>Job Intake</h2>
          <p class="muted">Capture customer visits, invoice state, and the crew assigned to each stop.</p>
          <form id="jobForm">
            <input name="customerName" placeholder="Customer name" required>
            <input name="address" placeholder="Service address" required>
            <div class="row">
              <input name="serviceType" placeholder="Service type" required>
              <select name="zone">
                <option>North</option>
                <option>Central</option>
                <option>South</option>
                <option>West</option>
              </select>
            </div>
            <div class="row">
              <input name="scheduledDate" type="date" required>
              <input name="durationMinutes" type="number" min="15" value="60" required>
            </div>
            <div class="row">
              <select name="invoiceStatus">
                <option>Open</option>
                <option>Sent</option>
                <option>Paid</option>
              </select>
              <select name="priority">
                <option>Routine</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <select name="crewId">
              <option value="">Unassigned</option>
              ${state.crews.map((crew) => `<option value="${crew.id}">${crew.name}</option>`).join("")}
            </select>
            <button type="submit">Add job</button>
          </form>
        </article>
        <article class="panel">
          <h2>Route Board</h2>
          <div class="collection">
            ${renderCollection(
              state.jobs,
              (job) => `
                <div class="card">
                  <strong>${job.customer_name}</strong>
                  <span class="chip">${job.service_type}</span>
                  <p>${job.address}</p>
                  <p>${job.zone} • ${job.duration_minutes} min • ${job.invoice_status}</p>
                  <span class="muted">${job.crew_name || "Unassigned"} • ${job.priority} • ${formatDate(job.scheduled_date)}</span>
                </div>
              `,
              "No jobs are on the board yet."
            )}
          </div>
        </article>
      </section>
    `;
  }

  function renderNotes() {
    return `
      <section class="split-layout">
        <article class="panel">
          <h2>Route Check-ins</h2>
          <p class="muted">Capture dispatch notes, access details, and on-route status changes.</p>
          <form id="checkinForm">
            <select name="jobId">
              ${state.jobs.map((job) => `<option value="${job.id}">${job.customer_name}</option>`).join("")}
            </select>
            <select name="status">
              <option>Dispatched</option>
              <option>En Route</option>
              <option>On Site</option>
              <option>Completed</option>
            </select>
            <textarea name="note" placeholder="Route note or service update" required></textarea>
            <button type="submit">Log check-in</button>
          </form>
        </article>
        <article class="panel">
          <h2>Dispatch Journal</h2>
          <div class="collection">
            ${renderCollection(
              state.checkins,
              (checkin) => `
                <div class="card">
                  <strong>${checkin.customer_name || "Job removed"}</strong>
                  <span class="chip">${checkin.status}</span>
                  <p>${checkin.note}</p>
                </div>
              `,
              "No route notes are logged yet."
            )}
          </div>
        </article>
      </section>
    `;
  }

  function render() {
    let view = renderOverview();
    if (state.activeTab === "dispatch") view = renderDispatch();
    if (state.activeTab === "jobs") view = renderJobs();
    if (state.activeTab === "notes") view = renderNotes();

    app.innerHTML = `
      <section class="metrics">
        <article class="metric">
          <span class="muted">Jobs today</span>
          <strong>${state.stats.jobsToday || 0}</strong>
          <span class="muted">Scheduled service visits</span>
        </article>
        <article class="metric">
          <span class="muted">Minutes booked</span>
          <strong>${state.stats.scheduledMinutes || 0}</strong>
          <span class="muted">Total on-route labor time</span>
        </article>
        <article class="metric">
          <span class="muted">Paid invoices</span>
          <strong>${state.stats.paidInvoices || 0}</strong>
          <span class="muted">Jobs marked paid</span>
        </article>
        <article class="metric">
          <span class="muted">Active crews</span>
          <strong>${state.stats.activeCrews || 0}</strong>
          <span class="muted">Dispatch-ready teams</span>
        </article>
      </section>
      ${view}
    `;

    bindTabs();
    bindForms();
  }

  async function load() {
    app.innerHTML = '<div class="loading-card">Refreshing route board...</div>';
    const response = await fetch("/api/bootstrap");
    if (!response.ok) {
      throw new Error("Failed to load CleanRoute");
    }
    const payload = await response.json();
    state.jobs = payload.jobs;
    state.crews = payload.crews;
    state.checkins = payload.checkins;
    state.stats = payload.stats;
    render();
  }

  load().catch((error) => {
    app.innerHTML = `<div class="loading-card">CleanRoute could not load: ${error.message}</div>`;
  });
})();
