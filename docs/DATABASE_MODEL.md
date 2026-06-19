# Database Model Documentation

## Overview

This document describes the proposed database model for **tablespoon**, an apprentice assessment platform. The model is designed to support the management of assessments, candidates, recruitment runs, and scoring while maintaining compatibility with the existing OIDC/JWT authentication system powered by Logto.

## Core Entities

### 1. **User** (Authentication/Authorization)

Represents users in the system. Users are authenticated via OIDC (Logto) and identified by their JWT token claims.

**Table: `users`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `oidc_sub` | VARCHAR | UNIQUE, NOT NULL | OIDC subject claim from JWT (`payload.sub`) |
| `email` | VARCHAR | UNIQUE, NOT NULL | From OIDC claim (`payload.email`) |
| `full_name` | VARCHAR | | Optional, can be updated |
| `role` | ENUM | NOT NULL | `admin` or `candidate` (derived from OIDC roles claim) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Soft delete flag |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

**Key Considerations:**
- The `oidc_sub` is the immutable identifier from the OIDC provider and should be indexed for fast lookups
- The `role` field can be derived from the OIDC `roles` claim during JWT validation but should be cached in the database for authorization checks
- Email uniqueness may need to be enforced at the OIDC provider level; consider whether email changes require special handling

---

### 2. **RecruitmentRun** (Yearly Assessment Campaign)

Represents a yearly recruitment campaign during which assessments are conducted and candidates are evaluated.

**Table: `recruitment_runs`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `name` | VARCHAR | NOT NULL | E.g., "Apprentice Intake 2026" |
| `year` | INTEGER | NOT NULL | E.g., 2026 |
| `description` | TEXT | | Optional context or notes |
| `start_date` | DATE | NOT NULL | When the recruitment run begins |
| `end_date` | DATE | NOT NULL | When the recruitment run closes |
| `status` | ENUM | NOT NULL, DEFAULT 'planning' | `planning`, `active`, `closed`, `archived` |
| `created_by` | UUID | FK -> users.id, NOT NULL | Admin who created it |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

**Key Features:**
- Supports multiple assessment campaigns per year if needed
- Helps organize historical data and compare recruitment cycles
- Status transitions: `planning` → `active` → `closed` → `archived`

---

### 3. **Assessment** (Test Template)

An assessment is a template containing questions and coding tasks. Assessments are reusable and can be assigned to multiple recruitment runs.

**Table: `assessments`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `title` | VARCHAR | NOT NULL | E.g., "JavaScript Fundamentals" |
| `description` | TEXT | | Detailed description |
| `created_by` | UUID | FK -> users.id, NOT NULL | Admin creator |
| `is_archived` | BOOLEAN | NOT NULL, DEFAULT false | Soft delete |
| `version` | INTEGER | NOT NULL, DEFAULT 1 | Track assessment versions |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

**Key Considerations:**
- Versioning allows admins to modify assessments without affecting previous runs
- Consider adding validation rules (e.g., "at least one question required")

---

### 4. **Question** (Assessment Content)

Represents individual questions within an assessment.

**Table: `questions`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `assessment_id` | UUID | FK -> assessments.id, NOT NULL | Parent assessment |
| `type` | ENUM | NOT NULL | `multiple_choice`, `free_text`, `short_answer` |
| `question_text` | TEXT | NOT NULL | The question content |
| `description` | TEXT | | Additional context |
| `order` | INTEGER | NOT NULL | Display order within assessment |
| `points` | DECIMAL | NOT NULL, DEFAULT 0 | Max points for this question |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

**Subtable: `question_options` (for multiple choice)**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | |
| `question_id` | UUID | FK -> questions.id, NOT NULL | |
| `option_text` | VARCHAR | NOT NULL | The choice text |
| `is_correct` | BOOLEAN | NOT NULL | Whether this is the correct answer |
| `order` | INTEGER | NOT NULL | Display order |

---

### 5. **CodingTask** (Assessment Content)

Represents coding exercise within an assessment.

**Table: `coding_tasks`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `assessment_id` | UUID | FK -> assessments.id, NOT NULL | Parent assessment |
| `title` | VARCHAR | NOT NULL | Task name |
| `description` | TEXT | NOT NULL | Problem statement |
| `order` | INTEGER | NOT NULL | Display order |
| `points` | DECIMAL | NOT NULL, DEFAULT 0 | Max points |
| `starter_code` | TEXT | | Optional boilerplate code |
| `constraints` | TEXT | | E.g., time limits, resource constraints |
| `expected_outcomes` | TEXT | | Evaluation criteria |
| `hints` | TEXT | | Optional hints for candidates |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

