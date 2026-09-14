// generate-submission.js — Generate the submission.json
const fs = require('fs');

const listings = JSON.parse(fs.readFileSync('data/listings.json')).results;
const rentals = JSON.parse(fs.readFileSync('data/rentals.json')).results;
const projects = JSON.parse(fs.readFileSync('data/projects.json')).results;

// === Compute all answers ===

// Q4: corrupt IDs
const corruptIds = [
  '100-6000323', '100-6000338', '100-6001461', '100-6001475',
  '100-6001968', '100-6002071', 'DWE-6000010', 'DWE-6000627',
  'DWE-6001015', 'DWE-6002663', 'DWE-6002846', 'MAG-6000453',
  'MAG-6000527', 'MAG-6000631', 'MAG-6001135', 'MAG-6002834',
  'SQU-6001477', 'SQU-6002204', 'SQU-6003044', 'ZER-6000468',
  'ZER-6000669', 'ZER-6001341'
].sort();

// Q9: fake IDs
const phoneGroups = {};
listings.forEach(l => {
  if (!l.posted_by_contact) return;
  if (!phoneGroups[l.posted_by_contact]) phoneGroups[l.posted_by_contact] = [];
  phoneGroups[l.posted_by_contact].push(l);
});

const corruptSet = new Set(corruptIds);
const fakePhones = Object.entries(phoneGroups).filter(([phone, ls]) => {
  const uniqueApts = new Set(ls.map(l => l.apartment_name));
  const uniqueLocs = new Set(ls.map(l => l.locality));
  return ls.length >= 10 && uniqueApts.size >= 5 && uniqueLocs.size >= 5;
});

const fakeIds = [...new Set(
  fakePhones.flatMap(([, ls]) => ls.map(l => l.listing_id))
  .filter(id => !corruptSet.has(id))
)].sort();

// Q2: unique properties
const propertyKeys = new Set();
listings.forEach(l => {
  const key = `${Math.round(l.latitude*10000)/10000}_${Math.round(l.longitude*10000)/10000}_${l.bedroom}_${(l.apartment_name||'').toLowerCase()}`;
  propertyKeys.add(key);
});

// Q5: total monthly rent
const gcrRentals = rentals.filter(r => r.locality === 'golf course road');
const totalRent = gcrRentals.reduce((s, r) => s + r.price, 0);

// Q6: avg price per sqft 2BHK
const excludeSet = new Set([...corruptIds, ...fakeIds]);
const twoB = listings.filter(l =>
  l.is_live === true &&
  l.bedroom === 2 &&
  !excludeSet.has(l.listing_id) &&
  l.carpet_area > 0 &&
  l.price > 0
);
const avgPPS = twoB.reduce((s, l) => s + l.price / l.carpet_area, 0) / twoB.length;

// Q7: costliest project
const maxProject = projects.reduce((max, p) => p.price_max > max.price_max ? p : max, projects[0]);

// Q8: listings last 7 days
const refIST = new Date('2026-09-10T00:00:00+05:30');
const ref7dAgo = new Date('2026-09-03T00:00:00+05:30');
const last7d = listings.filter(l => {
  const posted = new Date(l.posted_at);
  return posted >= ref7dAgo && posted < refIST;
});

// Q10: projects with wrong listing count
const listingsByProject = {};
listings.forEach(l => {
  if (l.project_id) {
    listingsByProject[l.project_id] = (listingsByProject[l.project_id] || 0) + 1;
  }
});
const wrongProjects = projects.filter(p => {
  const actual = listingsByProject[p.project_id] || 0;
  return actual !== p.total_listings;
});

// Evidence helpers
const sampleCorruptEvidence = corruptIds.slice(0, 20);
const sampleFakePhones = fakePhones.slice(0, 5).map(([phone]) => phone);
const sampleFakeEvidence = fakeIds.slice(0, 20);
const sampleWrongProjects = wrongProjects.slice(0, 20).map(p => p.project_id);

// Duplicate evidence
const dupGroups = {};
listings.forEach(l => {
  const key = `${Math.round(l.latitude*10000)/10000}_${Math.round(l.longitude*10000)/10000}_${l.bedroom}_${(l.apartment_name||'').toLowerCase()}`;
  if (!dupGroups[key]) dupGroups[key] = [];
  dupGroups[key].push(l.listing_id);
});
const actualDups = Object.entries(dupGroups).filter(([,ids]) => ids.length > 1);
const dupEvidence = actualDups.slice(0, 10).flatMap(([,ids]) => ids);

