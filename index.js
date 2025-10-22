import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.TWELVED_API_KEY;

app.use(cors());
app.use(express.json());

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 25 * 1000; // 25 seconds

function cacheKey(symbol, interval) {
  return `${symbol}|${interval}`;
}

async function fetchFromProvider(symbol, interval = '5min') {
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=200&format=JSON&apikey=${API_KEY}`;
  const r = await fetch(url);
  const data = await r.json();
  return data;
}

app.get('/api/candles', async (req, res) => {
  const { symbol, interval = '5min' } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const key = cacheKey(symbol, interval);
    const now = Date.now();
    if (cache.has(key)) {
      const { ts, data } = cache.get(key);
      if (now - ts < CACHE_TTL) return res.json(data);
    }

    const data = await fetchFromProvider(symbol, interval);
    if (data?.status === 'error') return res.status(500).json({ error: data.message || 'provider error' });

    cache.set(key, { ts: now, data });
    return res.json(data);
  } catch (err) {
    console.error('candles err', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Backend Proxy running on http://localhost:${PORT}`));
