const Database = require('better-sqlite3');
const db = new Database('skillbridge.db');

const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
console.log('Tables found:');
for (const t of tables) {
  if (t.name.includes('conversation') || t.name.includes('communication') || t.name.includes('speaking') || t.name.includes('writing')) {
    console.log(`--- ${t.name} ---`);
    console.log(t.sql);
  }
}
