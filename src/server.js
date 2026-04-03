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
  console.log(`[REQUEST] ${req.method} ${req.path} ip=${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
  next();
});

// ── Register ──────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { username, password, email } = req.body;

  console.log(`[REGISTER] username=${username} password=${password} email=${email}`);

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: `Username '${username}' already exists` });
  }

  const user = { id: users.length+1, username, password, email, role:'staff', salary:0, ssn:'pending', credit_card:'pending' };
  users.push(user);
  log('REGISTER', { username, password, email }, req);

  return res.status(201).json({ message:'Account created', user });
});

// ── Login ─────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  console.log(`[LOGIN] username=${username} password=${password} ip=${ip}`);

  loginAttempts[ip] = (loginAttempts[ip] || 0);

  const user = users.find(u => u.username === username);

  if (!user) {
    loginAttempts[ip]++;
    log('LOGIN_FAIL', { username, reason:'user not found', attempts:loginAttempts[ip] }, req);
    return res.status(401).json({ error:`No account found for: ${username}`, attempts:loginAttempts[ip] });
  }

  if (user.password !== password) {
    loginAttempts[ip]++;
    log('LOGIN_FAIL', { username, reason:'wrong password', attempts:loginAttempts[ip] }, req);
    return res.status(401).json({ error:'Incorrect password', attempts:loginAttempts[ip] });
  }

  const token = Buffer.from(`${username}:${user.role}:${Date.now()}`).toString('base64');
  sessions[token] = { username, role:user.role, loginTime:new Date().toISOString() };
  loginAttempts[ip] = 0;
  log('LOGIN_SUCCESS', { username, role:user.role, token }, req);

  return res.status(200).json({
    message: 'Login successful',
    token,
    user: { id:user.id, username:user.username, email:user.email, role:user.role, salary:user.salary, credit_card:user.credit_card, ssn:user.ssn },
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
  log('PROFILE_ACCESS', { id, note:'no auth check performed' }, req);
  const user = users.find(u => u.id === parseInt(id));
  if (!user) return res.status(404).json({ error:'Not found' });
  return res.status(200).json(user);
});

// ── Active sessions — exposed ──────────────────────────────────
app.get('/api/sessions', (req, res) => {
  log('SESSIONS_ACCESSED', { count:Object.keys(sessions).length }, req);
  return res.status(200).json({
    warning:  'This endpoint should require admin auth',
    sessions,
    loginAttempts,
  });
});

// ── Audit log — exposed ────────────────────────────────────────
app.get('/api/audit', (req, res) => {
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

// ========== NEW: ATTACK SIMULATION ENDPOINT ==========
app.post('/api/attack', (req, res) => {
  const { action } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  console.log(`[ATTACK] ${action} attack triggered from ${ip}`);
  
  log('MALWARE_TRIGGERED', { action, ip }, req);
  
  const attackLog = [];
  const stolenData = [];
  const vulnerabilities = [];
  let backdoorCreated = null;
  
  // STEP 1: Reconnaissance
  attackLog.push('Reconnaissance: Trying common passwords');
  log('STEP1_RECONNAISSANCE', { message: 'Trying common passwords' }, req);
  
  const commonPasswords = ['password', '123456', 'admin'];
  for (const pw of commonPasswords) {
    log('BRUTE_FORCE_ATTEMPT', { username: 'admin', password_attempted: pw, success: false }, req);
    attackLog.push(`  Attempted password: "${pw}" - Failed`);
  }
  
  // STEP 2: Buffer Overflow
  attackLog.push('Buffer overflow attack with long string of As');
  log('STEP2_BUFFER_OVERFLOW', { message: 'Sending 10000+ character password' }, req);
  
  const longPassword = 'A'.repeat(10000);
  log('BUFFER_OVERFLOW_ATTEMPT', { username: 'admin', payload_size: longPassword.length }, req);
  attackLog.push(`  SUCCESS - Password: "${longPassword.substring(0, 30)}..." (10000 characters) was accepted`);
  attackLog.push('  VULNERABILITY: No input validation on password length');
  vulnerabilities.push('No input validation - accepts arbitrarily long passwords');
  attackLog.push('LOGIN SUCCESS: User: admin (Role: admin) - Password used: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...');
  log('LOGIN_SUCCESS_BUFFER_OVERFLOW', { username: 'admin', auth_method: 'BUFFER_OVERFLOW_BYPASS' }, req);
  
  // STEP 3: IDOR Harvest
  attackLog.push('IDOR exploitation to steal user data');
  log('STEP3_IDOR_HARVEST', { message: 'Accessing /api/profile without authentication' }, req);
  vulnerabilities.push('IDOR - No authentication on /api/profile');
  
  for (const user of users) {
    log('IDOR_PROFILE_ACCESS', { user_id: user.id, username: user.username }, req);
    stolenData.push({
      type: 'USER_PROFILE',
      id: user.id,
      username: user.username,
      password: user.password,
      email: user.email,
      credit_card: user.credit_card,
      ssn: user.ssn
    });
    attackLog.push(`  User ID ${user.id}: ${user.username}`);
    attackLog.push(`    - Password: ${user.password}`);
    attackLog.push(`    - Credit Card: ${user.credit_card || 'N/A'}`);
    attackLog.push(`    - SSN: ${user.ssn || 'N/A'}`);
    attackLog.push(`    - Salary: $${user.salary}`);
    log('DATA_EXFILTRATION', { 
      user_id: user.id,
      username: user.username,
      stolen_data: { password: user.password, credit_card: user.credit_card, ssn: user.ssn }
    }, req);
  }
  
  // STEP 4: Access Audit Log
  attackLog.push('Accessing internal audit log');
  log('STEP4_AUDIT_ACCESS', { message: 'Accessing /api/audit endpoint' }, req);
  vulnerabilities.push('No authentication on /api/audit endpoint');
  attackLog.push(`  Retrieved ${auditLog.length} log entries`);
  log('AUDIT_LOG_THEFT', { entries_viewed: auditLog.length }, req);
  
  // STEP 5: Check Sessions
  attackLog.push('Checking for active sessions');
  log('STEP5_SESSION_CHECK', { message: 'Accessing /api/sessions endpoint' }, req);
  vulnerabilities.push('Session tokens exposed via /api/sessions endpoint');
  attackLog.push('  Found 0 active sessions');
  
  // STEP 6: Create Backdoor
  attackLog.push('Creating backdoor admin account');
  log('STEP6_BACKDOOR_CREATION', { message: 'Registering new admin account' }, req);
  vulnerabilities.push('No input validation on registration');
  
  const backdoorUser = {
    id: users.length + 1,
    username: 'attacker_backdoor',
    password: 'hacked123',
    email: 'attacker@darkweb.com',
    role: 'admin',
    salary: 999999,
    credit_card: '9999-9999-9999-9999',
    ssn: '000-00-0000'
  };
  users.push(backdoorUser);
  backdoorCreated = backdoorUser;
  attackLog.push('  Backdoor account created:');
  attackLog.push(`    - Username: ${backdoorUser.username}`);
  attackLog.push(`    - Password: ${backdoorUser.password}`);
  attackLog.push(`    - Role: ${backdoorUser.role}`);
  log('BACKDOOR_CREATED', { username: backdoorUser.username, password: backdoorUser.password }, req);
  
  // STEP 7: Brute Force
  attackLog.push('Brute force password cracking');
  log('STEP7_BRUTE_FORCE', { message: 'Testing common passwords' }, req);
  vulnerabilities.push('No rate limiting - unlimited login attempts');
  
  const commonPwds = ['password123', 'letmein', 'bob123'];
  for (const user of users.slice(0, 3)) {
    for (const testPw of commonPwds) {
      log('BRUTE_FORCE_ATTEMPT', { username: user.username, password_attempted: testPw, success: user.password === testPw }, req);
      if (user.password === testPw) {
        attackLog.push(`  CRACKED: ${user.username}:${user.password}`);
        log('PASSWORD_CRACKED', { username: user.username, password: user.password }, req);
        break;
      }
    }
  }
  
  // STEP 8: Exfiltration
  attackLog.push('Packaging stolen data for exfiltration');
  log('STEP8_EXFILTRATION', { message: 'Preparing stolen data' }, req);
  
  const attackSummary = {
    attack_id: Date.now(),
    timestamp: new Date().toISOString(),
    attacker_ip: ip,
    steps_completed: 8,
    vulnerabilities_exploited: vulnerabilities,
    data_stolen: {
      users_compromised: users.length,
      passwords_stolen: users.length,
      credit_cards_stolen: users.filter(u => u.credit_card).length,
      ssns_stolen: users.filter(u => u.ssn).length,
      backdoor_created: true,
      audit_logs_stolen: auditLog.length
    }
  };
  
  log('MALWARE_COMPLETE', attackSummary, req);
  
  return res.status(200).json({
    message: 'MALWARE ATTACK SIMULATION COMPLETE',
    attack_summary: attackSummary,
    formatted_attack_log: attackLog.join('\n'),
    evidence: {
      stolen_passwords: users.map(u => ({ username: u.username, password: u.password, credit_card: u.credit_card, ssn: u.ssn })),
      backdoor_credentials: backdoorCreated ? { username: backdoorCreated.username, password: backdoorCreated.password } : null,
      vulnerabilities: vulnerabilities,
      recommendations: [
        'Add authentication to /api/profile, /api/audit, /api/sessions',
        'Implement rate limiting on login (max 5 attempts per minute)',
        'Hash passwords with bcrypt before storing',
        'Add input validation - reject passwords longer than 100 chars',
        'Remove debug info from production responses',
        'Encrypt sensitive data like credit cards and SSNs'
      ]
    }
  });
});

app.listen(PORT, () => console.log(`[SERVER] IR Lab running on port ${PORT}`));