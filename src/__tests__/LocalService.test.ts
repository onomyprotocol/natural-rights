import { LocalService } from '../LocalService'
import { ActionHandler } from '../actions/ActionHandler'
import { CreateDocument } from '../actions'
import { initSEA } from '../SEA'

const Gun = require('gun/gun')
require('gun/sea')
const SEA = initSEA(Gun)

describe('LocalService', () => {
  let primitives: PrimitivesInterface
  let db: DatabaseInterface
  let dbAdapter: DatabaseAdapterInterface
  let service: LocalService

  beforeEach(() => {
    primitives = {
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
    }

    dbAdapter = {
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      getDocumentGrants: jest.fn().mockResolvedValue([]),
      close: jest.fn()
    }

    service = new LocalService(primitives, SEA, dbAdapter)
    db = service.db
  })

  describe('authenticateLogin', () => {
    it('returns empty string if request is Login request and only login request with valid device signature', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const actions = [
        {
          type: 'Login',
          payload: {}
        }
      ]
      const signature = 'expectedSignature'
      const request = {
        userId,
        deviceId,
        body: JSON.stringify(actions),
        signature
      }

      service.primitives.verify = jest.fn().mockResolvedValue(true)

      expect(await service.authenticate(request)).toEqual('')
    })

    it('returns false if request is not login request', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const actions = [
        {
          type: 'AnythingElse',
          payload: {}
        }
      ]
      const signature = 'expectedSignature'
      const request = {
        userId,
        deviceId,
        body: JSON.stringify(actions),
        signature
      }

      service.primitives.verify = jest.fn().mockResolvedValue(true)

      expect(await service.authenticate(request)).toEqual(false)
    })
  })

  describe('authenticate', () => {
    const userId = 'testUserId'
    const userCryptPubKey = 'userCryptPubKey'
    const userSignPubKey = 'userSignPubKey'
    const userEncCryptPrivKey = 'userEncCryptPrivKey'
    const userEncSignPrivKey = 'userEncSignPrivKey'
    const deviceId = 'testDeviceId'
    const deviceCryptPubKey = 'deviceCryptPubKey'
    const deviceSignPubKey = 'deviceSignPubKey'
    const deviceCryptTransformKey = 'deviceCryptTransformKey'

    const actions = [
      {
        type: 'InitializeUser',
        payload: {
          userId,
          cryptPubKey: userCryptPubKey,
          signPubKey: userSignPubKey,
          encCryptPrivKey: userEncCryptPrivKey,
          encSignPrivKey: userEncSignPrivKey
        } as InitializeUserAction
      },
      {
        type: 'AddDevice',
        payload: {
          deviceId,
          userId,
          cryptPubKey: deviceCryptPubKey,
          signPubKey: deviceSignPubKey,
          cryptTransformKey: deviceCryptTransformKey
        } as AddDeviceAction
      }
    ]
    const signature = 'expectedSignature'
    const request = {
      userId,
      deviceId,
      body: JSON.stringify(actions),
      signature
    }

    it('returns userId if the request is signed by valid user', async () => {
      const deviceRecord: DeviceRecord = {
        id: deviceId,
        userId,
        signPubKey: 'deviceSignPubKey',
        cryptPubKey: 'deviceCryptPubKey',
        cryptTransformKey: 'deviceCryptTransformKey'
      }
      service.authenticateLogin = jest.fn().mockResolvedValue(false)
      db.getDevice = jest.fn().mockResolvedValue(deviceRecord)
      primitives.verify = jest.fn().mockResolvedValue(true)

      expect(await service.authenticate(request)).toEqual(userId)
      expect(primitives.verify).toBeCalledWith(
        deviceRecord.signPubKey,
        request.signature,
        request.body
      )
      expect(service.authenticateLogin).not.toBeCalled()
    })

    it('returns false if the request is not signed by valid user', async () => {
      const deviceRecord: DeviceRecord = {
        id: deviceId,
        userId,
        signPubKey: 'deviceSignPubKey',
        cryptPubKey: 'deviceCryptPubKey',
        cryptTransformKey: 'deviceCryptTransformKey'
      }
      service.authenticateLogin = jest.fn().mockResolvedValue(false)
      db.getDevice = jest.fn().mockResolvedValue(deviceRecord)
      primitives.verify = jest.fn().mockResolvedValue(false)

      expect(await service.authenticate(request)).toEqual(false)
      expect(primitives.verify).toBeCalledWith(
        deviceRecord.signPubKey,
        request.signature,
        request.body
      )
      expect(service.authenticateLogin).not.toBeCalled()
    })

    it('defers to authenticateInitialUser if device cannot be found', async () => {
      service.authenticateLogin = jest.fn().mockResolvedValue(true)

      expect(await service.authenticate(request)).toEqual(true)
      expect(service.authenticateLogin).toBeCalledWith(request)
    })
  })

  describe('request', () => {
    const actions = [
      {
        type: 'CreateDocument',
        payload: {
          documentId: 'testDocumentId',
          userId: 'testUserId',
          encCryptPrivKey: 'testEncCryptPrivKey'
        }
      },
      {
        type: 'GrantAccess',
        payload: {
          documentId: 'testOocumentId',
          kind: 'user',
          id: 'testUser2Id',
          encCryptPrivKey: 'test2EncCryptPrivKey'
        }
      }
    ]

    const request = {
      userId: 'testUserId',
      deviceId: 'testDeviceId',
      signature: 'testSignature',
      body: JSON.stringify(actions)
    }

    it('Returns an authentication error for each action if request is not authenticated', async () => {
      service.authenticate = jest.fn().mockResolvedValue(false)
      service.processAction = jest.fn().mockImplementation(async (req, action) => action)
      expect(await service.request(request)).toEqual({
        results: actions.map(result => ({
          ...result,
          success: false,
          error: 'Authentication error'
        }))
      })
      expect(service.authenticate).toBeCalledWith(request)
      expect(service.processAction).not.toBeCalled()
    })

    it('processes actions in body if request authenticates', async () => {
      service.authenticate = jest.fn().mockResolvedValue(true)
      service.processAction = jest.fn().mockImplementation(async (req, action) => action)
      expect(await service.request(request)).toEqual({
        results: actions
      })
      expect(service.authenticate).toBeCalledWith(request)
      actions.map(action => expect(service.processAction).toBeCalledWith(request, action))
    })
  })

  describe('getActionHandler', () => {
    const userId = 'testUserId'
    const deviceId = 'testDeviceId'
    const action = {
      type: 'CreateDocument',
      payload: {
        documentId: 'testDocumentId',
        userId: 'testUserId',
        encCryptPrivKey: 'testEncCryptPrivKey'
      }
    } as Action<any>

    const request = {
      userId,
      deviceId,
      signature: 'testSignature',
      body: JSON.stringify([action])
    }

    it('returns null if action type is not valid', async () => {
      const invalidAction = JSON.parse('{ "type": "InvalidAction" }') as Action<any>
      expect(service.getActionHandler(request, invalidAction)).toEqual(null)
    })

    it('returns ActionHandler instance if type is valid', async () => {
      expect(service.getActionHandler(request, action)).toEqual(
        new CreateDocument(userId, deviceId, action.payload)
      )
    })
  })

  describe('processAction', () => {
    const userId = 'testUserId'
    const deviceId = 'testDeviceId'
    const handler = new ActionHandler(userId, deviceId)
    const action = {
      type: 'CreateDocument',
      payload: {
        documentId: 'testDocumentId',
        userId: 'testUserId',
        encCryptPrivKey: 'testEncCryptPrivKey'
      }
    } as Action<any>

    const request = {
      userId,
      deviceId,
      signature: 'testSignature',
      body: JSON.stringify([action])
    }

    it('returns an unauthorized error if action is not authorized', async () => {
      handler.checkIsAuthorized = jest.fn().mockResolvedValue(false)
      handler.execute = jest.fn()
      service.getActionHandler = jest.fn().mockReturnValue(handler)

      expect(await service.processAction(request, action)).toEqual({
        ...action,
        success: false,
        error: 'Unauthorized'
      })
      expect(handler.checkIsAuthorized).toBeCalled()
      expect(service.getActionHandler).toBeCalledWith(request, action)
      expect(handler.execute).not.toBeCalled()
    })

    it('executes the action if it is authorized', async () => {
      handler.checkIsAuthorized = jest.fn().mockResolvedValue(true)
      service.getActionHandler = jest.fn().mockReturnValue(handler)
      handler.execute = jest.fn().mockResolvedValue(action.payload)

      expect(await service.processAction(request, action)).toEqual({
        ...action,
        success: true,
        error: ''
      })
      expect(handler.checkIsAuthorized).toBeCalled()
      expect(service.getActionHandler).toBeCalledWith(request, action)
      expect(handler.execute).toBeCalledWith(service)
    })

    it('returns an error if action is invalid', async () => {
      const invalidAction = JSON.parse('{ "type": "InvalidAction" }') as Action<any>
      expect(await service.processAction(request, invalidAction)).toEqual({
        ...invalidAction,
        success: false,
        error: 'Invalid action type'
      })
    })
  })

  describe('getIsGroupAdmin', () => {
    it('Resolves true if user is admin of group', async () => {
      const groupId = 'testGroupId'
      const testUserId = 'testUserId'
      db.getMembership = jest.fn().mockResolvedValue({
        groupId,
        userId: testUserId,

        cryptTransformKey: 'cryptTransformKey',

        encGroupCryptPrivKey: 'validityofthisisnotchecked'
      } as MembershipRecord)

      db.getGroup = jest.fn().mockResolvedValue({ groupId })

      const isGroupAdmin = await service.getIsGroupAdmin(groupId, testUserId)

      expect(isGroupAdmin).toEqual(true)
      expect(db.getMembership).toBeCalledWith(groupId, testUserId)
    })

    it('Resolves false if user not admin of group', async () => {
      const groupId = 'testGroupId'
      const testUserId = 'testUserId'
      db.getMembership = jest.fn().mockResolvedValue({
        groupId,
        userId: testUserId,

        cryptTransformKey: 'cryptTransformKey',

        encGroupCryptPrivKey: ''
      } as MembershipRecord)

      const isGroupAdmin = await service.getIsGroupAdmin(groupId, testUserId)

      expect(isGroupAdmin).toEqual(false)
      expect(db.getMembership).toBeCalledWith(groupId, testUserId)
    })

    it('Resolves false if user not a member', async () => {
      const groupId = 'testGroupId'
      const testUserId = 'testUserId'
      const isGroupAdmin = await service.getIsGroupAdmin(groupId, testUserId)

      expect(isGroupAdmin).toEqual(false)
    })
  })

  describe('getCredentials', () => {
    it('resolves undefined if user has no access to document', async () => {
      const userId = 'testUserId'
      const documentId = 'testDocumentId'
      const document = {
        userId: 'someOtherUser',
        documentId,
        encCryptPrivKey: 'docEncCryptPrivKey'
      }
      db.getDocument = jest.fn().mockResolvedValue(document)
      db.getDocumentGrants = jest.fn().mockResolvedValue([])

      expect(await service.getCredentials(userId, documentId)).toEqual(undefined)
      expect(db.getDocument).toBeCalledWith(documentId)
      expect(db.getDocumentGrants).toBeCalledWith(documentId)
    })

    it('resolves undefined if document does not exist', async () => {
      const userId = 'testUserId'
      const documentId = 'testDocumentId'
      db.getDocument = jest.fn().mockResolvedValue(undefined)
      db.getDocumentGrants = jest.fn().mockResolvedValue([])

      expect(await service.getCredentials(userId, documentId)).toEqual(undefined)
      expect(db.getDocument).toBeCalledWith(documentId)
      expect(db.getDocumentGrants).toBeCalledWith(documentId)
    })

    it('resolves { document } if user is owner of document', async () => {
      const userId = 'testUserId'
      const documentId = 'testDocumentId'
      const document = {
        cryptUserId: userId,
        documentId,
        encCryptPrivKey: 'docEncCryptPrivKey'
      }
      db.getDocument = jest.fn().mockResolvedValue(document)
      db.getDocumentGrants = jest.fn().mockResolvedValue([])

      expect(await service.getCredentials(userId, documentId)).toEqual({ document })
      expect(db.getDocument).toBeCalledWith(documentId)
      expect(db.getDocumentGrants).toBeCalledWith(documentId)
    })

    it('resolves { document, grant } if user is directly granted access to document', async () => {
      const userId = 'testUserId'
      const documentId = 'testDocumentId'
      const document = {
        userId: 'someOtherUser',
        documentId,
        encCryptPrivKey: 'docEncCryptPrivKey'
      }
      const grant = {
        id: userId,
        kind: 'user'
      }

      db.getMembership = jest.fn().mockResolvedValue(null)
      db.getDocument = jest.fn().mockResolvedValue(document)
      db.getDocumentGrants = jest.fn().mockResolvedValue([
        {
          id: 'someOtherId',
          kind: 'user'
        },
        {
          id: 'someRandomGroup',
          kind: 'group'
        },
        grant
      ])

      expect(await service.getCredentials(userId, documentId)).toEqual({ document, grant })
      expect(db.getDocument).toBeCalledWith(documentId)
      expect(db.getDocumentGrants).toBeCalledWith(documentId)
      expect(db.getMembership).toBeCalledWith('someRandomGroup', userId)
    })

    it('resolves { document, grant, membership } if user is granted access to document via a group', async () => {
      const userId = 'testUserId'
      const groupId = 'testGroupId'
      const documentId = 'testDocumentId'
      const document = {
        userId: 'someOtherUser',
        documentId,
        encCryptPrivKey: 'docEncCryptPrivKey'
      }
      const grant = {
        id: groupId,
        kind: 'group'
      }
      const membership = {
        userId,
        groupId
      }

      db.getMembership = jest.fn().mockResolvedValue(membership)
      db.getDocument = jest.fn().mockResolvedValue(document)
      db.getDocumentGrants = jest.fn().mockResolvedValue([
        {
          id: 'someOtherId',
          kind: 'user'
        },
        grant
      ])

      expect(await service.getCredentials(userId, documentId)).toEqual({
        document,
        grant,
        membership
      })
      expect(db.getDocument).toBeCalledWith(documentId)
      expect(db.getDocumentGrants).toBeCalledWith(documentId)
      expect(db.getMembership).toBeCalledWith(groupId, userId)
    })
  })

  describe('getUserDocumentDecryptKey', () => {
    it("resolves '' if user has no access to document", async () => {
      const userId = 'testUserId'
      const documentId = 'testDocumentId'
      service.getCredentials = jest.fn().mockResolvedValue(undefined)

      expect(await service.getUserDocumentDecryptKey(userId, documentId)).toEqual('')
      expect(service.getCredentials).toBeCalledWith(userId, documentId)
    })

    it('resolves document.encCryptPrivKey if user is owner of document', async () => {
      const userId = 'testUserId'
      const documentId = 'testDocumentId'
      const document = { encCryptPrivKey: 'docEncCryptPrivKey' }
      service.getCredentials = jest.fn().mockResolvedValue({ document })

      expect(await service.getUserDocumentDecryptKey(userId, documentId)).toEqual(
        document.encCryptPrivKey
      )
      expect(service.getCredentials).toBeCalledWith(userId, documentId)
    })

    it('resolves grant.encCryptPrivKey if user is directly granted access to document', async () => {
      const userId = 'testUserId'
      const documentId = 'testDocumentId'
      const document = { encCryptPrivKey: 'docEncCryptPrivKey' }
      const grant = { encCryptPrivKey: 'grantEncCryptPrivKey' }
      service.getCredentials = jest.fn().mockResolvedValue({ document, grant })

      expect(await service.getUserDocumentDecryptKey(userId, documentId)).toEqual(
        grant.encCryptPrivKey
      )
      expect(service.getCredentials).toBeCalledWith(userId, documentId)
    })

    it('resolves transformed key if user is granted access to document via a group', async () => {
      const userId = 'testUserId'
      const documentId = 'testDocumentId'
      const document = { encCryptPrivKey: 'docEncCryptPrivKey' }
      const grant = { encCryptPrivKey: 'grantEncCryptPrivKey' }
      const membership = {
        cryptTransformKey: 'memberCryptTransformKey',
        encCryptPrivKey: 'memberEncCryptPrivKey'
      }
      const transformedKey = 'transformedCryptPrivKey'
      service.getCredentials = jest.fn().mockResolvedValue({ document, grant, membership })
      primitives.cryptTransform = jest.fn().mockResolvedValue(transformedKey)

      expect(await service.getUserDocumentDecryptKey(userId, documentId)).toEqual(transformedKey)
      expect(service.getCredentials).toBeCalledWith(userId, documentId)
      expect(primitives.cryptTransform).toBeCalledWith(
        membership.cryptTransformKey,
        grant.encCryptPrivKey,
        service.signKeyPair
      )
    })
  })

  describe('getDeviceDocumentDecryptKey', () => {
    it("resolves '' if the device does not exist", async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocumentId'
      db.getDevice = jest.fn().mockResolvedValue(null)
      service.getUserDocumentDecryptKey = jest.fn().mockResolvedValue('letspretendthisexists')

      expect(await service.getDeviceDocumentDecryptKey(userId, deviceId, documentId)).toEqual('')
      expect(db.getDevice).toBeCalledWith(deviceId)
    })

    it("resolves '' if the user has no access to document", async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocumentId'
      db.getDevice = jest.fn().mockResolvedValue({
        id: deviceId,
        userId,
        cryptTransformKey: 'deviceCryptTransformKey'
      } as DeviceRecord)
      service.getUserDocumentDecryptKey = jest.fn().mockResolvedValue('')

      expect(await service.getDeviceDocumentDecryptKey(userId, deviceId, documentId)).toEqual('')
      expect(db.getDevice).toBeCalledWith(deviceId)
    })

    it('resolves a document key transformed to device if user has access', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocumentId'
      const deviceRecord = {
        id: deviceId,
        userId,
        cryptTransformKey: 'deviceCryptTransformKey'
      } as DeviceRecord
      db.getDevice = jest.fn().mockResolvedValue(deviceRecord)
      const userEncCryptPrivKey = 'userEncCryptPrivKey'
      const deviceEncCryptPrivKey = 'deviceEncCryptPrivKey'
      primitives.cryptTransform = jest.fn().mockResolvedValue(deviceEncCryptPrivKey)
      service.getUserDocumentDecryptKey = jest.fn().mockResolvedValue(userEncCryptPrivKey)

      expect(await service.getDeviceDocumentDecryptKey(userId, deviceId, documentId)).toEqual(
        deviceEncCryptPrivKey
      )
      expect(service.getUserDocumentDecryptKey).toBeCalledWith(userId, documentId)
      expect(primitives.cryptTransform).toBeCalledWith(
        deviceRecord.cryptTransformKey,
        userEncCryptPrivKey,
        service.signKeyPair
      )
    })
  })

  describe('getHasReadAccess', () => {
    it('resolves true if getUserDocumentDecryptKey resolves truthy', async () => {
      const userId = 'testUserId'
      const documentId = 'testDocumentId'

      service.getUserDocumentDecryptKey = jest.fn().mockResolvedValue(undefined)
      expect(await service.getHasReadAccess(userId, documentId)).toEqual(false)
      expect(service.getUserDocumentDecryptKey).toBeCalledWith(userId, documentId)

      service.getUserDocumentDecryptKey = jest.fn().mockResolvedValue('shouldntmatter')
      expect(await service.getHasReadAccess(userId, documentId)).toEqual(true)
      expect(service.getUserDocumentDecryptKey).toBeCalledWith(userId, documentId)
    })
  })
})
