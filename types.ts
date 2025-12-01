export interface NewsItem {
  id: string;      // Sample ID
  time: string;    // Time/Date
  text: string;    // The content for FinBERT
  source?: string; // Optional metadata (URL or 'Synthetic')
  ticker: string;
}

export enum GenerationMode {
  LIVE_SEARCH = 'LIVE_SEARCH',
  SYNTHETIC = 'SYNTHETIC',
}

export interface GenerationConfig {
  ticker: string;
  startDate: string;
  endDate: string;
  mode: GenerationMode;
  itemsPerDay: number; // Changed from raw count
}

export const TARGET_SCOPES = [
  "S&P 500 Index (Overall)",
  "S&P 500 ESG Index",
  "S&P 500 Top 10 Constituents",
  "S&P 500 Energy Sector",
  "S&P 500 Technology Sector"
];