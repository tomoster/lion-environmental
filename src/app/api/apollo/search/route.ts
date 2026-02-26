import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  searchPeople,
  bulkEnrichPeople,
  delay,
  type ApolloEnrichedPerson,
  type ApolloSearchParams,
} from "@/lib/apollo/client";

export const maxDuration = 60;

interface SearchRequest {
  locations: string[];
  titles?: string[];
  employeeRanges?: string[];
  emailStatus?: string[];
  includeSimilarTitles?: boolean;
  maxResults?: number;
  enrichResults?: boolean;
  revealPhones?: boolean;
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as SearchRequest;
  const maxResults = Math.min(body.maxResults ?? 200, 500);
  const shouldEnrich = body.enrichResults !== false;

  if (!body.locations || body.locations.length === 0) {
    return NextResponse.json(
      { error: "At least one location is required" },
      { status: 400 }
    );
  }

  const searchParams: ApolloSearchParams = {
    person_locations: body.locations,
    per_page: 100,
    page: 1,
  };

  if (body.titles?.length) searchParams.person_titles = body.titles;
  if (body.employeeRanges?.length) searchParams.organization_num_employees_ranges = body.employeeRanges;
  if (body.emailStatus?.length) searchParams.contact_email_status = body.emailStatus;
  if (body.includeSimilarTitles !== undefined) searchParams.include_similar_titles = body.includeSimilarTitles;

  // Search (FREE — no credits)
  const allPeople: Array<{
    id: string;
    name: string;
    title: string | null;
    company: string | null;
    city: string | null;
    state: string | null;
  }> = [];
  let page = 1;
  let totalAvailable = 0;

  while (allPeople.length < maxResults) {
    searchParams.page = page;
    const result = await searchPeople(searchParams);
    totalAvailable = result.pagination.total_entries;

    for (const person of result.people) {
      if (allPeople.length >= maxResults) break;
      allPeople.push({
        id: person.id,
        name:
          person.name ??
          `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
        title: person.title,
        company: person.organization?.name ?? null,
        city: person.city,
        state: person.state,
      });
    }

    if (page >= result.pagination.total_pages) break;
    page++;
    await delay(200);
  }

  if (allPeople.length === 0) {
    return NextResponse.json({
      total: 0,
      total_available: totalAvailable,
      credits_used: 0,
      people: [],
    });
  }

  // If not enriching, return search-only results (0 credits)
  if (!shouldEnrich) {
    return NextResponse.json({
      total: allPeople.length,
      total_available: totalAvailable,
      credits_used: 0,
      people: allPeople.map((p) => ({
        apollo_id: p.id,
        name: p.name,
        email: null,
        title: p.title,
        company: p.company,
        linkedin: null,
        phone: null,
        location: [p.city, p.state].filter(Boolean).join(", "),
      })),
    });
  }

  // Enrich in batches of 10 (1 credit per person)
  const enriched: ApolloEnrichedPerson[] = [];
  const ids = allPeople.map((p) => p.id);

  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    try {
      const results = await bulkEnrichPeople(batch, { revealPhones: body.revealPhones });
      enriched.push(...results);
    } catch (err) {
      console.error(`Enrich batch ${i / 10 + 1} failed:`, err);
    }
    if (i + 10 < ids.length) await delay(300);
  }

  const people = enriched
    .filter((p) => p.email)
    .map((p) => ({
      apollo_id: p.id,
      name: p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      email: p.email,
      title: p.title,
      company: p.organization_name,
      linkedin: p.linkedin_url,
      phone: p.phone_numbers?.[0]?.raw_number ?? null,
      location: [p.city, p.state].filter(Boolean).join(", "),
    }));

  return NextResponse.json({
    total: people.length,
    total_available: totalAvailable,
    credits_used: ids.length,
    searched: allPeople.length,
    people,
  });
}
