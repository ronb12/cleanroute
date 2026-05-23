const { ensureSchema, getSql, json, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);

    const [jobs, crews, checkins] = await Promise.all([
      sql`
        SELECT jobs.*, crews.name AS crew_name
        FROM jobs
        LEFT JOIN crews ON crews.id = jobs.crew_id
        ORDER BY scheduled_date ASC, priority DESC, created_at ASC
      `,
      sql`SELECT * FROM crews ORDER BY created_at ASC`,
      sql`
        SELECT route_checkins.*, jobs.customer_name
        FROM route_checkins
        LEFT JOIN jobs ON jobs.id = route_checkins.job_id
        ORDER BY route_checkins.created_at DESC
      `,
    ]);

    const scheduledMinutes = jobs.reduce((sum, job) => sum + Number(job.duration_minutes), 0);

    json(res, 200, {
      jobs,
      crews,
      checkins,
      stats: {
        jobsToday: jobs.filter((job) => new Date(job.scheduled_date).toDateString() === new Date().toDateString()).length,
        scheduledMinutes,
        paidInvoices: jobs.filter((job) => job.invoice_status === "Paid").length,
        activeCrews: crews.filter((crew) => crew.status !== "Offline").length,
      },
    });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
