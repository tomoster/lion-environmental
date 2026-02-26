const APOLLO_BASE_URL = "https://api.apollo.io";

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key) throw new Error("APOLLO_API_KEY is not set");
  return key;
}

export interface ApolloSearchParams {
  person_titles?: string[];
  organization_locations?: string[];
  person_seniorities?: string[];
  contact_email_status?: string[];
  per_page?: number;
  page?: number;
}

export interface ApolloPersonBasic {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  title: string | null;
  headline: string | null;
  linkedin_url: string | null;
  organization?: {
    name: string | null;
    website_url: string | null;
  };
  city: string | null;
  state: string | null;
}

export interface ApolloSearchResult {
  people: ApolloPersonBasic[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface ApolloEnrichedPerson {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  organization_name: string | null;
  phone_numbers?: Array<{ raw_number: string }>;
  city: string | null;
  state: string | null;
}

export async function searchPeople(
  params: ApolloSearchParams
): Promise<ApolloSearchResult> {
  const res = await fetch(`${APOLLO_BASE_URL}/api/v1/mixed_people/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: getApiKey(),
      person_titles: params.person_titles,
      organization_locations: params.organization_locations,
      person_seniorities: params.person_seniorities,
      contact_email_status: params.contact_email_status ?? ["verified"],
      per_page: params.per_page ?? 100,
      page: params.page ?? 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo search failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    people: data.people ?? [],
    pagination: data.pagination ?? {
      page: 1,
      per_page: 100,
      total_entries: 0,
      total_pages: 0,
    },
  };
}

export async function bulkEnrichPeople(
  ids: string[]
): Promise<ApolloEnrichedPerson[]> {
  if (ids.length === 0) return [];
  if (ids.length > 10) throw new Error("Max 10 IDs per bulk enrich call");

  const details = ids.map((id) => ({ id }));

  const res = await fetch(`${APOLLO_BASE_URL}/api/v1/people/bulk_match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: getApiKey(),
      details,
      reveal_personal_emails: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo bulk enrich failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data.matches ?? []).map((match: Record<string, unknown>) => ({
    id: match.id as string,
    first_name: match.first_name ?? null,
    last_name: match.last_name ?? null,
    name: match.name ?? null,
    title: match.title ?? null,
    email: match.email ?? null,
    linkedin_url: match.linkedin_url ?? null,
    organization_name: match.organization_name ?? null,
    phone_numbers: match.phone_numbers ?? [],
    city: match.city ?? null,
    state: match.state ?? null,
  }));
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
