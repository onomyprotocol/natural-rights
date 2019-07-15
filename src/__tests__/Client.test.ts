import { Client } from '../Client'
import { SEA } from '../SEA'

describe('Client', () => {
  let service: ServiceInterface
  const userId = 'testuserid'
  const deviceId = 'testdeviceid'
  const userCryptKeyPair = {
    privKey: 'userCryptPrivKey',
    pubKey: 'userCryptPubKey'
  }
  const deviceCryptKeyPair = {
    privKey: 'deviceCryptPrivKey',
    pubKey: 'deviceCryptPubKey'
  }

  const deviceSignKeyPair = {
    privKey: 'deviceSignPrivKey',
    pubKey: 'deviceSignPubKey'
  }

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
  })

  describe('sign', () => {
    it('stringifies and signs passed actions', async () => {
      const expectedSignature = 'signature'
      service.primitives.sign = jest.fn().mockResolvedValue(expectedSignature)
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const actions = [
        {
          type: 'GrantAccess',
          payload: {
            documentId: '',
            kind: 'user',
            id: ''
          }
        } as Action<GrantAccessAction>
      ]

      const result = await client.sign(actions)

      expect(JSON.parse(result.body)).toEqual(actions)
      expect(result.userId).toEqual(client.userId)
      expect(result.deviceId).toEqual(client.deviceId)
      expect(result.signature).toEqual(expectedSignature)
      expect(service.primitives.sign).toHaveBeenCalledWith(deviceSignKeyPair, result.body)
    })
  })

  describe('request', () => {
    it('signs passed actions and sends request to service', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const expectedRequest = {
        userId,
        deviceId,
        body: '',
        signature: ''
      }
      client.sign = jest.fn().mockResolvedValue(expectedRequest)
      const actions = [
        {
          type: 'GrantAccess',
          payload: {
            documentId: '',
            kind: 'user',
            id: ''
          }
        } as Action<GrantAccessAction>
      ]

      await client.request(actions)
      expect(client.sign).toHaveBeenCalledWith(actions)
      expect(service.request).toHaveBeenCalledWith(expectedRequest)
    })

    it('throws errors if encountered in response', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const errors = [
        {
          type: 'GrantAccess',
          payload: {
            documentId: 'someDocId',
            kind: 'user',
            id: 'someUserId'
          },
          success: false,
          error: 'Some error'
        }
      ]
      const successes = [
        {
          type: 'GrantAccess',
          payload: {
            documentId: 'someDocId',
            kind: 'user',
            id: 'someUserId'
          },
          success: true,
          error: ''
        }
      ]

      service.request = jest.fn().mockResolvedValue({
        results: [...errors, ...successes]
      })

      let success = false

      try {
        await client.request([])
        success = true
      } catch (e) {
        expect(e).toEqual(errors)
      }

      expect(success).toEqual(false)
    })
  })

  describe('initializeUser', () => {
    it('uses cryptKeyGen to generate encryption key pair', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      await client.initializeUser()
      expect(service.primitives.cryptKeyGen).toHaveBeenCalled()
    })

    it('uses signKeyGen to generate signing key pair', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      await client.initializeUser()
      expect(service.primitives.cryptKeyGen).toHaveBeenCalled()
    })

    it('uses Encrypt to encrypt private keys', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      await client.initializeUser()
      expect(service.primitives.encrypt).toHaveBeenCalledWith(
        'cryptPubKey',
        'signPrivKey',
        deviceSignKeyPair
      )
      expect(service.primitives.encrypt).toHaveBeenCalledWith(
        'cryptPubKey',
        'cryptPrivKey',
        deviceSignKeyPair
      )
    })

    it('makes a request including userId, public keys and encrypted private keys', async () => {
      const client = new Client(service, '', deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })
      const userSignKeyPair = {
        pubKey: 'userSignPubKey',
        privKey: 'userSignPrivKey'
      }
      service.primitives.signKeyGen = jest.fn().mockResolvedValue(userSignKeyPair)

      await client.initializeUser()

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'InitializeUser',
          payload: {
            cryptPubKey: 'cryptPubKey',
            encCryptPrivKey: 'encrypted:cryptPubKey:cryptPrivKey',
            encSignPrivKey: `encrypted:cryptPubKey:${userSignKeyPair.privKey}`,
            userId: userSignKeyPair.pubKey
          }
        },
        {
          type: 'AddDevice',
          payload: {
            cryptPubKey: 'deviceCryptPubKey',
            signPubKey: 'deviceSignPubKey',
            cryptTransformKey: 'transform:cryptPrivKey:deviceCryptPubKey',
            deviceId,
            userId: userSignKeyPair.pubKey
          }
        }
      ])
    })
  })

  describe('addDevice', () => {
    it('makes a request including userId, deviceId, public and transform keys', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })
      client.getEncryptionKeyPair = jest.fn().mockResolvedValue(userCryptKeyPair)

      const newDeviceId = 'newDeviceId'

      await client.addDevice(newDeviceId)

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'AddDevice',
          payload: {
            cryptPubKey: 'cryptPubKey',
            signPubKey: 'signPubKey',
            cryptTransformKey: 'transform:userCryptPrivKey:cryptPubKey',
            deviceId: newDeviceId,
            userId
          }
        }
      ])
    })
  })

  describe('removeDevice', () => {
    it('makes a request including userId and deviceId', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const toRemoveId = 'removeDeviceId'
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.removeDevice(toRemoveId)
      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'RemoveDevice',
          payload: {
            userId,
            deviceId: toRemoveId
          }
        }
      ])
    })
  })

  describe('createGroup', () => {
    it('uses KeyGen to generate encryption key pair', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const userPubKey = 'userEncPubKey'
      client.getEncryptionPublicKey = jest.fn().mockResolvedValue(userPubKey)

      await client.createGroup()
      expect(service.primitives.cryptKeyGen).toHaveBeenCalled()
    })

    it('encrypts private key to owning user pub key', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const userPubKey = 'userEncPubKey'
      client.getEncryptionPublicKey = jest.fn().mockResolvedValue(userPubKey)

      await client.createGroup()
      expect(service.primitives.encrypt).toHaveBeenCalledWith(
        userPubKey,
        'cryptPrivKey',
        deviceSignKeyPair
      )
    })

    it('makes a request with publicKey, userId, encryptedPrivateKey', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const userPubKey = 'userCryptPubKey'
      client.getEncryptionPublicKey = jest.fn().mockResolvedValue(userPubKey)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })
      const expectedSignKeyPair = {
        privKey: 'groupSignPrivKey',
        pubKey: 'groupSignPubKey'
      }
      client.service.primitives.signKeyGen = jest.fn().mockResolvedValue(expectedSignKeyPair)

      const groupId = await client.createGroup()
      expect(client.getEncryptionPublicKey).toHaveBeenCalledWith('user', userId)
      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'CreateGroup',
          payload: {
            cryptPubKey: 'cryptPubKey',
            encCryptPrivKey: 'encrypted:userCryptPubKey:cryptPrivKey',
            encSignPrivKey: `encrypted:${userPubKey}:${expectedSignKeyPair.privKey}`,
            groupId,
            userId
          }
        },
        {
          type: 'AddMemberToGroup',
          payload: {
            cryptTransformKey: 'transform:cryptPrivKey:userCryptPubKey',
            groupId,
            userId
          }
        },
        {
          type: 'AddAdminToGroup',
          payload: {
            encCryptPrivKey: 'encrypted:userCryptPubKey:cryptPrivKey',
            groupId,
            userId
          }
        }
      ])
    })
  })

  describe('addReaderToGroup', () => {
    it('uses cryptTransformKeyGen for Group->Member to build cryptTransformKey', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const groupId = 'testgroupid'
      const memberId = 'memberuserid'
      const memberPubKey = 'memberCryptPubKey'
      const groupCryptKeyPair = {
        privKey: 'groupCryptPrivKey',
        pubKey: 'groupCryptPubKey'
      }
      client.getEncryptionPublicKey = jest.fn().mockResolvedValue(memberPubKey)
      client.getEncryptionKeyPair = jest.fn().mockResolvedValue(groupCryptKeyPair)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.addReaderToGroup(groupId, memberId)

      expect(client.getEncryptionPublicKey).toHaveBeenCalledWith('user', memberId)
      expect(client.getEncryptionKeyPair).toHaveBeenCalledWith('group', groupId)
      expect(client.service.primitives.cryptTransformKeyGen).toHaveBeenCalledWith(
        groupCryptKeyPair,
        memberPubKey,
        deviceSignKeyPair
      )

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'AddMemberToGroup',
          payload: {
            cryptTransformKey: 'transform:groupCryptPrivKey:memberCryptPubKey',
            groupId,
            userId: memberId
          }
        }
      ])
    })
  })

  describe('removeMemberFromGroup', () => {
    it('makes a request including requesting userId and groupId', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const toRemoveId = 'removeMemberId'
      const groupId = 'groupId'
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.removeMemberFromGroup(groupId, toRemoveId)
      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'RemoveMemberFromGroup',
          payload: {
            groupId,
            userId: toRemoveId
          }
        }
      ])
    })

    describe('when removing a member referenced as signTransformParentUserId for other users', () => {
      it.todo('includes AddMemberToGroup for each affected membership to maintain write access')
    })
  })

  describe('addAdminToGroup', () => {
    it('makes a request including userId, groupId, and encrypted private keys', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const memberPubKey = 'memberCryptPubKey'
      const groupCryptKeyPair = {
        privKey: 'groupCryptPrivKey',
        pubKey: 'groupCryptPubKey'
      }
      client.getEncryptionPublicKey = jest.fn().mockResolvedValue(memberPubKey)
      client.getEncryptionKeyPair = jest.fn().mockResolvedValue(groupCryptKeyPair)
      const toAddId = 'addMemberId'
      const groupId = 'groupId'
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.addAdminToGroup(groupId, toAddId)

      expect(client.getEncryptionPublicKey).toHaveBeenCalledWith('user', toAddId)
      expect(client.getEncryptionKeyPair).toHaveBeenCalledWith('group', groupId)
      expect(client.service.primitives.encrypt).toHaveBeenCalledWith(
        memberPubKey,
        groupCryptKeyPair.privKey,
        deviceSignKeyPair
      )
      expect(client.service.primitives.cryptTransformKeyGen).toHaveBeenCalledWith(
        groupCryptKeyPair,
        memberPubKey,
        deviceSignKeyPair
      )

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'AddMemberToGroup',
          payload: {
            cryptTransformKey: 'transform:groupCryptPrivKey:memberCryptPubKey',
            groupId,
            userId: toAddId,
            canSign: true
          }
        },
        {
          type: 'AddAdminToGroup',
          payload: {
            encCryptPrivKey: 'encrypted:memberCryptPubKey:groupCryptPrivKey',
            groupId,
            userId: toAddId
          }
        }
      ])
    })
  })

  describe('removeAdminFromGroup', () => {
    it('makes a request including userId and groupId', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const toRemoveId = 'removeAdminId'
      const groupId = 'groupId'
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.removeAdminFromGroup(groupId, toRemoveId)

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'RemoveAdminFromGroup',
          payload: {
            groupId,
            userId: toRemoveId
          }
        }
      ])
    })
  })

  describe('createDocument', () => {
    it('generates an encryption keypair and registers it with service', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const userPubKey = 'userPubKey'
      const expectedCryptKeyPair = {
        privKey: 'cryptPrivKey',
        pubKey: 'cryptPubKey'
      }
      const expectedSignKeyPair = {
        privKey: 'docSignPrivKey',
        pubKey: 'docSignPubKey'
      }
      const documentId = expectedSignKeyPair.pubKey
      client.service.sea.signKeyGen = jest.fn().mockResolvedValue(expectedSignKeyPair)
      client.getEncryptionPublicKey = jest.fn().mockResolvedValue(userPubKey)
      client.request = jest.fn().mockResolvedValue({
        results: [
          {
            type: 'CreateDocument',
            payload: {
              documentId
            }
          }
        ]
      })

      const doc = await client.createDocument()

      expect(client.service.primitives.cryptKeyGen).toHaveBeenCalled()
      expect(doc.cryptKeyPair).toEqual(expectedCryptKeyPair)
      expect(doc.id).toEqual(documentId)
      expect(client.service.primitives.encrypt).toHaveBeenCalledWith(
        userPubKey,
        expectedCryptKeyPair.privKey,
        deviceSignKeyPair
      )

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'CreateDocument',
          payload: {
            cryptUserId: userId,
            creatorId: userId,

            encCryptPrivKey: 'encrypted:userPubKey:cryptPrivKey'
          }
        }
      ])
    })
  })

  describe('grantReadAccess', () => {
    it('makes a request including documentId, encrypted decryption key and userId or groupId', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const documentId = 'testDocumentId'
      const granteeId = 'testGranteeId'
      const granteeKind = 'user'
      const granteePubKey = 'granteePubKey'
      const docCryptPrivKey = 'decryptedDocumentCryptPrivKey'
      client.getEncryptionPublicKey = jest.fn().mockResolvedValue(granteePubKey)
      client.decryptDocumentEncryptionKey = jest.fn().mockResolvedValue(docCryptPrivKey)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.grantReadAccess(documentId, granteeKind, granteeId)

      expect(client.getEncryptionPublicKey).toHaveBeenCalledWith(granteeKind, granteeId)
      expect(client.decryptDocumentEncryptionKey).toHaveBeenCalledWith(documentId)
      expect(service.primitives.encrypt).toHaveBeenCalledWith(
        granteePubKey,
        docCryptPrivKey,
        deviceSignKeyPair
      )

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'GrantAccess',
          payload: {
            documentId,
            kind: granteeKind,
            id: granteeId,
            encCryptPrivKey: `encrypted:${granteePubKey}:${docCryptPrivKey}`
          }
        }
      ])
    })
  })

  describe('decryptDocumentKey', () => {
    it('makes a request including documentId', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const documentId = 'testDocumentId'
      const encCryptPrivKey = 'documentEncCryptPrivKey'
      const cryptPrivKey = 'decryptedDocumentCryptPrivKey'
      client.service.primitives.decrypt = jest.fn().mockResolvedValue(cryptPrivKey)
      client.request = jest.fn().mockResolvedValue({
        results: [
          {
            type: 'DecryptDocument',
            payload: {
              documentId,
              userId,
              encCryptPrivKey
            } as DecryptDocumentResult
          }
        ]
      })

      const documentCryptPrivKey = await client.decryptDocumentEncryptionKey(documentId)

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'DecryptDocument',
          payload: {
            documentId
          }
        }
      ])
      expect(client.service.primitives.decrypt).toHaveBeenCalledWith(
        deviceCryptKeyPair,
        encCryptPrivKey
      )
      expect(documentCryptPrivKey).toEqual(cryptPrivKey)

      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      let success = false
      try {
        await client.decryptDocumentEncryptionKey(documentId)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('No DecryptDocument result'))
      }

      expect(success).toEqual(false)
    })
  })

  describe('revokeAccess', () => {
    it('makes a request including documentId and userId', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const toRemoveId = 'removeAdminId'
      const documentId = 'documentId'
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.revokeAccess(documentId, 'user', toRemoveId)
      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'RevokeAccess',
          payload: {
            documentId,
            kind: 'user',
            id: toRemoveId
          }
        }
      ])
    })

    describe('when revoking access for a user referenced  as signTransformParentUserId for other users', () => {
      it.todo('includes GrantAccess for each affected grant to maintain write access')
    })
  })

  describe('updateDocument', () => {
    it('generates an encryption keypair and registers it with service', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const userPubKey = 'userPubKey'
      const documentId = 'testdocumentid'
      const expectedCryptKeyPair = {
        privKey: 'cryptPrivKey',
        pubKey: 'cryptPubKey'
      }
      client.getEncryptionPublicKey = jest.fn().mockResolvedValue(userPubKey)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      const docCryptKeyPair = await client.updateDocumentEncryption(documentId)

      expect(client.service.primitives.cryptKeyGen).toHaveBeenCalled()
      expect(docCryptKeyPair).toEqual(expectedCryptKeyPair)
      expect(client.service.primitives.encrypt).toHaveBeenCalledWith(
        userPubKey,
        docCryptKeyPair.privKey,
        deviceSignKeyPair
      )

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'UpdateDocument',
          payload: {
            encCryptPrivKey: 'encrypted:userPubKey:cryptPrivKey',
            documentId,
            cryptUserId: userId,
            cryptPubKey: expectedCryptKeyPair.pubKey
          }
        }
      ])
    })
  })

  describe('getPublicKeys', () => {
    it('makes a request asking for public keys', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const testUserId = 'testUserId'
      const cryptPubKey = 'userCryptPubKey'
      const signPubKey = 'userSignPubKey'

      const payload = {
        kind: 'user',
        id: testUserId
      }

      client.request = jest.fn().mockResolvedValue({
        results: [
          {
            type: 'GetPubKeys',
            payload: {
              ...payload,
              cryptPubKey,
              signPubKey
            },
            success: true,
            error: ''
          }
        ]
      })

      expect(await client.getPublicKeys('user', testUserId)).toEqual({
        ...payload,
        cryptPubKey,
        signPubKey
      })

      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      let success = false
      try {
        await client.getPublicKeys('user', testUserId)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('No GetPubKeys result'))
      }

      expect(success).toEqual(false)
    })
  })

  describe('getKeyPairs', () => {
    it('makes a request asking for key pairs', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const testUserId = 'testUserId'
      const cryptPubKey = 'userCryptPubKey'
      const signPubKey = 'userSignPubKey'
      const encCryptPrivKey = 'deviceEncCryptPrivKey'
      const encSignPrivKey = 'deviceEncSignPrivKey'

      const payload = {
        kind: 'user',
        id: testUserId
      }

      client.request = jest.fn().mockResolvedValue({
        results: [
          {
            type: 'GetKeyPairs',
            payload: {
              ...payload,
              cryptPubKey,
              signPubKey,
              encCryptPrivKey,
              encSignPrivKey
            },
            success: true,
            error: ''
          }
        ]
      })

      expect(await client.getKeyPairs('user', testUserId)).toEqual({
        ...payload,
        cryptPubKey,
        signPubKey,
        encCryptPrivKey,
        encSignPrivKey
      })

      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      let success = false
      try {
        await client.getKeyPairs('user', testUserId)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('No GetKeyPairs result'))
      }

      expect(success).toEqual(false)
    })
  })

  describe('getEncryptionPublicKey', () => {
    it('resolves encryption public key if available', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const testUserId = 'testUserId'
      const cryptPubKey = 'userCryptPubKey'
      const signPubKey = 'userSignPubKey'

      const pubKeys = {
        cryptPubKey,
        signPubKey
      }

      client.getPublicKeys = jest.fn().mockResolvedValue(pubKeys)
      expect(await client.getEncryptionPublicKey('user', testUserId)).toEqual(cryptPubKey)
      expect(client.getPublicKeys).toBeCalledWith('user', testUserId)
    })
  })

  describe('getSignaturePublicKey', () => {
    it.todo('resolves signature public key if available')
  })

  describe('getEncryptionKeyPair', () => {
    it('resolves encryption key pair if available', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const testUserId = 'testUserId'
      const cryptPubKey = 'userCryptPubKey'
      const signPubKey = 'userSignPubKey'
      const encCryptPrivKey = 'deviceEncCryptPrivKey'
      const encSignPrivKey = 'deviceEncSignPrivKey'
      const decryptedKey = 'decryptedCryptPrivKey'

      const keyPairs = {
        cryptPubKey,
        signPubKey,
        encCryptPrivKey,
        encSignPrivKey
      }

      client.getKeyPairs = jest.fn().mockResolvedValue(keyPairs)
      service.primitives.decrypt = jest.fn().mockResolvedValue(decryptedKey)

      expect(await client.getEncryptionKeyPair('user', testUserId)).toEqual({
        pubKey: cryptPubKey,
        privKey: decryptedKey
      })
      expect(client.getKeyPairs).toBeCalledWith('user', testUserId)
      expect(service.primitives.decrypt).toBeCalledWith(deviceCryptKeyPair, encCryptPrivKey)
    })
  })

  describe('getSignKeyPair', () => {
    it.todo('resolves signature key pair if available')
  })

  describe('grantWriteAccess', () => {
    it.todo('requests document info')
    describe('if document owned by requester', () => {
      it.todo('requests and decrypts document signPrivKey')
      it.todo('executes signTransformKeyGen for document <- grantee')
    })

    describe('if requester is granted access to document', () => {
      it.todo('requests and decrypts requester grant signPrivKey')
      it.todo('executes signTransformKeyGen for requester grant <- grantee')
      it.todo('makes a request registering signTransformKey, granter and grantee')
    })
  })

  describe('encryptTextDocument', () => {
    it.todo('generates encryption key pair')
    it.todo('encrypts document with encryption key pair')
    it.todo('fetches document grants')

    describe('if document exists', () => {
      it.todo('encrypts cryptPrivKeys for each grant')

      describe('if owned by requester', () => {
        it.todo('signs encrypted document with encSignPrivKey if owned')
      })

      describe('if requster is granted write access to document', () => {
        it.todo('signs encrypte ddocument as device and requests resignature as document')
      })

      it.todo("requests UpdateDocument and appropriate GrantAccess's")
    })

    describe('if document does not exist', () => {
      it.todo('generates signing key pair and signs encrypted document')
      it.todo('requests CreateDocument with pub keys and encrypted priv keys')
    })
  })

  describe('decryptTextDocument', () => {
    it.todo('decrypts document key')
    it.todo('uses decrypted document key to decrypt ciphertext')
    it.todo('resolves plaintext')
  })
})
