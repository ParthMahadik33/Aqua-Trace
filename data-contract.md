# AquaTrace Counterfactual — DATA-CONTRACT.md

## Backend ownership
Scientific computation lives in Python. React only renders the returned geometry and metrics.

## POST /api/simulation/counterfactual
Request:
- incident_id
- candidate_id
- observed_slick
- SAR acquisition time/product
- release window
- release segment
- AIS track metadata
- environmental forcing refs
- model parameters
- random seed

Response must include:
- run_id
- status
- provenance
- hypothesis
- particle frames
- predicted footprint
- metrics
- uncertainty
- verdict
- evidence_refs

## Progress events
QUEUED
RETRIEVING_FORCING
ALIGNING_AIS
INITIALIZING_RELEASE
INTEGRATING_PARTICLES
BUILDING_FOOTPRINT
COMPARING_OBSERVATION
RUNNING_UNCERTAINTY
COMPARING_DECoys
FINALIZING_EVIDENCE
COMPLETED

Use SSE/WebSocket. The UI must not fake progress.

## Geometry requirements
- WGS84 geographic input/output.
- local metric CRS for area/distance calculations.
- no manual visual offsets.
- every geometry has an ID and provenance.

## Failure states
DATA_UNAVAILABLE
MODEL_ERROR
PARTIAL
COMPLETED
INCONCLUSIVE is a scientific verdict, not an execution failure.

## Provenance
Persist:
- SAR product ID
- acquisition time
- forcing dataset/version
- AIS source
- model version
- model configuration
- seed
- parameters
- input hashes
- candidate ID
- run ID
- analyst actions

## Red lines
Never:
- fabricate real AIS;
- invent forcing values;
- type scientific metrics into UI;
- call consistency a probability of guilt;
- retune candidate-specific parameters after seeing the outcome;
- silently fall back to simulation in a real run.
