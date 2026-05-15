// toSafeUsername is applied to identity.name for both ActorType.Machine and
// ActorType.IDENTITY (machine identities using Universal Auth resolve to IDENTITY,
// not Machine — both must be handled to prevent empty-username SQL errors).
import { toSafeUsername } from "./dynamic-secret-lease-service";

describe("toSafeUsername", () => {
  test("passes through a clean alphanumeric name", () => {
    expect(toSafeUsername("myservice")).toBe("myservice");
  });

  test("allows underscores and hyphens", () => {
    expect(toSafeUsername("my_service-01")).toBe("my_service-01");
  });

  test("strips semicolons from injection payload", () => {
    expect(toSafeUsername("poc4a9e518; SELECT pg_sleep(10); --")).toBe(
      "poc4a9e518__SELECT_pg_sleep_10____"
    );
  });

  test("strips spaces", () => {
    expect(toSafeUsername("hello world")).toBe("hello_world");
  });

  test("strips SQL comment sequence", () => {
    expect(toSafeUsername("name--comment")).toBe("name__comment");
  });

  test("strips single quotes", () => {
    expect(toSafeUsername("o'brien")).toBe("o_brien");
  });

  test("truncates to 63 characters", () => {
    const long = "a".repeat(100);
    expect(toSafeUsername(long)).toHaveLength(63);
  });

  test("truncation applies after stripping", () => {
    const long = "a;".repeat(50);
    const result = toSafeUsername(long);
    expect(result).toHaveLength(63);
    expect(result).toMatch(/^[a-zA-Z0-9_\-]+$/);
  });

  test("falls back to inf_user when result would be empty", () => {
    expect(toSafeUsername(";;;---")).toBe("inf_user");
  });

  test("falls back to inf_user for empty string", () => {
    expect(toSafeUsername("")).toBe("inf_user");
  });

  test("preserves mixed case", () => {
    expect(toSafeUsername("MyService")).toBe("MyService");
  });
});
