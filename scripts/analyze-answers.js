// analyze-answers.js — Comprehensive analysis to answer all 10 questions
const fs = require('fs');

const listings = JSON.parse(fs.readFileSync('data/listings.json')).results;
const rentals = JSON.parse(fs.readFileSync('data/rentals.json')).results;
const projects = JSON.parse(fs.readFileSync('data/projects.json')).results;

console.log('=== Q1: total_listing_records ===');
console.log('Total listings fetched:', listings.length);

console.log('\n=== Q3: active_listings ===');
const activeLive = listings.filter(l => l.is_live === true);
console.log('is_live=true:', activeLive.length);

console.log('\n=== Q4: corrupt_listing_ids ===');
// Look for physically impossible records
const corruptReasons = {};
const corrupt = listings.filter(l => {
  const reasons = [];
  
  // Negative or zero price
  if (l.price <= 0) reasons.push(`negative/zero price: ${l.price}`);
  
  // carpet_area > super_built_up_area
  if (l.carpet_area > 0 && l.super_built_up_area > 0 && l.carpet_area > l.super_built_up_area) {
    reasons.push(`carpet(${l.carpet_area}) > super_built_up(${l.super_built_up_area})`);
  }
  
  // negative/zero areas
  if (l.carpet_area <= 0) reasons.push(`carpet_area <= 0: ${l.carpet_area}`);
  if (l.super_built_up_area <= 0) reasons.push(`super_built_up_area <= 0: ${l.super_built_up_area}`);
  
  // floor > total_floors
  if (l.floor > l.total_floors && l.total_floors > 0) reasons.push(`floor(${l.floor}) > total_floors(${l.total_floors})`);
  
  // Gurgaon coordinates check (roughly 28.3-28.7 lat, 76.8-77.3 lng)
  if (l.latitude < 27.5 || l.latitude > 29.5 || l.longitude < 76.0 || l.longitude > 78.0) {
    reasons.push(`coords outside Gurgaon: ${l.latitude},${l.longitude}`);
  }
  
  // Absurd bedroom/bathroom (0 or very high)
  if (l.bedroom <= 0) reasons.push(`bedroom=${l.bedroom}`);
  if (l.bathroom <= 0) reasons.push(`bathroom=${l.bathroom}`);
  
  if (reasons.length > 0) {
    corruptReasons[l.listing_id] = reasons;
    return true;
  }
  return false;
});

console.log('Corrupt records:', corrupt.length);
// Break down by reason
const reasonCounts = {};
Object.values(corruptReasons).flat().forEach(r => {
  const key = r.split(':')[0].split('(')[0].trim();
  reasonCounts[key] = (reasonCounts[key] || 0) + 1;
});
console.log('By reason:');
Object.entries(reasonCounts).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

// Show corrupt IDs sorted
const corruptIds = corrupt.map(l => l.listing_id).sort();
console.log('\nCorrupt IDs:', JSON.stringify(corruptIds));

console.log('\n=== Q2: unique_properties ===');
// Deduplicate by lat/lng rounded to 4 decimal places + bedroom count
const propertyKeys = new Set();
const duplicateGroups = {};
listings.forEach(l => {
  const key = `${Math.round(l.latitude*10000)/10000}_${Math.round(l.longitude*10000)/10000}_${l.bedroom}_${l.apartment_name?.toLowerCase()}`;
  if (!duplicateGroups[key]) duplicateGroups[key] = [];
  duplicateGroups[key].push(l.listing_id);
  propertyKeys.add(key);
});
console.log('Unique properties (lat/lng/bed/name):', propertyKeys.size);
const dupGroups = Object.entries(duplicateGroups).filter(([,ids]) => ids.length > 1);
console.log('Duplicate groups:', dupGroups.length);
console.log('Sample duplicates:', dupGroups.slice(0, 5).map(([k, ids]) => `${k}: [${ids.join(', ')}]`));

