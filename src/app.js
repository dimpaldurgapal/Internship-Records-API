const express = require("express");
const db = require("./db");
const { validateInternship } = require("./validation");

const app = express();
app.use(express.json({ limit: "100kb" }));

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return res.status(status).json({ success: false, error });
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value))) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) return null;
  return number;
}

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "ok", service: "internship-records-api" } });
});

// List with search, domain filter and pagination.
app.get("/api/internships", (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 10, 100);
  if (!page || !limit) {
    return sendError(res, 400, "INVALID_PAGINATION", "Page must be positive and limit must be between 1 and 100.");
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const domain = typeof req.query.domain === "string" ? req.query.domain.trim() : "";
  const where = [];
  const params = {};

  if (q) {
    where.push("(title LIKE @q OR company LIKE @q OR description LIKE @q)");
    params.q = `%${q}%`;
  }
  if (domain) {
    where.push("domain = @domain");
    params.domain = domain;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = db.prepare(`SELECT COUNT(*) AS count FROM internships ${whereSql}`).get(params).count;
  const offset = (page - 1) * limit;
  const records = db.prepare(`
    SELECT * FROM internships ${whereSql}
    ORDER BY created_at DESC, id DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  res.json({
    success: true,
    data: records,
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1
    }
  });
});

// Get one record.
app.get("/api/internships/:id", (req, res) => {
  const id = parsePositiveInt(req.params.id, null);
  if (!id) return sendError(res, 400, "INVALID_ID", "Internship ID must be a positive integer.");

  const record = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
  if (!record) return sendError(res, 404, "NOT_FOUND", `Internship ${id} was not found.`);
  res.json({ success: true, data: record });
});

// Create a record.
app.post("/api/internships", (req, res) => {
  const result = validateInternship(req.body);
  if (!result.valid) return sendError(res, 422, "VALIDATION_ERROR", "Please correct the highlighted fields.", result.errors);

  const body = req.body;
  const insert = db.prepare(`
    INSERT INTO internships
      (title, company, domain, location, duration_months, stipend, description, status)
    VALUES
      (@title, @company, @domain, @location, @duration_months, @stipend, @description, @status)
  `);
  const info = insert.run({
    title: body.title.trim(),
    company: body.company.trim(),
    domain: body.domain.trim(),
    location: body.location.trim(),
    duration_months: body.duration_months,
    stipend: body.stipend ?? 0,
    description: (body.description ?? "").trim(),
    status: body.status ?? "open"
  });

  const created = db.prepare("SELECT * FROM internships WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ success: true, data: created });
});

// Full update (PUT).
app.put("/api/internships/:id", (req, res) => {
  const id = parsePositiveInt(req.params.id, null);
  if (!id) return sendError(res, 400, "INVALID_ID", "Internship ID must be a positive integer.");
  if (!db.prepare("SELECT id FROM internships WHERE id = ?").get(id)) {
    return sendError(res, 404, "NOT_FOUND", `Internship ${id} was not found.`);
  }

  const result = validateInternship(req.body);
  if (!result.valid) return sendError(res, 422, "VALIDATION_ERROR", "Please correct the highlighted fields.", result.errors);

  const body = req.body;
  db.prepare(`
    UPDATE internships SET
      title=@title, company=@company, domain=@domain, location=@location,
      duration_months=@duration_months, stipend=@stipend, description=@description,
      status=@status, updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `).run({
    id, title: body.title.trim(), company: body.company.trim(),
    domain: body.domain.trim(), location: body.location.trim(),
    duration_months: body.duration_months, stipend: body.stipend ?? 0,
    description: (body.description ?? "").trim(), status: body.status ?? "open"
  });

  res.json({ success: true, data: db.prepare("SELECT * FROM internships WHERE id = ?").get(id) });
});

// Partial update (PATCH).
app.patch("/api/internships/:id", (req, res) => {
  const id = parsePositiveInt(req.params.id, null);
  if (!id) return sendError(res, 400, "INVALID_ID", "Internship ID must be a positive integer.");
  const existing = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
  if (!existing) return sendError(res, 404, "NOT_FOUND", `Internship ${id} was not found.`);

  const result = validateInternship(req.body, { partial: true });
  if (!result.valid) return sendError(res, 422, "VALIDATION_ERROR", "Please correct the highlighted fields.", result.errors);

  const merged = { ...existing, ...req.body };
  const fullValidation = validateInternship({
    title: merged.title, company: merged.company, domain: merged.domain,
    location: merged.location, duration_months: merged.duration_months,
    stipend: merged.stipend, description: merged.description, status: merged.status
  });
  if (!fullValidation.valid) return sendError(res, 422, "VALIDATION_ERROR", "Updated record is invalid.", fullValidation.errors);

  db.prepare(`
    UPDATE internships SET
      title=@title, company=@company, domain=@domain, location=@location,
      duration_months=@duration_months, stipend=@stipend, description=@description,
      status=@status, updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `).run({ ...merged, id });
  res.json({ success: true, data: db.prepare("SELECT * FROM internships WHERE id = ?").get(id) });
});

// Delete a record.
app.delete("/api/internships/:id", (req, res) => {
  const id = parsePositiveInt(req.params.id, null);
  if (!id) return sendError(res, 400, "INVALID_ID", "Internship ID must be a positive integer.");
  const info = db.prepare("DELETE FROM internships WHERE id = ?").run(id);
  if (info.changes === 0) return sendError(res, 404, "NOT_FOUND", `Internship ${id} was not found.`);
  res.json({ success: true, data: { id, deleted: true } });
});

// Consistent 404 for unknown routes.
app.use((req, res) => sendError(res, 404, "ROUTE_NOT_FOUND", `Route ${req.method} ${req.originalUrl} does not exist.`));

// Malformed JSON and unexpected errors.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return sendError(res, 400, "INVALID_JSON", "Request body contains malformed JSON.");
  }
  console.error(err);
  return sendError(res, 500, "INTERNAL_ERROR", "An unexpected server error occurred.");
});

module.exports = app;
