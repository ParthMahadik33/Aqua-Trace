'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  ChevronRight,
  ShieldCheck,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  EvidenceGraphNode,
  EvidenceGraphEdge,
  SimulationStepId,
} from '@/types/simulation';

interface EvidenceGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphData: { nodes: EvidenceGraphNode[]; edges: EvidenceGraphEdge[] };
  onNavigateToStep?: (stepId: SimulationStepId) => void;
}

export const EvidenceGraphModal: React.FC<EvidenceGraphModalProps> = ({
  isOpen,
  onClose,
  graphData,
  onNavigateToStep,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(graphData.nodes[0]?.id || '');

  if (!isOpen) return null;

  const selectedNode = graphData.nodes.find((n) => n.id === selectedNodeId) || graphData.nodes[0];

  return (
    <div className="fixed inset-0 z-[950] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 select-text animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-surface border border-border rounded-lg flex flex-col shadow-xl overflow-hidden font-sans text-foreground transition-colors">
        {/* Top Header */}
        <div className="px-6 py-3.5 bg-panel border-b border-border flex items-center justify-between font-mono">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-sky-600/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground tracking-wide flex items-center gap-2">
                <span>INVESTIGATION EVIDENCE CHAIN GRAPH</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-panel text-muted-foreground border border-border">
                  9 CONNECTED STAGES
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Sequential Evidence: SAR Observation &rarr; Hindcast Corridor &rarr; AIS Telemetry &rarr; Counterfactual &rarr; Attribution
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded bg-surface hover:bg-panel text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Split view (Left: Graph flow timeline; Right: Detailed Node Inspector) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: Sequential Evidence Chain Flow */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar border-b lg:border-b-0 lg:border-r border-border bg-panel/30">
            <div className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Reasoning Progression</span>
              <span className="text-[10px] text-muted-foreground">Click node to inspect</span>
            </div>

            <div className="space-y-2.5">
              {graphData.nodes.map((node, idx) => {
                const isSelected = node.id === selectedNodeId;

                const badgeBg =
                  node.sourceStatus.includes('REAL')
                    ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30'
                    : node.sourceStatus.includes('PROTOTYPE')
                    ? 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30'
                    : node.sourceStatus.includes('SIMULATED')
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';

                return (
                  <div key={node.id} className="relative">
                    <button
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`w-full text-left p-3 rounded border transition-colors cursor-pointer font-mono flex items-center justify-between group ${
                        isSelected
                          ? 'bg-surface border-sky-500 ring-1 ring-sky-500/30 shadow-sm'
                          : 'bg-surface hover:bg-panel border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Step Number Bubble */}
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold ${
                            isSelected
                              ? 'bg-sky-600 text-white'
                              : 'bg-panel text-muted-foreground border border-border'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold transition-colors ${
                                isSelected ? 'text-foreground' : 'text-foreground/90'
                              }`}
                            >
                              {node.label}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold uppercase ${badgeBg}`}
                            >
                              {node.sourceStatus}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-sans">
                            {node.valueSummary}
                          </div>
                        </div>
                      </div>

                      {/* Confidence Score Gauge */}
                      <div className="text-right pl-3">
                        <div className="text-xs font-bold text-foreground">
                          {node.confidenceScore}%
                        </div>
                        <div className="text-[9px] text-muted-foreground">Confidence</div>
                      </div>
                    </button>

                    {/* Connecting arrow down */}
                    {idx < graphData.nodes.length - 1 && (
                      <div className="flex justify-center my-1">
                        <div className="w-px h-3 bg-white/15" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Detailed Node Inspector */}
          {selectedNode && (
            <div className="w-full lg:w-[380px] p-5 flex flex-col justify-between bg-surface font-mono text-xs overflow-y-auto custom-scrollbar border-t lg:border-t-0 border-border">
              <div className="space-y-4">
                {/* Node Header */}
                <div className="border-b border-border pb-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {selectedNode.stageName}
                  </div>
                  <h3 className="text-sm font-bold text-foreground mt-0.5">
                    {selectedNode.label}
                  </h3>
                  <div className="mt-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-border bg-panel text-foreground">
                      {selectedNode.sourceStatus}
                    </span>
                  </div>
                </div>

                {/* Value Summary Box */}
                <div className="p-3 rounded bg-panel/60 border border-border space-y-1">
                  <div className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                    Derived Finding / Value
                  </div>
                  <div className="text-xs text-foreground leading-relaxed font-sans">
                    {selectedNode.valueSummary}
                  </div>
                </div>

                {/* Supporting Metrics List */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Supporting Parametric Metrics
                  </div>
                  <div className="space-y-1">
                    {selectedNode.supportingMetrics.map((m, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-panel/40 border border-border/50 flex items-center justify-between text-[11px]"
                      >
                        <span className="text-muted-foreground">{m.label}</span>
                        <strong className="text-foreground font-semibold">{m.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Methodological Caveats / Limitations */}
                <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Investigative Note &amp; Limits</span>
                  </div>
                  <p className="text-[11px] font-sans text-foreground/90 leading-normal">
                    {selectedNode.limitationsOrNotes}
                  </p>
                </div>
              </div>

              {/* Action Button: Jump directly to this simulation stage */}
              <div className="pt-4 border-t border-border mt-4">
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateToStep) onNavigateToStep(selectedNode.stepId);
                  }}
                  className="w-full py-2 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>GO TO THIS INVESTIGATION STAGE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidenceGraphModal;
