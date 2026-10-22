# Windows validation workflow

The Windows validation workflow runs on pull-request opens, updates, reopen and ready-for-review events, including draft PR updates. It can also be manually dispatched once available in GitHub Actions. It does not run observation commands or place exchange orders.

The job uses windows-2022 and Node.js 24.22.0. It records Node/npm versions, installs dependencies, then runs:

```text
npm.cmd run lint
npm.cmd run test:security
```

Both commands must succeed for the job to pass. The whole job is bounded to 20 minutes and the security step to 15 minutes. New runs supersede an in-progress run for the same workflow/ref.

GitHub actions are pinned to verified commit SHAs for actions/checkout v4, actions/setup-node v4 and actions/upload-artifact v4. The workflow requests only contents: read, does not persist checkout credentials and does not reference repository secrets. It uses the ordinary pull_request event, not pull_request_target.

## Dependency reproducibility

The repository currently has no committed package-lock.json. In that case the workflow uses npm install, which resolves the package.json ranges against the registry and generates a lock file on the runner. This is not an exact reproduction of the operator's existing node_modules and can expose previously unseen installation or version incompatibilities.

If a lock file is subsequently committed, the same workflow automatically switches to npm ci. Generated/resolved package-lock.json is retained as a seven-day artifact named windows-dependency-lock, including after later lint/test failures when a lock file exists. It is not automatically committed to the repository. No fixture state, account storage, environment files or testnet journals are uploaded.

A workflow file existing in the branch does not prove that GitHub executed it. GitHub may suppress workflow events created through some integrations or require repository Actions approval/settings changes. A missing run or pending check is not a passing check.

## Validation baseline

The operator previously confirmed clean Windows lint and all 433 security tests at implementation revision 1edcffe576e0dfeafdbe2504ef7a6a3c5c4202c4. The later validation-record commit changed documentation only.

This workflow has not yet produced a verified CI result at authoring time. The agent execution environment is offline; no local YAML runner or native test execution is claimed. CI status must be read from the actual GitHub run.

The PR remains draft and unmerged. Adding CI does not enable automatic trading, reset consumed one-shot order rights, or authorize mainnet activity.
