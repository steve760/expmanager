/** Delimiter for comment keys - avoids collision with UUIDs which contain dashes */
export const COMMENT_KEY_SEP = '::';

export function commentKey(phaseId: string, rowKey: string): string {
  return `${phaseId}${COMMENT_KEY_SEP}${rowKey}`;
}

export function parseCommentKey(key: string): { phaseId: string; rowKey: string } | null {
  const idx = key.indexOf(COMMENT_KEY_SEP);
  if (idx === -1) return null;
  return {
    phaseId: key.slice(0, idx),
    rowKey: key.slice(idx + COMMENT_KEY_SEP.length),
  };
}
