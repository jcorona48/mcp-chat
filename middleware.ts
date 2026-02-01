import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'

const USER_ID_KEY = 'ai-chat-user-id'

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Read existing cookie from the incoming request
  let userId = request.cookies.get(USER_ID_KEY)?.value || null

  // If no user id, generate one and set it on the response
  if (!userId) {
    userId = nanoid()
    const res = NextResponse.next()
    res.cookies.set(USER_ID_KEY, userId, { path: '/' })
    return res
  }

  return NextResponse.next()
}