const { neon } = require("@neondatabase/serverless");

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  return neon(process.env.DATABASE_URL);
}

async function ensureSchema(sql) {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
  await sql`
    CREATE TABLE IF NOT EXISTS crews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      zone TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name TEXT NOT NULL,
      address TEXT NOT NULL,
      service_type TEXT NOT NULL,
      zone TEXT NOT NULL,
      scheduled_date DATE NOT NULL,
      duration_minutes INTEGER NOT NULL,
      invoice_status TEXT NOT NULL,
      priority TEXT NOT NULL,
      crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS route_checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function seed(sql) {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM jobs`;
  if (count > 0) {
    return;
  }

  const [crewA, crewB] = await sql`
    INSERT INTO crews (name, zone, status)
    VALUES
      ('Morning Detail Crew', 'North', 'Rolling'),
      ('Express Reset Crew', 'Central', 'Loading')
    RETURNING id, name
  `;

  const jobs = await sql`
    INSERT INTO jobs (customer_name, address, service_type, zone, scheduled_date, duration_minutes, invoice_status, priority, crew_id)
    VALUES
      ('Smith Home', '14 Willow Trace', 'Deep Clean', 'North', CURRENT_DATE, 120, 'Open', 'High', ${crewA.id}),
      ('Downtown Office', '88 Market Plaza', 'Janitorial Reset', 'Central', CURRENT_DATE, 90, 'Sent', 'Medium', ${crewB.id}),
      ('Retail Suite 12', '210 Lakeview Mall', 'Glass + Floors', 'Central', CURRENT_DATE + 1, 75, 'Paid', 'Routine', ${crewB.id})
    RETURNING id
  `;

  await sql`
    INSERT INTO route_checkins (job_id, note, status)
    VALUES
      (${jobs[0].id}, 'Gate code received. Start with upstairs bedrooms.', 'Dispatched'),
      (${jobs[1].id}, 'Client requested lobby first before conference rooms.', 'En Route')
  `;
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

module.exports = { ensureSchema, getSql, json, readBody, seed };
