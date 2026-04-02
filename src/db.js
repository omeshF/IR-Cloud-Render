// 🔴 VULN A02: Passwords stored in plaintext
export const users = [
  { id:1, username:"admin",   password:"password123",   email:"admin@corp.com",  role:"admin", salary:95000, ssn:"123-45-6789" },
  { id:2, username:"alice",   password:"letmein",    email:"alice@corp.com",  role:"staff", salary:52000, ssn:"987-65-4321" },
  { id:3, username:"bob",     password:"bob123",email:"bob@corp.com",    role:"staff", salary:48000, ssn:"456-78-9012" },
  { id:4, username:"charlie", password:"charlie99",   email:"charlie@corp.com",role:"dba",   salary:67000, ssn:"321-54-9876" },
];

// Persists for life of server process — unlike Vercel
export const sessions = {};
export const auditLog = [];
export const loginAttempts = {};

export function log(type, detail, req) {
  const entry = {
    id:        auditLog.length + 1,
    ts:        new Date().toISOString(),
    type,
    detail,
    ip:        req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown',
    userAgent: req?.headers?.['user-agent']?.substring(0,100) || 'unknown',
  };
  auditLog.push(entry);
  // 🔴 VULN A09: Full detail including credentials written to server log
  console.log(`[${entry.ts}] [${type}] ${JSON.stringify(detail)}`);
  return entry;
}