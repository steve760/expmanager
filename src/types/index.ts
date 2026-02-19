export interface Client {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyRow {
  id: string;
  label: string;
}

export interface Journey {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  /** Ordered list of row ids: built-in keys (e.g. 'description') or custom row ids */
  rowOrder?: string[];
  /** Custom rows (user-added); order is defined by rowOrder */
  customRows?: JourneyRow[];
  createdAt: string;
  updatedAt: string;
}

export type CustomerJobTag = 'Functional' | 'Social' | 'Emotional';

export interface CustomerJobItem {
  /** Job title/name */
  name: string;
  /** Job description */
  description?: string;
  /** Primary type (Functional, Social, Emotional) */
  tag: CustomerJobTag;
  /** Struggles – list of strings */
  struggles?: string[];
  /** Functional dimensions – list of strings */
  functionalDimensions?: string[];
  /** Social dimensions – list of strings */
  socialDimensions?: string[];
  /** Emotional dimensions – list of strings */
  emotionalDimensions?: string[];
  /** Solutions and workarounds – text */
  solutionsAndWorkarounds?: string;
  /** Gold star – priority job for dashboard focus */
  isPriority?: boolean;
  /** @deprecated Legacy field – migrated to name */
  text?: string;
}

export type PriorityLevel = 'High' | 'Medium' | 'Low';

/** Top-level Job entity – created in Jobs tab, assigned to phases */
export interface Job {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  tag: CustomerJobTag;
  priority?: PriorityLevel;
  struggles?: string[];
  functionalDimensions?: string[];
  socialDimensions?: string[];
  emotionalDimensions?: string[];
  solutionsAndWorkarounds?: string;
  /** @deprecated Use priority instead */
  isPriority?: boolean;
  /** Insight IDs linked to this job */
  insightIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/** Research insight – client-scoped, linkable to Jobs */
export interface Insight {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  priority?: PriorityLevel;
  /** Display order within client (lower = first). Used for drag reorder. */
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export type StruggleTag = 'High' | 'Medium' | 'Low';

export interface StruggleItem {
  text: string;
  tag: StruggleTag;
}

export type OpportunityTag = 'High' | 'Medium' | 'Low';

export interface OpportunityItem {
  id: string;
  name: string;
  tag: OpportunityTag;
  description?: string;
  pointOfDifferentiation?: string;
  criticalAssumptions?: string;
  /** Gold star – priority opportunity for dashboard focus */
  isPriority?: boolean;
}

export type OpportunityStage =
  | 'Backlog'
  | 'In discovery'
  | 'Horizon 1'
  | 'Horizon 2'
  | 'Horizon 3';

export interface Opportunity {
  id: string;
  clientId: string;
  projectId: string;
  journeyId: string;
  phaseId: string;
  stage: OpportunityStage;
  stageOrder: number;
  name: string;
  priority: OpportunityTag;
  description: string;
  pointOfDifferentiation: string;
  criticalAssumptions: string;
  /** Job IDs (from Jobs tab) linked to this opportunity */
  linkedJobIds?: string[];
  /** Gold star – priority opportunity for dashboard focus */
  isPriority?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RelatedDocument {
  id: string;
  label: string;
  url: string;
}

export interface Phase {
  id: string;
  journeyId: string;
  order: number;
  title: string;
  description: string;
  imageUrl?: string;
  struggles: string;
  internalStruggles: string;
  opportunities: string;
  frontStageActions: string;
  backStageActions: string;
  systems: string;
  relatedProcesses: string;
  /** Channels (e.g. touchpoints) – text. */
  channels: string;
  /** Job IDs assigned to this phase (from Jobs tab). Order matters. */
  jobIds: string[];
  /** @deprecated Use jobIds. Kept for migration. */
  customerJobs?: string;
  relatedDocuments: string;
  /** Values for custom rows (key = custom row id) */
  customRowValues: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CellComment {
  text: string;
  replies?: string[];
}

/** User profile (public.profiles). */
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  is_super_admin: boolean;
}

/** Organisation membership (public.organisation_members). role: admin = ClientAdmin, member = User, client_user = ClientUser */
export interface OrganisationMember {
  id: string;
  user_id: string;
  organisation_id: string;
  role: 'admin' | 'member' | 'client_user';
}

export interface AppState {
  clients: Client[];
  projects: Project[];
  journeys: Journey[];
  phases: Phase[];
  jobs: Job[];
  insights: Insight[];
  opportunities: Opportunity[];
  cellComments: Record<string, CellComment>;
}
