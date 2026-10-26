// supabase/functions/currency-rates/index.ts
// Edge function to fetch and cache exchange rates for server-side currency conversion
// Used by other edge functions and as a centralized rate provider

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

// Fallback rates (updated 2026-02-14)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EGP: 46.85,
  EUR: 0.843,
  GBP: 0.733,
  SAR: 3.75,
  AED: 3.67,
  TRY: 43.72,
  KWD: 0.307,
};

// In-memory cache for edge function instance
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function fetchRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const resp = await fetch(API_URL, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    cachedRates = data.rates;
    cacheTimestamp = now;
    return data.rates;
  } catch (e) {
    console.warn('Exchange rate API unavailable, using fallback:', e.message);
    cachedRates = FALLBACK_RATES;
    cacheTimestamp = now;
    return FALLBACK_RATES;
  }
}

function convertFromUSD(amount: number, targetCurrency: string, rates: Record<string, number>): number {
  if (!amount || targetCurrency === 'USD') return amount || 0;
  const rate = rates[targetCurrency];
  if (!rate) return amount;
  return Math.round(amount * rate * 100) / 100;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rates = await fetchRates();

    if (req.method === 'GET') {
      // GET /currency-rates — return all rates
      // GET /currency-rates?currency=EGP — return specific rate
      // GET /currency-rates?convert=100&to=EGP — convert amount
      const currency = url.searchParams.get('currency');
      const convertAmount = url.searchParams.get('convert');
      const toCurrency = url.searchParams.get('to');

      if (convertAmount && toCurrency) {
        const amount = parseFloat(convertAmount);
        const converted = convertFromUSD(amount, toCurrency, rates);
        return new Response(JSON.stringify({
          from: 'USD',
          to: toCurrency,
          amount,
          converted,
          rate: rates[toCurrency] || null,
          fetched_at: new Date().toISOString(),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (currency) {
        return new Response(JSON.stringify({
          currency,
          rate: rates[currency] || null,
          base: 'USD',
          fetched_at: new Date().toISOString(),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Return all supported rates
      const supportedCurrencies = ['USD', 'EGP', 'EUR', 'GBP', 'SAR', 'AED', 'TRY', 'KWD'];
      const filteredRates: Record<string, number> = {};
      supportedCurrencies.forEach(c => { filteredRates[c] = rates[c] || 0; });

      return new Response(JSON.stringify({
        base: 'USD',
        rates: filteredRates,
        fetched_at: new Date().toISOString(),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      // POST body: { amounts: [{ amount: 29, currency: 'EGP' }, ...] }
      // Batch conversion
      const body = await req.json();
      const results = (body.amounts || []).map((item: { amount: number; currency: string }) => ({
        ...item,
        converted: convertFromUSD(item.amount, item.currency, rates),
        rate: rates[item.currency] || null,
      }));

      return new Response(JSON.stringify({
        base: 'USD',
        results,
        fetched_at: new Date().toISOString(),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
