"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ApolloPerson {
  apollo_id: string;
  name: string;
  email: string | null;
  title: string | null;
  company: string | null;
  linkedin: string | null;
  phone: string | null;
  location: string | null;
}

interface SearchResult {
  total: number;
  credits_used: number;
  searched: number;
  people: ApolloPerson[];
}

interface ImportResult {
  imported: number;
  duplicates: number;
  total: number;
  error?: string;
}

const LOCATION_PRESETS = [
  { value: "rockland", label: "Rockland County, NY" },
  { value: "brooklyn", label: "Brooklyn, NY" },
];

export default function ApolloSearchPage() {
  const router = useRouter();
  const [location, setLocation] = useState("rockland");
  const [maxResults, setMaxResults] = useState(200);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  async function handleSearch() {
    setSearching(true);
    setResults(null);
    setImportResult(null);

    try {
      const res = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: [location],
          maxResults,
        }),
      });

      const data = (await res.json()) as SearchResult & { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Search failed");
        return;
      }

      setResults(data);
      if (data.total === 0) {
        toast.info("No results found with verified emails");
      } else {
        toast.success(
          `Found ${data.total} contacts (${data.credits_used} credits used)`
        );
      }
    } catch {
      toast.error("Search request failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleImport() {
    if (!results || results.people.length === 0) return;
    setImporting(true);
    setImportResult(null);

    const leads = results.people.map((p) => ({
      name: p.name,
      email: p.email,
      phone: p.phone,
      company: p.company ?? "Unknown",
      job_title: p.title,
      linkedin: p.linkedin,
      apollo_id: p.apollo_id,
      source: "apollo",
      lead_type: "manager",
      location: p.location,
    }));

    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });

      const data = (await res.json()) as ImportResult;
      if (!res.ok) {
        toast.error(data.error || "Import failed");
      } else {
        toast.success(
          `Imported ${data.imported} prospects (${data.duplicates} duplicates skipped)`
        );
      }
      setImportResult(data);
    } catch {
      toast.error("Import request failed");
    } finally {
      setImporting(false);
    }
  }

  const preset = LOCATION_PRESETS.find((p) => p.value === location);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Apollo Search</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Find property management contacts via Apollo.io and import them as
          prospects.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
          <CardDescription>
            Search costs 0 credits. Enrichment costs 1 credit per contact to get
            emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border-input bg-background flex h-9 rounded-md border px-3 py-1 text-sm"
              >
                {LOCATION_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Max Results</label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="border-input bg-background flex h-9 rounded-md border px-3 py-1 text-sm"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={300}>300</option>
                <option value={500}>500</option>
              </select>
            </div>

            <Button onClick={handleSearch} disabled={searching}>
              {searching ? "Searching..." : "Search Apollo"}
            </Button>
          </div>

          {searching && (
            <p className="text-muted-foreground text-sm">
              Searching {preset?.label ?? location} for property managers and
              enriching contacts... This can take up to 60 seconds.
            </p>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {results.total} contacts with verified emails out of{" "}
              {results.searched} searched
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Contacts: </span>
                <span className="font-medium">{results.total}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Credits used: </span>
                <span className="font-medium">{results.credits_used}</span>
              </div>
            </div>

            {results.people.length > 0 && (
              <>
                <div className="max-h-[500px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.people.map((person, i) => (
                        <TableRow key={person.apollo_id}>
                          <TableCell className="text-muted-foreground text-xs">
                            {i + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {person.linkedin ? (
                              <a
                                href={person.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {person.name}
                              </a>
                            ) : (
                              person.name
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-40 truncate text-sm">
                            {person.title ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-40 truncate text-sm">
                            {person.company ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-48 truncate text-sm">
                            {person.email ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {person.location ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleImport}
                    disabled={importing || !!importResult}
                  >
                    {importing
                      ? "Importing..."
                      : `Import ${results.total} Leads`}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4">
              <Badge
                className="bg-green-100 text-green-700 border-green-200"
                variant="outline"
              >
                {importResult.imported} imported
              </Badge>
              {importResult.duplicates > 0 && (
                <Badge
                  className="bg-yellow-100 text-yellow-700 border-yellow-200"
                  variant="outline"
                >
                  {importResult.duplicates} duplicates skipped
                </Badge>
              )}
              {importResult.error && (
                <Badge
                  className="bg-red-100 text-red-700 border-red-200"
                  variant="outline"
                >
                  Error
                </Badge>
              )}
            </div>
            {importResult.error && (
              <p className="text-destructive text-sm">{importResult.error}</p>
            )}
            {importResult.imported > 0 && (
              <Button
                variant="outline"
                onClick={() => router.push("/prospects")}
              >
                View Prospects
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
