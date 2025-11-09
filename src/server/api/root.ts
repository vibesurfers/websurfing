import { postRouter } from "@/server/api/routers/post";
import { cellRouter } from "@/server/api/routers/cell";
import { sheetRouter } from "@/server/api/routers/sheet";
import { adminRouter } from "@/server/api/routers/admin";
import { templateRouter } from "@/server/api/routers/template";
import { mastraTestRouter } from "@/server/api/routers/mastra-test";
import { spreadsheetAgentTestRouter } from "@/server/api/routers/spreadsheet-agent-test";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  cell: cellRouter,
  sheet: sheetRouter,
  admin: adminRouter,
  template: templateRouter,
  mastraTest: mastraTestRouter,
  spreadsheetAgentTest: spreadsheetAgentTestRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
