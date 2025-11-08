import { EventProcessor } from "@/server/event-processor";
import { NextResponse } from "next/server";

export async function POST() {
  console.log('API: Processing events...');

  try {
    const processor = new EventProcessor();
    const result = await processor.processPendingEvents();

    console.log('API: Processing complete:', result);

    return NextResponse.json({
      success: true,
      processed: result.processed
    });
  } catch (error) {
    console.error('API: Error processing events:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}