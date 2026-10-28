import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { GpsProvider } from '@/hooks/useGps'
import { ToastProvider } from '@/components/ui/Toast'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <GpsProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </GpsProvider>
    </AuthProvider>
  )
}
