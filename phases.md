# AquaTrace Counterfactual — PHASES.md

## Phase 0 — Scientific contract
- Python is the single source of truth.
- Freeze units, coordinate systems, schema and model parameter policy.
- No scientific values typed into React.

## Phase 1 — Real SAR
- Discover Sentinel-1 GRD with CDSE STAC.
- Persist product metadata and acquisition time.
- Retain original georeferencing.
- Load observed slick/reference mask.

## Phase 2 — Real forcing
- ERA5 hourly 10m u/v winds.
- HYCOM/NCODA 2017 currents for Ennore benchmark.
- Copernicus Marine hourly surface currents for eligible recent cases.
- Interpolate forcing in space/time.
- Log dataset/version/interpolation.
- DATA_UNAVAILABLE must be explicit.

## Phase 3 — AIS candidate release
- Normalize historical AIS to UTC.
- Deduplicate/sort/quality flag.
- Recover feasible track segment inside source corridor/time distribution.
- Sample release time and position uncertainty.
- Never force an exact timestamp without evidence.

## Phase 4 — Counterfactual engine
Use a surface Lagrangian model:

dX/dt = U_ocean + alpha*U10 + optional U_stokes + epsilon_diffusion

For each candidate:
- seed particles along feasible release segment;
- propagate to SAR observation epoch;
- use exactly the same physical policy for all candidates;
- return particle frames and derived footprint.

## Phase 5 — Observation operator
- Transform to local metric CRS.
- Particle density/occupancy.
- Fixed footprint extraction rule.
- Same rule for all candidates/cases.
- Register against observed SAR mask.
- No visual manual nudging.

## Phase 6 — Comparison
Compute:
- IoU
- Dice
- centroid offset
- normalized centroid error
- axis orientation delta
- Hausdorff/Chamfer
- temporal error
- ensemble coverage
- null separation

## Phase 7 — Uncertainty and competing hypotheses
- perturb wind/current;
- sample release time;
- sample release position;
- perturb diffusion within predefined range;
- compare top-K candidates and decoys.
Verdict is based on the consistency distribution AND separation from plausible decoys.

## Phase 8 — UI
MapLibre/deck.gl + Motion for React.
- Map 65–75%.
- Inspector 25–35%.
- Bottom timeline.
- Compare wipe.
- Assumption drawer.
- Real particle-frame animation.
- Clear zoom.

## Phase 9 — Validation
Baselines:
- B0 nearest vessel
- B1 spatial + temporal
- B2 AIS + backward drift
- B3 counterfactual
- B4 uncertainty-aware counterfactual

Primary outcomes:
Top-1/Top-3 recall, source rank, false attribution, rank lift, null separation, calibration.

## Phase 10 — Ennore benchmark
Use the documented 28 Jan 2017 Ennore collision as the first Indian real-data benchmark. Keep the known source hidden from ranking and reveal only for evaluation.
Use real Sentinel-1A and real environmental forcing. Treat published wreck/collision coordinates as validation information, not a magic perfect oil-release label.

## Phase 11 — Demo freeze
- no hardcoded scientific values;
- real-data provenance visible;
- golden run reproducible;
- one decoy candidate visible;
- uncertainty visible;
- clear SIMULATION/OFFLINE label for any fallback.
