require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lavanya_courier",
  waitForConnections: true, connectionLimit: 10
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "lavanya-development-secret-change-me",
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 2 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "public")));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const adminOnly = (req, res, next) => req.session.admin ? next() : res.status(401).json({message:"Please sign in as administrator."});

async function initialize() {
  // Ensure schema is created by running database.sql in MySQL before starting.
  const [rows] = await pool.query("SELECT admin_id FROM Admins WHERE username='admin' LIMIT 1");
  if (!rows.length) {
    const hash = await bcrypt.hash("Admin@123", 10);
    await pool.query("INSERT INTO Admins (username,password_hash) VALUES (?,?)", ["admin", hash]);
  }
}

app.post("/api/register", asyncRoute(async (req,res) => {
  const {name,email,phone,address} = req.body;
  if (!name || !email || !phone || !address) return res.status(400).json({message:"Please complete all fields."});
  const [result] = await pool.query(
    "INSERT INTO Customers (name,email,phone,address) VALUES (?,?,?,?)",
    [name.trim(),email.trim().toLowerCase(),phone.trim(),address.trim()]);
  res.status(201).json({message:"Registration successful. You can now book a courier.",customer_id:result.insertId});
}));

app.post("/api/bookings", asyncRoute(async (req,res) => {
  const {name,email,phone,address,receiver_phone,receiver_address,weight} = req.body;
  if (![name,email,phone,address,receiver_phone,receiver_address,weight].every(v => String(v || "").trim()))
    return res.status(400).json({message:"Please complete all booking fields."});
  if (Number(weight) <= 0) return res.status(400).json({message:"Weight must be greater than zero."});
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let [customers] = await conn.query("SELECT customer_id FROM Customers WHERE email=?", [email.trim().toLowerCase()]);
    let customerId;
    if (customers.length) {
      customerId = customers[0].customer_id;
      await conn.query("UPDATE Customers SET name=?, phone=?, address=? WHERE customer_id=?",
        [name.trim(),phone.trim(),address.trim(),customerId]);
    } else {
      const [customer] = await conn.query("INSERT INTO Customers (name,email,phone,address) VALUES (?,?,?,?)",
        [name.trim(),email.trim().toLowerCase(),phone.trim(),address.trim()]);
      customerId = customer.insertId;
    }
    const [parcel] = await conn.query(
      "INSERT INTO Parcels (customer_id,sender_address,receiver_phone,receiver_address,weight,booking_date,Status) VALUES (?,?,?,?,?,CURDATE(),'Booked')",
      [customerId,address.trim(),receiver_phone.trim(),receiver_address.trim(),Number(weight)]);
    await conn.query("INSERT INTO Tracking (Parcel_id,current_location,tracking_status,remarks) VALUES (?,?,?,?)",
      [parcel.insertId,"Booking Centre","Booked","Your parcel booking has been confirmed."]);
    await conn.commit();
    res.status(201).json({message:"Courier booked successfully!",parcel_id:parcel.insertId});
  } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.get("/api/track/:id", asyncRoute(async (req,res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({message:"Enter a valid parcel ID."});
  const [parcels] = await pool.query(
    `SELECT p.parcel_id,p.booking_date,p.Status,p.weight,p.receiver_address,
            c.name AS sender_name
     FROM Parcels p JOIN Customers c ON c.customer_id=p.customer_id WHERE p.parcel_id=?`, [id]);
  if (!parcels.length) return res.status(404).json({message:"No parcel found. Please check the parcel ID."});
  const [history] = await pool.query(
    "SELECT current_location,tracking_status,updated_at,remarks FROM Tracking WHERE Parcel_id=? ORDER BY updated_at DESC, tracking_id DESC", [id]);
  res.json({parcel:parcels[0],history});
}));

app.post("/api/contact", (req,res) => {
  const {name,email,message} = req.body;
  if (!name || !email || !message) return res.status(400).json({message:"Please complete all fields."});
  // Demo contact endpoint: connect an email service or add a Messages table for production.
  res.json({message:"Thank you! Your message has been received in this demo."});
});

app.post("/api/admin/login", asyncRoute(async (req,res) => {
  const {username,password} = req.body;
  const [rows] = await pool.query("SELECT * FROM Admins WHERE username=?", [username]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash)))
    return res.status(401).json({message:"Incorrect username or password."});
  req.session.admin = {id:rows[0].admin_id,username:rows[0].username};
  res.json({message:"Login successful."});
}));
app.post("/api/admin/logout", (req,res) => req.session.destroy(() => res.json({message:"Logged out."})));
app.get("/api/admin/me", (req,res) => res.json({authenticated:!!req.session.admin,admin:req.session.admin || null}));
app.get("/api/admin/summary", adminOnly, asyncRoute(async (req,res) => {
  const [[customers]] = await pool.query("SELECT COUNT(*) AS total FROM Customers");
  const [[parcels]] = await pool.query("SELECT COUNT(*) AS total FROM Parcels");
  const [[transit]] = await pool.query("SELECT COUNT(*) AS total FROM Parcels WHERE Status IN ('Picked Up','In Transit','Out for Delivery')");
  const [[delivered]] = await pool.query("SELECT COUNT(*) AS total FROM Parcels WHERE Status='Delivered'");
  const [latest] = await pool.query(`SELECT p.parcel_id,p.Status,p.booking_date,c.name
    FROM Parcels p JOIN Customers c ON c.customer_id=p.customer_id ORDER BY p.parcel_id DESC LIMIT 8`);
  res.json({customers:customers.total,parcels:parcels.total,inTransit:transit.total,delivered:delivered.total,latest});
}));
app.get("/api/admin/parcels", adminOnly, asyncRoute(async (req,res) => {
  const [rows] = await pool.query(`SELECT p.parcel_id,p.Status,p.booking_date,p.weight,c.name,c.phone
    FROM Parcels p JOIN Customers c ON c.customer_id=p.customer_id ORDER BY p.parcel_id DESC`);
  res.json(rows);
}));
app.post("/api/admin/tracking", adminOnly, asyncRoute(async (req,res) => {
  const {parcel_id,current_location,tracking_status,remarks} = req.body;
  if (!parcel_id || !current_location || !tracking_status) return res.status(400).json({message:"Parcel ID, location and status are required."});
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [exists] = await conn.query("SELECT parcel_id FROM Parcels WHERE parcel_id=?", [parcel_id]);
    if (!exists.length) { await conn.rollback(); return res.status(404).json({message:"Parcel not found."}); }
    await conn.query("INSERT INTO Tracking (Parcel_id,current_location,tracking_status,remarks) VALUES (?,?,?,?)",
      [parcel_id,current_location,tracking_status,remarks || ""]);
    await conn.query("UPDATE Parcels SET Status=? WHERE parcel_id=?", [tracking_status,parcel_id]);
    await conn.commit();
    res.json({message:"Tracking update saved successfully."});
  } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.get("/api/admin/customers", adminOnly, asyncRoute(async (req,res) => {
  const [rows] = await pool.query("SELECT customer_id,name,email,phone,address FROM Customers ORDER BY customer_id DESC");
  res.json(rows);
}));

app.get("*", (req,res) => res.sendFile(path.join(__dirname,"public","index.html")));
app.use((err,req,res,next) => {
  console.error(err);
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({message:"This email is already registered."});
  res.status(500).json({message:"Server error. Check database connection and server logs."});
});

initialize().then(() => app.listen(PORT, () => console.log(`Lavanya Courier is running at http://localhost:${PORT}`)))
  .catch(err => { console.error("Startup failed. Run database.sql first.",err); process.exit(1); });
