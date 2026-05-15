/* eslint-disable func-names */
import handlebars from "handlebars";
import RE2 from "re2";

import { logger } from "@app/lib/logger";
import { alphaNumericNanoId } from "@app/lib/nanoid";

export const compileUsernameTemplate = ({
  usernameTemplate,
  randomUsername,
  identity,
  unixTimestamp,
  options
}: {
  usernameTemplate: string;
  randomUsername: string;
  identity?: { name: string };
  unixTimestamp?: number;
  options?: {
    toUpperCase?: boolean;
  };
}): string => {
  // Create isolated handlebars instance
  const hbs = handlebars.create();

  // Register random helper on local instance
  hbs.registerHelper("random", function (length: number) {
    if (typeof length !== "number" || length <= 0 || length > 100) {
      return "";
    }
    return alphaNumericNanoId(length);
  });

  // Register replace helper on local instance
  hbs.registerHelper("replace", function (text: string, searchValue: string, replaceValue: string) {
    // Convert to string if it's not already
    const textStr = String(text || "");
    if (!textStr) {
      return textStr;
    }

    try {
      const re2Pattern = new RE2(searchValue, "g");
      // Replace all occurrences
      return re2Pattern.replace(textStr, replaceValue);
    } catch (error) {
      logger.error(error, "RE2 pattern failed, using original template");
      return textStr;
    }
  });

  // Register truncate helper on local instance
  hbs.registerHelper("truncate", function (text: string, length: number) {
    // Convert to string if it's not already
    const textStr = String(text || "");
    if (!textStr) {
      return textStr;
    }

    if (typeof length !== "number" || length <= 0) return textStr;
    return textStr.substring(0, length);
  });

  // Compile template with context using local instance
  const context = {
    randomUsername,
    unixTimestamp: unixTimestamp || Math.floor(Date.now() / 100),
    identity: {
      name: identity?.name
    }
  };

  const compiled = hbs.compile(usernameTemplate)(context);
  const result = options?.toUpperCase ? compiled.toUpperCase() : compiled;

  // Belt-and-suspenders: reject any compiled username that contains characters
  // outside the safe set before it reaches a provider's SQL or command template.
  // This catches any future template additions or helper combinations that could
  // produce unsafe output even after identity.name is sanitized at the call site.
  const SAFE_USERNAME_RE = /^[a-zA-Z0-9_\-]{1,128}$/;
  if (result && !SAFE_USERNAME_RE.test(result)) {
    throw new Error(
      `Compiled username contains characters not permitted in database usernames. Allowed: letters, digits, underscore, hyphen. Got: "${result}"`
    );
  }

  return result;
};
