const { ensureSchema, getSql, json, readBody, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readBody(req);
    if (!payload.customerName || !payload.address || !payload.serviceType || !payload.zone || !payload.scheduledDate) {
      json(res, 400, { error: "Missing required fields" });
      return;
    }

    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);

    const [job] = await sql`
      INSERT INTO jobs (customer_name, address, service_type, zone, scheduled_date, duration_minutes, invoice_status, priority, crew_id)
      VALUES (
        ${payload.customerName},
        ${payload.address},
        ${payload.serviceType},
        ${payload.zone},
        ${payload.scheduledDate},
        ${Number(payload.durationMinutes || 60)},
        ${payload.invoiceStatus || "Open"},
        ${payload.priority || "Routine"},
        ${payload.crewId || null}
      )
      RETURNING *
    `;

    json(res, 201, { job });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
