const STORAGE_KEY = "jcal-tasks-v1";
const STUDY_KEY = "jcal-study-progress-v1";
const DAILY_NOTES_KEY = "riyouhuixiang-daily-notes-v1";
const CUSTOM_STUDY_KEY = "somewhen-custom-study-v1";
const STUDY_PROJECTS_KEY = "somewhen-study-projects-v1";
const CALENDAR_RESET_KEY = "riyouhuixiang-calendar-reset-v1";
const FOCUS_RESET_KEY = "riyouhuixiang-focus-reset-v1";
const SYNC_CONFIG_KEY = "riyouhuixiang-cloud-sync-config-v1";
const SYNC_META_KEY = "riyouhuixiang-cloud-sync-meta-v1";
const DEFAULT_SYNC_URL = "https://vcdlbbauscvnslyxivry.supabase.co";
const DEFAULT_SYNC_KEY = "sb_publishable_KVwaFH59AEJrhGQulC_bQA_VDJp5xoc";
const BUSS_REVIEW_SESSION_COUNT = 13;
const BUSS_REVIEW_TOTAL_HOURS = 20;
let suppressPersistenceHooks = false;
let cloudPushTimer = 0;
let cloudClient = null;
let syncConfig = loadCloudSyncConfig();
const today = startOfDay(new Date());
const nextSunday = getNextSunday(today);

const labels = {
  study: "学习",
  revision: "复习周",
  exam: "考试",
  assignment: "作业",
  matter: "事项"
};

const roasts = [
  "今天不用被安排，只要把要紧事放到看得见的地方。",
  "可以慢慢挑，日历负责接住你的选择。",
  "事情很多，但它们现在有位置了。",
  "完成了也别删，完成的事情也是生活战绩。",
  "今天已经很努力了，不用把自己逼成倒计时牌。"
];

suppressPersistenceHooks = true;
const seedTasks = buildSeedTasks();
const studyProjects = loadStudyProjects();
saveStudyProjects();

if (!localStorage.getItem(FOCUS_RESET_KEY)) {
  studyProjects.forEach((project) => {
    project.planDays = [];
  });
  saveStudyProjects();
  localStorage.setItem(FOCUS_RESET_KEY, "true");
}

if (!localStorage.getItem(CALENDAR_RESET_KEY)) {
  localStorage.setItem(STORAGE_KEY, "[]");
  localStorage.setItem(CALENDAR_RESET_KEY, "true");
}

let tasks = loadTasks();
tasks = ensureFinalTasks(tasks);
saveTasks();
let studyProgress = loadStudyProgress();
reconcileCalendarBackedProgress();
saveStudyProgress();
let dailyNotes = loadDailyNotes();
suppressPersistenceHooks = false;
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = toISO(today);
let filter = "all";
let collapsedCourses = new Set(JSON.parse(localStorage.getItem("somewhen-collapsed-courses-v1") || "[]"));

const grid = document.querySelector("#calendar-grid");
const calendarPanel = document.querySelector(".calendar-panel");
const monthLabel = document.querySelector("#month-label");
const selectedDateLabel = document.querySelector("#selected-date");
const selectedRoast = document.querySelector("#selected-roast");
const dailyNoteInput = document.querySelector("#daily-note-input");
const dailyNoteStatus = document.querySelector("#daily-note-status");
const carryNoteButton = document.querySelector("#carry-note");
const selectedList = document.querySelector("#selected-list");
const todayList = document.querySelector("#today-list");
const dailyTarget = document.querySelector("#daily-target");
const weeklyHours = document.querySelector("#weekly-hours");
const template = document.querySelector("#task-template");
const form = document.querySelector("#task-form");
const courseRings = document.querySelector("#course-rings");
const studyPool = document.querySelector("#study-pool");
const printLayout = document.querySelector("#print-layout");
const dayModal = document.querySelector("#day-modal");
const dayModalTitle = document.querySelector("#day-modal-title");
const dayModalList = document.querySelector("#day-modal-list");
const daySafeLine = document.querySelector("#day-safe-line");
const dayQuickForm = document.querySelector("#day-quick-form");
const celebration = document.querySelector("#celebration");
const appMenu = document.querySelector("#app-menu");
const menuOutput = document.querySelector("#menu-output");
const backupFileInput = document.querySelector("#backup-file");
const syncFileInput = backupFileInput;
const courseEditor = document.querySelector("#course-editor");
const courseEditorBody = document.querySelector("#course-editor-body");
const focusCardKicker = document.querySelector("#focus-card-kicker");
const heroFocus = document.querySelector("#hero-focus");
const heroFocusCopy = document.querySelector("#hero-focus-copy");
const focusPie = document.querySelector("#focus-pie");
const focusPieLabel = document.querySelector("#focus-pie-label");
const focusSelectedHours = document.querySelector("#focus-selected-hours");
const focusDoneHours = document.querySelector("#focus-done-hours");
const pressureList = document.querySelector("#pressure-list");
let activeCourseId = "";
let calendarAutoScrollFrame = 0;
let calendarAutoScrollSpeed = 0;

document.querySelector("#date-input").value = selectedDate;
document.querySelector("#due-input").value = "";
dailyTarget.textContent = formatDuration(overallDailySafety(toISO(today)));

document.querySelector("#app-menu-button").addEventListener("click", () => {
  openAppMenu("monthly");
});

document.querySelectorAll(".app-nav button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".app-nav button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    openAppMenu(button.dataset.view);
  });
});

document.querySelector("#close-app-menu").addEventListener("click", closeAppMenu);

document.querySelector("#close-course-editor").addEventListener("click", closeCourseEditor);

dailyNoteInput.addEventListener("input", () => {
  dailyNotes[selectedDate] = dailyNoteInput.value.trim();
  saveDailyNotes();
  dailyNoteStatus.textContent = dailyNoteInput.value.trim() ? "已保存" : "自动保存";
});

carryNoteButton.addEventListener("click", createTomorrowReminderFromNote);

document.querySelector("#collapse-left").addEventListener("click", () => {
  document.body.classList.add("left-collapsed");
});

document.querySelector("#collapse-right").addEventListener("click", () => {
  document.body.classList.add("right-collapsed");
});

document.querySelector("#expand-left").addEventListener("click", () => {
  document.body.classList.remove("left-collapsed");
});

document.querySelector("#expand-right").addEventListener("click", () => {
  document.body.classList.remove("right-collapsed");
});

document.querySelector("#prev-month").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  render();
});

document.querySelector("#next-month").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  render();
});

document.querySelector("#today-button").addEventListener("click", () => {
  visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedDate = toISO(today);
  render();
});

document.querySelector("#print-plan").addEventListener("click", () => {
  renderPrintLayout();
  window.print();
});

document.querySelector("#reset-study").addEventListener("click", () => {
  studyProgress = {};
  saveStudyProgress();
  render();
});

document.querySelector("#close-day-modal").addEventListener("click", closeDayModal);

dayModal.addEventListener("click", (event) => {
  if (event.target === dayModal) closeDayModal();
});

dayQuickForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#day-quick-title");
  const parsed = parseQuickTitle(input.value.trim());
  tasks.push({
    id: crypto.randomUUID(),
    title: parsed.title,
    date: selectedDate,
    due: "",
    type: parsed.type,
    note: "从当天面板添加",
    done: false,
    startTime: parsed.startTime,
    endTime: parsed.endTime
  });
  input.value = "";
  saveTasks();
  render();
  openDayModal(selectedDate);
});

document.querySelector(".detail-panel").addEventListener("dragover", (event) => {
  event.preventDefault();
});

document.querySelector(".detail-panel").addEventListener("drop", (event) => {
  event.preventDefault();
  const payload = readDragPayload(event);
  if (payload?.kind === "calendar-task") {
    removeCalendarTask(payload.taskId);
    saveTasks();
    render();
  }
});

document.addEventListener("dragover", updateCalendarAutoScroll);
document.addEventListener("drop", stopCalendarAutoScroll);
document.addEventListener("dragend", stopCalendarAutoScroll);

document.querySelector("#clear-done").addEventListener("click", () => {
  filter = filter === "open" ? "all" : "open";
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === filter);
  });
  document.querySelector("#clear-done").textContent = filter === "open" ? "看回全部" : "只看未完成";
  render();
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    filter = chip.dataset.filter;
    document.querySelectorAll(".chip").forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    document.querySelector("#clear-done").textContent = filter === "open" ? "看回全部" : "只看未完成";
    render();
  });
});

document.querySelectorAll(".menu-grid button").forEach((button) => {
  button.addEventListener("click", () => openAppMenu(button.dataset.view));
});

backupFileInput.addEventListener("change", importDataBackup);

