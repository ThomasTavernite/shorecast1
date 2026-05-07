// 30 NJ Shore beaches, north to south
// Coordinates approximate, badge prices reflect 2025 season (verify before launch)

const BEACHES = [
  { id: 'sandy-hook', name: 'Sandy Hook', town: 'Highlands', county: 'Monmouth', lat: 40.4262, lon: -73.9882, badgePrice: 0, parkingNotes: 'NPS lots $20/day summer', vibe: 'wild' },
  { id: 'sea-bright', name: 'Sea Bright Public Beach', town: 'Sea Bright', county: 'Monmouth', lat: 40.3618, lon: -73.9740, badgePrice: 12, parkingNotes: 'Metered street parking', vibe: 'classic' },
  { id: 'monmouth-beach', name: 'Monmouth Beach', town: 'Monmouth Beach', county: 'Monmouth', lat: 40.3340, lon: -73.9779, badgePrice: 14, parkingNotes: 'Limited lot, arrive early', vibe: 'quiet' },
  { id: 'long-branch', name: 'Pier Village Beach', town: 'Long Branch', county: 'Monmouth', lat: 40.3009, lon: -73.9857, badgePrice: 10, parkingNotes: 'Garage and street parking', vibe: 'lively' },
  { id: 'deal', name: 'Deal Beach', town: 'Deal', county: 'Monmouth', lat: 40.2532, lon: -73.9943, badgePrice: 15, parkingNotes: 'Residential streets only', vibe: 'quiet' },
  { id: 'asbury-park', name: 'Asbury Park Beach', town: 'Asbury Park', county: 'Monmouth', lat: 40.2204, lon: -74.0021, badgePrice: 9, parkingNotes: 'Metered, fills up fast on weekends', vibe: 'lively' },
  { id: 'ocean-grove', name: 'Ocean Grove Beach', town: 'Ocean Grove', county: 'Monmouth', lat: 40.2123, lon: -74.0048, badgePrice: 9, parkingNotes: 'Free street parking, walk in', vibe: 'classic' },
  { id: 'bradley-beach', name: 'Bradley Beach', town: 'Bradley Beach', county: 'Monmouth', lat: 40.2023, lon: -74.0124, badgePrice: 9, parkingNotes: 'Metered street parking', vibe: 'family' },
  { id: 'avon', name: 'Avon-by-the-Sea Beach', town: 'Avon', county: 'Monmouth', lat: 40.1907, lon: -74.0162, badgePrice: 11, parkingNotes: 'Metered street parking', vibe: 'family' },
  { id: 'belmar', name: 'Belmar Beach', town: 'Belmar', county: 'Monmouth', lat: 40.1788, lon: -74.0179, badgePrice: 10, parkingNotes: 'Lot and metered street', vibe: 'lively' },
  { id: 'spring-lake', name: 'Spring Lake Beach', town: 'Spring Lake', county: 'Monmouth', lat: 40.1535, lon: -74.0276, badgePrice: 12, parkingNotes: 'Residential, walk to beach', vibe: 'classic' },
  { id: 'manasquan', name: 'Manasquan Beach', town: 'Manasquan', county: 'Monmouth', lat: 40.1198, lon: -74.0376, badgePrice: 11, parkingNotes: 'Metered lots fill early', vibe: 'surf' },
  { id: 'point-pleasant', name: 'Point Pleasant Beach', town: 'Point Pleasant Beach', county: 'Ocean', lat: 40.0901, lon: -74.0381, badgePrice: 10, parkingNotes: 'Jenkinson lot, $20/day', vibe: 'family' },
  { id: 'bay-head', name: 'Bay Head Beach', town: 'Bay Head', county: 'Ocean', lat: 40.0712, lon: -74.0445, badgePrice: 14, parkingNotes: 'Residential parking only', vibe: 'quiet' },
  { id: 'mantoloking', name: 'Mantoloking Beach', town: 'Mantoloking', county: 'Ocean', lat: 40.0395, lon: -74.0509, badgePrice: 18, parkingNotes: 'Very limited, residents priority', vibe: 'quiet' },
  { id: 'lavallette', name: 'Lavallette Beach', town: 'Lavallette', county: 'Ocean', lat: 39.9712, lon: -74.0698, badgePrice: 9, parkingNotes: 'Free street parking', vibe: 'family' },
  { id: 'seaside-heights', name: 'Seaside Heights Beach', town: 'Seaside Heights', county: 'Ocean', lat: 39.9412, lon: -74.0735, badgePrice: 7, parkingNotes: 'Boardwalk lots, $15-25/day', vibe: 'lively' },
  { id: 'seaside-park', name: 'Seaside Park Beach', town: 'Seaside Park', county: 'Ocean', lat: 39.9226, lon: -74.0791, badgePrice: 9, parkingNotes: 'Metered street parking', vibe: 'family' },
  { id: 'island-beach', name: 'Island Beach State Park', town: 'Berkeley', county: 'Ocean', lat: 39.8079, lon: -74.0871, badgePrice: 0, parkingNotes: 'Park entry $10 weekday, $20 weekend', vibe: 'wild' },
  { id: 'barnegat-light', name: 'Barnegat Light Beach', town: 'Barnegat Light', county: 'Ocean', lat: 39.7615, lon: -74.1062, badgePrice: 10, parkingNotes: 'Lighthouse lot', vibe: 'quiet' },
  { id: 'harvey-cedars', name: 'Harvey Cedars Beach', town: 'Harvey Cedars', county: 'Ocean', lat: 39.7003, lon: -74.1399, badgePrice: 15, parkingNotes: 'Residential streets', vibe: 'quiet' },
  { id: 'surf-city', name: 'Surf City Beach', town: 'Surf City', county: 'Ocean', lat: 39.6612, lon: -74.1671, badgePrice: 10, parkingNotes: 'Free street parking', vibe: 'family' },
  { id: 'ship-bottom', name: 'Ship Bottom Beach', town: 'Ship Bottom', county: 'Ocean', lat: 39.6418, lon: -74.1800, badgePrice: 10, parkingNotes: 'Free street parking', vibe: 'family' },
  { id: 'beach-haven', name: 'Beach Haven', town: 'Beach Haven', county: 'Ocean', lat: 39.5612, lon: -74.2418, badgePrice: 11, parkingNotes: 'Metered street parking', vibe: 'family' },
  { id: 'atlantic-city', name: 'Atlantic City Beach', town: 'Atlantic City', county: 'Atlantic', lat: 39.3548, lon: -74.4324, badgePrice: 0, parkingNotes: 'Casino garages, varies', vibe: 'lively' },
  { id: 'ventnor', name: 'Ventnor Beach', town: 'Ventnor City', county: 'Atlantic', lat: 39.3401, lon: -74.4724, badgePrice: 8, parkingNotes: 'Free street parking', vibe: 'classic' },
  { id: 'ocean-city', name: 'Ocean City Beach', town: 'Ocean City', county: 'Cape May', lat: 39.2776, lon: -74.5746, badgePrice: 10, parkingNotes: 'Metered street parking', vibe: 'family' },
  { id: 'sea-isle-city', name: 'Sea Isle City Beach', town: 'Sea Isle City', county: 'Cape May', lat: 39.1537, lon: -74.6921, badgePrice: 10, parkingNotes: 'Free street parking', vibe: 'family' },
  { id: 'avalon', name: 'Avalon Beach', town: 'Avalon', county: 'Cape May', lat: 39.1018, lon: -74.7187, badgePrice: 12, parkingNotes: 'Free street parking', vibe: 'classic' },
  { id: 'cape-may', name: 'Cape May Beach', town: 'Cape May', county: 'Cape May', lat: 38.9351, lon: -74.9060, badgePrice: 10, parkingNotes: 'Metered street parking, fills fast', vibe: 'classic' }
];

module.exports = BEACHES;