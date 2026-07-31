#!/usr/bin/env bash
# Enable main branch protection: require PR + CI jobs frontend/backend/docker.
# Needs a GitHub token with Administration permission on the repo
# (personal `gh auth login` as the repo owner usually works; cloud agent tokens often 403).
set -euo pipefail

REPO="${REPO:-zhiyi199501-creator/videograb}"
BRANCH="${BRANCH:-main}"

gh api -X PUT "repos/${REPO}/branches/${BRANCH}/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["frontend", "backend", "docker"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false
}
EOF

echo "Branch protection updated for ${REPO}@${BRANCH}"
echo "Required checks: frontend, backend, docker"
echo "Require PR before merge: yes (0 approving reviews)"
echo "Enforce admins: yes"