initCloudSync();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const task = {
    id: crypto.randomUUID(),
    title: data.get("title").trim(),
    date: data.get("date"),
    due: data.get("due"),
    type: data.get("type"),
    note: data.get("note").trim(),
    done: false
  };
  tasks.push(task);
  selectedDate = task.date;
  visibleMonth = new Date(`${task.date}T00:00:00`);
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  saveTasks();
  form.reset();
  document.querySelector("#date-input").value = selectedDate;
  render();
});

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return seedTasks;
  try {
    return JSON.parse(saved).map(normalizeTask);
  } catch {
    return seedTasks;
  }
}

function normalizeTask(task) {
  const mergedMatter = ["life", "appointment", "work", "social", "admin"];
  const normalized = {
    ...task,
    type: mergedMatter.includes(task.type) ? "matter" : task.type
  };
  if (isStudyCalendarTask(normalized)) normalized.due = "";
  return normalized;
}

function loadStudyProgress() {
  const saved = localStorage.getItem(STUDY_KEY);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function loadDailyNotes() {
  const saved = localStorage.getItem(DAILY_NOTES_KEY);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function loadStudyProjects() {
  const saved = localStorage.getItem(STUDY_PROJECTS_KEY);
  if (saved) {
    try {
      return normalizeStudyProjects(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STUDY_PROJECTS_KEY);
    }
  }
  return normalizeStudyProjects(applyCustomStudyItems(buildStudyProjects()));
}

function normalizeStudyProjects(projects) {
  projects.forEach((project) => {
    if (!Array.isArray(project.planDays)) project.planDays = [];
  });
  const qbus = projects.find((project) => project.id === "qbus5001");
  if (qbus) syncQbusReviewSlides(qbus);
  const buss = projects.find((project) => project.id === "buss6002");
  if (buss) {
    syncBussReviewSessions(buss);
    const dayModule = buss.modules.find((module) => module.name.includes("时间打卡表"));
    if (dayModule && dayModule.items.length !== 12) {
      dayModule.items = Array.from({ length: 12 }, (_, index) => item(`b6-day-${index + 1}`, `D${index + 1}`, 0));
    }
  }
  return projects;
}

function syncQbusReviewSlides(project) {
  let module = project.modules.find((item) => item.name === "课件复习");
  if (!module) {
    module = { name: "课件复习", items: [] };
    project.modules.splice(1, 0, module);
  }
  if (!module.items.some((studyItem) => studyItem.id === "q5-review-slides")) {
    module.items.push(item("q5-review-slides", "复习课件", 3));
  }
}

function syncBussReviewSessions(project) {
  let reviewModule = project.modules.find((module) => module.name.toLowerCase().includes("review session"));
  if (!reviewModule) {
    reviewModule = project.modules.find((module) => module.items.some((studyItem) => /^b6-review-\d+$/.test(studyItem.id)));
  }
  if (!reviewModule) {
    reviewModule = { name: "", items: [] };
    project.modules.unshift(reviewModule);
  }

  reviewModule.name = `Review session x ${BUSS_REVIEW_SESSION_COUNT}`;
  reviewModule.items = Array.from({ length: BUSS_REVIEW_SESSION_COUNT }, (_, index) => {
    const id = `b6-review-${index + 1}`;
    const existing = reviewModule.items.find((studyItem) => studyItem.id === id);
    return {
      ...(existing || {}),
      id,
      title: `W${index + 1} Review session`,
      hours: BUSS_REVIEW_TOTAL_HOURS / BUSS_REVIEW_SESSION_COUNT
    };
  });
}

function saveStudyProjects() {
  localStorage.setItem(STUDY_PROJECTS_KEY, JSON.stringify(studyProjects));
  markLocalUpdated();
}

function applyCustomStudyItems(projects) {
  const saved = localStorage.getItem(CUSTOM_STUDY_KEY);
  if (!saved) return projects;
  let customItems = [];
  try {
    customItems = JSON.parse(saved);
  } catch {
    return projects;
  }
  customItems.forEach((entry) => {
    const project = projects.find((item) => item.id === entry.projectId);
    if (!project) return;
    const module = project.modules.find((item) => item.name === entry.moduleName) || project.modules[0];
    if (!module.items.some((item) => item.id === entry.item.id)) {
      module.items.push(entry.item);
    }
  });
  return projects;
}

function saveCustomStudyItem(projectId, moduleName, customItem) {
  const saved = localStorage.getItem(CUSTOM_STUDY_KEY);
  let customItems = [];
  try {
    customItems = saved ? JSON.parse(saved) : [];
  } catch {
    customItems = [];
  }
  customItems.push({ projectId, moduleName, item: customItem });
  localStorage.setItem(CUSTOM_STUDY_KEY, JSON.stringify(customItems));
  markLocalUpdated();
}

function saveAllCustomStudy() {
  const entries = [];
  studyProjects.forEach((project) => {
    project.modules.forEach((module) => {
      module.items.forEach((studyItem) => {
        if (studyItem.custom) {
          entries.push({ projectId: project.id, moduleName: module.name, item: studyItem });
        }
      });
    });
  });
  localStorage.setItem(CUSTOM_STUDY_KEY, JSON.stringify(entries));
  markLocalUpdated();
}

function buildSeedTasks() {
  return [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  markLocalUpdated();
}

function saveStudyProgress() {
  localStorage.setItem(STUDY_KEY, JSON.stringify(studyProgress));
  markLocalUpdated();
}

function saveDailyNotes() {
  localStorage.setItem(DAILY_NOTES_KEY, JSON.stringify(dailyNotes));
  markLocalUpdated();
}

function ensureFinalTasks(items) {
  const generatedPattern = /^(QBUS5001|BUSS6002) (期末复习周|D\d|Day|Sample Exam)/;
  items = items.filter((item) => !generatedPattern.test(item.title));
  const exams = [
    {
      title: "QBUS5001 Final",
      date: "2026-06-12",
      due: "2026-06-12",
      type: "exam",
      note: "考试日。红色硬事件，默认保留。",
      done: false
    },
    {
      title: "BUSS6002 Final",
      date: "2026-06-17",
      due: "2026-06-17",
      type: "exam",
      note: "考试日。红色硬事件，默认保留。",
      done: false
    }
  ];
  exams.forEach((exam) => {
    const existing = items.find((item) => item.title === exam.title);
    if (existing) Object.assign(existing, exam);
    else items.push({ id: crypto.randomUUID(), ...exam });
  });
  return items;
}

function buildStudyProjects() {
  return [
    {
      id: "qbus5001",
      name: "QBUS5001",
      color: "#d96f67",
      examDate: "2026-06-12",
      dailyGoal: 5.5,
      planCount: 7,
      planDays: [],
      modules: [
        {
          name: "领航课",
          items: [
            item("q5-nav-06", "期中06 - One population estimation (Week 6)", 1, { long: true }),
            item("q5-nav-07", "期中07 - Two population estimation (Week 9)", 1, { long: true }),
            item("q5-nav-08", "期中08 - Special topics in estimation (Week 6)", 0.63, { long: true }),
            item("q5-final-01", "期末01 - Framework", 0.33),
            item("q5-final-02", "期末02 - Review of midterm (Week 5 & 6)", 0.65, { long: true }),
            item("q5-final-03", "期末03 - Hypothesis testing (W8 & W9)", 3.28, { long: true }),
            item("q5-final-04", "期末04 - ANOVA basics (W10-12)", 0.35, { long: true }),
            item("q5-final-05", "05 - ANOVA analysis optional", 1.72, { long: true }),
            item("q5-final-06", "06 - Other hypothesis testing types (W9)", 0.18, { long: true }),
            item("q5-final-07", "07 - Correlation analysis (W10-12)", 0.67, { long: true }),
            item("q5-final-08", "08 - Simple regression & hypothesis testing", 2.88, { long: true }),
            item("q5-final-09", "09 - Multiple regression", 2.92, { long: true }),
            item("q5-final-10", "10 - Assumptions in regression", 1.23, { long: true }),
            item("q5-final-11", "11 - Special regression types", 0.43, { long: true })
          ]
        },
        {
          name: "课件复习",
          items: [
            item("q5-review-slides", "复习课件", 3)
          ]
        },
        {
          name: "Sample exam 两天",
          items: [
            item("q5-paper-day-1", "D6 - sample exam day 1：写试卷 + 改试卷", 5.5, { long: true }),
            item("q5-paper-day-2", "D7 - sample exam day 2：写试卷 + 改试卷", 5.5, { long: true })
          ]
        }
      ]
    },
    {
      id: "buss6002",
      name: "BUSS6002",
      color: "#86b998",
      examDate: "2026-06-17",
      dailyGoal: 5.4,
      planCount: 12,
      planDays: [],
      modules: [
        {
          name: `Review session x ${BUSS_REVIEW_SESSION_COUNT}`,
          items: Array.from(
            { length: BUSS_REVIEW_SESSION_COUNT },
            (_, index) => item(`b6-review-${index + 1}`, `W${index + 1} Review session`, BUSS_REVIEW_TOTAL_HOURS / BUSS_REVIEW_SESSION_COUNT)
          )
        },
        {
          name: "Sample exam",
          items: Array.from({ length: 6 }, (_, index) => item(`b6-paper-${index + 1}`, `Paper ${index + 1}`, 3))
        },
        {
          name: "Cheatsheet",
          items: [
            item("b6-cheat-1", "Cheatsheet 初稿", 2),
            item("b6-cheat-2", "Cheatsheet 压缩整理", 2),
            item("b6-cheat-3", "Cheatsheet 最终检查", 1)
          ]
        },
        {
          name: "HD同步课",
          items: [
            item("b6-hd-mid-1", "期中1", 2),
            item("b6-hd-mid-2", "期中2", 2.07),
            ...Array.from({ length: 11 }, (_, index) => item(`b6-hd-${index + 1}`, `同步课 ${index + 1}`, 1.5)),
            item("b6-hd-final", "期末课", 1.5)
          ]
        },
        {
          name: "领航课",
          items: [item("b6-nav-final", "期末领航课", 8)]
        },
        {
          name: "时间打卡表",
          items: Array.from({ length: 12 }, (_, index) => item(`b6-day-${index + 1}`, `D${index + 1}`, 0))
        }
      ]
    }
  ];
}

function item(id, title, hours, options = {}) {
  return { id, title, hours, ...options };
}

function plan(date, label, focus) {
  return { date, label, focus };
}

function toISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function getNextSunday(date) {
  const offset = (7 - date.getDay()) % 7;
  return addDays(date, offset);
}

function formatDate(iso, options = {}) {
  const date = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: options.weekday ? "long" : undefined
  }).format(date);
}

function monthTitle(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long"
  }).format(date);
}

