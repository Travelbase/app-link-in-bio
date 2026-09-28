import { useSearchParams } from "react-router-dom";
import { uiText } from "@/lib/uiText";

const DataDeletion = () => {
  const [params] = useSearchParams();
  const code = params.get("code");
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-2xl font-bold text-foreground">{uiText.dataDeletionTitle}</h1>
        <p className="text-muted-foreground">{uiText.dataDeletionBody}</p>
        {code && <p className="text-sm text-muted-foreground">{uiText.dataDeletionCode} <code className="font-mono text-foreground">{code}</code></p>}
      </div>
    </main>
  );
};

export default DataDeletion;
