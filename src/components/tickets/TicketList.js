// TicketList.js
import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import TicketForm from "./TicketForm";
import { listMyTickets, getTicketMessages } from "../../api/graphqlClient"; // ✅ fixed import
import "./Ticket.css";

const TicketList = ({ onSelect, onCreated, selectedId, ticketCache, setTicketCache, refreshKey }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const scrollerRef = useRef(null);

  // Pre-load messages for top tickets to improve performance
  const preloadTopTickets = useCallback(async (tickets) => {
    if (!tickets || tickets.length === 0) return;

    const top3Tickets = tickets.slice(0, 3);

    // Pre-load messages for top 3 tickets (non-blocking, silent fail)
    Promise.allSettled(
      top3Tickets.map(async (ticket) => {
        const ticketId = ticket.ticketId;
        if (ticketCache.has(ticketId)) return; // Already cached

        try {
          const messages = await getTicketMessages(ticketId);
          setTicketCache(prev => new Map(prev).set(ticketId, {
            messages: messages || [],
            timestamp: Date.now()
          }));
        } catch (e) {
          // Silent fail for pre-loading to avoid disrupting user experience
          console.debug(`Pre-load failed for ticket ${ticketId}:`, e.message);
        }
      })
    );
  }, []); // ✅ Remove dependencies to prevent infinite loops

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMyTickets(); // ✅ use new function
      const ticketArray = Array.isArray(data) ? data : [];
      setTickets(ticketArray);

      // Pre-load messages for top 3 tickets after loading tickets
      if (ticketArray.length > 0) {
        preloadTopTickets(ticketArray);
      }
    } catch (e) {
      console.error("Failed to load tickets", e);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Remove dependencies to prevent infinite loops

  useEffect(() => {
    load();
  }, []); // ✅ Only run once on mount

  // Handle refreshKey changes without re-mounting
  useEffect(() => {
    if (refreshKey > 0) {
      load();
    }
  }, [refreshKey]); // ✅ Only reload when refreshKey changes

  const itemClass = (id) =>
    `ticket-item ${selectedId === id ? "selected" : ""}`;

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Filter and sort tickets based on status, search, and time
  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    // Apply status filter
    if (statusFilter === "IN_PROGRESS") {
      filtered = filtered.filter(t => t.status !== "CLOSED" && t.status !== "RESOLVED");
    } else if (statusFilter === "RESOLVED") {
      filtered = filtered.filter(t => t.status === "CLOSED" || t.status === "RESOLVED");
    }

    // Apply search filter
    if (debouncedQuery) {
      const query = debouncedQuery;
      filtered = filtered.filter(t => {
        const hay = [t.title || "", t.lastMessageSnippet || ""].join(" ").toLowerCase();
        return hay.includes(query);
      });
    }

    // Sort tickets: OPEN, IN_PROGRESS, RESOLVED, CLOSED, then by most recent first
    const statusPriority = {
      'OPEN': 1,
      'IN_PROGRESS': 2,
      'RESOLVED': 3,
      'CLOSED': 4
    };

    filtered.sort((a, b) => {
      // First, sort by status priority
      const aPriority = statusPriority[a.status] || 5; // Default to 5 if status not found
      const bPriority = statusPriority[b.status] || 5;

      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower priority number comes first
      }

      // If both have same status priority, sort by time (most recent first)
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime; // Most recent first
    });

    return filtered;
  }, [tickets, statusFilter, debouncedQuery]);

  const handleCreated = async (createdTicket, firstMessageText) => {
    if (createdTicket?.ticketId) {
      setTickets((prev) => [
        {
          ticketId: createdTicket.ticketId,
          title: createdTicket.title || "New Ticket",
          status: createdTicket.status || "OPEN",
          lastMessageSnippet:
            createdTicket.lastMessageSnippet || firstMessageText || "",
          updatedAt: createdTicket.updatedAt || new Date().toISOString(),
        },
        ...prev.filter((t) => t.ticketId !== createdTicket.ticketId),
      ]);
    }
    onCreated?.(createdTicket, firstMessageText);

    queueMicrotask(() => {
      try {
        scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
    });
  };

  const emptyState = useMemo(
    () =>
      !loading && filteredTickets.length === 0 ? (
        <div className="pane-list__section muted">
          {debouncedQuery
            ? `No tickets found matching "${debouncedQuery}".`
            : statusFilter === "ALL"
            ? "No tickets yet. Click + Raise to create one."
            : `No ${statusFilter === "IN_PROGRESS" ? "in progress" : "resolved"} tickets found.`
          }
        </div>
      ) : null,
    [loading, filteredTickets.length, statusFilter, debouncedQuery]
  );

  return (
    <>
      <div
        className="pane-list__section"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 className="pane-list__title">Tickets</h3>
        <div className="pane-controls">
          <div className="search_box">
            <div className="search_input_container">
              <div className="search_input_icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L16.5 16.5M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <input
                className="search_input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets..."
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                  }
                }}
              />
              {searchQuery && (
                <button
                  className="search_clear_btn"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="status-filter-container">
            <select
              id="userStatusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="user-status-filter"
            >
              <option value="ALL">All Tickets</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <button
            className="btn-icon primary"
            onClick={() => setComposerOpen((v) => !v)}
            title="Raise a ticket"
            aria-label="Raise a ticket"
          >
            + Raise
          </button>
          <button
            className="btn-icon"
            onClick={load}
            title="Refresh"
            aria-label="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Collapsible composer */}
      <div className={`composer ${composerOpen ? "open" : ""}`}>
        <TicketForm
          inline
          onCreated={handleCreated}
          onCancel={() => setComposerOpen(false)}
        />
      </div>

      {emptyState}

      {/* List */}
      <div ref={scrollerRef} className="ticket-list">
        {loading ? (
          <div className="muted" style={{ padding: "0.75rem 0.5rem" }}>
            Loading…
          </div>
        ) : (
          filteredTickets.map((t) => (
            <div
              key={t.ticketId}
              className={itemClass(t.ticketId)}
              onClick={() => onSelect?.(t)}
              role="button"
              tabIndex={0}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h4 className="ticket-title">
                  {t.title || "Untitled Ticket"}
                </h4>
                <span className={`status-badge ${t.status === 'CLOSED' ? 'resolved' : 'in-progress'}`}>
                  {t.status === 'CLOSED' ? 'Resolved' : 'In Progress'}
                </span>
              </div>
              <p className="ticket-meta">
                {new Date(t.updatedAt).toLocaleString()}
              </p>
              <p className="ticket-snippet">
                {t.lastMessageSnippet || "No messages yet"}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default memo(TicketList);
