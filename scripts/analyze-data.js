const fs = require('fs');

const dataDir = 'c:\\Users\\deves\\OneDrive\\Desktop\\project\\ivy-homes\\data';
const listings = JSON.parse(fs.readFileSync(`${dataDir}\\listings.json`, 'utf8')).results;
const rentals = JSON.parse(fs.readFileSync(`${dataDir}\\rentals.json`, 'utf8')).results;
const projects = JSON.parse(fs.readFileSync(`${dataDir}\\projects.json`, 'utf8')).results;

// Q1
const q1 = listings.length;

// Q2 - deduplicate by lat/lng + bedroom + apartment_name
const seen = new Set();
let q2 = 0;
listings.forEach(l => {
  const latR = l.latitude.toFixed(5);
  const lngR = l.longitude.toFixed(5);
  const key = `${latR}_${lngR}_${l.bedroom}_${l.apartment_name}`;
  if (!seen.has(key)) {
    seen.add(key);
    q2++;
  }
});

// Q3
const q3 = listings.filter(l => l.is_live === true).length;

// Q4
const q4Set = new Set();
listings.forEach(l => {
  if (l.carpet_area <= 0 || l.super_built_up_area <= 0) { q4Set.add(l.listing_id); return; }
  if (l.carpet_area > l.super_built_up_area) { q4Set.add(l.listing_id); return; }
  if (l.bedroom <= 0 || l.bedroom > 40 || l.bathroom <= 0 || l.bathroom > 40) { q4Set.add(l.listing_id); return; }
  if (l.floor > l.total_floors) { q4Set.add(l.listing_id); return; }
  if (l.latitude < 28.3 || l.latitude > 28.7 || l.longitude < 76.8 || l.longitude > 77.3) { q4Set.add(l.listing_id); return; }
  if (l.price <= 0) { q4Set.add(l.listing_id); return; }
});
const q4 = Array.from(q4Set);

// Q9
const q9Set = new Set();
const contactCounts = {};
listings.forEach(l => {
  contactCounts[l.posted_by_contact] = (contactCounts[l.posted_by_contact] || 0) + 1;
});
listings.forEach(l => {
  // generic desc or high occurrences. Let's find unusually low prices too.
  if (l.description.includes('Owner moving abroad') || l.description.includes('Price negotiable for a quick')) {
    q9Set.add(l.listing_id);
  }
  // also same contact > X times. Since they are unique IDs now, we can just check contact counts.
  if (contactCounts[l.posted_by_contact] > 10) {
    q9Set.add(l.listing_id);
  }
  
  // unusually low price per sqft - Golf Course Road / Gurgaon
  const pps = l.price / l.carpet_area;
  if (pps < 5000) {
    q9Set.add(l.listing_id);
  }
});
const q9 = Array.from(q9Set).filter(id => !q4Set.has(id));

// Q5
const q5 = rentals.filter(r => (r.locality || '').toLowerCase() === 'golf course road').reduce((sum, r) => sum + r.price, 0);

// Q6
const q6Listings = listings.filter(l => l.is_live === true && l.bedroom === 2 && !q4Set.has(l.listing_id) && !q9Set.has(l.listing_id));
const q6Sum = q6Listings.reduce((sum, l) => sum + (l.price / l.carpet_area), 0);
const q6 = q6Listings.length > 0 ? Number((q6Sum / q6Listings.length).toFixed(2)) : 0;

// Q7
let maxPrice = -1;
let costliestProject = null;
projects.forEach(p => {
  let price = p.price_max;
  if (price < 1000) price *= 10000000;
  if (price > maxPrice) {
    maxPrice = price;
    costliestProject = p.project_id;
  }
});
const q7 = { project_id: costliestProject, price_max: maxPrice };

// Q8
const startDate = new Date('2026-09-03T00:00:00+05:30');
const endDate = new Date('2026-09-10T00:00:00+05:30');
const q8 = listings.filter(l => {
  const d = new Date(l.posted_at);
  return d >= startDate && d < endDate;
}).length;

// Q10
const projectListingCounts = {};
listings.forEach(l => {
  if (l.project_id) {
    projectListingCounts[l.project_id] = (projectListingCounts[l.project_id] || 0) + 1;
  }
});
let q10 = 0;
projects.forEach(p => {
  const actualCount = projectListingCounts[p.project_id] || 0;
  if (actualCount !== p.total_listings) {
    q10++;
  }
});

const results = {
  answers: {
    total_listing_records: q1,
    unique_properties: q2,
    active_listings: q3,
    corrupt_listing_ids: q4,
    total_monthly_rent: q5,
    avg_price_per_sqft_2bhk: q6,
    costliest_project: q7,
    listings_last_7_days: q8,
    fake_listing_ids: q9,
    projects_with_wrong_listing_count: q10
  },
  findings: [
    { title: "Pagination", detail: "Limit is capped at 50 per page despite requesting 200. Re-fetched data correctly with offsets." },
    { title: "Missing Endpoints", detail: "Analytics endpoint /v1/analytics/summary returns 404!" },
    { title: "Units", detail: "Project prices are in crores not rupees." },
    { title: "Undocumented fields", detail: "is_live field is present but undocumented." },
    { title: "Inactive records", detail: "Returns both active and inactive listings despite doc saying only active." },
    { title: "Filter anomalies", detail: "The furnishing filter returned total=3285 which is same as unfiltered, so furnishing filter is silently ignored." },
    { title: "Timestamps", detail: "posted_at timestamps have Z suffix (UTC) but might be expected in IST." },
    { title: "Spelling discrepancies", detail: "carpet_area vs super_built_up_area naming: listings have super_built_up_area, rentals have super_builtup_area." }
  ],
  methodology: {}
};

fs.writeFileSync(`${dataDir}\\analysis_results.json`, JSON.stringify(results, null, 2));
fs.writeFileSync(`${dataDir}\\findings.json`, JSON.stringify(results.findings, null, 2));
console.log(JSON.stringify(results.answers, null, 2));
