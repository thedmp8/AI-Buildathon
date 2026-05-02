const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messagesElement = document.querySelector("#messages");
const sendButton = document.querySelector("#send-button");
const statusPill = document.querySelector("#status-pill");
const statusText = document.querySelector("#status-text");
const courseSearchInput = document.querySelector("#course-search-input");
const courseResults = document.querySelector("#course-results");
const courseCount = document.querySelector("#course-count");
const preferenceCount = document.querySelector("#preference-count");
const preferenceList = document.querySelector("#preference-list");
const clearPreferencesButton = document.querySelector("#clear-preferences");
const programSearchInput = document.querySelector("#program-search-input");
const programResults = document.querySelector("#program-results");
const programCount = document.querySelector("#program-count");
const exchangePreferenceCount = document.querySelector("#exchange-preference-count");
const exchangePreferenceList = document.querySelector("#exchange-preference-list");
const clearExchangePreferencesButton = document.querySelector("#clear-exchange-preferences");

const MAX_PREFERENCES = 8;
const MAX_EXCHANGE_PREFERENCES = 5;
const STORAGE_KEY = "anu-course-preferences";
const EXCHANGE_STORAGE_KEY = "anu-exchange-preferences";
const welcomeMessage = {
  role: "assistant",
  content: "Hi. Ask me something and I will answer through the ChatGPT API."
};
const messages = [];
let preferences = loadPreferences();
let exchangePreferences = loadExchangePreferences();
let courses = [];
let electiveSubjectAreas = [];
let programs = [];

renderMessages();
renderPreferences();
renderExchangePreferences();
loadCourses();
loadElectiveSubjectAreas();
loadPrograms();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const content = input.value.trim();

  if (!content || sendButton.disabled) {
    return;
  }

  messages.push({ role: "user", content });
  input.value = "";
  resizeInput();
  renderMessages();
  setLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    messages.push({ role: "assistant", content: data.reply || "No response returned." });
    setStatus("Ready");
  } catch (error) {
    messages.push({
      role: "assistant",
      content: error.message,
      isError: true
    });
    setStatus("Error", true);
  } finally {
    setLoading(false);
    renderMessages();
    input.focus();
  }
});

input.addEventListener("input", resizeInput);
courseSearchInput.addEventListener("input", renderCourseResults);
courseResults.addEventListener("click", handleCourseResultClick);
preferenceList.addEventListener("click", handlePreferenceClick);
clearPreferencesButton.addEventListener("click", clearPreferences);
programSearchInput.addEventListener("input", renderProgramResults);
programResults.addEventListener("click", handleProgramResultClick);
exchangePreferenceList.addEventListener("click", handleExchangePreferenceClick);
clearExchangePreferencesButton.addEventListener("click", clearExchangePreferences);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

function renderMessages() {
  const visibleMessages = [welcomeMessage, ...messages];

  messagesElement.replaceChildren(
    ...visibleMessages.map((message) => {
      const node = document.createElement("article");
      node.className = `message ${message.role}${message.isError ? " error" : ""}`;
      node.textContent = message.content;
      return node;
    })
  );

  messagesElement.scrollTop = messagesElement.scrollHeight;
}

function setLoading(isLoading) {
  sendButton.disabled = isLoading;
  input.disabled = isLoading;

  if (isLoading) {
    setStatus("Thinking");
    statusPill.classList.add("loading");
  } else {
    statusPill.classList.remove("loading");
  }
}

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusPill.classList.toggle("error", isError);
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
}

async function loadCourses() {
  try {
    const response = await fetch("/courses.json");

    if (!response.ok) {
      throw new Error("Could not load courses.json");
    }

    const data = await response.json();
    courses = Array.isArray(data) ? data : [];
    updateCourseCount();
    renderCourseResults();
  } catch (error) {
    courseCount.textContent = "Unavailable";
    courseResults.replaceChildren(createEmptyState(error.message));
  }
}

async function loadElectiveSubjectAreas() {
  try {
    const response = await fetch("/elective_subject_areas.json");

    if (!response.ok) {
      throw new Error("Could not load elective_subject_areas.json");
    }

    const data = await response.json();
    electiveSubjectAreas = Array.isArray(data)
      ? data.map((area) => String(area).trim()).filter(Boolean)
      : [];
    updateCourseCount();
    renderCourseResults();
  } catch (error) {
    electiveSubjectAreas = [];
    updateCourseCount();
  }
}

