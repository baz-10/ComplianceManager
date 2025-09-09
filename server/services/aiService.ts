import OpenAI from "openai";
import { type Policy, type PolicyVersion } from "@db/schema";
import { ApiError } from "../utils/errorHandler";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // Signal to callers that AI is disabled without crashing server startup
    throw new ApiError("AI features are disabled (missing OPENAI_API_KEY)", 501, "NOT_IMPLEMENTED");
  }
  return new OpenAI({ apiKey: key });
}

export const AIService = {
  async suggestPolicyImprovements(policy: Policy, version: PolicyVersion): Promise<string> {
    const prompt = `As a policy document expert, analyze and suggest improvements for the following policy:

Title: ${policy.title}
Content: ${version.bodyContent}

Please provide specific suggestions to:
1. Improve clarity and readability
2. Ensure compliance with best practices
3. Identify potential gaps or ambiguities
4. Enhance policy effectiveness

Format your response as a detailed analysis with specific recommendations.`;

    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert policy analyst specializing in organizational documentation and compliance. Provide clear, actionable suggestions for policy improvements."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return completion.choices[0].message.content || "No suggestions available.";
  },

  async generatePolicyDraft(topic: string, context: string): Promise<string> {
    const prompt = `Create a comprehensive policy draft for the following topic.

Topic: ${topic}
Context: ${context}

The policy should include:
1) Clear objective and scope
2) Detailed guidelines and procedures
3) Compliance requirements
4) Implementation guidance

Return the draft as clean HTML (no <html> or <body> tags), using only these tags: h2, h3, p, ul, ol, li, strong, em, a. Use semantic headings, bullet lists where appropriate, and short paragraphs for readability.`;

    const client = getOpenAI();
    const completion = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert policy writer with deep knowledge of organizational documentation and compliance requirements. Create clear, comprehensive policy documents."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    return completion.choices[0].message.content || "Unable to generate policy draft.";
  }
};
