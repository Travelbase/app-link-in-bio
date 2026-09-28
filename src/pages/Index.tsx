import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPages } from "@/lib/linkinbio/api";
import { uiText } from "@/lib/uiText";

const Index = () => {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["pages"], queryFn: fetchPages });

  return (
    <div className="min-h-screen gradient-hero">
      <div className="max-w-[480px] mx-auto px-4 py-10 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{uiText.homeTitle}</h1>
          <p className="text-sm text-muted-foreground">{uiText.homeSubtitle}</p>
        </header>

        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label={uiText.loading} />}
        {isError && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{uiText.errorBody}</p>
            <Button size="sm" onClick={() => refetch()}>{uiText.retry}</Button>
          </div>
        )}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">{uiText.homeEmpty}</p>}

        <ul className="space-y-2">
          {data?.map((p) => (
            <li key={p.id}>
              <Link to={`/${p.address}`} className="flex items-center justify-between rounded-lg bg-card text-card-foreground p-4 shadow-soft hover:shadow-card transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.display_name}</p>
                  <p className="text-xs opacity-70 truncate">/{p.address} · @{p.instagram_handle}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Index;
