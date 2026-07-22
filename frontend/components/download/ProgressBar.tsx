interface Props {
  progress: number;
  label?: string;
}

export default function ProgressBar({ progress, label }: Props) {
  const pct = Math.round(progress * 100);
  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-[#64748b]">{label}</span>
          <span className="font-medium text-[#1677ff]">{pct}%</span>
        </div>
      )}
      <div className="h-2.5 overflow-hidden rounded-full bg-[#f0f1f2]">
        <div
          className="h-full rounded-full bg-[#1677ff] transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
