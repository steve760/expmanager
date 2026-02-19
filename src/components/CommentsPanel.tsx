import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { LABEL_CLASS } from '@/components/ui/ModalLabel';
import { Drawer } from '@/components/ui/Drawer';
import { useStore } from '@/store';
import { commentKey, parseCommentKey } from '@/lib/commentKeys';

export const ROW_LABELS: Record<string, string> = {
  description: 'Description',
  customerJobs: 'Customer jobs & goals',
  frontStageActions: 'Front stage actions',
  channels: 'Channels',
  struggles: 'Struggles',
  backStageActions: 'Back stage actions',
  systems: 'Systems',
  relatedProcesses: 'Related processes',
  opportunities: 'Opportunities',
};

export type CommentCellRef = {
  scrollToComment: (key: string) => void;
};

export const CommentsPanel = forwardRef<
  CommentCellRef,
  {
    isOpen: boolean;
    onClose: () => void;
    activeCell: { phaseId: string; rowKey: string } | null;
    onSetActiveCell: (cell: { phaseId: string; rowKey: string } | null) => void;
    scrollToCommentKey: string | null;
    onScrollDone: () => void;
  }
>(function CommentsPanel(
  { isOpen, onClose, activeCell, onSetActiveCell, scrollToCommentKey, onScrollDone },
  ref
) {
  const selectedJourneyId = useStore((s) => s.selectedJourneyId);
  const journey = useStore((s) =>
    selectedJourneyId ? s.journeys.find((j) => j.id === selectedJourneyId) ?? null : null
  );
  const phases = useStore((s) =>
    selectedJourneyId
      ? s.phases.filter((p) => p.journeyId === selectedJourneyId).sort((a, b) => a.order - b.order)
      : []
  );
  const cellComments = useStore((s) => s.cellComments);
  const setCellComment = useStore((s) => s.setCellComment);
  const addCellCommentReply = useStore((s) => s.addCellCommentReply);
  const deleteCellComment = useStore((s) => s.deleteCellComment);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [replyingToKey, setReplyingToKey] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [editDraft, setEditDraft] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useImperativeHandle(ref, () => ({
    scrollToComment: (key: string) => {
      const el = commentRefs.current[key];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
  }));

  useEffect(() => {
    if (!scrollToCommentKey) return;
    const timer = setTimeout(() => {
      const el = commentRefs.current[scrollToCommentKey];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      onScrollDone();
    }, 350);
    return () => clearTimeout(timer);
  }, [scrollToCommentKey, onScrollDone]);

  const commentEntries = Object.entries(cellComments).filter(([key]) => {
    const parsed = parseCommentKey(key);
    if (!parsed) return false;
    if (parsed.rowKey === 'opportunities') return false;
    return phases.some((p) => p.id === parsed.phaseId);
  });

  const getPhaseName = (phaseId: string) => phases.find((p) => p.id === phaseId)?.title ?? 'Unknown';
  const getRowLabel = (rowKey: string) =>
    ROW_LABELS[rowKey] ?? journey?.customRows?.find((r) => r.id === rowKey)?.label ?? rowKey;

  const handleAddComment = () => {
    if (!activeCell || !newCommentText.trim()) return;
    const key = commentKey(activeCell.phaseId, activeCell.rowKey);
    setCellComment(key, newCommentText.trim());
    setNewCommentText('');
    onSetActiveCell(null);
  };

  const handleAddReply = (key: string) => {
    if (!replyDraft.trim()) return;
    addCellCommentReply(key, replyDraft.trim());
    setReplyDraft('');
    setReplyingToKey(null);
  };

  const handleSaveEdit = (key: string) => {
    if (editDraft.trim()) setCellComment(key, editDraft.trim());
    setEditingKey(null);
    setEditDraft('');
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Comments">
      <div className="space-y-6">
            {activeCell && (
              <section>
                <h3 className={`mb-3 ${LABEL_CLASS}`}>Add comment</h3>
                <div className="rounded-xl border border-accent/30 bg-accent-muted/30 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
                <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                  <span className="font-semibold">{getPhaseName(activeCell.phaseId)}</span>
                  <span className="mx-1">—</span>
                  <span>{getRowLabel(activeCell.rowKey)}</span>
                </p>
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleAddComment}
                    disabled={!newCommentText.trim()}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500"
                  >
                    Add comment
                  </button>
                  <button
                    onClick={() => {
                      onSetActiveCell(null);
                      setNewCommentText('');
                    }}
                    className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-warm-100 dark:text-stone-300 dark:hover:bg-stone-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              </section>
            )}

            {commentEntries.length === 0 && !activeCell && (
              <p className="text-sm text-stone-400 dark:text-stone-500">No comments yet. Click a cell to add one.</p>
            )}

            {commentEntries.length > 0 && (
            <section>
              <h3 className={`mb-3 ${LABEL_CLASS}`}>Comments</h3>
            <div className="space-y-3">
              {commentEntries.map(([key, comment]) => {
                const parsed = parseCommentKey(key);
                if (!parsed) return null;
                const { phaseId, rowKey } = parsed;
                const data: { text: string; replies: string[] } =
          typeof comment === 'string'
            ? { text: comment, replies: [] }
            : { text: comment.text, replies: comment.replies ?? [] };
                const text = data.text;
                const replies = data.replies ?? [];
                const isEditing = editingKey === key;
                const isReplying = replyingToKey === key;

                return (
                  <div
                    key={key}
                    ref={(el) => { commentRefs.current[key] = el; }}
                    className="rounded-xl border border-stone-200 bg-warm-50/50 p-3 dark:border-stone-600 dark:bg-stone-700/50"
                  >
                    <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                      <span className="font-semibold">{getPhaseName(phaseId)}</span>
                      <span className="mx-1">—</span>
                      <span>{getRowLabel(rowKey)}</span>
                    </p>
                    {isEditing ? (
                      <>
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={2}
                          className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(key)}
                            className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover dark:bg-violet-600 dark:hover:bg-violet-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingKey(null);
                              setEditDraft('');
                            }}
                            className="rounded-lg px-2 py-1 text-xs text-stone-600 hover:bg-warm-100 dark:text-stone-300 dark:hover:bg-stone-700"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              deleteCellComment(key);
                              setEditingKey(null);
                            }}
                            className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="mt-1.5 text-sm text-stone-700 dark:text-stone-200">{text}</p>
                        {replies.length > 0 && (
                          <div className="mt-2 ml-4 space-y-2 border-l-2 border-stone-200 pl-3 dark:border-stone-600">
                            {replies.map((r, i) => (
                              <p key={i} className="text-sm text-stone-600 dark:text-stone-300">{r}</p>
                            ))}
                          </div>
                        )}
                        {isReplying
                          ? (
                            <div className="mt-3">
                              <textarea
                                value={replyDraft}
                                onChange={(e) => setReplyDraft(e.target.value)}
                                placeholder="Write a reply..."
                                rows={2}
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                              />
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => handleAddReply(key)}
                                  disabled={!replyDraft.trim()}
                                  className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500"
                                >
                                  Reply
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingToKey(null);
                                    setReplyDraft('');
                                  }}
                                  className="rounded-lg px-2 py-1 text-xs text-stone-600 hover:bg-warm-100 dark:text-stone-300 dark:hover:bg-stone-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                            )
                          : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setEditingKey(key);
                              setEditDraft(text);
                            }}
                            className="text-xs text-accent hover:underline dark:text-accent-light"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setReplyingToKey(key);
                              setReplyDraft('');
                            }}
                            className="text-xs text-accent hover:underline dark:text-accent-light"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => deleteCellComment(key)}
                            className="text-xs text-red-600 hover:underline dark:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            </section>
            )}
      </div>
    </Drawer>
  );
});
