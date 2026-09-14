import { useState, useEffect, useCallback } from 'react';
import { getProjects } from '../api';
import { formatProjectPrice, formatArea, getStatusClass } from '../utils';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [locality, setLocality] = useState('');
  const [status, setStatus] = useState('');

  const limit = 20;

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const params = { offset, limit };
      if (locality) params.locality = locality;
      if (status) params.project_status = status;
      const data = await getProjects(params);
      setProjects(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [page, locality, status]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <h1>Builder Projects</h1>
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
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="ready to move">Ready to Move</option>
            <option value="under construction">Under Construction</option>
            <option value="pre-launch">Pre-Launch</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filter</button>
        <button type="button" className="btn" onClick={() => { setLocality(''); setStatus(''); setPage(1); }} style={{background:'#eee'}}>Clear</button>
      </form>

      {loading ? (
        <div className="loading">Loading projects...</div>
      ) : (
        <>
          <div className="cards-grid">
            {projects.map(project => (
              <div key={project.project_id} className="card">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <h3>{project.apartment_name}</h3>
                  <span className={`project-status ${getStatusClass(project.project_status)}`}>
                    {project.project_status}
                  </span>
                </div>
                <div className="locality">📍 {project.locality} · {project.developer_name}</div>
                <div className="price">
                  {formatProjectPrice(project.price_min)} – {formatProjectPrice(project.price_max)}
                </div>
                <div className="details">
                  <span>🏗 {project.total_units} units</span>
                  <span>🏢 {project.total_towers} towers</span>
                  <span>📐 {project.min_area_sqft}-{project.max_area_sqft} sq ft</span>
                  <span>📋 {project.total_listings} listings</span>
                </div>
                <div style={{marginTop: '8px', fontSize: '0.85rem', color: '#777'}}>
                  <span>Launch: {project.launch_date}</span>
                  <span style={{marginLeft:'12px'}}>Possession: {project.possession_date}</span>
                </div>
                {project.amenities && project.amenities.length > 0 && (
                  <div className="tags" style={{marginTop:'8px'}}>
                    {project.amenities.slice(0, 5).map(a => (
                      <span key={a} className="tag" style={{background:'#f0f0f0', color:'#555'}}>{a}</span>
                    ))}
                    {project.amenities.length > 5 && <span className="tag" style={{background:'#f0f0f0', color:'#555'}}>+{project.amenities.length - 5}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {projects.length === 0 && <div className="loading">No projects found.</div>}

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
