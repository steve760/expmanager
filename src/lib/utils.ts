import { v4 as uuidv4 } from 'uuid';
import type { CustomerJobItem, StruggleItem, OpportunityItem, RelatedDocument, Phase } from '@/types';

export function generateId(): string {
  return uuidv4();
}

export function now(): string {
  return new Date().toISOString();
}

/** Extract domain from URL for Clearbit logo API (e.g. https://www.airbnb.com -> airbnb.com) */
export function extractDomainFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    let href = trimmed;
    if (!/^https?:\/\//i.test(href)) href = 'https://' + href;
    const hostname = new URL(href).hostname.replace(/^www\./, '');
    return hostname || null;
  } catch {
    return null;
  }
}

const STRUGGLE_TAGS = ['High', 'Medium', 'Low'] as const;

export function parseCustomerJobs(value: string): CustomerJobItem[] {
  if (!value || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: unknown) => item && typeof item === 'object' && (typeof (item as { name?: unknown }).name === 'string' || typeof (item as { text?: unknown }).text === 'string'))
        .map((item: {
          text?: string;
          name?: string;
          description?: string;
          tag?: string;
          isPriority?: boolean;
          struggles?: string[];
          functionalDimensions?: string[];
          socialDimensions?: string[];
          emotionalDimensions?: string[];
          solutionsAndWorkarounds?: string;
        }): CustomerJobItem => {
          let tag: CustomerJobItem['tag'] = 'Functional';
          if (item.tag === 'Social Emotional') tag = 'Social';
          else if (item.tag === 'Social' || item.tag === 'Emotional') tag = item.tag;
          const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : (typeof item.text === 'string' ? item.text.trim() : 'Untitled job');
          return {
            name,
            description: typeof item.description === 'string' ? item.description : undefined,
            tag,
            struggles: Array.isArray(item.struggles) ? item.struggles.filter((s): s is string => typeof s === 'string') : undefined,
            functionalDimensions: Array.isArray(item.functionalDimensions) ? item.functionalDimensions.filter((s): s is string => typeof s === 'string') : undefined,
            socialDimensions: Array.isArray(item.socialDimensions) ? item.socialDimensions.filter((s): s is string => typeof s === 'string') : undefined,
            emotionalDimensions: Array.isArray(item.emotionalDimensions) ? item.emotionalDimensions.filter((s): s is string => typeof s === 'string') : undefined,
            solutionsAndWorkarounds: typeof item.solutionsAndWorkarounds === 'string' ? item.solutionsAndWorkarounds : undefined,
            isPriority: !!item.isPriority,
          };
        });
    }
  } catch {
    const lines = value.split(/\n|;|•/).map((s) => s.trim()).filter(Boolean);
    return lines.map((name) => ({ name, tag: 'Functional' as const }));
  }
  return [];
}

export function serializeCustomerJobs(jobs: CustomerJobItem[]): string {
  return JSON.stringify(jobs);
}

/** Parse newline/semicolon-separated list into string array */
export function parseList(value: string): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(/\n|;|•/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse newline-separated list, preserving empty lines for editing (e.g. ListEditor) */
export function parseListPreservingBlanks(value: string): string[] {
  if (value === undefined || value === null) return [];
  return value.split(/\n/).map((s) => s.trim());
}

/** Serialize string array to newline-separated text */
export function serializeList(items: string[]): string {
  return items.join('\n');
}

export function parseStruggles(value: string): StruggleItem[] {
  if (!value || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is StruggleItem =>
          item && typeof item.text === 'string' && STRUGGLE_TAGS.includes(item.tag)
      );
    }
  } catch {
    const lines = value.split(/\n|;|•/).map((s) => s.trim()).filter(Boolean);
    return lines.map((text) => ({ text, tag: 'Medium' as const }));
  }
  return [];
}

export function serializeStruggles(items: StruggleItem[]): string {
  return JSON.stringify(items);
}

const OPPORTUNITY_TAGS: OpportunityItem['tag'][] = ['High', 'Medium', 'Low'];

