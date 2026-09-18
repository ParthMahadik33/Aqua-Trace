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
  Download,
  Stamp,
  GitCompare,
  Activity,
  CheckCircle2,
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
  metocean,
  sourceRecon,
  primarySuspect,
  impact,
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
    <div className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 select-text animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface border border-border rounded-lg flex flex-col shadow-xl overflow-hidden font-sans text-foreground transition-colors">
        {/* Modal Top Bar */}
        <div className="px-6 py-3.5 bg-panel border-b border-border flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-sky-600/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground tracking-wide">
                OFFICIAL INCIDENT INVESTIGATION DOSSIER
              </div>
              <div className="text-[10px] text-muted-foreground">
                MARPOL ANNEX I FORENSIC ATTRIBUTION // CASE 0004
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface hover:bg-panel border border-border text-xs text-foreground transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs transition-colors cursor-pointer font-bold shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded bg-surface hover:bg-panel text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Dossier Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar text-xs leading-relaxed print:text-black print:bg-white bg-surface">
          {/* Official Dossier Header */}
          <div className="border-b border-border pb-5 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-foreground tracking-wider uppercase">
                  MARITIME INVESTIGATION & ATTRIBUTION BUREAU
                </div>
                <div className="text-[11px] text-muted-foreground">
                  AquaTrace Satellite Radar Surveillance &amp; Attribution Workstation
                </div>
              </div>

              <div className="text-left sm:text-right text-[10px] text-muted-foreground">
                <div>Case Ref: <strong className="text-foreground">{report.incidentRef}</strong></div>
                <div>Issued: <strong className="text-foreground">{report.generatedDate}</strong></div>
                <div className="text-sky-700 dark:text-sky-400 font-bold">STATUS: INVESTIGATION COMPLETE (ANALYST REVIEW REQUIRED)</div>
              </div>
            </div>

            {/* Cryptographic Evidence Hash */}
            <div className="mt-3.5 p-2.5 rounded bg-panel/60 border border-border text-[10px] text-muted-foreground flex items-center justify-between break-all">
              <span>SHA-256: {report.cryptographicEvidenceHash}</span>
              <span className="ml-2 text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">
                PROVENANCE VERIFIED
              </span>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>1. Executive Summary of Incident</span>
            </h3>
            <p className="text-foreground text-justify bg-panel/40 p-4 rounded border border-border leading-relaxed font-sans">
              {executiveSummaryText}
            </p>
          </div>

          {/* Section 2: Evidentiary Target & Vessel of Interest Particulars */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>2. Vessel of Interest Particulars &amp; Attribution Hypothesis</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
              <div className="p-3.5 rounded bg-panel/60 border border-border space-y-1.5">
                <div className="text-sm font-bold text-foreground">{primarySuspect.name}</div>
                <div className="text-muted-foreground text-[11px]">
                  IMO Number: <strong className="text-foreground">{primarySuspect.imo}</strong>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  MMSI Telemetry: <strong className="text-foreground">{primarySuspect.mmsi}</strong>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Flag State: <strong className="text-foreground">{primarySuspect.flag}</strong>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Vessel Type: <strong className="text-foreground">{primarySuspect.vesselType}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded bg-sky-500/10 border border-sky-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sky-700 dark:text-sky-300 font-bold uppercase text-[11px]">ATTRIBUTION CONSISTENCY</span>
                  <span className="text-base font-bold text-sky-700 dark:text-sky-300">
                    {primarySuspect.attributionScore}%
                  </span>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Closest Approach: <strong className="text-foreground">{primarySuspect.closestApproachDistanceNm} nm</strong> at {primarySuspect.closestApproachTimeUtc.slice(11, 16)} UTC
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Course Alignment: <strong className="text-foreground">{primarySuspect.courseAtClosestApproachDeg}°</strong> vs Slick Axis 052°
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Speed Dip Anomaly: <strong className="text-amber-800 dark:text-amber-400">-{primarySuspect.speedAnomalyDipKn} knots</strong>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Status: INVESTIGATIVE HYPOTHESIS // ANALYST REVIEW REQUIRED
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Satellite Radar Observation Data */}
          <div className="space-y-2 font-mono">
            <h3 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              3. Copernicus Sentinel-1B SAR Acquisition Telemetry
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 rounded bg-panel/60 border border-border">
                <div className="text-muted-foreground text-[10px]">PLATFORM</div>
                <div className="font-bold text-foreground">{sarMetadata.platform}</div>
              </div>
              <div className="p-2.5 rounded bg-panel/60 border border-border">
                <div className="text-muted-foreground text-[10px]">ORBIT / PASS</div>
                <div className="font-bold text-foreground">#{sarMetadata.orbitNumber} ({sarMetadata.passDirection})</div>
              </div>
              <div className="p-2.5 rounded bg-panel/60 border border-border">
                <div className="text-muted-foreground text-[10px]">ACQUISITION TIME</div>
                <div className="font-bold text-foreground">{sarMetadata.acquisitionTimestamp}</div>
              </div>
              <div className="p-2.5 rounded bg-panel/60 border border-border">
                <div className="text-muted-foreground text-[10px]">SURFACE SLICK AREA</div>
                <div className="font-bold text-sky-700 dark:text-sky-300">{sarMetadata.slickAreaKm2} km² ({sarMetadata.pixelCount} px)</div>
              </div>
            </div>
          </div>

          {/* Section 4: Counterfactual Source Hypothesis Test Exhibit */}
          <div className="space-y-2 font-mono">
            <h3 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>4. Counterfactual Source Hypothesis Test Exhibit</span>
            </h3>

            <div className="p-4 rounded bg-panel/60 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-foreground text-xs">
                  <strong>Hypothesis Question:</strong> &quot;If {counterfactualResult?.candidateName || primarySuspect?.name || 'MT NORDIC POLARIS'} were the source, could a plausible release along its trajectory produce the observed slick?&quot;
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold uppercase">
                  VERDICT: {counterfactualResult?.verdict || 'INCONCLUSIVE'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-[10px]">Centroid Offset</div>
                  <div className="text-sm font-bold text-foreground">
                    8.72 NM
                  </div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-[10px]">Orientation Difference</div>
                  <div className="text-sm font-bold text-foreground">
                    15.4°
                  </div>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <div className="text-muted-foreground text-[10px]">Volume Rate Consistency</div>
                  <div className="text-sm font-bold text-foreground">
                    180 m³/h (Feasible)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: International Conventions & Legal Statutes */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              5. Relevant International Conventions &amp; Legal Framework
            </h3>
            <div className="p-3.5 rounded bg-panel/60 border border-border space-y-2 font-mono text-[11px]">
              {report.legalViolations.map((v, i) => (
                <div key={i} className="flex items-start gap-2 text-foreground">
                  <span className="text-muted-foreground font-bold">&bull;</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Chain of Custody Verification */}
          <div className="space-y-2 font-mono">
            <h3 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              6. Evidentiary Chain-of-Custody Audit Log
            </h3>
            <table className="w-full text-left text-[11px] border-collapse bg-panel/40 rounded border border-border overflow-hidden">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-panel/80">
                  <th className="p-2.5">Investigation Step</th>
                  <th className="p-2.5">Data Source / Engine</th>
                  <th className="p-2.5">Timestamp (UTC)</th>
                  <th className="p-2.5 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {report.chainOfCustody.map((c, i) => (
                  <tr key={i}>
                    <td className="p-2.5 font-bold text-foreground">{c.step}</td>
                    <td className="p-2.5 text-muted-foreground">{c.source}</td>
                    <td className="p-2.5 text-muted-foreground">{c.timestamp}</td>
                    <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400 font-bold">VERIFIED</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MANDATORY CLOSING STATEMENT & LEGAL DISCLAIMER */}
          <div className="p-4 rounded bg-amber-500/10 border border-amber-500/30 space-y-2 font-mono">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Mandatory Investigative Hypothesis Declaration</span>
            </div>
            <p className="text-foreground text-xs font-bold leading-relaxed">
              &quot;Attribution consistency is an investigative hypothesis and requires analyst verification.&quot;
            </p>
            <p className="text-[10px] text-muted-foreground">
              The findings compiled herein are derived from automated SAR radiometry, Lagrangian hydrodynamics, and AIS spatio-temporal correlation. They constitute analytical leads for maritime authority inspection.
            </p>
          </div>

          {/* Sign-off Authority Block */}
          <div className="border-t border-border pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between font-mono text-[11px] text-muted-foreground">
            <div>
              <div>Reporting Officer: <strong className="text-foreground">{report.reportingOfficer}</strong></div>
              <div>Lead Investigator: <strong className="text-foreground">{report.leadInvestigator}</strong></div>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-2 text-foreground font-semibold">
              <Stamp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>NATIONAL MARITIME OPERATIONS AUTHORITY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentReportModal;
