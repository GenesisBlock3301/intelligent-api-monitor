# UI Recommendation Stack — API Monitoring Dashboard

## 1. UI Goal

The frontend is an **operational monitoring interface**, not a marketing website.

The user should be able to answer these questions immediately:

1. What is broken?
2. How serious is it?
3. Which API is affected?
4. Why was it flagged?
5. How many times has it happened?
6. When did it last happen?
7. What does the AI explanation say?

The UI should prioritize:

```text
clarity
scanability
hierarchy
operational density
low visual noise
```

---

## 2. Recommended Stack

Use:

```text
React
Vite
Tailwind CSS
shadcn/ui
Lucide Icons
```

Optional:

```text
TanStack Query
```

### Why This Stack

#### React

- familiar ecosystem;
- fast implementation;
- component-based;
- ideal for dashboard UI.

#### Vite

- fast setup;
- fast development server;
- minimal configuration.

#### Tailwind CSS

- fast layout and spacing iteration;
- good fit for AI-assisted coding;
- avoids large custom CSS files.

#### shadcn/ui

Provides polished reusable primitives:

- Table
- Badge
- Button
- Sheet
- Dialog
- Tooltip
- Skeleton
- Dropdown
- Tabs

This reduces both development time and the amount of UI code Codex needs to invent.

#### Lucide

Use consistent simple icons.

Avoid mixed icon libraries.

#### TanStack Query — Optional

Useful for:

- polling;
- loading/error state;
- retries;
- cache management.

If using plain `fetch` is already clean and time is very limited, TanStack Query is optional.

---

## 3. UI Architecture

```text
App
└── DashboardPage
    ├── Header
    ├── SummaryCards
    ├── IncidentToolbar
    ├── AlertTable
    │   └── AlertRow
    └── IncidentDetailsSheet
        ├── IncidentHeader
        ├── TriggeredRules
        ├── RawMetrics
        ├── AIExplanation
        └── IncidentTimeline
```

---

## 4. Main Dashboard Layout

Recommended:

```text
┌────────────────────────────────────────────────────────────┐
│ API Monitoring                                 ● Monitoring │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Active Alerts        Critical        Affected APIs         │
│      7                  2                  4                │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Active Incidents                                           │
│                                                            │
│ API           Severity   Problem       Count   Last Seen   │
│ Appointment   CRITICAL   HTTP + Data      5       2m       │
│ Patient       MEDIUM     Latency          2       8m       │
│ Billing       HIGH       HTTP             3      11m       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

Do not create a large hero section.

Do not create decorative dashboards that hide the operational information.

---

## 5. Summary Cards

Use only three core metrics:

```text
Active Alerts
Critical Alerts
Affected APIs
```

Optional later:

```text
Last Updated
```

Avoid adding meaningless metrics simply to fill the screen.

---

## 6. Incident Table

Recommended columns:

```text
API
Severity
Anomaly Types
Occurrences
Last Seen
Status
```

Optional:

```text
Alert Source
```

Do not put the full AI explanation inside the table.

Use truncation or omit it and show it in the detail panel.

---

## 7. Incident Details

Use a right-side `Sheet` / drawer.

Example:

```text
AppointmentAPI                           CRITICAL

ACTIVE


Triggered Rules
────────────────────────────
HTTP_FAILURE
HIGH_LATENCY
ZERO_RECORDS


Raw Metrics
────────────────────────────
HTTP Status            500
Response Time          5500 ms
Records Returned       0


AI Explanation
────────────────────────────
AppointmentAPI returned HTTP 500,
took 5.5 seconds to respond and
returned no records...


Incident Timeline
────────────────────────────
First Seen             10:02 AM
Last Seen              10:18 AM
Occurrences            8

Alert Source
LLM
```

This is more useful than adding multiple charts.

---

## 8. Semantic Severity

Use color only when it has meaning.

Recommended semantic levels:

```text
CRITICAL → red
HIGH     → strong warning tone
MEDIUM   → amber
ACTIVE   → neutral or subtle status badge
```

Do not make every card colorful.

If everything is visually loud, critical incidents no longer stand out.

---

## 9. Required UI States

Implement all of these:

### Loading

Use:

```text
Skeleton rows
```

Avoid a blank page with only:

```text
Loading...
```

### Empty

Use:

```text
No active incidents

All monitored API events currently pass the configured health rules.
```

### Error

Use:

```text
Unable to load active incidents.

[Retry]
```

### Normal

Display:

- summary;
- incident table;
- details.

### Long Content

For long anomaly type lists or LLM messages:

- truncate in table;
- show full content in details drawer.

---

## 10. Responsive Strategy

Primary target:

```text
Desktop
```

because this is an operations dashboard.

Mobile must remain usable, but do not spend large amounts of time perfecting mobile layout.

Recommended:

```text
Desktop
→ table

