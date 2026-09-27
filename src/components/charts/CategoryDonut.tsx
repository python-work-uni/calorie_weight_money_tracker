import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryTotal } from '../../lib/calories'

type Props = {
  totals: CategoryTotal[]
}

export default function CategoryDonut({ totals }: Props) {
  const data = totals.map((total) => ({
    name: total.name,
    value: Math.round(total.kcal),
    color: total.color,
  }))

  const totalKcal = data.reduce((sum, slice) => sum + slice.value, 0)

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={2}
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${Math.round(Number(value))} kcal (${totalKcal > 0 ? Math.round((Number(value) / totalKcal) * 100) : 0}%)`,
              String(name),
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
