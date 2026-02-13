import {
  assertHexSha256,
  buildDeterministicArtifactId,
  buildDeterministicIdempotencyKey,
  canonicalJson,
  canonicalPayloadHash,
  lengthPrefixedEncode,
  sha256Hex,
} from "../../../lib/governance/authority/hash";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function testCanonicalJsonSortsKeys() {
  const a = canonicalJson({ b: 2, a: 1, nested: { z: 9, y: 8 } });
  const b = canonicalJson({ nested: { y: 8, z: 9 }, a: 1, b: 2 });
  assert(a === b, "Expected canonicalJson to be key-order deterministic");
}

function testDeterministicIdsAreStable() {
  const payloadHash = canonicalPayloadHash({ policy: "x", version: 1 });
  const first = buildDeterministicArtifactId({
    artifactClass: "authority_policy_version",
    tenantId: "",
    primaryKeyFields: ["policy-1", "schema-v1"],
    canonicalPayloadHash: payloadHash,
  });
  const second = buildDeterministicArtifactId({
    artifactClass: "authority_policy_version",
    tenantId: "",
    primaryKeyFields: ["policy-1", "schema-v1"],
    canonicalPayloadHash: payloadHash,
  });
  assert(first === second, "Expected deterministic artifact id stability");

  const idempotency = buildDeterministicIdempotencyKey({
    artifactClass: "authority_policy_version",
    tenantId: "",
    primaryKeyFields: ["policy-1", "schema-v1"],
    canonicalPayloadHash: payloadHash,
  });
  assert(first !== idempotency, "Expected artifact id and idempotency key to differ");

  assertHexSha256(first, "artifactId");
  assertHexSha256(idempotency, "idempotencyKey");
}

function testLengthPrefixedEncodingIsUnambiguous() {
  const one = lengthPrefixedEncode(["ab", "c"]);
  const two = lengthPrefixedEncode(["a", "bc"]);
  assert(one !== two, "Expected length-prefixed encoding to avoid concatenation ambiguity");
}

function testSha256Hex() {
  const hash = sha256Hex("gov04");
  assert(hash.length === 64, "Expected sha256 hex length");
  assert(/^[a-f0-9]{64}$/i.test(hash), "Expected lowercase hex-compatible output");
}

function run() {
  testCanonicalJsonSortsKeys();
  testDeterministicIdsAreStable();
  testLengthPrefixedEncodingIsUnambiguous();
  testSha256Hex();
}

run();
