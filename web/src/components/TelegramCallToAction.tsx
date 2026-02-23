
import { Card } from "./Card";

export function TelegramCallToAction() {
    return (
        <Card className="bg-gradient-to-r from-blue-50 to-white border-blue-100">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.4l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.963.159z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Get Daily Notifications
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Subscribe to our Telegram bot to receive daily stock recommendations and anomaly alerts directly to your phone.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <a
                            href="https://t.me/reportntfbot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn bg-blue-600 hover:bg-blue-700 text-white border-transparent px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.4l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.963.159z" />
                            </svg>
                            Open Telegram Bot
                        </a>
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/50 px-3 py-2 rounded-lg border border-blue-100">
                            <code className="font-mono text-blue-700">/start</code> to subscribe
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
