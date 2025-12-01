import React, { useState, useEffect } from 'react';
import { GenerationMode, TARGET_SCOPES } from '../types';

interface ControlPanelProps {
  onStartSequence: (ticker: string, start: string, end: string, mode: GenerationMode, itemsPerDay: number) => void;
  onStop: () => void;
  isGenerating: boolean;
  progressStr: string;
  onDownload: () => void;
  dataCount: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onStartSequence, 
  onStop,
  isGenerating, 
  progressStr,
  onDownload, 
  dataCount 
}) => {
  const [ticker, setTicker] = useState(TARGET_SCOPES[0]);
  const [customTicker, setCustomTicker] = useState('');
  const [startDate, setStartDate] = useState('2015-01-01');
  const [endDate, setEndDate] = useState('2025-11-01');
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.SYNTHETIC);
  const [itemsPerDay, setItemsPerDay] = useState(1.5);
  const [estimatedTotal, setEstimatedTotal] = useState(0);

  // Calculate estimate
  useEffect(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    setEstimatedTotal(Math.floor(diffDays * itemsPerDay));
  }, [startDate, endDate, itemsPerDay]);

  const handleStart = () => {
    const activeTicker = customTicker ? customTicker : ticker;
    onStartSequence(activeTicker, startDate, endDate, mode, itemsPerDay);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 h-fit sticky top-6">
      <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Crawler Configuration
      </h2>

      <div className="space-y-5">
        
        {/* Target Scope Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Index / Scope</label>
          <div className="flex gap-2">
            <select 
              value={ticker} 
              onChange={(e) => { setTicker(e.target.value); setCustomTicker(''); }}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-slate-50"
            >
              {TARGET_SCOPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="mt-2">
             <input
              type="text"
              placeholder="Or custom (e.g., Russell 2000)"
              value={customTicker}
              onChange={(e) => setCustomTicker(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        </div>

        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Crawler Mode</label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setMode(GenerationMode.LIVE_SEARCH)}
              className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${mode === GenerationMode.LIVE_SEARCH ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Google Crawler
            </button>
            <button
              onClick={() => setMode(GenerationMode.SYNTHETIC)}
              className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${mode === GenerationMode.SYNTHETIC ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Synthetic Data
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {mode === GenerationMode.LIVE_SEARCH 
              ? "Principle: Uses Google Search to crawl the web for real historical articles, extracting headlines and sources like a scraping bot."
              : "Principle: Uses Generative AI to simulate realistic financial news data patterns based on historical knowledge."}
          </p>
        </div>

        {/* Density */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Density (Items Per Day)
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              step="0.1"
              min="0.1" 
              max="10"
              value={itemsPerDay}
              onChange={(e) => setItemsPerDay(parseFloat(e.target.value))}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Est. Total: ~{estimatedTotal.toLocaleString()} items
          </p>
        </div>

        <hr className="border-slate-200" />

        {/* Actions */}
        <div className="space-y-3">
          {!isGenerating ? (
            <button
              onClick={handleStart}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Start Crawler Sequence
            </button>
          ) : (
             <button
              onClick={onStop}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 animate-pulse"
            >
              Stop Crawler
            </button>
          )}
          
          {isGenerating && (
             <div className="text-center text-xs text-indigo-600 font-mono bg-indigo-50 p-2 rounded flex items-center justify-center gap-2">
                <svg className="animate-spin h-3 w-3 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {progressStr}
             </div>
          )}

          <button
            onClick={onDownload}
            disabled={dataCount === 0 || isGenerating}
            className={`w-full flex justify-center items-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${(dataCount === 0 || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV ({dataCount})
          </button>
        </div>
      </div>
    </div>
  );
};