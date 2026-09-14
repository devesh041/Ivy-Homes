# Ivy Homes Property Search & Intelligence Platform

Web application built for the Ivy Homes Software Engineering Internship Take-Home Assignment (Gurgaon dataset, September 2026).

---

## 1. How to Run

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Setup & Run Frontend

```bash
# Clone the repository
git clone <repo_url>
cd ivy-homes

# Navigate to frontend directory and install dependencies
cd frontend
npm install

# Start local dev server
npm run dev
```

The application runs at `http://localhost:5173`.

### Production Build & Preview

```bash
cd frontend
npm run build
npm run preview
```

### Demo Logins
All demo accounts use password: `2f5b13910d`
- `demo1@ivy.homes`
- `demo2@ivy.homes`
- `demo3@ivy.homes`

---

## 2. Architecture & Six Required Features

1. **Authentication & Session Persistence (`/auth/login`, `/auth/refresh`, `/auth/logout`)**:
   - Discovered that the API issues access tokens with 900s (15 min) expiry, returning an undocumented `/auth/refresh` endpoint.
   - Built a token manager in Axios interceptors that automatically refreshes the token before or upon expiry using the refresh token, guaranteeing seamless session survival past the 30-minute requirement.
   - Supports login across all 3 demo accounts.

2. **Browse Listings (`/v1/listings`)**:
   - Implemented responsive grid with pagination.
   - Since the server-side API silently ignores the `furnishing` filter (and uses `offset` rather than `page`), our frontend handles both `offset`-based pagination and client-side fallback filtering so users never see a non-functional filter control.

3. **Listing Detail (`/v1/listings/{id}`)**:
   - Dedicated direct route (`/listings/:id`).
   - Displays price, floor details, verified badges, carpet vs super built-up areas, seller contact, and description.

4. **Saved Listings (`/v1/saved`)**:
   - The documented `/v1/favourites` endpoint returns 404. We discovered and wired the real, working server endpoint `/v1/saved` (GET, POST, DELETE).
   - Saved listings persist across page reloads and re-logins per user account.

5. **Rentals & Projects (`/v1/rentals`, `/v1/projects`)**:
   - Browsable lists with locality and bedroom/status filters.
   - Displays prices and areas in verified units: project prices are rendered in Crores (`₹X.XX Cr`) to reflect real unit semantics rather than raw decimal values.

6. **Insights Screen (`/insights`)**:
   - Reconstructed real analytics aggregates since `/v1/analytics/summary` is missing (404).
   - Shows human-facing discoveries: duplicate property clusters, corrupt record breakdowns, fake listing lead-gen footprints, and documentation discrepancies.

---

## 3. How We Decided Which Parts of the Docs to Distrust & What We Did

1. **Auth & Headers**:
   - *Doc claimed*: `?api_key=` query param and 24-hour token duration.
   - *Reality*: Server returned HTTP 400 instructing `X-API-Key` header, and token payload returned `expires_in: 900` with `refresh_token`.
   - *Resolution*: Implemented header-based auth and automatic token refresh via `/auth/refresh`.

2. **Pagination & Limits**:
   - *Doc claimed*: `page` (1-indexed) and `limit` up to 200 with `{page, page_size}` in response.
   - *Reality*: `page` query param was ignored (always offset 0), `limit` was capped at 50, and response contained `{offset, limit, count, total, has_more}`.
   - *Resolution*: Migrated all scrapers and frontend query params to explicit `offset = (page - 1) * limit`.

3. **Active Listings Guarantee**:
   - *Doc claimed*: Endpoint returns only active listings.
   - *Reality*: Returns both `is_live: true` (2,627) and `is_live: false` (673) records.
   - *Resolution*: Added visibility indicators and explicit `is_live` condition auditing.

4. **Units Semantics in Projects**:
   - *Doc claimed*: All money is integer INR everywhere.
   - *Reality*: Project prices are small decimal values (e.g. `1.66`, `4.54`, `98.9`).
   - *Resolution*: Identified unit as ₹ Crores; converted to INR for calculations (`× 10,000,000`) and rendered with appropriate formatting.

5. **Missing Endpoints**:
   - `/v1/listing/{id}` (singular) → 404, replaced with `/v1/listings/{id}` (plural).
   - `/v1/listings/{id}/similar` → 404, gracefully handled with empty state.
   - `/v1/favourites` → 404, discovered `/v1/saved` which works on all CRUD operations.
   - `/v1/analytics/summary` → 404, computed locally from the full dataset dump.

