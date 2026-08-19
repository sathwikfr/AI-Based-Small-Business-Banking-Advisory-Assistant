import { Signal } from '@prisma/client';
import { NBAResult } from '../synthesis/types';

export interface ExplainNode {
  label: string;
  type: 'action' | 'signal' | 'metric' | 'source';
  value?: string;
  children: ExplainNode[];
}

export function buildExplainTree(nba: NBAResult, signals: Signal[]): ExplainNode {
  return {
    label: nba.title,
    type: 'action',
    children: nba.triggeringSignalIds.map(id => {
      const signal = signals.find(s => s.id === id);
      if (!signal) {
        return {
          label: 'Unknown Signal',
          type: 'signal',
          children: []
        };
      }
      return {
        label: signal.metricLabel || signal.code,
        type: 'signal',
        children: [{
          label: `Raw metric: ${signal.metricValue} (${signal.code})`,
          type: 'metric',
          value: String(signal.metricValue),
          children: [{
            label: 'Source: transaction ledger, last 90 days',
            type: 'source',
            children: []
          }],
        }],
      };
    }),
  };
}
