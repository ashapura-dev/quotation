import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Placeholder } from "./pages/Placeholder";

const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Users = lazy(() => import("./pages/admin/Users").then((m) => ({ default: m.Users })));
const ContainerSizes = lazy(() => import("./pages/admin/ContainerSizes").then((m) => ({ default: m.ContainerSizes })));
const Clients = lazy(() => import("./pages/admin/Clients").then((m) => ({ default: m.Clients })));
const RateTemplates = lazy(() => import("./pages/admin/RateTemplates").then((m) => ({ default: m.RateTemplates })));
const PdfTemplates = lazy(() => import("./pages/admin/PdfTemplates").then((m) => ({ default: m.PdfTemplates })));
const Settings = lazy(() => import("./pages/admin/Settings").then((m) => ({ default: m.Settings })));
const QuotationList = lazy(() => import("./pages/quotations/QuotationList").then((m) => ({ default: m.QuotationList })));
const QuotationForm = lazy(() => import("./pages/quotations/QuotationForm").then((m) => ({ default: m.QuotationForm })));
const QuotationDetail = lazy(() => import("./pages/quotations/QuotationDetail").then((m) => ({ default: m.QuotationDetail })));
const InvoiceList = lazy(() => import("./pages/invoices/InvoiceList").then((m) => ({ default: m.InvoiceList })));
const InvoiceDetail = lazy(() => import("./pages/invoices/InvoiceDetail").then((m) => ({ default: m.InvoiceDetail })));

function withSuspense(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <Center h="60vh">
          <Loader />
        </Center>
      }
    >
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: withSuspense(<Dashboard />) },
          { path: "/quotations", element: withSuspense(<QuotationList />) },
          { path: "/quotations/new", element: withSuspense(<QuotationForm />) },
          { path: "/quotations/:id", element: withSuspense(<QuotationDetail />) },
          { path: "/quotations/:id/edit", element: withSuspense(<QuotationForm />) },
          { path: "/invoices", element: withSuspense(<InvoiceList />) },
          { path: "/invoices/:id", element: withSuspense(<InvoiceDetail />) },
          { path: "/profile", element: <Placeholder title="Profile" /> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["ADMIN"]} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: "/admin/users", element: withSuspense(<Users />) },
              { path: "/admin/container-sizes", element: withSuspense(<ContainerSizes />) },
              { path: "/admin/rate-templates", element: withSuspense(<RateTemplates />) },
              { path: "/admin/pdf-templates", element: withSuspense(<PdfTemplates />) },
              { path: "/admin/clients", element: withSuspense(<Clients />) },
              { path: "/admin/settings", element: withSuspense(<Settings />) },
            ],
          },
        ],
      },
    ],
  },
]);