function monthDays(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const endOffset = (7 - ((last.getDay() + 6) % 7) - 1) % 7;
  const totalDays = startOffset + last.getDate() + endOffset;
  return Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function filteredTasks(items) {
  if (filter === "open") return items.filter((task) => !task.done);
  if (filter === "done") return items.filter((task) => task.done);
  if (filter === "due") return items.filter((task) => task.due);
  return items;
}

function tasksForDate(iso) {
  return tasks
    .filter((task) => task.date === iso || (task.due === iso && !isStudyCalendarTask(task)))
    .sort((a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title, "zh-CN"));
}

function isStudyCalendarTask(task) {
  return task.type === "revision" && (task.sourceStudyId || task.sourceProjectId || task.title.includes("打卡："));
}

function render() {
  monthLabel.textContent = monthTitle(visibleMonth);
  dailyTarget.textContent = formatDuration(overallDailySafety(toISO(today)));
  weeklyHours.textContent = formatDuration(weeklyStudyHours());
  grid.innerHTML = "";

  [visibleMonth, new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)].forEach((monthDate, index) => {
    grid.append(renderMonthSection(monthDate, index === 0));
  });

  renderDetail();
  renderToday();
  renderStudy();
  renderCommandBoard();
  renderPressureList();
  renderPrintLayout();
}

function renderMonthSection(monthDate, isFirstMonth) {
  const section = document.createElement("section");
  section.className = "month-section";
  if (!isFirstMonth) {
    const title = document.createElement("h3");
    title.className = "month-section-title";
    title.textContent = monthTitle(monthDate);
    section.append(title);
  }
  const weekdays = document.createElement("div");
  weekdays.className = "weekdays";
  weekdays.setAttribute("aria-hidden", "true");
  weekdays.innerHTML = "<span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span><span>周日</span>";
  const monthGrid = document.createElement("div");
  monthGrid.className = "calendar-grid";
  monthDays(monthDate).forEach((day) => {
    const iso = toISO(day);
    const items = filteredTasks(tasksForDate(iso));
    const focusMarkers = focusMarkersForDate(iso);
    const cell = document.createElement("div");
    cell.tabIndex = 0;
    cell.role = "button";
    cell.className = "day-cell";
    cell.classList.toggle("is-muted", day.getMonth() !== monthDate.getMonth());
    cell.classList.toggle("is-today", iso === toISO(today));
    cell.classList.toggle("is-selected", iso === selectedDate);
    cell.classList.toggle("has-focus-day", focusMarkers.length > 0);
    if (focusMarkers[0]) cell.style.setProperty("--focus-color", focusMarkers[0].project.color);
    cell.setAttribute("aria-label", `${formatDate(iso, { weekday: true })}, ${items.length} 个事项`);
    cell.addEventListener("click", () => {
      selectedDate = iso;
      document.querySelector("#date-input").value = iso;
      render();
      openDayModal(iso);
    });
    cell.addEventListener("dragover", (event) => {
      event.preventDefault();
      cell.classList.add("drag-over");
    });
    cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
    cell.addEventListener("drop", (event) => {
      event.preventDefault();
      cell.classList.remove("drag-over");
      const payload = readDragPayload(event);
      if (!payload) return;
      if (payload.kind === "study-item") scheduleStudyItem(payload, iso);
      if (payload.kind === "calendar-task") moveCalendarTask(payload.taskId, iso);
      if (payload.kind === "focus-marker") moveFocusMarker(payload.projectId, payload.focus, iso);
      if (payload.kind === "focus-course") createFocusMarker(payload.projectId, iso);
    });

    const head = document.createElement("div");
    head.className = "day-head";
    head.innerHTML = `<span class="day-number">${day.getDate()}</span><span class="day-load">${loadLabel(items.length)}</span>`;

    const events = document.createElement("div");
    events.className = "day-events";
    focusMarkers.forEach((marker) => {
      const markerEl = document.createElement("div");
      markerEl.className = "focus-marker";
      markerEl.draggable = true;
      markerEl.style.setProperty("--marker-color", marker.project.color);
      markerEl.textContent = `${marker.project.name}日 ${marker.day.focus}`;
      markerEl.addEventListener("click", (event) => event.stopPropagation());
      markerEl.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("application/json", JSON.stringify({
          kind: "focus-marker",
          projectId: marker.project.id,
          focus: marker.day.focus
        }));
      });
      events.append(markerEl);
    });
    items.slice(0, 4).forEach((task) => {
      const event = document.createElement("div");
      event.className = "calendar-event";
      event.classList.toggle("done", task.done);
      event.classList.toggle("is-due", task.due === iso && task.due !== task.date);
      event.dataset.type = task.type;
      const dueText = task.due === iso && task.due !== task.date ? " 截止" : "";
      event.draggable = Boolean(task.sourceStudyId);
      event.addEventListener("dragstart", (dragEvent) => {
        dragEvent.dataTransfer.setData("application/json", JSON.stringify({ kind: "calendar-task", taskId: task.id }));
      });
      event.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        setTaskTime(task);
      });
      const timeText = task.startTime ? `<span class="time">${escapeHTML(task.startTime)}${task.endTime ? `-${escapeHTML(task.endTime)}` : ""}</span>` : "";
      event.innerHTML = `<span class="dot"></span><span>${timeText}${escapeHTML(task.title)}${dueText}</span>`;
      events.append(event);
    });
    const budget = dayStudyHours(iso);
    const safety = daySafetyRequirement(iso);
    if (budget.total > 0) {
      const budgetEl = document.createElement("div");
      budgetEl.className = "day-budget";
      budgetEl.classList.toggle("under", budget.total < safety);
      budgetEl.textContent = `${formatDuration(budget.total)} / 安全线 ${formatDuration(safety)}`;
      events.append(budgetEl);
    }
    if (items.length > 4) {
      const more = document.createElement("div");
      more.className = "calendar-event";
      more.innerHTML = `<span class="dot"></span><span>还有 ${items.length - 4} 件，人生很满</span>`;
      events.append(more);
    }

    cell.append(head, events);
    monthGrid.append(cell);
  });
  section.append(weekdays, monthGrid);
  return section;
}

function loadLabel(count) {
  if (count === 0) return "";
  if (count < 3) return "轻";
  if (count < 5) return "满";
  return "爆";
}

function renderDetail() {
  const allItems = tasksForDate(selectedDate);
  const items = filteredTasks(allItems);
  selectedDateLabel.textContent = formatDate(selectedDate, { weekday: true });
  selectedRoast.textContent = roasts[Math.min(allItems.length, roasts.length - 1)];
  renderDailyNote();
  selectedList.innerHTML = "";

  if (!items.length) {
    selectedList.innerHTML = `<p class="empty-state">这天很清爽。你可以选择休息，也可以安排一点看起来很有前途的事情。</p>`;
    return;
  }

  items.forEach((task) => selectedList.append(renderTask(task)));
}

