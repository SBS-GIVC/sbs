import subprocess
import sys

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, text=True, capture_output=True)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)

def get_remote_branches():
    code, stdout, stderr = run_command("git branch -r")
    if code != 0:
        print(f"Error fetching branches: {stderr}")
        return []
    
    branches = []
    for line in stdout.splitlines():
        line = line.strip()
        if "->" in line: continue
        if "origin/main" in line: continue
        if "HEAD" in line: continue
        branches.append(line)
    return branches

def merge_branches():
    branches = get_remote_branches()
    print(f"Found {len(branches)} remote branches.")
    
    merged_count = 0
    conflict_count = 0
    skipped_count = 0

    # Prioritize security fixes
    priority_prefixes = ["origin/dependabot", "origin/alert-autofix"]
    other_prefixes = ["origin/chore", "origin/claude", "origin/copilot", "origin/cursor"]

    sorted_branches = []
    for prefix in priority_prefixes:
        sorted_branches.extend([b for b in branches if b.startswith(prefix)])
    for prefix in other_prefixes:
        sorted_branches.extend([b for b in branches if b.startswith(prefix) and b not in sorted_branches])
    
    # Add any remaining
    for b in branches:
        if b not in sorted_branches:
            sorted_branches.append(b)

    for branch in sorted_branches:
        print(f"Attempting to merge {branch}...")
        
        # Merge
        code, out, err = run_command(f"git merge {branch} --no-edit")
        
        if code == 0:
            print(f"✅ Successfully merged {branch}")
            merged_count += 1
        else:
            if "CONFLICT" in out or "CONFLICT" in err:
                print(f"⚠️  Conflict merging {branch}. Aborting.")
                run_command("git merge --abort")
                conflict_count += 1
            elif "Already up to date" in out:
                print(f"ℹ️  {branch} is already up to date.")
                skipped_count += 1
            else:
                print(f"❌ Clean merge failed for {branch}: {err}")
                run_command("git merge --abort")
                skipped_count += 1

    print(f"\nSummary:")
    print(f"Merged: {merged_count}")
    print(f"Conflicts (Skipped): {conflict_count}")
    print(f"Skipped/Other: {skipped_count}")

if __name__ == "__main__":
    merge_branches()
