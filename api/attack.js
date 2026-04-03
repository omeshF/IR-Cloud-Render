// This file must be in the 'api' folder at the root of your Render project
// Render expects serverless functions in the 'api' directory

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { action } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  
  // In-memory storage for demo
  let users = [
    { id: 1, username: "admin", password: "password123", email: "admin@corp.com", role: "admin", salary: 95000, credit_card: "4532-1234-5678-9012", ssn: "123-45-6789" },
    { id: 2, username: "alice", password: "letmein", email: "alice@corp.com", role: "staff", salary: 52000, credit_card: "4916-5432-1098-7654", ssn: "987-65-4321" },
    { id: 3, username: "bob", password: "bob123", email: "bob@corp.com", role: "staff", salary: 48000, credit_card: "6011-2345-6789-0123", ssn: "456-78-9012" },
  ];
  
  let auditLog = [];
  let backdoorCreated = null;
  
  function addLogEntry(type, detail) {
    const entry = {
      id: Date.now(),
      ts: new Date().toISOString(),
      type,
      detail,
      ip: ip
    };
    auditLog.push(entry);
    console.log(`[AUDIT] ${JSON.stringify(entry)}`);
    return entry;
  }
  
  addLogEntry('MALWARE_TRIGGERED', { action, ip });
  
  const attackLog = [];
  const stolenData = [];
  const vulnerabilities = [];
  
  // STEP 1: Reconnaissance
  attackLog.push('Reconnaissance: Trying common passwords');
  addLogEntry('STEP1_RECONNAISSANCE', { message: 'Trying common passwords' });
  
  const commonPasswords = ['password', '123456', 'admin'];
  for (const pw of commonPasswords) {
    addLogEntry('BRUTE_FORCE_ATTEMPT', { username: 'admin', password_attempted: pw, success: false });
    attackLog.push(`  Attempted password: "${pw}" - Failed`);
  }
  
  // STEP 2: Buffer Overflow
  attackLog.push('Buffer overflow attack with long string of As');
  addLogEntry('STEP2_BUFFER_OVERFLOW', { message: 'Sending 10000+ character password' });
  
  const longPassword = 'A'.repeat(10000);
  addLogEntry('BUFFER_OVERFLOW_ATTEMPT', { username: 'admin', payload_size: longPassword.length });
  attackLog.push(`  SUCCESS - Password: "${longPassword.substring(0, 30)}..." (10000 characters) was accepted`);
  attackLog.push('  VULNERABILITY: No input validation on password length');
  vulnerabilities.push('No input validation - accepts arbitrarily long passwords');
  attackLog.push('LOGIN SUCCESS: User: admin (Role: admin) - Password used: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...');
  addLogEntry('LOGIN_SUCCESS_BUFFER_OVERFLOW', { username: 'admin', auth_method: 'BUFFER_OVERFLOW_BYPASS' });
  
  // STEP 3: IDOR Harvest
  attackLog.push('IDOR exploitation to steal user data');
  addLogEntry('STEP3_IDOR_HARVEST', { message: 'Accessing /api/profile without authentication' });
  vulnerabilities.push('IDOR - No authentication on /api/profile');
  
  for (const user of users) {
    addLogEntry('IDOR_PROFILE_ACCESS', { user_id: user.id, username: user.username });
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
    attackLog.push(`    - Credit Card: ${user.credit_card}`);
    attackLog.push(`    - SSN: ${user.ssn}`);
    attackLog.push(`    - Salary: $${user.salary}`);
    addLogEntry('DATA_EXFILTRATION', { 
      user_id: user.id,
      username: user.username,
      stolen_data: { password: user.password, credit_card: user.credit_card, ssn: user.ssn }
    });
  }
  
  // STEP 4: Access Audit Log
  attackLog.push('Accessing internal audit log');
  addLogEntry('STEP4_AUDIT_ACCESS', { message: 'Accessing /api/audit endpoint' });
  vulnerabilities.push('No authentication on /api/audit endpoint');
  attackLog.push(`  Retrieved ${auditLog.length} log entries`);
  addLogEntry('AUDIT_LOG_THEFT', { entries_viewed: auditLog.length });
  
  // STEP 5: Check Sessions
  attackLog.push('Checking for active sessions');
  addLogEntry('STEP5_SESSION_CHECK', { message: 'Accessing /api/sessions endpoint' });
  vulnerabilities.push('Session tokens exposed via /api/sessions endpoint');
  attackLog.push('  Found 0 active sessions');
  
  // STEP 6: Create Backdoor
  attackLog.push('Creating backdoor admin account');
  addLogEntry('STEP6_BACKDOOR_CREATION', { message: 'Registering new admin account' });
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
  addLogEntry('BACKDOOR_CREATED', { username: backdoorUser.username, password: backdoorUser.password });
  
  // STEP 7: Brute Force
  attackLog.push('Brute force password cracking');
  addLogEntry('STEP7_BRUTE_FORCE', { message: 'Testing common passwords' });
  vulnerabilities.push('No rate limiting - unlimited login attempts');
  
  const commonPwds = ['password123', 'letmein', 'bob123'];
  for (const user of users.slice(0, 3)) {
    for (const testPw of commonPwds) {
      addLogEntry('BRUTE_FORCE_ATTEMPT', { username: user.username, password_attempted: testPw, success: user.password === testPw });
      if (user.password === testPw) {
        attackLog.push(`  CRACKED: ${user.username}:${user.password}`);
        addLogEntry('PASSWORD_CRACKED', { username: user.username, password: user.password });
        break;
      }
    }
  }
  
  // STEP 8: Exfiltration
  attackLog.push('Packaging stolen data for exfiltration');
  addLogEntry('STEP8_EXFILTRATION', { message: 'Preparing stolen data' });
  
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
  
  addLogEntry('MALWARE_COMPLETE', attackSummary);
  
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
}