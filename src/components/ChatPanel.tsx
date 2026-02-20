import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { getAgentResponseAsync } from '@/lib/chatAgent';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your journey mapper assistant. Ask me about your clients, projects, journeys, and phases. The map stays visible so you can keep context.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const journeys = useStore((s) => s.journeys);
  const phases = useStore((s) => s.phases);
  const jobs = useStore((s) => s.jobs);
  const selectedClientId = useStore((s) => s.selectedClientId);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const selectedJourneyId = useStore((s) => s.selectedJourneyId);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const ctx = {
      clients,
      projects,
      journeys,
      phases,
      jobs,
      selectedClientId,
      selectedProjectId,
      selectedJourneyId,
    };
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await getAgentResponseAsync(text, ctx, history);
      const assistantMsg: Message = { id: `assistant-${Date.now()}`, role: 'assistant', content: response };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `**Error:** ${message}\n\nFor LLM replies, set \`OPENAI_API_KEY\` in Vercel (project env vars) and redeploy, or for local dev set \`VITE_OPENAI_API_KEY\` in \`.env\`.`,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-stone-200 bg-white shadow-elevated animate-in dark:border-stone-600 dark:bg-stone-800 dark:shadow-elevated-dark sm:max-w-[420px]"
        role="dialog"
        aria-modal="true"
        aria-label="Chat with journey data"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-600">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Chat</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-stone-500 hover:bg-warm-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-700"
            aria-label="Close chat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-accent text-white'
                    : 'bg-warm-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200'
                }`}
              >
                <div className="whitespace-pre-wrap break-words [&_p]:mb-2 last:[&_p]:mb-0">
                  {m.role === 'assistant' ? (
                    m.content.split(/\n\n+/).map((para, i) => (
                      <p key={i}>
                        {para.split(/(\*\*[^*]+\*\*)/).map((bit, j) =>
                          bit.startsWith('**') && bit.endsWith('**') ? (
                            <strong key={j}>{bit.slice(2, -2)}</strong>
                          ) : (
                            <span key={j}>{bit}</span>
                          )
                        )}
                      </p>
                    ))
                  ) : (
                    <p>{m.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-warm-100 px-4 py-2.5 text-sm text-stone-500 dark:bg-stone-700 dark:text-stone-400">
                Thinking…
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-stone-200 p-3 dark:border-stone-600">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your journey data…"
              className="min-w-0 flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
