const SECRET_KEY = /token|password|secret|authorization|api[-_]?key/i;

export function redactText(text: string) {
  return text
    .replace(/\/api\/webhooks\/[^\s"'?]+/g, "/api/webhooks/[redacted]")
    .replace(/(\w+:\/\/)[^\s/@"']+@/g, "$1[redacted]@");
}

export function isSecretKey(key: string) {
  return SECRET_KEY.test(key);
}
