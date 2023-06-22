export const fieldFocus = ({ selector } : { selector: string } ) => {
  if(typeof window === 'object') {
    const field = document.querySelector(selector) as HTMLInputElement
    field?.focus()
  }
}