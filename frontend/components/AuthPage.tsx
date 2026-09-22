"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshAccessToken, setAccessToken } from "../lib/auth";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";

type AuthMode = "login" | "register";
type ResetStep = "email" | "code" | "password";

type VerificationStep = "code";

const authStyles = `
  @keyframes mfb-in {
    from { opacity: 0; transform: translateY(18px); filter: blur(4px); }
    to { opacity: 1; transform: translateY(0); filter: blur(0); }
  }

  @keyframes mfb-card-in {
    from { opacity: 0; transform: translateY(22px) scale(.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes mfb-float {
    0%,100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-5px) rotate(.5deg); }
  }

  @keyframes mfb-orb {
    0%,100% { transform:translate(-50%,-50%) scale(.92); opacity:.65; }
    50% { transform:translate(-50%,-50%) scale(1.08); opacity:1; }
  }

  @keyframes mfb-bubble {
    0%,100% { opacity:.72; transform:translateY(0); }
    50% { opacity:1; transform:translateY(-3px); }
  }

  .mfb-in { animation:mfb-in .7s cubic-bezier(.22,1,.36,1) both; }
  .mfb-d1 { animation-delay:.08s; }
  .mfb-d2 { animation-delay:.16s; }
  .mfb-d3 { animation-delay:.24s; }
  .mfb-card-in { animation:mfb-card-in .75s .12s cubic-bezier(.22,1,.36,1) both; }
  .mfb-float { animation:mfb-float 5.5s ease-in-out infinite; }
  .mfb-orb { animation:mfb-orb 5s ease-in-out infinite; }
  .mfb-bubble { animation:mfb-bubble 4.8s ease-in-out infinite; }

  .mfb-auth-scene {
    perspective: 1400px;
    width: 100%;
  }

  .mfb-auth-flipper {
    position: relative;
    width: 100%;
    height: 620px;
    transform-style: preserve-3d;
    transition: transform .72s cubic-bezier(.22,1,.36,1);
  }

  .mfb-auth-flipper.is-register {
    transform: rotateY(180deg);
  }

  .mfb-auth-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .mfb-auth-face-back {
    transform: rotateY(180deg);
  }

  .mfb-mint-card {
    background: rgba(255,255,255,.76);
    border: 1px solid rgba(37,99,62,.13);
    box-shadow: 0 28px 80px rgba(39,91,55,.12);
    backdrop-filter: blur(24px);
  }

  .mfb-mint-input {
    background: rgba(255,255,255,.72);
    color:#183024;
    border-color:rgba(37,99,62,.16);
    transition:border-color .2s ease, box-shadow .2s ease, transform .2s ease;
  }

  .mfb-mint-input::placeholder { color:#8a9d92; }

  .mfb-mint-input:focus {
    border-color:rgba(52,190,119,.55);
    box-shadow:0 0 0 4px rgba(52,190,119,.10);
    transform:translateY(-1px);
  }

  .mfb-auth-page { color:#183024 !important; }

  .mfb-auth-page h1,
  .mfb-auth-page h2,
  .mfb-auth-page h3 { color:#183024; }

  .mfb-auth-page .text-slate-500 { color:#5d7568 !important; }
  .mfb-auth-page .text-slate-600 { color:#536b5f !important; }
  .mfb-auth-page .text-slate-700 { color:#40594c !important; }

  .mfb-register-card .mfb-register-header {
    margin-bottom: 1.15rem;
  }

  .mfb-register-card .mfb-register-form {
    gap: .7rem;
  }

  .mfb-register-card .mfb-register-form .mfb-mint-input {
    padding-top: .62rem;
    padding-bottom: .62rem;
  }

  .mfb-register-card .mfb-register-form .mfb-field-label {
    margin-bottom: .35rem;
  }

  .mfb-register-card .mfb-register-form .mfb-password-label {
    margin-bottom: .35rem;
  }

  .mfb-register-card .mfb-register-form + .mfb-auth-footer {
    margin-top: 1rem;
    padding-top: 1rem;
  }

  .mfb-feature {
    transition:transform .22s ease, background .22s ease, border-color .22s ease;
  }

  .mfb-feature:hover { transform:translateX(5px); }

  .mfb-language-switch {
    display:flex;
    align-items:center;
    gap:2px;
    padding:3px;
    border:1px solid rgba(37,99,62,.12);
    border-radius:999px;
    background:rgba(255,255,255,.58);
    box-shadow:0 10px 28px rgba(39,91,55,.08);
    backdrop-filter:blur(16px);
  }

  .mfb-language-button {
    min-width:38px;
    border-radius:999px;
    padding:6px 9px;
    font-size:11px;
    font-weight:700;
    color:#688074;
    transition:all .2s ease;
  }

  .mfb-language-button:hover { color:#31564a; }

  .mfb-language-button.is-active {
    background:rgba(85,211,154,.20);
    color:#16734c;
    box-shadow:0 3px 10px rgba(39,91,55,.08);
  }

  @media (max-width: 1023px) {
    .mfb-auth-flipper { height:auto; min-height:620px; }
    .mfb-auth-face { position:relative; }
    .mfb-auth-face-back {
      position:absolute;
      min-height:620px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mfb-in,.mfb-card-in,.mfb-float,.mfb-orb,.mfb-bubble { animation:none!important; }
    .mfb-auth-flipper,.mfb-mint-input,.mfb-feature { transition:none!important; }
  }
`;

