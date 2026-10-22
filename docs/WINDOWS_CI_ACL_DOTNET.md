# Module-independent Windows ACL access

Actual CI evidence narrowed the failure:

- Run 39815961331: dependency install and lint passed; 348 of 433 tests passed and 85 failed, primarily PRIVATE_STORAGE_ACL_UNCONFIRMED.
- Isolated run 39818149187: first directory protection timed out at 15000 ms even without full-suite load.
- Checkpoint run 39818570801: the script reached GET_ITEM but not IDENTITY, locating the stall at the Get-Item command invocation. This does not by itself prove the internal reason for that cmdlet's stall.

The ACL helper now uses .NET Framework calls directly from Windows PowerShell: File.GetAttributes for directory/reparse classification, and File/Directory.GetAccessControl and SetAccessControl for security descriptors. Cmdlet/module dependencies (Get-Item, Get-Acl, Set-Acl and Where-Object) are removed. Module autoloading is disabled in this private helper.

Security behavior remains: reject reparse points; require current-user ownership and protected DACL; permit exactly the current user's and SYSTEM's explicit FullControl rules; verify after applying. The restricted subprocess environment, 15000 ms deadline and fixed success marker remain. Failure remains fatal before network submission in existing callers. No raw PowerShell error or identity data is logged.

Added Windows integration tests actually add an Everyone read rule to a protected test file and re-enable inheritance on a protected test directory, then require verification to reject each mutation. Fixtures contain no secrets. Existing persistence and execution safety tests still run in CI.

Native results for this implementation are pending. The prior checkpoint tests are diagnostic changes, not proof of a fixed CI run. The agent environment is offline; the new Windows preflight and full suite must provide that evidence.

API references:
- https://learn.microsoft.com/en-us/dotnet/api/system.io.directory.setaccesscontrol?view=netframework-4.8.1
- https://learn.microsoft.com/en-us/dotnet/api/system.io.fileattributes
