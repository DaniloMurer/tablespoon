# Candidate Assignment & Recruitment Run Design

## Overview

This document details the design and workflow for managing candidate assignments within yearly recruitment runs, addressing the unique requirements of your apprentice assessment process.

---

## 1. Core Problem Statement

**Requirement:**
- Candidates can be assigned to assessments
- Assignments happen within the context of a yearly recruitment run
- Support for multiple recruitment cycles per year (optional)
- Need to track assignment status and results
- Historical data for future reference and comparison

**Key Constraint:**
- OIDC/JWT authentication means users are managed externally
- Database only stores references to OIDC identities (`oidc_sub`)
- Assignment logic must work with external user IDs

---

## 2. Candidate Assignment Model

### The `candidate_assignments` Table - Core Design

```
candidate_assignments
├─ recruitment_run_id → recruitment_runs.id
├─ candidate_id → users.id (OIDC user reference)
├─ assessment_id → assessments.id
├─ status (pending → in_progress → submitted → completed)
└─ deadline, timestamps, etc.
```

### Why This Structure?

**Normalized Approach:**
- Prevents data duplication (same candidate, same assessment, different runs)
- One assignment record per candidate-assessment-run combination
- Supports reassignment (delete old, create new) without data loss

**Alternative Considered & Rejected:**

```
❌ Flat approach: Store all assignments in assessments table
   Problem: Tight coupling, can't track multiple runs easily
   
❌ Join table in recruitment_runs: Store assignments as JSONB
   Problem: Difficult to query, index, and maintain consistency
   
✅ Dedicated table: candidate_assignments (chosen)
   Benefit: Flexible querying, good indexing, historical tracking
```

---

## 3. Candidate Assignment Lifecycle

### State Diagram

```
┌─────────┐
│ pending │  (candidate hasn't started yet)
└────┬────┘
     │ candidate clicks "Start"
     ↓
┌──────────────┐
│ in_progress  │  (candidate actively working)
└────┬─────────┘
     │ candidate clicks "Submit"
     ↓
┌──────────┐
│submitted │  (waiting for grading)
└────┬─────┘
     │ all scores entered
     ↓
┌──────────┐
│completed │  (grading finished, results ready)
└──────────┘
```

### Status Transitions & Business Logic

| From | To | Trigger | Validation |
|------|-----|---------|-----------|
| pending | in_progress | Candidate clicks "Start" | - Recruitment run is `active` |
| in_progress | submitted | Candidate clicks "Submit" | - All required fields answered |
| submitted | completed | Auto-trigger when all scores entered | - All responses have scores |
| pending | - | Deadline passed | Auto-cancel or mark as expired |
| * | * | Admin reassign | Delete old record, create new one |

### Implementation Considerations

```typescript
// Check if a candidate can start
function canStartAssessment(assignment: CandidateAssignment, run: RecruitmentRun): boolean {
  return (
    assignment.status === 'pending' &&
    run.status === 'active' &&
    new Date() < (assignment.deadline || run.end_date)
  );
}

// Check if a candidate can submit
function canSubmitAssessment(assignment: CandidateAssignment, responses: Response[]): boolean {
  const assessment = assignment.assessment; // with questions/tasks
  const requiredResponses = assessment.questions.length + assessment.coding_tasks.length;
  
  return (
    assignment.status === 'in_progress' &&
    responses.length === requiredResponses
  );
}

// Auto-complete when all scores exist
async function maybeCompleteAssessment(assignment: CandidateAssignment): void {
  const assessment = assignment.assessment;
  const totalQuestions = assessment.questions.length;
  const totalTasks = assessment.coding_tasks.length;
  const totalExpectedScores = totalQuestions + totalTasks;
  
  const scoredCount = await scores.count({
    where: { candidate_assignment_id: assignment.id }
  });
  
  if (scoredCount === totalExpectedScores) {
    assignment.status = 'completed';
    await assignment.save();
  }
}
```

---

## 4. Recruitment Run Management

### RecruitmentRun Structure

```typescript
interface RecruitmentRun {
  id: string;
  name: string;           // "Apprentice Intake 2026 - Summer"
  year: number;           // 2026
  start_date: Date;       // First day assignments can be taken
  end_date: Date;         // Final submission deadline
  status: 'planning' | 'active' | 'closed' | 'archived';
  description?: string;   // Context about this cohort
  
  // Aggregated stats (optional denormalization)
  candidate_count?: number;
  submitted_count?: number;
  completed_count?: number;
}
```

### Status Lifecycle for Recruitment Runs