---

### 6. **CandidateAssignment** (Candidate → Assessment Mapping)

Bridges candidates and assessments within a specific recruitment run.

**Table: `candidate_assignments`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `recruitment_run_id` | UUID | FK -> recruitment_runs.id, NOT NULL | Which recruitment cycle |
| `candidate_id` | UUID | FK -> users.id, NOT NULL | The candidate |
| `assessment_id` | UUID | FK -> assessments.id, NOT NULL | Which assessment to take |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | `pending`, `in_progress`, `submitted`, `completed` |
| `assigned_at` | TIMESTAMP | NOT NULL | When assigned |
| `started_at` | TIMESTAMP | | When candidate started |
| `submitted_at` | TIMESTAMP | | When completed/submitted |
| `deadline` | TIMESTAMP | | Optional deadline for submission |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

**Key Features:**
- Unique constraint: `(recruitment_run_id, candidate_id, assessment_id)` to prevent duplicate assignments
- Enables tracking multiple assessments per candidate per recruitment run
- Supports reassignment if needed (new row with same combination)

---

### 7. **AssessmentResponse** (Candidate Submissions)

Stores candidate answers to individual questions.

**Table: `assessment_responses`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `candidate_assignment_id` | UUID | FK -> candidate_assignments.id, NOT NULL | Which assignment attempt |
| `question_id` | UUID | FK -> questions.id, NOT NULL | Which question |
| `response_text` | TEXT | | For free-text/short-answer |
| `selected_option_id` | UUID | FK -> question_options.id | For multiple choice |
| `submitted_at` | TIMESTAMP | NOT NULL | When submitted |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

---

### 8. **CodingSubmission** (Coding Task Submissions)

Stores candidate code submissions for coding tasks.

**Table: `coding_submissions`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `candidate_assignment_id` | UUID | FK -> candidate_assignments.id, NOT NULL | Which assignment attempt |
| `coding_task_id` | UUID | FK -> coding_tasks.id, NOT NULL | Which task |
| `code` | TEXT | NOT NULL | The submitted code |
| `language` | VARCHAR | | Programming language used |
| `submitted_at` | TIMESTAMP | NOT NULL | When submitted |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

---

### 9. **Score** (Results & Grading)

Stores scores for submitted responses, supporting multiple scoring dimensions.

**Table: `scores`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `candidate_assignment_id` | UUID | FK -> candidate_assignments.id, NOT NULL | Which assignment |
| `question_id` | UUID | FK -> questions.id | For question scores (NULL for task scores) |
| `coding_task_id` | UUID | FK -> coding_tasks.id | For coding task scores (NULL for question scores) |
| `category` | VARCHAR | NOT NULL | E.g., "correctness", "code_quality", "readability" |
| `points_earned` | DECIMAL | NOT NULL | Actual points awarded |
| `points_possible` | DECIMAL | NOT NULL | Maximum points available |
| `feedback` | TEXT | | Reviewer comments |
| `scored_by` | UUID | FK -> users.id, NOT NULL | Admin who scored |
| `scored_at` | TIMESTAMP | NOT NULL | When scored |
| `created_at` | TIMESTAMP | NOT NULL | |

**Key Features:**
- Supports automatic scoring (for multiple choice) and manual scoring (free text, coding)
- Multiple dimensions allow granular feedback
- Immutable once created (audit trail)

---

### 10. **AssessmentResult** (Aggregated Results)

Denormalized/cached aggregated scores per assignment for performance.

**Table: `assessment_results`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `candidate_assignment_id` | UUID | FK -> candidate_assignments.id, UNIQUE, NOT NULL | One result per assignment |
| `total_points_earned` | DECIMAL | NOT NULL, DEFAULT 0 | Sum of all points earned |
| `total_points_possible` | DECIMAL | NOT NULL, DEFAULT 0 | Sum of all possible points |
| `percentage_score` | DECIMAL | | (earned / possible) * 100 |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | `pending`, `in_progress`, `completed`, `scored` |
| `recommendation` | VARCHAR | | `strong_pass`, `pass`, `borderline`, `fail`, `not_evaluated` |
| `last_updated_at` | TIMESTAMP | NOT NULL | When last recalculated |
| `created_at` | TIMESTAMP | NOT NULL | |

