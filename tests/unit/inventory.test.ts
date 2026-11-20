import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ORDER_TRANSITIONS, RETURN_TRANSITIONS, ROLE_PERMISSIONS, permissionsFor } from "../../src/lib/constants";
import { normalizePhone, isValidPhone, formatPhone } from "../../src/lib/phone";
import { toMillimes, formatMoney } from "../../src/lib/money";

describe("order status machine", () => {
  it("allows pending → confirmed / cancelled only", () => {
    assert.deepEqual(ORDER_TRANSITIONS.PENDING, ["CONFIRMED", "CANCELLED"]);
  });
  it("blocks transitions from delivered", () => {
    assert.deepEqual(ORDER_TRANSITIONS.DELIVERED, []);
  });
  it("allows shipped → delivered or cancelled", () => {
    assert.ok(ORDER_TRANSITIONS.SHIPPED.includes("DELIVERED"));
    assert.ok(ORDER_TRANSITIONS.SHIPPED.includes("CANCELLED"));
  });
});

describe("return status machine", () => {
  it("starts at REQUESTED with approve/reject/cancel", () => {
    assert.deepEqual(RETURN_TRANSITIONS.REQUESTED.sort(), ["APPROVED", "CANCELLED", "REJECTED"].sort());
  });
});

describe("roles", () => {
  it("owner has every permission", () => {
    const perms = permissionsFor("OWNER");
    assert.ok(perms.has("staff.manage"));
    assert.ok(perms.has("settings.manage"));
    assert.ok(perms.has("orders.cancel"));
  });
  it("employee cannot manage products or staff", () => {
    const perms = permissionsFor("EMPLOYEE");
    assert.equal(perms.has("products.manage"), false);
    assert.equal(perms.has("staff.manage"), false);
    assert.ok(perms.has("orders.view"));
    assert.ok(perms.has("orders.update"));
  });
  it("manager override cannot grant staff.manage", () => {
    const perms = permissionsFor("MANAGER", "staff.manage,products.manage");
    assert.equal(perms.has("staff.manage"), false);
    assert.ok(perms.has("products.manage"));
  });
  it("employee default set matches ROLE_PERMISSIONS", () => {
    assert.deepEqual([...permissionsFor("EMPLOYEE")].sort(), [...ROLE_PERMISSIONS.EMPLOYEE].sort());
  });
});

describe("tunisian phone", () => {
  it("normalizes 8-digit national numbers", () => {
    assert.equal(normalizePhone("98 123 456"), "+21698123456");
    assert.equal(isValidPhone("98123456"), true);
  });
  it("rejects invalid lengths", () => {
    assert.equal(normalizePhone("123"), null);
    assert.equal(isValidPhone("123"), false);
  });
  it("formats for display", () => {
    assert.equal(formatPhone("+21698123456"), "+216 98 123 456");
  });
});

describe("money", () => {
  it("converts dinars to millimes", () => {
    assert.equal(toMillimes(45), 45_000);
    assert.equal(toMillimes(45.5), 45_500);
  });
  it("formats millimes", () => {
    const s = formatMoney(45_000);
    assert.match(s, /45/);
  });
});
