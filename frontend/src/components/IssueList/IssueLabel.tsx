import { IssueLabelProps } from './types';
import { getLabelColors } from '../../features/dashboard/utils/filterUtils';

export const IssueLabel = ({ name, color }: IssueLabelProps) => (
  <span
    key={name}
    className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap max-w-[120px]"
    style={getLabelColors(color)}
    title={name}
  >
    <span className="truncate">
      {name.length > 20 ? `${name.slice(0, 20)}...` : name}
    </span>
  </span>
); 