import { useState, useEffect } from 'react';

export default function InsightsPage() {
  // All insights are from local data analysis since /v1/analytics/summary returns 404

  const discoveries = [
    {
      category: 'auth',
      title: 'API Key Header Mismatch',
      description: 'Documentation says ?api_key= query parameter. API requires X-API-Key header.',
      severity: 'error'
    },
    {
      category: 'auth',
      title: 'Token Expiry: 15 min, not 24 hours',
      description: 'Login returns expires_in: 900 (15 min), not 86400 (24h). Undocumented /auth/refresh endpoint exists for renewal.',
      severity: 'error'
    },
    {
      category: 'completeness',
      title: 'Returns Active + Inactive Listings',
      description: 'Documentation claims only active listings. API returns 2,627 active (is_live:true) and 673 inactive (is_live:false) — total 3,300. is_live field is undocumented.',
      severity: 'error'
    },
    {
      category: 'pagination',
      title: 'Offset-based, Not Page-based',
      description: 'Uses {offset, limit, count, has_more} not {page, page_size}. "page" parameter silently ignored. Limit capped at 50 (doc says max 200). Reported total (3,285) differs from actual fetched count (3,300).',
      severity: 'error'
    },
    {
      category: 'units',
      title: 'Project Prices in Crores, Not Rupees',
      description: 'Documentation claims "rupees, integer, everywhere." Project prices are decimal crores (e.g. 4.54 = ₹4.54 Cr). Off by 7 orders of magnitude.',
      severity: 'error'
    },
    {
      category: 'filters',
      title: 'Furnishing & project_id Filters Ignored',
      description: 'Both parameters are accepted (no 400) but silently return unfiltered results (total=3,285 regardless).',
      severity: 'warning'
    },
    {
      category: 'missing_endpoint',
      title: '4 Documented Endpoints Missing',
      description: '/v1/listing/{id} (singular, should be plural), /v1/listings/{id}/similar, /v1/favourites (actual: /v1/saved), /v1/analytics/summary — all return 404.',
      severity: 'error'
    },
    {
      category: 'duplicates',
      title: '72 Duplicate Property Groups Found',
      description: 'Multiple listing_ids map to the same physical property (same lat/lng + bedroom + apartment from different websites). 3,300 records → 3,228 unique properties.',
      severity: 'warning'
    },
    {
      category: 'data_quality',
      title: '22 Corrupt Records',
      description: '6 negative prices, 6 carpet_area > super_built_up_area, 6 floor > total_floors, 4 swapped lat/lng coordinates.',
      severity: 'error'
    },
    {
      category: 'fraud',
      title: '457 Suspected Fake Listings',
      description: '34 phone numbers each appear on 10+ listings across 5+ apartments and 5+ localities. Top offender: 33 listings in 10 localities. Classic lead-gen pattern.',
      severity: 'error'
    },
    {
      category: 'consistency',
      title: '303/400 Projects Have Wrong Listing Counts',
      description: 'total_listings field disagrees with actual listing count for most projects. Additionally, the project_id filter is silently ignored.',
      severity: 'error'
    },
    {
      category: 'timestamps',
      title: 'Mixed Timezone Usage',
      description: '/health returns IST (+05:30). Listing posted_at uses UTC with Z suffix. Documentation claims "UTC, Z suffix, everywhere."',
      severity: 'warning'
    },
    {
      category: 'consistency',
      title: 'Field Naming Inconsistency',
      description: 'Listings use "super_built_up_area" (underscores). Rentals use "super_builtup_area" (no underscore). Same concept, different field names.',
      severity: 'warning'
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Data Insights & Discoveries</h1>
      </div>

      <h2 style={{marginBottom:'12px', color:'#1a1a2e'}}>📊 Dataset Overview</h2>
      <p style={{color:'#888', fontSize:'0.85rem', marginBottom:'12px'}}>
        Note: /v1/analytics/summary returns 404 (documented endpoint does not exist). All stats computed from full dataset analysis.
      </p>
      <div className="insights-grid">
        <div className="insight-card">
          <div className="number">3,300</div>
          <div className="label">Total Listing Records (Q1)</div>
        </div>
        <div className="insight-card">
          <div className="number">3,228</div>
          <div className="label">Unique Physical Properties (Q2)</div>
        </div>
        <div className="insight-card">
          <div className="number">2,627</div>
          <div className="label">Active Listings (Q3)</div>
        </div>
        <div className="insight-card">
          <div className="number">22</div>
          <div className="label">Corrupt Records (Q4)</div>
        </div>
        <div className="insight-card">
          <div className="number">₹42.69 L</div>
          <div className="label">Total Monthly Rent - Golf Course Road (Q5)</div>
        </div>
        <div className="insight-card">
          <div className="number">₹27,074/sqft</div>
          <div className="label">Avg Price/sqft 2BHK (Q6)</div>
        </div>
        <div className="insight-card">
          <div className="number">₹98.9 Cr</div>
          <div className="label">Costliest Project - P60090 (Q7)</div>
        </div>
        <div className="insight-card">
          <div className="number">122</div>
          <div className="label">Listed Last 7 Days (Q8)</div>
        </div>
        <div className="insight-card">
          <div className="number">457</div>
          <div className="label">Suspected Fake Listings (Q9)</div>
        </div>
        <div className="insight-card">
          <div className="number">303</div>
          <div className="label">Projects w/ Wrong Count (Q10)</div>
        </div>
        <div className="insight-card">
          <div className="number">1,250</div>
          <div className="label">Total Rental Records</div>
        </div>
        <div className="insight-card">
          <div className="number">400</div>
          <div className="label">Total Projects</div>
        </div>
      </div>

      <h2 style={{marginTop:'30px', marginBottom:'16px', color:'#1a1a2e'}}>🔍 API Documentation Discrepancies ({discoveries.length} found)</h2>
      <p style={{color:'#666', marginBottom:'16px'}}>
        Each finding was verified against the live API. The API_REFERENCE.md was AI-drafted from old changelogs and never reviewed.
      </p>

      {discoveries.map((discovery, i) => (
        <div key={i} className={`finding-card ${discovery.severity}`}>
          <span className="category-badge">{discovery.category}</span>
          <h3>{discovery.title}</h3>
          <p>{discovery.description}</p>
        </div>
      ))}

      <div className="detail-section" style={{marginTop:'30px'}}>
        <h2>🧪 Hypotheses That Turned Out Fine</h2>
        <ul style={{color:'#555', lineHeight:'2'}}>
          <li><strong>Sort parameters work correctly</strong> — sort_by=price, carpet_area, posted_at, bedroom all properly sort results in asc/desc order. Invalid sort fields return 400 as expected.</li>
          <li><strong>Locality filter works</strong> — filtering by locality returns correct subset of results with matching total counts.</li>
          <li><strong>BHK filter works</strong> — bhk parameter correctly filters by bedroom count.</li>
          <li><strong>Price range filter works</strong> — min_price and max_price correctly filter results.</li>
          <li><strong>Money is rupees (for listings/rentals)</strong> — listing and rental prices are in integer rupees as documented. Only project prices deviate (crores).</li>
          <li><strong>Area is sqft</strong> — carpet_area and super_built_up_area values are consistent with square feet. No unit mismatch found.</li>
          <li><strong>Listing IDs are globally unique</strong> — all 3,300 listing_ids are distinct (no duplicated IDs, though some map to same physical property).</li>
          <li><strong>/v1/rentals/{'{id}'} works</strong> — single rental lookup returns correct data.</li>
          <li><strong>/v1/projects/{'{id}'} works</strong> — single project lookup returns correct data.</li>
          <li><strong>Strings are lowercase</strong> — locality, furnishing, property_type values are all lowercase as documented.</li>
        </ul>
      </div>
    </div>
  );
}
