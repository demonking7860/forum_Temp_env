// TicketForm.js
import React, { useEffect, useRef, useState } from "react";
import { createTicket } from "../../api/graphqlClient";
import "./Ticket.css";

// Character limits
const TITLE_MAX_LENGTH = 100;
const MESSAGE_MAX_LENGTH = 1000;

const autosize = (el, min = 72, max = 200) => {
  if (!el) return;
  el.style.height = "auto";
  const next = Math.max(min, Math.min(el.scrollHeight, max));
  el.style.height = `${next}px`;
};

const TicketForm = ({ onCreated, onCancel, inline = false }) => {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const taRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => autosize(taRef.current), [text]);

  // Autofocus when mounted
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const canSubmit =
    title.trim().length > 0 &&
    text.trim().length > 0 &&
    title.length <= TITLE_MAX_LENGTH &&
    text.length <= MESSAGE_MAX_LENGTH &&
    !loading;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const created = await createTicket(title.trim(), text.trim());
      // Notify parent so Tickets.js can open detail view
      onCreated?.(created, text.trim());
      // Reset
      setTitle("");
      setText("");
      onCancel?.();
    } catch (err) {
      console.error("Failed to create ticket:", err);
      setError("❌ Failed to create ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    // Prevent input beyond the limit
    if (value.length <= TITLE_MAX_LENGTH) {
      setTitle(value);
    }
  };

  const handleTextChange = (e) => {
    const value = e.target.value;
    // Prevent input beyond the limit
    if (value.length <= MESSAGE_MAX_LENGTH) {
      setText(value);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" && (e.metaKey || e.ctrlKey)) && canSubmit) {
      e.preventDefault();
      handleCreate();
    }
  };

  // Helper function to get character counter color
  const getCounterColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return '#ef4444'; // red
    if (percentage >= 80) return '#f59e0b'; // yellow
    return '#10b981'; // green
  };

  return (
    <div
      className="ticket-card"
      style={{
        border: "none",
        boxShadow: "none",
        background: "transparent",
        padding: 0,
      }}
    >
      <div
        style={{
          border: "1px dashed var(--border)",
          padding: "0.75rem",
          borderRadius: "12px",
        }}
      >
        {!inline ? (
          <h4 className="pane-list__title" style={{ margin: 0, marginBottom: "0.5rem" }}>
            Create New Ticket
          </h4>
        ) : null}

        {error && <div className="error" style={{ marginBottom: "0.5rem" }}>{error}</div>}

        <div style={{ marginBottom: "0.5rem" }}>
          <input
            ref={titleRef}
            className="input"
            placeholder="Ticket title"
            value={title}
            onChange={handleTitleChange}
            disabled={loading}
            aria-label="Ticket title"
            maxLength={TITLE_MAX_LENGTH}
          />
          <div
            className="character-counter"
            style={{
              fontSize: '11px',
              color: getCounterColor(title.length, TITLE_MAX_LENGTH),
              textAlign: 'right',
              marginTop: '2px'
            }}
          >
            {title.length}/{TITLE_MAX_LENGTH}
          </div>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <textarea
            ref={taRef}
            className="textarea"
            placeholder="Describe your issue… (Ctrl/Cmd + Enter to create)"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
            aria-label="Ticket description"
            maxLength={MESSAGE_MAX_LENGTH}
          />
          <div
            className="character-counter"
            style={{
              fontSize: '11px',
              color: getCounterColor(text.length, MESSAGE_MAX_LENGTH),
              textAlign: 'right',
              marginTop: '2px'
            }}
          >
            {text.length}/{MESSAGE_MAX_LENGTH}
          </div>
        </div>

        <div className="composer-actions">
          {onCancel ? (
            <button className="btn" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          ) : null}
          <button
            className="btn primary"
            onClick={handleCreate}
            disabled={!canSubmit}
          >
            {loading ? "Creating…" : "Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketForm;
