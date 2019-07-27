import { HttpServer } from '../HttpServer'
import { RemoteHttpService } from '../RemoteHttpService'
import { initSEA } from '../SEA'

const Gun = require('gun/gun')
require('gun/sea')
const SEA = initSEA(Gun)

describe('HttpServer', () => {
  const port = 4242
  let service: ServiceInterface
  let server: HttpServer
  let listener: any

  beforeEach(() => {
    service = {
      sea: SEA,
      primitives: {
        cryptKeyGen: jest.fn().mockResolvedValue({
          privKey: 'cryptPrivKey',
          pubKey: 'cryptPubKey'
        }),
        signKeyGen: jest.fn().mockResolvedValue({
          privKey: 'signPrivKey',
          pubKey: 'signPubKey'
        }),
        cryptTransformKeyGen: jest
          .fn()
          .mockImplementation(async (keyPair, pubKey) => `transform:${keyPair.privKey}:${pubKey}`),
        encrypt: jest
          .fn()
          .mockImplementation(async (pubKey, plaintext) => `encrypted:${pubKey}:${plaintext}`),
        cryptTransform: jest.fn(),
        decrypt: jest.fn(),
        sign: jest.fn(),
        verify: jest.fn()
      },
      request: jest.fn().mockResolvedValue({
        results: []
      })
    }
    server = new HttpServer(service)
    try {
      listener = server.listen(port, '127.0.0.1')
    } catch (e) {
      console.error(e.stack || e)
    }
  })

  afterEach(() => {
    if (listener) listener.close()
  })

  it('listens for requests on specified port', async () => {
    const userId = 'testuserid'
    const deviceId = 'testdeviceid'
    const documentId = 'testDocumentId'

    const client = new RemoteHttpService(service.primitives, SEA, `http://localhost:${port}`)
    const actions = [
      {
        type: 'DecryptDocument',
        payload: {
          documentId
        }
      }
    ]

    const request = {
      userId,
      deviceId,
      signature: 'signature',
      body: JSON.stringify(actions)
    }

    await client.request(request)

    expect(service.request).toHaveBeenCalledWith(request)
  })

  it('throws errors on server errors', async () => {
    const userId = 'testuserid'
    const deviceId = 'testdeviceid'
    const documentId = 'testDocumentId'

    const client = new RemoteHttpService(
      service.primitives,
      SEA,
      `http://localhost:${port}/intentionallybadurl`
    )
    const actions = [
      {
        type: 'DecryptDocument',
        payload: {
          documentId
        }
      }
    ]

    const request = {
      userId,
      deviceId,
      signature: 'signature',
      body: JSON.stringify(actions)
    }

    let succeeded = false
    try {
      await client.request(request)
      succeeded = true
    } catch (e) {
      expect(e).toEqual(new Error('Bad HTTP Response'))
    }

    expect(succeeded).toEqual(false)
    expect(service.request).not.toHaveBeenCalled()
  })
})