---

## 4. What We Checked That Turned Out to Be Fine

Hypotheses that were systematically audited and ruled out:

1. **Listing IDs Uniqueness**:
   - Hypothesis: `listing_id` might have collisions across different scrapers or pagination offsets.
   - Tested: Set equality over 3,300 extracted listing IDs.
   - Result: All 3,300 IDs are distinct (100% unique string IDs).

2. **Sort Parameters Functionality**:
   - Hypothesis: Documented `sort_by` fields (`price`, `carpet_area`, `posted_at`, `bedroom`) might be quietly ignored like `furnishing`.
   - Tested: Hit API with `order=desc` and `order=asc` for each sort field.
   - Result: All 4 sort fields work correctly; invalid sort fields return HTTP 400.

3. **Locality & BHK Filter Parameters**:
   - Hypothesis: All query parameters might be non-functional.
   - Tested: Filtered against `locality=golf course road` and `bhk=2`.
   - Result: Both parameters filtered records server-side correctly.

4. **Rupee Units in Listings and Rentals**:
   - Hypothesis: Listing prices might be stored in lakhs or thousands.
   - Tested: Distribution check against carpet areas and locality medians.
   - Result: Listing and rental prices are regular integer Indian Rupees (e.g. 1.7 Crore is stored as `17050000`). Only Projects used Crores.

5. **Area Units**:
   - Hypothesis: Areas might be square meters instead of square feet.
   - Tested: Checked ratios of carpet area to bedroom count and typical floor plans.
   - Result: Areas are in standard Indian square feet (sq ft).

6. **Single Record Retrieval for Rentals and Projects**:
   - Hypothesis: Documented `/v1/rentals/{id}` and `/v1/projects/{id}` paths might also 404 like listings.
   - Tested: Queried single records across collections.
   - Result: Both return HTTP 200 with full schema representations.

---

## 5. Answers to the 10 Assignment Questions

- **Q1 (`total_listing_records`)**: `3300`
- **Q2 (`unique_properties`)**: `3228` (Deduplicated on lat/lng to 4dp + bedroom + apartment name)
- **Q3 (`active_listings`)**: `2627` (`is_live === true`)
- **Q4 (`corrupt_listing_ids`)**: `22` records (Negative prices, carpet > super built-up, floor > total floors, swapped coordinates)
- **Q5 (`total_monthly_rent`)**: `4268600` (All rental records in `golf course road`)
- **Q6 (`avg_price_per_sqft_2bhk`)**: `27074.13` (Active 2BHK listings excluding corrupt and fake listings)
- **Q7 (`costliest_project`)**: `{"project_id": "P60090", "price_max_inr": 989000000}` (98.9 Cr)
- **Q8 (`listings_last_7_days`)**: `122` (Posted within `[2026-09-03T00:00:00+05:30, 2026-09-10T00:00:00+05:30)`)
- **Q9 (`fake_listing_ids`)**: `457` records (34 phone numbers with 10+ listings distributed across 5+ complexes and 5+ localities)
- **Q10 (`projects_with_wrong_listing_count`)**: `303` projects whose reported `total_listings` mismatches actual count

---

## 6. What We Would Do With Another Two Days

1. **Interactive Geospatial Map Visualizer**:
   - Integrate Leaflet/Mapbox to render cluster maps of properties across Gurgaon sectors, visually highlighting the 4 coordinate-swapped corrupt records and spatial density of lead-gen agents.
2. **Automated End-to-End Contract & Diff Testing**:
   - Build a continuous OpenAPI/Swagger schema validator that runs hourly canary checks against `solve.ivy.homes` and reports schema regressions or newly activated endpoints via webhooks.
3. **Advanced Machine Learning Deduplication**:
   - Replace heuristic spatial-text clustering with Jaro-Winkler string similarity on descriptions and TF-IDF cosine distance for automated lead-gen text template detection.
4. **Offline PWA Support**:
   - Implement service workers and IndexedDB caching for full offline browsing of cached listings and queued favourite synchronizations.

---

## 7. Tooling & LLM Disclosure

- Built with pair programming assistance from Google DeepMind Antigravity agentic environment (Claude 3.7 Sonnet / Claude Opus 4.6 / Gemini 3.8 Flash).
- Automation scripts written in Node.js 24.
- Frontend developed in React 19, Vite 8, React Router v7, and Axios.
