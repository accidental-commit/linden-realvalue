# Privacy Policy for Linden RealValue

**Effective Date:** November 2, 2026  
**Extension:** Linden RealValue - SL Marketplace Converter  
**Developer:** accidental-commit  

Linden RealValue ("the Extension") is committed to protecting your privacy. This policy outlines our data handling practices.

## 1. Information Collection and Use
* **No Personal Data Collected:** The Extension does not collect, record, track, transmit, or sell any personally identifiable information (PII), Second Life account credentials, payment information, or personal communications.
* **No Browsing History Tracking:** The Extension operates exclusively on `https://marketplace.secondlife.com/*` solely to parse Linden Dollar (L$) prices in listings and calculate real-world currency conversions. It does not monitor, track, or record your broader web browsing activity.

## 2. Local Storage
The Extension utilizes the `chrome.storage` API exclusively on your local device to:
* Save user preferences (such as selected display currency, fee calculation toggles, and price badge styling).
* Cache publicly available exchange rate data locally to minimize redundant network requests.

This information remains on your local browser profile and is never transmitted to any external server.

## 3. Network Requests
The Extension performs background network requests solely to fetch public market data:
* Pre-calculated exchange rate data from GitHub (`https://raw.githubusercontent.com/accidental-commit/linden-realvalue/*`)
* Public LindeX market data feed fallback (`https://api.secondlife.com/*`)
* Public fiat exchange rates fallback (`https://open.er-api.com/*`)

No user identifiers, telemetry, analytics, or tracking tokens are sent in these requests.

## 4. Third-Party Sharing
We do not sell, rent, trade, or share user data with any third parties.

## 5. Contact
If you have any questions about this Privacy Policy, you can open an issue on the repository:  
https://github.com/accidental-commit/linden-realvalue
