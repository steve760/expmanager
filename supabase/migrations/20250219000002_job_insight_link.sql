-- Job ↔ Insight link: make the relationship visible and queryable in Supabase.
-- The app links them via jobs.insight_ids (array of insight ids). There is no FK;
-- this migration documents the relationship and adds a view so both sides are visible.

-- Document the column (visible in Supabase table definition)
comment on column public.jobs.insight_ids is 'IDs of insights linked to this job (references insights.id). Relationship: many jobs can link to many insights.';

-- View: one row per (job_id, insight_id) so the link is visible and joinable
create or replace view public.job_insight_links as
select
  j.id as job_id,
  j.client_id,
  unnest(
    case
      when j.insight_ids is not null and array_length(j.insight_ids, 1) > 0 then j.insight_ids
      else array[]::text[]
    end
  ) as insight_id
from public.jobs j;

comment on view public.job_insight_links is 'Junction view: one row per job–insight link. job_id and insight_id reference jobs.id and insights.id. Use this to join jobs with insights or to see which jobs use an insight.';

-- View: for each insight, list job ids that link to it (reverse lookup)
create or replace view public.insight_linked_jobs as
select
  i.id as insight_id,
  i.client_id,
  i.title as insight_title,
  array_agg(l.job_id) filter (where l.job_id is not null) as job_ids
from public.insights i
left join public.job_insight_links l on l.insight_id = i.id
group by i.id, i.client_id, i.title;

comment on view public.insight_linked_jobs is 'Per insight: list of job ids that link to it (from jobs.insight_ids).';