async function loadPrograms() {
  try {
    const response = await fetch("/anu_programs.json");

    if (!response.ok) {
      throw new Error("Could not load anu_programs.json");
    }

    const data = await response.json();
    programs = Array.isArray(data) ? data : [];
    programCount.textContent = `${programs.length.toLocaleString()} programs`;
    renderProgramResults();
  } catch (error) {
    programCount.textContent = "Unavailable";
    programResults.replaceChildren(createEmptyState(error.message));
  }
}

function renderCourseResults() {
  const query = courseSearchInput.value.trim().toLowerCase();

  if (!query) {
    courseResults.replaceChildren(createEmptyState("Search by course code, course name, or elective area."));
    return;
  }

  const terms = query.split(/\s+/).filter(Boolean);
  const courseMatches = courses
    .filter((course) => {
      const searchableText = String(course.search || `${course.code || ""} ${course.title || ""}`)
        .toLowerCase();
      return terms.every((term) => searchableText.includes(term));
    })
    .map((course) => ({
      type: "course",
      id: `course:${course.code || course.title || ""}`,
      title: course.title || "Untitled course",
      label: course.code || "No code"
    }));
  const electiveMatches = electiveSubjectAreas
    .filter((area) => terms.every((term) => area.toLowerCase().includes(term)))
    .map((area) => ({
      type: "elective",
      id: `elective:${area}`,
      title: area,
      label: "Elective subject area"
    }));
  const matches = [...courseMatches, ...electiveMatches].slice(0, 40);

  if (!matches.length) {
    courseResults.replaceChildren(createEmptyState("No matching courses found."));
    return;
  }

  courseResults.replaceChildren(
    ...matches.map((course) => {
      const item = document.createElement("article");
      item.className = `finder-result ${course.type}`;

      const label = document.createElement("strong");
      label.textContent = course.label;

      const title = document.createElement("span");
      title.textContent = course.title;

      const actions = document.createElement("div");
      actions.className = "result-actions";

      if (course.type === "elective") {
        actions.append(
          createActionButton("Add 1", "add", course.id, course.type, course.label, course.title, 1),
          createActionButton("Add 4", "add", course.id, course.type, course.label, course.title, 4)
        );
      } else {
        actions.append(
          createActionButton("Add", "add", course.id, course.type, course.label, course.title, 1)
        );
      }

      item.append(label, title, actions);
      return item;
    })
  );
}

function handleCourseResultClick(event) {
  const button = event.target.closest("button[data-action='add']");

  if (!button) {
    return;
  }

  addPreference(
    {
      id: button.dataset.id,
      type: button.dataset.type,
      label: button.dataset.label,
      title: button.dataset.title
    },
    Number(button.dataset.amount || 1)
  );
}

function addPreference(item, requestedAmount) {
  const remaining = MAX_PREFERENCES - preferences.length;

  if (remaining <= 0) {
    return;
  }

  const amount = Math.min(Math.max(requestedAmount, 1), remaining);

  if (item.type === "course" && preferences.some((preference) => preference.id === item.id)) {
    return;
  }

  for (let index = 0; index < amount; index += 1) {
    preferences.push({
      ...item,
      slotId: `${item.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`
    });
  }

  savePreferences();
  renderPreferences();
  renderCourseResults();
}

function handlePreferenceClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const index = preferences.findIndex((item) => item.slotId === id);
  const preference = preferences[index];

  if (!preference) {
    return;
  }

  if (button.dataset.action === "remove") {
    preferences.splice(index, 1);
  }

  if (button.dataset.action === "up" && index > 0) {
    [preferences[index - 1], preferences[index]] = [preferences[index], preferences[index - 1]];
  }

  if (button.dataset.action === "down" && index < preferences.length - 1) {
    [preferences[index], preferences[index + 1]] = [preferences[index + 1], preferences[index]];
  }

  savePreferences();
  renderPreferences();
  renderCourseResults();
}

