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
const ACHIEVEMENTS_STORAGE_KEY = "waterTrackerAchievements";

const waterLevel = document.getElementById("waterLevel");
const dropWrap = document.getElementById("dropWrap");
const cupsCount = document.getElementById("cupsCount");
const progressCopy = document.querySelector(".progress-copy");
const waterAmount = document.getElementById("waterAmount");
const statusText = document.getElementById("statusText");
const progressFill = document.getElementById("progressFill");
const cupDots = document.getElementById("cupDots");
const addCupButton = document.getElementById("addCupButton");
const undoButton = document.getElementById("undoButton");
const viewTabs = document.querySelectorAll("[data-view]");
const viewPanels = document.querySelectorAll("[data-view-panel]");
const goalOptions = document.querySelectorAll("[data-goal]");
const cupSizeOptions = document.querySelectorAll("[data-cup-size]");
const goalValue = document.getElementById("goalValue");
const cupValue = document.getElementById("cupValue");
const customGoalInput = document.getElementById("customGoalInput");
const customGoalButton = document.getElementById("customGoalButton");
const customCupInput = document.getElementById("customCupInput");
const customCupButton = document.getElementById("customCupButton");
const resetDayButton = document.getElementById("resetDayButton");
const calendarGrid = document.getElementById("calendarGrid");
const statsMonthTitle = document.getElementById("statsMonthTitle");
const statsMonthSummary = document.getElementById("statsMonthSummary");
const monthTotalValue = document.getElementById("monthTotalValue");
const selectedDayDate = document.getElementById("selectedDayDate");
const selectedDayAmount = document.getElementById("selectedDayAmount");
const selectedDayCups = document.getElementById("selectedDayCups");
const drinkLog = document.getElementById("drinkLog");
const todayLogSummary = document.getElementById("todayLogSummary");
const todayLogList = document.getElementById("todayLogList");
const prevMonthButton = document.getElementById("prevMonthButton");
const nextMonthButton = document.getElementById("nextMonthButton");
const statsPanel = document.querySelector(".stats-panel");
const streakBadge = document.getElementById("streakBadge");
const streakCount = document.getElementById("streakCount");
const achievementsSummary = document.getElementById("achievementsSummary");
const achievementsGrid = document.getElementById("achievementsGrid");
const achievementToast = document.getElementById("achievementToast");
const achievementToastTitle = document.getElementById("achievementToastTitle");

let settings = loadSettings();
let history = loadHistory();
let selectedStatsDate = getTodayKey();
let viewedMonthDate = new Date();
let cups = loadTodayCups();
let dropAnimationTimer = null;
let knownAchievementIds = loadKnownAchievementIds();
let achievementTrackingReady = false;
let achievementToastQueue = [];
let achievementToastTimer = null;

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

function loadKnownAchievementIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveKnownAchievementIds() {
  localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(knownAchievementIds));
}

function getTotalCups() {
  return Math.ceil(settings.goal / settings.cupSize);
}

function formatLiters(value) {
  const liters = value / 1000;
  const decimals = Number.isInteger(liters) ? 0 : Number.isInteger(liters * 10) ? 1 : 2;
  return `${liters.toFixed(decimals).replace(".", ",")} л`;
}

function formatGoalInput(value) {
  const liters = value / 1000;
  const decimals = Number.isInteger(liters) ? 0 : Number.isInteger(liters * 10) ? 1 : 2;
  return liters.toFixed(decimals).replace(".", ",");
}

function parseNumber(value) {
  const normalized = String(value).replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
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

function getTodayRecord() {
  const today = getTodayKey();
  const currentRecord = history[today] || {};
  const entries = Array.isArray(currentRecord.entries) ? currentRecord.entries : [];

  return {
    cups,
    goal: settings.goal,
    cupSize: settings.cupSize,
    entries,
  };
}

function saveTodayCups(entries = getTodayRecord().entries) {
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
    entries,
  };
  saveHistory();
}

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addDrinkEntry(amount) {
  const record = getTodayRecord();
  const entries = [
    ...record.entries,
    {
      time: getCurrentTimeLabel(),
      amount,
    },
  ];

  saveTodayCups(entries);
}

