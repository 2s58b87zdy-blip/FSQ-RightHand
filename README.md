# FSQ Command v5.1.1

Workshop QA approval hotfix.

## Fixed
- Administrator can approve workshop welding.
- Approval is role-based instead of only name-based.
- Supported roles: Administrator, Admin, Workshop Manager, QA Inspector, Quality Inspector and Supervisor.
- Flemming and Jakob accounts remain supported.
- Optional permissions: approve_welding and workshop_qa_approve.
- Approval helper records approver, role and timestamp where the workflow object stores approval data.

## Test
1. Log in as Flemming / Administrator.
2. Open a Workshop project.
3. Open Tasks / Workshop QA.
4. Click Approve for welding.
5. Verify that the task advances.
6. Test Approve final weld.
