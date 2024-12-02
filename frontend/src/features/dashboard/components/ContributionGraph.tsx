interface ContributionGraphProps {
  data: number[];
}

const ContributionGraph = ({ data }: ContributionGraphProps) => {
  const maxValue = Math.max(...data);

  return (
    <div className="flex items-end h-32 gap-1">
      {data.map((value, index) => {
        const height = value ? (value / maxValue) * 100 : 0;
        return (
          <div
            key={index}
            className="flex-1 bg-blue-100 rounded-t hover:bg-blue-200 transition-colors relative group"
            style={{ height: `${height}%` }}
          >
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {value} contributions
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContributionGraph; 