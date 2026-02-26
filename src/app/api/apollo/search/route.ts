import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  searchPeople,
  bulkEnrichPeople,
  delay,
  type ApolloEnrichedPerson,
} from "@/lib/apollo/client";

export const maxDuration = 60;

const DEFAULT_TITLES = [
  "Property Manager",
  "Regional Property Manager",
  "Director of Property Management",
  "Director of Operations",
  "Operations Manager",
  "Facilities Manager",
  "Building Manager",
  "Asset Manager",
  "Portfolio Manager",
  "VP of Property Management",
  "VP of Operations",
];

const ROCKLAND_LOCATIONS = [
  "New City, New York",
  "Suffern, New York",
  "Nanuet, New York",
  "Pearl River, New York",
  "Spring Valley, New York",
  "Nyack, New York",
  "Haverstraw, New York",
  "Stony Point, New York",
  "Monsey, New York",
  "Orangeburg, New York",
  "Congers, New York",
  "West Nyack, New York",
  "Pomona, New York",
  "Tappan, New York",
  "Blauvelt, New York",
  "Chestnut Ridge, New York",
  "Airmont, New York",
];

const PRESETS: Record<string, string[]> = {
  rockland: ROCKLAND_LOCATIONS,
  brooklyn: ["Brooklyn, New York"],
};

interface SearchRequest {
  locations: string[];
  titles?: string[];
  maxResults?: number;
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as SearchRequest;
  const locations = body.locations;
  const titles = body.titles ?? DEFAULT_TITLES;
  const maxResults = Math.min(body.maxResults ?? 200, 500);

  if (!locations || locations.length === 0) {
    return NextResponse.json(
      { error: "locations is required" },
      { status: 400 }
    );
  }

  // Resolve preset names
  const resolvedLocations = locations.flatMap(
    (loc) => PRESETS[loc.toLowerCase()] ?? [loc]
  );

  // Search (FREE — no credits)
  const allPeople: Array<{ id: string; name: string; title: string | null; company: string | null }> = [];
  let page = 1;

  while (allPeople.length < maxResults) {
    const result = await searchPeople({
      person_titles: titles,
      organization_locations: resolvedLocations,
      contact_email_status: ["verified"],
      per_page: 100,
      page,
    });

    for (const person of result.people) {
      if (allPeople.length >= maxResults) break;
      allPeople.push({
        id: person.id,
        name: person.name ?? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim(),
        title: person.title,
        company: person.organization?.name ?? null,
      });
    }

    if (page >= result.pagination.total_pages) break;
    page++;
    await delay(200);
  }

  if (allPeople.length === 0) {
    return NextResponse.json({
      total: 0,
      credits_used: 0,
      people: [],
    });
  }

  // Enrich in batches of 10 (1 credit per person)
  const enriched: ApolloEnrichedPerson[] = [];
  const ids = allPeople.map((p) => p.id);

  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    try {
      const results = await bulkEnrichPeople(batch);
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
    credits_used: ids.length,
    searched: allPeople.length,
    people,
  });
}