function removeLastDrinkEntry() {
  const record = getTodayRecord();
  const entries = record.entries.slice(0, Math.max(0, record.entries.length - 1));

  saveTodayCups(entries);
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
  goalValue.textContent = formatLiters(settings.goal);
  cupValue.textContent = `${settings.cupSize} мл`;
  customGoalInput.value = formatGoalInput(settings.goal);
  customCupInput.value = settings.cupSize;
  customGoalInput.classList.remove("invalid");
  customCupInput.classList.remove("invalid");

  goalOptions.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.goal) === settings.goal);
  });

  cupSizeOptions.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.cupSize) === settings.cupSize);
  });

  resetDayButton.disabled = cups === 0;
}

function applyCustomGoal() {
  const liters = parseNumber(customGoalInput.value);
  const nextGoal = liters ? Math.round(liters * 1000) : 0;

  if (nextGoal < 500 || nextGoal > 8000) {
    customGoalInput.classList.add("invalid");
    return;
  }

  settings.goal = nextGoal;
  cups = Math.min(cups, getTotalCups());
  saveSettings();
  saveTodayCups();
  render();
  tg?.HapticFeedback?.impactOccurred("light");
}

function applyCustomCupSize() {
  const nextCupSize = Math.round(parseNumber(customCupInput.value) || 0);

  if (nextCupSize < 50 || nextCupSize > 2000) {
    customCupInput.classList.add("invalid");
    return;
  }

  settings.cupSize = nextCupSize;
  cups = Math.min(cups, getTotalCups());
  saveSettings();
  saveTodayCups();
  render();
  tg?.HapticFeedback?.impactOccurred("light");
}

function getDayRecord(dateKey) {
  if (dateKey === getTodayKey()) {
    return getTodayRecord();
  }

  return history[dateKey] || {
    cups: 0,
    goal: settings.goal,
    cupSize: settings.cupSize,
    entries: [],
  };
}

function getDayAmount(record) {
  return Math.min((Number(record.cups) || 0) * (Number(record.cupSize) || settings.cupSize), Number(record.goal) || settings.goal);
}

function formatAmount(value) {
  const rounded = Math.round(value);

  if (rounded >= 1000) {
    const liters = rounded / 1000;
    const decimals = Number.isInteger(liters) ? 0 : Number.isInteger(liters * 10) ? 1 : 2;
    return `${liters.toFixed(decimals).replace(".", ",")} л`;
  }

  return `${rounded} мл`;
}

function formatCupWord(value) {
  const absoluteValue = Math.abs(value) % 100;
  const lastDigit = absoluteValue % 10;

  if (absoluteValue > 10 && absoluteValue < 20) {
    return "кружек";
  }

  if (lastDigit === 1) {
    return "кружка";
  }

  if (lastDigit > 1 && lastDigit < 5) {
    return "кружки";
  }

  return "кружек";
}

function getAllRecords() {
  return {
    ...history,
    [getTodayKey()]: getTodayRecord(),
  };
}

function getRecordAmount(record) {
  return (Number(record.cups) || 0) * (Number(record.cupSize) || settings.cupSize);
}

function getAchievementProgress(value, target) {
  return Math.min(100, Math.round((Math.min(value, target) / target) * 100));
}

function showNextAchievementToast() {
  if (!achievementToastQueue.length) {
    return;
  }

  const title = achievementToastQueue.shift();

  window.clearTimeout(achievementToastTimer);
  achievementToastTitle.textContent = title;
  achievementToast.setAttribute("aria-hidden", "false");
  achievementToast.classList.remove("show");
  void achievementToast.offsetWidth;
  achievementToast.classList.add("show");

  achievementToastTimer = window.setTimeout(() => {
    achievementToast.classList.remove("show");
    achievementToast.setAttribute("aria-hidden", "true");

    if (achievementToastQueue.length) {
      achievementToastTimer = window.setTimeout(showNextAchievementToast, 260);
    }
  }, 2600);
}

function queueAchievementToast(title) {
  achievementToastQueue.push(title);

  if (!achievementToast.classList.contains("show")) {
    showNextAchievementToast();
  }
}

