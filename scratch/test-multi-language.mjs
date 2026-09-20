import assert from "node:assert/strict";
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguageConfig,
  isValidLanguage,
} from "../lib/languageConfig.ts";

console.log("=== Testing Multi-Language Configuration & Validation ===");

// Test 1: Supported languages count and IDs
console.log("1. Total supported languages:", SUPPORTED_LANGUAGES.length);
assert.equal(SUPPORTED_LANGUAGES.length, 8, "Expected 8 supported languages");

const expectedIds = ["javascript", "typescript", "python", "java", "cpp", "c", "go", "rust"];
const actualIds = SUPPORTED_LANGUAGES.map((l) => l.id);
assert.deepEqual(actualIds, expectedIds, "Languages list must match expected IDs");

// Test 2: Default language
console.log("2. Default language:", DEFAULT_LANGUAGE);
assert.equal(DEFAULT_LANGUAGE, "javascript");

// Test 3: getLanguageConfig lookups
const jsConfig = getLanguageConfig("javascript");
assert.equal(jsConfig.judge0Id, 63);
assert.equal(jsConfig.monacoLanguage, "javascript");
assert.equal(jsConfig.supportsFormat, true);

const pyConfig = getLanguageConfig("python");
assert.equal(pyConfig.judge0Id, 71);
assert.equal(pyConfig.monacoLanguage, "python");
assert.equal(pyConfig.supportsFormat, false);

const javaConfig = getLanguageConfig("java");
assert.equal(javaConfig.judge0Id, 62);
assert.equal(javaConfig.monacoLanguage, "java");

const cppConfig = getLanguageConfig(54); // Lookup by Judge0 ID
assert.equal(cppConfig.id, "cpp");

// Test 4: Fallback behavior
const unknownConfig = getLanguageConfig("unknown_lang");
assert.equal(unknownConfig.id, "javascript", "Fallback must be default language");

// Test 5: isValidLanguage
assert.equal(isValidLanguage("python"), true);
assert.equal(isValidLanguage("PYTHON"), true);
assert.equal(isValidLanguage(63), true);
assert.equal(isValidLanguage("malicious_lang"), false);
assert.equal(isValidLanguage(99999), false);
assert.equal(isValidLanguage(null), false);

console.log("\n✅ All Multi-Language tests passed successfully!");