Small screen
→ horizontally scrollable table
or
→ compact incident cards
```

For a 2–3 day implementation, horizontal table scrolling is acceptable if clean.

---

## 11. Visual Style

Use:

```text
professional
quiet
operational
dense but readable
neutral
```

Avoid:

```text
gradients
glassmorphism
large hero sections
decorative illustrations
marketing-style cards
random bright colors
oversized headings
```

Recommended visual hierarchy:

```text
Page title
↓
Operational summary
↓
Incident list
↓
Detail drawer
```

---

## 12. Accessibility

Minimum:

- semantic HTML;
- visible keyboard focus;
- buttons have accessible labels;
- do not communicate severity using color alone;
- adequate contrast;
- table headers correctly marked;
- icons accompanied by text where meaning is important.

---

## 13. Polling

Recommended prototype behavior:

```text
GET /alerts every 5–10 seconds
```

Show:

```text
Last updated: ...
```

only if easy.

Do not build WebSockets for this assignment unless all core work is already complete.

---

## 14. Recommended Components from shadcn/ui

Use:

```text
Card
Table
Badge
Button
Sheet
Separator
Skeleton
Tooltip
DropdownMenu
Alert
```

Potentially:

```text
Tabs
```

Do not import a large number of components unnecessarily.

---

## 15. Codex Token-Efficient UI Workflow

### Step 1 — Create `AGENTS.md`

Store persistent frontend rules once.

Recommended content:

```md
# Frontend Rules

This is an operational API monitoring dashboard.

Stack:
- React
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide

Design:
- professional SaaS operational UI
- information-dense but readable
- desktop-first
- neutral visual language
- semantic severity colors only
- no gradients
- no glassmorphism
- no hero sections
- no decorative illustrations
- consistent spacing
- prefer tables for incident data
- use a side Sheet for incident details

Primary user questions:
1. What is broken?
2. How serious is it?
3. Why was it flagged?
4. How often has it happened?
5. When did it last happen?

Do not modify backend API contracts without explicit instruction.
```

This prevents repeating long design prompts.

---

## 16. Codex Task Strategy

Do not prompt:

```text
Build the entire beautiful frontend.
```

Use small implementation tasks.

### Task 1

```text
Set up Tailwind and shadcn/ui.
Create the Dashboard page shell.
Do not add mock business logic yet.
```

### Task 2

```text
Implement SummaryCards using:
- Active Alerts
- Critical Alerts
- Affected APIs

Use existing dashboard layout.
Do not redesign other components.
```

### Task 3

```text
Implement AlertTable.

Columns:
- API
- Severity
- Anomaly Types
- Occurrences
- Last Seen
- Status

Use shadcn Table and Badge.
Do not change API contracts.
```

### Task 4

```text
Implement IncidentDetails using a shadcn Sheet.

Show:
- severity
- status
- triggered rules
- raw metrics
- AI explanation
- first seen
- last seen
- occurrence count
- alert source
```

### Task 5

```text
Add:
- loading skeleton
- empty state
- fetch error state with Retry
```

### Task 6

```text
Review responsive behavior and accessibility.
Do not redesign working sections.
Only fix concrete usability problems.
```

---

## 17. Good Codex Prompt Template

```text
Implement the active incidents table in:

frontend/src/components/AlertTable.jsx

Requirements:
- use existing shadcn/ui components
- columns: API, Severity, Anomaly Types, Occurrences, Last Seen, Status
- clicking a row opens the existing IncidentDetails Sheet
- use semantic severity badges
- truncate long anomaly lists
- preserve backend API contract
- do not redesign the page header or summary cards
- handle empty data safely
- run frontend build/tests after changes
```

This is better than:

```text
Make dashboard professional.
```

---

## 18. Visual Review Workflow

Use:

```text
Codex implementation
        ↓
run application
        ↓
inspect actual UI
        ↓
identify concrete problem
        ↓
targeted Codex fix
```

Examples of targeted feedback:

```text
Reduce table row height.
```

```text
The details drawer has weak visual hierarchy.
Group raw metrics separately from the AI explanation.
```

```text
Critical badges are good, but medium severity is too visually strong.
Reduce emphasis on medium alerts.
```

This avoids expensive full redesign loops.

---

## 19. What Not to Build in 2–3 Days

Do not prioritize:

- complex charts;
- drag-and-drop dashboards;
- dark mode;
- customizable layouts;
- advanced animation;
- WebSockets;
- heatmaps;
- historical analytics;
- multi-page settings;
- theme customization.

These have lower value than:

- correct incident table;
- clear severity;
- good detail view;
- loading/error/empty states;
- stable backend integration.

---

## 20. Final UI Stack

Lock this:

```text
React
Vite
Tailwind CSS
shadcn/ui
Lucide
```

Optional:

```text
TanStack Query
```

Architecture:

```text
React SPA
    ↓
GET /alerts
    ↓
Node.js API
```

Primary UX:

```text
Summary
   ↓
Incident Table
   ↓
Details Sheet
```

Final UI principle:

> The dashboard is successful when a user can understand what failed, how serious it is, why it was detected, how often it happened, and what the AI explanation says within a few seconds.
