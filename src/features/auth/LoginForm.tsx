"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { P5Panel } from "@/components/p5/P5Panel";
import { P5Button } from "@/components/p5/P5Button";
import { P5Tag } from "@/components/p5/P5Tag";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(register ? "/api/auth/register" : "/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(register ? { displayName: name, email, password } : { email, password }),
      });
      const responseText = await response.text();
      let data: { user?: { id?: string }; error?: { message?: string } };
      try {
        data = JSON.parse(responseText) as typeof data;
      } catch {
        throw new Error(responseText.trim()
          ? `The server returned an invalid response (HTTP ${response.status}). Check the server logs.`
          : `The server returned an empty response (HTTP ${response.status}). Restart the app and try again.`);
      }
      if (!response.ok) throw new Error(data.error?.message ?? "Unable to authenticate.");
      if (!data.user?.id) throw new Error("The server did not confirm your account sign-in. Check the server logs.");
      const next = search.get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/maps");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to authenticate.");
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-scene p5-bg halftone scanlines">
      <div className="auth-system">SYS:STEGO-AE · SECURE NETWORK</div>
      <section className="auth-hero">
        <div className="auth-identity"><span className="auth-star gold-pulse">★</span><P5Tag>STEGO-AE · SECURE ACCESS</P5Tag></div>
        <h1>PHANTOM<br /><span>PROTOCOL</span></h1>
        <p>Infiltrate the labyrinth. Decrypt the payload. Escape before you’re detected.</p>
        <div className="auth-hero-rule"><i />STAY GOLD AFTER ENCRYPTION</div>
      </section>
      <div className="auth-form-wrap"><P5Panel className="auth-panel p5-pop-in">
        <P5Tag>PHANTOM THIEVES · ACCESS TERMINAL</P5Tag>
        <h1 className="auth-title">{register ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}<span>.</span></h1>
        <p className="auth-copy">{register ? "Build your identity. Your palace progress will follow." : "Sign in to continue your palace infiltration."}</p>
        <form className="auth-form" onSubmit={submit}>
          {register && <label>Display name<input required minLength={2} maxLength={60} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}
          <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label className="password-field"><span>Password</span><div className="password-input-wrap"><input required type={showPassword ? "text" : "password"} minLength={register ? 6 : undefined} maxLength={128} autoComplete={register ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={register ? "At least 6 characters" : "Your password"} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "HIDE" : "SHOW"}</button></div></label>
          {error && <p role="alert" className="auth-error">{error}</p>}
          <P5Button type="submit" disabled={busy} className="w-full">{busy ? "AUTHENTICATING…" : register ? "CREATE ACCOUNT →" : "ENTER PALACE →"}</P5Button>
        </form>
        <p className="auth-switch">{register ? "Already have an account?" : "New to STEGO-AE?"} <button type="button" onClick={() => { setRegister((value) => !value); setError(""); }}> {register ? "Sign in" : "Create account"}</button></p>
        <p className="auth-policy">Accounts are private. Your password is stored as a one-way hash.</p>
      </P5Panel></div>
      <div className="auth-footer">© STEGO-AE · PALACE NETWORK AUTHENTICATED ACCESS</div>
    </main>
  );
}
