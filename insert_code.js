const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = "            async function fetchCafes(token = null) {";
const injectionStr = `
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

            async function fetchCafes(token = null) {`;

if (html.includes(targetStr)) {
    html = html.replace(targetStr, injectionStr);
    fs.writeFileSync('index.html', html);
    console.log("Successfully inserted code.");
} else {
    console.log("Error: Target string not found.");
}
