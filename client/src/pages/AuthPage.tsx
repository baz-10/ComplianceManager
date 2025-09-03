import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { FileText, CheckCircle, Lock, Mail } from "lucide-react";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { showErrorToast } from "@/utils/errorHandler";

const authSchema = z.object({
  username: z.string().email("Username must be a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthForm = z.infer<typeof authSchema>;

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<any>(null);
  const { login, register } = useUser();
  const [_, navigate] = useLocation();

  const form = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: AuthForm) => {
    setError(null);
    try {
      if (isLogin) {
        await login(data);
        navigate("/"); // Redirect to dashboard after successful login
      } else {
        await register({
          ...data,
          role: "READER" // Explicitly set role for new registrations
        });
        navigate("/"); // Redirect to dashboard after successful registration
      }
    } catch (error: any) {
      setError(error);
      showErrorToast(error, isLogin ? "Login Failed" : "Registration Failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col md:flex-row items-stretch">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-primary/20 shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {isLogin ? "Welcome Back" : "Get Started"}
              </CardTitle>
            </div>
            <CardDescription>
              {isLogin
                ? "Sign in to your account to access the document management system."
                : "Create a new account to start managing your organization's documentation."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <ErrorDisplay 
                error={error} 
                className="mb-4"
                onRetry={() => form.handleSubmit(onSubmit)()}
              />
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Enter your email" 
                            type="email" 
                            className="pl-10" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <>{isLogin ? "Sign In" : "Create Account"}</>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <div className="relative my-4 w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin
                ? "Don't have an account? Register"
                : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Right side - Hero */}
      <div className="hidden md:flex flex-1 bg-primary/10 items-center justify-center p-8 relative overflow-hidden">
        <div className="max-w-lg relative z-10 text-center">
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Document Management System
          </h1>
          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-primary">Streamline Your Documentation</h2>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-left text-muted-foreground">Centralize policy and procedure documents</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-left text-muted-foreground">Track user acknowledgments and compliance</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-left text-muted-foreground">Maintain document version history</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-left text-muted-foreground">Role-based access control</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 opacity-5">
          <FileText className="h-64 w-64 text-primary" />
        </div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 opacity-5">
          <CheckCircle className="h-48 w-48 text-primary" />
        </div>
      </div>
    </div>
  );
}