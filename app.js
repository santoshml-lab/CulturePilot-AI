const API_BASE_URL = "https://culturepilot-ai-agent.onrender.com";

const form = document.getElementById("cultureForm");
const interestsInput = document.getElementById("interests");
const result = document.getElementById("result");
const categoryButtons = document.querySelectorAll(".category");
const submitButton = form.querySelector('button[type="submit"]');


let selectedCategory = "Movies";

const agents = [
{
name: "Planner",
description: "Creates your discovery plan",
getStatus(data) {
const status = data?.plan?.status;

  return {
    status: status === "plan_created"
      ? "Plan created"
      : status || "Status unavailable",
    detail: data?.plan?.plan?.[0]?.task ||
      "Understands your interests and category.",
    state: status === "plan_created" ? "complete" : "waiting"
  };
}

},
{
name: "Researcher",
description: "Checks cultural data sources",
getStatus(data) {
const research = data?.research || {};
const waiting = research.status === "waiting_for_api_access";

  return {
    status: waiting
      ? "Waiting for Qloo API access"
      : research.status || "Status unavailable",
    detail: research.message || this.description,
    state: waiting ? "pending"
      : research.status ? "complete" : "waiting"
  };
}

},
{
name: "Recommender",
description: "Prepares relevant recommendations",
getStatus(data) {
const recommendation = data?.recommendation || {};
const waiting =
recommendation.recommendation_status === "awaiting_qloo_data";

  return {
    status: waiting
      ? "Awaiting cultural data"
      : recommendation.recommendation_status || "Status unavailable",
    detail: recommendation.message || this.description,
    state: waiting ? "pending"
      : recommendation.recommendation_status ? "complete" : "waiting"
  };
}

},
{
name: "Reviewer",
description: "Checks recommendation availability",
getStatus(data) {
const review = data?.review || {};
const waiting = review.review_status === "pending_data";

  return {
    status: waiting
      ? "Waiting for recommendation data"
      : review.review_status || "Status unavailable",
    detail: review.reason || this.description,
    state: waiting ? "pending"
      : review.approved === true ? "complete"
      : review.review_status ? "pending" : "waiting"
  };
}

},
{
name: "Executor",
description: "Returns the final result",
getStatus(data) {
const finalResult = data?.final_result || {};
const status = finalResult.status;

  return {
    status: status === "success"
      ? "Results ready"
      : status === "pending"
        ? "Results pending"
        : status || "Status unavailable",
    detail: finalResult.message || this.description,
    state: status === "success" ? "complete"
      : status === "pending" ? "pending"
      : status ? "error" : "waiting"
  };
}

}
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

function renderWorkflow(data = null, error = false, errorMessage = "") {
const heading = document.createElement("h3");
heading.textContent = error
? "Workflow Connection Issue"
: "CulturePilot Agent Workflow";

const intro = document.createElement("p");

if (error) {
intro.textContent =
"The backend request could not be completed. Please try again.";
} else if (data) {
intro.textContent =
  `Category: ${data.plan?.category || selectedCategory} · ` +
  `Interests: ${data.plan?.interests || interestsInput.value.trim()}`;


} else {
intro.textContent = "Preparing your five-agent discovery workflow...";
}

const list = document.createElement("div");
list.className = "agent-list";

agents.forEach((agent, index) => {
const card = document.createElement("div");
card.className = "agent-card";

const icon = document.createElement("span");
icon.className = "agent-icon";

const content = document.createElement("div");
content.className = "agent-content";

const title = document.createElement("strong");
title.textContent = `${index + 1}. ${agent.name}`;

const statusLine = document.createElement("p");
const detail = document.createElement("p");

let agentStatus = {
  status: "Waiting for workflow",
  detail: agent.description,
  state: "waiting"
};

if (error) {
  agentStatus = {
    status: "Status not confirmed",
    detail: "The request failed before the result could be verified.",
    state: "error"
  };
} else if (data) {
  agentStatus = agent.getStatus(data);
}

const symbols = {
  complete: "✓",
  pending: "⏳",
  waiting: "○",
  error: "!"
};

icon.textContent = symbols[agentStatus.state] || "○";
icon.classList.add(`status-${agentStatus.state}`);

statusLine.textContent = `Status: ${agentStatus.status}`;
detail.textContent = agentStatus.detail;

content.append(title, statusLine, detail);
card.append(icon, content);
list.appendChild(card);

});

const qloo = document.createElement("p");
qloo.className = "qloo-status";

if (error) {
  qloo.textContent = errorMessage
    ? `Request error: ${errorMessage}`
    : "Qloo status: Unable to verify.";
} else if (data?.plan?.qloo_connected === false) {
  qloo.textContent =
    "Qloo API: Access pending. Live cultural data and personalized " +
    "recommendations are not available yet.";
} else if (data?.plan?.qloo_connected === true) {
  qloo.textContent =
    `Qloo API: Connected. ${data?.final_result?.message || ""}`;
} else {
  qloo.textContent =
    "Qloo API status was not provided by the backend.";
}

result.replaceChildren(heading, intro, list, qloo);
result.classList.add("show");



  
   





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
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
interests,
category: selectedCategory
})
});

const data = await response.json();

if (!response.ok) {
  const message = typeof data.detail === "string"
    ? data.detail
    : "The backend request failed.";

  throw new Error(message);
}

renderWorkflow(data);
console.log("CulturePilot workflow:", data);

} catch (error) {
console.error("CulturePilot API error:", error);

renderWorkflow(
  null,
  true,
  error.message || "Please try again."
);

} finally {
submitButton.disabled = false;
submitButton.innerHTML =
'Explore My Taste <span aria-hidden="true">→</span>';
}
});