export function parseOpportunities(value: string): OpportunityItem[] {
  if (!value || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: unknown) => item && typeof item === 'object' && 'name' in item && typeof (item as { name: unknown }).name === 'string')
        .map((item: { id?: string; name: string; tag?: string; description?: string; pointOfDifferentiation?: string; criticalAssumptions?: string; isPriority?: boolean }) => {
          const tag = OPPORTUNITY_TAGS.includes(item.tag as OpportunityItem['tag']) ? item.tag as OpportunityItem['tag'] : 'Medium';
          return {
            id: typeof item.id === 'string' ? item.id : generateId(),
            name: item.name,
            tag,
            description: typeof item.description === 'string' ? item.description : undefined,
            pointOfDifferentiation: typeof item.pointOfDifferentiation === 'string' ? item.pointOfDifferentiation : undefined,
            criticalAssumptions: typeof item.criticalAssumptions === 'string' ? item.criticalAssumptions : undefined,
            isPriority: !!item.isPriority,
          };
        });
    }
  } catch {
    const lines = value.split(/\n|;|•/).map((s) => s.trim()).filter(Boolean);
    return lines.map((name, index) => ({ id: `legacy-${index}-${name.slice(0, 20)}`, name, tag: 'Medium' as const }));
  }
  return [];
}

export function serializeOpportunities(items: OpportunityItem[]): string {
  return JSON.stringify(items);
}

export function parseRelatedDocuments(value: string): RelatedDocument[] {
  if (!value || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: unknown) => item && typeof item === 'object' && 'label' in item && 'url' in item)
        .map((item: { id?: string; label: string; url: string }): RelatedDocument => ({
          id: typeof item.id === 'string' ? item.id : generateId(),
          label: String(item.label).trim() || 'Document',
          url: String(item.url).trim(),
        }));
    }
  } catch {}
  return [];
}

export function serializeRelatedDocuments(items: RelatedDocument[]): string {
  return JSON.stringify(items);
}

/**
 * Computes phase health (0–100) from struggles, opportunities, and job mix.
 * Weights: customer/internal struggles reduce health; opportunities boost it;
 * Social + Emotional jobs add health (differentiation potential).
 * @param phaseOpportunities - Optional: opportunities from store (with tag/priority). When provided, used instead of phase.opportunities.
 * @param phaseJobs - Optional: jobs assigned to this phase (from jobIds). When provided, used instead of phase.customerJobs.
 */
export function getPhaseHealthScore(
  phase: Phase,
  phaseOpportunities?: { tag?: string; priority?: string }[],
  phaseJobs?: { tag?: string }[]
): number {
  const struggles = parseStruggles(phase.struggles);
  const internalStruggles = parseStruggles(phase.internalStruggles ?? '');
  const opportunities = phaseOpportunities ?? parseOpportunities(phase.opportunities);
  const jobs = phaseJobs ?? parseCustomerJobs(phase.customerJobs ?? '');

  let score = 50;

  // Customer struggles reduce health
  for (const s of struggles) {
    if (s.tag === 'High') score -= 12;
    else if (s.tag === 'Medium') score -= 6;
    else score -= 2;
  }

  // Internal struggles reduce health
  for (const s of internalStruggles) {
    if (s.tag === 'High') score -= 10;
    else if (s.tag === 'Medium') score -= 5;
    else score -= 2;
  }

  // Opportunities boost health (scale of opportunity)
  for (const o of opportunities) {
    const priority = o.tag ?? o.priority;
    if (priority === 'High') score += 10;
    else if (priority === 'Medium') score += 5;
    else score += 2;
  }

  // Social + Emotional jobs = differentiation potential (higher health)
  const total = jobs.length || 1;
  const socialEmotional = jobs.filter((j) => j.tag === 'Social' || j.tag === 'Emotional').length;
  const jobsBonus = (socialEmotional / total) * 25;
  score += jobsBonus;

  return Math.max(0, Math.min(100, Math.round(score)));
}
