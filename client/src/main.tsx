import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter"; // Added missing import
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from './App';
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router> {/* Restored Router */}
        <App />
      </Router>
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);