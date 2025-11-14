import React, { useRef, useEffect } from "react";
import "./TicketManagementPanel.css";
import "../admin/Admin.css";
import { STATUS_OPTIONS } from "./TicketUtils";
import { useTicketManagement } from "./useTicketManagement";
import TicketList from "./TicketList";
import TicketDetail from "./TicketDetail";

/** ------------- Main Component ------------- */
function TicketManagementPanel(props) {
  const threadRef = useRef(null);
  const detailPanelRef = useRef(null);

  // Use custom hook for all ticket management logic
  const ticketState = useTicketManagement(props);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [ticketState.messages]);

  // Scroll to detail panel on mobile
  useEffect(() => {
    if (!detailPanelRef.current || !ticketState.selectedId) return;
    if (window.innerWidth <= 1024) {
      detailPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [ticketState.selectedId]);

  return (
    <div className={`tickets_root ${ticketState.selectedId && !ticketState.isMobile ? "ticket-selected" : ""}`}>
      <TicketList
        tickets={ticketState.tickets}
        selectedId={ticketState.selectedId}
        onTicketSelect={ticketState.setSelectedId}
        query={ticketState.query}
        setQuery={ticketState.setQuery}
        statusFilter={ticketState.statusFilter}
        setStatusFilter={ticketState.setStatusFilter}
        statusOptions={STATUS_OPTIONS}
        loadingList={ticketState.loadingList}
        listError={ticketState.listError}
        isMobile={ticketState.isMobile}
      />

      <TicketDetail
        selectedId={ticketState.selectedId}
        setSelectedId={ticketState.setSelectedId}
        ticketDetail={ticketState.ticketDetail}
        messages={ticketState.messages}
        setMessages={ticketState.setMessages}
        loadingDetail={ticketState.loadingDetail}
        detailError={ticketState.detailError}
        updatingStatus={ticketState.updatingStatus}
        onChangeStatus={ticketState.onChangeStatus}
        replyText={ticketState.replyText}
        setReplyText={ticketState.setReplyText}
        onSendReply={ticketState.onSendReply}
        sendingReply={ticketState.sendingReply}
        threadRef={threadRef}
        detailPanelRef={detailPanelRef}
        adminEmail={ticketState.adminEmail}
        isMobile={ticketState.isMobile}
      />
    </div>
  );
}

export default TicketManagementPanel;