
const API_BASE_URL = "https://culturepilot-ai-agent.onrender.com";

const form = document.getElementById("cultureForm");
const interestsInput = document.getElementById("interests");
const result = document.getElementById("result");
const categoryButtons = document.querySelectorAll(".category");
const submitButton = form.querySelector('button[type="submit"]');

let selectedCategory = "Movies";

const agents = [
  ["Planner", "Creates your discovery plan"],
  ["Researcher", "Checks cultural data sources"],
  ["Recommender", "Prepares relevant recommendations"],
  ["Reviewer", "Checks recommendation availability"],
  ["Executor", "Returns the final result"]
];

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;

    categoryButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
  });
});

function renderWorkflow(data = null, error = false) {
  const researchStatus = data?.research?.status;
  const finalResult = data?.final_result || {};

  const heading = document.createElement("h3");
  heading.textContent = error
    ? "Connection issue"
    : "CulturePilot Agent Workflow";

  const intro = document.createElement("p");
  intro.textContent = error
    ? "We could not complete the request. Please try again."
    : "Your request has been processed by the agent workflow.";

  const list = document.createElement("div");
  list.className = "agent-list";

  agents.forEach(([name, description], index) => {
    const card = document.createElement("div");
    card.className = "agent-card";

    const icon = document.createElement("span");
    icon.className = "agent-icon";

    const content = document.createElement("div");
    content.className = "agent-content";

    const title = document.createElement("strong");
    const detail = document.createElement("p");

    let status = "Waiting for workflow";
    let symbol = "○";
    let state = "waiting";

    if (error) {
      status = "Not confirmed";
      symbol = "!";
      state = "error";
    } else if (data) {
      if (index === 0) {
        status = "Plan created";
        symbol = "✓";
        state = "complete";
      } else if (index === 1) {
        const waiting = researchStatus === "waiting_for_api_access";
        status = waiting
          ? "Waiting for Qloo API access"
          : "Research status received";
        symbol = waiting ? "⏳" : "✓";
        state = waiting ? "pending" : "complete";
      } else if (index === 2) {
        status = "Request prepared";
        symbol = "✓";
        state = "complete";
      } else if (index === 3) {
        const waiting = data.review?.review_status === "pending_data";
        status = waiting
          ? "Waiting for recommendation data"
          : "Review status received";
        symbol = waiting ? "⏳" : "✓";
        state = waiting ? "pending" : "complete";
      } else {
        const success = finalResult.status === "success";
        status = success ? "Results ready" : "Workflow response returned";
        symbol = "✓";
        state = success ? "complete" : "pending";
      }
    }

    icon.textContent = symbol;
    icon.classList.add(`status-${state}`);

    title.textContent = `${index + 1}. ${name}`;
    detail.textContent = `${description} — ${status}`;

    content.append(title, detail);
    card.append(icon, content);
    list.appendChild(card);
  });

  const qloo = document.createElement("p");
  qloo.className = "qloo-status";

  qloo.textContent = error
    ? "Qloo status: Unable to verify"
    : researchStatus === "waiting_for_api_access"
      ? "Qloo API: Awaiting access — live cultural data is not connected yet."
      : "Qloo API: Check the research status above.";

  result.replaceChildren(heading, intro, list, qloo);
  result.classList.add("show");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const interests = interestsInput.value.trim();

  if (!interests) {
    interestsInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Running agents...";

  renderWorkflow();

  try {
    const response = await fetch(`${API_BASE_URL}/agent/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interests,
        category: selectedCategory
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "The backend request failed."
      );
    }

    renderWorkflow(data);
    console.log("CulturePilot workflow:", data);
  } catch (error) {
    console.error("CulturePilot API error:", error);
    renderWorkflow(null, true);

    const message = document.createElement("p");
    message.textContent = error.message;
    result.appendChild(message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML =
      'Explore My Taste <span aria-hidden="true">→</span>';
  }
});
