// Ticket Management Utilities
import React from "react";

// Constants
export const STATUS_OPTIONS = ["ANY", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export const ADMIN_STATUS_OPTIONS = [
  { value: "RESOLVED", label: "Resolved (User Satisfied)" },
  { value: "CLOSED", label: "Closed (User Not Satisfied)" }
];

// Status Badge Component
export function StatusBadge({ status }) {
  const statusMap = {
    OPEN: { label: "Open", className: "badge badge-open" },
    IN_PROGRESS: { label: "In Progress", className: "badge badge-inprogress" },
    RESOLVED: { label: "Resolved (User Satisfied)", className: "badge badge-resolved" },
    CLOSED: { label: "Closed (User Not Satisfied)", className: "badge badge-closed" },
  };
  
  const item = statusMap[status] || { label: status, className: "badge" };
  return <span className={item.className}>{item.label}</span>;
}

// Ticket sorting utility
export const sortTicketsByPriority = (tickets) => {
  const statusPriority = {
    'OPEN': 1,
    'IN_PROGRESS': 2,
    'RESOLVED': 3,
    'CLOSED': 4
  };

  return tickets.sort((a, b) => {
    const aPriority = statusPriority[a.status] || 5;
    const bPriority = statusPriority[b.status] || 5;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Sort by time (most recent first) if same status
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
};

// Filter tickets utility
export const filterTickets = (tickets, query, statusFilter) => {
  let filtered = tickets;

  // Apply search filter
  if (query) {
    const q = query.toLowerCase();
    filtered = tickets.filter((t) => {
      const searchText = [t.title || "", t.email || "", t.lastMessageSnippet || ""]
        .join(" ")
        .toLowerCase();
      return searchText.includes(q);
    });
  }

  // Apply status filter
  if (statusFilter !== "ANY") {
    filtered = filtered.filter((t) => t.status === statusFilter);
  }

  return sortTicketsByPriority(filtered);
};
