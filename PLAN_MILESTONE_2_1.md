# Jeni AI — Phase 2: Intelligence + Autonomy
## Milestone 2.1 — IDE Context + Diagnostics

You are working on Jeni AI, an existing custom AI-powered coding IDE.

IMPORTANT:
The actual repository/codebase is the source of truth.

If anything in this document differs from the existing implementation, do NOT blindly follow this document. Report the discrepancy and explain what the code actually does.

Do NOT rebuild Jeni from scratch.
Do NOT replace working systems unnecessarily.
Do NOT assume a feature is missing before inspecting the codebase.
Do NOT implement future milestones prematurely.

Your first responsibility is to understand the existing Jeni architecture and extend it safely.

==================================================
CURRENT JENI — PHASE 1
==================================================

Jeni already has a working foundation that includes, depending on the actual implementation:

- Custom IDE environment
- Workspace/project interaction
- File opening and manipulation
- Project/file control
- Terminal integration
- Command execution
- Python file execution through the local/system environment
- Basic AI coding interaction
- AI provider/API integration

The architectural goal is:

Jeni is an IDE with Jeni AI deeply integrated into it.

Jeni is NOT simply a chatbot embedded inside an editor.

The IDE is intended to give Jeni access to:

- files
- workspace
- project structure
- terminal
- code
- execution environment
- development workflow

However, DO NOT assume all of the above are implemented exactly as described.

Inspect the repository and determine the actual implementation.

==================================================
PHASE 2 — INTELLIGENCE + AUTONOMY
==================================================

Long-term goal:

Transform Jeni from:

AI + IDE + tools

into:

an intelligent coding agent capable of:

UNDERSTAND
→ INSPECT
→ RETRIEVE
→ PLAN
→ ACT
→ OBSERVE
→ VERIFY
→ RECOVER
→ COMPLETE

The Phase 2 roadmap is:

2.1 — IDE Context + Diagnostics
2.2 — Codebase Understanding + Retrieval
2.3 — Planning
2.4 — Git Awareness + Checkpoints
2.5 — Execution + Verification
2.6 — Error Recovery
2.7 — Unified Autonomous Agent Loop
2.8 — Advanced RAG + Intelligence
2.9 — Agent Benchmarking

These are separate engineering milestones.

DO NOT implement all of Phase 2 in one pass.

==================================================
CURRENT SCOPE
==================================================

WE ARE ONLY IMPLEMENTING:

# Milestone 2.1 — IDE Context + Diagnostics

Do NOT implement:

- Codebase RAG
- embeddings
- vector databases
- semantic retrieval
- autonomous planning
- Git checkpoints
- error recovery
- autonomous multi-step execution
- advanced agent loops
- benchmarking

Those belong to future milestones.

==================================================
PHASE 2.1 GOAL
==================================================

The goal of Milestone 2.1 is to make Jeni aware of its immediate development environment.

Jeni should eventually understand:

"What workspace am I in?"

"What file am I editing?"

"What code am I looking at?"

"What files are open?"

"Where is my cursor?"

"What is currently selected?"

"What is currently broken?"

"What happened in the terminal?"

This information will become the foundation for later agent intelligence.

==================================================
STEP 0 — INSPECT BEFORE CODING
==================================================

Before modifying code, inspect the existing repository thoroughly enough to understand:

1. Overall project structure
2. Frontend architecture
3. Editor implementation
4. Workspace/project implementation
5. File system implementation
6. State management
7. Open-tab management
8. Terminal implementation
9. Command execution
10. Python execution
11. AI/agent implementation
12. AI provider/API integration
13. Existing diagnostics/error handling
14. Existing event/state communication
15. Existing reusable utilities/components

Pay particular attention to:

- What editor technology is being used
- Whether Monaco or another editor is used
- Whether language services/LSP already exist
- Whether diagnostics already exist
- How editor state is currently stored
- How terminal results are currently returned
- How AI requests currently receive IDE information

DO NOT make major architectural changes during this inspection.

==================================================
FIRST RESPONSE — ARCHITECTURE ASSESSMENT
==================================================

Before implementing anything, report:

A. Current architecture

B. Existing relevant components

C. Current state/data flow

D. Current editor implementation

E. Current terminal implementation

F. Current AI/agent implementation

G. Current diagnostics/error handling

H. What Milestone 2.1 already partially has

I. What is missing

J. What can be reused

K. What should be extended/refactored

L. Proposed minimal architecture for 2.1

M. Files that would need modification

N. Files that would need creation

O. Potential technical risks

Do NOT make major code changes until this assessment is complete.

==================================================
2.1A — IDE CONTEXT ENGINE
==================================================

After the architecture assessment, create or extend a centralized IDE context system.

Conceptually:

IDEContext

- workspace/project root
- active file
- active file language
- selected text
- selection start/end
- cursor position
- open tabs
- visible/open files where available
- terminal state where available
- running processes where available
- recent file changes
- current diagnostics

Conceptually:

