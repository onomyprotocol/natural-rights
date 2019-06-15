export class RemoteHttpService implements ServiceInterface {
  primitives: PrimitivesInterface
  baseUrl: string

  constructor(primitives: PrimitivesInterface, baseUrl: string) {
    this.primitives = primitives
    this.baseUrl = baseUrl
  }

  async request(req: NaturalRightsRequest) {
    throw new Error('Not yet implemented')

    return {
      results: []
    } as NaturalRightsResponse
  }
}
