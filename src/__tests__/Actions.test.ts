import {
  RemoveDevice,
  InitializeUser,
  AddDevice,
  CreateGroup,
  AddMemberToGroup,
  RemoveMemberFromGroup,
  AddAdminToGroup,
  RemoveAdminFromGroup,
  CreateDocument,
  GrantAccess,
  DecryptDocument,
  RevokeAccess,
  UpdateDocument,
  GetPubKeys,
  GetKeyPairs
} from '../actions'
import { ActionHandler } from '../actions/ActionHandler'
import { LocalService } from '../LocalService'
import { initSEA } from '../SEA'

const Gun = require('gun/gun')
require('gun/sea')
const SEA = initSEA(Gun)

describe('Actions', () => {
  let primitives: PrimitivesInterface
  let dbAdapter: DatabaseAdapterInterface
  let db: DatabaseInterface
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
      cryptTransform: jest
        .fn()
        .mockImplementation(
          async (transformKey, ciphertext) => `transformed:${transformKey}:${ciphertext}`
        ),
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

  describe('ActionHandler', () => {
    describe('default implementation', () => {
      it('allows nobody', async () => {
        const handler = new ActionHandler('userId', 'deviceId')

        expect(await handler.checkIsAuthorized(service)).toEqual(false)
      })

      it('does nothing', async () => {
        const handler = new ActionHandler('userId', 'deviceId')

        expect(await handler.execute(service)).toEqual(null)
      })
    })
  })

  describe('InitializeUser', () => {
    it('requires that the requesting user match the userId of the request and that the user not exist', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'

      const actionBase = {
        cryptPubKey: 'cryptPubKey',
        signPubKey: 'signPubKey',
        encCryptPrivKey: 'encCryptPrivKey',
        encSignPrivKey: 'encSignPrivKey',
        rootDocCryptPubKey: `rootDocCryptPubKey`,
        rootDocEncCryptPrivKey: `rootDocEncCryptPrivKey`
      }

      const withMatch = new InitializeUser(userId, deviceId, {
        ...actionBase,
        userId
      })

      const withoutMatch = new InitializeUser(userId, deviceId, {
        ...actionBase,
        userId: 'otherUserId'
      })

      db.getUser = jest.fn().mockResolvedValue(null)
      db.getDevice = jest.fn().mockResolvedValue({
        userId: ''
      })

      expect(await withoutMatch.checkIsAuthorized(service)).toEqual(false)
      expect(db.getUser).not.toBeCalled()

      await withMatch.checkIsAuthorized(service)
      expect(db.getDevice).toBeCalledWith(deviceId)
      expect(db.getUser).toBeCalledWith(userId)

      expect(await withMatch.checkIsAuthorized(service)).toEqual(true)
      db.getUser = jest.fn().mockResolvedValue({
        userId
      })
      expect(await withMatch.checkIsAuthorized(service)).toEqual(false)
      expect(db.getUser).toBeCalledWith(userId)

      db.getUser = jest.fn().mockResolvedValue(null)
      db.getDevice = jest.fn().mockResolvedValue({
        userId
      })

      expect(await withMatch.checkIsAuthorized(service)).toEqual(false)
    })

    it('persists UserRecord', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocId'
      const docSignPrivKey = 'testDocPrivKey'
      const shared = {
        signPubKey: 'signPubKey',
        cryptPubKey: 'cryptPubKey',
        encCryptPrivKey: 'encCryptPrivKey',
        encSignPrivKey: 'encSignPrivKey'
      }
      const payload = {
        ...shared,
        rootDocCryptPubKey: `rootDocCryptPubKey`,
        rootDocEncCryptPrivKey: `rootDocEncCryptPrivKey`,
        userId
      }
      const record = { ...shared, id: userId, rootDocumentId: documentId }
      db.putUser = jest.fn().mockResolvedValue(undefined)
      service.sea.signKeyGen = jest.fn().mockResolvedValue({
        pubKey: documentId,
        privKey: docSignPrivKey
      })

      const handler = new InitializeUser(userId, deviceId, payload)

      expect(await handler.execute(service)).toEqual(payload)
      expect(db.putUser).toBeCalledWith(record)
    })
  })

  describe('AddDevice', () => {
    it('requires that the requesting user match the userId of the request', async () => {
      const shared = {
        deviceId: 'testDeviceId',
        signPubKey: 'deviceSignPubKey',
        cryptPubKey: 'deviceCryptPubKey',
        cryptTransformKey: 'deviceCryptTransformKey'
      }

      const withMatch = new AddDevice('userId', 'deviceId', {
        ...shared,
        userId: 'userId'
      })

      const withoutMatch = new AddDevice('userId', 'deviceId', {
        ...shared,
        userId: 'otherUserId'
      })

      expect(await withMatch.checkIsAuthorized(service)).toEqual(true)
      expect(await withoutMatch.checkIsAuthorized(service)).toEqual(false)
    })

    it('persists DeviceRecord', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const shared = {
        userId,
        signPubKey: 'deviceSignPubKey',
        cryptPubKey: 'deviceCryptPubKey',
        cryptTransformKey: 'deviceCryptTransformKey'
      }
      const payload = { ...shared, deviceId }
      const record = { ...shared, id: deviceId }
      db.putDevice = jest.fn().mockResolvedValue(undefined)

      const handler = new AddDevice(userId, deviceId, payload)

      expect(await handler.execute(service)).toEqual(payload)
      expect(db.putDevice).toBeCalledWith(record)
    })
  })

  describe('RemoveDevice', () => {
    it('requires that the requesting user match the userId of the request', async () => {
      const withMatch = new RemoveDevice('userId', 'deviceId', {
        userId: 'userId',
        deviceId: 'deviceId'
      })

      const withoutMatch = new RemoveDevice('userId', 'deviceId', {
        userId: 'otherUserId',
        deviceId: 'deviceId'
      })

      expect(await withMatch.checkIsAuthorized(service)).toEqual(true)
      expect(await withoutMatch.checkIsAuthorized(service)).toEqual(false)
    })

    it('deletes device record from database', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const handler = new RemoveDevice(userId, deviceId, {
        userId,
        deviceId
      })
      db.deleteDevice = jest.fn().mockResolvedValue(undefined)

      await handler.execute(service)

      expect(db.deleteDevice).toBeCalledWith(userId, deviceId)
    })
  })

  describe('CreateGroup', () => {
    const userId = 'testUserId'
    const deviceId = 'testDeviceId'
    const groupId = 'testGroupId'
    const shared = {
      userId: 'testUserId',
      cryptPubKey: 'groupCryptPubKey',
      encCryptPrivKey: 'encGroupCryptPrivKey',
      encSignPrivKey: 'encGroupSignPrivKey'
    }
    const payload = { ...shared, groupId }
    const record = { ...shared, id: groupId }

    it('requires that the requesting user match the userId of the request', async () => {
      const withMatch = new CreateGroup('testUserId', 'deviceId', payload)
      const withoutMatch = new CreateGroup('otherUserId', 'deviceId', payload)

      expect(await withMatch.checkIsAuthorized(service)).toEqual(true)
      expect(await withoutMatch.checkIsAuthorized(service)).toEqual(false)
    })

    it('persists GroupRecord', async () => {
      const handler = new CreateGroup(userId, deviceId, payload)
      db.putGroup = jest.fn().mockResolvedValue(undefined)

      expect(await handler.execute(service)).toEqual(payload)
      expect(db.putGroup).toBeCalledWith(record)
    })
  })

  describe('AddMemberToGroup', () => {
    const requestingUserId = 'testUserId'
    const deviceId = 'testDeviceId'
    const groupId = 'testGroupId'
    const payload = {
      groupId,
      userId: 'otherUserId',
      cryptTransformKey: 'groupCryptTransformKey',
      canSign: false
    }
    const record = { ...payload, encGroupCryptPrivKey: '' }

    it('requires that the requesting user be an admin of the group', async () => {
      const handler = new AddMemberToGroup(requestingUserId, deviceId, payload)

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(false)
      expect(await handler.checkIsAuthorized(service)).toEqual(false)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, requestingUserId)

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(true)
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, requestingUserId)
    })

    it('persists MembershipRecord', async () => {
      const handler = new AddMemberToGroup(requestingUserId, deviceId, payload)
      db.putMembership = jest.fn().mockResolvedValue(undefined)

      expect(await handler.execute(service)).toEqual(payload)
      expect(db.putMembership).toBeCalledWith(record)
    })
  })

  describe('RemoveMemberFromGroup', () => {
    const requestingUserId = 'testUserId'
    const deviceId = 'testDeviceId'
    const groupId = 'testGroupId'
    const payload = {
      groupId,
      userId: 'otherUserId'
    }

    it('requires that the requesting user be an admin of the group or the user to remove', async () => {
      const handler = new RemoveMemberFromGroup(requestingUserId, deviceId, payload)

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(false)
      expect(await handler.checkIsAuthorized(service)).toEqual(false)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, requestingUserId)

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(false)
      const userMatchHandler = new RemoveMemberFromGroup(payload.userId, deviceId, payload)
      expect(await userMatchHandler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getIsGroupAdmin).not.toBeCalled()

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(true)
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, requestingUserId)
    })

    it('deletes MembershipRecord from database', async () => {
      const handler = new RemoveMemberFromGroup(requestingUserId, deviceId, payload)
      db.deleteMembership = jest.fn().mockResolvedValue(undefined)

      expect(await handler.execute(service)).toEqual(payload)
      expect(db.deleteMembership).toBeCalledWith(groupId, payload.userId)
    })
  })

  describe('AddAdminToGroup', () => {
    it('requires that the requesting user be an admin of the group', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const groupId = 'testGroupId'
      const payload = {
        groupId,
        userId: 'otherUserId',
        encCryptPrivKey: 'groupEncCryptPrivKey'
      }

      const handler = new AddAdminToGroup(requestingUserId, deviceId, payload)

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(false)
      expect(await handler.checkIsAuthorized(service)).toEqual(false)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, requestingUserId)

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(true)
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, requestingUserId)
    })

    it('persists MembershipRecord with encrypted private key', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const groupId = 'testGroupId'
      const payload = {
        groupId,
        userId: 'otherUserId',
        encCryptPrivKey: 'groupEncCryptPrivKey'
      }
      const existingMembership = {
        groupId,
        userId: 'otherUserId',
        cryptTransformKey: 'groupCryptTransformKey',
        encGroupCryptPrivKey: ''
      }
      db.getMembership = jest.fn().mockResolvedValue(existingMembership)
      db.putMembership = jest.fn().mockResolvedValue(undefined)

      const handler = new AddAdminToGroup(requestingUserId, deviceId, payload)

      expect(await handler.execute(service)).toEqual(payload)
      expect(db.getMembership).toBeCalledWith(groupId, payload.userId)
      expect(db.putMembership).toBeCalledWith({
        ...existingMembership,
        encGroupCryptPrivKey: payload.encCryptPrivKey
      })
    })

    it('throws an error if membership does not exist', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const groupId = 'testGroupId'
      const payload = {
        groupId,
        userId: 'otherUserId',
        encCryptPrivKey: 'groupEncCryptPrivKey'
      }
      db.getMembership = jest.fn().mockResolvedValue(null)
      db.putMembership = jest.fn().mockResolvedValue(undefined)

      let success = false
      const handler = new AddAdminToGroup(requestingUserId, deviceId, payload)

      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('No membership for user'))
      }

      expect(success).toEqual(false)
      expect(db.getMembership).toBeCalledWith(groupId, payload.userId)
      expect(db.putMembership).not.toBeCalled()
    })
  })

  describe('RemoveAdminFromGroup', () => {
    it('requires that the requesting user be an admin of the group', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const groupId = 'testGroupId'
      const payload = {
        groupId,
        userId: 'otherUserId'
      }

      const handler = new RemoveAdminFromGroup(requestingUserId, deviceId, payload)

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(false)
      expect(await handler.checkIsAuthorized(service)).toEqual(false)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, requestingUserId)

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(true)
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, requestingUserId)
    })

    it('deletes encrypted private key for membership', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const groupId = 'testGroupId'
      const payload = {
        groupId,
        userId: 'otherUserId'
      }
      const existingMembership = {
        groupId,
        userId: 'otherUserId',
        cryptTransformKey: 'groupCryptTransformKey',
        encGroupCryptPrivKey: 'encGroupCryptPrivKey'
      }
      db.getMembership = jest.fn().mockResolvedValue(existingMembership)
      db.putMembership = jest.fn().mockResolvedValue(undefined)

      const handler = new RemoveAdminFromGroup(requestingUserId, deviceId, payload)

      expect(await handler.execute(service)).toEqual(payload)

      expect(db.getMembership).toBeCalledWith(groupId, payload.userId)
      expect(db.putMembership).toBeCalledWith({
        ...existingMembership,
        encGroupCryptPrivKey: ''
      })
    })

    it('does nothing if membership does not already exist', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const groupId = 'testGroupId'
      const payload = {
        groupId,
        userId: 'otherUserId'
      }

      db.getMembership = jest.fn().mockResolvedValue(null)
      db.putMembership = jest.fn().mockResolvedValue(undefined)

      const handler = new RemoveAdminFromGroup(requestingUserId, deviceId, payload)

      expect(await handler.execute(service)).toEqual(payload)

      expect(db.getMembership).toBeCalledWith(groupId, payload.userId)
      expect(db.putMembership).not.toBeCalled()
    })
  })

  describe('CreateDocument', () => {
    const documentId = 'testDocumentId'
    const docSignPrivKey = 'docSignPrivKey'
    const requestingUserId = 'testUserId'
    const shared = {
      creatorId: requestingUserId,
      cryptUserId: requestingUserId,
      cryptPubKey: 'documentCryptPubKey',
      encCryptPrivKey: 'documentEncCryptPrivKey'
    }
    const payload = {
      ...shared,
      documentId
    }
    const record = { ...shared, id: documentId, signPrivKey: docSignPrivKey }

    beforeEach(() => {
      service.sea.signKeyGen = jest.fn().mockResolvedValue({
        pubKey: documentId,
        privKey: docSignPrivKey
      })
    })

    it('requires that the requesting user match the userId of the request', async () => {
      const withMatch = new CreateDocument(requestingUserId, 'deviceId', payload)
      const withoutMatch = new CreateDocument('otherUserId', 'deviceId', payload)

      expect(await withMatch.checkIsAuthorized(service)).toEqual(true)
      expect(await withoutMatch.checkIsAuthorized(service)).toEqual(false)
    })

    it('persists DocumentRecord', async () => {
      const handler = new CreateDocument(requestingUserId, 'deviceId', payload)
      db.putDocument = jest.fn().mockResolvedValue(undefined)

      expect(await handler.execute(service)).toEqual(payload)
      expect(db.putDocument).toBeCalledWith(record)
    })
  })

  describe('GrantAccess', () => {
    const requestingUserId = 'testUserId'
    const deviceId = 'testDeviceId'
    const documentId = 'testDocumentId'
    const payload = {
      id: 'otherUserId',
      documentId,
      kind: 'user',
      encCryptPrivKey: 'grantEncCryptPrivKey',
      canSign: false
    } as GrantAccessAction

    it('requires that the requesitng user have access to the document', async () => {
      const handler = new GrantAccess(requestingUserId, deviceId, payload)

      service.getHasReadAccess = jest.fn().mockResolvedValue(false)
      expect(await handler.checkIsAuthorized(service)).toEqual(false)
      expect(service.getHasReadAccess).toBeCalledWith(requestingUserId, documentId)

      service.getHasReadAccess = jest.fn().mockResolvedValue(true)
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getHasReadAccess).toBeCalledWith(requestingUserId, documentId)
    })

    it('persists documentId, userIdOrGroupId, encryptedDecryptionKey', async () => {
      const handler = new GrantAccess(requestingUserId, deviceId, payload)
      db.putGrant = jest.fn().mockResolvedValue(undefined)
      expect(await handler.execute(service)).toEqual(payload)
      expect(db.putGrant).toBeCalledWith(payload)
    })
  })

  describe('DecryptDocument', () => {
    it('requires that the requesitng user have access to the document', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocumentId'
      const payload = {
        documentId
      }

      const handler = new DecryptDocument(requestingUserId, deviceId, payload)

      service.getHasReadAccess = jest.fn().mockResolvedValue(false)
      expect(await handler.checkIsAuthorized(service)).toEqual(false)
      expect(service.getHasReadAccess).toBeCalledWith(requestingUserId, documentId)

      service.getHasReadAccess = jest.fn().mockResolvedValue(true)
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getHasReadAccess).toBeCalledWith(requestingUserId, documentId)
    })

    it('resolves device encrypted document key', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocumentId'
      const payload = {
        documentId
      }
      const encCryptPrivKey = 'deviceEncryptedDocumentKey'
      service.getDeviceDocumentDecryptKey = jest.fn().mockResolvedValue(encCryptPrivKey)

      const handler = new DecryptDocument(requestingUserId, deviceId, payload)

      expect(await handler.execute(service)).toEqual({
        documentId,
        encCryptPrivKey
      })
    })

    it('fails if the user does not have access', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocumentId'
      const payload = {
        documentId
      }
      service.getDeviceDocumentDecryptKey = jest.fn().mockResolvedValue(null)

      const handler = new DecryptDocument(requestingUserId, deviceId, payload)
      let success = false

      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('No access'))
      }

      expect(success).toEqual(false)
    })
  })

  describe('RevokeAccess', () => {
    it('requires that the requesitng user have access to the document', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocumentId'
      const payload = {
        documentId,
        kind: 'user' as GrantKind,
        id: 'otherUserId'
      }

      const handler = new RevokeAccess(requestingUserId, deviceId, payload)

      service.getHasReadAccess = jest.fn().mockResolvedValue(false)
      expect(await handler.checkIsAuthorized(service)).toEqual(false)
      expect(service.getHasReadAccess).toBeCalledWith(requestingUserId, documentId)

      service.getHasReadAccess = jest.fn().mockResolvedValue(true)
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getHasReadAccess).toBeCalledWith(requestingUserId, documentId)
    })

    it('deletes grant record', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocumentId'
      const payload = {
        documentId,
        kind: 'user' as GrantKind,
        id: 'otherUserId'
      }
      service.getHasReadAccess = jest.fn().mockResolvedValue(true)
      db.deleteGrant = jest.fn().mockResolvedValue(undefined)

      const handler = new RevokeAccess(requestingUserId, deviceId, payload)

      expect(await handler.execute(service)).toEqual(payload)
      expect(db.deleteGrant).toBeCalledWith(payload.documentId, payload.kind, payload.id)
    })
  })

  describe('SignDocument', () => {
    describe('authorization', () => {
      it.todo('requires that the requesting user be granted write access to the document')
    })

    describe('execution', () => {
      it.todo('transforms provided device signature to user signature')
      it.todo('transforms user signature to group signature if necessary')
      it.todo('transforms user or group signature to document signature')
      it.todo('returns document signature in response')
    })
  })

  describe('UpdateDocument', () => {
    it('requires that the requesitng user have access to the document', async () => {
      const requestingUserId = 'testUserId'
      const deviceId = 'testDeviceId'
      const documentId = 'testDocumentId'
      const payload = {
        cryptUserId: 'testUserId',
        cryptPubKey: 'documentCryptPubKey',
        documentId: 'testDocumentId',
        encCryptPrivKey: 'documentEncCryptPrivKey'
      }

      const handler = new UpdateDocument(requestingUserId, deviceId, payload)

      service.getHasReadAccess = jest.fn().mockResolvedValue(false)
      expect(await handler.checkIsAuthorized(service)).toEqual(false)
      expect(service.getHasReadAccess).toBeCalledWith(requestingUserId, documentId)

      service.getHasReadAccess = jest.fn().mockResolvedValue(true)
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getHasReadAccess).toBeCalledWith(requestingUserId, documentId)
    })

    it('persists updated DocumentRecord', async () => {
      const documentId = 'testDocumentId'
      const shared = {
        cryptUserId: 'testUserId',
        cryptPubKey: 'documentCryptPubKey',
        encCryptPrivKey: 'documentEncCryptPrivKey'
      }
      const payload = {
        ...shared,
        documentId
      }
      const record = { ...shared, id: documentId }
      db.putDocument = jest.fn().mockResolvedValue(undefined)
      service.getHasReadAccess = jest.fn().mockResolvedValue(true)

      const handler = new UpdateDocument(payload.cryptUserId, 'deviceId', payload)

      expect(await handler.execute(service)).toEqual(payload)
      expect(db.putDocument).toBeCalledWith(record)
    })
  })

  describe('GetPubKeys', () => {
    it('allows anyone', async () => {
      const handler = new GetPubKeys('anyUserId', 'anyDeviceId', { kind: 'user', id: 'whatever' })
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
    })

    it('resolves public keys for user', async () => {
      const userId = 'testUserId'
      const cryptPubKey = 'userCryptPubKey'
      const signPubKey = 'userSignPubKey'

      db.getUser = jest.fn().mockResolvedValue({
        cryptPubKey,
        encCryptPrivKey: 'shouldntmatter',
        encSignPrivKey: 'shouldntmatter'
      } as UserRecord)
      const handler = new GetPubKeys('anyUserId', 'anyDeviceId', { kind: 'user', id: userId })

      expect(await handler.execute(service)).toEqual({
        kind: 'user',
        id: userId,
        cryptPubKey
      })

      expect(db.getUser).toBeCalledWith(userId)
    })

    it('resolves public key(s) for group', async () => {
      const groupId = 'testGroupId'
      const cryptPubKey = 'userCryptPubKey'

      db.getGroup = jest.fn().mockResolvedValue({
        cryptPubKey,
        encCryptPrivKey: 'shouldntmatter'
      } as GroupRecord)
      const handler = new GetPubKeys('anyUserId', 'anyDeviceId', { kind: 'group', id: groupId })

      expect(await handler.execute(service)).toEqual({
        kind: 'group',
        id: groupId,
        cryptPubKey,
        signPubKey: ''
      })

      expect(db.getGroup).toBeCalledWith(groupId)
    })

    it('throws error for unknown type', async () => {
      const handler = new GetPubKeys('anyUserId', 'anyDeviceId', {
        kind: ('invalid' as unknown) as GrantKind,
        id: 'whatever'
      })

      let success = false

      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('Unexpected GetPubKeys kind'))
      }

      expect(success).toEqual(false)
    })

    it('throws error if user does not exist', async () => {
      const userId = 'testUserId'
      db.getUser = jest.fn().mockResolvedValue(null)
      const handler = new GetPubKeys('anyUserId', 'anyDeviceId', { kind: 'user', id: userId })

      let success = false
      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('User does not exist'))
      }

      expect(success).toEqual(false)
      expect(db.getUser).toBeCalledWith(userId)
    })

    it('throws error if group does not exist', async () => {
      const groupId = 'testGroupId'
      db.getGroup = jest.fn().mockResolvedValue(null)
      const handler = new GetPubKeys('anyUserId', 'anyDeviceId', { kind: 'group', id: groupId })

      let success = false
      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('Group does not exist'))
      }

      expect(success).toEqual(false)
      expect(db.getGroup).toBeCalledWith(groupId)
    })
  })

  describe('GetKeyPairs', () => {
    it('allows user if requesting user pairs', async () => {
      const userId = 'testUserId'
      const handler = new GetKeyPairs(userId, 'anyDeviceId', { kind: 'user', id: userId })
      const notMyHandler = new GetKeyPairs('otherUserId', 'anyDeviceId', {
        kind: 'user',
        id: userId
      })

      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(await notMyHandler.checkIsAuthorized(service)).toEqual(false)
    })

    it('allows group admins if requesting group pairs', async () => {
      const userId = 'testUserId'
      const groupId = 'testGroupId'
      const handler = new GetKeyPairs(userId, 'anyDeviceId', { kind: 'group', id: groupId })

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(true)
      expect(await handler.checkIsAuthorized(service)).toEqual(true)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, userId)

      service.getIsGroupAdmin = jest.fn().mockResolvedValue(false)
      expect(await handler.checkIsAuthorized(service)).toEqual(false)
      expect(service.getIsGroupAdmin).toBeCalledWith(groupId, userId)
    })

    it('does not permit unknown type', async () => {
      const handler = new GetKeyPairs('anyUserId', 'anyDeviceId', {
        kind: ('invalid' as unknown) as GrantKind,
        id: 'whatever'
      })

      expect(await handler.checkIsAuthorized(service)).toEqual(false)
    })

    it('resolves public key(s) and device encrypted private keys for user', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const deviceCryptTransformKey = 'deviceCryptTransformKey'
      const cryptPubKey = 'userCryptPubKey'
      const signPubKey = 'userSignPubKey'
      const userEncCryptPrivKey = 'userEncCryptPrivKey'
      const userEncSignPrivKey = 'userEncSignPrivKey'
      const user = {
        id: userId,
        cryptPubKey,
        signPubKey,
        encCryptPrivKey: userEncCryptPrivKey,
        encSignPrivKey: userEncSignPrivKey
      }

      const device = {
        deviceId,
        userId,
        cryptTransformKey: deviceCryptTransformKey
      }

      db.getUser = jest.fn().mockResolvedValue(user)
      db.getDevice = jest.fn().mockResolvedValue(device)

      const handler = new GetKeyPairs(userId, deviceId, { kind: 'user', id: userId })

      expect(await handler.execute(service)).toEqual({
        id: userId,
        kind: 'user',
        cryptPubKey,
        signPubKey,
        encCryptPrivKey: `transformed:${deviceCryptTransformKey}:${userEncCryptPrivKey}`,
        encSignPrivKey: `transformed:${deviceCryptTransformKey}:${userEncSignPrivKey}`
      })
      expect(db.getUser).toBeCalledWith(userId)
      expect(primitives.cryptTransform).toBeCalledWith(
        deviceCryptTransformKey,
        userEncCryptPrivKey,
        service.signKeyPair
      )
      expect(primitives.cryptTransform).toBeCalledWith(
        deviceCryptTransformKey,
        userEncSignPrivKey,
        service.signKeyPair
      )
    })

    it('returns public keys and device encrypted private keys for group owner', async () => {
      const userId = 'testUserId'
      const groupId = 'testGroupId'
      const deviceId = 'testDeviceId'
      const deviceCryptTransformKey = 'deviceCryptTransformKey'
      const cryptPubKey = 'groupCryptPubKey'
      const groupEncCryptPrivKey = 'groupEncCryptPrivKey'
      const group = {
        id: groupId,
        userId,
        cryptPubKey,
        encCryptPrivKey: groupEncCryptPrivKey
      }

      const device = {
        deviceId,
        userId,
        cryptTransformKey: deviceCryptTransformKey
      }

      db.getGroup = jest.fn().mockResolvedValue(group)
      db.getDevice = jest.fn().mockResolvedValue(device)

      const handler = new GetKeyPairs(userId, deviceId, { kind: 'group', id: groupId })

      expect(await handler.execute(service)).toEqual({
        id: groupId,
        kind: 'group',
        cryptPubKey,
        signPubKey: '',
        encCryptPrivKey: `transformed:${deviceCryptTransformKey}:${groupEncCryptPrivKey}`,
        encSignPrivKey: ``
      })
      expect(db.getDevice).toBeCalledWith(deviceId)
      expect(db.getGroup).toBeCalledWith(groupId)
      expect(primitives.cryptTransform).toBeCalledWith(
        deviceCryptTransformKey,
        groupEncCryptPrivKey,
        service.signKeyPair
      )
    })

    it('returns public keys and device encrypted private keys for group admin', async () => {
      const userId = 'testUserId'
      const groupId = 'testGroupId'
      const deviceId = 'testDeviceId'
      const deviceCryptTransformKey = 'deviceCryptTransformKey'
      const cryptPubKey = 'groupCryptPubKey'
      const groupEncCryptPrivKey = 'groupEncCryptPrivKey'
      const group = {
        id: groupId,
        userId: 'someoneElse',
        cryptPubKey,
        encCryptPrivKey: groupEncCryptPrivKey
      }

      const memberGroupEncCryptPrivKey = 'memberGroupEncCryptPrivKey'
      const membership = {
        userId,
        groupId,
        encGroupCryptPrivKey: memberGroupEncCryptPrivKey
      }

      const device = {
        deviceId,
        userId,
        cryptTransformKey: deviceCryptTransformKey
      }

      db.getGroup = jest.fn().mockResolvedValue(group)
      db.getDevice = jest.fn().mockResolvedValue(device)
      db.getMembership = jest.fn().mockResolvedValue(membership)

      const handler = new GetKeyPairs(userId, deviceId, { kind: 'group', id: groupId })

      expect(await handler.execute(service)).toEqual({
        id: groupId,
        kind: 'group',
        cryptPubKey,
        signPubKey: '',
        encCryptPrivKey: `transformed:${deviceCryptTransformKey}:${memberGroupEncCryptPrivKey}`,
        encSignPrivKey: ``
      })
      expect(db.getDevice).toBeCalledWith(deviceId)
      expect(db.getGroup).toBeCalledWith(groupId)
      expect(db.getMembership).toBeCalledWith(groupId, userId)
      expect(primitives.cryptTransform).toBeCalledWith(
        deviceCryptTransformKey,
        memberGroupEncCryptPrivKey,
        service.signKeyPair
      )
    })

    it('throws error for unknown type', async () => {
      const userId = 'testUserId'
      const groupId = 'testGroupId'
      const deviceId = 'testDeviceId'

      const device = {
        deviceId,
        userId,
        cryptTransformKey: 'doesntmatter'
      }

      db.getDevice = jest.fn().mockResolvedValue(device)

      const handler = new GetKeyPairs('anyUserId', 'anyDeviceId', {
        kind: ('invalid' as unknown) as GrantKind,
        id: 'whatever'
      })

      let success = false

      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('Unexpected GetKeyPairs kind'))
      }

      expect(success).toEqual(false)
    })

    it('throws error for unknown device', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'

      db.getDevice = jest.fn().mockResolvedValue(null)

      const handler = new GetKeyPairs(userId, deviceId, {
        kind: ('invalid' as unknown) as GrantKind,
        id: 'whatever'
      })

      let success = false

      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('Device does not exist'))
      }

      expect(success).toEqual(false)
      expect(db.getDevice).toBeCalledWith(deviceId)
    })

    it('throws error for unkown user', async () => {
      const userId = 'testUserId'
      const deviceId = 'testDeviceId'
      const deviceCryptTransformKey = 'deviceCryptTransformKey'

      const device = {
        deviceId,
        userId,
        cryptTransformKey: deviceCryptTransformKey
      }

      db.getUser = jest.fn().mockResolvedValue(null)
      db.getDevice = jest.fn().mockResolvedValue(device)

      const handler = new GetKeyPairs(userId, deviceId, { kind: 'user', id: userId })

      let success = false
      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('User does not exist'))
      }

      expect(success).toEqual(false)
      expect(db.getDevice).toBeCalledWith(deviceId)
      expect(db.getUser).toBeCalledWith(userId)
    })

    it('throws error for unknown group', async () => {
      const userId = 'testUserId'
      const groupId = 'testGroupId'
      const deviceId = 'testDeviceId'
      const deviceCryptTransformKey = 'deviceCryptTransformKey'
      const device = {
        deviceId,
        userId,
        cryptTransformKey: deviceCryptTransformKey
      }

      db.getGroup = jest.fn().mockResolvedValue(null)
      db.getDevice = jest.fn().mockResolvedValue(device)

      const handler = new GetKeyPairs(userId, deviceId, { kind: 'group', id: groupId })

      let success = false
      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('Group does not exist'))
      }

      expect(success).toEqual(false)
      expect(db.getGroup).toBeCalledWith(groupId)
    })

    it('throws error for unknown membership', async () => {
      const userId = 'testUserId'
      const groupId = 'testGroupId'
      const deviceId = 'testDeviceId'
      const deviceCryptTransformKey = 'deviceCryptTransformKey'
      const cryptPubKey = 'groupCryptPubKey'
      const groupEncCryptPrivKey = 'groupEncCryptPrivKey'
      const group = {
        id: groupId,
        userId: 'someoneElse',
        cryptPubKey,
        encCryptPrivKey: groupEncCryptPrivKey
      }

      const device = {
        deviceId,
        userId,
        cryptTransformKey: deviceCryptTransformKey
      }

      db.getGroup = jest.fn().mockResolvedValue(group)
      db.getDevice = jest.fn().mockResolvedValue(device)
      db.getMembership = jest.fn().mockResolvedValue(null)

      const handler = new GetKeyPairs(userId, deviceId, { kind: 'group', id: groupId })

      let success = false
      try {
        await handler.execute(service)
        success = true
      } catch (e) {
        expect(e).toEqual(new Error('Membership does not exist'))
      }

      expect(success).toEqual(false)
      expect(db.getMembership).toBeCalledWith(groupId, userId)
    })
  })
})
