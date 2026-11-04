// background.js - Service worker to fetch and cache LindeX rate

// Primary feed: pre-parsed hourly rate from repository cache
// Fallback: direct Linden Lab LindeX XML endpoint
const GITHUB_RATE_URL = "https://raw.githubusercontent.com/accidental-commit/linden-realvalue/data/rate.json";
const LINDEX_DIRECT_URL = "https://api.secondlife.com/datafeeds/lindex.xml";
const FOREX_DIRECT_URL = "https://open.er-api.com/v6/latest/USD";
const ALARM_NAME = "refresh_lindex_rate";
const REFRESH_INTERVAL_MINUTES = 30; // Check for updates every 30 mins

const DEFAULT_RATES = { USD: 1.0, EUR: 0.90, GBP: 0.75, CAD: 1.40, AUD: 1.55, JPY: 155.0 };

// Parse LLSD XML response to compute the last hour's volume-weighted average rate
function extractRateFromXml(xmlText) {
  try {
    // 1. Try to get 1_hour market_buy volume (L$ volume / US$ volume)
    const marketBuy1Hour = xmlText.match(
      /<key>market_buy<\/key>[\s\S]*?<key>1_hour<\/key>[\s\S]*?<key>l\$_volume<\/key>\s*<string>([\d.]+)<\/string>[\s\S]*?<key>us\$_volume<\/key>\s*<string>([\d.]+)<\/string>/i
    );

    if (marketBuy1Hour && marketBuy1Hour[1] && marketBuy1Hour[2]) {
      const lVol = parseFloat(marketBuy1Hour[1]);
      const usdVol = parseFloat(marketBuy1Hour[2]);
      if (lVol > 0 && usdVol > 0) {
        return lVol / usdVol; // Volume-weighted average for last hour
      }
    }

    // 2. Fallback to 1_hour min/max median if volume is 0 in a quiet hour
    const minMaxMatch = xmlText.match(
      /<key>market_buy<\/key>[\s\S]*?<key>1_hour<\/key>[\s\S]*?<key>min_rate<\/key>\s*<integer>(\d+)<\/integer>[\s\S]*?<key>max_rate<\/key>\s*<integer>(\d+)<\/integer>/i
    );
    if (minMaxMatch && minMaxMatch[1] && minMaxMatch[2]) {
      const min = parseInt(minMaxMatch[1], 10);
      const max = parseInt(minMaxMatch[2], 10);
      if (min > 0 && max > 0) {
        return (min + max) / 2.0; // Midpoint/median
      }
    }

    // 3. Fallback to 1_day market_buy volume-weighted average
    const marketBuy1Day = xmlText.match(
      /<key>market_buy<\/key>[\s\S]*?<key>1_day<\/key>[\s\S]*?<key>l\$_volume<\/key>\s*<string>([\d.]+)<\/string>[\s\S]*?<key>us\$_volume<\/key>\s*<string>([\d.]+)<\/string>/i
    );
    if (marketBuy1Day && marketBuy1Day[1] && marketBuy1Day[2]) {
      const lVol = parseFloat(marketBuy1Day[1]);
      const usdVol = parseFloat(marketBuy1Day[2]);
      if (lVol > 0 && usdVol > 0) {
        return lVol / usdVol;
      }
    }
  } catch (err) {
    console.warn("[SL Converter] Error extracting rate:", err);
  }

  return 250.0; // Standard fallback baseline
}

async function updateExchangeRate() {
  // 1. Try pulling from repo cached rate.json first (shields Linden Lab from repeated client hits)
  try {
    const res = await fetch(GITHUB_RATE_URL, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.rate === "number" && data.rate > 0) {
        await chrome.storage.local.set({
          lindexRate: data.rate,
          fiatRates: data.rates || DEFAULT_RATES,
          lastUpdated: data.last_updated ? new Date(data.last_updated).getTime() : Date.now()
        });
        console.log(`[SL Converter] Updated rate from repo cache: L$ ${data.rate} / USD`);
        return data.rate;
      }
    }
  } catch (err) {
    console.info("[SL Converter] Repo rate cache unavailable, falling back to direct LindeX feed...");
  }

  // 2. Direct LindeX datafeed fallback
  try {
    const response = await fetch(LINDEX_DIRECT_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const rate = extractRateFromXml(xml);

    // Fetch fiat rates if needed
    let fiatRates = DEFAULT_RATES;
    try {
      const forexRes = await fetch(FOREX_DIRECT_URL, { cache: "no-store" });
      if (forexRes.ok) {
        const forexData = await forexRes.json();
        if (forexData?.rates) {
          fiatRates = {
            USD: 1.0,
            EUR: forexData.rates.EUR || DEFAULT_RATES.EUR,
            GBP: forexData.rates.GBP || DEFAULT_RATES.GBP,
            CAD: forexData.rates.CAD || DEFAULT_RATES.CAD,
            AUD: forexData.rates.AUD || DEFAULT_RATES.AUD,
            JPY: forexData.rates.JPY || DEFAULT_RATES.JPY
          };
        }
      }
    } catch (e) {
      console.warn("[SL Converter] Error fetching direct forex:", e);
    }

    await chrome.storage.local.set({
      lindexRate: rate,
      fiatRates: fiatRates,
      lastUpdated: Date.now()
    });
    console.log(`[SL Converter] Updated direct LindeX rate: L$ ${rate} / USD`);
    return rate;
  } catch (err) {
    console.warn("[SL Converter] Error fetching LindeX rate:", err);
    // Keep existing cached rate if available
    const existing = await chrome.storage.local.get(["lindexRate", "fiatRates"]);
    if (!existing.lindexRate) {
      await chrome.storage.local.set({
        lindexRate: 250.0,
        fiatRates: DEFAULT_RATES,
        lastUpdated: Date.now()
      });
    }
  }
}

// Initial setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: REFRESH_INTERVAL_MINUTES
  });
  updateExchangeRate();
});

// Periodic refresh
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    updateExchangeRate();
  }
});

// Respond to content script requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getRate") {
    chrome.storage.local.get(["lindexRate", "fiatRates", "lastUpdated", "userCurrency", "displayMode"], (data) => {
      sendResponse({
        rate: data.lindexRate || 250.0,
        fiatRates: data.fiatRates || DEFAULT_RATES,
        lastUpdated: data.lastUpdated || Date.now(),
        userCurrency: data.userCurrency || "USD",
        displayMode: data.displayMode || "append"
      });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === "forceRefresh") {
    updateExchangeRate().then((rate) => {
      sendResponse({ rate: rate || 250.0 });
    });
    return true;
  }
});

