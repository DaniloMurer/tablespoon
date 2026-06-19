# Implementation & Architecture Recommendations

## Overview

This document provides implementation guidance, architectural recommendations, and specific considerations for integrating the proposed database model with your existing Logto OIDC authentication system.

---

## 1. OIDC Integration Strategy

### Current Setup Analysis

Your project uses:
- **OIDC Provider**: Logto (`https://auth.churrer.dev`)
- **Client**: Nuxt app with `@logto/vue`
- **Server**: NestJS with Passport JWT strategy
- **JWT Validation**: JWKS-based with ES384 algorithm

### Database-OIDC Synchronization Flow

```
┌──────────────────────────────────────────────────────────────┐
│ OIDC Provider (Logto)                                        │
│ - Manages user credentials, MFA, profiles                    │
│ - Issues JWT: { sub, email, roles, [custom claims] }        │
└──────────────────────────────────────────────────────────────┘
                            ↓
                    JWT Token in Request
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ NestJS Server                                                │
│ 1. Passport validates JWT signature (JWKS)                  │
│ 2. Extract: sub (user ID), email, roles                     │
│ 3. Look up or create user in database                       │
│ 4. Sync roles from JWT claim to database                    │
│ 5. Proceed with request                                      │
└──────────────────────────────────────────────────────────────┘
                            ↓
                      Application Logic
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                          │
│ - users table with oidc_sub, email, role, ...              │
│ - All application data                                       │
└──────────────────────────────────────────────────────────────┘
```

### Recommended Implementation Steps

#### Step 1: JWT Extraction & User Sync Middleware

Create a middleware that auto-provisions users from JWT claims:

```typescript
// Pseudocode for NestJS middleware
@Injectable()
export class JwtUserSyncMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const user = req.user; // From Passport JWT strategy
    
    if (user) {
      // Sync or create user in database
      await this.usersService.syncFromJwt({
        oidc_sub: user.userId,        // from payload.sub
        email: user.email,
        roles: user.roles
      });
      
      // Attach database user to request
      req.dbUser = result;
    }
    
    next();
  }
}
```

#### Step 2: Extend JWT Payload with Custom Claims

In Logto admin panel, consider adding custom claims to JWT:
- `department` (if multi-organization)
- `is_admin` (boolean flag for faster authorization checks)
- `organization_id` (if supporting multiple orgs later)

#### Step 3: Role Mapping

Logto roles → Database roles mapping:

```
Logto OIDC Roles    →    Database Role    →    Permissions
─────────────────        ──────────────        ────────────
admin                    admin                 Create assessments, grade, manage runs
candidate                candidate             Take assessments
```

---

## 2. Authentication Workflow Updates

### Current Flow
1. User → Logto login
2. Logto → JWT to frontend
3. Frontend → API call + JWT in Authorization header
4. NestJS → Validate JWT signature (works ✅)

### Recommended Additional Flow for Database

```
POST /api/assessments
│
├─→ Guard: @UseGuards(JwtAuthGuard)
│
├─→ Passport extracts JWT payload
│   Extract: sub, email, roles
│
├─→ Middleware/Guard: Sync user to database
│   INSERT OR UPDATE users SET ...
│
├─→ Middleware/Guard: Check user role from database
│   Role-based authorization (admin-only routes)
│
└─→ Controller handles request
```

---

## 3. User Provisioning Strategy

### Scenario A: Manual Admin Import (Recommended for v1)

**Workflow:**
1. Admin uploads CSV with candidate emails
2. Backend imports to `users` table with `role='candidate'`
3. When candidate logs in for the first time:
   - Passport JWT strategy validates JWT
   - `oidc_sub` claim matched against `users.oidc_sub`
   - If match found: candidate can access their assessments
   - If no match: user exists in OIDC but not in database → redirect to admin portal

**Benefits:**
- Full control over who has access
- Can assign candidates to recruitment runs before they log in
- Reduces unauthorized access

**Implementation:**
```sql
-- Admin creates recruitment run
INSERT INTO recruitment_runs (name, year, ...) 
VALUES ('Apprentice 2026', 2026, ...);

-- Admin bulk imports candidates
INSERT INTO users (oidc_sub, email, full_name, role) 
VALUES ('logto_sub_1', 'john@example.com', 'John Doe', 'candidate');

-- Create assignments
INSERT INTO candidate_assignments (recruitment_run_id, candidate_id, assessment_id, status)
VALUES (run_id, user_id, assessment_id, 'pending');

-- When candidate logs in next time:
-- Passport validates JWT, user already exists → can access
```

