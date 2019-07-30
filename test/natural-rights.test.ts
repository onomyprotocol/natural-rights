import { HttpServer, LocalService, LmdbDatabaseAdapter } from '../src/natural-rights-server'
import { Client, RemoteHttpService, initGUN } from '../src/natural-rights-client'
import { Primitives } from './DummyPrimitives'

const Gun = require('gun/gun')
require('gun/sea')
const GUN = initGUN(Gun)
const SEA = GUN.SEA

const path = require('path')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')

describe('Natural rights integration tests', () => {
  const port = 4343
  const testDirPath = path.resolve(__dirname, './integrationtestdata')
  let adapter: LmdbDatabaseAdapter
  let listener: any

  async function connect() {
    const deviceCryptKeyPair = await Primitives.cryptKeyGen()
    const deviceSignKeyPair = await Primitives.signKeyGen()

    return new Client(
      new RemoteHttpService(Primitives, SEA, `http://localhost:${port}`),
      deviceCryptKeyPair,
      deviceSignKeyPair
    )
  }

  beforeEach(async () => {
    await new Promise((ok, fail) =>
      rimraf(testDirPath, (err: any) => {
        if (err) return fail(err)
        mkdirp(testDirPath, (err: any) => (err ? fail(err) : ok()))
      })
    )
    const serverKeyPair = await Primitives.signKeyGen()
    adapter = new LmdbDatabaseAdapter({
      path: testDirPath
    })
    const service = new LocalService(Primitives, SEA, adapter)
    service.signKeyPair = serverKeyPair
    listener = new HttpServer(service).listen(port, '127.0.0.1')
  })

  afterEach(async () => {
    if (listener) listener.close()
    if (adapter) adapter.close()
    await new Promise(ok => rimraf(testDirPath, ok))
  })

  describe('Proxy Re-Encryption Based Access Management', () => {
    let alice: Client
    let bob: Client
    let carol: Client
    let eve: Client

    beforeEach(async () => {
      try {
        alice = await connect()
        await alice.login()
        await alice.registerUser()

        bob = await connect()
        await bob.login()
        await bob.registerUser()

        carol = await connect()
        await carol.login()
        await carol.registerUser()

        eve = await connect()
        await eve.login()
        await eve.registerUser()
      } catch (e) {
        console.error(e.stack || e)
        throw e
      }
    })

    it('allows alice to grant bob read access to a document', async () => {
      const { id: documentId, cryptKeyPair: docCryptKeyPair } = await alice.createDocument()
      await alice.grantReadAccess(documentId, 'user', bob.userId)

      expect(await bob.decryptDocumentEncryptionKey(documentId)).toEqual(docCryptKeyPair.privKey)

      let eveSuccess = false
      try {
        await eve.decryptDocumentEncryptionKey(documentId)
        eveSuccess = true
      } catch (e) {
        expect(e).toEqual([
          {
            type: 'DecryptDocument',
            payload: {
              documentId
            },
            success: false,
            error: 'Unauthorized'
          }
        ])
      }
      expect(eveSuccess).toEqual(false)
    })

    it("allows alice to revoke bob's access to her document", async () => {
      const { id: documentId, cryptKeyPair: docCryptKeyPair } = await alice.createDocument()
      await alice.grantReadAccess(documentId, 'user', bob.userId)

      expect(await bob.decryptDocumentEncryptionKey(documentId)).toEqual(docCryptKeyPair.privKey)
      await alice.revokeAccess(documentId, 'user', bob.userId)

      let bobSuccess = false

      try {
        await bob.decryptDocumentEncryptionKey(documentId)
        bobSuccess = true
      } catch (e) {
        expect(e).toEqual([
          {
            type: 'DecryptDocument',
            payload: {
              documentId
            },
            success: false,
            error: 'Unauthorized'
          }
        ])
      }
      expect(bobSuccess).toEqual(false)
    })

    it('allows bob to grant carol read access to a document he is given read access to from alice', async () => {
      const { id: documentId, cryptKeyPair: docCryptKeyPair } = await alice.createDocument()
      await alice.grantReadAccess(documentId, 'user', bob.userId)
      await bob.grantReadAccess(documentId, 'user', carol.userId)

      expect(await carol.decryptDocumentEncryptionKey(documentId)).toEqual(docCryptKeyPair.privKey)

      let eveSuccess = false
      try {
        await eve.decryptDocumentEncryptionKey(documentId)
        eveSuccess = true
      } catch (e) {
        expect(e).toEqual([
          {
            type: 'DecryptDocument',
            payload: {
              documentId
            },
            success: false,
            error: 'Unauthorized'
          }
        ])
      }
      expect(eveSuccess).toEqual(false)
    })

    it('allows alice to grant bob access to a document through a group', async () => {
      const { id: documentId, cryptKeyPair: docCryptKeyPair } = await alice.createDocument()
      const groupId = await alice.createGroup()
      await alice.grantReadAccess(documentId, 'group', groupId)
      await alice.addReaderToGroup(groupId, bob.userId)

      expect(await bob.decryptDocumentEncryptionKey(documentId)).toEqual(docCryptKeyPair.privKey)

      let eveSuccess = false
      try {
        await eve.decryptDocumentEncryptionKey(documentId)
        eveSuccess = true
      } catch (e) {
        expect(e).toEqual([
          {
            type: 'DecryptDocument',
            payload: {
              documentId
            },
            success: false,
            error: 'Unauthorized'
          }
        ])
      }
      expect(eveSuccess).toEqual(false)
    })

    it('does not allow group members to add other members', async () => {
      try {
        const { id: documentId, cryptKeyPair: docCryptKeyPair } = await alice.createDocument()
        const groupId = await alice.createGroup()
        await alice.grantReadAccess(documentId, 'group', groupId)
        await alice.addReaderToGroup(groupId, bob.userId)

        let bobSuccess = false
        try {
          await bob.addReaderToGroup(groupId, carol.userId)
          bobSuccess = true
        } catch (e) {
          expect(e).toEqual([
            {
              type: 'GetKeyPairs',
              payload: {
                id: groupId,
                kind: 'group'
              },
              success: false,
              error: 'Unauthorized'
            }
          ])
        }
        expect(bobSuccess).toEqual(false)
      } catch (e) {
        console.error(e.stack || e)
        throw e
      }
    })

    it("allows alice to revoke bob's membership in a group", async () => {
      const { id: documentId, cryptKeyPair: docCryptKeyPair } = await alice.createDocument()
      const groupId = await alice.createGroup()
      await alice.grantReadAccess(documentId, 'group', groupId)
      await alice.addReaderToGroup(groupId, bob.userId)

      expect(await bob.decryptDocumentEncryptionKey(documentId)).toEqual(docCryptKeyPair.privKey)

      await alice.removeMemberFromGroup(groupId, bob.userId)

      let bobSuccess = false
      try {
        await bob.decryptDocumentEncryptionKey(documentId)
      } catch (e) {
        expect(e).toEqual([
          {
            type: 'DecryptDocument',
            payload: {
              documentId
            },
            success: false,
            error: 'Unauthorized'
          }
        ])
      }
      expect(bobSuccess).toEqual(false)
    })

    it('allows alice to add bob as a group admin who can then add carol as a member', async () => {
      const { id: documentId, cryptKeyPair: docCryptKeyPair } = await alice.createDocument()
      const groupId = await alice.createGroup()
      await alice.grantReadAccess(documentId, 'group', groupId)

      await alice.addAdminToGroup(groupId, bob.userId)
      await bob.addReaderToGroup(groupId, carol.userId)

      expect(await carol.decryptDocumentEncryptionKey(documentId)).toEqual(docCryptKeyPair.privKey)
    })

    it('allows alice to revoke a groups access to a document', async () => {
      const { id: documentId, cryptKeyPair: docCryptKeyPair } = await alice.createDocument()
      const groupId = await alice.createGroup()
      await alice.grantReadAccess(documentId, 'group', groupId)
      await alice.addReaderToGroup(groupId, bob.userId)

      expect(await bob.decryptDocumentEncryptionKey(documentId)).toEqual(docCryptKeyPair.privKey)

      await alice.revokeAccess(documentId, 'group', groupId)

      let bobSuccess = false
      try {
        await bob.decryptDocumentEncryptionKey(documentId)
        bobSuccess = true
      } catch (e) {
        expect(e).toEqual([
          {
            type: 'DecryptDocument',
            payload: {
              documentId
            },
            success: false,
            error: 'Unauthorized'
          }
        ])
      }
      expect(bobSuccess).toEqual(false)
    })

    describe('Gun integration', () => {
      describe('toSignedNode', () => {
        it('Encrypts and signs node data to be verified by SEA', async () => {
          const { id: documentId } = await alice.createDocument()
          const nodeData = {
            foo: 'barbaz',
            edge: { '#': 'someothersoul' }
          }
          const signedNode = await GUN.toSignedNode(alice, documentId, nodeData)
          expect(await SEA.verifyNode(signedNode)).toEqual(true)

          const encrypted = await SEA.readNodeKey(signedNode, 'foo', documentId)
          const [decrypted] = await alice.decryptDocumentTexts(documentId, [encrypted])
          expect(decrypted).toEqual(nodeData.foo)
        })
      })
    })
  })
})
