# Windows CI ACL failure investigation

The first Windows CI run, 39815961331, tested PR head 3571ba6c18ec8cb364a2fb6c3aa9e8eb944e66a7 through GitHub's PR merge checkout. Node 24.22.0 and npm 11.19.1 installed dependencies successfully and TypeScript lint passed. The security suite completed with 433 tests: 348 passed and 85 failed.

Failures concentrate on PRIVATE_STORAGE_ACL_UNCONFIRMED, with many operations taking approximately the existing 15000 ms subprocess timeout. The old fixed error discarded the subprocess outcome, so timeout versus failed ACL verification cannot yet be established. This is evidence of a CI-specific failure, not a passing result or a reason to remove access controls.

The unchanged ACL helper still applies and verifies a protected current-user/SYSTEM DACL, rejects reparse points and uses a restricted child environment. A new result verifier requires status zero, no subprocess error and the exact AQ_PRIVATE_OK marker. All other outcomes remain failures.

Typed diagnostics expose only:
- TIMEOUT, START_FAILED, PROCESS_FAILED or UNEXPECTED_OUTPUT.
- Numeric exitStatus (or null).
- Monotonic elapsedMs (or null).

No subprocess stdout/stderr, arguments, environment values, user SID or storage path are retained in the diagnostic error. The existing PRIVATE_STORAGE_ACL_UNCONFIRMED message remains compatible with callers.

A Windows CI preflight now creates nonsecret temporary fixtures, applies and verifies directory and file protection using the actual helper, then removes the fixtures. It runs before lint and the full suite and fails the job if permissions cannot be confirmed. This separates an isolated ACL failure from failure under suite load without bypassing either check.

Two added tests verify that errors/nonzero exit/unexpected markers never pass and that failure categories stay distinct without exposing payloads. Native validation and the new CI preflight result are pending. The agent execution environment is offline.

No timeout, ACL, durability, reference freshness or execution rule was relaxed. Mainnet and automatic execution remain disabled.
