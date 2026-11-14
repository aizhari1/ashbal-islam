/** Supabase بيرجّع 1000 صف بس في الطلب الواحد — بنجيب على دفعات لحد ما الصفوف تخلص */
export async function fetchAllRows<T = any>(
  make: (from: number, to: number) => PromiseLike<{ data: any; error: any }>,
  maxPages = 40
): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < maxPages; i++) {
    const { data, error } = await make(i * 1000, i * 1000 + 999)
    if (error || !data) break
    out.push(...(data as T[]))
    if (data.length < 1000) break
  }
  return out
}

export const methodLabel = (m: string | null | undefined) => (m ? String(m).replace(/_/g, ' ') : 'غير محدد')
