/**
 * Market Outlook Component
 *
 * Displays market sentiment overview with bullish/bearish signals
 * and key news highlights (global + local).
 */

import type { MarketOutlookData } from "@/lib/types";
import { Card } from "./Card";

interface MarketOutlookProps {
  data: MarketOutlookData;
}

function getSentimentColor(sentiment: "bullish" | "bearish" | "neutral"): string {
  switch (sentiment) {
    case "bullish":
      return "text-success-600 bg-success-50";
    case "bearish":
      return "text-danger-600 bg-danger-50";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

function getSentimentLabel(sentiment: "bullish" | "bearish" | "neutral"): string {
  return sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
}

function getNewsIcon(sentiment: "positive" | "negative" | "neutral"): string {
  switch (sentiment) {
    case "positive":
      return "+";
    case "negative":
      return "-";
    default:
      return "~";
  }
}

function getNewsColor(sentiment: "positive" | "negative" | "neutral"): string {
  switch (sentiment) {
    case "positive":
      return "text-success-600";
    case "negative":
      return "text-danger-600";
    default:
      return "text-gray-500";
  }
}

export function MarketOutlookPanel({ data }: MarketOutlookProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Market Outlook</h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(data.sentiment)}`}
        >
          {getSentimentLabel(data.sentiment)}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">{data.summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {data.bullishSignals.length > 0 && (
          <div className="p-3 bg-success-50 rounded-lg">
            <h4 className="text-sm font-semibold text-success-700 mb-2">Bullish Signals</h4>
            <ul className="space-y-1">
              {data.bullishSignals.map((signal, idx) => (
                <li key={idx} className="text-xs text-success-600 flex items-start gap-1">
                  <span className="mt-0.5">+</span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.bearishSignals.length > 0 && (
          <div className="p-3 bg-danger-50 rounded-lg">
            <h4 className="text-sm font-semibold text-danger-700 mb-2">Bearish Signals</h4>
            <ul className="space-y-1">
              {data.bearishSignals.map((signal, idx) => (
                <li key={idx} className="text-xs text-danger-600 flex items-start gap-1">
                  <span className="mt-0.5">-</span>
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(data.globalNews.length > 0 || data.localNews.length > 0) && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Key News</h4>
          <div className="space-y-1">
            {[...data.globalNews, ...data.localNews].slice(0, 8).map((news, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className={`font-bold ${getNewsColor(news.sentiment)}`}>
                  {getNewsIcon(news.sentiment)}
                </span>
                <span className="text-gray-700 flex-1">{news.title}</span>
                <span className="text-gray-400 whitespace-nowrap">{news.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400 text-right">
        Generated: {new Date(data.generatedAt).toLocaleString("id-ID")}
      </div>
    </Card>
  );
}
