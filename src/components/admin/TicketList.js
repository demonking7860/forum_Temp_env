// Ticket List Component
import React from "react";
import { StatusBadge } from "./TicketUtils";
import { formatListDate } from "../../utils/formatters";

const SearchBox = ({ query, setQuery }) => (
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
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tickets..."
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("");
          }
        }}
      />
      {query && (
        <button
          className="search_clear_btn"
          onClick={() => setQuery("")}
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
);

const StatusFilter = ({ statusFilter, setStatusFilter, statusOptions }) => (
  <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
    {statusOptions.map((s) => (
      <option key={s} value={s}>
        {s === "ANY" ? "Any Status" : s.replace("_", " ")}
      </option>
    ))}
  </select>
);

const TicketList = ({ 
  tickets, 
  selectedId, 
  onTicketSelect, 
  query, 
  setQuery, 
  statusFilter, 
  setStatusFilter, 
  statusOptions,
  loadingList,
  listError,
  isMobile 
}) => {
  return (
    <div className={`tickets_list_panel ${selectedId ? (!isMobile ? "hidden-desktop" : "") : ""} ${isMobile && selectedId ? 'hidden-mobile' : ''}`}>
      <div className="tickets_list_header">
        <h2>Tickets</h2>
        <div className="tickets_controls">
          <SearchBox query={query} setQuery={setQuery} />
          <StatusFilter 
            statusFilter={statusFilter} 
            setStatusFilter={setStatusFilter} 
            statusOptions={statusOptions} 
          />
        </div>
      </div>
      
      {listError && <div className="error">{listError}</div>}
      
      <div className="tickets_table">
        <div className="tickets_table_head">
          <div>Status</div>
          <div>Title</div>
          <div>Updated</div>
        </div>
        <div className="tickets_table_body">
          {tickets.map((t) => (
            <div
              key={t.ticketId}
              className={`tickets_row ${t.ticketId === selectedId ? "active" : ""}`}
              onClick={() => onTicketSelect(t.ticketId)}
            >
              <div><StatusBadge status={t.status} /></div>
              <div className="tickets_title">{t.title || "-"}</div>
              <div className="tickets_date">{formatListDate(t.updatedAt)}</div>
            </div>
          ))}
          {!loadingList && tickets.length === 0 && (
            <div className="empty_state">No tickets found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketList;
