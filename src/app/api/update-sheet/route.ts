import { SheetUpdater } from "@/server/sheet-updater";
import { auth } from "@/server/auth";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  console.log('API: Update sheet request');

  try {
    // Check for bypass userId in query params (for testing)
    const { searchParams } = new URL(request.url);
    const bypassUserId = searchParams.get('userId');

    let userId: string;

    if (bypassUserId && process.env.NODE_ENV === 'development') {
      // Use bypass userId in development mode
      userId = bypassUserId;
      console.log('API: Using bypass userId for testing:', userId);
    } else {
      // Regular auth flow
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized'
        }, { status: 401 });
      }

      userId = session.user.id;
    }

    const updater = new SheetUpdater();
    const result = await updater.updateSheet(userId);

    console.log('API: Sheet update result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API: Error updating sheet:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      appliedUpdates: [],
      totalApplied: 0,
    }, { status: 500 });
  }
}