```
planning
  ├─ Create assessments
  ├─ Import candidates
  ├─ Assign assessments
  └─ Setup complete → active

active
  ├─ Candidates take assessments
  ├─ Deadline approaches
  └─ Submissions end → closed

closed
  ├─ Admins review and grade
  ├─ Recommendations generated
  └─ All complete → archived

archived
  ├─ Historical data preserved
  ├─ Read-only access for admins
  └─ Used for comparisons
```

---

## 5. Multi-Assignment Scenarios

### Scenario A: Single Candidate, Single Assessment per Run

**Typical Case:**
```
Recruitment Run: "Apprentice 2026"
├─ John Doe
│  └─ JavaScript Assessment → submitted, graded
└─ Jane Smith
   └─ JavaScript Assessment → submitted, graded
```

### Scenario B: Single Candidate, Multiple Assessments

**Use Case:** Phased assessment (initial screening + deep dive)

```
Recruitment Run: "Apprentice 2026"
├─ John Doe
│  ├─ Phase 1: Fundamentals → submitted, graded
│  └─ Phase 2: Advanced → submitted, graded
└─ Jane Smith
   ├─ Phase 1: Fundamentals → submitted, graded
   └─ Phase 2: Advanced → pending (only if passed Phase 1)
```

**Database:**
```sql
-- Create assignments for Phase 1
INSERT INTO candidate_assignments (recruitment_run_id, candidate_id, assessment_id, status)
SELECT rr.id, u.id, a.id, 'pending'
FROM recruitment_runs rr
CROSS JOIN users u
CROSS JOIN assessments a
WHERE rr.year = 2026 AND a.title = 'Phase 1';

-- After Phase 1 grading, conditionally create Phase 2 assignments
INSERT INTO candidate_assignments (recruitment_run_id, candidate_id, assessment_id, status)
SELECT rr.id, ca.candidate_id, a.id, 'pending'
FROM candidate_assignments ca
JOIN recruitment_runs rr ON ca.recruitment_run_id = rr.id
JOIN assessments a ON a.title = 'Phase 2'
JOIN assessment_results ar ON ar.candidate_assignment_id = ca.id
WHERE ar.percentage_score >= 75  -- Only those who scored above 75%
  AND rr.year = 2026
  AND NOT EXISTS (
    SELECT 1 FROM candidate_assignments ca2
    WHERE ca2.recruitment_run_id = rr.id
      AND ca2.candidate_id = ca.candidate_id
      AND ca2.assessment_id = a.id
  );
```

### Scenario C: Reassignment (Candidate Retakes Assessment)

**Use Case:** Technical issue or admin decision to retry

```
Old Assignment: Marked as 'completed' or 'failed'
New Assignment: Same candidate, same assessment, same run
```

**Implementation:**
```sql
-- Create new assignment record (old one remains for audit trail)
INSERT INTO candidate_assignments 
  (recruitment_run_id, candidate_id, assessment_id, status, assigned_at)
VALUES 
  (rr_id, candidate_id, assessment_id, 'pending', NOW());

-- Old responses and submissions remain (historical)
-- Candidate works on new assignment record
-- Results tracked separately
```

**Query: Show all attempts for a candidate:**
```sql
SELECT 
  ca.id,
  ca.status,
  ar.percentage_score,
  ar.recommendation,
  ca.submitted_at,
  ca.updated_at
FROM candidate_assignments ca
LEFT JOIN assessment_results ar ON ar.candidate_assignment_id = ca.id
WHERE ca.recruitment_run_id = $1
  AND ca.candidate_id = $2
  AND ca.assessment_id = $3
ORDER BY ca.created_at DESC;
```

---

## 6. Bulk Assignment Operations

### Use Case: Assigning Same Assessment to Many Candidates

```sql
-- Admin assigns "JavaScript Fundamentals" to all candidates in 2026 run
WITH candidates_to_assign AS (
  SELECT u.id
  FROM users u
  WHERE u.role = 'candidate'
    AND u.is_active = true
    AND NOT EXISTS (
      -- Exclude already assigned
      SELECT 1 FROM candidate_assignments ca
      WHERE ca.recruitment_run_id = $1
        AND ca.candidate_id = u.id
        AND ca.assessment_id = $2
    )
)
INSERT INTO candidate_assignments 
  (recruitment_run_id, candidate_id, assessment_id, status, deadline, assigned_at)
SELECT 
  $1, -- recruitment_run_id
  ca.id,
  $2, -- assessment_id
  'pending',
  (SELECT end_date FROM recruitment_runs WHERE id = $1), -- inherit run deadline
  NOW()
FROM candidates_to_assign ca;
```

