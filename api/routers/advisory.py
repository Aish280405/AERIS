"""Citizen Advisory endpoints — health risk alerts in multiple languages."""

from fastapi import APIRouter, Query
from typing import Optional
import random

router = APIRouter()


def get_health_advisory(aqi: int, language: str = "en") -> dict:
    """Generate health advisory based on AQI level."""
    advisories = {
        "en": {
            "good": {
                "message": "Air quality is good. Enjoy outdoor activities.",
                "precautions": ["No special precautions needed"],
            },
            "moderate": {
                "message": "Air quality is moderate. Sensitive groups should limit prolonged outdoor exertion.",
                "precautions": [
                    "Sensitive individuals should reduce outdoor activity",
                    "Keep windows closed during peak traffic hours",
                ],
            },
            "poor": {
                "message": "Air quality is poor. Reduce outdoor activities.",
                "precautions": [
                    "Avoid prolonged outdoor exertion",
                    "Use N95 masks outdoors",
                    "Keep windows and doors closed",
                    "Use air purifiers if available",
                ],
            },
            "very_poor": {
                "message": "Air quality is very poor. Stay indoors if possible.",
                "precautions": [
                    "Avoid all outdoor physical activity",
                    "Wear N95 mask if going outside is necessary",
                    "Keep all windows sealed",
                    "Run air purifiers continuously",
                    "Seek medical attention if experiencing breathing difficulty",
                ],
            },
            "severe": {
                "message": "HEALTH EMERGENCY. Air quality is severe. Do not go outdoors.",
                "precautions": [
                    "STAY INDOORS — Do not go outside",
                    "Seal windows and doors",
                    "Run air purifiers at maximum",
                    "Avoid all physical exertion",
                    "Seek immediate medical help for respiratory distress",
                    "Schools and outdoor work should be suspended",
                ],
            },
        },
        "hi": {
            "good": {
                "message": "हवा की गुणवत्ता अच्छी है। बाहरी गतिविधियों का आनंद लें।",
                "precautions": ["कोई विशेष सावधानी की आवश्यकता नहीं"],
            },
            "moderate": {
                "message": "हवा की गुणवत्ता मध्यम है। संवेदनशील लोग बाहरी गतिविधि सीमित करें।",
                "precautions": [
                    "संवेदनशील व्यक्ति बाहरी गतिविधि कम करें",
                    "पीक ट्रैफिक के समय खिड़कियां बंद रखें",
                ],
            },
            "poor": {
                "message": "हवा की गुणवत्ता खराब है। बाहरी गतिविधियां कम करें।",
                "precautions": [
                    "लंबे समय तक बाहर रहने से बचें",
                    "बाहर N95 मास्क पहनें",
                    "खिड़कियां और दरवाजे बंद रखें",
                    "एयर प्यूरीफायर का उपयोग करें",
                ],
            },
            "very_poor": {
                "message": "हवा की गुणवत्ता बहुत खराब है। जितना हो सके घर के अंदर रहें।",
                "precautions": [
                    "बाहर किसी भी शारीरिक गतिविधि से बचें",
                    "बाहर जाना जरूरी हो तो N95 मास्क पहनें",
                    "सभी खिड़कियां सील करें",
                    "एयर प्यूरीफायर लगातार चलाएं",
                    "सांस लेने में तकलीफ हो तो डॉक्टर से मिलें",
                ],
            },
            "severe": {
                "message": "स्वास्थ्य आपातकाल। हवा की गुणवत्ता गंभीर है। बाहर न जाएं।",
                "precautions": [
                    "घर के अंदर रहें — बाहर न जाएं",
                    "खिड़कियां और दरवाजे सील करें",
                    "एयर प्यूरीफायर अधिकतम पर चलाएं",
                    "किसी भी शारीरिक परिश्रम से बचें",
                    "सांस की तकलीफ पर तुरंत चिकित्सा सहायता लें",
                    "स्कूल और बाहरी काम बंद होने चाहिए",
                ],
            },
        },
    }

    if aqi <= 50:
        level = "good"
    elif aqi <= 100:
        level = "moderate"
    elif aqi <= 200:
        level = "poor"
    elif aqi <= 300:
        level = "very_poor"
    else:
        level = "severe"

    lang_data = advisories.get(language, advisories["en"])
    advisory = lang_data[level]

    return {
        "aqi": aqi,
        "level": level,
        "language": language,
        **advisory,
    }


@router.get("/{station_id}")
async def get_station_advisory(
    station_id: str,
    language: str = Query("en", description="Language code (en, hi)"),
):
    """Get health advisory for a station."""
    # TODO: Get actual AQI from station data
    mock_aqi = random.randint(100, 450)
    advisory = get_health_advisory(mock_aqi, language)
    return {
        "station_id": station_id,
        **advisory,
    }


@router.get("/ward/{ward_name}")
async def get_ward_advisory(
    ward_name: str,
    language: str = Query("en", description="Language code (en, hi)"),
):
    """Get health advisory for a ward/area."""
    mock_aqi = random.randint(100, 450)
    advisory = get_health_advisory(mock_aqi, language)
    return {
        "ward": ward_name,
        **advisory,
    }