### Scenario B: Auto-Provisioning (Less Control)

**Workflow:**
1. Anyone with Logto account can log in
2. First login → automatically create user in database with `role='candidate'`
3. Admin manually approves or updates role

**Drawback:** 
- Anyone with Logto account gains access
- Less suitable if Logto is shared across multiple organizations

---

## 4. Database Connection & ORM Setup

### Current: TypeORM Integration

Your `package.json` already includes:
- `@nestjs/typeorm`
- `typeorm`
- `pg` (PostgreSQL driver)

### Recommended Entity Structure

```typescript
// entities/user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  oidc_sub: string; // Primary external identifier

  @Column({ unique: true })
  email: string;

  @Column()
  full_name?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CANDIDATE })
  role: UserRole;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => CandidateAssignment, ca => ca.candidate)
  assignments: CandidateAssignment[];

  @OneToMany(() => Assessment, a => a.createdBy)
  created_assessments: Assessment[];
}

enum UserRole {
  ADMIN = 'admin',
  CANDIDATE = 'candidate'
}
```

---

## 5. Permission Model

### Role-Based Access Control (RBAC)

**Admin Permissions:**
- `assessment:create`
- `assessment:edit`
- `assessment:delete`
- `recruitment_run:create`
- `recruitment_run:manage`
- `score:create`
- `score:edit`
- `candidate:assign`

**Candidate Permissions:**
- `assessment:view` (assigned only)
- `assessment:take`
- `submission:create`

### Implementation

```typescript
// guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user; // From JWT
    
    return user.role === UserRole.ADMIN;
  }
}

// Usage in controller
@Post('/assessments')
@UseGuards(JwtAuthGuard, AdminGuard)
async createAssessment(@Body() dto: CreateAssessmentDto) {
  // Only admins can reach here
}
```

---

## 6. Security Considerations

### 1. **OIDC Token Validation**

✅ Already implemented via Passport JWT strategy
- Validates signature using JWKS
- Checks issuer, audience, algorithms
- Expiration time is validated

**Recommendation:** Add token refresh logic if JWT is short-lived

### 2. **Database Credential Security**

```
DATABASE_URL environment variable should include:
- Host: postgres.example.com
- Port: 5432
- Username: tablespoon_user (specific, limited permissions)
- Password: strong, randomly generated
- Database: tablespoon
- SSL: Enabled for production

Example:
DATABASE_URL=postgresql://tablespoon_user:PASSWORD@postgres.churrer.dev:5432/tablespoon?sslmode=require
```

### 3. **Row-Level Security (RLS)**

Use PostgreSQL RLS to prevent data leakage:

```sql
-- Ensure candidates can only see their own assignments
CREATE POLICY candidate_can_see_own_assignments 
ON candidate_assignments 
USING (candidate_id = current_user_id());

-- Admins can see all
CREATE POLICY admin_can_see_all 
ON candidate_assignments 
USING (is_admin());
```

### 4. **Audit Logging**

Track sensitive actions:
- Who created/modified assessments
- Who scored submissions
- Who assigned candidates

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  action VARCHAR,
  entity_type VARCHAR,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  user_id UUID,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Candidate Assignment Workflow

