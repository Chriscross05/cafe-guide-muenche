require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GOOGLE_API_KEY;

app.use(cors());
app.use(express.json());

const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Serve static files from the current directory (to serve index.html)
app.use(express.static(__dirname));

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.regularOpeningHours,places.googleMapsUri,places.websiteUri,places.editorialSummary,places.reviews,places.goodForChildren,places.allowsDogs,places.accessibilityOptions,places.location,places.paymentOptions,nextPageToken'
});

app.get('/api/cafes', async (req, res) => {
    try {
        const payload = {
            textQuery: "best cafes Munich",
            languageCode: "de"
        };

        const response = await fetch(PLACES_API_URL, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google API Error:', errorText);
            throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();
        
        let places = data.places || [];
        // Sort by rating descending
        places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        
        // Return top 9
        places = places.slice(0, 9);
        
        res.json({ places, nextPageToken: data.nextPageToken });
    } catch (error) {
        console.error('Error in /api/cafes:', error);
        res.status(500).json({ error: 'Failed to fetch cafes' });
    }
});

app.get('/api/cafes/more', async (req, res) => {
    const pageToken = req.query.pageToken;
    if (!pageToken) {
        return res.status(400).json({ error: 'Page token is required' });
    }

    try {
        const payload = {
            textQuery: "best cafes Munich",
            languageCode: "de",
            pageToken: pageToken
        };

        const response = await fetch(PLACES_API_URL, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google API Error:', errorText);
            throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();
        const places = data.places || [];
        
        res.json({ places, nextPageToken: data.nextPageToken });
    } catch (error) {
        console.error('Error in /api/cafes/more:', error);
        res.status(500).json({ error: 'Failed to fetch more cafes' });
    }
});

app.get('/api/geocode', async (req, res) => {
    const address = req.query.address;
    if (!address) {
        return res.status(400).json({ error: 'Address is required' });
    }
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            res.json({
                lat: result.geometry.location.lat,
                lng: result.geometry.location.lng,
                formattedAddress: result.formatted_address
            });
        } else {
            res.status(404).json({ error: 'Address not found' });
        }
    } catch (error) {
        console.error('Error in /api/geocode:', error);
        res.status(500).json({ error: 'Failed to geocode address' });
    }
});

app.get('/api/cafes/nearby', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 5000;

    if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Valid lat and lng are required' });
    }

    try {
        const payload = {
            textQuery: "café",
            locationBias: {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: radius
                }
            },
            languageCode: "de"
        };

        const response = await fetch(PLACES_API_URL, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google API Error:', errorText);
            throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();
        
        let places = data.places || [];
        places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        places = places.slice(0, 9);
        
        res.json({ places, nextPageToken: data.nextPageToken });
    } catch (error) {
        console.error('Error in /api/cafes/nearby:', error);
        res.status(500).json({ error: 'Failed to fetch nearby cafes' });
    }
});

app.post('/api/photos/upload', upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
    }
    const name = (req.body.name || '').replace(/\||=/g, ''); // sanitize for context string
    
    let isTimeout = false;
    const timeoutId = setTimeout(() => {
        isTimeout = true;
        res.status(504).json({ error: 'Upload timeout - Bild ist zu groß oder Verbindung zu langsam.' });
    }, 30000);

    const stream = cloudinary.uploader.upload_stream(
        { folder: 'linos-jga', context: `name=${name}` }, 
        (error, result) => {
            if (isTimeout) return;
            clearTimeout(timeoutId);

            if (error) {
                console.error('Cloudinary upload error:', error);
                return res.status(500).json({ error: 'Fehler beim Hochladen: ' + error.message });
            }
            res.json({
                id: result.public_id,
                url: result.secure_url,
                thumbnail_url: cloudinary.url(result.public_id, { width: 400, crop: "fill", secure: true }),
                name: name,
                timestamp: result.created_at
            });
        }
    );
    // Explicit error handling on stream
    stream.on('error', err => {
        if (!isTimeout) {
            clearTimeout(timeoutId);
            console.error('Stream error:', err);
            res.status(500).json({ error: 'Stream Fehler: ' + err.message });
        }
    });

    stream.end(req.file.buffer);
});

app.get('/api/photos', async (req, res) => {
    try {
        const result = await cloudinary.api.resources({ type: 'upload', prefix: 'linos-jga/', max_results: 100, context: true });
        
        let photos = result.resources.map(res => {
            return {
                id: res.public_id,
                url: res.secure_url,
                thumbnail_url: cloudinary.url(res.public_id, { width: 400, crop: "fill", secure: true }),
                name: (res.context && res.context.custom && res.context.custom.name) ? res.context.custom.name : '',
                timestamp: res.created_at
            };
        });
        
        photos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(photos);
    } catch (error) {
        console.error('Cloudinary fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch photos' });
    }
});

app.delete('/api/photos', async (req, res) => {
    const publicId = req.query.id;
    if (!publicId) return res.status(400).json({ error: 'No public ID provided' });
    try {
        await cloudinary.uploader.destroy(publicId);
        res.json({ success: true });
    } catch (err) {
        console.error('Cloudinary delete error:', err);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
