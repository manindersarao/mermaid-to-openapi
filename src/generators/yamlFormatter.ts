/**
 * Converts a JavaScript object to YAML format.
 *
 * @param obj - The object to convert (can be any type)
 * @param indent - The current indentation level (default: 0)
 * @returns YAML formatted string
 *
 * @example
 * ```ts
 * const obj = {
 *   name: "test",
 *   count: 42,
 *   items: ["a", "b"]
 * };
 * toYaml(obj);
 * // Returns:
 * // name: "test"
 * // count: 42
 * // items:
 * //   - "a"
 * //   - "b"
 * ```
 */
export function toYaml(obj: Record<string, unknown> | unknown, indent = 0): string {
  let yaml = '';
  const spaces = '  '.repeat(indent);

  // Handle primitive values
  if (typeof obj !== 'object' || obj === null) {
    return `${JSON.stringify(obj)}\n`;
  }

  const objectValue = obj as Record<string, unknown>;

  for (const key in objectValue) {
    const value = objectValue[key];

    // Skip undefined values
    if (value === undefined) continue;

    if (typeof value === 'object' && value !== null) {
      // Handle arrays
      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach((item: unknown) => {
          if (typeof item === 'object' && item !== null) {
            yaml += `${spaces}  - ${toYaml(item, indent + 2).trimStart()}`;
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        });
      }
      // Handle empty objects
      else if (Object.keys(value).length === 0) {
        yaml += `${spaces}${key}: {}\n`;
      }
      // Handle nested objects
      else {
        yaml += `${spaces}${key}:\n${toYaml(value, indent + 1)}`;
      }
    }
    // Handle primitive values
    else {
      yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
    }
  }

  return yaml;
}
