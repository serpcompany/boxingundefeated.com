/** For tests: the Cache API surface the edge cache uses, in memory and keyed by URL. */
export class MemoryCache {
  readonly stored = new Map<string, Response>()

  async match(key: Request): Promise<Response | undefined> {
    return this.stored.get(key.url)?.clone()
  }

  async put(key: Request, response: Response): Promise<void> {
    this.stored.set(key.url, response)
  }
}
