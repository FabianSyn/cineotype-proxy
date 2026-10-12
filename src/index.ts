import type { ExportedHandler } from "@cloudflare/workers-types"

export interface Env {
  TMDB_API_KEY: string
}

const TMDB = "https://api.themoviedb.org/3"

const ALLOWED = [
  "http://localhost:5173",
  "https://cineotype-fabianroehrl.fabian-roehrl.workers.dev",
]

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get("Origin") ?? ""

    if (!ALLOWED.includes(origin)) {
      return new Response("Forbidden", {
        status: 403,
      })
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      })
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      })
    }

    if (!env.TMDB_API_KEY) {
      return new Response("API-Key fehlt", {
        status: 500,
        headers: corsHeaders,
      })
    }

    let upstream: URL

    if (url.pathname === "/search") {
      const query = url.searchParams.get("query") ?? ""

      if (!query.trim()) {
        return new Response("Suchbegriff fehlt", {
          status: 400,
          headers: corsHeaders,
        })
      }

      upstream = new URL(`${TMDB}/search/movie`)
      upstream.searchParams.set("query", query)
    } else {
      const match = url.pathname.match(/^\/movie\/([0-9]+)$/)

      if (!match) {
        return new Response("Not found", {
          status: 404,
          headers: corsHeaders,
        })
      }

      upstream = new URL(`${TMDB}/movie/${match[1]}`)
    }

    upstream.searchParams.set(
      "api_key",
      env.TMDB_API_KEY
    )

    try {
      const apiRes = await fetch(upstream.toString())
      const data: unknown = await apiRes.json()

      return new Response(JSON.stringify(data), {
        status: apiRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      })
    } catch {
      return new Response(
        JSON.stringify({
          error: "TMDB konnte nicht erreicht werden",
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }
  },
} satisfies ExportedHandler<Env>
