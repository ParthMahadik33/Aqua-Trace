// Verification script for AquaTrace Frontend Simulation Engines and Consistency
import assert from 'node:assert';

console.log('=== AQUATRACE FRONTEND ENGINES & DATA CONSISTENCY VERIFICATION ===\n');

// 1. Verify Canonical Detection Prediction Data
console.log('Test A: Checking canonical Case 0004 prediction constants...');
import('./src/data/case0004Data.ts').then((caseData) => {
  const pred = caseData.CANONICAL_CASE_0004_PREDICTION;
  assert.strictEqual(pred.oil_probability, 0.987, 'Oil probability must be 98.7% (0.987)');
  assert.strictEqual(pred.lookalike_probability, 0.011, 'Lookalike probability must be 1.1% (0.011)');
  assert.strictEqual(pred.no_oil_probability, 0.002, 'No-oil probability must be 0.2% (0.002)');
  assert.strictEqual(pred.predicted_class, 'OIL', 'Predicted class must be OIL');
  console.log('  [PASS] Canonical prediction: Oil 98.7%, Lookalike 1.1%, No-oil 0.2%');

  // 2. Verify Canonical Attribution Data
  console.log('Test B: Checking canonical Case 0004 attribution composite...');
  const attr = caseData.CANONICAL_CASE_0004_ATTRIBUTION;
  assert.strictEqual(attr.attributionScore, 94.2, 'Overall attribution score must be 94.2%');
  assert.strictEqual(caseData.computeWeightedAttributionScore(attr.factors), 94.2, 'Weighted calculation must yield 94.2%');
  console.log('  [PASS] Canonical attribution factors and 94.2% overall composite confirmed');

  // 3. Verify Dynamic Attribution Engine Calculation
  console.log('Test C: Testing Dynamic AttributionEngine execution...');
  import('./src/services/simulationEngines/AttributionEngine.ts').then(({ AttributionEngine }) => {
    const engine = new AttributionEngine();
    const candA = caseData.CASE_0004_CANDIDATES[0];
    const execRes = engine.execute({
      vessel: candA,
      counterfactualResult: null,
      slickAxisDeg: 52.0,
    });
    assert(execRes.result.attributionScore >= 90.0, 'Primary candidate attribution must be high priority (>=90%)');
    assert.strictEqual(execRes.result.investigationPriority, 'HIGH');
    console.log(`  [PASS] Dynamic AttributionEngine computed score: ${execRes.result.attributionScore}% (${execRes.result.investigationPriority} priority)`);

    // 4. Verify Counterfactual Engine Determinism
    console.log('Test D: Testing CounterfactualEngine determinism...');
    import('./src/services/simulationEngines/CounterfactualEngine.ts').then(({ CounterfactualEngine }) => {
      const cfEngine = new CounterfactualEngine();
      const run1 = cfEngine.runDynamicSimulation({
        vesselMmsi: candA.mmsi,
        vesselName: candA.name,
        candidateCoords: { lat: 55.1884, lon: 5.8122, sogKn: 12.4, cogDeg: 54.0 },
        observedSlick: { centroid: { lat: 55.2443, lon: 5.8856 }, areaKm2: 4.41, axisHeadingDeg: 52.0 },
      }, { seed: 42 });

      const run2 = cfEngine.runDynamicSimulation({
        vesselMmsi: candA.mmsi,
        vesselName: candA.name,
        candidateCoords: { lat: 55.1884, lon: 5.8122, sogKn: 12.4, cogDeg: 54.0 },
        observedSlick: { centroid: { lat: 55.2443, lon: 5.8856 }, areaKm2: 4.41, axisHeadingDeg: 52.0 },
      }, { seed: 42 });

      assert.strictEqual(run1.metrics.overlap_dice_coefficient, run2.metrics.overlap_dice_coefficient, 'Dice overlap must be deterministic');
      assert.strictEqual(run1.simulation.particles.length, run2.simulation.particles.length, 'Particle count must match');
      assert.strictEqual(run1.verdict, 'SUPPORTED', 'Primary suspect should be SUPPORTED hypothesis');
      console.log(`  [PASS] Counterfactual determinism verified: Dice ${(run1.metrics.overlap_dice_coefficient * 100).toFixed(1)}%, Verdict: ${run1.verdict}`);

      // 5. Verify Dynamic Evidence Graph Builder
      console.log('Test E: Testing buildDynamicEvidenceGraph...');
      import('./src/services/evidenceGraphBuilder.ts').then(({ buildDynamicEvidenceGraph }) => {
        const graph = buildDynamicEvidenceGraph({
          sarMetadata: caseData.CASE_0004_SAR_METADATA,
          metocean: caseData.CASE_0004_METOCEAN,
          sourceRecon: caseData.CASE_0004_SOURCE_RECONSTRUCTION,
          candidate: candA,
          counterfactualResult: run1.testResult,
          attributionScore: execRes.result.attributionScore,
          impact: caseData.CASE_0004_IMPACT,
          isLiveDerived: false,
        });

        assert.strictEqual(graph.nodes.length, 9, 'Evidence graph must contain exactly 9 nodes');
        assert.strictEqual(graph.edges.length, 8, 'Evidence graph must contain 8 sequential edges');
        console.log(`  [PASS] Evidence graph generated ${graph.nodes.length} nodes and ${graph.edges.length} edges successfully`);

        console.log('\nALL 5 FRONTEND SIMULATION ENGINE & DATA TESTS PASSED SUCCESSFULLY!');
      });
    });
  });
}).catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
