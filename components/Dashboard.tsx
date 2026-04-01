"use client";

import useSWR from "swr";
import BarChart from "./BarChart";
import type { StatsResponse } from "@/app/api/stats/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-100 mt-0.5">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const { data, error, isLoading } = useSWR<StatsResponse>(
    "/api/stats",
    fetcher,
    { refreshInterval: 60_000 } // refresh every minute
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 font-medium">Failed to load stats</p>
          <p className="text-slate-400 text-sm mt-2">
            Make sure your database is connected and environment variables are
            set.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Overview</h1>
        <p className="text-slate-400 text-sm mt-1">
          Last updated {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Visits (7d)"
          value={data.pageviews.total7d}
          subtitle="Pageviews from PostHog"
          color="bg-indigo-500/20"
          icon={
            <svg
              className="w-5 h-5 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          }
        />
        <StatCard
          title="Form Submissions"
          value={data.formSubmissions.total}
          subtitle="Total via Webflow webhooks"
          color="bg-emerald-500/20"
          icon={
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
        <StatCard
          title="Articles Published"
          value={data.articles.total}
          subtitle="Total via Webflow CMS webhooks"
          color="bg-amber-500/20"
          icon={
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          }
        />
      </div>

      {/* Pageview chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-slate-100 font-semibold">Daily Pageviews</h2>
            <p className="text-slate-500 text-xs mt-0.5">Last 7 days</p>
          </div>
          <span className="text-indigo-400 text-sm font-medium">
            {data.pageviews.total7d.toLocaleString()} total
          </span>
        </div>
        <BarChart
          data={data.pageviews.byDay}
          color="#6366f1"
          height={200}
          label="Pageviews"
        />
      </div>

      {/* Articles by day chart */}
      {data.articles.byDay.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-slate-100 font-semibold">
                Articles Published Per Day
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Last 30 days</p>
            </div>
          </div>
          <BarChart
            data={data.articles.byDay}
            color="#f59e0b"
            height={160}
            label="Articles"
          />
        </div>
      )}

      {/* Recent data tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Form Submissions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-slate-100 font-semibold">
              Recent Form Submissions
            </h2>
          </div>
          {data.formSubmissions.recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">
              No form submissions yet. Webhook at{" "}
              <code className="text-slate-400">/api/webhooks/webflow-form</code>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {data.formSubmissions.recent.map((sub) => (
                <div key={sub.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-slate-200 text-sm font-medium truncate">
                        {sub.form_name}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {formatDateTime(sub.received_at)}
                      </p>
                    </div>
                    <span className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 rounded px-2 py-0.5 flex-shrink-0">
                      new
                    </span>
                  </div>
                  {sub.data && Object.keys(sub.data).length > 0 && (
                    <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                      {Object.entries(sub.data)
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <p key={k} className="truncate">
                            <span className="text-slate-400">{k}:</span>{" "}
                            {String(v)}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Articles */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-slate-100 font-semibold">Recent Articles</h2>
          </div>
          {data.articles.recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">
              No articles yet. Webhook at{" "}
              <code className="text-slate-400">
                /api/webhooks/webflow-article
              </code>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {data.articles.recent.map((article) => (
                <div key={article.id} className="px-5 py-3">
                  <p className="text-slate-200 text-sm font-medium truncate">
                    {article.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {article.slug && (
                      <span className="text-slate-500 text-xs font-mono truncate">
                        /{article.slug}
                      </span>
                    )}
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-slate-500 text-xs">
                      {formatDateTime(article.published_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
