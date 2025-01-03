import OpenAI from "openai";
import { type Policy, type PolicyVersion } from "@db/schema";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const completion = await openai.chat.completions.create({
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
    const prompt = `Create a comprehensive policy draft for the following topic:

Topic: ${topic}
Context: ${context}

The policy should include:
1. Clear objective and scope
2. Detailed guidelines and procedures
3. Compliance requirements
4. Implementation guidance

Format the policy in a professional, clear structure.`;

    const completion = await openai.chat.completions.create({
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
      temperature: 0.7,
      max_tokens: 2000
    });

    return completion.choices[0].message.content || "Unable to generate policy draft.";
  }
};
