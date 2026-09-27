# Verification Notes — EduGuide Firebase Final v7

## Static verification completed

- Firebase browser authentication is initialized lazily in the browser, preventing Next.js SSR from invoking `getAuth()` during server rendering.
- Firebase Admin SDK supports service-account JSON, a local service-account file path, or individual credential environment variables.
- `.env.local` is loaded by `npm run check:env` on Node 22+ using the built-in `node:process` environment-file loader.
- `secrets/` is excluded from Git.
- No Firebase private key or service-account JSON is included in this archive.
- The archive was inspected after packaging.

## Runtime verification

The final package should be verified locally with:

```powershell
npm install
npm run check:env
npm run typecheck
npm run build
npm start
```

The package was not build-tested in the model environment because access to the npm registry timed out during dependency installation. This is recorded explicitly rather than claiming a build that was not executed.
