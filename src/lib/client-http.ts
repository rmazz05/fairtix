export async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => {
    throw new Error("Fairtix returned an unreadable response. Try again.");
  });
  if (!response.ok)
    throw new Error(
      body.error || "The request could not be completed. Try again.",
    );
  return body as T;
}
