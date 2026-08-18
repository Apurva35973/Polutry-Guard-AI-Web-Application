import React from "react";
import DashboardCardBase from "../admin/DashboardCard";

export default function DashboardCard({
  title,
  value,
  icon,
  tone = "emerald",
  color,
  caption,
  subtitle,
}) {
  const toneMap = {
    emerald: "green",
    amber: "orange",
    red: "red",
    sky: "blue",
    blue: "blue",
    lime: "lime",
  };

  const resolvedColor = color || toneMap[tone] || "green";

  return (
    <DashboardCardBase
      title={title}
      value={value}
      icon={icon}
      color={resolvedColor}
      subtitle={caption || subtitle}
    />
  );
}
