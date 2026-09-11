import assert from 'node:assert/strict';
import records from '../lib/catalog.mjs';
export function validateCatalog(rows = records) {
  const fields = ['id','title','slug','summary','category','loophole_type','trigger','purchase_stage','product_categories','merchants','savings_type','estimated_savings_min','estimated_savings_max','requirements','steps','difficulty','time_required','stackable','stackable_with','conflicts_with','exclusions','gotchas','primary_source_url','primary_source_name','verification_status','last_verified','confidence_score','status','created_at','updated_at','conditions','keywords','excluded_keywords'];
  const ids = new Set(rows.map(r => r.id));
  assert.equal(ids.size, rows.length, 'Duplicate policy IDs');
  for (const row of rows) {
    for (const key of fields) assert.ok(Object.hasOwn(row,key), row.id + ' missing ' + key);
    assert.match(row.id,/^[a-z0-9-]+$/);
    assert.ok(['Draft','Active','Needs Review','Suspended','Expired','Archived'].includes(row.status));
    assert.ok(['VERIFIED','REPORTED','EXPERIMENTAL','EXPIRED'].includes(row.verification_status));
    assert.ok(row.confidence_score >= 0 && row.confidence_score <= 100);
    assert.ok(new URL(row.primary_source_url).protocol === 'https:');
    if (row.verification_status === 'VERIFIED') assert.ok(Number.isFinite(Date.parse(row.last_verified)), row.id + ' requires a verification date');
    for (const key of ['purchase_stage','product_categories','merchants','requirements','steps','exclusions','gotchas','stackable_with','conflicts_with','conditions','keywords','excluded_keywords']) assert.ok(Array.isArray(row[key]),row.id + ' invalid ' + key);
    for (const id of [...row.stackable_with,...row.conflicts_with]) assert.ok(ids.has(id), row.id + ' unknown relation ' + id);
    if (row.rate != null) assert.ok(row.rate > 0 && row.rate < 1);
  }
  return rows.length;
}
console.log('Validated ' + validateCatalog() + ' sourced policy records.');
