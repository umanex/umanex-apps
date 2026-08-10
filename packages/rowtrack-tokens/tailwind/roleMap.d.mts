/** Types voor roleMap.mjs — met de hand bijgehouden, het bestand is plain JS. */

export declare const COLOR_GROUPS: string[];

export declare function splitColorRole(name: string): { group: string; key: string };

export declare function colorEntries(
  colorRoles: string[]
): Array<{ role: string; group: string; key: string }>;

export declare function colorClassNames(colorRoles: string[]): string[];

export declare function scalarNames(scalarRoles: string[], prefix: string): string[];

export declare function nameRoots(names: string[]): string[];