function renderDailyNote() {
  const note = dailyNotes[selectedDate] || "";
  if (dailyNoteInput.value !== note) dailyNoteInput.value = note;
  dailyNoteStatus.textContent = note ? "已保存" : "自动保存";
}

function createTomorrowReminderFromNote() {
  const note = (dailyNotes[selectedDate] || dailyNoteInput.value).trim();
  if (!note) {
    dailyNoteStatus.textContent = "先写一句备注";
    return;
  }

  const tomorrow = toISO(addDays(new Date(`${selectedDate}T00:00:00`), 1));
  const title = note.length > 32 ? `${note.slice(0, 32)}...` : note;
  tasks.push({
    id: crypto.randomUUID(),
    title: `继续：${title}`,
    date: tomorrow,
    due: "",
    type: noteReminderType(note),
    note: `从 ${formatDate(selectedDate)} 的备注带过来：${note}`,
    done: false
  });
  saveTasks();
  selectedDate = tomorrow;
  document.querySelector("#date-input").value = tomorrow;
  visibleMonth = new Date(new Date(`${tomorrow}T00:00:00`).getFullYear(), new Date(`${tomorrow}T00:00:00`).getMonth(), 1);
  render();
  showCelebration("已经放到明天");
}

function noteReminderType(note) {
  return /视频|课|review|session|sample|paper|cheat|复习|作业|题|卷/i.test(note) ? "revision" : "matter";
}

function renderToday() {
  const items = tasksForDate(toISO(today));
  todayList.innerHTML = "";
  if (!items.length) {
    todayList.innerHTML = `<p class="empty-state">今天没有事项，日历正在假装冷静。</p>`;
  } else {
    items.forEach((task) => todayList.append(renderTask(task)));
  }

}

function renderCommandBoard() {
  const iso = selectedDate;
  const focus = focusSummaryForDate(iso);
  const progress = focusDayProgress(iso, focus.project?.id);
  focusCardKicker.textContent = `${formatDate(iso, { weekday: true })}已选`;
  heroFocus.textContent = focus.label;
  heroFocusCopy.textContent = focus.project
    ? `${focus.project.name} ${focus.day.focus} · 当天已选 ${formatDuration(progress.total)}，已完成 ${formatDuration(progress.done)}`
    : "先拖一个主攻日或学习任务到这天。";
  focusSelectedHours.textContent = formatDuration(progress.total);
  focusDoneHours.textContent = formatDuration(progress.done);
  focusPie.style.setProperty("--pie-value", `${progress.percent}%`);
  focusPieLabel.textContent = `${Math.round(progress.percent)}%`;
}

function syncSelectedDateViews() {
  renderCommandBoard();
  renderPressureList();
}

function renderPressureList() {
  pressureList.innerHTML = "";
  studyProjects.forEach((project) => {
    const summary = projectSummary(project);
    const level = pressureLevel(summary.dailyNeed);
    const row = document.createElement("article");
    row.className = "pressure-item";
    row.style.setProperty("--course-color", project.color);
    row.innerHTML = `
      <div>
        <strong>${project.name}</strong>
        <p>剩 ${formatDuration(summary.remaining)} · ${summary.remainingDays} 个复习日</p>
      </div>
      <span>${formatDuration(summary.dailyNeed)}/天</span>
      <em>${level.title}</em>
    `;
    pressureList.append(row);
  });
}

function renderTask(task) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.type = task.type;
  node.classList.toggle("done", task.done);
  node.querySelector("h3").textContent = task.title;
  node.querySelector("p").textContent = taskMeta(task);
  node.querySelector(".task-type").textContent = labels[task.type];
  node.querySelector(".check-button").addEventListener("click", () => {
    toggleTaskDone(task);
    saveTasks();
    render();
  });
  return node;
}

function renderStudy() {
  courseRings.innerHTML = "";
  studyPool.innerHTML = "";

  studyProjects.forEach((project) => {
    const summary = projectSummary(project);
    courseRings.append(renderCourseRing(project, summary));

    const projectBlock = document.createElement("section");
    projectBlock.className = "module-card";
    projectBlock.classList.add("course-project");
    projectBlock.innerHTML = `
      <div class="module-head">
        <div>
          <h3>${project.name}</h3>
          <p>剩 ${formatDuration(summary.remaining)} · 安全线 ${formatDuration(summary.dailyNeed)}/天</p>
        </div>
        <div class="button-row">
          <button class="course-edit" type="button">编辑</button>
          <button class="course-toggle" type="button">${collapsedCourses.has(project.id) ? "展开" : "折叠"}</button>
        </div>
      </div>
    `;
    projectBlock.querySelector(".course-edit").addEventListener("click", () => openCourseEditor(project));
    projectBlock.querySelector(".course-toggle").addEventListener("click", () => {
      if (collapsedCourses.has(project.id)) collapsedCourses.delete(project.id);
      else collapsedCourses.add(project.id);
      localStorage.setItem("somewhen-collapsed-courses-v1", JSON.stringify([...collapsedCourses]));
      renderStudy();
    });

    if (collapsedCourses.has(project.id)) {
      studyPool.append(projectBlock);
      return;
    }

    const focusCard = document.createElement("div");
    focusCard.className = "module-card focus-plan-card";
    focusCard.innerHTML = `
      <div class="module-head">
        <h3>主攻日安排</h3>
        <span>拖到日历</span>
      </div>
      <div class="focus-plan-grid"></div>
    `;
    const focusGrid = focusCard.querySelector(".focus-plan-grid");
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "focus-plan-chip wide";
    chip.draggable = true;
    chip.style.setProperty("--marker-color", project.color);
    chip.textContent = `安排 ${project.name} 主攻日`;
    chip.title = `拖到日历，系统自动生成 ${project.name} 的下一个 D`;
    chip.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("application/json", JSON.stringify({
        kind: "focus-course",
        projectId: project.id
      }));
    });
    focusGrid.append(chip);
    projectBlock.append(focusCard);

    project.modules.forEach((module) => {
      const moduleCard = document.createElement("div");
      moduleCard.className = "module-card";
      const moduleTotal = module.items.reduce((sum, task) => sum + task.hours, 0);
      const moduleDone = module.items.reduce((sum, task) => sum + doneHours(project.id, task.id), 0);
      moduleCard.innerHTML = `
        <div class="module-head">
          <h3>${module.name}</h3>
          <span>${formatDuration(Math.max(moduleTotal - moduleDone, 0))} left</span>
        </div>
        <div class="check-grid"></div>
      `;
      const gridEl = moduleCard.querySelector(".check-grid");
      module.items.forEach((task) => {
        if (isStudyScheduled(project.id, task.id) && !isStudyDone(project.id, task)) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "study-check";
        button.draggable = true;
        const completed = isStudyDone(project.id, task);
        button.classList.toggle("done", completed);
        button.classList.toggle("long", task.long || task.title.length > 28);
        button.textContent = `${completed ? "✓ " : ""}${task.title}${task.hours ? ` · ${formatDuration(task.hours)}` : ""}`;
        button.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData("application/json", JSON.stringify({
            kind: "study-item",
            projectId: project.id,
            moduleName: module.name,
            itemId: task.id
          }));
        });
        button.addEventListener("click", () => toggleStudyItem(project, module, task));
        gridEl.append(button);
      });
      projectBlock.append(moduleCard);
    });

    studyPool.append(projectBlock);
  });
}

function renderCourseRing(project, summary) {
  const card = document.createElement("article");
  card.className = "course-card";
  const ringColor = ringColorFor(summary);
  const progress = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
  card.style.setProperty("--ring-color", ringColor);
  card.style.setProperty("--ring-value", `${progress}%`);
  card.innerHTML = `
    <div class="ring"><strong>${formatDuration(summary.remaining)}</strong></div>
    <div>
      <h3>${project.name}</h3>
      <p>动态安全线 ${formatDuration(summary.dailyNeed)}/天 · 剩 ${summary.remainingDays} 个复习日</p>
      <div class="progress-line"><span style="width: ${progress}%"></span></div>
    </div>
  `;
  return card;
}

