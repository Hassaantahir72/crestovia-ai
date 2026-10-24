"use client";

const suggestions = [
  { icon: "✧", title: "Help me plan my week", description: "Turn priorities into a clear plan", prompt: "Help me plan my week. Ask me about my top priorities, deadlines, and available time, then create a practical plan." },
  { icon: "⌘", title: "Review my open tasks", description: "Find what needs attention", prompt: "Review my open workspace tasks, identify overdue or high-priority work, and recommend what I should focus on first." },
  { icon: "↗", title: "Create a new task", description: "Turn an idea into an action", prompt: "Help me create a workspace task. Ask for missing details such as title, owner, due date, and priority before creating it." }
];

export default function AgentPromptSuggestions() {
  function choosePrompt(prompt: string) {
    const input = document.getElementById("assistant-message");
    if (!(input instanceof HTMLTextAreaElement)) return;
    input.value = prompt;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  return <div className="agent-prompt-suggestions" aria-label="Suggested prompts">
    {suggestions.map((suggestion) => <button className="agent-prompt-card" key={suggestion.title} type="button" onClick={() => choosePrompt(suggestion.prompt)} aria-label={"Use prompt: " + suggestion.title}>
      <span aria-hidden="true">{suggestion.icon}</span><strong>{suggestion.title}</strong><small>{suggestion.description}</small>
    </button>)}
  </div>;
}
