import assert from "node:assert/strict";

// Test 1: Verify ViewMode types and meetingSlice reducers
async function runTests() {
  console.log("=== Testing ViewMode & State Management ===");

  // Dynamically import meetingSlice
  const { default: reducer, setViewMode, resetMeeting } = await import("../store/meetingSlice.ts");

  // Initial state test
  const initialState = reducer(undefined, { type: "@@INIT" });
  console.log("1. Initial viewMode:", initialState.viewMode);
  assert.equal(initialState.viewMode, "both", "Initial viewMode must be 'both'");

  // Test switching to 'left'
  const stateLeft = reducer(initialState, setViewMode("left"));
  console.log("2. After setViewMode('left'):", stateLeft.viewMode);
  assert.equal(stateLeft.viewMode, "left", "viewMode must be 'left'");

  // Test switching to 'right'
  const stateRight = reducer(stateLeft, setViewMode("right"));
  console.log("3. After setViewMode('right'):", stateRight.viewMode);
  assert.equal(stateRight.viewMode, "right", "viewMode must be 'right'");

  // Test switching back to 'both'
  const stateBoth = reducer(stateRight, setViewMode("both"));
  console.log("4. After setViewMode('both'):", stateBoth.viewMode);
  assert.equal(stateBoth.viewMode, "both", "viewMode must be 'both'");

  // Test resetMeeting preserves or resets viewMode to 'both'
  const stateReset = reducer(stateRight, resetMeeting());
  console.log("5. After resetMeeting():", stateReset.viewMode);
  assert.equal(stateReset.viewMode, "both", "viewMode must reset to 'both'");

  console.log("\n✅ All ViewMode tests passed successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