function toggleStudyItem(project, module, task) {
  if (!studyProgress[project.id]) studyProgress[project.id] = {};
  const wasDone = isStudyDone(project.id, task);
  studyProgress[project.id][task.id] = wasDone ? 0 : Math.max(task.hours, 1);
  saveStudyProgress();

  if (!wasDone && task.hours > 0) {
    tasks.push({
      id: crypto.randomUUID(),
      title: `${project.name} 打卡：${task.title}`,
      date: toISO(today),
      due: "",
      type: "revision",
      note: `${module.name} · 完成 ${formatDuration(task.hours)}，剩余小时已减少。`,
      done: true,
      estimatedHours: task.hours
    });
    saveTasks();
  }
  render();
  if (!wasDone) showCelebration(`消灭 ${formatDuration(task.hours)}`);
}

function editStudyItem(project, module, task) {
  saveStudyItem(project, task, task.title, formatDuration(task.hours));
}

function saveStudyItem(project, task, title, hoursText) {
  if (!title.trim()) return;
  task.title = title.trim();
  task.hours = parseHours(hoursText);
  task.long = task.title.length > 24;
  task.custom = true;
  saveStudyProjects();
  saveAllCustomStudy();
  render();
  if (activeCourseId === project.id) openCourseEditor(project);
}

function deleteStudyItem(project, module, task) {
  if (!safeConfirm(`删除「${task.title}」？`)) return;
  module.items = module.items.filter((item) => item.id !== task.id);
  if (studyProgress[project.id]) delete studyProgress[project.id][task.id];
  saveStudyProgress();
  saveStudyProjects();
  saveAllCustomStudy();
  render();
  if (activeCourseId === project.id) openCourseEditor(project);
}

function addStudyItemToModule(project, module) {
  module.items.push(item(`${project.id}-custom-${Date.now()}`, "新任务", 1, {
    custom: true,
    long: false
  }));
  saveStudyProjects();
  saveAllCustomStudy();
  render();
  openCourseEditor(project);
}

function addModuleToProject(project) {
  project.modules.push({ name: "新模块", items: [] });
  saveStudyProjects();
  render();
  openCourseEditor(project);
}

function openCourseEditor(project) {
  activeCourseId = project.id;
  courseEditor.querySelector("#course-editor-title").textContent = `编辑 ${project.name}`;
  courseEditorBody.innerHTML = "";
  project.modules.forEach((module) => {
    const section = document.createElement("section");
    section.className = "editor-module";
    section.innerHTML = `
      <div class="module-head">
        <h3>${module.name}</h3>
        <button type="button" class="module-add">加任务</button>
      </div>
      <div class="editor-list"></div>
    `;
    section.querySelector(".module-add").addEventListener("click", () => addStudyItemToModule(project, module));
    const list = section.querySelector(".editor-list");
    module.items.forEach((studyItem) => {
      const row = document.createElement("div");
      row.className = "editor-row";
      row.innerHTML = `
        <input type="text" value="${escapeAttribute(studyItem.title)}" aria-label="任务名称">
        <input type="text" value="${escapeAttribute(formatDuration(studyItem.hours))}" aria-label="预计时长">
        <button type="button">保存</button>
        <button type="button">删除</button>
      `;
      const inputs = row.querySelectorAll("input");
      const buttons = row.querySelectorAll("button");
      buttons[0].addEventListener("click", () => saveStudyItem(project, studyItem, inputs[0].value, inputs[1].value));
      buttons[1].addEventListener("click", () => deleteStudyItem(project, module, studyItem));
      list.append(row);
    });
    courseEditorBody.append(section);
  });
  const addModule = document.createElement("button");
  addModule.type = "button";
  addModule.className = "primary-action editor-add-module";
  addModule.textContent = "新增模块";
  addModule.addEventListener("click", () => addModuleToProject(project));
  courseEditorBody.append(addModule);
  courseEditor.classList.add("open");
  courseEditor.setAttribute("aria-hidden", "false");
}

function closeCourseEditor() {
  courseEditor.classList.remove("open");
  courseEditor.setAttribute("aria-hidden", "true");
  activeCourseId = "";
}

function projectSummary(project) {
  const total = project.modules.flatMap((module) => module.items).reduce((sum, task) => sum + task.hours, 0);
  const done = project.modules.flatMap((module) => module.items).reduce((sum, task) => sum + doneHours(project.id, task.id), 0);
  const remaining = Math.max(total - done, 0);
  const daysLeft = Math.max(0, Math.ceil((new Date(`${project.examDate}T00:00:00`) - today) / 86400000));
  const remainingDays = remainingPlanDays(project, toISO(today));
  const dailyNeed = remainingDays ? remaining / remainingDays : remaining;
  return { total, done, remaining, daysLeft, dailyNeed, remainingDays };
}

function doneHours(projectId, taskId) {
  return Number(studyProgress[projectId]?.[taskId] || 0);
}

function isStudyDone(projectId, task) {
  if (task.hours === 0) return doneHours(projectId, task.id) > 0;
  return doneHours(projectId, task.id) >= task.hours - 0.01;
}

function ringColorFor(summary) {
  if (summary.remaining <= 0) return "#5fa779";
  if (summary.dailyNeed > 8) return "#c24b40";
  if (summary.dailyNeed > 6) return "#d9822b";
  if (summary.dailyNeed > 4) return "#c9a642";
  return "#5fa779";
}

function riskCopy(summary) {
  if (summary.remaining <= 0) return "稳了，可以有一点点得意";
  if (summary.dailyNeed > 8) return "台风预警，已经超过你的 8h 上限";
  if (summary.dailyNeed > 6) return "小雨偏暴雨，需要推进";
  if (summary.dailyNeed > 4) return "多云，别太浪";
  return "晴天，节奏不错";
}

function pressureLevel(hours) {
  if (hours > 8) return { title: "很累", copy: "已经超过 8h，这就是前面偷懒的利息。" };
  if (hours > 6) return { title: "紧迫", copy: "超过 6h 了，今天最好认真推进一点。" };
  if (hours > 4) return { title: "可控", copy: "还行，但别再继续往后拖。" };
  if (hours > 0) return { title: "轻稳", copy: "今天推进一点，后面会舒服很多。" };
  return { title: "未选择", copy: "先选主攻日，软件再给你算压力。" };
}

function todayFocusLabel(iso) {
  const selectedStudies = tasksForDate(iso).filter((task) => task.sourceProjectId && !task.done);
  if (selectedStudies.length === 1) return selectedStudies[0].title.replace(":", " ·");
  if (selectedStudies.length > 1) return `已选 ${selectedStudies.length} 项`;
  const selectedExam = tasksForDate(iso).find((task) => task.type === "exam");
  if (selectedExam) return selectedExam.title;
  return "还没选";
}

function focusSummaryForDate(iso) {
  const marker = focusMarkersForDate(iso)[0];
  if (!marker) {
    const selectedStudies = tasksForDate(iso).filter((task) => task.sourceProjectId && !task.done);
    if (selectedStudies.length === 1) {
      const project = studyProjects.find((item) => item.id === selectedStudies[0].sourceProjectId);
      const summary = project ? projectSummaryForDate(project, iso) : null;
      return {
        project,
        day: { focus: "自由安排" },
        summary: summary || { remaining: 0, remainingDays: 0, dailyNeed: 0 },
        dailyNeed: summary?.dailyNeed || 0,
        label: selectedStudies[0].title.replace(":", " ·"),
        copy: "这是你拖进这天的任务。"
      };
    }
    return {
      project: null,
      day: { focus: "" },
      summary: { remaining: 0, remainingDays: 0, dailyNeed: 0 },
      dailyNeed: 0,
      label: "还没选",
      copy: "先拖一个主攻日标志或具体任务进来。"
    };
  }
  const summary = projectSummaryForDate(marker.project, iso);
  return {
    ...marker,
    summary,
    dailyNeed: summary.dailyNeed,
    label: `${marker.project.name} · ${marker.day.focus}`,
    copy: "这是当天主攻课程；具体学什么仍由你拖任务决定。"
  };
}

function remainingPlanDays(project, fromIso) {
  const plannedSoFar = project.planDays.filter((day) => day.date < fromIso).length;
  const totalDays = maxPlanDays(project);
  return Math.max(totalDays - plannedSoFar, 1);
}

function courseDailyNeed(project, fromIso) {
  const summary = projectSummaryForDate(project, fromIso);
  return summary.dailyNeed;
}

function projectSummaryForDate(project, fromIso) {
  const total = project.modules.flatMap((module) => module.items).reduce((sum, task) => sum + task.hours, 0);
  const done = project.modules.flatMap((module) => module.items).reduce((sum, task) => sum + doneHours(project.id, task.id), 0);
  const remaining = Math.max(total - done, 0);
  const remainingDays = remainingPlanDays(project, fromIso);
  return { remaining, remainingDays, dailyNeed: remainingDays ? remaining / remainingDays : remaining };
}

function daySafetyRequirement(iso) {
  return overallDailySafety(iso);
}

