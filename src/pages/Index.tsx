import { ProfileHeader } from "@/components/ProfileHeader";
import { SocialIcons } from "@/components/SocialIcons";
import { CategoryDropdown } from "@/components/CategoryDropdown";
import { LinkButton } from "@/components/LinkButton";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { FeaturedBanner } from "@/components/FeaturedBanner";
import { InstagramGrid } from "@/components/InstagramGrid";
import {
  mainProfile,
  socialLinks,
  categoryLinks,
  featuredCards,
  gridPosts,
} from "@/data/linkData";

const Index = () => {
  return (
    <div className="min-h-screen gradient-hero">
      <div className="container max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Profile Header */}
        <ProfileHeader profile={mainProfile} />

        {/* Social Icons */}
        <SocialIcons links={socialLinks} />

        {/* Featured Banner */}
        <FeaturedBanner
          title="Ontdek alle bestemmingen 🚗"
          subtitle="Unieke roadtrips langs de mooiste routes ter wereld"
          imageUrl="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=300&fit=crop"
          buttonText="Naar de website"
          url="https://travelbase.eu/reisthema/roadtrips/"
        />

        {/* Featured Cards Carousel */}
        <FeaturedCarousel cards={featuredCards} />

        {/* Category Dropdown */}
        <CategoryDropdown title="Ontdek het aanbod" links={categoryLinks} />

        {/* Quick Link */}
        <LinkButton
          title="Nieuwste reizen"
          url="https://travelbase.eu/reisthema/nieuwe-reizen-travelbase/"
          delay={0.3}
        />

        {/* Instagram Grid */}
        <InstagramGrid posts={gridPosts} />

        {/* Footer */}
        <footer className="text-center pt-6 pb-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Travelbase
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
