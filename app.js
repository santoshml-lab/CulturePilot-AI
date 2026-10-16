
const API_BASE_URL = "https://culturepilot-ai-agent.onrender.com";

const form = document.getElementById("cultureForm");
const interestsInput = document.getElementById("interests");
const result = document.getElementById("result");
const categoryButtons = document.querySelectorAll(".category");
const submitButton = form.querySelector('button[type="submit"]');

let selectedCategory = "Movies";

// Five-agent workflow
const agents = [
  {
    name: "Planner",
    description: "Understands your interests and category.",
    getStatus(data) {
      const status = data?.plan?.status;

      return {
        status: status === "plan_created"
          ? "Plan created"
          : status || "Status unavailable",
        detail: data?.plan?.plan?.[0]?.task || this.description,
        state: status === "plan_created" ? "complete" : "waiting"
      };
    }
  },
  {
    name: "Researcher",
    description: "Retrieves cultural data from Qloo.",
    getStatus(data) {
      const research = data?.research || {};
      const status = research.status;

      return {
        status: status || "Status unavailable",
        detail: research.message || this.description,
        state: status === "success"
          ? "complete"
          : status
            ? "error"
            : "waiting"
      };
    }
  },
  {
    name: "Recommender",
    description: "Selects recommendations matching your interests.",
    getStatus(data) {
      const recommendation = data?.recommendation || {};
      const recommendations = recommendation.recommendations || [];
      const success =
        recommendation.recommendation_status === "success" &&
        recommendations.length > 0;

      return {
        status: success
          ? "success"
          : recommendation.recommendation_status || "Waiting for data",
        detail: recommendation.message || this.description,
        state: success
          ? "complete"
          : recommendations.length > 0
            ? "complete"
            : "pending"
      };
    }
  },
  {
    name: "Reviewer",
    description: "Checks recommendation availability.",
    getStatus(data) {
      const review = data?.review || {};

      return {
        status: review.review_status ||
          (review.approved === true ? "approved" : "Review complete"),
        detail: review.reason || this.description,
        state: review.approved === true ? "complete" : "pending"
      };
    }
  },
  {
    name: "Executor",
    description: "Returns the final recommendations.",
    getStatus(data) {
      const finalResult = data?.final_result || {};
      const recommendations =
        data?.recommendation?.recommendations || [];

      const success =
        finalResult.status === "success" &&
        recommendations.length > 0;

      return {
        status: success
          ? "Results ready"
          : finalResult.status || "Results pending",
        detail: finalResult.message || this.description,
        state: success ? "complete" : "pending"
      };
    }
  }
];

// Category selection
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

// Safely create a recommendation card


function createRecommendationCard(item) {
  const card = document.createElement("article");
  card.className = "recommendation-card";

  const title = document.createElement("h3");
  title.textContent = item.title || item.name || "Untitled recommendation";
  card.appendChild(title);

  // Display the real image returned by Qloo
  if (item.image_url && /^https?:\/\//i.test(item.image_url)) {
    const image = document.createElement("img");
    image.src = item.image_url;
    image.alt = `${title.textContent} image`;
    image.loading = "lazy";
    image.className = "recommendation-image";
    image.onerror = () => image.remove();
    card.appendChild(image);
  }

  if (typeof item.match_score === "number") {
    const score = document.createElement("p");
    score.className = "match-score";
    score.textContent = `Relevance score: ${item.match_score}/100`;
    card.appendChild(score);
  }

  if (item.match_reason) {
    const reason = document.createElement("p");
    reason.className = "match-reason";
    reason.textContent = item.match_reason;
    card.appendChild(reason);
  }

  const description = document.createElement("p");
  description.textContent =
    item.description ||
    item.plot_summary ||
    item.genre_description ||
    "No additional description available.";
  card.appendChild(description);

  if (item.source) {
    const source = document.createElement("small");
    source.textContent = `Source: ${item.source}`;
    card.appendChild(source);
  }

  return card;
}

  

  




// Display actual backend recommendations
function renderRecommendations(data) {
  const recommendations =
    data?.recommendation?.recommendations || [];

  const heading = document.createElement("h3");
  heading.textContent = "Your Cultural Recommendations";

  const section = document.createElement("section");
  section.className = "recommendation-results";

  const note = document.createElement("p");

  if (recommendations.length > 0) {
    const cards = document.createElement("div");
    cards.className = "agent-list";

    recommendations.forEach((item) => {
      cards.append(createRecommendationCard(item));
    });

    const source = data?.research?.source;

    note.textContent = source === "Qloo"
      ? `Showing ${recommendations.length} recommendations from the backend. Research source: Qloo.`
      : `Showing ${recommendations.length} recommendations returned by the backend.`;

    section.append(heading, note, cards);
  } else {
    note.textContent =
      "No recommendations were returned. Please try another interest or check the backend response.";

    section.append(heading, note);
  }

  result.append(section);
}

// Display workflow status
function renderWorkflow(data = null, error = false, errorMessage = "") {
  const heading = document.createElement("h3");

  heading.textContent = error
    ? "Workflow Connection Issue"
    : "CulturePilot Agent Workflow";

  const intro = document.createElement("p");

  if (error) {
    intro.textContent =
      "The backend request could not be completed.";
  } else if (data) {
    intro.textContent =
      `Category: ${data.plan?.category || selectedCategory} · ` +
      `Interests: ${data.plan?.interests || interestsInput.value.trim()}`;
  } else {
    intro.textContent =
      "Preparing your five-agent discovery workflow...";
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
        status: "Not confirmed",
        detail: "The request failed before this step could be verified.",
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
    list.append(card);
  });

  const qloo = document.createElement("p");
  qloo.className = "qloo-status";

  if (error) {
    qloo.textContent = `Request error: ${
      errorMessage || "Please try again."
    }`;
  } else if (data?.research?.status === "success") {
    qloo.textContent =
      data?.research?.source === "Qloo"
        ? "Research source: Qloo. Recommendations are shown below when available."
        : "Research completed. See the results below.";
  } else {
    qloo.textContent =
      "Live cultural data could not be confirmed. Check the research status.";
  }

  result.replaceChildren(heading, intro, list, qloo);
  result.classList.add("show");
}

// Submit recommendation request
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
    const response = await fetch(
      `${API_BASE_URL}/agent/recommend`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          interests,
          category: selectedCategory
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message = typeof data.detail === "string"
        ? data.detail
        : "The backend request failed.";

      throw new Error(message);
    }

    console.log("CulturePilot workflow:", data);

    renderWorkflow(data);
    renderRecommendations(data);

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





