import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <Link to="/" className="logo">🏠 Ivy Homes</Link>
      <nav>
        <NavLink to="/listings" className={({isActive}) => isActive ? 'active' : ''}>Listings</NavLink>
        <NavLink to="/rentals" className={({isActive}) => isActive ? 'active' : ''}>Rentals</NavLink>
        <NavLink to="/projects" className={({isActive}) => isActive ? 'active' : ''}>Projects</NavLink>
        <NavLink to="/favourites" className={({isActive}) => isActive ? 'active' : ''}>Saved</NavLink>
        <NavLink to="/insights" className={({isActive}) => isActive ? 'active' : ''}>Insights</NavLink>
      </nav>
      <div className="user-section">
        <span className="user-email">{user?.email}</span>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
    </header>
  );
}
