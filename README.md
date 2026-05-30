# ScamShield (unofficial)

A check-and-report anti-scam app: paste a suspicious message, get a verdict, report confirmed scams. A React Native (Expo) app backed by a NestJS API on AWS serverless.

This is a personal portfolio build that mirrors the **stack and shape** of Singapore's ScamShield. It is **not affiliated with, endorsed by, or connected to** the official ScamShield, Open Government Products, GovTech, or the Singapore Police Force. "ScamShield" is used here only to describe what this replica is modeled on.

## Why it exists

Built to demonstrate the stack and engineering practices of the real ScamShield (TypeScript + React, NestJS, PostgreSQL, AWS, IaC, CI/CD, SSDLC, SQS, OpenSearch, ML/LLM classification, push notifications). The point is not feature breadth, it is rigor: every requirement is specified, tested at the right layer, and proven by a real run, including on-device end-to-end and a real cloud deploy.

## Stack

- **App:** Expo (React Native) + Expo Router, TypeScript strict
- **API:** NestJS (TypeScript), class-validator at the boundary, serverless-express on AWS Lambda + API Gateway
- **Async:** AWS SQS report-intake queue + idempotent worker Lambda
- **Classifier:** offline heuristic on-device + a server classifier with an LLM hook (deterministic fallback)
- **Push:** Expo push (APNs/FCM) when a report is confirmed a scam
- **Data:** PostgreSQL-ready (Neon), OpenSearch-ready for clustering similar reports
- **Infra:** AWS CDK (Lambda + API Gateway HTTP API + SQS), GitHub Actions
- Built on a custom mobile platform template: https://github.com/elleskay/mobile-platform

## What is proven (not just written)

Every requirement in `specs/scamshield.yml` is verified by a real run. The coverage gate is **10/10**:

| Layer | Requirements | Proven by |
|---|---|---|
| Unit (data) | classifier verdicts | jest-expo, in CI |
| Component (ui) | check button enable/disable | jest-expo + React Native Testing Library, in CI |
| Integration (API) | `/reports/check` 200, validation 400s, idempotent SQS consumer, push on scam | vitest + supertest, in CI |
| E2E (journey) | check-a-message and report-a-scam flows | **Maestro on a real Android emulator against the live API**, in CI |
| Manual (security) | no secrets in the release bundle | signed verification artifact (real bundle scan) |

Beyond CI, the API was deployed to AWS for real (`cdk deploy`) and passed a full post-deploy smoke test (6/6), then torn down. The deploy path is reproducible via `infra/cdk`.

## How it is tested (spec-driven gate)

The build is driven by a YAML spec with one ID per requirement, and a coverage gate that refuses to pass unless every requirement has a passing test at its declared `verify` level (`unit | component | integration | contract | e2e | native | manual`). Native/manual requirements (things a JS test cannot prove, like OS-level behavior or a no-secrets bundle scan) are satisfied by a signed, freshness-checked verification artifact rather than a green checkmark nobody earned. See `docs/TESTING.md`.

## Run it

```bash
npm install
npm run test:spec        # jest-expo + vitest, then the coverage gate
npm run -w @app/scamshield start          # Expo dev server
npm run -w @service/scamshield-api start:dev   # API on :3000
```

Deploy the API (needs an AWS account, see `docs/DEPLOY.md` and `docs/SETUP.md`):

```bash
cd infra/cdk/_template && npm install && npx cdk deploy
```

## Structure

```
apps/app/            Expo app (check + report screens, classifier, API client)
services/api/        NestJS API (reports check/submit, SQS consumer, classifier, push)
infra/cdk/           CDK: NestjsApi construct (Lambda + API Gateway + SQS)
packages/spec-test/  Spec-driven test runner + coverage gate
specs/scamshield.yml The requirement spec
verification/        Signed artifacts for native/manual requirements
.maestro/            (in apps/app) e2e flows
```

## Scope and roadmap

In scope (the shippable spine): check-and-report, API + SQS intake, push on scam, input validation, no secrets in the bundle.

Deferred to a Phase 2 (the real ScamShield's signature features): native **call blocking / identification** and **SMS filtering**. These cannot be done in JavaScript, they require iOS Call Directory + Message Filter extensions (Swift) and Android CallScreeningService (Kotlin), plus device builds and signed real-device verification. Reference implementations and the wiring live in the platform template.

## Disclaimer

Unofficial, educational/portfolio project. Not the official ScamShield. Do not use it to report real scams; use the official ScamShield channels.
