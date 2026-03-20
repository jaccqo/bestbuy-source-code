// react-scroll-to-bottom.d.ts
declare module 'react-scroll-to-bottom' {
  import * as React from 'react'

  export interface ScrollToBottomProps {
    className?: string
    debounce?: number
    followButtonClassName?: string
    mode?: 'top' | 'bottom'
    nonce?: string
    scrollViewClassName?: string
    children: React.ReactNode
  }

  const ScrollToBottom: React.FC<ScrollToBottomProps>

  export function useSticky(): boolean
  export function useScrollToBottom(): () => void
  export function useScrollTo(): { scrollTo: (offset: number) => void }

  export default ScrollToBottom
}