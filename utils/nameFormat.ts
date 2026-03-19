export function capitalizeUserName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/);
  const capitalizedWords = words.map((word) =>
    word
      .split(/([-'])/)
      .map((part) => {
        if (part === '-' || part === "'") return part;
        if (!part) return part;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join('')
  );

  return capitalizedWords.join(' ');
}
