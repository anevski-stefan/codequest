import { usePageTitle } from '../../hooks/usePageTitle';
import MyAssignedIssues from '../../components/MyAssignedIssues';

const AssignedIssuesPage = () => {
  usePageTitle('Assigned Issues');

  return (
    <div className="flex flex-col flex-1 dark:bg-[#0B1222] mt-8 p-4 md:p-6">
      <MyAssignedIssues />
    </div>
  );
};

export default AssignedIssuesPage; 