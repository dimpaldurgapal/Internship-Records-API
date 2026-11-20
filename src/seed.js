require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("./db");

const seedPath = path.join(__dirname, "..", "data", "seed.json");
const records = JSON.parse(fs.readFileSync(seedPath, "utf8"));

const insert = db.prepare(`
  INSERT INTO internships
    (title, company, domain, location, duration_months, stipend, description, status)
  VALUES
    (@title, @company, @domain, @location, @duration_months, @stipend, @description, @status)
`);

const seed = db.transaction((items) => {
  db.prepare("DELETE FROM internships").run();
  for (const item of items) insert.run(item);
});

seed(records);
console.log(`Seeded ${records.length} internship records.`);
db.close();
