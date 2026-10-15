import { uiText } from "@/lib/uiText";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-muted px-6">
    <div className="text-center">
      <h1 className="mb-2 text-2xl font-bold">{uiText.notFoundTitle}</h1>
      <p className="mb-4 text-muted-foreground">{uiText.notFoundBody}</p>
      <a href="https://travelbase.eu" className="text-primary underline hover:text-primary/90">{uiText.notFoundCta}</a>
    </div>
  </div>
);

export default NotFound;
