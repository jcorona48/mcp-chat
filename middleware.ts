import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserId } from './actions/user';
 
// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {

  const userId = await getUserId();

  return NextResponse.next();
}