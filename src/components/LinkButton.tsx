import { ExternalLink } from "lucide-react";

interface LinkButtonProps {
  title: string;
  url: string;
  delay?: number;
}

export function LinkButton({ title, url, delay = 0 }: LinkButtonProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-full flex items-center justify-center gap-2 py-4 px-6 bg-card text-card-foreground rounded-lg shadow-soft hover:shadow-card hover:bg-primary hover:text-primary-foreground transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="font-medium">{title}</span>
      <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </a>
  );
}