const AUTH_COPY = {
  tr: {
    platform: "Gerçek zamanlı sohbet platformu",
    badge: "Hızlı ve güvenli",
    heroFirst: "Sohbetin",
    heroSecond: "en doğal hali.",
    join: "Sohbete katıl!",
    online: "Çevrimiçi",
    hello: "Selam! 👋",
    loginEyebrow: "Tekrar hoş geldin",
    registerEyebrow: "Yeni bir başlangıç",
    loginTitle: "Giriş Yap",
    registerTitle: "Üye Ol",
    loginDescription: "Hesabına giriş yaparak sohbetlerine devam et.",
    registerDescription: "Hesabını oluştur ve sohbete kat.",
    username: "Kullanıcı Adı",
    usernamePlaceholder: "Kullanıcı adını gir",
    email: "Email",
    emailPlaceholder: "ornek@email.com",
    password: "Şifre",
    passwordPlaceholder: "Şifreni gir",
    confirmPassword: "Şifre Tekrar",
    confirmPasswordPlaceholder: "Şifreni tekrar gir",
    forgotPassword: "Şifremi unuttum",
    createAccount: "Hesap Oluştur",
    creatingAccount: "Hesap oluşturuluyor...",
    login: "Giriş Yap",
    loggingIn: "Giriş yapılıyor...",
    alreadyHaveAccount: "Zaten hesabın var mı?",
    noAccount: "Hesabın yok mu?",
    apiError: "API'ye bağlanılamadı.",
    passwordMismatch: "Şifreler birbiriyle eşleşmiyor.",
    passwordMin: "Şifre en az 8 karakter olmalıdır.",
    registerError: "Kayıt oluşturulamadı.",
    loginError: "Giriş başarısız.",
    forgotEyebrow: "Şifreni sıfırla",
    forgotTitle: "Şifremi Unuttum",
    forgotDescription:
      "E-posta adresini gir. Şifre sıfırlama kodunu gönderelim.",
    sendResetCode: "Kod Gönder",
    sendingResetCode: "Kod gönderiliyor...",
    resetCode: "Doğrulama Kodu",
    resetCodePlaceholder: "6 haneli kodu gir",
    verifyCode: "Kodu Doğrula",
    verifyingCode: "Kod doğrulanıyor...",
    newPassword: "Yeni Şifre",
    newPasswordDescription: "Hesabın için yeni bir şifre belirle.",
    newPasswordPlaceholder: "Yeni şifreni gir",
    resetPassword: "Şifreyi Güncelle",
    resettingPassword: "Şifre güncelleniyor...",
    resetSuccess: "Şifren başarıyla güncellendi.",
    resetCodeSent: "Doğrulama kodu e-posta adresine gönderildi.",
    backToLogin: "Giriş ekranına dön",
    invalidCode: "Doğrulama kodu geçersiz veya süresi dolmuş.",
    resetError: "Şifre sıfırlanamadı.",
  },
  en: {
    platform: "Real-time chat platform",
    badge: "Fast and secure",
    heroFirst: "Chat",
    heroSecond: "the natural way.",
    join: "Join the conversation!",
    online: "Online",
    hello: "Hello! 👋",
    loginEyebrow: "Welcome back",
    registerEyebrow: "A fresh start",
    loginTitle: "Sign In",
    registerTitle: "Create Account",
    loginDescription: "Sign in to continue your conversations.",
    registerDescription: "Create your account and join the conversation.",
    username: "Username",
    usernamePlaceholder: "Enter your username",
    email: "Email",
    emailPlaceholder: "example@email.com",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter your password",
    forgotPassword: "Forgot password?",
    createAccount: "Create Account",
    creatingAccount: "Creating account...",
    login: "Sign In",
    loggingIn: "Signing in...",
    alreadyHaveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    apiError: "Could not connect to the API.",
    passwordMismatch: "Passwords do not match.",
    passwordMin: "Password must be at least 8 characters.",
    registerError: "Could not create the account.",
    loginError: "Sign in failed.",
    forgotEyebrow: "Reset your password",
    forgotTitle: "Forgot Password",
    forgotDescription:
      "Enter your email address and we'll send you a reset code.",
    sendResetCode: "Send Code",
    sendingResetCode: "Sending code...",
    resetCode: "Verification Code",
    resetCodePlaceholder: "Enter the 6-digit code",
    verifyCode: "Verify Code",
    verifyingCode: "Verifying code...",
    newPassword: "New Password",
    newPasswordDescription: "Choose a new password for your account.",
    newPasswordPlaceholder: "Enter your new password",
    resetPassword: "Reset Password",
    resettingPassword: "Resetting password...",
    resetSuccess: "Your password has been reset successfully.",
    resetCodeSent: "A verification code has been sent to your email.",
    backToLogin: "Back to sign in",
    invalidCode: "The verification code is invalid or has expired.",
    resetError: "Could not reset your password.",
  },
} as const;

