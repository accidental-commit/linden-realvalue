# Linden RealValue - Second Life Marketplace Currency Converter

A browser extension (Chrome, Edge, Brave, and other Chromium browsers) that injects estimated real-world currency prices next to or in place of Linden Dollar (L$) prices on the [Second Life Marketplace](https://marketplace.secondlife.com).

## Features

- **Live Rate Tracking**: Uses the volume-weighted 1-hour average exchange rate from the official LindeX market feed.
- **Serverless & Rate-Limit Shielded**: A scheduled GitHub Action cron job refreshes `rate.json` once an hour from Linden Lab, ensuring user installations don't overload or spam Linden Lab's servers. A direct fallback to LindeX is included if offline.
- **Flexible Display Modes**: Choose whether to display the estimated fiat price alongside the L$ amount (e.g. `L$ 250 (~$1.02)`) or completely replace it (e.g. `~$1.02`), with full hover details.
- **Dynamic DOM Observer**: Automatically converts prices loaded dynamically via AJAX, search filters, pagination, or infinite scrolling.
- **Configurable Fiat Currencies**: Switch between USD, EUR, GBP, CAD, AUD, and JPY, with custom fee/conversion multiplier support in the popup settings.

## How to Install

### 1. Download or Clone the Repository

**Option A (Using Git):**
```bash
git clone https://github.com/accidental-commit/sl-marketplace-currency-converter.git
```

**Option B (Download ZIP):**
1. Click the green **Code** button at the top of the GitHub repository page.
2. Select **Download ZIP**.
3. Extract the downloaded `.zip` file into a folder on your computer.

---

### 2. Load into Your Browser

1. Open your browser and navigate to the extensions management page:
   - **Chrome / Brave**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
2. Turn on **Developer mode** (usually a toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the unpacked `sl-marketplace-currency-converter` directory containing `manifest.json`.
5. Visit [Second Life Marketplace](https://marketplace.secondlife.com/) and browse any listing or category!

