2026-Jan-04 13:47:26.366682 Starting deployment of carlosacostap-unca/epixum:main to localhost.
2026-Jan-04 13:47:26.580492 Preparing container with helper image: ghcr.io/coollabsio/coolify-helper:1.0.12
2026-Jan-04 13:47:28.015001 Image not found (focockkgk8ow4k04kogsccok:25364592868f61f14553131b0838fdc652b7fbde). Building new image.
2026-Jan-04 13:47:28.022514 ----------------------------------------
2026-Jan-04 13:47:28.028765 Importing carlosacostap-unca/epixum:main (commit sha 25364592868f61f14553131b0838fdc652b7fbde) to /artifacts/c0s0ck0ckwwwwokssgc0wgkk.
2026-Jan-04 13:47:29.428790 Generating nixpacks configuration with: nixpacks plan -f json --env NIXPACKS_NODE_VERSION=22 --env COOLIFY_URL=http://focockkgk8ow4k04kogsccok.31.97.16.163.sslip.io --env COOLIFY_FQDN=focockkgk8ow4k04kogsccok.31.97.16.163.sslip.io --env COOLIFY_BRANCH=main --env COOLIFY_RESOURCE_UUID=focockkgk8ow4k04kogsccok /artifacts/c0s0ck0ckwwwwokssgc0wgkk
2026-Jan-04 13:47:29.830120 Found application type: node.
2026-Jan-04 13:47:29.838702 If you need further customization, please check the documentation of Nixpacks: https://nixpacks.com/docs/providers/node
2026-Jan-04 13:47:30.774536 ----------------------------------------
2026-Jan-04 13:47:30.783610 Building docker image started.
2026-Jan-04 13:47:30.791747 To check the current progress, click on Show Debug Logs.
2026-Jan-04 13:48:06.744291 ========================================
2026-Jan-04 13:48:06.752576 Deployment failed: Command execution failed (exit code 1): docker exec c0s0ck0ckwwwwokssgc0wgkk bash -c 'bash /artifacts/build.sh'
2026-Jan-04 13:48:06.752576 Error: #0 building with "default" instance using docker driver
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #1 [internal] load build definition from Dockerfile
2026-Jan-04 13:48:06.752576 #1 transferring dockerfile: 1.83kB done
2026-Jan-04 13:48:06.752576 #1 DONE 0.0s
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #2 [internal] load metadata for ghcr.io/railwayapp/nixpacks:ubuntu-1745885067
2026-Jan-04 13:48:06.752576 #2 DONE 0.3s
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #3 [internal] load .dockerignore
2026-Jan-04 13:48:06.752576 #3 transferring context: 2B done
2026-Jan-04 13:48:06.752576 #3 DONE 0.0s
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #4 [stage-0  1/11] FROM ghcr.io/railwayapp/nixpacks:ubuntu-1745885067@sha256:d45c89d80e13d7ad0fd555b5130f22a866d9dd10e861f589932303ef2314c7de
2026-Jan-04 13:48:06.752576 #4 DONE 0.0s
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #5 [internal] load build context
2026-Jan-04 13:48:06.752576 #5 transferring context: 726.01kB 0.0s done
2026-Jan-04 13:48:06.752576 #5 DONE 0.0s
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #6 [stage-0  3/11] COPY .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix
2026-Jan-04 13:48:06.752576 #6 CACHED
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #7 [stage-0  4/11] RUN nix-env -if .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix && nix-collect-garbage -d
2026-Jan-04 13:48:06.752576 #7 CACHED
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #8 [stage-0  2/11] WORKDIR /app/
2026-Jan-04 13:48:06.752576 #8 CACHED
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #9 [stage-0  5/11] RUN sudo apt-get update && sudo apt-get install -y --no-install-recommends curl wget
2026-Jan-04 13:48:06.752576 #9 CACHED
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #10 [stage-0  6/11] COPY . /app/.
2026-Jan-04 13:48:06.752576 #10 DONE 0.1s
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #11 [stage-0  7/11] RUN --mount=type=cache,id=focockkgk8ow4k04kogsccok-/root/npm,target=/root/.npm npm ci
2026-Jan-04 13:48:06.752576 #11 0.242 npm warn config production Use `--omit=dev` instead.
2026-Jan-04 13:48:06.752576 #11 15.42
2026-Jan-04 13:48:06.752576 #11 15.42 added 375 packages, and audited 376 packages in 15s
2026-Jan-04 13:48:06.752576 #11 15.42
2026-Jan-04 13:48:06.752576 #11 15.42 146 packages are looking for funding
2026-Jan-04 13:48:06.752576 #11 15.42   run `npm fund` for details
2026-Jan-04 13:48:06.752576 #11 15.42
2026-Jan-04 13:48:06.752576 #11 15.42 found 0 vulnerabilities
2026-Jan-04 13:48:06.752576 #11 DONE 16.2s
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #12 [stage-0  8/11] COPY . /app/.
2026-Jan-04 13:48:06.752576 #12 DONE 0.1s
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 #13 [stage-0  9/11] RUN --mount=type=cache,id=focockkgk8ow4k04kogsccok-next/cache,target=/app/.next/cache --mount=type=cache,id=focockkgk8ow4k04kogsccok-node_modules/cache,target=/app/node_modules/.cache npm run build
2026-Jan-04 13:48:06.752576 #13 0.261 npm warn config production Use `--omit=dev` instead.
2026-Jan-04 13:48:06.752576 #13 0.286
2026-Jan-04 13:48:06.752576 #13 0.286 > epixum@0.1.0 build
2026-Jan-04 13:48:06.752576 #13 0.286 > next build
2026-Jan-04 13:48:06.752576 #13 0.286
2026-Jan-04 13:48:06.752576 #13 1.312 ▲ Next.js 16.1.1 (Turbopack)
2026-Jan-04 13:48:06.752576 #13 1.312
2026-Jan-04 13:48:06.752576 #13 1.436   Creating an optimized production build ...
2026-Jan-04 13:48:06.752576 #13 8.655 ✓ Compiled successfully in 6.6s
2026-Jan-04 13:48:06.752576 #13 8.666   Running TypeScript ...
2026-Jan-04 13:48:06.752576 #13 17.28 Failed to compile.
2026-Jan-04 13:48:06.752576 #13 17.28
2026-Jan-04 13:48:06.752576 #13 17.28 ./components/StudentAssignmentList.tsx:122:35
2026-Jan-04 13:48:06.752576 #13 17.28 Type error: 'user.email' is possibly 'undefined'.
2026-Jan-04 13:48:06.752576 #13 17.28
2026-Jan-04 13:48:06.752576 #13 17.28   120 |                 const fileExt = file.name.split('.').pop()
2026-Jan-04 13:48:06.752576 #13 17.28   121 |                 // Sanitize email and title for filename (alphanumeric, dots, dashes, underscores)
2026-Jan-04 13:48:06.752576 #13 17.28 > 122 |                 const safeEmail = user.email.replace(/[^a-z0-9@._-]/gi, '_')
2026-Jan-04 13:48:06.752576 #13 17.28       |                                   ^
2026-Jan-04 13:48:06.752576 #13 17.28   123 |                 const safeTitle = assignment.title.replace(/[^a-z0-9_-]/gi, '_')
2026-Jan-04 13:48:06.752576 #13 17.28   124 |                 const fileName = `${safeEmail}_${safeTitle}.${fileExt}`
2026-Jan-04 13:48:06.752576 #13 17.28   125 |                 const filePath = `${courseId}/${assignment.id}/${user.email}/${fileName}`
2026-Jan-04 13:48:06.752576 #13 17.35 Next.js build worker exited with code: 1 and signal: null
2026-Jan-04 13:48:06.752576 #13 ERROR: process "/bin/bash -ol pipefail -c npm run build" did not complete successfully: exit code: 1
2026-Jan-04 13:48:06.752576 ------
2026-Jan-04 13:48:06.752576 > [stage-0  9/11] RUN --mount=type=cache,id=focockkgk8ow4k04kogsccok-next/cache,target=/app/.next/cache --mount=type=cache,id=focockkgk8ow4k04kogsccok-node_modules/cache,target=/app/node_modules/.cache npm run build:
2026-Jan-04 13:48:06.752576 17.28 Type error: 'user.email' is possibly 'undefined'.
2026-Jan-04 13:48:06.752576 17.28
2026-Jan-04 13:48:06.752576 17.28   120 |                 const fileExt = file.name.split('.').pop()
2026-Jan-04 13:48:06.752576 17.28   121 |                 // Sanitize email and title for filename (alphanumeric, dots, dashes, underscores)
2026-Jan-04 13:48:06.752576 17.28 > 122 |                 const safeEmail = user.email.replace(/[^a-z0-9@._-]/gi, '_')
2026-Jan-04 13:48:06.752576 17.28       |                                   ^
2026-Jan-04 13:48:06.752576 17.28   123 |                 const safeTitle = assignment.title.replace(/[^a-z0-9_-]/gi, '_')
2026-Jan-04 13:48:06.752576 17.28   124 |                 const fileName = `${safeEmail}_${safeTitle}.${fileExt}`
2026-Jan-04 13:48:06.752576 17.28   125 |                 const filePath = `${courseId}/${assignment.id}/${user.email}/${fileName}`
2026-Jan-04 13:48:06.752576 17.35 Next.js build worker exited with code: 1 and signal: null
2026-Jan-04 13:48:06.752576 ------
2026-Jan-04 13:48:06.752576 
2026-Jan-04 13:48:06.752576 1 warning found (use docker --debug to expand):
2026-Jan-04 13:48:06.752576 - UndefinedVar: Usage of undefined variable '$NIXPACKS_PATH' (line 18)
2026-Jan-04 13:48:06.752576 Dockerfile:24
2026-Jan-04 13:48:06.752576 --------------------
2026-Jan-04 13:48:06.752576 22 |     # build phase
2026-Jan-04 13:48:06.752576 23 |     COPY . /app/.
2026-Jan-04 13:48:06.752576 24 | >>> RUN --mount=type=cache,id=focockkgk8ow4k04kogsccok-next/cache,target=/app/.next/cache --mount=type=cache,id=focockkgk8ow4k04kogsccok-node_modules/cache,target=/app/node_modules/.cache npm run build
2026-Jan-04 13:48:06.752576 25 |
2026-Jan-04 13:48:06.752576 26 |
2026-Jan-04 13:48:06.752576 --------------------
2026-Jan-04 13:48:06.752576 ERROR: failed to build: failed to solve: process "/bin/bash -ol pipefail -c npm run build" did not complete successfully: exit code: 1
2026-Jan-04 13:48:06.752576 exit status 1
2026-Jan-04 13:48:06.846964 ========================================
2026-Jan-04 13:48:06.858216 Deployment failed. Removing the new version of your application.
2026-Jan-04 13:48:07.358912 Gracefully shutting down build container: c0s0ck0ckwwwwokssgc0wgkk