### Yearly Recruitment Run: Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ JANUARY: Planning Phase                                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Admin creates recruitment run:                               │
│    INSERT INTO recruitment_runs (name, year, status)            │
│    VALUES ('Apprentice 2026', 2026, 'planning')                │
│                                                                 │
│ 2. Admin creates/uploads assessments                            │
│    INSERT INTO assessments (...) VALUES (...)                  │
│                                                                 │
│ 3. Admin bulk imports candidates                               │
│    INSERT INTO users (oidc_sub, email, role)                   │
│    VALUES (...)                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MARCH: Assignment Phase                                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Update recruitment run status:                               │
│    UPDATE recruitment_runs SET status = 'active' WHERE ...      │
│                                                                 │
│ 2. Assign assessments to candidates:                            │
│    INSERT INTO candidate_assignments                            │
│    (recruitment_run_id, candidate_id, assessment_id, status)    │
│    VALUES (rr_id, cand_id, assess_id, 'pending')              │
│                                                                 │
│ 3. Candidates receive notification (via email/dashboard)       │
│    - "You have been assigned Assessment X"                      │
│    - Deadline provided in candidate_assignments.deadline        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ APRIL-MAY: Assessment Phase                                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Candidate clicks "Start Assessment"                          │
│    UPDATE candidate_assignments SET status = 'in_progress'      │
│                                                                 │
│ 2. Candidate answers questions, solves tasks                    │
│    INSERT INTO assessment_responses (...) VALUES (...)          │
│    INSERT INTO coding_submissions (...) VALUES (...)            │
│                                                                 │
│ 3. Candidate submits                                            │
│    UPDATE candidate_assignments SET status = 'submitted'        │
│    INSERT INTO assessment_results (status = 'pending')          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ JUNE: Review & Grading Phase                                    │
├─────────────────────────────────────────────────────────────────┤
│ 1. Auto-score multiple choice questions (background job)        │
│    For each multiple_choice question:                           │
│    - Insert scores with points_earned = 0 or max points        │
│                                                                 │
│ 2. Admin reviews free-text and coding submissions                │
│    - Dashboard shows all unscored submissions                   │
│    - Admin inputs scores and feedback                           │
│    INSERT INTO scores (...) VALUES (...)                        │
│                                                                 │
│ 3. System recalculates aggregate results                        │
│    UPDATE assessment_results SET                                │
│      total_points_earned = ...,                                 │
│      percentage_score = ...,                                    │
│      recommendation = CASE WHEN ... THEN ...                    │
│    WHERE candidate_assignment_id = ...                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ JULY: Decision & Closure                                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. Admin views dashboard with ranked candidates                 │
│    - Sorted by percentage_score DESC                            │
│    - System provides recommendations                            │
│                                                                 │
│ 2. Admin adds manual reviews/notes                              │
│    INSERT INTO reviews (candidate_id, comment, recommendation)  │
│                                                                 │
│ 3. Recruitment run marked as closed                             │
│    UPDATE recruitment_runs SET status = 'closed'                │
│                                                                 │
│ 4. Archive or export data                                       │
│    UPDATE recruitment_runs SET status = 'archived'              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Recommendation Engine

### Simple Scoring Model

```sql
-- Calculate recommendation based on score
UPDATE assessment_results 
SET recommendation = 
  CASE 
    WHEN percentage_score >= 90 THEN 'strong_pass'
    WHEN percentage_score >= 75 THEN 'pass'
    WHEN percentage_score >= 60 THEN 'borderline'
    WHEN percentage_score >= 0 THEN 'fail'
    ELSE 'not_evaluated'
  END
WHERE status = 'scored';
```

### Advanced Scoring (Future)

```
Weighted Scoring:
- Coding Tasks (40%) - Tests practical ability
- Theory Questions (30%) - Tests foundational knowledge
- Consistency (20%) - Same performance across domains
- Feedback Score (10%) - Qualitative reviewer input

Recommendation Algorithm:
1. Calculate weighted score per category
2. Compare against historical data (prev. years)
3. Apply custom business rules
4. Suggest top N candidates
```

---

## 9. Data Migration & Backup Strategy

### Pre-Launch Checklist

- [ ] Database schema created and tested
- [ ] Backups automated (daily snapshots)
- [ ] User provisioning process documented
- [ ] OIDC integration tested end-to-end
- [ ] Sample recruitment run created for testing
- [ ] Disaster recovery plan in place
- [ ] Data retention policy documented

### Backup Strategy

```bash
# Daily backups to S3
# 30-day retention for point-in-time recovery

pg_dump -h postgres.churrer.dev -U tablespoon_user tablespoon | \
  gzip | \
  aws s3 cp - s3://tablespoon-backups/daily/backup-$(date +%Y%m%d).sql.gz
```

---

## 10. Future Enhancements

### Phase 2: Multi-Organization Support
- Add `organization_id` to key tables
- Implement data isolation
- Use OIDC org claims for automatic routing

### Phase 3: Advanced Scoring
- Automatic code execution for coding tasks
- Plagiarism detection via API (e.g., Moss)
- ML-based scoring suggestions

### Phase 4: Candidate Portal Enhancements
- Real-time progress tracking
- Peer comparison (anonymized)
- Detailed performance reports

### Phase 5: Analytics & Reporting
- Historical trends (how do 2026 candidates compare to 2025?)
- Skill-based breakdown (which candidates excel in what areas?)
- Exportable reports for stakeholders

---

## Summary

**Key Takeaways:**

1. **OIDC Syncing**: Auto-provision users from JWT claims on first login
2. **User Management**: Manual candidate import for recruitment runs (recommended v1 approach)
3. **Security**: Leverage OIDC for authentication, use database roles for authorization
4. **Scalability**: Denormalize aggregate scores for fast dashboard queries
5. **Auditability**: Log all sensitive changes for compliance
6. **Flexibility**: Support multiple recruitment runs per year and candidate reassignments

The model is ready for implementation and integrates seamlessly with your existing Logto OIDC setup.

