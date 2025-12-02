import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function MyTicketsPage() {
  return (
    <div className="space-y-6">
      <PageHeader />
      <SearchSection />
      <MyTicketsTable />
    </div>
  );
}

// Header Component
function PageHeader() {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-slate-800">My Tickets</h1>
      <p className="text-sm text-slate-500 mt-1">View and manage tickets you've created</p>
    </header>
  );
}

// Search Section Component
function SearchSection() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="relative max-w-xl">
        <input
          type="text"
          placeholder="Search your tickets..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}

// My Tickets Table Component
function MyTicketsTable() {
  const tickets = [
    {
      id: "TKT-1247",
      subject: "Cannot access VPN from home",
      category: "IT",
      priority: "High",
      status: "Open",
      assignedTo: "Sarah Johnson",
      createdAt: "2025-12-02 09:15"
    },
    {
      id: "TKT-1240",
      subject: "Budget approval needed",
      category: "Finance",
      priority: "High",
      status: "In Progress",
      assignedTo: "Emily White",
      createdAt: "2025-11-30 13:15"
    },
    {
      id: "TKT-1235",
      subject: "Request for additional monitor",
      category: "Request",
      priority: "Medium",
      status: "Resolved",
      assignedTo: "Mike Chen",
      createdAt: "2025-11-28 10:00"
    },
    {
      id: "TKT-1230",
      subject: "Password reset issue",
      category: "IT",
      priority: "Low",
      status: "Closed",
      assignedTo: "Sarah Johnson",
      createdAt: "2025-11-25 14:30"
    }
  ];

  const priorityColors = {
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Medium: "bg-blue-100 text-blue-700 border-blue-200",
    Urgent: "bg-red-100 text-red-700 border-red-200",
    Low: "bg-gray-100 text-gray-700 border-gray-200"
  };

  const statusColors = {
    Open: "bg-yellow-100 text-yellow-700 border-yellow-200",
    "In Progress": "bg-purple-100 text-purple-700 border-purple-200",
    Resolved: "bg-green-100 text-green-700 border-green-200",
    Closed: "bg-gray-100 text-gray-700 border-gray-200"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Ticket ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Created At</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
                    {ticket.id}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-900">{ticket.subject}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-700">{ticket.category}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-full border ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-full border ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-700">{ticket.assignedTo}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-600">{ticket.createdAt}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination or Footer */}
      <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Showing <span className="font-medium">{tickets.length}</span> tickets
        </div>
        <div className="text-sm text-slate-500">
          Total: {tickets.length} tickets
        </div>
      </div>
    </div>
  );
}
