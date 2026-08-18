import React from "react";
import UnifiedAlertCard from "../common/UnifiedAlertCard";

export default function AlertCard({ alert, onAction, actionLabel }) {
  return (
    <UnifiedAlertCard
      alert={alert}
      onAction={onAction}
      actionLabel={actionLabel}
    />
  );
}