// Also try by phone number
const phoneGroups = {};
listings.forEach(l => {
  if (!l.posted_by_contact) return;
  if (!phoneGroups[l.posted_by_contact]) phoneGroups[l.posted_by_contact] = [];
  phoneGroups[l.posted_by_contact].push(l);
});
const highVolumePhones = Object.entries(phoneGroups)
  .filter(([,ls]) => ls.length > 5)
  .sort((a,b) => b[1].length - a[1].length);
console.log('\nPhones with >5 listings:', highVolumePhones.length);
highVolumePhones.slice(0, 10).forEach(([phone, ls]) => {
  const uniqueApts = new Set(ls.map(l => l.apartment_name));
  const uniqueLocs = new Set(ls.map(l => l.locality));
  console.log(`  ${phone}: ${ls.length} listings, ${uniqueApts.size} apartments, ${uniqueLocs.size} localities`);
});

console.log('\n=== Q5: total_monthly_rent ===');
const gcrRentals = rentals.filter(r => r.locality === 'golf course road');
console.log('GCR rentals:', gcrRentals.length);
const totalRent = gcrRentals.reduce((s, r) => s + r.price, 0);
console.log('Total monthly rent:', totalRent);

console.log('\n=== Q7: costliest_project ===');
// Projects prices are in crores
const maxProject = projects.reduce((max, p) => {
  if (p.price_max > max.price_max) return p;
  return max;
}, projects[0]);
console.log('Costliest project:', maxProject.project_id, 'price_max:', maxProject.price_max, '(crores)');
console.log('In rupees:', maxProject.price_max * 10000000);
// Also check if some projects have prices that look like rupees
const priceValues = projects.map(p => p.price_max).sort((a,b) => b-a);
console.log('Top 5 price_max values:', priceValues.slice(0, 5));
console.log('Bottom 5:', priceValues.slice(-5));
// Check for large values that might be in rupees already
const bigPrices = projects.filter(p => p.price_max > 100);
console.log('Projects with price_max > 100:', bigPrices.length, bigPrices.slice(0,3).map(p => ({id: p.project_id, max: p.price_max})));

console.log('\n=== Q8: listings_last_7_days ===');
// REFERENCE = 2026-09-10T00:00:00+05:30
// 7 days before = 2026-09-03T00:00:00+05:30
// Convert to UTC: 2026-09-09T18:30:00Z and 2026-09-02T18:30:00Z
const refIST = new Date('2026-09-10T00:00:00+05:30');
const ref7dAgo = new Date('2026-09-03T00:00:00+05:30');
console.log('Reference (UTC):', refIST.toISOString());
console.log('7d ago (UTC):', ref7dAgo.toISOString());

const last7d = listings.filter(l => {
  const posted = new Date(l.posted_at);
  return posted >= ref7dAgo && posted < refIST;
});
console.log('Listings in last 7 days:', last7d.length);

// Also check what the posted_at format looks like
const sampleDates = listings.slice(0, 5).map(l => l.posted_at);
console.log('Sample posted_at values:', sampleDates);

console.log('\n=== Q6: avg_price_per_sqft_2bhk ===');
// is_live=true, bedroom=2, excluding Q4 corrupt and Q9 fake
const corruptSet = new Set(corruptIds);
// For now, compute without excluding fakes (we'll refine)
const twoB = listings.filter(l => 
  l.is_live === true && 
  l.bedroom === 2 && 
  !corruptSet.has(l.listing_id) &&
  l.carpet_area > 0
);
console.log('2BHK active non-corrupt:', twoB.length);
const ppsArr = twoB.map(l => l.price / l.carpet_area);
const avgPPS = ppsArr.reduce((s, v) => s + v, 0) / ppsArr.length;
console.log('Avg price per sqft:', avgPPS.toFixed(2));

