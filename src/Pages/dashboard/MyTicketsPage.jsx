import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [assignees, setAssignees] = useState([]);

  useEffect(() => {
    console.log("=== MyTicketsPage loaded ===");
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([fetchTickets(), fetchDropdownData()]);
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("ticket").select("*").order("id", { ascending: false });
      if (error) throw error;
      console.log("✅ Tickets:", data);
      setTickets(data || []);
    } catch (error) {
      console.error("❌ Fetch tickets error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [catRes, statRes, assignRes] = await Promise.all([
        supabase.from("category_divisi").select("*"),
        supabase.from("status_ticket").select("*"),
        supabase.from("kasubag").select("*")
      ]);
      
      console.log("📋 Categories:", catRes.data);
      console.log("📋 Statuses:", statRes.data);
      console.log("📋 Assignees:", assignRes.data);
      
      setCategories(catRes.data || []);
      setStatuses(statRes.data || []);
      setAssignees(assignRes.data || []);
    } catch (error) {
      console.error("❌ Fetch dropdown error:", error);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const query = searchQuery.toLowerCase();
    return ticket.ticket_id?.toLowerCase().includes(query) || ticket.subject?.toLowerCase().includes(query);
  });

  const handleCreate = () => {
    setModalMode("create");
    setSelectedTicket(null);
    setShowModal(true);
  };

  const handleEdit = (ticket) => {
    setModalMode("edit");
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleView = (ticket) => {
    setModalMode("view");
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const handleDelete = async (ticketId) => {
    if (!confirm("Hapus tiket ini?")) return;
    try {
      const { error } = await supabase.from("ticket").delete().eq("id", ticketId);
      if (error) throw error;
      alert("Tiket berhasil dihapus!");
      fetchTickets();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Gagal menghapus: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader onCreateClick={handleCreate} />
      <SearchSection searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <MyTicketsTable tickets={filteredTickets} loading={loading} onEdit={handleEdit} onView={handleView} onDelete={handleDelete} />
      {showModal && (
        <TicketModal
          mode={modalMode}
          ticket={selectedTicket}
          categories={categories}
          statuses={statuses}
          assignees={assignees}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}

function PageHeader({ onCreateClick }) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">My Tickets</h1>
        <p className="text-sm text-slate-500 mt-1">View and manage tickets you've created</p>
      </div>
      <button onClick={onCreateClick} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Ticket
      </button>
    </header>
  );
}

function SearchSection({ searchQuery, setSearchQuery }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="relative max-w-xl">
        <input
          type="text"
          placeholder="Search your tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <svg className="absolute left-3 top-3 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}

function MyTicketsTable({ tickets, loading, onEdit, onView, onDelete }) {
  if (loading) return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-slate-600">Loading...</p>
    </div>
  );

  if (tickets.length === 0) return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
      <p className="text-slate-600">No tickets found</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Ticket ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <span onClick={() => onView(ticket)} className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
                    {ticket.ticket_id || "-"}
                  </span>
                </td>
                <td className="px-6 py-4"><span className="text-sm text-slate-900">{ticket.subject || "-"}</span></td>
                <td className="px-6 py-4"><span className="text-sm text-slate-700">ID: {ticket.category}</span></td>
                <td className="px-6 py-4"><span className="px-3 py-1 inline-flex text-xs font-medium rounded-full border bg-blue-100 text-blue-700 border-blue-200">ID: {ticket.status}</span></td>
                <td className="px-6 py-4"><span className="text-sm text-slate-700">ID: {ticket.assigned_to}</span></td>
                <td className="px-6 py-4"><span className="text-sm text-slate-600">{ticket.created_at ? new Date(ticket.created_at).toLocaleString("id-ID") : "-"}</span></td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(ticket)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => onDelete(ticket.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t border-slate-200"><span className="text-sm text-slate-600">Showing {tickets.length} tickets</span></div>
    </div>
  );
}

function TicketModal({ mode, ticket, categories, statuses, assignees, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    subject: ticket?.subject || "",
    category: ticket?.category || "",
    status: ticket?.status || "",
    assigned_to: ticket?.assigned_to || ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === "view") return;
    if (!formData.subject || !formData.category || !formData.status) {
      alert("Lengkapi field Subject, Category, dan Status!");
      return;
    }
    try {
      setSubmitting(true);
      if (mode === "create") {
        const { error } = await supabase.from("ticket").insert([formData]);
        if (error) throw error;
        alert("Tiket berhasil dibuat!");
      } else if (mode === "edit") {
        const { error } = await supabase.from("ticket").update(formData).eq("id", ticket.id);
        if (error) throw error;
        alert("Tiket berhasil diupdate!");
      }
      onSuccess();
    } catch (error) {
      console.error("Save error:", error);
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = mode === "view";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{mode === "create" ? "Create New Ticket" : mode === "edit" ? "Edit Ticket" : "Ticket Details"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {ticket && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ticket ID</label>
              <input type="text" value={ticket.ticket_id || "-"} disabled className="w-full px-3 py-2 border rounded-lg bg-slate-50" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject <span className="text-red-500">*</span></label>
            <input type="text" name="subject" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} disabled={isReadOnly} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50" placeholder="Enter subject" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
            <select name="category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} disabled={isReadOnly} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
              <option value="">Select Category</option>
              {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.nama_divisi}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-red-500">*</span></label>
            <select name="status" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} disabled={isReadOnly} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
              <option value="">Select Status</option>
              {statuses.map((status) => (<option key={status.id} value={status.id}>{status.nama_status}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
            <select name="assigned_to" value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} disabled={isReadOnly} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
              <option value="">Select Assignee</option>
              {assignees.map((assignee) => (<option key={assignee.id} value={assignee.id}>{assignee.nama}</option>))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-slate-50">{isReadOnly ? "Close" : "Cancel"}</button>
            {!isReadOnly && (<button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400">{submitting ? "Saving..." : mode === "create" ? "Create" : "Update"}</button>)}
          </div>
        </form>
      </div>
    </div>
  );
}
