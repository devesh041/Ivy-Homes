import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavourites, removeFavourite } from '../api';
import { formatPrice, formatArea } from '../utils';

export default function FavouritesPage() {
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = async () => {
    setLoading(true);
    try {
      const data = await getFavourites();
      setFavourites(data.results || []);
    } catch (err) {
      console.error('Failed to fetch favourites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, []);

  const handleRemove = async (e, listingId) => {
    e.stopPropagation();
    try {
      await removeFavourite(listingId);
      setFavourites(prev => prev.filter(f => (f.listing_id || f.id) !== listingId));
    } catch (err) {
      console.error('Failed to remove favourite:', err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Saved Listings</h1>
        <span className="total-badge">{favourites.length} saved</span>
      </div>

      {loading ? (
        <div className="loading">Loading saved listings...</div>
      ) : favourites.length === 0 ? (
        <div className="loading">
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:'1.2rem', marginBottom:'10px'}}>No saved listings yet</p>
            <p style={{color:'#999'}}>Click the ♡ button on any listing to save it here</p>
          </div>
        </div>
      ) : (
        <div className="cards-grid">
          {favourites.map(listing => (
            <div
              key={listing.listing_id || listing.id}
              className="card"
              onClick={() => navigate(`/listings/${listing.listing_id || listing.id}`)}
            >
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <h3>{listing.apartment_name || 'Saved Listing'}</h3>
                <button
                  className="fav-btn active"
                  onClick={(e) => handleRemove(e, listing.listing_id || listing.id)}
                >
                  ♥ Remove
                </button>
              </div>
              {listing.locality && <div className="locality">{listing.locality}</div>}
              {listing.price && <div className="price">{formatPrice(listing.price)}</div>}
              {listing.bedroom && (
                <div className="details">
                  <span>🛏 {listing.bedroom} BHK</span>
                  {listing.bathroom && <span>🚿 {listing.bathroom} Bath</span>}
                  {listing.carpet_area && <span>📐 {formatArea(listing.carpet_area)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
