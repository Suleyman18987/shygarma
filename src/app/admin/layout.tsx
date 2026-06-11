import DashboardLayout from '@/components/DashboardLayout'
import AIAssistant from '@/components/AIAssistant'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="admin">
      {children}
      <AIAssistant />
    </DashboardLayout>
  )
}
