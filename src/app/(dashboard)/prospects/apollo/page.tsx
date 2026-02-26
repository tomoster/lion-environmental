"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  total_available: number;
  credits_used: number;
  searched?: number;
  people: ApolloPerson[];
}

interface ImportResult {
  imported: number;
  duplicates: number;
  total: number;
  error?: string;
}

const EMPLOYEE_COUNT_OPTIONS = [
  { value: "1,10", label: "1-10" },
  { value: "11,20", label: "11-20" },
  { value: "21,50", label: "21-50" },
  { value: "51,100", label: "51-100" },
  { value: "101,200", label: "101-200" },
  { value: "201,500", label: "201-500" },
  { value: "501,1000", label: "501-1,000" },
  { value: "1001,2000", label: "1,001-2,000" },
  { value: "2001,5000", label: "2,001-5,000" },
  { value: "5001,10000", label: "5,001-10,000" },
  { value: "10001,", label: "10,001+" },
];

const MONTHLY_CREDIT_LIMIT = 2535;

const LOCATION_PRESETS = [
  "Monsey, New York",
  "Spring Valley, New York",
  "New City, New York",
  "Suffern, New York",
  "Nanuet, New York",
  "Pearl River, New York",
  "Haverstraw, New York",
  "Nyack, New York",
  "Stony Point, New York",
  "Congers, New York",
  "Greater New York City Area",
];

const TITLE_PRESETS = [
  "Property Manager",
  "Building Manager",
  "Facilities Manager",
  "Operations Manager",
  "Asset Manager",
  "Director of Property Management",
  "Regional Property Manager",
];

