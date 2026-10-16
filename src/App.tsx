import { Toaster } from "@/components/ui/toaster";
import { APP_BASE, routerBasename } from "./lib/linkinbio/urls";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Editor from "./pages/Editor";
import NotFound from "./pages/NotFound";
import PublicPage from "./pages/PublicPage";
import DataDeletion from "./pages/DataDeletion";
import InstagramCallback from "./pages/InstagramCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={routerBasename(APP_BASE)}>
        <Routes>
          <Route path="/" element={<Editor />} />
          <Route path="/edit/:address" element={<Editor />} />
          <Route path="/data-deletion" element={<DataDeletion />} />
          <Route path="/public/data-deletion" element={<DataDeletion />} />
          <Route path="/instagram-callback" element={<InstagramCallback />} />
          <Route path="/public/:address" element={<PublicPage />} />
          <Route path="/:address" element={<PublicPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
