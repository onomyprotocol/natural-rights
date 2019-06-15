import 'isomorphic-fetch'

export class RemoteHttpService implements ServiceInterface {
  primitives: PrimitivesInterface
  url: string

  constructor(primitives: PrimitivesInterface, url: string) {
    this.primitives = primitives
    this.url = url
  }

  async request(req: NaturalRightsRequest) {
    const httpResponse = await fetch(this.url, {
      method: 'POST',
      body: JSON.stringify(req),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (httpResponse.status >= 300) throw new Error('Bad HTTP Response')
    const response = await httpResponse.json()
    return response as NaturalRightsResponse
  }
}
