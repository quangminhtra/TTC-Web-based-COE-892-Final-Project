from dataclasses import dataclass


@dataclass(frozen=True)
class DemandSnapshot:
    period: str
    level: str
    note: str


def generate_demand_snapshots() -> list[DemandSnapshot]:
    return [
        DemandSnapshot(period="Morning Peak", level="high", note="Simulated downtown surge"),
        DemandSnapshot(period="Midday", level="medium", note="Balanced cross-city usage"),
        DemandSnapshot(period="Evening Peak", level="high", note="Return commute concentration"),
    ]
