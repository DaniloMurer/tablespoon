
# tablespoon

**tablespoon** is a platform for assessing prospective apprentices for software development roles. It helps administrators create, manage, run, and evaluate structured applicant assessments consisting of classic question-and-answer tests as well as practical coding tasks.

The goal of the project is to provide a fair, repeatable, and transparent way to compare candidates based on both theoretical understanding and practical problem-solving ability.

## Purpose

Hiring apprentices for software development is not only about checking existing programming knowledge. It is also about identifying potential, logical thinking, motivation, attention to detail, and the ability to approach unfamiliar problems.

This platform is intended to support that process by allowing administrators to define assessment content, collect candidate submissions, score results, and review the outcome later in a structured way.

## Core Concept

Administrators can create assessments made up of different types of tasks:

- **Question-and-answer tests**  
  Traditional test questions that can be used to evaluate topics such as programming basics, logic, web development concepts, databases, debugging, or general technical understanding.

- **Coding tasks**  
  Practical exercises where candidates are asked to solve a programming-related problem. These tasks can be used to evaluate code quality, problem-solving approach, correctness, structure, and creativity.

Candidate results are saved persistently so they can be reviewed, compared, and analyzed by administrators at a later point.

## Main Features

### Assessment Management

Admins should be able to define and manage tests that contain both theoretical questions and coding tasks.

Possible assessment content includes:

- Multiple-choice questions
- Free-text questions
- Short-answer questions
- Practical coding exercises
- Task descriptions with requirements and expected outcomes
- Optional hints, constraints, or evaluation criteria

All questions and tasks should be stored persistently so that assessments can be reused, edited, archived, or extended over time.

### Candidate Participation

Candidates should be able to take assigned assessments in a guided flow. During an assessment, they can answer questions and complete coding tasks according to the rules defined by the administrators.

The platform should keep track of submitted answers and coding solutions so that no result is lost and every assessment attempt can be reviewed afterwards.

### Scoring

The platform should provide a scoring model for submitted assessments.

Scoring may include:

- Automatically calculated points for objective questions
- Manual review for free-text answers
- Manual or semi-automatic evaluation of coding tasks
- Weighted scores for different sections
- Separate scoring categories, such as correctness, code quality, readability, and problem-solving approach

The scoring system should help administrators compare candidates in a consistent and understandable way.

### Result Analysis

After candidates complete their assessments, administrators should be able to review and analyze the results.

This may include:

- Overview of all candidates
- Individual candidate result pages
- Scores per question or task
- Total assessment score
- Notes or comments from reviewers
- Comparison between candidates
- Historical access to previous assessment results

Persisted results allow the organization to revisit decisions, compare assessment rounds, and improve future tests.

### Candidate Recommendation

At the end of an assessment round, the platform should support administrators by suggesting the strongest candidate or candidates.

The recommendation should be based on the collected assessment results and scoring criteria. It should not replace human decision-making, but rather provide a structured indication of which candidates performed best according to the defined evaluation model.

Possible recommendation factors include:

- Total score
- Coding task performance
- Consistency across different sections
- Strengths and weaknesses
- Reviewer feedback
- Optional weighting of specific skills

## User Roles

### Admin

Admins are responsible for creating and maintaining the assessment content. They can define questions, coding tasks, scoring rules, and review submitted results.

Typical admin responsibilities:

- Create assessments
- Add and edit questions
- Add and edit coding tasks
- Define scoring criteria
- Review candidate submissions
- Analyze results
- Compare candidates
- View platform recommendations

### Candidate

Candidates complete the assessments assigned to them. They answer questions, solve coding tasks, and submit their work for review.

Typical candidate actions:

- Start an assigned assessment
- Answer test questions
- Complete coding tasks
- Submit the finished assessment

## Long-Term Vision

The platform should become a practical tool for apprentice selection in software development. It should help make the assessment process more objective, organized, and reusable while still allowing administrators to apply their own judgment.

Future improvements could include:

- Assessment templates
- Time-limited tests
- Automatic grading for selected coding tasks
- Plagiarism or similarity checks
- Skill-based score breakdowns
- Exportable reports
- Candidate ranking dashboards
- Interview notes connected to assessment results
- Support for multiple assessment rounds

