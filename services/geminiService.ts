import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, AuditResult } from "../types";

// Check if API key is available in environment
const HAS_API_KEY = !!process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (HAS_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateExecutiveSummary = async (tickets: Ticket[]): Promise<string> => {
  if (!ai) {
    return "Gemini API Key not found. Please configure the environment to generate AI summaries.";
  }

  try {
    const ticketSummary = tickets.map(t => 
      `- ID: ${t.id}, Category: ${t.category}, Status: ${t.status}, Sentiment: ${t.sentiment}, Customer said: "${t.transcript[0]?.text.substring(0, 50)}..."`
    ).join("\n");

    const prompt = `
      You are a QA Executive for a support team.
      Analyze the following support ticket snippets and generate a brief, professional executive summary (max 3 sentences).
      Highlight key trends, major pain points, and areas of success.
      
      Data:
      ${ticketSummary}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "Error generating executive summary. Please try again later.";
  }
};

export const auditTicket = async (ticket: Ticket): Promise<AuditResult> => {
  if (!ai) {
    // Mock fallback if no API key
    return new Promise(resolve => setTimeout(() => resolve({
      score: 85,
      empathyScore: 8,
      solutionScore: 9,
      grammarScore: 10,
      coachingTip: "Simulated AI: Great job resolving the issue quickly. Try to use the customer's name more often.",
      summary: "Simulated AI: The agent was polite and efficient."
    }), 1500));
  }

  try {
    const transcriptText = ticket.transcript.map(m => `${m.role}: ${m.text}`).join("\n");
    
    const prompt = `
      Act as a Quality Assurance Auditor. Audit the following customer support transcript.
      Return the result in JSON format.
      
      Scoring Criteria:
      - Empathy (1-10): How well did the agent understand and relate to the customer?
      - Solution (1-10): Did the agent solve the problem or provide a clear next step?
      - Grammar (1-10): Professionalism and correctness.
      - Overall Score (0-100): Weighted average.
      - Coaching Tip: A specific, constructive tip for the agent.
      - Summary: One sentence summary of the interaction.

      Transcript:
      ${transcriptText}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            empathyScore: { type: Type.NUMBER },
            solutionScore: { type: Type.NUMBER },
            grammarScore: { type: Type.NUMBER },
            coachingTip: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ["score", "empathyScore", "solutionScore", "grammarScore", "coachingTip", "summary"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const result = JSON.parse(text);
    return result as AuditResult;

  } catch (error) {
    console.error("Gemini Audit Error:", error);
    return {
      score: 0,
      empathyScore: 0,
      solutionScore: 0,
      grammarScore: 0,
      coachingTip: "Error retrieving AI audit.",
      summary: "Error"
    };
  }
};