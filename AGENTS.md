# Repository Guidelines

## Project Structure & Module Organization
- `src/components/`: UI components (feature folders: `scanner/`, `manager/`, etc.). Use `PascalCase` for component files.
- `src/services/`: Data and Firebase helpers (e.g., `transactions.ts`, `scannerService.ts`). Import via aliases like `@/services/...`.
- `src/contexts/`: React Context providers (auth, language, data).
- `src/hooks/`, `src/utils/`, `src/types/`: Reusable logic and typings.
- `src/translations/`: i18n resources.
- `src/tests/setup.ts`: Testing setup (JSDOM matchers).
- `public/`: Static assets. `dist/`: Build output.

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server on `http://localhost:3000`.
- `npm run build`: Type-check (`tsc`) then build with Vite.
- `npm run preview`: Preview the production build locally.
- `npm run lint`: Run ESLint on TS/TSX.
- Testing (Vitest + Testing Library): `npx vitest` or `npx vitest run`. Example: `npx vitest --ui` for an interactive view.
- Env check: `node check-config.js` to validate Firebase `.env` variables.

## Coding Style & Naming Conventions
- TypeScript strict mode enabled; fix types rather than suppressing.
- ESLint configured via `.eslintrc.cjs`; keep warnings at zero for new code.
- Indentation: 2 spaces; favor small, pure functions.
- Components: `PascalCase.tsx`; hooks: `useSomething.ts`; services/utils: `camelCase.ts`.
- Imports: prefer aliases (`@/components/...`) per `tsconfig.json` paths.
- Env vars must be prefixed with `VITE_` and defined in `.env` (copy from `.env.example`).

## Testing Guidelines
- Frameworks: Vitest + @testing-library/react. Co-locate tests as `*.test.tsx` next to components.
- Use `src/tests/setup.ts` for global testing utilities.
- Test strategy: unit-test services/utils; component tests for behavior (not styling). Mock Firebase where possible.

## Commit & Pull Request Guidelines
- Commit style: Conventional Commits (e.g., `feat(i18n): add Malay translations`) and version tags (`vX.Y.Z`) per `VERSIONING.md`.
- PRs must include: concise description, linked issues, screenshots for UI changes, and a test plan (steps or added tests).
- CI hygiene: run `npm run lint` and ensure `npm run build` passes before requesting review.

## Security & Configuration Tips
- Never commit secrets. Use `.env` (gitignored) and validate with `node check-config.js`.
- Keep Firebase Security Rules aligned with features; review `firestore.rules` for changes impacting data access.
