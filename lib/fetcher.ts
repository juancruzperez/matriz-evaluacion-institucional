export async function fetcher<T>(
  url: string,
): Promise<T> {
  const response = await fetch(url)

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error ??
        "Error al cargar los datos.",
    )
  }

  return data as T
}