#!/bin/bash
# PreToolUse hook: Require --signoff on git commit commands

# Read the JSON input from stdin
input=$(cat)

# Extract the command from the tool_input
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Check if this is a git commit command
if echo "$command" | grep -q "git commit"; then
  # Check if --signoff or -s flag is present
  if ! echo "$command" | grep -qE '(--signoff|-s\b)'; then
    echo '{"decision": "block", "reason": "git commit must include --signoff flag for DCO compliance"}'
    exit 0
  fi
fi

# Allow all other commands
echo '{"decision": "allow"}'