function renderPreferences() {
  const total = preferences.length;
  preferenceCount.textContent = `${total} / ${MAX_PREFERENCES} selected`;
  clearPreferencesButton.disabled = total === 0;

  preferenceList.replaceChildren(
    ...Array.from({ length: MAX_PREFERENCES }, (_, index) => {
      const preference = preferences[index];
      const item = document.createElement("article");
      item.className = `preference-item ${preference ? preference.type : "empty"}`;

      const rank = document.createElement("strong");
      rank.className = "preference-rank";
      rank.textContent = String(index + 1);

      const text = document.createElement("div");
      text.className = "preference-text";

      const label = document.createElement("strong");
      label.textContent = preference?.label || "Empty preference";

      const title = document.createElement("span");
      title.textContent = preference?.title || "Add a course or elective from the search results.";

      text.append(label, title);

      const actions = document.createElement("div");
      actions.className = "preference-actions";

      if (preference) {
        actions.append(
          createPreferenceButton("↑", "up", preference.slotId, index === 0, "Move up"),
          createPreferenceButton("↓", "down", preference.slotId, index === preferences.length - 1, "Move down"),
          createPreferenceButton("×", "remove", preference.slotId, false, "Remove")
        );
      }

      item.append(rank, text, actions);
      return item;
    })
  );
}

function clearPreferences() {
  preferences = [];
  savePreferences();
  renderPreferences();
  renderCourseResults();
}

function createActionButton(text, action, id, type, label, title, amount) {
  const button = document.createElement("button");
  const existing = preferences.find((preference) => preference.id === id);
  const isDuplicateCourse = type === "course" && Boolean(existing);

  button.type = "button";
  button.className = "small-button";
  button.textContent = isDuplicateCourse ? "Added" : text;
  button.disabled = preferences.length >= MAX_PREFERENCES || isDuplicateCourse;
  button.dataset.action = action;
  button.dataset.id = id;
  button.dataset.type = type;
  button.dataset.label = label;
  button.dataset.title = title;
  button.dataset.amount = String(amount);
  return button;
}

function createPreferenceButton(text, action, id, disabled = false, title = text) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = text;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.disabled = disabled;
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function savePreferences() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

