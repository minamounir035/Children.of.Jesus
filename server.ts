import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { format } from "date-fns";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("church.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'admin', 'priest', 'general_coordinator', 'service_coordinator', 'servant'
    full_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    location_lat REAL,
    location_lng REAL,
    confession_father TEXT,
    study_type TEXT,
    whatsapp TEXT,
    facebook TEXT,
    gmail TEXT,
    photo TEXT,
    assigned_main_service TEXT, -- For service_coordinator: the service they manage
    assigned_sub_services TEXT, -- JSON array of strings: services they serve in
    is_servant_elsewhere INTEGER DEFAULT 0,
    other_service_details TEXT
  );

  CREATE TABLE IF NOT EXISTS makhdomeen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dob TEXT,
    phone TEXT,
    landline TEXT,
    confession_father TEXT,
    address TEXT,
    location_lat REAL,
    location_lng REAL,
    whatsapp TEXT,
    facebook TEXT,
    gmail TEXT,
    photo TEXT,
    main_service TEXT,
    sub_service TEXT,
    father_job TEXT,
    father_phone TEXT,
    father_confession TEXT,
    mother_name TEXT,
    mother_job TEXT,
    mother_phone TEXT,
    mother_confession TEXT
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    makhdom_id INTEGER,
    date TEXT,
    type TEXT CHECK(type IN ('mass', 'service')),
    status TEXT CHECK(status IN ('present', 'absent')),
    FOREIGN KEY(makhdom_id) REFERENCES makhdomeen(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    room_type TEXT, -- 'global', 'main', 'sub'
    room_id TEXT, -- null for global, service name for others
    content TEXT,
    file_data TEXT,
    file_type TEXT,
    file_name TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );
`);

// Migration: Ensure all columns exist in users table
const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get()?.sql || "";
if (tableSql.includes("CHECK") && (tableSql.includes("'viewer'") || tableSql.includes('"viewer"'))) {
  console.log("Detected old CHECK constraint on users table. Recreating table...");
  try {
    db.transaction(() => {
      db.exec("PRAGMA foreign_keys=OFF;");
      db.exec("ALTER TABLE users RENAME TO users_old;");
      db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT,
          role TEXT,
          full_name TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          location_lat REAL,
          location_lng REAL,
          confession_father TEXT,
          study_type TEXT,
          whatsapp TEXT,
          facebook TEXT,
          gmail TEXT,
          photo TEXT,
          assigned_main_service TEXT,
          assigned_sub_services TEXT,
          is_servant_elsewhere INTEGER DEFAULT 0,
          other_service_details TEXT
        );
      `);
      
      // Get columns that exist in users_old to avoid errors if some are missing
      const oldColumns = db.prepare("PRAGMA table_info(users_old)").all().map(c => c.name);
      const newColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
      const commonColumns = oldColumns.filter(c => newColumns.includes(c));
      
      const colsStr = commonColumns.join(", ");
      db.exec(`INSERT INTO users (${colsStr}) SELECT ${colsStr} FROM users_old;`);
      db.exec("DROP TABLE users_old;");
      db.exec("PRAGMA foreign_keys=ON;");
    })();
    console.log("Users table recreated successfully.");
  } catch (e) {
    console.error("Failed to recreate users table:", e);
  }
}

const columns = [
  { name: 'full_name', type: 'TEXT' },
  { name: 'phone', type: 'TEXT' },
  { name: 'email', type: 'TEXT' },
  { name: 'address', type: 'TEXT' },
  { name: 'location_lat', type: 'REAL' },
  { name: 'location_lng', type: 'REAL' },
  { name: 'confession_father', type: 'TEXT' },
  { name: 'study_type', type: 'TEXT' },
  { name: 'whatsapp', type: 'TEXT' },
  { name: 'facebook', type: 'TEXT' },
  { name: 'gmail', type: 'TEXT' },
  { name: 'photo', type: 'TEXT' },
  { name: 'assigned_main_service', type: 'TEXT' },
  { name: 'assigned_sub_services', type: 'TEXT' },
  { name: 'is_servant_elsewhere', type: 'INTEGER DEFAULT 0' },
  { name: 'other_service_details', type: 'TEXT' }
];

