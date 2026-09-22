"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, refreshAccessToken } from "../../lib/auth";
import {
  ArrowLeft,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  MessageSquare,
  CalendarDays,
  RefreshCw,
  UserRound,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  lastSeenAt?: string | null;
  chatCount: number;
  messageCount: number;
  pushSubscriptionCount: number;
};

const attachmentUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_URL}${url}`;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

const getAdminToken = () => getAccessToken() ?? localStorage.getItem("token");

const adminFetch = async (url: string, init: RequestInit = {}) => {
  let token = getAdminToken();

  if (!token) {
    return null;
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  let response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return response;
  }

  token = getAdminToken();
  if (!token) {
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    ...init,
    headers: retryHeaders,
  });
};

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [language, setLanguage] = useState<"English" | "Türkçe">("English");

  const loadUsers = async () => {
    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const statusResponse = await adminFetch(`${API_URL}/api/Admin/me`);

      if (!statusResponse || statusResponse.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      if (!statusResponse.ok)
        throw new Error(
          language === "Türkçe"
            ? "Yönetici yetkisi doğrulanamadı."
            : "Administrator access could not be verified.",
        );

      const status = await statusResponse.json();
      if (!status.isAdmin) {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);

      const response = await adminFetch(`${API_URL}/api/Admin/users`);

      if (!response || response.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        setAuthorized(false);
        return;
      }
      if (!response.ok)
        throw new Error(
          language === "Türkçe"
            ? "Kullanıcılar yüklenemedi."
            : "Users could not be loaded.",
        );

      setUsers(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : language === "Türkçe"
            ? "Bir hata oluştu."
            : "An error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedLanguage = localStorage.getItem("chatapp-language");
    setLanguage(storedLanguage === "Türkçe" ? "Türkçe" : "English");
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.username, user.email, user.displayName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [query, users]);

  const deleteUser = async (user: AdminUser) => {
    if (!getAdminToken()) return;

    setDeletingId(user.id);
    setError("");

    try {
      const response = await adminFetch(
        `${API_URL}/api/Admin/users/${user.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response) {
        throw new Error(
          language === "Türkçe" ? "Oturum bulunamadı." : "Session not found.",
        );
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.message ??
            (language === "Türkçe"
              ? "Kullanıcı silinemedi."
              : "User could not be deleted."),
        );
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : language === "Türkçe"
            ? "Kullanıcı silinemedi."
            : "User could not be deleted.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (authorized === null && loading) {
    return (
      <main className="min-h-screen bg-[#020906] p-8 text-white">
        <div className="mx-auto max-w-6xl animate-pulse rounded-3xl border border-emerald-500/10 bg-[#06140e] p-10 text-slate-400">
          {language === "Türkçe"
            ? "Yönetim paneli yükleniyor..."
            : "Loading management panel..."}
        </div>
      </main>
    );
  }

  if (authorized === false) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020906] px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/15 bg-[#06140e] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold">
            {language === "Türkçe" ? "Yetkisiz erişim" : "Unauthorized access"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {language === "Türkçe"
              ? "Bu sayfa yalnızca yapılandırılmış yöneticiler içindir."
              : "This page is only available to configured administrators."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#03130c] hover:bg-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === "Türkçe" ? "Sohbete dön" : "Back to chat"}
          </button>
        </div>
      </main>
    );
  }

  const totalMessages = users.reduce((sum, user) => sum + user.messageCount, 0);
  const totalChats = users.reduce((sum, user) => sum + user.chatCount, 0);

  return (
    <main className="mfb-admin-page min-h-screen bg-[#020906] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-emerald-500/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-emerald-300"
            >
              <ArrowLeft className="h-4 w-4" />
              {language === "Türkçe" ? "MFB Chat'e dön" : "Back to MFB Chat"}
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400/70">
                  {language === "Türkçe" ? "YÖNETİM" : "ADMINISTRATION"}
                </p>
                <h1 className="text-2xl font-bold tracking-tight">
                  {language === "Türkçe"
                    ? "Yönetim Paneli"
                    : "Management Panel"}
                </h1>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-emerald-400/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {language === "Türkçe" ? "Yenile" : "Refresh"}
          </button>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: language === "Türkçe" ? "Toplam üye" : "Total members",
              value: users.length,
              icon: Users,
            },
            {
              label: language === "Türkçe" ? "Toplam mesaj" : "Total messages",
              value: totalMessages,
              icon: MessageSquare,
            },
            {
              label:
                language === "Türkçe" ? "Sohbet üyeliği" : "Chat memberships",
              value: totalChats,
              icon: CalendarDays,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-emerald-500/10 bg-[#06140e] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {item.label}
                  </span>
                  <Icon className="h-4 w-4 text-emerald-400/70" />
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight">
                  {item.value}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-emerald-500/10 bg-[#06140e]">
          <div className="flex flex-col gap-3 border-b border-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                {language === "Türkçe" ? "Kullanıcılar" : "Users"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {language === "Türkçe"
                  ? "Kayıtlı hesapları görüntüle ve yönet."
                  : "View and manage registered accounts."}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/10 bg-black/10 px-3 py-2 sm:w-80">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  language === "Türkçe" ? "Kullanıcı ara..." : "Search users..."
                }
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          {error && (
            <div className="m-4 rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="divide-y divide-emerald-500/10">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-4 p-4 transition hover:bg-emerald-400/[0.025] sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-400/10 bg-emerald-400/10 text-sm font-bold text-emerald-300">
                    {user.avatarUrl ? (
                      <img
                        src={attachmentUrl(user.avatarUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {user.displayName || user.username}
                      </p>
                      <span className="rounded-full border border-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                        @{user.username}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center sm:w-[310px]">
                  <div className="rounded-xl bg-black/10 px-2 py-2">
                    <p className="text-sm font-semibold">{user.messageCount}</p>
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">
                      {language === "Türkçe" ? "Mesaj" : "Messages"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/10 px-2 py-2">
                    <p className="text-sm font-semibold">{user.chatCount}</p>
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">
                      {language === "Türkçe" ? "Sohbet" : "Chats"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/10 px-2 py-2">
                    <p className="text-sm font-semibold">
                      {formatDate(user.createdAt)}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">
                      {language === "Türkçe" ? "Kayıt" : "Registered"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:w-[230px] sm:justify-end">
                  <div className="text-[10px] text-slate-600">
                    {language === "Türkçe" ? "Son görülme" : "Last seen"}:{" "}
                    {formatDateTime(user.lastSeenAt)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(user)}
                    disabled={deletingId === user.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/15 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingId === user.id
                      ? language === "Türkçe"
                        ? "Siliniyor"
                        : "Deleting"
                      : language === "Türkçe"
                        ? "Sil"
                        : "Delete"}
                  </button>
                </div>
              </div>
            ))}

            {!loading && filteredUsers.length === 0 && (
              <div className="p-12 text-center text-sm text-slate-500">
                {language === "Türkçe"
                  ? "Kullanıcı bulunamadı."
                  : "No users found."}
              </div>
            )}
          </div>
        </section>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDeleteTarget(null);
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl dark:border-red-500/15 dark:bg-[#06140e]">
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-500 dark:border-red-400/15 dark:bg-red-500/10 dark:text-red-300">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="delete-user-title"
                    className="text-lg font-bold text-slate-900 dark:text-white"
                  >
                    Kullanıcı silinsin mi?
                  </h2>
                  <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-300">
                    @{deleteTarget.username}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-400/20 dark:bg-red-500/10">
                <p className="text-sm font-semibold leading-6 text-red-700 dark:text-red-200">
                  {language === "Türkçe"
                    ? "Uyarı: Bu işlem geri alınamaz."
                    : "Warning: This action cannot be undone."}
                </p>
                <p className="mt-1 text-sm leading-6 text-red-700/80 dark:text-red-100/80">
                  {language === "Türkçe"
                    ? "Hesap, sohbet üyelikleri, gönderilen mesajlar ve push abonelikleri kaldırılacak."
                    : "The account, chat memberships, sent messages, and push subscriptions will be removed."}
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-100 dark:border-emerald-400/15 dark:bg-emerald-400/5 dark:text-slate-200 dark:hover:bg-emerald-400/10"
                >
                  {language === "Türkçe" ? "İptal" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={deletingId === deleteTarget.id}
                  onClick={() => {
                    const target = deleteTarget;
                    setDeleteTarget(null);
                    void deleteUser(target);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/15"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === deleteTarget.id
                    ? language === "Türkçe"
                      ? "Siliniyor..."
                      : "Deleting..."
                    : language === "Türkçe"
                      ? "Kullanıcıyı sil"
                      : "Delete user"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Light-mode refinement: admin panel only. */
        html:not(.dark) .mfb-admin-page {
          background:
            radial-gradient(
              circle at 85% 0%,
              rgba(91, 196, 132, 0.08),
              transparent 32%
            ),
            #f7faf8 !important;
          color: #183026 !important;
        }

        html:not(.dark) .mfb-admin-page header {
          border-color: rgba(44, 128, 78, 0.14) !important;
        }

        html:not(.dark) .mfb-admin-page header button:first-child {
          color: #668176 !important;
        }

        html:not(.dark) .mfb-admin-page header button:first-child:hover {
          color: #29965a !important;
        }

        html:not(.dark) .mfb-admin-page header p {
          color: #29965a !important;
        }

        html:not(.dark) .mfb-admin-page header h1,
        html:not(.dark) .mfb-admin-page h2,
        html:not(.dark) .mfb-admin-page section p,
        html:not(.dark) .mfb-admin-page .text-white {
          color: #183026 !important;
        }

        html:not(.dark) .mfb-admin-page header > button {
          border-color: rgba(44, 128, 78, 0.18) !important;
          background: rgba(44, 128, 78, 0.055) !important;
          color: #315c49 !important;
          box-shadow: 0 5px 16px rgba(33, 91, 57, 0.06);
        }

        html:not(.dark) .mfb-admin-page header > button:hover {
          background: rgba(44, 128, 78, 0.1) !important;
          color: #1f7e4b !important;
        }

        html:not(.dark) .mfb-admin-page section > div,
        html:not(.dark) .mfb-admin-page section.rounded-2xl {
          border-color: rgba(44, 128, 78, 0.13) !important;
          background: rgba(255, 255, 255, 0.88) !important;
          box-shadow: 0 8px 28px rgba(37, 86, 57, 0.045);
        }

        html:not(.dark) .mfb-admin-page section.mt-6 > div.rounded-2xl {
          background: rgba(255, 255, 255, 0.9) !important;
        }

        html:not(.dark) .mfb-admin-page .border-emerald-500\/10,
        html:not(.dark) .mfb-admin-page .divide-emerald-500\/10 {
          border-color: rgba(44, 128, 78, 0.12) !important;
        }

        html:not(.dark) .mfb-admin-page .text-slate-500 {
          color: #71867d !important;
        }

        html:not(.dark) .mfb-admin-page .text-slate-600 {
          color: #82968d !important;
        }

        html:not(.dark) .mfb-admin-page .text-slate-300 {
          color: #526b60 !important;
        }

        html:not(.dark) .mfb-admin-page .bg-black\/10 {
          background: rgba(39, 103, 66, 0.045) !important;
        }

        html:not(.dark) .mfb-admin-page .bg-emerald-400\/5 {
          background: rgba(55, 180, 105, 0.055) !important;
        }

        html:not(.dark) .mfb-admin-page .bg-emerald-400\/10 {
          background: rgba(55, 180, 105, 0.085) !important;
        }

        html:not(.dark) .mfb-admin-page .text-emerald-300,
        html:not(.dark) .mfb-admin-page .text-emerald-400\/70 {
          color: #3ca96b !important;
        }

        html:not(.dark) .mfb-admin-page input {
          color: #1f3a2d !important;
          caret-color: #29965a !important;
        }

        html:not(.dark) .mfb-admin-page input::placeholder {
          color: #91a39b !important;
          opacity: 1 !important;
        }

        html:not(.dark) .mfb-admin-page .hover\:bg-emerald-400\/10:hover {
          background: rgba(55, 180, 105, 0.1) !important;
        }

        html:not(.dark)
          .mfb-admin-page
          .hover\:bg-emerald-400\/\[0\.025\]:hover {
          background: rgba(55, 180, 105, 0.035) !important;
        }

        html:not(.dark) .mfb-admin-page .border-red-500\/15 {
          border-color: rgba(220, 76, 76, 0.18) !important;
        }

        html:not(.dark) .mfb-admin-page .bg-red-500\/5 {
          background: rgba(220, 76, 76, 0.055) !important;
        }

        html:not(.dark) .mfb-admin-page .text-red-300 {
          color: #c43f3f !important;
        }

        html:not(.dark) .mfb-admin-page button.inline-flex.shrink-0 {
          border-color: rgba(214, 75, 75, 0.2) !important;
          background: rgba(214, 75, 75, 0.045) !important;
          color: #c43f3f !important;
        }

        html:not(.dark) .mfb-admin-page button.inline-flex.shrink-0:hover {
          background: rgba(214, 75, 75, 0.09) !important;
        }
      `}</style>
    </main>
  );
}
