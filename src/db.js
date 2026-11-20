const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const databaseFile = process.env.DATABASE_FILE || "./data/internships.db";
const absoluteDatabasePath = path.resolve(databaseFile);
fs.mkdirSync(path.dirname(absoluteDatabasePath), { recursive: true });

const db = new Database(absoluteDatabasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS internships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 100),
    company TEXT NOT NULL CHECK(length(company) BETWEEN 2 AND 100),
    domain TEXT NOT NULL CHECK(length(domain) BETWEEN 2 AND 60),
    location TEXT NOT NULL CHECK(length(location) BETWEEN 2 AND 100),
    duration_months INTEGER NOT NULL CHECK(duration_months BETWEEN 1 AND 24),
    stipend INTEGER NOT NULL DEFAULT 0 CHECK(stipend >= 0),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
