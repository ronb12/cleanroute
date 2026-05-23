(() => {
  const key = "cleanroute-v1";
  const state = JSON.parse(localStorage.getItem(key) || "null") || {
    stops: [
      { id: crypto.randomUUID(), name: "Downtown Office", zone: 3, minutes: 45, invoice: "Paid" },
      { id: crypto.randomUUID(), name: "Smith Home", zone: 1, minutes: 60, invoice: "Open" },
      { id: crypto.randomUUID(), name: "Retail Suite", zone: 2, minutes: 35, invoice: "Sent" },
    ],
  };
  const save = () => localStorage.setItem(key, JSON.stringify(state));

  document.head.insertAdjacentHTML("beforeend", `<style>
    body{margin:0;background:#081418;color:#eefcff;font:16px/1.45 system-ui,sans-serif}main{max-width:1140px;margin:0 auto;padding:30px 20px 48px}
    .cr-grid,.cards,.list{display:grid;gap:16px}.hero,.card{background:#10242b;border:1px solid #285a67;border-radius:20px;padding:20px}
    .cards{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.stats{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.stat,.item{background:#0d1c22;border-radius:14px;padding:14px}
    form{display:grid;gap:10px}.row{display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))}input,select,button{font:inherit;padding:11px 12px;border-radius:12px;border:1px solid #2f7b8d}
    input,select{background:#061015;color:#eafcff}button{background:#78e0f2;color:#082329;font-weight:700;cursor:pointer}.actions{display:flex;gap:8px;flex-wrap:wrap}.meta{color:#9fd1db}
    @media (max-width:760px){.row{grid-template-columns:1fr}}
  </style>`);

  const main = document.querySelector("main");

  function render() {
    const driveMinutes = state.stops.reduce((sum, stop) => sum + Number(stop.minutes), 0);
    const paid = state.stops.filter((stop) => stop.invoice === "Paid").length;
    main.innerHTML = `
      <div class="cr-grid">
        <section class="hero">
          <h1>CleanRoute</h1>
          <p class="meta">Manage stops, route order, and invoice status for mobile service crews with saved local scheduling.</p>
          <div class="stats">
            <div class="stat"><strong>${state.stops.length}</strong><div class="meta">Stops</div></div>
            <div class="stat"><strong>${driveMinutes} min</strong><div class="meta">Scheduled work</div></div>
            <div class="stat"><strong>${paid}</strong><div class="meta">Paid invoices</div></div>
          </div>
        </section>
        <section class="cards">
          <article class="card">
            <h2>Add Stop</h2>
            <form id="stopForm">
              <input name="name" placeholder="Customer or location" required>
              <div class="row">
                <input name="zone" type="number" min="1" max="9" placeholder="Zone" required>
                <input name="minutes" type="number" min="10" placeholder="Minutes" required>
              </div>
              <select name="invoice"><option>Open</option><option>Sent</option><option>Paid</option></select>
              <div class="actions">
                <button type="submit">Add Stop</button>
                <button id="optimizeBtn" type="button">Optimize Route</button>
              </div>
            </form>
          </article>
          <article class="card">
            <h2>Route Board</h2>
            <div class="list">
              ${state.stops.map((stop, index) => `<div class="item"><b>Stop ${index + 1}: ${stop.name}</b><span>Zone ${stop.zone} • ${stop.minutes} min</span><div class="actions"><span class="meta">${stop.invoice}</span><button data-toggle="${stop.id}">Advance Invoice</button></div></div>`).join("")}
            </div>
          </article>
        </section>
      </div>`;

    document.querySelector("#stopForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.stops.push({
        id: crypto.randomUUID(),
        name: String(form.get("name")),
        zone: Number(form.get("zone")),
        minutes: Number(form.get("minutes")),
        invoice: String(form.get("invoice")),
      });
      save();
      render();
    });

    document.querySelector("#optimizeBtn").addEventListener("click", () => {
      state.stops.sort((a, b) => a.zone - b.zone || a.minutes - b.minutes);
      save();
      render();
    });

    document.querySelectorAll("[data-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const stop = state.stops.find((entry) => entry.id === button.dataset.toggle);
        const order = ["Open", "Sent", "Paid"];
        stop.invoice = order[(order.indexOf(stop.invoice) + 1) % order.length];
        save();
        render();
      });
    });
  }

  save();
  render();
})();
