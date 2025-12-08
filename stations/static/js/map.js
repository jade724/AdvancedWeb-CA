// =======================================================
// FuelSmart map front-end
// Features:
//   - Custom petrol / EV icons + EV pulse animation
//   - Marker clustering (Leaflet.markercluster)
//   - Click map or use geolocation to search within 5 km
//   - Filters: all / petrol / EV / nearest / cheapest
//   - Search box to filter by station name
//   - Dark mode toggle (including dark map tiles)
//   - Sidebar expand / collapse
// =======================================================

// ---------- 1. Basic map + global state ---------------------------

// Default map centre (Dublin)
const MAP_CENTER = [53.35, -6.26];

// Light and dark tile layers
const lightTiles = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }
);

const darkTiles = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors, © CARTO",
  }
);

// Create map with light tiles by default
const map = L.map("map", { zoomControl: true, layers: [lightTiles] }).setView(
  MAP_CENTER,
  12
);

let isDarkMode = false;

// Cluster group for station markers
const clusterGroup = L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 50,
});
map.addLayer(clusterGroup);

// Extra layers / state
let searchCircle = null; // circle showing 5km search area
let userMarker = null; // marker for the user's location
let allFeatures = []; // latest features from the API (GeoJSON Features)
let currentTypeFilter = "all"; // "all" | "petrol" | "ev"
let currentSortFilter = "none"; // "none" | "nearest" | "cheapest"
let currentSearchTerm = ""; // search text input
let lastReferencePoint = { lat: MAP_CENTER[0], lng: MAP_CENTER[1] }; // used for "nearest"

// ---------- 2. Custom icons (petrol / EV / user) ------------------

// ICON_URLS is provided by map.html before this script is loaded
const petrolIcon = L.icon({
  iconUrl: ICON_URLS.petrol,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
  className: "petrol-icon",
});

const evIcon = L.icon({
  iconUrl: ICON_URLS.ev,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
  // className is used in CSS to add the pulse animation
  className: "ev-icon",
});

const userIcon = L.icon({
  iconUrl: ICON_URLS.user,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -35],
});

// ---------- 3. Helper functions -----------------------------------

// Convert Feature -> {lat, lng}
function featureLatLng(feature) {
  const [lon, lat] = feature.geometry.coordinates;
  return { lat, lng: lon };
}

