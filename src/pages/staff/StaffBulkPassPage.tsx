import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StaffBulkPass from './StaffBulkPass';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function StaffBulkPassPage() {
  usePageTitle('Bulk Pass');
  const navigate = useNavigate();
  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <PageHeader title="Bulk Pass" />
      <div className="px-5 py-6 pb-28">
        <StaffBulkPass onBack={() => navigate(-1)} />
      </div>
    </div>
  );
}
