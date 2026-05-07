import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tutorialSteps } from '@/data/tutorialSteps'
import type { TutorialStep } from '@/types'

interface TutorialState {
  isActive: boolean
  currentIndex: number
  hasCompletedOnce: boolean
  steps: TutorialStep[]
  currentStep: TutorialStep | null
  start: () => void
  next: () => void
  prev: () => void
  skip: () => void
  reset: () => void
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentIndex: 0,
      hasCompletedOnce: false,
      steps: tutorialSteps,
      currentStep: null,

      start: () =>
        set({
          isActive: true,
          currentIndex: 0,
          currentStep: tutorialSteps[0],
        }),

      next: () => {
        const { currentIndex, steps } = get()
        const nextIndex = currentIndex + 1
        if (nextIndex >= steps.length) {
          set({ isActive: false, hasCompletedOnce: true, currentStep: null })
        } else {
          set({ currentIndex: nextIndex, currentStep: steps[nextIndex] })
        }
      },

      prev: () => {
        const { currentIndex, steps } = get()
        const prevIndex = Math.max(0, currentIndex - 1)
        set({ currentIndex: prevIndex, currentStep: steps[prevIndex] })
      },

      skip: () =>
        set({ isActive: false, hasCompletedOnce: true, currentStep: null }),

      reset: () =>
        set({ isActive: false, currentIndex: 0, currentStep: null }),
    }),
    {
      name: 'navi-tutorial',
      partialize: (state) => ({ hasCompletedOnce: state.hasCompletedOnce }),
    }
  )
)
