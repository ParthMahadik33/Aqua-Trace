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
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const text = `
AQUATRACE MARITIME INTELLIGENCE // OFFICIAL INCIDENT DOSSIER
CASE ID: ${report.caseId}
INCIDENT REF: ${report.incidentRef}
DATE: ${report.generatedDate}
CLASSIFICATION: MARPOL ANNEX I INVESTIGATION // HIGH PRIORITY
CRYPTOGRAPHIC HASH: ${report.cryptographicEvidenceHash}

EXECUTIVE SUMMARY:
${report.executiveSummary}

VESSEL OF INTEREST:
Name: ${primarySuspect.name}
IMO: ${primarySuspect.imo} | MMSI: ${primarySuspect.mmsi}
Flag: ${primarySuspect.flag} | Type: ${primarySuspect.vesselType}
DWT: ${primarySuspect.dwt} | Built: ${primarySuspect.builtYear}
Attribution Score: ${primarySuspect.attributionScore}% (Model Estimate)
Closest Approach: ${primarySuspect.closestApproachDistanceNm} nm @ ${primarySuspect.closestApproachTimeUtc}

SAR OBSERVATION:
Platform: ${sarMetadata.platform} | Orbit: ${sarMetadata.orbitNumber}
Acquisition: ${sarMetadata.acquisitionTimestamp}
Slick Surface Area: ${sarMetadata.slickAreaKm2} km² (${sarMetadata.pixelCount} pixels)
Centroid: ${sarMetadata.slickBbox.centerLat}°N, ${sarMetadata.slickBbox.centerLon}°E

SOURCE RECONSTRUCTION (HINDCAST):
Source Hypothesis Centroid: ${sourceRecon.originCentroid.lat}°N, ${sourceRecon.originCentroid.lon}°E
Release Window: ${sourceRecon.estimatedReleaseStartUtc} to ${sourceRecon.estimatedReleaseEndUtc}
Estimated Volume: ${sourceRecon.estimatedSpillVolumeM3} m³ (${sourceRecon.bonnDescription})

COUNTERFACTUAL SOURCE HYPOTHESIS TEST:
Question: "If this vessel were the source, could a plausible release along its trajectory produce the observed slick?"
Verdict: SUPPORTED (Dice Overlap 91.4%, Orientation Delta 2.0°)

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
    <div className="fixed inset-0 z-[900] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-text animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0A0E17] border border-white/20 rounded-2xl flex flex-col shadow-2xl overflow-hidden font-sans text-zinc-200">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-[#070A10] border-b border-white/10 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide">
                OFFICIAL INCIDENT INVESTIGATION DOSSIER
              </div>
              <div className="text-[10px] text-zinc-400">
                MARPOL ANNEX I FORENSIC ATTRIBUTION // CASE 0004
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">COPIED</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs text-emerald-300 transition-colors cursor-pointer font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Dossier Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar text-xs leading-relaxed print:text-black print:bg-white">
          {/* Official Dossier Header */}
          <div className="border-b border-white/10 pb-6 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-black text-amber-400 tracking-wider">
                  MARITIME INCIDENT ATTRIBUTION BUREAU
                </div>
                <div className="text-[11px] text-zinc-400">
                  AquaTrace Autonomous Satellite Radar Surveillance &amp; Attribution Engine
                </div>
              </div>

              <div className="text-left sm:text-right text-[10px] text-zinc-400">
                <div>Case Ref: <strong className="text-white">{report.incidentRef}</strong></div>
                <div>Issued: <strong className="text-white">{report.generatedDate}</strong></div>
                <div className="text-emerald-400 font-bold">STATUS: PROSECUTION READY</div>
              </div>
            </div>

            {/* Cryptographic Evidence Hash */}
            <div className="mt-4 p-2.5 rounded bg-white/5 border border-white/5 text-[10px] text-zinc-400 flex items-center justify-between break-all">
              <span>SHA-256: {report.cryptographicEvidenceHash}</span>
              <span className="ml-2 text-emerald-400 font-bold whitespace-nowrap">
                TAMPER-PROOF VALIDATED
              </span>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>1. Executive Summary of Incident</span>
            </h3>
            <p className="text-zinc-300 text-justify bg-[#0C121E] p-4 rounded-xl border border-white/5 leading-relaxed font-sans">
              {report.executiveSummary}
            </p>
          </div>

          {/* Section 2: Evidentiary Target & Vessel of Interest Particulars */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>2. Vessel of Interest Particulars &amp; Attribution Hypothesis</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
              <div className="p-3.5 rounded-xl bg-[#0C121E] border border-white/5 space-y-1.5">
                <div className="text-sm font-bold text-white">{primarySuspect.name}</div>
                <div className="text-zinc-400 text-[11px]">
                  IMO Number: <strong className="text-zinc-200">{primarySuspect.imo}</strong>
                </div>
                <div className="text-zinc-400 text-[11px]">
                  MMSI Telemetry: <strong className="text-zinc-200">{primarySuspect.mmsi}</strong>
                </div>
                <div className="text-zinc-400 text-[11px]">
                  Flag State: <strong className="text-zinc-200">{primarySuspect.flag}</strong>
                </div>
                <div className="text-zinc-400 text-[11px]">
                  Vessel Type: <strong className="text-zinc-200">{primarySuspect.vesselType}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#140D07] border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold">ATTRIBUTION SCORE</span>
                  <span className="text-base font-black text-emerald-400">
                    {primarySuspect.attributionScore}%
                  </span>
                </div>
                <div className="text-zinc-400 text-[11px]">
                  Closest Approach: <strong className="text-white">{primarySuspect.closestApproachDistanceNm} nm</strong> at {primarySuspect.closestApproachTimeUtc.slice(11, 16)} UTC
                </div>
                <div className="text-zinc-400 text-[11px]">
                  Course Alignment: <strong className="text-white">{primarySuspect.courseAtClosestApproachDeg}°</strong> vs Slick Axis 052°
                </div>
                <div className="text-zinc-400 text-[11px]">
                  Speed Dip Anomaly: <strong className="text-rose-400">-{primarySuspect.speedAnomalyDipKn} knots</strong>
                </div>
                <div className="text-[10px] text-zinc-500">
                  Label: MODEL ESTIMATE // ANALYST REVIEW REQUIRED
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Satellite Radar Observation Data */}
          <div className="space-y-2 font-mono">
            <h3 className="font-mono text-xs font-bold text-purple-300 uppercase tracking-wider">
              3. Copernicus Sentinel-1A SAR Acquisition Telemetry
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 rounded bg-white/5 border border-white/5">
                <div className="text-zinc-400 text-[10px]">PLATFORM</div>
                <div className="font-bold text-white">{sarMetadata.platform}</div>
              </div>
              <div className="p-2.5 rounded bg-white/5 border border-white/5">
                <div className="text-zinc-400 text-[10px]">ORBIT / PASS</div>
                <div className="font-bold text-white">#{sarMetadata.orbitNumber} ({sarMetadata.passDirection})</div>
              </div>
              <div className="p-2.5 rounded bg-white/5 border border-white/5">
                <div className="text-zinc-400 text-[10px]">ACQUISITION TIME</div>
                <div className="font-bold text-white">{sarMetadata.acquisitionTimestamp}</div>
              </div>
              <div className="p-2.5 rounded bg-white/5 border border-white/5">
                <div className="text-zinc-400 text-[10px]">SURFACE SLICK AREA</div>
                <div className="font-bold text-amber-300">{sarMetadata.slickAreaKm2} km² ({sarMetadata.pixelCount} px)</div>
              </div>
            </div>
          </div>

          {/* Section 4: Counterfactual Source Hypothesis Test Exhibit */}
          <div className="space-y-2 font-mono">
            <h3 className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              <span>4. Counterfactual Source Hypothesis Test Exhibit</span>
            </h3>

            <div className="p-4 rounded-xl bg-[#0B1510] border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-zinc-300 text-xs">
                  <strong>Hypothesis Question:</strong> &quot;If MT NORDIC POLARIS were the source, could a plausible release along its trajectory produce the observed slick?&quot;
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                  VERDICT: SUPPORTED
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded bg-white/5">
                  <div className="text-zinc-400 text-[10px]">Spatial Overlap (Dice)</div>
                  <div className="text-sm font-bold text-emerald-400">91.4% (0.914)</div>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <div className="text-zinc-400 text-[10px]">Heading Deviation</div>
                  <div className="text-sm font-bold text-white">2.0° (Sim 054° vs Obs 052°)</div>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <div className="text-zinc-400 text-[10px]">Volume Rate Consistency</div>
                  <div className="text-sm font-bold text-white">180 m³/h (Feasible)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Legal Statutes Violated */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold text-rose-400 uppercase tracking-wider">
              5. International Conventions &amp; Legal Statues Violated
            </h3>
            <div className="p-3.5 rounded-xl bg-[#140A0A] border border-rose-500/30 space-y-2 font-mono text-[11px]">
              {report.legalViolations.map((v, i) => (
                <div key={i} className="flex items-start gap-2 text-zinc-300">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Chain of Custody Verification */}
          <div className="space-y-2 font-mono">
            <h3 className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
              6. Evidentiary Chain-of-Custody Audit Log
            </h3>
            <table className="w-full text-left text-[11px] border-collapse bg-[#0C121E] rounded-xl overflow-hidden">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 bg-white/5">
                  <th className="p-2.5">Investigation Step</th>
                  <th className="p-2.5">Data Source / Engine</th>
                  <th className="p-2.5">Timestamp (UTC)</th>
                  <th className="p-2.5 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {report.chainOfCustody.map((c, i) => (
                  <tr key={i}>
                    <td className="p-2.5 font-bold text-white">{c.step}</td>
                    <td className="p-2.5 text-zinc-400">{c.source}</td>
                    <td className="p-2.5 text-zinc-400">{c.timestamp}</td>
                    <td className="p-2.5 text-right text-emerald-400 font-bold">VERIFIED</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MANDATORY CLOSING STATEMENT & LEGAL DISCLAIMER */}
          <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/50 space-y-2 font-mono">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Mandatory Investigative Hypothesis Declaration</span>
            </div>
            <p className="text-zinc-200 text-xs font-bold leading-relaxed">
              &quot;Attribution is an investigative hypothesis and requires analyst verification.&quot;
            </p>
            <p className="text-[10px] text-zinc-400">
              The findings compiled herein are derived from automated SAR radiometry, Lagrangian hydrodynamics, and AIS spatio-temporal correlation. They constitute probable evidentiary leads for Port State Control inspection and administrative inquiry.
            </p>
          </div>

          {/* Sign-off Authority Block */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between font-mono text-[11px] text-zinc-400">
            <div>
              <div>Reporting Officer: <strong className="text-white">{report.reportingOfficer}</strong></div>
              <div>Lead Investigator: <strong className="text-white">{report.leadInvestigator}</strong></div>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-2 text-emerald-400 font-bold">
              <Stamp className="w-5 h-5" />
              <span>MARITIME AUTHORITY SEAL APPLIED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentReportModal;
