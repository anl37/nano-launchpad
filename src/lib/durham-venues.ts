import { VenueSuggestion } from "@/types/connection";
import { DEFAULT_CITY_CENTER } from "@/config/city";
import { metersBetween } from "./location-utils";
import { normalizeVenueType } from "./venue-hours";

const categories = [
  "Coffee Shop",
  "Restaurant",
  "Bar",
  "Cafe",
  "Park",
  "Gym",
  "Library",
  "Museum",
  "Theater",
  "Bookstore",
  "Bakery",
  "Tea House",
  "Juice Bar",
  "Art Gallery",
  "Co-working Space",
];

const tags = [
  ["cozy", "wifi", "quiet"],
  ["outdoor seating", "brunch", "lunch"],
  ["craft beer", "live music", "happy hour"],
  ["artisan", "local", "organic"],
  ["nature", "walking trails", "outdoor"],
  ["fitness", "wellness", "classes"],
  ["quiet", "study", "books"],
  ["culture", "exhibits", "art"],
  ["performances", "shows", "events"],
  ["indie", "used books", "reading"],
  ["fresh", "pastries", "breakfast"],
  ["relaxing", "herbal", "zen"],
  ["healthy", "smoothies", "fresh"],
  ["contemporary", "exhibits", "local artists"],
  ["productive", "networking", "coffee"],
];

// Real Durham venues with precise coordinates
const realDurhamVenues = [
  // Duke University & Gardens Area
  { name: "Sarah P. Duke Gardens", lat: 36.0019, lng: -78.9384, category: "Park" },
  { name: "Duke Chapel", lat: 36.0012, lng: -78.9382, category: "Historic" },
  { name: "Perkins Library", lat: 35.9979, lng: -78.9377, category: "Library" },
  { name: "Duke University Visitor Center", lat: 36.0014, lng: -78.9378, category: "Museum" },
  { name: "Brodhead Center", lat: 36.0009, lng: -78.9391, category: "Co-working Space" },
  { name: "Wilson Gym", lat: 35.9987, lng: -78.9408, category: "Gym" },
  { name: "Cameron Indoor Stadium", lat: 36.0014, lng: -78.9403, category: "Stadium" },
  { name: "Duke Gardens Terrace Cafe", lat: 36.0022, lng: -78.9379, category: "Cafe" },
  { name: "Nasher Museum of Art", lat: 36.0027, lng: -78.9407, category: "Museum" },
  { name: "Duke Forest", lat: 35.9856, lng: -78.9434, category: "Park" },
  
  // Downtown Durham
  { name: "Durham Central Park", lat: 35.9940, lng: -78.8986, category: "Park" },
  { name: "American Tobacco Campus", lat: 35.9958, lng: -78.9023, category: "Mixed-use" },
  { name: "Durham Performing Arts Center", lat: 35.9963, lng: -78.9020, category: "Theater" },
  { name: "21c Museum Hotel Durham", lat: 35.9967, lng: -78.9013, category: "Museum" },
  { name: "The Cookery", lat: 35.9945, lng: -78.8988, category: "Restaurant" },
  { name: "Brightleaf Square", lat: 35.9977, lng: -78.9052, category: "Shopping" },
  { name: "Guglhupf Bakery", lat: 35.9943, lng: -78.8991, category: "Bakery" },
  { name: "Bull City Burger", lat: 35.9958, lng: -78.9019, category: "Restaurant" },
  { name: "Fullsteam Brewery", lat: 35.9934, lng: -78.9019, category: "Brewery" },
  { name: "Durham Farmers Market", lat: 35.9939, lng: -78.8985, category: "Market" },
  
  // Ninth Street Area
  { name: "Ninth Street", lat: 35.9940, lng: -78.9273, category: "Shopping" },
  { name: "Francesca's Dessert Cafe", lat: 35.9938, lng: -78.9275, category: "Dessert" },
  { name: "Panzanella", lat: 35.9941, lng: -78.9271, category: "Restaurant" },
  { name: "Ninth Street Bakery", lat: 35.9937, lng: -78.9277, category: "Bakery" },
  { name: "Wine Authorities", lat: 35.9942, lng: -78.9269, category: "Bar" },
  
  // Additional Duke East Campus
  { name: "Duke East Campus", lat: 36.0033, lng: -78.9135, category: "Historic" },
  { name: "Lilly Library", lat: 36.0030, lng: -78.9142, category: "Library" },
];

/**
 * Generate Durham venues with real locations plus additional mock venues
 */
