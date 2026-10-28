import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { statusChartData, dailyTrend } from '@/lib/stats'

export function StatusDonut({ summary }) {
  const data = statusChartData(summary)
  return (
    <Card>
      <CardHeader title="Distribusi status" subtitle={`${summary.total} pengiriman`} />
      <CardBody>
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <div className="h-48" role="img" aria-label="Diagram distribusi status pengiriman">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="none">
                  {data.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1.5 text-sm">
            {data.map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-ink-600"><span className="size-2.5 rounded-sm" style={{ background: d.color }} />{d.name}</span>
                <span className="font-bold text-ink-900">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardBody>
    </Card>
  )
}

export function TrendChart({ shipments, days = 7 }) {
  const data = dailyTrend(shipments, days)
  return (
    <Card>
      <CardHeader title="Pengiriman dibuat" subtitle={`${days} hari terakhir`} />
      <CardBody>
        <div className="h-48" role="img" aria-label="Grafik jumlah pengiriman dibuat per hari">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e6ebf1" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#536a83' }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#536a83' }} />
              <Tooltip cursor={{ fill: '#f4f6f9' }} />
              <Bar dataKey="total" name="Pengiriman" fill="#e5863c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
