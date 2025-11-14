// Tickets.js
import React, { useCallback, useMemo, useState, useEffect, memo } from "react";
import TicketList from "./TicketList";
import TicketDetail from "./TicketDetail";
import "./Ticket.css";

/**
 * Responsive layout:
 * - Desktop: Split-pane layout (380px list + message detail)
 * - Mobile: Single pane layout with back button navigation
 */
const Tickets = () => {
  const [selected, setSelected] = useState(null); // {ticketId, title, status, optimisticFirstMessage?}
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Caching state for performance optimization
  const [ticketCache, setTicketCache] = useState(new Map());

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasDetail = useMemo(() => !!selected, [selected]);
  const showDetailOnMobile = useMemo(() =>
    isMobile && hasDetail, [isMobile, hasDetail]
  );

  // After a new ticket is created, select it and open on the right
  const handleCreated = useCallback((createdTicket, firstMessageText) => {
    if (!createdTicket?.ticketId) {
      // fallback refresh if API returned minimal shape
      setRefreshKey((k) => k + 1);
      return;
    }
    setSelected({
      ticketId: createdTicket.ticketId,
      title: createdTicket.title || "New Ticket",
      status: createdTicket.status || "OPEN",
      optimisticFirstMessage: firstMessageText || "",
    });

    // also nudge the list to refetch ordering/snippet
    setRefreshKey((k) => k + 1);
  }, []);

  const handleMessageSent = useCallback(() => {
    // refresh list so last snippet & updatedAt bubble up
    setRefreshKey((k) => k + 1);
  }, []);

  // Handle ticket selection
  const handleSelect = useCallback((ticket) => {
    setSelected({
      ticketId: ticket.ticketId,
      title: ticket.title,
      status: ticket.status,
    });
  }, []);

  return (
    <div className={`tickets-shell ${selected && !isMobile ? "ticket-selected" : ""}`}>
      <h2 className="tickets-heading">Your Tickets</h2>

      <div className={`tickets-grid ${hasDetail ? "has-detail" : ""} ${isMobile ? "mobile" : "desktop"}`}>
        {/* LEFT: ticket list with inline search */}
        <div className={`ticket-pane pane-list ${selected ? (!isMobile ? "hidden-desktop" : "collapsed") : ""} ${isMobile && showDetailOnMobile ? 'hidden-mobile' : ''}`}>
          <TicketList
            selectedId={selected?.ticketId || null}
            onSelect={handleSelect}
            onCreated={handleCreated}
            ticketCache={ticketCache}
            setTicketCache={setTicketCache}
            refreshKey={refreshKey}
          />
        </div>

        {/* RIGHT: messages */}
        {hasDetail ? (
          <div className={`ticket-pane pane-detail ${isMobile && !showDetailOnMobile ? 'hidden-mobile' : ''}`}>
            <TicketDetail
              ticketId={selected.ticketId}
              title={selected.title}
              status={selected.status} // <-- pass status
              optimisticFirstMessage={selected.optimisticFirstMessage}
              onBack={() => setSelected(null)}
              onMessageSent={handleMessageSent}
              ticketCache={ticketCache}
              setTicketCache={setTicketCache}
            />
          </div>
        ) : (
          <div className={`ticket-pane pane-detail detail-empty ${isMobile ? 'hidden-mobile' : ''}`}>
            <div>
              <h4>Select a ticket</h4>
              <p>Or use the "Raise" button to create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(Tickets);
