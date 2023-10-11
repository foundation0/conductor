export const fieldFocus = ({ selector, delay = 200 }: { selector: string; delay?: number }) => {
  if (typeof window === "object") {
    const field = document.querySelector(selector) as HTMLInputElement
    setTimeout(() => field?.focus(), delay)
  }
}
