import React from "react";

interface ProgressCircleProps {
  value: number; // 0–100
  size?: number; // px size (default 60)
  strokeWidth?: number;
  color?: string;
}

export function ProgressCircle({
  value,
  size = 60,
  strokeWidth = 6,
  color = "#158f20",
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#e5e7eb" // light gray background
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="0.75rem"
        className="fill-gray-800 dark:fill-gray-100"
        fontWeight="bold"
      >
        {value}%
      </text>
    </svg>
  );
}
