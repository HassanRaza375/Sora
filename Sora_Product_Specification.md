# Sora --- Personal Time & Task OS

## Product Vision

Sora is a calm, premium, offline-first personal productivity system
designed to help one person:

-   Capture everything
-   Organize commitments
-   Prioritize important work
-   Plan realistic days
-   Understand workload

Core promise:

> Plan your day. Focus on what matters.

------------------------------------------------------------------------

# Brand

Name: Sora

Personality: - Calm - Premium - Focused - Personal - Intentional

Design direction: - Calm + premium - Minimal but powerful - Monochrome
foundation with restrained accent colors

------------------------------------------------------------------------

# Core Workflow

Capture → Organize → Prioritize → Plan → Execute → Review

------------------------------------------------------------------------

# MVP Modules

## 1. Today (Home)

Primary command center.

Contains: - Date and greeting - Daily workload summary - Plan My Day
action - Today's tasks - Overdue warning - Upcoming deadlines

Today is persistent but can be regenerated.

------------------------------------------------------------------------

## 2. Inbox

Purpose: Capture ideas and tasks without forcing organization.

Behavior: - Tasks can remain indefinitely - Inbox count shown in
navigation

------------------------------------------------------------------------

## 3. Tasks

Views: - List (default) - Kanban

Features: - Filters: - Project - Status - Priority - Due date

Task statuses: - To Do - In Progress - Done

Completed tasks leave active views.

------------------------------------------------------------------------

## 4. Projects

Lightweight containers.

Contains: - Name - Description - Color/icon - Tasks - Derived progress

No complex project management features.

------------------------------------------------------------------------

## 5. Calendar

Deadline-focused.

Views: - Month - Agenda

Does not use time blocking.

------------------------------------------------------------------------

## 6. Insights

Light analytics.

Includes: - Tasks completed - Completion rate - Workload - Project
progress - Planning accuracy - Recurring task completion

------------------------------------------------------------------------

## 7. Settings

Includes:

Appearance: - System - Light - Dark

Planning: - Availability hours - Breaks - Unavailable periods

Notifications: - Reminders - Browser notifications

Data: - Export - Import - Backup - Clear data

------------------------------------------------------------------------

# Task Model

Task fields:

Required: - Title - Estimated duration

Optional: - Project - Priority - Due date - Due time - Today -
Recurrence - Notes - Subtasks

Priority: - Urgent - High - Medium - Low

Subtasks: Simple checklist only.

Notes: Plain text.

------------------------------------------------------------------------

# Planning System

Plan My Day uses:

1.  Priority
2.  Deadline
3.  Estimated duration
4.  Available capacity

Planner behavior:

-   Creates a recommended plan
-   Shows overflow tasks
-   Allows manual adjustment

It never silently reschedules.

------------------------------------------------------------------------

# Capacity Management

Users define availability:

Example: - Monday-Friday - Working hours - Break periods

Planner calculates:

Available capacity vs estimated workload

Overloaded days are allowed but clearly indicated.

------------------------------------------------------------------------

# Recurring Tasks

Supported:

-   Daily
-   Weekly
-   Weekdays
-   Specific weekdays
-   Intervals
-   Monthly
-   Yearly

Architecture:

Recurring rule creates task instances.

History is preserved.

------------------------------------------------------------------------

# Notifications

Supported:

-   Browser notifications
-   In-app reminders

Reminder options: - Due time - 5 minutes before - 15 minutes before - 30
minutes before - 1 hour before - 1 day before - Custom

Actions: - Open task - Complete - Snooze

------------------------------------------------------------------------

# Navigation

## Desktop Sidebar

-   Today
-   Inbox
-   Tasks
-   Calendar
-   Projects
-   Insights
-   Settings

Global actions: - New Task - Plan My Day

Sidebar: - Collapsible - Responsive - Icons + tooltips + badges

------------------------------------------------------------------------

## Mobile Navigation

Bottom bar:

-   Today
-   Inbox
-   Tasks
-   Calendar
-   More

More: - Projects - Insights - Settings

------------------------------------------------------------------------

# Task Creation

Task creation opens in a right drawer.

Sections:

## Task

-   Title
-   Project
-   Priority
-   Status
-   Today toggle

## Schedule

-   Due date
-   Estimated duration
-   Recurrence

## Details

-   Notes
-   Subtasks

Editing: Inline auto-save.

------------------------------------------------------------------------

# Search

Features:

-   Visible search
-   Command palette

MVP command palette: - Search - Navigation - Main actions

------------------------------------------------------------------------

# PWA Requirements

Sora is a Progressive Web App.

Capabilities:

-   Installable
-   Offline-first
-   Standalone experience
-   Service worker caching
-   Local data persistence

Stack:

-   Vue 3
-   Vite
-   TypeScript
-   shadcn-vue
-   Tailwind CSS
-   Pinia
-   Dexie.js
-   IndexedDB
-   Vite PWA plugin

------------------------------------------------------------------------

# Data Architecture

## IndexedDB

Managed with Dexie.js.

Stores:

-   tasks
-   subtasks
-   projects
-   recurringRules
-   recurringInstances
-   dailyPlans
-   availabilitySchedules
-   unavailablePeriods
-   completionHistory
-   reminders

## localStorage

Stores:

-   theme preference
-   sidebar state
-   last view
-   UI preferences
-   app configuration

------------------------------------------------------------------------

# Frontend Architecture

Structure:

Components ↓ Composables ↓ Pinia Stores ↓ Services ↓ Dexie Database

------------------------------------------------------------------------

# Design System

## Typography

Font: - Inter / Geist style - system fallback

Scale:

Page title: 32px

Section: 20px

Body: 14px

Secondary: 13px

Caption: 12px

------------------------------------------------------------------------

## Spacing

8px grid:

4 8 12 16 24 32 48 64

------------------------------------------------------------------------

## Shape

Mixed radius system:

-   Inputs: small radius
-   Cards: medium radius
-   Important surfaces: larger radius

------------------------------------------------------------------------

## Theme

Light and dark supported.

Dark: - Soft charcoal - Slate surfaces

Light: - Warm whites - Neutral surfaces

Accent: - Premium indigo/violet

Priority colors: - Muted red - Muted orange - Muted amber - Gray

------------------------------------------------------------------------

# Motion

Polished and subtle.

Use: - Drawer transitions - Hover states - Page transitions - Completion
feedback

Avoid: - Distracting animations

------------------------------------------------------------------------

# Accessibility

Required:

-   Keyboard navigation
-   Focus states
-   Screen-reader labels
-   Contrast compliance
-   Reduced motion support

------------------------------------------------------------------------

# Roadmap

## MVP

-   Tasks
-   Projects
-   Inbox
-   Today
-   Calendar
-   Recurring tasks
-   Planning
-   Notifications
-   Offline PWA
-   Export/import

## Future

-   Weekly planning
-   Habits
-   Task dependencies
-   Advanced command actions
-   More analytics
-   Cloud sync
