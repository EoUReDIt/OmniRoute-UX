import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { getSettings } from "@/lib/db/settings";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  // Auth verified - return feature flags settings
  const settings = await getSettings();
  
  return NextResponse.json({
    localGuideEnabled: Boolean(settings.localGuideEnabled),
    localGuideModel: settings.localGuideModel || null,
  });
}