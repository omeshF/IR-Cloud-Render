import { getUsers, saveUsers, addLogEntry, getSessions, getAuditLog } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { action } = req.body;
  const ip = req.headers['x-forwarded-for'] || 'unknown';
  
  await addLogEntry('🚨 ATTACK_STARTED', { message: 'Malware attack simulation initiated', attacker_ip: ip }, req);
  
  const stolenData = [];
  const vulnerabilities = [];
  let attackSteps = [];
  
  // ========== STEP 1: Reconnaissance - Try common passwords ==========
  attackSteps.push('🔍 STEP 1: Attacker starts reconnaissance - trying common passwords');
  await addLogEntry('STEP1_RECONNAISSANCE', { message: 'Trying common passwords on login endpoint', attacker_ip: ip }, req);
  
  const commonPasswords = ['password', '123456', 'admin', 'qwerty', 'letmein', 'welcome'];
  
  for (const pw of commonPasswords.slice(0, 3)) {
    await addLogEntry('BRUTE_FORCE_ATTEMPT', { username: 'admin', password_attempted: pw, success: false, step: 'STEP1_RECON' }, req);
    attackSteps.push(`  ❌ Attempted password: "${pw}" - Failed`);
  }
  
  // ========== STEP 2: Buffer Overflow Attack ==========
  attackSteps.push('\n💥 STEP 2: Attacker tries buffer overflow attack with long string of A\'s');
  await addLogEntry('STEP2_BUFFER_OVERFLOW', { message: 'Sending 10,000+ character password to bypass validation', payload_size: 10000 }, req);
  
  const longPassword = 'A'.repeat(10000);
  await addLogEntry('BUFFER_OVERFLOW_ATTEMPT', { username: 'admin', payload_size: longPassword.length, payload_preview: longPassword.substring(0, 50) + '...', success: true }, req);
  attackSteps.push(`  ✅ SUCCESS! Password "${longPassword.substring(0, 30)}..." (${longPassword.length} chars) was accepted!`);
  attackSteps.push(`  🔴 VULNERABILITY: No input validation on password length`);
  vulnerabilities.push('No input validation - accepts arbitrarily long passwords');
  
  await addLogEntry('LOGIN_SUCCESS_BUFFER_OVERFLOW', { username: 'admin', auth_method: 'BUFFER_OVERFLOW_BYPASS', password_length: longPassword.length }, req);
  attackSteps.push(`  ✅ Logged in as admin using buffer overflow attack!`);
  
  // ========== STEP 3: IDOR - Harvest all user data ==========
  attackSteps.push('\n📁 STEP 3: Attacker exploits IDOR vulnerability to steal user data');
  await addLogEntry('STEP3_IDOR_HARVEST', { message: 'Accessing /api/profile without authentication to steal user data' }, req);
  vulnerabilities.push('IDOR - No authentication on /api/profile');
  
  const users = await getUsers();
  
  for (const user of users) {
    await addLogEntry('IDOR_PROFILE_ACCESS', { user_id: user.id, username: user.username, endpoint: '/api/profile?id=' + user.id }, req);
    stolenData.push({
      type: 'USER_PROFILE',
      id: user.id,
      username: user.username,
      password: user.password,
      email: user.email,
      salary: user.salary,
      credit_card: user.credit_card || 'N/A',
      ssn: user.ssn || 'N/A'
    });
    
    attackSteps.push(`  📋 User ID ${user.id}: ${user.username}`);
    attackSteps.push(`     → Password: ${user.password}`);
    attackSteps.push(`     → Credit Card: ${user.credit_card || 'N/A'}`);
    attackSteps.push(`     → SSN: ${user.ssn || 'N/A'}`);
    attackSteps.push(`     → Salary: $${user.salary}`);
    
    await addLogEntry('DATA_EXFILTRATION', { 
      target: 'USER_PROFILE',
      user_id: user.id,
      username: user.username,
      stolen_data: { password: user.password, credit_card: user.credit_card, ssn: user.ssn, salary: user.salary }
    }, req);
  }
  
  // ========== STEP 4: Access Audit Log ==========
  attackSteps.push('\n📋 STEP 4: Attacker accesses internal audit log');
  await addLogEntry('STEP4_AUDIT_ACCESS', { message: 'Accessing /api/audit endpoint to steal logs' }, req);
  vulnerabilities.push('No authentication on /api/audit endpoint');
  
  const auditLog = await getAuditLog();
  attackSteps.push(`  ✅ Retrieved ${auditLog.length} log entries`);
  attackSteps.push(`  📊 Logs contain: login attempts, profile accesses, and system events`);
  stolenData.push({ type: 'AUDIT_LOG', entries: auditLog.length, logs: auditLog.slice(-10) });
  await addLogEntry('AUDIT_LOG_THEFT', { entries_viewed: auditLog.length, stolen: true }, req);
  
  // ========== STEP 5: Steal Active Sessions ==========
  attackSteps.push('\n🎫 STEP 5: Attacker checks for active sessions');
  await addLogEntry('STEP5_SESSION_CHECK', { message: 'Accessing /api/sessions endpoint' }, req);
  vulnerabilities.push('Session tokens exposed via /api/sessions endpoint');
  
  const sessions = await getSessions();
  const sessionCount = Object.keys(sessions).length;
  attackSteps.push(`  ✅ Found ${sessionCount} active sessions`);
  if (sessionCount > 0) {
    attackSteps.push(`  🎫 Session tokens could be used for session hijacking`);
    stolenData.push({ type: 'ACTIVE_SESSIONS', count: sessionCount, sessions: sessions });
  }
  await addLogEntry('SESSION_CHECK', { active_sessions: sessionCount, exposed: true }, req);
  
  // ========== STEP 6: Create Backdoor Admin Account ==========
  attackSteps.push('\n🚪 STEP 6: Attacker creates backdoor admin account for persistent access');
  await addLogEntry('STEP6_BACKDOOR_CREATION', { message: 'Registering new admin account without email verification' }, req);
  vulnerabilities.push('No input validation on registration - account created without email verification');
  
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
  await saveUsers(users);
  
  attackSteps.push(`  ✅ Backdoor account created:`);
  attackSteps.push(`     → Username: ${backdoorUser.username}`);
  attackSteps.push(`     → Password: ${backdoorUser.password}`);
  attackSteps.push(`     → Role: ${backdoorUser.role}`);
  stolenData.push({ type: 'BACKDOOR_ACCOUNT', username: backdoorUser.username, password: backdoorUser.password });
  await addLogEntry('BACKDOOR_CREATED', { username: backdoorUser.username, password: backdoorUser.password, role: backdoorUser.role, backdoor: true }, req);
  
  // ========== STEP 7: Brute Force Password Cracking ==========
  attackSteps.push('\n🔓 STEP 7: Attacker attempts to crack passwords via brute force');
  await addLogEntry('STEP7_BRUTE_FORCE', { message: 'Testing common passwords against user accounts' }, req);
  vulnerabilities.push('No rate limiting - unlimited login attempts');
  
  const crackedPasswords = [];
  const commonPwds = ['password123', 'letmein', 'bob123', 'admin', 'password'];
  
  for (const user of users.slice(0, 3)) {
    for (const testPw of commonPwds) {
      await addLogEntry('BRUTE_FORCE_ATTEMPT', { username: user.username, password_attempted: testPw, success: user.password === testPw }, req);
      if (user.password === testPw) {
        crackedPasswords.push({ username: user.username, password: user.password });
        attackSteps.push(`  ✅ CRACKED! ${user.username}:${user.password}`);
        await addLogEntry('PASSWORD_CRACKED', { username: user.username, password: user.password, method: 'brute_force' }, req);
        break;
      }
    }
  }
  
  stolenData.push({ type: 'CRACKED_CREDENTIALS', count: crackedPasswords.length, credentials: crackedPasswords });
  
  // ========== STEP 8: Exfiltrate Data ==========
  attackSteps.push('\n💾 STEP 8: Attacker packages stolen data for exfiltration');
  await addLogEntry('STEP8_EXFILTRATION', { message: 'Preparing stolen data for exfiltration', data_records: stolenData.length }, req);
  
  attackSteps.push(`\n📊 ATTACK SUMMARY:`);
  attackSteps.push(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  attackSteps.push(`  ✅ Total users compromised: ${users.length}`);
  attackSteps.push(`  ✅ Passwords stolen: ${users.length}`);
  attackSteps.push(`  ✅ Credit cards stolen: ${users.filter(u => u.credit_card).length}`);
  attackSteps.push(`  ✅ SSNs stolen: ${users.filter(u => u.ssn).length}`);
  attackSteps.push(`  ✅ Backdoor account created: Yes`);
  attackSteps.push(`  ✅ Audit logs stolen: ${auditLog.length} entries`);
  attackSteps.push(`  ✅ Vulnerabilities exploited: ${vulnerabilities.length}`);
  attackSteps.push(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
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
    },
    stolen_data_summary: stolenData,
    detailed_attack_log: attackSteps
  };
  
  await addLogEntry('✅ MALWARE_COMPLETE', attackSummary, req);
  await addLogEntry('🎯 ATTACK_SUCCESS', { message: 'Full attack completed successfully', data_compromised: users.length, backdoor_created: true }, req);
  
  return res.status(200).json({
    message: '🚨 MALWARE ATTACK SIMULATION COMPLETE 🚨',
    attack_summary: attackSummary,
    formatted_attack_log: attackSteps.join('\n'),
    evidence: {
      check_audit_log: 'View /api/audit to see all attack traces - every step is logged!',
      stolen_passwords: users.map(u => ({ username: u.username, password: u.password, credit_card: u.credit_card, ssn: u.ssn })),
      backdoor_credentials: { username: backdoorUser.username, password: backdoorUser.password },
      vulnerabilities: vulnerabilities,
      recommendations: [
        '✅ Add authentication to /api/profile, /api/audit, /api/sessions',
        '✅ Implement rate limiting on login (max 5 attempts per minute)',
        '✅ Hash passwords with bcrypt before storing',
        '✅ Add input validation - reject passwords longer than 100 chars',
        '✅ Remove debug info from production responses',
        '✅ Encrypt sensitive data like credit cards and SSNs',
        '✅ Implement proper logging and monitoring with alerting'
      ]
    }
  });
}