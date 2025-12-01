import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NewsItem, GenerationMode } from "../types";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);
const MAX_RETRIES = 3;

export const fetchESGNews = async (
  ticker: string,
  startDate: string,
  endDate: string,
  mode: GenerationMode,
  count: number
): Promise<NewsItem[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please select a paid API key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Schema for structured output
  const newsSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "The specific publication date of the article (YYYY-MM-DD)" },
        headline: { type: Type.STRING, description: "The exact headline of the article found on the web" },
        summary: { type: Type.STRING, description: "A comprehensive snippet or summary of the article content, focusing on ESG facts." },
        url: { type: Type.STRING, description: "The direct URL to the source article." },
        sourceName: { type: Type.STRING, description: "The name of the publisher (e.g., Bloomberg, Reuters, CNBC)." }
      },
      required: ["date", "headline", "summary"]
    }
  };

  let model = 'gemini-2.5-flash';
  let prompt = '';
  let tools: any[] | undefined = undefined;

  // Prepare Prompt and Config
  if (mode === GenerationMode.LIVE_SEARCH) {
    model = 'gemini-3-pro-preview'; // Use Pro for better reasoning and tool use
    tools = [{ googleSearch: {} }];
    
    // Updated prompt to "mimic a crawler" behavior
    prompt = `
      You are a specialized Web Crawler and Data Scraper.
      
      Task: Perform a deep Google Search to find exactly ${count} distinct news articles for "${ticker}" related to ESG (Environmental, Social, Governance).
      
      Constraints:
      1. Timeframe: Articles MUST be published between ${startDate} and ${endDate}.
      2. Quantity: I need exactly ${count} items.
      3. Quality: Prioritize reputable financial sources (Reuters, Bloomberg, WSJ, CNBC, S&P Global).
      
      Output Requirements:
      - Extract the real Headline.
      - Extract a detailed text snippet (summary) for analysis.
      - Extract the Publisher Name.
      - Extract the Source URL.
      
      Return the data strictly as a JSON list matching the schema.
    `;
  } else {
    model = 'gemini-2.5-flash';
    prompt = `
      Generate exactly ${count} REALISTIC financial news snippets for "${ticker}" related to ESG.
      Distribution: The dates MUST be strictly within ${startDate} to ${endDate}.
      Density: Spread the ${count} items somewhat evenly across this time period.
      
      Content Style: Financial news feed (Bloomberg/Reuters).
      Topics: ESG Index rebalancing, carbon goals, diversity reports, governance scandals.
      
      Output strictly valid JSON.
    `;
  }

  // Execute with Retry
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          tools: tools,
          responseMimeType: "application/json",
          responseSchema: newsSchema,
        }
      });

      const rawData = JSON.parse(response.text || "[]");

      return rawData.map((item: any) => {
        let sourceDisplay = "Synthetic";
        if (mode === GenerationMode.LIVE_SEARCH) {
             // Prioritize the structured sourceName, fall back to URL domain, then Google
             sourceDisplay = item.sourceName 
               ? `${item.sourceName}` 
               : (item.url ? new URL(item.url).hostname.replace('www.', '') : "Google Crawler Result");
        } else {
             sourceDisplay = "Synthetic Generation (Gemini 2.5)";
        }

        return {
          id: mode === GenerationMode.LIVE_SEARCH ? `WEB-${generateId()}` : `SYN-${generateId()}`,
          time: item.date,
          text: `${item.headline}. ${item.summary}`,
          source: sourceDisplay,
          ticker: ticker
        };
      });

    } catch (error: any) {
      attempt++;
      console.warn(`GenAI Request failed (Attempt ${attempt}/${MAX_RETRIES}):`, error);

      // Stop immediately for API Key errors
      if (error.message && error.message.includes("API Key")) {
          throw error;
      }
      
      // If we reached max retries, throw the error
      if (attempt === MAX_RETRIES) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s...
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  // Should technically be unreachable due to throws above, but for type safety:
  throw new Error("Failed to fetch news after multiple attempts");
};