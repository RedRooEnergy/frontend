"use client";

import { useState } from "react";
import type { CareerAttachment, CareerAttachmentKind } from "../../lib/careers/types";

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "pages", "rtf", "txt"];

function formatFileSize(size: number) {
  if (!size) return "0 KB";
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

interface FileUploaderProps {
  kind: CareerAttachmentKind;
  label: string;
  required?: boolean;
  maxFiles?: number;
  attachments: CareerAttachment[];
  onAdd: (attachment: CareerAttachment) => void;
  onRemove: (storageKey: string) => void;
}

export default function FileUploader({
  kind,
  label,
  required,
  maxFiles = 1,
  attachments,
  onAdd,
  onRemove,
}: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const remaining = maxFiles - attachments.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const fileArray = Array.from(files).slice(0, remaining);

    for (const file of fileArray) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError("File type not supported.");
        continue;
      }

      try {
        const res = await fetch("/api/careers/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            kind,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err?.error || "Upload failed");
        }

        const presign = (await res.json()) as {
          uploadUrl: string;
          method: "PUT";
          headers: Record<string, string>;
          storageKey: string;
          url?: string;
        };

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(presign.method, presign.uploadUrl, true);
          Object.entries(presign.headers || {}).forEach(([key, value]) => xhr.setRequestHeader(key, value));
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setProgress((prev) => ({
                ...prev,
                [presign.storageKey]: Math.round((event.loaded / event.total) * 100),
              }));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error("Upload failed"));
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(file);
        });

        onAdd({
          kind,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          storageKey: presign.storageKey,
          url: presign.url,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        setError(err?.message || "Upload failed");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-strong">
        {label} {required ? <span className="text-brand-700">*</span> : null}
      </div>
      <input
        type="file"
        className="w-full border rounded-md px-3 py-2 bg-surface"
        accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
        multiple={maxFiles > 1}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}
      {attachments.length > 0 && (
        <div className="space-y-4">
          {attachments.map((file) => (
            <div key={file.storageKey} className="border rounded-md px-3 py-2 bg-surface-muted">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{file.fileName}</div>
                  <div className="text-xs text-muted">{formatFileSize(file.fileSize)}</div>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted"
                  onClick={() => onRemove(file.storageKey)}
                >
                  Remove
                </button>
              </div>
              {progress[file.storageKey] != null && progress[file.storageKey] < 100 && (
                <div className="mt-2 w-full bg-brand-100 rounded-full h-2">
                  <div
                    className="bg-brand-700 h-2 rounded-full"
                    style={{ width: `${progress[file.storageKey]}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {remaining <= 0 && <div className="text-xs text-muted">Maximum files uploaded.</div>}
    </div>
  );
}
