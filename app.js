let tg = window.Telegram?.WebApp || null;
let telegramInitialized = false;

function initTelegramWebApp() {
  const webApp = window.Telegram?.WebApp;

  if (!webApp) {
    return;
  }

  tg = webApp;

  if (telegramInitialized) {
    return;
  }

  tg.ready();
  tg.expand();
  telegramInitialized = true;
}

window.initTelegramWebApp = initTelegramWebApp;

const DEFAULT_SETTINGS = {
  goal: 3000,
  cupSize: 300,
};
const MIN_STATS_MONTH = new Date(2026, 3, 1);
const STORAGE_KEY = "waterTrackerToday";
const SETTINGS_STORAGE_KEY = "waterTrackerSettings";
const HISTORY_STORAGE_KEY = "waterTrackerHistory";

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
const calendarGrid = document.getElementById("calendarGrid");
const statsMonthTitle = document.getElementById("statsMonthTitle");
const statsMonthSummary = document.getElementById("statsMonthSummary");
const selectedDayDate = document.getElementById("selectedDayDate");
const selectedDayAmount = document.getElementById("selectedDayAmount");
const selectedDayCups = document.getElementById("selectedDayCups");
const prevMonthButton = document.getElementById("prevMonthButton");
const nextMonthButton = document.getElementById("nextMonthButton");
const statsPanel = document.querySelector(".stats-panel");
const streakBadge = document.getElementById("streakBadge");
const streakCount = document.getElementById("streakCount");

let settings = loadSettings();
let history = loadHistory();
let selectedStatsDate = getTodayKey();
let viewedMonthDate = new Date();
let cups = loadTodayCups();
let dropAnimationTimer = null;

initTelegramWebApp();

if (cups > 0 && !history[getTodayKey()]) {
  saveTodayCups();
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
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

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

function getTotalCups() {
  return Math.ceil(settings.goal / settings.cupSize);
}

function loadTodayCups() {
  const today = getTodayKey();

  if (history[today]) {
    return Number(history[today].cups) || 0;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return saved.date === today ? Number(saved.cups) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveTodayCups() {
  const today = getTodayKey();

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      date: today,
      cups,
    })
  );

  history[today] = {
    cups,
    goal: settings.goal,
    cupSize: settings.cupSize,
  };
  saveHistory();
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
  document.body.dataset.view = viewName;

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

function getDayRecord(dateKey) {
  if (dateKey === getTodayKey()) {
    return {
      cups,
      goal: settings.goal,
      cupSize: settings.cupSize,
    };
  }

  return history[dateKey] || {
    cups: 0,
    goal: settings.goal,
    cupSize: settings.cupSize,
  };
}

function getDayAmount(record) {
  return Math.min((Number(record.cups) || 0) * (Number(record.cupSize) || settings.cupSize), Number(record.goal) || settings.goal);
}

function isBeforeStatsStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()) < MIN_STATS_MONTH;
}

function hasWaterOnDate(dateKey) {
  return (Number(getDayRecord(dateKey).cups) || 0) > 0;
}

function getStreakInfo() {
  let cursorDate = new Date();
  let isResting = false;

  if (!hasWaterOnDate(getTodayKey())) {
    cursorDate = addDays(cursorDate, -1);
    isResting = true;
  }

  let days = 0;

  while (!isBeforeStatsStart(cursorDate)) {
    const dateKey = formatDateKey(cursorDate);

    if (!hasWaterOnDate(dateKey)) {
      break;
    }

    days += 1;
    cursorDate = addDays(cursorDate, -1);
  }

  return {
    days,
    isResting: isResting || days === 0,
  };
}

function renderStreak() {
  const streak = getStreakInfo();

  streakCount.textContent = streak.days;
  streakBadge.classList.toggle("active", streak.days > 0 && !streak.isResting);
  streakBadge.classList.toggle("muted", streak.isResting);
  streakBadge.setAttribute("aria-label", `${streak.days} дней подряд`);
}

