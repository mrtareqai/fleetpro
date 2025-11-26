import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rate limiting is handled in individual API routes instead

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.includes(".")) {
    return NextResponse.next()
  }

  // Format: /[company_code]/... or just /[company_code]
  const pathParts = pathname.split("/").filter(Boolean)

  // Check if first part could be a company code
  let response: NextResponse

  if (pathParts.length > 0 && !["login", "master-admin"].includes(pathParts[0])) {
    const companyCode = pathParts[0]

    // Store company code in header for use in components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-company-code", companyCode)

    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } else {
    response = NextResponse.next()
  }

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  if (pathname.startsWith("/api")) {
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set("Access-Control-Allow-Origin", request.headers.get("origin") || "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
    response.headers.set("Access-Control-Max-Age", "86400")
  }

  return response
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/company/:path*",
    "/api/:path*",
  ],
}
