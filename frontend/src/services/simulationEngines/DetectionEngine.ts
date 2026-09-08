import { SimulationEngineModule, SimulationEngineOutput } from './types';
import { SimulationStatusTag } from '@/types/simulation';

export interface DetectionInput {
  channels: ('VV' | 'VH')[];
  sceneDimensions: { width: number; height: number };
  sampleId: string;
  sigma0DataAvailable: boolean;
}

export interface DetectionParameters {
  modelBackbone: 'ConvNeXt-Tiny' | 'ResNet50' | 'EfficientNet-B4';
  inputResolution: [number, number];
  normalization: 'MinMax-dB-Clipping';
  confidenceThreshold: number;
}

export interface DetectionResult {
  primaryClass: 'OIL' | 'LOOKALIKE' | 'NO_OIL';
  classProbabilities: {
    oil: number; // 0-1
    lookalike: number;
    noOil: number;
  };
  interpretiveFactors: {
    backscatterDamping: { score: number; level: 'HIGH' | 'MEDIUM' | 'LOW'; note: string };
    slickGeometry: { score: number; level: 'HIGH' | 'MEDIUM' | 'LOW'; note: string };
    spatialCoherence: { score: number; level: 'HIGH' | 'MEDIUM' | 'LOW'; note: string };
    lookalikeSimilarity: { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string };
  };
}

export class DetectionEngine
  implements SimulationEngineModule<DetectionInput, DetectionParameters, DetectionResult>
{
  readonly moduleName = 'DetectionEngine';
  readonly version = '1.2.0-convnext';
  readonly defaultStatusTag: SimulationStatusTag = 'PROTOTYPE MODEL';

  execute(
    input: DetectionInput,
    parameters: DetectionParameters
  ): SimulationEngineOutput<DetectionInput, DetectionParameters, DetectionResult> {
    const result: DetectionResult = {
      primaryClass: 'OIL',
      classProbabilities: {
        oil: 0.987,
        lookalike: 0.011,
        noOil: 0.002,
      },
      interpretiveFactors: {
        backscatterDamping: {
          score: 0.94,
          level: 'HIGH',
          note: 'VV/VH damping delta reaches 9.42 dB, indicative of capillary wave suppression.',
        },
        slickGeometry: {
          score: 0.91,
          level: 'HIGH',
          note: 'Elongated linear plume oriented along prevailing surface current heading.',
        },
        spatialCoherence: {
          score: 0.89,
          level: 'HIGH',
          note: 'Continuous contiguous patch with distinct sharp boundary gradients.',
        },
        lookalikeSimilarity: {
          score: 0.08,
          level: 'LOW',
          note: 'Biogenic/natural slick morphology rejected due to non-feathered edge profile.',
        },
      },
    };

    return {
      moduleName: this.moduleName,
      timestampUtc: new Date().toISOString(),
      input,
      parameters,
      result,
      confidence: 98.7,
      evidence: [
        'ConvNeXt-Tiny deep feature extractor registered 98.7% activation for mineral hydrocarbon slick.',
        'Negative backscatter suppression verified across dual-polarization C-band channels.',
        'Atmospheric low-wind false alarm rejected; surface wind is 4.8 m/s (outside wind-shadow range).',
      ],
      sourceStatus: this.defaultStatusTag,
      interpretiveNotes:
        'Classification denotes mineral oil-like radar suppression. Final judicial attribution requires multi-sensor and legal analyst verification.',
    };
  }
}
