"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import {
  clearAccessToken,
  getAccessToken,
  refreshAccessToken,
  logoutSession,
} from "../lib/auth";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  Forward,
  Image as ImageIcon,
  Mail,
  MoreVertical,
  Paperclip,
  Pencil,
  Pin,
  Reply,
  Search,
  Settings,
  Smile,
  Trash2,
  X,
  Plus,
  MessageSquarePlus,
  FileText,
  Check,
  CheckCheck,
  Download,
  ShieldCheck,
  Clock3,
  ChevronDown,
  Sparkles,
  Eye,
  Camera,
  UserRound,
  KeyRound,
  LogOut,
  ShieldAlert,
  MonitorSmartphone,
  UserCheck,
  Globe2,
  CheckCircle2,
  CircleUserRound,
  Laptop2,
  Smartphone,
  Volume2,
  Mic,
  Square,
  Play,
  Pause,
  MessageSquareText,
  Eraser,
  AtSign,
  Palette,
  Moon,
  Sun,
  Languages,
  Accessibility,
  Database,
  Info,
  BellRing,
  VolumeX,
  RotateCcw,
} from "lucide-react";

type ConfirmationDialog = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

type UserProfile = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  avatarUrl?: string | null;
  displayName?: string | null;
  bio?: string | null;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  readReceipts: boolean;
  profilePhotoVisibility: "Everyone" | "Contacts" | "Nobody";
  bioVisibility: "Everyone" | "Contacts" | "Nobody";
  statusText?: string | null;
  statusEmoji?: string | null;
  statusExpiresAt?: string | null;
};

type GlobalSearchResult = {
  id: string;
  chatId: string;
  chatName: string;
  isGroup: boolean;
  senderId: string;
  senderUsername: string;
  content: string;
  sentAt: string;
};

type AIInlineAttachment = {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  size: number;
  kind: "image" | "file" | "audio";
};

type AIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sentAt: string;
  attachment?: AIInlineAttachment;
};

type Chat = {
  id: string;
  name: string;
  isGroup: boolean;
  createdAt: string;
  avatarUrl?: string | null;
  otherUserId?: string | null;
  otherUsername?: string | null;
  otherAvatarUrl?: string | null;
  otherLastSeenAt?: string | null;
  isArchived?: boolean;
  isPinned?: boolean;
  isMarkedUnread?: boolean;
};

type UserSearchResult = {
  id: string;
  username: string;
};

type ChatMember = {
  userId: string;
  username: string;
  email: string;
  joinedAt: string;
  isOwner: boolean;
  isAdmin: boolean;
  role: "Owner" | "Admin" | "Member" | string;
};

type PresenceUser = {
  userId: string;
  username: string;
};

type ChatMessage = {
  id?: string;
  chatId?: string;
  content: string;
  senderUsername?: string;
  senderId?: string;
  sentAt?: string;
  editedAt?: string | null;
  isRead?: boolean;
  attachmentUrl?: string | null;
  attachmentFileName?: string | null;
  attachmentContentType?: string | null;
  attachmentSize?: number | null;
  replyToMessageId?: string | null;
  replyToSenderUsername?: string | null;
  replyToContent?: string | null;
  reactions?: { emoji: string; count: number; reactedByMe?: boolean }[];
  isPinned?: boolean;
  pinnedAt?: string | null;
  pinnedByUserId?: string | null;
};

type Attachment = {
  url: string;
  fileName: string;
  contentType: string;
  size: number;
};

const QUICK_EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "😮",
  "😢",
  "😡",
  "👍",
  "👏",
  "🔥",
  "❤️",
  "🎉",
  "🚀",
  "💯",
  "🙏",
];

const EMOJI_CATEGORIES = {
  "Sık kullanılan": [
    "😀",
    "😂",
    "😍",
    "🥰",
    "😎",
    "🤔",
    "👍",
    "👏",
    "🔥",
    "❤️",
    "🎉",
    "🚀",
    "💯",
    "🙏",
  ],
  "Yüz ifadeleri": [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😍",
    "🥰",
    "😎",
    "🤔",
    "😮",
    "😢",
    "😭",
    "😡",
    "😱",
    "🥳",
    "😴",
    "🤩",
    "😇",
    "🙄",
    "😏",
  ],
  "El hareketleri": [
    "👍",
    "👎",
    "👏",
    "🙌",
    "🙏",
    "🤝",
    "👋",
    "🤞",
    "✌️",
    "🤟",
    "👌",
    "💪",
    "🫶",
    "☝️",
    "✋",
    "👀",
  ],
  Semboller: [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "💔",
    "🔥",
    "⭐",
    "✨",
    "💯",
    "✅",
    "❌",
    "⚡",
    "💡",
    "🎉",
    "🎊",
    "🚀",
    "💎",
    "🏆",
    "🎯",
  ],
} as const;

type EmojiCategory = keyof typeof EMOJI_CATEGORIES;

const PROFILE_VISIBILITY_OPTIONS = [
  { value: "Everyone", label: "Everyone", description: "Anyone can see it." },
  {
    value: "Contacts",
    label: "Contacts",
    description: "Only people you chat with.",
  },
  { value: "Nobody", label: "Nobody", description: "Keep it private." },
] as const;

const STATUS_DURATION_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
  { value: "today", label: "Today" },
] as const;

type GifItem = {
  id: string;
  label: string;
  url: string;
};

const QUICK_GIFS: GifItem[] = [
  {
    id: "edE0oMB7nDYIdMeQph",
    label: "Hello",
    url: "https://media.giphy.com/media/edE0oMB7nDYIdMeQph/giphy.gif",
  },
  {
    id: "h3XEXN3ChzunLipKQ5",
    label: "Hey",
    url: "https://media.giphy.com/media/h3XEXN3ChzunLipKQ5/giphy.gif",
  },
  {
    id: "rMBScPGD3Hx2hV4bkt",
    label: "What's up",
    url: "https://media.giphy.com/media/rMBScPGD3Hx2hV4bkt/giphy.gif",
  },
  {
    id: "xUPGcigl4eOfc6hA5y",
    label: "Welcome",
    url: "https://media.giphy.com/media/xUPGcigl4eOfc6hA5y/giphy.gif",
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function pushSubscriptionToJson(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint ?? subscription.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  };
}

const getAttachmentUrl = (url?: string | null) => {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${API_URL}${url}`;
};

function VoiceMessagePlayer({
  src,
  isTurkish,
  preview = false,
}: {
  src: string;
  isTurkish: boolean;
  preview?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const formatTime = (value: number) => {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Number(event.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div
      className={`w-[min(390px,72vw)] rounded-2xl border p-3 shadow-sm ${
        preview
          ? "border-emerald-400/20 bg-emerald-400/[0.06]"
          : "border-emerald-400/10 bg-black/10 dark:bg-white/[0.03]"
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          setDuration(Number.isFinite(value) ? value : 0);
        }}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onRateChange={(event) =>
          setPlaybackRate(event.currentTarget.playbackRate)
        }
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#052016] shadow-[0_6px_20px_rgba(52,211,153,0.18)] transition hover:scale-[1.03] hover:bg-emerald-300"
          aria-label={
            playing
              ? isTurkish
                ? "Duraklat"
                : "Pause"
              : isTurkish
                ? "Oynat"
                : "Play"
          }
        >
          {playing ? (
            <Pause className="h-4 w-4" fill="currentColor" strokeWidth={2} />
          ) : (
            <Play
              className="ml-0.5 h-4 w-4"
              fill="currentColor"
              strokeWidth={2}
            />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-emerald-300" strokeWidth={1.8} />
              <span className="text-[11px] font-semibold text-emerald-200">
                {isTurkish ? "Sesli mesaj" : "Voice message"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cyclePlaybackRate}
                className="rounded-full border border-emerald-400/20 bg-black/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
                title={
                  isTurkish
                    ? "Oynatma hızını değiştir"
                    : "Change playback speed"
                }
                aria-label={
                  isTurkish
                    ? `Oynatma hızı ${playbackRate}x`
                    : `Playback speed ${playbackRate}x`
                }
              >
                {playbackRate}x
              </button>
              <span className="font-mono text-[10px] text-slate-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          <div className="flex h-7 items-center gap-[2px]">
            {[
              4, 8, 13, 9, 16, 11, 19, 14, 7, 17, 12, 20, 10, 15, 8, 18, 13, 6,
              16, 11, 19, 9, 14, 7, 17, 10, 15, 8, 18, 12, 6, 14, 9, 17, 11, 19,
            ].map((height, index) => (
              <span
                key={index}
                className={`w-[3px] rounded-full transition-opacity ${
                  duration > 0 && currentTime / duration > index / 36
                    ? "bg-emerald-300 opacity-100"
                    : "bg-emerald-400/30 opacity-80"
                }`}
                style={{ height: `${height}px` }}
              />
            ))}
          </div>

          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={Math.min(currentTime, duration || 0)}
            onChange={seek}
            disabled={!duration}
            className="mt-0.5 h-1 w-full cursor-pointer accent-emerald-400 disabled:cursor-default"
            aria-label={isTurkish ? "Ses ilerlemesi" : "Audio progress"}
          />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "reconnecting" | "disconnected"
  >("disconnected");

  const [chats, setChats] = useState<Chat[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [conversationSearch, setConversationSearch] = useState("");
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<
    GlobalSearchResult[]
  >([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [searchTargetMessageId, setSearchTargetMessageId] = useState<
    string | null
  >(null);
  const [mutedChatIds, setMutedChatIds] = useState<Set<string>>(new Set());
  const [forwardingMessage, setForwardingMessage] =
    useState<ChatMessage | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSound, setNotificationSound] = useState(true);
  const [notificationPreview, setNotificationPreview] = useState(true);
  const [mentionNotifications, setMentionNotifications] = useState(true);
  const [notificationMode, setNotificationMode] = useState<
    "all" | "direct" | "mentions" | "none"
  >("all");
  const [settingsResetConfirm, setSettingsResetConfirm] = useState(false);
  const [deleteDataConfirm, setDeleteDataConfirm] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const notificationPrefsRef = useRef({
    enabled: false,
    sound: true,
    preview: true,
    mentions: true,
    mode: "all" as "all" | "direct" | "mentions" | "none",
    quietEnabled: false,
    quietStart: "23:00",
    quietEnd: "08:00",
    snoozeUntil: null as number | null,
  });
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<
    string | null
  >(null);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [mobileActionMessageId, setMobileActionMessageId] = useState<
    string | null
  >(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chatViewportRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const previousMessageCountRef = useRef(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pendingVoiceFile, setPendingVoiceFile] = useState<File | null>(null);
  const [pendingVoiceUrl, setPendingVoiceUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingİptalledRef = useRef(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] =
    useState<EmojiCategory>("Sık kullanılan");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(
    QUICK_EMOJIS.slice(0, 12),
  );
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState<GifItem[]>(QUICK_GIFS);
  const [recentGifs, setRecentGifs] = useState<GifItem[]>([]);
  const [quickGifs, setQuickGifs] = useState<GifItem[]>(QUICK_GIFS);
  const [gifQuickEditOpen, setGifQuickEditOpen] = useState(false);
  const [gifSearching, setGifSearching] = useState(false);
  const [gifSearchError, setGifSearchError] = useState("");

  useEffect(() => {
    try {
      const storedRecent = localStorage.getItem("mfb-chat-recent-gifs");
      if (storedRecent) {
        const parsedRecent = JSON.parse(storedRecent);
        if (Array.isArray(parsedRecent)) {
          setRecentGifs(
            parsedRecent
              .filter(
                (item): item is GifItem =>
                  item &&
                  typeof item.id === "string" &&
                  typeof item.label === "string" &&
                  typeof item.url === "string",
              )
              .slice(0, 8),
          );
        }
      }

      const storedQuick = localStorage.getItem("mfb-chat-quick-gifs");
      if (storedQuick) {
        const parsedQuick = JSON.parse(storedQuick);
        if (Array.isArray(parsedQuick)) {
          const validQuick = parsedQuick
            .filter(
              (item): item is GifItem =>
                item &&
                typeof item.id === "string" &&
                typeof item.label === "string" &&
                typeof item.url === "string",
            )
            .slice(0, 4);
          if (validQuick.length > 0) setQuickGifs(validQuick);
        }
      }
    } catch {}
  }, []);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement | null>(null);
  const aiImageInputRef = useRef<HTMLInputElement | null>(null);
  const [typingUsers, setTypingUsers] = useState<PresenceUser[]>([]);
  const [onlineUsersByChat, setOnlineUsersByChat] = useState<
    Record<string, PresenceUser[]>
  >({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const markedAsReadRef = useRef<Set<string>>(new Set());
  const selectedChatIdRef = useRef("");

  const [username, setUsername] = useState("Mehmet");
  const [currentUserId, setCurrentUserId] = useState("");
  const currentUserIdRef = useRef("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [showAllSharedMedia, setShowAllSharedMedia] = useState(false);
  const [showAllSharedFiles, setShowAllSharedFiles] = useState(false);
  const [sharedMediaOpen, setSharedMediaOpen] = useState(false);
  const [sharedLinksOpen, setSharedLinksOpen] = useState(false);
  const [sharedFilesOpen, setSharedFilesOpen] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [messageDensity, setMessageDensity] = useState<
    "compact" | "standard" | "comfortable"
  >("standard");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [largerText, setLargerText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [language, setLanguage] = useState<"English" | "Türkçe">("English");
  const [chatWallpaper, setChatWallpaper] = useState<"none" | "custom">("none");
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState("");
  const [wallpaperFit, setWallpaperFit] = useState<"contain" | "cover">(
    "contain",
  );
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState("23:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:00");
  const [notificationSnoozeUntil, setNotificationSnoozeUntil] = useState<
    number | null
  >(null);
  const [storageEstimate, setStorageEstimate] = useState("Checking…");
  const [storageUsagePercent, setStorageUsagePercent] = useState(0);
  const [mobileChatListOpen, setMobileChatListOpen] = useState(true);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileShowOnlineStatus, setProfileShowOnlineStatus] = useState(true);
  const [profileShowLastSeen, setProfileShowLastSeen] = useState(true);
  const [profileReadReceipts, setProfileReadReceipts] = useState(true);
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState<
    "Everyone" | "Contacts" | "Nobody"
  >("Everyone");
  const [profileBioVisibility, setProfileBioVisibility] = useState<
    "Everyone" | "Contacts" | "Nobody"
  >("Everyone");
  const [profileStatusText, setProfileStatusText] = useState("");
  const [profileStatusEmoji, setProfileStatusEmoji] = useState("🟢");
  const [profileStatusDuration, setProfileStatusDuration] = useState<
    "never" | "1h" | "4h" | "today"
  >("never");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingProfileAvatar, setUploadingProfileAvatar] = useState(false);
  const profileAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [accountAction, setAccountAction] = useState<
    "password" | "sessions" | "delete" | null
  >(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [accountSecurityOpen, setAccountSecurityOpen] = useState(false);
  const [profileInfoOpen, setProfileInfoOpen] = useState(false);
  const [profileCompletionOpen, setProfileCompletionOpen] = useState(false);
  const [profileStatusOpen, setProfileStatusOpen] = useState(false);
  const [profilePrivacyOpen, setProfilePrivacyOpen] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialog | null>(null);
  const [messageDeleteDialog, setMessageDeleteDialog] =
    useState<ChatMessage | null>(null);

  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(profile?.avatarUrl),
      profileUsername.trim().length >= 3,
      profileDisplayName.trim().length > 0,
      profileBio.trim().length > 0,
      profileStatusText.trim().length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [
    profile?.avatarUrl,
    profileUsername,
    profileDisplayName,
    profileBio,
    profileStatusText,
  ]);

  const statusPresets = [
    { emoji: "🟢", label: "Available" },
    { emoji: "💻", label: "Working" },
    { emoji: "📚", label: "Studying" },
    { emoji: "🔕", label: "Do not disturb" },
    { emoji: "⏳", label: "Be right back" },
  ];

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [aiMode, setAiMode] = useState(true);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAttachment, setAiAttachment] = useState<AIInlineAttachment | null>(
    null,
  );
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<
    UserSearchResult[]
  >([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [groupMemberResults, setGroupMemberResults] = useState<
    UserSearchResult[]
  >([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<
    UserSearchResult[]
  >([]);
  const [searchingGroupMembers, setSearchingGroupMembers] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupNameError, setEditGroupNameError] = useState("");
  const [groupAvatarRemoved, setGroupAvatarRemoved] = useState(false);
  const [updatingGroupName, setUpdatingGroupName] = useState(false);
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [manageGroupOpen, setManageGroupOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<ChatMember[]>([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
  const [manageMemberSearch, setManageMemberSearch] = useState("");
  const [manageMemberResults, setManageMemberResults] = useState<
    UserSearchResult[]
  >([]);
  const [searchingManageMembers, setSearchingManageMembers] = useState(false);
  const [memberActionUserId, setMemberActionUserId] = useState<string | null>(
    null,
  );
  const [memberMenuUserId, setMemberMenuUserId] = useState<string | null>(null);

  const openSettings = () => {
    setSettingsOpen(true);
    setError("");
  };

  const closeSettings = () => {
    setSettingsOpen(false);
  };

  const openProfile = () => {
    setProfileUsername(profile?.username ?? username);
    setProfileDisplayName(profile?.displayName ?? "");
    setProfileBio(profile?.bio ?? "");
    setProfileShowOnlineStatus(profile?.showOnlineStatus ?? true);
    setProfileShowLastSeen(profile?.showLastSeen ?? true);
    setProfileReadReceipts(profile?.readReceipts ?? true);
    setProfilePhotoVisibility(profile?.profilePhotoVisibility ?? "Everyone");
    setProfileBioVisibility(profile?.bioVisibility ?? "Everyone");
    setProfileStatusText(profile?.statusText ?? "");
    setProfileStatusEmoji(profile?.statusEmoji ?? "🟢");
    const expiresAt = profile?.statusExpiresAt
      ? new Date(profile.statusExpiresAt).getTime()
      : 0;
    const now = Date.now();
    if (!expiresAt || expiresAt <= now) setProfileStatusDuration("never");
    else if (expiresAt - now <= 60 * 60 * 1000 + 60_000)
      setProfileStatusDuration("1h");
    else if (expiresAt - now <= 4 * 60 * 60 * 1000 + 60_000)
      setProfileStatusDuration("4h");
    else setProfileStatusDuration("today");
    setProfileOpen(true);
    setError("");
  };

  const closeProfile = () => {
    if (savingProfile || uploadingProfileAvatar) return;
    setProfileOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTheme = localStorage.getItem("chatapp-theme");
    const initialTheme: "dark" | "light" =
      storedTheme === "light" ? "light" : "dark";
    setTheme(initialTheme);

    const storedDensity = localStorage.getItem("chatapp-message-density");
    setMessageDensity(
      storedDensity === "compact" ||
        storedDensity === "comfortable" ||
        storedDensity === "standard"
        ? (storedDensity as "compact" | "standard" | "comfortable")
        : "standard",
    );
    setAnimationsEnabled(
      localStorage.getItem("chatapp-animations") !== "false",
    );
    setLargerText(localStorage.getItem("chatapp-larger-text") === "true");
    setHighContrast(localStorage.getItem("chatapp-high-contrast") === "true");
    setReduceMotion(localStorage.getItem("chatapp-reduce-motion") === "true");

    const storedLanguage = localStorage.getItem("chatapp-language");
    setLanguage(storedLanguage === "Türkçe" ? "Türkçe" : "English");

    const storedWallpaper = localStorage.getItem("chatapp-wallpaper");
    const storedCustomWallpaper = localStorage.getItem(
      "chatapp-custom-wallpaper",
    );
    if (storedWallpaper === "custom" && storedCustomWallpaper) {
      setChatWallpaper("custom");
      setCustomWallpaperUrl(storedCustomWallpaper);
    } else {
      setChatWallpaper("none");
    }

    const storedWallpaperFit = localStorage.getItem("chatapp-wallpaper-fit");
    setWallpaperFit(storedWallpaperFit === "cover" ? "cover" : "contain");

    setQuietHoursEnabled(
      localStorage.getItem("chatapp-quiet-hours") === "true",
    );
    setQuietHoursStart(localStorage.getItem("chatapp-quiet-start") ?? "23:00");
    setQuietHoursEnd(localStorage.getItem("chatapp-quiet-end") ?? "08:00");
    const storedSnooze = Number(
      localStorage.getItem("chatapp-notification-snooze-until") ?? "0",
    );
    setNotificationSnoozeUntil(storedSnooze > Date.now() ? storedSnooze : null);

    const applyTheme = (value: "dark" | "light") => {
      document.documentElement.classList.toggle("dark", value === "dark");
      document.documentElement.dataset.theme = value;
    };

    applyTheme(initialTheme);

    if ("storage" in navigator && "estimate" in navigator.storage) {
      void navigator.storage
        .estimate()
        .then((estimate) => {
          const usage = estimate.usage ?? 0;
          const quota = estimate.quota ?? 0;
          if (quota > 0) {
            setStorageUsagePercent(
              Math.min(100, Math.max(0, Math.round((usage / quota) * 100))),
            );
            setStorageEstimate(
              `${(usage / 1024 / 1024).toFixed(1)} MB used of ${(quota / 1024 / 1024).toFixed(0)} MB`,
            );
          } else {
            setStorageUsagePercent(0);
            setStorageEstimate(`${(usage / 1024 / 1024).toFixed(1)} MB used`);
          }
        })
        .catch(() => setStorageEstimate("Unavailable"));
    } else {
      setStorageEstimate("Unavailable");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    root.dataset.messageDensity = messageDensity;
    root.dataset.chatWallpaper = chatWallpaper;
    root.classList.toggle("chat-larger-text", largerText);
    root.classList.toggle("chat-high-contrast", highContrast);
    root.classList.toggle(
      "chat-reduce-motion",
      reduceMotion || !animationsEnabled,
    );
  }, [
    messageDensity,
    chatWallpaper,
    largerText,
    highContrast,
    reduceMotion,
    animationsEnabled,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && settingsOpen) {
        closeSettings();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder="Search conversations..."]',
        );
        searchInput?.focus();
      }

      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setMessageSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen]);

  const changeTheme = (nextTheme: "dark" | "light") => {
    setTheme(nextTheme);
    localStorage.setItem("chatapp-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.dataset.theme = nextTheme;
    setSettingsSaved(false);
  };

  const setSettingsPreference = <T,>(
    setter: Dispatch<SetStateAction<T>>,
    key: string,
    value: T,
  ) => {
    setter(value);
    localStorage.setItem(key, String(value));
    setSettingsSaved(false);
  };

  const testNotification = () => {
    if (!("Notification" in window)) {
      setError("This browser does not support notifications.");
      return;
    }
    if (Notification.permission !== "granted") {
      setError("Enable browser notifications first.");
      return;
    }
    new Notification("MFB Chat", {
      body: notificationPreview
        ? "Test notification — your browser notifications are working correctly."
        : "Test notification from MFB Chat.",
    });
  };

  const isQuietHours = () => {
    if (!quietHoursEnabled) return false;
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = quietHoursStart.split(":").map(Number);
    const [endH, endM] = quietHoursEnd.split(":").map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (start === end) return true;
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
  };

  const clearLocalPreferences = () => {
    setSettingsResetConfirm(true);
  };

  const deleteLocalData = () => {
    setDeleteDataConfirm(true);
  };

  const performDeleteLocalData = async () => {
    const chatsToDelete = [...chats];

    for (const chat of chatsToDelete) {
      await updateChatState(chat.id, { deleteChat: true });
    }

    setDeleteDataConfirm(false);
  };

  const performResetLocalPreferences = () => {
    [
      "chatapp-theme",
      "chatapp-message-density",
      "chatapp-animations",
      "chatapp-larger-text",
      "chatapp-high-contrast",
      "chatapp-reduce-motion",
      "chatapp-language",
      "chatapp-wallpaper",
      "chatapp-wallpaper-fit",
      "chatapp-wallpaper-scale",
      "chatapp-quiet-hours",
      "chatapp-quiet-start",
      "chatapp-quiet-end",
      "chatapp-notification-sound",
      "chatapp-notification-preview",
      "chatapp-notification-mentions",
      "chatapp-notification-mode",
    ].forEach((key) => localStorage.removeItem(key));

    setTheme("dark");
    setMessageDensity("standard");
    setAnimationsEnabled(true);
    setLargerText(false);
    setHighContrast(false);
    setReduceMotion(false);
    setLanguage("English");
    setChatWallpaper("none");
    setCustomWallpaperUrl("");
    localStorage.removeItem("chatapp-wallpaper");
    localStorage.removeItem("chatapp-custom-wallpaper");
    localStorage.removeItem("chatapp-wallpaper-fit");
    localStorage.removeItem("chatapp-wallpaper-scale");
    setWallpaperFit("contain");
    setQuietHoursEnabled(false);
    setQuietHoursStart("23:00");
    setQuietHoursEnd("08:00");
    setNotificationSnoozeUntil(null);
    localStorage.removeItem("chatapp-notification-snooze-until");
    setNotificationSound(true);
    setNotificationPreview(true);
    setMentionNotifications(true);
    setNotificationMode("all");
    document.documentElement.classList.add("dark");
    setSettingsResetConfirm(false);
    setSettingsSaved(true);
    window.setTimeout(() => setSettingsSaved(false), 1400);
    setError("");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncMobileView = () => {
      if (!media.matches) setMobileChatListOpen(false);
    };
    syncMobileView();
    media.addEventListener?.("change", syncMobileView);
    return () => media.removeEventListener?.("change", syncMobileView);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const granted =
      "Notification" in window && Notification.permission === "granted";
    const stored = localStorage.getItem("chatapp-browser-notifications");
    setNotificationsEnabled(granted && stored !== "false");
    setNotificationSound(
      localStorage.getItem("chatapp-notification-sound") !== "false",
    );
    setNotificationPreview(
      localStorage.getItem("chatapp-notification-preview") !== "false",
    );
    setMentionNotifications(
      localStorage.getItem("chatapp-notification-mentions") !== "false",
    );
    const storedNotificationMode = localStorage.getItem(
      "chatapp-notification-mode",
    );
    setNotificationMode(
      storedNotificationMode === "direct" ||
        storedNotificationMode === "mentions" ||
        storedNotificationMode === "none"
        ? storedNotificationMode
        : "all",
    );

    if (granted && stored !== "false") {
      void registerWebPush().catch((pushError) => {
        console.warn("Web Push re-registration failed:", pushError);
      });
    }
  }, []);

  useEffect(() => {
    notificationPrefsRef.current = {
      enabled: notificationsEnabled,
      sound: notificationSound,
      preview: notificationPreview,
      mentions: mentionNotifications,
      mode: notificationMode,
      quietEnabled: quietHoursEnabled,
      quietStart: quietHoursStart,
      quietEnd: quietHoursEnd,
      snoozeUntil: notificationSnoozeUntil,
    };
  }, [
    notificationsEnabled,
    notificationSound,
    notificationPreview,
    mentionNotifications,
    notificationMode,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    notificationSnoozeUntil,
  ]);

  useEffect(() => {
    if (!notificationSnoozeUntil) return;
    const remaining = notificationSnoozeUntil - Date.now();
    if (remaining <= 0) {
      setNotificationSnoozeUntil(null);
      localStorage.removeItem("chatapp-notification-snooze-until");
      return;
    }
    const timer = window.setTimeout(() => {
      setNotificationSnoozeUntil(null);
      localStorage.removeItem("chatapp-notification-snooze-until");
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [notificationSnoozeUntil]);

  useEffect(() => {
    if (!profileOpen) return;
    const query = profileUsername.trim();
    const original = (profile?.username ?? username).trim();
    if (query.length < 3 || query.toLowerCase() === original.toLowerCase()) {
      setUsernameAvailability(query.length >= 3 ? "available" : "idle");
      return;
    }

    let cancelled = false;
    setUsernameAvailability("checking");
    const timer = setTimeout(async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const response = await fetch(
          `${API_URL}/api/Users/username-availability?username=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await response.json().catch(() => null);
        if (!cancelled)
          setUsernameAvailability(
            response.ok && data?.available ? "available" : "taken",
          );
      } catch {
        if (!cancelled) setUsernameAvailability("idle");
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [profileUsername, profileOpen, profile?.username, username]);

  const setNotificationPreference = (
    key: string,
    value: boolean,
    setter: Dispatch<SetStateAction<boolean>>,
  ) => {
    setter(value);
    localStorage.setItem(key, String(value));
    setSettingsSaved(false);
  };

  const setNotificationModePreference = (
    value: "all" | "direct" | "mentions" | "none",
  ) => {
    setNotificationMode(value);
    localStorage.setItem("chatapp-notification-mode", value);
    setSettingsSaved(false);
  };

  const pauseNotifications = (minutes: number) => {
    const until = Date.now() + minutes * 60_000;
    setNotificationSnoozeUntil(until);
    localStorage.setItem("chatapp-notification-snooze-until", String(until));
    setSettingsSaved(false);
  };

  const clearNotificationPause = () => {
    setNotificationSnoozeUntil(null);
    localStorage.removeItem("chatapp-notification-snooze-until");
    setSettingsSaved(false);
  };

  const getNotificationPauseLabel = () => {
    if (!notificationSnoozeUntil || notificationSnoozeUntil <= Date.now())
      return "";
    const totalMinutes = Math.max(
      1,
      Math.ceil((notificationSnoozeUntil - Date.now()) / 60_000),
    );
    if (totalMinutes < 60)
      return st(`${totalMinutes} min remaining`, `${totalMinutes} dk kaldı`);
    const hours = Math.ceil(totalMinutes / 60);
    return st(`${hours}h remaining`, `${hours} saat kaldı`);
  };

  const updateProfile = async () => {
    const token = getAccessToken();
    const trimmedUsername = profileUsername.trim();
    const trimmedDisplayName = profileDisplayName.trim();
    const trimmedBio = profileBio.trim();

    if (!token || savingProfile) return;

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setError("Kullanıcı adı 3 ile 30 karakter arasında olmalıdır.");
      return;
    }

    if (trimmedDisplayName.length > 50) {
      setError("Görünen ad 50 karakterden uzun olamaz.");
      return;
    }

    if (trimmedBio.length > 160) {
      setError("Biyografi 160 karakterden uzun olamaz.");
      return;
    }

    if (usernameAvailability === "taken") {
      setError("This username is already taken.");
      return;
    }

    let statusExpiresAt: string | null = null;
    if (profileStatusDuration !== "never") {
      const expires = new Date();
      if (profileStatusDuration === "1h")
        expires.setHours(expires.getHours() + 1);
      if (profileStatusDuration === "4h")
        expires.setHours(expires.getHours() + 4);
      if (profileStatusDuration === "today") expires.setHours(23, 59, 59, 999);
      statusExpiresAt = expires.toISOString();
    }

    setSavingProfile(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/Users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: trimmedUsername,
          displayName: trimmedDisplayName || null,
          bio: trimmedBio || null,
          showOnlineStatus: profileShowOnlineStatus,
          showLastSeen: profileShowLastSeen,
          readReceipts: profileReadReceipts,
          profilePhotoVisibility,
          bioVisibility: profileBioVisibility,
          statusText: profileStatusText.trim() || null,
          statusEmoji: profileStatusEmoji.trim() || null,
          statusExpiresAt,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ?? `Profil güncellenemedi. HTTP ${response.status}`,
        );
      }

      setProfile((current) =>
        current
          ? { ...current, ...data, email: data?.email || current.email }
          : data,
      );
      setProfileUsername(data.username);
      setProfileDisplayName(data.displayName ?? "");
      setProfileBio(data.bio ?? "");
      setProfileShowOnlineStatus(data.showOnlineStatus ?? true);
      setProfileShowLastSeen(data.showLastSeen ?? true);
      setProfileReadReceipts(data.readReceipts ?? true);
      setProfilePhotoVisibility(data.profilePhotoVisibility ?? "Everyone");
      setProfileBioVisibility(data.bioVisibility ?? "Everyone");
      setProfileStatusText(data.statusText ?? "");
      setProfileStatusEmoji(data.statusEmoji ?? "🟢");
      setProfileStatusDuration("never");
      setUsername(data.username);
      localStorage.setItem("username", data.username);
      setError("");
      setProfileOpen(false);
    } catch (err) {
      console.error("Profil güncelleme hatası:", err);
      setError(err instanceof Error ? err.message : "Profil güncellenemedi.");
    } finally {
      setSavingProfile(false);
    }
  };

  const removeProfileAvatar = async () => {
    const token = getAccessToken();
    if (!token || uploadingProfileAvatar || savingProfile) return;

    setUploadingProfileAvatar(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/Users/me/avatar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ??
            `Profile photo could not be removed. HTTP ${response.status}`,
        );
      }
      setProfile((current) =>
        current ? { ...current, avatarUrl: null } : current,
      );
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Profile photo could not be removed.",
      );
    } finally {
      setUploadingProfileAvatar(false);
    }
  };

  const uploadProfileAvatar = async (file: File) => {
    const token = getAccessToken();

    if (!token || uploadingProfileAvatar) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Profil görseli 5 MB'dan büyük olamaz.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Sadece JPG, PNG, GIF veya WebP görselleri yükleyebilirsiniz.");
      return;
    }

    setUploadingProfileAvatar(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/Users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ??
            `Profil görseli güncellenemedi. HTTP ${response.status}`,
        );
      }

      setProfile((current) =>
        current ? { ...current, avatarUrl: data.avatarUrl } : current,
      );
    } catch (err) {
      console.error("Profil görseli güncelleme hatası:", err);
      setError(
        err instanceof Error ? err.message : "Profil görseli güncellenemedi.",
      );
    } finally {
      setUploadingProfileAvatar(false);
      if (profileAvatarInputRef.current)
        profileAvatarInputRef.current.value = "";
    }
  };

  const clearLocalSession = () => {
    clearAccessToken();
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    router.replace("/login");
  };

  const handleWallpaperFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Sadece görsel dosyaları seçebilirsiniz.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Sohbet arka planı 2 MB'dan büyük olamaz.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;

      setCustomWallpaperUrl(dataUrl);
      setChatWallpaper("custom");
      localStorage.setItem("chatapp-wallpaper", "custom");
      localStorage.setItem("chatapp-custom-wallpaper", dataUrl);
      setSettingsSaved(false);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const exportUserData = async () => {
    if (exportingData) return;
    const token = getAccessToken();
    if (!token) {
      setError("Oturum bulunamadı.");
      return;
    }

    setExportingData(true);
    setError("");
    try {
      const chatData = await Promise.all(
        chats.map(async (chat) => {
          try {
            const response = await fetch(`${API_URL}/api/Messages/${chat.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) return { ...chat, messages: [] };
            return { ...chat, messages: await response.json() };
          } catch {
            return { ...chat, messages: [] };
          }
        }),
      );

      const payload = {
        exportedAt: new Date().toISOString(),
        profile,
        chats: chatData,
        mutedChatIds: Array.from(mutedChatIds),
        localPreferences: {
          theme,
          messageDensity,
          animationsEnabled,
          largerText,
          highContrast,
          reduceMotion,
          language,
          chatWallpaper,
          quietHoursEnabled,
          quietHoursStart,
          quietHoursEnd,
          notificationSound,
          notificationPreview,
          mentionNotifications,
          notificationMode,
          notificationSnoozeUntil,
        },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mfb-chat-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Veriler dışa aktarılamadı.",
      );
    } finally {
      setExportingData(false);
    }
  };

  const logout = () => {
    void connection?.stop().catch(() => undefined);
    void logoutSession().catch(() => undefined);
    clearLocalSession();
  };

  const resetAccountAction = () => {
    if (accountActionLoading) return;
    setAccountAction(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setDeletePassword("");
    setDeleteConfirmation("");
  };

  const changePassword = async () => {
    const token = getAccessToken();
    if (!token || accountActionLoading) return;

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError(
        st(
          "New password must be between 8 and 128 characters.",
          "Yeni şifre 8 ile 128 karakter arasında olmalıdır.",
        ),
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(st("New passwords do not match.", "Yeni şifreler eşleşmiyor."));
      return;
    }

    setAccountActionLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/Users/me/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          data?.message ?? `Password change failed. HTTP ${response.status}`,
        );
      resetAccountAction();
      clearLocalSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed.");
    } finally {
      setAccountActionLoading(false);
    }
  };

  const logoutAllSessions = async () => {
    const token = getAccessToken();
    if (!token || accountActionLoading) return;

    setAccountActionLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/api/Users/me/logout-all-sessions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          data?.message ??
            `Could not sign out sessions. HTTP ${response.status}`,
        );
      resetAccountAction();
      clearLocalSession();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not sign out sessions.",
      );
      setAccountActionLoading(false);
    }
  };

  const deleteAccount = async () => {
    const token = getAccessToken();
    if (!token || accountActionLoading) return;

    if (deleteConfirmation !== "DELETE") {
      setError(
        st(
          "Type DELETE to confirm account deletion.",
          "Hesap silme işlemini onaylamak için DELETE yazın.",
        ),
      );
      return;
    }

    setAccountActionLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/Users/me`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: deletePassword,
          confirmation: deleteConfirmation,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          data?.message ?? `Account deletion failed. HTTP ${response.status}`,
        );
      resetAccountAction();
      clearLocalSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion failed.");
      setAccountActionLoading(false);
    }
  };

  useEffect(() => {
    if (!newChatOpen) return;

    const query = userSearch.trim();

    if (query.length < 2) {
      setUserSearchResults([]);
      setSearchingUsers(false);
      return;
    }

    const timer = setTimeout(async () => {
      const token = getAccessToken();

      if (!token) return;

      setSearchingUsers(true);

      try {
        const response = await fetch(
          `${API_URL}/api/Users/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Kullanıcı araması başarısız. Status: ${response.status}`,
          );
        }

        const data: UserSearchResult[] = await response.json();
        setUserSearchResults(data);
      } catch (err) {
        console.error("Kullanıcı arama hatası:", err);
        setUserSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearch, newChatOpen]);

  useEffect(() => {
    if (!groupOpen) return;

    const query = groupMemberSearch.trim();

    if (query.length < 2) {
      setGroupMemberResults([]);
      setSearchingGroupMembers(false);
      return;
    }

    const timer = setTimeout(async () => {
      const token = getAccessToken();

      if (!token) return;

      setSearchingGroupMembers(true);

      try {
        const response = await fetch(
          `${API_URL}/api/Users/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Kullanıcı araması başarısız. Status: ${response.status}`,
          );
        }

        const data: UserSearchResult[] = await response.json();

        setGroupMemberResults(
          data.filter(
            (user) =>
              user.id !== currentUserId &&
              !selectedGroupMembers.some((member) => member.id === user.id),
          ),
        );
      } catch (err) {
        console.error("Grup üyesi arama hatası:", err);
        setGroupMemberResults([]);
      } finally {
        setSearchingGroupMembers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [groupMemberSearch, groupOpen, currentUserId, selectedGroupMembers]);

  useEffect(() => {
    const activeChat = chats.find((chat) => chat.id === selectedChatId);

    if (!manageGroupOpen || !activeChat?.isGroup) return;

    const query = manageMemberSearch.trim();

    if (query.length < 2) {
      setManageMemberResults([]);
      setSearchingManageMembers(false);
      return;
    }

    const timer = setTimeout(async () => {
      const token = getAccessToken();
      if (!token) return;

      setSearchingManageMembers(true);

      try {
        const response = await fetch(
          `${API_URL}/api/Users/search?q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Kullanıcı araması başarısız. Status: ${response.status}`,
          );
        }

        const data: UserSearchResult[] = await response.json();

        setManageMemberResults(
          data.filter(
            (user) =>
              user.id !== currentUserId &&
              !groupMembers.some((member) => member.userId === user.id),
          ),
        );
      } catch (err) {
        console.error("Grup üyesi arama hatası:", err);
        setManageMemberResults([]);
      } finally {
        setSearchingManageMembers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    manageMemberSearch,
    manageGroupOpen,
    chats,
    selectedChatId,
    currentUserId,
    groupMembers,
  ]);

  const selectedChatOnlineUsers = selectedChatId
    ? (onlineUsersByChat[selectedChatId] ?? [])
    : [];

  const otherOnlineUsers = selectedChatOnlineUsers.filter(
    (user) => user.userId !== currentUserId,
  );

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  const hasNoConversations = !loadingChats && chats.length === 0;

  const sharedAttachments = useMemo(
    () =>
      messages
        .filter((message) => Boolean(message.attachmentUrl))
        .slice()
        .reverse(),
    [messages],
  );

  const sharedMedia = sharedAttachments.filter((message) =>
    message.attachmentContentType?.startsWith("image/"),
  );

  const sharedFiles = sharedAttachments.filter(
    (message) => !message.attachmentContentType?.startsWith("image/"),
  );

  const sharedLinks = useMemo(() => {
    const seen = new Set<string>();
    const links: { url: string; messageId?: string }[] = [];

    for (const message of messages) {
      const matches = message.content?.match(/https?:\/\/[^\s]+/gi) ?? [];
      for (const raw of matches) {
        const url = raw.replace(/[),.!?]+$/g, "");
        if (!seen.has(url)) {
          seen.add(url);
          links.push({ url, messageId: message.id });
        }
      }
    }

    return links.slice(0, 6);
  }, [messages]);

  const filteredChats = useMemo(() => {
    const query = conversationSearch.trim().toLocaleLowerCase("tr-TR");

    if (!query) return chats;

    return chats.filter((chat) =>
      chat.name.toLocaleLowerCase("tr-TR").includes(query),
    );
  }, [chats, conversationSearch]);

  useEffect(() => {
    const query = messageSearch.trim();
    if (!messageSearchOpen || query.length < 2) {
      setGlobalSearchResults([]);
      setSearchingGlobal(false);
      return;
    }

    if (aiMode) {
      const normalizedQuery = query.toLocaleLowerCase("tr-TR");
      const aiResults: GlobalSearchResult[] = aiMessages
        .filter((message) =>
          message.content.toLocaleLowerCase("tr-TR").includes(normalizedQuery),
        )
        .slice(-20)
        .reverse()
        .map((message) => ({
          id: message.id,
          chatId: "",
          chatName: "MFB AI",
          isGroup: false,
          senderId: message.role === "assistant" ? "mfb-ai" : "me",
          senderUsername: message.role === "assistant" ? "MFB AI" : "Sen",
          content: message.content,
          sentAt: message.sentAt,
        }));

      setGlobalSearchResults(aiResults);
      setSearchingGlobal(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const token = getAccessToken();
      if (!token) return;
      setSearchingGlobal(true);
      try {
        const response = await fetch(
          `${API_URL}/api/Messages/search?q=${encodeURIComponent(query)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Global search failed");
        const data: GlobalSearchResult[] = await response.json();
        setGlobalSearchResults(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError")
          console.error("Global message search error:", err);
      } finally {
        setSearchingGlobal(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [messageSearch, messageSearchOpen, aiMode, aiMessages]);

  const messageSearchResultCount = useMemo(() => {
    const query = messageSearch.trim();
    if (!query) return 0;

    const escaped = query.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "giu");

    return messages.reduce((total, message) => {
      return total + (message.content.match(regex)?.length ?? 0);
    }, 0);
  }, [messages, messageSearch]);

  const highlightMessage = (content: string) => {
    const query = messageSearch.trim();
    if (!query) return content;

    const escaped = query.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
    const parts = content.split(new RegExp(`(${escaped})`, "giu"));
    const normalizedQuery = query.toLocaleLowerCase("tr-TR");

    return parts.map((part, index) =>
      part.toLocaleLowerCase("tr-TR") === normalizedQuery ? (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-yellow-300 px-0.5 text-slate-950 dark:bg-yellow-400"
        >
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      ),
    );
  };

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const token = getAccessToken();
      const restored = token ? true : await refreshAccessToken();

      if (cancelled) return;

      if (!restored) {
        router.replace("/login");
        return;
      }

      setAuthReady(true);
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!authReady) return;

    const timer = window.setInterval(
      async () => {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          clearLocalSession();
        }
      },
      10 * 60 * 1000,
    );

    return () => window.clearInterval(timer);
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;

    const loadChats = async () => {
      const token = getAccessToken();
      const storedUsername = localStorage.getItem("username");
      const storedUserId = localStorage.getItem("userId");

      if (storedUsername) setUsername(storedUsername);
      if (storedUserId) {
        setCurrentUserId(storedUserId);
        currentUserIdRef.current = storedUserId;
      }

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/Chats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          clearLocalSession();
          return;
        }

        if (!response.ok) {
          throw new Error(`Sohbetler alınamadı. Status: ${response.status}`);
        }

        const data: Chat[] = await response.json();

        console.log("Gerçek sohbetler:", data);
        setChats(data);

        if (data.length > 0) {
          const requestedChatId = new URLSearchParams(
            window.location.search,
          ).get("chatId");
          const requestedChat = requestedChatId
            ? data.find((chat) => chat.id === requestedChatId)
            : null;
          setSelectedChatId(requestedChat?.id ?? data[0].id);
        }
      } catch (err) {
        console.error("Sohbet listesi yüklenirken hata:", err);
        setError("Sohbetler yüklenemedi.");
      } finally {
        setLoadingChats(false);
      }
    };

    loadChats();
  }, [authReady, router]);

  useEffect(() => {
    if (!authReady) return;

    const loadAdminStatus = async () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/api/Admin/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(Boolean(data.isAdmin));
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    };

    void loadAdminStatus();
  }, [authReady]);

  useEffect(() => {
    const loadProfile = async () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/api/Users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Profil alınamadı. HTTP ${response.status}`);
        }

        const data: UserProfile = await response.json();
        setProfile(data);
        setUsername(data.username);
        setProfileUsername(data.username);
        setProfileDisplayName(data.displayName ?? "");
        setProfileBio(data.bio ?? "");
        setProfileShowOnlineStatus(data.showOnlineStatus ?? true);
        setProfileShowLastSeen(data.showLastSeen ?? true);
        setProfileReadReceipts(data.readReceipts ?? true);
        setProfilePhotoVisibility(data.profilePhotoVisibility ?? "Everyone");
        setProfileBioVisibility(data.bioVisibility ?? "Everyone");
        setProfileStatusText(data.statusText ?? "");
        setProfileStatusEmoji(data.statusEmoji ?? "🟢");
        localStorage.setItem("username", data.username);
      } catch (err) {
        console.error("Profil yükleme hatası:", err);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const loadMutes = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/api/Chats/mutes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const ids: string[] = await response.json();
        setMutedChatIds(new Set(ids));
      } catch (err) {
        console.error("Mute settings could not be loaded:", err);
      }
    };
    loadMutes();
  }, []);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      const token = getAccessToken();

      if (!token) return;

      setLoadingMessages(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/Messages/${selectedChatId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Mesajlar alınamadı. Status: ${response.status}`);
        }

        const data: ChatMessage[] = await response.json();

        setMessages(data);
      } catch (err) {
        console.error("Mesaj geçmişi yüklenirken hata:", err);
        setError("Mesajlar yüklenemedi.");
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedChatId]);

  useEffect(() => {
    const viewport = chatViewportRef.current;
    if (!viewport) return;

    const activeList: Array<{ senderId?: string; role?: string }> = aiMode
      ? aiMessages
      : messages;
    const count = activeList.length;
    const previousCount = previousMessageCountRef.current;
    const lastMessage = activeList[activeList.length - 1];
    const isNewMessage = count > previousCount;
    const isInitialLoad = previousCount === 0 && count > 0;
    const isOwnNewMessage =
      isNewMessage &&
      (aiMode
        ? lastMessage?.role === "user"
        : lastMessage?.senderId === currentUserId);
    const isNearBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 180;

    if (isInitialLoad || isOwnNewMessage || (isNewMessage && isNearBottom)) {
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
    }

    previousMessageCountRef.current = count;
  }, [messages, aiMessages, aiMode, currentUserId]);

  useEffect(() => {
    previousMessageCountRef.current = 0;
    const timer = window.setTimeout(() => {
      const viewport = chatViewportRef.current;
      if (!viewport) return;
      viewport.scrollTop = viewport.scrollHeight;
    }, 40);
    return () => window.clearTimeout(timer);
  }, [selectedChatId, aiMode]);

  useEffect(() => {
    if (chats.length === 0) {
      setConnection(null);
      setConnectionState("disconnected");
      return;
    }

    const c = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/chat`, {
        accessTokenFactory: async () => {
          const token = getAccessToken();

          return token ?? "";
        },
      })
      .withAutomaticReconnect()
      .build();

    c.on(
      "UserProfileUpdated",
      (data: {
        userId: string;
        username: string;
        avatarUrl: string | null;
        displayName?: string | null;
        bio?: string | null;
        showOnlineStatus?: boolean;
        showLastSeen?: boolean;
        readReceipts?: boolean;
        profilePhotoVisibility?: "Everyone" | "Contacts" | "Nobody";
        bioVisibility?: "Everyone" | "Contacts" | "Nobody";
        statusText?: string | null;
        statusEmoji?: string | null;
        statusExpiresAt?: string | null;
      }) => {
        if (data.userId === currentUserIdRef.current) {
          setProfile((current) =>
            current
              ? {
                  ...current,
                  username: data.username,
                  avatarUrl: data.avatarUrl,
                  displayName: data.displayName ?? current.displayName,
                  bio: data.bio ?? current.bio,
                  showOnlineStatus:
                    data.showOnlineStatus ?? current.showOnlineStatus,
                  showLastSeen: data.showLastSeen ?? current.showLastSeen,
                  readReceipts: data.readReceipts ?? current.readReceipts,
                  profilePhotoVisibility:
                    data.profilePhotoVisibility ??
                    current.profilePhotoVisibility,
                  bioVisibility: data.bioVisibility ?? current.bioVisibility,
                  statusText: data.statusText ?? current.statusText,
                  statusEmoji: data.statusEmoji ?? current.statusEmoji,
                  statusExpiresAt:
                    data.statusExpiresAt ?? current.statusExpiresAt,
                }
              : current,
          );
          setUsername(data.username);
          setProfileUsername(data.username);
          setProfileDisplayName(data.displayName ?? "");
          setProfileBio(data.bio ?? "");
          setProfileShowOnlineStatus(data.showOnlineStatus ?? true);
          setProfileShowLastSeen(data.showLastSeen ?? true);
          setProfileReadReceipts(data.readReceipts ?? true);
          setProfilePhotoVisibility(data.profilePhotoVisibility ?? "Everyone");
          setProfileBioVisibility(data.bioVisibility ?? "Everyone");
          setProfileStatusText(data.statusText ?? "");
          setProfileStatusEmoji(data.statusEmoji ?? "🟢");
          const eventExpiresAt = data.statusExpiresAt
            ? new Date(data.statusExpiresAt).getTime()
            : 0;
          const eventNow = Date.now();
          if (!eventExpiresAt || eventExpiresAt <= eventNow)
            setProfileStatusDuration("never");
          else if (eventExpiresAt - eventNow <= 60 * 60 * 1000 + 60_000)
            setProfileStatusDuration("1h");
          else if (eventExpiresAt - eventNow <= 4 * 60 * 60 * 1000 + 60_000)
            setProfileStatusDuration("4h");
          else setProfileStatusDuration("today");
          localStorage.setItem("username", data.username);
        }

        setChats((current) =>
          current.map((chat) =>
            chat.otherUserId === data.userId
              ? {
                  ...chat,
                  name: data.username,
                  otherUsername: data.username,
                  otherAvatarUrl: data.avatarUrl,
                }
              : chat,
          ),
        );
      },
    );

    c.on(
      "GroupMemberRoleUpdated",
      (data: { chatId: string; memberId: string; isAdmin: boolean }) => {
        if (data.chatId !== selectedChatIdRef.current) return;
        void loadGroupMembers(data.chatId);
      },
    );

    c.on("GroupMemberAdded", (data: { chatId: string }) => {
      if (data.chatId !== selectedChatIdRef.current) return;
      void loadGroupMembers(data.chatId);
    });

    c.on("GroupMemberRemoved", (data: { chatId: string; memberId: string }) => {
      if (data.chatId !== selectedChatIdRef.current) return;

      if (data.memberId === currentUserIdRef.current) {
        setManageGroupOpen(false);
        setGroupMembers([]);
        setChats((current) =>
          current.filter((chat) => chat.id !== data.chatId),
        );
        setSelectedChatId("");
        setMessages([]);
        return;
      }

      void loadGroupMembers(data.chatId);
    });

    c.on(
      "MessageReactionUpdated",
      (data: {
        chatId: string;
        messageId: string;
        reactions: { emoji: string; count: number; reactedByMe?: boolean }[];
      }) => {
        if (data.chatId !== selectedChatIdRef.current) return;
        setMessages((current) =>
          current.map((message) =>
            message.id === data.messageId
              ? { ...message, reactions: data.reactions }
              : message,
          ),
        );
      },
    );

    c.on(
      "MessagePinUpdated",
      (data: {
        chatId: string;
        messageId: string;
        isPinned: boolean;
        pinnedAt?: string | null;
        pinnedByUserId?: string | null;
      }) => {
        if (data.chatId !== selectedChatIdRef.current) return;
        setMessages((current) =>
          current.map((message) =>
            message.id === data.messageId
              ? {
                  ...message,
                  isPinned: data.isPinned,
                  pinnedAt: data.pinnedAt ?? null,
                  pinnedByUserId: data.pinnedByUserId ?? null,
                }
              : message,
          ),
        );
      },
    );

    c.on(
      "UserOffline",
      (data: {
        chatId: string;
        userId: string;
        lastSeenAt?: string | null;
      }) => {
        if (data.chatId !== selectedChatIdRef.current) return;
        setOnlineUsersByChat((current) => ({
          ...current,
          [data.chatId]: (current[data.chatId] ?? []).filter(
            (user) => user.userId !== data.userId,
          ),
        }));
        setChats((current) =>
          current.map((chat) =>
            chat.id === data.chatId
              ? ({
                  ...chat,
                  otherLastSeenAt: data.lastSeenAt ?? new Date().toISOString(),
                } as Chat)
              : chat,
          ),
        );
      },
    );

    c.on(
      "UserOnline",
      (data: {
        chatId: string;
        userId: string;
        username: string;
        lastSeenAt?: string | null;
      }) => {
        if (data.chatId !== selectedChatIdRef.current) return;
        setOnlineUsersByChat((current) => {
          const users = current[data.chatId] ?? [];
          if (users.some((user) => user.userId === data.userId)) return current;
          return {
            ...current,
            [data.chatId]: [
              ...users,
              { userId: data.userId, username: data.username },
            ],
          };
        });
        setChats((current) =>
          current.map((chat) =>
            chat.id === data.chatId
              ? ({ ...chat, otherLastSeenAt: null } as Chat)
              : chat,
          ),
        );
      },
    );

    c.on("ReceiveMessage", (message: ChatMessage) => {
      const isOtherChat =
        !!message.chatId && message.chatId !== selectedChatIdRef.current;
      const isIncoming =
        message.senderId && message.senderId !== currentUserIdRef.current;
      const notificationPrefs = notificationPrefsRef.current;
      const messageContent = (message.content ?? "").toLowerCase();
      const isMention = messageContent.includes(`@${username.toLowerCase()}`);
      const snoozedNow =
        typeof notificationPrefs.snoozeUntil === "number" &&
        notificationPrefs.snoozeUntil > Date.now();
      const quietNow = (() => {
        if (!notificationPrefs.quietEnabled) return false;
        const now = new Date();
        const current = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = notificationPrefs.quietStart
          .split(":")
          .map(Number);
        const [endH, endM] = notificationPrefs.quietEnd.split(":").map(Number);
        const start = startH * 60 + startM;
        const end = endH * 60 + endM;
        if (start === end) return true;
        if (start < end) return current >= start && current < end;
        return current >= start || current < end;
      })();
      if (
        isOtherChat &&
        isIncoming &&
        message.chatId &&
        !mutedChatIds.has(message.chatId) &&
        notificationPrefs.enabled &&
        notificationPrefs.mode !== "none" &&
        (notificationPrefs.mode === "all"
          ? !isMention || notificationPrefs.mentions
          : notificationPrefs.mode === "direct"
            ? !chats.find((chat) => chat.id === message.chatId)?.isGroup
            : notificationPrefs.mode === "mentions"
              ? notificationPrefs.mentions && isMention
              : false) &&
        !quietNow &&
        !snoozedNow &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const title = message.senderUsername ?? "New message";
        const body = notificationPrefs.preview
          ? message.content || "Attachment"
          : "You received a new message.";
        new Notification(title, { body });
        if (notificationPrefs.sound) {
          try {
            const AudioContextClass =
              window.AudioContext ||
              (
                window as typeof window & {
                  webkitAudioContext?: typeof AudioContext;
                }
              ).webkitAudioContext;
            if (AudioContextClass) {
              const audio = new AudioContextClass();
              const oscillator = audio.createOscillator();
              const gain = audio.createGain();
              oscillator.frequency.value = 720;
              gain.gain.value = 0.025;
              oscillator.connect(gain);
              gain.connect(audio.destination);
              oscillator.start();
              oscillator.stop(audio.currentTime + 0.08);
              void audio.close();
            }
          } catch {}
        }
      }
      if (message.chatId && message.chatId !== selectedChatIdRef.current)
        return;
      setMessages((current) => {
        const duplicate = message.id
          ? current.some((item) => item.id === message.id)
          : false;

        if (duplicate) return current;

        return [...current, message];
      });
    });

    c.on("MessageUpdated", (updatedMessage: ChatMessage) => {
      if (
        updatedMessage.chatId &&
        updatedMessage.chatId !== selectedChatIdRef.current
      ) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === updatedMessage.id
            ? { ...message, ...updatedMessage }
            : message,
        ),
      );
    });

    c.on(
      "ChatStateUpdated",
      (data: {
        chatId: string;
        userId: string;
        isArchived: boolean;
        isPinned: boolean;
        isMarkedUnread: boolean;
        deleted?: boolean;
        clearedAt?: string | null;
      }) => {
        if (data.userId !== currentUserIdRef.current) return;
        if (data.deleted) {
          setChats((current) =>
            current.filter((chat) => chat.id !== data.chatId),
          );
          if (selectedChatIdRef.current === data.chatId) {
            setSelectedChatId("");
            setMessages([]);
          }
          return;
        }
        setChats((current) =>
          current.map((chat) =>
            chat.id === data.chatId
              ? {
                  ...chat,
                  isArchived: data.isArchived,
                  isPinned: data.isPinned,
                  isMarkedUnread: data.isMarkedUnread,
                }
              : chat,
          ),
        );
        if (data.clearedAt && selectedChatIdRef.current === data.chatId)
          setMessages([]);
      },
    );

    c.on("MessageDeleted", (data: { chatId: string; messageId: string }) => {
      if (data.chatId !== selectedChatIdRef.current) return;

      setMessages((current) =>
        current.filter((message) => message.id !== data.messageId),
      );
    });

    c.on("MessageHidden", (data: { chatId: string; messageId: string }) => {
      if (data.chatId !== selectedChatIdRef.current) return;

      setMessages((current) =>
        current.filter((message) => message.id !== data.messageId),
      );
    });

    c.on(
      "UnreadCountChanged",
      (data: { chatId: string; increment?: number; count?: number }) => {
        setUnreadCounts((current) => ({
          ...current,
          [data.chatId]:
            typeof data.count === "number"
              ? data.count
              : (current[data.chatId] ?? 0) + (data.increment ?? 0),
        }));
      },
    );

    c.on(
      "MessagesRead",
      (data: { chatId: string; userId: string; messageIds: string[] }) => {
        if (data.chatId !== selectedChatIdRef.current) return;
        if (data.userId === currentUserIdRef.current) return;

        setMessages((current) =>
          current.map((message) =>
            message.id &&
            data.messageIds.includes(message.id) &&
            message.senderId === currentUserIdRef.current
              ? { ...message, isRead: true }
              : message,
          ),
        );
      },
    );

    c.on("OnlineUsers", (data: { chatId: string; users: PresenceUser[] }) => {
      if (data.chatId !== selectedChatIdRef.current) return;

      setOnlineUsersByChat((current) => ({
        ...current,
        [data.chatId]: data.users,
      }));
    });

    c.on(
      "UserTyping",
      (data: { chatId: string; userId: string; username: string }) => {
        if (data.chatId !== selectedChatIdRef.current) {
          return;
        }

        setTypingUsers((current) => {
          if (current.some((user) => user.userId === data.userId)) {
            return current.map((user) =>
              user.userId === data.userId
                ? { ...user, username: data.username }
                : user,
            );
          }

          return [...current, { userId: data.userId, username: data.username }];
        });

        if (remoteTypingTimeoutsRef.current[data.userId]) {
          clearTimeout(remoteTypingTimeoutsRef.current[data.userId]);
        }

        remoteTypingTimeoutsRef.current[data.userId] = setTimeout(() => {
          setTypingUsers((current) =>
            current.filter((user) => user.userId !== data.userId),
          );
          delete remoteTypingTimeoutsRef.current[data.userId];
        }, 3000);
      },
    );

    c.on(
      "UserStoppedTyping",
      (data: { chatId: string; userId: string; username: string }) => {
        if (data.chatId !== selectedChatIdRef.current) {
          return;
        }

        if (remoteTypingTimeoutsRef.current[data.userId]) {
          clearTimeout(remoteTypingTimeoutsRef.current[data.userId]);
          delete remoteTypingTimeoutsRef.current[data.userId];
        }

        setTypingUsers((current) =>
          current.filter((user) => user.userId !== data.userId),
        );
      },
    );

    c.onreconnecting(() => {
      setConnectionState("reconnecting");
    });

    c.onreconnected(async () => {
      setConnectionState("connected");

      try {
        await Promise.all(chats.map((chat) => c.invoke("JoinChat", chat.id)));
      } catch (err) {
        console.error("Sohbetlere yeniden katılım hatası:", err);
      }
    });

    c.onclose(() => {
      setConnectionState("disconnected");
      setConnection(null);
    });

    setConnectionState("connecting");

    c.start()
      .then(async () => {
        setConnectionState("connected");

        await Promise.all(chats.map((chat) => c.invoke("JoinChat", chat.id)));

        setConnection(c);

        try {
          const counts =
            await c.invoke<Record<string, number>>("GetUnreadCounts");
          setUnreadCounts(counts);
        } catch (err) {
          console.error("Okunmamış mesaj sayıları alınamadı:", err);
        }
      })
      .catch((err) => {
        console.error("SignalR bağlantı hatası:", err);
        setConnectionState("disconnected");
      });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      Object.values(remoteTypingTimeoutsRef.current).forEach(clearTimeout);
      remoteTypingTimeoutsRef.current = {};
      markedAsReadRef.current.clear();

      c.stop();
    };
  }, [chats.map((chat) => chat.id).join(",")]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    if (
      !connection ||
      !selectedChatId ||
      connectionState !== "connected" ||
      !currentUserId ||
      messages.length === 0
    ) {
      return;
    }

    connection
      .invoke<string[]>("GetReadMessageIds", selectedChatId)
      .then((readMessageIds) => {
        if (readMessageIds.length === 0) return;

        setMessages((current) =>
          current.map((message) =>
            message.id &&
            message.senderId === currentUserId &&
            readMessageIds.includes(message.id)
              ? { ...message, isRead: true }
              : message,
          ),
        );
      })
      .catch((err) => {
        console.error("Okundu bilgileri alınamadı:", err);
      });
  }, [
    connection,
    connectionState,
    selectedChatId,
    messages.length,
    currentUserId,
  ]);

  useEffect(() => {
    if (!connection || !selectedChatId || connectionState !== "connected") {
      return;
    }

    const unreadIncomingIds = messages
      .filter(
        (message) =>
          message.id &&
          message.senderId &&
          message.senderId !== currentUserId &&
          !markedAsReadRef.current.has(message.id),
      )
      .map((message) => message.id as string);

    if (unreadIncomingIds.length === 0) return;

    unreadIncomingIds.forEach((id) => markedAsReadRef.current.add(id));

    connection
      .invoke("MarkMessagesAsRead", selectedChatId, unreadIncomingIds)
      .catch((err) => {
        unreadIncomingIds.forEach((id) => markedAsReadRef.current.delete(id));
        console.error("Okundu bilgisi gönderilemedi:", err);
      });
  }, [connection, connectionState, selectedChatId, messages, currentUserId]);

  const openNewChat = () => {
    setNewChatOpen(true);
    setAiMode(false);
    setUserSearch("");
    setUserSearchResults([]);
    setError("");
  };

  const closeNewChat = () => {
    if (creatingChat) return;

    setNewChatOpen(false);
    setUserSearch("");
    setUserSearchResults([]);
  };

  const openAIChat = () => {
    setNewChatOpen(false);
    setAiMode(true);
    setSelectedChatId("");
    selectedChatIdRef.current = "";
    setMessages([]);
    setText("");
    setAttachment(null);
    setAiAttachment(null);
    setReplyingTo(null);
    setError("");
    setChatMenuOpen(false);
    if (aiMessages.length === 0) {
      setAiMessages([
        {
          id: `ai-welcome-${Date.now()}`,
          role: "assistant",
          content: st(
            "Hello! I'm MFB AI. I can answer questions, help develop ideas, or simply chat with you. How can we start?",
            "Merhaba! Ben MFB AI. Sorularını yanıtlayabilir, fikirlerini birlikte geliştirebilir veya sadece sohbet edebiliriz. Nasıl başlayalım?",
          ),
          sentAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const sendAIMessage = async () => {
    if (aiLoading) return;

    const message = text.trim();
    const currentAttachment = aiAttachment;
    const currentVoiceFile = pendingVoiceFile;

    if (!message && !currentAttachment && !currentVoiceFile) return;

    const token = getAccessToken();
    if (!token) return;

    let attachmentForRequest = currentAttachment;
    let voiceAttachment: AIInlineAttachment | null = null;

    try {
      if (currentVoiceFile) {
        const dataUrl = await fileToDataUrl(currentVoiceFile);
        voiceAttachment = {
          fileName: currentVoiceFile.name,
          mimeType: currentVoiceFile.type || "audio/webm",
          dataUrl,
          size: currentVoiceFile.size,
          kind: "audio",
        };
        attachmentForRequest = voiceAttachment;
      }

      const userContent =
        message ||
        (attachmentForRequest?.kind === "image"
          ? "Bu görseli analiz et."
          : attachmentForRequest?.kind === "audio"
            ? "Bu ses kaydını analiz et ve uygun bir yanıt ver."
            : "Bu dosyayı incele ve yardımcı ol.");

      const userMessage: AIMessage = {
        id: `ai-user-${Date.now()}`,
        role: "user",
        content: userContent,
        sentAt: new Date().toISOString(),
        attachment: attachmentForRequest ?? undefined,
      };

      const history = [...aiMessages, userMessage];
      setAiMessages(history);
      setText("");
      setAiAttachment(null);
      if (currentVoiceFile) deletePendingVoiceRecording();
      setAiLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/AI/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language: language === "English" ? "en" : "tr",
          messages: history.map((item, index) => ({
            role: item.role,
            content: item.content,

            attachment:
              index === history.length - 1 && item.attachment
                ? {
                    fileName: item.attachment.fileName,
                    mimeType: item.attachment.mimeType,
                    dataBase64: item.attachment.dataUrl.split(",")[1] ?? "",
                  }
                : undefined,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.detail
            ? `${data.message || "AI yanıtı alınamadı."} ${data.detail}`
            : data?.message || "AI yanıtı alınamadı.",
        );
      }

      setAiMessages((current) => [
        ...current,
        {
          id: `ai-assistant-${Date.now()}`,
          role: "assistant",
          content: data.content || data.message || "AI yanıt veremedi.",
          sentAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("AI mesajı gönderilemedi:", err);
      setError(err instanceof Error ? err.message : "AI yanıtı alınamadı.");
    } finally {
      setAiLoading(false);
    }
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Dosya okunamadı."));
      reader.readAsDataURL(file);
    });

  const createAIInlineAttachment = async (
    file: File,
    kind: AIInlineAttachment["kind"],
  ): Promise<AIInlineAttachment> => {
    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("AI ekleri 8 MB'dan büyük olamaz.");
    }

    const allowed =
      kind === "image"
        ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
        : ["application/pdf", "text/plain", "text/csv", "application/json"];

    if (!allowed.includes(file.type)) {
      throw new Error(
        kind === "image"
          ? "Desteklenen görseller: JPG, PNG, WEBP ve GIF."
          : "AI için desteklenen dosyalar: PDF, TXT, CSV ve JSON.",
      );
    }

    return {
      fileName: file.name,
      mimeType: file.type,
      dataUrl: await fileToDataUrl(file),
      size: file.size,
      kind,
    };
  };

  const handleAIFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    kind: "image" | "file",
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !aiMode) return;

    setUploading(true);
    setError("");
    try {
      const inlineAttachment = await createAIInlineAttachment(file, kind);
      setAiAttachment(inlineAttachment);
    } catch (err) {
      console.error("AI eki hazırlanamadı:", err);
      setError(err instanceof Error ? err.message : "Ek hazırlanamadı.");
    } finally {
      setUploading(false);
    }
  };

  const startDirectChat = async (user: UserSearchResult) => {
    const token = getAccessToken();

    if (!token || creatingChat) return;

    setCreatingChat(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/DirectChats/${user.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const raw = await response.text();

      let data: Chat & { message?: string } = {
        id: "",
        name: "",
        isGroup: false,
        createdAt: "",
      };

      if (raw.trim()) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(
            `Sunucudan geçersiz cevap geldi. HTTP ${response.status}`,
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message ?? `Sohbet oluşturulamadı. HTTP ${response.status}`,
        );
      }

      setChats((current) => {
        const exists = current.some((chat) => chat.id === data.id);
        return exists ? current : [...current, data];
      });

      setSelectedChatId(data.id);
      setMessages([]);
      setText("");
      setTypingUsers([]);
      setUnreadCounts((current) => ({
        ...current,
        [data.id]: 0,
      }));

      closeNewChat();
    } catch (err) {
      console.error("Yeni sohbet oluşturma hatası:", err);
      setError(
        err instanceof Error ? err.message : "Yeni sohbet oluşturulamadı.",
      );
    } finally {
      setCreatingChat(false);
    }
  };

  const openGroup = () => {
    setGroupOpen(true);
    setGroupName("");
    setGroupMemberSearch("");
    setGroupMemberResults([]);
    setSelectedGroupMembers([]);
    setError("");
  };

  const closeGroup = () => {
    if (creatingGroup) return;

    setGroupOpen(false);
    setGroupName("");
    setGroupMemberSearch("");
    setGroupMemberResults([]);
    setSelectedGroupMembers([]);
  };

  const addGroupMember = (user: UserSearchResult) => {
    setSelectedGroupMembers((current) =>
      current.some((member) => member.id === user.id)
        ? current
        : [...current, user],
    );
    setGroupMemberSearch("");
    setGroupMemberResults([]);
  };

  const removeGroupMember = (userId: string) => {
    setSelectedGroupMembers((current) =>
      current.filter((member) => member.id !== userId),
    );
  };

  const containsEmoji = (value: string) =>
    /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u.test(value);

  const createGroup = async () => {
    const token = getAccessToken();
    const trimmedName = groupName.trim();

    if (!token || creatingGroup) return;

    if (!trimmedName) {
      setError("Grup adı boş olamaz.");
      return;
    }

    if (containsEmoji(trimmedName)) {
      setError("Grup adı emoji içeremez.");
      return;
    }

    if (selectedGroupMembers.length === 0) {
      setError("Gruba en az bir kullanıcı ekleyin.");
      return;
    }

    setCreatingGroup(true);
    setError("");

    try {
      const createResponse = await fetch(`${API_URL}/api/Chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          isGroup: true,
        }),
      });

      const createData: Chat & { message?: string } = await createResponse
        .json()
        .catch(() => ({
          id: "",
          name: "",
          isGroup: true,
          createdAt: "",
        }));

      if (!createResponse.ok) {
        throw new Error(
          createData.message ??
            `Grup oluşturulamadı. HTTP ${createResponse.status}`,
        );
      }

      if (!createData.id) {
        throw new Error("Sunucudan geçerli grup bilgisi alınamadı.");
      }

      for (const member of selectedGroupMembers) {
        const memberResponse = await fetch(
          `${API_URL}/api/Chats/${createData.id}/members`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              memberId: member.id,
            }),
          },
        );

        if (!memberResponse.ok) {
          const memberData = await memberResponse.json().catch(() => null);
          throw new Error(
            memberData?.message ??
              `${member.username} gruba eklenemedi. HTTP ${memberResponse.status}`,
          );
        }
      }

      setChats((current) => {
        const exists = current.some((chat) => chat.id === createData.id);
        return exists ? current : [...current, createData];
      });

      setSelectedChatId(createData.id);
      setMessages([]);
      setText("");
      setTypingUsers([]);
      setUnreadCounts((current) => ({
        ...current,
        [createData.id]: 0,
      }));

      closeGroup();
    } catch (err) {
      console.error("Grup oluşturma hatası:", err);
      setError(err instanceof Error ? err.message : "Grup oluşturulamadı.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const loadGroupMembers = async (chatId: string) => {
    const token = getAccessToken();
    if (!token) return;

    setLoadingGroupMembers(true);

    try {
      const response = await fetch(`${API_URL}/api/Chats/${chatId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Grup üyeleri alınamadı. HTTP ${response.status}`);
      }

      const data: ChatMember[] = await response.json();
      setGroupMembers(data);
    } catch (err) {
      console.error("Grup üyeleri yüklenirken hata:", err);
      setGroupMembers([]);
    } finally {
      setLoadingGroupMembers(false);
    }
  };

  useEffect(() => {
    if (!selectedChatId || !selectedChat?.isGroup) {
      setGroupMembers([]);
      return;
    }

    loadGroupMembers(selectedChatId);
  }, [selectedChatId, selectedChat?.isGroup]);

  const openManageGroup = async () => {
    if (!selectedChat?.isGroup) return;

    setManageGroupOpen(true);
    setManageMemberSearch("");
    setManageMemberResults([]);
    setError("");
    await loadGroupMembers(selectedChat.id);
  };

  const closeManageGroup = () => {
    if (memberActionUserId) return;

    setManageGroupOpen(false);
    setManageMemberSearch("");
    setManageMemberResults([]);
    setMemberMenuUserId(null);
  };

  const currentGroupRole = useMemo(() => {
    const me = groupMembers.find((member) => member.userId === currentUserId);
    return me?.role ?? "Member";
  }, [groupMembers, currentUserId]);

  const canManageMembers =
    currentGroupRole === "Owner" || currentGroupRole === "Admin";
  const isGroupOwner = currentGroupRole === "Owner";

  const addMemberToGroup = async (member: UserSearchResult) => {
    const token = getAccessToken();
    if (!token || !selectedChat || memberActionUserId || !canManageMembers)
      return;

    setMemberActionUserId(member.id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/Chats/${selectedChat.id}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            memberId: member.id,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ??
            `Kullanıcı gruba eklenemedi. HTTP ${response.status}`,
        );
      }

      setManageMemberSearch("");
      setManageMemberResults([]);
      await loadGroupMembers(selectedChat.id);
    } catch (err) {
      console.error("Gruba üye ekleme hatası:", err);
      setError(
        err instanceof Error ? err.message : "Kullanıcı gruba eklenemedi.",
      );
    } finally {
      setMemberActionUserId(null);
    }
  };

  const removeMemberFromGroup = async (member: ChatMember) => {
    const token = getAccessToken();
    if (!token || !selectedChat || memberActionUserId) return;

    setConfirmationDialog({
      title:
        member.userId === currentUserId
          ? st("Leave group", "Gruptan ayrıl")
          : st("Remove member", "Üyeyi gruptan çıkar"),
      message:
        member.userId === currentUserId
          ? st(
              "Leave this group? You will need to be added again to return.",
              "Bu gruptan ayrılmak istiyor musunuz? Geri dönmek için yeniden eklenmeniz gerekir.",
            )
          : `${member.username} ${st(
              "will be removed from the group. Continue?",
              "gruptan çıkarılacak. Devam edilsin mi?",
            )}`,
      confirmLabel:
        member.userId === currentUserId
          ? st("Leave group", "Gruptan ayrıl")
          : st("Remove", "Çıkar"),
      cancelLabel: st("İptal", "İptal"),
      danger: true,
      onConfirm: async () => {
        setMemberActionUserId(member.userId);
        setMemberMenuUserId(null);
        setError("");

        try {
          const isLeaving = member.userId === currentUserId;
          const response = await fetch(
            isLeaving
              ? `${API_URL}/api/Chats/${selectedChat.id}/members/me`
              : `${API_URL}/api/Chats/${selectedChat.id}/members/${member.userId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(
              data?.message ??
                (isLeaving
                  ? "Gruptan ayrılamadınız."
                  : `Kullanıcı gruptan çıkarılamadı. HTTP ${response.status}`),
            );
          }

          if (isLeaving) {
            setManageGroupOpen(false);
            setGroupMembers([]);
            setChats((current) =>
              current.filter((chat) => chat.id !== selectedChat.id),
            );
            setSelectedChatId("");
            setMessages([]);
          } else {
            await loadGroupMembers(selectedChat.id);
          }
        } catch (err) {
          console.error("Grup üye işlemi hatası:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Grup üye işlemi gerçekleştirilemedi.",
          );
        } finally {
          setMemberActionUserId(null);
        }
      },
    });
  };

  const setMemberAdmin = async (member: ChatMember, isAdmin: boolean) => {
    const token = getAccessToken();
    if (
      !token ||
      !selectedChat ||
      memberActionUserId ||
      !isGroupOwner ||
      member.isOwner
    )
      return;

    setMemberActionUserId(member.userId);
    setMemberMenuUserId(null);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/Chats/${selectedChat.id}/members/${member.userId}/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isAdmin }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ??
            `Yönetici rolü güncellenemedi. HTTP ${response.status}`,
        );
      }

      await loadGroupMembers(selectedChat.id);
    } catch (err) {
      console.error("Grup yönetici rolü hatası:", err);
      setError(
        err instanceof Error ? err.message : "Yönetici rolü güncellenemedi.",
      );
    } finally {
      setMemberActionUserId(null);
    }
  };

  const openEditGroupName = () => {
    if (!selectedChat?.isGroup) return;
    if (!isGroupOwner) {
      setError(
        st(
          "Only the group owner can edit group settings.",
          "Grup ayarlarını yalnızca grup sahibi değiştirebilir.",
        ),
      );
      return;
    }

    setEditGroupName(selectedChat.name);
    setEditGroupNameError("");
    setGroupAvatarRemoved(false);
    setEditGroupOpen(true);
    setError("");
  };

  const closeEditGroupName = () => {
    if (updatingGroupName) return;

    setEditGroupOpen(false);
    setEditGroupName("");
    setEditGroupNameError("");
    setGroupAvatarRemoved(false);
  };

  const uploadGroupAvatar = async (file: File) => {
    const token = getAccessToken();

    if (!token || !selectedChat?.isGroup || uploadingGroupAvatar) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Grup görseli 5 MB'dan büyük olamaz.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Sadece JPG, PNG, GIF veya WebP görselleri yükleyebilirsiniz.");
      return;
    }

    setUploadingGroupAvatar(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/Chats/${selectedChat.id}/avatar`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ??
            `Grup görseli güncellenemedi. HTTP ${response.status}`,
        );
      }

      setChats((current) =>
        current.map((chat) =>
          chat.id === selectedChat.id
            ? { ...chat, avatarUrl: data.avatarUrl }
            : chat,
        ),
      );
      setGroupAvatarRemoved(false);
    } catch (err) {
      console.error("Grup görseli güncelleme hatası:", err);
      setError(
        err instanceof Error ? err.message : "Grup görseli güncellenemedi.",
      );
    } finally {
      setUploadingGroupAvatar(false);
      if (groupAvatarInputRef.current) groupAvatarInputRef.current.value = "";
    }
  };

  const removeGroupAvatar = async () => {
    const token = getAccessToken();

    if (
      !token ||
      !selectedChat?.isGroup ||
      !selectedChat.avatarUrl ||
      uploadingGroupAvatar
    )
      return;

    setUploadingGroupAvatar(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/Chats/${selectedChat.id}/avatar`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ??
            `Grup görseli kaldırılamadı. HTTP ${response.status}`,
        );
      }

      setChats((current) =>
        current.map((chat) =>
          chat.id === selectedChat.id ? { ...chat, avatarUrl: null } : chat,
        ),
      );
      setGroupAvatarRemoved(true);
    } catch (err) {
      console.error("Grup görseli kaldırma hatası:", err);
      setError(
        err instanceof Error ? err.message : "Grup görseli kaldırılamadı.",
      );
    } finally {
      setUploadingGroupAvatar(false);
    }
  };

  const updateGroupName = async () => {
    const token = getAccessToken();
    const trimmedName = editGroupName.trim();

    if (!token || !selectedChat?.isGroup || updatingGroupName) return;

    if (!trimmedName) {
      setEditGroupNameError("Grup adı boş olamaz.");
      return;
    }

    if (containsEmoji(trimmedName)) {
      setEditGroupNameError("Grup adı emoji içeremez.");
      return;
    }

    setEditGroupNameError("");

    if (trimmedName === selectedChat.name) {
      closeEditGroupName();
      return;
    }

    setUpdatingGroupName(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/Chats/${selectedChat.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmedName,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ?? `Grup adı güncellenemedi. HTTP ${response.status}`,
        );
      }

      setChats((current) =>
        current.map((chat) =>
          chat.id === selectedChat.id ? { ...chat, name: data.name } : chat,
        ),
      );

      setEditGroupOpen(false);
      setEditGroupName("");
    } catch (err) {
      console.error("Grup adı güncelleme hatası:", err);
      setError(err instanceof Error ? err.message : "Grup adı güncellenemedi.");
    } finally {
      setUpdatingGroupName(false);
    }
  };

  const updateChatState = async (
    chatId: string,
    patch: {
      archived?: boolean;
      pinned?: boolean;
      markedUnread?: boolean;
      clearMessages?: boolean;
      deleteChat?: boolean;
    },
  ) => {
    const token = getAccessToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/api/Chats/${chatId}/state`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          archived: patch.archived,
          pinned: patch.pinned,
          markedUnread: patch.markedUnread,
          clearMessages: patch.clearMessages ?? false,
          deleteChat: patch.deleteChat ?? false,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.message ?? "Sohbet işlemi başarısız.");

      if (patch.deleteChat) {
        setChats((current) => current.filter((chat) => chat.id !== chatId));
        if (selectedChatId === chatId) {
          setSelectedChatId("");
          setMessages([]);
        }
      } else {
        setChats((current) =>
          current.map((chat) =>
            chat.id === chatId ? { ...chat, ...data } : chat,
          ),
        );
        if (patch.clearMessages && selectedChatId === chatId) setMessages([]);
      }
      setChatMenuOpen(false);
      return true;
    } catch (err) {
      console.error("Sohbet işlemi hatası:", err);
      setError(err instanceof Error ? err.message : "Sohbet işlemi başarısız.");
      return false;
    }
  };

  const toggleChatArchive = async () => {
    if (!selectedChat) return;
    await updateChatState(selectedChat.id, {
      archived: !selectedChat.isArchived,
    });
  };

  const toggleChatPin = async () => {
    if (!selectedChat) return;
    await updateChatState(selectedChat.id, { pinned: !selectedChat.isPinned });
  };

  const markSelectedChatUnread = async () => {
    if (!selectedChat) return;
    const ok = await updateChatState(selectedChat.id, { markedUnread: true });
    if (ok)
      setUnreadCounts((current) => ({
        ...current,
        [selectedChat.id]: Math.max(1, current[selectedChat.id] ?? 0),
      }));
  };

  const clearSelectedChat = async () => {
    if (!selectedChat) return;
    setChatMenuOpen(false);
    const chatId = selectedChat.id;
    setConfirmationDialog({
      title: st("Clear chat", "Sohbeti temizle"),
      message: st(
        "Clear all messages from this chat? This only affects your view.",
        "Bu sohbetteki tüm mesajlar temizlensin mi? Bu işlem yalnızca sizin görünümünüzü etkiler.",
      ),
      confirmLabel: st("Clear messages", "Mesajları temizle"),
      cancelLabel: st("İptal", "İptal"),
      danger: true,
      onConfirm: async () => {
        await updateChatState(chatId, { clearMessages: true });
      },
    });
  };

  const deleteSelectedChat = async () => {
    if (!selectedChat) return;
    setChatMenuOpen(false);
    const chatId = selectedChat.id;
    setConfirmationDialog({
      title: st("Delete chat", "Sohbeti sil"),
      message: st(
        "Delete this chat from your account?",
        "Bu sohbet hesabınızdan silinsin mi?",
      ),
      confirmLabel: st("Delete chat", "Sohbeti sil"),
      cancelLabel: st("İptal", "İptal"),
      danger: true,
      onConfirm: async () => {
        await updateChatState(chatId, { deleteChat: true });
      },
    });
  };

  const selectChat = (chatId: string) => {
    if (chatId === selectedChatId && !aiMode) return;
    setAiMode(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    markedAsReadRef.current.clear();
    selectedChatIdRef.current = chatId;
    setSelectedChatId(chatId);
    setSharedMediaOpen(true);
    setSharedLinksOpen(false);
    setSharedFilesOpen(false);
    setShowAllSharedMedia(false);
    setShowAllSharedFiles(false);
    setUnreadCounts((current) => ({ ...current, [chatId]: 0 }));
    void updateChatState(chatId, { markedUnread: false });
    setChatMenuOpen(false);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileChatListOpen(false);
    }
    setMessages([]);
    setText("");
    setAttachment(null);
    setTypingUsers([]);
    setShowAllSharedMedia(false);
    setShowAllSharedFiles(false);
    setError("");
  };

  const handleTyping = async (value: string) => {
    setText(value);

    if (!connection || !selectedChatId || !username) return;

    if (!value.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      try {
        await connection.invoke("StopTyping", selectedChatId);
      } catch (err) {}

      return;
    }

    try {
      await connection.invoke("StartTyping", selectedChatId);
    } catch (err) {}

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await connection.invoke("StopTyping", selectedChatId);
      } catch (err) {}

      typingTimeoutRef.current = null;
    }, 3000);
  };

  const uploadAttachmentFile = async (file: File): Promise<Attachment> => {
    if (!selectedChatId) throw new Error("Bir sohbet seçin.");
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Dosya boyutu 10 MB'dan büyük olamaz.");
    }

    const token = getAccessToken();
    if (!token) throw new Error("Oturum bulunamadı.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", selectedChatId);

    const response = await fetch(`${API_URL}/api/Attachments/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    const raw = await response.text();
    let data: Attachment | { message?: string } | null = null;
    if (raw.trim()) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Sunucudan geçersiz cevap geldi. HTTP ${response.status}`,
        );
      }
    }

    if (!response.ok) {
      const message = data && "message" in data ? data.message : undefined;
      throw new Error(message ?? `Dosya yüklenemedi. HTTP ${response.status}`);
    }

    if (!data || !("url" in data) || !data.url) {
      throw new Error(
        `Sunucu dosya yükleme bilgisini döndürmedi. HTTP ${response.status}`,
      );
    }

    return data;
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedChatId) return;

    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadAttachmentFile(file);
      setAttachment(uploaded);
    } catch (err) {
      console.error("Dosya yükleme hatası:", err);
      setError(err instanceof Error ? err.message : "Dosya yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cancelVoiceRecording = () => {
    recordingİptalledRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    stopRecordingTimer();
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const deletePendingVoiceRecording = () => {
    if (pendingVoiceUrl) URL.revokeObjectURL(pendingVoiceUrl);
    setPendingVoiceUrl(null);
    setPendingVoiceFile(null);
  };

  const sendPendingVoiceRecording = async () => {
    if (!connection || !selectedChatId || !pendingVoiceFile) return;

    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadAttachmentFile(pendingVoiceFile);
      await connection.invoke(
        "SendMessage",
        selectedChatId,
        "",
        uploaded.url ?? null,
        uploaded.fileName ?? pendingVoiceFile.name,
        uploaded.contentType ?? pendingVoiceFile.type,
        uploaded.size ?? pendingVoiceFile.size,
        replyingTo?.id ?? null,
      );
      setReplyingTo(null);
      deletePendingVoiceRecording();
    } catch (err) {
      console.error("Sesli mesaj gönderme hatası:", err);
      setError(
        err instanceof Error ? err.message : "Sesli mesaj gönderilemedi.",
      );
    } finally {
      setUploading(false);
    }
  };

  const sendVoiceRecording = async () => {
    if (!connection || (!selectedChatId && !aiMode)) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeCandidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ];
    const mimeType =
      mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recordingStreamRef.current = stream;
    mediaRecorderRef.current = recorder;
    recordingChunksRef.current = [];
    recordingİptalledRef.current = false;
    setRecordingSeconds(0);
    setIsRecording(true);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordingChunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      stopRecordingTimer();
      stream.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);

      const chunks = recordingChunksRef.current;
      recordingChunksRef.current = [];
      if (
        recordingİptalledRef.current ||
        !chunks.length ||
        (!selectedChatId && !aiMode)
      ) {
        setRecordingSeconds(0);
        return;
      }

      const blob = new Blob(chunks, {
        type: recorder.mimeType || "audio/webm",
      });
      if (blob.size > 10 * 1024 * 1024) {
        setError("Ses kaydı 10 MB'dan büyük olamaz.");
        setRecordingSeconds(0);
        return;
      }

      const extension = recorder.mimeType.includes("mp4") ? "m4a" : "webm";
      const file = new File([blob], `voice-${Date.now()}.${extension}`, {
        type: blob.type,
      });
      if (pendingVoiceUrl) URL.revokeObjectURL(pendingVoiceUrl);
      setPendingVoiceFile(file);
      setPendingVoiceUrl(URL.createObjectURL(file));
      setRecordingSeconds(0);
    };

    recorder.start();
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((seconds) => {
        if (seconds >= 59) {
          const activeRecorder = mediaRecorderRef.current;
          if (activeRecorder && activeRecorder.state !== "inactive")
            activeRecorder.stop();
          return 60;
        }
        return seconds + 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      stopRecordingTimer();
      if (pendingVoiceUrl) URL.revokeObjectURL(pendingVoiceUrl);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      mediaRecorderRef.current = null;
    };
  }, [pendingVoiceUrl]);

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Tarayıcınız ses kaydını desteklemiyor.");
      return;
    }

    try {
      await sendVoiceRecording();
    } catch (err) {
      console.error("Mikrofon erişimi hatası:", err);
      setError(
        "Mikrofon erişimine izin verilmedi veya mikrofon kullanılamıyor.",
      );
      cancelVoiceRecording();
    }
  };

  const startEditing = (message: ChatMessage) => {
    if (!message.id || message.senderId !== currentUserId) return;

    setEditingMessageId(message.id);
    setEditingText(message.content);
    setError("");
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (
      !connection ||
      !selectedChatId ||
      !editingMessageId ||
      !editingText.trim()
    ) {
      return;
    }

    try {
      await connection.invoke(
        "EditMessage",
        selectedChatId,
        editingMessageId,
        editingText.trim(),
      );

      cancelEditing();
    } catch (err) {
      console.error("Mesaj düzenleme hatası:", err);
      setError("Mesaj düzenlenemedi.");
    }
  };

  const deleteMessage = (message: ChatMessage) => {
    if (!connection || !selectedChatId || !message.id) return;
    setMessageDeleteDialog(message);
  };

  const deleteMessageForMe = async () => {
    if (!connection || !selectedChatId || !messageDeleteDialog?.id) return;
    const messageId = messageDeleteDialog.id;
    setMessageDeleteDialog(null);
    try {
      await connection.invoke("DeleteMessageForMe", selectedChatId, messageId);
    } catch (err) {
      console.error("Mesajı benden silme hatası:", err);
      setError("Mesaj silinemedi.");
    }
  };

  const deleteMessageForEveryone = async () => {
    if (!connection || !selectedChatId || !messageDeleteDialog?.id) return;
    const message = messageDeleteDialog;
    if (message.senderId !== currentUserId) return;
    const messageId = message.id;
    setMessageDeleteDialog(null);
    try {
      await connection.invoke("DeleteMessage", selectedChatId, messageId);
    } catch (err) {
      console.error("Herkesten mesaj silme hatası:", err);
      setError("Mesaj herkesten silinemedi.");
    }
  };

  const replyToMessage = (message: ChatMessage) => {
    setReplyingTo(message);
    setReactionPickerMessageId(null);
  };

  const scrollToMessage = (messageId?: string | null) => {
    if (!messageId) return;
    const element = messageRefs.current[messageId];
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    setTimeout(
      () =>
        setHighlightedMessageId((current) =>
          current === messageId ? null : current,
        ),
      1600,
    );
  };

  const toggleReaction = async (message: ChatMessage, emoji: string) => {
    if (!connection || !selectedChatId || !message.id) return;
    try {
      await connection.invoke(
        "ToggleReaction",
        selectedChatId,
        message.id,
        emoji,
      );
      setReactionPickerMessageId(null);
    } catch (err) {
      setError("Reaction could not be updated.");
    }
  };

  const togglePin = async (message: ChatMessage) => {
    if (!connection || !selectedChatId || !message.id) return;
    try {
      await connection.invoke(
        message.isPinned ? "UnpinMessage" : "PinMessage",
        selectedChatId,
        message.id,
      );
    } catch (err) {
      setError("Pin could not be updated.");
    }
  };

  const openForward = (message: ChatMessage) => setForwardingMessage(message);

  const forwardMessage = async (targetChatId: string) => {
    if (!connection || !forwardingMessage?.id) return;
    try {
      await connection.invoke(
        "ForwardMessage",
        selectedChatId,
        forwardingMessage.id,
        targetChatId,
      );
      setForwardingMessage(null);
    } catch (err) {
      setError("Message could not be forwarded.");
    }
  };

  const toggleMute = async () => {
    if (!selectedChatId) return;
    const token = getAccessToken();
    if (!token) return;
    const muted = mutedChatIds.has(selectedChatId);
    try {
      const response = await fetch(
        `${API_URL}/api/Chats/${selectedChatId}/mute`,
        {
          method: muted ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error();
      setMutedChatIds((current) => {
        const next = new Set(current);
        if (muted) next.delete(selectedChatId);
        else next.add(selectedChatId);
        return next;
      });
    } catch {
      setError("Mute setting could not be updated.");
    }
  };

  const registerWebPush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Bu tarayıcı Web Push bildirimlerini desteklemiyor.");
    }

    const token = getAccessToken();
    if (!token) throw new Error("Oturum bulunamadı.");

    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    const keyResponse = await fetch(`${API_URL}/api/Push/public-key`);
    if (!keyResponse.ok) {
      throw new Error("Web Push anahtarı alınamadı.");
    }

    const { publicKey } = await keyResponse.json();
    if (!publicKey) throw new Error("Web Push public key bulunamadı.");

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const subscriptionPayload = pushSubscriptionToJson(subscription);
    if (
      !subscriptionPayload.endpoint ||
      !subscriptionPayload.p256dh ||
      !subscriptionPayload.auth
    ) {
      throw new Error("Geçersiz push subscription.");
    }

    const response = await fetch(`${API_URL}/api/Push/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscriptionPayload),
    });

    if (!response.ok) {
      throw new Error("Push subscription sunucuya kaydedilemedi.");
    }
  };

  const unregisterWebPush = async () => {
    if (!("serviceWorker" in navigator)) return;

    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const token = getAccessToken();
    if (token) {
      await fetch(`${API_URL}/api/Push/subscriptions`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => undefined);
    }

    await subscription.unsubscribe();
  };

  const requestBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      setError("Bu tarayıcı bildirimleri desteklemiyor.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setNotificationsEnabled(false);
      localStorage.setItem("chatapp-browser-notifications", "false");
      return;
    }

    try {
      await registerWebPush();
      setNotificationsEnabled(true);
      localStorage.setItem("chatapp-browser-notifications", "true");
      setError("");
    } catch (pushError) {
      console.error("Web Push registration failed:", pushError);

      setNotificationsEnabled(true);
      localStorage.setItem("chatapp-browser-notifications", "true");
      setError(
        pushError instanceof Error
          ? pushError.message
          : "Web Push bildirimleri etkinleştirilemedi.",
      );
    }
  };

  const toggleBrowserNotifications = async () => {
    if (notificationsEnabled) {
      await unregisterWebPush();
      setNotificationsEnabled(false);
      localStorage.setItem("chatapp-browser-notifications", "false");
      return;
    }
    await requestBrowserNotifications();
  };

  const insertEmoji = (emoji: string) => {
    setText((current) => `${current}${emoji}`);
    setRecentEmojis((current) => {
      const next = [emoji, ...current.filter((item) => item !== emoji)].slice(
        0,
        18,
      );
      try {
        localStorage.setItem("mfb-chat-recent-emojis", JSON.stringify(next));
      } catch {}
      return next;
    });
    setEmojiPickerOpen(false);
  };

  const toggleQuickGif = (gif: GifItem) => {
    setQuickGifs((current) => {
      const exists = current.some((item) => item.id === gif.id);
      const next = exists
        ? current.filter((item) => item.id !== gif.id)
        : current.length < 4
          ? [...current, gif]
          : current;
      try {
        localStorage.setItem("mfb-chat-quick-gifs", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeRecentGif = (gif: GifItem) => {
    setRecentGifs((current) => {
      const next = current.filter((item) => item.id !== gif.id);
      try {
        localStorage.setItem("mfb-chat-recent-gifs", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const selectGif = async (gif: GifItem) => {
    if (uploading) return;

    setRecentGifs((current) => {
      const next = [gif, ...current.filter((item) => item.id !== gif.id)].slice(
        0,
        8,
      );
      try {
        localStorage.setItem("mfb-chat-recent-gifs", JSON.stringify(next));
      } catch {}
      return next;
    });

    if (aiMode) {
      setUploading(true);
      setError("");

      try {
        const gifResponse = await fetch(gif.url);
        if (!gifResponse.ok) {
          throw new Error(
            st("The GIF could not be loaded.", "GIF yüklenemedi."),
          );
        }

        const blob = await gifResponse.blob();

        if (blob.size > 10 * 1024 * 1024) {
          throw new Error(
            st(
              "GIFs larger than 10 MB cannot be sent to AI.",
              "10 MB'dan büyük GIF'ler AI'a gönderilemez.",
            ),
          );
        }

        const file = new File(
          [blob],
          `${gif.label.toLowerCase().replace(/\s+/g, "-")}.gif`,
          { type: "image/gif" },
        );

        setAiAttachment({
          fileName: file.name,
          mimeType: "image/gif",
          dataUrl: await fileToDataUrl(file),
          size: file.size,
          kind: "image",
        });

        setGifPickerOpen(false);
        setGifSearch("");
        setEmojiPickerOpen(false);
      } catch (err) {
        console.error("AI GIF hazırlama hatası:", err);
        setError(
          err instanceof Error
            ? err.message
            : st("The GIF could not be prepared.", "GIF hazırlanamadı."),
        );
      } finally {
        setUploading(false);
      }

      return;
    }

    if (!selectedChatId || !connection) return;

    setUploading(true);
    setError("");

    try {
      const gifResponse = await fetch(gif.url);
      if (!gifResponse.ok) {
        throw new Error("GIF indirilemedi.");
      }

      const blob = await gifResponse.blob();

      if (blob.size > 10 * 1024 * 1024) {
        throw new Error("GIF boyutu 10 MB'dan büyük olamaz.");
      }

      const file = new File(
        [blob],
        `${gif.label.toLowerCase().replace(/\s+/g, "-")}.gif`,
        { type: "image/gif" },
      );

      const token = getAccessToken();
      if (!token) throw new Error("Oturum bulunamadı.");

      const formData = new FormData();
      formData.append("chatId", selectedChatId);
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/Attachments/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const raw = await response.text();
      let data: Attachment | { message?: string } | null = null;

      if (raw.trim()) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(
            `Sunucudan geçersiz cevap geldi. HTTP ${response.status}`,
          );
        }
      }

      if (!response.ok) {
        const message = data && "message" in data ? data.message : undefined;
        throw new Error(message ?? `GIF yüklenemedi. HTTP ${response.status}`);
      }

      if (!data || !("url" in data) || !data.url) {
        throw new Error("Sunucu GIF yükleme bilgisini döndürmedi.");
      }

      setAttachment(data);
      setGifPickerOpen(false);
      setEmojiPickerOpen(false);
    } catch (err) {
      console.error("GIF yükleme hatası:", err);
      setError(err instanceof Error ? err.message : "GIF yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!gifPickerOpen) return;

    const query = gifSearch.trim();
    if (!query) {
      const merged = [...recentGifs, ...quickGifs].filter(
        (gif, index, list) =>
          list.findIndex((item) => item.id === gif.id) === index,
      );
      setGifResults(merged);
      setGifSearching(false);
      setGifSearchError("");
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    if (!apiKey) {
      setGifResults([]);
      setGifSearching(false);
      setGifSearchError(
        st(
          "GIPHY search is not configured. Add NEXT_PUBLIC_GIPHY_API_KEY to .env.local.",
          "GIPHY araması yapılandırılmamış. .env.local içine NEXT_PUBLIC_GIPHY_API_KEY ekleyin.",
        ),
      );
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setGifSearching(true);
      setGifSearchError("");

      try {
        const params = new URLSearchParams({
          api_key: apiKey,
          q: query.slice(0, 50),
          limit: "24",
          rating: "pg-13",
          lang: language === "Türkçe" ? "tr" : "en",
          bundle: "messaging_non_clips",
        });

        const response = await fetch(
          `https://api.giphy.com/v1/gifs/search?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`GIPHY search failed (${response.status})`);
        }

        const payload = await response.json();

        const results: GifItem[] = (payload.data ?? [])
          .map((item: any) => ({
            id: String(item.id),
            label: String(item.title || item.slug || query),
            url:
              item.images?.fixed_width?.url ||
              item.images?.downsized?.url ||
              item.images?.original?.url ||
              "",
          }))
          .filter((item: GifItem) => item.url);

        setGifResults(results);
        if (results.length === 0) {
          setGifSearchError(st("No GIFs found.", "GIF bulunamadı."));
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        console.error("GIPHY search error:", error);
        setGifResults([]);
        setGifSearchError(
          st(
            "GIF search could not be completed.",
            "GIF araması tamamlanamadı.",
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setGifSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [gifSearch, gifPickerOpen, language, recentGifs, quickGifs]);

  const toggleEmojiPicker = () => {
    setEmojiPickerOpen((open) => !open);
    setGifPickerOpen(false);
  };

  const toggleGifPicker = () => {
    setGifPickerOpen((open) => {
      if (!open) {
        setGifSearch("");
        setGifResults(
          [...recentGifs, ...quickGifs].filter(
            (gif, index, list) =>
              list.findIndex((item) => item.id === gif.id) === index,
          ),
        );
        setGifSearchError("");
      }
      return !open;
    });
    setEmojiPickerOpen(false);
  };

  const send = async () => {
    if (aiMode) {
      await sendAIMessage();
      return;
    }

    if (pendingVoiceFile) {
      await sendPendingVoiceRecording();
      return;
    }

    if (!connection || !selectedChatId || (!text.trim() && !attachment)) {
      return;
    }

    const messageText = text.trim();

    try {
      await connection.invoke(
        "SendMessage",
        selectedChatId,
        messageText,
        attachment?.url ?? null,
        attachment?.fileName ?? null,
        attachment?.contentType ?? null,
        attachment?.size ?? null,
        replyingTo?.id ?? null,
      );

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      try {
        await connection.invoke("StopTyping", selectedChatId);
      } catch {}

      setText("");
      setAttachment(null);
      setReplyingTo(null);
    } catch (err) {
      console.error("Mesaj gönderme hatası:", err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Mesaj gönderilemedi.";
      setError(message);
    }
  };

  const openGlobalSearchResult = (result: GlobalSearchResult) => {
    setSearchTargetMessageId(result.id);
    setSelectedChatId(result.chatId);
    setMessageSearchOpen(true);
  };

  const openAISearchResult = (result: GlobalSearchResult) => {
    setMessageSearchOpen(true);
    window.setTimeout(() => {
      document
        .getElementById(`ai-message-${result.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  useEffect(() => {
    if (!searchTargetMessageId || !selectedChatId) return;
    if (!messages.some((message) => message.id === searchTargetMessageId))
      return;
    const timer = setTimeout(() => scrollToMessage(searchTargetMessageId), 100);
    setSearchTargetMessageId(null);
    return () => clearTimeout(timer);
  }, [messages, selectedChatId, searchTargetMessageId]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      send();
    }
  };

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startMessageLongPress = (messageId: string) => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      setMobileActionMessageId(messageId);
      setMessageMenuId(null);
      setReactionPickerMessageId(null);
      longPressTimerRef.current = null;
    }, 500);
  };

  const cancelMessageLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const renderMessageContent = (content: string) => {
    return highlightMessage(content);
  };

  useEffect(() => {
    const styleId = "mfb-chat-settings-preferences";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      .chat-high-contrast body { filter: contrast(1.06); }
      .chat-larger-text body { font-size: 106%; }
      .chat-reduce-motion *, .chat-reduce-motion *::before, .chat-reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
        background-image: radial-gradient(circle at 70% 25%, rgba(52,211,153,.08), transparent 35%), radial-gradient(circle at 25% 80%, rgba(16,185,129,.05), transparent 32%);
      }
      .premium-shell[data-density="standard"] .luxury-message-row { margin-bottom: 0.55rem !important; }
      .premium-shell[data-density="comfortable"] .luxury-message-row { margin-bottom: 0.9rem !important; }
    `;
  }, []);

  const isEmojiOnlyMessage = (content?: string) => {
    const value = (content ?? "").trim();
    if (!value) return false;

    return Array.from(value).every((character) => {
      const codePoint = character.codePointAt(0) ?? 0;

      return (
        (codePoint >= 0x1f000 && codePoint <= 0x1faff) ||
        (codePoint >= 0x2600 && codePoint <= 0x27bf) ||
        (codePoint >= 0x2300 && codePoint <= 0x23ff) ||
        (codePoint >= 0x2b00 && codePoint <= 0x2bff) ||
        codePoint === 0xfe0f ||
        codePoint === 0x200d ||
        codePoint === 0x20e3 ||
        (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff) ||
        /\s/u.test(character)
      );
    });
  };

  const getUnreadCount = (chat: Chat) => {
    const value = unreadCounts[chat.id];
    return typeof value === "number" && value > 0 ? value : 0;
  };

  const getChatPreview = (chat: Chat) => {
    const preview =
      (
        chat as Chat & {
          lastMessage?: string | null;
          lastMessageContent?: string | null;
        }
      ).lastMessageContent ??
      (chat as Chat & { lastMessage?: string | null }).lastMessage;
    return (
      preview?.trim() || (chat.isGroup ? "Grup sohbeti" : "Henüz mesaj yok")
    );
  };

  const getChatPreviewTime = (chat: Chat) => {
    const value =
      (
        chat as Chat & {
          lastMessageAt?: string | null;
          updatedAt?: string | null;
        }
      ).lastMessageAt ??
      (chat as Chat & { updatedAt?: string | null }).updatedAt;
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString(language === "Türkçe" ? "tr-TR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getConnectionText = () => {
    switch (connectionState) {
      case "connected":
        return language === "Türkçe" ? "Bağlı" : "Connected";
      case "reconnecting":
        return language === "Türkçe"
          ? "Yeniden bağlanıyor..."
          : "Reconnecting...";
      case "connecting":
        return language === "Türkçe" ? "Bağlanıyor..." : "Connecting...";
      default:
        return language === "Türkçe" ? "Bağlantı kesildi" : "Disconnected";
    }
  };

  const formatTime = (date?: string) => {
    if (!date) return language === "Türkçe" ? "Şimdi" : "Now";

    return new Date(date).toLocaleTimeString(
      language === "Türkçe" ? "tr-TR" : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  };

  const formatMessageDate = (date?: string) => {
    if (!date) return "";
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return "";
    const now = new Date();
    const isToday =
      value.getFullYear() === now.getFullYear() &&
      value.getMonth() === now.getMonth() &&
      value.getDate() === now.getDate();
    if (isToday) return language === "Türkçe" ? "Bugün" : "Today";
    return value.toLocaleDateString(language === "Türkçe" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "long",
      year: value.getFullYear() === now.getFullYear() ? undefined : "numeric",
    });
  };

  const st = (english: string, turkish: string) =>
    language === "Türkçe" ? turkish : english;

  const APP_TRANSLATIONS: Record<string, string> = {
    "MFB Chat": "MFB Chat",
    "Communication platform": "İletişim platformu",
    "Search conversations...": "Sohbetlerde ara...",
    Conversations: "Sohbetler",
    Channels: "Gruplar",
    Online: "Çevrimiçi",
    Offline: "Çevrimdışı",
    "No conversations yet.": "Henüz sohbet yok.",
    "No messages yet": "Henüz mesaj yok",
    "Send the first message in this conversation.":
      "Bu sohbette ilk mesajı gönderin.",
    "Write a message...": "Bir mesaj yazın...",
    "Select a conversation...": "Bir sohbet seçin...",
    "Press Enter to send": "Göndermek için Enter'a basın",
    "Group chat": "Grup sohbeti",
    "Direct message": "Direkt mesaj",
    "Browser notifications enabled": "Tarayıcı bildirimleri etkin",
    "Enable browser notifications": "Tarayıcı bildirimlerini etkinleştir",
    "Shared media": "Paylaşılan medya",
    "Shared links": "Paylaşılan bağlantılar",
    "Shared files": "Paylaşılan dosyalar",
    "No shared media yet": "Henüz paylaşılan medya yok",
    "No shared links yet": "Henüz paylaşılan bağlantı yok",
    "No shared files yet": "Henüz paylaşılan dosya yok",
    "Images shared in this conversation will appear here.":
      "Bu sohbette paylaşılan görseller burada görünecek.",
    "Links shared in this conversation will appear here.":
      "Bu sohbette paylaşılan bağlantılar burada görünecek.",
    "Files shared in this conversation will appear here.":
      "Bu sohbette paylaşılan dosyalar burada görünecek.",
    Today: "Bugün",
    Yesterday: "Dün",
    Search: "Ara",
    Members: "Üyeler",
    Mute: "Sessize al",
    Unmute: "Sesi aç",
    "Edit group": "Grubu düzenle",
    "Manage members": "Üyeleri yönet",
    "Group members": "Grup üyeleri",
    "Manage members of": "Üyeleri yönetin:",
    "Add member": "Üye ekle",
    "Üye ekle": "Üye ekle",
    "Kullanıcı adı veya e-posta ara...": "Kullanıcı adı veya e-posta ara...",
    "Aranıyor...": "Aranıyor...",
    "Kullanıcı bulunamadı.": "Kullanıcı bulunamadı.",
    "Loading members...": "Üyeler yükleniyor...",
    "No members found.": "Üye bulunamadı.",
    Owner: "Sahip",
    Remove: "Kaldır",
    "Make admin": "Yönetici yap",
    "Remove admin": "Yöneticiliği kaldır",
    "Remove from group": "Gruptan çıkar",
    "Leave group": "Gruptan ayrıl",
    Admin: "Yönetici",
    Member: "Üye",
    "You can leave the group at any time.":
      "İsterseniz istediğiniz zaman gruptan ayrılabilirsiniz.",
    "Only owners and admins can add members.":
      "Yalnızca sahip ve yöneticiler üye ekleyebilir.",
    "Member actions": "Üye işlemleri",
    Joined: "Katıldı",
    "Only the group owner can edit group settings.":
      "Grup ayarlarını yalnızca grup sahibi değiştirebilir.",
    "Change the group name and avatar.": "Grup adını ve görselini değiştirin.",
    "Group avatar": "Grup görseli",
    "Change group avatar": "Grup görselini değiştir",
    "JPG, PNG, GIF or WebP · max 5 MB":
      "JPG, PNG, GIF veya WebP · en fazla 5 MB",
    "Uploading...": "Yükleniyor...",
    "Choose image": "Görsel seç",
    "Grup adı": "Grup adı",
    "örn. Yazılım Ekibi": "örn. Yazılım Ekibi",
    "Saving...": "Kaydediliyor...",
    "Grup oluştur": "Grup oluştur",
    "Create conversation": "Sohbet oluştur",
    Save: "Kaydet",
    İptal: "İptal",
    Close: "Kapat",
    Done: "Tamam",
    Back: "Geri",
    Next: "İleri",
    Add: "Ekle",
    "Change photo": "Fotoğrafı değiştir",
    "Change profile photo": "Profil fotoğrafını değiştir",
    "Profile settings": "Profil ayarları",
    "Manage your account information.": "Hesap bilgilerinizi yönetin.",
    "Profile information": "Profil bilgileri",
    "How other people see you.": "Diğer insanların sizi nasıl gördüğü.",
    Username: "Kullanıcı adı",
    "Display name": "Görünen ad",
    Bio: "Biyografi",
    "Profile completion": "Profil tamamlama",
    "Complete your profile so people can recognize you.":
      "İnsanların sizi tanıyabilmesi için profilinizi tamamlayın.",
    "How others see you": "Diğerleri sizi nasıl görüyor",
    "Live preview of your public profile.":
      "Herkese açık profilinizin canlı önizlemesi.",
    Status: "Durum",
    "Let people know what you are up to.": "Ne yaptığınızı insanlara bildirin.",
    Privacy: "Gizlilik",
    "Control presence and profile visibility.":
      "Çevrimiçi durumunuzu ve profil görünürlüğünüzü yönetin.",
    "Show online status": "Çevrimiçi durumunu göster",
    "Allow others to see when you are online.":
      "Başkalarının çevrimiçi olduğunuzu görmesine izin verin.",
    "Show last seen": "Son görülmeyi göster",
    "Allow others to see your last active time.":
      "Başkalarının son aktif olduğunuz zamanı görmesine izin verin.",
    "Read receipts": "Okundu bilgisi",
    "Let others know when you have read messages.":
      "Mesajları okuduğunuzu başkalarının görmesine izin verin.",
    "Profile photo": "Profil fotoğrafı",
    Everyone: "Herkes",
    Contacts: "Kişiler",
    Nobody: "Hiç kimse",
    "Account & security": "Hesap ve güvenlik",
    "Manage your password and active sessions.":
      "Şifrenizi ve aktif oturumlarınızı yönetin.",
    "Şifreyi değiştir": "Şifreyi değiştir",
    "Update your password and refresh all sessions.":
      "Şifrenizi güncelleyin ve tüm oturumları yenileyin.",
    "Log out all sessions": "Tüm oturumlardan çıkış yap",
    "Invalidate every active login session, including this one.":
      "Bu oturum dahil tüm aktif giriş oturumlarını geçersiz kılın.",
    "Danger zone": "Tehlikeli bölge",
    "This action cannot be undone.": "Bu işlem geri alınamaz.",
    "Hesabı sil": "Hesabı sil",
    "Permanently delete your profile, messages and account data.":
      "Profilinizi, mesajlarınızı ve hesap verilerinizi kalıcı olarak silin.",
    Email: "E-posta",
    "Member since": "Üyelik tarihi",
    "Log out": "Çıkış yap",
    "Forward message": "Mesajı ilet",
    "Choose a conversation.": "Bir sohbet seçin.",
    Reply: "Yanıtla",
    React: "Tepki ver",
    Pin: "Sabitle",
    Unpin: "Sabitlemeyi kaldır",
    Edit: "Düzenle",
    Delete: "Sil",
    Forward: "İlet",
    Copy: "Kopyala",
    "Save message": "Mesajı kaydet",
    Report: "Bildir",
    "Pinned message": "Sabitlenen mesaj",
    "Pinned messages": "Sabitlenen mesajlar",
    "Replying to": "Yanıtlanıyor:",
    Edited: "Düzenlendi",
    "Typing...": "Yazıyor...",
    "is typing...": "yazıyor...",
    "Loading...": "Yükleniyor...",
    "Loading conversations...": "Sohbetler yükleniyor...",
    "Messages are loading...": "Mesajlar yükleniyor...",
    "No results found.": "Sonuç bulunamadı.",
    "Search messages": "Mesajlarda ara",
    "Search messages...": "Mesajlarda ara...",
    "Clear search": "Aramayı temizle",
    "Close search": "Aramayı kapat",
    "Send message": "Mesaj gönder",
    "Insert emoji": "Emoji ekle",
    "Close emoji picker": "Emoji seçiciyi kapat",
    "Close GIF picker": "GIF seçiciyi kapat",
    GIFs: "GIF'ler",
    "Quick reactions": "Hızlı tepkiler",
    "Choose a reaction": "Bir tepki seçin",
    Recent: "Sık kullanılan",
    Faces: "Yüz ifadeleri",
    Gestures: "El hareketleri",
    Symbols: "Semboller",
    "Search GIFs...": "GIF ara...",
    Send: "Gönder",
    "No GIFs found": "GIF bulunamadı",
    "Try another search.": "Başka bir arama deneyin.",
    "Searching GIFs...": "GIF'ler aranıyor.",
    "No GIFs found.": "GIF bulunamadı.",
    "GIF search could not be completed.": "GIF araması tamamlanamadı.",

    Settings: "Ayarlar",
    "Appearance, notifications and account.": "Görünüm, bildirimler ve hesap.",
    Account: "Hesap",
    "Manage your profile, avatar and session.":
      "Profilinizi, avatarınızı ve oturumunuzu yönetin.",
    "Open profile": "Profili aç",
    "Open profile & privacy": "Profil ve gizliliği aç",
    "About MFB Chat": "MFB Chat hakkında",
    Version: "Sürüm",
    Platform: "Platform",
    Available: "Uygun",
    Working: "Çalışıyor",
    Studying: "Çalışıyor / Öğreniyor",
    "Do not disturb": "Rahatsız etmeyin",
    "Right back": "Hemen döneceğim",
    Never: "Asla",
    "Available, working, studying...":
      "Uygun, çalışıyor, çalışıyor/öğreniyor...",
    "No status set.": "Durum belirlenmedi.",
    Notifications: "Bildirimler",
    Message: "Mesaj",
    "Message sound": "Mesaj sesi",
    "Message preview": "Mesaj önizlemesi",
    Mentions: "Bahsetmeler",
    "Desktop notifications": "Masaüstü bildirimleri",
    "Notification behavior": "Bildirim davranışı",
    "All messages": "Tüm mesajlar",
    "Direct messages": "Sadece direkt mesajlar",
    "Mentions only": "Sadece bahsetmeler",
    None: "Hiçbiri",
    "Send test notification": "Test bildirimi gönder",
    "Quiet hours": "Sessiz saatler",
    "Pause notifications": "Bildirimleri duraklat",
    Resume: "Devam et",
    Accessibility: "Erişilebilirlik",
    "Larger text": "Büyük metin",
    "High contrast": "Yüksek kontrast",
    "Reduce animations": "Animasyonları azalt",
    Language: "Dil",
    "Storage & data": "Depolama ve veri",
    "Browser storage": "Tarayıcı depolaması",
    "Export my data": "Verilerimi dışa aktar",
    "Reset local preferences": "Yerel tercihleri sıfırla",
    "Privacy & security": "Gizlilik ve güvenlik",
    "Changes are saved automatically": "Değişiklikler otomatik kaydedilir",
    Saved: "Kaydedildi",
    "Updating...": "Güncelleniyor...",
    "Already taken": "Zaten alınmış",
    "Checking...": "Kontrol ediliyor...",
    Hide: "Gizle",
    Show: "Göster",
    Photo: "Fotoğraf",
    Name: "Ad",
    "No status set": "Durum belirlenmedi",
    "This device": "Bu cihaz",
    "Current browser session": "Mevcut tarayıcı oturumu",
    "Profile, privacy and account security controls.":
      "Profil, gizlilik ve hesap güvenliği ayarları.",
    "Open document": "Belgeyi aç",
    Attachment: "Ek",
    File: "Dosya",
    Image: "Görsel",
    "Shared image": "Paylaşılan görsel",
    "Shared file": "Paylaşılan dosya",
    "Conversation Details": "Sohbet ayrıntıları",
    Conversation: "Sohbet",
    "No conversation": "Sohbet yok",
    "Not selected": "Seçilmedi",
    Created: "Oluşturuldu",
    "Direct chat": "Direkt sohbet",
    member: "üye",
    members: "üye",
    "Attach file": "Dosya ekle",
    "Attach image or file": "Görsel veya dosya ekle",
    "Remove attachment": "Eki kaldır",
    "İptal reply": "Yanıtı iptal et",
    "Open emoji picker": "Emoji seçiciyi aç",
    "Open GIF picker": "GIF seçiciyi aç",
    "Close details": "Ayrıntıları kapat",
    "Close photo preview": "Fotoğraf önizlemesini kapat",
    "Save changes": "Değişiklikleri kaydet",
    "View profile photo": "Profil fotoğrafını görüntüle",
    "Status emoji": "Durum emojisi",
    "Message actions": "Mesaj işlemleri",
    More: "Daha fazla",
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mfb-chat-recent-emojis");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        ) {
          setRecentEmojis(parsed.slice(0, 18));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.lang = language === "Türkçe" ? "tr" : "en";

    const source = APP_TRANSLATIONS;
    const translations =
      language === "Türkçe"
        ? source
        : Object.fromEntries(
            Object.entries(source).map(([en, tr]) => [tr, en]),
          );

    const translateValue = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return value;
      if (translations[trimmed]) {
        return value.replace(trimmed, translations[trimmed]);
      }

      if (language === "Türkçe") {
        const online = trimmed.match(/^(\d+) online$/i);
        if (online) return value.replace(trimmed, `${online[1]} çevrimiçi`);
        const members = trimmed.match(/^(\d+) members?$/i);
        if (members) return value.replace(trimmed, `${members[1]} üye`);
        const results = trimmed.match(/^(\d+) results?$/i);
        if (results) return value.replace(trimmed, `${results[1]} sonuç`);
      } else {
        const online = trimmed.match(/^(\d+) çevrimiçi$/i);
        if (online) return value.replace(trimmed, `${online[1]} online`);
        const members = trimmed.match(/^(\d+) üye$/i);
        if (members) return value.replace(trimmed, `${members[1]} members`);
        const results = trimmed.match(/^(\d+) sonuç$/i);
        if (results) return value.replace(trimmed, `${results[1]} results`);
      }
      return value;
    };

    const translateRoot = (root: Node) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let current: Node | null;
      while ((current = walker.nextNode())) {
        const parent = current.parentElement;
        if (!parent) continue;
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") continue;
        if (parent.closest("[data-no-translate]")) continue;
        textNodes.push(current as Text);
      }
      textNodes.forEach((node) => {
        const next = translateValue(node.nodeValue ?? "");
        if (next !== node.nodeValue) node.nodeValue = next;
      });

      const elements =
        root instanceof Element
          ? [root, ...Array.from(root.querySelectorAll("*"))]
          : Array.from(document.querySelectorAll("*"));
      elements.forEach((element) => {
        ["placeholder", "title", "aria-label"].forEach((attribute) => {
          const value = element.getAttribute(attribute);
          if (!value) return;
          const next = translateValue(value);
          if (next !== value) element.setAttribute(attribute, next);
        });
      });
    };

    translateRoot(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData" && mutation.target) {
          const node = mutation.target as Text;
          const next = translateValue(node.nodeValue ?? "");
          if (next !== node.nodeValue) node.nodeValue = next;
        }
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE ||
            node.nodeType === Node.TEXT_NODE
          ) {
            translateRoot(node);
          }
        });
        if (
          mutation.type === "attributes" &&
          mutation.target instanceof Element
        ) {
          const target = mutation.target;
          ["placeholder", "title", "aria-label"].forEach((attribute) => {
            const value = target.getAttribute(attribute);
            if (!value) return;
            const next = translateValue(value);
            if (next !== value) target.setAttribute(attribute, next);
          });
        }
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    return () => observer.disconnect();
  }, [language]);

  const densityLabel = (value: "compact" | "standard" | "comfortable") =>
    ({
      compact: st("Compact", "Kompakt"),
      standard: st("Standard", "Standart"),
      comfortable: st("Comfortable", "Rahat"),
    })[value];

  const wallpaperLabel = (value: "none" | "grid" | "dots" | "glow") =>
    (
      ({
        none: st("None", "Yok"),
        grid: st("Grid", "Izgara"),
        dots: st("Dots", "Noktalar"),
        glow: st("Glow", "Parıltı"),
      }) as const
    )[value];

  if (!authReady) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

        :root {
          color-scheme: dark;
          --lux-bg: #020806;
          --lux-panel: #06130e;
          --lux-panel-2: #091a13;
          --lux-panel-3: #0d2419;
          --lux-line: rgba(112, 255, 193, 0.1);
          --lux-line-strong: rgba(112, 255, 193, 0.18);
          --lux-text: #f2fff8;
          --lux-muted: #789589;
          --lux-green: #39f6a3;
          --lux-green-deep: #10b981;
          --lux-lime: #b8ff62;
        }

        html.dark,
        html.dark body {
          background: var(--lux-bg);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .luxury-app {
          background:
            radial-gradient(
              700px 320px at 48% -8%,
              rgba(57, 246, 163, 0.09),
              transparent 68%
            ),
            radial-gradient(
              460px 560px at 100% 50%,
              rgba(16, 185, 129, 0.035),
              transparent 70%
            ),
            linear-gradient(135deg, #020806 0%, #03100a 48%, #020806 100%);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .luxury-app::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 20;
          pointer-events: none;
          opacity: 0.48;
          background:
            radial-gradient(
              circle at 20% 15%,
              rgba(255, 255, 255, 0.018),
              transparent 22%
            ),
            radial-gradient(
              circle at 80% 70%,
              rgba(57, 246, 163, 0.018),
              transparent 26%
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.012) 1px,
              transparent 1px
            ),
            linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px);
          background-size:
            auto,
            auto,
            56px 56px,
            56px 56px;
          mix-blend-mode: screen;
        }

        .premium-panel {
          background: linear-gradient(
            180deg,
            rgba(7, 25, 17, 0.985),
            rgba(2, 12, 8, 0.99)
          );
          box-shadow:
            24px 0 80px rgba(0, 0, 0, 0.26),
            inset -1px 0 rgba(120, 255, 199, 0.045);
        }

        .luxury-brandbar {
          position: relative;
          background: linear-gradient(
            180deg,
            rgba(7, 27, 18, 0.96),
            rgba(4, 18, 12, 0.86)
          );
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
        }

        .luxury-brandbar::after {
          content: "";
          position: absolute;
          left: 20px;
          right: 20px;
          bottom: -1px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(57, 246, 163, 0.18),
            transparent
          );
        }

        .luxury-search {
          position: relative;
          background: linear-gradient(
            145deg,
            rgba(11, 35, 23, 0.92),
            rgba(6, 24, 16, 0.92)
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.025),
            0 8px 28px rgba(0, 0, 0, 0.1);
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease;
        }

        .luxury-search:focus-within {
          border-color: rgba(57, 246, 163, 0.21) !important;
          box-shadow:
            0 0 0 3px rgba(57, 246, 163, 0.028),
            0 10px 32px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .luxury-conversation-item {
          position: relative;
          min-height: 68px;
          border: 1px solid transparent;
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.008),
            transparent 70%
          );
          transition:
            background 180ms ease,
            border-color 180ms ease,
            transform 180ms ease;
        }

        .luxury-conversation-item:hover {
          transform: translateX(1px);
        }

        .luxury-conversation-item .luxury-chat-avatar {
          box-shadow:
            0 0 0 1px rgba(176, 255, 216, 0.1),
            0 10px 26px rgba(0, 0, 0, 0.2);
        }

        .luxury-conversation-item:hover {
          background: linear-gradient(
            90deg,
            rgba(20, 52, 35, 0.62),
            rgba(9, 28, 19, 0.3)
          ) !important;
          border-color: rgba(104, 255, 190, 0.055);
        }

        .luxury-conversation-item .rounded-full.bg-emerald-500 {
          box-shadow:
            0 0 0 1px rgba(176, 255, 216, 0.1),
            0 8px 24px rgba(16, 185, 129, 0.13);
        }

        /* Selected conversation: restrained luxury, not neon. */
        .luxury-conversation-item.bg-emerald-50 {
          background: linear-gradient(
            90deg,
            rgba(57, 246, 163, 0.12),
            rgba(57, 246, 163, 0.035)
          ) !important;
        }

        .luxury-conversation-item.bg-emerald-50::before {
          content: "";
          position: absolute;
          left: -1px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(
            180deg,
            var(--lux-green),
            var(--lux-lime)
          );
          box-shadow: 0 0 16px rgba(57, 246, 163, 0.28);
        }

        .premium-header {
          background: linear-gradient(
            180deg,
            rgba(4, 18, 12, 0.94),
            rgba(3, 14, 9, 0.82)
          );
          backdrop-filter: blur(24px) saturate(145%);
          -webkit-backdrop-filter: blur(24px) saturate(145%);
          box-shadow:
            0 1px 0 rgba(120, 255, 199, 0.05),
            0 18px 45px rgba(0, 0, 0, 0.1);
        }

        .premium-chat {
          position: relative;
          isolation: isolate;
          background:
            radial-gradient(
              620px 300px at 72% -4%,
              rgba(57, 246, 163, 0.055),
              transparent 68%
            ),
            radial-gradient(
              460px 420px at 18% 78%,
              rgba(16, 185, 129, 0.022),
              transparent 70%
            ),
            linear-gradient(180deg, #020806 0%, #020a07 100%);
        }

        .premium-chat::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          opacity: 0.34;
          background-image:
            linear-gradient(rgba(112, 255, 193, 0.018) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(112, 255, 193, 0.018) 1px,
              transparent 1px
            );
          background-size: 64px 64px;
          mask-image: linear-gradient(to bottom, black, transparent 92%);
          -webkit-mask-image: linear-gradient(
            to bottom,
            black,
            transparent 92%
          );
        }

        .luxury-chat-viewport {
          scrollbar-gutter: stable;
          overscroll-behavior: contain;
          scroll-behavior: smooth;
        }

        .luxury-message-list {
          min-height: 100%;
          display: flex;
          flex-direction: column;
        }

        .premium-chat::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 0;
          width: 460px;
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(57, 246, 163, 0.2),
            transparent
          );
          pointer-events: none;
        }

        .message-actions button {
          transition:
            transform 160ms ease,
            color 160ms ease,
            background-color 160ms ease;
        }

        .message-actions button:hover {
          transform: translateY(-1px);
          color: rgb(110 231 183);
          background: rgba(52, 211, 117, 0.08);
        }

        .premium-avatar {
          position: relative;
          border: 1px solid rgba(113, 255, 176, 0.24);
          box-shadow:
            0 0 0 2px rgba(35, 161, 93, 0.07),
            0 0 0 5px rgba(35, 161, 93, 0.025),
            0 8px 24px rgba(0, 0, 0, 0.34),
            inset 0 0 0 1px rgba(255, 255, 255, 0.06);
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
        }

        .premium-avatar::after {
          content: "";
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          pointer-events: none;
          border: 1px solid rgba(83, 224, 137, 0.08);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08),
            transparent 35%,
            rgba(55, 190, 108, 0.06)
          );
        }

        .premium-avatar-lg {
          box-shadow:
            0 0 0 3px rgba(35, 161, 93, 0.075),
            0 0 0 7px rgba(35, 161, 93, 0.03),
            0 14px 36px rgba(0, 0, 0, 0.4),
            inset 0 0 0 1px rgba(255, 255, 255, 0.07);
        }

        .premium-avatar-xl {
          box-shadow:
            0 0 0 3px rgba(35, 161, 93, 0.08),
            0 0 0 8px rgba(35, 161, 93, 0.032),
            0 18px 44px rgba(0, 0, 0, 0.45),
            inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .premium-avatar:hover {
          transform: translateY(-1px);
          border-color: rgba(113, 255, 176, 0.38);
          box-shadow:
            0 0 0 3px rgba(35, 161, 93, 0.12),
            0 0 22px rgba(53, 205, 117, 0.1),
            0 10px 28px rgba(0, 0, 0, 0.38),
            inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .luxury-message-row {
          width: 100%;
          animation: luxuryMessageIn 220ms ease both;
          -webkit-touch-callout: none;
        }

        /* Light theme: a real light surface system, while preserving the MFB Chat identity. */
        :root[data-theme="light"] {
          color-scheme: light;
          --lux-bg: #f3f7f5;
          --lux-panel: #ffffff;
          --lux-panel-2: #f7faf8;
          --lux-panel-3: #eef5f1;
          --lux-line: rgba(20, 78, 53, 0.12);
          --lux-line-strong: rgba(20, 78, 53, 0.2);
          --lux-text: #10251d;
          --lux-muted: #647a70;
          --lux-green: #12b978;
          --lux-green-deep: #0b9f66;
          --lux-lime: #6bcf9e;
        }

        html[data-theme="light"],
        html[data-theme="light"] body {
          background: #f3f7f5;
          color: #10251d;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .premium-shell[data-theme="light"] {
          background: #f3f7f5 !important;
          color: #10251d !important;
        }

        .premium-shell[data-theme="light"] .luxury-app {
          background:
            radial-gradient(
              700px 320px at 48% -8%,
              rgba(18, 185, 120, 0.08),
              transparent 68%
            ),
            radial-gradient(
              460px 560px at 100% 50%,
              rgba(18, 185, 120, 0.045),
              transparent 70%
            ),
            linear-gradient(135deg, #f7faf8 0%, #edf5f1 48%, #f7faf8 100%);
        }

        .premium-shell[data-theme="light"] .luxury-app::before {
          opacity: 0.26;
          background:
            radial-gradient(
              circle at 20% 15%,
              rgba(16, 70, 48, 0.035),
              transparent 22%
            ),
            radial-gradient(
              circle at 80% 70%,
              rgba(18, 185, 120, 0.035),
              transparent 26%
            ),
            linear-gradient(
              90deg,
              rgba(16, 70, 48, 0.035) 1px,
              transparent 1px
            ),
            linear-gradient(rgba(16, 70, 48, 0.035) 1px, transparent 1px);
          mix-blend-mode: normal;
        }

        .premium-shell[data-theme="light"] .premium-panel {
          background: linear-gradient(180deg, #ffffff 0%, #f6faf8 100%);
          box-shadow:
            24px 0 60px rgba(18, 58, 43, 0.055),
            inset -1px 0 rgba(20, 78, 53, 0.08);
        }

        .premium-shell[data-theme="light"] .luxury-brandbar {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.96),
            rgba(247, 251, 249, 0.94)
          );
          box-shadow: 0 1px 0 rgba(20, 78, 53, 0.05);
        }

        .premium-shell[data-theme="light"] .luxury-brandbar::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(18, 185, 120, 0.18),
            transparent
          );
        }

        .premium-shell[data-theme="light"] .luxury-search {
          background: linear-gradient(145deg, #ffffff, #f4f8f6);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            0 8px 24px rgba(20, 78, 53, 0.05);
        }

        .premium-shell[data-theme="light"] .luxury-search:focus-within {
          border-color: rgba(18, 185, 120, 0.48) !important;
          box-shadow:
            0 0 0 4px rgba(18, 185, 120, 0.08),
            0 10px 28px rgba(20, 78, 53, 0.07);
        }

        .premium-shell[data-theme="light"] .luxury-conversation-item {
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.75),
            rgba(247, 250, 248, 0.5)
          );
        }

        .premium-shell[data-theme="light"] .luxury-conversation-item:hover {
          background: linear-gradient(
            90deg,
            rgba(18, 185, 120, 0.075),
            rgba(18, 185, 120, 0.025)
          ) !important;
          border-color: rgba(18, 120, 82, 0.08);
        }

        .premium-shell[data-theme="light"]
          .luxury-conversation-item.bg-emerald-50 {
          background: linear-gradient(
            90deg,
            rgba(18, 185, 120, 0.13),
            rgba(18, 185, 120, 0.045)
          ) !important;
        }

        .premium-shell[data-theme="light"] .premium-header {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.96),
            rgba(247, 251, 249, 0.92)
          );
          box-shadow:
            0 1px 0 rgba(20, 78, 53, 0.08),
            0 18px 40px rgba(20, 78, 53, 0.045);
        }

        .premium-shell[data-theme="light"] .premium-chat {
          background:
            radial-gradient(
              620px 300px at 72% -4%,
              rgba(18, 185, 120, 0.075),
              transparent 68%
            ),
            radial-gradient(
              460px 420px at 18% 78%,
              rgba(18, 185, 120, 0.035),
              transparent 70%
            ),
            linear-gradient(180deg, #f8fbf9 0%, #f1f7f4 100%);
        }

        .premium-shell[data-theme="light"] .premium-chat::before {
          opacity: 0.55;
          background-image:
            linear-gradient(rgba(20, 78, 53, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20, 78, 53, 0.045) 1px, transparent 1px);
          mask-image: linear-gradient(to bottom, black, transparent 94%);
          -webkit-mask-image: linear-gradient(
            to bottom,
            black,
            transparent 94%
          );
        }

        .premium-shell[data-theme="light"] .premium-chat::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(18, 185, 120, 0.22),
            transparent
          );
        }

        .premium-shell[data-theme="light"] .premium-avatar {
          border-color: rgba(82, 190, 125, 0.35);
          box-shadow:
            0 0 0 2px rgba(82, 190, 125, 0.12),
            0 5px 18px rgba(48, 110, 72, 0.1),
            inset 0 0 0 1px rgba(255, 255, 255, 0.85);
        }

        .premium-shell[data-theme="light"] .premium-avatar::after {
          border-color: rgba(82, 190, 125, 0.1);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.5),
            transparent 45%,
            rgba(82, 190, 125, 0.06)
          );
        }

        .premium-shell[data-theme="light"] .premium-message-bubble {
          border-color: rgba(20, 78, 53, 0.09);
          box-shadow:
            0 10px 28px rgba(20, 78, 53, 0.075),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .premium-shell[data-theme="light"] .premium-message-bubble:hover {
          border-color: rgba(18, 150, 96, 0.18);
          box-shadow:
            0 14px 34px rgba(20, 78, 53, 0.1),
            0 0 20px rgba(18, 185, 120, 0.025);
        }

        .premium-shell[data-theme="light"] .premium-message-incoming {
          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #f2f7f4 100%
          ) !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
        }
        .premium-shell[data-theme="light"] .premium-message-own {
          background: linear-gradient(
            135deg,
            #a8e3bc 0%,
            #8fd8aa 58%,
            #8ed7a8 100%
          ) !important;
          color: #183024 !important;
          border: 1px solid rgba(20, 78, 53, 0.28) !important;
          box-shadow:
            0 3px 10px rgba(20, 78, 53, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }
        .premium-shell[data-theme="light"] .premium-composer {
          background: linear-gradient(145deg, #ffffff, #f3f8f5);
          border-color: rgba(20, 110, 76, 0.16) !important;
          box-shadow:
            0 -20px 50px rgba(20, 78, 53, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .premium-shell[data-theme="light"] .premium-composer:focus-within {
          border-color: rgba(18, 185, 120, 0.42) !important;
          box-shadow:
            0 0 0 4px rgba(18, 185, 120, 0.07),
            0 0 34px rgba(18, 185, 120, 0.06),
            0 -20px 50px rgba(20, 78, 53, 0.07);
        }

        .premium-shell[data-theme="light"] .luxury-attachment,
        .premium-shell[data-theme="light"] .luxury-file-card,
        .premium-shell[data-theme="light"] .luxury-details-stat,
        .premium-shell[data-theme="light"] .luxury-action-tile,
        .premium-shell[data-theme="light"] .luxury-status-pill {
          border-color: rgba(20, 78, 53, 0.1) !important;
          background: linear-gradient(145deg, #ffffff, #f1f7f4);
          box-shadow:
            0 10px 28px rgba(20, 78, 53, 0.055),
            inset 0 1px 0 rgba(255, 255, 255, 0.85);
        }

        .premium-shell[data-theme="light"]
          .luxury-action-tile:not(:disabled):hover {
          border-color: rgba(18, 185, 120, 0.28);
          background: linear-gradient(145deg, #ffffff, #edf8f3);
        }

        .premium-shell[data-theme="light"] .luxury-details {
          background: linear-gradient(180deg, #ffffff 0%, #f5faf7 100%);
          box-shadow:
            -22px 0 60px rgba(20, 78, 53, 0.055),
            inset 1px 0 rgba(20, 78, 53, 0.07);
        }

        .premium-shell[data-theme="light"] .luxury-details-header {
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 1px 0 rgba(20, 78, 53, 0.06);
        }

        .premium-shell[data-theme="light"] .luxury-details-section::before,
        .premium-shell[data-theme="light"] .luxury-date-separator::before,
        .premium-shell[data-theme="light"] .luxury-date-separator::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(20, 120, 80, 0.16),
            transparent
          );
        }

        .premium-shell[data-theme="light"] .luxury-details-stat-label,
        .premium-shell[data-theme="light"] .luxury-date-separator {
          color: #71857c;
        }

        .premium-shell[data-theme="light"] .luxury-details-stat-value {
          color: #18382b;
        }

        .premium-shell[data-theme="light"] .luxury-section-kicker {
          color: #637970;
        }

        .premium-shell[data-theme="light"] .premium-message-action {
          color: #60766d;
          background: rgba(255, 255, 255, 0.82);
          border-color: rgba(20, 78, 53, 0.08);
        }

        .premium-shell[data-theme="light"] .premium-message-action:hover {
          color: #0b8f5e;
          background: rgba(18, 185, 120, 0.08);
          border-color: rgba(18, 185, 120, 0.18);
        }

        .premium-shell[data-theme="light"] .text-slate-100 {
          color: #163228 !important;
        }
        .premium-shell[data-theme="light"] .text-slate-200 {
          color: #29453a !important;
        }
        .premium-shell[data-theme="light"] .text-slate-300 {
          color: #425d52 !important;
        }
        .premium-shell[data-theme="light"] .text-slate-400 {
          color: #667d73 !important;
        }
        .premium-shell[data-theme="light"] .text-slate-500 {
          color: #70867d !important;
        }
        .premium-shell[data-theme="light"]
          .placeholder\:text-slate-400::placeholder {
          color: #8aa097 !important;
        }

        /* Light mode: preserve the emerald/black identity without low-contrast
           dark-theme tokens leaking into the white UI. */
        .premium-shell[data-theme="light"] .text-emerald-300 {
          color: #0b9f66 !important;
        }
        .premium-shell[data-theme="light"] .text-emerald-400 {
          color: #079565 !important;
        }
        .premium-shell[data-theme="light"] .text-red-100 {
          color: #991b1b !important;
        }
        .premium-shell[data-theme="light"] .text-red-200 {
          color: #b42318 !important;
        }
        .premium-shell[data-theme="light"] .text-red-300 {
          color: #c92a2a !important;
        }
        .premium-shell[data-theme="light"] .text-red-300\/60 {
          color: rgba(185, 28, 28, 0.66) !important;
        }

        .premium-shell[data-theme="light"] .premium-profile-modal {
          background:
            radial-gradient(
              700px 260px at 50% -10%,
              rgba(18, 185, 120, 0.055),
              transparent 70%
            ),
            linear-gradient(180deg, #ffffff 0%, #f8fbf9 100%) !important;
          border-color: rgba(20, 78, 53, 0.12) !important;
          box-shadow:
            0 30px 90px rgba(20, 78, 53, 0.14),
            0 8px 30px rgba(20, 78, 53, 0.06) !important;
        }

        .premium-shell[data-theme="light"] .premium-profile-modal section {
          background: #ffffff !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
        }

        /* PROFILE ONLY: preserve the original cards, but make their light-mode
           surface white. Hover adds only a restrained emerald outline/glow. */
        .premium-shell[data-theme="light"]
          .premium-profile-modal
          section:not(:first-child)
          > button {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease !important;
        }

        .premium-shell[data-theme="light"]
          .premium-profile-modal
          section:not(:first-child)
          > button:hover {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          border-color: rgba(16, 185, 129, 0.55) !important;
          box-shadow:
            0 0 0 2px rgba(16, 185, 129, 0.07),
            0 8px 24px rgba(16, 185, 129, 0.08) !important;
          transform: translateY(-1px);
        }

        .premium-shell[data-theme="light"]
          .premium-profile-modal
          .bg-red-500\/\[0.035\] {
          background: linear-gradient(
            145deg,
            rgba(254, 242, 242, 0.94),
            rgba(255, 247, 247, 0.86)
          ) !important;
          border-color: rgba(220, 38, 38, 0.18) !important;
        }

        .premium-shell[data-theme="light"]
          .premium-profile-modal
          .bg-red-500\/\[0.04\] {
          background: rgba(254, 242, 242, 0.82) !important;
          border-color: rgba(220, 38, 38, 0.15) !important;
        }

        .premium-shell[data-theme="light"]
          .premium-profile-modal
          .bg-emerald-400\/\[0.035\] {
          background: linear-gradient(
            145deg,
            rgba(236, 253, 245, 0.88),
            rgba(248, 252, 250, 0.9)
          ) !important;
        }

        /* Conversation details: the original dark tiles used !important
           backgrounds, so give them a deliberate light counterpart. */
        .premium-shell[data-theme="light"] .luxury-details-primary-action {
          color: #24463a !important;
          background: linear-gradient(145deg, #ffffff, #eef7f2) !important;
          border-color: rgba(20, 78, 53, 0.11) !important;
          box-shadow:
            0 8px 22px rgba(20, 78, 53, 0.055),
            inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
        }

        .premium-shell[data-theme="light"]
          .luxury-details-primary-action:hover {
          color: #087a51 !important;
          background: linear-gradient(145deg, #ffffff, #e8f7f0) !important;
          border-color: rgba(18, 185, 120, 0.25) !important;
        }

        .premium-shell[data-theme="light"] .luxury-details-notification {
          color: #4b665b !important;
          background: linear-gradient(145deg, #ffffff, #eef7f2) !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
        }

        .premium-shell[data-theme="light"] .luxury-details-media-card {
          background: linear-gradient(145deg, #ffffff, #f0f7f4) !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
        }

        .premium-shell[data-theme="light"] .luxury-details-file {
          background: linear-gradient(145deg, #ffffff, #f0f7f4) !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
        }

        .premium-shell[data-theme="light"] .luxury-details-link {
          background: linear-gradient(145deg, #ffffff, #f0f7f4) !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
        }

        .premium-shell[data-theme="light"] .luxury-details-identity-inner {
          background: #edf6f2 !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
          color: #173b2c !important;
        }

        .premium-shell[data-theme="light"] .luxury-details .text-white {
          color: #173b2c !important;
        }

        .premium-shell[data-theme="light"] .luxury-details .text-slate-200 {
          color: #29483c !important;
        }

        .premium-shell[data-theme="light"] .luxury-details .text-slate-300 {
          color: #4c665c !important;
        }

        .premium-shell[data-theme="light"] input,
        .premium-shell[data-theme="light"] textarea {
          color: #163228;
        }

        .premium-shell[data-theme="light"] ::selection {
          background: rgba(18, 185, 120, 0.18);
          color: #10251d;
        }

        .premium-shell[data-theme="light"] ::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .premium-shell[data-theme="light"] ::-webkit-scrollbar-track {
          background: transparent;
        }

        .premium-shell[data-theme="light"] ::-webkit-scrollbar-thumb {
          background: rgba(20, 100, 70, 0.16);
          border-radius: 999px;
        }

        .premium-shell[data-theme="light"] ::-webkit-scrollbar-thumb:hover {
          background: rgba(18, 185, 120, 0.28);
        }

        .premium-shell[data-theme="light"][data-wallpaper="none"]
          .premium-chat {
          background-image: none;
        }

        @media (max-width: 767px) {
          .luxury-message-row {
            touch-action: pan-y;
            user-select: none;
          }
        }

        @keyframes luxuryMessageIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .premium-message-bubble {
          border: 1px solid rgba(255, 255, 255, 0.055);
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .premium-message-bubble:hover {
          transform: translateY(-1px);
          border-color: rgba(110, 255, 191, 0.12);
          box-shadow:
            0 16px 38px rgba(0, 0, 0, 0.22),
            0 0 22px rgba(57, 246, 163, 0.025),
            inset 0 1px 0 rgba(255, 255, 255, 0.045);
        }

        .luxury-message-meta {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 5px;
          padding: 0 3px;
          color: #526d61;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .luxury-message-meta .read-state {
          display: inline-flex;
          align-items: center;
        }

        .luxury-file-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 290px;
          max-width: min(470px, 72vw);
          padding: 10px 12px;
          border-radius: 15px;
          overflow: hidden;
          background: linear-gradient(
            135deg,
            rgba(47, 205, 139, 0.92),
            rgba(24, 159, 105, 0.9)
          );
          color: #032116;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            0 14px 34px rgba(0, 0, 0, 0.17);
          transition:
            transform 160ms ease,
            box-shadow 160ms ease;
        }

        .luxury-file-card:hover {
          transform: translateY(-1px);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 18px 42px rgba(0, 0, 0, 0.22);
        }

        .luxury-file-icon {
          display: flex;
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: rgba(2, 33, 22, 0.13);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        /* Message actions appear only on hover and never participate in the
           message layout. They are anchored to the bubble wrapper. */
        .message-hover-actions {
          position: absolute;
          z-index: 50;
          display: flex;
          align-items: center;
          min-height: 30px;
          width: max-content;
          padding: 2px;
          border: 1px solid rgba(92, 190, 139, 0.18);
          border-radius: 10px;
          background: #ffffff;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
          backdrop-filter: none;
          opacity: 0;
          pointer-events: none;
          white-space: nowrap;
          transition:
            opacity 150ms ease,
            transform 150ms ease;
        }

        /* Keep the toolbar close to the bubble. The sender name remains visible
           because the toolbar is only one compact row above the bubble. */
        .message-hover-actions.incoming {
          top: -34px;
          left: 0;
          right: auto;
          bottom: auto;
          transform: translateY(4px);
        }

        .message-hover-actions.outgoing {
          top: -34px;
          right: 0;
          left: auto;
          bottom: auto;
          transform: translateY(4px);
        }

        .luxury-message-row:hover .message-hover-actions,
        .message-hover-actions:focus-within {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .message-hover-actions > button,
        .message-hover-actions > div > button {
          color: #5f756a;
        }

        .message-hover-actions > button:hover,
        .message-hover-actions > div > button:hover,
        .message-hover-actions > div > button[aria-expanded="true"] {
          color: #7af0b1;
          background: rgba(74, 222, 128, 0.1);
        }

        @media (max-width: 767px) {
          /* Mobile actions are intentionally hidden. A 500ms long-press opens
             the WhatsApp-style bottom action sheet instead. */
          .message-hover-actions {
            opacity: 0;
            transform: none !important;
            pointer-events: none;
          }

          .message-hover-actions > button,
          .message-hover-actions > div {
            opacity: 0;
            transform: translateY(2px);
            pointer-events: none;
          }
        }

        .message-hover-actions > div > div {
          animation: messageMenuIn 120ms ease both;
          transform-origin: bottom right;
        }

        @keyframes messageMenuIn {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .premium-composer button {
          min-height: 32px;
        }

        .premium-message-own {
          background: #8fd8aa !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
          color: #183024 !important;
          border-color: rgba(175, 255, 216, 0.16) !important;
          box-shadow:
            0 12px 34px rgba(16, 185, 129, 0.14),
            inset 0 1px 0 rgba(237, 255, 247, 0.17);
        }

        .premium-message-incoming {
          background: linear-gradient(
            145deg,
            #0d2419 0%,
            #081b12 100%
          ) !important;
          border-color: rgba(104, 255, 190, 0.07) !important;
        }

        .luxury-attachment {
          position: relative;
          background: linear-gradient(
            145deg,
            rgba(10, 31, 21, 0.98),
            rgba(4, 17, 11, 0.98)
          );
          box-shadow:
            0 16px 42px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
          border-color: rgba(105, 255, 190, 0.11) !important;
        }

        .luxury-attachment img {
          display: block;
          width: 100%;
          max-height: 340px;
          object-fit: cover;
        }

        .luxury-details {
          background: linear-gradient(
            180deg,
            rgba(7, 25, 17, 0.985),
            rgba(2, 13, 9, 0.99)
          );
          box-shadow:
            -22px 0 70px rgba(0, 0, 0, 0.18),
            inset 1px 0 rgba(120, 255, 199, 0.035);
        }

        .luxury-details-header {
          background: rgba(5, 19, 13, 0.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .luxury-details .rounded-full.bg-emerald-500 {
          box-shadow:
            0 0 0 5px rgba(57, 246, 163, 0.035),
            0 14px 42px rgba(16, 185, 129, 0.16);
        }

        .premium-composer {
          background: linear-gradient(
            145deg,
            rgba(9, 31, 21, 0.98),
            rgba(4, 18, 12, 0.99)
          );
          border-color: rgba(110, 255, 191, 0.12) !important;
          box-shadow:
            0 -25px 65px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .premium-composer:focus-within {
          border-color: rgba(57, 246, 163, 0.27) !important;
          box-shadow:
            0 0 0 4px rgba(57, 246, 163, 0.035),
            0 0 48px rgba(57, 246, 163, 0.065),
            0 -25px 65px rgba(0, 0, 0, 0.22);
        }

        html.dark button:not(:disabled) {
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          transition:
            background-color 160ms ease,
            border-color 160ms ease,
            color 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease;
        }

        html.dark button:not(:disabled):hover {
          box-shadow: 0 0 22px rgba(57, 246, 163, 0.045);
        }

        html.dark .bg-emerald-500 {
          background: linear-gradient(135deg, #2ce995, #12b979) !important;
          box-shadow:
            0 8px 24px rgba(16, 185, 129, 0.14),
            inset 0 1px 0 rgba(237, 255, 247, 0.16);
        }

        html.dark .bg-emerald-500:hover {
          background: linear-gradient(135deg, #57f6ae, #21d68e) !important;
          box-shadow:
            0 12px 32px rgba(16, 185, 129, 0.2),
            0 0 26px rgba(57, 246, 163, 0.07);
        }

        html.dark input::placeholder,
        html.dark textarea::placeholder {
          color: #577466;
        }

        html.dark ::selection {
          background: rgba(57, 246, 163, 0.22);
          color: #effff7;
        }

        html.dark ::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        html.dark ::-webkit-scrollbar-track {
          background: transparent;
        }

        html.dark ::-webkit-scrollbar-thumb {
          background: rgba(57, 246, 163, 0.13);
          border-radius: 999px;
        }

        html.dark ::-webkit-scrollbar-thumb:hover {
          background: rgba(57, 246, 163, 0.26);
        }

        .luxury-sidebar-scroll {
          scrollbar-gutter: stable;
        }

        .luxury-details-section {
          position: relative;
        }

        .luxury-details-section::before {
          content: "";
          position: absolute;
          left: 0;
          top: -14px;
          width: 32px;
          height: 1px;
          background: linear-gradient(
            90deg,
            rgba(57, 246, 163, 0.25),
            transparent
          );
        }

        .luxury-status-pill {
          background: linear-gradient(
            180deg,
            rgba(9, 36, 23, 0.9),
            rgba(6, 24, 16, 0.9)
          );
          border: 1px solid rgba(104, 255, 190, 0.1);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
        }

        .luxury-action-tile {
          border: 1px solid rgba(104, 255, 190, 0.055);
          background: linear-gradient(
            145deg,
            rgba(11, 33, 22, 0.92),
            rgba(6, 24, 16, 0.92)
          );
        }

        .luxury-action-tile:not(:disabled):hover {
          border-color: rgba(57, 246, 163, 0.18);
          background: linear-gradient(
            145deg,
            rgba(15, 47, 31, 0.96),
            rgba(7, 27, 18, 0.96)
          );
          transform: translateY(-1px);
        }

        .luxury-action-tile:disabled {
          filter: saturate(0.55);
        }

        .premium-message-content {
          max-width: min(72%, 680px);
        }

        .premium-message-bubble {
          padding: 10px 15px !important;
          border-radius: 16px !important;
          line-height: 1.45;
        }

        .premium-message-own .premium-message-bubble {
          border-top-right-radius: 7px !important;
        }

        .premium-message-incoming .premium-message-bubble {
          border-top-left-radius: 7px !important;
        }

        .premium-message-row {
          position: relative;
        }

        .premium-message-actions {
          opacity: 0;
          transform: translateY(3px);
          pointer-events: none;
          transition:
            opacity 150ms ease,
            transform 150ms ease;
        }

        .premium-message-row:hover .premium-message-actions,
        .premium-message-row:focus-within .premium-message-actions {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .premium-message-action {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          color: #6f8794;
          background: rgba(6, 24, 16, 0.74);
          border: 1px solid rgba(104, 255, 190, 0.06);
          transition: all 140ms ease;
        }

        .premium-message-action:hover {
          color: #bfffe0;
          background: rgba(20, 66, 43, 0.82);
          border-color: rgba(57, 246, 163, 0.18);
          box-shadow: 0 0 18px rgba(57, 246, 163, 0.06);
        }

        .premium-media-message {
          max-width: min(420px, 68vw);
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(104, 255, 190, 0.11);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
        }

        .premium-file-message {
          min-width: 280px;
          max-width: min(460px, 70vw);
          border-radius: 16px;
          border: 1px solid rgba(104, 255, 190, 0.1);
          background: linear-gradient(
            145deg,
            rgba(31, 101, 65, 0.94),
            rgba(40, 177, 104, 0.88)
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 14px 34px rgba(0, 0, 0, 0.16);
        }

        .premium-emoji-message {
          padding: 2px 0 !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          font-size: 58px;
          line-height: 1;
        }

        .luxury-conversation-preview {
          min-width: 0;
        }

        .luxury-conversation-preview-line {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .luxury-sidebar-add-button {
          border: 1px solid transparent;
        }

        .luxury-sidebar-add-button:hover {
          color: #bfffe0;
          background: rgba(57, 246, 163, 0.07);
          border-color: rgba(57, 246, 163, 0.12);
        }

        .luxury-group-item {
          min-height: 62px;
          border: 1px solid transparent;
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.004),
            transparent 72%
          );
        }

        .luxury-group-item:hover {
          border-color: rgba(104, 255, 190, 0.06);
          transform: translateX(1px);
        }

        .luxury-group-item-selected {
          background: linear-gradient(
            90deg,
            rgba(57, 246, 163, 0.105),
            rgba(57, 246, 163, 0.025)
          );
          border-color: rgba(104, 255, 190, 0.06);
        }

        .luxury-group-item-selected::before {
          content: "";
          position: absolute;
          left: -1px;
          top: 9px;
          bottom: 9px;
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(
            180deg,
            var(--lux-green),
            var(--lux-lime)
          );
          box-shadow: 0 0 12px rgba(57, 246, 163, 0.2);
        }

        .luxury-group-avatar {
          border: 1px solid rgba(104, 255, 190, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
          transition:
            border-color 160ms ease,
            background 160ms ease;
        }

        .luxury-group-item:hover .luxury-group-avatar,
        .luxury-group-item-selected .luxury-group-avatar {
          border-color: rgba(57, 246, 163, 0.16);
          background: rgba(57, 246, 163, 0.09);
        }

        .luxury-group-more {
          opacity: 0;
          transform: translateX(2px);
          transition:
            opacity 140ms ease,
            transform 140ms ease;
        }

        .luxury-group-item:hover .luxury-group-more,
        .luxury-group-item:focus-visible .luxury-group-more {
          opacity: 1;
          transform: translateX(0);
        }

        .luxury-group-pin {
          opacity: 0.95;
        }

        .luxury-group-preview {
          display: block;
        }

        .luxury-archived-item {
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.003);
        }

        .luxury-unread-badge {
          box-shadow: 0 0 14px rgba(57, 246, 163, 0.1);
        }

        .luxury-date-separator {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 24px 18px;
          color: #5f786d;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .luxury-date-separator::before,
        .luxury-date-separator::after {
          content: "";
          height: 1px;
          flex: 1;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(104, 255, 190, 0.1),
            transparent
          );
        }

        .luxury-typing-indicator {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin: 0 0 8px 12px;
          padding: 7px 10px;
          border: 1px solid rgba(104, 255, 190, 0.07);
          border-radius: 999px;
          background: rgba(8, 30, 20, 0.72);
          color: #708d80;
          font-size: 10px;
        }

        .luxury-typing-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #5ee3a0;
          animation: luxuryTyping 1.2s infinite ease-in-out;
        }

        .luxury-typing-dot:nth-child(2) {
          animation-delay: 0.15s;
        }
        .luxury-typing-dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes luxuryTyping {
          0%,
          60%,
          100% {
            opacity: 0.28;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        @media (max-width: 700px) {
          .premium-message-content {
            max-width: 82%;
          }

          .premium-media-message {
            max-width: 82vw;
          }

          .premium-file-message {
            min-width: 0;
            max-width: 82vw;
          }

          .premium-message-actions {
            opacity: 1;
            transform: none;
            pointer-events: auto;
          }
        }

        .luxury-details-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 16px;
        }

        .luxury-details-stat {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(104, 255, 190, 0.075);
          border-radius: 14px;
          padding: 12px 13px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(57, 246, 163, 0.07),
              transparent 48%
            ),
            linear-gradient(
              145deg,
              rgba(12, 39, 26, 0.88),
              rgba(5, 22, 14, 0.94)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.025),
            0 10px 28px rgba(0, 0, 0, 0.1);
        }

        .luxury-details-stat::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            120deg,
            transparent 25%,
            rgba(255, 255, 255, 0.025),
            transparent 70%
          );
          transform: translateX(-100%);
          transition: transform 500ms ease;
        }

        .luxury-details-stat:hover::after {
          transform: translateX(100%);
        }

        .luxury-details-stat-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6f8d80;
        }

        .luxury-details-stat-value {
          margin-top: 5px;
          font-size: 12px;
          font-weight: 700;
          color: #dff9eb;
        }

        .luxury-details-identity {
          position: relative;
          width: 88px;
          height: 88px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 3px;
          background: conic-gradient(
            from 210deg,
            rgba(57, 246, 163, 0.18),
            rgba(57, 246, 163, 0.95),
            rgba(123, 255, 204, 0.34),
            rgba(57, 246, 163, 0.18)
          );
          box-shadow:
            0 0 0 1px rgba(57, 246, 163, 0.13),
            0 0 0 6px rgba(57, 246, 163, 0.018),
            0 16px 48px rgba(16, 185, 129, 0.11);
        }

        .luxury-details-identity::before {
          content: "";
          position: absolute;
          inset: -7px;
          border-radius: inherit;
          border: 1px solid rgba(57, 246, 163, 0.1);
          box-shadow: 0 0 22px rgba(57, 246, 163, 0.05);
          pointer-events: none;
        }

        .luxury-details-identity-inner {
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: inherit;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #07150f;
        }

        .luxury-details-action-row {
          display: grid;
          gap: 8px;
          margin-top: 18px;
        }

        .luxury-details-action-row.group-actions {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .luxury-details-action-row.primary-actions {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 18px;
        }

        .luxury-details-primary-action {
          min-height: 64px;
          border-radius: 15px !important;
          border: 1px solid rgba(104, 255, 190, 0.07) !important;
          background: linear-gradient(
            145deg,
            rgba(11, 35, 23, 0.94),
            rgba(5, 22, 14, 0.96)
          ) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.025),
            0 10px 24px rgba(0, 0, 0, 0.08);
        }

        .luxury-details-primary-action:hover {
          border-color: rgba(57, 246, 163, 0.18) !important;
          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.14),
            0 0 24px rgba(57, 246, 163, 0.045);
          transform: translateY(-1px);
        }

        .luxury-details-notification {
          margin-top: 12px;
          margin-bottom: 22px;
          border-radius: 13px !important;
          background: linear-gradient(
            180deg,
            rgba(9, 36, 23, 0.82),
            rgba(5, 23, 15, 0.92)
          ) !important;
        }

        .luxury-details-section {
          padding-top: 2px;
        }

        .luxury-details-media-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(104, 255, 190, 0.07);
          background: linear-gradient(
            145deg,
            rgba(10, 31, 21, 0.72),
            rgba(4, 17, 11, 0.88)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
        }

        .luxury-details-file {
          border: 1px solid rgba(104, 255, 190, 0.065);
          background: linear-gradient(
            145deg,
            rgba(10, 31, 21, 0.82),
            rgba(4, 17, 11, 0.94)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .luxury-details-file:hover {
          transform: translateY(-1px);
          border-color: rgba(57, 246, 163, 0.16);
          background: linear-gradient(
            145deg,
            rgba(14, 43, 28, 0.92),
            rgba(5, 21, 14, 0.96)
          );
        }

        .luxury-details-link {
          border: 1px solid rgba(104, 255, 190, 0.065);
          background: linear-gradient(
            145deg,
            rgba(10, 31, 21, 0.7),
            rgba(4, 17, 11, 0.9)
          );
        }

        .luxury-section-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #6f8d80;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .luxury-section-kicker::before {
          content: "";
          width: 18px;
          height: 1px;
          background: linear-gradient(
            90deg,
            rgba(57, 246, 163, 0.55),
            transparent
          );
        }

        @media (max-width: 380px) {
          .luxury-details-stat-grid {
            grid-template-columns: 1fr;
          }
          .luxury-details-action-row.primary-actions {
            grid-template-columns: 1fr;
          }
        }

        .luxury-details-scroll {
          scrollbar-gutter: stable;
        }

        @media (min-width: 1280px) {
          .luxury-main-message {
            max-width: 100%;
          }
        }

        .luxury-empty-state {
          min-height: 300px;
        }

        .luxury-empty-orbit {
          position: relative;
          border: 1px solid rgba(104, 255, 190, 0.08);
          background: radial-gradient(
            circle,
            rgba(57, 246, 163, 0.075),
            transparent 68%
          );
          box-shadow: 0 0 0 8px rgba(57, 246, 163, 0.018);
        }

        .luxury-empty-orbit::before,
        .luxury-empty-orbit::after {
          content: "";
          position: absolute;
          inset: 8px;
          border: 1px solid rgba(57, 246, 163, 0.07);
          border-radius: inherit;
        }

        .luxury-empty-orbit::after {
          inset: -7px;
          border-color: rgba(57, 246, 163, 0.035);
        }

        .luxury-empty-icon {
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.035),
            0 10px 28px rgba(0, 0, 0, 0.18);
        }

        .luxury-mobile-details {
          animation: luxuryDetailsSheetIn 180ms ease-out both;
        }

        @keyframes luxuryDetailsSheetIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .luxury-details-action-row.primary-actions {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .luxury-details-primary-action {
          min-height: 56px;
        }

        .luxury-details-notification {
          padding-top: 9px !important;
          padding-bottom: 9px !important;
          margin-bottom: 18px;
        }

        @media (prefers-reduced-motion: reduce) {
          .luxury-message-row,
          .luxury-search,
          .premium-message-bubble {
            animation: none !important;
            transition: none !important;
          }
        }

        /* Settings are functional, not decorative. */
        .premium-shell[data-density="compact"] .luxury-message-row {
          margin-bottom: 0.18rem !important;
        }

        .premium-shell[data-density="compact"] .premium-message-bubble {
          padding-top: 0.45rem !important;
          padding-bottom: 0.45rem !important;
        }

        .premium-shell[data-density="compact"] .luxury-chat-viewport {
          padding-top: 0.65rem !important;
          padding-bottom: 0.65rem !important;
        }

        .premium-shell[data-animations="off"] *,
        .premium-shell[data-reduce-motion="on"] * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }

        .premium-shell[data-larger-text="on"] .premium-message-bubble,
        .premium-shell[data-larger-text="on"] .luxury-message-row,
        .premium-shell[data-larger-text="on"] input,
        .premium-shell[data-larger-text="on"] textarea,
        .premium-shell[data-larger-text="on"] button {
          font-size: 1.06em;
        }

        .premium-shell[data-high-contrast="on"] {
          --lux-line: rgba(160, 255, 210, 0.24);
          --lux-line-strong: rgba(160, 255, 210, 0.38);
        }

        .premium-shell[data-high-contrast="on"] .luxury-message-row,
        .premium-shell[data-high-contrast="on"] .premium-message-bubble {
          border-color: rgba(180, 255, 220, 0.22) !important;
        }

        .premium-shell[data-wallpaper="none"] .premium-chat {
          background-image: none;
        }

        @media (max-width: 767px) {
          .luxury-app {
            background: #020806;
          }

          .premium-shell[data-theme="light"] .luxury-app {
            background: #f3f7f5;
          }

          .premium-message-bubble {
            max-width: min(86vw, 420px);
          }

          .premium-composer {
            border-radius: 20px !important;
          }
        }

        /* AUTH THEME — visual-only override. Keep all application logic unchanged. */
        :root {
          color-scheme: light !important;
          --lux-bg: #effbe8 !important;
          --lux-panel: rgba(255, 255, 255, 0.76) !important;
          --lux-panel-2: rgba(255, 255, 255, 0.66) !important;
          --lux-panel-3: rgba(255, 255, 255, 0.54) !important;
          --lux-line: rgba(39, 91, 55, 0.12) !important;
          --lux-line-strong: rgba(39, 91, 55, 0.18) !important;
          --lux-text: #183024 !important;
          --lux-muted: #718579 !important;
          --lux-green: #55d39a !important;
          --lux-green-deep: #34be77 !important;
          --lux-lime: #b7e6a5 !important;
        }

        html,
        body {
          background: #effbe8 !important;
          color: #183024 !important;
          color-scheme: light !important;
        }

        .luxury-app {
          background:
            radial-gradient(
              900px 620px at 12% 8%,
              rgba(176, 240, 174, 0.52),
              transparent 68%
            ),
            radial-gradient(
              760px 520px at 88% 18%,
              rgba(198, 246, 203, 0.46),
              transparent 68%
            ),
            radial-gradient(
              620px 500px at 50% 100%,
              rgba(223, 246, 216, 0.7),
              transparent 72%
            ),
            linear-gradient(135deg, #effbe8 0%, #dff6d8 48%, #c9f0cb 100%) !important;
          color: #183024 !important;
        }

        .luxury-app::before {
          opacity: 0.18 !important;
          background: radial-gradient(
            circle at 50% 40%,
            rgba(255, 255, 255, 0.75),
            transparent 58%
          ) !important;
        }

        .premium-shell,
        .premium-shell[data-theme="dark"],
        .premium-shell[data-theme="light"] {
          background: transparent !important;
          color: #183024 !important;
        }

        .premium-panel,
        .luxury-brandbar,
        .premium-header,
        .luxury-details,
        .premium-chat,
        .premium-composer,
        .luxury-search,
        .luxury-conversation-item,
        .luxury-sidebar,
        .luxury-app main,
        .luxury-app aside {
          border-color: rgba(39, 91, 55, 0.12) !important;
        }

        .luxury-brandbar,
        .premium-header,
        .luxury-details,
        .luxury-search,
        .premium-panel {
          background: rgba(255, 255, 255, 0.76) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
          box-shadow: 0 16px 45px rgba(39, 91, 55, 0.08) !important;
        }

        .premium-chat {
          background:
            radial-gradient(
              circle at 50% 45%,
              rgba(255, 255, 255, 0.46),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              rgba(239, 251, 232, 0.96),
              rgba(223, 246, 216, 0.94) 52%,
              rgba(201, 240, 203, 0.92)
            ) !important;
        }

        .premium-composer {
          background: rgba(255, 255, 255, 0.82) !important;
          box-shadow: 0 18px 55px rgba(39, 91, 55, 0.12) !important;
        }

        .luxury-conversation-item:hover,
        .luxury-conversation-item[data-active="true"],
        .luxury-conversation-item.bg-emerald-400\/\[0\.08\] {
          background: rgba(223, 246, 216, 0.68) !important;
          border-color: rgba(85, 211, 154, 0.28) !important;
        }

        .text-white,
        .text-slate-100,
        .text-slate-200,
        .text-slate-300,
        .text-slate-400,
        .text-slate-500,
        .text-slate-600,
        .text-emerald-300,
        .text-emerald-400,
        .text-emerald-500 {
          color: #183024 !important;
        }

        .text-slate-500,
        .text-slate-400,
        .text-slate-600 {
          color: #718579 !important;
        }

        .text-emerald-300,
        .text-emerald-400,
        .text-emerald-500 {
          color: #34be77 !important;
        }

        input,
        textarea,
        select {
          color: #183024 !important;
          background: rgba(255, 255, 255, 0.72) !important;
          border-color: rgba(39, 91, 55, 0.14) !important;
        }

        input::placeholder,
        textarea::placeholder {
          color: #8a9b91 !important;
        }

        button.bg-emerald-400,
        button.bg-emerald-500,
        .bg-emerald-400,
        .bg-emerald-500 {
          background: #74d59b !important;
          color: #183024 !important;
        }

        .bg-emerald-400\/\[0\.07\],
        .bg-emerald-400\/\[0\.08\],
        .bg-emerald-400\/\[0\.11\] {
          background: rgba(85, 211, 154, 0.12) !important;
        }

        .border-emerald-300\/10,
        .border-emerald-300\/15,
        .border-emerald-300\/20,
        .border-emerald-400\/10,
        .border-emerald-400\/15 {
          border-color: rgba(39, 91, 55, 0.12) !important;
        }

        .bg-\[\#020806\],
        .bg-\[\#06130e\],
        .bg-\[\#07140e\],
        .bg-\[\#07150f\],
        .bg-\[\#091a13\],
        .bg-\[\#0b2117\],
        .bg-\[\#0d2419\] {
          background: rgba(255, 255, 255, 0.72) !important;
        }

        .dark\:bg-\[\#020806\],
        .dark\:bg-\[\#06130e\],
        .dark\:bg-\[\#07140e\],
        .dark\:bg-\[\#07150f\],
        .dark\:bg-\[\#091a13\],
        .dark\:bg-\[\#0b2117\],
        .dark\:bg-\[\#0d2419\] {
          background: rgba(255, 255, 255, 0.72) !important;
        }

        .dark\:text-white,
        .dark\:text-slate-100,
        .dark\:text-slate-200,
        .dark\:text-slate-300,
        .dark\:text-slate-400,
        .dark\:text-slate-500 {
          color: #183024 !important;
        }

        .dark\:border-\[\#173b2b\],
        .dark\:border-emerald-300\/15,
        .dark\:border-emerald-300\/10 {
          border-color: rgba(39, 91, 55, 0.12) !important;
        }

        .premium-message-bubble {
          box-shadow: 0 8px 24px rgba(39, 91, 55, 0.08) !important;
        }

        .premium-message-bubble.bg-\[\#07150f\],
        .premium-message-bubble.bg-\[\#07140e\] {
          background: rgba(255, 255, 255, 0.78) !important;
          color: #183024 !important;
          border-color: rgba(39, 91, 55, 0.12) !important;
        }

        .bg-black\/70,
        .bg-black\/80,
        .bg-black\/60 {
          background: rgba(24, 48, 36, 0.28) !important;
        }

        .fixed.inset-0 {
          color: #183024;
        }

        .fixed.inset-0 > div[class*="bg-\\[\\#"] {
          background: rgba(255, 255, 255, 0.96) !important;
        }

        @media (max-width: 767px) {
          .luxury-app,
          .luxury-app {
            background: linear-gradient(
              135deg,
              #effbe8 0%,
              #dff6d8 50%,
              #c9f0cb 100%
            ) !important;
          }
        }

        /* AUTH THEME EXTENSION — literal dark hex utility classes, matched by
           substring so any dark:/hover:/dark:hover: state variant is caught too. */

        [class*="bg-[#02100a]"],
        [class*="bg-[#020906]"],
        [class*="bg-[#020907]"],
        [class*="bg-[#120908]"] {
          background-color: rgba(255, 255, 255, 0.55) !important;
        }

        [class*="bg-[#06140e]"],
        [class*="bg-[#07130f]"],
        [class*="bg-[#0a1b13]"],
        [class*="bg-[#10291d]"] {
          background-color: rgba(255, 255, 255, 0.72) !important;
        }

        [class*="bg-[#102c20]"],
        [class*="bg-[#173324]"],
        [class*="bg-[#173b2b]"],
        [class*="bg-[#0a1d14]"] {
          background-color: rgba(223, 246, 216, 0.75) !important;
        }

        [class*="border-[#173b2b]"],
        [class*="border-[#123024]"],
        [class*="border-[#102c20]"],
        [class*="border-[#06140e]"] {
          border-color: rgba(39, 91, 55, 0.14) !important;
        }

        [class~="border-slate-100"],
        [class~="border-slate-200"],
        [class~="border-white"],
        [class~="border-white/10"],
        [class~="border-white/5"],
        [class~="border-white/60"],
        [class~="dark:border-slate-900"],
        [class~="dark:border-slate-950"] {
          border-color: rgba(39, 91, 55, 0.14) !important;
        }

        [class~="dark:placeholder:text-slate-600"]::placeholder,
        [class~="dark:text-slate-400"],
        [class~="dark:text-slate-500"],
        [class~="dark:text-slate-600"],
        [class~="hover:text-slate-600"],
        [class~="placeholder:text-slate-400"]::placeholder,
        [class~="placeholder:text-slate-500"]::placeholder,
        [class~="text-slate-400"],
        [class~="text-slate-500"],
        [class~="text-slate-600"] {
          color: #718579 !important;
        }

        [class~="hover:bg-slate-100"],
        [class~="hover:bg-slate-200"],
        [class~="hover:bg-slate-50"] {
          background-color: rgba(223, 246, 216, 0.7) !important;
        }

        [class~="bg-slate-100"],
        [class~="bg-slate-200"],
        [class~="bg-slate-300"],
        [class~="bg-slate-400"],
        [class~="bg-slate-50"],
        [class~="bg-slate-500"],
        [class~="bg-slate-800"],
        [class~="dark:bg-slate-700"] {
          background-color: rgba(255, 255, 255, 0.62) !important;
        }

        [class~="border-emerald-100"],
        [class~="border-emerald-200"],
        [class~="border-emerald-200/20"],
        [class~="border-emerald-300/10"],
        [class~="border-emerald-300/15"],
        [class~="border-emerald-300/20"],
        [class~="border-emerald-300/[0.07]"],
        [class~="border-emerald-400/10"],
        [class~="border-emerald-400/15"],
        [class~="border-emerald-400/20"],
        [class~="border-emerald-400/30"],
        [class~="border-emerald-400/40"],
        [class~="border-emerald-400/50"],
        [class~="border-emerald-500"],
        [class~="border-emerald-900/40"],
        [class~="dark:border-emerald-300/10"],
        [class~="dark:border-emerald-400/10"],
        [class~="dark:border-emerald-900/50"],
        [class~="dark:focus-within:border-emerald-400/40"],
        [class~="focus-within:border-emerald-400"],
        [class~="focus-within:border-emerald-400/60"],
        [class~="focus:border-emerald-400"],
        [class~="hover:border-emerald-300"],
        [class~="hover:border-emerald-300/20"],
        [class~="hover:border-emerald-300/25"],
        [class~="hover:border-emerald-400/10"],
        [class~="hover:border-emerald-400/15"],
        [class~="hover:border-emerald-400/40"],
        [class~="hover:border-emerald-500"] {
          border-color: rgba(39, 91, 55, 0.16) !important;
        }

        [class~="bg-emerald-100"],
        [class~="bg-emerald-300"],
        [class~="bg-emerald-50"],
        [class~="dark:hover:bg-emerald-900"],
        [class~="hover:bg-emerald-100"],
        [class~="hover:bg-emerald-200"],
        [class~="hover:bg-emerald-300"],
        [class~="hover:bg-emerald-50"] {
          background-color: rgba(85, 211, 154, 0.16) !important;
        }

        [class~="active:bg-emerald-400/10"],
        [class~="bg-emerald-400/10"],
        [class~="bg-emerald-400/15"],
        [class~="bg-emerald-400/5"],
        [class~="bg-emerald-400/60"],
        [class~="bg-emerald-400/70"],
        [class~="bg-emerald-400/[0.025]"],
        [class~="bg-emerald-400/[0.02]"],
        [class~="bg-emerald-400/[0.035]"],
        [class~="bg-emerald-400/[0.045]"],
        [class~="bg-emerald-400/[0.04]"],
        [class~="bg-emerald-400/[0.05]"],
        [class~="bg-emerald-400/[0.06]"],
        [class~="bg-emerald-400/[0.07]"],
        [class~="bg-emerald-400/[0.08]"],
        [class~="bg-emerald-50/60"],
        [class~="bg-emerald-500/10"],
        [class~="bg-emerald-600/80"],
        [class~="bg-emerald-950/30"],
        [class~="bg-emerald-950/60"],
        [class~="dark:bg-emerald-400/10"],
        [class~="dark:bg-emerald-400/[0.06]"],
        [class~="dark:bg-emerald-400/[0.08]"],
        [class~="dark:bg-emerald-500/10"],
        [class~="dark:bg-emerald-950/30"],
        [class~="dark:bg-emerald-950/50"],
        [class~="dark:bg-emerald-950/60"],
        [class~="dark:hover:bg-emerald-950/50"],
        [class~="hover:bg-emerald-400/10"],
        [class~="hover:bg-emerald-400/5"],
        [class~="hover:bg-emerald-400/[0.035]"],
        [class~="hover:bg-emerald-400/[0.04]"],
        [class~="hover:bg-emerald-400/[0.08]"],
        [class~="hover:bg-emerald-400/[0.11]"],
        [class~="hover:bg-emerald-400/[0.12]"],
        [class~="hover:bg-emerald-950/20"] {
          background-color: rgba(85, 211, 154, 0.12) !important;
        }

        [class~="bg-emerald-400"],
        [class~="bg-emerald-500"],
        [class~="hover:bg-emerald-400"] {
          background-color: #74d59b !important;
          color: #0d2b1f !important;
        }

        [class~="dark:hover:text-slate-200"],
        [class~="dark:hover:text-slate-300"],
        [class~="dark:hover:text-white"],
        [class~="dark:text-slate-100"],
        [class~="dark:text-slate-200"],
        [class~="dark:text-slate-300"],
        [class~="dark:text-slate-700"],
        [class~="dark:text-white"],
        [class~="group-hover:text-slate-300"],
        [class~="hover:text-slate-100"],
        [class~="hover:text-slate-200"],
        [class~="hover:text-slate-700"],
        [class~="hover:text-white"],
        [class~="text-slate-100"],
        [class~="text-slate-200"],
        [class~="text-slate-300"],
        [class~="text-slate-700"],
        [class~="text-slate-800"],
        [class~="text-slate-900"],
        [class~="text-slate-950"],
        [class~="text-white"] {
          color: #183024 !important;
        }

        [class~="dark:group-hover:text-emerald-300"],
        [class~="dark:hover:text-emerald-300"],
        [class~="dark:text-emerald-300"],
        [class~="dark:text-emerald-400"],
        [class~="group-hover:text-emerald-400"],
        [class~="group-hover:text-emerald-700"],
        [class~="hover:text-emerald-200"],
        [class~="hover:text-emerald-300"],
        [class~="hover:text-emerald-500"],
        [class~="hover:text-emerald-700"],
        [class~="text-emerald-300"],
        [class~="text-emerald-300/70"],
        [class~="text-emerald-300/80"],
        [class~="text-emerald-400"],
        [class~="text-emerald-400/70"],
        [class~="text-emerald-400/80"],
        [class~="text-emerald-500"],
        [class~="text-emerald-600"],
        [class~="text-emerald-700"] {
          color: #34be77 !important;
        }

        [class~="bg-black/10"],
        [class~="bg-black/55"],
        [class~="bg-black/60"],
        [class~="bg-black/70"],
        [class~="hover:bg-black/80"] {
          background-color: rgba(24, 48, 36, 0.3) !important;
        }

        [class~="bg-white/10"],
        [class~="bg-white/5"],
        [class~="bg-white/[0.025]"],
        [class~="bg-white/[0.02]"],
        [class~="bg-white/[0.035]"],
        [class~="bg-white/[0.03]"],
        [class~="bg-white/[0.04]"],
        [class~="hover:bg-white/5"],
        [class~="hover:bg-white/[0.06]"] {
          background-color: rgba(85, 211, 154, 0.08) !important;
        }

        /* ============================================================
           CONVERSATION DETAILS — LIGHT LOGIN THEME ONLY
           Intentionally scoped to .luxury-details / .luxury-mobile-details.
           Do not use these rules for the rest of the application.
           ============================================================ */

        .premium-shell .luxury-details {
          background:
            radial-gradient(
              circle at 50% 15%,
              rgba(189, 242, 200, 0.22),
              transparent 34%
            ),
            linear-gradient(180deg, #fbfffc 0%, #f1faf3 100%) !important;
          color: #1e342a !important;
          border-left: 1px solid rgba(46, 86, 62, 0.1) !important;
          box-shadow: -18px 0 48px rgba(31, 73, 48, 0.07) !important;
        }

        .premium-shell .luxury-details-header {
          background: rgba(255, 255, 255, 0.9) !important;
          border-bottom: 1px solid rgba(46, 86, 62, 0.08) !important;
          color: #1d3429 !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .premium-shell .luxury-details-header h3 {
          color: #1d3429 !important;
        }

        .premium-shell .luxury-details-header button {
          color: #21392e !important;
          background: #edf7ee !important;
          border: 1px solid rgba(57, 111, 75, 0.08) !important;
          border-radius: 14px !important;
        }

        .premium-shell .luxury-details-header button:hover {
          color: #193329 !important;
          background: #e2f2e5 !important;
        }

        .premium-shell .luxury-details-scroll {
          background: transparent !important;
          scrollbar-color: #c5ddca transparent;
        }

        /* Avatar */
        .premium-shell .luxury-details-identity {
          background: rgba(231, 249, 235, 0.72) !important;
          box-shadow:
            0 0 0 1px rgba(78, 196, 119, 0.15),
            0 0 0 8px rgba(78, 196, 119, 0.055),
            0 18px 42px rgba(48, 112, 68, 0.1) !important;
        }

        .premium-shell .luxury-details-identity::before {
          border-color: rgba(78, 196, 119, 0.12) !important;
        }

        .premium-shell .luxury-details-identity-inner {
          background: linear-gradient(145deg, #ffffff, #eaf7ed) !important;
          color: #20382d !important;
          border-color: rgba(50, 91, 64, 0.16) !important;
          box-shadow:
            0 5px 18px rgba(45, 93, 58, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.95) !important;
        }

        .premium-shell .luxury-details h3 {
          color: #1b3529 !important;
        }

        .premium-shell .luxury-details .text-emerald-400,
        .premium-shell .luxury-details .text-emerald-300 {
          color: #51b977 !important;
        }

        /* CREATED / STATUS — remove dark green completely */
        .premium-shell .luxury-details .luxury-details-stat,
        .premium-shell .luxury-details-stat {
          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #edf8f0 100%
          ) !important;
          color: #263f33 !important;
          border: 1px solid rgba(55, 106, 70, 0.1) !important;
          border-radius: 18px !important;
          box-shadow:
            0 12px 28px rgba(42, 96, 56, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.96) !important;
        }

        .premium-shell .luxury-details-stat::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(78, 196, 119, 0.12),
            transparent
          ) !important;
        }

        .premium-shell .luxury-details-stat-label {
          color: #7a9083 !important;
        }

        .premium-shell .luxury-details-stat-value {
          color: #294438 !important;
        }

        /* Mute / Search tiles — light surfaces only */
        .premium-shell .luxury-details .luxury-details-primary-action,
        .premium-shell .luxury-details .luxury-action-tile {
          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #f0f9f2 100%
          ) !important;
          color: #243d31 !important;
          border: 1px solid rgba(55, 106, 70, 0.08) !important;
          border-radius: 18px !important;
          box-shadow:
            0 12px 30px rgba(42, 96, 56, 0.065),
            inset 0 1px 0 rgba(255, 255, 255, 0.98) !important;
        }

        .premium-shell .luxury-details .luxury-details-primary-action svg,
        .premium-shell .luxury-details .luxury-action-tile svg {
          color: #244034 !important;
          stroke: #244034 !important;
        }

        .premium-shell .luxury-details .luxury-details-primary-action:hover,
        .premium-shell .luxury-details .luxury-action-tile:hover {
          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #e8f6eb 100%
          ) !important;
          color: #19382b !important;
          border-color: rgba(78, 196, 119, 0.22) !important;
          box-shadow: 0 15px 34px rgba(42, 96, 56, 0.1) !important;
        }

        /* Browser notification — no dark green */
        .premium-shell .luxury-details .luxury-details-notification {
          background: linear-gradient(
            145deg,
            #edf9ef 0%,
            #e2f3e6 100%
          ) !important;
          color: #3e6c50 !important;
          border: 1px solid rgba(78, 196, 119, 0.18) !important;
          border-radius: 16px !important;
          box-shadow:
            0 9px 22px rgba(42, 96, 56, 0.055),
            inset 0 1px 0 rgba(255, 255, 255, 0.82) !important;
        }

        .premium-shell .luxury-details .luxury-details-notification:hover {
          background: linear-gradient(
            145deg,
            #e5f5e8 0%,
            #dcefe0 100%
          ) !important;
          color: #315d43 !important;
        }

        /* Shared sections */
        .premium-shell .luxury-details .luxury-details-section {
          color: #294338 !important;
        }

        .premium-shell .luxury-details .luxury-section-kicker {
          color: #2b4338 !important;
        }

        .premium-shell .luxury-details .luxury-section-kicker::before,
        .premium-shell .luxury-details .luxury-details-section::before {
          background: linear-gradient(
            90deg,
            rgba(78, 196, 119, 0.42),
            rgba(78, 196, 119, 0)
          ) !important;
        }

        .premium-shell .luxury-details .luxury-details-media-card,
        .premium-shell .luxury-details .luxury-details-file,
        .premium-shell .luxury-details .luxury-details-link {
          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #eef8f1 100%
          ) !important;
          color: #294338 !important;
          border-color: rgba(55, 106, 70, 0.08) !important;
          box-shadow: 0 8px 20px rgba(42, 96, 56, 0.045) !important;
        }

        /* Override dark Tailwind utility classes inside this panel only. */
        .premium-shell .luxury-details .bg-\[\#07150f\],
        .premium-shell .luxury-details .bg-\[\#06140e\],
        .premium-shell .luxury-details .bg-\[\#0b2117\],
        .premium-shell .luxury-details .bg-\[\#102c20\],
        .premium-shell .luxury-details .bg-\[\#173b2b\] {
          background: #ffffff !important;
        }

        .premium-shell .luxury-details .text-slate-200,
        .premium-shell .luxury-details .text-slate-300,
        .premium-shell .luxury-details .text-slate-400,
        .premium-shell .luxury-details .text-slate-500,
        .premium-shell .luxury-details .text-slate-600 {
          color: #6f8579 !important;
        }

        /* Dark theme — keep the original MFB Chat details design while
           making the details panel follow the active dark theme. */
        .dark .premium-shell .luxury-details {
          background: #06140e !important;
          color: #dce9e2 !important;
          border-color: #123024 !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-header {
          background: #06140e !important;
          color: #e5f0e9 !important;
          border-color: #123024 !important;
        }

        .dark .premium-shell .luxury-details h3 {
          color: #e5f0e9 !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-identity {
          background: rgba(78, 196, 119, 0.08) !important;
          box-shadow:
            0 0 0 1px rgba(78, 196, 119, 0.16),
            0 0 0 8px rgba(78, 196, 119, 0.035),
            0 18px 42px rgba(0, 0, 0, 0.18) !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-identity-inner {
          background: linear-gradient(145deg, #102c20, #0b2117) !important;
          color: #e5f0e9 !important;
          border-color: rgba(78, 196, 119, 0.16) !important;
          box-shadow:
            0 5px 18px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-stat {
          background: linear-gradient(
            145deg,
            #0b2117 0%,
            #07150f 100%
          ) !important;
          color: #dce9e2 !important;
          border-color: rgba(78, 196, 119, 0.12) !important;
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.025) !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-stat-label {
          color: #789487 !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-stat-value {
          color: #dce9e2 !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-primary-action,
        .dark .premium-shell .luxury-details .luxury-action-tile {
          background: linear-gradient(
            145deg,
            #0b2117 0%,
            #07150f 100%
          ) !important;
          color: #dce9e2 !important;
          border-color: rgba(78, 196, 119, 0.1) !important;
          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.025) !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-primary-action svg,
        .dark .premium-shell .luxury-details .luxury-action-tile svg {
          color: #c7ded1 !important;
          stroke: #c7ded1 !important;
        }

        .dark
          .premium-shell
          .luxury-details
          .luxury-details-primary-action:hover,
        .dark .premium-shell .luxury-details .luxury-action-tile:hover {
          background: linear-gradient(
            145deg,
            #102c20 0%,
            #0b2117 100%
          ) !important;
          color: #e5f0e9 !important;
          border-color: rgba(78, 196, 119, 0.2) !important;
          box-shadow: 0 15px 34px rgba(0, 0, 0, 0.2) !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-notification {
          background: linear-gradient(
            145deg,
            #0f2a1e 0%,
            #0b2117 100%
          ) !important;
          color: #b9d7c4 !important;
          border-color: rgba(78, 196, 119, 0.12) !important;
          box-shadow:
            0 9px 22px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.025) !important;
        }

        .dark
          .premium-shell
          .luxury-details
          .luxury-details-notification:hover {
          background: linear-gradient(
            145deg,
            #123024 0%,
            #0f2a1e 100%
          ) !important;
          color: #d7e8de !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-section,
        .dark .premium-shell .luxury-details .luxury-section-kicker {
          color: #c7d9ce !important;
        }

        .dark .premium-shell .luxury-details .luxury-details-media-card,
        .dark .premium-shell .luxury-details .luxury-details-file,
        .dark .premium-shell .luxury-details .luxury-details-link {
          background: linear-gradient(
            145deg,
            #0b2117 0%,
            #07150f 100%
          ) !important;
          color: #c7d9ce !important;
          border-color: rgba(78, 196, 119, 0.08) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14) !important;
        }

        .dark .premium-shell .luxury-details .bg-\[\#07150f\],
        .dark .premium-shell .luxury-details .bg-\[\#06140e\],
        .dark .premium-shell .luxury-details .bg-\[\#0b2117\],
        .dark .premium-shell .luxury-details .bg-\[\#102c20\],
        .dark .premium-shell .luxury-details .bg-\[\#173b2b\] {
          background: #07150f !important;
        }

        .dark .premium-shell .luxury-details .text-slate-200 {
          color: #dce9e2 !important;
        }

        .dark .premium-shell .luxury-details .text-slate-300 {
          color: #c7d9ce !important;
        }

        .dark .premium-shell .luxury-details .text-slate-400 {
          color: #91a99b !important;
        }

        .dark .premium-shell .luxury-details .text-slate-500 {
          color: #789487 !important;
        }

        .dark .premium-shell .luxury-details .text-slate-600 {
          color: #617b6d !important;
        }

        .dark .premium-shell .luxury-mobile-details {
          background:
            radial-gradient(
              circle at 50% 12%,
              rgba(78, 196, 119, 0.1),
              transparent 32%
            ),
            linear-gradient(180deg, #06140e 0%, #020906 100%) !important;
          color: #dce9e2 !important;
          border-color: rgba(78, 196, 119, 0.1) !important;
          box-shadow: 0 -22px 60px rgba(0, 0, 0, 0.35) !important;
        }

        .dark .premium-shell .luxury-mobile-details .luxury-details-header {
          background: rgba(6, 20, 14, 0.94) !important;
          color: #e5f0e9 !important;
        }

        .dark .premium-shell .luxury-mobile-details .luxury-details-stat,
        .dark
          .premium-shell
          .luxury-mobile-details
          .luxury-details-primary-action,
        .dark .premium-shell .luxury-mobile-details .luxury-action-tile,
        .dark
          .premium-shell
          .luxury-mobile-details
          .luxury-details-notification {
          background: linear-gradient(
            145deg,
            #0b2117 0%,
            #07150f 100%
          ) !important;
          color: #dce9e2 !important;
          border-color: rgba(78, 196, 119, 0.1) !important;
        }

        /* Mobile detail sheet */
        .premium-shell .luxury-mobile-details {
          background:
            radial-gradient(
              circle at 50% 12%,
              rgba(189, 242, 200, 0.18),
              transparent 32%
            ),
            linear-gradient(180deg, #fbfffc 0%, #f1faf3 100%) !important;
          color: #1e342a !important;
          border-color: rgba(46, 86, 62, 0.1) !important;
          box-shadow: 0 -22px 60px rgba(31, 73, 48, 0.12) !important;
        }

        .premium-shell .luxury-mobile-details .luxury-details-header {
          background: rgba(255, 255, 255, 0.9) !important;
          color: #1d3429 !important;
        }

        .premium-shell .luxury-mobile-details .luxury-details-stat,
        .premium-shell .luxury-mobile-details .luxury-details-primary-action,
        .premium-shell .luxury-mobile-details .luxury-action-tile,
        .premium-shell .luxury-mobile-details .luxury-details-notification {
          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #edf8f0 100%
          ) !important;
          color: #294338 !important;
          border-color: rgba(55, 106, 70, 0.1) !important;
        }

        /* ============================================================
           SIDEBAR REFINEMENT — preserve the original MFB Chat design
           Scope: sidebar only. Chat, composer and conversation details
           are intentionally left untouched.
           ============================================================ */

        .premium-panel {
          background:
            radial-gradient(
              520px 420px at 18% 0%,
              rgba(198, 240, 199, 0.28),
              transparent 68%
            ),
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.94) 0%,
              rgba(248, 252, 247, 0.97) 52%,
              rgba(241, 249, 241, 1) 100%
            ) !important;
          border-right-color: rgba(55, 103, 68, 0.12) !important;
          box-shadow:
            12px 0 34px rgba(35, 78, 48, 0.045),
            inset -1px 0 rgba(255, 255, 255, 0.75) !important;
        }

        .premium-panel .luxury-brandbar {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.94),
            rgba(249, 253, 249, 0.88)
          ) !important;
          border-bottom-color: rgba(55, 103, 68, 0.09) !important;
          box-shadow: 0 1px 0 rgba(55, 103, 68, 0.035) !important;
        }

        .premium-panel .luxury-brandbar h1 {
          color: #183024 !important;
          letter-spacing: -0.025em;
        }

        .premium-panel .luxury-brandbar p {
          color: #718579 !important;
        }

        .premium-panel .luxury-brandbar button {
          color: #718579 !important;
          background: rgba(226, 244, 226, 0.54) !important;
          border: 1px solid transparent;
          transition:
            background 150ms ease,
            color 150ms ease,
            transform 150ms ease;
        }

        .premium-panel .luxury-brandbar button:hover {
          color: #2f9b68 !important;
          background: rgba(214, 240, 216, 0.82) !important;
          transform: translateY(-1px);
        }

        .premium-panel .luxury-search {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.93),
            rgba(246, 251, 245, 0.94)
          ) !important;
          border-color: rgba(55, 103, 68, 0.11) !important;
          box-shadow:
            0 6px 18px rgba(38, 84, 50, 0.035),
            inset 0 1px 0 rgba(255, 255, 255, 0.92) !important;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease,
            transform 150ms ease;
        }

        .premium-panel .luxury-search:focus-within {
          border-color: rgba(70, 183, 119, 0.34) !important;
          box-shadow:
            0 0 0 3px rgba(70, 183, 119, 0.065),
            0 9px 24px rgba(38, 84, 50, 0.05) !important;
          transform: translateY(-1px);
        }

        .premium-panel .luxury-search input {
          color: #20362a !important;
          background: transparent !important;
        }

        .premium-panel .luxury-search input::placeholder {
          color: #8a9a91 !important;
        }

        .premium-panel .luxury-search svg {
          color: #74867b !important;
        }

        .premium-panel .luxury-sidebar-scroll {
          scrollbar-color: rgba(82, 151, 99, 0.22) transparent;
        }

        .premium-panel .luxury-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .premium-panel .luxury-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .premium-panel .luxury-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(82, 151, 99, 0.18);
          border-radius: 999px;
        }

        .premium-panel .luxury-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(82, 151, 99, 0.3);
        }

        .premium-panel .luxury-conversation-item {
          border-color: rgba(55, 103, 68, 0.055) !important;
          background: linear-gradient(
            110deg,
            rgba(255, 255, 255, 0.62),
            rgba(248, 252, 247, 0.42)
          ) !important;
          color: #263b30 !important;
          box-shadow: none !important;
          transition:
            background 150ms ease,
            border-color 150ms ease,
            transform 150ms ease,
            box-shadow 150ms ease;
        }

        .premium-panel .luxury-conversation-item:hover {
          background: linear-gradient(
            100deg,
            rgba(224, 245, 223, 0.78),
            rgba(244, 250, 242, 0.72)
          ) !important;
          border-color: rgba(70, 183, 119, 0.17) !important;
          transform: translateX(2px);
          box-shadow: 0 5px 16px rgba(38, 84, 50, 0.035) !important;
        }

        .premium-panel .luxury-conversation-item.bg-emerald-50 {
          background: linear-gradient(
            100deg,
            rgba(218, 244, 217, 0.92),
            rgba(239, 250, 237, 0.78)
          ) !important;
          border-color: rgba(70, 183, 119, 0.2) !important;
          box-shadow: 0 5px 18px rgba(48, 106, 63, 0.055) !important;
        }

        .premium-panel .luxury-conversation-item .text-slate-100,
        .premium-panel .luxury-conversation-item .text-slate-200,
        .premium-panel .luxury-conversation-item .text-slate-300 {
          color: #294035 !important;
        }

        .premium-panel .luxury-conversation-item .text-slate-400,
        .premium-panel .luxury-conversation-item .text-slate-500 {
          color: #7a8b81 !important;
        }

        .premium-panel .luxury-conversation-item .text-emerald-300,
        .premium-panel .luxury-conversation-item .text-emerald-400 {
          color: #39a96f !important;
        }

        .premium-panel .luxury-conversation-item .bg-emerald-400\/10 {
          background: rgba(79, 194, 126, 0.1) !important;
        }

        .premium-panel .luxury-conversation-item .border-emerald-300\/15 {
          border-color: rgba(65, 170, 108, 0.18) !important;
        }

        .premium-panel .luxury-conversation-item .border-\[\#06140e\] {
          border-color: #f4faf3 !important;
        }

        .premium-panel .luxury-sidebar-add-button {
          color: #819188 !important;
          border-color: transparent !important;
          transition:
            color 150ms ease,
            background 150ms ease,
            border-color 150ms ease,
            transform 150ms ease;
        }

        .premium-panel .luxury-sidebar-add-button:hover {
          color: #319b68 !important;
          background: rgba(75, 190, 124, 0.09) !important;
          border-color: rgba(75, 190, 124, 0.16) !important;
          transform: translateY(-1px);
        }

        .premium-panel .luxury-group-item {
          border-color: rgba(55, 103, 68, 0.045) !important;
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.44),
            rgba(244, 250, 242, 0.28)
          ) !important;
          transition:
            background 150ms ease,
            border-color 150ms ease,
            transform 150ms ease;
        }

        .premium-panel .luxury-group-item:hover {
          background: linear-gradient(
            100deg,
            rgba(225, 245, 224, 0.68),
            rgba(247, 251, 245, 0.5)
          ) !important;
          border-color: rgba(70, 183, 119, 0.14) !important;
          transform: translateX(1px);
        }

        .premium-panel .luxury-group-item-selected {
          background: linear-gradient(
            90deg,
            rgba(218, 244, 217, 0.84),
            rgba(240, 249, 238, 0.56)
          ) !important;
          border-color: rgba(70, 183, 119, 0.16) !important;
        }

        .premium-panel .premium-avatar {
          border: none !important;
          box-shadow: none !important;
        }

        .premium-panel .premium-avatar::after {
          display: none !important;
        }

        .premium-header .premium-avatar {
          border: none !important;
          box-shadow: none !important;
        }

        .premium-header .premium-avatar::after {
          display: none !important;
        }

        .premium-panel .bg-emerald-400 {
          background: #68c88e !important;
        }

        /* Keep the sidebar's visual hierarchy without recoloring the
           application-wide buttons, composer or message controls. */
        .premium-panel .text-slate-400 {
          color: #7b8c82 !important;
        }

        .premium-panel .text-emerald-400,
        .premium-panel .text-emerald-300,
        .premium-panel .text-emerald-500 {
          color: #36a96f !important;
        }

        /* Mobile sidebar uses the same original classes; keep the
           refinement available when the list is opened. */
        @media (max-width: 767px) {
          .premium-panel {
            box-shadow: 8px 0 30px rgba(35, 78, 48, 0.07) !important;
          }
        }

        /* PROFILE-ONLY OVERRIDE
           Light mode keeps the original white card surface. Hover uses a
           restrained emerald outline and soft exterior glow only. */
        .premium-shell[data-theme="light"] .premium-profile-modal section {
          background: #ffffff !important;
        }

        .premium-shell[data-theme="light"]
          .premium-profile-modal
          section
          > button {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          border-color: rgba(20, 78, 53, 0.1) !important;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease !important;
        }

        .premium-shell[data-theme="light"]
          .premium-profile-modal
          section
          > button:hover {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          border-color: rgba(16, 185, 129, 0.55) !important;
          box-shadow:
            0 0 0 2px rgba(16, 185, 129, 0.07),
            0 8px 24px rgba(16, 185, 129, 0.08) !important;
          transform: translateY(-1px);
        }

        html.dark .premium-profile-modal {
          background:
            radial-gradient(
              700px 260px at 50% -10%,
              rgba(18, 185, 120, 0.055),
              transparent 70%
            ),
            linear-gradient(180deg, #07140e 0%, #06110c 100%) !important;
          border-color: rgba(89, 193, 132, 0.18) !important;
          color: #e7f4ec !important;
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.38),
            0 8px 30px rgba(24, 86, 54, 0.14) !important;
        }

        html.dark .premium-profile-modal > div:first-child {
          background: rgba(7, 20, 14, 0.94) !important;
          border-color: rgba(89, 193, 132, 0.14) !important;
        }

        html.dark .premium-profile-modal section {
          border-color: rgba(89, 193, 132, 0.16) !important;
          background: rgba(8, 24, 16, 0.72) !important;
        }

        html.dark .premium-profile-modal section > button,
        html.dark .premium-profile-modal section > button:hover {
          background: rgba(12, 34, 23, 0.82) !important;
          background-color: rgba(12, 34, 23, 0.82) !important;
          background-image: none !important;
          border-color: rgba(89, 193, 132, 0.18) !important;
          color: #dcebe2 !important;
        }

        html.dark .premium-profile-modal section > button:hover {
          background: rgba(25, 70, 45, 0.78) !important;
          border-color: rgba(89, 193, 132, 0.3) !important;
        }

        html.dark .premium-profile-modal input,
        html.dark .premium-profile-modal textarea,
        html.dark .premium-profile-modal select {
          color: #e7f4ec !important;
          background: rgba(8, 25, 16, 0.86) !important;
          border-color: rgba(89, 193, 132, 0.18) !important;
        }

        html.dark .premium-profile-modal .text-slate-500 {
          color: #8da598 !important;
        }

        html.dark .premium-profile-modal .text-slate-400 {
          color: #7f998c !important;
        }

        html.dark .premium-profile-modal .bg-slate-50 {
          background: rgba(10, 29, 19, 0.88) !important;
        }

        html.dark .premium-profile-modal .bg-white {
          background: rgba(10, 29, 19, 0.88) !important;
        }

        html.dark .premium-profile-modal .bg-emerald-400\/\[0.02\] {
          background: rgba(46, 112, 71, 0.08) !important;
        }
        /* CHAT MENU - BUTONLARI DAHA BELİRGİN YAP */
        .pointer-events-auto.absolute.right-0.top-full {
          background: rgba(255, 255, 255, 0.97) !important;
          border: 1px solid rgba(85, 211, 154, 0.35) !important;
          box-shadow: 0 18px 45px rgba(35, 90, 55, 0.18) !important;
        }

        /* Menü butonları */
        .pointer-events-auto.absolute.right-0.top-full > button {
          background: #e8f7ed !important;
          color: #30483b !important;
          font-weight: 600 !important;
        }

        /* Hover */
        .pointer-events-auto.absolute.right-0.top-full > button:hover {
          background: #d8f0df !important;
          color: #183024 !important;
        }

        /* İkonlar */
        .pointer-events-auto.absolute.right-0.top-full > button svg {
          opacity: 1 !important;
        }

        /* Sohbeti sil - kırmızı daha belirgin */
        .pointer-events-auto.absolute.right-0.top-full > button:nth-of-type(5) {
          color: #ef6f6f !important;
          font-weight: 700 !important;
          background: rgba(239, 111, 111, 0.08) !important;
        }

        .pointer-events-auto.absolute.right-0.top-full
          > button:nth-of-type(5):hover {
          background: rgba(239, 111, 111, 0.16) !important;
          color: #dc4f4f !important;
        }

        .pointer-events-auto.absolute.right-0.top-full
          > button:nth-of-type(5)
          svg {
          color: #ef6f6f !important;
        }

        /* Ayrıntıları kapat */
        .pointer-events-auto.absolute.right-0.top-full > button:last-child {
          background: #e8f7ed !important;
          color: #30483b !important;
          font-weight: 600 !important;
        }

        .pointer-events-auto.absolute.right-0.top-full
          > button:last-child:hover {
          background: #dff3e6 !important;
          color: #263d31 !important;
        }

        html.dark .pointer-events-auto.absolute.right-0.top-full {
          background: rgba(7, 20, 14, 0.98) !important;
          border-color: rgba(89, 193, 132, 0.22) !important;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.42) !important;
        }

        html.dark .pointer-events-auto.absolute.right-0.top-full > button,
        html.dark
          .pointer-events-auto.absolute.right-0.top-full
          > button:last-child {
          background: rgba(12, 34, 23, 0.82) !important;
          color: #dcebe2 !important;
          border-color: rgba(89, 193, 132, 0.12) !important;
        }

        html.dark .pointer-events-auto.absolute.right-0.top-full > button:hover,
        html.dark
          .pointer-events-auto.absolute.right-0.top-full
          > button:last-child:hover {
          background: rgba(25, 70, 45, 0.78) !important;
          color: #ecf8f0 !important;
        }

        html.dark
          .pointer-events-auto.absolute.right-0.top-full
          > button:nth-of-type(5) {
          background: rgba(239, 111, 111, 0.08) !important;
          color: #ff9a9a !important;
        }

        /* SETTINGS — DARK THEME: preserve the MFB green identity without the light-theme compatibility overrides. */
        .premium-shell[data-theme="dark"] .premium-settings-overlay {
          color: #e7f4ec !important;
        }
        .premium-shell[data-theme="dark"] .premium-settings-modal {
          background: linear-gradient(
            180deg,
            #07140e 0%,
            #06110c 100%
          ) !important;
          border-color: rgba(89, 193, 132, 0.18) !important;
          color: #e7f4ec !important;
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.38),
            0 8px 30px rgba(24, 86, 54, 0.14) !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          > div:first-child {
          background: rgba(7, 20, 14, 0.94) !important;
          border-color: rgba(89, 193, 132, 0.14) !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          > div:first-child
          h2 {
          color: #ecf8f0 !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          > div:first-child
          p {
          color: #91a99c !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          > div:first-child
          button {
          background: rgba(74, 185, 120, 0.1) !important;
          border-color: rgba(89, 193, 132, 0.22) !important;
          color: #8ee0ad !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          > div:first-child
          button:hover {
          background: rgba(74, 185, 120, 0.17) !important;
        }
        .premium-shell[data-theme="dark"] .premium-settings-modal details {
          border-color: rgba(89, 193, 132, 0.16) !important;
          background: rgba(8, 24, 16, 0.72) !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          details
          summary {
          color: #e6f2eb !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          details
          summary
          .text-slate-500,
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          details
          > div
          p.text-slate-400,
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          details
          > div
          span.text-slate-500 {
          color: #91a99c !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          details
          button[class*="border-slate-200"] {
          border-color: rgba(89, 193, 132, 0.18) !important;
          background: rgba(12, 34, 23, 0.82) !important;
          color: #dcebe2 !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          details
          button[class*="border-slate-200"]:hover {
          border-color: rgba(89, 193, 132, 0.34) !important;
          background: rgba(25, 70, 45, 0.78) !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          details
          button[class*="border-emerald-300"] {
          border-color: rgba(78, 196, 119, 0.55) !important;
          background: rgba(44, 109, 69, 0.3) !important;
          color: #74d59b !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          details
          button[class*="bg-emerald-50"] {
          background: rgba(46, 112, 71, 0.34) !important;
          color: #74d59b !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          [class*="bg-slate-50"] {
          background: rgba(10, 29, 19, 0.88) !important;
          border-color: rgba(89, 193, 132, 0.15) !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          [class*="bg-emerald-50/40"] {
          background-color: rgba(30, 82, 51, 0.28) !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          .premium-message-incoming {
          background: linear-gradient(
            145deg,
            #183a29 0%,
            #10291d 100%
          ) !important;
          color: #e6f4eb !important;
          border-color: rgba(120, 207, 151, 0.16) !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          details
          button[class*="bg-[#9bdfb3"] {
          background: linear-gradient(
            135deg,
            #9bdfb3 0%,
            #7fd49e 100%
          ) !important;
          color: #153024 !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          .text-slate-500 {
          color: #8da598 !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          .text-slate-400 {
          color: #7f998c !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          .text-emerald-700,
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          .text-emerald-300 {
          color: #74d59b !important;
        }
        .premium-shell[data-theme="dark"] .premium-settings-modal input,
        .premium-shell[data-theme="dark"] .premium-settings-modal textarea,
        .premium-shell[data-theme="dark"] .premium-settings-modal select {
          color: #e7f4ec !important;
          background: rgba(8, 25, 16, 0.86) !important;
          border-color: rgba(89, 193, 132, 0.18) !important;
        }
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          input::placeholder,
        .premium-shell[data-theme="dark"]
          .premium-settings-modal
          textarea::placeholder {
          color: #6f887b !important;
        }
        /* DARK MODE RESTORE — overrides the visual compatibility layer above only when html.dark is active. */
        html.dark {
          color-scheme: dark !important;
          background: #020806 !important;
          color: #e7f4ec !important;
        }

        html.dark body {
          background: #020806 !important;
          color: #e7f4ec !important;
          color-scheme: dark !important;
        }

        html.dark .luxury-app {
          background:
            radial-gradient(
              900px 620px at 12% 8%,
              rgba(35, 161, 93, 0.13),
              transparent 68%
            ),
            radial-gradient(
              760px 520px at 88% 18%,
              rgba(25, 120, 78, 0.1),
              transparent 68%
            ),
            radial-gradient(
              620px 500px at 50% 100%,
              rgba(17, 78, 50, 0.1),
              transparent 72%
            ),
            linear-gradient(135deg, #020806 0%, #06130e 48%, #020806 100%) !important;
          color: #e7f4ec !important;
        }

        /* Dark-mode readability fixes for the two requested labels only. */
        html.dark .premium-panel .luxury-brandbar .mfb-brand-title {
          color: #e7f4ec !important;
        }

        html.dark .premium-panel .mfb-empty-state-title {
          color: #e7f4ec !important;
        }

        html.dark .premium-shell,
        html.dark .premium-panel,
        html.dark .luxury-brandbar,
        html.dark .premium-header,
        html.dark .premium-chat,
        html.dark .premium-composer,
        html.dark .luxury-search,
        html.dark .luxury-conversation-item,
        html.dark .luxury-sidebar,
        html.dark .luxury-app main,
        html.dark .luxury-app aside {
          color: #e7f4ec !important;
          border-color: rgba(89, 193, 132, 0.14) !important;
        }

        html.dark .premium-panel,
        html.dark .luxury-brandbar,
        html.dark .premium-header,
        html.dark .luxury-search {
          background: rgba(6, 20, 14, 0.82) !important;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.22) !important;
        }

        html.dark .premium-chat {
          background:
            radial-gradient(
              620px 300px at 72% -4%,
              rgba(18, 185, 120, 0.055),
              transparent 68%
            ),
            linear-gradient(180deg, #06130e 0%, #020806 100%) !important;
        }

        html.dark .premium-composer {
          background: linear-gradient(145deg, #0b2117, #081a12) !important;
        }

        html.dark .premium-panel .luxury-conversation-item {
          background: linear-gradient(
            110deg,
            rgba(10, 30, 20, 0.72),
            rgba(6, 20, 13, 0.58)
          ) !important;
          color: #dcebe2 !important;
          border-color: rgba(89, 193, 132, 0.08) !important;
          box-shadow: none !important;
        }

        html.dark .premium-panel .luxury-conversation-item:hover {
          background: linear-gradient(
            100deg,
            rgba(22, 55, 36, 0.82),
            rgba(9, 28, 19, 0.72)
          ) !important;
          border-color: rgba(104, 211, 154, 0.16) !important;
        }

        html.dark .premium-panel .luxury-conversation-item.bg-emerald-50 {
          background: linear-gradient(
            100deg,
            rgba(37, 83, 53, 0.78),
            rgba(18, 49, 32, 0.68)
          ) !important;
          border-color: rgba(104, 211, 154, 0.22) !important;
          box-shadow: 0 5px 18px rgba(0, 0, 0, 0.14) !important;
        }

        html.dark .premium-panel .luxury-conversation-item .text-slate-100,
        html.dark .premium-panel .luxury-conversation-item .text-slate-200,
        html.dark .premium-panel .luxury-conversation-item .text-slate-300 {
          color: #dcebe2 !important;
        }

        html.dark .premium-panel .luxury-conversation-item .text-slate-400,
        html.dark .premium-panel .luxury-conversation-item .text-slate-500 {
          color: #8da598 !important;
        }

        html.dark [class~="bg-white"],
        html.dark [class~="bg-white/70"],
        html.dark [class~="bg-white/90"],
        html.dark [class~="bg-white/95"],
        html.dark [class~="bg-slate-50"],
        html.dark [class~="bg-slate-100"],
        html.dark [class~="bg-slate-200"] {
          background-color: rgba(8, 24, 16, 0.86) !important;
        }

        html.dark [class~="bg-emerald-50"],
        html.dark [class~="bg-emerald-100"],
        html.dark [class~="hover:bg-emerald-50"],
        html.dark [class~="hover:bg-emerald-100"] {
          background-color: rgba(46, 112, 71, 0.28) !important;
        }

        html.dark [class~="text-slate-900"],
        html.dark [class~="text-slate-800"],
        html.dark [class~="text-slate-700"],
        html.dark [class~="text-slate-600"] {
          color: #dcebe2 !important;
        }

        html.dark [class~="text-slate-500"],
        html.dark [class~="text-slate-400"] {
          color: #8da598 !important;
        }

        html.dark [class~="text-emerald-700"],
        html.dark [class~="text-emerald-600"],
        html.dark [class~="text-emerald-500"],
        html.dark [class~="text-emerald-400"],
        html.dark [class~="text-emerald-300"] {
          color: #74d59b !important;
        }

        html.dark input,
        html.dark textarea,
        html.dark select {
          color: #e7f4ec !important;
          background: rgba(8, 25, 16, 0.86) !important;
          border-color: rgba(89, 193, 132, 0.18) !important;
        }

        html.dark input::placeholder,
        html.dark textarea::placeholder {
          color: #6f887b !important;
        }

        /* Dark-mode sidebar readability refinement: preserve the original layout,
           but make archived/group content readable without changing light mode. */
        html.dark .premium-panel .luxury-sidebar-scroll .luxury-archived-item {
          color: #cfe2d7 !important;
          border-color: rgba(89, 193, 132, 0.07) !important;
          background: rgba(8, 25, 16, 0.34) !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-archived-item:hover {
          background: rgba(46, 112, 71, 0.22) !important;
          border-color: rgba(104, 211, 154, 0.13) !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-archived-item
          .text-slate-300 {
          color: #cfe2d7 !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-archived-item
          .text-slate-600 {
          color: #829b8e !important;
        }

        html.dark .premium-panel .luxury-sidebar-scroll .luxury-group-item {
          color: #dcebe2 !important;
          background: rgba(8, 25, 16, 0.28) !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-group-item:hover {
          background: rgba(46, 112, 71, 0.2) !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-group-item-selected {
          background: linear-gradient(
            90deg,
            rgba(57, 246, 163, 0.16),
            rgba(57, 246, 163, 0.045)
          ) !important;
          border-color: rgba(104, 255, 190, 0.13) !important;
          box-shadow: inset 0 0 0 1px rgba(104, 255, 190, 0.025) !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-group-item
          .text-slate-200 {
          color: #dcebe2 !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-group-item
          .text-slate-300 {
          color: #b9d0c2 !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-group-item
          .text-slate-500,
        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-group-item
          .text-slate-600 {
          color: #829b8e !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-group-item
          .luxury-group-more {
          color: #789287 !important;
        }

        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-group-item-selected
          .luxury-group-more,
        html.dark
          .premium-panel
          .luxury-sidebar-scroll
          .luxury-group-item:hover
          .luxury-group-more {
          color: #8ee7b2 !important;
        }

        /* Requested dark-mode-only refinements: sidebar input + start-chat empty state. */
        html.dark .luxury-search input {
          color: #f4fff9 !important;
          caret-color: #9ff5c5 !important;
        }

        html.dark .luxury-empty-state .luxury-empty-icon {
          background: radial-gradient(
            circle at 50% 42%,
            rgba(231, 255, 242, 0.98) 0%,
            rgba(205, 241, 220, 0.96) 58%,
            rgba(166, 216, 188, 0.92) 100%
          ) !important;
          border-color: rgba(116, 213, 155, 0.42) !important;
          color: #35c77b !important;
          box-shadow:
            0 0 0 1px rgba(116, 213, 155, 0.1),
            0 0 24px rgba(57, 246, 163, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.72) !important;
        }

        html.dark .luxury-empty-state .luxury-empty-icon svg {
          filter: drop-shadow(0 1px 4px rgba(21, 118, 70, 0.22));
        }

        html.dark .luxury-empty-state > div > p.mt-5.text-sm.font-semibold {
          color: #f4fff9 !important;
          text-shadow: 0 0 14px rgba(116, 213, 155, 0.12);
        }

        html.dark .premium-settings-overlay {
          background: rgba(2, 16, 10, 0.78) !important;
        }

        /* Settings modal lives outside .premium-shell, so scope it from html.dark. */
        html.dark .fixed.inset-0 .premium-settings-modal {
          background: linear-gradient(
            180deg,
            #07140e 0%,
            #06110c 100%
          ) !important;
          border-color: rgba(89, 193, 132, 0.18) !important;
          color: #e7f4ec !important;
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.38),
            0 8px 30px rgba(24, 86, 54, 0.14) !important;
        }

        html.dark .premium-settings-modal > div:first-child {
          background: rgba(7, 20, 14, 0.94) !important;
          border-color: rgba(89, 193, 132, 0.14) !important;
        }

        html.dark .premium-settings-modal details {
          background: rgba(8, 24, 16, 0.72) !important;
          border-color: rgba(89, 193, 132, 0.16) !important;
        }

        html.dark .premium-settings-modal details button {
          background: rgba(12, 34, 23, 0.82) !important;
          color: #dcebe2 !important;
          border-color: rgba(89, 193, 132, 0.18) !important;
        }

        html.dark
          .premium-settings-modal
          details
          button[class*="border-emerald-300"] {
          background: rgba(44, 109, 69, 0.3) !important;
          color: #74d59b !important;
        }

        html.dark .premium-settings-modal [class*="bg-slate-50"] {
          background: rgba(10, 29, 19, 0.88) !important;
        }

        html.dark .premium-settings-modal .premium-message-incoming {
          background: linear-gradient(
            145deg,
            #183a29 0%,
            #10291d 100%
          ) !important;
          color: #e6f4eb !important;
        }

        html.dark .premium-settings-modal .text-slate-500 {
          color: #8da598 !important;
        }
        html.dark .premium-settings-modal .text-slate-400 {
          color: #7f998c !important;
        }
        html.dark .premium-settings-modal .text-emerald-700,
        html.dark .premium-settings-modal .text-emerald-300 {
          color: #74d59b !important;
        }
        /* FINAL DARK CONTROL OVERRIDE — keeps header controls dark in dark mode. */
        html.dark button[title="Ayarlar"],
        html.dark button[title="Settings"],
        html.dark button[title="Mesajlarda ara"],
        html.dark button[title="Search messages"],
        html.dark button[aria-label="Sohbet işlemleri"],
        html.dark button[aria-label="Chat actions"] {
          background: #0b2117 !important;
          background-color: #0b2117 !important;
          color: #9fe3bb !important;
          border-color: rgba(57, 246, 163, 0.12) !important;
          box-shadow: none !important;
        }

        html.dark button[title="Ayarlar"]:hover,
        html.dark button[title="Settings"]:hover,
        html.dark button[title="Mesajlarda ara"]:hover,
        html.dark button[title="Search messages"]:hover,
        html.dark button[aria-label="Sohbet işlemleri"]:hover,
        html.dark button[aria-label="Chat actions"]:hover {
          background: #102c20 !important;
          background-color: #102c20 !important;
          color: #b7f2cb !important;
          box-shadow: 0 0 22px rgba(57, 246, 163, 0.045) !important;
        }

        html.dark button[title="Mesajlarda ara"].bg-emerald-100,
        html.dark button[title="Search messages"].bg-emerald-100 {
          background: #0f2b1e !important;
          color: #9fe3bb !important;
        }

        /* MFB PREMIUM SURFACE SYSTEM
           Keep the original MFB look. Premium treatment comes from a subtle
           emerald outline and depth — not from recoloring the card on hover. */
        .premium-settings-modal details,
        .premium-profile-modal section:not(:first-child) {
          border-radius: 20px !important;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease !important;
        }

        html[data-theme="light"] .premium-settings-modal details,
        html[data-theme="light"]
          .premium-profile-modal
          section:not(:first-child) {
          background: #ffffff !important;
          background-image: none !important;
          border: 1px solid rgba(55, 176, 105, 0.2) !important;
          box-shadow:
            0 4px 18px rgba(20, 78, 53, 0.035),
            0 0 0 1px rgba(55, 176, 105, 0.025) !important;
        }

        /* Hover only strengthens the emerald outline. The inside stays clean. */
        html[data-theme="light"] .premium-settings-modal details:hover,
        html[data-theme="light"]
          .premium-profile-modal
          section:not(:first-child):hover {
          background: #ffffff !important;
          background-image: none !important;
          border-color: rgba(43, 170, 99, 0.48) !important;
          box-shadow:
            0 8px 26px rgba(20, 78, 53, 0.065),
            0 0 0 3px rgba(55, 176, 105, 0.055) !important;
        }

        html[data-theme="light"]
          .premium-settings-modal
          details
          > summary:hover,
        html[data-theme="light"]
          .premium-profile-modal
          section:not(:first-child)
          > button:hover {
          background: transparent !important;
          background-image: none !important;
        }

        html[data-theme="light"] .premium-settings-modal details > summary,
        html[data-theme="light"]
          .premium-profile-modal
          section:not(:first-child)
          > button {
          border-radius: 18px !important;
        }

        /* Selected controls remain emerald; surrounding cards stay white. */
        html[data-theme="light"]
          .premium-settings-modal
          details
          button[class*="border-emerald-300"],
        html[data-theme="light"]
          .premium-settings-modal
          details
          button[class*="bg-emerald-50"] {
          background: #f2fbf5 !important;
          border-color: rgba(18, 159, 102, 0.3) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 3px 10px rgba(20, 110, 76, 0.045) !important;
        }

        html[data-theme="dark"] .premium-settings-modal details,
        html[data-theme="dark"]
          .premium-profile-modal
          section:not(:first-child) {
          background: linear-gradient(
            145deg,
            rgba(12, 35, 24, 0.92),
            rgba(7, 24, 16, 0.88)
          ) !important;
          border-color: rgba(89, 193, 132, 0.16) !important;
          box-shadow:
            inset 0 1px 0 rgba(142, 224, 173, 0.035),
            0 10px 28px rgba(0, 0, 0, 0.12) !important;
        }

        html[data-theme="dark"] .premium-settings-modal details:hover,
        html[data-theme="dark"]
          .premium-profile-modal
          section:not(:first-child):hover {
          background: linear-gradient(
            145deg,
            rgba(12, 35, 24, 0.92),
            rgba(7, 24, 16, 0.88)
          ) !important;
          border-color: rgba(104, 211, 154, 0.3) !important;
          box-shadow:
            inset 0 1px 0 rgba(142, 224, 173, 0.045),
            0 0 0 3px rgba(76, 190, 120, 0.055),
            0 12px 32px rgba(0, 0, 0, 0.16) !important;
        }

        html[data-theme="dark"] .premium-settings-modal details > summary:hover,
        html[data-theme="dark"]
          .premium-profile-modal
          section:not(:first-child)
          > button:hover {
          background: transparent !important;
          background-image: none !important;
        }
        /* Requested dark-mode text visibility for the screenshot-matched modals only. */
        html.dark .fixed.z-\[95\] > div h2 {
          color: #f2fff7 !important;
        }

        html.dark .fixed.z-\[95\] > div p {
          color: #a9bdb2 !important;
        }

        html.dark .fixed.z-\[95\] > div button {
          color: #e8fff0 !important;
        }

        html.dark .fixed.z-\[80\] > div h2 {
          color: #f2fff7 !important;
        }

        html.dark .fixed.z-\[80\] > div p {
          color: #a9bdb2 !important;
        }

        html.dark .fixed.z-\[80\] > div label > span {
          color: #dceee4 !important;
        }

        html.dark .fixed.z-\[80\] > div input {
          color: #f4fff9 !important;
          caret-color: #9ff5c5 !important;
        }

        html.dark .fixed.z-\[80\] > div input::placeholder {
          color: #789285 !important;
        }

        html.dark .fixed.z-\[80\] > div button[aria-label="Close"] {
          color: #dceee4 !important;
          background: #183426 !important;
        }

        html.dark .fixed.z-\[80\] > div button[aria-label="Close"]:hover {
          background: #214631 !important;
          color: #ffffff !important;
        }

        html.dark .fixed.z-\[80\] > div .text-slate-300 {
          color: #c8dacf !important;
        }

        html.dark .fixed.z-\[80\] > div [style*="color: #374840"] {
          color: #dceee4 !important;
        }

        /* Dark-mode refinement: empty conversation state only. */
        html.dark .luxury-empty-orbit {
          filter: drop-shadow(0 0 18px rgba(74, 222, 128, 0.1));
        }

        html.dark .luxury-empty-state-title {
          color: #f1fff6 !important;
          text-shadow: 0 0 16px rgba(116, 213, 155, 0.1);
        }

        html.dark .luxury-empty-state-description {
          color: #b9ccc1 !important;
        }

        html.dark .luxury-empty-state-action {
          color: #eafff1 !important;
          border-color: rgba(116, 213, 155, 0.28) !important;
          background: rgba(74, 222, 128, 0.12) !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }

        html.dark .luxury-empty-state-action:hover {
          color: #ffffff !important;
          border-color: rgba(116, 213, 155, 0.42) !important;
          background: rgba(74, 222, 128, 0.17) !important;
        }

        html.dark .luxury-empty-state-note {
          color: #91a99c !important;
        }

        /* Dark-mode refinement: empty-state icons only. */
        html.dark .luxury-empty-orbit .luxury-empty-icon {
          background: radial-gradient(
            circle at 50% 42%,
            rgba(239, 255, 246, 0.99) 0%,
            rgba(218, 246, 228, 0.98) 58%,
            rgba(187, 228, 202, 0.96) 100%
          ) !important;
          border-color: rgba(116, 213, 155, 0.48) !important;
          color: #43cf82 !important;
          box-shadow:
            0 0 0 1px rgba(116, 213, 155, 0.12),
            0 0 22px rgba(57, 246, 163, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.86),
            inset 0 -2px 5px rgba(67, 139, 96, 0.08) !important;
        }

        html.dark .luxury-empty-orbit .luxury-empty-icon svg {
          color: #43cf82 !important;
          filter: drop-shadow(0 1px 3px rgba(21, 118, 70, 0.2));
        }

        html.dark .luxury-empty-orbit {
          border-color: rgba(104, 255, 190, 0.12);
          background: radial-gradient(
            circle,
            rgba(57, 246, 163, 0.09),
            transparent 68%
          );
          box-shadow:
            0 0 0 8px rgba(57, 246, 163, 0.022),
            0 0 28px rgba(57, 246, 163, 0.05);
        }

        html.dark .luxury-empty-orbit::before {
          border-color: rgba(57, 246, 163, 0.09);
        }

        html.dark .luxury-empty-orbit::after {
          border-color: rgba(57, 246, 163, 0.05);
        }

        /* ============================================================
           DARK MODE RESTORE — GIF picker, emoji picker & sidebar
           profile card. The compatibility layer above catches these
           dark: hex utility classes (and "hover:" classes are applied
           unconditionally, not just on hover), which left the GIF/emoji
           panels washed out white and the profile card stuck light-green
           in dark mode. Re-darken them here, after everything else.
           ============================================================ */

        html.dark [class*="bg-[#02100a]"],
        html.dark [class*="bg-[#020906]"],
        html.dark [class*="bg-[#020907]"],
        html.dark [class*="bg-[#120908]"] {
          background-color: #02100a !important;
        }

        html.dark [class*="bg-[#06140e]"],
        html.dark [class*="bg-[#07130f]"],
        html.dark [class*="bg-[#0a1b13]"],
        html.dark [class*="bg-[#10291d]"] {
          background-color: #06140e !important;
        }

        html.dark [class*="bg-[#102c20]"],
        html.dark [class*="bg-[#173324]"],
        html.dark [class*="bg-[#173b2b]"],
        html.dark [class*="bg-[#0a1d14]"] {
          background-color: #102c20 !important;
        }

        html.dark [class*="border-[#173b2b]"],
        html.dark [class*="border-[#123024]"],
        html.dark [class*="border-[#102c20]"],
        html.dark [class*="border-[#06140e]"],
        html.dark [class*="border-[#cfe3d4]"],
        html.dark [class*="border-[#cfe5d5]"],
        html.dark [class*="border-[#d2e5d7]"],
        html.dark [class*="border-[#d8e9dc]"] {
          border-color: rgba(89, 193, 132, 0.18) !important;
        }

        /* GIF/emoji search field + "quick reaction" chips used a light-only
           hex background; give them a dark equivalent. */
        html.dark [class*="bg-[#edf8ed]"],
        html.dark [class*="bg-[#f3faf4]"] {
          background-color: rgba(16, 44, 32, 0.85) !important;
        }

        html.dark [class*="text-[#30483b]"] {
          color: #dcebe2 !important;
        }

        html.dark [class*="text-[#708579]"],
        html.dark [class*="text-[#81958a]"],
        html.dark [class*="text-[#8a9b91]"],
        html.dark [class*="text-[#71877a]"] {
          color: #8da598 !important;
        }

        /* The compatibility layer's "hover:bg-slate-*" / "hover:bg-emerald-*"
           rules apply their background at all times, not only on :hover.
           Reset to transparent by default and only tint on actual hover. */
        html.dark [class~="hover:bg-slate-100"],
        html.dark [class~="hover:bg-slate-200"],
        html.dark [class~="hover:bg-slate-50"] {
          background-color: transparent !important;
        }

        html.dark [class~="hover:bg-slate-100"]:hover,
        html.dark [class~="hover:bg-slate-200"]:hover,
        html.dark [class~="hover:bg-slate-50"]:hover {
          background-color: rgba(16, 44, 32, 0.9) !important;
        }

        html.dark [class~="hover:bg-emerald-50"],
        html.dark [class~="hover:bg-emerald-100"] {
          background-color: transparent !important;
        }

        html.dark [class~="hover:bg-emerald-50"]:hover,
        html.dark [class~="hover:bg-emerald-100"]:hover {
          background-color: rgba(46, 112, 71, 0.28) !important;
        }
      `}</style>
      {newChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02100a]/78 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#1c4936] dark:bg-[#06140e]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#173b2b]">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Yeni sohbet
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                  Doğrudan sohbet başlatmak için bir kullanıcı arayın.
                </p>
              </div>
              <button
                type="button"
                onClick={closeNewChat}
                disabled={creatingChat}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-lg text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-40 dark:border-[#1c4936] dark:bg-[#0d2419] dark:text-slate-200 dark:hover:bg-[#143524]"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-emerald-400 dark:border-[#1c4936] dark:bg-[#0b2117] dark:focus-within:border-emerald-400">
                <Search
                  className="h-4 w-4 text-slate-400"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <input
                  autoFocus
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Kullanıcı adı veya e-posta ara..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                {searchingUsers && (
                  <span className="text-xs text-slate-400">Aranıyor...</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  closeNewChat();
                  openGroup();
                }}
                disabled={creatingChat}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#22583f] dark:bg-[#102b1e] dark:hover:border-[#2d7653] dark:hover:bg-[#143524]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                  #
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Grup oluştur
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Birden fazla kullanıcıyla grup sohbeti oluşturun.
                  </p>
                </div>
                <span className="text-slate-500 dark:text-slate-300">→</span>
              </button>

              <div className="mt-3 max-h-72 overflow-y-auto">
                {userSearch.trim().length < 2 ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-400">
                    En az 2 karakter girin.
                  </p>
                ) : !searchingUsers && userSearchResults.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-slate-400">
                    Kullanıcı bulunamadı.
                  </p>
                ) : (
                  userSearchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      disabled={creatingChat}
                      onClick={() => startDirectChat(user)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#102c20]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {user.username}
                        </p>
                        <p className="text-xs text-slate-400">
                          Doğrudan sohbet başlat
                        </p>
                      </div>
                      <span className="text-slate-500 dark:text-slate-300">
                        →
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {groupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02100a]/78 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#1c4936] dark:bg-[#06140e]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#173b2b]">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Grup oluştur
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                  Bir ad seçin ve gruba kullanıcı ekleyin.
                </p>
              </div>

              <button
                type="button"
                onClick={closeGroup}
                disabled={creatingGroup}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-lg text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-40 dark:border-[#1c4936] dark:bg-[#0d2419] dark:text-slate-200 dark:hover:bg-[#143524]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Grup adı
                </label>
                <input
                  autoFocus
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="örn. Yazılım Ekibi"
                  disabled={creatingGroup}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 dark:border-[#1c4936] dark:bg-[#0b2117] dark:text-slate-100 dark:focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Üye ekle
                </label>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-emerald-400 dark:border-[#1c4936] dark:bg-[#0b2117] dark:focus-within:border-emerald-400">
                  <Search
                    className="h-4 w-4 text-slate-400"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <input
                    value={groupMemberSearch}
                    onChange={(event) =>
                      setGroupMemberSearch(event.target.value)
                    }
                    placeholder="Kullanıcı adı veya e-posta ara..."
                    disabled={creatingGroup}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-400"
                  />
                  {searchingGroupMembers && (
                    <span className="text-xs text-slate-400">Aranıyor...</span>
                  )}
                </div>

                {selectedGroupMembers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedGroupMembers.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      >
                        {member.username}
                        <button
                          type="button"
                          onClick={() => removeGroupMember(member.id)}
                          disabled={creatingGroup}
                          className="rounded-full px-1 text-emerald-400 hover:bg-emerald-200 hover:text-emerald-700 disabled:opacity-40 dark:hover:bg-emerald-900"
                          aria-label={`Remove ${member.username}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 max-h-48 overflow-y-auto">
                  {groupMemberSearch.trim().length < 2 ? (
                    <p className="px-2 py-4 text-center text-xs text-slate-400">
                      Aramak için en az 2 karakter girin.
                    </p>
                  ) : !searchingGroupMembers &&
                    groupMemberResults.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-slate-400">
                      Kullanıcı bulunamadı.
                    </p>
                  ) : (
                    groupMemberResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addGroupMember(user)}
                        disabled={creatingGroup}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#102c20]"
                      >
                        <div className="premium-avatar flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-xs font-bold text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {user.username}
                          </p>
                          <p className="text-xs text-slate-400">Gruba ekle</p>
                        </div>
                        <span className="text-slate-400">+</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-[#123024]">
                <button
                  type="button"
                  onClick={closeGroup}
                  disabled={creatingGroup}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:border-[#1c4936] dark:text-slate-300 dark:hover:bg-[#102c20]"
                >
                  İptal
                </button>

                <button
                  type="button"
                  onClick={createGroup}
                  disabled={
                    creatingGroup ||
                    !groupName.trim() ||
                    selectedGroupMembers.length === 0
                  }
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {creatingGroup ? "Oluşturuluyor..." : "Grup oluştur"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {manageGroupOpen && selectedChat?.isGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02100a]/78 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#123024] dark:bg-[#06140e]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#123024]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">
                    {st("Group members", "Grup üyeleri")}
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {groupMembers.length}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {st("Manage members of", "Üyeleri yönetin:")}{" "}
                  {selectedChat.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeManageGroup}
                disabled={!!memberActionUserId}
                className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-[#102c20]"
                aria-label={st("Close", "Kapat")}
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-[#173b2b] dark:bg-[#0b2117]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    {st("Add member", "Üye ekle")}
                  </label>
                  {!canManageMembers && (
                    <span className="text-right text-[10px] font-medium text-slate-400">
                      {st(
                        "Only owners and admins can add members.",
                        "Yalnızca sahip ve yöneticiler üye ekleyebilir.",
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-emerald-400 dark:border-[#173b2b] dark:bg-[#06140e]">
                  <Search
                    className="h-4 w-4 shrink-0 text-slate-400"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <input
                    autoFocus
                    value={manageMemberSearch}
                    onChange={(event) =>
                      setManageMemberSearch(event.target.value)
                    }
                    placeholder={st(
                      "Kullanıcı adı veya e-posta ara...",
                      "Kullanıcı adı veya e-posta ara...",
                    )}
                    disabled={!canManageMembers || !!memberActionUserId}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                  {searchingManageMembers && (
                    <span className="shrink-0 text-xs text-slate-400">
                      {st("Aranıyor...", "Aranıyor...")}
                    </span>
                  )}
                </div>

                {manageMemberSearch.trim().length >= 2 && (
                  <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-[#173b2b] dark:bg-[#06140e]">
                    {!searchingManageMembers &&
                    manageMemberResults.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-slate-400">
                        {st("Kullanıcı bulunamadı.", "Kullanıcı bulunamadı.")}
                      </p>
                    ) : (
                      manageMemberResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => addMemberToGroup(user)}
                          disabled={!canManageMembers || !!memberActionUserId}
                          className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-emerald-50 disabled:opacity-50 dark:border-[#123024] dark:hover:bg-[#102c20]"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {user.username}
                          </span>
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            +
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {st("Members", "Üyeler")}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-[#102c20] dark:text-slate-300">
                      {groupMembers.length}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {groupMembers.filter((member) => member.isAdmin).length}{" "}
                    {st("admin", "yönetici")}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-[#123024]">
                  {loadingGroupMembers ? (
                    <p className="px-4 py-7 text-center text-xs text-slate-400">
                      {st("Loading members...", "Üyeler yükleniyor...")}
                    </p>
                  ) : groupMembers.length === 0 ? (
                    <p className="px-4 py-7 text-center text-xs text-slate-400">
                      {st("No members found.", "Üye bulunamadı.")}
                    </p>
                  ) : (
                    groupMembers.map((member) => {
                      const isSelf = member.userId === currentUserId;
                      const canRemove =
                        !member.isOwner &&
                        (isSelf ||
                          isGroupOwner ||
                          (currentGroupRole === "Admin" &&
                            member.role === "Member"));
                      const canChangeRole =
                        isGroupOwner && !member.isOwner && !isSelf;

                      return (
                        <div
                          key={member.userId}
                          className="relative flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 dark:border-[#123024]"
                        >
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white dark:bg-slate-700">
                            {member.username.charAt(0).toUpperCase()}
                            {member.isOwner && (
                              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">
                                <ShieldCheck className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold">
                                {member.username}
                              </p>
                              {member.isOwner ? (
                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  {st("Owner", "Sahip")}
                                </span>
                              ) : member.isAdmin ? (
                                <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                                  {st("Admin", "Yönetici")}
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-slate-400">
                              {member.email}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {st("Joined", "Katıldı")}{" "}
                              {new Date(member.joinedAt).toLocaleDateString(
                                language === "Türkçe" ? "tr-TR" : "en-US",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>

                          {member.isOwner ? (
                            <span className="shrink-0 text-[10px] font-medium text-slate-400">
                              {st("Owner", "Sahip")}
                            </span>
                          ) : isSelf ? (
                            <button
                              type="button"
                              onClick={() => removeMemberFromGroup(member)}
                              disabled={!!memberActionUserId}
                              className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/30"
                            >
                              {st("Leave group", "Gruptan ayrıl")}
                            </button>
                          ) : (
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setMemberMenuUserId((current) =>
                                    current === member.userId
                                      ? null
                                      : member.userId,
                                  )
                                }
                                disabled={!canRemove && !canChangeRole}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-default disabled:opacity-0 dark:hover:bg-[#102c20] dark:hover:text-slate-200"
                                aria-label={st(
                                  "Member actions",
                                  "Üye işlemleri",
                                )}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {memberMenuUserId === member.userId && (
                                <div className="absolute right-0 top-10 z-20 min-w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-[#173b2b] dark:bg-[#0a1b13]">
                                  {canChangeRole && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMemberAdmin(member, !member.isAdmin)
                                      }
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-[#102c20]"
                                    >
                                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                      {member.isAdmin
                                        ? st(
                                            "Remove admin",
                                            "Yöneticiliği kaldır",
                                          )
                                        : st("Make admin", "Yönetici yap")}
                                    </button>
                                  )}

                                  {canRemove && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeMemberFromGroup(member)
                                      }
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {st("Remove from group", "Gruptan çıkar")}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {!isGroupOwner && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-[#173b2b] dark:bg-[#0b2117] dark:text-slate-400">
                  {st(
                    "You can leave the group at any time.",
                    "İsterseniz istediğiniz zaman gruptan ayrılabilirsiniz.",
                  )}
                </div>
              )}

              <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-[#123024]">
                <button
                  type="button"
                  onClick={closeManageGroup}
                  disabled={!!memberActionUserId}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-[#102c20]"
                >
                  {st("Close", "Kapat")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editGroupOpen && selectedChat?.isGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02100a]/78 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#123024] dark:bg-[#06140e]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#123024]">
              <div>
                <h2 className="text-base font-semibold">
                  {st("Edit group", "Grubu düzenle")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {st(
                    "Change the group name and avatar.",
                    "Grup adını ve görselini değiştirin.",
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditGroupName}
                disabled={updatingGroupName || uploadingGroupAvatar}
                className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-[#102c20]"
                aria-label={st("Close", "Kapat")}
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {st("Group avatar", "Grup görseli")}
                </label>

                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#173b2b] dark:bg-[#0b2117]">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-xl font-bold text-white">
                    {selectedChat.avatarUrl && !groupAvatarRemoved ? (
                      <img
                        src={getAttachmentUrl(selectedChat.avatarUrl)}
                        alt={selectedChat.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "#"
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {st("Change group avatar", "Grup görselini değiştir")}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {st(
                        "JPG, PNG, GIF or WebP · max 5 MB",
                        "JPG, PNG, GIF veya WebP · en fazla 5 MB",
                      )}
                    </p>

                    <input
                      ref={groupAvatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadGroupAvatar(file);
                      }}
                    />

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => groupAvatarInputRef.current?.click()}
                        disabled={uploadingGroupAvatar || updatingGroupName}
                        className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {uploadingGroupAvatar
                          ? st("Uploading...", "Yükleniyor...")
                          : st("Choose image", "Görsel seç")}
                      </button>

                      {selectedChat.avatarUrl && !groupAvatarRemoved && (
                        <button
                          type="button"
                          onClick={() => void removeGroupAvatar()}
                          disabled={uploadingGroupAvatar || updatingGroupName}
                          className="rounded-lg border border-red-500/20 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-400/15 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          {st("Remove photo", "Fotoğrafı kaldır")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {st("Grup adı", "Grup adı")}
                </label>

                <input
                  autoFocus
                  value={editGroupName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setEditGroupName(value);
                    setEditGroupNameError(
                      containsEmoji(value) ? "Grup adı emoji içeremez." : "",
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      updateGroupName();
                    }
                  }}
                  disabled={updatingGroupName || uploadingGroupAvatar}
                  className={`w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none transition dark:bg-[#0b2117] ${
                    editGroupNameError
                      ? "border-red-400 focus:border-red-400 dark:border-red-400/60"
                      : "border-slate-200 focus:border-emerald-400 dark:border-[#173b2b]"
                  }`}
                />
                {editGroupNameError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-300">
                    {editGroupNameError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-[#123024]">
                <button
                  type="button"
                  onClick={closeEditGroupName}
                  disabled={updatingGroupName || uploadingGroupAvatar}
                  className="rounded-xl px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-[#102c20]"
                >
                  {st("İptal", "İptal")}
                </button>

                <button
                  type="button"
                  onClick={updateGroupName}
                  disabled={
                    updatingGroupName ||
                    uploadingGroupAvatar ||
                    !editGroupName.trim() ||
                    !!editGroupNameError
                  }
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {updatingGroupName
                    ? st("Saving...", "Kaydediliyor...")
                    : st("Save", "Kaydet")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {forwardingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02100a]/78 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#123024] dark:bg-[#06140e]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Forward message</h2>
                <p className="text-xs text-slate-500">Choose a conversation.</p>
              </div>
              <button
                type="button"
                onClick={() => setForwardingMessage(null)}
                className="p-2 text-slate-400"
              >
                ×
              </button>
            </div>
            <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
              {chats
                .filter((chat) => chat.id !== selectedChatId)
                .map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => void forwardMessage(chat.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-[#102c20]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-xs font-bold text-white">
                      {chat.isGroup && chat.avatarUrl ? (
                        <img
                          src={getAttachmentUrl(chat.avatarUrl)}
                          alt={chat.name}
                          className="h-full w-full object-cover"
                        />
                      ) : chat.isGroup ? (
                        "#"
                      ) : (
                        chat.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="truncate text-sm font-semibold">
                      {chat.name}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="premium-settings-overlay fixed inset-0 z-[70] flex items-center justify-center bg-[#02100a]/78 p-4 backdrop-blur-md">
          <div className="premium-settings-modal w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#123024] dark:bg-[#06140e]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#123024]">
              <div>
                <h2 className="text-base font-semibold">
                  {st("Settings", "Ayarlar")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {st(
                    "Appearance, notifications, accessibility and account.",
                    "Görünüm, bildirimler, erişilebilirlik ve hesap.",
                  )}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${settingsSaved ? "bg-emerald-400" : "bg-amber-400"}`}
                  />
                  <span
                    className={
                      settingsSaved ? "text-emerald-300" : "text-amber-300"
                    }
                  >
                    {settingsSaved
                      ? st("Saved", "Kaydedildi")
                      : st(
                          "Changes are saved automatically",
                          "Değişiklikler otomatik kaydedilir",
                        )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSettings}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
                aria-label={st("Close settings", "Ayarları kapat")}
              >
                <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-72px)] space-y-4 overflow-y-auto p-5">
              <details className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-[#123024] dark:bg-[#0b2117]">
                <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <Palette className="h-4 w-4 text-emerald-300" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {st("Appearance", "Görünüm")}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {st(
                        "Choose how MFB Chat looks and feels.",
                        "MFB Chat görünümünü ve kullanım şeklini seçin.",
                      )}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-slate-500 text-sm">
                    ⌄
                  </span>
                </summary>

                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-slate-400">
                    {st("Theme", "Tema")}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        ["dark", st("Dark", "Koyu"), Moon],
                        ["light", st("Light", "Açık"), Sun],
                      ] as const
                    ).map(([value, label, Icon]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => changeTheme(value)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition-all duration-200 ${
                          theme === value
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-[#173b2b] dark:text-slate-300 dark:hover:bg-[#102c20]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-slate-400">
                    {st("Message appearance", "Mesaj görünümü")}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["compact", "standard", "comfortable"] as const).map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setSettingsPreference(
                              setMessageDensity,
                              "chatapp-message-density",
                              value,
                            )
                          }
                          className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                            messageDensity === value
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-[#173b2b] dark:text-slate-300 dark:hover:bg-[#102c20]"
                          }`}
                        >
                          {densityLabel(value)}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-slate-400">
                    {st("Chat wallpaper", "Sohbet arka planı")}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setChatWallpaper("none");
                        setCustomWallpaperUrl("");
                        setWallpaperFit("contain");
                        localStorage.setItem("chatapp-wallpaper", "none");
                        localStorage.removeItem("chatapp-custom-wallpaper");
                        localStorage.removeItem("chatapp-wallpaper-fit");
                        localStorage.removeItem("chatapp-wallpaper-scale");
                        setSettingsSaved(false);
                      }}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                        chatWallpaper === "none"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-[#173b2b] dark:text-slate-300 dark:hover:bg-[#102c20]"
                      }`}
                    >
                      {st("None", "Yok")}
                    </button>

                    <button
                      type="button"
                      onClick={() => wallpaperInputRef.current?.click()}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
                        chatWallpaper === "custom"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/60 dark:border-[#173b2b] dark:text-slate-300 dark:hover:bg-[#102c20]"
                      }`}
                    >
                      {st("Add", "Ekle")}
                    </button>

                    <input
                      ref={wallpaperInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        handleWallpaperFile(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </div>

                  {chatWallpaper === "custom" && customWallpaperUrl && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-[#173b2b] dark:bg-[#0b2117]">
                      <div className="mb-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-slate-500">
                            {st("Preview", "Önizleme")}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {wallpaperFit === "contain"
                              ? st("Fit", "Sığdır")
                              : st("Fill", "Kapla")}
                          </span>
                        </div>

                        <div
                          className="relative h-36 overflow-hidden rounded-xl border border-emerald-200/70 bg-emerald-50/40 dark:border-[#173b2b] dark:bg-[#06140e]"
                          style={{
                            backgroundImage: `url("${customWallpaperUrl}")`,
                            backgroundSize:
                              wallpaperFit === "contain" ? "contain" : "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                          }}
                        >
                          <div className="absolute inset-0 flex flex-col justify-end gap-2 p-3">
                            <div className="flex justify-start">
                              <div className="premium-message-incoming max-w-[72%] rounded-2xl rounded-bl-md bg-slate-100 px-3 py-1.5 text-[10px] font-medium text-slate-900 shadow-sm dark:bg-[#0b2117] dark:text-slate-100">
                                {st("Merhaba", "Merhaba")}
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <div className="max-w-[72%] rounded-2xl rounded-br-md bg-[#9bdfb3]/95 px-3 py-1.5 text-[10px] font-semibold text-[#183024] shadow-sm">
                                {st("Görüşürüz!", "Görüşürüz!")}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {st("Image display", "Görsel görünümü")}
                        </span>
                        <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/70 p-1 dark:bg-[#06140e]">
                          {(["contain", "cover"] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setWallpaperFit(value);
                                localStorage.setItem(
                                  "chatapp-wallpaper-fit",
                                  value,
                                );
                                setSettingsSaved(false);
                              }}
                              className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
                                wallpaperFit === value
                                  ? "bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-950/30 dark:text-emerald-300"
                                  : "text-slate-500 hover:bg-emerald-50/60 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-[#102c20]"
                              }`}
                            >
                              {value === "contain"
                                ? st("Fit", "Sığdır")
                                : st("Fill", "Kapla")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSettingsPreference(
                      setAnimationsEnabled,
                      "chatapp-animations",
                      !animationsEnabled,
                    )
                  }
                  className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left dark:border-[#173b2b] dark:bg-[#0b2117]"
                >
                  <span>
                    <span className="block text-xs font-semibold">
                      {st("Animations", "Animasyonlar")}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {st(
                        "Use interface transitions and motion.",
                        "Arayüz geçişlerini ve hareketleri kullan.",
                      )}
                    </span>
                  </span>
                  <span
                    style={{
                      backgroundColor: animationsEnabled
                        ? "#5fce8e"
                        : "#ffffff",
                      border: "1px solid #b9d8c3",
                    }}
                    className="relative h-5 w-9 rounded-full transition"
                  >
                    <span
                      style={{
                        backgroundColor: animationsEnabled
                          ? "#ffffff"
                          : "#68d39a",
                        border: animationsEnabled
                          ? "1px solid rgba(32, 53, 42, 0.10)"
                          : "1px solid #57bf88",
                        boxShadow: "0 1px 3px rgba(20, 45, 32, 0.22)",
                      }}
                      className={`absolute top-0.5 h-4 w-4 rounded-full transition ${animationsEnabled ? "left-4" : "left-0.5"}`}
                    />
                  </span>
                </button>
              </details>

              <details className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-[#123024] dark:bg-[#0b2117]">
                <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <BellRing className="h-4 w-4 text-emerald-300" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {st("Notifications", "Bildirimler")}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {st(
                        "Control how MFB Chat alerts you.",
                        "MFB Chat bildirimlerini kontrol edin.",
                      )}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-slate-500 text-sm">
                    ⌄
                  </span>
                </summary>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => void toggleBrowserNotifications()}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left dark:border-[#173b2b] dark:bg-[#0b2117]"
                  >
                    <span>
                      <span className="block text-xs font-semibold">
                        {st("Desktop notifications", "Masaüstü bildirimleri")}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {st(
                          "Receive alerts even when MFB Chat is in the background.",
                          "MFB Chat arka plandayken bile bildirim alın.",
                        )}
                      </span>
                    </span>
                    <span
                      style={{
                        backgroundColor: notificationsEnabled
                          ? "#5fce8e"
                          : "#ffffff",
                        border: "1px solid #b9d8c3",
                      }}
                      className="relative h-5 w-9 rounded-full transition"
                    >
                      <span
                        style={{
                          backgroundColor: notificationsEnabled
                            ? "#ffffff"
                            : "#68d39a",
                          border: notificationsEnabled
                            ? "1px solid rgba(32, 53, 42, 0.10)"
                            : "1px solid #57bf88",
                          boxShadow: "0 1px 3px rgba(20, 45, 32, 0.22)",
                        }}
                        className={`absolute top-0.5 h-4 w-4 rounded-full transition ${notificationsEnabled ? "left-4" : "left-0.5"}`}
                      />
                    </span>
                  </button>

                  {[
                    [
                      st("Message sound", "Mesaj sesi"),
                      st(
                        "Play a short sound for incoming messages.",
                        "Gelen mesajlar için kısa bir ses çal.",
                      ),
                      notificationSound,
                      setNotificationSound,
                      "chatapp-notification-sound",
                    ],
                    [
                      st("Message preview", "Mesaj önizlemesi"),
                      st(
                        "Show message text in browser notifications.",
                        "Tarayıcı bildirimlerinde mesaj metnini göster.",
                      ),
                      notificationPreview,
                      setNotificationPreview,
                      "chatapp-notification-preview",
                    ],
                    [
                      st("Mentions", "Bahsetmeler"),
                      st(
                        "Notify when someone mentions you.",
                        "Biri senden bahsettiğinde bildir.",
                      ),
                      mentionNotifications,
                      setMentionNotifications,
                      "chatapp-notification-mentions",
                    ],
                  ].map(([label, description, value, setter, key]) => (
                    <button
                      key={label as string}
                      type="button"
                      onClick={() =>
                        setNotificationPreference(
                          key as string,
                          !(value as boolean),
                          setter as Dispatch<SetStateAction<boolean>>,
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left dark:border-[#173b2b] dark:bg-[#0b2117]"
                    >
                      <span>
                        <span className="block text-xs font-semibold">
                          {label as string}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {description as string}
                        </span>
                      </span>
                      <span
                        style={{
                          backgroundColor: (value as boolean)
                            ? "#5fce8e"
                            : "#ffffff",
                          border: "1px solid #b9d8c3",
                        }}
                        className="relative h-5 w-9 shrink-0 rounded-full transition"
                      >
                        <span
                          style={{
                            backgroundColor: (value as boolean)
                              ? "#ffffff"
                              : "#68d39a",
                            border: (value as boolean)
                              ? "1px solid rgba(32, 53, 42, 0.10)"
                              : "1px solid #57bf88",
                            boxShadow: "0 1px 3px rgba(20, 45, 32, 0.22)",
                          }}
                          className={`absolute top-0.5 h-4 w-4 rounded-full transition ${
                            (value as boolean) ? "left-4" : "left-0.5"
                          }`}
                        />
                      </span>
                    </button>
                  ))}

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#173b2b] dark:bg-[#0b2117]">
                    <p className="text-xs font-semibold">
                      {st("Notification behavior", "Bildirim davranışı")}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {st(
                        "Choose which incoming messages can trigger notifications.",
                        "Hangi gelen mesajların bildirim oluşturacağını seçin.",
                      )}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(
                        [
                          ["all", st("All messages", "Tüm mesajlar")],
                          [
                            "direct",
                            st("Direct messages", "Sadece direkt mesajlar"),
                          ],
                          [
                            "mentions",
                            st("Mentions only", "Sadece bahsetmeler"),
                          ],
                          ["none", st("None", "Hiçbiri")],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setNotificationModePreference(value)}
                          className={`rounded-xl border px-3 py-2 text-[10px] font-semibold transition ${notificationMode === value ? "border-emerald-500 bg-emerald-950/30 text-emerald-300" : "border-slate-200 dark:border-[#173b2b] dark:text-slate-300"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={testNotification}
                      className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-3 py-3 text-left transition hover:bg-emerald-400/10"
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                        <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                        {st("Send test notification", "Test bildirimi gönder")}
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-500">
                        {st(
                          "Check that browser notifications are working.",
                          "Tarayıcı bildirimlerinin çalıştığını kontrol edin.",
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsPreference(
                          setQuietHoursEnabled,
                          "chatapp-quiet-hours",
                          !quietHoursEnabled,
                        )
                      }
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left dark:border-[#173b2b]"
                    >
                      <span>
                        <span className="flex items-center gap-2 text-xs font-semibold">
                          <Clock3
                            className="h-3.5 w-3.5 text-emerald-300"
                            aria-hidden="true"
                          />
                          {st("Quiet hours", "Sessiz saatler")}
                        </span>
                        <span className="mt-1 block text-[10px] text-slate-500">
                          {st(
                            "Automatically suppress notifications on a schedule.",
                            "Belirlediğiniz saatlerde bildirimleri otomatik susturur.",
                          )}
                        </span>
                      </span>
                      <span
                        style={{
                          backgroundColor: quietHoursEnabled
                            ? "#5fce8e"
                            : "#ffffff",
                          border: "1px solid #b9d8c3",
                        }}
                        className="relative h-5 w-9 shrink-0 rounded-full transition"
                      >
                        <span
                          style={{
                            backgroundColor: quietHoursEnabled
                              ? "#ffffff"
                              : "#68d39a",
                            border: quietHoursEnabled
                              ? "1px solid rgba(32, 53, 42, 0.10)"
                              : "1px solid #57bf88",
                            boxShadow: "0 1px 3px rgba(20, 45, 32, 0.22)",
                          }}
                          className={`absolute top-0.5 h-4 w-4 rounded-full transition ${quietHoursEnabled ? "left-4" : "left-0.5"}`}
                        />
                      </span>
                    </button>
                  </div>

                  {quietHoursEnabled && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="rounded-xl border border-slate-200 p-3 dark:border-[#173b2b]">
                          <span className="block text-[10px] font-semibold text-slate-400">
                            {st("From", "Başlangıç")}
                          </span>
                          <input
                            type="time"
                            value={quietHoursStart}
                            onChange={(e) => {
                              setQuietHoursStart(e.target.value);
                              localStorage.setItem(
                                "chatapp-quiet-start",
                                e.target.value,
                              );
                              setSettingsSaved(false);
                            }}
                            className="mt-1 w-full bg-transparent text-xs outline-none"
                          />
                        </label>
                        <label className="rounded-xl border border-slate-200 p-3 dark:border-[#173b2b]">
                          <span className="block text-[10px] font-semibold text-slate-400">
                            {st("Until", "Bitiş")}
                          </span>
                          <input
                            type="time"
                            value={quietHoursEnd}
                            onChange={(e) => {
                              setQuietHoursEnd(e.target.value);
                              localStorage.setItem(
                                "chatapp-quiet-end",
                                e.target.value,
                              );
                              setSettingsSaved(false);
                            }}
                            className="mt-1 w-full bg-transparent text-xs outline-none"
                          />
                        </label>
                      </div>
                      <p className="mt-2 text-[10px] text-emerald-300/80">
                        {st(
                          `Notifications are muted from ${quietHoursStart} to ${quietHoursEnd}.`,
                          `Bildirimler ${quietHoursStart} - ${quietHoursEnd} arasında sessize alınır.`,
                        )}
                      </p>
                    </>
                  )}

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#173b2b] dark:bg-[#0b2117]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-xs font-semibold">
                          <VolumeX
                            className="h-3.5 w-3.5 text-emerald-300"
                            aria-hidden="true"
                          />
                          {st("Pause notifications", "Bildirimleri duraklat")}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {notificationSnoozeUntil &&
                          notificationSnoozeUntil > Date.now()
                            ? `${st("Notifications are temporarily paused.", "Bildirimler geçici olarak duraklatıldı.")} ${getNotificationPauseLabel()}`
                            : st(
                                "Temporarily silence browser notifications without changing your other settings.",
                                "Diğer ayarları değiştirmeden tarayıcı bildirimlerini geçici olarak susturun.",
                              )}
                        </p>
                      </div>
                      {notificationSnoozeUntil &&
                        notificationSnoozeUntil > Date.now() && (
                          <button
                            type="button"
                            onClick={clearNotificationPause}
                            className="shrink-0 text-[10px] font-semibold text-emerald-300 hover:text-emerald-200"
                          >
                            {st("Resume", "Devam et")}
                          </button>
                        )}
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      {[
                        [15, "15 min", "15 dk"],
                        [60, "1 hour", "1 saat"],
                        [240, "4 hours", "4 saat"],
                        [1440, "Tomorrow", "Yarına kadar"],
                      ].map(([minutes, en, tr]) => (
                        <button
                          key={minutes as number}
                          type="button"
                          onClick={() => pauseNotifications(minutes as number)}
                          className="rounded-lg border border-slate-200 px-2 py-2 text-[10px] font-semibold transition hover:border-emerald-500 hover:bg-emerald-950/20 dark:border-[#173b2b] dark:text-slate-300"
                        >
                          {st(en as string, tr as string)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>

              <details className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-[#123024] dark:bg-[#0b2117]">
                <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <Accessibility className="h-4 w-4 text-emerald-300" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {st("Accessibility", "Erişilebilirlik")}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {st(
                        "Make the interface easier to read and use.",
                        "Arayüzü okumayı ve kullanmayı kolaylaştırın.",
                      )}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-slate-500 text-sm">
                    ⌄
                  </span>
                </summary>

                <div className="mt-4 space-y-2">
                  {[
                    [
                      st("Larger text", "Büyük metin"),
                      st(
                        "Increase interface text size.",
                        "Arayüz metin boyutunu artır.",
                      ),
                      largerText,
                      setLargerText,
                      "chatapp-larger-text",
                    ],
                    [
                      st("High contrast", "Yüksek kontrast"),
                      st(
                        "Increase contrast for improved readability.",
                        "Okunabilirliği artırmak için kontrastı yükselt.",
                      ),
                      highContrast,
                      setHighContrast,
                      "chatapp-high-contrast",
                    ],
                    [
                      st("Reduce animations", "Animasyonları azalt"),
                      st(
                        "Minimize motion and transitions.",
                        "Hareketleri ve geçişleri en aza indir.",
                      ),
                      reduceMotion,
                      setReduceMotion,
                      "chatapp-reduce-motion",
                    ],
                  ].map(([label, description, value, setter, key]) => (
                    <button
                      key={label as string}
                      type="button"
                      onClick={() =>
                        setSettingsPreference(
                          setter as Dispatch<SetStateAction<boolean>>,
                          key as string,
                          !(value as boolean),
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left dark:border-[#173b2b] dark:bg-[#0b2117]"
                    >
                      <span>
                        <span className="block text-xs font-semibold">
                          {label as string}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {description as string}
                        </span>
                      </span>
                      <span
                        style={{
                          backgroundColor: (value as boolean)
                            ? "#5fce8e"
                            : "#ffffff",
                          border: "1px solid #b9d8c3",
                        }}
                        className="relative h-5 w-9 shrink-0 rounded-full transition"
                      >
                        <span
                          style={{
                            backgroundColor: (value as boolean)
                              ? "#ffffff"
                              : "#68d39a",
                            border: (value as boolean)
                              ? "1px solid rgba(32, 53, 42, 0.10)"
                              : "1px solid #57bf88",
                            boxShadow: "0 1px 3px rgba(20, 45, 32, 0.22)",
                          }}
                          className={`absolute top-0.5 h-4 w-4 rounded-full transition ${(value as boolean) ? "left-4" : "left-0.5"}`}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </details>

              <details className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-[#123024] dark:bg-[#0b2117]">
                <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <Languages className="h-4 w-4 text-emerald-300" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {st("Language", "Dil")}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {st(
                        "Choose your preferred interface language.",
                        "Tercih ettiğiniz arayüz dilini seçin.",
                      )}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-slate-500 text-sm">
                    ⌄
                  </span>
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["English", "Türkçe"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setSettingsPreference(
                          setLanguage,
                          "chatapp-language",
                          value,
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-xs font-semibold transition ${language === value ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-slate-200 dark:border-[#173b2b] dark:text-slate-300"}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  {st(
                    "Language preference is saved for this browser.",
                    "Dil tercihi bu tarayıcıda kaydedilir.",
                  )}
                </p>
              </details>

              <details className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-[#123024] dark:bg-[#0b2117]">
                <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <Database className="h-4 w-4 text-emerald-300" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {st("Storage & data", "Depolama ve veri")}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {st(
                        "Manage local browser data used by MFB Chat.",
                        "MFB Chat tarafından kullanılan yerel tarayıcı verilerini yönetin.",
                      )}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-slate-500 text-sm">
                    ⌄
                  </span>
                </summary>
                <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-[#0b2117]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold">
                      {st("Browser storage", "Tarayıcı depolaması")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {storageEstimate}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {st(
                      "This estimate is provided by the browser and may include other site data.",
                      "Bu değer tarayıcı tarafından sağlanır ve diğer site verilerini içerebilir.",
                    )}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-950/60">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${Math.max(2, storageUsagePercent)}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void exportUserData()}
                  disabled={exportingData}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingData
                    ? st("Preparing export…", "Dışa aktarım hazırlanıyor…")
                    : st("Export my data", "Verilerimi dışa aktar")}
                </button>

                <button
                  type="button"
                  onClick={clearLocalPreferences}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-400/5 px-3 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-400/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {st("Reset local preferences", "Yerel tercihleri sıfırla")}
                </button>

                <button
                  type="button"
                  onClick={deleteLocalData}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-400/5 px-3 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-400/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {st("Delete my data", "Verileri sil")}
                </button>
              </details>

              <details className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-[#123024] dark:bg-[#0b2117]">
                <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {st("Privacy & security", "Gizlilik ve güvenlik")}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {st(
                        "Profile, privacy and account security controls.",
                        "Profil, gizlilik ve hesap güvenliği kontrolleri.",
                      )}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-slate-500 text-sm">
                    ⌄
                  </span>
                </summary>
                <button
                  type="button"
                  onClick={() => {
                    closeSettings();
                    openProfile();
                  }}
                  className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left dark:border-[#173b2b] dark:bg-[#0b2117]"
                >
                  <span>
                    <span className="block text-xs font-semibold">
                      {st("Open profile & privacy", "Profil ve gizliliği aç")}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {st(
                        "Manage your profile, visibility, password and sessions.",
                        "Profilinizi, görünürlüğünüzü, şifrenizi ve oturumlarınızı yönetin.",
                      )}
                    </span>
                  </span>
                  <span className="text-emerald-300">→</span>
                </button>
              </details>

              <details className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-[#123024] dark:bg-[#0b2117]">
                <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <Info className="h-4 w-4 text-emerald-300" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {st("About MFB Chat", "MFB Chat hakkında")}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {st(
                        "Real-time communication platform.",
                        "Gerçek zamanlı iletişim platformu.",
                      )}
                    </span>
                  </span>
                  <span className="ml-auto shrink-0 text-slate-500 text-sm">
                    ⌄
                  </span>
                </summary>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0b2117]">
                    <p className="text-[10px] text-slate-500">
                      {st("Version", "Sürüm")}
                    </p>
                    <p className="mt-1 text-xs font-semibold">1.0.0</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#0b2117]">
                    <p className="text-[10px] text-slate-500">
                      {st("Platform", "Platform")}
                    </p>
                    <p className="mt-1 text-xs font-semibold">Web</p>
                  </div>
                </div>
              </details>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-[#123024]">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsSaved(true);
                    window.setTimeout(() => setSettingsSaved(false), 1400);
                    closeSettings();
                  }}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-[#0b2117] dark:text-slate-200 dark:hover:bg-[#173b2b]"
                >
                  {settingsSaved
                    ? st("Saved ✓", "Kaydedildi ✓")
                    : st("Done", "Tamam")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteDataConfirm && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#02100a]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#1d4b35] dark:bg-[#081810] dark:shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300 dark:border dark:border-red-300/10 dark:bg-red-400/10 dark:text-red-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-[#f2fff7]">
                  {st("Delete all chats?", "Tüm sohbetler silinsin mi?")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-[#a9bdb2]">
                  {st(
                    "All of your MFB Chat conversations will be permanently deleted. This cannot be undone.",
                    "MFB Chat üzerindeki tüm sohbetleriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.",
                  )}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteDataConfirm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:!border-[#315844] dark:!bg-[#183426] dark:!text-[#e8fff0] dark:hover:!bg-[#214631] dark:hover:!text-white"
              >
                {st("İptal", "İptal")}
              </button>
              <button
                type="button"
                onClick={performDeleteLocalData}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_22px_rgba(239,68,68,0.18)] transition-colors hover:bg-red-400 dark:bg-[#ef4444] dark:shadow-[0_8px_24px_rgba(239,68,68,0.24)] dark:hover:bg-[#f05252]"
              >
                {st("Delete data", "Verileri sil")}
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsResetConfirm && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#02100a]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#123024] dark:bg-[#06140e]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  {st("Reset local preferences?", "Yerel tercihleri sıfırla?")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {st(
                    "Your local appearance, notification and accessibility preferences will return to their defaults. Your account and messages will not be deleted.",
                    "Yerel görünüm, bildirim ve erişilebilirlik tercihleriniz varsayılanlara dönecek. Hesabınız ve mesajlarınız silinmeyecek.",
                  )}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettingsResetConfirm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:!border-[#315844] dark:!bg-[#183426] dark:!text-[#e8fff0] dark:hover:!bg-[#214631] dark:hover:!text-white"
              >
                {st("İptal", "İptal")}
              </button>
              <button
                type="button"
                onClick={performResetLocalPreferences}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-400"
              >
                {st("Reset preferences", "Tercihleri sıfırla")}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#02100a]/78 p-4 backdrop-blur-md">
          <div className="premium-profile-modal w-full max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#123024] dark:bg-[#06140e]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#123024]">
              <div>
                <h2 className="text-base font-semibold">
                  {st("Profile settings", "Profil ayarları")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {st(
                    "Manage your profile and account information.",
                    "Profil ve hesap bilgilerinizi yönetin.",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={closeProfile}
                disabled={savingProfile || uploadingProfileAvatar}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-40 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              <section className="rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-emerald-400/[0.08] to-transparent p-4 dark:border-emerald-300/10">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      profile?.avatarUrl && setAvatarPreviewOpen(true)
                    }
                    className={`premium-avatar premium-avatar-xl relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dff6e8] text-[#183024] font-bold text-white ring-2 ring-emerald-400/20 ${profile?.avatarUrl ? "cursor-zoom-in" : ""}`}
                    aria-label={
                      profile?.avatarUrl
                        ? "View profile photo"
                        : st("Profile photo", "Profil fotoğrafı")
                    }
                  >
                    {profile?.avatarUrl ? (
                      <img
                        src={getAttachmentUrl(profile.avatarUrl)}
                        alt={profile.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (profile?.username ?? username).charAt(0).toUpperCase()
                    )}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold">
                        {profileDisplayName || profile?.username || username}
                      </h3>
                      <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                        You
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      @{profileUsername || profile?.username || username}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {profileBio ||
                        (language === "Türkçe"
                          ? "Kendiniz hakkında kısa bir bilgi ekleyin."
                          : "Add a short bio so people know a little about you.")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    ref={profileAvatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadProfileAvatar(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => profileAvatarInputRef.current?.click()}
                    disabled={uploadingProfileAvatar || savingProfile}
                    className="rounded-xl bg-[#68d39a] px-3.5 py-2 text-xs font-semibold text-[#183024] transition hover:bg-[#55c98d] disabled:opacity-40"
                  >
                    {uploadingProfileAvatar
                      ? st("Updating...", "Güncelleniyor...")
                      : st("Change photo", "Fotoğrafı değiştir")}
                  </button>
                  {profile?.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => void removeProfileAvatar()}
                      disabled={uploadingProfileAvatar || savingProfile}
                      className="rounded-xl border border-red-400/15 bg-red-400/5 px-3.5 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-40"
                    >
                      {st("Remove", "Kaldır")}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  JPG, PNG, GIF or WebP · max 5 MB
                </p>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_8px_24px_rgba(16,185,129,0.08)] dark:border-[#123024] dark:bg-[#0b2117]">
                <button
                  type="button"
                  onClick={() => setProfileInfoOpen((open) => !open)}
                  aria-expanded={profileInfoOpen}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition hover:bg-transparent dark:hover:bg-transparent"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <UserRound
                      className="h-4 w-4 shrink-0 text-emerald-300"
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {st("Profile information", "Profil bilgileri")}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {st(
                          "How other people see you.",
                          "Diğer insanların sizi nasıl gördüğünü yönetin.",
                        )}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${profileInfoOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {profileInfoOpen && (
                  <div className="space-y-4 border-t border-slate-200 p-4 dark:border-[#123024]">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Username
                      </label>
                      <div className="relative">
                        <AtSign
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                          strokeWidth={1.8}
                        />
                        <input
                          value={profileUsername}
                          onChange={(event) =>
                            setProfileUsername(
                              event.target.value.replace(/\s/g, ""),
                            )
                          }
                          maxLength={30}
                          disabled={savingProfile || uploadingProfileAvatar}
                          className={`w-full rounded-xl border bg-slate-50 py-2.5 pl-9 pr-28 text-sm outline-none transition dark:bg-[#0b2117] ${usernameAvailability === "taken" ? "border-red-400/60 focus:border-red-400" : usernameAvailability === "available" ? "border-emerald-400/50 focus:border-emerald-400" : "border-slate-200 focus:border-emerald-400 dark:border-[#173b2b]"}`}
                        />
                        {usernameAvailability !== "idle" && (
                          <span
                            className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold ${usernameAvailability === "available" ? "text-emerald-300" : usernameAvailability === "taken" ? "text-red-300" : "text-slate-500"}`}
                          >
                            {usernameAvailability === "checking"
                              ? "Checking..."
                              : usernameAvailability === "available"
                                ? st("Available", "Uygun")
                                : st("Already taken", "Zaten alınmış")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        3–30 characters · letters, numbers and underscores work
                        best.
                      </p>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {st("Display name", "Görünen ad")}
                        </label>
                        <span className="text-[10px] text-slate-500">
                          {profileDisplayName.length}/50
                        </span>
                      </div>
                      <input
                        value={profileDisplayName}
                        onChange={(event) =>
                          setProfileDisplayName(event.target.value)
                        }
                        maxLength={50}
                        disabled={savingProfile || uploadingProfileAvatar}
                        placeholder={st(
                          "How others see your name",
                          "Adınızı diğerlerinin nasıl göreceğini yazın",
                        )}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-[#173b2b] dark:bg-[#0b2117]"
                      />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {st("Bio", "Biyografi")}
                        </label>
                        <span className="text-[10px] text-slate-500">
                          {profileBio.length}/160
                        </span>
                      </div>
                      <textarea
                        value={profileBio}
                        onChange={(event) => setProfileBio(event.target.value)}
                        maxLength={160}
                        rows={3}
                        disabled={savingProfile || uploadingProfileAvatar}
                        placeholder={st(
                          "Tell people a little about yourself",
                          "Kendiniz hakkında kısaca bilgi verin",
                        )}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-[#173b2b] dark:bg-[#0b2117]"
                      />
                    </div>
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_8px_24px_rgba(16,185,129,0.08)] dark:border-emerald-300/10 dark:bg-[#0b2117]">
                <button
                  type="button"
                  onClick={() => setProfileCompletionOpen((open) => !open)}
                  aria-expanded={profileCompletionOpen}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-transparent dark:hover:bg-transparent"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-300"
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {st("Profile completion", "Profil tamamlama")}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {st(
                          "Complete your profile so people can recognize you.",
                          "İnsanların sizi tanıyabilmesi için profilinizi tamamlayın.",
                        )}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-emerald-300">
                      {profileCompletion}%
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${profileCompletionOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                {profileCompletionOpen && (
                  <div className="border-t border-emerald-400/10 bg-emerald-400/[0.02] p-4">
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-[#10291d]">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        ["Photo", Boolean(profile?.avatarUrl)],
                        ["Name", Boolean(profileDisplayName.trim())],
                        ["Bio", Boolean(profileBio.trim())],
                        ["Status", Boolean(profileStatusText.trim())],
                      ].map(([label, done]) => (
                        <span
                          key={label as string}
                          className={`rounded-full px-2 py-1 text-[9px] font-semibold ${done ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-[#0b2117]"}`}
                        >
                          {done ? "✓" : "○"}{" "}
                          {st(
                            label as string,
                            label === "Photo"
                              ? "Fotoğraf"
                              : label === "Name"
                                ? "Ad"
                                : label === "Bio"
                                  ? "Biyografi"
                                  : "Durum",
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_8px_24px_rgba(16,185,129,0.08)] dark:border-[#123024] dark:bg-[#0b2117]">
                <button
                  type="button"
                  onClick={() => setProfilePreviewOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition hover:bg-transparent dark:hover:bg-transparent"
                >
                  <span className="flex items-center gap-2">
                    <CircleUserRound
                      className="h-4 w-4 text-emerald-300"
                      strokeWidth={1.8}
                    />
                    <span>
                      <span className="block text-sm font-semibold">
                        {st(
                          "How others see you",
                          "Diğerleri sizi nasıl görüyor",
                        )}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {st(
                          "Live preview of your public profile.",
                          "Herkese açık profilinizin canlı önizlemesi.",
                        )}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${profilePreviewOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {profilePreviewOpen && (
                  <div className="mt-3 rounded-xl border border-emerald-400/10 bg-gradient-to-br from-emerald-400/[0.07] to-transparent p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dff6e8] text-base font-bold text-[#183024] ring-1 ring-emerald-300/40">
                        {profilePhotoVisibility === "Nobody" ? (
                          <Eye className="h-5 w-5 text-slate-500" />
                        ) : profile?.avatarUrl ? (
                          <img
                            src={getAttachmentUrl(profile.avatarUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (profileUsername || username).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {profileDisplayName || profileUsername || username}
                        </p>
                        <p className="truncate text-[10px] text-slate-600 dark:text-slate-400">
                          @{profileUsername || username}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-emerald-300">
                          {profileStatusEmoji || "🟢"}{" "}
                          {profileStatusText ||
                            st("No status set", "Durum belirlenmedi")}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-400">
                      {profileBioVisibility === "Nobody"
                        ? st(
                            "Bio hidden by your privacy settings.",
                            "Biyografiniz gizlilik ayarlarınız nedeniyle gizli.",
                          )
                        : profileBio ||
                          st(
                            "Your bio will appear here.",
                            "Biyografiniz burada görünecek.",
                          )}
                    </p>
                    {profilePhotoVisibility === "Contacts" ||
                    profileBioVisibility === "Contacts" ? (
                      <p className="mt-2 text-[9px] text-slate-500">
                        {st(
                          "Some profile details are limited to contacts.",
                          "Bazı profil bilgileri yalnızca kişileriniz tarafından görülebilir.",
                        )}
                      </p>
                    ) : null}
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_8px_24px_rgba(16,185,129,0.08)] dark:border-[#123024] dark:bg-[#0b2117]">
                <button
                  type="button"
                  onClick={() => setProfileStatusOpen((open) => !open)}
                  aria-expanded={profileStatusOpen}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition hover:bg-transparent dark:hover:bg-transparent"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Sparkles
                      className="h-4 w-4 shrink-0 text-emerald-300"
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {st("Status", "Durum")}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {st(
                          "Let people know what you are up to.",
                          "Ne yaptığınızı insanlara bildirin.",
                        )}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${profileStatusOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {profileStatusOpen && (
                  <div className="space-y-3 border-t border-slate-200 p-4 dark:border-[#123024]">
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {statusPresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setProfileStatusEmoji(preset.emoji);
                            setProfileStatusText(
                              st(
                                preset.label,
                                preset.label === "Available"
                                  ? "Uygun"
                                  : preset.label === "Working"
                                    ? "Çalışıyor"
                                    : preset.label === "Studying"
                                      ? "Çalışıyor / Öğreniyor"
                                      : preset.label === "Do not disturb"
                                        ? "Rahatsız etmeyin"
                                        : "Hemen döneceğim",
                              ),
                            );
                          }}
                          disabled={savingProfile || uploadingProfileAvatar}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-emerald-400/40 hover:text-emerald-300 dark:border-[#173b2b] dark:bg-[#0b2117]"
                        >
                          {preset.emoji}{" "}
                          {st(
                            preset.label,
                            preset.label === "Available"
                              ? "Uygun"
                              : preset.label === "Working"
                                ? "Çalışıyor"
                                : preset.label === "Studying"
                                  ? "Çalışıyor / Öğreniyor"
                                  : preset.label === "Do not disturb"
                                    ? "Rahatsız etmeyin"
                                    : "Hemen döneceğim",
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-[58px_1fr] gap-2">
                      <input
                        value={profileStatusEmoji}
                        onChange={(event) =>
                          setProfileStatusEmoji(event.target.value.slice(0, 4))
                        }
                        maxLength={4}
                        disabled={savingProfile || uploadingProfileAvatar}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-lg outline-none focus:border-emerald-400 dark:border-[#173b2b] dark:bg-[#0b2117]"
                        aria-label={st("Status emoji", "Durum emojisi")}
                      />
                      <input
                        value={profileStatusText}
                        onChange={(event) =>
                          setProfileStatusText(event.target.value)
                        }
                        maxLength={80}
                        disabled={savingProfile || uploadingProfileAvatar}
                        placeholder={st(
                          "Available, working, studying...",
                          "Uygun, çalışıyor, çalışıyor/öğreniyor...",
                        )}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-[#173b2b] dark:bg-[#0b2117]"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Clock3
                        className="h-3.5 w-3.5 text-slate-500"
                        strokeWidth={1.8}
                      />
                      <select
                        value={profileStatusDuration}
                        onChange={(event) =>
                          setProfileStatusDuration(
                            event.target.value as typeof profileStatusDuration,
                          )
                        }
                        disabled={savingProfile || uploadingProfileAvatar}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-[#173b2b] dark:bg-[#0b2117]"
                      >
                        {STATUS_DURATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {st(
                              option.label,
                              option.value === "never"
                                ? "Asla"
                                : option.value === "1h"
                                  ? "1 saat"
                                  : option.value === "4h"
                                    ? "4 saat"
                                    : "Bugün",
                            )}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_8px_24px_rgba(16,185,129,0.08)] dark:border-[#123024] dark:bg-[#0b2117]">
                <button
                  type="button"
                  onClick={() => setProfilePrivacyOpen((open) => !open)}
                  aria-expanded={profilePrivacyOpen}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition hover:bg-transparent dark:hover:bg-transparent"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ShieldCheck
                      className="h-4 w-4 shrink-0 text-emerald-300"
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {st("Privacy", "Gizlilik")}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {st(
                          "Control presence and profile visibility.",
                          "Çevrimiçi durumunuzu ve profil görünürlüğünüzü yönetin.",
                        )}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${profilePrivacyOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {profilePrivacyOpen && (
                  <div className="space-y-2 border-t border-slate-200 p-4 dark:border-[#123024]">
                    <div className="space-y-2">
                      {[
                        [
                          "Show online status",
                          "Allow others to see when you are online.",
                          profileShowOnlineStatus,
                          setProfileShowOnlineStatus,
                        ],
                        [
                          "Show last seen",
                          "Allow others to see your last active time.",
                          profileShowLastSeen,
                          setProfileShowLastSeen,
                        ],
                        [
                          "Read receipts",
                          "Let others know when you have read messages.",
                          profileReadReceipts,
                          setProfileReadReceipts,
                        ],
                      ].map(([label, description, value, setValue]) => (
                        <button
                          key={label as string}
                          type="button"
                          onClick={() =>
                            (setValue as Dispatch<SetStateAction<boolean>>)(
                              (current) => !current,
                            )
                          }
                          disabled={savingProfile || uploadingProfileAvatar}
                          className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-emerald-400/40 dark:border-[#173b2b] dark:bg-[#0b2117]"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">
                              {label as string}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                              {description as string}
                            </span>
                          </span>
                          <span
                            style={{
                              backgroundColor: value ? "#5fce8e" : "#ffffff",
                              border: value
                                ? "1px solid rgba(32, 53, 42, 0.10)"
                                : "1px solid #b9d8c3",
                              boxSizing: "border-box",
                            }}
                            className="relative h-6 w-10 shrink-0 rounded-full transition"
                          >
                            <span
                              style={{
                                backgroundColor: value ? "#ffffff" : "#68d39a",
                                border: value
                                  ? "1px solid rgba(32, 53, 42, 0.10)"
                                  : "1px solid #57bf88",
                                boxShadow: "0 1px 3px rgba(20, 45, 32, 0.22)",
                              }}
                              className={`absolute top-1 h-4 w-4 rounded-full transition ${value ? "left-5" : "left-1"}`}
                            />
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[
                        [
                          "Profile photo",
                          profilePhotoVisibility,
                          setProfilePhotoVisibility,
                        ],
                        ["Bio", profileBioVisibility, setProfileBioVisibility],
                      ].map(([label, value, setValue]) => (
                        <label
                          key={label as string}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#173b2b] dark:bg-[#0b2117]"
                        >
                          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                            <Eye
                              className="h-3.5 w-3.5 text-slate-500"
                              strokeWidth={1.8}
                            />
                            {label as string}
                          </span>
                          <select
                            value={value as string}
                            onChange={(event) =>
                              (
                                setValue as Dispatch<
                                  SetStateAction<
                                    "Everyone" | "Contacts" | "Nobody"
                                  >
                                >
                              )(
                                event.target.value as
                                  | "Everyone"
                                  | "Contacts"
                                  | "Nobody",
                              )
                            }
                            disabled={savingProfile || uploadingProfileAvatar}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none dark:border-[#173b2b] dark:bg-[#06140e]"
                          >
                            {PROFILE_VISIBILITY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {st(
                                  option.label,
                                  option.value === "Everyone"
                                    ? "Herkes"
                                    : option.value === "Contacts"
                                      ? "Kişiler"
                                      : "Hiç kimse",
                                )}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:border-emerald-400 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_8px_24px_rgba(16,185,129,0.08)] dark:border-[#123024] dark:bg-[#0b2117]">
                <button
                  type="button"
                  onClick={() => setAccountSecurityOpen((open) => !open)}
                  aria-expanded={accountSecurityOpen}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition hover:bg-transparent dark:hover:bg-transparent"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ShieldCheck
                      className="h-4 w-4 shrink-0 text-emerald-300"
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {st("Account & security", "Hesap ve güvenlik")}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {st(
                          "Manage your password and active sessions.",
                          "Şifrenizi ve aktif oturumlarınızı yönetin.",
                        )}
                      </span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${
                      accountSecurityOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {accountSecurityOpen && (
                  <div className="border-t border-slate-200 p-4 dark:border-[#123024]">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountAction("password");
                          setError("");
                        }}
                        disabled={
                          savingProfile ||
                          uploadingProfileAvatar ||
                          accountActionLoading
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-emerald-400/40 dark:border-[#173b2b] dark:bg-[#0b2117]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                          <KeyRound className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {st("Şifreyi değiştir", "Şifreyi değiştir")}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                            {st(
                              "Update your account password and refresh all sessions.",
                              "Şifrenizi güncelleyin ve tüm oturumları yenileyin.",
                            )}
                          </span>
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          ›
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountAction("sessions");
                          setError("");
                        }}
                        disabled={
                          savingProfile ||
                          uploadingProfileAvatar ||
                          accountActionLoading
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-emerald-400/40 dark:border-[#173b2b] dark:bg-[#0b2117]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                          <MonitorSmartphone
                            className="h-4 w-4"
                            strokeWidth={1.8}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {st(
                              "Log out all sessions",
                              "Tüm oturumlardan çıkış yap",
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                            {st(
                              "Invalidate every active login session, including this one.",
                              "Bu cihaz dahil tüm aktif oturumları geçersiz kılın.",
                            )}
                          </span>
                        </span>
                        <span className="text-slate-500">›</span>
                      </button>
                    </div>
                    <div className="mt-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          <Laptop2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-300" />{" "}
                          {st("Active session", "Aktif oturum")}
                        </span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-300">
                          {st("Current", "Mevcut")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                          <MonitorSmartphone className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">
                            {typeof navigator !== "undefined"
                              ? navigator.platform ||
                                st("This device", "Bu cihaz")
                              : st("This device", "Bu cihaz")}
                          </p>
                          <p className="truncate text-[10px] text-slate-600 dark:text-slate-400">
                            {typeof navigator !== "undefined"
                              ? navigator.userAgent
                                  .split(")")[0]
                                  .replace("Mozilla/5.0 (", "")
                              : st(
                                  "Current browser session",
                                  "Mevcut tarayıcı oturumu",
                                )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-[#173b2b]">
                      <div className="mb-3 flex items-center gap-2">
                        <ShieldAlert
                          style={{ color: "#ef4444", opacity: 1 }}
                          className="h-6 w-6 shrink-0 text-red-500 dark:text-red-300"
                          strokeWidth={2.2}
                        />
                        <div>
                          <h4
                            style={{
                              color: "#dc2626",
                              fontSize: "18px",
                              fontWeight: 700,
                              lineHeight: 1.25,
                            }}
                            className="text-red-600 dark:text-red-200"
                          >
                            {st("Account deletion", "Hesap silme")}
                          </h4>
                          <p
                            style={{ color: "#ef4444" }}
                            className="text-[10px] text-red-600/80 dark:text-red-300/60"
                          >
                            {st(
                              "This action cannot be undone.",
                              "Bu işlem geri alınamaz.",
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountAction("delete");
                          setError("");
                        }}
                        disabled={
                          savingProfile ||
                          uploadingProfileAvatar ||
                          accountActionLoading
                        }
                        style={{
                          backgroundColor: "#fff5f5",
                          borderColor: "#fca5a5",
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition hover:bg-red-50"
                      >
                        <span
                          style={{
                            backgroundColor: "#fee2e2",
                            color: "#dc2626",
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            style={{ color: "#b91c1c" }}
                            className="block text-sm font-medium"
                          >
                            {st("Hesabı sil", "Hesabı sil")}
                          </span>
                          <span
                            style={{ color: "#dc2626" }}
                            className="mt-0.5 block text-[11px]"
                          >
                            {st(
                              "Permanently delete your profile, messages and account data.",
                              "Profilinizi, mesajlarınızı ve hesap verilerinizi kalıcı olarak silin.",
                            )}
                          </span>
                        </span>
                        <span style={{ color: "#dc2626" }}>›</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {st("Email", "E-posta")}
                </label>
                <input
                  value={profile?.email || ""}
                  readOnly
                  style={{
                    color: "#20352a",
                    backgroundColor: "#ffffff",
                    opacity: 1,
                  }}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-[#173b2b] dark:bg-white dark:text-slate-700"
                />
              </div>
              {profile?.createdAt && (
                <p className="text-xs text-slate-400">
                  {st("Member since", "Üyelik tarihi")}{" "}
                  {new Date(profile.createdAt).toLocaleDateString(
                    language === "Türkçe" ? "tr-TR" : "en-US",
                  )}
                </p>
              )}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}
              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 pt-4 dark:border-[#123024] dark:bg-[#06140e]">
                <button
                  type="button"
                  onClick={logout}
                  disabled={savingProfile || uploadingProfileAvatar}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/30"
                >
                  Log out
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeProfile}
                    disabled={savingProfile || uploadingProfileAvatar}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                  >
                    {st("İptal", "İptal")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateProfile()}
                    disabled={savingProfile || uploadingProfileAvatar}
                    className="rounded-xl bg-[#68d39a] px-4 py-2.5 text-sm font-semibold text-[#183024] transition hover:bg-[#55c98d] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingProfile
                      ? st("Saving...", "Kaydediliyor...")
                      : st("Save changes", "Değişiklikleri kaydet")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {avatarPreviewOpen && profile?.avatarUrl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#02100a]/90 p-4 backdrop-blur-md"
          onClick={() => setAvatarPreviewOpen(false)}
        >
          <div
            className="relative max-w-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={getAttachmentUrl(profile.avatarUrl)}
              alt={profile.username}
              className="max-h-[75vh] max-w-full rounded-2xl border border-emerald-300/20 object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setAvatarPreviewOpen(false)}
              className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              aria-label="Close photo preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {accountAction && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#02100a]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#123024] dark:bg-[#06140e]">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-[#123024]">
              <div>
                <h2 className="text-base font-semibold">
                  {accountAction === "password"
                    ? "Şifreyi değiştir"
                    : accountAction === "sessions"
                      ? "Log out all sessions"
                      : "Hesabı sil"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {accountAction === "password"
                    ? "Hesabınız için yeni bir şifre seçin."
                    : accountAction === "sessions"
                      ? "All existing JWT sessions will be invalidated."
                      : "Hesabınız ve ilişkili verileriniz kalıcı olarak silinecek."}
                </p>
              </div>
              <button
                type="button"
                onClick={resetAccountAction}
                disabled={accountActionLoading}
                className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-[#102c20]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              {accountAction === "password" && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Mevcut şifre
                    </span>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-[#173b2b] dark:bg-[#0b2117]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Yeni şifre
                    </span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-[#173b2b] dark:bg-[#0b2117]"
                    />
                    <span className="mt-1 block text-[10px] text-slate-500">
                      En az 8 karakter kullanın.
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Yeni şifreyi onaylayın
                    </span>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 dark:border-[#173b2b] dark:bg-[#0b2117]"
                    />
                  </label>
                </>
              )}

              {accountAction === "sessions" && (
                <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4 text-sm text-slate-300">
                  This signs you out everywhere. You will be redirected to the
                  login screen and must sign in again.
                </div>
              )}

              {accountAction === "delete" && (
                <>
                  <div
                    style={{
                      color: "#b91c1c",
                      backgroundColor: "#fff1f2",
                      borderColor: "#fca5a5",
                    }}
                    className="rounded-xl border p-4 text-xs font-medium leading-5"
                  >
                    Deleting your account removes your profile, memberships,
                    sent messages, reactions, read receipts, mutes and local
                    uploaded files. This cannot be undone.
                  </div>
                  <label className="block">
                    <span
                      style={{ color: "#374840" }}
                      className="mb-1.5 block text-sm font-semibold"
                    >
                      Mevcut şifre
                    </span>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      autoComplete="current-password"
                      style={{ color: "#20352a", backgroundColor: "#ffffff" }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-400"
                    />
                  </label>
                  <label className="block">
                    <span
                      style={{ color: "#374840" }}
                      className="mb-1.5 block text-sm font-semibold"
                    >
                      Onaylamak için DELETE yazın
                    </span>
                    <input
                      value={deleteConfirmation}
                      onChange={(e) =>
                        setDeleteConfirmation(e.target.value.toUpperCase())
                      }
                      maxLength={6}
                      style={{
                        color: "#991b1b",
                        backgroundColor: "#fffafa",
                        borderColor: "#fca5a5",
                      }}
                      className="w-full rounded-xl border px-3 py-3 text-sm font-semibold uppercase tracking-[0.18em] outline-none focus:border-red-500"
                    />
                  </label>
                </>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-[#123024]">
                <button
                  type="button"
                  onClick={resetAccountAction}
                  disabled={accountActionLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:!border-[#315844] dark:!bg-[#183426] dark:!text-[#e8fff0] dark:hover:!bg-[#214631] dark:hover:!text-white"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (accountAction === "password") void changePassword();
                    else if (accountAction === "sessions")
                      void logoutAllSessions();
                    else void deleteAccount();
                  }}
                  disabled={accountActionLoading}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${accountAction === "delete" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-500 hover:bg-emerald-400"}`}
                >
                  {accountActionLoading
                    ? "Processing..."
                    : accountAction === "password"
                      ? "Şifreyi değiştir"
                      : accountAction === "sessions"
                        ? "Log out all"
                        : "Hesabı sil"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main
        className="premium-shell min-h-screen bg-slate-100 text-slate-900 dark:bg-[#020906] dark:text-white"
        data-theme={theme}
        data-density={messageDensity}
        data-animations={animationsEnabled ? "on" : "off"}
        data-larger-text={largerText ? "on" : "off"}
        data-high-contrast={highContrast ? "on" : "off"}
        data-reduce-motion={reduceMotion ? "on" : "off"}
        data-wallpaper={chatWallpaper}
        data-language={language}
      >
        {connectionState === "reconnecting" && (
          <div className="fixed left-0 right-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
            Connection lost. Reconnecting...
          </div>
        )}

        <div className="luxury-app flex h-screen overflow-hidden">
          {/* SIDEBAR */}
          <aside className="premium-panel hidden w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex dark:border-[#123024] dark:bg-[#06140e]">
            <div className="luxury-brandbar flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-[#123024]">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/80 shadow-sm ring-1 ring-emerald-100/70">
                  <img
                    src="/mfb-chat-mascot.jpg"
                    alt="MFB Chat"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <h1 className="mfb-brand-title text-[20px] font-bold leading-tight tracking-tight text-[#183024] dark:text-[#dcebe2]">
                    MFB Chat
                  </h1>
                  <p className="mt-0.5 text-[12px] leading-tight text-[#71857a] dark:text-[#91a99c]">
                    İletişim platformu
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openSettings}
                title={st("Settings", "Ayarlar")}
                className="rounded-lg p-2 text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-700 hover:shadow-sm dark:bg-[#0b2117] dark:text-slate-400 dark:hover:bg-[#102c20] dark:hover:text-emerald-300 dark:hover:shadow-sm"
              >
                <Settings
                  className="h-4 w-4"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="p-4">
              <div className="luxury-search flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-[#173b2b] dark:bg-[#0b2117]">
                <Search
                  className="h-4 w-4 text-slate-400"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <input
                  value={conversationSearch}
                  onChange={(event) =>
                    setConversationSearch(event.target.value)
                  }
                  className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-400 dark:bg-transparent dark:text-slate-200 dark:placeholder:text-slate-400"
                  placeholder={st(
                    "Search conversations...",
                    "Sohbetlerde ara...",
                  )}
                  aria-label={st("Search conversations", "Sohbetlerde ara")}
                />
              </div>
            </div>

            <div className="luxury-sidebar-scroll flex-1 overflow-y-auto px-3">
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Conversations
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={openNewChat}
                      title={st("New chat", "Yeni sohbet")}
                      className="luxury-sidebar-add-button flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:text-emerald-600"
                    >
                      <Plus
                        className="h-4 w-4"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openAIChat}
                  className={`luxury-conversation-item mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    aiMode
                      ? "bg-emerald-50 dark:bg-emerald-500/10"
                      : "hover:bg-slate-100 dark:hover:bg-[#102c20]"
                  }`}
                >
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-50">
                      <img
                        src="/mfb-ai-avatar.jpg"
                        alt="MFB AI"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#06140e] bg-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        MFB AI
                      </p>
                      {aiMode && (
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                          AI
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {st("AI assistant", "Yapay zeka asistanı")}
                    </p>
                  </div>
                </button>

                {loadingChats ? (
                  <div className="px-3 py-4 text-sm text-slate-400">
                    Loading chats...
                  </div>
                ) : chats.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-emerald-300/10 bg-emerald-400/[0.025] px-4 py-5 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-300">
                      <MessageSquarePlus
                        className="h-4 w-4"
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mfb-empty-state-title mt-3 text-xs font-semibold text-white dark:text-slate-100">
                      {st("No conversations yet", "Henüz sohbet yok")}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">
                      {st(
                        "Start by finding someone to chat with.",
                        "Sohbet etmek için bir kullanıcı bulun.",
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={openNewChat}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/10 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-400/[0.11]"
                    >
                      <Plus
                        className="h-3 w-3"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      {st("New chat", "Yeni sohbet")}
                    </button>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-slate-400">
                    No conversations found.
                  </div>
                ) : (
                  [...filteredChats]
                    .filter((chat) => !chat.isArchived && !chat.isGroup)
                    .sort(
                      (a, b) =>
                        Number(Boolean(b.isPinned)) -
                        Number(Boolean(a.isPinned)),
                    )
                    .map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => selectChat(chat.id)}
                        className={`luxury-conversation-item mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                          selectedChatId === chat.id
                            ? "bg-emerald-50 dark:bg-emerald-500/10"
                            : "hover:bg-slate-100 dark:hover:bg-[#102c20]"
                        }`}
                      >
                        <div className="relative">
                          <div className="luxury-chat-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-sm font-bold text-white">
                            {chat.isGroup && chat.avatarUrl ? (
                              <img
                                src={getAttachmentUrl(chat.avatarUrl)}
                                alt={chat.name}
                                className="h-full w-full object-cover"
                              />
                            ) : !chat.isGroup && chat.otherAvatarUrl ? (
                              <img
                                src={getAttachmentUrl(chat.otherAvatarUrl)}
                                alt={chat.name}
                                className="h-full w-full object-cover"
                              />
                            ) : chat.isGroup ? (
                              "#"
                            ) : (
                              chat.name.charAt(0).toUpperCase()
                            )}
                          </div>

                          {!chat.isGroup && (
                            <span
                              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                                (onlineUsersByChat[chat.id] ?? []).some(
                                  (user) => user.userId !== currentUserId,
                                )
                                  ? "bg-emerald-400"
                                  : "bg-slate-400"
                              }`}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`luxury-conversation-preview-line truncate text-sm ${
                                (unreadCounts[chat.id] ?? 0) > 0
                                  ? "font-bold text-slate-100"
                                  : "font-semibold"
                              }`}
                            >
                              {chat.name}
                            </span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {chat.isPinned && (
                                <Pin
                                  className="h-3.5 w-3.5 text-emerald-400"
                                  strokeWidth={1.9}
                                  aria-label={st("Pinned", "Sabitlendi")}
                                />
                              )}
                              {getChatPreviewTime(chat) && (
                                <span className="text-[9px] text-slate-600">
                                  {getChatPreviewTime(chat)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex min-w-0 items-center gap-2">
                            {mutedChatIds.has(chat.id) && (
                              <BellOff
                                className="h-3 w-3 shrink-0 text-slate-600"
                                strokeWidth={1.8}
                                aria-label="Muted"
                              />
                            )}
                            <p
                              className={`luxury-conversation-preview-line truncate text-xs ${
                                (unreadCounts[chat.id] ?? 0) > 0
                                  ? "font-semibold text-slate-300"
                                  : ""
                              } ${
                                !chat.isGroup &&
                                (onlineUsersByChat[chat.id] ?? []).some(
                                  (user) => user.userId !== currentUserId,
                                )
                                  ? "text-emerald-400"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {getChatPreview(chat)}
                            </p>
                          </div>
                        </div>

                        {(unreadCounts[chat.id] ?? 0) > 0 && (
                          <span className="luxury-unread-badge flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-emerald-200/20 bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                            {(unreadCounts[chat.id] ?? 0) > 99
                              ? "99+"
                              : unreadCounts[chat.id]}
                          </span>
                        )}
                      </button>
                    ))
                )}

                {filteredChats.some((chat) => chat.isArchived) && (
                  <div className="mt-4 border-t border-slate-200 pt-3 dark:border-[#123024]">
                    <div className="mb-2 flex items-center justify-between px-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                        {st("Archived", "Arşivlenenler")}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        {filteredChats.filter((chat) => chat.isArchived).length}
                      </span>
                    </div>
                    {filteredChats
                      .filter((chat) => chat.isArchived)
                      .map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => selectChat(chat.id)}
                          className={`luxury-archived-item group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selectedChatId === chat.id ? "bg-emerald-500/10" : "hover:bg-emerald-400/[0.035]"}`}
                        >
                          <Archive className="h-4 w-4 shrink-0 text-slate-500" />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-300">
                              {chat.name}
                            </span>
                            <span className="block truncate text-[10px] text-slate-600">
                              {getChatPreview(chat)}
                            </span>
                          </div>
                          {chat.isPinned && (
                            <Pin className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {st("Groups", "Gruplar")}
                    </span>
                    <span className="rounded-full border border-emerald-300/10 bg-emerald-400/[0.05] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                      {
                        chats.filter((chat) => chat.isGroup && !chat.isArchived)
                          .length
                      }
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openGroup}
                    title={st("Grup oluştur", "Grup oluştur")}
                    aria-label={st("Grup oluştur", "Grup oluştur")}
                    className="luxury-sidebar-add-button rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-600"
                  >
                    <Plus
                      className="h-4 w-4"
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="space-y-1">
                  {chats
                    .filter((chat) => chat.isGroup && !chat.isArchived)
                    .sort(
                      (a, b) =>
                        Number(Boolean(b.isPinned)) -
                        Number(Boolean(a.isPinned)),
                    )
                    .map((chat) => {
                      const unread = getUnreadCount(chat);
                      const preview = getChatPreview(chat);
                      const previewTime = getChatPreviewTime(chat);
                      return (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => selectChat(chat.id)}
                          className={`luxury-group-item group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition ${selectedChatId === chat.id ? "luxury-group-item-selected" : "hover:bg-emerald-400/[0.035]"}`}
                        >
                          <div className="luxury-group-avatar flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-300">
                            {chat.avatarUrl ? (
                              <img
                                src={getAttachmentUrl(chat.avatarUrl)}
                                alt={chat.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "#"
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={`min-w-0 flex-1 truncate text-sm ${unread > 0 ? "font-bold text-slate-100" : "font-semibold text-slate-200"}`}
                              >
                                {chat.name}
                              </span>
                              {previewTime && (
                                <span className="shrink-0 text-[9px] text-slate-600">
                                  {previewTime}
                                </span>
                              )}
                            </div>
                            <p
                              className={`mt-0.5 truncate text-[10px] ${unread > 0 ? "font-semibold text-slate-300" : "text-slate-500"}`}
                            >
                              {preview}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {unread > 0 && (
                              <span className="luxury-unread-badge flex h-5 min-w-5 items-center justify-center rounded-full border border-emerald-200/20 bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                            {chat.isPinned && (
                              <Pin
                                className="luxury-group-pin h-3.5 w-3.5 text-emerald-400"
                                strokeWidth={1.9}
                                aria-label={st("Pinned", "Sabitlendi")}
                              />
                            )}
                            <MoreVertical
                              className="luxury-group-more h-3.5 w-3.5 text-slate-500"
                              strokeWidth={1.8}
                              aria-hidden="true"
                            />
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-3 dark:border-[#123024]">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="mb-2 flex w-full items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-2.5 text-left text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/[0.08]"
                >
                  <ShieldCheck
                    className="h-4 w-4"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  {st("Management Panel", "Yönetim Paneli")}
                </button>
              )}
              <button
                type="button"
                onClick={openProfile}
                className="flex w-full items-center gap-3 rounded-xl border border-emerald-900/5 bg-emerald-50/70 p-2 text-left shadow-sm transition hover:bg-emerald-50 dark:border-emerald-400/10 dark:bg-[#102c20]/60 dark:shadow-none dark:hover:bg-[#102c20]"
                title={st("Open profile settings", "Profil ayarlarını aç")}
              >
                <div className="relative">
                  <div className="premium-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-sm font-bold text-white">
                    {profile?.avatarUrl ? (
                      <img
                        src={getAttachmentUrl(profile.avatarUrl)}
                        alt={profile.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      username.charAt(0).toUpperCase()
                    )}
                  </div>

                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      connectionState === "connected"
                        ? "bg-emerald-400"
                        : "bg-slate-400"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">
                      {profile?.displayName || username}
                    </p>
                    {profile?.statusEmoji && profile?.statusText && (
                      <span
                        className="shrink-0 text-xs"
                        title={profile.statusText}
                      >
                        {profile.statusEmoji}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-slate-600 dark:text-slate-400 dark:text-slate-400">
                    @{username}
                  </p>
                </div>
              </button>
            </div>
          </aside>

          {/* MOBILE CONVERSATIONS */}
          {mobileChatListOpen && (
            <div className="fixed inset-0 z-40 flex w-full flex-col bg-white dark:bg-[#020906] md:hidden">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-[#123024]">
                <div>
                  <h2 className="text-base font-semibold">
                    {st("Conversations", "Sohbetler")}
                  </h2>
                  <p className="text-[11px] text-slate-400">Real-Time Chat</p>
                </div>
                <button
                  type="button"
                  onClick={openSettings}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#102c20]"
                  aria-label={st("Settings", "Ayarlar")}
                >
                  <Settings
                    className="h-4 w-4"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <div className="border-b border-slate-200 p-3 dark:border-[#123024]">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-[#173b2b] dark:!bg-[#0a2117]">
                  <Search
                    className="h-4 w-4 text-slate-400"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <input
                    value={conversationSearch}
                    onChange={(event) =>
                      setConversationSearch(event.target.value)
                    }
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    placeholder={st(
                      "Search conversations...",
                      "Sohbetlerde ara...",
                    )}
                    aria-label={st("Search conversations", "Sohbetlerde ara")}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {[...filteredChats]
                  .filter((chat) => !chat.isArchived && !chat.isGroup)
                  .sort(
                    (a, b) =>
                      Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)),
                  )
                  .map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => selectChat(chat.id)}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selectedChatId === chat.id ? "bg-emerald-50 dark:bg-emerald-500/10" : "hover:bg-slate-100 dark:hover:bg-[#102c20]"}`}
                    >
                      <div className="relative">
                        <div className="premium-avatar luxury-chat-avatar flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-sm font-bold text-white">
                          {chat.isGroup && chat.avatarUrl ? (
                            <img
                              src={getAttachmentUrl(chat.avatarUrl)}
                              alt={chat.name}
                              className="h-full w-full object-cover"
                            />
                          ) : !chat.isGroup && chat.otherAvatarUrl ? (
                            <img
                              src={getAttachmentUrl(chat.otherAvatarUrl)}
                              alt={chat.name}
                              className="h-full w-full object-cover"
                            />
                          ) : chat.isGroup ? (
                            "#"
                          ) : (
                            chat.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {chat.name}
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {chat.isPinned && (
                              <Pin
                                className="h-3.5 w-3.5 text-emerald-400"
                                strokeWidth={1.9}
                              />
                            )}
                            {(unreadCounts[chat.id] ?? 0) > 0 && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-emerald-200/20 bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-[0_0_14px_rgba(57,246,163,.16)]">
                                {(unreadCounts[chat.id] ?? 0) > 99
                                  ? "99+"
                                  : unreadCounts[chat.id]}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {chat.isGroup
                            ? st("Group chat", "Grup sohbeti")
                            : (onlineUsersByChat[chat.id] ?? []).some(
                                  (user) => user.userId !== currentUserId,
                                )
                              ? st("Online", "Çevrimiçi")
                              : st("Offline", "Çevrimdışı")}
                        </p>
                      </div>
                    </button>
                  ))}
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-[#123024]">
                  <div className="mb-2 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {st("Groups", "Gruplar")}
                      </span>
                      <span className="rounded-full border border-emerald-300/10 bg-emerald-400/[0.05] px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                        {
                          chats.filter(
                            (chat) => chat.isGroup && !chat.isArchived,
                          ).length
                        }
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={openGroup}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-400/10 hover:text-emerald-300"
                      aria-label={st("Grup oluştur", "Grup oluştur")}
                    >
                      <Plus
                        className="h-4 w-4"
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {chats.filter((chat) => chat.isGroup && !chat.isArchived)
                      .length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#173b2b] bg-[#07150f] px-3 py-3 text-[10px] text-slate-500">
                        {st(
                          "No groups yet. Create your first group.",
                          "Henüz grup yok. İlk grubunuzu oluşturun.",
                        )}
                      </div>
                    ) : (
                      chats
                        .filter((chat) => chat.isGroup && !chat.isArchived)
                        .map((chat) => {
                          const unread = getUnreadCount(chat);
                          return (
                            <button
                              key={chat.id}
                              type="button"
                              onClick={() => selectChat(chat.id)}
                              className={`luxury-group-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${selectedChatId === chat.id ? "luxury-group-item-selected" : "hover:bg-emerald-400/[0.035]"}`}
                            >
                              <div className="luxury-group-avatar flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-300">
                                {chat.avatarUrl ? (
                                  <img
                                    src={getAttachmentUrl(chat.avatarUrl)}
                                    alt={chat.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  "#"
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`truncate text-sm ${unread > 0 ? "font-bold text-slate-100" : "font-semibold text-slate-200"}`}
                                  >
                                    {chat.name}
                                  </span>
                                  <span className="text-[9px] text-slate-600">
                                    {getChatPreviewTime(chat)}
                                  </span>
                                </div>
                                <p
                                  className={`mt-0.5 truncate text-xs ${unread > 0 ? "font-semibold text-slate-300" : "text-slate-500"}`}
                                >
                                  {getChatPreview(chat)}
                                </p>
                              </div>
                              {unread > 0 && (
                                <span className="luxury-unread-badge flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                                  {unread > 99 ? "99+" : unread}
                                </span>
                              )}
                              {chat.isPinned && (
                                <Pin
                                  className="h-3.5 w-3.5 text-emerald-400"
                                  strokeWidth={1.9}
                                />
                              )}
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>

                {filteredChats.some((chat) => chat.isArchived) && (
                  <div className="mt-4 border-t border-slate-200 pt-3 dark:border-[#123024]">
                    <div className="mb-2 flex items-center justify-between px-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {st("Archived", "Arşivlenenler")}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        {filteredChats.filter((chat) => chat.isArchived).length}
                      </span>
                    </div>
                    {filteredChats
                      .filter((chat) => chat.isArchived)
                      .map((chat) => (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => selectChat(chat.id)}
                          className="luxury-archived-item mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-emerald-400/[0.035]"
                        >
                          <Archive className="h-4 w-4 shrink-0 text-slate-500" />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-300">
                              {chat.name}
                            </span>
                            <span className="block truncate text-[10px] text-slate-600">
                              {getChatPreview(chat)}
                            </span>
                          </div>
                          {chat.isPinned && (
                            <Pin className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 p-3 dark:border-[#123024]">
                <button
                  type="button"
                  onClick={openProfile}
                  className="flex w-full items-center gap-3 rounded-xl border border-emerald-900/5 bg-emerald-50/70 p-2 text-left transition hover:bg-emerald-50 dark:border-emerald-400/10 dark:bg-[#102c20]/60 dark:hover:bg-[#102c20]"
                >
                  <div className="premium-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-sm font-bold text-white">
                    {profile?.avatarUrl ? (
                      <img
                        src={getAttachmentUrl(profile.avatarUrl)}
                        alt={profile.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{username}</p>
                    <p className="text-xs text-slate-400">Profile</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* CHAT */}
          <section className="premium-chat flex min-w-0 flex-1 flex-col bg-white dark:bg-[#020906]">
            <header className="premium-header relative z-[70] flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-3 md:px-6 dark:border-[#123024]">
              <div className="flex min-w-0 items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => setMobileChatListOpen(true)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#102c20] md:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft
                    className="h-4 w-4"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
                <div className="relative">
                  <div className="premium-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-emerald-600">
                    {aiMode ? (
                      <img
                        src="/mfb-ai-avatar.jpg"
                        alt="MFB AI"
                        className="h-full w-full object-cover"
                      />
                    ) : selectedChat?.isGroup && selectedChat.avatarUrl ? (
                      <img
                        src={selectedChat.avatarUrl}
                        alt={selectedChat.name}
                        className="h-full w-full object-cover"
                      />
                    ) : selectedChat ? (
                      selectedChat.isGroup ? (
                        "#"
                      ) : (
                        selectedChat.name.charAt(0).toUpperCase()
                      )
                    ) : (
                      "?"
                    )}
                  </div>

                  {selectedChat && !selectedChat.isGroup && (
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950 ${
                        otherOnlineUsers.length > 0
                          ? "bg-emerald-400"
                          : "bg-slate-400"
                      }`}
                    />
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    {aiMode
                      ? "MFB AI"
                      : (selectedChat?.name ??
                        st("Welcome to MFB Chat", "MFB Chat'e hoş geldin"))}
                  </h2>

                  <p
                    className={`flex items-center gap-1.5 text-[11px] ${
                      selectedChat
                        ? selectedChat.isGroup
                          ? "text-slate-400"
                          : otherOnlineUsers.length > 0
                            ? "text-emerald-400"
                            : "text-slate-400"
                        : "text-emerald-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        selectedChat
                          ? selectedChat.isGroup
                            ? "bg-emerald-400/70"
                            : otherOnlineUsers.length > 0
                              ? "bg-emerald-400 shadow-[0_0_10px_rgba(57,246,163,.5)]"
                              : "bg-slate-500"
                          : "bg-emerald-400"
                      }`}
                    />

                    {aiMode
                      ? st("AI Assistant", "Yapay zeka asistanı")
                      : selectedChat
                        ? selectedChat.isGroup
                          ? `${selectedChatOnlineUsers.length} online`
                          : otherOnlineUsers.length > 0
                            ? "Online"
                            : selectedChat.otherLastSeenAt
                              ? `Last seen ${new Date(selectedChat.otherLastSeenAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
                              : "Offline"
                        : st(
                            "Ready to start a conversation",
                            "İlk sohbetini başlatmaya hazır",
                          )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!selectedChat && (
                  <button
                    type="button"
                    onClick={openNewChat}
                    className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:-translate-y-px hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 sm:flex"
                  >
                    <Plus
                      className="h-3.5 w-3.5"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    {st("New chat", "Yeni sohbet")}
                  </button>
                )}
                <button
                  onClick={() => {
                    setMessageSearchOpen((current) => !current);
                    if (messageSearchOpen) setMessageSearch("");
                  }}
                  title={st("Search messages", "Mesajlarda ara")}
                  disabled={!selectedChatId && !aiMode}
                  className={`rounded-lg p-2.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-30 ${
                    messageSearchOpen
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-[#0b2117] text-slate-400 dark:bg-[#0b2117] dark:text-slate-400"
                  } hover:bg-slate-100 dark:hover:bg-[#102c20]`}
                >
                  <Search
                    className="h-4 w-4"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setChatMenuOpen((current) => !current)}
                    disabled={!selectedChatId && !aiMode}
                    className={`rounded-lg p-2.5 disabled:cursor-not-allowed disabled:opacity-30 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-100 dark:bg-[#0b2117] dark:text-slate-400 dark:hover:bg-[#102c20] ${chatMenuOpen ? "bg-emerald-500/10 text-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300" : ""}`}
                    aria-label={st("Chat actions", "Sohbet işlemleri")}
                    aria-expanded={chatMenuOpen}
                  >
                    <MoreVertical
                      className="h-4 w-4"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </button>
                  {chatMenuOpen && (selectedChat || aiMode) && (
                    <div className="pointer-events-auto absolute right-0 top-full z-[100] mt-2 w-64 overflow-hidden rounded-2xl border border-emerald-200/70 bg-[#e8f7ed] p-1.5 shadow-[0_20px_50px_rgba(37,99,65,0.18)] backdrop-blur-xl">
                      {selectedChat ? (
                        <>
                          <button
                            type="button"
                            onClick={toggleChatPin}
                            className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left text-xs text-slate-700 transition hover:bg-emerald-50"
                          >
                            <Pin className="h-4 w-4 text-emerald-300" />{" "}
                            {selectedChat.isPinned
                              ? st("Unpin chat", "Sohbeti sabitlemeyi kaldır")
                              : st("Pin chat", "Sohbeti sabitle")}
                          </button>
                          <button
                            type="button"
                            onClick={toggleChatArchive}
                            className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                          >
                            {selectedChat.isArchived ? (
                              <ArchiveRestore className="h-4 w-4 text-emerald-300" />
                            ) : (
                              <Archive className="h-4 w-4 text-emerald-300" />
                            )}
                            {selectedChat.isArchived
                              ? st("Unarchive chat", "Arşivden çıkar")
                              : st("Archive chat", "Sohbeti arşivle")}
                          </button>
                          <button
                            type="button"
                            onClick={markSelectedChatUnread}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-slate-50"
                          >
                            <Mail className="h-4 w-4 text-emerald-300" />{" "}
                            {st("Mark as unread", "Okunmadı olarak işaretle")}
                          </button>
                          <button
                            type="button"
                            onClick={clearSelectedChat}
                            className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eraser className="h-4 w-4 text-amber-300" />{" "}
                            {st("Clear chat", "Sohbeti temizle")}
                          </button>
                          <div className="my-1 border-t border-white/10" />
                          <button
                            type="button"
                            onClick={deleteSelectedChat}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />{" "}
                            {st("Delete chat", "Sohbeti sil")}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAiMessages([])}
                          className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left text-xs text-slate-700 transition hover:bg-emerald-50"
                        >
                          <Eraser className="h-4 w-4 text-amber-300" />{" "}
                          {st("Clear AI chat", "MFB AI sohbetini temizle")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setChatMenuOpen(false);
                          setDetailsOpen((current) => !current);
                        }}
                        className="mt-1 flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left text-xs text-slate-600 transition hover:bg-slate-50"
                      >
                        {detailsOpen ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <MessageSquareText className="h-4 w-4" />
                        )}
                        {detailsOpen
                          ? st("Close details", "Ayrıntıları kapat")
                          : st("Chat details", "Sohbet ayrıntıları")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {messageSearchOpen && (
              <div className="border-b border-emerald-100/70 bg-transparent px-4 py-3 backdrop-blur-xl dark:border-[#123024] dark:bg-transparent">
                <div className="mx-auto max-w-4xl">
                  <div
                    className="
                      flex items-center gap-3
                      rounded-2xl
                      border border-emerald-200/70
                      bg-emerald-50/30
                      px-3.5 py-2.5
                      shadow-sm
                      transition-all
                      focus-within:border-emerald-400/60
                      focus-within:ring-4
                      focus-within:ring-emerald-400/10
                      dark:border-[#173b2b]
                      dark:!bg-[#06140e]
                      dark:shadow-[0_10px_35px_rgba(0,0,0,0.18)]
                      dark:focus-within:border-emerald-400/40
                      dark:focus-within:ring-emerald-400/[0.06]
                    "
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                      <Search
                        className="h-4 w-4"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </div>

                    <input
                      autoFocus
                      value={messageSearch}
                      onChange={(event) => setMessageSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setMessageSearch("");
                          setMessageSearchOpen(false);
                        }
                      }}
                      placeholder={st(
                        "Search messages...",
                        "Mesajlarda ara...",
                      )}
                      aria-label={st("Search messages", "Mesajlarda ara")}
                      className="min-w-0 flex-1 !bg-transparent bg-none text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:!bg-[#06140e] dark:text-slate-200 dark:placeholder:text-slate-600"
                    />

                    {messageSearch.trim().length >= 2 && (
                      <span className="hidden shrink-0 rounded-full border border-emerald-400/15 bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 sm:inline-flex dark:border-emerald-400/10 dark:bg-emerald-400/[0.08] dark:text-emerald-300">
                        {globalSearchResults.length}{" "}
                        {st(
                          globalSearchResults.length === 1
                            ? "result"
                            : "results",
                          "sonuç",
                        )}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMessageSearch("");
                        setMessageSearchOpen(false);
                      }}
                      title="Aramayı kapat"
                      className="rounded-lg bg-emerald-400/10 p-1.5 text-slate-400 transition hover:bg-emerald-400/20 hover:text-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/20 dark:hover:text-emerald-200"
                    >
                      <X
                        className="h-4 w-4"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {messageSearch.trim().length === 0 && (
                    <div className="mt-2 flex items-center justify-between px-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-600">
                        Tüm sohbetlerde mesaj ara
                      </span>
                      <span className="hidden text-[10px] text-slate-400 sm:block dark:text-slate-700">
                        En az 2 karakter
                      </span>
                    </div>
                  )}

                  {messageSearch.trim().length >= 2 && (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-[#123024] dark:bg-[#06140e]">
                      {searchingGlobal ? (
                        <div className="flex items-center gap-3 px-4 py-4">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-400" />
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            Mesajlar aranıyor...
                          </span>
                        </div>
                      ) : globalSearchResults.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-[#102c20]">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-600">
                              Arama sonuçları
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-600">
                              İlk 20 sonuç
                            </span>
                          </div>

                          <div className="max-h-72 overflow-y-auto p-1.5">
                            {globalSearchResults.slice(0, 20).map((result) => (
                              <button
                                key={result.id}
                                type="button"
                                onClick={() => openGlobalSearchResult(result)}
                                className="
                                  group
                                  w-full
                                  rounded-xl
                                  border border-transparent
                                  px-3 py-3
                                  text-left
                                  transition-all
                                  hover:border-emerald-400/10
                                  hover:bg-white
                                  dark:hover:bg-[#0b2117]
                                "
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-100 text-emerald-700 dark:bg-emerald-400/[0.06] dark:text-emerald-400">
                                    <Search
                                      className="h-4 w-4"
                                      strokeWidth={1.8}
                                      aria-hidden="true"
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="truncate text-xs font-semibold text-slate-700 transition group-hover:text-emerald-700 dark:text-slate-300 dark:group-hover:text-emerald-300">
                                        {result.chatName}
                                      </span>

                                      <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-600">
                                        {formatTime(result.sentAt)}
                                      </span>
                                    </div>

                                    <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-500">
                                      <span className="font-medium text-slate-600 dark:text-slate-400">
                                        {result.senderUsername}:
                                      </span>{" "}
                                      {result.content.length > 100
                                        ? `${result.content.slice(0, 100)}...`
                                        : result.content}
                                    </p>
                                  </div>

                                  <span className="mt-2 shrink-0 text-slate-300 opacity-0 transition group-hover:translate-x-0.5 group-hover:text-emerald-400 group-hover:opacity-100 dark:text-slate-700">
                                    →
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
                          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-slate-400 dark:bg-emerald-400/[0.06] dark:text-slate-600">
                            <Search
                              className="h-5 w-5"
                              strokeWidth={1.6}
                              aria-hidden="true"
                            />
                          </div>

                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Sonuç bulunamadı
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-600">
                            Farklı bir kelime veya ifade deneyin.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            <div
              ref={chatViewportRef}
              className="luxury-chat-viewport min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-7 md:py-4"
              style={
                chatWallpaper === "custom" && customWallpaperUrl
                  ? {
                      backgroundImage: `url("${customWallpaperUrl}")`,
                      backgroundSize:
                        wallpaperFit === "contain" ? "contain" : "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundAttachment: "local",
                    }
                  : undefined
              }
            >
              <div className="luxury-message-list mx-auto flex min-h-full w-full max-w-5xl flex-col pb-1">
                {aiMode ? (
                  <div className="flex flex-1 flex-col justify-end px-2 py-6">
                    <div className="mx-auto w-full max-w-3xl">
                      <div className="mb-6 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
                        MFB AI
                      </div>
                      <div className="space-y-3">
                        {aiMessages.map((message) => (
                          <div
                            id={`ai-message-${message.id}`}
                            key={message.id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`w-fit max-w-[min(68vw,640px)] rounded-[18px] px-4 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-md bg-[#9bdfb3] text-[#183024]" : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-[#0b2117] dark:text-slate-100"}`}
                            >
                              {message.attachment && (
                                <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-black/10">
                                  {message.attachment.kind === "image" ? (
                                    <img
                                      src={message.attachment.dataUrl}
                                      alt={message.attachment.fileName}
                                      className="max-h-72 w-full object-contain"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-3 px-3 py-2.5 text-xs">
                                      {message.attachment.kind === "audio" ? (
                                        <Mic
                                          className="h-4 w-4 shrink-0 text-emerald-300"
                                          strokeWidth={1.8}
                                        />
                                      ) : (
                                        <FileText
                                          className="h-4 w-4 shrink-0 text-emerald-300"
                                          strokeWidth={1.8}
                                        />
                                      )}
                                      <span className="min-w-0 truncate">
                                        {message.attachment.fileName}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {message.content}
                            </div>
                          </div>
                        ))}
                        {aiLoading && (
                          <div className="flex justify-start">
                            <div className="rounded-2xl rounded-bl-md border border-[#173b2b] bg-[#0b2117] px-4 py-3 text-sm text-slate-400">
                              {st(
                                "MFB AI is thinking...",
                                "MFB AI düşünüyor...",
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : hasNoConversations ? (
                  <div className="flex flex-1 items-center justify-center px-4 py-12">
                    <div className="w-full max-w-lg text-center">
                      <div className="luxury-empty-orbit mx-auto flex h-24 w-24 items-center justify-center rounded-full">
                        <div className="luxury-empty-icon flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/15 bg-[#07150f] text-emerald-300">
                          <MessageSquarePlus
                            className="h-7 w-7"
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      <p className="luxury-empty-state-title mt-6 text-lg font-semibold tracking-tight text-white dark:text-slate-100">
                        {st("Welcome to MFB Chat", "MFB Chat'e hoş geldin")}
                      </p>
                      <p className="luxury-empty-state-description mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300 dark:text-slate-300">
                        {st(
                          "You don't have any conversations yet. Find a user and start your first conversation.",
                          "Henüz bir sohbetin bulunmuyor. Bir kullanıcı bularak ilk sohbetini başlatabilirsin.",
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={openNewChat}
                        className="luxury-empty-state-action mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:-translate-y-0.5 hover:border-emerald-300/25 hover:bg-emerald-400/[0.12]"
                      >
                        <Plus
                          className="h-4 w-4"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        {st("Start a new conversation", "Yeni sohbet başlat")}
                      </button>
                      <p className="luxury-empty-state-note mt-3 text-[10px] text-slate-600">
                        {st(
                          "Your conversations will appear here.",
                          "Sohbetlerin burada görünecek.",
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.length > 0 && (
                      <div className="min-h-0 flex-1" aria-hidden="true" />
                    )}
                    <div className="mb-7 flex items-center gap-4 pt-1">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-[#0b2117]" />
                      <span className="text-xs font-medium text-slate-400">
                        Today
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-[#0b2117]" />
                    </div>

                    {loadingMessages ? (
                      <div className="py-10 text-center text-sm text-slate-400">
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="luxury-empty-state flex flex-1 items-center justify-center py-10">
                        <div className="w-full max-w-md px-4 text-center">
                          <div className="luxury-empty-orbit mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                            <div className="luxury-empty-icon flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/15 bg-[#07150f] text-emerald-300">
                              <MessageSquareText
                                className="h-6 w-6"
                                strokeWidth={1.6}
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                          <p className="mt-5 text-sm font-semibold text-slate-200">
                            {st("Start the conversation", "Sohbeti başlatın")}
                          </p>
                          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
                            {st(
                              `There are no messages in ${selectedChat?.name ?? "this conversation"} yet. Send the first one when you're ready.`,
                              `${selectedChat?.name ?? "Bu sohbette"} henüz mesaj içermiyor. Hazırsanız ilk mesajı gönderin.`,
                            )}
                          </p>
                          <button
                            type="button"
                            onClick={() => messageInputRef.current?.focus()}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-400/[0.07] px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:-translate-y-0.5 hover:border-emerald-300/20 hover:bg-emerald-400/[0.11]"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                            {st("Write the first message", "İlk mesajı yaz")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const isOwn = message.senderId === currentUserId;
                        const messageDate = formatMessageDate(message.sentAt);
                        const previousDate =
                          index > 0
                            ? formatMessageDate(messages[index - 1]?.sentAt)
                            : "";
                        const showDateSeparator =
                          Boolean(messageDate) && messageDate !== previousDate;

                        return (
                          <Fragment
                            key={message.id ?? `${message.sentAt}-${index}`}
                          >
                            {showDateSeparator && (
                              <div className="luxury-date-separator">
                                <span>{messageDate}</span>
                              </div>
                            )}
                            <div
                              ref={(element) => {
                                if (message.id)
                                  messageRefs.current[message.id] = element;
                              }}
                              onTouchStart={() =>
                                message.id && startMessageLongPress(message.id)
                              }
                              onTouchEnd={cancelMessageLongPress}
                              onTouchİptal={cancelMessageLongPress}
                              onContextMenu={(event) => {
                                if (window.innerWidth < 768)
                                  event.preventDefault();
                              }}
                              className={`luxury-message-row group mb-4 flex transition-all duration-300 ${highlightedMessageId === message.id ? "rounded-2xl bg-yellow-200/10 ring-2 ring-yellow-400/60" : ""} ${
                                isOwn ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`flex w-fit max-w-[min(68%,640px)] gap-3 ${
                                  isOwn ? "flex-row-reverse" : ""
                                }`}
                              >
                                {!isOwn && (
                                  <div className="premium-avatar flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-xs font-bold text-white">
                                    {(message.senderUsername ?? "?")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                )}

                                <div
                                  className={`relative flex min-w-0 flex-col ${
                                    isOwn ? "items-end" : "items-start"
                                  }`}
                                >
                                  {!isOwn && (
                                    <div className="mb-1 text-xs font-semibold text-slate-500">
                                      {message.senderUsername ?? "Unknown user"}
                                    </div>
                                  )}

                                  <div className="relative w-fit max-w-full overflow-visible">
                                    {editingMessageId === message.id ? (
                                      <div className="min-w-[260px] rounded-2xl border border-emerald-400/40 bg-slate-50 p-3 dark:bg-[#0b2118]">
                                        <input
                                          autoFocus
                                          value={editingText}
                                          onChange={(event) =>
                                            setEditingText(event.target.value)
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                              event.preventDefault();
                                              saveEdit();
                                            }

                                            if (event.key === "Escape") {
                                              event.preventDefault();
                                              cancelEditing();
                                            }
                                          }}
                                          className="w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white"
                                        />

                                        <div className="mt-2 flex justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={cancelEditing}
                                            className="rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-[#102c20]"
                                          >
                                            İptal
                                          </button>
                                          <button
                                            type="button"
                                            onClick={saveEdit}
                                            disabled={!editingText.trim()}
                                            className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        {isEmojiOnlyMessage(message.content) ? (
                                          <div
                                            className={`premium-emoji-message px-1 py-0.5 text-[3.25rem] leading-none tracking-tight ${
                                              isOwn ? "text-right" : "text-left"
                                            }`}
                                            role="img"
                                            aria-label="Emoji message"
                                            data-no-translate="true"
                                          >
                                            {message.content?.trim()}
                                          </div>
                                        ) : (
                                          <div
                                            className={`luxury-main-message w-fit max-w-[min(68vw,640px)] rounded-[18px] px-4 py-2.5 text-sm leading-relaxed ${
                                              message.content?.trim() ||
                                              (message.replyToMessageId &&
                                                message.replyToContent)
                                                ? isOwn
                                                  ? "rounded-br-md bg-[#9bdfb3] text-[#183024]"
                                                  : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-[#0b2117] dark:text-slate-100"
                                                : "hidden"
                                            }`}
                                            data-no-translate="true"
                                          >
                                            {message.replyToMessageId &&
                                              message.replyToContent && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    scrollToMessage(
                                                      message.replyToMessageId,
                                                    )
                                                  }
                                                  className={`mb-2 w-full rounded-lg border-l-2 px-2 py-1 text-left text-[10px] ${isOwn ? "border-white/60 bg-white/10" : "border-blue-400 bg-white/5"}`}
                                                >
                                                  <span className="block font-semibold">
                                                    {message.replyToSenderUsername ??
                                                      "Reply"}
                                                  </span>
                                                  <span className="block truncate opacity-75">
                                                    {message.replyToContent}
                                                  </span>
                                                </button>
                                              )}
                                            {highlightMessage(message.content)}
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {editingMessageId !== message.id && (
                                      <div
                                        className={`message-hover-actions ${
                                          isOwn ? "outgoing" : "incoming"
                                        } flex w-fit items-center gap-0.5 text-[10px] text-slate-500`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            replyToMessage(message);
                                            setMessageMenuId(null);
                                          }}
                                          className="rounded-md p-1.5 transition hover:bg-emerald-400/10 hover:text-emerald-300"
                                          title={st("Reply", "Yanıtla")}
                                          aria-label={st("Reply", "Yanıtla")}
                                        >
                                          <Reply
                                            className="h-3.5 w-3.5"
                                            strokeWidth={1.8}
                                            aria-hidden="true"
                                          />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReactionPickerMessageId(
                                              reactionPickerMessageId ===
                                                message.id
                                                ? null
                                                : (message.id ?? null),
                                            );
                                            setMessageMenuId(null);
                                          }}
                                          className="rounded-md p-1.5 transition hover:bg-emerald-400/10 hover:text-emerald-300"
                                          title={st("React", "Tepki ver")}
                                          aria-label={st("React", "Tepki ver")}
                                        >
                                          <Smile
                                            className="h-3.5 w-3.5"
                                            strokeWidth={1.8}
                                            aria-hidden="true"
                                          />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            togglePin(message);
                                            setMessageMenuId(null);
                                          }}
                                          className={`rounded-md p-1.5 transition hover:bg-emerald-400/10 hover:text-emerald-300 ${
                                            message.isPinned
                                              ? "text-emerald-300"
                                              : ""
                                          }`}
                                          title={
                                            message.isPinned ? "Unpin" : "Pin"
                                          }
                                          aria-label={
                                            message.isPinned ? "Unpin" : "Pin"
                                          }
                                        >
                                          <Pin
                                            className="h-3.5 w-3.5"
                                            strokeWidth={1.8}
                                            aria-hidden="true"
                                          />
                                        </button>

                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setMessageMenuId(
                                                messageMenuId === message.id
                                                  ? null
                                                  : (message.id ?? null),
                                              )
                                            }
                                            className={`rounded-md p-1.5 transition hover:bg-emerald-400/10 hover:text-emerald-300 ${
                                              messageMenuId === message.id
                                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
                                                : ""
                                            }`}
                                            title={st("More", "Daha fazla")}
                                            aria-label={st(
                                              "More",
                                              "Daha fazla",
                                            )}
                                            aria-expanded={
                                              messageMenuId === message.id
                                            }
                                          >
                                            <MoreVertical
                                              className="h-3.5 w-3.5"
                                              strokeWidth={1.8}
                                              aria-hidden="true"
                                            />
                                          </button>

                                          {messageMenuId === message.id && (
                                            <div
                                              className={`absolute bottom-full z-40 mb-2 w-36 overflow-hidden rounded-xl border border-emerald-200 bg-white p-1 shadow-xl backdrop-blur-xl ${
                                                isOwn ? "right-0" : "left-0"
                                              }`}
                                              onClick={(event) =>
                                                event.stopPropagation()
                                              }
                                            >
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  openForward(message);
                                                  setMessageMenuId(null);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-emerald-400/10 hover:text-emerald-200"
                                              >
                                                <Forward
                                                  className="h-3.5 w-3.5"
                                                  strokeWidth={1.8}
                                                />
                                                Forward
                                              </button>

                                              {isOwn &&
                                                !isEmojiOnlyMessage(
                                                  message.content,
                                                ) && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      startEditing(message);
                                                      setMessageMenuId(null);
                                                    }}
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-700"
                                                  >
                                                    <Pencil
                                                      className="h-3.5 w-3.5"
                                                      strokeWidth={1.8}
                                                    />
                                                    Edit
                                                  </button>
                                                )}

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  deleteMessage(message);
                                                  setMessageMenuId(null);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                                              >
                                                <Trash2
                                                  className="h-3.5 w-3.5"
                                                  strokeWidth={1.8}
                                                />
                                                Delete
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {reactionPickerMessageId === message.id && (
                                    <div
                                      className={`mt-2 flex w-fit gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg dark:border-[#173b2b] dark:bg-[#06140e] ${isOwn ? "ml-auto" : ""}`}
                                    >
                                      {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(
                                        (emoji) => (
                                          <button
                                            key={emoji}
                                            type="button"
                                            onClick={() =>
                                              toggleReaction(message, emoji)
                                            }
                                            className="rounded-full px-2 py-1 text-base transition hover:bg-slate-100 dark:hover:bg-[#102c20]"
                                          >
                                            {emoji}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  )}
                                  {message.reactions &&
                                    message.reactions.length > 0 && (
                                      <div
                                        className={`mt-1 flex w-fit flex-wrap gap-1 ${isOwn ? "justify-end" : ""}`}
                                      >
                                        {message.reactions.map((reaction) => (
                                          <button
                                            key={reaction.emoji}
                                            type="button"
                                            onClick={() =>
                                              toggleReaction(
                                                message,
                                                reaction.emoji,
                                              )
                                            }
                                            className={`rounded-full border px-2 py-0.5 text-[11px] ${reaction.reactedByMe ? "border-blue-400 bg-emerald-50 dark:bg-blue-950/40" : "border-slate-200 bg-white dark:border-[#173b2b] dark:bg-[#06140e]"}`}
                                          >
                                            {reaction.emoji} {reaction.count}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  {message.isPinned && (
                                    <div
                                      className={`mt-1 text-[10px] text-emerald-400 ${isOwn ? "text-right" : ""}`}
                                    >
                                      Pinned message
                                    </div>
                                  )}

                                  {message.attachmentUrl && (
                                    <div
                                      className={`luxury-attachment mt-2 overflow-hidden ${
                                        message.attachmentContentType?.startsWith(
                                          "image/",
                                        )
                                          ? "premium-media-message border-0 bg-transparent"
                                          : "premium-file-message border border-white/10"
                                      }`}
                                    >
                                      {message.attachmentContentType?.startsWith(
                                        "audio/",
                                      ) ? (
                                        <VoiceMessagePlayer
                                          src={getAttachmentUrl(
                                            message.attachmentUrl,
                                          )}
                                          isTurkish={language === "Türkçe"}
                                        />
                                      ) : message.attachmentContentType?.startsWith(
                                          "image/",
                                        ) ? (
                                        <a
                                          href={getAttachmentUrl(
                                            message.attachmentUrl,
                                          )}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <img
                                            src={getAttachmentUrl(
                                              message.attachmentUrl,
                                            )}
                                            alt={
                                              message.attachmentFileName ??
                                              "Attachment"
                                            }
                                            className="max-h-72 max-w-full object-contain"
                                          />
                                        </a>
                                      ) : (
                                        <a
                                          href={getAttachmentUrl(
                                            message.attachmentUrl,
                                          )}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="luxury-file-card"
                                        >
                                          <span className="luxury-file-icon">
                                            <FileText
                                              className="h-5 w-5"
                                              strokeWidth={1.8}
                                              aria-hidden="true"
                                            />
                                          </span>
                                          <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[12px] font-bold">
                                              {message.attachmentFileName ??
                                                "Attachment"}
                                            </span>
                                            <span className="mt-0.5 block text-[10px] opacity-70">
                                              {message.attachmentSize
                                                ? `${(message.attachmentSize / 1024 / 1024).toFixed(2)} MB`
                                                : "File"}
                                              <span className="mx-1.5 opacity-50">
                                                ·
                                              </span>
                                              Open document
                                            </span>
                                          </span>
                                          <Download
                                            className="h-4 w-4 shrink-0 opacity-70"
                                            strokeWidth={1.8}
                                            aria-hidden="true"
                                          />
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  <div
                                    className={`message-actions mt-1 flex w-fit items-center gap-1 text-[10px] text-slate-400 ${
                                      isOwn ? "justify-end" : ""
                                    }`}
                                  >
                                    {formatTime(message.sentAt)}

                                    {message.editedAt && (
                                      <span className="ml-1">(edited)</span>
                                    )}

                                    {isOwn && (
                                      <span
                                        className={
                                          message.isRead
                                            ? "text-emerald-300"
                                            : "text-slate-400"
                                        }
                                        title={
                                          message.isRead
                                            ? "Okundu"
                                            : "Gönderildi"
                                        }
                                      >
                                        {message.isRead ? (
                                          <CheckCheck
                                            className="h-3.5 w-3.5"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                          />
                                        ) : (
                                          <Check
                                            className="h-3.5 w-3.5"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                          />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Fragment>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-3 pb-2.5 pt-2 dark:border-[#123024] dark:bg-[#020906]">
              <div className="mx-auto w-full max-w-4xl">
                <div
                  className={`mb-1.5 flex h-6 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold transition-all ${
                    typingUsers.length > 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "pointer-events-none opacity-0"
                  }`}
                >
                  {typingUsers.length > 0 && (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                      </div>
                      <span>
                        {typingUsers.length === 1
                          ? `${typingUsers[0].username} is typing...`
                          : `${typingUsers.length} people are typing...`}
                      </span>
                    </>
                  )}
                </div>

                <div className="premium-composer rounded-[18px] border border-slate-200 bg-slate-50 shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/10 dark:border-[#173b2b] dark:bg-[#06140e]">
                  {isRecording && (
                    <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/[0.055] px-3.5 py-2.5">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.45)]" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-red-200">
                          {st(
                            "Recording voice message",
                            "Sesli mesaj kaydediliyor",
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                          00:{String(recordingSeconds).padStart(2, "0")} / 01:00
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={cancelVoiceRecording}
                        className="flex items-center gap-1.5 rounded-xl border border-red-400/15 px-2.5 py-1.5 text-[10px] font-semibold text-red-200 transition hover:bg-red-500/10 hover:text-white"
                        title={st("Delete recording", "Kaydı sil")}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                        {st("Delete", "Sil")}
                      </button>
                    </div>
                  )}

                  {pendingVoiceFile && pendingVoiceUrl && !isRecording && (
                    <div className="mx-3 mb-2 flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.045] p-2">
                      <div className="min-w-0 flex-1">
                        <VoiceMessagePlayer
                          src={pendingVoiceUrl}
                          isTurkish={language === "Türkçe"}
                          preview
                        />
                      </div>
                      <button
                        type="button"
                        onClick={deletePendingVoiceRecording}
                        disabled={uploading}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-400/15 text-red-300 transition hover:bg-red-500/10 hover:text-red-200 disabled:opacity-40"
                        title={st("Delete recording", "Ses kaydını sil")}
                        aria-label={st("Delete recording", "Ses kaydını sil")}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  />
                  {aiMode && (
                    <>
                      <input
                        ref={aiImageInputRef}
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(event) =>
                          void handleAIFileSelect(event, "image")
                        }
                      />
                      <input
                        ref={aiFileInputRef}
                        type="file"
                        className="hidden"
                        accept="application/pdf,text/plain,text/csv,application/json"
                        onChange={(event) =>
                          void handleAIFileSelect(event, "file")
                        }
                      />
                    </>
                  )}

                  <div className="flex items-center gap-1 px-3 pt-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        aiMode
                          ? aiFileInputRef.current?.click()
                          : fileInputRef.current?.click()
                      }
                      disabled={uploading || (!selectedChatId && !aiMode)}
                      title={st("Attach file", "Dosya ekle")}
                      className="rounded-lg p-1.5 text-slate-500 transition-all duration-200 hover:-translate-y-px hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Paperclip
                        className="h-4 w-4"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        aiMode
                          ? aiImageInputRef.current?.click()
                          : fileInputRef.current?.click()
                      }
                      disabled={uploading || (!selectedChatId && !aiMode)}
                      title={st("Attach image", "Görsel ekle")}
                      className="rounded-lg p-1.5 text-slate-500 transition-all duration-200 hover:-translate-y-px hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ImageIcon
                        className="h-4 w-4"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleVoiceRecording()}
                      disabled={
                        uploading ||
                        (!selectedChatId && !aiMode) ||
                        !!pendingVoiceFile
                      }
                      title={st(
                        isRecording ? "Stop recording" : "Voice message",
                        isRecording ? "Kaydı durdur" : "Sesli mesaj",
                      )}
                      aria-label={st(
                        isRecording ? "Stop recording" : "Voice message",
                        isRecording ? "Kaydı durdur" : "Sesli mesaj",
                      )}
                      className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${isRecording ? "bg-red-500/15 text-red-300 hover:bg-red-500/20" : "text-slate-500 hover:-translate-y-px hover:bg-emerald-50 hover:text-emerald-600"}`}
                    >
                      {isRecording ? (
                        <Square
                          className="h-4 w-4"
                          fill="currentColor"
                          strokeWidth={1.8}
                        />
                      ) : (
                        <Mic className="h-4 w-4" strokeWidth={1.8} />
                      )}
                    </button>
                    {uploading && (
                      <span className="text-xs text-slate-400">
                        Uploading...
                      </span>
                    )}
                  </div>

                  {aiMode && aiAttachment && (
                    <div className="mx-4 mb-2 overflow-hidden rounded-xl border border-emerald-300/15 bg-emerald-400/[0.035]">
                      {aiAttachment.kind === "image" && (
                        <img
                          src={aiAttachment.dataUrl}
                          alt={aiAttachment.fileName}
                          className="max-h-48 w-full object-contain"
                        />
                      )}
                      <div className="flex items-center gap-2 px-3 py-2 text-xs">
                        {aiAttachment.kind === "image" ? (
                          <ImageIcon
                            className="h-4 w-4 text-emerald-300"
                            strokeWidth={1.8}
                          />
                        ) : (
                          <FileText
                            className="h-4 w-4 text-emerald-300"
                            strokeWidth={1.8}
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {aiAttachment.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAiAttachment(null)}
                          className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white"
                          aria-label={st(
                            "Remove AI attachment",
                            "AI ekini kaldır",
                          )}
                        >
                          <X className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  )}

                  {attachment && (
                    <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <Paperclip
                        className="h-4 w-4"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {attachment.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        className="rounded px-2 py-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-[#102c20]"
                        title={st("Remove attachment", "Eki kaldır")}
                      >
                        <X
                          className="h-4 w-4"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  )}

                  {replyingTo && (
                    <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <div className="min-w-0 flex-1 border-l-2 border-emerald-500 pl-2">
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                          Replying to {replyingTo.senderUsername ?? "message"}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {replyingTo.content || "Attachment"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-emerald-400/10 hover:text-slate-700 dark:hover:text-white"
                        aria-label={st("İptal reply", "Yanıtı iptal et")}
                      >
                        <X
                          className="h-4 w-4"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  )}

                  <div className="px-3.5 pb-1.5">
                    <input
                      ref={messageInputRef}
                      value={text}
                      onChange={(event) => handleTyping(event.target.value)}
                      onKeyDown={handleKeyDown}
                      readOnly={
                        (!selectedChatId && !aiMode) || (!connection && !aiMode)
                      }
                      onClick={() => {
                        if (!selectedChatId && !aiMode) openNewChat();
                      }}
                      onFocus={() => {
                        if (!selectedChatId && !aiMode) openNewChat();
                      }}
                      placeholder={
                        aiMode
                          ? st("Message MFB AI...", "MFB AI'a mesaj yaz...")
                          : selectedChatId
                            ? st("Write a message...", "Bir mesaj yazın...")
                            : st(
                                "Click to start a conversation...",
                                "Sohbet başlatmak için tıklayın...",
                              )
                      }
                      className={`w-full !bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-slate-400 ${
                        selectedChatId && connection
                          ? "cursor-text"
                          : "cursor-text"
                      }`}
                      aria-label={st("Message", "Mesaj")}
                    />
                  </div>

                  <div className="relative border-t border-slate-200 px-3 py-1.5 dark:border-[#123024]">
                    {emojiPickerOpen && (
                      <div className="absolute bottom-14 left-3 z-30 w-[360px] overflow-hidden rounded-2xl border border-[#cfe3d4] bg-[#f7fcf8]/98 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-[#173b2b] dark:bg-[#06140e]/98">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/5">
                          <div>
                            <p className="text-sm font-semibold text-[#30483b] dark:text-slate-100">
                              {st("Emoji", "Emoji")}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[#708579] dark:text-slate-400">
                              {st("Choose a reaction", "Bir tepki seçin")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEmojiPickerOpen(false)}
                            className="rounded-lg p-1.5 text-[#30483b] transition hover:bg-[#e4f3e7] hover:text-[#1f6b3f] dark:text-slate-300 dark:hover:bg-[#102c20] dark:hover:text-emerald-300"
                            aria-label={st(
                              "Close emoji picker",
                              "Emoji seçiciyi kapat",
                            )}
                          >
                            <X className="h-4 w-4" strokeWidth={1.8} />
                          </button>
                        </div>

                        <div className="border-b border-slate-100 px-3 py-2 dark:border-white/5">
                          <div className="flex gap-1 overflow-x-auto pb-0.5">
                            {(
                              Object.keys(EMOJI_CATEGORIES) as EmojiCategory[]
                            ).map((category) => (
                              <button
                                key={category}
                                type="button"
                                onClick={() => setEmojiCategory(category)}
                                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition ${
                                  emojiCategory === category
                                    ? "bg-[#e1f2e5] text-[#4fa870] dark:bg-emerald-400/10 dark:text-emerald-300"
                                    : "text-[#71877a] hover:bg-[#edf7ef] hover:text-[#30483b] dark:text-slate-400 dark:hover:bg-[#102c20] dark:hover:text-slate-200"
                                }`}
                              >
                                {category === "Sık kullanılan"
                                  ? st("Recent", "Sık kullanılan")
                                  : category === "Yüz ifadeleri"
                                    ? st("Faces", "Yüz ifadeleri")
                                    : category === "El hareketleri"
                                      ? st("Gestures", "El hareketleri")
                                      : st("Symbols", "Semboller")}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="max-h-[220px] overflow-y-auto px-3 py-3">
                          {emojiCategory === "Sık kullanılan" &&
                          recentEmojis.length > 0 ? (
                            <div className="grid grid-cols-8 gap-1">
                              {recentEmojis.map((emoji, index) => (
                                <button
                                  key={`${emoji}-${index}`}
                                  type="button"
                                  onClick={() => insertEmoji(emoji)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:scale-110 hover:bg-[#e5f4e8] dark:hover:bg-emerald-400/10"
                                  aria-label={`Insert ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-8 gap-1">
                              {EMOJI_CATEGORIES[emojiCategory].map(
                                (emoji, index) => (
                                  <button
                                    key={`${emoji}-${index}`}
                                    type="button"
                                    onClick={() => insertEmoji(emoji)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:scale-110 hover:bg-emerald-400/10"
                                    aria-label={`Insert ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {gifPickerOpen && (
                      <div className="absolute bottom-14 left-12 z-30 w-[380px] overflow-hidden rounded-2xl border border-[#cfe5d5] bg-[#f7fcf8]/98 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-[#173b2b] dark:bg-[#06140e]/98">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/5">
                          <div>
                            <p className="text-sm font-semibold text-[#30483b] dark:text-slate-100">
                              {st("GIFs", "GIF'ler")}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <p className="text-[10px] text-slate-400">
                                {gifQuickEditOpen
                                  ? st(
                                      "Choose up to 4 quick GIFs",
                                      "En fazla 4 hızlı GIF seç",
                                    )
                                  : st("Quick reactions", "Hızlı tepkiler")}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setGifQuickEditOpen((open) => !open)
                                }
                                className="rounded-md border border-[#cfe3d4] bg-[#f3faf4] px-1.5 py-0.5 text-[9px] font-medium text-[#55a875] transition hover:bg-[#e4f3e7] hover:text-[#3f8f60] dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/20 dark:hover:text-emerald-200"
                              >
                                {gifQuickEditOpen
                                  ? st("Done", "Tamam")
                                  : st("Edit", "Düzenle")}
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setGifPickerOpen(false);
                              setGifSearch("");
                            }}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
                            aria-label={st(
                              "Close GIF picker",
                              "GIF seçiciyi kapat",
                            )}
                          >
                            <X className="h-4 w-4" strokeWidth={1.8} />
                          </button>
                        </div>

                        <div className="border-b border-slate-100 p-3 dark:border-white/5">
                          <div className="flex items-center gap-2 rounded-xl border border-[#d2e5d7] bg-[#edf8ed] px-3 py-2 dark:border-[#173b2b] dark:bg-[#0b2117]">
                            <Search
                              className="h-3.5 w-3.5 text-slate-500"
                              strokeWidth={1.8}
                            />
                            <input
                              value={gifSearch}
                              onChange={(event) =>
                                setGifSearch(event.target.value)
                              }
                              placeholder={st("Search GIFs...", "GIF ara...")}
                              className="min-w-0 flex-1 !bg-transparent text-sm text-[#30483b] outline-none placeholder:text-[#8a9b91] dark:text-slate-100 dark:placeholder:text-slate-500"
                            />
                            {gifSearch && (
                              <button
                                type="button"
                                onClick={() => setGifSearch("")}
                                className="rounded-md p-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-white"
                                aria-label={st(
                                  "Clear search",
                                  "Aramayı temizle",
                                )}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="max-h-[330px] overflow-y-auto p-3">
                          {!gifSearch.trim() && recentGifs.length > 0 && (
                            <div className="mb-2 flex items-center gap-2 px-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500 dark:text-emerald-400/80">
                                {st("Recently used", "Son kullandıkların")}
                              </span>
                              <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {gifResults.map((gif) => {
                              const isQuickGif = quickGifs.some(
                                (item) => item.id === gif.id,
                              );

                              return (
                                <div
                                  key={gif.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    gifQuickEditOpen
                                      ? toggleQuickGif(gif)
                                      : void selectGif(gif)
                                  }
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === "Enter" ||
                                      event.key === " "
                                    ) {
                                      event.preventDefault();
                                      gifQuickEditOpen
                                        ? toggleQuickGif(gif)
                                        : void selectGif(gif);
                                    }
                                  }}
                                  className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white text-left transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-emerald-400/5 dark:bg-[#0b2117] dark:hover:bg-emerald-400/10 ${
                                    isQuickGif
                                      ? "border-emerald-400/50"
                                      : "border-[#d8e9dc] dark:border-[#173b2b]"
                                  }`}
                                >
                                  <div className="relative overflow-hidden">
                                    <img
                                      src={gif.url}
                                      alt={gif.label}
                                      className="h-28 w-full object-cover transition duration-200 group-hover:scale-[1.04]"
                                    />

                                    {gifQuickEditOpen && (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          if (isQuickGif) {
                                            toggleQuickGif(gif);
                                          } else {
                                            removeRecentGif(gif);
                                          }
                                        }}
                                        className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-[#cfe3d4] bg-[#f3faf4]/95 text-[#30483b] shadow-sm backdrop-blur-sm transition hover:border-[#b8d8c0] hover:bg-[#e4f3e7] hover:text-[#1f6b3f] dark:border-[#173b2b] dark:bg-[#06140e]/90 dark:text-slate-200 dark:hover:border-emerald-400/30 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300"
                                        aria-label={st(
                                          isQuickGif
                                            ? "Remove quick GIF"
                                            : "Remove recent GIF",
                                          isQuickGif
                                            ? "Hızlı GIF'i sil"
                                            : "Son kullanılan GIF'i sil",
                                        )}
                                        title={st(
                                          isQuickGif
                                            ? "Remove quick GIF"
                                            : "Remove recent GIF",
                                          isQuickGif
                                            ? "Hızlı GIF'i sil"
                                            : "Son kullanılan GIF'i sil",
                                        )}
                                      >
                                        <X
                                          className="h-3.5 w-3.5"
                                          strokeWidth={2}
                                        />
                                      </button>
                                    )}

                                    <span
                                      className={`absolute right-2 top-2 rounded-lg border border-[#cfe3d4] bg-[#f3faf4] px-2.5 py-1 text-[10px] font-medium text-[#30483b] shadow-sm backdrop-blur-sm transition dark:border-emerald-400/20 dark:bg-[#06140e]/85 dark:text-slate-200 ${
                                        gifQuickEditOpen
                                          ? isQuickGif
                                            ? "bg-[#dcefe1] text-[#3f8f60] opacity-100 dark:bg-emerald-400/20 dark:text-emerald-300"
                                            : "bg-[#e3f2e5]/90 opacity-0 group-hover:opacity-100 dark:bg-emerald-400/15"
                                          : "bg-[#e3f2e5]/90 opacity-0 group-hover:opacity-100 dark:bg-emerald-400/15"
                                      }`}
                                    >
                                      {gifQuickEditOpen
                                        ? isQuickGif
                                          ? st("Selected", "Seçildi")
                                          : st("Add", "Ekle")
                                        : `${st("Send", "Gönder")} →`}
                                    </span>
                                  </div>
                                  <span className="block px-2.5 py-2 text-[10px] text-slate-600 dark:text-slate-300">
                                    {gif.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {gifSearching && (
                            <div className="py-8 text-center">
                              <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-500 dark:border-t-emerald-400" />
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {st("Searching GIFs...", "GIF'ler aranıyor...")}
                              </p>
                            </div>
                          )}

                          {!gifSearching && gifSearchError && (
                            <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-4 text-center dark:border-amber-400/15 dark:bg-amber-400/5">
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {gifSearchError}
                              </p>
                              {!process.env.NEXT_PUBLIC_GIPHY_API_KEY && (
                                <p className="mt-2 text-[10px] text-slate-500">
                                  {st(
                                    "Quick GIFs remain available when no search is active.",
                                    "Arama yapılmadığında hızlı GIF'ler kullanılmaya devam eder.",
                                  )}
                                </p>
                              )}
                            </div>
                          )}

                          {!gifSearching &&
                            !gifSearchError &&
                            gifResults.length === 0 && (
                              <div className="py-8 text-center">
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {st("No GIFs found", "GIF bulunamadı")}
                                </p>
                                <p className="mt-1 text-[10px] text-slate-500">
                                  {st(
                                    "Try another search.",
                                    "Başka bir arama deneyin.",
                                  )}
                                </p>
                              </div>
                            )}
                        </div>

                        <div className="border-t border-[#dcebe0] px-3 py-2 dark:border-[#173b2b]">
                          <p className="text-[9px] text-[#81958a] dark:text-slate-500">
                            Powered by GIPHY
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={toggleEmojiPicker}
                          disabled={
                            aiMode ? false : !selectedChatId || !connection
                          }
                          className={`flex h-8 w-8   items-center justify-center rounded-lg p-0 text-slate-500 transition hover:-translate-y-px hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#102c20] dark:hover:text-emerald-300 ${emojiPickerOpen ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300" : ""}`}
                          title="Emoji"
                          aria-label={st(
                            "Open emoji picker",
                            "Emoji seçiciyi aç",
                          )}
                        >
                          <Smile
                            className="h-4 w-4"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={toggleGifPicker}
                          disabled={
                            aiMode ? false : !selectedChatId || !connection
                          }
                          className={`flex h-8 w-8  items-center justify-center rounded-lg p-0 text-sm font-medium text-slate-500 transition hover:-translate-y-px hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[#102c20] dark:hover:text-emerald-300 ${gifPickerOpen ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300" : ""}`}
                          title="GIF"
                          aria-label={st("Open GIF picker", "GIF seçiciyi aç")}
                        >
                          GIF
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={send}
                        disabled={
                          (!connection && !aiMode) ||
                          (!selectedChatId && !aiMode) ||
                          uploading ||
                          (!text.trim() &&
                            !attachment &&
                            !aiAttachment &&
                            !pendingVoiceFile) ||
                          isRecording
                        }
                        aria-label={
                          editingMessageId
                            ? "Save message"
                            : st("Send message", "Mesaj gönder")
                        }
                        className="group flex items-center gap-2 rounded-xl bg-[#68d39a] px-3.5 py-2 text-sm font-semibold text-[#183024] transition-all duration-200 hover:bg-[#78dda5] hover:shadow-[0_4px_14px_rgba(104,211,154,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="hidden sm:inline">
                          {editingMessageId ? "Save" : "Send"}
                        </span>
                        <ArrowLeft
                          className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-0.5"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-center gap-2 text-[10px] text-slate-600">
                  <span className="h-1 w-1 rounded-full bg-emerald-400/60" />
                  {st("Enter ↵ to send", "Enter ↵ gönder")}
                  <span className="text-slate-700">·</span>
                  {st(
                    "Shift + Enter for a new line",
                    "Shift + Enter yeni satır",
                  )}
                  {editingMessageId && (
                    <span className="text-emerald-400/70">
                      · {st("Editing", "Düzenleniyor")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* MOBILE DETAILS */}
          {detailsOpen && (
            <div
              className="fixed inset-0 z-50 flex w-full items-end bg-black/55 backdrop-blur-sm lg:hidden"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setDetailsOpen(false);
              }}
            >
              <div className="luxury-mobile-details flex max-h-[88vh] w-full flex-col rounded-t-[28px] border-t border-emerald-300/10 bg-[#06140e] shadow-[0_-24px_70px_rgba(0,0,0,.5)]">
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-[#123024]">
                  <h3 className="text-sm font-semibold">
                    {st("Conversation Details", "Sohbet ayrıntıları")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
                    aria-label={st("Close details", "Ayrıntıları kapat")}
                  >
                    <X
                      className="h-4 w-4"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="flex flex-col items-center text-center">
                    <div className="premium-avatar premium-avatar-lg flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-2xl font-bold text-white">
                      {selectedChat?.isGroup && selectedChat.avatarUrl ? (
                        <img
                          src={getAttachmentUrl(selectedChat.avatarUrl)}
                          alt={selectedChat.name}
                          className="h-full w-full object-cover"
                        />
                      ) : selectedChat &&
                        !selectedChat.isGroup &&
                        selectedChat.otherAvatarUrl ? (
                        <img
                          src={getAttachmentUrl(selectedChat.otherAvatarUrl)}
                          alt={selectedChat.name}
                          className="h-full w-full object-cover"
                        />
                      ) : selectedChat ? (
                        selectedChat.isGroup ? (
                          "#"
                        ) : (
                          selectedChat.name.charAt(0).toUpperCase()
                        )
                      ) : (
                        "?"
                      )}
                    </div>
                    <h3 className="mt-3 font-semibold">
                      {selectedChat?.name ?? "No conversation"}
                    </h3>
                    <p className="text-xs text-emerald-400">
                      {selectedChat
                        ? selectedChat.isGroup
                          ? st("Group chat", "Grup sohbeti")
                          : st("Conversation", "Sohbet")
                        : st("Not selected", "Seçilmedi")}
                    </p>
                    {selectedChat && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {st("Created", "Oluşturuldu")}{" "}
                        {new Date(selectedChat.createdAt).toLocaleDateString(
                          language === "Türkçe" ? "tr-TR" : "en-US",
                        )}
                      </p>
                    )}

                    {selectedChat?.isGroup && (
                      <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={openEditGroupName}
                          className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-[#0b2117] dark:text-slate-200 dark:hover:bg-[#173b2b]"
                        >
                          {st("Edit group", "Grubu düzenle")}
                        </button>
                        <button
                          type="button"
                          onClick={openManageGroup}
                          className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                        >
                          {st("Manage members", "Üyeleri yönet")}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="my-6 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      disabled={!selectedChatId}
                      className={`luxury-details-primary-action disabled:cursor-not-allowed disabled:opacity-35 luxury-action-tile rounded-xl p-3 text-xs transition hover:bg-slate-200 dark:hover:bg-[#173b2b] ${mutedChatIds.has(selectedChatId) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-slate-100 dark:bg-[#0b2117]"}`}
                    >
                      {mutedChatIds.has(selectedChatId) ? (
                        <BellOff
                          className="mx-auto h-4 w-4"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      ) : (
                        <Bell
                          className="mx-auto h-4 w-4"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      )}
                      <div className="mt-1">
                        {mutedChatIds.has(selectedChatId)
                          ? st("Unmute", "Sesi aç")
                          : st("Mute", "Sessize al")}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailsOpen(false);
                        setMessageSearchOpen(true);
                      }}
                      className="luxury-action-tile rounded-xl bg-slate-100 p-3 text-xs transition hover:bg-slate-200 dark:bg-[#0b2117] dark:hover:bg-[#173b2b]"
                    >
                      <Search
                        className="h-4 w-4"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      <div className="mt-1 text-center">
                        {st("Search", "Ara")}
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={requestBrowserNotifications}
                    className="mb-5 w-full rounded-xl border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-[#173b2b] dark:text-slate-300 dark:hover:bg-[#102c20]"
                  >
                    {notificationsEnabled
                      ? st(
                          "Browser notifications enabled",
                          "Tarayıcı bildirimleri etkin",
                        )
                      : st(
                          "Enable browser notifications",
                          "Tarayıcı bildirimlerini etkinleştir",
                        )}
                  </button>

                  <div className="luxury-details-section mb-6">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setSharedMediaOpen((current) => !current)
                        }
                        className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-expanded={sharedMediaOpen}
                      >
                        <h4 className="luxury-section-kicker group-hover:text-slate-300">
                          {st("Shared Media", "Paylaşılan medya")}
                        </h4>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-600 transition-transform ${sharedMediaOpen ? "rotate-0" : "-rotate-90"}`}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </button>
                      {sharedMediaOpen && sharedMedia.length > 6 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllSharedMedia((current) => !current)
                          }
                          className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
                        >
                          {showAllSharedMedia
                            ? st("Show less", "Daha az göster")
                            : st("View all", "Tümünü gör")}
                        </button>
                      )}
                    </div>
                    {sharedMediaOpen && (
                      <div>
                        {sharedMedia.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {(showAllSharedMedia
                              ? sharedMedia
                              : sharedMedia.slice(0, 6)
                            ).map((message) => (
                              <a
                                key={message.id ?? message.attachmentUrl}
                                href={getAttachmentUrl(message.attachmentUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="luxury-details-media-card group relative aspect-square overflow-hidden rounded-xl"
                              >
                                <img
                                  src={getAttachmentUrl(message.attachmentUrl)}
                                  alt={
                                    message.attachmentFileName ?? "Shared image"
                                  }
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#173b2b] bg-[#07150f] px-3 py-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                              <ImageIcon
                                className="h-4 w-4"
                                strokeWidth={1.8}
                                aria-hidden="true"
                              />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-300">
                                {st(
                                  "No shared media yet",
                                  "Henüz paylaşılan medya yok",
                                )}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                {st(
                                  "Images shared in this conversation will appear here.",
                                  "Bu sohbette paylaşılan görseller burada görünecek.",
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="luxury-details-section mb-6">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setSharedLinksOpen((current) => !current)
                        }
                        className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-expanded={sharedLinksOpen}
                      >
                        <h4 className="luxury-section-kicker group-hover:text-slate-300">
                          {st("Shared links", "Paylaşılan bağlantılar")}
                        </h4>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-600 transition-transform ${sharedLinksOpen ? "rotate-0" : "-rotate-90"}`}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </button>
                      {sharedLinksOpen && sharedLinks.length > 0 && (
                        <span className="text-[10px] text-slate-600">
                          {sharedLinks.length}
                        </span>
                      )}
                    </div>
                    {sharedLinksOpen && (
                      <div>
                        {sharedLinks.length > 0 ? (
                          <div className="space-y-2">
                            {sharedLinks.map((link) => (
                              <a
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="luxury-details-link block rounded-xl px-3 py-2.5 transition hover:border-emerald-400/15"
                              >
                                <p className="truncate text-[11px] font-semibold text-emerald-300">
                                  {link.url.replace(/^https?:\/\//, "")}
                                </p>
                                <p className="mt-0.5 text-[9px] text-slate-500">
                                  {st(
                                    "Open shared link",
                                    "Paylaşılan bağlantıyı aç",
                                  )}
                                </p>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[#173b2b] bg-[#07150f] px-3 py-3 text-[10px] text-slate-500">
                            {st(
                              "Links shared in this conversation will appear here.",
                              "Bu sohbette paylaşılan bağlantılar burada görünecek.",
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="luxury-details-section">
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setSharedFilesOpen((current) => !current)
                        }
                        className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-expanded={sharedFilesOpen}
                      >
                        <h4 className="luxury-section-kicker group-hover:text-slate-300">
                          {st("Shared files", "Paylaşılan dosyalar")}
                        </h4>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-600 transition-transform ${sharedFilesOpen ? "rotate-0" : "-rotate-90"}`}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </button>
                      {sharedFilesOpen && sharedFiles.length > 4 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllSharedFiles((current) => !current)
                          }
                          className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
                        >
                          {showAllSharedFiles
                            ? st("Show less", "Daha az göster")
                            : st("View all", "Tümünü gör")}
                        </button>
                      )}
                    </div>

                    {sharedFilesOpen && (
                      <div>
                        {sharedFiles.length > 0 ? (
                          <div className="space-y-2">
                            {(showAllSharedFiles
                              ? sharedFiles
                              : sharedFiles.slice(0, 4)
                            ).map((message) => (
                              <a
                                key={message.id ?? message.attachmentUrl}
                                href={getAttachmentUrl(message.attachmentUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="luxury-details-file group flex items-center gap-3 rounded-xl px-3 py-3"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                                  <FileText
                                    className="h-4 w-4"
                                    strokeWidth={1.8}
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-slate-200">
                                    {message.attachmentFileName ??
                                      "Shared file"}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-slate-500">
                                    {message.attachmentSize
                                      ? `${(message.attachmentSize / 1024 / 1024).toFixed(2)} MB`
                                      : "File"}
                                  </p>
                                </div>
                                <Download
                                  className="h-3.5 w-3.5 text-slate-500"
                                  strokeWidth={1.8}
                                  aria-hidden="true"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#173b2b] bg-[#07150f] px-3 py-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                              <FileText
                                className="h-4 w-4"
                                strokeWidth={1.8}
                                aria-hidden="true"
                              />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-300">
                                {st(
                                  "No shared files yet",
                                  "Henüz paylaşılan dosya yok",
                                )}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                {st(
                                  "Files shared in this conversation will appear here.",
                                  "Bu sohbette paylaşılan dosyalar burada görünecek.",
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DETAILS */}
          {detailsOpen && (
            <aside className="luxury-details hidden w-[320px] shrink-0 border-l border-slate-200 bg-white lg:flex lg:flex-col dark:border-[#123024] dark:bg-[#06140e]">
              <div className="luxury-details-header flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-[#123024]">
                <h3 className="text-sm font-semibold">
                  {st("Conversation Details", "Sohbet ayrıntıları")}
                </h3>

                <button
                  onClick={() => setDetailsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-[#102c20] p-0 text-emerald-200 transition hover:bg-[#163a2a] hover:text-emerald-100 dark:border-emerald-300/20 dark:bg-[#102c20] dark:text-emerald-200 dark:hover:bg-[#163a2a] dark:hover:text-emerald-100"
                  aria-label={st("Close details", "Ayrıntıları kapat")}
                >
                  <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>

              <div className="luxury-details-scroll flex-1 overflow-y-auto p-5">
                {aiMode ? (
                  <div className="flex min-h-full flex-col items-center text-center">
                    <div className="luxury-details-identity overflow-hidden rounded-full">
                      <img
                        src="/mfb-ai-avatar.jpg"
                        alt="MFB AI"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <h3 className="mt-4 text-base font-semibold tracking-tight">
                      MFB AI
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-emerald-400">
                      {st("AI assistant", "Yapay zeka asistanı")}
                    </p>

                    <div className="mt-5 w-full">
                      <div className="luxury-details-stat text-left">
                        <div className="luxury-details-stat-label">Durum</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-emerald-300"
                            aria-hidden="true"
                          />
                          <div className="luxury-details-stat-value text-xs text-emerald-300">
                            {st("Ready", "Hazır")}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 w-full rounded-2xl border border-emerald-300/10 bg-[#07150f] p-4 text-left">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <Sparkles
                          className="h-3.5 w-3.5 text-emerald-300"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {st("What can MFB AI do?", "MFB AI neler yapabilir?")}
                      </div>
                      <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                        <li>
                          •{" "}
                          {st(
                            "Answer questions and explain topics",
                            "Soruları yanıtlar ve konuları açıklar",
                          )}
                        </li>
                        <li>
                          •{" "}
                          {st(
                            "Help you explore ideas and everyday topics",
                            "Fikirleri ve günlük konuları keşfetmene yardımcı olur",
                          )}
                        </li>
                        <li>
                          •{" "}
                          {st(
                            "Help write, rewrite and summarize text",
                            "Metinleri yazmana, düzenlemene ve özetlemene yardımcı olur",
                          )}
                        </li>
                      </ul>
                    </div>

                    <p className="mt-4 text-[10px] leading-4 text-slate-600">
                      {st(
                        "MFB AI is a built-in assistant for this app.",
                        "MFB AI, bu uygulamanın yerleşik yapay zeka asistanıdır.",
                      )}
                    </p>
                  </div>
                ) : selectedChat ? (
                  <>
                    <div className="flex flex-col items-center text-center">
                      <div className="luxury-details-identity">
                        <div className="luxury-details-identity-inner flex items-center justify-center text-2xl font-bold text-white">
                          {selectedChat?.isGroup && selectedChat.avatarUrl ? (
                            <img
                              src={getAttachmentUrl(selectedChat.avatarUrl)}
                              alt={selectedChat.name}
                              className="h-full w-full object-cover"
                            />
                          ) : selectedChat &&
                            !selectedChat.isGroup &&
                            selectedChat.otherAvatarUrl ? (
                            <img
                              src={getAttachmentUrl(
                                selectedChat.otherAvatarUrl,
                              )}
                              alt={selectedChat.name}
                              className="h-full w-full object-cover"
                            />
                          ) : selectedChat ? (
                            selectedChat.isGroup ? (
                              "#"
                            ) : (
                              selectedChat.name.charAt(0).toUpperCase()
                            )
                          ) : (
                            "?"
                          )}
                        </div>
                      </div>

                      <h3 className="mt-4 text-base font-semibold tracking-tight">
                        {selectedChat?.name ??
                          st(
                            "No conversation selected",
                            "Henüz sohbet seçilmedi",
                          )}
                      </h3>

                      <p className="mt-0.5 text-xs font-medium text-emerald-400">
                        {selectedChat
                          ? selectedChat.isGroup
                            ? st("Group chat", "Grup sohbeti")
                            : st("Conversation", "Sohbet")
                          : st(
                              "Choose a conversation to see details",
                              "Ayrıntıları görmek için bir sohbet seç",
                            )}
                      </p>

                      {selectedChat && (
                        <div className="luxury-details-stat-grid w-full">
                          <div className="luxury-details-stat text-left">
                            <div className="luxury-details-stat-label">
                              {st("Created", "Oluşturuldu")}
                            </div>
                            <div className="luxury-details-stat-value">
                              {new Date(
                                selectedChat.createdAt,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="luxury-details-stat text-left">
                            <div className="luxury-details-stat-label">
                              {selectedChat.isGroup
                                ? st("Members", "Üyeler")
                                : st("Status", "Durum")}
                            </div>
                            <div className="luxury-details-stat-value">
                              {selectedChat.isGroup
                                ? loadingGroupMembers
                                  ? st("Loading...", "Yükleniyor...")
                                  : `${groupMembers.length} ${groupMembers.length === 1 ? st("member", "üye") : st("members", "üye")}`
                                : st("Direct chat", "Direkt sohbet")}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedChat?.isGroup && (
                        <div className="luxury-details-action-row group-actions w-full">
                          <button
                            type="button"
                            onClick={openEditGroupName}
                            className="luxury-details-primary-action rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 transition"
                          >
                            {st("Edit group", "Grubu düzenle")}
                          </button>

                          <button
                            type="button"
                            onClick={openManageGroup}
                            className="luxury-details-primary-action rounded-xl px-3 py-2.5 text-xs font-semibold text-emerald-300 transition"
                          >
                            {st("Manage members", "Üyeleri yönet")}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="luxury-details-action-row primary-actions">
                      <button
                        onClick={toggleMute}
                        disabled={!selectedChatId}
                        className={`luxury-details-primary-action disabled:cursor-not-allowed disabled:opacity-35 luxury-action-tile rounded-xl p-3 text-xs transition hover:bg-slate-200 dark:hover:bg-[#173b2b] ${mutedChatIds.has(selectedChatId) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-slate-100 dark:bg-[#0b2117]"}`}
                      >
                        {mutedChatIds.has(selectedChatId) ? (
                          <BellOff
                            className="mx-auto h-4 w-4"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                        ) : (
                          <Bell
                            className="mx-auto h-4 w-4"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                        )}
                        <div className="mt-1">
                          {mutedChatIds.has(selectedChatId)
                            ? st("Unmute", "Sesi aç")
                            : st("Mute", "Sessize al")}
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setMessageSearchOpen((current) => !current);
                          if (messageSearchOpen) setMessageSearch("");
                        }}
                        className={`luxury-details-primary-action luxury-action-tile flex flex-col items-center justify-center rounded-xl p-3 text-xs transition ${
                          messageSearchOpen
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-[#0b2117]"
                        } hover:bg-slate-200 dark:hover:bg-[#173b2b]`}
                      >
                        <Search
                          className="h-4 w-4"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        <div className="mt-1 text-center">
                          {st("Search", "Ara")}
                        </div>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={requestBrowserNotifications}
                      className="luxury-status-pill luxury-details-notification w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-[#173b2b] dark:text-slate-300 dark:hover:bg-[#102c20]"
                    >
                      {notificationsEnabled
                        ? st(
                            "Browser notifications enabled",
                            "Tarayıcı bildirimleri etkin",
                          )
                        : st(
                            "Enable browser notifications",
                            "Tarayıcı bildirimlerini etkinleştir",
                          )}
                    </button>

                    <div className="luxury-details-section mb-7">
                      <div className="mb-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setSharedMediaOpen((current) => !current)
                          }
                          className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                          aria-expanded={sharedMediaOpen}
                        >
                          <h4 className="luxury-section-kicker group-hover:text-slate-300">
                            {st("Shared Media", "Paylaşılan medya")}
                          </h4>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-slate-600 transition-transform ${sharedMediaOpen ? "rotate-0" : "-rotate-90"}`}
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                        </button>
                        {sharedMediaOpen && sharedMedia.length > 6 && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAllSharedMedia((current) => !current)
                            }
                            className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
                          >
                            {showAllSharedMedia
                              ? st("Show less", "Daha az göster")
                              : st("View all", "Tümünü gör")}
                          </button>
                        )}
                      </div>

                      {sharedMediaOpen && (
                        <div>
                          {sharedMedia.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {(showAllSharedMedia
                                ? sharedMedia
                                : sharedMedia.slice(0, 6)
                              ).map((message) => (
                                <a
                                  key={message.id ?? message.attachmentUrl}
                                  href={getAttachmentUrl(message.attachmentUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="luxury-details-media-card group relative aspect-square overflow-hidden rounded-xl"
                                >
                                  <img
                                    src={getAttachmentUrl(
                                      message.attachmentUrl,
                                    )}
                                    alt={
                                      message.attachmentFileName ??
                                      "Shared image"
                                    }
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 opacity-0 transition group-hover:opacity-100">
                                    <p className="truncate text-[9px] text-white">
                                      {message.attachmentFileName ?? "Image"}
                                    </p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#173b2b] bg-[#07150f] px-3 py-4">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                                <ImageIcon
                                  className="h-4 w-4"
                                  strokeWidth={1.8}
                                  aria-hidden="true"
                                />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-300">
                                  {st(
                                    "No shared media yet",
                                    "Henüz paylaşılan medya yok",
                                  )}
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                  {st(
                                    "Images shared in this conversation will appear here.",
                                    "Bu sohbette paylaşılan görseller burada görünecek.",
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="luxury-details-section mb-6">
                      <div className="mb-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setSharedLinksOpen((current) => !current)
                          }
                          className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                          aria-expanded={sharedLinksOpen}
                        >
                          <h4 className="luxury-section-kicker group-hover:text-slate-300">
                            {st("Shared links", "Paylaşılan bağlantılar")}
                          </h4>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-slate-600 transition-transform ${sharedLinksOpen ? "rotate-0" : "-rotate-90"}`}
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                        </button>
                        {sharedLinksOpen && sharedLinks.length > 0 && (
                          <span className="text-[10px] text-slate-600">
                            {sharedLinks.length}
                          </span>
                        )}
                      </div>
                      {sharedLinksOpen && (
                        <div>
                          {sharedLinks.length > 0 ? (
                            <div className="space-y-2">
                              {sharedLinks.map((link) => (
                                <a
                                  key={link.url}
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="luxury-details-link block rounded-xl px-3 py-2.5 transition hover:border-emerald-400/15"
                                >
                                  <p className="truncate text-[11px] font-semibold text-emerald-300">
                                    {link.url.replace(/^https?:\/\//, "")}
                                  </p>
                                  <p className="mt-0.5 text-[9px] text-slate-500">
                                    {st(
                                      "Open shared link",
                                      "Paylaşılan bağlantıyı aç",
                                    )}
                                  </p>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-[#173b2b] bg-[#07150f] px-3 py-3 text-[10px] text-slate-500">
                              {st(
                                "Links shared in this conversation will appear here.",
                                "Bu sohbette paylaşılan bağlantılar burada görünecek.",
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="luxury-details-section">
                      <div className="mb-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setSharedFilesOpen((current) => !current)
                          }
                          className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                          aria-expanded={sharedFilesOpen}
                        >
                          <h4 className="luxury-section-kicker group-hover:text-slate-300">
                            {st("Shared files", "Paylaşılan dosyalar")}
                          </h4>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-slate-600 transition-transform ${sharedFilesOpen ? "rotate-0" : "-rotate-90"}`}
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                        </button>
                        {sharedFilesOpen && sharedFiles.length > 4 && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAllSharedFiles((current) => !current)
                            }
                            className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
                          >
                            {showAllSharedFiles
                              ? st("Show less", "Daha az göster")
                              : st("View all", "Tümünü gör")}
                          </button>
                        )}
                      </div>

                      {sharedFilesOpen && (
                        <div>
                          {sharedFiles.length > 0 ? (
                            <div className="space-y-2">
                              {(showAllSharedFiles
                                ? sharedFiles
                                : sharedFiles.slice(0, 4)
                              ).map((message) => (
                                <a
                                  key={message.id ?? message.attachmentUrl}
                                  href={getAttachmentUrl(message.attachmentUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="luxury-details-file group flex items-center gap-3 rounded-xl px-3 py-3"
                                >
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                                    <FileText
                                      className="h-4 w-4"
                                      strokeWidth={1.8}
                                      aria-hidden="true"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-slate-200">
                                      {message.attachmentFileName ??
                                        "Shared file"}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-slate-500">
                                      {message.attachmentSize
                                        ? `${(message.attachmentSize / 1024 / 1024).toFixed(2)} MB`
                                        : "File"}
                                    </p>
                                  </div>
                                  <Download
                                    className="h-3.5 w-3.5 text-slate-500"
                                    strokeWidth={1.8}
                                    aria-hidden="true"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#173b2b] bg-[#07150f] px-3 py-4">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                                <FileText
                                  className="h-4 w-4"
                                  strokeWidth={1.8}
                                  aria-hidden="true"
                                />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-300">
                                  {st(
                                    "No shared files yet",
                                    "Henüz paylaşılan dosya yok",
                                  )}
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                  {st(
                                    "Files shared in this conversation will appear here.",
                                    "Bu sohbette paylaşılan dosyalar burada görünecek.",
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-full flex-col items-center justify-center px-5 py-12 text-center">
                    <div className="luxury-empty-orbit flex h-20 w-20 items-center justify-center rounded-full">
                      <div className="luxury-empty-icon flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/15 bg-[#07150f] text-emerald-300">
                        <MessageSquarePlus
                          className="h-6 w-6"
                          strokeWidth={1.6}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <p className="mt-5 text-sm font-semibold text-slate-200">
                      {st("No conversation selected", "Henüz sohbet seçilmedi")}
                    </p>
                    <p className="mt-1.5 max-w-[220px] text-xs leading-5 text-slate-500">
                      {st(
                        "Choose a conversation to see its details, shared media and files here.",
                        "Bir sohbet seçtiğinde ayrıntıları, paylaşılan medya ve dosyaları burada görebilirsin.",
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={openNewChat}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-400/[0.07] px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/[0.11]"
                    >
                      <Plus
                        className="h-3.5 w-3.5"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      {st("Start a conversation", "Yeni sohbet başlat")}
                    </button>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
        {mobileActionMessageId && (
          <div
            className="fixed inset-0 z-[100] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={st("Message actions", "Mesaj işlemleri")}
            onClick={() => setMobileActionMessageId(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-emerald-300/15 bg-[#07140e]/98 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,.55)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-600/80" />

              {(() => {
                const mobileMessage = messages.find(
                  (item) => item.id === mobileActionMessageId,
                );
                if (!mobileMessage) return null;

                const mobileIsOwn = mobileMessage.senderId === currentUserId;
                const mobileIsEmojiOnly = isEmojiOnlyMessage(
                  mobileMessage.content,
                );

                const close = () => setMobileActionMessageId(null);

                return (
                  <>
                    <div className="mb-3 rounded-2xl border border-emerald-300/10 bg-white/[0.025] px-4 py-3">
                      <div className="line-clamp-2 text-sm text-slate-200">
                        {mobileIsEmojiOnly
                          ? mobileMessage.content
                          : mobileMessage.content ||
                            mobileMessage.attachmentFileName ||
                            "Attachment"}
                      </div>
                    </div>

                    <div className="mb-3 flex items-center justify-center gap-1 rounded-2xl border border-emerald-300/[0.07] bg-white/[0.02] px-2 py-1.5">
                      {["👍", "❤️", "😂", "😮", "🔥"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            toggleReaction(mobileMessage, emoji);
                            close();
                          }}
                          className="flex h-9 w-10 items-center justify-center rounded-xl text-lg transition active:scale-90 active:bg-emerald-400/10"
                          aria-label={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          replyToMessage(mobileMessage);
                          close();
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-emerald-300/10 bg-white/[0.035] px-4 py-3.5 text-left text-sm text-slate-100 active:bg-emerald-400/10"
                      >
                        <Reply className="h-4 w-4 text-emerald-300" />
                        Reply
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReactionPickerMessageId(mobileMessage.id ?? null);
                          close();
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-emerald-300/10 bg-white/[0.035] px-4 py-3.5 text-left text-sm text-slate-100 active:bg-emerald-400/10"
                      >
                        <Smile className="h-4 w-4 text-emerald-300" />
                        React
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          togglePin(mobileMessage);
                          close();
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-emerald-300/10 bg-white/[0.035] px-4 py-3.5 text-left text-sm text-slate-100 active:bg-emerald-400/10"
                      >
                        <Pin className="h-4 w-4 text-emerald-300" />
                        {mobileMessage.isPinned ? "Unpin" : "Pin"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          openForward(mobileMessage);
                          close();
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-emerald-300/10 bg-white/[0.035] px-4 py-3.5 text-left text-sm text-slate-100 active:bg-emerald-400/10"
                      >
                        <Forward className="h-4 w-4 text-emerald-300" />
                        Forward
                      </button>

                      {mobileIsOwn &&
                        !mobileIsEmojiOnly &&
                        !mobileMessage.attachmentUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              startEditing(mobileMessage);
                              close();
                            }}
                            className="flex items-center gap-3 rounded-2xl border border-emerald-300/10 bg-white/[0.035] px-4 py-3.5 text-left text-sm text-slate-100 active:bg-emerald-400/10"
                          >
                            <Pencil className="h-4 w-4 text-emerald-300" />
                            Edit
                          </button>
                        )}

                      <button
                        type="button"
                        onClick={() => {
                          deleteMessage(mobileMessage);
                          close();
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-red-400/10 bg-red-500/[0.035] px-4 py-3.5 text-left text-sm text-red-300 active:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {messageDeleteDialog && (
          <div
            className="fixed inset-0 z-[105] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setMessageDeleteDialog(null);
              }
            }}
          >
            <div
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-300/15 bg-[#07130f] shadow-2xl shadow-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="message-delete-dialog-title"
            >
              <div className="border-b border-emerald-300/10 px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="message-delete-dialog-title"
                      className="text-base font-semibold text-slate-100"
                    >
                      {st("Delete message", "Mesajı sil")}
                    </h2>
                    <p className="mt-1.5 text-sm leading-6 text-slate-400">
                      {st(
                        "Choose where you want to delete this message.",
                        "Bu mesajı nereden silmek istediğinizi seçin.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 px-6 py-4">
                <button
                  type="button"
                  onClick={deleteMessageForMe}
                  className="flex w-full items-center gap-3 rounded-2xl border border-emerald-300/10 bg-white/[0.035] px-4 py-3.5 text-left transition hover:bg-emerald-400/10"
                >
                  <Eraser className="h-4 w-4 text-slate-300" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-100">
                      {st("Delete for me", "Benden sil")}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {st(
                        "Remove it only from your view.",
                        "Yalnızca senin görünümünden kaldırır.",
                      )}
                    </span>
                  </span>
                </button>

                {messageDeleteDialog.senderId === currentUserId && (
                  <button
                    type="button"
                    onClick={deleteMessageForEveryone}
                    className="flex w-full items-center gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.05] px-4 py-3.5 text-left transition hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 text-red-300" />
                    <span>
                      <span className="block text-sm font-semibold text-red-200">
                        {st("Delete for everyone", "Herkesten sil")}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {st(
                          "Remove it for everyone in this chat.",
                          "Bu sohbetteki herkes için kaldırır.",
                        )}
                      </span>
                    </span>
                  </button>
                )}
              </div>

              <div className="flex justify-end border-t border-emerald-300/10 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setMessageDeleteDialog(null)}
                  className="rounded-xl border border-emerald-300/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-slate-100"
                >
                  {st("İptal", "İptal")}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmationDialog && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setConfirmationDialog(null);
              }
            }}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-300/15 bg-[#07130f] shadow-2xl shadow-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirmation-dialog-title"
            >
              <div className="border-b border-emerald-300/10 px-6 py-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${confirmationDialog.danger ? "border-red-400/20 bg-red-500/10 text-red-300" : "border-emerald-300/15 bg-emerald-400/10 text-emerald-300"}`}
                  >
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="confirmation-dialog-title"
                      className="text-base font-semibold text-slate-100"
                    >
                      {confirmationDialog.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-6 text-slate-400">
                      {confirmationDialog.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setConfirmationDialog(null)}
                  className="rounded-xl border border-emerald-300/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-slate-100"
                >
                  {confirmationDialog.cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmationDialog.onConfirm;
                    setConfirmationDialog(null);
                    await action();
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${confirmationDialog.danger ? "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-400/20 hover:bg-red-500/25" : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"}`}
                >
                  {confirmationDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
