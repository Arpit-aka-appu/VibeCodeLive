export interface LanguageConfig {
  id: string;
  label: string;
  monacoLanguage: string;
  compilerLanguage: string;
  judge0Id: number;
  extension: string;
  defaultCode: string;
  supportsFormat: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: "javascript",
    label: "JavaScript",
    monacoLanguage: "javascript",
    compilerLanguage: "javascript",
    judge0Id: 63,
    extension: ".js",
    defaultCode: `// JavaScript Playground
function main() {
  console.log("Hello, World!");
}

main();
`,
    supportsFormat: true,
  },
  {
    id: "typescript",
    label: "TypeScript",
    monacoLanguage: "typescript",
    compilerLanguage: "typescript",
    judge0Id: 74,
    extension: ".ts",
    defaultCode: `// TypeScript Playground
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
`,
    supportsFormat: true,
  },
  {
    id: "python",
    label: "Python",
    monacoLanguage: "python",
    compilerLanguage: "python",
    judge0Id: 71,
    extension: ".py",
    defaultCode: `# Python Playground
def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`,
    supportsFormat: false,
  },
  {
    id: "java",
    label: "Java",
    monacoLanguage: "java",
    compilerLanguage: "java",
    judge0Id: 62,
    extension: ".java",
    defaultCode: `// Java Playground
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
    supportsFormat: false,
  },
  {
    id: "cpp",
    label: "C++",
    monacoLanguage: "cpp",
    compilerLanguage: "cpp",
    judge0Id: 54,
    extension: ".cpp",
    defaultCode: `// C++ Playground
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`,
    supportsFormat: false,
  },
  {
    id: "c",
    label: "C",
    monacoLanguage: "c",
    compilerLanguage: "c",
    judge0Id: 50,
    extension: ".c",
    defaultCode: `// C Playground
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
    supportsFormat: false,
  },
  {
    id: "go",
    label: "Go",
    monacoLanguage: "go",
    compilerLanguage: "go",
    judge0Id: 60,
    extension: ".go",
    defaultCode: `// Go Playground
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`,
    supportsFormat: false,
  },
  {
    id: "rust",
    label: "Rust",
    monacoLanguage: "rust",
    compilerLanguage: "rust",
    judge0Id: 73,
    extension: ".rs",
    defaultCode: `// Rust Playground
fn main() {
    println!("Hello, World!");
}
`,
    supportsFormat: false,
  },
];

export const DEFAULT_LANGUAGE = "javascript";

export function getLanguageConfig(langIdOrAlias?: string | number): LanguageConfig {
  if (langIdOrAlias === undefined || langIdOrAlias === null) {
    return SUPPORTED_LANGUAGES[0];
  }

  if (typeof langIdOrAlias === "number") {
    const byId = SUPPORTED_LANGUAGES.find((l) => l.judge0Id === langIdOrAlias);
    return byId || SUPPORTED_LANGUAGES[0];
  }

  const normalized = String(langIdOrAlias).toLowerCase().trim();
  const found = SUPPORTED_LANGUAGES.find(
    (l) =>
      l.id === normalized ||
      l.monacoLanguage === normalized ||
      l.compilerLanguage === normalized ||
      l.label.toLowerCase() === normalized ||
      String(l.judge0Id) === normalized
  );

  return found || SUPPORTED_LANGUAGES[0];
}

export function isValidLanguage(langIdOrAlias?: string | number): boolean {
  if (langIdOrAlias === undefined || langIdOrAlias === null) return false;

  if (typeof langIdOrAlias === "number") {
    return SUPPORTED_LANGUAGES.some((l) => l.judge0Id === langIdOrAlias);
  }

  const normalized = String(langIdOrAlias).toLowerCase().trim();
  return SUPPORTED_LANGUAGES.some(
    (l) =>
      l.id === normalized ||
      l.monacoLanguage === normalized ||
      l.compilerLanguage === normalized ||
      l.label.toLowerCase() === normalized ||
      String(l.judge0Id) === normalized
  );
}