function overallDailySafety(fromIso) {
  return studyProjects.reduce((sum, project) => sum + courseDailyNeed(project, fromIso), 0);
}

function weeklyStudyHours() {
  const start = addDays(today, -((today.getDay() + 6) % 7));
  const end = addDays(start, 6);
  return tasks
    .filter((task) => task.done && task.type === "revision")
    .filter((task) => task.date >= toISO(start) && task.date <= toISO(end))
    .reduce((sum, task) => sum + Number(task.estimatedHours || 0), 0);
}

function formatDuration(value) {
  const totalMinutes = Math.round(value * 60);
  if (totalMinutes === 0) return "0h";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function parseHours(value) {
  if (!value) return 1;
  const text = value.trim().toLowerCase();
  if (text.includes(":")) {
    const [h, m] = text.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  }
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*h/);
  const minuteMatch = text.match(/(\d+)\s*m/);
  if (hourMatch || minuteMatch) {
    return Number(hourMatch?.[1] || 0) + Number(minuteMatch?.[1] || 0) / 60;
  }
  return Number(text) || 1;
}

function readDragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("application/json"));
  } catch {
    return null;
  }
}

function updateCalendarAutoScroll(event) {
  if (!calendarPanel) return;
  const rect = calendarPanel.getBoundingClientRect();
  const edgeSize = Math.min(120, rect.height * 0.22);
  let speed = 0;

  if (event.clientY < rect.top + edgeSize) {
    speed = -Math.ceil((1 - (event.clientY - rect.top) / edgeSize) * 22);
  } else if (event.clientY > rect.bottom - edgeSize) {
    speed = Math.ceil((1 - (rect.bottom - event.clientY) / edgeSize) * 22);
  }

  calendarAutoScrollSpeed = Number.isFinite(speed) ? speed : 0;
  if (calendarAutoScrollSpeed && !calendarAutoScrollFrame) {
    calendarAutoScrollFrame = window.requestAnimationFrame(runCalendarAutoScroll);
  }
}

function runCalendarAutoScroll() {
  if (!calendarAutoScrollSpeed) {
    calendarAutoScrollFrame = 0;
    return;
  }
  calendarPanel.scrollTop += calendarAutoScrollSpeed;
  calendarAutoScrollFrame = window.requestAnimationFrame(runCalendarAutoScroll);
}

function stopCalendarAutoScroll() {
  calendarAutoScrollSpeed = 0;
  if (calendarAutoScrollFrame) {
    window.cancelAnimationFrame(calendarAutoScrollFrame);
    calendarAutoScrollFrame = 0;
  }
}

function findStudyItem(payload) {
  const project = studyProjects.find((item) => item.id === payload.projectId);
  const module = project?.modules.find((item) => item.name === payload.moduleName);
  const task = module?.items.find((item) => item.id === payload.itemId);
  if (!project || !module || !task) return null;
  return { project, module, task };
}

function scheduleStudyItem(payload, iso) {
  const found = findStudyItem(payload);
  if (!found) return;
  const { project, module, task } = found;
  const existing = tasks.find((item) =>
    item.sourceProjectId === project.id &&
    item.sourceStudyId === task.id &&
    !item.done
  );
  if (existing) {
    existing.date = iso;
    selectedDate = iso;
    saveTasks();
    render();
    return;
  }
  tasks.push({
    id: crypto.randomUUID(),
    title: `${project.name}: ${task.title}`,
    date: iso,
    due: "",
    type: "revision",
    note: `${module.name} · 预计 ${formatDuration(task.hours)}。拖回右侧可以收回。`,
    done: false,
    sourceStudyId: task.id,
    sourceProjectId: project.id,
    sourceModule: module.name,
    estimatedHours: task.hours
  });
  selectedDate = iso;
  saveTasks();
  render();
}

function isStudyScheduled(projectId, taskId) {
  return tasks.some((task) =>
    task.sourceProjectId === projectId &&
    task.sourceStudyId === taskId &&
    !task.done
  );
}

function dayStudyHours(iso) {
  const total = tasksForDate(iso)
    .filter((task) => task.type === "revision")
    .reduce((sum, task) => sum + Number(task.estimatedHours || 0), 0);
  return { total };
}

function focusDayProgress(iso, projectId) {
  const studyItems = tasksForDate(iso).filter((task) =>
    task.sourceProjectId && (!projectId || task.sourceProjectId === projectId)
  );
  const total = studyItems.reduce((sum, task) => sum + Number(task.estimatedHours || 0), 0);
  const done = studyItems
    .filter((task) => task.done)
    .reduce((sum, task) => sum + Number(task.estimatedHours || 0), 0);
  const percent = total > 0 ? Math.min((done / total) * 100, 100) : 0;
  return { total, done, percent };
}

function toggleTaskDone(task) {
  const nextDone = !task.done;
  task.done = nextDone;
  if (task.sourceProjectId && task.sourceStudyId) {
    syncStudyProgressFromCalendar(task.sourceProjectId, task.sourceStudyId);
    saveStudyProgress();
  }
  if (nextDone && task.sourceProjectId && task.sourceStudyId) {
    showCelebration("完成，已经划掉");
  }
}

function syncStudyProgressFromCalendar(projectId, studyId) {
  if (!studyProgress[projectId]) studyProgress[projectId] = {};
  const completedHours = tasks
    .filter((item) => item.sourceProjectId === projectId && item.sourceStudyId === studyId && item.done)
    .reduce((sum, item) => sum + Number(item.estimatedHours || 0), 0);

  if (completedHours > 0) {
    studyProgress[projectId][studyId] = completedHours;
  } else {
    delete studyProgress[projectId][studyId];
  }
}

function reconcileCalendarBackedProgress() {
  const calendarStudyIds = new Set(
    tasks
      .filter((item) => item.sourceProjectId && item.sourceStudyId)
      .map((item) => `${item.sourceProjectId}::${item.sourceStudyId}`)
  );

  calendarStudyIds.forEach((key) => {
    const [projectId, studyId] = key.split("::");
    syncStudyProgressFromCalendar(projectId, studyId);
  });
}

function removeCalendarTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  tasks = tasks.filter((item) => item.id !== taskId);
  if (task?.sourceProjectId && task?.sourceStudyId) {
    syncStudyProgressFromCalendar(task.sourceProjectId, task.sourceStudyId);
    saveStudyProgress();
  }
}

function openDayModal(iso) {
  selectedDate = iso;
  syncSelectedDateViews();
  dayModalTitle.textContent = formatDate(iso, { weekday: true });
  const budget = dayStudyHours(iso);
  const safety = daySafetyRequirement(iso);
  daySafeLine.textContent = `学习时长 ${formatDuration(budget.total)} / 动态安全线 ${formatDuration(safety)}`;
  daySafeLine.className = budget.total >= safety ? "safe" : "under";
  dayModalList.innerHTML = "";
  const items = tasksForDate(iso);
  if (!items.length) {
    dayModalList.innerHTML = `<p class="empty-state">这天还没有安排。可以从右侧拖任务进来，也可以在下面直接添加。</p>`;
  } else {
    items.forEach((task) => dayModalList.append(renderDayRow(task)));
  }
  dayModal.classList.add("open");
  dayModal.setAttribute("aria-hidden", "false");
}

function closeDayModal() {
  dayModal.classList.remove("open");
  dayModal.setAttribute("aria-hidden", "true");
}

function openAppMenu(view) {
  appMenu.classList.add("open");
  appMenu.setAttribute("aria-hidden", "false");
  renderMenuOutput(view);
}

function closeAppMenu() {
  appMenu.classList.remove("open");
  appMenu.setAttribute("aria-hidden", "true");
}

