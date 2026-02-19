export function PhaseHealthBar({ pct }: { pct: number }) {
  const value = Math.min(100, Math.max(0, pct));
  const isGood = value >= 60;
  const isMid = value >= 40 && value < 60;
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-100/80 px-4 py-3 dark:border-stone-600 dark:bg-stone-700/80">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500 dark:text-stone-200">Health</span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${
              isGood ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-red-500'
            }`}
          />
          {Math.round(value)}%
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-600">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(to right, rgb(239 68 68), rgb(234 179 8), rgb(34 197 94))',
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-1 -translate-x-1/2 rounded-sm border border-stone-700 bg-stone-900 shadow-md dark:border-stone-300 dark:bg-white"
          style={{ left: `${value}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-stone-400 dark:text-stone-300">
        <span>Bad</span>
        <span>Good</span>
      </div>
    </div>
  );
}
