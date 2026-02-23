/**
 * Application Configuration
 */

export const config = {
  // Server
  port: parseInt(process.env.PORT ?? "3001", 10),

  // Anomaly Detection
  anomaly: {
    priceChangePct: parseFloat(process.env.ANOMALY_PRICE_CHANGE_PCT ?? "5.0"),
    volumeMultiplier: parseFloat(process.env.ANOMALY_VOLUME_MULTIPLIER ?? "3.0"),
  },
};