function renderMenuOutput(view) {
  const monthItems = tasks.filter((task) => task.date.slice(0, 7) === toISO(today).slice(0, 7));
  const doneStudy = tasks.filter((task) => task.done && task.type === "revision");
  const studyHours = doneStudy.reduce((sum, task) => sum + Number(task.estimatedHours || 0), 0);
  const openTasks = tasks.filter((task) => !task.done);
  const backupName = `日有回响-backup-${toISO(today)}.json`;
  const summaries = {
    calendar: `<h3>日历</h3><p>月视图、日期详情、拖拽安排、时间设置都在主屏完成。</p>`,
    tasks: `<h3>任务列表</h3><p>当前未完成 ${openTasks.length} 件。学校硬DDL、作业、复习、事项都会出现在日历里。</p>`,
    study: `<h3>复习项目</h3><p>QBUS5001 和 BUSS6002 会根据剩余小时和剩余复习日实时计算动态安全线。</p>`,
    monthly: `<h3>月度总结</h3><p>本月共有 ${monthItems.length} 个日历记录，已完成 ${monthItems.filter((task) => task.done).length} 个，复习记录 ${formatDuration(studyHours)}。</p>`,
    yearly: `<h3>年度总结</h3><p>今年正在积累你的学习、作业、事项和复习痕迹。后面可以接 AI 生成 Krissy 年度状态。</p>`,
    inbox: `<h3>邮件导入</h3><p>下一步可以做成：粘贴 Outlook/网易邮件内容，自动识别时间和事项，一键加入日历。</p>`,
    data: `
      <h3>数据保险箱</h3>
      <p>导出会保存日历事项、完成状态、复习进度、主攻日、今日备注和课程编辑。换链接或换浏览器前先导出一次。</p>
      <div class="backup-actions">
        <button id="export-backup" type="button">导出 ${backupName}</button>
        <button id="import-backup" type="button">导入备份</button>
      </div>
      <div class="cloud-sync-card">
        <h3>云同步</h3>
        <p>云端已经接好。你只需要设置一个自己的同步口令，数据会先加密再上传；换电脑时输入同一个口令即可恢复。</p>
        <label class="sync-advanced">Supabase URL<input id="sync-url" type="url" value="${escapeAttribute(syncConfig.url || DEFAULT_SYNC_URL)}" placeholder="https://xxxx.supabase.co"></label>
        <label class="sync-advanced">Publishable key<input id="sync-key" type="password" value="${escapeAttribute(syncConfig.anonKey || DEFAULT_SYNC_KEY)}" placeholder="sb_publishable_..."></label>
        <label>同步口令<input id="sync-passphrase" type="password" value="${escapeAttribute(syncConfig.passphrase || "")}" placeholder="自己取一个长一点的口令"></label>
        <div class="backup-actions">
          <button id="save-sync-config" type="button">保存云同步</button>
          <button id="push-cloud" type="button">立即上传</button>
          <button id="pull-cloud" type="button">从云端恢复</button>
        </div>
        <p id="sync-status" class="sync-status">${cloudSyncStatusText()}</p>
        <details class="sync-help">
          <summary>Supabase 里要建的表</summary>
          <pre>create table if not exists riyouhuixiang_sync (
  id text primary key,
  encrypted_payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table riyouhuixiang_sync enable row level security;

create policy "read sync snapshots" on riyouhuixiang_sync
for select using (true);

create policy "insert sync snapshots" on riyouhuixiang_sync
for insert with check (true);

create policy "update sync snapshots" on riyouhuixiang_sync
for update using (true) with check (true);</pre>
        </details>
      </div>
    `
  };
  menuOutput.innerHTML = summaries[view] || summaries.monthly;
  if (view === "data") {
    document.querySelector("#export-backup").addEventListener("click", exportDataBackup);
    document.querySelector("#import-backup").addEventListener("click", () => backupFileInput.click());
    document.querySelector("#save-sync-config").addEventListener("click", saveCloudSyncConfigFromMenu);
    document.querySelector("#push-cloud").addEventListener("click", () => pushCloudSnapshot({ manual: true }));
    document.querySelector("#pull-cloud").addEventListener("click", () => pullCloudSnapshot({ manual: true }));
  }
}

