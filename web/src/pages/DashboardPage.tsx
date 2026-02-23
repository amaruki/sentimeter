/**
 * Dashboard Page
 */

import {
  Card,
  LoadingState,
  ErrorState,
  EmptyState,
  StatsCard,
  LogPanel,
  SummaryTable, AvoidSection, MarketOutlookPanel,
  useToast,
  TelegramCallToAction,
} from "@/components";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ActivePositionCard } from "@/components/ActivePositionCard";
import {
  useRecommendations,
  useRefresh,
  useLogStream,
  useWebSocket,
  useAvoidList, useMarketOutlook, formatPercent,
  type ActivePositionItem,
  type RecommendationItem,
} from "@/lib";
import { useState, useEffect, useCallback } from "react";

export function DashboardPage() {
  const { data, loading, error, refetch } = useRecommendations();
  const { trigger, loading: refreshing, result: refreshResult } = useRefresh();
  const { logs, connected } = useLogStream();
  const { showToast } = useToast();

  const [activePositions, setActivePositions] = useState<ActivePositionItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Initialize positions from API data
  useEffect(() => {
    if (data) {
      if (data.activePositions) setActivePositions(data.activePositions);
      if (data.recommendations) setRecommendations(data.recommendations);
    }
  }, [data]);

  const handleWebSocketMessage = useCallback(
    (message: any) => {
      if (message.type === "PRICE_UPDATE") {
        setActivePositions((prev) =>
          prev.map((pos) => {
            const newPrice = message.prices[pos.ticker];
            if (newPrice) {
              const pnl = ((newPrice - pos.entryPrice) / pos.entryPrice) * 100;
              return {
                ...pos,
                currentPrice: newPrice,
                unrealizedPnlPct: pnl,
              };
            }
            return pos;
          })
        );
        setRecommendations((prev) =>
          prev.map((rec) => {
            const newPrice = message.prices[rec.ticker];
            if (newPrice) {
              return {
                ...rec,
                currentPrice: newPrice,
              };
            }
            return rec;
          })
        );
      } else if (message.type === "STATUS_UPDATE") {
        message.updates.forEach((update: any) => {
          const type =
            update.newStatus === "target_hit"
              ? "success"
              : update.newStatus === "sl_hit"
                ? "error"
                : "info";

          showToast(
            `${update.ticker}: ${update.previousStatus} ⮕ ${update.newStatus}`,
            type
          );

          // Update status
          setActivePositions((prev) =>
            prev.map((pos) => {
              if (pos.ticker === update.ticker) {
                return { ...pos, status: update.newStatus };
              }
              return pos;
            })
          );

          // Refresh data to get consistent state
          void refetch();
        });
      } else if (message.type === "ANOMALY_DETECTED") {
        message.anomalies.forEach((anomaly: any) => {
          showToast(
            `Anomaly: ${anomaly.ticker} ${anomaly.type} (${anomaly.value.toFixed(2)}%)`,
            "warning"
          );
        });
      } else if (message.type === "HEARTBEAT") {
        setCurrentTime(new Date(message.timestamp));
      }
    },
    [showToast, refetch]
  );

  const { isConnected } = useWebSocket("/ws", handleWebSocketMessage);
  const { data: avoidData } = useAvoidList();
  const { data: outlookData } = useMarketOutlook();

  if (loading) return <LoadingState message="Loading recommendations..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return <EmptyState message="No data available" />;

  const stats = [
    { label: "Active Positions", value: activePositions.length },
    { label: "Pending Entry", value: data.summary.totalPending },
    {
      label: "Win Rate",
      value: data.summary.winRate ? `${data.summary.winRate.toFixed(1)}%` : "-",
    },
    {
      label: "Avg Return",
      value: data.summary.avgReturn
        ? formatPercent(data.summary.avgReturn)
        : "-",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Today's Recommendations
          </h1>
          <p className="text-gray-500">
            {data.schedule === "morning" ? "Morning" : "Evening"} session -{" "}
            {currentTime.toLocaleTimeString("id-ID")}
            {isConnected && (
              <span className="ml-2 text-success-600 text-xs font-medium px-2 bg-success-50 rounded-full animate-pulse">
                ● Live
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => void trigger()}
          disabled={refreshing}
          className="btn-primary flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <span className="animate-spin">⟳</span> Refreshing...
            </>
          ) : (
            <>
              <span>↻</span> Refresh Analysis
            </>
          )}
        </button>
      </div>

      {refreshResult && (
        <Card
          className={
            refreshResult.triggered
              ? "bg-success-50 border-success-200"
              : "bg-warning-50 border-warning-200"
          }
        >
          <p
            className={
              refreshResult.triggered ? "text-success-700" : "text-warning-700"
            }
          >
            {refreshResult.message}
          </p>
        </Card>
      )}

      <LogPanel
        logs={logs}
        connected={connected}
        visible={true}
      />

      {outlookData && <MarketOutlookPanel data={outlookData} />}

      <StatsCard stats={stats} />

      <SummaryTable
        recommendations={recommendations}
        activePositions={activePositions}
        date={data.date}
      />

      {activePositions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active Positions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePositions.map((position) => (
              <ActivePositionCard
                key={`${position.ticker}-${position.recommendationDate}`}
                position={position}
              />
            ))}
          </div>
        </section>
      )}

      <TelegramCallToAction />

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          New Recommendations ({recommendations.length})
        </h2>
        {recommendations.length === 0 ? (
          <EmptyState message="No new recommendations for today" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={`${rec.ticker}-${rec.recommendationDate}`}
                recommendation={rec}
              />
            ))}
          </div>
        )}
      </section>

      {avoidData && avoidData.items.length > 0 && (
        <AvoidSection items={avoidData.items} />
      )}
    </div>
  );
}
