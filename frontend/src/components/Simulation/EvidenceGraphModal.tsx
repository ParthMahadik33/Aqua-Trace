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
    <div className="fixed inset-0 z-[950] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-text animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#0A0E17] border border-cyan-500/30 rounded-2xl flex flex-col shadow-2xl overflow-hidden font-sans text-zinc-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#070A10] border-b border-white/10 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>INTERACTIVE EVIDENCE CHAIN GRAPH</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  9 CONNECTED NODES
                </span>
              </div>
              <div className="text-[10px] text-zinc-400">
                End-to-End Reasoning: SAR Observation &rarr; Attribution Hypothesis &rarr; Legal Action
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Split view (Left: Graph flow timeline; Right: Detailed Node Inspector) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: Sequential Evidence Chain Flow */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar border-b lg:border-b-0 lg:border-r border-white/10 bg-[#06090F]/70">
            <div className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Reasoning Progression</span>
              <span className="text-[10px] text-zinc-500">Click node to inspect</span>
            </div>

            <div className="space-y-2.5">
              {graphData.nodes.map((node, idx) => {
                const isSelected = node.id === selectedNodeId;

                const badgeBg =
                  node.sourceStatus.includes('REAL')
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                    : node.sourceStatus.includes('PROTOTYPE')
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                    : node.sourceStatus.includes('SIMULATED')
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    : node.sourceStatus.includes('ESTIMATE') || node.sourceStatus.includes('REVIEW')
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';

                return (
                  <div key={node.id} className="relative">
                    <button
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer font-mono flex items-center justify-between group ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                          : 'bg-[#0A0E18] hover:bg-[#111726] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Step Number Bubble */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                            isSelected
                              ? 'bg-cyan-400 text-black font-black'
                              : 'bg-white/5 text-zinc-400 border border-white/10 group-hover:text-white'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold transition-colors ${
                                isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
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

                          <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 font-sans">
                            {node.valueSummary}
                          </div>
                        </div>
                      </div>

                      {/* Confidence Score Gauge */}
                      <div className="text-right pl-3">
                        <div className="text-xs font-bold text-emerald-400">
                          {node.confidenceScore}%
                        </div>
                        <div className="text-[9px] text-zinc-500">Confidence</div>
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
            <div className="w-full lg:w-[380px] p-6 flex flex-col justify-between bg-[#080C14] font-mono text-xs overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {/* Node Header */}
                <div className="border-b border-white/10 pb-4">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                    {selectedNode.stageName}
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {selectedNode.label}
                  </h3>
                  <div className="mt-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                      {selectedNode.sourceStatus}
                    </span>
                  </div>
                </div>

                {/* Value Summary Box */}
                <div className="p-3.5 rounded-xl bg-[#0C121E] border border-white/10 space-y-1">
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                    Derived Finding / Value
                  </div>
                  <div className="text-xs text-white leading-relaxed font-sans">
                    {selectedNode.valueSummary}
                  </div>
                </div>

                {/* Supporting Metrics List */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Supporting Parametric Metrics
                  </div>
                  <div className="space-y-1.5">
                    {selectedNode.supportingMetrics.map((m, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-[11px]"
                      >
                        <span className="text-zinc-400">{m.label}</span>
                        <strong className="text-white">{m.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Methodological Caveats / Limitations */}
                <div className="p-3 rounded-xl bg-[#140E0A] border border-amber-500/30 space-y-1">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Investigative Note &amp; Limits</span>
                  </div>
                  <p className="text-[11px] font-sans text-zinc-300 leading-normal">
                    {selectedNode.limitationsOrNotes}
                  </p>
                </div>
              </div>

              {/* Action Button: Jump directly to this simulation stage */}
              <div className="pt-4 border-t border-white/10 mt-4">
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigateToStep) onNavigateToStep(selectedNode.stepId);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50"
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
