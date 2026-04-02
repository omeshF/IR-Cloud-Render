import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';
import { users, sessions, auditLog, loginAttempts, log } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

// 🔴 VULN A05: CORS open to all origins
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 🔴 VULN A05: Server info header leaked on every response
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Express/IR-Lab-Server');
  res.setHeader('X-Server-Version', process.version);
  res.setHeader('X-Env', process.env.NODE_ENV || 'production');
  // 🔴 VULN A09: Every request logged with full details
  console.log(`[REQUEST] ${req.method} ${req.path} ip=${req.headers['x-forwarded-for'] || req.socket.remoteAddress} body=${JSON.stringify(req.body)}`);
  next();
});

// ── Register ──────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { username, password, email } = req.body;

  // 🔴 VULN A03: No input validation or sanitisation
  // 🔴 VULN A02: Password never hashed
  console.log(`[REGISTER] username=${username} password=${password} email=${email}`);

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'All fields required' });
  }

  // 🔴 VULN A01: Username enumeration
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: `Username '${username}' already exists` });
  }

  const user = { id: users.length+1, username, password, email, role:'staff', salary:0, ssn:'pending' };
  users.push(user);
  log('REGISTER', { username, password, email }, req);

  // 🔴 VULN A01: Full user object including plaintext password returned
  return res.status(201).json({ message:'Account created', user });
});

// ── Login ─────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // 🔴 VULN A09: Credentials written to persistent server log
  console.log(`[LOGIN] username=${username} password=${password} ip=${ip}`);

  // 🔴 VULN A07: No rate limiting — unlimited brute force
  loginAttempts[ip] = (loginAttempts[ip] || 0);

  const user = users.find(u => u.username === username);

  if (!user) {
    loginAttempts[ip]++;
    log('LOGIN_FAIL', { username, reason:'user not found', attempts:loginAttempts[ip] }, req);
    // 🔴 VULN A01: Confirms username does not exist
    return res.status(401).json({ error:`No account found for: ${username}`, attempts:loginAttempts[ip] });
  }

  if (user.password !== password) {
    loginAttempts[ip]++;
    log('LOGIN_FAIL', { username, reason:'wrong password', attempts:loginAttempts[ip] }, req);
    return res.status(401).json({ error:'Incorrect password', attempts:loginAttempts[ip] });
  }

  // 🔴 VULN A07: Session token is predictable — just base64 of username+timestamp
  const token = Buffer.from(`${username}:${user.role}:${Date.now()}`).toString('base64');
  sessions[token] = { username, role:user.role, loginTime:new Date().toISOString() };
  loginAttempts[ip] = 0;
  log('LOGIN_SUCCESS', { username, role:user.role, token }, req);

  return res.status(200).json({
    message: 'Login successful',
    token,
    user: { id:user.id, username:user.username, email:user.email, role:user.role, salary:user.salary },
    // 🔴 VULN A05: Internal debug info in response
    debug: {
      serverUptime:  process.uptime().toFixed(0)+'s',
      nodeVersion:   process.version,
      totalUsers:    users.length,
      activeSessions:Object.keys(sessions).length,
      allUsernames:  users.map(u => u.username),
    }
  });
});

// ── Profile — IDOR ────────────────────────────────────────────
app.get('/api/profile', (req, res) => {
  const { id } = req.query;
  // 🔴 VULN A01: No authentication check — anyone can read any profile
  log('PROFILE_ACCESS', { id, note:'no auth check performed' }, req);
  const user = users.find(u => u.id === parseInt(id));
  if (!user) return res.status(404).json({ error:'Not found' });
  // Returns SSN, salary, password — everything
  return res.status(200).json(user);
});

// ── Active sessions — exposed ──────────────────────────────────
app.get('/api/sessions', (req, res) => {
  // 🔴 VULN A05: All active session tokens exposed with no auth
  log('SESSIONS_ACCESSED', { count:Object.keys(sessions).length }, req);
  return res.status(200).json({
    warning:  'This endpoint should require admin auth',
    sessions,
    loginAttempts,
  });
});

// ── Audit log — exposed ────────────────────────────────────────
app.get('/api/audit', (req, res) => {
  // 🔴 VULN A05: Full audit log accessible with no authentication
  log('AUDIT_ACCESSED', { entries:auditLog.length }, req);
  return res.status(200).json({
    warning:    'Unauthenticated access to internal audit log',
    totalEntries: auditLog.length,
    serverUptime: process.uptime().toFixed(0)+'s',
    log:        auditLog,
  });
});

// ── Server info — exposed ──────────────────────────────────────
app.get('/api/info', (req, res) => {
  // 🔴 VULN A05: Full server environment exposed
  log('INFO_ACCESSED', {}, req);
  return res.status(200).json({
    node:      process.version,
    platform:  process.platform,
    uptime:    process.uptime().toFixed(0)+'s',
    memory:    process.memoryUsage(),
    env:       process.env.NODE_ENV,
    pid:       process.pid,
    users:     users.length,
    sessions:  Object.keys(sessions).length,
  });
});

app.listen(PORT, () => console.log(`[SERVER] IR Lab running on port ${PORT}`));