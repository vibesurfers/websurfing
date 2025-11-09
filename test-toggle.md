# Testing the Robot/Human Toggle

## How to Test

1. **Open the app**: http://localhost:3002
2. **Sign in** if required

## Test Scenario 1: Robots ON (Default - Cascading Enabled)
1. Look for the **"Robots: ON"** button (orange) in the top-right
2. Edit cell A1 (row 0, col 0) - type "test"
3. Wait for the automatic update (5 seconds) or click "Process Events"
4. **Expected**: Cell B1 gets "test", creating a new event
5. Wait/process again
6. **Expected**: Cell C1 gets "test", creating another event (cascading continues)

## Test Scenario 2: Robots OFF (No Cascading)
1. Click the toggle to switch to **"Robots: OFF"** (purple)
2. Clear the cells or use a new row
3. Edit cell A2 - type "no cascade"
4. Wait for update or click "Process Events"
5. **Expected**: Cell B2 gets "no cascade" BUT no new event is created
6. Process again
7. **Expected**: Nothing happens - C2 stays empty (cascade stopped)

## What to Look For
- Console logs will show:
  - When toggle OFF: "Skipping robot update event for (x, y) - treatRobotsAsHumans is false"
  - When toggle ON: Normal "Creating debounced cell update" messages
- Events list at bottom shows pending/completed events
- Toggle state persists while using Play/Pause

## Current Status
✅ Toggle UI implemented
✅ Robot update detection via ref
✅ Conditional event creation based on toggle
✅ Server is running on port 3002