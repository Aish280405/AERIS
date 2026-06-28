"""
AERIS Multi-Agent System

Architecture:
  ┌──────────────────────────────────────────────────────┐
  │               AERIS Orchestrator                      │
  ├──────────────────────────────────────────────────────┤
  │                                                        │
  │  ForecastAgent ──▶ AttributionAgent ──▶ EnforcementAgent
  │       │                                       │        │
  │       └───────────────────────────────────────┘        │
  │                        │                               │
  │                        ▼                               │
  │              AdvisoryAgent (Gemini LLM)                │
  │              Consumes all → generates alerts           │
  └──────────────────────────────────────────────────────┘

Each agent has a clear responsibility:
  - ForecastAgent: ML-based AQI prediction (1-3 days)
  - AttributionAgent: SHAP-based source attribution
  - EnforcementAgent: Prioritized action recommendations
  - AdvisoryAgent: LLM-generated citizen health advisories
"""

from agents.forecast_agent import ForecastAgent
from agents.attribution_agent import SourceAttributionAgent
from agents.enforcement_agent import EnforcementAgent
from agents.advisory_agent import AdvisoryAgent
from agents.orchestrator import AERISOrchestrator

__all__ = [
    "ForecastAgent",
    "SourceAttributionAgent",
    "EnforcementAgent",
    "AdvisoryAgent",
    "AERISOrchestrator",
]