console.log('\n=== Q9: fake_listing_ids ===');
// Look for lead-gen patterns
// 1. Phone numbers with many listings across different apartments/localities
const suspectPhones = highVolumePhones.filter(([phone, ls]) => {
  const uniqueApts = new Set(ls.map(l => l.apartment_name));
  const uniqueLocs = new Set(ls.map(l => l.locality));
  // If one phone has listings in many different apartments AND localities, suspect
  return uniqueApts.size > 3 && uniqueLocs.size > 2 && ls.length >= 10;
});
console.log('Suspect phones (many diverse listings):', suspectPhones.length);
suspectPhones.forEach(([phone, ls]) => {
  const uniqueApts = new Set(ls.map(l => l.apartment_name));
  const uniqueLocs = new Set(ls.map(l => l.locality));
  console.log(`  ${phone}: ${ls.length} listings, ${uniqueApts.size} apts, ${uniqueLocs.size} localities`);
  console.log('    IDs:', ls.map(l => l.listing_id).slice(0, 5).join(', '));
});

// 2. Price per sqft outliers (too good to be true)
const byLocBhk = {};
listings.filter(l => l.is_live && l.carpet_area > 0 && l.price > 0).forEach(l => {
  const key = `${l.locality}_${l.bedroom}`;
  if (!byLocBhk[key]) byLocBhk[key] = [];
  byLocBhk[key].push({ id: l.listing_id, pps: l.price / l.carpet_area, price: l.price, contact: l.posted_by_contact });
});

// Find outliers: price per sqft < 30% of median for their locality/bhk
const ppsOutliers = [];
Object.entries(byLocBhk).forEach(([key, items]) => {
  if (items.length < 5) return; // Need enough data
  const sorted = items.map(i => i.pps).sort((a,b) => a-b);
  const median = sorted[Math.floor(sorted.length / 2)];
  items.forEach(item => {
    if (item.pps < median * 0.3 && item.pps > 0) {
      ppsOutliers.push({ ...item, key, median });
    }
  });
});
console.log('\nPrice outliers (pps < 30% median):', ppsOutliers.length);
ppsOutliers.slice(0, 10).forEach(o => console.log(`  ${o.id}: pps=${o.pps.toFixed(0)} median=${o.median.toFixed(0)} (${o.key})`));

console.log('\n=== Q10: projects_with_wrong_listing_count ===');
// For each project, count actual listings with that project_id
const listingsByProject = {};
listings.forEach(l => {
  if (l.project_id) {
    if (!listingsByProject[l.project_id]) listingsByProject[l.project_id] = 0;
    listingsByProject[l.project_id]++;
  }
});

let wrongCount = 0;
const mismatches = [];
projects.forEach(p => {
  const actual = listingsByProject[p.project_id] || 0;
  if (actual !== p.total_listings) {
    wrongCount++;
    mismatches.push({ id: p.project_id, reported: p.total_listings, actual });
  }
});
console.log('Projects with wrong listing count:', wrongCount);
console.log('Sample mismatches:', mismatches.slice(0, 10));

// How many projects have 0 listings in our data?
const zeroListing = projects.filter(p => !(listingsByProject[p.project_id]));
console.log('Projects with zero listings in data:', zeroListing.length);

console.log('\n=== SUMMARY ===');
console.log('Q1 total_listing_records:', listings.length);
console.log('Q2 unique_properties:', propertyKeys.size);
console.log('Q3 active_listings:', activeLive.length);
console.log('Q4 corrupt_listing_ids:', corruptIds.length, 'records');
console.log('Q5 total_monthly_rent:', totalRent);
console.log('Q6 avg_price_per_sqft_2bhk:', avgPPS.toFixed(2), '(without fake exclusion)');
console.log('Q7 costliest_project:', maxProject.project_id, maxProject.price_max * 10000000);
console.log('Q8 listings_last_7_days:', last7d.length);
console.log('Q9 fake_listing_ids: TBD (need refinement)');
console.log('Q10 projects_with_wrong_listing_count:', wrongCount);
