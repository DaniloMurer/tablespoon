# Database Documentation Index

## Quick Navigation

Welcome to the Tablespoon database documentation. This folder contains comprehensive guidance for designing, implementing, and managing the database for your apprentice assessment platform.

### 📋 Documentation Files

#### 1. **DATABASE_MODEL.md** (Start Here)
Complete reference for all database entities and their relationships.

**Contents:**
- Overview of core entities (User, RecruitmentRun, Assessment, etc.)
- Table schemas with column definitions
- Relationships diagram
- Foreign key constraints and indexing strategy
- Soft delete strategy
- Performance considerations
- Example SQL queries

**Best for:** Getting a complete picture of the data model

---

#### 2. **IMPLEMENTATION_GUIDE.md** (Strategic Reference)
Architectural recommendations and implementation strategy for OIDC integration.

**Contents:**
- OIDC/JWT synchronization workflow
- JWT extraction and user provisioning
- User sync middleware implementation
- Role mapping from OIDC to database
- Authentication workflow updates
- User provisioning strategies (manual vs. auto)
- TypeORM entity structure examples
- Role-based access control (RBAC)
- Security considerations
- Data migration and backup strategy

**Best for:** Understanding how to implement the model with your existing Logto OIDC system

---

#### 3. **CANDIDATE_ASSIGNMENT_DESIGN.md** (Detailed Specification)
In-depth design for candidate assignments and recruitment runs.

**Contents:**
- Core assignment model and design rationale
- Candidate assignment lifecycle and state machine
- Recruitment run management
- Multi-assignment scenarios (single, phased, reassignment)
- Bulk assignment operations
- Query patterns for common use cases
- Edge case handling
- Performance optimization
- Validation rules and SQL constraints
- Data retention and GDPR compliance

**Best for:** Understanding the yearly recruitment workflow and assignment logic

---

## 🗂️ Quick Reference by Use Case

### "I'm implementing the user system"
→ Read: IMPLEMENTATION_GUIDE.md → Section 1-5

### "I need to set up candidate assignments"
→ Read: CANDIDATE_ASSIGNMENT_DESIGN.md → Sections 2-7

### "I want to build admin dashboards"
→ Read: DATABASE_MODEL.md → Section "Example SQL Snippets"
→ Then: CANDIDATE_ASSIGNMENT_DESIGN.md → Section 7 "Query Patterns"

### "I'm handling a yearly recruitment cycle"
→ Read: CANDIDATE_ASSIGNMENT_DESIGN.md → Section 3 "Candidate Assignment Lifecycle"
→ Then: IMPLEMENTATION_GUIDE.md → Section 7 "Candidate Assignment Workflow"

### "I need to understand OIDC integration"
→ Read: IMPLEMENTATION_GUIDE.md → Sections 1-4

### "I need to ensure data security"
→ Read: IMPLEMENTATION_GUIDE.md → Section 6 "Security Considerations"
→ Then: CANDIDATE_ASSIGNMENT_DESIGN.md → Section 11 "Data Retention & Compliance"

### "I want to build the API"
→ Read: IMPLEMENTATION_GUIDE.md → Section 5 "Database Connection & ORM Setup"
→ Then: CANDIDATE_ASSIGNMENT_DESIGN.md → Section 7 "Query Patterns"

---

## 🎯 Implementation Phases

### Phase 1: Foundation (Database Setup)
**Duration:** 1-2 weeks

**Tasks:**
- [ ] Read DATABASE_MODEL.md (complete understanding)
- [ ] Read IMPLEMENTATION_GUIDE.md (sections 1-5)
- [ ] Create PostgreSQL database and schema
- [ ] Set up TypeORM entities
- [ ] Create migration scripts
- [ ] Test OIDC integration with JWT validation

**Deliverables:**
- Database schema deployed
- TypeORM entities in place
- User provisioning working

**Documentation to Reference:**
- DATABASE_MODEL.md (for schema)
- IMPLEMENTATION_GUIDE.md (for OIDC setup)

---

