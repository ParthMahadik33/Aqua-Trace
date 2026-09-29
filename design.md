# AquaTrace Counterfactual Workstation — DESIGN.md

## Goal
Build a focused, judge-facing counterfactual workstation. The center of the product is NOT the 12-stage workflow. The center is one understandable scientific question:

> If candidate vessel V released oil at a feasible position/time, under the environmental forcing, could the resulting plume reproduce the observed SAR slick?

The current AquaTrace engine already performs dynamic candidate-specific particle advection and exposes comparison metrics. The new UI must make the calculation understandable and eliminate visual ambiguity.

## Layout
- 65–75% map/evidence canvas.
- 25–35% right hypothesis inspector.
- Bottom timeline spanning map width.
- Minimal top header: Case, candidate, data status, Run, Evidence, Dossier, theme.
- No giant stage navigation in this focused view.

## Map layers, in order
1. Basemap.
2. SAR footprint / raster context.
3. Observed slick mask.
4. Candidate AIS track.
5. Feasible release segment.
6. Release point/segment marker.
7. Particle plume frames.
8. Predicted footprint.
9. Ensemble uncertainty envelope.
10. Annotation leaders.

Every line/point must come from real or explicitly derived geometry. No decorative dots, random vessel lines, or fake particle trails.

## Core interaction
1. Select candidate.
2. Show candidate track and feasible release segment.
3. Show recovered release-time window.
4. RUN COUNTERFACTUAL.
5. Backend sends actual progress states.
6. Animate actual returned particle frames.
7. Scrub timeline.
8. Compare observed vs simulated using wipe/opacity.
9. Open metrics and uncertainty.
10. Show verdict with a one-sentence explanation.
11. Test decoy candidate without changing physical settings.

## Visual language
Professional government/operations workstation, not neon sci-fi.
- Light default.
- Navy/charcoal typography.
- Cyan/blue for derived plume.
- Restrained red for observed slick.
- Amber for candidate hypothesis/warnings.
- Thin gray boundaries; avoid bright white rules.
- Strong whitespace.
- Typography must distinguish labels, measurements, and conclusions.

## Motion
Use:
- MapLibre GL JS for geographic layers, camera and line/point animation.
- deck.gl only if particle count makes it useful.
- Motion for React for inspector transitions, counters, drawer transitions and timeline UI.
- anime.js only for small interface motion.
Never use a CSS/JS animation to imply scientific particle transport. The plume must come from cached/backend simulation frames.

## Inspector order
HYPOTHESIS
- Candidate
- Release window
- Candidate track quality

DATA PROVENANCE
- SAR product
- Wind source
- Current source
- AIS source
- Model version
- Run ID

SIMULATION
- Particle count
- timestep
- windage/leeway
- diffusion
- forcing members

COMPARISON
- IoU
- Dice
- centroid offset
- normalized error
- orientation delta
- temporal error
- null separation

UNCERTAINTY
- ensemble size
- p50/p95 consistency
- envelope / spread

VERDICT
- SUPPORTED / WEAK / INCONCLUSIVE
- Why this verdict
- What evidence would change it

## Compare control
Primary: a horizontal/vertical swipe comparing observed SAR slick and predicted footprint.
Secondary: independent layer opacity.
Do not put opaque predicted plume directly over the SAR raster and expect the human eye to perform forensic image registration.

## Zoom
Provide:
- +/-
- Fit evidence
- Fit candidate
- Reset north
- optional scale bar
- hover/select on vessel and release points
Do not let panels intercept map pointer events.

## Accessibility
- High contrast but not pure white-on-black.
- 14–16px minimum UI body text.
- Semantic labels.
- No color-only verdicts.
- Keyboard focus on Run, timeline, compare and inspector controls.
