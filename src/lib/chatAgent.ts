/**
 * Chat agent: rule-based answers from journey data, with optional LLM via server proxy.
 * Secure: use /api/chat (Vercel serverless) with OPENAI_API_KEY on the server.
 * No client-side API key; optional VITE_OPENAI_API_KEY only for local dev if you prefer.
 */

import { parseOpportunities, parseStruggles } from '@/lib/utils';
import type { Client, Project, Journey, Phase } from '@/types';

const VITE_OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

/** Build context for LLM: only the currently selected client/journey to avoid cross-contamination. */
function buildContextForLLM(ctx: ChatContext): string {
  const selectedClient = ctx.selectedClientId ? ctx.clients.find((c) => c.id === ctx.selectedClientId) : null;
  const selectedProject = ctx.selectedProjectId ? ctx.projects.find((p) => p.id === ctx.selectedProjectId) : null;
  const selectedJourney = ctx.selectedJourneyId ? ctx.journeys.find((j) => j.id === ctx.selectedJourneyId) : null;

  const lines: string[] = [
    'You are a helpful assistant for a journey mapping app (ExpManager). You must ONLY answer about the **current selection** below. Do not mention, reference, or expose data from other clients or journeys. If the user asks about something outside this selection, say you can only discuss the currently selected client and journey.',
    '',
    'Current selection:',
    `- Client: ${selectedClient?.name ?? 'none'}`,
    `- Project (meta-journey): ${selectedProject?.name ?? 'none'}`,
    `- Journey: ${selectedJourney?.name ?? 'none'}`,
    '',
    'Data for this selection only (JSON):',
  ];

  const clientsScoped = selectedClient ? [selectedClient] : [];
  const projectsScoped = selectedClient ? ctx.projects.filter((p) => p.clientId === selectedClient.id) : [];
  const journeysScoped = selectedProject ? ctx.journeys.filter((j) => j.projectId === selectedProject.id) : [];
  const phasesScoped = selectedJourney ? ctx.phases.filter((p) => p.journeyId === selectedJourney.id).sort((a, b) => a.order - b.order) : [];
  const jobIdsInPhases = new Set(phasesScoped.flatMap((p) => p.jobIds ?? []));
  const jobsScoped = selectedClient
    ? ctx.jobs.filter((j) => (j as { clientId?: string }).clientId === selectedClient.id || jobIdsInPhases.has(j.id))
    : [];

  const data = {
    clients: clientsScoped.map((c) => ({ id: c.id, name: c.name, description: c.description })),
    projects: projectsScoped.map((p) => ({ id: p.id, clientId: p.clientId, name: p.name, description: p.description })),
    journeys: journeysScoped.map((j) => ({ id: j.id, projectId: j.projectId, name: j.name, description: j.description })),
    phases: phasesScoped.map((p) => ({
      id: p.id,
      journeyId: p.journeyId,
      order: p.order,
      title: p.title,
      description: (p.description ?? '').slice(0, 200),
      struggles: p.struggles,
      internalStruggles: p.internalStruggles,
      opportunities: p.opportunities,
      frontStageActions: p.frontStageActions,
      backStageActions: p.backStageActions,
      jobIds: p.jobIds,
    })),
    jobs: jobsScoped.map((j) => ({ id: j.id, name: j.name, tag: j.tag })),
  };
  lines.push(JSON.stringify(data, null, 0).slice(0, 12000));
  return lines.join('\n');
}

/** Call server proxy /api/chat (uses OPENAI_API_KEY on server). Returns response text or throws. */
async function getLLMResponseViaServer(
  message: string,
  ctx: ChatContext,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const systemContent = buildContextForLLM(ctx);
  const base = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      systemContent,
      conversationHistory,
    }),
  });
  const json = (await res.json()) as { content?: string; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `Server error ${res.status}`);
  }
  const content = json.content?.trim();
  if (!content) throw new Error('Empty response from server');
  return content;
}

