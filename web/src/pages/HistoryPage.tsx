/**
 * History Page
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, LoadingState, ErrorState, EmptyState, Badge, StatsCard } from "@/components";
import {
  useHistory,
  formatCurrency,
  formatPercent,
  formatDate,
  getStatusColor,
  getStatusLabel,
  type HistoryParams,
} from "@/lib";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "entry_hit", label: "In Position" },
  { value: "target_hit", label: "Target Hit" },
  { value: "sl_hit", label: "Stop Loss" },
  { value: "expired", label: "Expired" },
];

const TICKER_DEBOUNCE_MS = 400;

export function HistoryPage() {
  const [params, setParams] = useState<HistoryParams>({
    page: 1,
    pageSize: 20,
  });

  const [tickerInput, setTickerInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, loading, error, refetch } = useHistory(params);

  // Sync ticker input when params.ticker changes (e.g. after clear)
  useEffect(() => {
    setTickerInput(params.ticker ?? "");
  }, [params.ticker]);

  const handleFilterChange = useCallback((key: keyof HistoryParams, value: string) => {
    setParams((prev) => ({
      ...prev,
      [key]: value.trim() || undefined,
      page: 1,
    }));
  }, []);

  const handleTickerChange = useCallback(
    (value: string) => {
      setTickerInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        setParams((prev) => ({
          ...prev,
          ticker: value.trim() || undefined,
          page: 1,
        }));
      }, TICKER_DEBOUNCE_MS);
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setTickerInput("");
    setParams({ page: 1, pageSize: 20 });
  }, []);

  const handlePageChange = (newPage: number) => {
    setParams((prev) => ({ ...prev, page: newPage }));
  };

  const hasActiveFilters =
    (params.ticker ?? "") !== "" ||
    (params.status ?? "") !== "" ||
    (params.startDate ?? "") !== "" ||
    (params.endDate ?? "") !== "";

  if (loading) return <LoadingState message="Loading history..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return <EmptyState message="No data available" />;

  const stats = [
    { label: "Total Recommendations", value: data.stats.totalRecommendations },
    { label: "Win Rate", value: data.stats.winRate !== null ? `${data.stats.winRate.toFixed(1)}%` : "-" },
    { label: "Avg Return", value: data.stats.avgReturn !== null ? formatPercent(data.stats.avgReturn) : "-" },
    {
      label: "Best Pick",
      value: data.stats.bestPick ? `${data.stats.bestPick.ticker} (${formatPercent(data.stats.bestPick.returnPct)})` : "-",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recommendation History</h1>
        <p className="text-gray-500">Track past recommendations and performance</p>
      </div>

      <StatsCard stats={stats} />

      <Card>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by ticker..."
            className="input w-full sm:w-40"
            value={tickerInput}
            onChange={(e) => handleTickerChange(e.target.value)}
            aria-label="Filter by ticker"
          />
          <select
            className="input w-full sm:w-40"
            value={params.status ?? ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input w-full sm:w-40"
            value={params.startDate ?? ""}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            aria-label="Start date"
          />
          <input
            type="date"
            className="input w-full sm:w-40"
            value={params.endDate ?? ""}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            aria-label="End date"
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-secondary text-sm w-full sm:w-auto"
            >
              Clear filters
            </button>
          )}
        </div>

        {data.items.length === 0 ? (
          <EmptyState message="No recommendations match your filters" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3 px-4 font-medium">Ticker</th>
                    <th className="pb-3 px-4 font-medium">Date</th>
                    <th className="pb-3 px-4 font-medium">Action</th>
                    <th className="pb-3 px-4 font-medium text-right">Entry</th>
                    <th className="pb-3 px-4 font-medium text-right">Target</th>
                    <th className="pb-3 px-4 font-medium text-right">Stop Loss</th>
                    <th className="pb-3 px-4 font-medium">Status</th>
                    <th className="pb-3 px-4 font-medium text-right">P&L</th>
                    <th className="pb-3 px-4 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, index) => (
                    <tr key={`${item.ticker}-${item.recommendationDate}-${index}`} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.ticker}</p>
                          <p className="text-xs text-gray-500">{item.companyName}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatDate(item.recommendationDate)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={item.action === "buy" ? "success" : "danger"}>
                          {item.action.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">{formatCurrency(item.entryPrice)}</td>
                      <td className="py-3 px-4 text-right text-sm text-success-600">
                        {formatCurrency(item.targetPrice)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-danger-600">
                        {formatCurrency(item.stopLoss)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(item.status)}>{getStatusLabel(item.status)}</Badge>
                      </td>
                      <td
                        className={`py-3 px-4 text-right text-sm font-medium ${item.profitLossPct === null
                          ? "text-gray-400"
                          : item.profitLossPct >= 0
                            ? "text-success-600"
                            : "text-danger-600"
                          }`}
                      >
                        {formatPercent(item.profitLossPct)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">{item.overallScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
              <p className="text-sm text-center sm:text-left text-gray-500">
                Showing {(data.pagination.page - 1) * data.pagination.pageSize + 1} to{" "}
                {Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} of{" "}
                {data.pagination.total} results
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  className="btn-secondary flex-1 sm:flex-none"
                  disabled={data.pagination.page <= 1}
                  onClick={() => handlePageChange(data.pagination.page - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary flex-1 sm:flex-none"
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => handlePageChange(data.pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
