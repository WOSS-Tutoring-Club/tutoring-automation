// @ts-nocheck

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { supabase } from "@/services/supabase";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginRole, setLoginRole] = useState<'tutee'|'tutor'>("tutee");

  const router = useRouter();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    console.log("Login attempt started...");

    try {
      // Transform email for @hdsb.ca based on selected role (append +tutee/+tutor)
      const transformEmailForRole = (raw: string, role: 'tutor'|'tutee'): string => {
        try {
          const trimmed = (raw || '').trim();
          const atIdx = trimmed.indexOf('@');
          if (atIdx <= 0) return trimmed;
          const local = trimmed.slice(0, atIdx);
          const domain = trimmed.slice(atIdx + 1);
          if (!/^[Hh][Dd][Ss][Bb]\.ca$/.test(domain)) return trimmed; // only tag hdsb.ca
          const tag = role.toLowerCase();
          const lowerLocal = local.toLowerCase();
          if (lowerLocal.endsWith('+' + tag)) return trimmed;
          return `${local}+${tag}@${domain}`;
        } catch {
          return raw;
        }
      };

      const emailToUse = transformEmailForRole(email, loginRole);

      const { error } = await signIn(emailToUse, password);

      console.log("Sign in response:", { error });

      if (error) {
        console.error("Sign in error:", error);
        setError(error.message);
        setIsLoading(false);
        return;
      }

      console.log("Sign in successful! Ensuring server cookies then redirecting to root...");

      try {
        const { data: { session } } = await supabase.auth.getSession();

        // If session isn't ready yet (first login race), wait for auth event and redirect then
        if (!session?.access_token) {
          try {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
              async (event, sess) => {
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                  try {
                    // Ensure backend account once more in case it wasn't created
                    const token = sess?.access_token;
                    if (token) {
                      await fetch('/auth/callback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ event: 'SIGNED_IN', session: sess }),
                      });
                      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/role`, {
                        headers: { Authorization: `Bearer ${token}` },
                        credentials: 'include',
                      });
                      if (r.ok) {
                        const j = await r.json();
                        const role = j?.role;
                        if (role === 'admin') { subscription.unsubscribe(); router.replace('/admin/dashboard'); return; }
                        if (role === 'tutor') { subscription.unsubscribe(); router.replace('/tutor/dashboard'); return; }
                        if (role === 'tutee') { subscription.unsubscribe(); router.replace('/tutee/dashboard'); return; }
                      }
                    }
                  } catch {}
                  // As last resort, go to root
                  subscription.unsubscribe();
                  if (typeof window !== 'undefined') window.location.replace('/'); else router.replace('/');
                }
              }
            );
            // Safety fallback timeout
            setTimeout(() => {
              try { subscription.unsubscribe(); } catch {}
              if (typeof window !== 'undefined') window.location.replace('/'); else router.replace('/');
            }, 1200);
          } catch {}
          return;
        }

        // Ensure backend account exists before role resolution (handles first-login race)
        try {
          const token = session?.access_token;
          if (token) {
            // Prefer localStorage hint saved during signup
            let pendingType = null as unknown as 'tutor'|'tutee'|null;
            let firstName: string | undefined;
            let lastName: string | undefined;
            let schoolId: string | undefined;
            try {
              pendingType = (typeof window !== 'undefined') ? (localStorage.getItem('signup_account_type') as any) : null;
              firstName = (typeof window !== 'undefined') ? (localStorage.getItem('signup_first_name') || undefined) : undefined;
              lastName = (typeof window !== 'undefined') ? (localStorage.getItem('signup_last_name') || undefined) : undefined;
              schoolId = (typeof window !== 'undefined') ? (localStorage.getItem('signup_school_id') || undefined) : undefined;
            } catch {}

            // Fallback to user metadata
            if (!pendingType) {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                const metaType = (user?.user_metadata as any)?.account_type;
                if (metaType === 'tutor' || metaType === 'tutee') {
                  pendingType = metaType;
                  firstName = firstName || (user?.user_metadata as any)?.first_name;
                  lastName = lastName || (user?.user_metadata as any)?.last_name;
                  schoolId = schoolId || (user?.user_metadata as any)?.school_id;
                }
              } catch {}
            }

            if (pendingType) {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/account/ensure`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                  account_type: pendingType,
                  first_name: firstName,
                  last_name: lastName,
                  school_id: schoolId,
                }),
              });
              try {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('signup_account_type');
                  localStorage.removeItem('signup_first_name');
                  localStorage.removeItem('signup_last_name');
                  localStorage.removeItem('signup_school_id');
                }
              } catch {}
            }
          }
        } catch (ensureErr) {
          console.log('ensure account failed (non-fatal):', ensureErr);
        }

        // Proactively set server-side auth cookies to avoid first-login race conditions
        await fetch('/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ event: 'SIGNED_IN', session }),
        });
      } catch (e) {
        // Non-fatal; middleware/listener may still handle it
        console.log('Post-signin cookie sync failed (non-fatal):', e);
      }

      // Determine role directly and navigate immediately (robust against first-login races)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/role`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            credentials: 'include',
          });
          if (resp.ok) {
            const json = await resp.json();
            const role = json?.role;
            if (role === 'admin') { router.replace('/admin/dashboard'); return; }
            if (role === 'tutor') { router.replace('/tutor/dashboard'); return; }
            if (role === 'tutee') { router.replace('/tutee/dashboard'); return; }
          }
        }
      } catch (e) {
        console.log('Role fetch failed (non-fatal), falling back to root redirect');
      }

      // Fallback: hard navigation to root so middleware/listener run on a fresh request
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      } else {
        router.replace('/');
      }
      return;
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-blue-200 via-indigo-200 to-purple-200 blur-3xl opacity-70 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70 animate-pulse" />
      </div>

      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

      <div className="mx-auto max-w-7xl px-6 min-h-screen flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-10">
          {/* Left side copy */}
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-blue-200">
              Welcome back
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900">Sign in to continue</h1>
            <p className="mt-4 text-gray-600 leading-7">Access your tutor or tutee dashboard, manage sessions, and keep learning moving.</p>
          </div>

          {/* Auth card */}
          <div className="relative order-first lg:order-none">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 opacity-30 blur-2xl animate-pulse" />
            <div className="relative bg-white/80 backdrop-blur shadow-xl ring-1 ring-gray-200 rounded-3xl p-6 sm:p-8">
              <div className="flex justify-center mb-4">
                <Image src="/logo.png" alt="Tutoring Logo" width={56} height={56} className="rounded-md shadow" />
              </div>
              <h2 className="text-center text-2xl font-bold text-gray-900">Sign in</h2>
              <p className="mt-1 text-center text-sm text-gray-600">New here? <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">Register</Link></p>

              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div className="rounded-md -space-y-px">
                  {/* Role selector */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Log in as</label>
                    <div className="inline-flex rounded-full bg-gray-100 p-1 ring-1 ring-inset ring-gray-200">
                      <button
                        type="button"
                        onClick={() => setLoginRole('tutee')}
                        className={`px-4 py-1.5 text-sm rounded-full transition ${loginRole==='tutee' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
                      >
                        Tutee
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginRole('tutor')}
                        className={`px-4 py-1.5 text-sm rounded-full transition ${loginRole==='tutor' ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:text-gray-900'}`}
                      >
                        Tutor
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email-address" className="sr-only">Email address</label>
                    <input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="appearance-none rounded-xl relative block w-full h-15 px-3 py-2 border border-gray-200 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:z-10 sm:text-sm shadow-sm"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <label htmlFor="password" className="sr-only">Password</label>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="appearance-none w-full h-15 px-3 py-2 pr-12 mt-5 rounded-xl border border-gray-200 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:z-10 sm:text-sm shadow-sm"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 top-5 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Image src={showPassword ? "/Hide.svg" : "/Show.svg"} alt={showPassword ? "Hide password" : "Show password"} width={24} height={24} className="object-contain mr-2" />
                    </button>
                  </div>
                </div>

                {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full h-15 flex justify-center items-center text-[15px] font-bold py-2 px-4 border border-transparent text-sm rounded-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 shadow-md"
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </button>
                </div>

                <div className="text-sm text-right">
                  <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-700">Forgot your password?</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
