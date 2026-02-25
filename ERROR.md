2026-Feb-25 19:41:15.084432 Starting deployment of carlosacostap-unca/epixum:main to localhost.
2026-Feb-25 19:41:15.890035 Preparing container with helper image: ghcr.io/coollabsio/coolify-helper:1.0.12
2026-Feb-25 19:41:19.132644 Image not found (focockkgk8ow4k04kogsccok:73b85ca4291b7e2b560427e115a5947691200a10). Building new image.
2026-Feb-25 19:41:19.141865 ----------------------------------------
2026-Feb-25 19:41:19.151372 Importing carlosacostap-unca/epixum:main (commit sha 73b85ca4291b7e2b560427e115a5947691200a10) to /artifacts/xckgw4c0s0s0s80s08kso0ss.
2026-Feb-25 19:41:22.398510 Generating nixpacks configuration with: nixpacks plan -f json --env NIXPACKS_NODE_VERSION=22 --env COOLIFY_URL=https://epixum.com:3000,https://www.epixum.com:3000 --env COOLIFY_FQDN=epixum.com:3000,www.epixum.com:3000 --env COOLIFY_BRANCH=main --env COOLIFY_RESOURCE_UUID=focockkgk8ow4k04kogsccok /artifacts/xckgw4c0s0s0s80s08kso0ss
2026-Feb-25 19:41:23.539825 Found application type: node.
2026-Feb-25 19:41:23.552716 If you need further customization, please check the documentation of Nixpacks: https://nixpacks.com/docs/providers/node
2026-Feb-25 19:41:25.600274 ----------------------------------------
2026-Feb-25 19:41:25.625460 Building docker image started.
2026-Feb-25 19:41:25.642064 To check the current progress, click on Show Debug Logs.
2026-Feb-25 19:42:17.484044 ========================================
2026-Feb-25 19:42:17.491815 Deployment failed: Command execution failed (exit code 1): docker exec xckgw4c0s0s0s80s08kso0ss bash -c 'bash /artifacts/build.sh'
2026-Feb-25 19:42:17.491815 Error: #0 building with "default" instance using docker driver
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #1 [internal] load build definition from Dockerfile
2026-Feb-25 19:42:17.491815 #1 transferring dockerfile: 1.81kB done
2026-Feb-25 19:42:17.491815 #1 DONE 0.0s
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #2 [internal] load metadata for ghcr.io/railwayapp/nixpacks:ubuntu-1745885067
2026-Feb-25 19:42:17.491815 #2 DONE 0.3s
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #3 [internal] load .dockerignore
2026-Feb-25 19:42:17.491815 #3 transferring context: 2B done
2026-Feb-25 19:42:17.491815 #3 DONE 0.0s
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #4 [stage-0  1/11] FROM ghcr.io/railwayapp/nixpacks:ubuntu-1745885067@sha256:d45c89d80e13d7ad0fd555b5130f22a866d9dd10e861f589932303ef2314c7de
2026-Feb-25 19:42:17.491815 #4 DONE 0.0s
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #5 [internal] load build context
2026-Feb-25 19:42:17.491815 #5 transferring context: 1.39MB 0.0s done
2026-Feb-25 19:42:17.491815 #5 DONE 0.1s
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #6 [stage-0  2/11] WORKDIR /app/
2026-Feb-25 19:42:17.491815 #6 CACHED
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #7 [stage-0  3/11] COPY .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix
2026-Feb-25 19:42:17.491815 #7 CACHED
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #8 [stage-0  4/11] RUN nix-env -if .nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix && nix-collect-garbage -d
2026-Feb-25 19:42:17.491815 #8 CACHED
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #9 [stage-0  5/11] RUN sudo apt-get update && sudo apt-get install -y --no-install-recommends curl wget
2026-Feb-25 19:42:17.491815 #9 CACHED
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #10 [stage-0  6/11] COPY . /app/.
2026-Feb-25 19:42:17.491815 #10 DONE 0.1s
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #11 [stage-0  7/11] RUN --mount=type=cache,id=focockkgk8ow4k04kogsccok-/root/npm,target=/root/.npm npm ci
2026-Feb-25 19:42:17.491815 #11 0.241 npm warn config production Use `--omit=dev` instead.
2026-Feb-25 19:42:17.491815 #11 17.89
2026-Feb-25 19:42:17.491815 #11 17.89 added 387 packages, and audited 388 packages in 18s
2026-Feb-25 19:42:17.491815 #11 17.89
2026-Feb-25 19:42:17.491815 #11 17.89 147 packages are looking for funding
2026-Feb-25 19:42:17.491815 #11 17.89   run `npm fund` for details
2026-Feb-25 19:42:17.491815 #11 17.95
2026-Feb-25 19:42:17.491815 #11 17.95 3 vulnerabilities (1 moderate, 2 high)
2026-Feb-25 19:42:17.491815 #11 17.95
2026-Feb-25 19:42:17.491815 #11 17.95 To address issues that do not require attention, run:
2026-Feb-25 19:42:17.491815 #11 17.95   npm audit fix
2026-Feb-25 19:42:17.491815 #11 17.95
2026-Feb-25 19:42:17.491815 #11 17.95 To address all issues, run:
2026-Feb-25 19:42:17.491815 #11 17.95   npm audit fix --force
2026-Feb-25 19:42:17.491815 #11 17.95
2026-Feb-25 19:42:17.491815 #11 17.95 Run `npm audit` for details.
2026-Feb-25 19:42:17.491815 #11 DONE 18.6s
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #12 [stage-0  8/11] COPY . /app/.
2026-Feb-25 19:42:17.491815 #12 DONE 0.2s
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 #13 [stage-0  9/11] RUN --mount=type=cache,id=focockkgk8ow4k04kogsccok-next/cache,target=/app/.next/cache --mount=type=cache,id=focockkgk8ow4k04kogsccok-node_modules/cache,target=/app/node_modules/.cache npm run build
2026-Feb-25 19:42:17.491815 #13 0.251 npm warn config production Use `--omit=dev` instead.
2026-Feb-25 19:42:17.491815 #13 0.280
2026-Feb-25 19:42:17.491815 #13 0.280 > epixum@0.1.0 build
2026-Feb-25 19:42:17.491815 #13 0.280 > next build
2026-Feb-25 19:42:17.491815 #13 0.280
2026-Feb-25 19:42:17.491815 #13 1.496 ▲ Next.js 16.1.1 (Turbopack)
2026-Feb-25 19:42:17.491815 #13 1.496
2026-Feb-25 19:42:17.491815 #13 1.607   Creating an optimized production build ...
2026-Feb-25 19:42:17.491815 #13 15.42 ✓ Compiled successfully in 13.1s
2026-Feb-25 19:42:17.491815 #13 15.44   Running TypeScript ...
2026-Feb-25 19:42:17.491815 #13 28.98 Failed to compile.
2026-Feb-25 19:42:17.491815 #13 28.98
2026-Feb-25 19:42:17.491815 #13 28.98 ./components/TeamManagement.tsx:127:30
2026-Feb-25 19:42:17.491815 #13 28.98 Type error: Cannot find name 'StudentTeamView'.
2026-Feb-25 19:42:17.491815 #13 28.98
2026-Feb-25 19:42:17.491815 #13 28.98   125 |                         </div>
2026-Feb-25 19:42:17.491815 #13 28.98   126 |                         <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/50">
2026-Feb-25 19:42:17.491815 #13 28.98 > 127 |                             <StudentTeamView
2026-Feb-25 19:42:17.491815 #13 28.98       |                              ^
2026-Feb-25 19:42:17.491815 #13 28.98   128 |                                 courseId={courseId}
2026-Feb-25 19:42:17.491815 #13 28.98   129 |                                 team={{
2026-Feb-25 19:42:17.491815 #13 28.98   130 |                                     ...selectedTeamForDetail,
2026-Feb-25 19:42:17.491815 #13 29.10 Next.js build worker exited with code: 1 and signal: null
2026-Feb-25 19:42:17.491815 #13 ERROR: process "/bin/bash -ol pipefail -c npm run build" did not complete successfully: exit code: 1
2026-Feb-25 19:42:17.491815 ------
2026-Feb-25 19:42:17.491815 > [stage-0  9/11] RUN --mount=type=cache,id=focockkgk8ow4k04kogsccok-next/cache,target=/app/.next/cache --mount=type=cache,id=focockkgk8ow4k04kogsccok-node_modules/cache,target=/app/node_modules/.cache npm run build:
2026-Feb-25 19:42:17.491815 28.98 Type error: Cannot find name 'StudentTeamView'.
2026-Feb-25 19:42:17.491815 28.98
2026-Feb-25 19:42:17.491815 28.98   125 |                         </div>
2026-Feb-25 19:42:17.491815 28.98   126 |                         <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/50">
2026-Feb-25 19:42:17.491815 28.98 > 127 |                             <StudentTeamView
2026-Feb-25 19:42:17.491815 28.98       |                              ^
2026-Feb-25 19:42:17.491815 28.98   128 |                                 courseId={courseId}
2026-Feb-25 19:42:17.491815 28.98   129 |                                 team={{
2026-Feb-25 19:42:17.491815 28.98   130 |                                     ...selectedTeamForDetail,
2026-Feb-25 19:42:17.491815 29.10 Next.js build worker exited with code: 1 and signal: null
2026-Feb-25 19:42:17.491815 ------
2026-Feb-25 19:42:17.491815 
2026-Feb-25 19:42:17.491815 1 warning found (use docker --debug to expand):
2026-Feb-25 19:42:17.491815 - UndefinedVar: Usage of undefined variable '$NIXPACKS_PATH' (line 18)
2026-Feb-25 19:42:17.491815 Dockerfile:24
2026-Feb-25 19:42:17.491815 --------------------
2026-Feb-25 19:42:17.491815 22 |     # build phase
2026-Feb-25 19:42:17.491815 23 |     COPY . /app/.
2026-Feb-25 19:42:17.491815 24 | >>> RUN --mount=type=cache,id=focockkgk8ow4k04kogsccok-next/cache,target=/app/.next/cache --mount=type=cache,id=focockkgk8ow4k04kogsccok-node_modules/cache,target=/app/node_modules/.cache npm run build
2026-Feb-25 19:42:17.491815 25 |
2026-Feb-25 19:42:17.491815 26 |
2026-Feb-25 19:42:17.491815 --------------------
2026-Feb-25 19:42:17.491815 ERROR: failed to build: failed to solve: process "/bin/bash -ol pipefail -c npm run build" did not complete successfully: exit code: 1
2026-Feb-25 19:42:17.491815 exit status 1
2026-Feb-25 19:42:17.630158 ========================================
2026-Feb-25 19:42:17.640089 Deployment failed. Removing the new version of your application.
2026-Feb-25 19:42:19.476899 Gracefully shutting down build container: xckgw4c0s0s0s80s08kso0ss