function isEarlyEntry(entry) {
  const hour = Number(String(entry.time || "").split(":")[0]);
  return Number.isFinite(hour) && hour < 10;
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
  const entries = Array.isArray(record.entries) ? record.entries : [];

  selectedDayDate.textContent = formatDayTitle(selectedStatsDate);
  selectedDayAmount.textContent = `${amount} / ${goal} мл`;
  selectedDayCups.textContent = `${Number(record.cups) || 0} из ${totalCups} кружек`;
  drinkLog.innerHTML = entries.length
    ? entries
        .slice()
        .reverse()
        .map((entry) => `
          <div class="drink-log-item">
            <span class="drink-log-time">${entry.time}</span>
            <span class="drink-log-amount">+${entry.amount} мл</span>
          </div>
        `)
        .join("")
    : '<div class="drink-log-empty">Пока нет записей за день</div>';
}

function renderTodayLog() {
  const record = getTodayRecord();
  const entries = Array.isArray(record.entries) ? record.entries : [];
  const totalCups = getTotalCups();

  todayLogSummary.textContent = entries.length
    ? `${cups} из ${totalCups} ${formatCupWord(totalCups)}`
    : "Пока пусто";

  todayLogList.innerHTML = entries.length
    ? entries
        .slice(-3)
        .reverse()
        .map((entry) => `
          <div class="today-log-pill">
            <span>${entry.time}</span>
            <strong>+${entry.amount} мл</strong>
          </div>
        `)
        .join("")
    : '<div class="today-log-empty">Нажми +, когда выпьешь воду</div>';
}

function getAchievements() {
  const records = Object.values(getAllRecords());
  const streak = getStreakInfo().days;
  const totalCups = records.reduce((sum, record) => sum + (Number(record.cups) || 0), 0);
  const totalAmount = records.reduce((sum, record) => sum + getRecordAmount(record), 0);
  const completedDays = records.filter((record) => {
    const goal = Number(record.goal) || settings.goal;
    return getDayAmount(record) >= goal;
  }).length;
  const bestCups = records.reduce((best, record) => Math.max(best, Number(record.cups) || 0), 0);
  const hasEarlyDrink = records.some((record) => {
    const entries = Array.isArray(record.entries) ? record.entries : [];
    return entries.some(isEarlyEntry);
  });

  return [
    {
      id: "first-drop",
      title: "Первая капля",
      description: "Выпей первую кружку воды",
      rarity: "обычное",
      rarityTone: "common",
      icon: "drop",
      value: totalCups,
      target: 1,
      label: `${Math.min(totalCups, 1)} / 1`,
    },
    {
      id: "day-complete",
      title: "День закрыт",
      description: "Выполни норму дня",
      rarity: "обычное",
      rarityTone: "common",
      icon: "check",
      value: completedDays,
      target: 1,
      label: `${Math.min(completedDays, 1)} / 1`,
    },
    {
      id: "clean-rhythm",
      title: "Чистый ритм",
      description: "Пей воду 3 дня подряд",
      rarity: "редкое",
      rarityTone: "rare",
      icon: "wave",
      value: streak,
      target: 3,
      label: `${Math.min(streak, 3)} / 3 дня`,
    },
    {
      id: "hydro-week",
      title: "Неделя Hydro",
      description: "Держи серию 7 дней",
      rarity: "эпическое",
      rarityTone: "epic",
      icon: "calendar",
      value: streak,
      target: 7,
      label: `${Math.min(streak, 7)} / 7 дней`,
    },
    {
      id: "ten-liters",
      title: "10 литров",
      description: "Выпей 10 литров всего",
      rarity: "редкое",
      rarityTone: "rare",
      icon: "liter",
      value: totalAmount,
      target: 10000,
      label: `${formatAmount(Math.min(totalAmount, 10000))} / 10 л`,
    },
    {
      id: "thirty-liters",
      title: "30 литров",
      description: "Выпей 30 литров всего",
      rarity: "эпическое",
      rarityTone: "epic",
      icon: "ocean",
      value: totalAmount,
      target: 30000,
      label: `${formatAmount(Math.min(totalAmount, 30000))} / 30 л`,
    },
    {
      id: "early-sip",
      title: "Ранний глоток",
      description: "Добавь воду до 10:00",
      rarity: "обычное",
      rarityTone: "common",
      icon: "sun",
      value: hasEarlyDrink ? 1 : 0,
      target: 1,
      label: hasEarlyDrink ? "получено" : "0 / 1",
    },
    {
      id: "full-drop",
      title: "Полная капля",
      description: "Выпей 10 кружек за день",
      rarity: "редкое",
      rarityTone: "rare",
      icon: "full",
      value: bestCups,
      target: 10,
      label: `${Math.min(bestCups, 10)} / 10 кружек`,
    },
  ];
}