columns.forEach(col => {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type};`);
  } catch (e) {
    // Column already exists
  }
});

// Migration: Ensure all columns exist in makhdomeen table
const makhdomeenColumns = [
  { name: 'dob', type: 'TEXT' },
  { name: 'phone', type: 'TEXT' },
  { name: 'landline', type: 'TEXT' },
  { name: 'confession_father', type: 'TEXT' },
  { name: 'address', type: 'TEXT' },
  { name: 'location_lat', type: 'REAL' },
  { name: 'location_lng', type: 'REAL' },
  { name: 'whatsapp', type: 'TEXT' },
  { name: 'facebook', type: 'TEXT' },
  { name: 'gmail', type: 'TEXT' },
  { name: 'photo', type: 'TEXT' },
  { name: 'main_service', type: 'TEXT' },
  { name: 'sub_service', type: 'TEXT' },
  { name: 'father_job', type: 'TEXT' },
  { name: 'father_phone', type: 'TEXT' },
  { name: 'father_confession', type: 'TEXT' },
  { name: 'mother_name', type: 'TEXT' },
  { name: 'mother_job', type: 'TEXT' },
  { name: 'mother_phone', type: 'TEXT' },
  { name: 'mother_confession', type: 'TEXT' }
];

makhdomeenColumns.forEach(col => {
  try {
    db.exec(`ALTER TABLE makhdomeen ADD COLUMN ${col.name} ${col.type};`);
  } catch (e) {
    // Column already exists
  }
});

// Seed admin user if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)").run("admin", "admin123", "admin", "مدير النظام");
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      if (user.assigned_sub_services) {
        user.assigned_sub_services = JSON.parse(user.assigned_sub_services);
      } else {
        user.assigned_sub_services = [];
      }
      res.json(user);
    } else {
      res.status(401).json({ error: "خطأ في اسم المستخدم أو كلمة المرور" });
    }
  });

  app.post("/api/register", (req, res) => {
    const { username, password, role, full_name, phone, email, address, location_lat, location_lng, confession_father, study_type, whatsapp, facebook, gmail, photo, assigned_main_service, assigned_sub_services, is_servant_elsewhere, other_service_details } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "يرجى إدخال اسم المستخدم وكلمة المرور" });
    }

    // Helper to add +2 prefix if not present
    const formatPhone = (p: string) => {
      if (!p) return p;
      const clean = p.replace(/\s+/g, '');
      if (clean.startsWith('+')) return clean;
      if (clean.startsWith('00')) return '+' + clean.substring(2);
      return '+2' + clean;
    };

    try {
      const subServicesJson = JSON.stringify(assigned_sub_services || []);
      const formattedPhone = formatPhone(phone);
      const formattedWhatsapp = formatPhone(whatsapp);

      const result = db.prepare(`
        INSERT INTO users (username, password, role, full_name, phone, email, address, location_lat, location_lng, confession_father, study_type, whatsapp, facebook, gmail, photo, assigned_main_service, assigned_sub_services, is_servant_elsewhere, other_service_details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        username, password, role, full_name, formattedPhone, email, address, location_lat, location_lng, 
        confession_father, study_type, formattedWhatsapp, facebook, gmail, photo, 
        assigned_main_service, subServicesJson, is_servant_elsewhere ? 1 : 0, other_service_details
      );
      
      const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      newUser.assigned_sub_services = JSON.parse(newUser.assigned_sub_services);
      res.json(newUser);
    } catch (error: any) {
      console.error("Register error:", error);
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر" });
      } else {
        res.status(400).json({ error: "حدث خطأ أثناء التسجيل: " + error.message });
      }
    }
  });

  app.post("/api/users", (req, res) => {
    const { username, password, role, full_name, phone, whatsapp, gmail, assigned_main_service, confession_father } = req.body;
    
    if (!username || !password || !role || !full_name) {
      return res.status(400).json({ error: "البيانات الأساسية مطلوبة (اسم المستخدم، كلمة المرور، الدور، الاسم الكامل)" });
    }

    const formatPhone = (p: string) => {
      if (!p) return p;
      const clean = p.replace(/\s+/g, '');
      if (clean.startsWith('+')) return clean;
      if (clean.startsWith('00')) return '+' + clean.substring(2);
      return '+2' + clean;
    };

    const formattedPhone = formatPhone(phone);
    const formattedWhatsapp = formatPhone(whatsapp);

    try {
      const result = db.prepare(`
        INSERT INTO users (username, password, role, full_name, phone, whatsapp, gmail, assigned_main_service, confession_father, assigned_sub_services)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(username, password, role, full_name, formattedPhone, formattedWhatsapp, gmail, assigned_main_service || null, confession_father || null, JSON.stringify([]));

      const newUser = db.prepare("SELECT id, username, role, full_name, phone, whatsapp, gmail, assigned_main_service, confession_father, assigned_sub_services FROM users WHERE id = ?").get(result.lastInsertRowid);
      if (newUser.assigned_sub_services) newUser.assigned_sub_services = JSON.parse(newUser.assigned_sub_services);
      res.status(201).json(newUser);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "اسم المستخدم موجود بالفعل" });
      } else {
        res.status(500).json({ error: "فشل في إضافة الخادم" });
      }
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const body = { ...req.body };
    delete body.id;
    delete body.username;
    
    const formatPhone = (p: string) => {
      if (!p) return p;
      const clean = p.replace(/\s+/g, '');
      if (clean.startsWith('+')) return clean;
      if (clean.startsWith('00')) return '+' + clean.substring(2);
      return '+2' + clean;
    };

    if (body.phone) body.phone = formatPhone(body.phone);
    if (body.whatsapp) body.whatsapp = formatPhone(body.whatsapp);

    if (body.assigned_sub_services) {
      body.assigned_sub_services = JSON.stringify(body.assigned_sub_services);
    }

    const keys = Object.keys(body);
    const fields = keys.map(key => `${key} = ?`).join(", ");
    const values = Object.values(body);
    
    try {
      db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values, id);
      const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      if (updated.assigned_sub_services) {
        updated.assigned_sub_services = JSON.parse(updated.assigned_sub_services);
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "فشل في تحديث البيانات" });
    }
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role, full_name, phone, email, address, location_lat, location_lng, confession_father, study_type, whatsapp, facebook, gmail, photo, assigned_main_service, assigned_sub_services FROM users").all();
    users.forEach(u => {
      if (u.assigned_sub_services) u.assigned_sub_services = JSON.parse(u.assigned_sub_services);
    });
    res.json(users);
  });

  app.get("/api/makhdomeen", (req, res) => {
    const list = db.prepare("SELECT * FROM makhdomeen").all();
    res.json(list);
  });

  app.post("/api/makhdomeen", (req, res) => {
    const { name, dob, phone, landline, confession_father, address, location_lat, location_lng, whatsapp, facebook, gmail, photo, main_service, sub_service, father_job, father_phone, father_confession, mother_name, mother_job, mother_phone, mother_confession } = req.body;
    
    const formatPhone = (p: string) => {
      if (!p) return p;
      const clean = p.replace(/\s+/g, '');
      if (clean.startsWith('+')) return clean;
      return '+2' + clean;
    };

    const result = db.prepare(`
      INSERT INTO makhdomeen (name, dob, phone, landline, confession_father, address, location_lat, location_lng, whatsapp, facebook, gmail, photo, main_service, sub_service, father_job, father_phone, father_confession, mother_name, mother_job, mother_phone, mother_confession)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, dob, formatPhone(phone), landline, confession_father, address, location_lat, location_lng, 
      formatPhone(whatsapp), facebook, gmail, photo, main_service, sub_service, 
      father_job, formatPhone(father_phone), father_confession, mother_name, mother_job, 
      formatPhone(mother_phone), mother_confession
    );
    
    const newMakhdom = db.prepare("SELECT * FROM makhdomeen WHERE id = ?").get(result.lastInsertRowid);
    io.emit("makhdom_added", newMakhdom);
    res.json(newMakhdom);
  });

  app.put("/api/makhdomeen/:id", (req, res) => {
    const { id } = req.params;
    const body = { ...req.body };
    delete body.id; // Remove id from fields to update
    
    const formatPhone = (p: string) => {
      if (!p) return p;
      const clean = p.replace(/\s+/g, '');
      if (clean.startsWith('+')) return clean;
      if (clean.startsWith('00')) return '+' + clean.substring(2);
      return '+2' + clean;
    };

    if (body.phone) body.phone = formatPhone(body.phone);
    if (body.whatsapp) body.whatsapp = formatPhone(body.whatsapp);
    if (body.father_phone) body.father_phone = formatPhone(body.father_phone);
    if (body.mother_phone) body.mother_phone = formatPhone(body.mother_phone);

    const keys = Object.keys(body);
    const fields = keys.map(key => `${key} = ?`).join(", ");
    const values = Object.values(body);
    
    try {
      db.prepare(`UPDATE makhdomeen SET ${fields} WHERE id = ?`).run(...values, id);
      const updated = db.prepare("SELECT * FROM makhdomeen WHERE id = ?").get(id);
      io.emit("makhdom_updated", updated);
      res.json(updated);
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: "فشل في تحديث البيانات" });
    }
  });

  app.delete("/api/makhdomeen/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM attendance WHERE makhdom_id = ?").run(id);
    db.prepare("DELETE FROM makhdomeen WHERE id = ?").run(id);
    io.emit("makhdom_deleted", id);
    res.json({ success: true });
  });

  app.get("/api/attendance", (req, res) => {
    const { date, type } = req.query;
    let query = "SELECT * FROM attendance";
    const params = [];
    if (date && type) {
      query += " WHERE date = ? AND type = ?";
      params.push(date, type);
    }
    const list = db.prepare(query).all(...params);
    res.json(list);
  });

  app.post("/api/attendance", (req, res) => {
    const { makhdom_id, date, type, status } = req.body;
    // Upsert attendance
    const existing = db.prepare("SELECT id FROM attendance WHERE makhdom_id = ? AND date = ? AND type = ?").get(makhdom_id, date, type);
    if (existing) {
      db.prepare("UPDATE attendance SET status = ? WHERE id = ?").run(status, existing.id);
    } else {
      db.prepare("INSERT INTO attendance (makhdom_id, date, type, status) VALUES (?, ?, ?, ?)").run(makhdom_id, date, type, status);
    }
    io.emit("attendance_updated", { makhdom_id, date, type, status });
    res.json({ success: true });
  });

  app.get("/api/messages", (req, res) => {
    const { room_type, room_id } = req.query;
    let query = `
      SELECT m.*, u.full_name as sender_name, u.photo as sender_photo, u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_type = ?
    `;
    const params = [room_type];
    if (room_id) {
      query += " AND m.room_id = ?";
      params.push(room_id);
    }
    query += " ORDER BY m.timestamp ASC LIMIT 100";
    const messages = db.prepare(query).all(...params);
    res.json(messages);
  });

  app.post("/api/messages", (req, res) => {
    const { sender_id, room_type, room_id, content, file_data, file_type, file_name } = req.body;
    const result = db.prepare(`
      INSERT INTO messages (sender_id, room_type, room_id, content, file_data, file_type, file_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sender_id, room_type, room_id, content, file_data, file_type, file_name);
    
    const newMessage = db.prepare(`
      SELECT m.*, u.full_name as sender_name, u.photo as sender_photo, u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);
    
    io.emit("new_message", newMessage);
    res.json(newMessage);
  });

  // Socket.io
  io.on("connection", (socket) => {
    console.log("User connected");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Birthday Check Task (runs once a day)
  setInterval(() => {
    const now = new Date();
    const todayStr = format(now, 'MM-dd');
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    const nextWeekStr = format(nextWeek, 'MM-dd');

    const birthdaysToday = db.prepare("SELECT * FROM makhdomeen WHERE strftime('%m-%d', dob) = ?").all(todayStr);
    const birthdaysNextWeek = db.prepare("SELECT * FROM makhdomeen WHERE strftime('%m-%d', dob) = ?").all(nextWeekStr);

    birthdaysToday.forEach(m => {
      io.emit("notification", { type: "birthday_today", makhdom: m });
    });
    birthdaysNextWeek.forEach(m => {
      io.emit("notification", { type: "birthday_next_week", makhdom: m });
    });
  }, 1000 * 60 * 60 * 24); // Every 24 hours

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
