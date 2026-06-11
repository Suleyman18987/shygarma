import DashboardLayout from '@/components/DashboardLayout'
import AIAssistant from '@/components/AIAssistant'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="teacher">
      {children}
      <AIAssistant />
    </DashboardLayout>
  )
}
