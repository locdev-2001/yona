#!/usr/bin/env node
/**
 * Hook: Block dangerous database write operations
 * Blocks:
 * - SQL keywords: DROP, DELETE, TRUNCATE, ALTER, INSERT, UPDATE, CREATE, REPLACE
 * - Laravel Artisan: migrate:fresh, migrate:reset, migrate:rollback, db:wipe, migrate:refresh
 * - Database CLI: mysqladmin drop, dropdb, redis-cli FLUSHDB/FLUSHALL
 */

// Read hook input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Only check Bash tool
    if (data.tool_name !== 'Bash') {
      outputResult({ decision: 'approve' });
      return;
    }

    const command = data.tool_input?.command || '';

    // Dangerous SQL patterns (case insensitive)
    const sqlPatterns = [
      /\bDROP\s+(TABLE|DATABASE|INDEX|VIEW|SCHEMA)\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bTRUNCATE\s+(TABLE)?\b/i,
      /\bALTER\s+(TABLE|DATABASE|INDEX)\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\s+\w+\s+SET\b/i,
      /\bCREATE\s+(TABLE|DATABASE|INDEX|VIEW)\b/i,
      /\bREPLACE\s+INTO\b/i,
    ];

    // Laravel Artisan destructive commands (php artisan or sail artisan)
    const artisanPatterns = [
      /\b(php|sail)\s+artisan\s+migrate:fresh\b/i,
      /\b(php|sail)\s+artisan\s+migrate:reset\b/i,
      /\b(php|sail)\s+artisan\s+migrate:rollback\b/i,
      /\b(php|sail)\s+artisan\s+migrate:refresh\b/i,
      /\b(php|sail)\s+artisan\s+db:wipe\b/i,
      /\b(php|sail)\s+artisan\s+schema:dump\s+.*--prune\b/i,
    ];

    // Database CLI tools
    const dbCliPatterns = [
      /\bmysqladmin\s+.*drop\b/i,           // mysqladmin drop database
      /\bdropdb\b/i,                         // PostgreSQL dropdb
      /\bredis-cli\s+.*FLUSHDB\b/i,         // Redis flush current DB
      /\bredis-cli\s+.*FLUSHALL\b/i,        // Redis flush all DBs
      /\bmongo.*--eval.*dropDatabase\b/i,   // MongoDB drop
    ];

    // Combine all patterns
    const allPatterns = [
      { patterns: sqlPatterns, type: 'SQL write' },
      { patterns: artisanPatterns, type: 'Artisan destructive' },
      { patterns: dbCliPatterns, type: 'Database CLI' },
    ];

    // Check all patterns
    for (const { patterns, type } of allPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(command)) {
          outputResult({
            decision: 'block',
            reason: `${type} operation blocked: detected "${command.match(pattern)?.[0] || type}" in command. Only read operations are allowed.`
          });
          return;
        }
      }
    }

    // Allow the command
    outputResult({ decision: 'approve' });

  } catch (err) {
    // On error, allow the command (fail open)
    outputResult({ decision: 'approve' });
  }
});

function outputResult(result) {
  console.log(JSON.stringify(result));
}
