"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, LockSimple } from "@phosphor-icons/react";
import { useApp } from "./providers";
import { Ticket } from "./ticket";
import { ResaleDemo, type DemoProgress } from "@/lib/resale-demo";
import { euros, maxPrice, type Receipt } from "@/lib/types";

export function DemoResale() {
  const { snapshot } = useApp();
  const event = snapshot.events.find((e) => e.address === snapshot.demoEvent);
  const engine = useRef<ResaleDemo | null>(null);
  const locked = useRef(false);
  const [progress, setProgress] = useState<DemoProgress>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<"seller" | "buyer">("seller");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [price, setPrice] = useState("60.00");
  const buyerPanel = useRef<HTMLElement>(null);
  const priceInput = useRef<HTMLInputElement>(null);
  const cap = event ? maxPrice(event) : 2750;
  const sold = !!progress.sale?.ok;
  const listed = !!progress.listing?.ok;
  const asking = progress.listing?.price || cap;
  const showPriceError =
    progress.cap &&
    progress.cap.price === Math.round(Number(price.replace(",", ".")) * 100);
  const royalty = event ? Math.floor((asking * event.royaltyBps) / 10000) : 0;
  const fee = Math.floor((asking * 200) / 10000);
  const disabled = !ready || !snapshot.ready || !!busy;

  useEffect(() => {
    if (!event) return;
    try {
      engine.current = new ResaleDemo(
        event,
        localStorage,
        undefined,
        (next, status) => {
          setProgress(next);
          if (status) setBusy(status);
        },
      );
      setProgress(engine.current.progress);
      if (engine.current.progress.listing) setActiveSide("buyer");
      setReady(true);
    } catch {
      setError(
        "This browser could not open the demo. Allow site storage, then reload.",
      );
    }
    // Event rules are immutable. A ledger refresh must not replace a running demo.
  }, [event?.address]);

  async function act(action: "list" | "transfer" | "buy") {
    const demo = engine.current;
    if (!demo || locked.current) return;
    const amount = Math.round(Number(price.replace(",", ".")) * 100);
    if (
      action === "list" &&
      (!/^\d+(?:[.,]\d{1,2})?$/.test(price.trim()) ||
        amount < 1 ||
        !Number.isSafeInteger(amount))
    ) {
      setError("Enter a price with up to two decimal places.");
      return;
    }
    locked.current = true;
    setError(null);
    setActiveSide(action === "buy" ? "buyer" : "seller");
    setBusy("Preparing the ticket…");
    try {
      const next = await (action === "list"
        ? demo.list(amount)
        : action === "transfer"
          ? demo.tryTransfer()
          : demo.buy());
      setProgress(next);
      if (next.listing && !next.sale) {
        setActiveSide("buyer");
        if (window.matchMedia("(max-width: 760px)").matches)
          buyerPanel.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
            block: "nearest",
          });
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The request could not be completed. Try again.",
      );
    } finally {
      setBusy(null);
      locked.current = false;
    }
  }

  const networkQuery =
    snapshot.network === "localnet"
      ? "custom&customUrl=http%3A%2F%2F127.0.0.1%3A8920"
      : "devnet";
  function transaction(label: string, receipt?: Receipt) {
    if (!receipt?.signature) return null;
    return (
      <li>
        <a
          href={`https://explorer.solana.com/tx/${receipt.signature}?cluster=${networkQuery}`}
          target="_blank"
          rel="noreferrer"
        >
          {label}
          <ArrowRight size={14} />
        </a>
      </li>
    );
  }

  return (
    <div className="container page-content demo-resale">
      <div className="demo-heading">
        <h1>Try a ticket resale.</h1>
      </div>
      <div className="demo-split">
        <section className="demo-person" aria-labelledby="seller-title">
          <div className="demo-person-heading">
            <h2 id="seller-title">Seller</h2>
            <span>{sold ? "Ticket sold" : listed ? "Listed" : ""}</span>
          </div>
          {event && !sold && (
            <Ticket
              event={event}
              className="demo-split-ticket"
              side={
                <>
                  <span className="stub-label">Original price</span>
                  <strong className="ticket-price mono">
                    {euros(event.facePrice)}
                  </strong>
                  <span className="stub-label resale-label">Resale cap</span>
                  <strong className="cap-price mono">{euros(cap)}</strong>
                </>
              }
            />
          )}
          {sold ? (
            <div className="demo-seller-receipt">
              <Check size={20} />
              <p>
                Received{" "}
                <strong className="mono">
                  {euros(asking - royalty - fee)}
                </strong>
                .
              </p>
            </div>
          ) : listed ? (
            <div className="demo-confirmation">
              <Check size={20} />
              <p>
                Listed at <strong className="mono">{euros(asking)}</strong>.
              </p>
            </div>
          ) : (
            <form
              className="demo-list-form"
              onSubmit={(e) => {
                e.preventDefault();
                void act("list");
              }}
            >
              <label htmlFor="demo-price">Asking price</label>
              <div className="demo-price-field">
                <span aria-hidden="true">€</span>
                <input
                  id="demo-price"
                  ref={priceInput}
                  inputMode="decimal"
                  autoComplete="off"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setError(null);
                  }}
                  disabled={disabled}
                  aria-describedby="demo-price-result"
                />
              </div>
              <div
                id="demo-price-result"
                className="demo-price-result"
                aria-live="polite"
              >
                {showPriceError && progress.cap && (
                  <>
                    <p className="error-text">
                      {euros(progress.cap.price)} exceeds the {euros(cap)} cap.
                    </p>
                    <button
                      type="button"
                      className="text-button"
                      disabled={disabled}
                      onClick={() => {
                        setPrice((cap / 100).toFixed(2));
                        priceInput.current?.focus();
                      }}
                    >
                      Use {euros(cap)} <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </div>
              <button className="button signal" disabled={disabled}>
                {activeSide === "seller" && busy ? busy : "List ticket"}
                {!busy && <ArrowRight size={18} />}
              </button>
            </form>
          )}
          {!listed && !sold && (
            <details className="demo-transfer-test">
              <summary>Test a direct transfer</summary>
              {progress.direct ? (
                <p className="error-text">
                  Transfer refused. The ticket stays with the seller.
                </p>
              ) : (
                <button
                  className="text-button"
                  disabled={disabled}
                  onClick={() => void act("transfer")}
                >
                  Send directly to the buyer <ArrowRight size={14} />
                </button>
              )}
            </details>
          )}
        </section>
        <section
          ref={buyerPanel}
          className="demo-person demo-buyer"
          aria-labelledby="buyer-title"
        >
          <div className="demo-person-heading">
            <h2 id="buyer-title">Buyer</h2>
            <span>
              {sold ? "Ticket received" : listed ? "Ready to buy" : ""}
            </span>
          </div>
          {listed && event ? (
            <>
              <Ticket
                event={event}
                className="demo-split-ticket"
                side={
                  <>
                    <span className="stub-label">
                      {sold ? "You paid" : "Resale price"}
                    </span>
                    <strong className="ticket-price mono">
                      {euros(asking)}
                    </strong>
                  </>
                }
              />
              {sold ? (
                <div className="demo-confirmation">
                  <Check size={20} />
                  <p>The ticket is now yours.</p>
                </div>
              ) : (
                <button
                  className="button signal demo-buy-button"
                  disabled={disabled}
                  onClick={() => void act("buy")}
                >
                  {activeSide === "buyer" && busy
                    ? busy
                    : `Buy ticket for ${euros(asking)}`}
                  {!busy && <ArrowRight size={18} />}
                </button>
              )}
              {sold && (
                <dl className="demo-payment-split">
                  <dt>Seller</dt>
                  <dd className="mono">{euros(asking - royalty - fee)}</dd>
                  <dt>Organizer royalty</dt>
                  <dd className="mono">{euros(royalty)}</dd>
                  <dt>Fairtix</dt>
                  <dd className="mono">{euros(fee)}</dd>
                </dl>
              )}
            </>
          ) : (
            <div className="demo-buyer-waiting">
              <LockSimple size={26} />
              <p>List the ticket on the seller side.</p>
            </div>
          )}
        </section>
      </div>
      <div className="demo-feedback" aria-live="polite">
        {busy && (
          <p className="sr-only" role="status">
            {busy}
          </p>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </div>
      {(progress.primary ||
        progress.cap ||
        progress.direct ||
        progress.listing ||
        progress.sale) && (
        <section className="demo-transactions" aria-label="Solana transactions">
          <h2>Solana transactions</h2>
          <ol>
            {transaction("Ticket issued", progress.primary)}
            {transaction("Price above cap refused", progress.cap)}
            {transaction("Direct transfer refused", progress.direct)}
            {transaction("Ticket listed", progress.listing)}
            {transaction("Ticket and payment settled", progress.sale)}
          </ol>
        </section>
      )}
      {sold && (
        <button
          className="text-button demo-restart"
          disabled={disabled}
          onClick={() => {
            engine.current?.restart();
            setError(null);
            setPrice("60.00");
            setActiveSide("seller");
          }}
        >
          Try another resale
        </button>
      )}
    </div>
  );
}
