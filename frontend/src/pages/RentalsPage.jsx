import { useState, useEffect, useCallback } from 'react';
import { getRentals } from '../api';
import { formatRent, formatArea } from '../utils';

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [locality, setLocality] = useState('');
  const [bhk, setBhk] = useState('');

  const limit = 20;

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const params = { offset, limit };
      if (locality) params.locality = locality;
      if (bhk) params.bhk = parseInt(bhk);
      const data = await getRentals(params);
      setRentals(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch rentals:', err);
    } finally {
      setLoading(false);
    }
  }, [page, locality, bhk]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <h1>Rental Properties</h1>
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
        <button type="submit" className="btn btn-primary">Filter</button>
        <button type="button" className="btn" onClick={() => { setLocality(''); setBhk(''); setPage(1); }} style={{background:'#eee'}}>Clear</button>
      </form>

      {loading ? (
        <div className="loading">Loading rentals...</div>
      ) : (
        <>
          <div className="cards-grid">
            {rentals.map(rental => (
              <div key={rental.listing_id} className="card">
                <h3>{rental.apartment_name || rental.title}</h3>
                <div className="locality">{rental.locality}</div>
                <div className="price">{formatRent(rental.price)}</div>
                <div className="details">
                  <span>🛏 {rental.bedroom} BHK</span>
                  <span>🚿 {rental.bathroom} Bath</span>
                  <span>📐 {formatArea(rental.carpet_area)}</span>
                  <span>🏢 Floor {rental.floor}/{rental.total_floors}</span>
                </div>
                <div style={{marginTop: '8px', fontSize: '0.85rem', color: '#777'}}>
                  <span>Deposit: ₹{(rental.deposit || 0).toLocaleString('en-IN')}</span>
                  {rental.maintenance > 0 && <span style={{marginLeft:'12px'}}>Maintenance: ₹{rental.maintenance.toLocaleString('en-IN')}/mo</span>}
                </div>
                <div className="tags">
                  <span className="tag tag-type">{rental.property_type}</span>
                  <span className="tag tag-furnishing">{rental.furnishing}</span>
                  {rental.is_live ? (
                    <span className="tag tag-live">Live</span>
                  ) : (
                    <span className="tag tag-not-live">Inactive</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {rentals.length === 0 && <div className="loading">No rentals found.</div>}

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
