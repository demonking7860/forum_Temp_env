// src/components/admin/AdminTickets.js
import React, { useState, useEffect, useRef } from "react";
import {
  adminListTickets,
  adminGetTicketMessages,
  adminAddTicketMessage,
  adminUpdateTicketStatus,
} from "../../api/graphqlClient";
import "./Admin.css";
import { formatTime } from "../../utils/formatters";

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newText, setNewText] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const messagesRef = useRef(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (messagesRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 10);
    }
  }, [messages]);

  /* ---------------- Load Tickets ---------------- */
  useEffect(() => {
    async function fetchTickets() {
      try {
        const data = await adminListTickets();
        setTickets(data);
      } catch (err) {
        console.error("❌ Failed to load tickets:", err);
      }
    }
    fetchTickets();
  }, []);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ---------------- Refresh Tickets ---------------- */
  async function refreshTickets() {
    try {
      const data = await adminListTickets();
      setTickets(data);
    } catch (err) {
      console.error("❌ Failed to refresh tickets:", err);
    }
  }

  /* ---------------- Load Messages ---------------- */
  async function openTicket(ticket) {
    console.log("🔄 Opening ticket:", ticket.ticketId, ticket.title);
    // Clear previous state immediately when opening a new ticket
    setMessages([]);
    setSelectedTicket(ticket);
    setLoading(true);
    setStatus(ticket.status || "OPEN");

    try {
      console.log("📡 Fetching messages for ticket:", ticket.ticketId);
      const msgs = await adminGetTicketMessages(ticket.ticketId);
      console.log("✅ Messages loaded:", msgs?.length || 0, "messages");
      setMessages(msgs || []);

      // Check if this is an existing OPEN ticket with admin replies that needs status update
      let ticketStatus = ticket.status || "OPEN";
      const hasAdminReplies = msgs.some(msg => msg.senderType === "ADMIN");

      if (ticketStatus === "OPEN" && hasAdminReplies) {
        console.log("🔄 Auto-updating OPEN ticket with admin replies to IN_PROGRESS");
        try {
          await adminUpdateTicketStatus(ticket.ticketId, "IN_PROGRESS");
          ticketStatus = "IN_PROGRESS";
          // Update selected ticket
          setSelectedTicket(prev => prev ? { ...prev, status: "IN_PROGRESS" } : null);
          // Refresh ticket list
          await refreshTickets();
        } catch (statusError) {
          console.warn("Failed to auto-update status to IN_PROGRESS:", statusError);
        }
      }

      setStatus(ticketStatus);
    } catch (err) {
      console.error("❌ Failed to load messages for ticket", ticket.ticketId, ":", err);
      // Reset selected ticket on error to prevent blank screen
      setSelectedTicket(null);
      setMessages([]);
      // Optionally show an error message to user
      alert(`Failed to load messages for ticket "${ticket.title}". Please try again.`);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Send Reply ---------------- */
  async function handleSend() {
    if (!newText.trim() || !selectedTicket || sending) return;

    const messageText = newText.trim();
    setNewText(""); // Clear input immediately

    // Create optimistic message
    const optimisticMessage = {
      sender: "admin",
      senderType: "ADMIN",
      text: messageText,
      createdAt: new Date().toISOString(),
      status: "sending",
      id: `temp-${Date.now()}`,
    };

    // Check if this is the first admin reply on an OPEN ticket
    const isFirstAdminReply = status === "OPEN" &&
      !messages.some(msg => msg.senderType === "ADMIN");

    // Immediately add to UI
    setMessages((prev) => [...prev, optimisticMessage]);
    setSending(true);

    try {
      const msg = await adminAddTicketMessage(selectedTicket.ticketId, messageText);

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id
            ? { ...msg, status: "sent" }
            : m
        )
      );

      // If this was the first admin reply on an OPEN ticket, change status to IN_PROGRESS
      if (isFirstAdminReply) {
        try {
          await adminUpdateTicketStatus(selectedTicket.ticketId, "IN_PROGRESS");
          setStatus("IN_PROGRESS");
          // Update local tickets state
          setTickets((prev) =>
            prev.map((t) =>
              t.ticketId === selectedTicket.ticketId
                ? { ...t, status: "IN_PROGRESS" }
                : t
            )
          );
          // Update selected ticket status
          setSelectedTicket(prev => prev ? { ...prev, status: "IN_PROGRESS" } : null);
        } catch (statusError) {
          console.warn("Failed to update status to IN_PROGRESS:", statusError);
          // Don't fail the whole operation if status update fails
        }
      }
    } catch (err) {
      console.error("❌ Failed to send message:", err);

      // Mark message as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id
            ? { ...m, status: "failed" }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }

  /* ---------------- Retry Failed Message ---------------- */
  async function handleRetry(messageId) {
    const messageToRetry = messages.find(m => m.id === messageId);
    if (!messageToRetry || messageToRetry.status !== "failed") return;

    // Mark as sending again
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, status: "sending" }
          : m
      )
    );

    try {
      const msg = await adminAddTicketMessage(selectedTicket.ticketId, messageToRetry.text);

      // Replace with successful message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...msg, status: "sent" }
            : m
        )
      );
    } catch (err) {
      console.error("❌ Failed to retry message:", err);
      // Keep as failed
    }
  }

  /* ---------------- Update Status ---------------- */
  async function handleStatusChange(e) {
    const newStatus = e.target.value;
    const originalStatus = status;
    setStatus(newStatus);
    try {
      await adminUpdateTicketStatus(selectedTicket.ticketId, newStatus);
      // Update local tickets state and refresh from server
      await refreshTickets();
    } catch (err) {
      console.error("❌ Failed to update status:", err);
      // Revert status on error
      setStatus(originalStatus);
    }
  }

  return (
    <div className={`admin-tickets-wrapper ${selectedTicket && !isMobile ? "ticket-selected" : ""}`}>
      {/* Left Pane: Ticket List */}
      <div className={`ticket-list-pane ${selectedTicket ? (!isMobile ? "hidden-desktop" : "collapsed") : ""} ${isMobile && selectedTicket ? 'hidden-mobile' : ''}`}>
        <h2 className="pane-title">
          <span className="pane-icon">🎫</span>
          All Tickets
        </h2>
        {tickets.length === 0 ? (
          <p>No tickets available.</p>
        ) : (
          <div className="ticket-list">
            {tickets.map((t) => (
              <div
                key={t.ticketId}
                className={`ticket-item ${
                  selectedTicket?.ticketId === t.ticketId ? "active" : ""
                }`}
                onClick={() => openTicket(t)}
              >
                <div className="ticket-header">
                  <strong>{t.title}</strong>
                  <span className={`status-badge ${t.status || "OPEN"}`}>
                    {t.status || "OPEN"}
                  </span>
                </div>
                <p className="snippet">{t.lastMessageSnippet}</p>
                <small>
                  {t.email} • {new Date(t.updatedAt).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Pane: Ticket Detail */}
      {selectedTicket && (
        <div className={`ticket-detail-pane ${isMobile && !selectedTicket ? 'hidden-mobile' : ''}`}>
          <div className="ticket-detail-header">
            <button onClick={() => setSelectedTicket(null)}>← Back</button>
            <h3>{selectedTicket.title}</h3>
            <select value={status} onChange={handleStatusChange}>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div ref={messagesRef} className="messages">
            {loading ? (
              <p>Loading messages...</p>
            ) : messages.length === 0 ? (
              <p>No messages yet.</p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={m.id || i}
                  className={`message-item ${
                    m.sender?.includes("admin") ? "admin-msg" : "user-msg"
                  } ${m.status === "sending" ? "sending" : m.status === "failed" ? "failed" : ""}`}
                >
                  <div className="msg-meta">
                    <strong>{m.sender}</strong> •{" "}
                    {formatTime(m.createdAt)}
                    {m.status === "sending" && <span className="status-indicator sending">✓</span>}
                    {m.status === "failed" && <span className="status-indicator failed">Failed to send</span>}
                  </div>
                  <div className="msg-text">{m.text}</div>
                  {m.status === "failed" && (
                    <button
                      className="retry-btn"
                      onClick={() => handleRetry(m.id)}
                      title="Retry sending message"
                    >
                      ↻
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="message-input">
            <div className="input_container">
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSend(); }}
                placeholder="Type a reply… (Ctrl/Cmd + Enter to send)"
                className={`reply_textarea ${newText.trim() ? 'has_content' : ''}`}
                disabled={sending}
                rows={3}
              />
              <button 
                onClick={handleSend}
                className={`send_btn ${sending ? 'sending' : ''} ${!newText.trim() ? 'disabled' : ''}`}
                disabled={sending || !newText.trim()}
                title={sending ? "Sending message..." : "Send message (Ctrl/Cmd + Enter)"}
              >
                {sending ? (
                  <div className="sending_spinner">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <>
                    <svg className="send_icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="send_text">Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTickets;
