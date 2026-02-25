/**
 * Ticker Analysis Page
 *
 * Allows users to input an individual ticker and analyze it.
 * Fetches news, technical data, and fundamentals on demand.
 */

import { useState } from "react";
import { Card, LoadingState, ErrorState } from "@/components";
import { useTickerAnalysis, formatCurrency, formatPercent } from "@/lib";

export function TickerAnalysisPage() {
  const [tickerInput, setTickerInput] = useState("");
  const { analyze, data, loading, error } = useTickerAnalysis();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tickerInput.trim().toUpperCase();
    if (trimmed) {
      void analyze(trimmed);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ticker Analysis</h1>
        <p className="text-gray-500">
          Analyze individual tickers - useful when the job failed to parse some ticker data
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            placeholder="Enter ticker (e.g. BBCA, TLKM, ASII)"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={loading || !tickerInput.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>
      </Card>

      {loading && <LoadingState message={`Analyzing ${tickerInput.toUpperCase()}...`} />}
      {error && <ErrorState message={error} />}

      {data && (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{data.ticker}</h2>
                <p className="text-gray-500">{data.companyName}</p>
                {data.sector && <p className="text-xs text-gray-400">{data.sector}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.currentPrice)}
                </p>
                <p
                  className={`text-sm font-medium ${data.priceChangePct >= 0 ? "text-success-600" : "text-danger-600"
                    }`}
                >
                  {formatPercent(data.priceChangePct)}
                </p>
              </div>
            </div>
          </Card>

          {/* Fundamentals */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Fundamentals</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FundamentalItem label="P/E Ratio" value={data.fundamentals.peRatio?.toFixed(1)} />
              <FundamentalItem label="P/B Ratio" value={data.fundamentals.pbRatio?.toFixed(2)} />
              <FundamentalItem
                label="ROE"
                value={data.fundamentals.roe ? `${(data.fundamentals.roe * 100).toFixed(1)}%` : null}
              />
              <FundamentalItem label="D/E Ratio" value={data.fundamentals.debtToEquity?.toFixed(2)} />
              <FundamentalItem
                label="Div Yield"
                value={
                  data.fundamentals.dividendYield
                    ? `${(data.fundamentals.dividendYield * 100).toFixed(2)}%`
                    : null
                }
              />
              <FundamentalItem
                label="Market Cap"
                value={
                  data.fundamentals.marketCap
                    ? `Rp ${(data.fundamentals.marketCap / 1e12).toFixed(1)}T`
                    : null
                }
              />
            </div>
          </Card>

          {/* Technical */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FundamentalItem label="Trend" value={data.technical.trend} />
              <FundamentalItem label="SMA 20" value={data.technical.sma20?.toFixed(0)} />
              <FundamentalItem label="SMA 50" value={data.technical.sma50?.toFixed(0)} />
              <FundamentalItem
                label="3M Range"
                value={`${data.technical.low3Month.toFixed(0)} - ${data.technical.high3Month.toFixed(0)}`}
              />
              <FundamentalItem
                label="Volatility"
                value={`${data.technical.volatilityPercent.toFixed(1)}%`}
              />
              <FundamentalItem
                label="Supports"
                value={
                  data.technical.supports.length > 0
                    ? data.technical.supports.map((s) => s.toFixed(0)).join(", ")
                    : null
                }
              />
            </div>
          </Card>

          {/* Relevant News */}
          {data.relevantNews.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Relevant News ({data.relevantNews.length})
              </h3>
              <div className="space-y-2">
                {data.relevantNews.map((news, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 whitespace-nowrap">{news.portal}</span>
                    <span className="text-gray-700">{news.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* LLM Analysis */}
          {data.analysis && (
            <Card
              className={
                data.analysis.action === "BUY"
                  ? "border-success-200"
                  : data.analysis.action === "AVOID"
                    ? "border-danger-200"
                    : ""
              }
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${data.analysis.action === "BUY"
                      ? "bg-success-50 text-success-700"
                      : data.analysis.action === "AVOID"
                        ? "bg-danger-50 text-danger-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                >
                  {data.analysis.action}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Entry</p>
                  <p className="font-semibold">{formatCurrency(data.analysis.entryPrice)}</p>
                </div>
                <div className="text-center p-3 bg-danger-50 rounded-lg">
                  <p className="text-xs text-danger-600">Stop Loss</p>
                  <p className="font-semibold text-danger-600">
                    {formatCurrency(data.analysis.stopLoss)}
                  </p>
                </div>
                <div className="text-center p-3 bg-success-50 rounded-lg">
                  <p className="text-xs text-success-600">Target</p>
                  <p className="font-semibold text-success-600">
                    {formatCurrency(data.analysis.targetPrice)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <ScoreItem label="Overall" value={data.analysis.overallScore} />
                <ScoreItem label="Sentiment" value={data.analysis.sentimentScore} />
                <ScoreItem label="Fundamental" value={data.analysis.fundamentalScore} />
                <ScoreItem label="Technical" value={data.analysis.technicalScore} />
              </div>

              <div className="border-t pt-4 space-y-2">
                <p className="text-sm text-gray-700">{data.analysis.analysisSummary}</p>
                <details className="text-sm">
                  <summary className="text-primary-600 cursor-pointer font-medium">
                    Detailed Analysis
                  </summary>
                  <div className="mt-2 space-y-2 text-gray-600">
                    <p>
                      <strong>News:</strong> {data.analysis.newsSummary}
                    </p>
                    <p>
                      <strong>Fundamental:</strong> {data.analysis.fundamentalSummary}
                    </p>
                    <p>
                      <strong>Technical:</strong> {data.analysis.technicalSummary}
                    </p>
                  </div>
                </details>
              </div>
            </Card>
          )}

          {!data.analysis && (
            <Card className="border-warning-200 bg-warning-50">
              <p className="text-sm text-warning-700">
                AI analysis could not be generated. This may be due to insufficient market data.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function FundamentalItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value ?? "N/A"}</p>
    </div>
  );
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-bold text-lg text-gray-900">{value.toFixed(0)}</p>
    </div>
  );
}
