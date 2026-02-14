# PLATFORM_GOVERNANCE_REEVALUATION_PROCEDURE_v1.3.0
Document ID: RRE-GOV-PROC-v1.3.0
Version: v1.3.0
Status: LOCK-READY
Classification: Governance Re-Evaluation Procedure
Authority Impact: NONE
Runtime Mutation Authorization: NOT GRANTED
Change Control: REQUIRED

## 1) Preconditions

- Working tree state:
  - `git status --short` MUST return no changes.
- Node runtime:
  - `node -v` MUST be `v18.x`.
- NPM lock parity:
  - `npm ci` MUST succeed in `frontend/`.
- Mongo declaration:
  - This procedure does not require Mongo writes.
  - If `verify:chat-models` is added to runbook execution, `MONGODB_URI` MUST be set and read-only data posture declared.
- CI parity:
  - Local command outputs MUST match CI command set and rule assertions for `GOV-WECHAT-07`, `GOV-CHAIN-01`, `GOV-CHAT-01`.

## 2) Exact Command Set (Ordered)

Run from repository root unless noted.

1. Capture baseline metadata:

```bash
export GOV_BASELINE_VERSION="v1.3.0"
export GOV_BASELINE_COMMIT="$(git rev-parse HEAD)"
export GOV_SNAPSHOT_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
```

2. Install frontend dependencies:

```bash
cd frontend
npm ci
```

3. Run chatbot governance tests:

```bash
npm run test:chatbot
```

4. Run WeChat UI governance tests:

```bash
npm run test:wechat-ui
```

5. Run chain-integrity tests (phase 1):

```bash
npm run test:chain-integrity-phase1
```

6. Run chain-integrity tests (phase 2):

```bash
npm run test:chain-integrity-phase2
```

7. Run audit-comms tests:

```bash
npm run test:audit-comms
```

8. Evaluate PGA status and export full snapshot:

```bash
npx tsx --eval "import fs from 'node:fs'; import path from 'node:path'; import { getPlatformGovernanceStatus } from './app/api/governance/platform/_lib.ts'; const outDir = path.resolve(process.cwd(), '../artefacts/governance/v1.3.0'); fs.mkdirSync(outDir, { recursive: true }); const status = getPlatformGovernanceStatus(); fs.writeFileSync(path.join(outDir, 'governance_status_snapshot.json'), JSON.stringify(status, null, 2) + '\n', 'utf8'); console.log('WROTE governance_status_snapshot.json');"
```

9. Extract governanceChecks snapshot:

```bash
npx tsx --eval "import fs from 'node:fs'; import path from 'node:path'; import { getPlatformGovernanceStatus } from './app/api/governance/platform/_lib.ts'; const outDir = path.resolve(process.cwd(), '../artefacts/governance/v1.3.0'); const status = getPlatformGovernanceStatus(); fs.writeFileSync(path.join(outDir, 'rule_matrix_snapshot.json'), JSON.stringify({ generatedAtUtc: status.generatedAtUtc, governanceChecks: status.governanceChecks }, null, 2) + '\n', 'utf8'); console.log('WROTE rule_matrix_snapshot.json');"
```

10. Extract overall/badge/score/trend/deductions/noData/fail counts:

```bash
npx tsx --eval "import fs from 'node:fs'; import path from 'node:path'; import { getPlatformGovernanceStatus } from './app/api/governance/platform/_lib.ts'; const outDir = path.resolve(process.cwd(), '../artefacts/governance/v1.3.0'); const status = getPlatformGovernanceStatus(); const delta = { generatedAtUtc: status.generatedAtUtc, overall: status.overall, badgeState: status.badgeState, trendStatus: status.trendStatus, governanceScore: status.governanceScore, deductions: status.governanceScore.deductions, summary: status.summary, criticalRules: status.governanceChecks.filter((r) => r.severity === 'CRITICAL').map((r) => ({ id: r.id, status: r.status, notes: r.notes })) }; fs.writeFileSync(path.join(outDir, 'governance_index_delta.json'), JSON.stringify(delta, null, 2) + '\n', 'utf8'); console.log('WROTE governance_index_delta.json');"
```

11. Render badge snapshot SVG:

```bash
npx tsx --eval "import fs from 'node:fs'; import path from 'node:path'; import { getPlatformGovernanceStatus, renderGovernanceBadge } from './app/api/governance/platform/_lib.ts'; const outDir = path.resolve(process.cwd(), '../artefacts/governance/v1.3.0'); const status = getPlatformGovernanceStatus(); const text = status.badgeState; const color = text === 'DEGRADED' ? '#e05d44' : text === 'NO_DATA' ? '#9f9f9f' : text === 'REGRESSION' ? '#e05d44' : text === 'IMPROVING' ? '#007ec6' : '#4c1'; const svg = renderGovernanceBadge('platform-governance', text, color); fs.writeFileSync(path.join(outDir, 'badge_snapshot.svg'), svg, 'utf8'); console.log('WROTE badge_snapshot.svg');"
```

