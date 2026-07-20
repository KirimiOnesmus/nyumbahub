import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth
import Login from "./features/auth/Login.jsx";
import ForgotPassword from "./features/auth/ForgotPassword.jsx";
import ResetPassword from "./features/auth/ResetPassword.jsx";

// Owner
import OwnerLayout from "./layouts/OwnerLayout.jsx";
import {
  OwnerDashboard,
  Buildings,
  BuildingDetails,
  Caretaker,
  CaretakerDetails,
  Tenants,
  TenantDetails,
  Revenue,
  Notifications,
  AddNotification,
  Reports,
  OwnerSettings,
} from "./features/owner/index.js";

// Admin
import AdminLayout from "./layouts/AdminLayout.jsx";
import {
  AdminDashboard,
  Owners,
  OwnerDetails,
  AdminCaretakers,
  AdminCaretakerDetails,
  AdminSettings,
  SystemActivity,
} from "./features/admin/index.js";

// Caretaker
import CaretakerLayout from "./layouts/CaretakerLayout.jsx";
import {
  CaretakerDashboard,
  CaretakerReports,
  CaretakerTenants,
  CaretakerTenantDetails,
  AddCaretakerTenant,
  Units,
  AddUnit,
  UnitDetail,
  Bills,
  AddBills,
  Expenses,
  AddExpenses,
  CaretakerPayments,
  CaretakerPaymentDetails,
  AddPayments,
  Announcements,
  AddAnnouncements,
  CaretakerSettings,
} from "./features/caretaker/index.js";

import { TenantRegister, TenantBillPay } from "./features/tenants/index.js";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="owners" element={<Owners />} />
        <Route path="owners/:id" element={<OwnerDetails />} />
        <Route path="caretakers" element={<AdminCaretakers />} />
        <Route path="caretakers/:id" element={<AdminCaretakerDetails />} />
        <Route path="activity" element={<SystemActivity />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route
        path="/owner"
        element={
          <ProtectedRoute role="owner">
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OwnerDashboard />} />
        <Route path="buildings" element={<Buildings />} />
        <Route path="buildings/:id" element={<BuildingDetails />} />
        <Route path="caretakers" element={<Caretaker />} />
        <Route path="caretakers/:id" element={<CaretakerDetails />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="tenants/:id" element={<TenantDetails />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="notifications/add" element={<AddNotification />} />
        <Route path="reports" element={<Reports />} />
        <Route path="bills" element={<Bills />} />
        <Route path="bills/add" element={<AddBills />} />
        <Route path="settings" element={<OwnerSettings />} />
      </Route>

      <Route
        path="/caretaker"
        element={
          <ProtectedRoute role="caretaker">
            <CaretakerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CaretakerDashboard />} />
        <Route path="tenants" element={<CaretakerTenants />} />
        <Route path="tenants/add" element={<AddCaretakerTenant />} />
        <Route path="tenants/:id" element={<CaretakerTenantDetails />} />
        <Route path="units" element={<Units />} />
        <Route path="units/add" element={<AddUnit />} />
        <Route path="units/:id" element={<UnitDetail />} />
        <Route path="bills" element={<Bills />} />
        <Route path="bills/add" element={<AddBills />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expenses/add" element={<AddExpenses />} />
        <Route path="expenses/:id" element={<AddExpenses />} />
        <Route path="payments" element={<CaretakerPayments />} />
        <Route path="payments/add" element={<AddPayments />} />
        <Route path="payments/:id" element={<CaretakerPaymentDetails />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="announcements/add" element={<AddAnnouncements />} />
        <Route path="reports" element={<CaretakerReports />} />
        <Route path="settings" element={<CaretakerSettings />} />
      </Route>

 
      <Route path="/register/:inviteToken" element={<TenantRegister />} />
      <Route path="/bill/:token" element={<TenantBillPay />} />

     
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;