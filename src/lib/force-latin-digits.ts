/**
 * يفرض الأرقام الإنجليزية (0-9) في كل toLocaleString / NumberFormat
 * حتى لو الكود طلب ar-EG — عشان الحساب يكون موحّد وواضح.
 * يشتغل على السيرفر والمتصفح.
 */

const ORIG_NUM = Number.prototype.toLocaleString
Number.prototype.toLocaleString = function (
  this: number,
  locales?: string | string[],
  options?: Intl.NumberFormatOptions
): string {
  // أي locale عربي → en-US (أرقام لاتينية)
  const loc = Array.isArray(locales) ? locales[0] : locales
  if (!loc || String(loc).toLowerCase().startsWith('ar')) {
    return ORIG_NUM.call(this, 'en-US', options)
  }
  return ORIG_NUM.call(this, locales as any, options)
}

try {
  const OrigNF = Intl.NumberFormat
  // @ts-expect-error override
  Intl.NumberFormat = function (locales?: string | string[], options?: Intl.NumberFormatOptions) {
    const loc = Array.isArray(locales) ? locales[0] : locales
    if (!loc || String(loc).toLowerCase().startsWith('ar')) {
      return new OrigNF('en-US', options)
    }
    return new OrigNF(locales as any, options)
  }
  Intl.NumberFormat.prototype = OrigNF.prototype
  Object.defineProperty(Intl.NumberFormat, 'supportedLocalesOf', {
    value: OrigNF.supportedLocalesOf.bind(OrigNF),
  })
} catch {
  /* ignore */
}

export {}
