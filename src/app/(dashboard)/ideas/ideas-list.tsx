"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteIdea } from "./actions";

type Idea = {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string | null;
  priority: number;
};

const PRIORITY_DISPLAY: Record<number, string> = {
  1: "!",
  2: "!!",
  3: "!!!",
};

const PRIORITY_COLOR: Record<number, string> = {
  1: "text-muted-foreground",
  2: "text-yellow-600",
  3: "text-red-600",
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function IdeasList({ ideas }: { ideas: Idea[] }) {
  if (ideas.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No ideas yet. Add one to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteIdea(idea.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Idea deleted");
      }
    });
  }

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${
        isPending ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{idea.title}</h3>
          <span className={`text-sm font-bold ${PRIORITY_COLOR[idea.priority] ?? "text-muted-foreground"}`}>
            {PRIORITY_DISPLAY[idea.priority] ?? "!"}
          </span>
        </div>
        {idea.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {idea.description}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {idea.created_by} &middot; {relativeTime(idea.created_at)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        <XIcon className="h-4 w-4" />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}
