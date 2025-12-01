import React from 'react';
import { NewsItem } from '../types';

interface NewsTableProps {
  data: NewsItem[];
  onDelete: (id: string) => void;
}

export const NewsTable: React.FC<NewsTableProps> = ({ data, onDelete }) => {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No data collected yet. Start a search or generation.</p>
      </div>
    );
  }

  // Only show the last 100 items to prevent DOM overload with 6000 items
  const displayData = data.slice(-100).reverse();
  const isTruncated = data.length > 100;

  return (
    <div className="overflow-x-auto shadow-sm rounded-lg border border-slate-200">
      {isTruncated && (
        <div className="bg-yellow-50 p-2 text-xs text-yellow-700 text-center border-b border-yellow-100">
           Displaying last 100 items for performance. All {data.length} items are included in Download.
        </div>
      )}
      <table className="min-w-full divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Time
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Sample ID
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/2">
              Text (FinBERT Input)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Ticker
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {displayData.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                {item.time}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                {item.id}
              </td>
              <td className="px-6 py-4 text-sm text-slate-700">
                <p className="line-clamp-2" title={item.text}>{item.text}</p>
                <span className="text-xs text-slate-400 mt-1 block">Source: {item.source}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                {item.ticker}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};