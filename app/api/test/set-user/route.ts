import { NextRequest, NextResponse } from "next/server";

/**
 * Test endpoint to set current user ID
 * Only available in test mode
 */
export async function POST(request: NextRequest) {
  // Only allow in test mode
  if (process.env.PLAYWRIGHT !== '1' && process.env.NODE_ENV !== 'test') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  // Set user ID in cookie for subsequent requests
  const response = NextResponse.json({ success: true, userId });
  response.cookies.set('test-user-id', userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