function loadPreferences() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(parsed)) {
      return [];
    }

    const cleanItems = parsed
      .filter((item) => ["course", "elective"].includes(item.type))
      .map((item) => ({
        id: String(item.id || ""),
        slotId: item.slotId ? String(item.slotId) : "",
        type: item.type,
        label: String(item.label || ""),
        title: String(item.title || ""),
        count: Math.max(1, Number(item.count || 1))
      }))
      .filter((item) => item.id && item.title);
    const expandedItems = [];

    for (const item of cleanItems) {
      if (expandedItems.length >= MAX_PREFERENCES) {
        break;
      }

      const count = item.slotId ? 1 : item.count;

      for (let index = 0; index < count && expandedItems.length < MAX_PREFERENCES; index += 1) {
        expandedItems.push({
          id: item.id,
          slotId: item.slotId || `${item.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
          type: item.type,
          label: item.label,
          title: item.title
        });
      }
    }

    return expandedItems;
  } catch {
    return [];
  }
}

function updateCourseCount() {
  if (!courses.length && !electiveSubjectAreas.length) {
    courseCount.textContent = "Loading";
    return;
  }

  courseCount.textContent =
    `${courses.length.toLocaleString()} courses + ` +
    `${electiveSubjectAreas.length.toLocaleString()} electives`;
}

function renderProgramResults() {
  const query = programSearchInput.value.trim().toLowerCase();

  if (!query) {
    programResults.replaceChildren(createEmptyState("Search by university, city, country, or region."));
    return;
  }

  const terms = query.split(/\s+/).filter(Boolean);
  const matches = programs
    .filter((program) => {
      const searchableText = String(
        program.search ||
          `${program.name || ""} ${program.city || ""} ${program.country || ""} ${program.region || ""}`
      ).toLowerCase();
      return terms.every((term) => searchableText.includes(term));
    })
    .slice(0, 40);

  if (!matches.length) {
    programResults.replaceChildren(createEmptyState("No matching exchange programs found."));
    return;
  }

  programResults.replaceChildren(
    ...matches.map((program) => {
      const item = document.createElement("article");
      item.className = "finder-result";
      const id = `program:${program.name || ""}:${program.city || ""}:${program.country || ""}`;

      const name = document.createElement("strong");
      name.textContent = program.name || "Unnamed program";

      const location = document.createElement("span");
      location.textContent = [program.city, program.country, program.region].filter(Boolean).join(" - ");

      const actions = document.createElement("div");
      actions.className = "result-actions";
      actions.append(
        createExchangeActionButton(
          "Add",
          id,
          program.name || "Unnamed program",
          location.textContent || "No location"
        )
      );

      item.append(name, location, actions);
      return item;
    })
  );
}

function handleProgramResultClick(event) {
  const button = event.target.closest("button[data-action='add-exchange']");

  if (!button) {
    return;
  }

  addExchangePreference({
    id: button.dataset.id,
    title: button.dataset.title,
    label: button.dataset.label
  });
}

function addExchangePreference(item) {
  if (exchangePreferences.length >= MAX_EXCHANGE_PREFERENCES) {
    return;
  }

  if (exchangePreferences.some((preference) => preference.id === item.id)) {
    return;
  }

  exchangePreferences.push({
    ...item,
    slotId: `${item.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  });

  saveExchangePreferences();
  renderExchangePreferences();
  renderProgramResults();
}

function handleExchangePreferenceClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const index = exchangePreferences.findIndex((item) => item.slotId === id);
  const preference = exchangePreferences[index];

  if (!preference) {
    return;
  }

  if (button.dataset.action === "remove") {
    exchangePreferences.splice(index, 1);
  }

  if (button.dataset.action === "up" && index > 0) {
    [exchangePreferences[index - 1], exchangePreferences[index]] = [
      exchangePreferences[index],
      exchangePreferences[index - 1]
    ];
  }

  if (button.dataset.action === "down" && index < exchangePreferences.length - 1) {
    [exchangePreferences[index], exchangePreferences[index + 1]] = [
      exchangePreferences[index + 1],
      exchangePreferences[index]
    ];
  }

  saveExchangePreferences();
  renderExchangePreferences();
  renderProgramResults();
}

function renderExchangePreferences() {
  const total = exchangePreferences.length;
  exchangePreferenceCount.textContent = `${total} / ${MAX_EXCHANGE_PREFERENCES} selected`;
  clearExchangePreferencesButton.disabled = total === 0;

  exchangePreferenceList.replaceChildren(
    ...Array.from({ length: MAX_EXCHANGE_PREFERENCES }, (_, index) => {
      const preference = exchangePreferences[index];
      const item = document.createElement("article");
      item.className = `preference-item exchange ${preference ? "" : "empty"}`;

      const rank = document.createElement("strong");
      rank.className = "preference-rank";
      rank.textContent = String(index + 1);

      const text = document.createElement("div");
      text.className = "preference-text";

      const title = document.createElement("strong");
      title.textContent = preference?.title || "Empty exchange preference";

      const label = document.createElement("span");
      label.textContent = preference?.label || "Add a program from the exchange search results.";

      text.append(title, label);

      const actions = document.createElement("div");
      actions.className = "preference-actions";

      if (preference) {
        actions.append(
          createPreferenceButton("↑", "up", preference.slotId, index === 0, "Move up"),
          createPreferenceButton(
            "↓",
            "down",
            preference.slotId,
            index === exchangePreferences.length - 1,
            "Move down"
          ),
          createPreferenceButton("×", "remove", preference.slotId, false, "Remove")
        );
      }

      item.append(rank, text, actions);
      return item;
    })
  );
}

function clearExchangePreferences() {
  exchangePreferences = [];
  saveExchangePreferences();
  renderExchangePreferences();
  renderProgramResults();
}

function createExchangeActionButton(text, id, title, label) {
  const button = document.createElement("button");
  const existing = exchangePreferences.some((preference) => preference.id === id);

  button.type = "button";
  button.className = "small-button";
  button.textContent = existing ? "Added" : text;
  button.disabled = exchangePreferences.length >= MAX_EXCHANGE_PREFERENCES || existing;
  button.dataset.action = "add-exchange";
  button.dataset.id = id;
  button.dataset.title = title;
  button.dataset.label = label;
  return button;
}

function saveExchangePreferences() {
  localStorage.setItem(EXCHANGE_STORAGE_KEY, JSON.stringify(exchangePreferences));
}

function loadExchangePreferences() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EXCHANGE_STORAGE_KEY) || "[]");

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        id: String(item.id || ""),
        slotId: String(item.slotId || `${item.id || ""}:${Math.random().toString(36).slice(2)}`),
        title: String(item.title || ""),
        label: String(item.label || "")
      }))
      .filter((item) => item.id && item.title)
      .slice(0, MAX_EXCHANGE_PREFERENCES);
  } catch {
    return [];
  }
}

function createEmptyState(message) {
  const node = document.createElement("p");
  node.className = "empty-state";
  node.textContent = message;
  return node;
}
