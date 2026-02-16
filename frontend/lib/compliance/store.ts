import crypto from "crypto";
import fs from "fs-extra";
import path from "path";
import {
  ComplianceStore,
  ComplianceApplication,
  ComplianceDocument,
  ComplianceEvidenceExport,
  ComplianceReviewDecision,
  ChecklistEvaluation,
  ComplianceDocumentType,
  ComplianceProductType,
} from "./types";
import { getActiveChecklist } from "../../data/complianceChecklistSeed";

const STORE_DIR = path.join(process.cwd(), ".cache", "compliance");
const STORE_FILE = path.join(STORE_DIR, "store.json");
const DOC_DIR = path.join(STORE_DIR, "docs");
const EXPORT_DIR = path.join(STORE_DIR, "exports");

function initStore(): ComplianceStore {
  return { applications: [], documents: [], decisions: [], exports: [] };
}

function ensureDirs() {
  fs.ensureDirSync(STORE_DIR);
  fs.ensureDirSync(DOC_DIR);
  fs.ensureDirSync(EXPORT_DIR);
}

function loadStore(): ComplianceStore {
  ensureDirs();
  if (!fs.existsSync(STORE_FILE)) {
    const empty = initStore();
    fs.writeJsonSync(STORE_FILE, empty, { spaces: 2 });
    return empty;
  }
  return fs.readJsonSync(STORE_FILE) as ComplianceStore;
}

