"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import type { UploadedAttachmentRef } from "./types";

type Props = {
  authHeaders?: Record<string, string>;
  disabled?: boolean;
  onAttachmentsChange: (attachments: UploadedAttachmentRef[]) => void;
};

const ACCEPT = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",");

export default function AttachmentPicker({ authHeaders, disabled, onAttachmentsChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<UploadedAttachmentRef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadOne(file: File) {
    const start = await fetch("/api/chat/attachments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authHeaders || {}),
      },
      body: JSON.stringify({
        fileName: file.name,
        mime: file.type,
        size: file.size,
      }),
    });

    const startJson = await start.json().catch(() => ({}));
    if (!start.ok) {
      throw new Error(startJson?.error || "Attachment pre-sign failed");
    }

    const upload = await fetch(startJson.uploadUrl, {
      method: "PUT",
      headers: {
        "content-type": file.type || "application/octet-stream",
        ...(authHeaders || {}),
      },
      body: file,
    });

    const uploadJson = await upload.json().catch(() => ({}));
    if (!upload.ok) {
      throw new Error(uploadJson?.error || "Attachment upload failed");
    }

    return {
      attachmentId: String(uploadJson.attachmentId || ""),
      name: file.name,
      mime: file.type,
      size: file.size,
      sha256: String(uploadJson.sha256 || ""),
    } as UploadedAttachmentRef;
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const uploaded: UploadedAttachmentRef[] = [];
      for (const file of files) {
        const ref = await uploadOne(file);
        uploaded.push(ref);
      }
      const next = [...attachments, ...uploaded];
      setAttachments(next);
      onAttachmentsChange(next);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err: any) {
      setError(err?.message || "Attachment upload failed");
    } finally {
      setBusy(false);
    }
  }

  function removeAttachment(attachmentId: string) {
    const next = attachments.filter((entry) => entry.attachmentId !== attachmentId);
    setAttachments(next);
    onAttachmentsChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          disabled={disabled || busy}
          onChange={handleChange}
          className="text-xs"
        />
      </div>

      {error && <div className="text-xs text-rose-700">{error}</div>}

      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((attachment) => (
            <div key={attachment.attachmentId} className="flex items-center justify-between text-xs rounded border px-2 py-1 bg-surface">
              <span>
                {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)
              </span>
              <button
                type="button"
                className="text-rose-700 font-semibold"
                onClick={() => removeAttachment(attachment.attachmentId)}
                disabled={disabled || busy}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
