import { describe, test, expect } from "bun:test";
import {
  validateStrReplace,
  applyStrReplace,
  applyInsert,
  viewText,
  type StrReplaceParams,
  type InsertParams,
} from "./text-merge";

describe("Text Merge - validateStrReplace", () => {
  test("should validate successful match with exactly one occurrence", () => {
    const text = "Hello World\nThis is a test\nGoodbye World";
    const oldStr = "This is a test";
    const result = validateStrReplace(text, oldStr);

    expect(result.valid).toBe(true);
    expect(result.matchCount).toBe(1);
    expect(result.error).toBeUndefined();
  });

  test("should fail when string is not found", () => {
    const text = "Hello World\nThis is a test";
    const oldStr = "Not found";
    const result = validateStrReplace(text, oldStr);

    expect(result.valid).toBe(false);
    expect(result.matchCount).toBe(0);
    expect(result.error).toBe("String not found in text");
  });

  test("should fail when multiple matches are found", () => {
    const text = "Hello World\nHello World\nHello World";
    const oldStr = "Hello World";
    const result = validateStrReplace(text, oldStr);

    expect(result.valid).toBe(false);
    expect(result.matchCount).toBe(3);
    expect(result.error).toContain("Multiple matches found (3)");
  });

  test("should handle exact whitespace matching", () => {
    const text = "Line 1\n  Line 2 with spaces\nLine 3";
    const oldStr = "  Line 2 with spaces";
    const result = validateStrReplace(text, oldStr);

    expect(result.valid).toBe(true);
    expect(result.matchCount).toBe(1);
  });

  test("should differentiate between similar strings with different whitespace", () => {
    const text = "Line 1\n  Line 2\nLine 2\nLine 3";
    const oldStr = "  Line 2"; // With leading spaces
    const result = validateStrReplace(text, oldStr);

    expect(result.valid).toBe(true);
    expect(result.matchCount).toBe(1);
  });
});

describe("Text Merge - applyStrReplace", () => {
  test("should replace string successfully", () => {
    const text = "Hello World\nThis is a test\nGoodbye World";
    const params: StrReplaceParams = {
      oldStr: "This is a test",
      newStr: "This is replaced",
    };
    const result = applyStrReplace(text, params);

    expect(result).toBe("Hello World\nThis is replaced\nGoodbye World");
  });

  test("should throw error when string not found", () => {
    const text = "Hello World";
    const params: StrReplaceParams = {
      oldStr: "Not found",
      newStr: "Replacement",
    };

    expect(() => applyStrReplace(text, params)).toThrow("String not found in text");
  });

  test("should throw error when multiple matches exist", () => {
    const text = "Hello\nHello\nHello";
    const params: StrReplaceParams = {
      oldStr: "Hello",
      newStr: "Hi",
    };

    expect(() => applyStrReplace(text, params)).toThrow("Multiple matches found");
  });

  test("should preserve exact whitespace and newlines", () => {
    const text = "Line 1\n\nLine 2\n  Indented line\nLine 3";
    const params: StrReplaceParams = {
      oldStr: "\nLine 2\n  Indented line\n",
      newStr: "\nLine 2 Modified\n  Still indented\n",
    };
    const result = applyStrReplace(text, params);

    expect(result).toBe("Line 1\n\nLine 2 Modified\n  Still indented\nLine 3");
  });

  test("should handle multiline replacements", () => {
    const text = "Header\n\nOld Section:\n- Item 1\n- Item 2\n\nFooter";
    const params: StrReplaceParams = {
      oldStr: "Old Section:\n- Item 1\n- Item 2",
      newStr: "New Section:\n- Item A\n- Item B\n- Item C",
    };
    const result = applyStrReplace(text, params);

    expect(result).toBe("Header\n\nNew Section:\n- Item A\n- Item B\n- Item C\n\nFooter");
  });

  test("should handle empty string replacement", () => {
    const text = "Line 1\nRemove this line\nLine 2";
    const params: StrReplaceParams = {
      oldStr: "Remove this line\n",
      newStr: "",
    };
    const result = applyStrReplace(text, params);

    expect(result).toBe("Line 1\nLine 2");
  });
});

