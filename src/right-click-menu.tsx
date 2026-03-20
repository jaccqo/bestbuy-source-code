// src/RightClickMenu.tsx
import React, { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Import Tauri Clipboard Manager API
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager"

export const RightClickMenu: React.FC = () => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [selection, setSelection] = useState<string>("") // Store selection
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null) // Store focused element

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      setPosition({ x: e.clientX, y: e.clientY })

      // Capture current selection
      const sel = window.getSelection()?.toString() || ""
      setSelection(sel)

      // Capture focused element
      setFocusedElement(document.activeElement as HTMLElement | null)
    }

    const handleClick = () => setPosition(null)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") return e.preventDefault()
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c", "k"].includes(e.key.toLowerCase())) {
        return e.preventDefault()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        return e.preventDefault()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        return e.preventDefault()
      }
    }

    window.addEventListener("contextmenu", handleContextMenu)
    window.addEventListener("click", handleClick)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu)
      window.removeEventListener("click", handleClick)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Copy stored selection using Tauri Clipboard Manager
  const handleCopy = async () => {
    if (selection) {
      try {
        await writeText(selection)
   
      } catch (err) {
        console.error("Failed to copy:", err)
      }
    }
    setPosition(null)
  }

  // Paste text from clipboard into captured focused element
  const handlePaste = async () => {
    if (!focusedElement) return
    try {
      const text = await readText()

      if ("value" in focusedElement) {
        const input = focusedElement as HTMLInputElement | HTMLTextAreaElement
        const start = input.selectionStart ?? 0
        const end = input.selectionEnd ?? 0
        input.value = input.value.slice(0, start) + text + input.value.slice(end)
        input.selectionStart = input.selectionEnd = start + text.length
        input.focus()
      } else if (focusedElement.isContentEditable) {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          sel.deleteFromDocument()
          sel.getRangeAt(0).insertNode(document.createTextNode(text))
        }
      }
    } catch (err) {
      console.error("Failed to paste:", err)
    }
    setPosition(null)
  }

  if (!position) return null

  return (
    <DropdownMenu open={!!position} onOpenChange={(open) => !open && setPosition(null)}>
      <DropdownMenuTrigger asChild>
        <div
          style={{
            position: "fixed",
            top: position.y,
            left: position.x,
            width: 0,
            height: 0,
          }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* <DropdownMenuItem onClick={() => window.location.reload()}>
          Refresh <span style={{ marginLeft: "auto", opacity: 0.6 }}>F5</span>
        </DropdownMenuItem> */}
        <DropdownMenuItem onClick={handleCopy} disabled={!selection}>
          Copy <span style={{ marginLeft: "auto", opacity: 0.6 }}>Ctrl+C</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePaste}>
          Paste <span style={{ marginLeft: "auto", opacity: 0.6 }}>Ctrl+V</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
