
import { useState, useEffect } from "react";
import { getConfig } from "../lib";
import { Card } from "./Card";
import { useToast } from "./Toast";

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [checking, setChecking] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        // Check if we already have a password and if it works
        const stored = localStorage.getItem("admin_password");
        if (stored) {
            verifyPassword(stored, true);
        } else {
            setAuthorized(false);
        }
    }, []);

    const verifyPassword = async (pwd: string, silent = false) => {
        setChecking(true);
        setError("");
        try {
            localStorage.setItem("admin_password", pwd);
            await getConfig();
            setAuthorized(true);
            if (!silent) showToast("Admin access granted", "success");
        } catch (err) {
            localStorage.removeItem("admin_password");
            setAuthorized(false);
            if (!silent) {
                setError("Invalid password");
                showToast("Invalid password", "error");
            }
        } finally {
            setChecking(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        verifyPassword(password);
    };

    if (authorized === null) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (authorized) {
        return <>{children}</>;
    }

    return (
        <div className="max-w-md mx-auto py-12">
            <Card>
                <div className="text-center mb-6">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Admin Access Required</h2>
                    <p className="text-gray-500 text-sm mt-2">
                        This page is protected. Please enter the admin password to continue.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input w-full"
                            placeholder="Enter admin password"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={checking || !password}
                        className="btn-primary w-full justify-center"
                    >
                        {checking ? "Verifying..." : "Access Config"}
                    </button>
                </form>
            </Card>
        </div>
    );
}
