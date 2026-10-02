// Test runner: executes every tests/test_*.js file and reports a combined summary.
// Each test file is a standalone script that exits non-zero on failure.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here)
    .filter((f) => f.startsWith('test_') && f.endsWith('.js'))
    .sort();

let failed = 0;

for (const file of files) {
    process.stdout.write(`\n--- ${file} ---\n`);
    const result = spawnSync(process.execPath, [join(here, file)], {
        stdio: 'inherit',
        encoding: 'utf8',
    });
    if (result.status !== 0) {
        failed++;
        console.error(`FAIL: ${file} (exit ${result.status})`);
    }
}

console.log(`\n${'='.repeat(40)}`);
if (failed === 0) {
    console.log(`All ${files.length} test files passed.`);
} else {
    console.error(`${failed} of ${files.length} test files FAILED.`);
    process.exit(1);
}
