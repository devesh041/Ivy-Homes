import axios from 'axios';

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-548382FF5444';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});

// Token management
export function getStoredAuth() {
  try {
    const auth = JSON.parse(localStorage.getItem('ivy_auth') || 'null');
    return auth;
  } catch {
    return null;
  }
}

export function storeAuth(data) {
  const authData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000) - 30000, // 30s buffer
    user: data.user,
  };
  localStorage.setItem('ivy_auth', JSON.stringify(authData));
  return authData;
}

export function clearAuth() {
  localStorage.removeItem('ivy_auth');
}

function isTokenExpired() {
  const auth = getStoredAuth();
  if (!auth) return true;
  return Date.now() >= auth.expires_at;
}

async function refreshToken() {
  const auth = getStoredAuth();
  if (!auth?.refresh_token) throw new Error('No refresh token');
  
  try {
    const resp = await axios.post(`${BASE_URL}/auth/refresh`, 
      { refresh_token: auth.refresh_token },
      { headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' } }
    );
    return storeAuth(resp.data);
  } catch (err) {
    clearAuth();
    throw err;
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  let auth = getStoredAuth();
  if (auth) {
    if (isTokenExpired() && auth.refresh_token) {
      try {
        auth = await refreshToken();
      } catch {
        // refresh failed, try with expired token anyway
      }
    }
    if (auth?.access_token) {
      config.headers.Authorization = `Bearer ${auth.access_token}`;
    }
  }
  return config;
});

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const auth = getStoredAuth();
      if (auth?.refresh_token) {
        try {
          const newAuth = await refreshToken();
          originalRequest.headers.Authorization = `Bearer ${newAuth.access_token}`;
          return api(originalRequest);
        } catch {
          clearAuth();
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export async function login(email, password) {
  const resp = await api.post('/auth/login', { email, password });
  return storeAuth(resp.data);
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors on logout
  }
  clearAuth();
}

// Listings
export async function getListings(params = {}) {
  const resp = await api.get('/v1/listings', { params });
  return resp.data;
}

export async function getListing(id) {
  const resp = await api.get(`/v1/listings/${id}`);
  return resp.data;
}

export async function getSimilarListings(id) {
  try {
    const resp = await api.get(`/v1/listings/${id}/similar`);
    return resp.data;
  } catch {
    return { results: [] };
  }
}

// Rentals
export async function getRentals(params = {}) {
  const resp = await api.get('/v1/rentals', { params });
  return resp.data;
}

export async function getRental(id) {
  const resp = await api.get(`/v1/rentals/${id}`);
  return resp.data;
}

// Projects
export async function getProjects(params = {}) {
  const resp = await api.get('/v1/projects', { params });
  return resp.data;
}

export async function getProject(id) {
  const resp = await api.get(`/v1/projects/${id}`);
  return resp.data;
}

// Saved listings (documented as /v1/favourites but actually at /v1/saved)
export async function getFavourites() {
  const resp = await api.get('/v1/saved');
  return resp.data;
}

export async function addFavourite(listingId) {
  const resp = await api.post('/v1/saved', { listing_id: listingId });
  return resp.data;
}

export async function removeFavourite(listingId) {
  const resp = await api.delete(`/v1/saved/${listingId}`);
  return resp.data;
}

// Analytics
export async function getAnalyticsSummary() {
  const resp = await api.get('/v1/analytics/summary');
  return resp.data;
}

export default api;