export default function AuthPage({
  initialMode = "login",
}: {
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [language, setLanguage] = useState<"tr" | "en">("en");
  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const copy = AUTH_COPY[language];

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialMode !== "login") return;

    let cancelled = false;

    const restoreSession = async () => {
      const restored = await refreshAccessToken();
      if (!cancelled && restored) router.replace("/");
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [initialMode, router]);

  useEffect(() => {
    const handlePopState = () => {
      setMode(window.location.pathname === "/register" ? "register" : "login");
      setError("");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    if (loading || nextMode === mode) return;

    setError("");
    setMode(nextMode);

    const nextPath = nextMode === "register" ? "/register" : "/login";
    window.history.pushState(null, "", nextPath);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/Auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || copy.loginError);
        return;
      }

      setAccessToken(data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("username", data.username);
      router.replace("/");
    } catch {
      setError(copy.apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    if (password.length < 8) {
      setError(copy.passwordMin);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/Auth/register`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || copy.registerError);
        return;
      }

      setVerificationCode("");
      setVerificationMode(true);
      setError("");
    } catch {
      setError(copy.apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(verificationCode)) {
      setError(
        language === "tr"
          ? "Lütfen 6 haneli doğrulama kodunu girin."
          : "Please enter the 6-digit verification code.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/Auth/verify-email`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, verificationCode }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          data.message ||
            (language === "tr"
              ? "Doğrulama kodu hatalı veya süresi dolmuş."
              : "The verification code is invalid or expired."),
        );
        return;
      }

      setAccessToken(data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("username", data.username);
      router.replace("/");
    } catch {
      setError(copy.apiError);
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    if (loading) return;
    setError("");
    setResetCode("");
    setResetStep("email");
    setResetMode(true);
  };

  const backToLogin = () => {
    if (loading) return;
    setError("");
    setResetMode(false);
    setResetStep("email");
    setResetCode("");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/Auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || copy.resetError);
        return;
      }

      setResetStep("code");
      setError("");
    } catch {
      setError(copy.apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(resetCode)) {
      setError(copy.invalidCode);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/Auth/verify-reset-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, verificationCode: resetCode }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || copy.invalidCode);
        return;
      }

      setResetStep("password");
      setError("");
    } catch {
      setError(copy.apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    if (password.length < 8) {
      setError(copy.passwordMin);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/Auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            verificationCode: resetCode,
            newPassword: password,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || copy.resetError);
        return;
      }

      setError("");
      setResetMode(false);
      setResetStep("email");
      setResetCode("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError(copy.apiError);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (next: "tr" | "en") => {
    setLanguage(next);
  };

  return (
    <>
      <style jsx global>
        {authStyles}
      </style>

      <main className="mfb-auth-page relative h-screen overflow-hidden bg-[#e8f8df]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 15% 25%, rgba(170,244,153,.42), transparent 30%), radial-gradient(circle at 82% 70%, rgba(105,221,151,.24), transparent 34%), linear-gradient(135deg,#effbe8 0%,#dff6d8 48%,#c9f0cb 100%)",
          }}
        />

        <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-48 -right-40 h-[600px] w-[600px] rounded-full bg-green-500/[0.08] blur-[150px]" />
        <div className="pointer-events-none absolute right-[-120px] top-[-120px] h-[330px] w-[330px] rounded-full border border-emerald-700/10" />

        <div className="absolute right-5 top-5 z-30 sm:right-8 sm:top-7">
          <div
            className="mfb-language-switch"
            aria-label={language === "tr" ? "Dil seçimi" : "Language selection"}
          >
            <button
              type="button"
              onClick={() => changeLanguage("en")}
              className={`mfb-language-button ${language === "en" ? "is-active" : ""}`}
              aria-pressed={language === "en"}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => changeLanguage("tr")}
              className={`mfb-language-button ${language === "tr" ? "is-active" : ""}`}
              aria-pressed={language === "tr"}
            >
              TR
            </button>
          </div>
        </div>

        <div className="relative z-10 flex h-screen items-center justify-center px-5 py-4 sm:px-8">
          <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_460px]">
            <section className="hidden lg:block">
              <div className="mb-9 flex items-center gap-3 mfb-in mfb-d1">
                <div className="h-12 w-12 overflow-hidden rounded-2xl border border-emerald-300/20 bg-white/60 shadow-[0_0_30px_rgba(74,222,128,0.12)]">
                  <img
                    src="/mfb-chat-logo.png"
                    alt="MFB Chat"
                    className="h-full w-full rounded-2xl object-cover scale-110"
                  />
                </div>

                <div>
                  <h2 className="text-xl font-bold tracking-tight">MFB Chat</h2>
                  <p className="text-xs text-slate-500">{copy.platform}</p>
                </div>
              </div>

              <div className="mb-5 -translate-y-3 inline-flex items-center gap-2 rounded-full border border-emerald-700/10 bg-white/55 px-3 py-1.5 text-xs text-slate-500 mfb-in mfb-d2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                {copy.badge}
              </div>

              <div className="mfb-in mfb-d2 -translate-y-4">
                <h1 className="max-w-xl text-5xl font-bold leading-[1.02] tracking-[-0.04em] xl:text-6xl">
                  {copy.heroFirst}
                  <br />
                  <span className="text-emerald-400">{copy.heroSecond}</span>
                </h1>
              </div>

              <div className="relative mt-3 h-[285px] w-full max-w-[520px] mfb-in mfb-d3">
                <div className="mfb-orb absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full" />

                <div className="mfb-float absolute !left-[30%] !top-[1%] z-10 w-[300px] -translate-x-1/2">
                  <div className="relative overflow-hidden rounded-[38px] border border-emerald-700/15 bg-[#c9f6a9] shadow-[0_28px_80px_rgba(25,180,100,.22)]">
                    <img
                      src="/login-illustration.jpg"
                      alt="MFB Chat"
                      className="block aspect-square w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-900/10 via-transparent to-white/10" />
                  </div>

                  <div className="mfb-bubble absolute -right-7 -top-1 rounded-2xl border border-emerald-700/10 bg-white px-5 py-3 text-sm font-medium text-[#31564a] shadow-[0_14px_35px_rgba(39,91,55,.16)]">
                    <span className="mr-1 inline-block text-emerald-500">
                      •••
                    </span>
                    {copy.join}
                    <span className="absolute -bottom-2 left-8 h-4 w-4 rotate-45 border-b border-r border-emerald-700/10 bg-white" />
                  </div>

                  <div className="absolute -bottom-3 -right-8 flex items-center gap-2 rounded-full border border-emerald-700/10 bg-white/90 px-4 py-2 text-xs font-medium text-[#426052] shadow-[0_12px_28px_rgba(39,91,55,.13)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.65)]" />
                    {copy.online}
                  </div>

                  <div className="absolute -left-10 bottom-8 rounded-2xl border border-emerald-700/10 bg-white/90 px-4 py-2.5 text-sm font-medium text-[#426052] shadow-[0_12px_28px_rgba(39,91,55,.13)]">
                    {copy.hello}
                  </div>
                </div>
              </div>
            </section>

            <section className="w-full">
              <div className="mfb-auth-scene">
                {resetMode ? (
                  <ResetPasswordCard
                    language={language}
                    step={resetStep}
                    email={email}
                    setEmail={setEmail}
                    resetCode={resetCode}
                    setResetCode={setResetCode}
                    password={password}
                    setPassword={setPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    showConfirmPassword={showConfirmPassword}
                    setShowConfirmPassword={setShowConfirmPassword}
                    error={error}
                    loading={loading}
                    onSendCode={handleForgotPassword}
                    onVerifyCode={handleVerifyResetCode}
                    onResetPassword={handleResetPassword}
                    onBack={backToLogin}
                  />
                ) : verificationMode ? (
                  <EmailVerificationCard
                    language={language}
                    email={email}
                    verificationCode={verificationCode}
                    setVerificationCode={setVerificationCode}
                    error={error}
                    loading={loading}
                    onSubmit={handleVerifyEmail}
                  />
                ) : (
                  <div
                    className={`mfb-auth-flipper ${
                      mode === "register" ? "is-register" : ""
                    }`}
                  >
                    <div className="mfb-auth-face">
                      <AuthCard
                        mode="login"
                        language={language}
                        email={email}
                        setEmail={setEmail}
                        username={username}
                        setUsername={setUsername}
                        password={password}
                        setPassword={setPassword}
                        confirmPassword={confirmPassword}
                        setConfirmPassword={setConfirmPassword}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        showConfirmPassword={showConfirmPassword}
                        setShowConfirmPassword={setShowConfirmPassword}
                        error={error}
                        loading={loading}
                        onSubmit={handleLogin}
                        onSwitch={() => switchMode("register")}
                        onForgotPassword={openForgotPassword}
                      />
                    </div>

                    <div className="mfb-auth-face mfb-auth-face-back">
                      <AuthCard
                        mode="register"
                        language={language}
                        email={email}
                        setEmail={setEmail}
                        username={username}
                        setUsername={setUsername}
                        password={password}
                        setPassword={setPassword}
                        confirmPassword={confirmPassword}
                        setConfirmPassword={setConfirmPassword}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        showConfirmPassword={showConfirmPassword}
                        setShowConfirmPassword={setShowConfirmPassword}
                        error={error}
                        loading={loading}
                        onSubmit={handleRegister}
                        onSwitch={() => switchMode("login")}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function AuthCard({
  mode,
  language,
  email,
  setEmail,
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  error,
  loading,
  onSubmit,
  onSwitch,
  onForgotPassword,
}: {
  mode: AuthMode;
  language: "tr" | "en";
  email: string;
  setEmail: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSwitch: () => void;
  onForgotPassword?: () => void;
}) {
  const register = mode === "register";
  const copy = AUTH_COPY[language];

  return (
    <div
      className={`mfb-mint-card mfb-card-in ${register ? "h-[620px] mfb-register-card" : "h-[520px]"} rounded-3xl p-7 sm:p-9`}
    >
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="h-11 w-11 overflow-hidden rounded-xl border border-emerald-300/20 bg-white/60">
          <img
            src="/mfb-chat-logo.png"
            alt="MFB Chat"
            className="h-full w-full object-cover scale-110"
          />
        </div>
        <div>
          <h2 className="font-bold">MFB Chat</h2>
          <p className="text-xs text-slate-500">{copy.platform}</p>
        </div>
      </div>

      <div className={`mb-7 ${register ? "mfb-register-header" : ""}`}>
        <p className="mb-2 text-sm font-medium text-emerald-500">
          {register ? copy.registerEyebrow : copy.loginEyebrow}
        </p>

        <h2 className="text-3xl font-bold tracking-tight">
          {register ? copy.registerTitle : copy.loginTitle}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {register ? copy.registerDescription : copy.loginDescription}
        </p>
      </div>

      {register ? (
        <form onSubmit={onSubmit} className="space-y-4 mfb-register-form">
          <Field
            id="username"
            label={copy.username}
            placeholder={copy.usernamePlaceholder}
            icon={<User size={18} />}
            value={username}
            onChange={setUsername}
            minLength={3}
          />

          <Field
            id="register-email"
            label={copy.email}
            placeholder={copy.emailPlaceholder}
            icon={<Mail size={18} />}
            type="email"
            value={email}
            onChange={setEmail}
          />

          <PasswordField
            id="register-password"
            label={copy.password}
            placeholder={copy.passwordPlaceholder}
            value={password}
            onChange={setPassword}
            visible={showPassword}
            setVisible={setShowPassword}
            language={language}
          />

          <PasswordField
            id="confirmPassword"
            label={copy.confirmPassword}
            placeholder={copy.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirmPassword}
            setVisible={setShowConfirmPassword}
            language={language}
          />

          {error && <ErrorBox message={error} />}

          <SubmitButton
            loading={loading}
            text={copy.createAccount}
            loadingText={copy.creatingAccount}
          />
        </form>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field
            id="login-email"
            label={copy.email}
            placeholder={copy.emailPlaceholder}
            icon={<Mail size={18} />}
            type="email"
            value={email}
            onChange={setEmail}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700"
              >
                {copy.password}
              </label>
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={loading}
                className="text-xs text-emerald-500/80 transition-colors hover:text-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copy.forgotPassword}
              </button>
            </div>

            <PasswordField
              id="login-password"
              label=""
              placeholder={copy.passwordPlaceholder}
              value={password}
              onChange={setPassword}
              visible={showPassword}
              setVisible={setShowPassword}
              language={language}
            />
          </div>

          {error && <ErrorBox message={error} />}

          <SubmitButton
            loading={loading}
            text={copy.login}
            loadingText={copy.loggingIn}
          />
        </form>
      )}

      <div className="mfb-auth-footer mt-7 border-t border-emerald-700/10 pt-6 text-center">
        <p className="text-sm text-slate-500">
          {register ? copy.alreadyHaveAccount : copy.noAccount}{" "}
          <button
            type="button"
            onClick={onSwitch}
            className="font-semibold text-emerald-500 transition hover:text-emerald-400"
          >
            {register ? copy.login : copy.registerTitle}
          </button>
        </p>
      </div>
    </div>
  );
}

function EmailVerificationCard({
  language,
  email,
  verificationCode,
  setVerificationCode,
  error,
  loading,
  onSubmit,
}: {
  language: "tr" | "en";
  email: string;
  verificationCode: string;
  setVerificationCode: (value: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const isTr = language === "tr";

  return (
    <div className="mfb-mint-card mfb-card-in h-[520px] rounded-3xl p-7 sm:p-9">
      <div className="mb-7">
        <p className="mb-2 text-sm font-medium text-emerald-500">
          {isTr ? "E-posta doğrulama" : "Email verification"}
        </p>
        <h2 className="text-3xl font-bold tracking-tight">
          {isTr ? "Kodunu doğrula" : "Verify your email"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isTr
            ? `${email} adresine gönderilen 6 haneli kodu gir.`
            : `Enter the 6-digit code sent to ${email}.`}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="verification-code"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            {isTr ? "Doğrulama Kodu" : "Verification Code"}
          </label>
          <input
            id="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            value={verificationCode}
            onChange={(e) =>
              setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            required
            className="mfb-mint-input w-full rounded-xl border py-3.5 px-4 text-center text-lg font-bold tracking-[0.45em] outline-none"
          />
        </div>

        {error && <ErrorBox message={error} />}

        <SubmitButton
          loading={loading}
          text={isTr ? "Kodu Doğrula" : "Verify Code"}
          loadingText={isTr ? "Doğrulanıyor..." : "Verifying..."}
        />
      </form>
    </div>
  );
}

function ResetPasswordCard({
  language,
  step,
  email,
  setEmail,
  resetCode,
  setResetCode,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  error,
  loading,
  onSendCode,
  onVerifyCode,
  onResetPassword,
  onBack,
}: {
  language: "tr" | "en";
  step: ResetStep;
  email: string;
  setEmail: (value: string) => void;
  resetCode: string;
  setResetCode: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (value: boolean) => void;
  error: string;
  loading: boolean;
  onSendCode: (e: React.FormEvent) => void;
  onVerifyCode: (e: React.FormEvent) => void;
  onResetPassword: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  const copy = AUTH_COPY[language];

  const title =
    step === "email"
      ? copy.forgotTitle
      : step === "code"
        ? copy.resetCode
        : copy.newPassword;

  const description =
    step === "email"
      ? copy.forgotDescription
      : step === "code"
        ? copy.resetCodeSent
        : copy.newPasswordDescription;

  return (
    <div className="mfb-mint-card mfb-card-in h-[520px] rounded-3xl p-7 sm:p-9">
      <div className="mb-7">
        <p className="mb-2 text-sm font-medium text-emerald-500">
          {copy.forgotEyebrow}
        </p>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      {step === "email" && (
        <form onSubmit={onSendCode} className="space-y-5">
          <Field
            id="forgot-email"
            label={copy.email}
            placeholder={copy.emailPlaceholder}
            icon={<Mail size={18} />}
            type="email"
            value={email}
            onChange={setEmail}
          />
          {error && <ErrorBox message={error} />}
          <SubmitButton
            loading={loading}
            text={copy.sendResetCode}
            loadingText={copy.sendingResetCode}
          />
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onVerifyCode} className="space-y-5">
          <div>
            <label
              htmlFor="reset-code"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              {copy.resetCode}
            </label>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              value={resetCode}
              onChange={(e) =>
                setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder={copy.resetCodePlaceholder}
              required
              className="mfb-mint-input w-full rounded-xl border py-3.5 px-4 text-center text-lg font-bold tracking-[0.45em] outline-none"
            />
          </div>

          {error && <ErrorBox message={error} />}

          <SubmitButton
            loading={loading}
            text={copy.verifyCode}
            loadingText={copy.verifyingCode}
          />
        </form>
      )}

      {step === "password" && (
        <form onSubmit={onResetPassword} className="space-y-4">
          <PasswordField
            id="reset-password"
            label={copy.newPassword}
            placeholder={copy.newPasswordPlaceholder}
            value={password}
            onChange={setPassword}
            visible={showPassword}
            setVisible={setShowPassword}
            language={language}
          />
          <PasswordField
            id="reset-confirm-password"
            label={copy.confirmPassword}
            placeholder={copy.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirmPassword}
            setVisible={setShowConfirmPassword}
            language={language}
          />

          {error && <ErrorBox message={error} />}

          <SubmitButton
            loading={loading}
            text={copy.resetPassword}
            loadingText={copy.resettingPassword}
          />
        </form>
      )}

      <div className="mfb-auth-footer mt-7 border-t border-emerald-700/10 pt-6 text-center">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-emerald-500 transition hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.backToLogin}
        </button>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  placeholder,
  icon,
  type = "text",
  value,
  onChange,
  minLength,
}: {
  id: string;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mfb-field-label mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="group relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-500">
          {icon}
        </span>

        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={minLength}
          required
          className="mfb-mint-input w-full rounded-xl border py-3.5 pl-11 pr-4 text-sm outline-none hover:border-emerald-400/30"
        />
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  visible,
  setVisible,
  language,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  setVisible: (value: boolean) => void;
  language: "tr" | "en";
}) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mfb-password-label mb-2 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}

      <div className="group relative">
        <LockKeyhole
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-500"
        />

        <input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="mfb-mint-input w-full rounded-xl border py-3.5 pl-11 pr-12 text-sm outline-none hover:border-emerald-400/30"
        />

        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-emerald-400/10 hover:text-emerald-500"
          aria-label={
            visible
              ? language === "tr"
                ? "Şifreyi gizle"
                : "Hide password"
              : language === "tr"
                ? "Şifreyi göster"
                : "Show password"
          }
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-sm text-red-500">
      {message}
    </div>
  );
}

function SubmitButton({
  loading,
  text,
  loadingText,
}: {
  loading: boolean;
  text: string;
  loadingText: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#55d39a] py-3.5 text-sm font-bold text-[#07351f] shadow-[0_14px_34px_rgba(46,180,105,.20)] transition-all hover:-translate-y-0.5 hover:bg-[#62dda4] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#07351f]/20 border-t-[#07351f]" />
          {loadingText}
        </>
      ) : (
        <>
          {text}
          <ArrowRight
            size={17}
            className="transition-transform group-hover:translate-x-1"
          />
        </>
      )}
    </button>
  );
}