export default function ApolloSearchPage() {
  const router = useRouter();

  // Filters
  const [selectedLocations, setSelectedLocations] = useState<string[]>([...LOCATION_PRESETS]);
  const [customLocation, setCustomLocation] = useState("");
  const [selectedTitles, setSelectedTitles] = useState<string[]>(["Property Manager"]);
  const [customTitle, setCustomTitle] = useState("");
  const [includeSimilarTitles, setIncludeSimilarTitles] = useState(true);
  const [employeeRanges, setEmployeeRanges] = useState<string[]>(["1,10", "11,20", "21,50", "51,100"]);
  const [emailStatus, setEmailStatus] = useState<string[]>(["verified"]);
  const [sessionCredits, setSessionCredits] = useState(0);
  const [maxResults, setMaxResults] = useState(100);
  const [enrichResults, setEnrichResults] = useState(false);

  // State
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  function toggleArrayValue(arr: string[], value: string): string[] {
    return arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
  }

  function addCustomLocation() {
    const loc = customLocation.trim();
    if (loc && !selectedLocations.includes(loc)) {
      setSelectedLocations([...selectedLocations, loc]);
      setCustomLocation("");
    }
  }

  function addCustomTitle() {
    const t = customTitle.trim();
    if (t && !selectedTitles.includes(t)) {
      setSelectedTitles([...selectedTitles, t]);
      setCustomTitle("");
    }
  }

  async function handleSearch() {
    if (selectedLocations.length === 0) {
      toast.error("Select at least one location");
      return;
    }

    setSearching(true);
    setResults(null);
    setImportResult(null);

    const titleList = selectedTitles;

    try {
      const res = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: selectedLocations,
          titles: titleList.length > 0 ? titleList : undefined,
          employeeRanges: employeeRanges.length > 0 ? employeeRanges : undefined,
          emailStatus: emailStatus.length > 0 ? emailStatus : undefined,
          includeSimilarTitles,
          maxResults,
          enrichResults,
        }),
      });

      const data = (await res.json()) as SearchResult & { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Search failed");
        return;
      }

      setResults(data);
      if (data.credits_used > 0) setSessionCredits((c) => c + data.credits_used);
      if (data.total === 0) {
        toast.info(
          `No results found. ${data.total_available} total in Apollo but none matched all filters.`
        );
      } else {
        toast.success(
          `Found ${data.total} contacts${data.credits_used > 0 ? ` (${data.credits_used} credits used)` : " (0 credits — preview only)"}`
        );
      }
    } catch {
      toast.error("Search request failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleEnrichAndImport() {
    if (!results || results.people.length === 0) return;

    // If results aren't enriched yet, re-search with enrichment
    if (results.credits_used === 0) {
      setSearching(true);
      setImportResult(null);

      const titleList = selectedTitles;

      try {
        const res = await fetch("/api/apollo/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locations: selectedLocations,
            titles: titleList.length > 0 ? titleList : undefined,
            employeeRanges: employeeRanges.length > 0 ? employeeRanges : undefined,
            emailStatus: emailStatus.length > 0 ? emailStatus : undefined,
            includeSimilarTitles,
            maxResults,
            enrichResults: true,
          }),
        });

        const data = (await res.json()) as SearchResult & { error?: string };
        if (!res.ok) {
          toast.error(data.error || "Enrichment failed");
          return;
        }

        setResults(data);
        if (data.credits_used > 0) setSessionCredits((c) => c + data.credits_used);
        toast.success(`Enriched ${data.total} contacts (${data.credits_used} credits used)`);

        // Now import
        await doImport(data.people);
      } catch {
        toast.error("Enrichment failed");
      } finally {
        setSearching(false);
      }
      return;
    }

    // Already enriched, just import
    await doImport(results.people);
  }

  async function doImport(people: ApolloPerson[]) {
    const withEmail = people.filter((p) => p.email);
    if (withEmail.length === 0) {
      toast.error("No contacts with emails to import");
      return;
    }

    setImporting(true);
    setImportResult(null);

    const leads = withEmail.map((p) => ({
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/prospects"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Prospects
        </Link>
        <h1 className="text-2xl font-semibold">Lead Finder</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search Apollo.io for property management leads. Preview is free, enrichment costs 1 credit per contact.
        </p>
      </div>

      {/* Credits Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Monthly Credits</span>
            <span className="text-muted-foreground">
              {sessionCredits > 0 && (
                <span className="text-primary font-medium mr-2">
                  {sessionCredits} used this session
                </span>
              )}
              {MONTHLY_CREDIT_LIMIT.toLocaleString()} / month (Basic plan)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min((sessionCredits / MONTHLY_CREDIT_LIMIT) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {MONTHLY_CREDIT_LIMIT - sessionCredits} credits remaining this session. Check Apollo dashboard for full monthly usage.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
          <CardDescription>
            Customize your search. Preview results for free, then enrich + import the ones you want.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Locations */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Locations</Label>
              <button
                onClick={() => {
                  const allSelected = LOCATION_PRESETS.every((p) =>
                    selectedLocations.includes(p)
                  );
                  if (allSelected) {
                    setSelectedLocations(
                      selectedLocations.filter((l) => !LOCATION_PRESETS.includes(l))
                    );
                  } else {
                    setSelectedLocations([
                      ...selectedLocations.filter((l) => !LOCATION_PRESETS.includes(l)),
                      ...LOCATION_PRESETS,
                    ]);
                  }
                }}
                className="text-xs text-primary hover:underline"
              >
                {LOCATION_PRESETS.every((p) => selectedLocations.includes(p))
                  ? "Clear all"
                  : "Select all"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {LOCATION_PRESETS.map((loc) => (
                <button
                  key={loc}
                  onClick={() =>
                    setSelectedLocations(toggleArrayValue(selectedLocations, loc))
                  }
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    selectedLocations.includes(loc)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add custom location (e.g. Westchester, New York)"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomLocation()}
                className="max-w-sm"
              />
              <Button variant="outline" size="sm" onClick={addCustomLocation}>
                Add
              </Button>
            </div>
            {selectedLocations.filter((l) => !LOCATION_PRESETS.includes(l)).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedLocations
                  .filter((l) => !LOCATION_PRESETS.includes(l))
                  .map((loc) => (
                    <Badge
                      key={loc}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedLocations(
                          selectedLocations.filter((l) => l !== loc)
                        )
                      }
                    >
                      {loc} x
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          {/* Job Titles */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Job Titles</Label>
            <div className="flex flex-wrap gap-2">
              {TITLE_PRESETS.map((title) => (
                <button
                  key={title}
                  onClick={() =>
                    setSelectedTitles(toggleArrayValue(selectedTitles, title))
                  }
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    selectedTitles.includes(title)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomTitle()}
                className="max-w-sm"
              />
              <Button variant="outline" size="sm" onClick={addCustomTitle}>
                Add
              </Button>
            </div>
            {selectedTitles.filter((t) => !TITLE_PRESETS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTitles
                  .filter((t) => !TITLE_PRESETS.includes(t))
                  .map((title) => (
                    <Badge
                      key={title}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedTitles(
                          selectedTitles.filter((t) => t !== title)
                        )
                      }
                    >
                      {title} x
                    </Badge>
                  ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="similarTitles"
                checked={includeSimilarTitles}
                onChange={(e) => setIncludeSimilarTitles(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="similarTitles" className="text-sm text-muted-foreground">
                Include similar titles (recommended)
              </label>
            </div>
          </div>

          {/* Employee Count */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Company Size (employees)</Label>
            <div className="flex flex-wrap gap-2">
              {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setEmployeeRanges(
                      toggleArrayValue(employeeRanges, opt.value)
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    employeeRanges.includes(opt.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email Status</Label>
            <div className="flex flex-wrap gap-2">
              {["verified", "likely to engage", "unverified"].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setEmailStatus(toggleArrayValue(emailStatus, status))
                  }
                  className={`rounded-full border px-3 py-1 text-sm capitalize transition-colors ${
                    emailStatus.includes(status)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Max Results + Search */}
          <div className="flex flex-wrap items-end gap-4 border-t pt-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Max Results</Label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="border-input bg-background flex h-9 rounded-md border px-3 py-1 text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enrichToggle"
                checked={enrichResults}
                onChange={(e) => setEnrichResults(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="enrichToggle" className="text-sm text-muted-foreground">
                Enrich immediately (costs credits)
              </label>
            </div>

            <Button onClick={handleSearch} disabled={searching} size="lg">
              {searching ? "Searching..." : "Search Apollo"}
            </Button>
          </div>

          {searching && (
            <p className="text-muted-foreground text-sm">
              Searching Apollo... {enrichResults ? "This includes enrichment and may take up to 60 seconds." : "Preview mode (free, no credits)."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>
              Results
              {results.credits_used === 0 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Preview — no emails yet
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {results.total} contacts returned.{" "}
              {results.total_available > 0 &&
                `${results.total_available.toLocaleString()} total matches in Apollo.`}
              {results.credits_used > 0 &&
                ` ${results.credits_used} credits used.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        {results.credits_used > 0 && (
                          <>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                          </>
                        )}
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
                          {results.credits_used > 0 && (
                            <>
                              <TableCell className="text-muted-foreground max-w-48 truncate text-sm">
                                {person.email ?? "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {person.phone ?? "—"}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-muted-foreground text-sm">
                            {person.location ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  {results.credits_used === 0 ? (
                    <Button
                      onClick={handleEnrichAndImport}
                      disabled={searching || importing}
                      size="lg"
                    >
                      {searching
                        ? "Enriching..."
                        : `Enrich & Import ${results.total} Leads (${results.total} credits)`}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEnrichAndImport}
                      disabled={importing || !!importResult}
                      size="lg"
                    >
                      {importing
                        ? "Importing..."
                        : `Import ${results.total} Leads`}
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Imported leads are auto-enrolled in cold email sequence
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
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
