let importing = false;

export function setImporting(value: boolean): void {
  importing = value;
}

export function isImporting(): boolean {
  return importing;
}
