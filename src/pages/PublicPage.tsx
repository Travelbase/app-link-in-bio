import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageRenderer } from "@/components/PageRenderer";
import { fetchPageByAddress } from "@/lib/linkinbio/api";
import { uiText } from "@/lib/uiText";

export default function PublicPage() {
  const { address = "" } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-page", address],
    queryFn: () => fetchPageByAddress(address),
  });

  useEffect(() => {
    if (data?.page) document.title = `${data.page.display_name} | Link in bio`;
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground" role="status">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <span className="sr-only">{uiText.loading}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Centered title={uiText.errorTitle} body={uiText.errorBody}>
        <Button onClick={() => refetch()}>{uiText.retry}</Button>
      </Centered>
    );
  }

  if (!data) {
    return (
      <Centered title={uiText.notFoundTitle} body={uiText.notFoundBody}>
        <Button asChild><a href="https://travelbase.eu">{uiText.notFoundCta}</a></Button>
      </Centered>
    );
  }

  return <PageRenderer page={data.page} blocks={data.blocks} />;
}

function Centered({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero px-6">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{body}</p>
        {children}
      </div>
    </div>
  );
}