### Phase 2: Assessment Management (CRUD APIs)
**Duration:** 2-3 weeks

**Tasks:**
- [ ] Implement Assessment CRUD endpoints
- [ ] Implement Question CRUD endpoints
- [ ] Implement CodingTask CRUD endpoints
- [ ] Add permission guards (admin-only)
- [ ] Build assessment versioning

**Deliverables:**
- Admin can create/edit assessments
- Questions and coding tasks stored correctly
- Proper authorization checks

**Documentation to Reference:**
- DATABASE_MODEL.md (sections: Assessment, Question, CodingTask)
- IMPLEMENTATION_GUIDE.md (section: Permission Model)

---

### Phase 3: Recruitment & Assignment (Core Feature)
**Duration:** 2-3 weeks

**Tasks:**
- [ ] Create RecruitmentRun CRUD endpoints
- [ ] Implement bulk candidate import
- [ ] Implement assignment creation endpoints
- [ ] Build assignment status tracking
- [ ] Create assignment queries for dashboards

**Deliverables:**
- Admins can create yearly recruitment runs
- Admins can import and assign candidates
- Dashboard shows assignment status

**Documentation to Reference:**
- CANDIDATE_ASSIGNMENT_DESIGN.md (all sections)
- IMPLEMENTATION_GUIDE.md (section 7)

---

### Phase 4: Assessment Taking (Candidate Flow)
**Duration:** 2-3 weeks

**Tasks:**
- [ ] Build candidate assignment list endpoint
- [ ] Build assessment start/resume endpoints
- [ ] Build response submission endpoints
- [ ] Build code submission endpoints
- [ ] Track submission timestamps

**Deliverables:**
- Candidates can see their assignments
- Candidates can take assessments
- Responses/code saved persistently

**Documentation to Reference:**
- DATABASE_MODEL.md (sections: AssessmentResponse, CodingSubmission)
- CANDIDATE_ASSIGNMENT_DESIGN.md (section 3: Lifecycle)

---

### Phase 5: Scoring & Results (Admin Review)
**Duration:** 2-3 weeks

**Tasks:**
- [ ] Auto-score multiple choice questions
- [ ] Build admin scoring interface
- [ ] Implement score persistence
- [ ] Build assessment results aggregation
- [ ] Generate recommendations

**Deliverables:**
- Multiple choice auto-scored
- Admins can manually score free-text/code
- Results dashboard with recommendations

**Documentation to Reference:**
- DATABASE_MODEL.md (sections: Score, AssessmentResult)
- IMPLEMENTATION_GUIDE.md (section 8: Recommendation Engine)

---

### Phase 6: Analytics & Reporting (Future Enhancement)
**Duration:** 2-3 weeks

**Tasks:**
- [ ] Build historical comparison queries
- [ ] Create skill-based score breakdowns
- [ ] Generate exportable reports
- [ ] Build candidate ranking dashboards

**Deliverables:**
- Historical trends visible
- Exportable reports for stakeholders
- Candidate rankings

**Documentation to Reference:**
- DATABASE_MODEL.md (Performance Considerations)
- CANDIDATE_ASSIGNMENT_DESIGN.md (section 9: Performance Optimization)

---

## 🔑 Key Architectural Decisions

### 1. **OIDC as Primary Identity**
- Users are identified by OIDC `sub` claim, not email
- Database syncs from JWT on each request
- Simplifies user provisioning and reduces database size

**Impact:** Users can change email in OIDC; we follow

---

### 2. **Dedicated Assignment Table**
- Candidate-to-Assessment mappings stored in `candidate_assignments`
- Not embedded in RecruitmentRun or Assessment tables
- Supports flexible assignment patterns

**Impact:** Can handle single assignments, phased assessments, reassignments cleanly

---

### 3. **State Machine for Assignment Status**
- Clear lifecycle: pending → in_progress → submitted → completed
- Validates transitions at application level
- Enables reliable workflow tracking

**Impact:** Easy to build status-aware dashboards and validations

---

