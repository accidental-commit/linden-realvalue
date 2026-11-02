// content.js - Injects estimated real currency price next to or in place of L$ amounts

let currentRate = 250.0;
let userCurrency = "USD";
let displayMode = "append"; // 'append' or 'replace'
let fiatRates = { USD: 1.0, EUR: 0.90, GBP: 0.75, CAD: 1.40, AUD: 1.55, JPY: 155.0 };

function getFiatRate(currency) {
  return fiatRates[currency] || 1.0;
}

function formatFiat(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (e) {
    return `$${amount.toFixed(2)}`;
  }
}

function processPriceElement(el) {
  // Check if this element or any ancestor/descendant is already converted
  if (
    el.dataset.slConverted === "true" ||
    el.closest("[data-sl-converted='true']") ||
    el.querySelector(".sl-real-currency-badge") ||
    el.parentElement?.querySelector(".sl-real-currency-badge")
  ) {
    return;
  }

  // Look only at the element's direct text or inspect text content
  const text = el.textContent || "";
  const match = text.match(/L\$\s?([\d,]+)/);
  if (!match) return;

  const rawNumber = match[1].replace(/,/g, "");
  const lindens = parseInt(rawNumber, 10);
  if (isNaN(lindens)) return;

  // Real world value calculation:
  // 1. Convert L$ to USD: USD = L$ / LindeX Rate
  // 2. Convert USD to target fiat: Target = USD * forexRate[currency]
  const usdValue = lindens / currentRate;
  const fiatMultiplier = getFiatRate(userCurrency);
  const fiatValue = usdValue * fiatMultiplier;
  const formattedFiat = formatFiat(fiatValue, userCurrency);

  // Mark as processed
  el.dataset.slConverted = "true";

  if (displayMode === "replace") {
    // Save original Linden text for clean reversion/updates
    el.dataset.originalLinden = text;
    // Replace text content directly, keeping hover tooltip for Linden price
    el.title = `${text.trim()} (Rate: ~L$ ${Math.round(currentRate)} / $1.00 USD)`;
    el.textContent = `~${formattedFiat}`;
    el.classList.add("sl-real-currency-replaced");
  } else {
    // Append mode: Keep L$ price and add badge next to it
    const badge = document.createElement("span");
    badge.className = "sl-real-currency-badge";
    badge.title = `Estimated real-world value based on LindeX rate (~L$ ${Math.round(currentRate)} = $1.00 USD)`;
    badge.textContent = `(~${formattedFiat})`;
    el.appendChild(badge);
  }
}

function scanAndConvert() {
  // Target specific price classes first, falling back to elements with L$ text
  const candidates = document.querySelectorAll(
    ".price, .amount, .item-price, [class*='price']"
  );

  candidates.forEach((node) => {
    if (/L\$\s?[\d,]+/.test(node.textContent)) {
      // Find the deepest element containing the price text to avoid parent & child double matching
      const target = findDeepestPriceNode(node) || node;
      processPriceElement(target);
    }
  });

  // Secondary pass for any stray inline L$ prices not wrapped in a price class
  document.querySelectorAll("span, strong, b").forEach((node) => {
    // Only inspect leaf or near-leaf elements
    if (node.children.length === 0 && /L\$\s?[\d,]+/.test(node.textContent)) {
      processPriceElement(node);
    }
  });
}

function findDeepestPriceNode(el) {
  for (const child of el.children) {
    if (child.classList?.contains("sl-real-currency-badge")) continue;
    if (/L\$\s?[\d,]+/.test(child.textContent)) {
      return findDeepestPriceNode(child);
    }
  }
  return el;
}

// Observe DOM for dynamic search results, pagination, infinite scroll, or modal popups
function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      scanAndConvert();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize with rate from background worker
function init() {
  chrome.runtime.sendMessage({ action: "getRate" }, (response) => {
    if (response) {
      currentRate = response.rate || 250.0;
      fiatRates = response.fiatRates || fiatRates;
      userCurrency = response.userCurrency || "USD";
      displayMode = response.displayMode || "append";
    }
    scanAndConvert();
    setupObserver();
  });

  // Listen for settings or rate updates from popup
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      if (changes.lindexRate) currentRate = changes.lindexRate.newValue;
      if (changes.fiatRates) fiatRates = changes.fiatRates.newValue;
      if (changes.userCurrency) userCurrency = changes.userCurrency.newValue;
      if (changes.displayMode) displayMode = changes.displayMode.newValue;

      // Revert any replaced text back to original L$ string
      document.querySelectorAll(".sl-real-currency-replaced").forEach((el) => {
        if (el.dataset.originalLinden) {
          el.textContent = el.dataset.originalLinden;
          delete el.dataset.originalLinden;
        }
        el.classList.remove("sl-real-currency-replaced");
      });

      // Clear appended badges
      document.querySelectorAll(".sl-real-currency-badge").forEach((el) => el.remove());

      // Reset conversion attributes
      document.querySelectorAll("[data-sl-converted]").forEach((el) => {
        delete el.dataset.slConverted;
      });

      scanAndConvert();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

