/**
 * AQI utility functions following CPCB National Air Quality Index categories.
 */

export type AqiCategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

export function getAqiColor(category: string): string {
  const colors: Record<string, string> = {
    Good: "#22c55e",
    Satisfactory: "#84cc16",
    Moderate: "#eab308",
    Poor: "#f97316",
    "Very Poor": "#ef4444",
    Severe: "#9333ea",
  };
  return colors[category] || "#64748b";
}

export function getAqiDescription(category: AqiCategory): string {
  const descriptions: Record<AqiCategory, string> = {
    Good: "Minimal impact on health",
    Satisfactory: "Minor breathing discomfort to sensitive people",
    Moderate: "Breathing discomfort to people with lung/heart disease",
    Poor: "Breathing discomfort to people on prolonged exposure",
    "Very Poor": "Respiratory illness on prolonged exposure",
    Severe: "Affects healthy people, serious impact on those with illness",
  };
  return descriptions[category];
}

/**
 * Deterministic pseudo-AQI per station so values stay stable across renders
 * (replace with live data once the backend is connected).
 */
export function mockAqiForStation(stationId: string): number {
  let hash = 0;
  for (let i = 0; i < stationId.length; i++) {
    hash = (hash << 5) - hash + stationId.charCodeAt(i);
    hash |= 0;
  }
  // Map hash to a realistic Delhi range (60–420)
  return 60 + (Math.abs(hash) % 360);
}
