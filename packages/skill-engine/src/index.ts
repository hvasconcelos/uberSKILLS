// @uberskills/skill-engine -- skill parsing, validation, generation, substitution
// Note: exporter is server-only — import from "@uberskills/skill-engine/server"

export { generateSkillMd } from "./generator";
export { type ParseResult, parseSkillMd } from "./parser";
export { detectPlaceholders, substitute } from "./substitutions";
export {
  type BuildSystemPromptOptions,
  type BuildSystemPromptResult,
  buildTestSystemPrompt,
  type SystemPromptFile,
} from "./system-prompt-builder";
export { type ValidationResult, validateSkill } from "./validator";
