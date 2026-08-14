import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function DashboardCard({
  title,
  value,
  icon: Icon,
  color = "green",
  trend,
  trendLabel,
  subtitle,
}) {
  const colorMap = {
    green: {
      bg: "from-[#166534] to-[#22c55e]",
      light: "bg-green-50",
      text: "text-green-700",
      icon: "text-white",
      ring: "ring-green-100",
    },
    emerald: {
      bg: "from-emerald-600 to-emerald-400",
      light: "bg-emerald-50",
      text: "text-emerald-700",
      icon: "text-white",
      ring: "ring-emerald-100",
    },
    lime: {
      bg: "from-lime-600 to-[#84cc16]",
      light: "bg-lime-50",
      text: "text-lime-700",
      icon: "text-white",
      ring: "ring-lime-100",
    },
    orange: {
      bg: "from-orange-600 to-orange-400",
      light: "bg-orange-50",
      text: "text-orange-700",
      icon: "text-white",
      ring: "ring-orange-100",
    },
    red: {
      bg: "from-red-600 to-red-400",
      light: "bg-red-50",
      text: "text-red-700",
      icon: "text-white",
      ring: "ring-red-100",
    },
    blue: {
      bg: "from-blue-600 to-blue-400",
      light: "bg-blue-50",
      text: "text-blue-700",
      icon: "text-white",
      ring: "ring-blue-100",
    },
  };

  const c = colorMap[color] || colorMap.green;

  const TrendIcon =
    trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor =
    trend > 0
      ? "text-green-600"
      : trend < 0
      ? "text-red-500"
      : "text-gray-400";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={22} className={c.icon} />
        </div>
      </div>

      <div className="text-4xl font-extrabold text-gray-800 mb-3 tracking-tight">
        {value ?? "—"}
      </div>

      {(trend !== undefined || trendLabel) && (
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${trendColor}`}>
          <TrendIcon size={14} />
          <span>{trendLabel || `${trend > 0 ? "+" : ""}${trend}%`}</span>
        </div>
      )}
    </div>
  );
}
