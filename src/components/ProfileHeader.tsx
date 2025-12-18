import { LinkBioProfile } from "@/data/linkData";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProfileHeaderProps {
  profile: LinkBioProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center animate-fade-in-up">
      <Avatar className="h-24 w-24 border-4 border-primary/30 shadow-card mb-4">
        <AvatarImage src={profile.avatarUrl} alt={profile.name} />
        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-display">
          {profile.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <h1 className="font-display text-xl font-semibold text-foreground mb-1">
        {profile.name}
      </h1>
      <p className="text-muted-foreground text-sm">
        {profile.tagline}
      </p>
    </div>
  );
}