/** Call OpenAI directly (client-side key). Only for local dev; avoid in production. */
async function getLLMResponseDirect(
  message: string,
  ctx: ChatContext,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  if (!VITE_OPENAI_API_KEY?.trim()) {
    throw new Error('VITE_OPENAI_API_KEY is not set. Use server OPENAI_API_KEY or set in .env for local dev.');
  }
  const systemContent = buildContextForLLM(ctx);
  const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) || 'https://api.openai.com/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemContent },
    ...conversationHistory.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: (import.meta.env.VITE_OPENAI_MODEL as string) || 'gpt-4o-mini',
      messages,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from LLM');
  return content;
}

/** Get response: try server /api/chat first (OPENAI_API_KEY on server); on failure try client key for local dev; else rule-based. */
export async function getAgentResponseAsync(
  message: string,
  ctx: ChatContext,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  let serverError: string | null = null;
  try {
    return await getLLMResponseViaServer(message, ctx, conversationHistory);
  } catch (err) {
    serverError = err instanceof Error ? err.message : String(err);
    if (VITE_OPENAI_API_KEY?.trim()) {
      try {
        return await getLLMResponseDirect(message, ctx, conversationHistory);
      } catch {
        // Fall through to rule-based
      }
    }
  }
  const ruleBased = getAgentResponse(message, ctx);
  if (serverError) {
    const isQuotaError = /429|insufficient_quota|quota|billing/i.test(serverError);
    const hint = isQuotaError
      ? 'Your OpenAI account has run out of quota or hit its limit. Check your plan and billing at [platform.openai.com/account/billing](https://platform.openai.com/account/billing).'
      : 'Add `OPENAI_API_KEY` in Vercel (Settings → Environment variables) and redeploy so the chat can use OpenAI.';
    return `**AI not connected.** ${serverError}\n\n${hint}\n\n---\n\nIn the meantime you can try:\n\n${ruleBased}`;
  }
  return ruleBased;
}

export interface JobForChat {
  id: string;
  name: string;
  tag?: string;
}

export interface ChatContext {
  clients: Client[];
  projects: Project[];
  journeys: Journey[];
  phases: Phase[];
  jobs: JobForChat[];
  selectedClientId: string | null;
  selectedProjectId: string | null;
  selectedJourneyId: string | null;
}

function getSelectedContext(ctx: ChatContext) {
  const client = ctx.selectedClientId ? ctx.clients.find((c) => c.id === ctx.selectedClientId) : null;
  const project = ctx.selectedProjectId ? ctx.projects.find((p) => p.id === ctx.selectedProjectId) : null;
  const journey = ctx.selectedJourneyId ? ctx.journeys.find((j) => j.id === ctx.selectedJourneyId) : null;
  const journeyPhases = journey
    ? ctx.phases.filter((p) => p.journeyId === journey.id).sort((a, b) => a.order - b.order)
    : [];
  return { client, project, journey, journeyPhases };
}

