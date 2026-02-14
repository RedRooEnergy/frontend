import { generatePdfFromLines } from "../email/pdf";
import { sha256Hex, stableStringify } from "./hash";
import type { ChatMessageRecord, ChatParticipant, ChatRedactionEventRecord, ChatThreadRecord } from "./types";

export type ChatExportManifestFile = {
  name: string;
  bytes: number;
  sha256: string;
};

export type ChatExportManifest = {
  manifestVersion: "ext-chat-01-export-manifest.v1";
  generatedAt: string;
  threadId: string;
  threadHash: string;
  messageCount: number;
  files: ChatExportManifestFile[];
};

export type ChatEvidenceExport = {
  json: Record<string, unknown>;
  jsonString: string;
  jsonHash: string;
  pdf: {
    buffer: Buffer;
    hash: string;
  };
  manifest: ChatExportManifest;
  manifestJson: string;
  manifestHash: string;
};

export type ChatEvidencePack = ChatEvidenceExport & {
  zipBuffer: Buffer;
  manifestSha256Text: string;
  readmeText: string;
};

function redactionLookup(redactions: ChatRedactionEventRecord[]) {
  const map = new Map<string, ChatRedactionEventRecord>();
  for (const event of redactions) {
    const key = event.messageId;
    if (!map.has(key)) map.set(key, event);
  }
  return map;
}

function mapParticipants(participants: ChatParticipant[]) {
  return [...participants]
    .map((participant) => ({
      userId: participant.userId,
      role: participant.role,
      orgId: participant.orgId || null,
      supplierId: participant.supplierId || null,
      buyerId: participant.buyerId || null,
    }))
    .sort((left, right) => `${left.role}:${left.userId}`.localeCompare(`${right.role}:${right.userId}`));
}

function mapMessages(messages: ChatMessageRecord[], redactions: ChatRedactionEventRecord[]) {
  const redactionByMessage = redactionLookup(redactions);
  return messages.map((message) => {
    const redaction = redactionByMessage.get(message.messageId) || null;
    const body = redaction ? "[REDACTED]" : message.body;

    return {
      messageId: message.messageId,
      threadId: message.threadId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      createdAt: message.createdAt,
      systemEvent: message.systemEvent,
      systemEventType: message.systemEventType,
      body,
      messageHash: message.messageHash,
      moderationFlags: message.moderationFlags,
      redaction: redaction
        ? {
            isRedacted: true,
            redactedAt: redaction.createdAt,
            redactionEventId: redaction.redactionEventId,
            reasonCode: redaction.reasonCode,
          }
        : {
            isRedacted: false,
            redactedAt: null,
            redactionEventId: null,
            reasonCode: null,
          },
      attachments: message.attachments.map((attachment) => ({
        attachmentId: attachment.attachmentId,
        name: attachment.name,
        mime: attachment.mime,
        size: attachment.size,
        sha256: attachment.sha256,
      })),
    };
  });
}

function toJsonString(value: unknown) {
  return `${stableStringify(value)}\n`;
}

function deriveDeterministicGeneratedAt(input: {
  thread: ChatThreadRecord;
  messages: ChatMessageRecord[];
  redactions: ChatRedactionEventRecord[];
  overrideGeneratedAt?: string;
}) {
  if (input.overrideGeneratedAt) return input.overrideGeneratedAt;

  const timestamps: string[] = [];
  if (input.thread.createdAt) timestamps.push(input.thread.createdAt);
  if (input.thread.updatedAt) timestamps.push(input.thread.updatedAt);
  for (const message of input.messages) {
    if (message.createdAt) timestamps.push(message.createdAt);
  }
  for (const event of input.redactions) {
    if (event.createdAt) timestamps.push(event.createdAt);
  }

  if (timestamps.length === 0) return new Date(0).toISOString();
  return [...timestamps].sort((left, right) => left.localeCompare(right)).at(-1) || new Date(0).toISOString();
}

type ZipEntryInput = {
  name: string;
  data: Buffer;
};

function buildCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
}

const CRC32_TABLE = buildCrc32Table();

