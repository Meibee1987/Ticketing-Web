export default function AllTicketsPage() {
  return (
    <div className="space-y-6">
      <PageHeader />
      <FilterSection />
      <TicketsTable />
    </div>
  );
}

// Header Component
function PageHeader() {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">All Tickets</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage and track all support tickets
        </p>
      </div>
      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Create Ticket
      </button>
    </header>
  );
}

// Filter Section Component
function FilterSection() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tickets..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <select className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700">
          <option>All Status</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>

        <select className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700">
          <option>All Priority</option>
          <option>Urgent</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <select className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-700">
          <option>All Category</option>
          <option>IT</option>
          <option>Request</option>
          <option>Finance</option>
          <option>Bug</option>
          <option>General</option>
          <option>Support</option>
        </select>
      </div>
    </div>
  );
}

// Tickets Table Component
function TicketsTable() {
  const tickets = [
    {
      id: 'TKT-1247',
      subject: 'Cannot access VPN from home',
      category: 'IT',
      priority: 'High',
      status: 'Open',
      assignedTo: 'Sarah Johnson',
      createdAt: '2025-12-02 09:15',
    },
    {
      id: 'TKT-1246',
      subject: 'Request new laptop for employee',
      category: 'Request',
      priority: 'Medium',
      status: 'In Progress',
      assignedTo: 'Mike Chen',
      createdAt: '2025-12-02 08:30',
    },
    {
      id: 'TKT-1245',
      subject: 'Invoice payment issue',
      category: 'Finance',
      priority: 'Urgent',
      status: 'In Progress',
      assignedTo: 'Emily White',
      createdAt: '2025-12-01 16:45',
    },
    {
      id: 'TKT-1244',
      subject: 'Software bug in reporting module',
      category: 'Bug',
      priority: 'High',
      status: 'Resolved',
      assignedTo: 'David Lee',
      createdAt: '2025-12-01 14:20',
    },
    {
      id: 'TKT-1243',
      subject: 'General inquiry about policy',
      category: 'General',
      priority: 'Low',
      status: 'Closed',
      assignedTo: 'Anna Martinez',
      createdAt: '2025-12-01 11:00',
    },
  ];

  const priorityColors = {
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-blue-100 text-blue-700 border-blue-200',
    Urgent: 'bg-red-100 text-red-700 border-red-200',
    Low: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const statusColors = {
    Open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    Resolved: 'bg-green-100 text-green-700 border-green-200',
    Closed: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Ticket ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
                    {ticket.id}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-900">
                    {ticket.subject}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-700">
                    {ticket.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs font-medium rounded-full border ${priorityColors[ticket.priority]}`}
                  >
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs font-medium rounded-full border ${statusColors[ticket.status]}`}
                  >
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-700">
                    {ticket.assignedTo}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-slate-600">
                    {ticket.createdAt}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Showing <span className="font-medium">1</span> to{' '}
          <span className="font-medium">5</span> of{' '}
          <span className="font-medium">48</span> results
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
          >
            Previous
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium">
            1
          </button>
          <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            2
          </button>
          <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            3
          </button>
          <button className="px-3 py-1 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
