- when writing tests use load env from file

# Authentication Bypass for Testing

This codebase has a well-documented authentication bypass system for Playwright tests:

## How to Use Auth Bypass in Tests

1. **Set HTTP Header**: Add `x-bypass-user-id` header with a test user ID
2. **Use Development Mode**: Only works when `NODE_ENV === 'development'`
3. **Test User ID**: Use `'e1879083-6ac1-4c73-970d-0a01a11f5a3f'` (from working tests)

## Example Implementation

```typescript
test.beforeEach(async ({ page }) => {
  // Set up authentication bypass headers for tRPC calls
  await page.setExtraHTTPHeaders({
    'x-bypass-user-id': 'e1879083-6ac1-4c73-970d-0a01a11f5a3f'
  });

  await page.goto('http://localhost:3000');
});
```

## Where It Works

- **tRPC calls**: Header `x-bypass-user-id` bypasses auth in `src/server/api/trpc.ts:25-35`
- **API routes**: Query param `?userId=` bypasses auth in `/api/update-sheet/route.ts:11-20`

## Reference Files

- `/tests/complete-flow.spec.ts` - Working example with full auth bypass
- `/src/server/api/trpc.ts` - tRPC bypass implementation
- `/src/app/api/update-sheet/route.ts` - API route bypass implementation

# Codebase Documentation
For comprehensive understanding of the application architecture, refer to:
- `.tribe/current-docs-11-08-1919PM/CODEBASE_SUMMARY.MD` - Complete event flow documentation with verified line references ✅
- `.tribe/current-docs-11-08-1919PM/ARCHITECTURE_EVOLUTION_PLAN.md` - Detailed plan for evolving to intelligent research engine ✅
- All 12 sections have been verified for accuracy and contain precise file paths and line numbers
- Covers the complete user input → AI processing → result display pipeline
- Evolution plan identifies 5 CRITICAL sections requiring major overhaul for template-driven, quality-focused research