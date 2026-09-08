import { SimulationStatusTag } from '@/types/simulation';

export interface SimulationEngineModule<TInput, TParams, TResult> {
  readonly moduleName: string;
  readonly version: string;
  readonly defaultStatusTag: SimulationStatusTag;

  execute(
    input: TInput,
    parameters: TParams
  ): Promise<SimulationEngineOutput<TInput, TParams, TResult>> | SimulationEngineOutput<TInput, TParams, TResult>;
}

export interface SimulationEngineOutput<TInput, TParams, TResult> {
  moduleName: string;
  timestampUtc: string;
  input: TInput;
  parameters: TParams;
  result: TResult;
  confidence: number; // 0-100%
  evidence: string[];
  sourceStatus: SimulationStatusTag;
  interpretiveNotes?: string;
}