**Key Features:**
- Materialized view for efficient dashboard queries
- Recommendation engine can be updated separately
- Recalculated whenever scores are added/modified

---

### 11. **Review** (Candidate Comparison & Feedback)

Optional: Stores admin notes and feedback on candidates.

**Table: `reviews`**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK | Primary identifier |
| `recruitment_run_id` | UUID | FK -> recruitment_runs.id, NOT NULL | Context |
| `candidate_id` | UUID | FK -> users.id, NOT NULL | Candidate reviewed |
| `reviewer_id` | UUID | FK -> users.id, NOT NULL | Admin reviewer |
| `comment` | TEXT | | Reviewer notes |
| `recommendation` | VARCHAR | | E.g., "recommend", "undecided", "do_not_recommend" |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |

---

## Relationships Summary

```
┌─────────────────────────────────────────────────────────────┐
│ OIDC/JWT Authentication (via Logto)                         │
│ Payload: { sub, email, roles, ... }                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
                      ┌─────────┐
                      │  User   │
                      └─────────┘
                      /   |   \   \
        ┌────────────┴    |    ┴──────┬─────────────┐
        |                 |           |             |
    Admin            Candidate    created_by   scored_by
        |                 |           |             |
        ├──→ Assessment   ├─→ CandidateAssignment ←─┤
        |                 |      ↓        ↓         |
        |             Assessment Response        Score ◄──┘
        |                 |      ↓        ↓         
        |                 |  CodingSubmission       
        |                 |      ↓        ↓         
        └─→ RecruitmentRun├─→ AssessmentResult
                          |      ↓
                          └─→ Review
```

---

## Database Constraints & Indexes

### Primary Indexes
- `users(oidc_sub)` - Fast authentication lookups
- `candidate_assignments(recruitment_run_id, candidate_id, assessment_id)` - Prevent duplicates
- `assessment_responses(candidate_assignment_id, question_id)` - Lookup responses
- `scores(candidate_assignment_id)` - Retrieve all scores for assignment
- `assessment_results(candidate_assignment_id)` - Fast dashboard queries

