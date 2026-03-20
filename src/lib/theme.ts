// src/lib/theme.ts
export const applyTheme = (theme: "light" | "dark") => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
  localStorage.setItem("theme", theme)
}

export const getPreferredTheme = (): "light" | "dark" => {
  const saved = localStorage.getItem("theme") as "light" | "dark" | null
  if (saved) return saved

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}