12. Copy scorecard bundle:

```bash
mkdir -p ../artefacts/governance/v1.3.0/scorecards
cp -f ../scorecards/chatbot.scorecard.json ../artefacts/governance/v1.3.0/scorecards/
```

13. Return to repository root:

```bash
cd ..
```

## 3) Expected Output Contract

Required assertions:

- `overall = PASS`
- `summary.failCount = 0`
- `summary.noDataCount = 0`
- `badgeState != DEGRADED`
- `governanceChecks` contains:
  - `GOV-WECHAT-07` with `status = PASS`
  - `GOV-CHAIN-01` with `status = PASS`
  - `GOV-CHAT-01` with `status = PASS`
- no `CRITICAL` rule with `status = FAIL`
- `governanceScore.deductions` contains no CRITICAL failure deduction rows

Failure handling:

- If any assertion fails:
  - mark snapshot run as `FAIL`
  - do not publish baseline archive as authoritative
  - open change-control ticket referencing failing rule IDs and reason codes
  - retain generated artefacts for forensic review under a non-baseline run tag

## 4) Snapshot Artefact Output

Output directory:

- `artefacts/governance/v1.3.0/`

Required files:

- `governance_status_snapshot.json`
- `governance_index_delta.json`
- `rule_matrix_snapshot.json`
- `badge_snapshot.svg`
- `scorecards/chatbot.scorecard.json`

Required metadata embedded in snapshot data:

- `baselineVersion` (`v1.3.0`)
- `commitHash` (`git rev-parse HEAD`)
- `generatedAtUtc` (ISO-8601 UTC)

## 5) Hashing Protocol

Hash algorithm:

- `SHA-256` for all archive files.

Hash generation command set:

```bash
cd artefacts/governance/v1.3.0
find . -type f ! -name 'manifest.json' ! -name 'manifest.sha256.txt' -print0 | sort -z | xargs -0 shasum -a 256 > manifest.sha256.txt
```

Canonical JSON ordering rules:

- JSON files MUST be serialized with stable key ordering before hashing.
- Top-level object keys sorted lexicographically.
- Nested object keys sorted lexicographically.
- UTF-8 encoding.
- Single trailing newline allowed in JSON files.

Manifest generation command:

```bash
npx tsx --eval "import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; const dir = path.resolve(process.cwd()); const files = fs.readdirSync(dir, { withFileTypes: true }); function list(rel){ const p=path.join(dir,rel); const out=[]; for(const e of fs.readdirSync(p,{withFileTypes:true})){ const n=path.join(rel,e.name); if(e.isDirectory()) out.push(...list(n)); else out.push(n); } return out; } const fileList=list('.').map((p)=>p.replace(/^\.\//,'')).filter((p)=>p!=='manifest.json'&&p!=='manifest.sha256.txt').sort(); const rows=fileList.map((name)=>{ const b=fs.readFileSync(path.join(dir,name)); const h=crypto.createHash('sha256').update(b).digest('hex'); return { name, bytes:b.length, sha256:h }; }); const manifest={ manifestVersion:'pga-reeval-manifest.v1', baselineVersion:'v1.3.0', generatedAtUtc:new Date().toISOString(), commitHash: process.env.GOV_BASELINE_COMMIT || 'UNKNOWN', files:rows }; const stable=(v)=>{ if(v===null||typeof v!=='object') return JSON.stringify(v); if(Array.isArray(v)) return '['+v.map(stable).join(',')+']'; const k=Object.keys(v).sort(); return '{'+k.map((x)=>JSON.stringify(x)+':'+stable(v[x])).join(',')+'}'; }; const txt=stable(manifest)+'\n'; fs.writeFileSync(path.join(dir,'manifest.json'),txt,'utf8'); const digest=crypto.createHash('sha256').update(Buffer.from(txt,'utf8')).digest('hex'); fs.writeFileSync(path.join(dir,'manifest.sha256.txt'), `${digest}  manifest.json\n`, 'utf8');"
```

## 6) Attestation Block

Create `README.txt` in archive root with this block:

```text
Baseline Version: v1.3.0
Commit Hash: <git SHA>
Generated At (UTC): <ISO-8601 UTC>
Rule Set Active: GOV-WECHAT-07, GOV-CHAIN-01, GOV-CHAT-01
CRITICAL Rules Count: 3
All PASS: true|false
Board Lock Confirmation: docs/governance/BOARD_RESOLUTION_PLATFORM_GOVERNANCE_AGGREGATOR_v1.3.0.md

Signatures:
Board Chair (or delegate): ____________________
CTO / Engineering Authority: ____________________
Compliance Lead: ____________________
Date (UTC): ____________________
```

Procedure completion requires archive hash verification and attestation block completion.
