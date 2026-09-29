import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Loader from "./components/common/Loader.jsx";

const Login = lazy(() => import("./features/auth/Login.jsx"));
const ForgotPassword = lazy(() => import("./features/auth/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./features/auth/ResetPassword.jsx"));

const OwnerDashboard = lazy(
  () => import("./features/owner/dashboard/Dashboard.jsx"),
);
const Buildings = lazy(() => import("./features/owner/buildings/Buildings.jsx"));
const BuildingDetails = lazy(
  () => import("./features/owner/buildings/BuildingDetails.jsx"),
);
const Caretaker = lazy(
  () => import("./features/owner/caretakers/Caretakers.jsx"),
);
const CaretakerDetails = lazy(
  () => import("./features/owner/caretakers/CaretakerDetails.jsx"),
);
const Tenants = lazy(() => import("./features/owner/tenants/Tenants.jsx"));
const TenantDetails = lazy(
  () => import("./features/owner/tenants/TenantDetails.jsx"),
);
const Revenue = lazy(() => import("./features/owner/revenue/Revenue.jsx"));
const Notifications = lazy(
  () => import("./features/owner/notifications/Notifications.jsx"),
);
const AddNotification = lazy(
  () => import("./features/owner/notifications/AddNotification.jsx"),
);
const Reports = lazy(() => import("./features/owner/reports/Reports.jsx"));
const OwnerSettings = lazy(() => import("./features/owner/Settings.jsx"));
const OwnerBills = lazy(
  () => import("./features/caretaker/bills/Bills.jsx"),
);
const AddOwnerBills = lazy(
  () => import("./features/caretaker/bills/AddBills.jsx"),
);

const AdminDashboard = lazy(
  () => import("./features/admin/dashboard/Dashboard.jsx"),
);
const Owners = lazy(() => import("./features/admin/owners/Owners.jsx"));
const OwnerDetails = lazy(
  () => import("./features/admin/owners/OwnerDetails.jsx"),
);
const AdminCaretakers = lazy(
  () => import("./features/admin/caretakers/Caretakers.jsx"),
);
const AdminCaretakerDetails = lazy(
  () => import("./features/admin/caretakers/CaretakerDetails.jsx"),
);
const AdminSettings = lazy(() => import("./features/admin/Settings.jsx"));
const SystemActivity = lazy(
  () => import("./features/admin/system/SystemActivity.jsx"),
);

const CaretakerDashboard = lazy(
  () => import("./features/caretaker/dashboard/Dashboard.jsx"),
);
const CaretakerReports = lazy(
  () => import("./features/caretaker/report/Report.jsx"),
);
const CaretakerTenants = lazy(
  () => import("./features/caretaker/tenants/Tenants.jsx"),
);
const CaretakerTenantDetails = lazy(
  () => import("./features/caretaker/tenants/TenantsDetails.jsx"),
);
const AddCaretakerTenant = lazy(
  () => import("./features/caretaker/tenants/AddTenants.jsx"),
);
const Units = lazy(() => import("./features/caretaker/units/Units.jsx"));
const AddUnit = lazy(() => import("./features/caretaker/units/AddUnit.jsx"));
const UnitDetail = lazy(
  () => import("./features/caretaker/units/UnitsDetail.jsx"),
);
const CaretakerBills = lazy(
  () => import("./features/caretaker/bills/Bills.jsx"),
);
const AddCaretakerBills = lazy(
  () => import("./features/caretaker/bills/AddBills.jsx"),
);
const Expenses = lazy(
  () => import("./features/caretaker/expenses/Expenses.jsx"),
);
const AddExpenses = lazy(
  () => import("./features/caretaker/expenses/AddExpense.jsx"),
);
const CaretakerPayments = lazy(
  () => import("./features/caretaker/payments/Payments.jsx"),
);
const CaretakerPaymentDetails = lazy(
  () => import("./features/caretaker/payments/PaymentDetails.jsx"),
);
const AddPayments = lazy(
  () => import("./features/caretaker/payments/AddPayments.jsx"),
);
const Announcements = lazy(
  () => import("./features/caretaker/annoncements/Announcements.jsx"),
);
const AddAnnouncements = lazy(
  () => import("./features/caretaker/annoncements/AddAnnouncements.jsx"),
);
const CaretakerSettings = lazy(
  () => import("./features/caretaker/Settings.jsx"),
);

const TenantRegister = lazy(
  () => import("./features/tenants/TenantRegister.jsx"),
);
const TenantBillPay = lazy(
  () => import("./features/tenants/TenantBillPay.jsx"),
);

// Layouts
import OwnerLayout from "./layouts/OwnerLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import CaretakerLayout from "./layouts/CaretakerLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<Loader label="Loading page…" />}>
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
        <Route path="bills" element={<OwnerBills />} />
        <Route path="bills/add" element={<AddOwnerBills />} />
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
        <Route path="bills" element={<CaretakerBills />} />
        <Route path="bills/add" element={<AddCaretakerBills />} />
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
    </Suspense>
  </BrowserRouter>
);

export default App;