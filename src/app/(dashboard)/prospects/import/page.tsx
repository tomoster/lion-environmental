"use client";

import { useState, useCallback } from "react";
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

interface ParsedRow {
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  totalScore: number | null;
  placeId: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  duplicates: string[];
  error?: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    headerMap[h.trim().toLowerCase()] = i;
  });

  const findCol = (names: string[]): number => {
    for (const name of names) {
      if (headerMap[name] !== undefined) return headerMap[name];
    }
    return -1;
  };

  const titleCol = findCol(["title", "name", "company", "business name"]);
  const phoneCol = findCol(["phone", "telephone", "phonenumber"]);
  const emailCol = findCol(["email", "mail", "emailaddress"]);
  const addressCol = findCol([
    "address",
    "street",
    "location",
    "streetaddress",
  ]);
  const websiteCol = findCol(["website", "url", "web"]);
  const scoreCol = findCol([
    "totalscore",
    "rating",
    "stars",
    "score",
    "totalrating",
  ]);
  const placeIdCol = findCol(["placeid", "place_id", "googleplaceid"]);

  if (titleCol === -1) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    const title = cols[titleCol]?.trim();
    if (!title) continue;

    rows.push({
      title,
      phone: phoneCol >= 0 ? cols[phoneCol]?.trim() || "" : "",
      email: emailCol >= 0 ? cols[emailCol]?.trim() || "" : "",
      address: addressCol >= 0 ? cols[addressCol]?.trim() || "" : "",
      website: websiteCol >= 0 ? cols[websiteCol]?.trim() || "" : "",
      totalScore:
        scoreCol >= 0 && cols[scoreCol]
          ? parseFloat(cols[scoreCol]) || null
          : null,
      placeId: placeIdCol >= 0 ? cols[placeIdCol]?.trim() || "" : "",
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseJSON(text: string): ParsedRow[] {
  try {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : [];
    return items
      .filter((item: Record<string, unknown>) => item.title)
      .map((item: Record<string, unknown>) => {
        const emails = item.emails as string[] | undefined;
        return {
          title: String(item.title || ""),
          phone: String(item.phone || ""),
          email: emails?.[0] || String(item.email || ""),
          address: String(item.address || ""),
          website: String(item.website || ""),
          totalScore:
            item.totalScore != null ? Number(item.totalScore) || null : null,
          placeId: String(item.placeId || ""),
        };
      });
  } catch {
    return [];
  }
}

export default function ImportProspectsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [onlyWithEmail, setOnlyWithEmail] = useState(false);

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setResult(null);
    setOnlyWithEmail(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const isJSON = file.name.toLowerCase().endsWith(".json");
      const parsed = isJSON ? parseJSON(text) : parseCSV(text);
      if (parsed.length === 0) {
        toast.error(
          isJSON
            ? 'Could not parse JSON. Expected an array of objects with a "title" field.'
            : 'Could not parse CSV. Make sure it has a "title" column header.'
        );
        return;
      }
      setRows(parsed);
      toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
    };
    reader.readAsText(file);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  const filteredRows = onlyWithEmail ? rows.filter((r) => r.email) : rows;

  async function handleImport() {
    if (filteredRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/prospects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: filteredRows }),
      });
      const data = (await res.json()) as ImportResult;
      if (!res.ok) {
        toast.error(data.error || "Import failed");
      } else {
        toast.success(`Imported ${data.imported} prospects`);
      }
      setResult(data);
    } catch {
      toast.error("Import request failed");
    } finally {
      setImporting(false);
    }
  }

  const withEmail = rows.filter((r) => r.email).length;
  const withPhone = rows.filter((r) => r.phone).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Leads</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload a CSV or JSON file exported from Apify Google Maps Scraper to
          bulk-import prospects.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Drag and drop or click to select. Accepts CSV or JSON. Expected
            fields: title, phone, email, address, website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <UploadIcon className="text-muted-foreground mb-3 h-10 w-10" />
            <p className="text-sm font-medium">
              {fileName || "Drop file here or click to browse"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              CSV or JSON files
            </p>
            <input
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {rows.length} rows parsed from {fileName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-medium">{rows.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">With email: </span>
                    <span className="font-medium">
                      {withEmail} (
                      {Math.round((withEmail / rows.length) * 100)}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">With phone: </span>
                    <span className="font-medium">
                      {withPhone} (
                      {Math.round((withPhone / rows.length) * 100)}%)
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyWithEmail}
                    onChange={(e) => setOnlyWithEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Only with email
                </label>
              </div>

              <div className="max-h-96 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.slice(0, 100).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground text-xs">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-medium max-w-48 truncate">
                          {row.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.phone || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-40 truncate text-sm">
                          {row.email || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-52 truncate text-sm">
                          {row.address || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.totalScore ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredRows.length > 100 && (
                <p className="text-muted-foreground text-xs">
                  Showing first 100 of {filteredRows.length} rows.
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleImport}
                  disabled={importing || filteredRows.length === 0}
                >
                  {importing
                    ? "Importing..."
                    : `Import ${filteredRows.length} Leads`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRows([]);
                    setFileName("");
                    setResult(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && (
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
                    {result.imported} imported
                  </Badge>
                  {result.skipped > 0 && (
                    <Badge
                      className="bg-yellow-100 text-yellow-700 border-yellow-200"
                      variant="outline"
                    >
                      {result.skipped} duplicates skipped
                    </Badge>
                  )}
                  {result.error && (
                    <Badge
                      className="bg-red-100 text-red-700 border-red-200"
                      variant="outline"
                    >
                      Error
                    </Badge>
                  )}
                </div>
                {result.error && (
                  <p className="text-destructive text-sm">{result.error}</p>
                )}
                {result.duplicates.length > 0 && (
                  <details className="text-sm">
                    <summary className="text-muted-foreground cursor-pointer">
                      {result.duplicates.length} duplicates skipped (click to
                      see)
                    </summary>
                    <ul className="text-muted-foreground mt-2 max-h-48 list-inside list-disc overflow-auto text-xs">
                      {result.duplicates.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {result.imported > 0 && (
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
        </>
      )}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
