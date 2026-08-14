import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

const COLORS = ["#166534", "#22c55e", "#84cc16", "#f59e0b", "#ef4444", "#3b82f6"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3">
        {label && <p className="text-xs font-bold text-gray-600 mb-2">{label}</p>}
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Farm Type Pie Chart ──────────────────────────────────────────────────────
export function FarmTypeChart({ data = [] }) {
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return percent > 0.05 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={110}
          innerRadius={45}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={10}
          formatter={(value) => (
            <span className="text-xs font-semibold text-gray-600">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
export function AdminBarChart({ data = [], dataKey, color = "#22c55e", name }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={dataKey || "value"} name={name || dataKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Multi-Line Chart ─────────────────────────────────────────────────────────
export function AdminLineChart({ data = [], lines = [] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={10} />
        {lines.map((line, i) => (
          <Line
            key={i}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2.5}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Area Chart ───────────────────────────────────────────────────────────────
export function AdminAreaChart({ data = [], dataKey, color = "#22c55e", name }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey || "value"}
          name={name}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#color-${dataKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default FarmTypeChart;
