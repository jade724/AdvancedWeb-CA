// Initialize map
const map = L.map("map", { zoomControl: true }).setView([53.35, -6.26], 12);

// Tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

let layer = L.layerGroup().addTo(map);
let searchCircle = null; // keep circle separate



// --- Function to Load and render stations as GeoJSON ---
async function load(url) {
  console.log("Fetching:", url);
  layer.clearLayers();

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const geo = await res.json();

    if (!geo.features || geo.features.length === 0) {
      document.getElementById("countBox").innerText = "No stations found.";
      document.getElementById("stationList").innerHTML = "";
      return;
    }

    let count = 0;
    const geoLayer = L.geoJSON(geo, {
      pointToLayer: (f, latlng) => {
        count++;
        const color = f.properties.station_type === "ev" ? "gold" : "red";
        return L.circleMarker(latlng, {
          radius: 7,
          color,
          weight: 2,
          fillOpacity: 0.8,
        }).bindPopup(
          `<b>${f.properties.name}</b><br>
           Type: ${f.properties.station_type.toUpperCase()}<br>
           Price: ${
             f.properties.station_type === "ev"
               ? `€${f.properties.fuel_price}/kWh ⚡`
               : `€${f.properties.fuel_price}/L ⛽`
           }`
        );
      },
    }).addTo(layer);

    // Update count
    document.getElementById("countBox").innerText =
      `${count} station${count > 1 ? "s" : ""} found.`;

    // --- Update nearby station list ---
    const list = document.getElementById("stationList");
    list.innerHTML = "";

    geo.features.forEach((f) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";

      const name = f.properties.name;
      const type = f.properties.station_type.toUpperCase();
      const price =
        f.properties.station_type === "ev"
          ? `€${f.properties.fuel_price}/kWh ⚡`
          : `€${f.properties.fuel_price}/L ⛽`;

      li.innerHTML = `
        <div>
          <strong>${name}</strong><br>
          <small class="text-muted">${type}</small>
        </div>
        <span class="badge bg-primary">${price}</span>
      `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Load error:", err);
    alert("Error loading stations: " + err.message);
  }
}

// --- “Show Stations” button ---
const showBtn = document.getElementById("showStationsBtn");
showBtn.addEventListener("click", () => {
  showBtn.classList.add("btn-success");
  setTimeout(() => showBtn.classList.remove("btn-success"), 800);
  load('/api/stations/');
});

// --- “Reload All Stations” button ---
const reloadBtn = document.getElementById("showAllBtn");
reloadBtn.addEventListener("click", () => {
  reloadBtn.classList.add("btn-primary");
  setTimeout(() => reloadBtn.classList.remove("btn-primary"), 800);
  map.flyTo([53.35, -6.26], 12, { animate: true, duration: 1.5 });
  if (searchCircle) map.removeLayer(searchCircle); // ✅ remove old circle
  load('/api/stations/');
});

// --- Map click: find nearby stations ---
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  console.log(`Nearby search around: ${lat}, ${lng}`); // ✅ fixed log quotes
  const url = `/api/stations/nearby/?lat=${lat}&lon=${lng}&radius=5000`;

  // Remove old circle before adding a new one
  if (searchCircle) map.removeLayer(searchCircle);
  searchCircle = L.circle([lat, lng], {
    radius: 5000,
    color: "green",
    fill: false,
  }).addTo(map);

  map.flyTo([lat, lng], 13, { animate: true, duration: 1.5 });
  load(url);
});

// Legend
const legend = L.control({ position: "bottomright" });
legend.onAdd = function () {
  const div = L.DomUtil.create("div", "info legend");
  return div;
};
legend.addTo(map);

// Auto-load all stations on startup
load('/api/stations/');