function crc32(input: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i += 1) {
    const byte = input[i];
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt16LE(buffer: Buffer, offset: number, value: number) {
  buffer.writeUInt16LE(value & 0xffff, offset);
}

function writeUInt32LE(buffer: Buffer, offset: number, value: number) {
  buffer.writeUInt32LE(value >>> 0, offset);
}

function buildStoredZip(entries: ZipEntryInput[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    writeUInt32LE(localHeader, 0, 0x04034b50);
    writeUInt16LE(localHeader, 4, 20);
    writeUInt16LE(localHeader, 6, 0);
    writeUInt16LE(localHeader, 8, 0);
    writeUInt16LE(localHeader, 10, 0);
    writeUInt16LE(localHeader, 12, 0);
    writeUInt32LE(localHeader, 14, crc);
    writeUInt32LE(localHeader, 18, data.length);
    writeUInt32LE(localHeader, 22, data.length);
    writeUInt16LE(localHeader, 26, nameBytes.length);
    writeUInt16LE(localHeader, 28, 0);

    localParts.push(localHeader, nameBytes, data);

    const centralHeader = Buffer.alloc(46);
    writeUInt32LE(centralHeader, 0, 0x02014b50);
    writeUInt16LE(centralHeader, 4, 20);
    writeUInt16LE(centralHeader, 6, 20);
    writeUInt16LE(centralHeader, 8, 0);
    writeUInt16LE(centralHeader, 10, 0);
    writeUInt16LE(centralHeader, 12, 0);
    writeUInt16LE(centralHeader, 14, 0);
    writeUInt32LE(centralHeader, 16, crc);
    writeUInt32LE(centralHeader, 20, data.length);
    writeUInt32LE(centralHeader, 24, data.length);
    writeUInt16LE(centralHeader, 28, nameBytes.length);
    writeUInt16LE(centralHeader, 30, 0);
    writeUInt16LE(centralHeader, 32, 0);
    writeUInt16LE(centralHeader, 34, 0);
    writeUInt16LE(centralHeader, 36, 0);
    writeUInt32LE(centralHeader, 38, 0);
    writeUInt32LE(centralHeader, 42, localOffset);

    centralParts.push(centralHeader, nameBytes);
    localOffset += localHeader.length + nameBytes.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localSection = Buffer.concat(localParts);

  const end = Buffer.alloc(22);
  writeUInt32LE(end, 0, 0x06054b50);
  writeUInt16LE(end, 4, 0);
  writeUInt16LE(end, 6, 0);
  writeUInt16LE(end, 8, entries.length);
  writeUInt16LE(end, 10, entries.length);
  writeUInt32LE(end, 12, centralDirectory.length);
  writeUInt32LE(end, 16, localSection.length);
  writeUInt16LE(end, 20, 0);

  return Buffer.concat([localSection, centralDirectory, end]);
}

function isoCompact(value: string) {
  return value.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildChatEvidenceExport(input: {
  thread: ChatThreadRecord;
  messages: ChatMessageRecord[];
  redactions: ChatRedactionEventRecord[];
  generatedAt?: string;
}): ChatEvidenceExport {
  const orderedMessages = [...input.messages].sort((left, right) => {
    const timeCmp = left.createdAt.localeCompare(right.createdAt);
    if (timeCmp !== 0) return timeCmp;
    return left.messageId.localeCompare(right.messageId);
  });

  const orderedRedactions = [...input.redactions].sort((left, right) => {
    const timeCmp = left.createdAt.localeCompare(right.createdAt);
    if (timeCmp !== 0) return timeCmp;
    return left.redactionEventId.localeCompare(right.redactionEventId);
  });

  const generatedAt = deriveDeterministicGeneratedAt({
    thread: input.thread,
    messages: orderedMessages,
    redactions: orderedRedactions,
    overrideGeneratedAt: input.generatedAt,
  });

  const transcript = {
    reportVersion: "ext-chat-01-transcript.v1",
    generatedAt,
    thread: {
      threadId: input.thread.threadId,
      type: input.thread.type,
      status: input.thread.status,
      relatedEntityType: input.thread.relatedEntityType,
      relatedEntityId: input.thread.relatedEntityId,
      caseId: input.thread.caseId,
      threadHash: input.thread.threadHash,
      createdAt: input.thread.createdAt,
      updatedAt: input.thread.updatedAt,
      participants: mapParticipants(input.thread.participants),
    },
    messages: mapMessages(orderedMessages, orderedRedactions),
    redactionEvents: orderedRedactions.map((event) => ({
      redactionEventId: event.redactionEventId,
      messageId: event.messageId,
      reasonCode: event.reasonCode,
      reasonDetail: event.reasonDetail,
      redactedBy: event.redactedBy,
      redactedByRole: event.redactedByRole,
      redactionHash: event.redactionHash,
      createdAt: event.createdAt,
    })),
  };

  const jsonString = toJsonString(transcript);
  const jsonBytes = Buffer.from(jsonString, "utf8");
  const jsonHash = sha256Hex(jsonBytes);

  const lines = [
    "RRE Chat Evidence Export",
    `Generated: ${generatedAt}`,
    `Thread: ${input.thread.threadId}`,
    `Status: ${input.thread.status}`,
    `Related: ${input.thread.relatedEntityType}:${input.thread.relatedEntityId || "none"}`,
    `ThreadHash: ${input.thread.threadHash}`,
    `Messages: ${orderedMessages.length}`,
    "",
  ];

  for (const message of mapMessages(orderedMessages, orderedRedactions)) {
    lines.push(`${message.createdAt} | ${message.senderRole} | ${message.senderId}`);
    lines.push(`messageId=${message.messageId}`);
    lines.push(`messageHash=${message.messageHash}`);
    lines.push(`body=${String(message.body || "")}`);
    if (message.attachments.length > 0) {
      lines.push(`attachments=${message.attachments.map((entry) => `${entry.attachmentId}:${entry.sha256}`).join(",")}`);
    }
    lines.push("");
  }

  const pdf = generatePdfFromLines(lines);

  const manifest: ChatExportManifest = {
    manifestVersion: "ext-chat-01-export-manifest.v1",
    generatedAt,
    threadId: input.thread.threadId,
    threadHash: input.thread.threadHash,
    messageCount: orderedMessages.length,
    files: [
      {
        name: "chat_transcript.json",
        bytes: jsonBytes.length,
        sha256: jsonHash,
      },
      {
        name: "chat_transcript.pdf",
        bytes: pdf.buffer.length,
        sha256: pdf.hash,
      },
    ],
  };

  const manifestJson = toJsonString(manifest);
  const manifestHash = sha256Hex(Buffer.from(manifestJson, "utf8"));

  return {
    json: transcript,
    jsonString,
    jsonHash,
    pdf,
    manifest,
    manifestJson,
    manifestHash,
  };
}

export function buildChatEvidencePack(input: {
  thread: ChatThreadRecord;
  messages: ChatMessageRecord[];
  redactions: ChatRedactionEventRecord[];
  generatedAt?: string;
}) {
  const exportData = buildChatEvidenceExport(input);
  const generatedAt = exportData.manifest.generatedAt;
  const manifestSha256Text = `${exportData.manifestHash}  chat_manifest.json\n`;
  const readmeText = [
    "RRE Chat Evidence Pack",
    `Generated At: ${generatedAt}`,
    `Thread ID: ${input.thread.threadId}`,
    "",
    "Contents:",
    "- chat_transcript.json",
    "- chat_transcript.pdf",
    "- chat_manifest.json",
    "- chat_manifest.sha256.txt",
    "",
    "Verification:",
    "1) Compute SHA-256 for chat_manifest.json and compare with chat_manifest.sha256.txt",
    "2) Verify transcript hashes listed in chat_manifest.json",
    "",
  ].join("\n");

  const zipBuffer = buildStoredZip([
    { name: "chat_transcript.json", data: Buffer.from(exportData.jsonString, "utf8") },
    { name: "chat_transcript.pdf", data: exportData.pdf.buffer },
    { name: "chat_manifest.json", data: Buffer.from(exportData.manifestJson, "utf8") },
    { name: "chat_manifest.sha256.txt", data: Buffer.from(manifestSha256Text, "utf8") },
    { name: "README.txt", data: Buffer.from(readmeText, "utf8") },
  ]);

  return {
    ...exportData,
    zipBuffer,
    manifestSha256Text,
    readmeText,
  } as ChatEvidencePack;
}

export function buildChatEvidenceFilename(input: { threadId: string; generatedAt: string }) {
  return `chat-evidence-pack-${input.threadId}-${isoCompact(input.generatedAt)}.zip`;
}

export function verifyChatExportDeterminism(input: {
  thread: ChatThreadRecord;
  messages: ChatMessageRecord[];
  redactions: ChatRedactionEventRecord[];
}) {
  const generatedAt = deriveDeterministicGeneratedAt({
    thread: input.thread,
    messages: input.messages,
    redactions: input.redactions,
  });

  const first = buildChatEvidenceExport({ ...input, generatedAt });
  const second = buildChatEvidenceExport({ ...input, generatedAt });

  return {
    sameJsonHash: first.jsonHash === second.jsonHash,
    sameManifestHash: first.manifestHash === second.manifestHash,
    samePdfHash: first.pdf.hash === second.pdf.hash,
  };
}
