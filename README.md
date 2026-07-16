# FSQ Command v5.3.1

Strict workshop approval update.

## Changed
Only these users can:
- approve tack welding / fit-up
- approve final weld
- complete or release jobs

Approved users:
- Flemming
- Flemming Bach
- Jakob
- Jakob Kjær Danielsen

All other roles, including Administrator, Supervisor, Project Manager, QA Inspector and Engineer, are blocked unless the logged-in user's name is Flemming or Jakob.

## Test
1. Log in as Flemming and approve tack welding.
2. Log in as Jakob and complete a job.
3. Log in as another user and confirm that approval/completion is blocked.
