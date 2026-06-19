#!/usr/bin/env node
export declare function cockpitCommand(argv: readonly string[]): Promise<number>;
export declare function parseHookPayload(raw: string): unknown | null;
export declare function isCliEntry(importMetaUrl: string, argvPath: string | undefined): boolean;
