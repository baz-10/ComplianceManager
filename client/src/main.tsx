import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { setupCsrfProtection } from "./lib/csrf";
import App from './App';
import "./index.css";

setupCsrfProtection();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
        <Toaster />
      </Router>
    </QueryClientProvider>
  </StrictMode>,
);
