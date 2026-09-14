import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getListings, addFavourite, removeFavourite, getFavourites } from '../api';
import { formatPrice, formatArea } from '../utils';

export default function ListingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState(new Set());

  // Filters
  const [locality, setLocality] = useState(searchParams.get('locality') || '');
  const [bhk, setBhk] = useState(searchParams.get('bhk') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [furnishing, setFurnishing] = useState(searchParams.get('furnishing') || '');

  const limit = 20;

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      // API uses offset-based pagination, not page-based
      const offset = (page - 1) * limit;
      const params = { offset, limit };
      if (locality) params.locality = locality;
      if (bhk) params.bhk = parseInt(bhk);
      if (minPrice) params.min_price = parseInt(minPrice);
      if (maxPrice) params.max_price = parseInt(maxPrice);
      // Note: furnishing filter is silently ignored by API
      // We handle this with client-side filtering below
      
      let data = await getListings(params);
      let results = data.results || [];
      
      // Client-side furnishing filter since API ignores it
      if (furnishing) {
        results = results.filter(l => l.furnishing === furnishing);
      }
      
      setListings(results);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  }, [page, locality, bhk, minPrice, maxPrice, furnishing]);

  const fetchFavourites = useCallback(async () => {
    try {
      const data = await getFavourites();
      const ids = new Set((data.results || []).map(f => f.listing_id || f.id));
      setFavIds(ids);
    } catch {
      // Favourites might not work, ignore
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    fetchFavourites();
  }, [fetchFavourites]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    const params = {};
    if (locality) params.locality = locality;
    if (bhk) params.bhk = bhk;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (furnishing) params.furnishing = furnishing;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setLocality('');
    setBhk('');
    setMinPrice('');
    setMaxPrice('');
    setFurnishing('');
    setPage(1);
    setSearchParams({});
  };

  const toggleFav = async (e, listingId) => {
    e.stopPropagation();
    try {
      if (favIds.has(listingId)) {
        await removeFavourite(listingId);
        setFavIds(prev => { const s = new Set(prev); s.delete(listingId); return s; });
      } else {
        await addFavourite(listingId);
        setFavIds(prev => new Set(prev).add(listingId));
      }
    } catch (err) {
      console.error('Favourite toggle failed:', err);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <h1>Property Listings</h1>
        <span className="total-badge">{total} total</span>
      </div>

      <form className="filters-bar" onSubmit={handleFilter}>
        <div className="form-group">
          <label>Locality</label>
          <input
            type="text"
            value={locality}
            onChange={(e) => setLocality(e.target.value.toLowerCase())}
            placeholder="e.g. golf course road"
          />
        </div>
        <div className="form-group">
          <label>Bedrooms</label>
          <select value={bhk} onChange={(e) => setBhk(e.target.value)}>
            <option value="">Any</option>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} BHK</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Min Price</label>
          <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="₹" />
        </div>
        <div className="form-group">
          <label>Max Price</label>
          <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="₹" />
        </div>
        <div className="form-group">
          <label>Furnishing</label>
          <select value={furnishing} onChange={(e) => setFurnishing(e.target.value)}>
            <option value="">Any</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-Furnished</option>
            <option value="fully-furnished">Fully Furnished</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <button type="button" className="btn" onClick={clearFilters} style={{background:'#eee'}}>Clear</button>
      </form>

      {loading ? (
        <div className="loading">Loading listings...</div>
      ) : (
        <>
          <div className="cards-grid">
            {listings.map(listing => (
              <div key={listing.listing_id} className="card" onClick={() => navigate(`/listings/${listing.listing_id}`)}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <h3>{listing.apartment_name}</h3>
                  <button
                    className={`fav-btn ${favIds.has(listing.listing_id) ? 'active' : ''}`}
                    onClick={(e) => toggleFav(e, listing.listing_id)}
                  >
                    {favIds.has(listing.listing_id) ? '♥ Saved' : '♡ Save'}
                  </button>
                </div>
                <div className="locality">{listing.locality}</div>
                <div className="price">{formatPrice(listing.price)}</div>
                <div className="details">
                  <span>🛏 {listing.bedroom} BHK</span>
                  <span>🚿 {listing.bathroom} Bath</span>
                  <span>📐 {formatArea(listing.carpet_area)}</span>
                  <span>🏢 Floor {listing.floor}/{listing.total_floors}</span>
                </div>
                <div className="tags">
                  <span className="tag tag-type">{listing.property_type}</span>
                  <span className="tag tag-furnishing">{listing.furnishing}</span>
                  {listing.is_live ? (
                    <span className="tag tag-live">Live</span>
                  ) : (
                    <span className="tag tag-not-live">Inactive</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {listings.length === 0 && <div className="loading">No listings found matching your filters.</div>}

          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
            <span className="page-info">Page {page} of {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