export function getDurhamVenues(): VenueSuggestion[] {
  const venues: VenueSuggestion[] = [];
  const userLat = DEFAULT_CITY_CENTER.lat;
  const userLng = DEFAULT_CITY_CENTER.lng;

  // Add real venues first
  realDurhamVenues.forEach((venue, i) => {
    const distanceM = metersBetween(userLat, userLng, venue.lat, venue.lng);
    const categoryIdx = categories.indexOf(venue.category) !== -1 
      ? categories.indexOf(venue.category) 
      : 0;
    const venueTags = tags[categoryIdx % tags.length];

    const landmarksByType: Record<string, string[]> = {
      "Coffee Shop": ["Espresso bar", "Window seating", "Front counter"],
      "Restaurant": ["Host stand", "Bar area", "Main dining"],
      "Bar": ["Bar counter", "Patio", "Front entrance"],
      "Cafe": ["Counter", "Outdoor seating", "Window booth"],
      "Park": ["Main entrance", "Pavilion", "Central lawn"],
      "Gym": ["Front desk", "Lobby", "Main entrance"],
      "Library": ["Main entrance", "Reference desk", "Lobby"],
      "Museum": ["Visitor center", "Main hall", "Gift shop"],
      "Theater": ["Box office", "Main entrance", "Lobby"],
      "Bookstore": ["Front counter", "Main entrance", "Reading nook"],
      "Bakery": ["Display counter", "Main entrance", "Cafe area"],
      "Shopping": ["Main entrance", "Plaza", "Courtyard"],
      "Brewery": ["Bar", "Tasting room", "Front entrance"],
      "Market": ["Main entrance", "Vendor area", "Plaza"],
      "Dessert": ["Counter", "Seating area", "Main entrance"],
      "Historic": ["Main entrance", "Courtyard", "Lawn"],
      "Stadium": ["Main gate", "East entrance", "West entrance"],
      "Mixed-use": ["Main plaza", "Central courtyard", "Entrance"],
    };
    
    const landmarks = landmarksByType[venue.category] || ["Main entrance", "Reception", "Front area"];
    const openNow = Math.random() > 0.2;

    venues.push({
      id: `durham-real-${i}`,
      name: venue.name,
      category: venue.category,
      type: normalizeVenueType(venue.category),
      lat: venue.lat,
      lng: venue.lng,
      distanceM,
      matchScore: Math.floor(Math.random() * 40) + 50,
      tags: venueTags,
      openNow,
      opensAt: !openNow ? { hour: 9, minute: 0 } : undefined,
      rating: Math.random() * 1.5 + 3.5, // 3.5-5.0 rating for real venues
      description: `${venue.name} in Durham`,
      landmarks,
      hours: {
        weekly: {
          mon: [{ open: '09:00', close: '21:00' }],
          tue: [{ open: '09:00', close: '21:00' }],
          wed: [{ open: '09:00', close: '21:00' }],
          thu: [{ open: '09:00', close: '21:00' }],
          fri: [{ open: '09:00', close: '22:00' }],
          sat: [{ open: '10:00', close: '22:00' }],
          sun: [{ open: '10:00', close: '20:00' }],
        },
        timezone: 'America/New_York',
      },
    });
  });

  // Add additional mock venues for variety
  for (let i = 0; i < 23; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * 0.03;
    const lat = userLat + radius * Math.cos(angle);
    const lng = userLng + radius * Math.sin(angle);

    const distanceM = metersBetween(userLat, userLng, lat, lng);
    const categoryIdx = Math.floor(Math.random() * categories.length);
    const category = categories[categoryIdx];
    const venueTags = tags[categoryIdx % tags.length];

    const landmarksByType: Record<string, string[]> = {
      "Coffee Shop": ["Espresso bar", "Window seating", "Front counter"],
      "Restaurant": ["Host stand", "Bar area", "Main dining"],
      "Bar": ["Bar counter", "Patio", "Front entrance"],
      "Cafe": ["Counter", "Outdoor seating", "Window booth"],
      "Park": ["Main entrance", "Pavilion", "Playground"],
      "Gym": ["Front desk", "Lobby", "Main entrance"],
      "Library": ["Main entrance", "Reference desk", "Lobby"],
      "Museum": ["Visitor center", "Main hall", "Gift shop"],
      "Theater": ["Box office", "Main entrance", "Lobby"],
      "Bookstore": ["Front counter", "Main entrance", "Reading nook"],
      "Bakery": ["Display counter", "Main entrance", "Cafe area"],
      "Tea House": ["Counter", "Seating area", "Main entrance"],
      "Juice Bar": ["Counter", "Front entrance", "Order station"],
      "Art Gallery": ["Main entrance", "Reception desk", "Gallery entrance"],
      "Co-working Space": ["Reception", "Main entrance", "Lobby"],
    };
    
    const landmarks = landmarksByType[category] || ["Main entrance", "Reception", "Front area"];
    const openNow = Math.random() > 0.2;

    venues.push({
      id: `durham-venue-${i}`,
      name: `${category} ${i + 1}`,
      category,
      type: normalizeVenueType(category),
      lat,
      lng,
      distanceM,
      matchScore: Math.floor(Math.random() * 40) + 50,
      tags: venueTags,
      openNow,
      opensAt: !openNow ? { hour: 9, minute: 0 } : undefined,
      rating: Math.random() * 2 + 3,
      description: `A wonderful ${category.toLowerCase()} in Durham`,
      landmarks,
      hours: {
        weekly: {
          mon: [{ open: '09:00', close: '21:00' }],
          tue: [{ open: '09:00', close: '21:00' }],
          wed: [{ open: '09:00', close: '21:00' }],
          thu: [{ open: '09:00', close: '21:00' }],
          fri: [{ open: '09:00', close: '22:00' }],
          sat: [{ open: '10:00', close: '22:00' }],
          sun: [{ open: '10:00', close: '20:00' }],
        },
        timezone: 'America/New_York',
      },
    });
  }

  return venues.sort((a, b) => a.distanceM - b.distanceM);
}
