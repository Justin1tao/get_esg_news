import React, { useState, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { NewsTable } from './components/NewsTable';
import { NewsItem, GenerationMode } from './types';
import { fetchESGNews } from './services/geminiService';

const App: React.FC = () => {
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStr, setProgressStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Ref to handle stopping the loop
  const stopRef = useRef(false);

  const handleStop = () => {
    stopRef.current = true;
  };

  const handleSequenceGenerate = async (
    ticker: string,
    startStr: string,
    endStr: string,
    mode: GenerationMode,
    itemsPerDay: number
  ) => {
    setIsGenerating(true);
    setError(null);
    stopRef.current = false;
    
    let totalGenerated = 0;
    let errorCount = 0;

    try {
      // 1. Dynamic Chunking Strategy
      // Calculate optimal window to fetch ~25 items per request to maximize efficiency
      const TARGET_ITEMS_PER_REQ = 25;
      const rawDays = Math.ceil(TARGET_ITEMS_PER_REQ / Math.max(0.1, itemsPerDay));
      // Clamp: Min 5 days (avoid tiny requests), Max 60 days (avoid context limits)
      const chunkDays = Math.max(5, Math.min(rawDays, 60));

      // 2. Pre-calculate all chunks
      const chunks: {start: string, end: string, count: number}[] = [];
      let currentDate = new Date(startStr);
      const finalDate = new Date(endStr);

      while (currentDate < finalDate) {
         const chunkEnd = new Date(currentDate);
         chunkEnd.setDate(chunkEnd.getDate() + chunkDays);
         const actualEnd = chunkEnd > finalDate ? finalDate : chunkEnd;
         
         const daysInChunk = (actualEnd.getTime() - currentDate.getTime()) / (86400000);
         const count = Math.ceil(daysInChunk * itemsPerDay);

         if (count > 0) {
             chunks.push({
                 start: currentDate.toISOString().split('T')[0],
                 end: actualEnd.toISOString().split('T')[0],
                 count
             });
         }
         currentDate = actualEnd;
      }

      // 3. Process with Concurrency (Parallel Crawling)
      const CONCURRENCY = 3; 
      const totalBatches = Math.ceil(chunks.length / CONCURRENCY);

      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
          if (stopRef.current) break;
          
          const batch = chunks.slice(i, i + CONCURRENCY);
          const batchIdx = Math.floor(i / CONCURRENCY) + 1;

          setProgressStr(`Batch ${batchIdx}/${totalBatches}: Crawling ${batch.length} parallel segments... | Total: ${totalGenerated} | Errors: ${errorCount}`);
          
          // Execute batch in parallel
          // We wrap promises to catch individual failures without stopping the whole batch
          const promises = batch.map(chunk => 
             fetchESGNews(ticker, chunk.start, chunk.end, mode, chunk.count)
                .then(items => ({ success: true as const, items }))
                .catch(err => ({ success: false as const, err }))
          );

          const results = await Promise.all(promises);

          // Process results
          for (const res of results) {
              if (res.success) {
                  setNewsData(prev => [...prev, ...res.items]);
                  totalGenerated += res.items.length;
              } else {
                  console.error("Chunk failed", res.err);
                  errorCount++;
                  // Critical error check
                  if (res.err && res.err.message && res.err.message.includes("API Key")) {
                      throw res.err; 
                  }
              }
          }
          
          // Rate limit breather between batches
          if (i + CONCURRENCY < chunks.length && !stopRef.current) {
              await new Promise(r => setTimeout(r, 1000));
          }
      }

      if (stopRef.current) {
        setProgressStr(`Stopped by user. Total: ${totalGenerated}. Errors: ${errorCount}`);
      } else {
        setProgressStr(`Sequence Completed! Total: ${totalGenerated}. Errors: ${errorCount}`);
      }

    } catch (err: any) {
      if (err.message && err.message.includes("API Key is missing")) {
        try {
           if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
             await (window as any).aistudio.openSelectKey();
             setError("API Key selected. Please try again.");
           } else {
             setError("API Key missing and selection dialog unavailable.");
           }
        } catch (e) {
            setError("Failed to open API Key selector.");
        }
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsGenerating(false);
      stopRef.current = false;
    }
  };

  // Handle Deletion
  const handleDelete = (id: string) => {
    setNewsData(prev => prev.filter(item => item.id !== id));
  };

  // Handle CSV Download
  const handleDownload = () => {
    if (newsData.length === 0) return;

    // Format: Time, Sample ID, text
    const headers = ["Time,Sample ID,text,source"];
    const rows = newsData.map(item => {
      // Escape quotes in text to prevent CSV breakage
      const safeText = `"${item.text.replace(/"/g, '""')}"`;
      const safeSource = `"${(item.source || '').replace(/"/g, '""')}"`;
      return `${item.time},${item.id},${safeText},${safeSource}`;
    });

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sp500_esg_news_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                S&P 500 ESG Data Collector
              </h1>
            </div>
            <div className="text-sm text-slate-500 hidden sm:block">
              Index-Level ESG News Extraction (2015-2025)
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error Notification */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm flex justify-between items-start">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-500">
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            </button>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          
          {/* Sidebar Controls */}
          <div className="lg:col-span-4 xl:col-span-3 mb-8 lg:mb-0">
            <ControlPanel 
              onStartSequence={handleSequenceGenerate} 
              onStop={handleStop}
              isGenerating={isGenerating}
              progressStr={progressStr}
              onDownload={handleDownload}
              dataCount={newsData.length}
            />
            
            <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100 text-sm text-blue-800">
               <h3 className="font-semibold mb-2 flex items-center">
                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 High-Performance Mode
               </h3>
               <p className="mb-2">1. Select <b>Google Crawler</b> mode.</p>
               <p className="mb-2">2. Set Density (e.g. 1.25).</p>
               <p className="mb-2">3. The app now uses <b>Parallel Processing</b> (3 concurrent spiders) and <b>Dynamic Windowing</b>.</p>
               <p className="mb-2">4. Speed is ~3x-5x faster than before.</p>
            </div>
          </div>

          {/* Data Table */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-bold text-slate-800">Dataset Preview</h2>
               <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded border border-indigo-200">
                 {newsData.length} Records
               </span>
            </div>
            <NewsTable data={newsData} onDelete={handleDelete} />
          </div>
          
        </div>
      </main>
    </div>
  );
};

export default App;