export function getAgentResponse(message: string, ctx: ChatContext): string {
  const q = message.trim().toLowerCase();
  const { client, project, journey, journeyPhases } = getSelectedContext(ctx);

  // Greeting / help
  if (!q || /^(hi|hello|hey|help|what can you do|\\?)\s*$/.test(q)) {
    return (
      "I can answer questions about the **currently selected** client and journey only. Try:\n\n" +
      "• **What's the current context?** – selected client, project, journey\n" +
      "• **List the phases** in this journey\n" +
      "• **Summarise** a phase by name (e.g. \"Summarise Registration\")\n" +
      "• **What opportunities** are in this journey?\n" +
      "• **List projects** (for this client) or **list journeys** (for this project)\n" +
      "• **What struggles** or **customer jobs** in the current journey\n\n" +
      "Select a client, project, and journey in the sidebar first. I never see or mention other clients or journeys."
    );
  }

  // Current context
  if (/\b(context|where am i|what('s| is) selected|current (client|project|journey)|what (client|project|journey) (am i|is) (on|selected))\b/.test(q)) {
    if (!client && !project && !journey) {
      return "No client, project, or journey is selected. Use the sidebar to select a client, then a project, then a journey.";
    }
    const parts: string[] = [];
    if (client) parts.push(`**Client:** ${client.name}${client.description ? ` — ${client.description}` : ''}`);
    if (project) parts.push(`**Project:** ${project.name}${project.description ? ` — ${project.description}` : ''}`);
    if (journey) parts.push(`**Journey:** ${journey.name}${journey.description ? ` — ${journey.description}` : ''}`);
    return parts.join('\n') || "I couldn't determine the current context.";
  }

  // List clients (only current selection – no cross-client data)
  if (/\b(clients?|list clients?|show clients?|who are my clients?|all clients?)\b/.test(q)) {
    if (!client) return "Select a client in the app first. I can only discuss the currently selected client and journey.";
    return `**Current client:** ${client.name}${client.description ? ` — ${client.description}` : ''}`;
  }

  // List projects (only for current client)
  if (/\b(projects?|list projects?|show projects?)\b/.test(q)) {
    if (!client) return "Select a client first. I only have access to the currently selected client and journey.";
    const toList = ctx.projects.filter((p) => p.clientId === client.id);
    if (toList.length === 0) return `${client.name} has no projects (meta-journeys) yet.`;
    return (
      `**Projects for ${client.name}:**\n` +
      toList.map((p) => `• ${p.name}${p.description ? ` — ${p.description}` : ''}`).join('\n')
    );
  }

  // List journeys (only for current project)
  if (/\b(journeys?|list journeys?|show journeys?)\b/.test(q)) {
    if (!project) return "Select a project (meta-journey) first. I only have access to the currently selected client and journey.";
    const toList = ctx.journeys.filter((j) => j.projectId === project.id);
    if (toList.length === 0) return `${project.name} has no journeys yet.`;
    return (
      `**Journeys in ${project.name}:**\n` +
      toList.map((j) => `• ${j.name}${j.description ? ` — ${j.description}` : ''}`).join('\n')
    );
  }

  // Phases in current journey
  if (/\b(phases?|stages?|steps?)\b.*(journey|this|current|list|in)/.test(q) || /\b(list|show|what|get)\s*(the\s+)?phases?\b/.test(q) || /how many phases?/.test(q)) {
    if (!journey) return "Select a journey in the sidebar first, then I can list its phases.";
    if (journeyPhases.length === 0) return `"${journey.name}" has no phases yet. Add phases from the journey map view.`;
    return (
      `**Phases in "${journey.name}":**\n` +
      journeyPhases.map((p, i) => `${i + 1}. ${p.title}${p.description ? ` — ${p.description.slice(0, 80)}${p.description.length > 80 ? '…' : ''}` : ''}`).join('\n')
    );
  }

  // Summarise a phase (by title match)
  if (/\b(summarise|summarize|summaries|describe|tell me about|what (is|about)|details? (of|for))\b/.test(q)) {
    if (!journey || journeyPhases.length === 0) {
      return "Select a journey with phases first, then ask about a phase by name (e.g. “Summarise Registration”).";
    }
    const rest = message.replace(/^(summarise|summarize|summaries|describe|tell me about|what (is|about)|details? (of|for))\s+(the\s+)?/i, '').replace(/\s+phase\s*$/i, '').trim().toLowerCase();
    const phase = journeyPhases.find((p) => {
      const titleLower = p.title.toLowerCase();
      const words = rest.split(/\s+/).filter((w) => w.length > 2);
      return titleLower.includes(rest) || rest.includes(titleLower) || words.some((w) => titleLower.includes(w));
    });
    if (!phase) {
      return `I couldn't find a phase matching "${rest}". Current phases: ${journeyPhases.map((p) => p.title).join(', ')}.`;
    }
    const parts: string[] = [`**${phase.title}**\n${phase.description || 'No description.'}`];
    if (phase.frontStageActions?.trim()) parts.push(`**Front stage:** ${phase.frontStageActions.slice(0, 200)}${phase.frontStageActions.length > 200 ? '…' : ''}`);
    if (phase.opportunities?.trim()) {
      try {
        const opps = parseOpportunities(phase.opportunities);
        if (opps.length) parts.push(`**Opportunities:** ${opps.map((o) => `${o.name} (${o.tag})`).join(', ')}`);
      } catch {}
    }
    return parts.join('\n\n');
  }

  // Opportunities in journey
  if (/\b(opportunities?|what opportunities?|list opportunities?)\b/.test(q)) {
    if (!journey) return "Select a journey first so I can list opportunities.";
    const byPhase: string[] = [];
    for (const p of journeyPhases) {
      if (!p.opportunities?.trim()) continue;
      try {
        const opps = parseOpportunities(p.opportunities);
        if (opps.length) byPhase.push(`**${p.title}:** ${opps.map((o) => `${o.name} (${o.tag})`).join(', ')}`);
      } catch {}
    }
    if (byPhase.length === 0) return `No opportunities have been added to "${journey.name}" yet. Add them in the phase panel.`;
    return `**Opportunities in "${journey.name}":**\n\n` + byPhase.join('\n\n');
  }

  // Struggles in journey
  if (/\b(struggles?|what struggles?|list struggles?|customer struggles?)\b/.test(q)) {
    if (!journey) return "Select a journey first so I can list struggles.";
    const byPhase: string[] = [];
    for (const p of journeyPhases) {
      const items = parseStruggles(p.struggles);
      if (items.length) byPhase.push(`**${p.title}:** ${items.map((s) => `${s.text} (${s.tag})`).join('; ')}`);
    }
    if (byPhase.length === 0) return `No customer struggles have been added to "${journey.name}" yet. Add them in the phase panel.`;
    return `**Customer struggles in "${journey.name}":**\n\n` + byPhase.join('\n\n');
  }

  // Internal struggles
  if (/\b(internal struggles?|staff struggles?|back.?(office|stage) struggles?)\b/.test(q)) {
    if (!journey) return "Select a journey first so I can list internal struggles.";
    const byPhase: string[] = [];
    for (const p of journeyPhases) {
      const items = parseStruggles(p.internalStruggles ?? '');
      if (items.length) byPhase.push(`**${p.title}:** ${items.map((s) => `${s.text} (${s.tag})`).join('; ')}`);
    }
    if (byPhase.length === 0) return `No internal struggles have been added to "${journey.name}" yet.`;
    return `**Internal struggles in "${journey.name}":**\n\n` + byPhase.join('\n\n');
  }

  // Customer jobs in journey
  if (/\b(customer jobs?|jobs? (and|&) goals?|list jobs?|what jobs?)\b/.test(q)) {
    if (!journey) return "Select a journey first so I can list customer jobs.";
    const byPhase: string[] = [];
    for (const p of journeyPhases) {
      const jobIds = p.jobIds ?? [];
      const items = jobIds
        .map((jid) => ctx.jobs.find((j) => j.id === jid))
        .filter((j): j is JobForChat => !!j);
      if (items.length) byPhase.push(`**${p.title}:** ${items.map((j) => `${j.name}${j.tag ? ` (${j.tag})` : ''}`).join('; ')}`);
    }
    if (byPhase.length === 0) return `No customer jobs have been added to "${journey.name}" yet. Add jobs in the Jobs tab, then assign them to phases.`;
    return `**Customer jobs in "${journey.name}":**\n\n` + byPhase.join('\n\n');
  }

  // Phase health
  if (/\b(health|phase health|how is health calculated)\b/.test(q)) {
    return (
      "**Phase health** is calculated from:\n\n" +
      "• **Base:** 50\n" +
      "• **Customer struggles:** High −12, Medium −6, Low −2 each\n" +
      "• **Internal struggles:** High −10, Medium −5, Low −2 each\n" +
      "• **Opportunities:** High +10, Medium +5, Low +2 each\n" +
      "• **Job mix:** Social and Emotional jobs add up to +25 (differentiation potential)\n\n" +
      "The score is clamped between 0 and 100. Hover the info icon on the Phase health row for a quick reference."
    );
  }

  // Default: suggest context or help
  return (
    "I only have access to the **currently selected** client and journey. Try:\n\n" +
    "• **\"What's the current context?\"** – see selected client, project, journey\n" +
    "• **\"List the phases\"** – requires a journey to be selected\n" +
    "• **\"What opportunities in this journey?\"**\n" +
    "• **\"List projects\"** or **\"List journeys\"** (for current client/project)\n" +
    "• **\"What struggles?\"** or **\"Customer jobs?\"** – for the selected journey\n\n" +
    "Select a client, project, and journey in the sidebar. I never expose data from other clients or journeys."
  );
}
