"""
Citizen Health Advisory Agent
Generates personalized, multi-language health advisories based on:
- Current and predicted AQI
- Vulnerable population density in the area
- Time of day and activity patterns
- Historical health impact data

Future: LLM integration for natural language advisory generation.
"""

from typing import Dict, Optional


class AdvisoryAgent:
    """Generates citizen health advisories in multiple languages."""

    AQI_LEVELS = {
        (0, 50): "good",
        (51, 100): "satisfactory",
        (101, 200): "moderate",
        (201, 300): "poor",
        (301, 400): "very_poor",
        (401, 500): "severe",
    }

    def __init__(self, llm_client=None):
        """
        Args:
            llm_client: Optional LLM client (GPT/Claude) for generating
                       natural language advisories.
        """
        self.llm_client = llm_client

    def get_level(self, aqi: int) -> str:
        """Map AQI value to severity level."""
        for (low, high), level in self.AQI_LEVELS.items():
            if low <= aqi <= high:
                return level
        return "severe" if aqi > 500 else "good"

    def generate_advisory(
        self,
        aqi: int,
        language: str = "en",
        area: Optional[str] = None,
        forecast_trend: Optional[str] = None,  # "improving", "stable", "worsening"
    ) -> Dict:
        """
        Generate a health advisory.
        If LLM client available, generates personalized natural language.
        Otherwise, uses template-based advisories.
        """
        level = self.get_level(aqi)

        if self.llm_client:
            return self._llm_advisory(aqi, level, language, area, forecast_trend)

        return self._template_advisory(aqi, level, language)

    def _template_advisory(self, aqi: int, level: str, language: str) -> Dict:
        """Template-based advisory (no LLM required)."""
        templates = self._get_templates(language)
        advisory = templates.get(level, templates["severe"])

        return {
            "aqi": aqi,
            "level": level,
            "language": language,
            "message": advisory["message"],
            "precautions": advisory["precautions"],
            "generated_by": "template",
        }

    def _llm_advisory(
        self, aqi: int, level: str, language: str,
        area: Optional[str], forecast_trend: Optional[str]
    ) -> Dict:
        """LLM-generated personalized advisory."""
        # TODO: Implement LLM call
        # prompt = f"Generate a health advisory for AQI {aqi} ({level}) in {area}..."
        # response = self.llm_client.generate(prompt)
        return self._template_advisory(aqi, level, language)

    def _get_templates(self, language: str) -> Dict:
        """Get advisory templates for a language."""
        templates = {
            "en": {
                "good": {
                    "message": "Air quality is good. Enjoy outdoor activities.",
                    "precautions": ["No special precautions needed"],
                },
                "satisfactory": {
                    "message": "Air quality is satisfactory. Sensitive groups be aware.",
                    "precautions": ["Unusually sensitive people should reduce outdoor exertion"],
                },
                "moderate": {
                    "message": "Air quality is moderate. Reduce prolonged outdoor exertion.",
                    "precautions": [
                        "Sensitive individuals should limit outdoor activity",
                        "Keep windows closed during peak hours",
                    ],
                },
                "poor": {
                    "message": "Air quality is poor. Limit outdoor activities.",
                    "precautions": [
                        "Avoid prolonged outdoor exertion",
                        "Use N95 masks outdoors",
                        "Keep windows and doors closed",
                        "Use air purifiers if available",
                    ],
                },
                "very_poor": {
                    "message": "Air quality is very poor. Stay indoors.",
                    "precautions": [
                        "Avoid all outdoor physical activity",
                        "Wear N95 mask if going outside",
                        "Seal windows and doors",
                        "Run air purifiers continuously",
                    ],
                },
                "severe": {
                    "message": "HEALTH EMERGENCY. Do not go outdoors.",
                    "precautions": [
                        "STAY INDOORS",
                        "Seal all openings",
                        "Run air purifiers at maximum",
                        "Seek medical help for breathing issues",
                        "Schools and outdoor work must stop",
                    ],
                },
            },
            "hi": {
                "good": {
                    "message": "हवा की गुणवत्ता अच्छी है।",
                    "precautions": ["कोई विशेष सावधानी नहीं"],
                },
                "satisfactory": {
                    "message": "हवा की गुणवत्ता संतोषजनक है।",
                    "precautions": ["संवेदनशील लोग सावधान रहें"],
                },
                "moderate": {
                    "message": "हवा की गुणवत्ता मध्यम है।",
                    "precautions": ["बाहरी गतिविधि सीमित करें", "खिड़कियां बंद रखें"],
                },
                "poor": {
                    "message": "हवा की गुणवत्ता खराब है।",
                    "precautions": ["बाहर N95 मास्क पहनें", "खिड़कियां बंद रखें"],
                },
                "very_poor": {
                    "message": "हवा बहुत खराब है। घर के अंदर रहें।",
                    "precautions": ["बाहर न जाएं", "मास्क पहनें", "एयर प्यूरीफायर चलाएं"],
                },
                "severe": {
                    "message": "स्वास्थ्य आपातकाल। बाहर न जाएं।",
                    "precautions": ["घर में रहें", "सब बंद करें", "डॉक्टर से मिलें"],
                },
            },
        }
        return templates.get(language, templates["en"])
