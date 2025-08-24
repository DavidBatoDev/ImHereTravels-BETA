import { NextRequest, NextResponse } from "next/server";
import {
  runMigration as runMigration001,
  rollbackMigration as rollbackMigration001,
} from "../../../../migrations/001-initial-tour-packages";
import {
  runMigration as runMigration002,
  rollbackMigration as rollbackMigration002,
} from "../../../../migrations/002-additional-tour-packages";
import {
  runMigration as runMigration003,
  rollbackMigration as rollbackMigration003,
} from "../../../../migrations/003-final-tour-packages";

export async function POST(request: NextRequest) {
  try {
    const { action, dryRun } = await request.json();

    switch (action) {
      case "run":
      case "001":
        const result = await runMigration001(dryRun);
        return NextResponse.json(result);

      case "002":
        const result002 = await runMigration002(dryRun);
        return NextResponse.json(result002);

      case "003":
        const result003 = await runMigration003(dryRun);
        return NextResponse.json(result003);

      case "rollback":
      case "rollback001":
        const rollbackResult = await rollbackMigration001();
        return NextResponse.json(rollbackResult);

      case "rollback002":
        const rollbackResult002 = await rollbackMigration002();
        return NextResponse.json(rollbackResult002);

      case "rollback003":
        const rollbackResult003 = await rollbackMigration003();
        return NextResponse.json(rollbackResult003);

      default:
        return NextResponse.json(
          { success: false, message: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Migration API error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