IDEContext
├── workspace
├── activeFile
├── selection
├── cursor
├── openTabs
├── terminals
├── diagnostics
└── recentChanges

IMPORTANT:

Do NOT blindly implement every field.

Only implement information that can be reliably obtained from the existing Jeni architecture.

If a field is not currently available, document that and implement the cleanest extensible path toward supporting it.

The context system should be:

- modular
- extensible
- predictable
- serializable
- validated

Avoid tightly coupling the context engine to a single UI component.

==================================================
2.1B — CONTEXT COLLECTION
==================================================

Create a clean mechanism for collecting current IDE state.

Conceptually:

getIDEContext()

should return structured context.

The AI should not need to directly inspect arbitrary UI components to understand IDE state.

Separate:

IDE state
→ context collection
→ context representation
→ AI context formatting

Do NOT mix IDE state management with AI reasoning.

Do NOT send entire files unnecessarily.

Context should be minimal and relevant.

==================================================
2.1C — DIAGNOSTICS
==================================================

Diagnostics are a potentially architecture-dependent part of this milestone.

DO NOT assume how diagnostics should be implemented.

First determine what the current editor supports.

For example:

If the IDE uses Monaco or an existing language service:

- reuse existing editor/language diagnostics where possible.

If no language diagnostics are available:

- determine whether compiler/build/linter/terminal output can provide reliable diagnostics.

Do NOT invent diagnostics.

Do NOT create a fake diagnostics system just to satisfy the architecture.

Only report actual diagnostics.

Normalize available diagnostics into a common structure such as:

Diagnostic {
    id
    severity
    message
    file
    line
    column
    source
    timestamp
}

Adapt the exact structure to the existing architecture where appropriate.

Potential sources include:

- TypeScript errors
- compiler errors
- build errors
- runtime errors
- terminal errors
- test failures
- lint errors
- editor/language diagnostics

For this milestone, prioritize the diagnostics that can be obtained reliably from the existing Jeni implementation.

==================================================
2.1D — TERMINAL COMMAND RESULT
==================================================

Jeni already has terminal/command execution.

Create or extend a structured command result.

Conceptually:

CommandResult {
    command
    exitCode
    stdout
    stderr
    duration
    success
}

This is PART OF MILESTONE 2.1.

It is not merely future infrastructure.

It directly supports the current terminal diagnostics requirements and TEST 6.

It will also become useful in future milestones such as:

- Verification
- Error Recovery
- Autonomous Agent Loop

Do not implement those future systems yet.

The important goal here is simply:

terminal execution
→ structured CommandResult

Make the implementation compatible with the existing terminal architecture.

==================================================
2.1E — AI CONTEXT INTEGRATION
==================================================

Integrate the IDE context with the existing Jeni AI system.

The AI should eventually be able to receive relevant information such as:

Current workspace:
...

Active file:
...

Selected code:
...

Cursor:
...

Open files:
...

Diagnostics:
...

Terminal state:
...

However:

DO NOT blindly send all context with every request.

Create a clean context-building layer that determines what information is relevant.

The existing AI architecture should be reused rather than replaced.

Do not redesign the AI provider layer unless the existing implementation genuinely prevents clean context integration.

==================================================
ARCHITECTURAL RULES
==================================================

1. Inspect before modifying.

2. The repository is the source of truth.

3. Reuse existing Jeni functionality.

4. Do not duplicate state that already exists.

5. Keep IDE state separate from AI reasoning.

6. Keep context collection separate from context formatting.

7. Keep diagnostics separate from UI rendering.

8. Keep terminal execution separate from AI reasoning.

9. Do not introduce a database for this milestone.

10. Do not introduce a vector database.

11. Do not introduce embeddings.

12. Do not introduce RAG.

13. Do not build autonomous execution.

14. Do not build error recovery.

15. Do not build Git checkpoints.

16. Do not over-engineer.

17. Do not create abstractions without a current use case.

18. Prefer small, testable modules.

19. Preserve existing functionality.

20. Never claim something is implemented unless it has actually been tested.

==================================================
TESTING REQUIREMENTS
==================================================

Milestone 2.1 must eventually demonstrate:

TEST 1 — Active File

Open a file.

Expected:

Jeni correctly identifies the active file.

--------------------------------------------------

TEST 2 — Selection

Select code.

Expected:

Jeni receives the selected text and selection boundaries.

--------------------------------------------------

TEST 3 — Cursor

Move the cursor.

Expected:

Jeni receives the correct cursor position.

--------------------------------------------------

TEST 4 — Open Tabs

Open multiple files/tabs.

Expected:

Jeni knows which files are currently open.

--------------------------------------------------

TEST 5 — File Changes

Modify a file.

Expected:

Jeni can detect relevant file changes using the existing architecture.

--------------------------------------------------

TEST 6 — Terminal Failure

Run a command that actually fails.

Expected:

Jeni receives a structured CommandResult containing:

- command
- exit code
- stdout
- stderr
- duration
- success=false

