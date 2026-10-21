# Agent Teams

**Always use `TeamCreate`** to set up agent teams — never spawn standalone background agents.

**Runtime prerequisite**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (set in `.claude/settings.json`). Without the flag (or in harnesses that don't expose `TeamCreate` / `SendMessage`), skills requiring Agent Teams must fall back to serial `Task` invocation.

## Spawn-Before-Delegate Pattern

Teammates must be spawned with minimal prompts before receiving task assignments. Tool access (including MCP tools via ToolSearch) is only fully initialized after the first turn completes.

### Required Sequence

1. **Create team** with TeamCreate
2. **Create tasks** with TaskCreate
3. **Spawn teammates** with minimal idle prompt — NO task content:
   > You are `{name}`, a {role} on this team. Your agent definition is at `.claude/agents/{agent-type}.md`. Stand by for task assignments.
4. **Wait for idle** notifications
5. **Send assignments** via SendMessage with full context

**Never include in spawn prompts**: task descriptions, diffs, PRD/ADR content, phase instructions, or workflow details.

Ref: https://github.com/anthropics/claude-code/issues/24307
