import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getListing, getSimilarListings, addFavourite, removeFavourite, getFavourites } from '../api';
import { formatPrice, formatArea } from '../utils';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const data = await getListing(id);
        setListing(data);

        // Fetch similar
        const simData = await getSimilarListings(id);
        setSimilar(simData.results || simData || []);

        // Check favourites
        try {
          const favData = await getFavourites();
          const favIds = (favData.results || []).map(f => f.listing_id || f.id);
          setIsFav(favIds.includes(id));
        } catch {}
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load listing');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const toggleFav = async () => {
    try {
      if (isFav) {
        await removeFavourite(id);
        setIsFav(false);
      } else {
        await addFavourite(id);
        setIsFav(true);
      }
    } catch (err) {
      console.error('Favourite toggle failed:', err);
    }
  };

  if (loading) return <div className="loading">Loading listing details...</div>;
  if (error) return <div className="loading" style={{color:'red'}}>{error}</div>;
  if (!listing) return <div className="loading">Listing not found</div>;

  return (
    <div className="detail-page">
      <Link to="/listings" className="back-btn">← Back to Listings</Link>

      <div className="detail-header">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
          <div>
            <h1>{listing.apartment_name}</h1>
            <div className="locality" style={{textTransform:'capitalize', color:'#666', fontSize:'1rem'}}>
              📍 {listing.locality}
            </div>
          </div>
          <button className={`fav-btn ${isFav ? 'active' : ''}`} onClick={toggleFav}>
            {isFav ? '♥ Saved' : '♡ Save'}
          </button>
        </div>
        <div className="price">{formatPrice(listing.price)}</div>
        <div className="tags">
          <span className="tag tag-type">{listing.property_type}</span>
          <span className="tag tag-furnishing">{listing.furnishing}</span>
          {listing.is_live ? (
            <span className="tag tag-live">Live</span>
          ) : (
            <span className="tag tag-not-live">Inactive</span>
          )}
          {listing.is_verified && <span className="tag" style={{background:'#e8fde8',color:'#2e7d32'}}>✓ Verified</span>}
        </div>
      </div>

      <div className="detail-section">
        <h2>Property Details</h2>
        <div className="detail-grid">
          <div className="item">
            <span className="label">Bedrooms</span>
            <span className="value">{listing.bedroom} BHK</span>
          </div>
          <div className="item">
            <span className="label">Bathrooms</span>
            <span className="value">{listing.bathroom}</span>
          </div>
          <div className="item">
            <span className="label">Balconies</span>
            <span className="value">{listing.balcony}</span>
          </div>
          <div className="item">
            <span className="label">Floor</span>
            <span className="value">{listing.floor} / {listing.total_floors}</span>
          </div>
          <div className="item">
            <span className="label">Carpet Area</span>
            <span className="value">{formatArea(listing.carpet_area)}</span>
          </div>
          <div className="item">
            <span className="label">Super Built-up Area</span>
            <span className="value">{formatArea(listing.super_built_up_area)}</span>
          </div>
          <div className="item">
            <span className="label">Furnishing</span>
            <span className="value" style={{textTransform:'capitalize'}}>{listing.furnishing}</span>
          </div>
          <div className="item">
            <span className="label">Facing</span>
            <span className="value" style={{textTransform:'capitalize'}}>{listing.facing_direction}</span>
          </div>
          <div className="item">
            <span className="label">Covered Parking</span>
            <span className="value">{listing.covered_parking}</span>
          </div>
          <div className="item">
            <span className="label">Price per sq ft</span>
            <span className="value">₹{listing.carpet_area > 0 ? Math.round(listing.price / listing.carpet_area).toLocaleString('en-IN') : 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h2>Description</h2>
        <p className="description-text">{listing.description}</p>
      </div>

      <div className="detail-section">
        <h2>Contact & Source</h2>
        <div className="detail-grid">
          <div className="item">
            <span className="label">Posted By</span>
            <span className="value" style={{textTransform:'capitalize'}}>{listing.posted_by_name} ({listing.posted_by})</span>
          </div>
          <div className="item">
            <span className="label">Contact</span>
            <span className="value">{listing.posted_by_contact}</span>
          </div>
          <div className="item">
            <span className="label">Website</span>
            <span className="value">{listing.website}</span>
          </div>
          <div className="item">
            <span className="label">Posted At</span>
            <span className="value">{new Date(listing.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          {listing.project_id && (
            <div className="item">
              <span className="label">Project ID</span>
              <span className="value">{listing.project_id}</span>
            </div>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="detail-section similar-section">
          <h2>Similar Properties</h2>
          <div className="similar-scroll">
            {similar.map(s => (
              <div key={s.listing_id} className="card" onClick={() => navigate(`/listings/${s.listing_id}`)}>
                <h3>{s.apartment_name}</h3>
                <div className="locality">{s.locality}</div>
                <div className="price">{formatPrice(s.price)}</div>
                <div className="details">
                  <span>🛏 {s.bedroom} BHK</span>
                  <span>📐 {formatArea(s.carpet_area)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