function formatMonthTitle(date) {
  const title = date.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function formatDayTitle(dateKey) {
  if (dateKey === getTodayKey()) {
    return "Сегодня";
  }

  return parseDateKey(dateKey).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

function renderSelectedDay() {
  const record = getDayRecord(selectedStatsDate);
  const amount = getDayAmount(record);
  const goal = Number(record.goal) || settings.goal;
  const cupSize = Number(record.cupSize) || settings.cupSize;
  const totalCups = Math.ceil(goal / cupSize);

  selectedDayDate.textContent = formatDayTitle(selectedStatsDate);
  selectedDayAmount.textContent = `${amount} / ${goal} мл`;
  selectedDayCups.textContent = `${Number(record.cups) || 0} из ${totalCups} кружек`;
}

function renderStats() {
  const today = new Date();
  const year = viewedMonthDate.getFullYear();
  const month = viewedMonthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  let completeDays = 0;

  statsMonthTitle.textContent = formatMonthTitle(viewedMonthDate);
  prevMonthButton.disabled =
    viewedMonthDate.getFullYear() === MIN_STATS_MONTH.getFullYear() &&
    viewedMonthDate.getMonth() === MIN_STATS_MONTH.getMonth();
  calendarGrid.innerHTML = "";

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    const emptyCell = document.createElement("span");
    emptyCell.className = "calendar-empty";
    calendarGrid.append(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const record = getDayRecord(dateKey);
    const amount = getDayAmount(record);
    const goal = Number(record.goal) || settings.goal;
    const progress = goal ? Math.min(1, amount / goal) : 0;
    const isComplete = progress >= 1;

    if (isComplete) {
      completeDays += 1;
    }

    const button = document.createElement("button");
    button.className = "calendar-day";
    button.type = "button";
    button.dataset.date = dateKey;
    button.classList.toggle("today", dateKey === getTodayKey());
    button.classList.toggle("selected", dateKey === selectedStatsDate);
    button.classList.toggle("complete", isComplete);
    button.style.setProperty("--day-fill", `${Math.round(progress * 100)}%`);
    button.innerHTML = `
      <span class="calendar-drop"></span>
      <span class="calendar-number">${day}</span>
    `;
    button.addEventListener("click", () => {
      selectedStatsDate = dateKey;
      renderStats();
      tg?.HapticFeedback?.impactOccurred("soft");
    });

    calendarGrid.append(button);
  }

  statsMonthSummary.textContent = `${completeDays} дней в норме`;
  renderSelectedDay();
}

function turnMonth(direction) {
  const nextMonth = new Date(
    viewedMonthDate.getFullYear(),
    viewedMonthDate.getMonth() + direction,
    1
  );

  if (nextMonth < MIN_STATS_MONTH) {
    return;
  }

  viewedMonthDate = nextMonth;

  selectedStatsDate = formatDateKey(new Date(viewedMonthDate.getFullYear(), viewedMonthDate.getMonth(), 1));
  renderStats();

  statsPanel.classList.remove("turn-next", "turn-prev");
  void statsPanel.offsetWidth;
  statsPanel.classList.add(direction > 0 ? "turn-next" : "turn-prev");

  tg?.HapticFeedback?.impactOccurred("soft");
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
  statusText.textContent = `${cups} из ${totalCups} кружек`;
  undoButton.disabled = cups === 0;
  undoButton.setAttribute("aria-label", `Убрать ${settings.cupSize} мл`);
  addCupButton.innerHTML =
    amount >= settings.goal
      ? "<strong>Готово</strong><span>Норма выполнена</span>"
      : `<strong>+${settings.cupSize} мл</strong><span>Добавить кружку</span>`;
  dropWrap.classList.toggle("complete", amount >= settings.goal);
  cupDots.classList.toggle("complete", amount >= settings.goal);
  renderDots();
  renderSettings();
  renderStats();
  renderStreak();
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

prevMonthButton.addEventListener("click", () => {
  turnMonth(-1);
});

nextMonthButton.addEventListener("click", () => {
  turnMonth(1);
});

render();
