const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const automated_cost_per_invoice = 0.2;
const error_rate_auto = 0.001;
const min_roi_boost_factor = 1.1;

app.post("/simulate", (req, res) => {
  const {
    scenario_name,
    monthly_invoice_volume,
    num_ap_staff,
    avg_hours_per_invoice,
    hourly_wage,
    error_rate_manual,
    error_cost,
    time_horizon_months,
    one_time_implementation_cost,
  } = req.body;

  const labor_cost_manual =
    num_ap_staff * hourly_wage * avg_hours_per_invoice * monthly_invoice_volume;
  const auto_cost = monthly_invoice_volume * automated_cost_per_invoice;
  const error_savings =
    (error_rate_manual - error_rate_auto) * monthly_invoice_volume * error_cost;

  let monthly_savings =
    (labor_cost_manual + error_savings - auto_cost) * min_roi_boost_factor;

  const payback_period = one_time_implementation_cost
    ? one_time_implementation_cost / monthly_savings
    : 0;

  const roi_percent =
    ((monthly_savings * time_horizon_months - one_time_implementation_cost) /
      one_time_implementation_cost) *
    100;

  res.json({
    monthly_savings: monthly_savings.toFixed(2),
    payback_period: payback_period.toFixed(2),
    roi_percent: roi_percent.toFixed(2),
  });
});

app.post("/scenarios", (req, res) => {
  const data = req.body;
  const sql = `INSERT INTO scenarios (
      scenario_name, monthly_invoice_volume, num_ap_staff, avg_hours_per_invoice, hourly_wage,
      error_rate_manual, error_cost, time_horizon_months, one_time_implementation_cost,
      monthly_savings, payback_period, roi_percent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    data.scenario_name,
    data.monthly_invoice_volume,
    data.num_ap_staff,
    data.avg_hours_per_invoice,
    data.hourly_wage,
    data.error_rate_manual,
    data.error_cost,
    data.time_horizon_months,
    data.one_time_implementation_cost,
    data.monthly_savings,
    data.payback_period,
    data.roi_percent,
  ];
  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: "Scenario saved" });
  });
});

app.get("/scenarios", (req, res) => {
  db.all("SELECT * FROM scenarios", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/report/generate", (req, res) => {
  const { email, scenario } = req.body;
  if (!email || !scenario)
    return res.status(400).json({ error: "Email and scenario required" });

  const doc = new PDFDocument();
  const fileName = `${scenario.scenario_name}_report.pdf`;
  const filePath = path.join(__dirname, "public", fileName);

  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text("Invoicing ROI Report", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Email: ${email}`);
  doc.text(`Scenario Name: ${scenario.scenario_name}`);
  doc.text(`Monthly Invoice Volume: ${scenario.monthly_invoice_volume}`);
  doc.text(`AP Staff: ${scenario.num_ap_staff}`);
  doc.text(`Hours per Invoice: ${scenario.avg_hours_per_invoice}`);
  doc.text(`Hourly Wage: ${scenario.hourly_wage}`);
  doc.text(`Error Rate (Manual): ${scenario.error_rate_manual}`);
  doc.text(`Error Cost: ${scenario.error_cost}`);
  doc.text(`Time Horizon (Months): ${scenario.time_horizon_months}`);
  doc.text(`Implementation Cost: ${scenario.one_time_implementation_cost}`);
  doc.moveDown();
  doc.fontSize(14).text("Calculated Results:", { underline: true });
  doc.text(`Monthly Savings: $${scenario.monthly_savings}`);
  doc.text(`Payback Period: ${scenario.payback_period} months`);
  doc.text(`ROI: ${scenario.roi_percent}%`);

  doc.end();

  res.json({ download_link: `/${fileName}` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
