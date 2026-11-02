const https = require("https");
const fs = require("fs");
const path = require("path");

const LINDEX_URL = "https://api.secondlife.com/datafeeds/lindex.xml";
const FOREX_URL = "https://open.er-api.com/v6/latest/USD";
const OUTPUT_FILE = path.join(__dirname, "..", "rate.json");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "SL-Marketplace-Currency-Converter-Updater/1.0" } }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP status code ${res.statusCode}`));
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function fetchXml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "SL-Marketplace-Currency-Converter-Updater/1.0" } }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP status code ${res.statusCode}`));
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function calculateRate(xmlText) {
  // 1. Try 1_hour market_buy volume (L$ volume / US$ volume)
  const marketBuy1Hour = xmlText.match(
    /<key>market_buy<\/key>[\s\S]*?<key>1_hour<\/key>[\s\S]*?<key>l\$_volume<\/key>\s*<string>([\d.]+)<\/string>[\s\S]*?<key>us\$_volume<\/key>\s*<string>([\d.]+)<\/string>/i
  );

  if (marketBuy1Hour && marketBuy1Hour[1] && marketBuy1Hour[2]) {
    const lVol = parseFloat(marketBuy1Hour[1]);
    const usdVol = parseFloat(marketBuy1Hour[2]);
    if (lVol > 0 && usdVol > 0) {
      return parseFloat((lVol / usdVol).toFixed(2));
    }
  }

  // 2. Fallback to 1_hour median (min_rate + max_rate) / 2
  const minMaxMatch = xmlText.match(
    /<key>market_buy<\/key>[\s\S]*?<key>1_hour<\/key>[\s\S]*?<key>min_rate<\/key>\s*<integer>(\d+)<\/integer>[\s\S]*?<key>max_rate<\/key>\s*<integer>(\d+)<\/integer>/i
  );
  if (minMaxMatch && minMaxMatch[1] && minMaxMatch[2]) {
    const min = parseInt(minMaxMatch[1], 10);
    const max = parseInt(minMaxMatch[2], 10);
    if (min > 0 && max > 0) {
      return parseFloat(((min + max) / 2.0).toFixed(2));
    }
  }

  // 3. Fallback to 1_day volume-weighted average
  const marketBuy1Day = xmlText.match(
    /<key>market_buy<\/key>[\s\S]*?<key>1_day<\/key>[\s\S]*?<key>l\$_volume<\/key>\s*<string>([\d.]+)<\/string>[\s\S]*?<key>us\$_volume<\/key>\s*<string>([\d.]+)<\/string>/i
  );
  if (marketBuy1Day && marketBuy1Day[1] && marketBuy1Day[2]) {
    const lVol = parseFloat(marketBuy1Day[1]);
    const usdVol = parseFloat(marketBuy1Day[2]);
    if (lVol > 0 && usdVol > 0) {
      return parseFloat((lVol / usdVol).toFixed(2));
    }
  }

  return 250.0;
}

async function main() {
  try {
    console.log("Fetching live LindeX data...");
    const xml = await fetchXml(LINDEX_URL);
    const rate = calculateRate(xml);

    let rates = { USD: 1.0, EUR: 0.90, GBP: 0.75, CAD: 1.40, AUD: 1.55, JPY: 155.0 };
    try {
      console.log("Fetching live fiat forex rates...");
      const forex = await fetchJson(FOREX_URL);
      if (forex && forex.rates) {
        rates = {
          USD: 1.0,
          EUR: forex.rates.EUR || rates.EUR,
          GBP: forex.rates.GBP || rates.GBP,
          CAD: forex.rates.CAD || rates.CAD,
          AUD: forex.rates.AUD || rates.AUD,
          JPY: forex.rates.JPY || rates.JPY
        };
      }
    } catch (e) {
      console.warn("Using fallback fiat rates due to error:", e.message);
    }

    const payload = {
      rate: rate,
      rates: rates,
      last_updated: new Date().toISOString(),
      source: "LindeX 1-hour volume-weighted average"
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2) + "\n");
    console.log(`Updated rate.json successfully: L$ ${rate} / $1 USD`);
  } catch (err) {
    console.error("Failed to update rate.json:", err);
    process.exit(1);
  }
}

main();

