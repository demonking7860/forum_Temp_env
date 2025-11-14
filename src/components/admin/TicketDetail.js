// Ticket Detail Component
import React from "react";
import { ADMIN_STATUS_OPTIONS } from "./TicketUtils";
import { formatDateDivider, formatTime } from "../../utils/formatters";
import { retryFailedMessage } from "./OptimisticMessages";

const StatusControl = ({ ticketDetail, updatingStatus, onChangeStatus }) => (
  <div className="ticket_actions">
    <div className="status_segmented_control">
      <span className="status_label">Status:</span>
      <div className="segmented_buttons">
        {ADMIN_STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`segment_btn ${ticketDetail.status === option.value ? 'active' : ''} ${updatingStatus ? 'disabled' : ''}`}
            onClick={() => onChangeStatus(option.value)}
            disabled={updatingStatus}
            title={option.label}
          >
            {option.value === 'RESOLVED' ? '✓' : '✕'}
            <span className="segment_text">
              {option.value === 'RESOLVED' ? 'Resolved' : 'Closed'}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const MessageThread = ({ messages, threadRef, adminEmail, selectedId, setMessages }) => {
  if (messages.length === 0) {
    return <div className="empty_thread">No messages yet.</div>;
  }

  let lastDate = null;
  
  return messages.map((m, i) => {
    const isAdmin = m.senderType === "ADMIN";
    const currentDate = formatDateDivider(m.createdAt);
    const showDateDivider = currentDate !== lastDate;
    lastDate = currentDate;
    
    return (
      <React.Fragment key={m.createdAt || i}>
        {showDateDivider && (<div className="date-divider">{currentDate}</div>)}
        <div className={`msg ${isAdmin ? "me" : "admin"}`}>
          <div className="bubble-wrapper">
            <div className={`bubble ${isAdmin ? "me" : "admin"} ${m.status === "sending" ? "sending" : m.status === "failed" ? "failed" : ""}`}>
              <div className="text">{m.text}</div>
              <div className="time">
                {formatTime(m.createdAt)}
                {m.status === "sending" && <span className="status-indicator sending">✓</span>}
                {m.status === "failed" && <span className="status-indicator failed">Failed to send</span>}
              </div>
              {m.status === "failed" && (
                <button
                  className="retry-btn"
                  onClick={() => retryFailedMessage(messages, setMessages, m.id, selectedId, adminEmail)}
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
};

const ReplyForm = ({ replyText, setReplyText, onSendReply, sendingReply }) => (
  <form className="reply_box" onSubmit={onSendReply}>
    <div className="input_container">
      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onSendReply(e); }}
        placeholder="Type your reply… (Ctrl/Cmd + Enter to send)"
        disabled={sendingReply}
        rows={3}
        className={`reply_textarea ${replyText.trim() ? 'has_content' : ''}`}
      />
      <button 
        type="submit"
        className={`send_btn ${sendingReply ? 'sending' : ''} ${!replyText.trim() ? 'disabled' : ''}`}
        disabled={sendingReply || !replyText.trim()}
        title={sendingReply ? "Sending message..." : "Send message (Ctrl/Cmd + Enter)"}
      >
        {sendingReply ? (
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
  </form>
);

const TicketDetail = ({ 
  selectedId, 
  setSelectedId, 
  ticketDetail, 
  messages, 
  setMessages,
  loadingDetail, 
  detailError, 
  updatingStatus, 
  onChangeStatus, 
  replyText, 
  setReplyText, 
  onSendReply, 
  sendingReply,
  threadRef,
  detailPanelRef,
  adminEmail,
  isMobile 
}) => {
  if (!selectedId) {
    return (
      <div className={`tickets_detail_panel ${!isMobile && !selectedId ? 'hidden-desktop' : ''} ${isMobile && !selectedId ? 'hidden-mobile' : ''}`}>
        <div className="empty_detail">Select a ticket to view details.</div>
      </div>
    );
  }

  if (loadingDetail) {
    return (
      <div className="tickets_detail_panel" ref={detailPanelRef}>
        <div className="loading_detail">Loading...</div>
      </div>
    );
  }

  if (detailError) {
    return (
      <div className="tickets_detail_panel" ref={detailPanelRef}>
        <div className="error">{detailError}</div>
      </div>
    );
  }

  if (!ticketDetail) {
    return null;
  }

  return (
    <div className={`tickets_detail_panel ${!isMobile && !selectedId ? 'hidden-desktop' : ''} ${isMobile && !selectedId ? 'hidden-mobile' : ''}`} ref={detailPanelRef}>
      <div className="ticket_header">
        <div className="ticket_title_block">
          <div className="back-button-container">
            <button
              className="back-btn"
              onClick={() => setSelectedId(null)}
            >
              ← Back
            </button>
            <h3 className="ticket_title">{ticketDetail.title}</h3>
          </div>
          <div className="ticket_meta">
            <span>{ticketDetail.username || ticketDetail.email}</span>
          </div>
        </div>
        <StatusControl 
          ticketDetail={ticketDetail} 
          updatingStatus={updatingStatus} 
          onChangeStatus={onChangeStatus} 
        />
      </div>

      <div className="messages_thread messages" ref={threadRef}>
        <MessageThread 
          messages={messages} 
          threadRef={threadRef} 
          adminEmail={adminEmail} 
          selectedId={selectedId} 
          setMessages={setMessages} 
        />
      </div>

      {ticketDetail.status === "CLOSED" ? (
        <div className="closed_banner">This ticket is closed.</div>
      ) : (
        <ReplyForm 
          replyText={replyText} 
          setReplyText={setReplyText} 
          onSendReply={onSendReply} 
          sendingReply={sendingReply} 
        />
      )}
    </div>
  );
};

export default TicketDetail;