--------------------------------------------------

TEST 7 — Diagnostics

Create a real compiler/runtime/editor/linter diagnostic supported by the actual architecture.

Expected:

Jeni receives the diagnostic in normalized form.

--------------------------------------------------

TEST 8 — IDE Context Question

Ask Jeni a question about the current IDE state.

For example:

"What file am I currently editing?"

Expected:

Jeni answers using actual IDE context.

It must not guess.

==================================================
SUCCESS CRITERIA
==================================================

Milestone 2.1 is complete when Jeni can reliably understand:

WHERE AM I?
→ workspace/project

WHAT AM I EDITING?
→ active file + language

WHAT AM I LOOKING AT?
→ selection + cursor

WHAT ELSE IS OPEN?
→ open tabs/files

WHAT IS BROKEN?
→ real diagnostics

WHAT HAPPENED?
→ structured terminal results

And the AI can access this information through a clean context layer.

==================================================
FUTURE MILESTONES
==================================================

Do NOT implement these now.

--------------------------------------------------
2.2 — CODEBASE UNDERSTANDING + RETRIEVAL
--------------------------------------------------

Start with:

- file tree
- file discovery
- keyword search
- regex search
- symbol search
- Tree-sitter/LSP where useful
- imports
- references
- structural retrieval

DO NOT start with embeddings.

Only add semantic/vector retrieval later if lexical and structural retrieval demonstrate measurable limitations.

--------------------------------------------------
2.3 — PLANNING
--------------------------------------------------

Introduce structured task planning.

Initial version:

User request
→ inspect
→ numbered plan
→ execute steps

Do not build a complex DAG planner initially.

--------------------------------------------------
2.4 — GIT + CHECKPOINTS
--------------------------------------------------

Add:

- git status
- git diff
- git log
- branch awareness
- checkpoints
- safe rollback

No blind destructive Git operations.

--------------------------------------------------
2.5 — EXECUTION + VERIFICATION
--------------------------------------------------

Build:

EXECUTE
→ OBSERVE
→ VERIFY

Jeni must not declare success merely because a command exited successfully.

--------------------------------------------------
2.6 — ERROR RECOVERY
--------------------------------------------------

Build:

FAIL
→ INVESTIGATE
→ FIX
→ RERUN
→ VERIFY

With:

- retry limits
- failure history
- rollback
- stopping conditions
- human escalation

--------------------------------------------------
2.7 — UNIFIED AUTONOMOUS AGENT LOOP
--------------------------------------------------

Eventually combine:

USER REQUEST
↓
IDE CONTEXT
↓
CODEBASE UNDERSTANDING
↓
RETRIEVAL
↓
PLAN
↓
CHECKPOINT
↓
EXECUTE
↓
OBSERVE
↓
DIAGNOSTICS
↓
VERIFY
↓
SUCCESS
   OR
RECOVER
↓
VERIFY
↓
COMPLETE

--------------------------------------------------
2.8 — ADVANCED INTELLIGENCE
--------------------------------------------------

Only after the basic autonomous loop works:

- embeddings
- semantic retrieval
- hybrid retrieval
- incremental indexing
- better planning
- adaptive tool selection
- project memory
- improved context management

--------------------------------------------------
2.9 — AGENT BENCHMARKING
--------------------------------------------------

Create repeatable coding-agent tasks.

Measure:

- task success rate
- recovery success
- number of attempts
- unnecessary tool calls
- errors introduced
- verification accuracy
- latency

==================================================
IMPLEMENTATION WORKFLOW
==================================================

For Milestone 2.1 use this workflow:

STEP 1
Inspect the existing repository.

STEP 2
Produce the architecture assessment.

STEP 3
Identify the smallest set of changes required.

STEP 4
Propose the implementation order.

STEP 5
Implement one small component at a time.

STEP 6
Test each component.

STEP 7
Integrate it with Jeni.

STEP 8
Run the Milestone 2.1 tests.

STEP 9
Fix any regressions.

STEP 10
Report what is actually complete and what remains.

Do not mark the milestone complete until the success criteria have been demonstrated.

==================================================
FINAL INSTRUCTION
==================================================

For your FIRST response in this session:

DO NOT WRITE CODE.

DO NOT MODIFY FILES.

DO NOT IMPLEMENT FEATURES.

Only inspect the existing Jeni repository and provide:

1. Current architecture
2. Existing relevant components
3. Current data/state flow
4. Current editor implementation
5. Current terminal implementation
6. Current AI/agent implementation
7. Current diagnostics/error handling
8. What already exists for Milestone 2.1
9. What is missing
10. What can be reused
11. Proposed minimal architecture
12. Files that would need modification
13. Files that would need creation
14. Risks or uncertainties
15. Recommended implementation order

Then STOP and wait for further instruction.

Priority:

UNDERSTAND EXISTING JENI
→ EXTEND IT
→ KEEP IT WORKING
→ TEST
→ VERIFY

Never pretend a feature is implemented if it has not been tested.
