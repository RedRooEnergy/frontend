## Required Checks
- [ ] frontend/package-lock.json exists and is committed
- [ ] All new or changed frontend imports are declared in frontend/package.json
- [ ] CI uses npm ci (not npm install) for /frontend
- [ ] CI explicitly verifies critical dependencies resolve (e.g. mongodb)
- [ ] No build relies on developer-local node_modules
- [ ] Build fails if frontend dependencies are missing or partially installed
