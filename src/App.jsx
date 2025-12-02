// src/App.jsx
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

// Import pages & layout
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./Pages/LoginPage";

import DashboardLayout from "./Pages/dashboard/DashboardLayout";
import OverviewPage from "./Pages/dashboard/OverviewPage";
import DashboardTicketPage from "./Pages/dashboard/DashboardTicketPage";
import TicketingPage from "./Pages/dashboard/TicketingPage";
import AllTicketsPage from "./Pages/dashboard/AllTicketsPage";
import MyTicketsPage from "./Pages/dashboard/MyTicketsPage";
import CreateTicketPage from "./Pages/dashboard/CreateTicketPage";
import UsersPage from "./Pages/dashboard/UsersPage";
import SettingsPage from "./Pages/dashboard/SettingsPage";
import JadwalPage from "./Pages/dashboard/JadwalPage";
import RuanganPage from "./Pages/dashboard/RuanganPage";

// Router configuration
const router = createBrowserRouter([
  // Public Route
  {
    path: "/login",
    element: <LoginPage />,
  },

  // Protected Routes (harus login)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardLayout />,

        // Nested routes di dalam dashboard
        children: [
          { index: true, element: <DashboardTicketPage /> },      // /dashboard
          { path: "ticketing", element: <TicketingPage /> }, // /dashboard/ticketing
          { path: "tickets", element: <AllTicketsPage /> }, // /dashboard/tickets
          { path: "my-tickets", element: <MyTicketsPage /> }, // /dashboard/my-tickets
          { path: "create-ticket", element: <CreateTicketPage /> }, // /dashboard/create-ticket
          { path: "users", element: <UsersPage /> },       // /dashboard/users
          { path: "settings", element: <SettingsPage /> }, // /dashboard/settings
          { path: "jadwal", element: <JadwalPage /> },     // /dashboard/jadwal
          { path: "ruangan", element: <RuanganPage /> },   // /dashboard/ruangan
        ],
      },
    ],
  },

  // Redirect semua undefined routes
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
