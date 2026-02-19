# Supabase schema reference (for fixing RPC type mismatches)

If you see errors like **"column X is of type Y but expression is of type Z"**, the RPCs need to match your actual table column types. To get a precise picture of your schema:

## 1. Column types (recommended)

In **Supabase Dashboard → SQL Editor**, run:

```sql
SELECT table_name, column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('clients','projects','journeys','phases','jobs','insights','opportunities','cell_comments')
ORDER BY table_name, ordinal_position;
```

Paste the result (or a screenshot) when asking to fix RPC type errors. Then the migration can cast jsonb → `text[]`, `uuid` → `text`, etc. correctly.

## 2. Quick checks in Table Editor

- **Table Editor** → open each table → note types shown for:
  - `journeys`: `row_order` (e.g. `text[]` vs `jsonb`), `custom_rows` (e.g. `jsonb`)
  - `phases`: `job_ids` (`text[]`?), `custom_row_values` (`jsonb`?)
  - `jobs`: `insight_ids`, `struggles`, etc. (`text[]`?)
  - Any `id` / `*_id` columns: `uuid` vs `text`

## 3. Aligned schema (from export)

RPCs are aligned to this schema:

| table_name    | column_name               | data_type | udt_name | is_nullable |
| ------------- | ------------------------- | --------- | -------- | ----------- |
| cell_comments | key                       | text      | text     | NO          |
| cell_comments | text                      | text      | text     | NO          |
| cell_comments | replies                   | jsonb     | jsonb    | YES         |
| clients       | id, name, description, website, logo_url, created_at, updated_at | text | text | NO/YES |
| insights      | id, client_id, title, description, priority, order (int4), created_at, updated_at | text/int | text/int4 | - |
| jobs          | id, client_id, name, description, tag, priority (text); struggles, functional_dimensions, social_dimensions, emotional_dimensions, insight_ids (ARRAY _text); solutions_and_workarounds, created_at, updated_at | text / ARRAY | _text | - |
| journeys      | id, project_id, name, description (text); row_order (ARRAY _text); custom_rows (jsonb); created_at, updated_at | text/array/jsonb | _text/jsonb | - |
| opportunities | ids/stage/name/priority/description/point_of_differentiation/critical_assumptions (text); stage_order (int4); linked_job_ids (ARRAY _text); is_priority (bool); created_at, updated_at | - | - | - |
| phases        | id, journey_id, order (int4), title, description, image_url, struggles, internal_struggles, opportunities, front_stage_actions, back_stage_actions, systems, related_processes, job_ids (ARRAY _text), related_documents, custom_row_values (jsonb), created_at, updated_at, channels (text last) | - | - | - |
| projects      | id, client_id, name, description, created_at, updated_at | text | text | - |

- **cell_comments.replies**: jsonb → RPC uses `coalesce(r->'replies', '[]'::jsonb)`.
- **journeys.row_order**: text[] → RPC converts jsonb array to text[].
- **journeys.custom_rows**: jsonb → RPC uses `(r->'custom_rows')`.
- **phases**: column order matches schema (channels last).

## 4. Job ↔ Insight relationship

- **Link in data**: `jobs.insight_ids` (text array) stores the IDs of insights linked to that job. There is no column on `insights` that references jobs; the app derives “jobs linked to this insight” by filtering jobs where `insight_ids` contains the insight id.
- **In Supabase**: Run the migration `20250219000002_job_insight_link.sql` to add:
  - A **comment** on `jobs.insight_ids` describing the relationship.
  - **View `job_insight_links`**: one row per (job_id, insight_id) so you can join or inspect links.
  - **View `insight_linked_jobs`**: for each insight, an array of job ids that reference it.
- No foreign key exists; the views make the relationship visible and queryable without changing the app.

---

## 5. App relationships vs your schema (verification)

All app relationships are supported by the schema you provided. Reference:

| App entity       | App field(s) that reference others | Schema table.column        | Type in schema | Supported |
|------------------|------------------------------------|----------------------------|----------------|-----------|
| **Client**       | (root)                             | clients.id                 | text           | ✓         |
| **Project**      | clientId                           | projects.client_id         | text           | ✓         |
| **Journey**      | projectId                          | journeys.project_id        | text           | ✓         |
| **Phase**        | journeyId                          | phases.journey_id          | text           | ✓         |
| **Job**          | clientId, insightIds[]              | jobs.client_id, jobs.insight_ids | text, ARRAY _text | ✓   |
| **Insight**      | clientId                           | insights.client_id         | text           | ✓         |
| **Opportunity**  | clientId, projectId, journeyId, phaseId | opportunities.client_id, project_id, journey_id, phase_id | text | ✓ |
| **CellComment**  | key = phaseId::rowKey (phase ref)   | cell_comments.key          | text           | ✓         |

**Reverse / many-to-many (stored as arrays in your schema):**

| Relationship              | Stored in schema as           | Type     | Supported |
|---------------------------|------------------------------|----------|-----------|
| Phase → Jobs (assigned)   | phases.job_ids               | ARRAY _text | ✓       |
| Job → Insights (linked)  | jobs.insight_ids             | ARRAY _text | ✓       |
| Opportunity → Jobs (linked) | opportunities.linked_job_ids | ARRAY _text | ✓   |

**ID types:** Your schema uses **text** for all primary and foreign keys (clients.id, projects.id, projects.client_id, journeys.project_id, phases.journey_id, jobs.client_id, insights.client_id, opportunities.client_id/project_id/journey_id/phase_id). The app uses string IDs throughout, so no mismatch.

**Conclusion:** Every relationship the app uses has a matching column in your Supabase schema. Safe to run the migrations.
