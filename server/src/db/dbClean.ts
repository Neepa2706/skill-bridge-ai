import { resetUserData, initDatabase } from './database.js';

console.log('[DBClean] Initializing clean database setup...');
initDatabase();
const res = resetUserData(false);
console.log(`[DBClean] Cleared ${res.clearedTables.length} tables.`);
console.log('[DBClean] Database is now 100% clean with zero demo users and zero fake activity.');
process.exit(0);