describe("Text Merge - applyInsert", () => {
  test("should insert text at the beginning (line 1)", () => {
    const text = "Line 1\nLine 2\nLine 3";
    const params: InsertParams = {
      lineNumber: 1,
      text: "New Line 0",
    };
    const result = applyInsert(text, params);

    expect(result).toBe("New Line 0\nLine 1\nLine 2\nLine 3");
  });

  test("should insert text in the middle", () => {
    const text = "Line 1\nLine 2\nLine 3";
    const params: InsertParams = {
      lineNumber: 2,
      text: "Inserted Line",
    };
    const result = applyInsert(text, params);

    expect(result).toBe("Line 1\nInserted Line\nLine 2\nLine 3");
  });

  test("should insert text at the end", () => {
    const text = "Line 1\nLine 2\nLine 3";
    const params: InsertParams = {
      lineNumber: 4,
      text: "New Line 4",
    };
    const result = applyInsert(text, params);

    expect(result).toBe("Line 1\nLine 2\nLine 3\nNew Line 4");
  });

  test("should throw error for invalid line number (too small)", () => {
    const text = "Line 1\nLine 2";
    const params: InsertParams = {
      lineNumber: 0,
      text: "Invalid",
    };

    expect(() => applyInsert(text, params)).toThrow("Invalid line number: 0");
  });

  test("should throw error for invalid line number (too large)", () => {
    const text = "Line 1\nLine 2";
    const params: InsertParams = {
      lineNumber: 10,
      text: "Invalid",
    };

    expect(() => applyInsert(text, params)).toThrow("Invalid line number: 10");
  });

  test("should handle inserting multiline text", () => {
    const text = "Line 1\nLine 2";
    const params: InsertParams = {
      lineNumber: 2,
      text: "Multi\nLine\nInsert",
    };
    const result = applyInsert(text, params);

    // Note: Insert inserts the text as-is, treating it as a single "line"
    expect(result).toBe("Line 1\nMulti\nLine\nInsert\nLine 2");
  });
});

describe("Text Merge - Integration Tests", () => {
  test("should apply multiple str_replace operations sequentially", () => {
    let text = "Contact: John Doe\nPhone: 123-456\nEmail: [email protected]";

    // First replacement
    const params1: StrReplaceParams = {
      oldStr: "John Doe",
      newStr: "Jane Smith",
    };
    text = applyStrReplace(text, params1);

    // Second replacement
    const params2: StrReplaceParams = {
      oldStr: "123-456",
      newStr: "789-012",
    };
    text = applyStrReplace(text, params2);

    expect(text).toBe("Contact: Jane Smith\nPhone: 789-012\nEmail: [email protected]");
  });

  test("should combine insert and replace operations", () => {
    let text = "Section 1\nOld Content\nSection 2";

    // Insert new line
    const insertParams: InsertParams = {
      lineNumber: 2,
      text: "New Header",
    };
    text = applyInsert(text, insertParams);

    // Replace old content
    const replaceParams: StrReplaceParams = {
      oldStr: "Old Content",
      newStr: "Updated Content",
    };
    text = applyStrReplace(text, replaceParams);

    expect(text).toBe("Section 1\nNew Header\nUpdated Content\nSection 2");
  });

  test("should handle complex markdown document editing", () => {
    let text = `# Project Documentation

## Overview
This project is about...

## Team
- Lead: John Doe
- Developer: Jane Smith

## Status
In Progress`;

    // Update lead name
    const params1: StrReplaceParams = {
      oldStr: "- Lead: John Doe",
      newStr: "- Lead: Max Mustermann",
    };
    text = applyStrReplace(text, params1);

    // Add new team member
    const params2: InsertParams = {
      lineNumber: 9,
      text: "- Designer: Anna Example",
    };
    text = applyInsert(text, params2);

    expect(text).toContain("- Lead: Max Mustermann");
    expect(text).toContain("- Designer: Anna Example");
  });

  test("should preserve exact indentation and formatting", () => {
    let text = `function example() {
  if (condition) {
    console.log("test");
  }
}`;

    const params: StrReplaceParams = {
      oldStr: '    console.log("test");',
      newStr: '    console.log("updated test");',
    };
    text = applyStrReplace(text, params);

    expect(text).toContain('    console.log("updated test");');
    expect(text).not.toContain('    console.log("test");');
  });
});

describe("Text Merge - Edge Cases", () => {
  test("should handle empty text", () => {
    const text = "";
    const params: InsertParams = {
      lineNumber: 1,
      text: "First line",
    };
    const result = applyInsert(text, params);

    expect(result).toBe("First line\n");
  });

  test("should handle single line text", () => {
    const text = "Single line";
    const params: StrReplaceParams = {
      oldStr: "Single line",
      newStr: "Updated line",
    };
    const result = applyStrReplace(text, params);

    expect(result).toBe("Updated line");
  });

  test("should handle special characters in replacement", () => {
    const text = "Email: user@example.com";
    const params: StrReplaceParams = {
      oldStr: "user@example.com",
      newStr: "admin@test.org",
    };
    const result = applyStrReplace(text, params);

    expect(result).toBe("Email: admin@test.org");
  });

  test("should handle unicode characters", () => {
    const text = "Name: Müller\nCity: München";
    const params: StrReplaceParams = {
      oldStr: "Müller",
      newStr: "Schröder",
    };
    const result = applyStrReplace(text, params);

    expect(result).toBe("Name: Schröder\nCity: München");
  });

  test("should handle very long lines", () => {
    const longLine = "A".repeat(1000);
    const text = `Line 1\n${longLine}\nLine 3`;
    const params: StrReplaceParams = {
      oldStr: longLine,
      newStr: "Replaced",
    };
    const result = applyStrReplace(text, params);

    expect(result).toBe("Line 1\nReplaced\nLine 3");
  });
});
