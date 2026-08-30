import { describe, expect, it } from "vitest"
import en from "./en.json"
import ja from "./ja.json"
import vi from "./vi.json"

const locales = { ja, vi } as Record<string, Record<string, string>>
const enKeys = Object.keys(en as Record<string, string>)

const SHARED = new Set(["tls_ssl", "filter_mode_glob", "filter_mode_regex", "root_ca_cert_placeholder", "client_cert_placeholder", "client_key_placeholder"])

const placeholders = (s: string) => (s.match(/{{\s*\w+\s*}}/g) ?? []).sort().join(",")
const newlines = (s: string) => (s.match(/\n/g) ?? []).length

describe.each(Object.entries(locales))("%s", (name, locale) => {
  it("covers every key in en.json", () => {
    expect(enKeys.filter(k => locale[k] === undefined)).toEqual([])
  })

  it("has no key en.json lacks", () => {
    const en_ = en as Record<string, string>
    expect(Object.keys(locale).filter(k => en_[k] === undefined)).toEqual([])
  })

  it("keeps every {{placeholder}} from en.json", () => {
    const en_ = en as Record<string, string>
    const broken = enKeys.filter(k => locale[k] !== undefined && placeholders(en_[k]) !== placeholders(locale[k]))
    expect(broken).toEqual([])
  })

  it("keeps the line breaks en.json has", () => {
    const en_ = en as Record<string, string>
    const broken = enKeys.filter(k => locale[k] !== undefined && newlines(en_[k]) !== newlines(locale[k]))
    expect(broken).toEqual([])
  })

  it("has no empty translation", () => {
    const blank = enKeys.filter(k => locale[k] === "" && k !== "console_hint_use")
    expect(blank).toEqual([])
  })
})

describe("vi", () => {
  it("contains no Japanese script", () => {
    const cjk = /[぀-ヿ一-鿿]/
    expect(enKeys.filter(k => cjk.test(vi[k as keyof typeof vi]))).toEqual([])
  })

  it("is not a copy of en.json", () => {
    const en_ = en as Record<string, string>
    const copied = enKeys.filter(k => vi[k as keyof typeof vi] === en_[k] && !SHARED.has(k))
    expect(copied.length).toBeLessThan(enKeys.length * 0.1)
  })
})

describe("ja", () => {
  it("contains Japanese script in most values", () => {
    const cjk = /[぀-ヿ一-鿿]/
    const translated = enKeys.filter(k => cjk.test(ja[k as keyof typeof ja]))
    expect(translated.length).toBeGreaterThan(enKeys.length * 0.6)
  })
})
