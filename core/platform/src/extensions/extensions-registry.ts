import type { Application } from "express";

/**
 * Core Extension Registry
 * Authoritative list of registered extensions.
 *
 * No extension logic is executed here.
 */

export type RegisteredExtension = {
  id: string;
  register: (app: Application) => void;
};

const registry: RegisteredExtension[] = [];

export function registerExtension(ext: RegisteredExtension): void {
  registry.push(ext);
}

export function registerAllExtensions(app: Application): void {
  for (const ext of registry) {
    ext.register(app);
  }
}

export function listExtensions(): ReadonlyArray<RegisteredExtension> {
  return Object.freeze([...registry]);
}
