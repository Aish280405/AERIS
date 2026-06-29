"""
AERIS AI Chat endpoint — Gemini-powered conversational agent.

Rules:
- Only answers questions about air quality, pollution, health, and the AERIS platform
- Role-aware: citizens don't see enforcement details or internal data
- Uses pipeline data as context for grounded, accurate answers
"""

import os
import sys
import json
from pathlib import Path
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import httpx
from dotenv import load_dotenv

# Load .env file
load_dotenv()

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from agents.forecast_agent import ForecastAgent
from agents.attribution_agent import SourceAttributionAgent
from cache import get_cache

router = APIRouter()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

forecast_agent = ForecastAgent()
attribution_agent = SourceAttributionAgent()


class ChatRequest(BaseModel):
    message: str
    station_id: Optional[str] = "delhi_anand_vihar"
    role: str = "citizen"  # "citizen" or "authority"
    language: str = "en"


SYSTEM_PROMPT_CITIZEN = """You are AERIS, an AI air quality assistant for Indian cities. You help citizens understand air quality and protect their health.

RULES — YOU MUST FOLLOW THESE STRICTLY:
1. ONLY answer questions about: air quality, AQI, pollution, health effects of pollution, weather impact on air quality, precautions, masks, purifiers, and the AERIS platform itself.
2. If someone asks about ANYTHING else (politics, coding, recipes, general knowledge, etc.), politely decline: "I can only help with air quality and health-related questions. Please ask me about pollution levels, forecasts, or health precautions."
3. NEVER reveal enforcement details, inspector deployment locations, source attribution percentages, or internal system data to citizens. This is confidential operational data.
4. Keep answers short (2-4 sentences), friendly, and actionable.
5. If AQI is high, emphasize health precautions especially for children, elderly, and outdoor workers.
6. You can respond in Hindi if asked in Hindi.
7. DO NOT make up specific AQI numbers. Use the data provided in context.

You have access to real-time data which will be provided as context."""

SYSTEM_PROMPT_AUTHORITY = """You are AERIS, an AI air quality intelligence assistant for city administrators and pollution control authorities.

RULES:
1. ONLY answer questions about: air quality, pollution sources, forecasts, enforcement priorities, source attribution, station data, and the AERIS platform.
2. If someone asks about ANYTHING unrelated (politics, coding, etc.), politely decline: "I'm focused on air quality intelligence. Ask me about pollution sources, forecasts, or enforcement recommendations."
3. You CAN share enforcement details, source attribution data, and operational intelligence with authority users.
4. Be precise and data-driven. Reference specific numbers from the context provided.
5. Suggest actionable next steps when discussing enforcement.
6. You can respond in Hindi if asked in Hindi.
7. DO NOT make up data. Use only what's provided in context.

You have access to real-time monitoring and prediction data which will be provided as context."""


def _build_station_context(station_id: str) -> str:
    """Build context string from cached/computed data for a station."""
    cache = get_cache()

    # Try cache first
    snapshot = cache.get_namespaced("snapshot", station_id)
    if snapshot:
        return json.dumps({
            "station": snapshot.get("station", {}),
            "current_aqi": snapshot.get("current_aqi"),
            "forecast": snapshot.get("forecast", {}).get("predictions", []),
            "attribution": snapshot.get("attribution"),
        }, ensure_ascii=False)

    # Fallback: compute live
    forecast = forecast_agent.predict(station_id, days=3)
    attribution = attribution_agent.attribute({})
    return json.dumps({
        "station_id": station_id,
        "forecast": forecast.get("predictions", []),
        "attribution": attribution,
    }, ensure_ascii=False)


@router.post("/")
async def chat(req: ChatRequest):
    """
    Conversational AI endpoint.
    Sends user message + station context + system prompt to Gemini.
    """
    if not GEMINI_API_KEY:
        return {
            "response": "AI chat is not configured. Add GEMINI_API_KEY to api/.env to enable conversational responses.",
            "source": "error",
        }

    # Build context
    station_context = _build_station_context(req.station_id or "delhi_anand_vihar")
    system_prompt = SYSTEM_PROMPT_CITIZEN if req.role == "citizen" else SYSTEM_PROMPT_AUTHORITY

    # Language instruction
    lang_note = ""
    if req.language == "hi":
        lang_note = "\nThe user prefers Hindi. Respond in Hindi (Devanagari) if appropriate."

    full_prompt = f"""{system_prompt}{lang_note}

CURRENT DATA CONTEXT (from AERIS monitoring system):
{station_context}

USER'S QUESTION: {req.message}

Respond naturally and helpfully within the rules above:"""

    try:
        url = f"{GEMINI_URL}?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 400,
            },
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload)

            # Handle rate limit with a single retry
            if response.status_code == 429:
                import asyncio
                await asyncio.sleep(2)
                response = await client.post(url, json=payload)

            response.raise_for_status()
            data = response.json()

        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                text = parts[0].get("text", "").strip()
                return {"response": text, "source": "gemini"}

        return {"response": "I couldn't generate a response. Try asking differently.", "source": "error"}

    except httpx.TimeoutException:
        return {"response": "The AI is taking too long. Try again in a moment.", "source": "timeout"}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            return {"response": "I'm getting too many requests right now. Please wait a few seconds and try again.", "source": "rate_limited"}
        return {"response": f"API error: {e.response.status_code}. Try again shortly.", "source": "error"}
    except Exception as e:
        return {"response": f"Something went wrong: {str(e)[:100]}", "source": "error"}