function saveStore(store: ComplianceStore) {
  ensureDirs();
  fs.writeJsonSync(STORE_FILE, store, { spaces: 2 });
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function sha256Hex(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function stableStringify(value: any): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function createApplication(supplierId: string, productType: ComplianceProductType, markets: string[]) {
  const store = loadStore();
  const checklist = getActiveChecklist(productType);
  const now = new Date().toISOString();
  const application: ComplianceApplication = {
    id: makeId("APP"),
    supplierId,
    productType,
    markets: markets as any,
    status: "DRAFT",
    rcmReadiness: "NOT_READY",
    checklistRef: checklist ? { checklistId: checklist.checklistId, version: checklist.version } : undefined,
    createdAt: now,
    updatedAt: now,
  };
  store.applications.push(application);
  saveStore(store);
  return application;
}

export function getApplication(id: string) {
  const store = loadStore();
  return store.applications.find((app) => app.id === id) || null;
}

export function addDocument(
  applicationId: string,
  documentType: ComplianceDocumentType,
  fileName: string,
  contentType: string,
  buffer: Buffer
) {
  const store = loadStore();
  const app = store.applications.find((entry) => entry.id === applicationId);
  if (!app) throw new Error("APPLICATION_NOT_FOUND");

  const hash = sha256Hex(buffer);
  const docId = makeId("DOC");
  const filePath = path.join(DOC_DIR, `${docId}-${fileName}`);
  fs.writeFileSync(filePath, buffer);

  const doc: ComplianceDocument = {
    id: docId,
    applicationId,
    documentType,
    filename: fileName,
    contentType,
    sizeBytes: buffer.length,
    sha256Hash: hash,
    storageKey: filePath,
    uploadedAt: new Date().toISOString(),
  };
  store.documents.push(doc);
  saveStore(store);
  return doc;
}

export function listDocuments(applicationId: string) {
  const store = loadStore();
  return store.documents.filter((doc) => doc.applicationId === applicationId);
}

export function evaluateApplication(applicationId: string): ChecklistEvaluation {
  const store = loadStore();
  const app = store.applications.find((entry) => entry.id === applicationId);
  if (!app || !app.checklistRef) throw new Error("APPLICATION_NOT_FOUND");

  const checklist = getActiveChecklist(app.productType);
  if (!checklist) throw new Error("CHECKLIST_NOT_FOUND");

  const docs = store.documents.filter((doc) => doc.applicationId === applicationId);
  const results = checklist.items.map((item) => {
    const matches = docs.filter((doc) => item.docTypes.includes(doc.documentType));
    const status: "PASS" | "FAIL" = item.required && matches.length === 0 ? "FAIL" : "PASS";
    return {
      itemId: item.itemId,
      required: item.required,
      status,
      missingDocTypes: status === "FAIL" ? item.docTypes : [],
    };
  });
  return {
    applicationId,
    checklistId: checklist.checklistId,
    version: checklist.version,
    results,
    overallStatus: results.some((r) => r.status === "FAIL") ? "FAIL" : "PASS",
  };
}

export function submitApplication(applicationId: string) {
  const store = loadStore();
  const app = store.applications.find((entry) => entry.id === applicationId);
  if (!app) throw new Error("APPLICATION_NOT_FOUND");
  const evaluation = evaluateApplication(applicationId);
  if (evaluation.overallStatus !== "PASS") {
    const error: any = new Error("CHECKLIST_INCOMPLETE");
    error.status = 409;
    throw error;
  }
  app.status = "SUBMITTED";
  app.updatedAt = new Date().toISOString();
  saveStore(store);
  return app;
}

export function reviewApplication(
  applicationId: string,
  decision: ComplianceReviewDecision["decision"],
  reasons: string[],
  notes: string | undefined,
  actorId: string
) {
  const store = loadStore();
  const app = store.applications.find((entry) => entry.id === applicationId);
  if (!app) throw new Error("APPLICATION_NOT_FOUND");

  if (decision === "APPROVE") app.status = "APPROVED";
  else if (decision === "REJECT") app.status = "REJECTED";
  else app.status = "CHANGES_REQUESTED";

  if (decision === "APPROVE" && app.markets.includes("AU")) {
    app.rcmReadiness = "READY_TO_LIST";
  }

  app.updatedAt = new Date().toISOString();
  const review: ComplianceReviewDecision = {
    applicationId,
    decision,
    reasons: reasons || [],
    notes,
    decidedAt: new Date().toISOString(),
    actor: { id: actorId, role: "admin" },
  };
  store.decisions = store.decisions.filter((entry) => entry.applicationId !== applicationId);
  store.decisions.push(review);
  saveStore(store);
  return app;
}

export function createExport(applicationId: string) {
  const store = loadStore();
  const app = store.applications.find((entry) => entry.id === applicationId);
  if (!app) throw new Error("APPLICATION_NOT_FOUND");

  const docs = store.documents.filter((doc) => doc.applicationId === applicationId);
  const evaluation = evaluateApplication(applicationId);
  const decision = store.decisions.find((entry) => entry.applicationId === applicationId) || null;

  const exportId = makeId("EXP");
  const manifest = {
    exportId,
    createdAt: new Date().toISOString(),
    application: app,
    documents: docs,
    evaluation,
    reviewDecision: decision,
  };

  const manifestText = stableStringify(manifest);
  const manifestSha256 = sha256Hex(Buffer.from(manifestText, "utf8"));
  const manifestPath = path.join(EXPORT_DIR, `${exportId}.manifest.json`);
  fs.writeFileSync(manifestPath, manifestText);

  const exportRecord: ComplianceEvidenceExport = {
    exportId,
    applicationId,
    manifestSha256,
    jsonPath: manifestPath,
    createdAt: new Date().toISOString(),
  };
  store.exports.push(exportRecord);
  saveStore(store);
  return exportRecord;
}

export function getExportById(exportId: string) {
  const store = loadStore();
  return store.exports.find((entry) => entry.exportId === exportId) || null;
}

export function verifyHash(sha256: string) {
  const store = loadStore();
  const doc = store.documents.find((entry) => entry.sha256Hash === sha256);
  if (doc) return { match: true, type: "DOCUMENT", document: doc };
  const exp = store.exports.find((entry) => entry.manifestSha256 === sha256);
  if (exp) return { match: true, type: "MANIFEST", export: exp };
  return { match: false };
}
