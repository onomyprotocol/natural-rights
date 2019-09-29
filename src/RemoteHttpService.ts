import 'isomorphic-fetch'
declare const fetch: any

export class RemoteHttpService implements ServiceInterface {
  primitives: PrimitivesInterface
  sea: SEAPrimitivesInterface
  url: string

  constructor(primitives: PrimitivesInterface, sea: SEAPrimitivesInterface, url: string) {
    this.primitives = primitives
    this.url = url
    this.sea = sea
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
