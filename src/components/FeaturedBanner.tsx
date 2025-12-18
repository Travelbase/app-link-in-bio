import { ExternalLink } from "lucide-react";

interface FeaturedBannerProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  url: string;
}

export function FeaturedBanner({ title, subtitle, imageUrl, buttonText, url }: FeaturedBannerProps) {
  return (
    <div 
      className="w-full rounded-xl overflow-hidden shadow-card animate-fade-in-up"
      style={{ animationDelay: "0.2s" }}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="relative">
          {/* Background Image with Overlay */}
          <div className="relative h-24 overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/60 to-foreground/30" />
            
            {/* Content */}
            <div className="absolute inset-0 flex items-center px-4">
              <div className="flex-1">
                <h3 className="text-primary-foreground font-display font-semibold text-lg leading-tight">
                  {title}
                </h3>
                <p className="text-primary-foreground/80 text-sm mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>
          
          {/* Button */}
          <div className="bg-card py-3 px-4 flex items-center justify-center gap-2 group-hover:bg-primary transition-colors duration-300">
            <span className="text-card-foreground group-hover:text-primary-foreground font-medium text-sm transition-colors duration-300">
              {buttonText}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-card-foreground group-hover:text-primary-foreground opacity-0 group-hover:opacity-100 transition-all duration-300" />
          </div>
        </div>
      </a>
    </div>
  );
}
