/**
 * Simple agent that answers questions using the journey mapper store data.
 * No external API; responses are derived from clients, projects, journeys, and phases.
 */

import { parseOpportunities, parseStruggles } from '@/lib/utils';
import type { Client, Project, Journey, Phase } from '@/types';

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
      "I can answer questions about your journey mapper data. Try asking:\n\n" +
      "• **What's the current context?** – client, project, journey\n" +
      "• **List the phases** in this journey\n" +
      "• **Summarise** a phase by name (e.g. \"Summarise Registration\")\n" +
      "• **What opportunities** are in this journey?\n" +
      "• **List clients** or **list projects**\n" +
      "• **What struggles** or **customer jobs** in the current journey\n\n" +
      "Select a journey in the sidebar first for phase-specific questions."
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

  // List clients
  if (/\b(clients?|list clients?|show clients?|who are my clients?|all clients?)\b/.test(q)) {
    if (ctx.clients.length === 0) return "You have no clients yet. Create one from the home view.";
    return (
      "**Clients:**\n" +
      ctx.clients.map((c) => `• ${c.name}${c.description ? ` — ${c.description}` : ''}`).join('\n')
    );
  }

  // List projects (current client or all)
  if (/\b(projects?|list projects?|show projects?)\b/.test(q)) {
    const toList = client ? ctx.projects.filter((p) => p.clientId === client.id) : ctx.projects;
    if (toList.length === 0) {
      return client ? `${client.name} has no projects yet.` : "You have no projects yet.";
    }
    return (
      (client ? `**Projects for ${client.name}:**\n` : '**Projects:**\n') +
      toList.map((p) => `• ${p.name}${p.description ? ` — ${p.description}` : ''}`).join('\n')
    );
  }

  // List journeys (current project or all)
  if (/\b(journeys?|list journeys?|show journeys?)\b/.test(q)) {
    const toList = project ? ctx.journeys.filter((j) => j.projectId === project.id) : ctx.journeys;
    if (toList.length === 0) {
      return project ? `${project.name} has no journeys yet.` : "You have no journeys yet.";
    }
    return (
      (project ? `**Journeys in ${project.name}:**\n` : '**Journeys:**\n') +
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
    "I can only answer from your journey mapper data. Try:\n\n" +
    "• **\"What's the current context?\"** – see selected client, project, journey\n" +
    "• **\"List the phases\"** – requires a journey to be selected\n" +
    "• **\"What opportunities in this journey?\"**\n" +
    "• **\"List clients\"** or **\"List projects\"**\n" +
    "• **\"What struggles?\"** or **\"Customer jobs?\"** – for the selected journey\n\n" +
    "Make sure you've selected a client, project, and journey in the sidebar for journey-specific questions."
  );
}
