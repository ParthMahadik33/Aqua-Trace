import logging
from enum import Enum
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger("ScreeningPolicy")

DECISION_ARCHIVE = "ARCHIVE"
DECISION_MONITOR = "MONITOR"
DECISION_REVIEW = "REVIEW"
DECISION_PRIORITY = "PRIORITY"


class ScreeningDecision(str, Enum):
    ARCHIVE = "ARCHIVE"
    MONITOR = "MONITOR"
    REVIEW = "REVIEW"
    PRIORITY = "PRIORITY"


class ScreeningPolicy:
    """
    Evaluates quality gate and AI triage outputs to produce an operational screening decision.
    Explicitly labeled as 'DEVELOPMENT SCREENING POLICY'.

    Decisions:
    - ARCHIVE: Scene is either quality-unsuitable or clean ocean. No incident created.
    - MONITOR: Ambiguous feature or low-risk natural lookalike. Monitored, no immediate incident.
    - REVIEW: Potential hydrocarbon anomaly detected. Automatically creates an investigative incident.
    - PRIORITY: High-confidence anomaly or urgent corridor overlap. Automatically creates an incident.
    """

    def __init__(self, policy_name: str = "DEVELOPMENT SCREENING POLICY"):
        self.policy_name = policy_name

    def evaluate(
        self,
        triage_result: Optional[Dict[str, Any]] = None,
        quality_result: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Computes operational screening decision.
        Accepts kwargs for flexible argument ordering (quality_result / triage_result).
        Returns structured decision dictionary with policy metadata.
        """
        # Support positional / inverted kwargs if provided
        q_res = quality_result if quality_result is not None else kwargs.get("quality_result")
        t_res = triage_result if triage_result is not None else kwargs.get("triage_result")

        if not q_res or not q_res.get("passed"):
            reasons = q_res.get("reasons", []) if q_res else ["Missing quality assessment"]
            rationale = f"{self.policy_name}: Quality checks failed ({'; '.join(reasons)}). Archived."
            return {
                "decision": ScreeningDecision.ARCHIVE.value,
                "reason": rationale,
                "policy_mode": self.policy_name,
            }

        if not t_res:
            return {
                "decision": ScreeningDecision.MONITOR.value,
                "reason": f"{self.policy_name}: Quality passed but triage pending. Monitored.",
                "policy_mode": self.policy_name,
            }

        triage_status = str(t_res.get("status") or "NO_OIL").upper()

        if triage_status == "NO_OIL":
            return {
                "decision": ScreeningDecision.ARCHIVE.value,
                "reason": f"{self.policy_name}: Triage confirms baseline sea state (no dark patch anomaly). Archived.",
                "policy_mode": self.policy_name,
            }

        if triage_status == "LOOKALIKE":
            return {
                "decision": ScreeningDecision.MONITOR.value,
                "reason": f"{self.policy_name}: Ambiguous surface film consistent with biogenic lookalike. Monitored.",
                "policy_mode": self.policy_name,
            }

        if triage_status in ("POSSIBLE_OIL", "REVIEW"):
            return {
                "decision": ScreeningDecision.REVIEW.value,
                "reason": f"{self.policy_name}: Credible anomalous surface feature detected. Promoted to INVESTIGATIVE INCIDENT.",
                "policy_mode": self.policy_name,
            }

        if triage_status == "PRIORITY":
            return {
                "decision": ScreeningDecision.PRIORITY.value,
                "reason": f"{self.policy_name}: Critical priority anomaly in shipping channel. Promoted to PRIORITY INCIDENT.",
                "policy_mode": self.policy_name,
            }

        return {
            "decision": ScreeningDecision.MONITOR.value,
            "reason": f"{self.policy_name}: Unhandled triage status '{triage_status}'. Defaulting to MONITOR.",
            "policy_mode": self.policy_name,
        }
