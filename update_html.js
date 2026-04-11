const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add CSS
const cssToAdd = `
        /* Location Search Styling */
        .location-search-container { margin: 0 auto 30px; max-width: 600px; display: flex; flex-direction: column; gap: 16px; }
        .search-bar { display: flex; gap: 8px; background: white; padding: 8px; border-radius: 30px; border: 1px solid var(--card-border); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .search-bar input { flex: 1; border: none; outline: none; padding: 8px 16px; font-size: 1rem; font-family: 'Inter', sans-serif; background: transparent; min-width: 0; }
        .search-bar button { background: var(--text-color); color: white; border: none; padding: 10px 24px; border-radius: 30px; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: var(--transition); white-space: nowrap; }
        .search-bar button:hover { background: var(--accent-color); }
        .radius-toggles { display: flex; justify-content: center; gap: 12px; }
        .radius-btn { background: transparent; border: 1px solid var(--card-border); padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; color: #4a4a4a; cursor: pointer; transition: var(--transition); }
        .radius-btn:hover { border-color: var(--text-color); color: var(--text-color); }
        .radius-btn.active { background: var(--text-color); color: var(--bg-color); border-color: var(--text-color); }
        .location-actions { display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .geo-btn { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: none; color: var(--accent-color); font-weight: 600; font-size: 0.95rem; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; transition: var(--transition); }
        .geo-btn:hover { opacity: 0.8; }
        .reset-location-btn { background: transparent; border: none; color: #7a7a7a; font-size: 0.85rem; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
        .reset-location-btn:hover { color: #d32f2f; }
        .distance-badge { position: absolute; top: 32px; right: 32px; background: #fdfdfd; color: #555; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; border: 1px solid rgba(0,0,0,0.08); z-index: 2; }
`;

html = html.replace('        /* Loading & Error States */', cssToAdd + '\n        /* Loading & Error States */');

// 2. Add header search bar
const headerHtml = `
        <div class="location-search-container">
            <div class="search-bar">
                <input type="text" id="address-input" placeholder="Adresse oder Ort eingeben..." aria-label="Adresse suchen">
                <button id="search-address-btn">Suchen</button>
            </div>
            <div class="radius-toggles">
                <button class="radius-btn" data-radius="2000">2 km</button>
                <button class="radius-btn active" data-radius="5000">5 km</button>
                <button class="radius-btn" data-radius="10000">10 km</button>
            </div>
            <div class="location-actions">
                <button id="geo-btn" class="geo-btn">📍 Meinen Standort verwenden</button>
                <button id="reset-location-btn" class="reset-location-btn hidden">× Standort zurücksetzen</button>
            </div>
        </div>

        <div class="filter-bar border-box">
`;
html = html.replace('        <div class="filter-bar border-box">', headerHtml);

// 3. Add JS state variables
const jsState = `
            let allPlaces = [];
            let nextPageToken = null;
            let currentFilter = 'all';
            let currentLat = null;
            let currentLng = null;
            let currentRadius = 5000;

            function getDistanceInKm(lat1, lon1, lat2, lon2) {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            }
`;
html = html.replace("            let allPlaces = [];\n            let nextPageToken = null;\n            let currentFilter = 'all';", jsState);


// 4. Update fetch URL logic
html = html.replace(
    "const url = token ? `/api/cafes/more?pageToken=${token}` : `/api/cafes`;",
    "let url = token ? `/api/cafes/more?pageToken=${token}` : `/api/cafes`;\n                    if (currentLat && currentLng) {\n                        url = token ? `/api/cafes/nearby?lat=${currentLat}&lng=${currentLng}&radius=${currentRadius}&pageToken=${token}` : `/api/cafes/nearby?lat=${currentLat}&lng=${currentLng}&radius=${currentRadius}`;\n                    }"
);

// 5. Update renderCafes distance calculation and badge
const renderPrefix = `
                if (currentLat && currentLng) {
                    filtered.forEach(p => {
                        if (p.location) {
                            p.distKm = getDistanceInKm(currentLat, currentLng, p.location.latitude, p.location.longitude);
                        } else {
                            p.distKm = 999;
                        }
                    });
                    filtered.sort((a, b) => a.distKm - b.distKm);
                }

                filtered.forEach((place, index) => {
`;
html = html.replace("                filtered.forEach((place, index) => {", renderPrefix);

const htmlCardPrefix = `                    let distanceBadge = '';
                    if (currentLat && currentLng && place.distKm !== undefined && place.distKm !== 999) {
                         const distStr = place.distKm < 1 ? (Math.round(place.distKm*1000) + ' m') : (place.distKm.toFixed(1) + ' km');
                         distanceBadge = \`<div class="distance-badge">\${distStr} entfernt</div>\`;
                    }

                    card.innerHTML = \`
                        \${distanceBadge}
`;
html = html.replace("                    card.innerHTML = `", htmlCardPrefix);


// 6. Event listeners
const initListeners = `
            const addressInput = document.getElementById('address-input');
            const searchAddressBtn = document.getElementById('search-address-btn');
            const geoBtn = document.getElementById('geo-btn');
            const resetLocationBtn = document.getElementById('reset-location-btn');
            const radiusBtns = document.querySelectorAll('.radius-btn');

            async function performSearchByAddress() {
                const query = addressInput.value.trim();
                if (!query) return;
                
                errorMsg.classList.add('hidden');
                loaderContainer.classList.remove('hidden');
                grid.innerHTML = '';
                grid.appendChild(loaderContainer);
                grid.appendChild(errorMsg);
                
                try {
                    const res = await fetch(\`/api/geocode?address=\${encodeURIComponent(query)}\`);
                    const data = await res.json();
                    if (!res.ok || data.error) {
                        throw new Error(data.error || 'Geocoding failed');
                    }
                    
                    currentLat = data.lat;
                    currentLng = data.lng;
                    resetLocationBtn.classList.remove('hidden');
                    fetchCafes(null);
                } catch (e) {
                    console.error(e);
                    loaderContainer.classList.add('hidden');
                    errorMsg.innerHTML = '<p>Adresse nicht gefunden. Bitte versuche es erneut.</p>';
                    errorMsg.classList.remove('hidden');
                }
            }

            searchAddressBtn.addEventListener('click', performSearchByAddress);
            addressInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performSearchByAddress();
            });

            geoBtn.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    alert('Geolocation is not supported by your browser');
                    return;
                }
                geoBtn.innerText = 'Standort wird ermittelt...';
                navigator.geolocation.getCurrentPosition((position) => {
                    currentLat = position.coords.latitude;
                    currentLng = position.coords.longitude;
                    geoBtn.innerText = '📍 Meinen Standort verwenden';
                    resetLocationBtn.classList.remove('hidden');
                    addressInput.value = ''; // clear text if using gps
                    fetchCafes(null);
                }, () => {
                    alert('Unable to retrieve your location');
                    geoBtn.innerText = '📍 Meinen Standort verwenden';
                });
            });

            resetLocationBtn.addEventListener('click', () => {
                currentLat = null;
                currentLng = null;
                addressInput.value = '';
                resetLocationBtn.classList.add('hidden');
                fetchCafes(null);
            });

            radiusBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    radiusBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentRadius = parseInt(btn.dataset.radius);
                    if (currentLat && currentLng) {
                        fetchCafes(null);
                    }
                });
            });

            // Init
`;
html = html.replace(/            \/\/ Init/, initListeners);

fs.writeFileSync('index.html', html);
console.log('Update complete.');