function syncAchievementUnlocks(achievements) {
  const currentUnlockedIds = achievements
    .filter((achievement) => achievement.value >= achievement.target)
    .map((achievement) => achievement.id);

  if (!achievementTrackingReady) {
    knownAchievementIds = Array.from(new Set([...knownAchievementIds, ...currentUnlockedIds]));
    saveKnownAchievementIds();
    achievementTrackingReady = true;
    return;
  }

  const newUnlockedIds = currentUnlockedIds.filter((id) => !knownAchievementIds.includes(id));

  if (!newUnlockedIds.length) {
    return;
  }

  knownAchievementIds = Array.from(new Set([...knownAchievementIds, ...newUnlockedIds]));
  saveKnownAchievementIds();

  newUnlockedIds.forEach((id) => {
    const achievement = achievements.find((item) => item.id === id);

    if (achievement) {
      queueAchievementToast(achievement.title);
    }
  });

  tg?.HapticFeedback?.notificationOccurred("success");
}

function isAchievementUnlocked(achievement) {
  return achievement.value >= achievement.target || knownAchievementIds.includes(achievement.id);
}

function renderAchievements() {
  const achievements = getAchievements();
  syncAchievementUnlocks(achievements);

  const unlockedCount = achievements.filter(isAchievementUnlocked).length;

  achievementsSummary.textContent = `${unlockedCount} из ${achievements.length}`;
  achievementsGrid.innerHTML = achievements
    .map((achievement) => {
      const unlocked = isAchievementUnlocked(achievement);
      const progress = unlocked ? 100 : getAchievementProgress(achievement.value, achievement.target);

      return `
        <article class="achievement-card ${unlocked ? "unlocked" : "locked"} ${achievement.rarityTone}">
          <div class="achievement-top">
            <span class="achievement-icon achievement-icon-${achievement.icon}" aria-hidden="true"></span>
          </div>
          <strong>${achievement.title}</strong>
          <p>${achievement.description}</p>
          <div class="achievement-progress">
            <span style="width: ${progress}%"></span>
          </div>
          <small>${achievement.label}</small>
        </article>
      `;
    })
    .join("");
}

function renderStats() {
  const today = new Date();
  const year = viewedMonthDate.getFullYear();
  const month = viewedMonthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  let completeDays = 0;
  let totalAmount = 0;

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

    if (amount > 0) {
      totalAmount += amount;
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
  monthTotalValue.textContent = formatAmount(totalAmount);
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
  progressFill.style.width = `${progress}%`;
  progressCopy.classList.toggle("complete", amount >= settings.goal);
  statusText.hidden = amount < settings.goal;
  statusText.textContent = amount >= settings.goal ? "Цель выполнена" : "";
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
  renderTodayLog();
  renderAchievements();
}

function addCup() {
  if (cups >= getTotalCups()) {
    tg?.HapticFeedback?.notificationOccurred("success");
    animateDrop();
    return;
  }

  cups += 1;
  addDrinkEntry(settings.cupSize);
  render();
  animateDrop();
  tg?.HapticFeedback?.impactOccurred("light");
}

addCupButton.addEventListener("click", addCup);

dropWrap.addEventListener("click", addCup);

dropWrap.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    addCup();
  }
});

undoButton.addEventListener("click", () => {
  cups = Math.max(0, cups - 1);
  removeLastDrinkEntry();
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

customGoalButton.addEventListener("click", applyCustomGoal);

customGoalInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    customGoalInput.blur();
    applyCustomGoal();
  }
});

customGoalInput.addEventListener("input", () => {
  customGoalInput.classList.remove("invalid");
});

customCupButton.addEventListener("click", applyCustomCupSize);

customCupInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    customCupInput.blur();
    applyCustomCupSize();
  }
});

customCupInput.addEventListener("input", () => {
  customCupInput.classList.remove("invalid");
});

resetDayButton.addEventListener("click", () => {
  cups = 0;
  saveTodayCups([]);
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