// Haversine distance in km between two {lat, lng} points
function distanceKm(a, b) {
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// Update the small label above the station list
function updateFilterLabel() {
  const label = document.getElementById("filterLabel");
  if (!label) return;

  let parts = [];

  if (currentTypeFilter === "petrol") {
    parts.push("Petrol only");
  } else if (currentTypeFilter === "ev") {
    parts.push("EV only");
  } else {
    parts.push("All station types");
  }

  if (currentSortFilter === "cheapest") {
    parts.push("sorted by cheapest first");
  } else if (currentSortFilter === "nearest") {
    parts.push("sorted by nearest first");
  }

  if (currentSearchTerm.trim().length > 0) {
    parts.push(`matching "${currentSearchTerm.trim()}"`);
  }

  label.innerText = parts.join(" · ");
}

// ---------- 4. Render stations on the map + in list ---------------

// Render a list of already-filtered features
function renderFeatures(features) {
  const countBox = document.getElementById("countBox");
  const list = document.getElementById("stationList");

  clusterGroup.clearLayers();
  list.innerHTML = "";

  if (!features || features.length === 0) {
    countBox.innerText = "No stations found.";
    return;
  }

  features.forEach((f) => {
    const { lat, lng } = featureLatLng(f);
    const isEv = f.properties.station_type === "ev";
    const icon = isEv ? evIcon : petrolIcon;

    const priceText = isEv
      ? `€${f.properties.fuel_price}/kWh ⚡`
      : `€${f.properties.fuel_price}/L ⛽`;

    const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

    // Map marker
    const marker = L.marker([lat, lng], { icon });
    marker.bindPopup(
      `<strong>${f.properties.name}</strong><br>
       Type: ${f.properties.station_type.toUpperCase()}<br>
       Price: ${priceText}<br>
       <a href="${gmapsUrl}" target="_blank" rel="noopener">
         Open in Google Maps
       </a>`
    );
    clusterGroup.addLayer(marker);

    // Clickable list item
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <div>
        <strong>${f.properties.name}</strong><br>
        <small class="text-muted">${f.properties.station_type.toUpperCase()}</small>
      </div>
      <div class="text-end">
        <span class="badge bg-primary d-block mb-1">${priceText}</span>
        <a href="${gmapsUrl}"
           target="_blank"
           rel="noopener"
           class="small text-decoration-none">
          Directions ↗
        </a>
      </div>
    `;
    li.addEventListener("click", () => {
      map.setView([lat, lng], 14);
      marker.openPopup();
    });
    list.appendChild(li);
  });

  countBox.innerText = `${features.length} station${
    features.length !== 1 ? "s" : ""
  } shown.`;
}

// Apply type, sort, and search filters, then render
function applyFilterAndRender() {
  updateFilterLabel();

  if (!allFeatures || allFeatures.length === 0) {
    renderFeatures([]);
    return;
  }

  // Start from a copy of all features
  let features = allFeatures.slice();

  // Filter by type (petrol / ev)
  if (currentTypeFilter !== "all") {
    features = features.filter(
      (f) => f.properties.station_type === currentTypeFilter
    );
  }

  // Sort by cheapest or nearest
  if (currentSortFilter === "cheapest") {
    features.sort(
      (a, b) =>
        parseFloat(a.properties.fuel_price) -
        parseFloat(b.properties.fuel_price)
    );
    features = features.slice(0, 20); // show top 20 cheapest
  } else if (currentSortFilter === "nearest" && lastReferencePoint) {
    features.sort((a, b) => {
      const da = distanceKm(lastReferencePoint, featureLatLng(a));
      const db = distanceKm(lastReferencePoint, featureLatLng(b));
      return da - db;
    });
    features = features.slice(0, 20); // show top 20 nearest
  }

  // Search filter (by station name)
  if (currentSearchTerm.trim().length > 0) {
    const term = currentSearchTerm.trim().toLowerCase();
    features = features.filter((f) =>
      f.properties.name.toLowerCase().includes(term)
    );
  }

  renderFeatures(features);
}

// ---------- 5. Load data from the API -----------------------------

async function load(url) {
  const countBox = document.getElementById("countBox");
  countBox.innerText = "Loading stations…";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // Handle both:
    //  - FeatureCollection
    //  - { results: FeatureCollection }   (older paginated format)
    let featureCollection = null;

    if (data && data.type === "FeatureCollection") {
      featureCollection = data;
    } else if (
      data &&
      data.results &&
      data.results.type === "FeatureCollection"
    ) {
      featureCollection = data.results;
    }

    if (!featureCollection || !featureCollection.features) {
      allFeatures = [];
      applyFilterAndRender();
      return;
    }

    allFeatures = featureCollection.features;

    // When new data is loaded, reset sort mode
    if (currentSortFilter === "nearest" || currentSortFilter === "cheapest") {
      currentSortFilter = "none";
    }
    applyFilterAndRender();
  } catch (err) {
    console.error("Load error:", err);
    countBox.innerText = "Error loading stations.";
    alert("Error loading stations: " + err.message);
  }
}

// ---------- 6. Geolocation: “Use my location” --------------------

function useMyLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported in your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      lastReferencePoint = { lat: latitude, lng: longitude };

      // Update or create the user marker
      if (userMarker) {
        userMarker.setLatLng([latitude, longitude]);
      } else {
        userMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(
          map
        );
        userMarker.bindPopup("You are here.");
      }

      // Draw a 5 km circle around the user
      if (searchCircle) {
        map.removeLayer(searchCircle);
      }
      searchCircle = L.circle([latitude, longitude], {
        radius: 5000,
        color: "blue",
        fillOpacity: 0.05,
      }).addTo(map);

      map.flyTo([latitude, longitude], 13, {
        animate: true,
        duration: 1.5,
      });

      // Ask backend for nearby stations around this point
      const url = `/api/stations/nearby/?lat=${latitude}&lon=${longitude}&radius=5000`;
      load(url);
    },
    (err) => {
      console.error("Geolocation error:", err);
      alert("Could not get your location: " + err.message);
    }
  );
}

// ---------- 7. Button + input handlers ---------------------------

const showBtn = document.getElementById("showStationsBtn");
const reloadBtn = document.getElementById("showAllBtn");
const filterPetrolBtn = document.getElementById("filterPetrolBtn");
const filterEvBtn = document.getElementById("filterEvBtn");
const nearestBtn = document.getElementById("nearestBtn");
const cheapestBtn = document.getElementById("cheapestBtn");
const locateBtn = document.getElementById("locateBtn");
const searchInput = document.getElementById("searchInput");
const darkModeToggle = document.getElementById("darkModeToggle");
const sidebarToggle = document.getElementById("sidebarToggle");

// Load all stations
showBtn.addEventListener("click", () => {
  currentTypeFilter = "all";
  currentSortFilter = "none";
  lastReferencePoint = { lat: MAP_CENTER[0], lng: MAP_CENTER[1] };

  if (searchCircle) {
    map.removeLayer(searchCircle);
    searchCircle = null;
  }

  map.flyTo(MAP_CENTER, 12, { animate: true, duration: 1.0 });
  load("/api/stations/");
});

// Reset map + reload all
reloadBtn.addEventListener("click", () => {
  currentTypeFilter = "all";
  currentSortFilter = "none";
  currentSearchTerm = "";
  if (searchInput) searchInput.value = "";
  lastReferencePoint = { lat: MAP_CENTER[0], lng: MAP_CENTER[1] };

  if (searchCircle) {
    map.removeLayer(searchCircle);
    searchCircle = null;
  }

  map.flyTo(MAP_CENTER, 12, { animate: true, duration: 1.0 });
  load("/api/stations/");
});

// Filter: petrol only
filterPetrolBtn.addEventListener("click", () => {
  currentTypeFilter = "petrol";
  applyFilterAndRender();
});

// Filter: EV only
filterEvBtn.addEventListener("click", () => {
  currentTypeFilter = "ev";
  applyFilterAndRender();
});

// Sort: nearest 20 (uses lastReferencePoint)
nearestBtn.addEventListener("click", () => {
  currentSortFilter = "nearest";
  applyFilterAndRender();
});

// Sort: cheapest 20
cheapestBtn.addEventListener("click", () => {
  currentSortFilter = "cheapest";
  applyFilterAndRender();
});

// Geolocation button
locateBtn.addEventListener("click", () => {
  useMyLocation();
});

// Search box
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    currentSearchTerm = e.target.value || "";
    applyFilterAndRender();
  });
}

// Dark mode toggle
darkModeToggle.addEventListener("click", () => {
  isDarkMode = !isDarkMode;

  // Swap tile layers
  if (isDarkMode) {
    map.removeLayer(lightTiles);
    darkTiles.addTo(map);
    document.body.classList.add("dark-mode");
    darkModeToggle.textContent = "☀️ Light mode";
  } else {
    map.removeLayer(darkTiles);
    lightTiles.addTo(map);
    document.body.classList.remove("dark-mode");
    darkModeToggle.textContent = "🌙 Dark mode";
  }
});

// Sidebar collapse toggle
sidebarToggle.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-collapsed");
});

// ---------- 8. Map click: search within 5 km of clicked point -----

map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  lastReferencePoint = { lat, lng };

  // Draw / move 5 km circle
  if (searchCircle) {
    map.removeLayer(searchCircle);
  }
  searchCircle = L.circle([lat, lng], {
    radius: 5000,
    color: "green",
    fillOpacity: 0.05,
  }).addTo(map);

  map.flyTo([lat, lng], 13, { animate: true, duration: 1.5 });

  const url = `/api/stations/nearby/?lat=${lat}&lon=${lng}&radius=5000`;
  load(url);
});

// ---------- 9. Initial load: show all stations -------------------

load("/api/stations/");
