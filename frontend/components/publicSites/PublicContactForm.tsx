"use client";

import { useState } from "react";
import { submitPublicContact } from "../../lib/public-sites/api";

export default function PublicContactForm({ entityType, slug }: { entityType: string; slug: string }) {
  const [channel, setChannel] = useState<"EMAIL" | "WECHAT">("EMAIL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SENT" | "ERROR">("IDLE");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("IDLE");
    try {
      await submitPublicContact({ entityType, slug, name, email, message, channel });
      setStatus("SENT");
      setMessage("");
    } catch {
      setStatus("ERROR");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Contact (via RRE)</div>
      <div className="mt-2 text-xs text-gray-500">
        Contact is routed through RedRooEnergy controlled dispatch. No direct email/WeChat IDs are shown.
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs ${channel === "EMAIL" ? "font-semibold" : ""}`}
          onClick={() => setChannel("EMAIL")}
        >
          Email
        </button>
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs ${channel === "WECHAT" ? "font-semibold" : ""}`}
          onClick={() => setChannel("WECHAT")}
        >
          WeChat
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        <input
          className="rounded-xl border p-2 text-sm"
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <input
          className="rounded-xl border p-2 text-sm"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <textarea
          className="rounded-xl border p-2 text-sm"
          placeholder="Message"
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
      </div>

      <button className="mt-3 rounded-xl border px-4 py-2 text-sm font-semibold" type="submit">
        Send
      </button>

      {status === "SENT" ? <div className="mt-2 text-sm">Sent.</div> : null}
      {status === "ERROR" ? <div className="mt-2 text-sm">Failed. Try again.</div> : null}
    </form>
  );
}
