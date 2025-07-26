import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Navigation } from "./components/Navigation";
import { Home } from "./pages/Home";
import { ManualList } from "./pages/ManualList";
import { ManualDetail } from "./pages/ManualDetail";
import { AdminDashboard } from "./pages/AdminDashboard";
import { UserManagement } from "./pages/UserManagement";
import { ComplianceDashboard } from "./pages/ComplianceDashboard";
import { ArchivedManuals } from "./pages/ArchivedManuals";
import { AuthPage } from "./pages/AuthPage";
import { useUser } from "./hooks/use-user";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/manuals" component={ManualList} />
            <Route path="/manuals/:id" component={ManualDetail} />
            {user?.role === 'ADMIN' && (
              <>
                <Route path="/admin/dashboard" component={AdminDashboard} />
                <Route path="/admin/users" component={UserManagement} />
                <Route path="/admin/compliance" component={ComplianceDashboard} />
                <Route path="/admin/archived-manuals" component={ArchivedManuals} />
              </>
            )}
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </ErrorBoundary>
  );
}

function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;