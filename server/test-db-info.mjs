import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('skillbridge.db');

const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  if (t.name.includes('convers') || t.name.includes('language')) {
    console.log(`=== Table: ${t.name} ===`);
    console.log(t.sql);
  }
}
