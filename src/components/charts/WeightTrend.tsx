import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDateShort, formatKg } from '../../lib/format'
import { buildSeries } from '../../lib/weight'
import type { WeightPoint } from '../../lib/weight'

type Props = {
  points: WeightPoint[]
  averageWindowDays?: number
  goalKg?: number | null
}

export default function WeightTrend({ points, averageWindowDays = 7, goalKg = null }: Props) {
  const data = buildSeries(points, averageWindowDays)

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        No weigh-ins in this range yet.
      </p>
    )
  }

  const weights = data.map((point) => point.weight)
  const lowest = Math.min(...weights, ...(goalKg == null ? [] : [goalKg]))
  const highest = Math.max(...weights)
  // Keep a little breathing room so the line never touches the frame.
  const padding = Math.max((highest - lowest) * 0.1, 0.5)

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fontSize: 12 }}
            minTickGap={28}
          />
          <YAxis
            domain={[lowest - padding, highest + padding]}
            tick={{ fontSize: 12 }}
            width={52}
            tickFormatter={(value) => Number(value).toFixed(1)}
          />
          <Tooltip
            formatter={(value, name) => [
              formatKg(Number(value)),
              name === 'average' ? `${averageWindowDays}-day average` : 'Weight',
            ]}
            labelFormatter={(label) => formatDateShort(String(label))}
          />
          <Legend
            formatter={(value) =>
              value === 'average' ? `${averageWindowDays}-day average` : 'Weight'
            }
          />
          <Line
            type="monotone"
            dataKey="weight"
            name="weight"
            stroke="#94a3b8"
            strokeWidth={1.5}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="average"
            name="average"
            stroke="#0f172a"
            strokeWidth={2.5}
            dot={false}
          />
          {goalKg != null ? (
            <ReferenceLine
              y={goalKg}
              stroke="#16a34a"
              strokeDasharray="4 4"
              label={{
                value: `Goal ${formatKg(goalKg)}`,
                position: 'insideTopRight',
                fontSize: 11,
                fill: '#16a34a',
              }}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
