"""
Citizen Health Advisory Agent (LLM-powered via Google Gemini)

Consumes outputs from all upstream agents to generate personalized,
context-aware health advisories in multiple languages.

Input context (from orchestrator):
  - current_aqi: int
  - forecast_trend: "improving" | "stable" | "worsening"
  - dominant_source: str
  - attribution: Dict[str, float]
  - language: "en" | "hi" | "kn" | "ta"

Output:
  - Natural language advisory with precautions
  - Personalized based on AQI level, source, and trend
"""

import os
import json
from typing import Dict, Optional

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


# Fallback templates when API is unavailable
FALLBACK_TEMPLATES = {
    "en": {
        "severe": "HEALTH EMERGENCY. AQI is {aqi} — hazardous levels. Stay indoors, seal windows, run air purifiers on max. Seek medical help if breathing difficulty occurs.",
        "very_poor": "AQI is {aqi} — very unhealthy. Avoid outdoor activity. N95 mask mandatory if going out. Keep purifiers running.",
        "poor": "AQI is {aqi} — unhealthy. Limit outdoor exertion. Wear masks outdoors. Keep windows closed.",
        "moderate": "AQI is {aqi} — moderate. Sensitive groups should limit prolonged outdoor activity.",
        "good": "AQI is {aqi} — air quality is acceptable. Enjoy outdoor activities.",
    },
    "hi": {
        "severe": "स्वास्थ्य आपातकाल। AQI {aqi} — खतरनाक स्तर। घर में रहें, खिड़कियां बंद करें, एयर प्यूरीफायर चलाएं। सांस में तकलीफ हो तो तुरंत डॉक्टर से मिलें।",
        "very_poor": "AQI {aqi} — बहुत अस्वस्थ। बाहरी गतिविधि से बचें। बाहर जाएं तो N95 मास्क अनिवार्य।",
        "poor": "AQI {aqi} — अस्वस्थ। बाहरी मेहनत सीमित करें। मास्क पहनें। खिड़कियां बंद रखें।",
        "moderate": "AQI {aqi} — मध्यम। संवेदनशील लोग लंबे समय बाहर रहने से बचें।",
        "good": "AQI {aqi} — हवा ठीक है। बाहरी गतिविधियों का आनंद लें।",
    },
}


class AdvisoryAgent:
    """Generates citizen health advisories using Gemini LLM."""

    def __init__(self, api_key: Optional[str] = None, enable_llm: bool = False):
        self.api_key = api_key or GEMINI_API_KEY
        self.enable_llm = enable_llm
        self.status = "gemini" if (self.api_key and HAS_HTTPX and enable_llm) else "template"
        if self.api_key and HAS_HTTPX and enable_llm:
            print("✓ AdvisoryAgent: Gemini LLM enabled")
        else:
            print("⚠ AdvisoryAgent: Template mode (LLM reserved for chat)")

    async def generate_advisory_with_context(self, context: Dict) -> Dict:
        """
        Generate advisory using full upstream context.
        Tries Gemini first (if enable_llm=True), falls back to templates.
        """
        language = context.get("language", "en")
        aqi = context.get("current_aqi", 200)
        trend = context.get("forecast_trend", "stable")
        dominant_source = context.get("dominant_source", "unknown")
        attribution = context.get("attribution", {})

        if self.api_key and HAS_HTTPX and self.enable_llm:
            try:
                llm_response = await self._call_gemini(
                    aqi=aqi,
                    trend=trend,
                    dominant_source=dominant_source,
                    attribution=attribution,
                    language=language,
                )
                return {
                    "aqi": aqi,
                    "level": self._get_level(aqi),
                    "language": language,
                    "advisory": llm_response,
                    "generated_by": "gemini",
                    "context_used": {
                        "trend": trend,
                        "dominant_source": dominant_source,
                    },
                }
            except Exception as e:
                print(f"⚠ Gemini call failed: {e}, falling back to template")

        # Fallback
        return self._template_advisory(aqi, language, trend, dominant_source)

    async def _call_gemini(
        self,
        aqi: int,
        trend: str,
        dominant_source: str,
        attribution: Dict,
        language: str,
    ) -> str:
        """Call Gemini API to generate a contextual advisory."""

        lang_instruction = {
            "en": "Respond in English.",
            "hi": "Respond entirely in Hindi (Devanagari script).",
            "kn": "Respond entirely in Kannada.",
            "ta": "Respond entirely in Tamil.",
        }.get(language, "Respond in English.")

        # Format attribution for context
        attr_str = ", ".join(
            f"{k.replace('_', ' ')}: {v}%" for k, v in sorted(
                attribution.items(), key=lambda x: x[1], reverse=True
            )
        )

        prompt = f"""You are AERIS, an AI air quality health advisor for Indian cities. 
Generate a brief, actionable health advisory for citizens.

Current conditions:
- AQI: {aqi} ({self._get_level(aqi)})
- Trend: AQI is {trend} over the next 24-72 hours
- Dominant pollution source: {dominant_source.replace('_', ' ')}
- Source breakdown: {attr_str}

{lang_instruction}

Rules:
- Keep it under 150 words
- Be specific about what to DO (not just what's happening)
- Mention the dominant source so citizens understand WHY
- Include advice for vulnerable groups (children, elderly, outdoor workers)
- If trend is worsening, emphasize urgency
- Use simple, clear language accessible to all literacy levels
- Do NOT use markdown formatting

Generate the advisory now:"""

        url = f"{GEMINI_URL}?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 300,
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        # Extract text from Gemini response
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "").strip()

        raise ValueError("Empty response from Gemini")

    def _template_advisory(
        self, aqi: int, language: str, trend: str, dominant_source: str
    ) -> Dict:
        """Fallback template-based advisory."""
        level = self._get_level(aqi)
        templates = FALLBACK_TEMPLATES.get(language, FALLBACK_TEMPLATES["en"])
        msg = templates.get(level, templates["moderate"]).format(aqi=aqi)

        # Add trend context
        if trend == "worsening":
            if language == "hi":
                msg += " आने वाले दिनों में स्थिति और बिगड़ सकती है।"
            else:
                msg += " Conditions are expected to worsen over the next 24-72 hours."
        elif trend == "improving":
            if language == "hi":
                msg += " आने वाले दिनों में सुधार की उम्मीद है।"
            else:
                msg += " Conditions are expected to improve over the next 24-72 hours."

        return {
            "aqi": aqi,
            "level": level,
            "language": language,
            "advisory": msg,
            "generated_by": "template",
            "context_used": {
                "trend": trend,
                "dominant_source": dominant_source,
            },
        }

    def _get_level(self, aqi: int) -> str:
        """Map AQI to severity level."""
        if aqi <= 50:
            return "good"
        if aqi <= 100:
            return "good"
        if aqi <= 200:
            return "moderate"
        if aqi <= 300:
            return "poor"
        if aqi <= 400:
            return "very_poor"
        return "severe"
