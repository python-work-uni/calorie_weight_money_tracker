import { formatKcal } from '../../lib/format'

type Props = {
  consumed: number
  target: number | null
  size?: number
}

export default function ProgressRing({ consumed, target, size = 190 }: Props) {
  const stroke = 16
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  const hasTarget = target !== null && target > 0
  const ratio = hasTarget ? Math.min(consumed / target, 1) : 0
  const over = hasTarget && consumed > target
  const remaining = hasTarget ? target - consumed : null

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          {hasTarget ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={over ? '#dc2626' : '#0f172a'}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ratio)}
            />
          ) : null}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums">
            {Math.round(consumed).toLocaleString('en-AU')}
          </span>
          <span className="text-xs text-slate-500">kcal eaten</span>
        </div>
      </div>

      {/* The numbers are always present, so the ring is not the only way to read it. */}
      <p className="text-center text-sm text-slate-600">
        {remaining === null ? (
          <>No target set — add your height, date of birth and a weight in Profile.</>
        ) : over ? (
          <>
            <span className="font-medium text-red-600">{formatKcal(Math.abs(remaining))}</span> over
            your {formatKcal(target)} target
          </>
        ) : (
          <>
            <span className="font-medium">{formatKcal(remaining)}</span> left of {formatKcal(target)}
          </>
        )}
      </p>
    </div>
  )
}
