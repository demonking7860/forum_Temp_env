// TicketDetail.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  getMyTicketMessages,
  addMessageToTicket,
} from "../../api/graphqlClient";
import "./Ticket.css";
import { fetchAuthSession } from "aws-amplify/auth";
import { formatDateDivider, formatTime } from "../../utils/formatters";


// --- Component ---

const TicketDetail = ({
  ticketId,
  title,
  status,
  optimisticFirstMessage,
  onBack,
  onMessageSent,
  ticketCache,
  setTicketCache,
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [userEmail, setUserEmail] = useState(null);

  const scrollerRef = useRef(null);

  // Background refresh function for stale data
  const fetchFreshData = useCallback(async () => {
    try {
      const data = await getMyTicketMessages(ticketId);
      const arr = Array.isArray(data) ? data : [];
      setTicketCache(prev => new Map(prev).set(ticketId, {
        messages: arr,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Silent background refresh failure
      console.debug(`Background refresh failed for ticket ${ticketId}:`, e.message);
    }
  }, [ticketId, setTicketCache]);

  // Get current user email
  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const email = session?.tokens?.idToken?.payload?.email || null;
        setUserEmail(email);
      } catch (e) {
        console.error("Failed to get user email", e);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!ticketId || !userEmail) return;

    // Check cache first
    if (ticketCache.has(ticketId)) {
      const cached = ticketCache.get(ticketId);
      setMessages(cached.messages);

      // Background refresh for stale data (older than 5 minutes)
      if (Date.now() - cached.timestamp > 300000) {
        fetchFreshData();
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getMyTicketMessages(ticketId);
      let arr = Array.isArray(data) ? data : [];

      // Update cache
      setTicketCache(prev => new Map(prev).set(ticketId, {
        messages: arr,
        timestamp: Date.now()
      }));

      // Handle optimistic message for newly created tickets
      if (optimisticFirstMessage && arr.length === 0) {
        arr = [
          {
            sender: userEmail,
            senderType: "USER",
            text: optimisticFirstMessage,
            createdAt: new Date().toISOString(),
          },
        ];
      }
      setMessages(arr);
    } catch (e) {
      console.error("Failed to load messages", e);
    } finally {
      setLoading(false);
    }
  }, [ticketId, userEmail, ticketCache, setTicketCache, optimisticFirstMessage, fetchFreshData]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollerRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
        }
      }, 10);
    }
  }, [messages]);


  async function handleSend() {
    if (!text.trim() || sending || !userEmail) return;

    const messageText = text.trim();
    setText(""); // Clear input immediately for better UX

    // Create optimistic message
    const optimisticMessage = {
      sender: userEmail,
      senderType: "USER",
      text: messageText,
      createdAt: new Date().toISOString(),
      status: "sending", // Add status for optimistic UI
      id: `temp-${Date.now()}`, // Temporary ID for tracking
    };

    // Immediately add to UI
    setMessages((prev) => [...prev, optimisticMessage]);
    setSending(true);

    try {
      const sent = await addMessageToTicket(ticketId, messageText);

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? { ...sent, status: "sent" }
            : msg
        )
      );
      onMessageSent?.();
    } catch (e) {
      console.error("Failed to send message", e);

      // Mark message as failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? { ...msg, status: "failed" }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  }

  async function handleRetry(messageId) {
    const messageToRetry = messages.find(m => m.id === messageId);
    if (!messageToRetry || messageToRetry.status !== "failed") return;

    // Mark as sending again
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, status: "sending" }
          : msg
      )
    );

    try {
      const sent = await addMessageToTicket(ticketId, messageToRetry.text);

      // Replace with successful message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...sent, status: "sent" }
            : msg
        )
      );
      onMessageSent?.();
    } catch (e) {
      console.error("Failed to retry message", e);
      // Keep as failed
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="ticket-card pane-detail">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h3 className="detail-title">{title}</h3>
        <span className={`status-badge ${status === 'CLOSED' ? 'resolved' : 'in-progress'}`}>{status === 'CLOSED' ? 'Resolved' : 'In Progress'}</span>
      </div>

      {/* Messages */}
      <div ref={scrollerRef} className="messages">
        {loading ? (
          <div className="muted" style={{padding: '1rem'}}>Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="muted" style={{padding: '1rem'}}>No messages yet.</div>
        ) : (
          (() => {
            let lastDate = null;

            return messages.map((m, i) => {
              const isMe = m.sender === userEmail;
              const senderLabel = isMe ? "You" : "Admin";
              
              const currentDate = formatDateDivider(m.createdAt);
              const showDateDivider = currentDate !== lastDate;
              // Show sender label if it's the first message or if the sender has changed
              const showSender = i === 0 || m.senderType !== messages[i - 1].senderType;

              lastDate = currentDate;

              return (
                <React.Fragment key={m.createdAt || i}>
                  {showDateDivider && (
                    <div className="date-divider">{currentDate}</div>
                  )}
                  <div className={`msg ${isMe ? "me" : "admin"}`}>
                    <div className="bubble-wrapper">
                      {showSender && (
                        <div className="sender-label">{senderLabel}</div>
                      )}
                      <div className={`bubble ${isMe ? "me" : "admin"} ${m.status === "sending" ? "sending" : m.status === "failed" ? "failed" : ""}`}>
                        <div className="text">{m.text}</div>
                        <div className="time">
                          {formatTime(m.createdAt)}
                          {m.status === "sending" && <span className="status-indicator sending">✓</span>}
                          {m.status === "failed" && <span className="status-indicator failed">Failed to send</span>}
                        </div>
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
                    </div>
                  </div>
                </React.Fragment>
              );
            });
          })()
        )}
      </div>

      {/* Footer */}
      {status === "CLOSED" || status === "RESOLVED" ? (
        <div className="closed-banner">
          This ticket is closed. No further replies allowed.
        </div>
      ) : (
        <div className="detail-composer">
          <div className="composer-row">
            <textarea
              className="textarea"
              placeholder="Type your message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={sending || !text.trim() || !userEmail}
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;