// Format price in INR
export function formatPrice(price) {
  if (price === null || price === undefined) return 'N/A';
  const num = Number(price);
  if (isNaN(num)) return 'N/A';
  
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  } else if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  } else {
    return `₹${num.toLocaleString('en-IN')}`;
  }
}

// Format project price (which may be in crores, not rupees)
// API returns decimal values like 1.66, 4.54 which are crores
export function formatProjectPrice(price) {
  if (price === null || price === undefined) return 'N/A';
  const num = Number(price);
  if (isNaN(num)) return 'N/A';
  
  // Project prices appear to be in crores (small decimals)
  // If the value is small (< 1000), it's likely in crores
  if (num < 1000) {
    return `₹${num.toFixed(2)} Cr`;
  }
  // Otherwise treat as rupees
  return formatPrice(num);
}

// Format area in sq ft
export function formatArea(area) {
  if (area === null || area === undefined) return 'N/A';
  return `${Number(area).toLocaleString('en-IN')} sq ft`;
}

// Format rent
export function formatRent(price) {
  if (price === null || price === undefined) return 'N/A';
  return `₹${Number(price).toLocaleString('en-IN')}/mo`;
}

// Get status class
export function getStatusClass(status) {
  if (!status) return '';
  if (status.includes('ready')) return 'status-ready';
  if (status.includes('under')) return 'status-under';
  if (status.includes('pre')) return 'status-pre';
  return '';
}
