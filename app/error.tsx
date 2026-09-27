"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="error-screen">
      <div className="error-card">
        <span className="error-icon">
          <AlertCircle size={21} />
        </span>
        <p className="error-eyebrow">A SMALL DETOUR</p>
        <h1>That didn’t go as planned.</h1>
        <p className="error-description">
          Something interrupted FormFriend. Your document hasn’t been sent
          anywhere. You can try loading this view again.
        </p>
        <button className="button button-primary" type="button" onClick={retry}>
          <RotateCcw size={15} />
          Try again
        </button>
      </div>
    </main>
  );
}