function exportDataBackup() {
  const backup = currentDataBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `日有回响-backup-${toISO(today)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function currentDataBackup() {
  return {
    app: "日有回响",
    version: 1,
    exportedAt: new Date().toISOString(),
    origin: location.origin,
    localUpdatedAt: loadLocalMeta().updatedAt,
    data: {
      [STORAGE_KEY]: tasks,
      [STUDY_KEY]: studyProgress,
      [DAILY_NOTES_KEY]: dailyNotes,
      [CUSTOM_STUDY_KEY]: JSON.parse(localStorage.getItem(CUSTOM_STUDY_KEY) || "[]"),
      [STUDY_PROJECTS_KEY]: studyProjects,
      "somewhen-collapsed-courses-v1": [...collapsedCourses]
    }
  };
}

function importDataBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const backup = JSON.parse(reader.result);
      const data = backup.data || backup;
      applyBackupData(data, backup.localUpdatedAt || new Date().toISOString());
      showCelebration("备份已导入");
      window.setTimeout(() => location.reload(), 500);
    } catch {
      menuOutput.insertAdjacentHTML("beforeend", `<p class="import-error">这个备份文件读不了，可能不是日有回响导出的 JSON。</p>`);
    } finally {
      backupFileInput.value = "";
    }
  });
  reader.readAsText(file);
}

function applyBackupData(data, updatedAt = new Date().toISOString()) {
  suppressPersistenceHooks = true;
  const keys = [STORAGE_KEY, STUDY_KEY, DAILY_NOTES_KEY, CUSTOM_STUDY_KEY, STUDY_PROJECTS_KEY, "somewhen-collapsed-courses-v1"];
  keys.forEach((key) => {
    if (data[key] !== undefined) localStorage.setItem(key, JSON.stringify(data[key]));
  });
  localStorage.setItem(CALENDAR_RESET_KEY, "true");
  localStorage.setItem(FOCUS_RESET_KEY, "true");
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ updatedAt }));
  suppressPersistenceHooks = false;
}

function markLocalUpdated() {
  if (suppressPersistenceHooks) return;
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ updatedAt: new Date().toISOString() }));
  scheduleCloudPush();
}

function loadLocalMeta() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_META_KEY) || "{}");
  } catch {
    return {};
  }
}

function loadCloudSyncConfig() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY) || "{}");
  } catch {
    return {};
  }
}

function effectiveSyncConfig() {
  return {
    url: syncConfig.url || DEFAULT_SYNC_URL,
    anonKey: syncConfig.anonKey || DEFAULT_SYNC_KEY,
    passphrase: syncConfig.passphrase || ""
  };
}

function saveCloudSyncConfigFromMenu() {
  syncConfig = {
    url: document.querySelector("#sync-url").value.trim() || DEFAULT_SYNC_URL,
    anonKey: document.querySelector("#sync-key").value.trim() || DEFAULT_SYNC_KEY,
    passphrase: document.querySelector("#sync-passphrase").value
  };
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(syncConfig));
  cloudClient = null;
  updateSyncStatus("云同步配置已保存。");
  initCloudSync();
}

function cloudSyncStatusText() {
  if (!isCloudConfigured()) return "云端已接好。先填同步口令，再点保存云同步。";
  const localMeta = loadLocalMeta();
  const last = localMeta.cloudSyncedAt ? `上次云同步：${new Date(localMeta.cloudSyncedAt).toLocaleString("zh-CN")}` : "已配置，等待第一次同步。";
  return last;
}

function updateSyncStatus(message) {
  const status = document.querySelector("#sync-status");
  if (status) status.textContent = message;
}

function isCloudConfigured() {
  const config = effectiveSyncConfig();
  return Boolean(config.url && config.anonKey && config.passphrase);
}

async function initCloudSync() {
  if (!isCloudConfigured()) return;
  try {
    await reconcileCloudOnStart();
  } catch (error) {
    updateSyncStatus(`云同步暂时连不上：${error.message}`);
  }
}

function scheduleCloudPush() {
  if (!isCloudConfigured()) return;
  window.clearTimeout(cloudPushTimer);
  cloudPushTimer = window.setTimeout(() => {
    pushCloudSnapshot({ silent: true });
  }, 1400);
}

async function getCloudClient() {
  if (cloudClient) return cloudClient;
  const config = effectiveSyncConfig();
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  cloudClient = createClient(config.url, config.anonKey);
  return cloudClient;
}

async function cloudDocumentId() {
  return sha256Hex(`riyouhuixiang:${effectiveSyncConfig().passphrase}`);
}

async function pushCloudSnapshot(options = {}) {
  if (!isCloudConfigured()) {
    updateSyncStatus("先保存云同步配置。");
    return;
  }
  if (!options.silent) updateSyncStatus("正在上传到云端...");
  const client = await getCloudClient();
  const encryptedPayload = await encryptBackup(currentDataBackup(), effectiveSyncConfig().passphrase);
  const cloudUpdatedAt = new Date().toISOString();
  const { error } = await client
    .from("riyouhuixiang_sync")
    .upsert({
      id: await cloudDocumentId(),
      encrypted_payload: encryptedPayload,
      updated_at: cloudUpdatedAt
    });
  if (error) throw error;
  const meta = loadLocalMeta();
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...meta, cloudSyncedAt: cloudUpdatedAt }));
  updateSyncStatus(options.silent ? `已自动同步：${new Date(cloudUpdatedAt).toLocaleTimeString("zh-CN")}` : "已上传到云端。");
}

async function pullCloudSnapshot(options = {}) {
  if (!isCloudConfigured()) {
    updateSyncStatus("先保存云同步配置。");
    return null;
  }
  updateSyncStatus("正在从云端读取...");
  const client = await getCloudClient();
  const { data, error } = await client
    .from("riyouhuixiang_sync")
    .select("encrypted_payload, updated_at")
    .eq("id", await cloudDocumentId())
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    updateSyncStatus("云端还没有数据，我会先上传当前这份。");
    await pushCloudSnapshot({ silent: true });
    return null;
  }
  const backup = await decryptBackup(data.encrypted_payload, effectiveSyncConfig().passphrase);
  applyBackupData(backup.data || backup, backup.localUpdatedAt || data.updated_at);
  const meta = loadLocalMeta();
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...meta, cloudSyncedAt: data.updated_at }));
  updateSyncStatus("已从云端恢复，页面马上刷新。");
  if (options.manual !== false) window.setTimeout(() => location.reload(), 500);
  return data;
}

async function reconcileCloudOnStart() {
  const client = await getCloudClient();
  const { data, error } = await client
    .from("riyouhuixiang_sync")
    .select("encrypted_payload, updated_at")
    .eq("id", await cloudDocumentId())
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    await pushCloudSnapshot({ silent: true });
    return;
  }
  const localUpdatedAt = loadLocalMeta().updatedAt || "1970-01-01T00:00:00.000Z";
  if (new Date(data.updated_at) > new Date(localUpdatedAt)) {
    const backup = await decryptBackup(data.encrypted_payload, effectiveSyncConfig().passphrase);
    applyBackupData(backup.data || backup, backup.localUpdatedAt || data.updated_at);
    window.setTimeout(() => location.reload(), 250);
  } else if (new Date(localUpdatedAt) > new Date(data.updated_at)) {
    await pushCloudSnapshot({ silent: true });
  }
}

async function encryptBackup(backup, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(passphrase, salt);
  const encoded = new TextEncoder().encode(JSON.stringify(backup));
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    version: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuffer))
  };
}

async function decryptBackup(encryptedPayload, passphrase) {
  const salt = base64ToBytes(encryptedPayload.salt);
  const iv = base64ToBytes(encryptedPayload.iv);
  const ciphertext = base64ToBytes(encryptedPayload.ciphertext);
  const key = await deriveEncryptionKey(passphrase, salt);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plainBuffer));
}

async function deriveEncryptionKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function renderDayRow(task) {
  const row = document.createElement("article");
  row.className = "day-row";
  row.classList.toggle("done", task.done);
  const time = task.startTime ? `${task.startTime}${task.endTime ? `-${task.endTime}` : ""}` : "未设时间";
  row.innerHTML = `
    <button class="day-done" type="button">${task.done ? "✓" : ""}</button>
    <div>
      <h3>${escapeHTML(task.title)}</h3>
      <p>${escapeHTML(time)} · ${labels[task.type] || task.type}</p>
    </div>
    <input class="day-time-field" type="text" value="${escapeAttribute(task.startTime ? `${task.startTime}${task.endTime ? `-${task.endTime}` : ""}` : "")}" placeholder="8:00-9:00" aria-label="设置时间">
    <button class="day-delete" type="button">删除</button>
  `;
  row.querySelector(".day-done").addEventListener("click", () => {
    toggleTaskDone(task);
    saveTasks();
    row.classList.add("just-done");
    render();
    openDayModal(selectedDate);
  });
  row.querySelector(".day-time-field").addEventListener("change", (event) => {
    applyTaskTime(task, event.target.value);
    saveTasks();
    render();
    openDayModal(selectedDate);
  });
  row.querySelector(".day-delete").addEventListener("click", () => {
    removeCalendarTask(task.id);
    saveTasks();
    render();
    openDayModal(selectedDate);
  });
  return row;
}

function parseQuickTitle(value) {
  const match = value.match(/^(\d{1,2}:\d{2})(?:-(\d{1,2}:\d{2}))?\s+(.+)$/);
  if (!match) return { title: value, type: "matter", startTime: "", endTime: "" };
  return {
    startTime: match[1],
    endTime: match[2] || "",
    title: match[3],
    type: "matter"
  };
}

function showCelebration(message) {
  celebration.textContent = message;
  celebration.classList.add("show");
  window.setTimeout(() => celebration.classList.remove("show"), 1300);
}

function moveCalendarTask(taskId, iso) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.date = iso;
  selectedDate = iso;
  saveTasks();
  render();
}

function focusMarkersForDate(iso) {
  return studyProjects.flatMap((project) =>
    project.planDays
      .filter((day) => day.date === iso)
      .map((day) => ({ project, day }))
  );
}

function moveFocusMarker(projectId, focus, iso) {
  const project = studyProjects.find((item) => item.id === projectId);
  const marker = project?.planDays.find((day) => day.focus === focus);
  if (!marker) return;
  marker.date = iso;
  selectedDate = iso;
  saveStudyProjects();
  render();
}

function createFocusMarker(projectId, iso) {
  const project = studyProjects.find((item) => item.id === projectId);
  if (!project) return;
  const maxDays = maxPlanDays(project);
  const nextNumber = project.planDays.length + 1;
  if (nextNumber > maxDays) {
    showCelebration(`${project.name} 主攻日已经排满`);
    return;
  }
  project.planDays.push(plan(iso, `${project.name} Day`, `D${nextNumber}`));
  selectedDate = iso;
  saveStudyProjects();
  render();
}

function maxPlanDays(project) {
  return Number(project.planCount || (project.id === "buss6002" ? 12 : 7));
}

function setTaskTime(task) {
  selectedDate = task.date;
  openDayModal(task.date);
}

function applyTaskTime(task, value) {
  const clean = value.trim();
  if (!clean) {
    delete task.startTime;
    delete task.endTime;
  } else {
    const [start, end] = clean.split("-").map((part) => part?.trim());
    task.startTime = start;
    task.endTime = end || "";
  }
}

function safeConfirm(message) {
  try {
    return confirm(message);
  } catch {
    return true;
  }
}

function renderPrintLayout() {
  printLayout.innerHTML = "";
  studyProjects.forEach((project) => {
    const summary = projectSummary(project);
    const page = document.createElement("article");
    page.className = "print-page";
    page.style.setProperty("--print-color", project.color);
    page.innerHTML = `
      <p class="eyebrow">Printable study checklist</p>
      <h2>${project.name} Final 待办事项</h2>
      <p>复习安排：${maxPlanDays(project)} 天 · 总学习量：${formatDuration(summary.total)}</p>
      <div class="print-summary">
        <div><strong>${maxPlanDays(project)}</strong><span>复习天数</span></div>
        <div><strong>${formatDuration(summary.total)}</strong><span>总时长</span></div>
      </div>
    `;

    const planEl = document.createElement("section");
    planEl.className = "print-module";
    planEl.innerHTML = `<h3>时间打卡表</h3><div class="print-checks compact"></div>`;
    const planChecks = planEl.querySelector(".print-checks");
    Array.from({ length: maxPlanDays(project) }, (_, index) => ({ focus: `D${index + 1}` })).forEach((day) => {
      const span = document.createElement("span");
      span.textContent = `☐ ${day.focus}`;
      planChecks.append(span);
    });
    page.append(planEl);

    project.modules.forEach((module) => {
      if (module.name.includes("时间打卡表")) return;
      const moduleEl = document.createElement("section");
      const compact = module.items.every((task) => !task.long && task.title.length < 18);
      moduleEl.className = `print-module ${compact ? "" : "wide"}`;
      moduleEl.innerHTML = `<h3>${module.name}</h3><div class="print-checks ${compact ? "compact" : ""}"></div>`;
      const checks = moduleEl.querySelector(".print-checks");
      module.items.forEach((task) => {
        const checked = isStudyDone(project.id, task) ? "☑" : "☐";
        const printTitle = printTaskTitle(module, task);
        const label = `${checked} ${printTitle}${task.hours && printTitle === task.title ? ` (${formatDuration(task.hours)})` : ""}`;
        const span = document.createElement("span");
        span.textContent = label;
        checks.append(span);
      });
      page.append(moduleEl);
    });

    printLayout.append(page);
  });
}

function printTaskTitle(module, task) {
  if (module.name.includes("Review session")) {
    return task.title.split(" ")[0];
  }
  if (module.name.includes("时间打卡表")) {
    return task.title;
  }
  return task.title;
}

function taskMeta(task) {
  const parts = [];
  if (task.due && !isStudyCalendarTask(task)) parts.push(`截止 ${formatDate(task.due)}`);
  if (task.note) parts.push(task.note);
  if (task.done) parts.push("已完成");
  return parts.join(" · ") || "没有备注，像一个冷静的成年人。";
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

render();
