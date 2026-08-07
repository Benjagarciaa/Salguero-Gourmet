/** Une clases condicionalmente (evita dependencia de clsx). */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
