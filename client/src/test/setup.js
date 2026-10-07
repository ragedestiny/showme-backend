// Runs before every test file.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
// Readable checks such as expect(element).toBeInTheDocument()
import "@testing-library/jest-dom/vitest";

// Wipe the pretend screen after each test so tests can't affect each other.
afterEach(() => {
  cleanup();
});
