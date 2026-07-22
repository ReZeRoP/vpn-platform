import { Protected } from '@/components/protected';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export default function AdminPage() {
  return (
    <Protected admin>
      <AdminDashboard />
    </Protected>
  );
}