### 4. **Denormalized Assessment Results**
- `assessment_results` table caches aggregated scores
- Avoids expensive SUM() queries on every dashboard load
- Recalculated when scores change

**Impact:** Fast dashboard performance; trade-off is cache invalidation

---

### 5. **Soft Deletes for Audit Trail**
- `is_archived`, `is_active` flags instead of hard deletes
- Preserves historical data for compliance
- Enables GDPR "right to be forgotten"

**Impact:** Audit trail preserved; queries must filter deleted records

---

## ⚠️ Important Considerations

### OIDC Integration
- JWT validation is already implemented ✅
- You must sync user roles from JWT to database
- Consider how email changes are handled (they can happen in OIDC)
- Plan for token refresh if tokens are short-lived

### Performance at Scale
- Indexes are critical (see DATABASE_MODEL.md)
- Denormalize aggregate scores for fast queries
- Archive old recruitment runs to keep active data small
- Monitor queries that scan large assignment tables

### Data Privacy
- Implement row-level security (PostgreSQL RLS) for multi-tenancy
- GDPR-compliant deletion for candidate data
- Audit logs for all sensitive operations
- Consider PII encryption for sensitive fields

### Recruitment Workflow
- Manual candidate import (don't auto-provision)
- Assignment deadlines are soft (for UX)
- Support reassignments for technical issues
- Keep all attempts in history (don't overwrite)

---

## 📊 Entity Relationship Diagram

```
┌─────────────┐
│    User     │  (OIDC identity)
├─────────────┤
│ id (PK)     │
│ oidc_sub    │ ◄─ Primary external identifier
│ email       │
│ role        │ (admin/candidate)
└─────────────┘
      │
      ├─→ created_assessments ─→ Assessment
      ├─→ scored_submissions ─→ Score
      └─→ reviewed_by ─→ Review

┌──────────────────┐
│RecruitmentRun    │  (Yearly cohort)
├──────────────────┤
│ id, name, year   │
│ start_date       │
│ end_date         │
│ status           │
└──────────────────┘
      │
      └─→ candidate_assignments ◄─┐
                     │             │
                     ├────────────┴─→ candidates (users)
                     ├─→ Assessment
                     ├─→ responses ─→ Question/CodingTask
                     └─→ assessment_results
                            └─→ scores

┌─────────────────┐
│  Assessment     │  (Test template)
├─────────────────┤
│ id, title       │
│ version         │
└─────────────────┘
      │
      ├─→ questions
      ├─→ coding_tasks
      └─→ candidate_assignments

┌─────────────────┐
│  AssignmentResult │  (Aggregated)
├─────────────────┤
│ total_points    │
│ percentage_score│
│ recommendation  │
└─────────────────┘
      └─→ scores
```

---

## 🚀 Getting Started

1. **Week 1:** Read all documentation files (2-3 hours)
2. **Week 2:** Review with your team, align on implementation approach
3. **Week 3:** Create database schema from DATABASE_MODEL.md
4. **Week 4:** Start Phase 1 (Foundation) from implementation phases above

---

## 📞 Questions?

Refer to these sections:

- **"How do we sync users from OIDC?"** → IMPLEMENTATION_GUIDE.md § 1-3
- **"How do candidates get assigned?"** → CANDIDATE_ASSIGNMENT_DESIGN.md § 2-3
- **"What queries do I need?"** → CANDIDATE_ASSIGNMENT_DESIGN.md § 7, DATABASE_MODEL.md § Example SQL
- **"How do I handle security?"** → IMPLEMENTATION_GUIDE.md § 6
- **"What about GDPR?"** → CANDIDATE_ASSIGNMENT_DESIGN.md § 11
- **"How do I scale this?"** → CANDIDATE_ASSIGNMENT_DESIGN.md § 9

---

## 📝 Version History

| Date | Version | Changes |
|------|---------|---------|
| June 19, 2026 | 1.0 | Initial comprehensive database design documentation |

---

## License

These documentation files are part of the **Tablespoon** project and are subject to the same license as the main codebase.

