# Dispatch — Clinear hackathon demo fixture

This deliberately tiny repository contains an intentional priority-ordering bug.
It is sample data for demonstrating human + local AI collaboration in Clinear,
not a production service or a real customer incident.

## Reproduce

Requires Node.js 22+. No dependencies or credentials are needed.

```sh
npm test
```

One test initially fails: higher priority numbers should run first, but the
implementation currently returns the lowest-priority task.

## Acceptance criteria

- Select the highest-priority task.
- Return `null` for an empty queue.
- Preserve input array order.
- Keep stable ordering for equal priorities.
- Include passing regression tests.

Clinear agents should work in a separate Git worktree. This repository is the
reproducible input; no successful agent execution is claimed by this fixture.

License: MIT.
