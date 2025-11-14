// src/components/admin/AdminPanel.js
import React, { useState } from "react";
import "./Admin.css";

// ✅ Corrected import
import UserManagementPanel from "../UserManagementPanel"; 
import AdminTickets from "./AdminTickets";     

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="admin-panel">
      {/* 🔹 Header Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          User Management
        </button>
        <button
          className={`admin-tab ${activeTab === "tickets" ? "active" : ""}`}
          onClick={() => setActiveTab("tickets")}
        >
          Ticket System
        </button>
      </div>

      {/* 🔹 Tab Content */}
      <div className="admin-tab-content">
        {activeTab === "users" && <UserManagementPanel />}
        {activeTab === "tickets" && <AdminTickets />}
      </div>
    </div>
  );
};

export default AdminPanel;
