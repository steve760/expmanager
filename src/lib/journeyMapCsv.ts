/**
 * Export journey map table (phases × rows) to CSV for download.
 */

import type { Phase, Journey } from '@/types';
import { getPhaseHealthScore, serializeOpportunities } from '@/lib/utils';

const BUILDIN_ROW_KEYS = [
  'description',
  'phaseHealth',
  'customerJobs',
  'frontStageActions',
  'channels',
  'struggles',
  'internalStruggles',
  'backStageActions',
  'systems',
  'relatedProcesses',
  'opportunities',
  'relatedDocuments',
] as const;

function getOrderedRowIds(journey: Journey | null): { id: string; key: string; label: string; isCustom: boolean }[] {
  if (!journey) {
    return BUILDIN_ROW_KEYS.map((key) => ({
      id: key,
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim(),
      isCustom: false,
    }));
  }
  const defaultOrder = [...BUILDIN_ROW_KEYS];
  const rawOrder = journey.rowOrder;
  const baseOrder = Array.isArray(rawOrder) ? rawOrder : defaultOrder;
  const validBaseOrder = baseOrder.filter(
    (id) => BUILDIN_ROW_KEYS.includes(id as (typeof BUILDIN_ROW_KEYS)[number]) || (journey.customRows ?? []).some((r) => r.id === id)
  );
  const missingBuiltin = BUILDIN_ROW_KEYS.filter((k) => !validBaseOrder.includes(k));
  const order = [...validBaseOrder, ...missingBuiltin];
  const customMap = new Map((journey.customRows ?? []).map((r) => [r.id, r.label]));
  return order.map((id) => {
    const builtin = BUILDIN_ROW_KEYS.find((k) => k === id);
    if (builtin) {
      const label = builtin.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
      return { id, key: builtin, label, isCustom: false };
    }
    return { id, key: id, label: customMap.get(id) ?? 'Row', isCustom: true };
  });
}

function getCellText(
  phase: Phase,
  row: { id: string; key: string; label: string; isCustom: boolean },
  phaseOpportunities: { name: string; tag?: string; priority?: string }[],
  phaseJobs: { name: string; tag?: string }[]
): string {
  if (row.isCustom) {
    return (phase.customRowValues?.[row.id] ?? '').trim();
  }
  switch (row.key) {
    case 'phaseHealth':
      return String(getPhaseHealthScore(phase, phaseOpportunities, phaseJobs));
    case 'opportunities':
      return serializeOpportunities(
        phaseOpportunities.map((o) => ({
          id: o.name,
          name: o.name,
          tag: (o.tag ?? o.priority) as 'High' | 'Medium' | 'Low',
          description: '',
          pointOfDifferentiation: '',
          criticalAssumptions: '',
          isPriority: false,
        }))
      );
    case 'customerJobs':
      return phaseJobs.map((j) => j.name).join('\n');
    default: {
      const raw = phase[row.key as keyof Phase];
      if (typeof raw === 'string') return raw;
      if (raw != null && Array.isArray(raw)) return (raw as string[]).join('\n');
      return raw != null ? String(raw) : '';
    }
  }
}

function escapeCsvField(value: string): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function buildJourneyMapCsv(
  phases: Phase[],
  journey: Journey | null,
  opportunities: { phaseId: string; name: string; priority?: string; tag?: string }[],
  jobs: { id: string; name: string; tag?: string }[]
): string {
  const orderedRows = getOrderedRowIds(journey);
  const headerRow = ['Phase', ...phases.map((p) => p.title || 'Untitled')];
  const rows: string[][] = [headerRow.map(escapeCsvField)];

  for (const row of orderedRows) {
    const phaseCells = phases.map((phase) => {
      const phaseOpportunities = opportunities.filter((o) => o.phaseId === phase.id);
      const phaseJobIds = phase.jobIds ?? [];
      const phaseJobs = phaseJobIds.map((jid) => jobs.find((j) => j.id === jid)).filter(Boolean) as { name: string; tag?: string }[];
      return escapeCsvField(getCellText(phase, row, phaseOpportunities, phaseJobs));
    });
    rows.push([escapeCsvField(row.label), ...phaseCells]);
  }

  return rows.map((r) => r.join(',')).join('\r\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