---

## 7. Query Patterns

### Dashboard: Recruitment Run Overview

```sql
-- Get summary for admin dashboard
SELECT 
  rr.id,
  rr.name,
  rr.year,
  rr.status,
  COUNT(DISTINCT ca.candidate_id) as candidates_count,
  COUNT(CASE WHEN ca.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN ca.status = 'in_progress' THEN 1 END) as in_progress_count,
  COUNT(CASE WHEN ca.status = 'submitted' THEN 1 END) as submitted_count,
  COUNT(CASE WHEN ca.status = 'completed' THEN 1 END) as completed_count,
  COALESCE(AVG(ar.percentage_score), 0) as avg_score
FROM recruitment_runs rr
LEFT JOIN candidate_assignments ca ON ca.recruitment_run_id = rr.id
LEFT JOIN assessment_results ar ON ar.candidate_assignment_id = ca.id
WHERE rr.year = $1
GROUP BY rr.id, rr.name, rr.year, rr.status;
```

### Candidate View: My Assignments

```sql
SELECT 
  ca.id,
  a.title,
  a.description,
  ca.status,
  ca.deadline,
  ca.started_at,
  ca.submitted_at,
  ar.percentage_score,
  ar.recommendation
FROM candidate_assignments ca
JOIN assessments a ON ca.assessment_id = a.id
LEFT JOIN assessment_results ar ON ar.candidate_assignment_id = ca.id
WHERE ca.recruitment_run_id = $1
  AND ca.candidate_id = $2
ORDER BY ca.status DESC, ca.deadline ASC;
```

### Admin Review: Ungraded Submissions

```sql
SELECT 
  u.email,
  u.full_name,
  rr.name as run_name,
  a.title as assessment_title,
  ca.submitted_at,
  COUNT(DISTINCT ar.id) as scored_items,
  COUNT(DISTINCT q.id) + COUNT(DISTINCT ct.id) as total_items
FROM candidate_assignments ca
JOIN users u ON ca.candidate_id = u.id
JOIN recruitment_runs rr ON ca.recruitment_run_id = rr.id
JOIN assessments a ON ca.assessment_id = a.id
LEFT JOIN assessment_results ar ON ar.candidate_assignment_id = ca.id
LEFT JOIN questions q ON q.assessment_id = a.id
LEFT JOIN coding_tasks ct ON ct.assessment_id = a.id
WHERE ca.status = 'submitted'
  AND ar.id IS NULL  -- No scores yet
GROUP BY ca.id, u.id, rr.id, a.id
ORDER BY ca.submitted_at ASC;
```

---

## 8. Handling Edge Cases

### Edge Case 1: Deadline Extensions

**Scenario:** Candidate needs more time due to technical issues

**Implementation:**
```sql
-- Extend deadline for specific assignment
UPDATE candidate_assignments
SET deadline = deadline + INTERVAL '24 hours',
    updated_at = NOW()
WHERE id = $1;

-- Or extend for all candidates in a run
UPDATE candidate_assignments
SET deadline = deadline + INTERVAL '24 hours'
WHERE recruitment_run_id = $1
  AND status = 'in_progress';
```

### Edge Case 2: Candidate Drops Out

**Scenario:** Candidate withdraws from assessment

**Implementation:**
```sql
-- Soft delete: Mark assignment as cancelled
UPDATE candidate_assignments
SET status = 'cancelled'
WHERE id = $1;

-- Hard option: Keep for audit trail but exclude from reports
-- Admin dashboard should filter WHERE status != 'cancelled'
```

### Edge Case 3: Multiple Recruitment Runs Open Simultaneously

**Scenario:** Summer and winter cohorts run in parallel

**Implementation:**
```sql
-- Each run is independent
SELECT DISTINCT ca.assessment_id
FROM candidate_assignments ca
WHERE ca.recruitment_run_id = $1  -- Only this run's assignments

-- Query by candidate + run
SELECT *
FROM candidate_assignments
WHERE candidate_id = $1
  AND recruitment_run_id = $2;
```

### Edge Case 4: Changing Assignment After Submission

**Scenario:** Admin needs to update assessment after some candidates submitted

**Implementation:**
```
Option A: Freeze assessments once first submission received
  └─ Set assessment.is_locked = true
  └─ New candidates get v2, old ones completed v1

Option B: Version assessments
  └─ assessments.version increments
  └─ candidate_assignments.assessment_version tracks which version taken

Option C: Create new assessment, reassign new candidates
  └─ Old candidates keep assignment to original
  └─ New candidates assigned to updated version
```

