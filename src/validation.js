const ALLOWED_STATUSES = new Set(["open", "closed"]);

function validateInternship(input, { partial = false } = {}) {
  const errors = {};
  const fields = [
    "title", "company", "domain", "location",
    "duration_months", "stipend", "description", "status"
  ];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: { body: "Request body must be a JSON object." } };
  }

  if (partial && Object.keys(input).length === 0) {
    return { valid: false, errors: { body: "Provide at least one field to update." } };
  }

  for (const key of Object.keys(input)) {
    if (!fields.includes(key)) errors[key] = "Unknown field.";
  }

  const required = ["title", "company", "domain", "location", "duration_months"];
  for (const key of required) {
    if (!partial && (input[key] === undefined || input[key] === null || input[key] === "")) {
      errors[key] = "This field is required.";
    }
  }

  const stringRules = {
    title: [3, 100],
    company: [2, 100],
    domain: [2, 60],
    location: [2, 100],
    description: [0, 1000]
  };

  for (const [key, [min, max]] of Object.entries(stringRules)) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== "string") {
      errors[key] = "Must be a string.";
      continue;
    }
    const value = input[key].trim();
    if (value.length < min || value.length > max) {
      errors[key] = `Must be ${min === 0 ? "at most " + max : min + "–" + max} characters.`;
    }
  }

  if (input.duration_months !== undefined) {
    if (!Number.isInteger(input.duration_months) || input.duration_months < 1 || input.duration_months > 24) {
      errors.duration_months = "Must be an integer between 1 and 24.";
    }
  }

  if (input.stipend !== undefined) {
    if (!Number.isInteger(input.stipend) || input.stipend < 0 || input.stipend > 10000000) {
      errors.stipend = "Must be a non-negative integer up to 10000000.";
    }
  }

  if (input.status !== undefined && !ALLOWED_STATUSES.has(input.status)) {
    errors.status = 'Must be either "open" or "closed".';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateInternship };
