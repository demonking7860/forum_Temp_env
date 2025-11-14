// src/components/tickets/TicketSearch.js
import React, { useState, useEffect, useRef } from "react";
import { listMyTickets } from "../../api/graphqlClient";
import "./Ticket.css";

export default function TicketSearch({ onOpenTicket, onBack }) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      handleSearch();
    }, 300); // reduced to 300ms for faster response

    return () => clearTimeout(timeout);
  }, [keyword]);

  async function handleSearch() {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      // Fetch all tickets for this user
      const tickets = await listMyTickets();

      // Filter locally
      const q = keyword.toLowerCase();
      const filtered = tickets.filter((t) => {
        return (
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.lastMessageSnippet &&
            t.lastMessageSnippet.toLowerCase().includes(q))
        );
      });

      setResults(filtered);
    } catch (err) {
      console.error("❌ User ticket search failed", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const clearSearch = () => {
    setKeyword("");
    setResults([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      if (keyword.trim()) {
        clearSearch();
      } else {
        onBack();
      }
    }
  };

  return (
    <div className="ticket-card search-container">
      {/* Header with back button and title */}
      <div className="search-header">
        <button
          className="search-back-btn"
          onClick={onBack}
          aria-label="Go back to ticket list"
          title="Back to tickets"
        >
          <span className="back-icon">←</span>
          <span className="back-text">Back</span>
        </button>
        <h3 className="search-title">
          <span className="search-icon">🔍</span>
          Search Tickets
        </h3>
      </div>

      {/* Enhanced search input */}
      <div className="search-input-wrapper">
        <div className={`search-input-container ${isFocused ? 'focused' : ''} ${keyword ? 'has-value' : ''}`}>
          <div className="search-input-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L16.5 16.5M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search tickets by title or message..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            aria-label="Search tickets"
          />
          {keyword && (
            <button
              className="search-clear-btn"
              onClick={clearSearch}
              aria-label="Clear search"
              title="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {loading && (
            <div className="search-loading">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      </div>

      {/* Search results */}
      <div className="search-results-container">
        {!keyword.trim() && !loading && (
          <div className="search-empty-state">
            <div className="empty-icon">💬</div>
            <p className="empty-text">Start typing to search your tickets</p>
            <p className="empty-hint">Search by ticket title or message content</p>
          </div>
        )}

        {loading && keyword.trim() && (
          <div className="search-loading-state">
            <div className="loading-spinner large"></div>
            <p>Searching tickets...</p>
          </div>
        )}

        {results.length === 0 && !loading && keyword.trim() && (
          <div className="search-no-results">
            <div className="no-results-icon">🔍</div>
            <h4>No tickets found</h4>
            <p>Try different keywords or check your spelling</p>
            <button className="clear-search-btn" onClick={clearSearch}>
              Clear search
            </button>
          </div>
        )}

        {results.length > 0 && (
          <div className="search-results-count">
            Found {results.length} ticket{results.length !== 1 ? 's' : ''}
          </div>
        )}

        <ul className="search-results-list">
          {results.map((r, index) => (
            <li
              key={r.ticketId}
              className="search-result-item"
              onClick={() => onOpenTicket(r.ticketId)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="result-content">
                <div className="result-header">
                  <h4 className="result-title">{r.title || "Untitled Ticket"}</h4>
                  <span className={`result-status ${r.status === 'CLOSED' ? 'resolved' : 'in-progress'}`}>
                    {r.status === 'CLOSED' ? 'Resolved' : 'In Progress'}
                  </span>
                </div>
                <p className="result-meta">
                  Updated {new Date(r.updatedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                {r.lastMessageSnippet && (
                  <p className="result-snippet">
                    {r.lastMessageSnippet.length > 120
                      ? `${r.lastMessageSnippet.substring(0, 120)}...`
                      : r.lastMessageSnippet
                    }
                  </p>
                )}
              </div>
              <div className="result-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
