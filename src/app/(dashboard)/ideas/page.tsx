import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { IdeaForm } from "./idea-form";
import { IdeasList } from "./ideas-list";

export default async function IdeasPage() {
  const supabase = await createClient();

  const { data: ideas } = await supabase
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ideas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture ideas for CRM improvements and business
          </p>
        </div>
        <IdeaForm trigger={<Button>Add Idea</Button>} />
      </div>

      <IdeasList ideas={ideas ?? []} />
    </div>
  );
}
