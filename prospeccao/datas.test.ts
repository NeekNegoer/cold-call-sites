import { test } from "node:test";
import assert from "node:assert/strict";
import { hojeEmSaoPaulo } from "./datas.ts";

test("usa o fuso de São Paulo", () => {
  assert.equal(hojeEmSaoPaulo(new Date("2026-10-10T01:30:00Z")), "2026-10-09");
  assert.equal(hojeEmSaoPaulo(new Date("2026-10-10T03:30:00Z")), "2026-10-10");
});
