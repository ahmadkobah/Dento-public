// Routing Infrastructure for Multi-Tenant Architecture

export { default as TenantRouter } from './TenantRouter';
export { default as DomainResolver, useDomain } from './DomainResolver';
export { default as ModuleGate, useModules, ModuleRequired, MODULES } from './ModuleGate';
export { default as LanguageRouter, useLanguage, LanguageSwitcher, LANGUAGES } from './LanguageRouter';
export { default as useSubdomain } from './useSubdomain';
