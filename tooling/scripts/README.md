# Repository Scripts

Placeholder for cross-workspace automation that does not belong in an application or shared runtime package.
Repository checks

- `yarn deps:check` validates workspace dependency direction and detects relative-import cycles.
- `yarn format:check` validates tracked source formatting invariants.
- Root `yarn lint` runs both checks before Turbo workspace lint tasks.
