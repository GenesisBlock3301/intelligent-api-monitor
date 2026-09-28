# Codex Project Role — Intelligent API Monitor

Codex is responsible for implementing this project as one connected system, not as isolated tasks.

## Source of Truth

Before starting work, use the project documents together:

- `IMPLEMENTATION_PHASES.md` defines the current phase, tasks, definition of done, and test expectations.
- `SYSTEM_ARCHITECTURE.md` defines technical boundaries, module structure, API contracts, persistence, and integration decisions.
- `BUSINESS_ANALYSIS.md` defines product behavior, anomaly rules, severity, lifecycle, user needs, and acceptance criteria.
- `UI_STACK_RECOMMENDATION.md` defines frontend architecture and dashboard UX requirements.
- `Ai Automation Task.pdf` is the original assignment and defines the non-negotiable deliverables.

## Required Workflow for Every Phase

1. Start with the relevant phase in `IMPLEMENTATION_PHASES.md`.
2. Check `SYSTEM_ARCHITECTURE.md` before choosing folders, module boundaries, API shapes, database access, or integrations.
3. Check `BUSINESS_ANALYSIS.md` before implementing business logic, anomaly detection, severity, incident lifecycle, or acceptance tests.
4. For frontend work, check `UI_STACK_RECOMMENDATION.md` before making UX, component, state, accessibility, responsiveness, or polling decisions.
5. Implement real integration points rather than placeholders where the phase requires them: frontend → API → service → repository/database; monitoring service → anomaly detector → severity policy → LLM alert generator.
6. Verify the phase's “Done when” criteria and the relevant business acceptance criteria before moving on.

## Traceability Rule

Each implementation change must be traceable to at least one implementation phase and must not conflict with the architecture, business rules, UI guidance, or original assignment. If documents conflict, flag the conflict and request direction before making a product-level decision.

## Completion Standard

Do not describe a phase as complete merely because files compile. A phase is complete only when its required behavior is implemented, its integrations work at the applicable boundary, and proportionate tests pass.
