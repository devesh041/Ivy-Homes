// fetch-all.js — Pull all data from the Ivy Homes API
// Usage: node scripts/fetch-all.js

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-548382FF5444';
const CREDENTIALS = { email: 'demo1@ivy.homes', password: '2f5b13910d' };

let TOKEN = null;

async function apiRequest(endpoint, options = {}) {
  const url = new URL(endpoint, BASE_URL);
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v);
    }
  }

  const headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

  const resp = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${text} [${url}]`);
  }
  return resp.json();
}

async function login() {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: CREDENTIALS,
  });
  TOKEN = data.access_token;
  console.log('Logged in. Token expires in', data.expires_in, 'seconds');
  console.log('Login response:', JSON.stringify(data, null, 2));
  return data;
}

async function fetchAllPages(endpoint, label) {
  const LIMIT = 200;
  let page = 1;
  let allResults = [];
  let reportedTotal = null;

  while (true) {
    const data = await apiRequest(endpoint, {
      params: { page: String(page), limit: String(LIMIT) },
    });

    if (page === 1) {
      reportedTotal = data.total;
      console.log(`[${label}] Reported total: ${data.total}, page_size: ${data.page_size}`);
    }

    if (!data.results || data.results.length === 0) break;
    allResults = allResults.concat(data.results);
    console.log(`[${label}] Page ${page}: got ${data.results.length} records (running total: ${allResults.length})`);

    if (allResults.length >= data.total) break;
    page++;
  }

  console.log(`[${label}] Fetched ${allResults.length} records. API reported total: ${reportedTotal}`);
  if (allResults.length !== reportedTotal) {
    console.warn(`[${label}] ⚠️ MISMATCH: fetched ${allResults.length} vs reported ${reportedTotal}`);
  }

  return { results: allResults, reportedTotal };
}

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const url = new URL(endpoint, BASE_URL);
    const headers = {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    };
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

    const resp = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    console.log(`${method} ${endpoint}: ${resp.status} ${resp.statusText}`);
    if (typeof json === 'object') {
      console.log(JSON.stringify(json, null, 2).substring(0, 500));
    } else {
      console.log(text.substring(0, 500));
    }
    return { status: resp.status, data: json };
  } catch (e) {
    console.log(`${method} ${endpoint}: ERROR ${e.message}`);
    return { status: 'error', error: e.message };
  }
}

async function main() {
  // 1. Health check
  console.log('=== HEALTH CHECK ===');
  const health = await testEndpoint('/health');
  fs.writeFileSync(path.join('data', 'health.json'), JSON.stringify(health.data, null, 2));

  // 2. Login
  console.log('\n=== LOGIN ===');
  const loginData = await login();
  fs.writeFileSync(path.join('data', 'login_response.json'), JSON.stringify(loginData, null, 2));

  // 3. Fetch all listings
  console.log('\n=== LISTINGS ===');
  const listings = await fetchAllPages('/v1/listings', 'listings');
  fs.writeFileSync(path.join('data', 'listings.json'), JSON.stringify(listings, null, 2));

  // 4. Fetch all rentals
  console.log('\n=== RENTALS ===');
  const rentals = await fetchAllPages('/v1/rentals', 'rentals');
  fs.writeFileSync(path.join('data', 'rentals.json'), JSON.stringify(rentals, null, 2));

  // 5. Fetch all projects
  console.log('\n=== PROJECTS ===');
  const projects = await fetchAllPages('/v1/projects', 'projects');
  fs.writeFileSync(path.join('data', 'projects.json'), JSON.stringify(projects, null, 2));

  // 6. Analytics summary
  console.log('\n=== ANALYTICS ===');
  const analytics = await testEndpoint('/v1/analytics/summary');
  fs.writeFileSync(path.join('data', 'analytics.json'), JSON.stringify(analytics.data, null, 2));

  // 7. Test documented endpoints that might not exist
  console.log('\n=== ENDPOINT PROBING ===');
  
  // Test single listing endpoint — docs say /v1/listing/{id} (singular)
  const firstListingId = listings.results[0]?.listing_id;
  if (firstListingId) {
    console.log('\nTest /v1/listing/{id} (doc path):');
    await testEndpoint(`/v1/listing/${firstListingId}`);
    console.log('\nTest /v1/listings/{id} (plural):');
    await testEndpoint(`/v1/listings/${firstListingId}`);
  }

  // Similar listings
  if (firstListingId) {
    console.log('\nTest /v1/listings/{id}/similar:');
    await testEndpoint(`/v1/listings/${firstListingId}/similar`);
  }

  // Favourites
  console.log('\nTest GET /v1/favourites:');
  await testEndpoint('/v1/favourites');

  // Logout
  console.log('\nTest POST /auth/logout:');
  await testEndpoint('/auth/logout', 'POST');

  // Refresh
  console.log('\nTest POST /auth/refresh:');
  await testEndpoint('/auth/refresh', 'POST', { refresh_token: loginData.refresh_token });

  // 8. Test filters — do specific filter tests
  console.log('\n=== FILTER TESTS ===');
  
  // Listings with locality filter
  console.log('\nListings with locality=golf course road:');
  const filteredLocality = await testEndpoint('/v1/listings?locality=golf course road');
  
  // Listings with bhk filter
  console.log('\nListings with bhk=2:');
  const filteredBhk = await testEndpoint('/v1/listings?bhk=2');
  
  // Listings with price range
  console.log('\nListings with min_price=10000000&max_price=50000000:');
  const filteredPrice = await testEndpoint('/v1/listings?min_price=10000000&max_price=50000000');
  
  // Listings with furnishing
  console.log('\nListings with furnishing=semi-furnished:');
  const filteredFurnishing = await testEndpoint('/v1/listings?furnishing=semi-furnished');

  // Listings with sort_by=price&order=desc
  console.log('\nListings with sort_by=price&order=desc:');
  const sortedPrice = await testEndpoint('/v1/listings?sort_by=price&order=desc&limit=5');
  
  // Listings with sort_by=price&order=asc
  console.log('\nListings with sort_by=price&order=asc:');
  const sortedPriceAsc = await testEndpoint('/v1/listings?sort_by=price&order=asc&limit=5');

  // Rentals filters
  console.log('\nRentals with locality=golf course road:');
  await testEndpoint('/v1/rentals?locality=golf course road');

  // Projects filters
  console.log('\nProjects with locality filter:');
  await testEndpoint('/v1/projects?locality=golf course road');
  
  console.log('\nProjects with project_status filter:');
  await testEndpoint('/v1/projects?project_status=under construction');

  // 9. Check first listing for is_live field (undocumented per doc review)
  console.log('\n=== SAMPLE RECORDS ===');
  console.log('First listing sample:');
  console.log(JSON.stringify(listings.results[0], null, 2));
  console.log('\nFirst rental sample:');
  console.log(JSON.stringify(rentals.results[0], null, 2));
  console.log('\nFirst project sample:');
  console.log(JSON.stringify(projects.results[0], null, 2));
  
  // Check all unique keys across listings
  const allListingKeys = new Set();
  listings.results.forEach(l => Object.keys(l).forEach(k => allListingKeys.add(k)));
  console.log('\nAll listing fields:', [...allListingKeys].sort().join(', '));
  
  const allRentalKeys = new Set();
  rentals.results.forEach(r => Object.keys(r).forEach(k => allRentalKeys.add(k)));
  console.log('All rental fields:', [...allRentalKeys].sort().join(', '));
  
  const allProjectKeys = new Set();
  projects.results.forEach(p => Object.keys(p).forEach(k => allProjectKeys.add(k)));
  console.log('All project fields:', [...allProjectKeys].sort().join(', '));

  console.log('\n=== DONE ===');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
