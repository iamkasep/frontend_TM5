/* eslint-disable react-refresh/only-export-components */
import { Navigate, createBrowserRouter } from 'react-router-dom'
import RequireRole from '@/components/layout/RequireRole'
import { useAuth } from '@/hooks/useAuth'

import Login from '@/pages/auth/Login'
import NotFound from '@/pages/shared/NotFound'
import SuperadminDashboard from '@/pages/superadmin/Dashboard'
import AdminDashboard from '@/pages/admin/Dashboard'
import DriverDashboard from '@/pages/driver/Dashboard'
import DriverNavigation from '@/pages/driver/Navigation'
import CustomerDashboard from '@/pages/customer/Dashboard'
import ShipmentsPage from '@/pages/shared/ShipmentsPage'
import ShipmentDetailPage from '@/pages/shared/ShipmentDetailPage'
import ShipmentFormPage from '@/pages/shared/ShipmentFormPage'
import EntityPage from '@/pages/shared/EntityPage'
import TrackingMonitorPage from '@/pages/shared/TrackingMonitorPage'
import TrackLookupPage from '@/pages/shared/TrackLookupPage'
import ReportsPage from '@/pages/shared/ReportsPage'
import SettingsPage from '@/pages/shared/SettingsPage'
import NotificationsPage from '@/pages/shared/NotificationsPage'
import ProofOfDeliveryPage from '@/pages/admin/ProofOfDeliveryPage'
import TripsPage from '@/pages/shared/TripsPage'
import TripDetailPage from '@/pages/shared/TripDetailPage'

function RootRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return null
  return <Navigate to={user ? `/${user.role}/dashboard` : '/login'} replace />
}

const common = [
  { index: true, element: <Navigate to="dashboard" replace /> },
]

const roleRoutes = {
  superadmin: [
    { path: 'dashboard', element: <SuperadminDashboard /> },
    { path: 'companies', element: <EntityPage entity="companies" /> },
    { path: 'admins', element: <EntityPage entity="admins" /> },
    { path: 'customers', element: <EntityPage entity="customers" /> },
    { path: 'drivers', element: <EntityPage entity="drivers" /> },
    { path: 'vendors', element: <EntityPage entity="vendors" /> },
    { path: 'vehicles', element: <EntityPage entity="vehicles" /> },
    { path: 'locations', element: <EntityPage entity="locations" /> },
    { path: 'shipments', element: <ShipmentsPage mode="all" /> },
    { path: 'shipments/:id', element: <ShipmentDetailPage /> },
    { path: 'tracking', element: <TrackingMonitorPage /> },
    { path: 'notifications', element: <NotificationsPage /> },
    { path: 'reports', element: <ReportsPage /> },
    { path: 'settings', element: <SettingsPage /> },
  ],
  admin: [
    { path: 'dashboard', element: <AdminDashboard /> },
    { path: 'trips', element: <TripsPage /> },
    { path: 'trips/:id', element: <TripDetailPage /> },
    { path: 'shipments', element: <ShipmentsPage mode="all" /> },
    { path: 'shipments/new', element: <ShipmentFormPage /> },
    { path: 'shipments/:id', element: <ShipmentDetailPage /> },
    { path: 'shipments/:id/edit', element: <ShipmentFormPage /> },
    { path: 'drivers', element: <EntityPage entity="drivers" /> },
    { path: 'customers', element: <EntityPage entity="customers" /> },
    { path: 'vendors', element: <EntityPage entity="vendors" /> },
    { path: 'vehicles', element: <EntityPage entity="vehicles" /> },
    { path: 'locations', element: <EntityPage entity="locations" /> },
    { path: 'tracking', element: <TrackingMonitorPage /> },
    { path: 'notifications', element: <NotificationsPage /> },
    { path: 'proof-of-delivery', element: <ProofOfDeliveryPage /> },
  ],
  driver: [
    { path: 'dashboard', element: <DriverDashboard /> },
    { path: 'shipments', element: <ShipmentsPage mode="active" /> },
    { path: 'shipments/:id', element: <ShipmentDetailPage /> },
    { path: 'navigation', element: <DriverNavigation /> },
    { path: 'history', element: <ShipmentsPage mode="history" /> },
  ],
  customer: [
    { path: 'dashboard', element: <CustomerDashboard /> },
    { path: 'shipments', element: <ShipmentsPage mode="all" /> },
    { path: 'shipments/:id', element: <ShipmentDetailPage /> },
    { path: 'track', element: <TrackLookupPage /> },
  ],
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <Login /> },
  ...Object.entries(roleRoutes).map(([role, children]) => ({
    path: `/${role}`,
    element: <RequireRole role={role} />,
    children: [...common, ...children],
  })),
  { path: '*', element: <NotFound /> },
])
