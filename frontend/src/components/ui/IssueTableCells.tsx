import { getLabelColors } from '../../features/dashboard/utils/filterUtils';

interface RepoCellProps {
  fullName: string | undefined;
  onClick: () => void;
}

export const RepoCellContent = ({ fullName, onClick }: RepoCellProps) => {
  const [owner, name] = (fullName ?? '').split('/');
  return (
    <button onClick={onClick} className="text-left w-full cursor-pointer group/repo">
      {owner && name ? (
        <div className="min-w-0">
          <p className="text-xs text-gray-600 truncate">{owner}/</p>
          <p className="text-xs font-medium text-gray-400 group-hover/repo:text-blue-400 transition-colors truncate leading-snug">{name}</p>
        </div>
      ) : (
        <span className="text-xs text-gray-600 truncate">{fullName}</span>
      )}
    </button>
  );
};

interface Label { name: string; color: string; }

interface LabelsCellProps {
  labels: Label[];
}

export const LabelsCellContent = ({ labels }: LabelsCellProps) => (
  <div className="flex flex-wrap gap-1">
    {labels.length > 0
      ? labels.slice(0, 2).map(label => (
        <span
          key={label.name}
          className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-md truncate max-w-[100px]"
          style={getLabelColors(label.color)}
          title={label.name}
        >
          {label.name}
        </span>
      ))
      : <span className="text-[10px] text-gray-700">—</span>}
    {labels.length > 2 && (
      <span className="text-[10px] text-gray-600">+{labels.length - 2}</span>
    )}
  </div>
);
