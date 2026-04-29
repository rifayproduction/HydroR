const tg = window.Telegram?.WebApp;

const DEFAULT_SETTINGS = {
  goal: 3000,
  cupSize: 300,
};
const STORAGE_KEY = "waterTrackerToday";
const SETTINGS_STORAGE_KEY = "waterTrackerSettings";

const waterLevel = document.getElementById("waterLevel");
const dropWrap = document.getElementById("dropWrap");
const cupsCount = document.getElementById("cupsCount");
const waterAmount = document.getElementById("waterAmount");
const statusText = document.getElementById("statusText");
const cupDots = document.getElementById("cupDots");
const addCupButton = document.getElementById("addCupButton");
const undoButton = document.getElementById("undoButton");
const viewTabs = document.querySelectorAll("[data-view]");
const viewPanels = document.querySelectorAll("[data-view-panel]");
const goalOptions = document.querySelectorAll("[data-goal]");
const cupSizeOptions = document.querySelectorAll("[data-cup-size]");
const goalValue = document.getElementById("goalValue");
const cupValue = document.getElementById("cupValue");
const resetDayButton = document.getElementById("resetDayButton");

let settings = loadSettings();
let cups = loadTodayCups();
let dropAnimationTimer = null;

tg?.ready();
tg?.expand();

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadSettings() {
  try {
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}"),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function getTotalCups() {
  return Math.ceil(settings.goal / settings.cupSize);
}

function loadTodayCups() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return saved.date === getTodayKey() ? Number(saved.cups) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveTodayCups() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      date: getTodayKey(),
      cups,
    })
  );
}

function renderDots() {
  cupDots.innerHTML = "";
  cupDots.style.setProperty("--cup-count", getTotalCups());

  for (let index = 0; index < getTotalCups(); index += 1) {
    const dot = document.createElement("span");
    dot.className = "cup-dot";
    dot.classList.toggle("active", index < cups);
    cupDots.append(dot);
  }
}

function getStatus() {
  if (cups === 0) {
    return "Начнем спокойно";
  }

  if (cups < 4) {
    return "Хороший старт";
  }

  if (cups < 8) {
    return "Темп отличный";
  }

  if (cups < getTotalCups()) {
    return "Почти добил норму";
  }

  return "Цель на день выполнена";
}

function animateDrop() {
  window.clearTimeout(dropAnimationTimer);
  dropWrap.classList.remove("pouring", "bubbling");
  void dropWrap.offsetWidth;
  dropWrap.classList.add("pouring", "bubbling");
  dropAnimationTimer = window.setTimeout(() => {
    dropWrap.classList.remove("pouring", "bubbling");
  }, 1100);
}

function setView(viewName) {
  viewPanels.forEach((panel) => {
    const isActive = panel.dataset.viewPanel === viewName;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  });

  viewTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });

  tg?.HapticFeedback?.impactOccurred("soft");
}

function renderSettings() {
  goalValue.textContent = `${settings.goal} мл`;
  cupValue.textContent = `${settings.cupSize} мл`;

  goalOptions.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.goal) === settings.goal);
  });

  cupSizeOptions.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.cupSize) === settings.cupSize);
  });

  resetDayButton.disabled = cups === 0;
}

function render() {
  const totalCups = getTotalCups();
  const amount = Math.min(cups * settings.cupSize, settings.goal);
  const progress = Math.min(100, (amount / settings.goal) * 100);
  const visualProgress = Math.pow(progress / 100, 0.74);
  const fillOffset = 328 - visualProgress * 328;

  waterLevel.style.transform = `translateY(${fillOffset}px)`;
  cupsCount.textContent = `${cups} из ${totalCups}`;
  waterAmount.textContent = `${amount} / ${settings.goal} мл`;
  statusText.textContent = getStatus();
  undoButton.disabled = cups === 0;
  addCupButton.textContent = "+";
  dropWrap.classList.toggle("complete", amount >= settings.goal);
  cupDots.classList.toggle("complete", amount >= settings.goal);
  renderDots();
  renderSettings();
}

addCupButton.addEventListener("click", () => {
  if (cups >= getTotalCups()) {
    tg?.HapticFeedback?.notificationOccurred("success");
    animateDrop();
    return;
  }

  cups += 1;
  saveTodayCups();
  render();
  animateDrop();
  tg?.HapticFeedback?.impactOccurred("light");
});

undoButton.addEventListener("click", () => {
  cups = Math.max(0, cups - 1);
  saveTodayCups();
  render();
  tg?.HapticFeedback?.impactOccurred("soft");
});

viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setView(tab.dataset.view);
  });
});

goalOptions.forEach((button) => {
  button.addEventListener("click", () => {
    settings.goal = Number(button.dataset.goal);
    cups = Math.min(cups, getTotalCups());
    saveSettings();
    saveTodayCups();
    render();
    tg?.HapticFeedback?.impactOccurred("light");
  });
});

cupSizeOptions.forEach((button) => {
  button.addEventListener("click", () => {
    settings.cupSize = Number(button.dataset.cupSize);
    cups = Math.min(cups, getTotalCups());
    saveSettings();
    saveTodayCups();
    render();
    tg?.HapticFeedback?.impactOccurred("light");
  });
});

resetDayButton.addEventListener("click", () => {
  cups = 0;
  saveTodayCups();
  render();
  tg?.HapticFeedback?.impactOccurred("soft");
});

render();
