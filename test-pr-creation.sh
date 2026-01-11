#!/bin/bash
# Smoke test script for PR creation endpoint

ATTEMPT_ID="7b9ae1b7-21a9-45a4-98d9-1104b66347fe"
API_URL="http://localhost:8000/api/attempts/${ATTEMPT_ID}/create-pr"

echo "=== PR Creation Smoke Tests ==="
echo ""

# Test 1: No GITHUB_TOKEN (should fail with clear error)
echo "Test 1: Missing GITHUB_TOKEN"
unset GITHUB_TOKEN
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  2>/dev/null
echo ""
echo "---"
echo ""

# Test 2: Invalid GITHUB_TOKEN (should fail with 401)
echo "Test 2: Invalid GITHUB_TOKEN"
export GITHUB_TOKEN="invalid_token_12345"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  2>/dev/null
echo ""
echo "---"
echo ""

# Test 3: Valid token (if you have one, uncomment and set)
# echo "Test 3: Valid GITHUB_TOKEN"
# export GITHUB_TOKEN="ghp_your_real_token_here"
# curl -X POST "$API_URL" \
#   -H "Content-Type: application/json" \
#   -w "\nStatus: %{http_code}\n" \
#   2>/dev/null
# echo ""

echo "=== Tests Complete ==="
