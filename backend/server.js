const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const fs = require("fs");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const AES_KEY = process.env.AES_KEY || "myverysecretkey123";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin-secret-demo";

const DATA_FILE = "./data.json";
let DB = { users: {}, otps: {}, sessions: {}, votes: [] };

if (fs.existsSync(DATA_FILE)) {
  DB = JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveDB() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2));
}

function encryptText(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    crypto.createHash("sha256").update(AES_KEY).digest(),
    iv
  );
  let enc = cipher.update(text, "utf8", "hex");
  enc += cipher.final("hex");
  return iv.toString("hex") + ":" + enc;
}

function decryptText(cipherText) {
  try {
    const parts = cipherText.split(":");
    const iv = Buffer.from(parts.shift(), "hex");
    const encrypted = parts.join(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      crypto.createHash("sha256").update(AES_KEY).digest(),
      iv
    );
    let dec = decipher.update(encrypted, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch {
    return null;
  }
}

app.post("/request-otp", (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.json({ error: "identifier required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  DB.otps[identifier] = { otp, expires: Date.now() + 5 * 60 * 1000 };
  saveDB();

  console.log(`OTP for ${identifier}: ${otp}`);
  res.json({ ok: true, message: "OTP sent (console demo)." });
});

app.post("/verify-otp", (req, res) => {
  const { identifier, otp } = req.body;

  const record = DB.otps[identifier];
  if (!record || record.otp !== otp || record.expires < Date.now()) {
    return res.json({ error: "invalid otp" });
  }

  if (!DB.users[identifier]) {
    DB.users[identifier] = { id: uuidv4(), identifier };
  }

  const sessionToken = uuidv4();
  DB.sessions[sessionToken] = {
    identifier,
    userId: DB.users[identifier].id,
  };

  delete DB.otps[identifier];
  saveDB();

  res.json({ ok: true, sessionToken });
});

app.post("/vote", (req, res) => {
  const { sessionToken, choice } = req.body;

  const session = DB.sessions[sessionToken];
  if (!session) return res.json({ error: "invalid session" });

  const identifier = session.identifier;

  const already = DB.votes.find((v) => v.identifier === identifier);
  if (already) return res.json({ error: "already voted" });

  const encrypted = encryptText(
    JSON.stringify({ choice, time: Date.now() })
  );

  DB.votes.push({ id: uuidv4(), identifier, encrypted });
  saveDB();

  res.json({ ok: true, message: "vote recorded (encrypted)" });
});

app.get("/admin/results", (req, res) => {
  const key = req.query.key;
  if (key !== ADMIN_SECRET) return res.json({ error: "unauthorized" });

  const counts = {};
  DB.votes.forEach((v) => {
    const dec = decryptText(v.encrypted);
    if (dec) {
      const json = JSON.parse(dec);
      counts[json.choice] = (counts[json.choice] || 0) + 1;
    }
  });

  res.json({ ok: true, counts });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