---

## 9. Performance Optimization

### Indexes for Common Queries

```sql
-- Fast candidate lookups by recruitment run
CREATE INDEX idx_ca_run_candidate 
ON candidate_assignments(recruitment_run_id, candidate_id);

-- Fast admin review of pending work
CREATE INDEX idx_ca_status_submitted 
ON candidate_assignments(recruitment_run_id, status) 
WHERE status = 'submitted';

-- Fast join to results
CREATE INDEX idx_ar_assignment 
ON assessment_results(candidate_assignment_id);

-- Historical analysis: by year
CREATE INDEX idx_rr_year 
ON recruitment_runs(year, status);
```

### Caching Strategy

```
Candidates list per run:
  - Cache: 5 minutes
  - Invalidate: When candidate_assignments.* changes

Assignment results:
  - Cache: 10 minutes
  - Invalidate: When assessment_results.* changes

Recommendations:
  - Cache: 1 hour
  - Invalidate: When scores added/changed
```

---

## 10. Validation Rules

### Business Rules to Enforce

| Rule | Level | Check |
|------|-------|-------|
| Candidate can't take assessment before assigned | App + DB | `ca.status` must not be 'pending' or later than deadline |
| Can't assign if assessment has no questions | App + DB | `COUNT(questions) + COUNT(coding_tasks) > 0` |
| Can't submit with incomplete answers | App | All questions/tasks must have responses |
| Can't grade same response twice | DB | UNIQUE(candidate_assignment_id, question_id) on scores |
| Can't modify closed recruitment run | App | Check `rr.status != 'closed'` |
| Candidates assigned only to active runs | App | `rr.status = 'active'` for new assignments |

### SQL Constraints

```sql
-- Prevent duplicate assignments
CREATE UNIQUE INDEX ux_unique_assignment 
ON candidate_assignments(recruitment_run_id, candidate_id, assessment_id)
WHERE status != 'cancelled';

-- Ensure assessment is not empty
ALTER TABLE assessments 
ADD CONSTRAINT ck_assessment_has_content 
CHECK (
  (SELECT COUNT(*) FROM questions WHERE assessment_id = id) +
  (SELECT COUNT(*) FROM coding_tasks WHERE assessment_id = id) > 0
);

-- Ensure deadline is after start date
ALTER TABLE candidate_assignments
ADD CONSTRAINT ck_deadline_after_start
CHECK (deadline IS NULL OR deadline > assigned_at);
```

---

## 11. Data Retention & Compliance

### Retention Policy

| Data Type | Retention | Rationale |
|-----------|-----------|-----------|
| Completed recruitment runs (archived) | 7 years | Legal/hiring audit trail |
| Candidate responses & code | 3 years | Compare with next cohort |
| Scores & feedback | Indefinite | Reference for candidates |
| Audit logs | 2 years | Compliance |
| Soft-deleted users | 90 days then purge | GDPR right to be forgotten |

### GDPR Considerations

```sql
-- Right to be forgotten: Anonymize candidate data
UPDATE users
SET email = 'deleted-' || id,
    full_name = 'Deleted User',
    oidc_sub = 'deleted-' || id,
    is_active = false
WHERE id = $1;

-- Keep responses/scores but disassociate from identity
UPDATE assessment_responses
SET candidate_assignment_id = NULL
WHERE candidate_id = $1;

-- Audit trail of deletion
INSERT INTO audit_log (action, entity_type, entity_id, user_id, timestamp)
VALUES ('DELETE_USER', 'user', $1, current_user_id(), NOW());
```

---

## 12. Summary

**Key Design Decisions:**

1. ✅ **Dedicated `candidate_assignments` table** - Supports flexible assignment patterns
2. ✅ **Status machine** - Clear workflow states (pending → in_progress → submitted → completed)
3. ✅ **Recruitment run as container** - Yearly cohorts with independent assignments
4. ✅ **Immutable OIDC references** - Use `oidc_sub` as primary external identifier
5. ✅ **Historical preservation** - Soft deletes and audit trails for compliance
6. ✅ **Scalable queries** - Proper indexes and denormalization for performance

**Next Steps:**

- [ ] Review with team for business rule alignment
- [ ] Create TypeORM entity definitions
- [ ] Build assignment management APIs
- [ ] Implement recruitment run workflow
- [ ] Add dashboard queries and caching layer
- [ ] Plan database migrations

This model is production-ready and scales with your platform's growth.

