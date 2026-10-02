"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, ArrowRight } from "@phosphor-icons/react";
import { useSession } from "./session";
import { useApp } from "./providers";
import { euros, shortAddress } from "@/lib/types";

export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const session = useSession(),
    app = useApp(),
    pathname = usePathname(),
    [account, setAccount] = useState(false);
  return (
    <>
      <header className="site-header container">
        <Link className="wordmark" href="/" aria-label="Fairtix home">
          fairtix<span>.</span>
        </Link>
        {pathname !== "/demo" && (
          <nav aria-label="Main navigation">
            <Link
              aria-current={pathname === "/" ? "page" : undefined}
              href="/#events"
            >
              Events
            </Link>
            <Link
              aria-current={pathname === "/tickets" ? "page" : undefined}
              href="/tickets"
            >
              My tickets
            </Link>
            <Link
              aria-current={pathname === "/organizer" ? "page" : undefined}
              href="/organizer"
            >
              For organizers
            </Link>
          </nav>
        )}
        {pathname !== "/demo" && (
          <button
            className="account-button"
            onClick={() =>
              session.address
                ? setAccount(true)
                : session.emailEnabled
                  ? session.login()
                  : setAccount(true)
            }
          >
            {session.address
              ? session.mode === "demo"
                ? session.label
                : "Your account"
              : session.emailEnabled
                ? "Sign in"
                : "Try demo"}
            <ArrowRight size={16} />
          </button>
        )}
      </header>
      <main id="main">
        {!app.snapshot.ready && (
          <div className="container">
            <p className="system-message" role="status">
              {app.snapshot.message ||
                "The live demo is not available yet. Purchases are disabled."}
            </p>
          </div>
        )}
        {app.message && (
          <div className="container">
            <p className="system-message" role="status">
              {app.message}
              <button
                className="text-button"
                onClick={() => app.setMessage(null)}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </p>
          </div>
        )}
        {children}
      </main>
      <footer className="site-footer container">
        <Link className="wordmark" href="/">
          fairtix.
        </Link>
        <div>
          <Link href="/demo">Try the demo</Link>
          <Link href="/about">About Fairtix</Link>
          <Link href="/project">WHU project</Link>
        </div>
      </footer>
      {account && (
        <Dialog
          title={
            session.address
              ? session.mode === "demo"
                ? session.label
                : "Your account"
              : "Try Fairtix"
          }
          onClose={() => setAccount(false)}
        >
          {session.address ? (
            <>
              <p>
                {session.mode === "demo"
                  ? "Saved in this browser."
                  : session.label}
              </p>
              <dl className="account-details">
                <dt>Demo balance</dt>
                <dd className="mono">{euros(app.snapshot.balance)}</dd>
                <dt>Account</dt>
                <dd className="mono">{shortAddress(session.address)}</dd>
              </dl>
              <button
                className="button"
                disabled={!!app.busy || !app.snapshot.ready}
                onClick={() => {
                  void app.addCredits().catch((e) => app.setMessage(e.message));
                }}
              >
                Add €100 to demo balance
              </button>
              <>
                {session.mode === "demo" && (
                  <button
                    className="text-button account-signout"
                    disabled={!!app.busy}
                    onClick={() => {
                      void session
                        .switchDemo()
                        .then(() => setAccount(false))
                        .catch((e) => app.setMessage(e.message));
                    }}
                  >
                    Switch to demo account{" "}
                    {session.demoAccount === 1 ? "2" : "1"}
                  </button>
                )}
              </>
              {session.mode === "demo" && (
                <Link
                  href="/demo"
                  className="text-button account-signout"
                  onClick={() => setAccount(false)}
                >
                  Try the resale demo
                </Link>
              )}
              <button
                className="text-button account-signout"
                disabled={!!app.busy}
                onClick={() => {
                  session.logout();
                  setAccount(false);
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <p>Buy and resell tickets in this browser.</p>
              <button
                className="button"
                onClick={() => {
                  void session.startDemo();
                  setAccount(false);
                }}
              >
                Start demo account
              </button>
              {session.emailEnabled && (
                <button
                  className="text-button account-signout"
                  onClick={() => {
                    session.login();
                    setAccount(false);
                  }}
                >
                  Sign in with email
                </button>
              )}
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
