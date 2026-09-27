"use client";

import { FileText, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function Navbar({
  onHome,
  workspace,
  busy,
  privateUpload,
}: {
  onHome: () => void;
  workspace: boolean;
  busy: boolean;
  privateUpload: boolean;
}) {
  const [signInPending, setSignInPending] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [signInError, setSignInError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasAccount(Boolean(session?.user && !session.user.is_anonymous));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function beginSignIn() {
    setSignInError("");
    setSignInPending(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw new Error(`Could not read your session: ${error.message}`);

      const options = { redirectTo: window.location.origin };
      const result = data.session?.user.is_anonymous
        ? await supabase.auth.linkIdentity({ provider: "google", options })
        : await supabase.auth.signInWithOAuth({ provider: "google", options });

      if (result.error) throw new Error(`Could not start Google sign-in: ${result.error.message}`);
    } catch (error) {
      setSignInError(
        error instanceof Error ? error.message : "Google sign-in could not be started.",
      );
      setSignInPending(false);
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button
          className="brand brand-button"
          type="button"
          onClick={onHome}
          disabled={busy}
          aria-label="FormFriend home"
        >
          <span className="brand-mark" aria-hidden="true">
            <FileText size={19} strokeWidth={2.1} />
            <span className="brand-spark">
              <Sparkles size={10} strokeWidth={2.4} />
            </span>
          </span>
          <span>formfriend</span>
        </button>

        {!workspace ? (
          <>
            <nav className="landing-nav" aria-label="Main navigation">
              <a href="#how-it-works">How it works</a>
              <a href="#who-its-for">Who it&apos;s for</a>
            </nav>
            <div className="navbar-actions">
              <span className="header-note">
                <ShieldCheck size={14} />
                <span>No account needed</span>
              </span>
              {hasAccount ? (
                <span className="signed-in-badge">
                  <span className="signed-in-dot" />
                  Signed in
                </span>
              ) : (
                <button
                  className="button button-outline sign-in-button"
                  type="button"
                  onClick={() => void beginSignIn()}
                  disabled={signInPending}
                  title="Sign in with Google to keep your account associated with this session"
                >
                  {signInPending ? "Opening Google…" : "Sign in"}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="workspace-header-right">
            <span className="preview-badge">
              <span className="preview-dot" />
              {busy ? "Saving securely" : privateUpload ? "Saved privately" : "Sample preview"}
            </span>
            <span className="header-divider" />
            <span className="privacy-note">
              <LockKeyhole size={13} />
              Private, no-account upload
            </span>
          </div>
        )}
      </div>
      {signInError ? (
        <p className="sign-in-error" role="alert">
          {signInError}
        </p>
      ) : null}
    </header>
  );
}
