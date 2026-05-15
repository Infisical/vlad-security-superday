import { compileUsernameTemplate } from "./templateUtils";

describe("compileUsernameTemplate", () => {
  describe("normal rendering", () => {
    test("renders randomUsername", () => {
      const result = compileUsernameTemplate({
        usernameTemplate: "{{randomUsername}}",
        randomUsername: "abc123"
      });
      expect(result).toBe("abc123");
    });

    test("renders identity.name", () => {
      const result = compileUsernameTemplate({
        usernameTemplate: "{{identity.name}}",
        randomUsername: "unused",
        identity: { name: "myservice" }
      });
      expect(result).toBe("myservice");
    });

    test("renders unixTimestamp", () => {
      const result = compileUsernameTemplate({
        usernameTemplate: "svc_{{unixTimestamp}}",
        randomUsername: "unused",
        unixTimestamp: 1700000000
      });
      expect(result).toBe("svc_1700000000");
    });

    test("applies toUpperCase option", () => {
      const result = compileUsernameTemplate({
        usernameTemplate: "{{randomUsername}}",
        randomUsername: "abc123",
        options: { toUpperCase: true }
      });
      expect(result).toBe("ABC123");
    });

    test("allows hyphen and underscore in result", () => {
      const result = compileUsernameTemplate({
        usernameTemplate: "{{identity.name}}",
        randomUsername: "unused",
        identity: { name: "my_service-01" }
      });
      expect(result).toBe("my_service-01");
    });
  });

  describe("output validation rejects unsafe compiled results", () => {
    test("throws when compiled result contains semicolon", () => {
      expect(() =>
        compileUsernameTemplate({
          usernameTemplate: "{{identity.name}}",
          randomUsername: "unused",
          identity: { name: "poc; SELECT pg_sleep(10); --" }
        })
      ).toThrow("characters not permitted");
    });

    test("throws when compiled result contains a space", () => {
      expect(() =>
        compileUsernameTemplate({
          usernameTemplate: "{{identity.name}}",
          randomUsername: "unused",
          identity: { name: "hello world" }
        })
      ).toThrow("characters not permitted");
    });

    test("throws when compiled result contains single quote", () => {
      expect(() =>
        compileUsernameTemplate({
          usernameTemplate: "{{identity.name}}",
          randomUsername: "unused",
          identity: { name: "o'brien" }
        })
      ).toThrow("characters not permitted");
    });

    test("throws when compiled result exceeds 128 characters", () => {
      expect(() =>
        compileUsernameTemplate({
          usernameTemplate: "{{identity.name}}",
          randomUsername: "unused",
          identity: { name: "a".repeat(129) }
        })
      ).toThrow("characters not permitted");
    });

    test("allows result at exactly 128 characters", () => {
      const result = compileUsernameTemplate({
        usernameTemplate: "{{identity.name}}",
        randomUsername: "unused",
        identity: { name: "a".repeat(128) }
      });
      expect(result).toHaveLength(128);
    });
  });

  describe("integration: sanitized input from toSafeUsername passes output validation", () => {
    test("poc payload sanitized upstream clears output check", () => {
      // Simulates what dynamic-secret-lease-service does before calling the provider
      const sanitized = "poc4a9e518__SELECT_pg_sleep_10____";
      const result = compileUsernameTemplate({
        usernameTemplate: "{{identity.name}}",
        randomUsername: "unused",
        identity: { name: sanitized }
      });
      expect(result).toBe(sanitized);
    });
  });
});
