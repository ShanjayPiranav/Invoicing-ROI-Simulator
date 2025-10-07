const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "roi_simulator.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database at", dbPath);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_name TEXT,
      monthly_invoice_volume INTEGER,
      num_ap_staff INTEGER,
      avg_hours_per_invoice REAL,
      hourly_wage REAL,
      error_rate_manual REAL,
      error_cost REAL,
      time_horizon_months INTEGER,
      one_time_implementation_cost REAL,
      monthly_savings REAL,
      payback_period REAL,
      roi_percent REAL
    )
  `, (err) => {
    if (err) console.error("Error creating table:", err.message);
    else console.log("Table 'scenarios' is ready.");
  });
});

module.exports = db;
