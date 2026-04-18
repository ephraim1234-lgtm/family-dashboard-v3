# ADR 0001: Bootstrap Foundation

## Status

Accepted

## Context

This repository began as a narrow build for a self-hosted household operations platform centered on households, identity, scheduling, display, administration, and one worker foundation.

The current codebase has progressed beyond that initial bootstrap slice and now also includes implemented narrow slices for calendar integrations, reminders, chores, and lightweight notes.

The repo guidance explicitly rejects speculative modules, generalized platforms, and business-domain microservice sprawl.

## Decision

Use a single monorepo with:

- one ASP.NET Core API host
- one .NET worker process
- one Next.js web app
- backend module libraries for Households, Identity, Scheduling, Display, and Administration
- one infrastructure library for database/auth wiring
- one small shared-kernel library for truly cross-cutting primitives only

## Why

- keeps operational complexity low
- makes AI-assisted maintenance and review easier
- preserves clear domain boundaries without introducing distributed-system overhead
- allows the worker to reuse core application logic without becoming a separate business domain center

## Consequences

- module boundaries must stay explicit because process boundaries will not enforce them
- the infrastructure library must stay narrow and avoid becoming a dumping ground
- adjacent slices should stay narrow and explicit instead of being generalized into broad cross-domain platforms
- future domains should be added intentionally only when active scope expands

