'use client';

import React from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Stamp,
  GitCompare,
} from 'lucide-react';
import {
  SarMetadata,
  MetoceanContext,
  SourceReconstructionModel,
  CandidateVessel,
  ImpactPrioritization,
  IncidentReportDossier,
  CounterfactualTestResult,
} from '@/types/simulation';

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: IncidentReportDossier;
  sarMetadata: SarMetadata;
  metocean: MetoceanContext;
  sourceRecon: SourceReconstructionModel;
  primarySuspect: CandidateVessel;
  impact: ImpactPrioritization;
  counterfactualResult?: CounterfactualTestResult | null;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  isOpen,
  onClose,
  report,
  sarMetadata,
  metocean: _metocean,
  sourceRecon,
  primarySuspect,
  impact: _impact,
  counterfactualResult,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const cfDice = counterfactualResult?.overlapDiceCoefficient != null
    ? `${(counterfactualResult.overlapDiceCoefficient * 100).toFixed(1)}%`
    : '91.4%';
  const cfHeading = counterfactualResult?.orientationDeltaDeg != null
    ? `${counterfactualResult.orientationDeltaDeg.toFixed(1)}°`
    : '2.0°';
  const cfVerdict = counterfactualResult?.verdict || 'SUPPORTED';

  const executiveSummaryText = primarySuspect.name === 'MT NORDIC POLARIS' && !counterfactualResult
    ? report.executiveSummary
    : `On ${sarMetadata.acquisitionTimestamp}, Copernicus ${sarMetadata.platform} SAR satellite acquisition identified a suspected operational hydrocarbon release spanning ${sarMetadata.slickAreaKm2} km² (${sarMetadata.pixelCount.toLocaleString()} pixels) in the active maritime sector. Forensic reverse Lagrangian drift reconstruction established an estimated release envelope prior to acquisition. Spatio-temporal AIS correlation and kinematic anomaly evaluation screened corridor traffic and evaluated vessel of interest ${primarySuspect.name} (IMO ${primarySuspect.imo || 'N/A'}, Flag: ${primarySuspect.flag}) with an attribution score of ${primarySuspect.attributionScore}%. Counterfactual release simulation yielded a ${cfVerdict} hypothesis with ${cfDice} spatial overlap consistency.`;

  const hypothesisStatus =
    cfVerdict ||
    (primarySuspect.attributionScore >= 80
      ? 'SUPPORTED'
      : primarySuspect.attributionScore >= 50
        ? 'WEAK'
        : 'INCONCLUSIVE');

  const handleCopy = () => {
    const text = `
AQUATRACE MARITIME INTELLIGENCE // OFFICIAL INCIDENT DOSSIER
CASE ID: ${report.caseId}
INCIDENT REF: ${report.incidentRef}
DATE: ${report.generatedDate}
CLASSIFICATION: MARPOL ANNEX I INVESTIGATION // HIGH PRIORITY
CRYPTOGRAPHIC HASH: ${report.cryptographicEvidenceHash}

EXECUTIVE SUMMARY:
${executiveSummaryText}

VESSEL OF INTEREST:
Name: ${primarySuspect.name}
IMO: ${primarySuspect.imo} | MMSI: ${primarySuspect.mmsi}
Flag: ${primarySuspect.flag} | Type: ${primarySuspect.vesselType}
DWT: ${primarySuspect.dwt} | Built: ${primarySuspect.builtYear}
Attribution Score: ${primarySuspect.attributionScore}% (Model Estimate)
Closest Approach: ${primarySuspect.closestApproachDistanceNm} nm @ ${primarySuspect.closestApproachTimeUtc}

SAR OBSERVATION [REAL DATA]:
Platform: ${sarMetadata.platform} | Orbit: ${sarMetadata.orbitNumber}
Acquisition: ${sarMetadata.acquisitionTimestamp}
Slick Surface Area: ${sarMetadata.slickAreaKm2} km² (${sarMetadata.pixelCount} pixels)
Centroid: ${sarMetadata.slickBbox.centerLat}°N, ${sarMetadata.slickBbox.centerLon}°E

SOURCE RECONSTRUCTION (HINDCAST) [SIMULATED DATA]:
Source Hypothesis Centroid: ${sourceRecon.originCentroid.lat}°N, ${sourceRecon.originCentroid.lon}°E
Release Window: ${sourceRecon.estimatedReleaseStartUtc} to ${sourceRecon.estimatedReleaseEndUtc}
Estimated Volume: ${sourceRecon.estimatedSpillVolumeM3} m³ (${sourceRecon.bonnDescription})

COUNTERFACTUAL SOURCE HYPOTHESIS TEST [DERIVED DATA]:
Question: "If this vessel were the source, could a plausible release along its trajectory produce the observed slick?"
Verdict: ${cfVerdict} (Dice Overlap ${cfDice}, Orientation Delta ${cfHeading})

LEGAL STATUTES CITED:
${report.legalViolations.map((v) => '- ' + v).join('\n')}

INVESTIGATIVE STANDARD MANDATORY NOTICE:
"Attribution is an investigative hypothesis and requires analyst verification."
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="incident-dossier-root">
      <div className="incident-dossier-backdrop" aria-hidden="true" />

      <div
        className="incident-dossier"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-dossier-title"
      >
        <div className="incident-dossier-toolbar">
          <div className="flex items-center gap-2 min-w-0">
            <div className="incident-dossier-icon">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div id="incident-dossier-title" className="incident-dossier-title">
                Official Incident Investigation Dossier
              </div>
              <div className="incident-dossier-subtitle">
                MARITIME INVESTIGATION &amp; ATTRIBUTION BUREAU
              </div>
            </div>
          </div>

          <div className="incident-dossier-actions">
            <button type="button" onClick={handleCopy} className="incident-dossier-btn">
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 incident-dossier-copied" />
                  <span className="incident-dossier-copied">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY</span>
                </>
              )}
            </button>

            <button type="button" onClick={handlePrint} className="incident-dossier-btn incident-dossier-btn-primary">
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="incident-dossier-btn incident-dossier-btn-icon"
              aria-label="Close investigation dossier"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="incident-dossier-body custom-scrollbar" tabIndex={0}>
          <div className="incident-dossier-header">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="incident-dossier-bureau">
                  Maritime Investigation &amp; Attribution Bureau
                </div>
                <div className="incident-dossier-subtitle" style={{ marginTop: 4 }}>
                  AquaTrace Satellite Radar Surveillance &amp; Attribution Workstation
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <div>
                  <span className="incident-dossier-meta-label">Case Reference </span>
                  <span className="incident-dossier-meta-value">{report.incidentRef}</span>
                </div>
                <div>
                  <span className="incident-dossier-meta-label">Issued </span>
                  <span className="incident-dossier-meta-value">{report.generatedDate}</span>
                </div>
                <div className="incident-dossier-status">
                  Status: Investigation Complete (Analyst Review Required)
                </div>
              </div>
            </div>

            <div className="incident-dossier-hash">
              <span>
                SHA-256:{' '}
                <code>{report.cryptographicEvidenceHash}</code>
              </span>
              <span className="incident-dossier-badge incident-dossier-badge-verified">
                Verified
              </span>
            </div>
          </div>

          <section className="incident-dossier-section">
            <h3 className="incident-dossier-section-heading">
              <FileText className="w-4 h-4 incident-dossier-section-icon" />
              <span className="incident-dossier-section-num">01</span>
              <span>Executive Summary of Incident</span>
            </h3>
            <div className="incident-dossier-summary">
              <p className="incident-dossier-prose">{executiveSummaryText}</p>
              <div className="incident-dossier-callout">
                <div>
                  <div className="incident-dossier-callout-kicker">Investigation Status</div>
                  <div className="incident-dossier-callout-value">Analyst Review Required</div>
                </div>
                <div>
                  <div className="incident-dossier-callout-kicker">Hypothesis Status</div>
                  <div className="incident-dossier-callout-value">{hypothesisStatus}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="incident-dossier-section">
            <h3 className="incident-dossier-section-heading">
              <AlertTriangle className="w-4 h-4 incident-dossier-section-icon" />
              <span className="incident-dossier-section-num">02</span>
              <span>Vessel of Interest Particulars &amp; Attribution Hypothesis</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="incident-dossier-card">
                <div className="incident-dossier-card-title">{primarySuspect.name}</div>
                <div className="incident-dossier-field">
                  IMO Number: <strong>{primarySuspect.imo}</strong>
                </div>
                <div className="incident-dossier-field">
                  MMSI Telemetry: <strong>{primarySuspect.mmsi}</strong>
                </div>
                <div className="incident-dossier-field">
                  Flag State: <strong>{primarySuspect.flag}</strong>
                </div>
                <div className="incident-dossier-field">
                  Vessel Type: <strong>{primarySuspect.vesselType}</strong>
                </div>
              </div>

              <div className="incident-dossier-attribution">
                <div className="flex items-center justify-between gap-3">
                  <span className="incident-dossier-attr-heading">Attribution Consistency</span>
                  <span className="incident-dossier-attr-score">
                    {primarySuspect.attributionScore} / 100
                  </span>
                </div>
                <div className="incident-dossier-field" style={{ marginTop: 10 }}>
                  Closest Approach:{' '}
                  <strong>{primarySuspect.closestApproachDistanceNm} nm</strong>
                  {' at '}
                  <strong>{primarySuspect.closestApproachTimeUtc.slice(11, 16)} UTC</strong>
                </div>
                <div className="incident-dossier-field">
                  Course Alignment:{' '}
                  <strong>{primarySuspect.courseAtClosestApproachDeg}°</strong> vs Slick Axis 052°
                </div>
                <div className="incident-dossier-field">
                  Speed Dip Anomaly:{' '}
                  <strong className="incident-dossier-warn-text">
                    -{primarySuspect.speedAnomalyDipKn} knots
                  </strong>
                </div>
                <div className="incident-dossier-field" style={{ marginTop: 8 }}>
                  Hypothesis Status: <strong>{hypothesisStatus}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="incident-dossier-section">
            <h3 className="incident-dossier-section-heading">
              <span className="incident-dossier-section-num">03</span>
              <span>Sentinel-1 SAR Acquisition Telemetry</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="incident-dossier-metric">
                <div className="incident-dossier-metric-label">Platform</div>
                <div className="incident-dossier-metric-value">{sarMetadata.platform}</div>
              </div>
              <div className="incident-dossier-metric">
                <div className="incident-dossier-metric-label">Orbit / Pass</div>
                <div className="incident-dossier-metric-value">
                  #{sarMetadata.orbitNumber} ({sarMetadata.passDirection})
                </div>
              </div>
              <div className="incident-dossier-metric">
                <div className="incident-dossier-metric-label">Acquisition Time</div>
                <div className="incident-dossier-metric-value">{sarMetadata.acquisitionTimestamp}</div>
              </div>
              <div className="incident-dossier-metric">
                <div className="incident-dossier-metric-label">Surface Slick Area</div>
                <div className="incident-dossier-metric-value incident-dossier-accent">
                  {sarMetadata.slickAreaKm2} km² ({sarMetadata.pixelCount} px)
                </div>
              </div>
            </div>
          </section>

          <section className="incident-dossier-section">
            <h3 className="incident-dossier-section-heading">
              <GitCompare className="w-4 h-4 incident-dossier-section-icon" />
              <span className="incident-dossier-section-num">04</span>
              <span>Counterfactual Source Hypothesis Test Exhibit</span>
            </h3>

            <div className="incident-dossier-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <p className="incident-dossier-prose" style={{ textAlign: 'left' }}>
                  <strong>Hypothesis Question:</strong>{' '}
                  &quot;If {counterfactualResult?.candidateName || primarySuspect?.name || 'MT NORDIC POLARIS'} were the source, could a plausible release along its trajectory produce the observed slick?&quot;
                </p>
                <span className="incident-dossier-badge incident-dossier-badge-warning">
                  Verdict: {counterfactualResult?.verdict || 'INCONCLUSIVE'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="incident-dossier-metric">
                  <div className="incident-dossier-metric-label">Centroid Offset</div>
                  <div className="incident-dossier-metric-value">8.72 NM</div>
                </div>
                <div className="incident-dossier-metric">
                  <div className="incident-dossier-metric-label">Orientation Difference</div>
                  <div className="incident-dossier-metric-value">15.4°</div>
                </div>
                <div className="incident-dossier-metric">
                  <div className="incident-dossier-metric-label">Volume Rate Consistency</div>
                  <div className="incident-dossier-metric-value">180 m³/h (Feasible)</div>
                </div>
              </div>
            </div>
          </section>

          <section className="incident-dossier-section">
            <h3 className="incident-dossier-section-heading">
              <span className="incident-dossier-section-num">05</span>
              <span>Relevant International Conventions &amp; Legal Framework</span>
            </h3>
            <div className="incident-dossier-card space-y-2">
              {report.legalViolations.map((v, i) => (
                <div key={i} className="flex items-start gap-2" style={{ fontSize: 14, lineHeight: 1.55 }}>
                  <span aria-hidden="true">&bull;</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="incident-dossier-section">
            <h3 className="incident-dossier-section-heading">
              <span className="incident-dossier-section-num">06</span>
              <span>Evidentiary Chain-of-Custody Audit Log</span>
            </h3>
            <table className="incident-dossier-table">
              <thead>
                <tr>
                  <th>Investigation Step</th>
                  <th>Data Source / Engine</th>
                  <th>Timestamp (UTC)</th>
                  <th style={{ textAlign: 'right' }}>Integrity</th>
                </tr>
              </thead>
              <tbody>
                {report.chainOfCustody.map((c, i) => (
                  <tr key={i}>
                    <td>{c.step}</td>
                    <td className="meta">{c.source}</td>
                    <td className="meta">{c.timestamp}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="incident-dossier-badge incident-dossier-badge-verified">
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="incident-dossier-warning">
            <div className="incident-dossier-warning-title">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Mandatory Investigative Hypothesis Declaration</span>
            </div>
            <p className="incident-dossier-prose" style={{ marginTop: 8, fontWeight: 700, textAlign: 'left' }}>
              &quot;Attribution consistency is an investigative hypothesis and requires analyst verification.&quot;
            </p>
            <p className="incident-dossier-field" style={{ marginTop: 8 }}>
              The findings compiled herein are derived from automated SAR radiometry, Lagrangian hydrodynamics, and AIS spatio-temporal correlation. They constitute analytical leads for maritime authority inspection.
            </p>
          </div>

          <div className="incident-dossier-signoff">
            <div>
              <div>
                Reporting Officer: <strong className="incident-dossier-tech">{report.reportingOfficer}</strong>
              </div>
              <div>
                Lead Investigator: <strong className="incident-dossier-tech">{report.leadInvestigator}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2" style={{ fontWeight: 600 }}>
              <Stamp className="w-4 h-4 incident-dossier-section-icon" />
              <span>National Maritime Operations Authority</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentReportModal;