### Foreign Key Constraints
- All FKs should enforce referential integrity
- Consider `ON DELETE CASCADE` for immutable data (e.g., removing assessment versions)
- Use `ON DELETE RESTRICT` for critical relationships (e.g., can't delete a recruitment run with active assignments)

---

## Soft Delete Strategy

- Use `is_active` or `is_archived` flags rather than hard deletes to preserve historical data
- Assessments: `is_archived` flag
- Users: `is_active` flag
- All queries should filter by these flags to exclude deleted records

---

## OIDC Integration Implications

### Authentication Flow
1. User logs in via Logto OIDC provider
2. Frontend receives JWT token with claims: `{ sub, email, roles, ... }`
3. Backend validates JWT using JWKS endpoint (already implemented)
4. On first login, backend creates or updates `users` record using `oidc_sub` as unique identifier

### Authorization
- The `users.role` field should be synced from OIDC `roles` claim
- Consider a periodic sync job or cache refresh to ensure consistency
- Two roles needed: `admin` (create/grade assessments) and `candidate` (take assessments)

### Session Management
- Since authentication is handled by OIDC, the database doesn't need session tokens
- Use JWT claims directly in requests (already implemented via Passport strategy)

### Considerations & Recommendations

#### 1. **User Provisioning**
- **Issue**: Users might not exist in the database when first accessing the system
- **Recommendation**: Implement a `@UseGuards(JwtAuthGuard)` middleware that auto-creates users on first login
- Consider adding an admin portal to bulk-import candidates before a recruitment run

#### 2. **Role Synchronization**
- **Issue**: If roles change in OIDC provider, they won't auto-sync to the database
- **Recommendation**: 
  - Update `users.role` with each JWT validation
  - Or implement a scheduled sync job that periodically updates roles from OIDC

#### 3. **Email Verification**
- **Issue**: If a user changes email in OIDC provider, the database record becomes stale
- **Recommendation**: 
  - Treat email as secondary (use `oidc_sub` as primary)
  - Handle email changes by updating the database record on next login
  - Consider unique constraints only on `oidc_sub`, not email

#### 4. **Multi-Tenancy (Future)**
- If your organization later wants to support multiple organizations:
  - Add `organization_id` to `users`, `recruitment_runs`, `assessments`
  - Use OIDC organization claims to enforce tenant isolation

#### 5. **Audit Trail**
- Track all score changes, assessment edits, and admin actions
- Consider a separate `audit_log` table:
  ```
  - action (CREATE, UPDATE, DELETE, SCORE)
  - entity_type (assessment, score, candidate_assignment)
  - entity_id
  - old_value / new_value
  - user_id
  - timestamp
  ```

#### 6. **Data Privacy**
- Consider anonymizing candidate data after a certain retention period
- Implement GDPR-compliant deletion mechanisms
- Use encrypted fields for sensitive data if required

---

## Migration Strategy

### Phase 1: Core Structure
1. Create base tables: `users`, `recruitment_runs`, `assessments`
2. Create question/task tables: `questions`, `question_options`, `coding_tasks`
3. Test authentication integration

### Phase 2: Assignment & Submission
1. Create `candidate_assignments`
2. Create `assessment_responses` and `coding_submissions`
3. Implement candidate submission flow

### Phase 3: Scoring & Results
1. Create `scores` and `assessment_results`
2. Implement auto-scoring for multiple choice
3. Implement result aggregation

### Phase 4: Admin Features
1. Create `reviews` table
2. Implement dashboard queries and recommendations
3. Add audit logging

---

## Performance Considerations

### Query Patterns
1. **Dashboard**: Get all candidates for a recruitment run with their scores
   - Query: `assessment_results` with `recruitment_run_id` filter
   - Index: `(recruitment_run_id, percentage_score DESC)`

2. **Candidate View**: Get all assignments and scores for a candidate
   - Query: `candidate_assignments` + `assessment_results` for a user
   - Index: `(candidate_id, recruitment_run_id)`

3. **Grading**: Get all unscored submissions
   - Query: `assessment_responses` where no corresponding score exists
   - Consider materialized view for pending work

### Denormalization
- `assessment_results` is a denormalized cache and should be recalculated:
  - When a score is added
  - When a score is updated
  - Via a background job on a schedule

---

## Example SQL Snippets

### Create Indexes
```sql
CREATE INDEX idx_users_oidc_sub ON users(oidc_sub);
CREATE INDEX idx_candidate_assignments_run_candidate ON candidate_assignments(recruitment_run_id, candidate_id);
CREATE INDEX idx_scores_assignment ON scores(candidate_assignment_id);
CREATE INDEX idx_assessment_results_run ON assessment_results(recruitment_run_id, percentage_score DESC);
```

### Query: Get Dashboard Data
```sql
SELECT 
  u.email,
  u.full_name,
  ar.percentage_score,
  ar.recommendation,
  ar.status
FROM assessment_results ar
JOIN candidate_assignments ca ON ar.candidate_assignment_id = ca.id
JOIN users u ON ca.candidate_id = u.id
WHERE ca.recruitment_run_id = $1
ORDER BY ar.percentage_score DESC;
```

### Query: Auto-Score Multiple Choice
```sql
INSERT INTO scores (candidate_assignment_id, question_id, category, points_earned, points_possible, scored_by, scored_at)
SELECT 
  ar.candidate_assignment_id,
  q.id,
  'correctness',
  CASE WHEN ar.selected_option_id IN (SELECT id FROM question_options WHERE question_id = q.id AND is_correct = true) 
       THEN q.points ELSE 0 END,
  q.points,
  'system',
  NOW()
FROM assessment_responses ar
JOIN questions q ON ar.question_id = q.id
WHERE ar.question_id IN (SELECT id FROM questions WHERE type = 'multiple_choice')
  AND NOT EXISTS (SELECT 1 FROM scores WHERE candidate_assignment_id = ar.candidate_assignment_id AND question_id = q.id);
```

---

## Summary

This database model supports:
- ✅ Yearly recruitment runs with candidate assignments
- ✅ Reusable assessment templates with versioning
- ✅ Multiple question types and coding tasks
- ✅ Flexible scoring with multiple dimensions
- ✅ OIDC/JWT integration without session management
- ✅ Historical data preservation and audit trails
- ✅ Admin comparison and recommendations
- ✅ Privacy and data security considerations

The model is designed to scale with your platform while maintaining compatibility with your Logto OIDC authentication system.

