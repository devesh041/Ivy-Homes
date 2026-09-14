// fetch-all-v2.js — Fixed pagination using offset instead of page
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
      url.searchParams.set(k, String(v));
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
  return data;
}

async function refreshLogin() {
  const loginData = await apiRequest('/auth/login', {
    method: 'POST',
    body: CREDENTIALS,
  });
  TOKEN = loginData.access_token;
  console.log('Re-authenticated.');
  return loginData;
}

async function fetchAllPages(endpoint, label) {
  const LIMIT = 200;
  let offset = 0;
  let allResults = [];
  let reportedTotal = null;

  while (true) {
    let data;
    try {
      data = await apiRequest(endpoint, {
        params: { limit: LIMIT, offset: offset },
      });
    } catch (err) {
      // If 401, try re-login
      if (err.message.includes('401')) {
        await refreshLogin();
        data = await apiRequest(endpoint, {
          params: { limit: LIMIT, offset: offset },
        });
      } else {
        throw err;
      }
    }

    if (reportedTotal === null) {
      reportedTotal = data.total;
      console.log(`[${label}] Reported total: ${data.total}`);
    }

    const results = data.results || [];
    if (results.length === 0) break;

    allResults = allResults.concat(results);
    console.log(`[${label}] offset=${offset}: got ${results.length} (running: ${allResults.length}/${reportedTotal})`);

    offset += results.length;

    if (!data.has_more) break;
    if (allResults.length >= reportedTotal) break;
  }

  console.log(`[${label}] DONE: ${allResults.length} records. API total: ${reportedTotal}`);
  if (allResults.length !== reportedTotal) {
    console.warn(`[${label}] ⚠️ MISMATCH: fetched ${allResults.length} vs reported ${reportedTotal}`);
  }

  return { results: allResults, reportedTotal };
}

async function main() {
  // Login
  console.log('=== LOGIN ===');
  const loginData = await login();
  fs.writeFileSync(path.join('data', 'login_response.json'), JSON.stringify(loginData, null, 2));

  // Fetch all listings
  console.log('\n=== LISTINGS ===');
  const listings = await fetchAllPages('/v1/listings', 'listings');
  fs.writeFileSync(path.join('data', 'listings.json'), JSON.stringify(listings, null, 2));

  // Fetch all rentals
  console.log('\n=== RENTALS ===');
  const rentals = await fetchAllPages('/v1/rentals', 'rentals');
  fs.writeFileSync(path.join('data', 'rentals.json'), JSON.stringify(rentals, null, 2));

  // Fetch all projects
  console.log('\n=== PROJECTS ===');
  const projects = await fetchAllPages('/v1/projects', 'projects');
  fs.writeFileSync(path.join('data', 'projects.json'), JSON.stringify(projects, null, 2));

  // Analytics
  console.log('\n=== ANALYTICS ===');
  const analytics = await apiRequest('/v1/analytics/summary');
  fs.writeFileSync(path.join('data', 'analytics.json'), JSON.stringify(analytics, null, 2));

  // Health
  console.log('\n=== HEALTH ===');
  const health = await apiRequest('/health');
  fs.writeFileSync(path.join('data', 'health.json'), JSON.stringify(health, null, 2));
  console.log('Health:', JSON.stringify(health));

  // Verify unique listing IDs
  const ids = listings.results.map(l => l.listing_id);
  const uniqueIds = new Set(ids);
  console.log(`\n=== VERIFICATION ===`);
  console.log(`Total listings: ${ids.length}, Unique IDs: ${uniqueIds.size}`);
  if (ids.length !== uniqueIds.size) {
    console.warn('⚠️ DUPLICATE IDs FOUND!');
    // Count duplicates
    const counts = {};
    ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const dups = Object.entries(counts).filter(([,c]) => c > 1);
    console.log(`Duplicate IDs (${dups.length}):`, dups.slice(0, 10));
  }

  // Check is_live distribution
  const liveTrue = listings.results.filter(l => l.is_live === true).length;
  const liveFalse = listings.results.filter(l => l.is_live === false).length;
  console.log(`is_live=true: ${liveTrue}, is_live=false: ${liveFalse}`);

  // Sample first listing
  console.log('\nFirst listing:', JSON.stringify(listings.results[0], null, 2));
  console.log('\nFirst project:', JSON.stringify(projects.results[0], null, 2));

  console.log('\n=== ALL DONE ===');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
