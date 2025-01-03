import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PolicyAIToolsProps {
  policyId?: number;
  policyTitle?: string;
}

export function PolicyAITools({ policyId, policyTitle }: PolicyAIToolsProps) {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [suggestions, setSuggestions] = useState<string | null>(null);

  const getSuggestions = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/policies/${policyId}/suggest`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions);
      toast({
        title: "Success",
        description: "Got AI suggestions for the policy",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateDraft = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/policies/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, context }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSuggestions(data.draft);
      toast({
        title: "Success",
        description: "Generated new policy draft",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {policyId ? (
        // Policy Improvement Suggestions
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Policy Suggestions
            </CardTitle>
            <CardDescription>
              Get AI-powered suggestions to improve "{policyTitle}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => getSuggestions.mutate()}
              disabled={getSuggestions.isPending}
            >
              {getSuggestions.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Suggestions
                </>
              )}
            </Button>

            {suggestions && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium">Suggestions:</h4>
                <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                  {suggestions}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // New Policy Draft Generation
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Policy Draft
            </CardTitle>
            <CardDescription>
              Generate a new policy draft using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Enter policy topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  placeholder="Provide context and requirements for the policy"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                onClick={() => generateDraft.mutate()}
                disabled={generateDraft.isPending || !topic || !context}
              >
                {generateDraft.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Draft
                  </>
                )}
              </Button>

              {suggestions && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">Generated Draft:</h4>
                  <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
                    {suggestions}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
