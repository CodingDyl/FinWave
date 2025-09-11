// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./styles/globals.css";

import App from "./App";
import Dashboard from "./pages/Dashboard";
import Payouts from "./pages/Payouts";
import Beneficiaries from "./pages/Beneficiaries";
import ConnectedAccounts from "./pages/ConnectedAccounts";
import Settings from "./pages/Settings";

import { ToastProvider } from "./components/toast/ToastProvider";
import { LoadingProvider } from "./components/loading/GlobalLoading";

// NEW:
import { AuthProvider } from "./features/auth/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Resgister";
import { ErrorBoundary } from "./components/error/ErrorBoundary";
import RouteError from "./components/error/RouteError";

const router = createBrowserRouter([
  // Public auth routes
  { 
    path: "/login", 
    element: <Login />,
    errorElement: <RouteError />
  },
  { 
    path: "/register", 
    element: <Register />,
    errorElement: <RouteError />
  },

  // Protected app shell
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { 
        index: true, 
        element: <Dashboard />,
        errorElement: <RouteError />
      },
      { 
        path: "payouts", 
        element: <Payouts />,
        errorElement: <RouteError />
      },
      { 
        path: "beneficiaries", 
        element: <Beneficiaries />,
        errorElement: <RouteError />
      },
      { 
        path: "connected-accounts", 
        element: <ConnectedAccounts />,
        errorElement: <RouteError />
      },
      { 
        path: "settings", 
        element: <Settings />,
        errorElement: <RouteError />
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LoadingProvider>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </LoadingProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
