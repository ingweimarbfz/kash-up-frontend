import React from 'react'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { CHART, CHART_COLORS } from '../utils/brand'
import { formatMoney, formatShort } from '../utils/format'

const axis = { stroke: CHART.axis, fontSize: 12, tickLine: false, axisLine: false }
const tooltipStyle = { borderRadius: 10, border: '1px solid #E4E4E7', boxShadow: '0 8px 24px rgba(10,10,11,.12)', fontSize: 13 }

// Colocado vs. recaudado por mes.
export const FlowChart = ({ data, height = 280 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="gRecaudo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART.recaudo} stopOpacity={0.35} />
          <stop offset="100%" stopColor={CHART.recaudo} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="gColocado" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART.colocado} stopOpacity={0.18} />
          <stop offset="100%" stopColor={CHART.colocado} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke={CHART.grid} vertical={false} />
      <XAxis dataKey="mes" {...axis} />
      <YAxis {...axis} tickFormatter={formatShort} width={56} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(v)} />
      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      <Area type="monotone" dataKey="colocado" name="Colocado" stroke={CHART.colocado} fill="url(#gColocado)" strokeWidth={2} />
      <Area type="monotone" dataKey="recaudado" name="Recaudado" stroke={CHART.recaudo} fill="url(#gRecaudo)" strokeWidth={2} />
    </AreaChart>
  </ResponsiveContainer>
)

export const BarsChart = ({ data, dataKey, name, color = CHART.recaudo, height = 260 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={CHART.grid} vertical={false} />
      <XAxis dataKey="mes" {...axis} />
      <YAxis {...axis} tickFormatter={formatShort} width={56} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(v)} cursor={{ fill: '#F4F4F5' }} />
      <Bar dataKey={dataKey} name={name} fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
    </BarChart>
  </ResponsiveContainer>
)

// Dona de estado de cartera. Si todo está en cero, muestra un anillo gris.
export const DonutChart = ({ data, height = 240, colors = [CHART.recaudo, CHART.mora, CHART.pendiente, CHART.alerta] }) => {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0)
  const shown = total ? data : [{ name: 'Sin datos', value: 1 }]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={shown} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={total ? 2 : 0} stroke="none">
          {shown.map((d, i) => <Cell key={d.name} fill={total ? colors[i % colors.length] : '#E4E4E7'} />)}
        </Pie>
        {total ? <Tooltip contentStyle={tooltipStyle} /> : null}
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export { CHART_COLORS }

// Barras (apiladas o agrupadas) para varias series con eje X configurable.
export const SeriesBars = ({ data, xKey = 'label', series, stacked = false, height = 280, tickFormatter }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={CHART.grid} vertical={false} />
      <XAxis dataKey={xKey} {...axis} tickFormatter={tickFormatter} minTickGap={8} />
      <YAxis {...axis} tickFormatter={formatShort} width={56} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(v)} labelFormatter={tickFormatter} cursor={{ fill: '#F4F4F5' }} />
      {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
      {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={stacked ? 'a' : undefined} radius={stacked && i < series.length - 1 ? 0 : [6, 6, 0, 0]} maxBarSize={36} />)}
    </BarChart>
  </ResponsiveContainer>
)

// Área simple (recaudo diario, etc.).
export const TrendChart = ({ data, xKey = 'label', dataKey, name, color = CHART.recaudo, height = 220, tickFormatter }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke={CHART.grid} vertical={false} />
      <XAxis dataKey={xKey} {...axis} tickFormatter={tickFormatter} minTickGap={8} />
      <YAxis {...axis} tickFormatter={formatShort} width={56} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(v)} labelFormatter={tickFormatter} />
      <Area type="monotone" dataKey={dataKey} name={name} stroke={color} fill={`url(#g-${dataKey})`} strokeWidth={2} />
    </AreaChart>
  </ResponsiveContainer>
)
