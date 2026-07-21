export function formatEmployeeDisplayName(
  name: string,
  isPartTime: boolean,
): string {
  return isPartTime ? `${name} (Part-Time)` : name;
}
