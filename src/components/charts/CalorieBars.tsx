import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDateShort } from '../../lib/format'

type Props = {
  data: { date: string; kcal: number }[]
  targetKcal: number | null
}

export default function CalorieBars({ data, targetKcal }: Props) {
  const peak = Math.max(...data.map((point) => point.kcal), targetKcal ?? 0)
  // Round the ceiling up so the bars never graze the top of the frame.
  const ceiling = Math.max(Math.ceil((peak * 1.1) / 100) * 100, 100)

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fontSize: 12 }}
            minTickGap={24}
          />
          <YAxis domain={[0, ceiling]} tick={{ fontSize: 12 }} width={52} />
          <Tooltip
            formatter={(value) => [`${Math.round(Number(value))} kcal`, 'Eaten']}
            labelFormatter={(label) => formatDateShort(String(label))}
          />
          {targetKcal !== null && targetKcal > 0 ? (
            <ReferenceLine
              y={targetKcal}
              stroke="#16a34a"
              strokeDasharray="4 4"
              label={{
                value: `Target ${Math.round(targetKcal)}`,
                position: 'insideTopRight',
                fontSize: 11,
                fill: '#16a34a',
              }}
            />
          ) : null}
          <Bar dataKey="kcal" radius={[3, 3, 0, 0]}>
            {data.map((point) => (
              <Cell
                key={point.date}
                // Over-target days are the ones worth spotting at a glance.
                fill={targetKcal !== null && point.kcal > targetKcal ? '#dc2626' : '#0f172a'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
