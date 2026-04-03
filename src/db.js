// db.js
export const users = [
  { id:1, username:"admin",   password:"password123",   email:"admin@corp.com",  role:"admin", salary:95000, ssn:"123-45-6789", credit_card:"4532-1234-5678-9012" },
  { id:2, username:"alice",   password:"letmein",       email:"alice@corp.com",  role:"staff", salary:52000, ssn:"987-65-4321", credit_card:"4916-5432-1098-7654" },
  { id:3, username:"bob",     password:"bob123",        email:"bob@corp.com",    role:"staff", salary:48000, ssn:"456-78-9012", credit_card:"6011-2345-6789-0123" },
];

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
  console.log(`[${entry.ts}] [${type}] ${JSON.stringify(detail)}`);
  return entry;
}