const submission = {
  "api_key": "IVY26-548382FF5444",
  "candidate": {
    "name": "",
    "email": "",
    "repo_url": "",
    "demo_url": ""
  },
  "answers": {
    "total_listing_records": listings.length,
    "unique_properties": propertyKeys.size,
    "active_listings": listings.filter(l => l.is_live === true).length,
    "corrupt_listing_ids": corruptIds,
    "total_monthly_rent": totalRent,
    "avg_price_per_sqft_2bhk": Math.round(avgPPS * 100) / 100,
    "costliest_project": {
      "project_id": maxProject.project_id,
      "price_max_inr": Math.round(maxProject.price_max * 10000000)
    },
    "listings_last_7_days": last7d.length,
    "fake_listing_ids": fakeIds,
    "projects_with_wrong_listing_count": wrongProjects.length
  },
  "findings": [
    {
      "endpoint": "*",
      "category": "auth",
      "documented": "API key should be sent as ?api_key= query parameter",
      "actual": "API requires X-API-Key request header. Using query parameter returns 400 with message: 'send your key in the X-API-Key request header, not as a query parameter'",
      "how_found": "First API call using documented query parameter approach returned 400 error",
      "impact": "Any client following the documentation will fail on every request",
      "evidence": []
    },
    {
      "endpoint": "/auth/login",
      "category": "auth",
      "documented": "Login returns {token, token_type, expires_in: 86400, user: {email, name}} with token valid for 24 hours",
      "actual": "Returns {access_token, refresh_token, token_type, expires_in: 900, refresh_url, user: {email}}. Token expires in 15 minutes (900s), not 24 hours. No 'name' field in user object. Has refresh_token and refresh_url fields not documented.",
      "how_found": "Called POST /auth/login and compared response shape to documentation",
      "impact": "Clients expecting 24-hour sessions will break after 15 minutes. Clients looking for user.name will get undefined.",
      "evidence": []
    },
    {
      "endpoint": "/auth/refresh",
      "category": "undocumented_endpoint",
      "documented": "Not mentioned anywhere in API_REFERENCE.md",
      "actual": "POST /auth/refresh accepts {refresh_token} and returns a new access_token. The login response includes refresh_url: '/auth/refresh' pointing to this endpoint.",
      "how_found": "Discovered refresh_url in login response, then called the endpoint",
      "impact": "Without this endpoint, sessions die after 15 minutes with no way to renew without re-login",
      "evidence": []
    },
    {
      "endpoint": "/auth/logout",
      "category": "auth",
      "documented": "Invalidates the current token server side",
      "actual": "Returns {ok: true, note: 'tokens are stateless; discard them client side'}. Tokens are NOT invalidated server-side; they are stateless JWTs.",
      "how_found": "Called POST /auth/logout and read the response",
      "impact": "Minor - logout is advisory only, tokens remain valid until expiry",
      "evidence": []
    },
    {
      "endpoint": "/v1/listings",
      "category": "pagination",
      "documented": "Collection responses have shape {total, page, page_size, results} with page and limit query parameters. page is 1-indexed, limit max 200.",
      "actual": "Response shape is {limit, offset, count, total, has_more, results}. Uses offset-based pagination, not page-based. The 'page' parameter is silently ignored (always returns offset=0). Limit is capped at 50 regardless of requested value.",
      "how_found": "Requested page=2&limit=20, got offset=0 (same first page). Requested limit=200, got count=50.",
      "impact": "Clients using page parameter will always see the first page. Clients requesting limit>50 will miss records.",
      "evidence": []
    },
    {
      "endpoint": "/v1/listings",
      "category": "completeness",
      "documented": "Returns active sale listings. Inactive, expired and withdrawn listings are excluded server side.",
      "actual": "Returns both active (is_live:true, 2627 records) and inactive (is_live:false, 673 records) listings. Total 3300 records, with is_live field present but undocumented.",
      "how_found": "Fetched all listings via pagination and checked is_live field distribution",
      "impact": "Frontend showing 'active' listings will actually display inactive properties unless filtering client-side",
      "evidence": []
    },
    {
      "endpoint": "/v1/listings",
      "category": "pagination",
      "documented": "total is the exact number of records matching your filters",
      "actual": "Reported total=3285 but fetching all pages yields 3300 records. Similarly for rentals (1239 vs 1250) and projects (375 vs 400). Fetched count is always higher than reported total.",
      "how_found": "Paginated through all records using offset and compared final count to reported total",
      "impact": "Clients relying on total for pagination math will stop fetching before reaching all records",
      "evidence": []
    },
    {
      "endpoint": "/v1/listings",
      "category": "filters",
      "documented": "furnishing parameter filters by unfurnished/semi-furnished/fully-furnished",
      "actual": "The furnishing parameter is accepted (no 400 error) but silently ignored. GET /v1/listings?furnishing=semi-furnished returns total=3285, identical to unfiltered results.",
      "how_found": "Compared total returned with furnishing filter vs without - both return 3285",
      "impact": "Users filtering by furnishing see all listings, not just matching ones. Must filter client-side.",
      "evidence": []
    },
    {
      "endpoint": "/v1/listings",
      "category": "filters",
      "documented": "project_id can be used to filter listings for a specific project (implied by 'GET /v1/listings?project_id=...')",
      "actual": "project_id parameter is silently ignored. GET /v1/listings?project_id=P60001 returns total=3285 (same as unfiltered).",
      "how_found": "Tested project_id filter and compared total to unfiltered request",
      "impact": "Cannot get listings for a specific project via API filter. Must filter client-side from full dataset.",
      "evidence": ["P60001"]
    },
    {
      "endpoint": "/v1/listings",
      "category": "duplicates",
      "documented": "Every listing_id is globally unique, and each listing corresponds to exactly one physical property",
      "actual": "listing_ids are indeed unique, but multiple listing_ids correspond to the same physical property. 72 groups of duplicates found across different source websites (same lat/lng + bedroom + apartment_name, different listing_id and website).",
      "how_found": "Clustered all 3300 listings by (latitude rounded to 4dp, longitude rounded to 4dp, bedroom, apartment_name) and found 72 groups with 2+ listings",
      "impact": "Property count is inflated. 3300 listing records represent only 3228 unique physical properties.",
      "evidence": dupEvidence.slice(0, 20)
    },
    {
      "endpoint": "/v1/listings",
      "category": "data_quality",
      "documented": "Each listing describes a real property",
      "actual": "22 listings have physically impossible attributes: 6 with negative prices, 6 with carpet_area > super_built_up_area (physically impossible), 6 with floor > total_floors, and 4 with swapped lat/lng coordinates (latitude in longitude range and vice versa for Gurgaon).",
      "how_found": "Systematic validation of all 3300 records checking: price<0, carpet_area>super_built_up_area, floor>total_floors, coordinates outside Gurgaon bounds with lat/lng swap detection",
      "impact": "These records produce nonsensical data on property detail pages and corrupt aggregate statistics",
      "evidence": sampleCorruptEvidence
    },
    {
      "endpoint": "/v1/listings",
      "category": "fraud",
      "documented": "Listings are genuine property listings",
      "actual": "457 listings are suspected lead-generation fakes. 34 phone numbers each appear on 10+ listings across 5+ different apartment complexes and 5+ different localities. The top offender has 33 listings across 33 different apartments in 10 localities. This pattern is characteristic of lead-gen operations that post fake listings to collect buyer enquiries.",
      "how_found": "Grouped all listings by posted_by_contact, identified phones with 10+ listings where unique apartment count >= 5 and unique locality count >= 5",
      "impact": "~14% of all listings are potentially fake, inflating supply and misleading buyers",
      "evidence": [...sampleFakePhones, ...sampleFakeEvidence.slice(0, 15)]
    },
    {
      "endpoint": "/v1/projects",
      "category": "consistency",
      "documented": "total_listings is recomputed whenever a listing is added or withdrawn, so it always agrees with what GET /v1/listings?project_id=... returns",
      "actual": "303 out of 400 projects have total_listings that disagrees with the actual count of listings referencing that project_id. Additionally, the project_id filter on /v1/listings is silently ignored, so the documented cross-check method doesn't even work.",
      "how_found": "For each of the 400 projects, counted listings in the full dump with matching project_id and compared to the project's total_listings field",
      "impact": "Project pages show incorrect listing counts, and there is no working API filter to verify them",
      "evidence": sampleWrongProjects
    },
    {
      "endpoint": "/v1/projects",
      "category": "units",
      "documented": "Money is Indian rupees, integer, everywhere in the API. price_min and price_max are in rupees.",
      "actual": "Project price_min and price_max are decimal numbers in crores (1 crore = 10,000,000 rupees), not integer rupees. Example: P60001 has price_min=1.66, price_max=4.54 meaning ₹1.66 Cr to ₹4.54 Cr.",
      "how_found": "Inspected project records and found price values like 1.66, 4.54, 98.9 - clearly crores, not rupees",
      "impact": "Frontend displaying project prices as rupees would show '₹2' instead of '₹2 Cr' - off by 7 orders of magnitude",
      "evidence": ["P60001", "P60002", "P60090"]
    },
    {
      "endpoint": "/v1/listing/{listing_id}",
      "category": "missing_endpoint",
      "documented": "GET /v1/listing/{listing_id} returns a single listing",
      "actual": "Returns 404. The correct path is /v1/listings/{listing_id} (plural 'listings').",
      "how_found": "Called GET /v1/listing/{id} and got 404; then tried /v1/listings/{id} which returned 200",
      "impact": "Clients using the documented singular path will always get 404",
      "evidence": []
    },
    {
      "endpoint": "/v1/listings/{id}/similar",
      "category": "missing_endpoint",
      "documented": "Up to ten comparable listings — same locality, same bedroom count, price within 15%",
      "actual": "Returns 404. This endpoint does not exist.",
      "how_found": "Called GET /v1/listings/{listing_id}/similar and got 404",
      "impact": "Cannot implement 'similar listings' feature as documented",
      "evidence": []
    },
    {
      "endpoint": "/v1/favourites",
      "category": "missing_endpoint",
      "documented": "GET/POST/DELETE /v1/favourites for saving listings per user",
      "actual": "All three verbs return 404 on /v1/favourites. The working endpoint is /v1/saved (undocumented).",
      "how_found": "Called GET /v1/favourites and got 404. Probed alternative paths and found /v1/saved returns 200.",
      "impact": "Saved listings feature cannot be built using documented endpoints",
      "evidence": []
    },
    {
      "endpoint": "/v1/saved",
      "category": "undocumented_endpoint",
      "documented": "Not mentioned in API_REFERENCE.md",
      "actual": "GET /v1/saved returns {count, results: [listing objects]}. POST /v1/saved with {listing_id} saves a listing (returns 201). DELETE /v1/saved/{listing_id} removes it. This is the actual saved listings endpoint.",
      "how_found": "Probed common alternative names after /v1/favourites returned 404",
      "impact": "Saved listings feature works but only if you discover this undocumented endpoint",
      "evidence": []
    },
    {
      "endpoint": "/v1/analytics/summary",
      "category": "missing_endpoint",
      "documented": "Pre-computed aggregates for your city including total_listings, median_price, by_locality, by_bhk",
      "actual": "Returns 404. This endpoint does not exist. Also checked /v1/analytics, /analytics/summary, /v1/stats, /v1/summary, /v1/dashboard, /v1/insights - all 404.",
      "how_found": "Called GET /v1/analytics/summary and got 404. Tried multiple alternative paths.",
      "impact": "Insights/dashboard screen cannot use pre-computed analytics; must compute from full dataset",
      "evidence": []
    },
    {
      "endpoint": "/health",
      "category": "timestamps",
      "documented": "All timestamps are ISO 8601, UTC, Z suffix, everywhere in the API",
      "actual": "The /health endpoint returns server_time with +05:30 offset (IST/Asia Kolkata), not UTC with Z suffix. Example: 2026-09-14T18:32:12.615735+05:30. However, listing posted_at timestamps do use Z suffix (UTC).",
      "how_found": "Called GET /health and examined the server_time field timezone",
      "impact": "Inconsistent timezone handling between endpoints; time-based calculations need careful conversion",
      "evidence": []
    },
    {
      "endpoint": "*",
      "category": "consistency",
      "documented": "Rental field is super_builtup_area (same as listings)",
      "actual": "Listings use 'super_built_up_area' (with underscores between built and up) while rentals use 'super_builtup_area' (no underscore). Inconsistent field naming across endpoints.",
      "how_found": "Compared field names from listing and rental response objects",
      "impact": "Code that handles both listings and rentals needs to account for different field names for the same concept",
      "evidence": []
    }
  ]
};

fs.writeFileSync('submission.json', JSON.stringify(submission, null, 2));
console.log('submission.json generated successfully');
console.log('Findings count:', submission.findings.length);
console.log('Answers:', JSON.stringify(submission.answers, null, 2));
