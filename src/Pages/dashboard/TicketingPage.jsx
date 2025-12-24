import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function TicketingPage() {
  return (
    <div className="space-y-6">
      <PageHeader />
      <StatsCards />
      <ChartsSection />
      <RecentTicketsTable />
    </div>
  );
}

// Header Component
function PageHeader() {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ticket management overview
        </p>
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder="Search tickets..."
          className="w-80 pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
    </header>
  );
}

// Stats Cards Component
function StatsCards() {
  const [stats, setStats] = useState({
    total: 1248,
    open: 156,
    inProgress: 89,
    resolved: 892,
    closed: 111,
  });

  const cards = [
    {
      title: 'Total Tickets',
      value: stats.total.toLocaleString(),
      change: '+12%',
      isPositive: true,
      color: 'blue',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
        </svg>
      ),
    },
    {
      title: 'Open',
      value: stats.open,
      change: '+5%',
      isPositive: true,
      color: 'yellow',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      change: '-3%',
      isPositive: false,
      color: 'purple',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      change: '+18%',
      isPositive: true,
      color: 'green',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: 'Closed',
      value: stats.closed,
      change: '+8%',
      isPositive: true,
      color: 'gray',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-600',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-600',
    green: 'bg-green-600',
    gray: 'bg-gray-600',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className={`${colorClasses[card.color]} rounded-xl p-3 text-white`}
            >
              {card.icon}
            </div>
            <div
              className={`flex items-center text-xs font-medium ${card.isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    card.isPositive
                      ? 'M5 10l7-7m0 0l7 7m-7-7v18'
                      : 'M19 14l-7 7m0 0l-7-7m7 7V3'
                  }
                />
              </svg>
              {card.change}
            </div>
          </div>
          <h3 className="text-slate-600 text-sm font-medium mb-1">
            {card.title}
          </h3>
          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// Charts Section Component
function ChartsSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TicketsPerWeekChart />
      <TicketTrendChart />
    </div>
  );
}

// Tickets per Week Chart (Bar Chart)
function TicketsPerWeekChart() {
  const weekData = [
    { week: 'Week 1', count: 45 },
    { week: 'Week 2', count: 52 },
    { week: 'Week 3', count: 48 },
    { week: 'Week 4', count: 62 },
    { week: 'Week 5', count: 55 },
    { week: 'Week 6', count: 70 },
    { week: 'Week 7', count: 58 },
  ];

  const maxCount = Math.max(...weekData.map((d) => d.count));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-6">
        Tickets per Week
      </h2>
      <div className="flex items-end justify-between h-64 gap-3">
        {weekData.map((data, index) => {
          const height = (data.count / maxCount) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full flex items-end"
                style={{ height: '200px' }}
              >
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-500 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-600 cursor-pointer relative group"
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded">
                    {data.count}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2">{data.week}</p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <div className="w-3 h-3 bg-blue-600 rounded"></div>
          <span>Tickets Count</span>
        </div>
        <div className="text-sm text-slate-600">
          Max: <span className="font-semibold text-slate-900">{maxCount}</span>
        </div>
      </div>
    </div>
  );
}

// Recent Tickets Table
function RecentTicketsTable() {
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
      subject: 'General inquiry about services',
      category: 'Support',
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
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Recent Tickets</h2>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          View all
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
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
    </div>
  );
}

// Ticket Trend Chart (Line Chart)
function TicketTrendChart() {
  const trendData = [
    { week: 'Week 1', count: 45 },
    { week: 'Week 2', count: 52 },
    { week: 'Week 3', count: 48 },
    { week: 'Week 4', count: 62 },
    { week: 'Week 5', count: 55 },
    { week: 'Week 6', count: 70 },
    { week: 'Week 7', count: 58 },
  ];

  const maxCount = Math.max(...trendData.map((d) => d.count));
  const minCount = Math.min(...trendData.map((d) => d.count));
  const range = maxCount - minCount;

  const calculateY = (count) => {
    const normalized = (count - minCount) / range;
    return 180 - normalized * 150;
  };

  const points = trendData.map((data, index) => {
    const x = 40 + index * 80;
    const y = calculateY(data.count);
    return { x, y, count: data.count };
  });

  const pathD = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prevPoint = points[index - 1];
      const cpX1 = prevPoint.x + 40;
      const cpX2 = point.x - 40;
      return `C ${cpX1} ${prevPoint.y}, ${cpX2} ${point.y}, ${point.x} ${point.y}`;
    })
    .join(' ');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-6">
        Ticket Trend
      </h2>
      <div className="relative">
        <svg
          width="100%"
          height="240"
          viewBox="0 0 600 240"
          className="overflow-visible"
        >
          {/* Grid lines */}
          <line
            x1="40"
            y1="30"
            x2="560"
            y2="30"
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <line
            x1="40"
            y1="105"
            x2="560"
            y2="105"
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <line
            x1="40"
            y1="180"
            x2="560"
            y2="180"
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="5,5"
          />

          {/* Y-axis labels */}
          <text x="20" y="35" fontSize="12" fill="#64748b" textAnchor="end">
            80
          </text>
          <text x="20" y="110" fontSize="12" fill="#64748b" textAnchor="end">
            60
          </text>
          <text x="20" y="185" fontSize="12" fill="#64748b" textAnchor="end">
            40
          </text>
          <text x="20" y="220" fontSize="12" fill="#64748b" textAnchor="end">
            0
          </text>

          {/* Line path */}
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="3"
                className="cursor-pointer hover:r-8 transition-all"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="#3b82f6"
                opacity="0"
                className="hover:opacity-20 transition-opacity cursor-pointer"
              />
            </g>
          ))}

          {/* X-axis labels */}
          {trendData.map((data, index) => (
            <text
              key={index}
              x={40 + index * 80}
              y="220"
              fontSize="12"
              fill="#64748b"
              textAnchor="middle"
            >
              {data.week}
            </text>
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          <span>Trend Line</span>
        </div>
        <div className="text-sm text-slate-600">
          Avg:{' '}
          <span className="font-semibold text-slate-900">
            {Math.round(
              trendData.reduce((sum, d) => sum + d.count, 0) / trendData.length
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
