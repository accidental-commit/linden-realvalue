// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const rateDisplay = document.getElementById("rateDisplay");
  const lastUpdatedDisplay = document.getElementById("lastUpdatedDisplay");
  const refreshBtn = document.getElementById("refreshBtn");
  const currencySelect = document.getElementById("currencySelect");
  const displayModeSelect = document.getElementById("displayModeSelect");
  const multiplierInput = document.getElementById("multiplierInput");
  const saveBtn = document.getElementById("saveBtn");

  function loadState() {
    chrome.storage.local.get(["lindexRate", "fiatRates", "lastUpdated", "userCurrency", "displayMode", "customMultiplier"], (data) => {
      const rate = data.lindexRate || 250.0;
      const userCurr = data.userCurrency || "USD";
      const fiatRate = (data.fiatRates && data.fiatRates[userCurr]) || 1.0;
      
      if (userCurr === "USD") {
        rateDisplay.textContent = `L$ ${rate.toFixed(2)} / $1 USD`;
      } else {
        const localRate = rate / fiatRate;
        rateDisplay.textContent = `L$ ${localRate.toFixed(2)} / 1 ${userCurr} (USD: ${rate.toFixed(2)})`;
      }

      if (data.lastUpdated) {
        lastUpdatedDisplay.textContent = `Updated: ${new Date(data.lastUpdated).toLocaleTimeString()}`;
      }
      if (data.userCurrency) {
        currencySelect.value = data.userCurrency;
      }
      if (data.displayMode) {
        displayModeSelect.value = data.displayMode;
      }
      if (data.customMultiplier) {
        multiplierInput.value = data.customMultiplier;
      }
    });
  }

  refreshBtn.addEventListener("click", () => {
    rateDisplay.textContent = "Updating...";
    chrome.runtime.sendMessage({ action: "forceRefresh" }, (res) => {
      loadState();
    });
  });

  saveBtn.addEventListener("click", () => {
    const userCurrency = currencySelect.value;
    const displayMode = displayModeSelect.value;
    const customMultiplier = parseFloat(multiplierInput.value) || 1.0;

    chrome.storage.local.set({ userCurrency, displayMode, customMultiplier }, () => {
      saveBtn.textContent = "Saved!";
      setTimeout(() => {
        saveBtn.textContent = "Save Settings";
      }, 1000);
    });
  });

  loadState();
});

