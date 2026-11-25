// server/db/execute_merge.js
import db from '../index.js';
import { findDuplicateGroups, mergeProductGroup } from '../../services/dedupService.js';

console.log('🚀 Executing Database Product Deduplication...');

const beforeCount = db.prepare('SELECT count(*) as c FROM products WHERE deleted_at IS NULL').get().c;
console.log(`Initial Active Products: ${beforeCount}`);

const duplicateGroups = findDuplicateGroups();
console.log(`Found ${duplicateGroups.length} duplicate group(s) to merge.\n`);

let totalMergedCount = 0;

for (const g of duplicateGroups) {
  const duplicateIds = g.duplicates.map(p => p.id);
  console.log(`Merging ${duplicateIds.length} duplicate(s) into Canonical "${g.canonical.name}" (${g.canonicalId})...`);
  const result = mergeProductGroup(g.canonicalId, duplicateIds);
  console.log(`  ✓ ${result.message}`);
  totalMergedCount += result.mergedCount;
}

const afterCount = db.prepare('SELECT count(*) as c FROM products WHERE deleted_at IS NULL').get().c;
const softDeletedCount = db.prepare('SELECT count(*) as c FROM products WHERE deleted_at IS NOT NULL AND merged_into IS NOT NULL').get().c;

console.log('\n======================================================');
console.log('MERGE EXECUTION COMPLETED');
console.log('======================================================');
console.log(`• Products Before Merge : ${beforeCount}`);
console.log(`• Products After Merge  : ${afterCount}`);
console.log(`• Soft-Deleted (Merged) : ${softDeletedCount}`);
console.log(`• Total Duplicates Removed: ${totalMergedCount}`);
console.log('======================================================\n');
