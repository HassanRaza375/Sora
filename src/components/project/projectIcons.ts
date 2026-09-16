import { Folder, BookOpen, Briefcase, Heart, Home, Palette, Rocket, Star, Target, Zap } from '@lucide/vue'
import type { Component } from 'vue'

// A small fixed set rather than a full icon picker — an MVP-appropriate
// tradeoff (see CLAUDE.md). The map key is what's stored on Project.icon;
// keep it stable once projects exist, since renaming a key would silently
// orphan any project already using it (its icon would just stop resolving).
export const projectIcons: Record<string, Component> = {
  folder: Folder,
  rocket: Rocket,
  target: Target,
  briefcase: Briefcase,
  home: Home,
  heart: Heart,
  star: Star,
  zap: Zap,
  'book-open': BookOpen,
  palette: Palette,
}

export const projectIconKeys = Object.keys(projectIcons)
