export function ExploreTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <tbody className="divide-y divide-white/[0.04]">
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="">
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full skeleton shrink-0" />
              <div>
                <div className="h-3.5 skeleton rounded w-48 mb-1.5" />
                <div className="h-2.5 skeleton rounded w-72" />
              </div>
            </div>
          </td>
          <td className="hidden lg:table-cell px-4 py-4"><div className="h-5 skeleton rounded-full w-20" /></td>
          <td className="px-4 py-4"><div className="h-3 skeleton rounded w-10 mx-auto" /></td>
          <td className="hidden md:table-cell px-4 py-4"><div className="h-3 skeleton rounded w-8 mx-auto" /></td>
        </tr>
      ))}
    </tbody>
  );
}
