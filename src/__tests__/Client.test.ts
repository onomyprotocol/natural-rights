import { Client } from '../Client'

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
      expect(service.primitives.encrypt).toHaveBeenCalledWith('cryptPubKey', 'signPrivKey')
      expect(service.primitives.encrypt).toHaveBeenCalledWith('cryptPubKey', 'cryptPrivKey')
    })

    it('makes a request including userId, public keys and encrypted private keys', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.initializeUser()

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'InitializeUser',
          payload: {
            cryptPubKey: 'cryptPubKey',
            encCryptPrivKey: 'encrypted:cryptPubKey:cryptPrivKey',
            encSignPrivKey: 'encrypted:cryptPubKey:signPrivKey',
            signPubKey: 'signPubKey',
            userId
          }
        },
        {
          type: 'AddDevice',
          payload: {
            cryptPubKey: 'deviceCryptPubKey',
            signPubKey: 'deviceSignPubKey',
            cryptTransformKey: 'transform:cryptPrivKey:deviceCryptPubKey',
            deviceId,
            userId
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
      client.getCryptKeyPair = jest.fn().mockResolvedValue(userCryptKeyPair)

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
      const groupId = 'testgroupid'
      const userPubKey = 'userEncPubKey'
      client.getCryptPubKey = jest.fn().mockResolvedValue(userPubKey)

      await client.createGroup(groupId)
      expect(service.primitives.cryptKeyGen).toHaveBeenCalled()
    })

    it('encrypts private key to owning user pub key', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const groupId = 'testgroupid'
      const userPubKey = 'userEncPubKey'
      client.getCryptPubKey = jest.fn().mockResolvedValue(userPubKey)

      await client.createGroup(groupId)
      expect(service.primitives.encrypt).toHaveBeenCalledWith(userPubKey, 'cryptPrivKey')
    })

    it('makes a request with publicKey, userId, encryptedPrivateKey', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const groupId = 'testgroupid'
      const userPubKey = 'userCryptPubKey'
      client.getCryptPubKey = jest.fn().mockResolvedValue(userPubKey)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.createGroup(groupId)
      expect(client.getCryptPubKey).toHaveBeenCalledWith('user', userId)
      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'CreateGroup',
          payload: {
            cryptPubKey: 'cryptPubKey',
            encCryptPrivKey: 'encrypted:userCryptPubKey:cryptPrivKey',
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

  describe('addMemberToGroup', () => {
    it('uses cryptTransformKeyGen for Group->Member to build cryptTransformKey', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const groupId = 'testgroupid'
      const memberId = 'memberuserid'
      const memberPubKey = 'memberCryptPubKey'
      const groupCryptKeyPair = {
        privKey: 'groupCryptPrivKey',
        pubKey: 'groupCryptPubKey'
      }
      client.getCryptPubKey = jest.fn().mockResolvedValue(memberPubKey)
      client.getCryptKeyPair = jest.fn().mockResolvedValue(groupCryptKeyPair)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.addMemberToGroup(groupId, memberId)

      expect(client.getCryptPubKey).toHaveBeenCalledWith('user', memberId)
      expect(client.getCryptKeyPair).toHaveBeenCalledWith('group', groupId)
      expect(client.service.primitives.cryptTransformKeyGen).toHaveBeenCalledWith(
        groupCryptKeyPair,
        memberPubKey
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
  })

  describe('addAdminToGroup', () => {
    it('makes a request including userId, groupId, and encrypted private keys', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const memberPubKey = 'memberCryptPubKey'
      const groupCryptKeyPair = {
        privKey: 'groupCryptPrivKey',
        pubKey: 'groupCryptPubKey'
      }
      client.getCryptPubKey = jest.fn().mockResolvedValue(memberPubKey)
      client.getCryptKeyPair = jest.fn().mockResolvedValue(groupCryptKeyPair)
      const toAddId = 'addMemberId'
      const groupId = 'groupId'
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.addAdminToGroup(groupId, toAddId)

      expect(client.getCryptPubKey).toHaveBeenCalledWith('user', toAddId)
      expect(client.getCryptKeyPair).toHaveBeenCalledWith('group', groupId)
      expect(client.service.primitives.encrypt).toHaveBeenCalledWith(
        memberPubKey,
        groupCryptKeyPair.privKey
      )
      expect(client.service.primitives.cryptTransformKeyGen).toHaveBeenCalledWith(
        groupCryptKeyPair,
        memberPubKey
      )

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'AddMemberToGroup',
          payload: {
            cryptTransformKey: 'transform:groupCryptPrivKey:memberCryptPubKey',
            groupId,
            userId: toAddId
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

  describe('encryptDocument', () => {
    it('generates an encryption keypair and registers it with service', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const userPubKey = 'userPubKey'
      const documentId = 'testdocumentid'
      const expectedCryptKeyPair = {
        privKey: 'cryptPrivKey',
        pubKey: 'cryptPubKey'
      }
      client.getCryptPubKey = jest.fn().mockResolvedValue(userPubKey)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      const docCryptKeyPair = await client.encryptDocument(documentId)

      expect(client.service.primitives.cryptKeyGen).toHaveBeenCalled()
      expect(docCryptKeyPair).toEqual(expectedCryptKeyPair)
      expect(client.service.primitives.encrypt).toHaveBeenCalledWith(
        userPubKey,
        docCryptKeyPair.privKey
      )

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'EncryptDocument',
          payload: {
            encCryptPrivKey: 'encrypted:userPubKey:cryptPrivKey',
            documentId,
            userId
          }
        }
      ])
    })
  })

  describe('grantAccess', () => {
    it('makes a request including documentId, encrypted decryption key and userId or groupId', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const documentId = 'testDocumentId'
      const granteeId = 'testGranteeId'
      const granteeKind = 'user'
      const granteePubKey = 'granteePubKey'
      const docCryptPrivKey = 'decryptedDocumentCryptPrivKey'
      client.getCryptPubKey = jest.fn().mockResolvedValue(granteePubKey)
      client.decryptDocument = jest.fn().mockResolvedValue(docCryptPrivKey)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      await client.grantAccess(documentId, granteeKind, granteeId)

      expect(client.getCryptPubKey).toHaveBeenCalledWith(granteeKind, granteeId)
      expect(client.decryptDocument).toHaveBeenCalledWith(documentId)
      expect(service.primitives.encrypt).toHaveBeenCalledWith(granteePubKey, docCryptPrivKey)

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

  describe('decryptDocument', () => {
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

      const documentCryptPrivKey = await client.decryptDocument(documentId)

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
        await client.decryptDocument(documentId)
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
      client.getCryptPubKey = jest.fn().mockResolvedValue(userPubKey)
      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      const docCryptKeyPair = await client.updateDocument(documentId)

      expect(client.service.primitives.cryptKeyGen).toHaveBeenCalled()
      expect(docCryptKeyPair).toEqual(expectedCryptKeyPair)
      expect(client.service.primitives.encrypt).toHaveBeenCalledWith(
        userPubKey,
        docCryptKeyPair.privKey
      )

      expect(client.request).toHaveBeenCalledWith([
        {
          type: 'UpdateDocument',
          payload: {
            encCryptPrivKey: 'encrypted:userPubKey:cryptPrivKey',
            documentId,
            userId
          }
        }
      ])
    })
  })

  describe('getPubKeys', () => {
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

      expect(await client.getPubKeys('user', testUserId)).toEqual({
        ...payload,
        cryptPubKey,
        signPubKey
      })

      client.request = jest.fn().mockResolvedValue({
        results: []
      })

      let success = false
      try {
        await client.getPubKeys('user', testUserId)
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

  describe('getCryptPubKey', () => {
    it('resolves encryption public key if available', async () => {
      const client = new Client(service, userId, deviceId, deviceCryptKeyPair, deviceSignKeyPair)
      const testUserId = 'testUserId'
      const cryptPubKey = 'userCryptPubKey'
      const signPubKey = 'userSignPubKey'

      const pubKeys = {
        cryptPubKey,
        signPubKey
      }

      client.getPubKeys = jest.fn().mockResolvedValue(pubKeys)
      expect(await client.getCryptPubKey('user', testUserId)).toEqual(cryptPubKey)
      expect(client.getPubKeys).toBeCalledWith('user', testUserId)
    })
  })

  describe('getCryptKeyPair', () => {
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

      expect(await client.getCryptKeyPair('user', testUserId)).toEqual({
        pubKey: cryptPubKey,
        privKey: decryptedKey
      })
      expect(client.getKeyPairs).toBeCalledWith('user', testUserId)
      expect(service.primitives.decrypt).toBeCalledWith(deviceCryptKeyPair, encCryptPrivKey)
    })
  })
})
