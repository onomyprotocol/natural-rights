import { Database, Souls } from '../Database'

describe('Database', () => {
  let db: Database
  let dbAdapter: DatabaseAdapterInterface

  beforeEach(() => {
    dbAdapter = {
      get: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      getDocumentGrants: jest.fn().mockResolvedValue([]),
      close: jest.fn()
    }
    db = new Database(dbAdapter)
  })

  afterEach(() => {
    if (db) db.close()
  })

  describe('User', () => {
    describe('getUser', () => {
      it('Resolves a user record when present', async () => {
        const userId = 'testuserid'
        const expectedSoul = Souls.user(userId)
        const userRecord: UserRecord = {
          id: userId,
          signPubKey: '',
          cryptPubKey: '',
          encCryptPrivKey: '',
          encSignPrivKey: ''
        }
        dbAdapter.get = jest.fn().mockResolvedValue(userRecord)

        const result = await db.getUser(userId)
        expect(dbAdapter.get).toBeCalledWith(expectedSoul)
        expect(result).toEqual(userRecord)
      })

      it('Resolves null when no user is present', async () => {
        const userId = 'testuserid'
        const expectedSoul = Souls.user(userId)

        const result = await db.getUser(userId)
        expect(dbAdapter.get).toBeCalledWith(expectedSoul)
        expect(result).toEqual(null)
      })
    })

    describe('putUser', () => {
      it('persists a user record via the adapter', async () => {
        const userId = 'testuserid'
        const expectedSoul = Souls.user(userId)
        const userRecord: UserRecord = {
          id: userId,
          signPubKey: '',
          cryptPubKey: '',
          encCryptPrivKey: '',
          encSignPrivKey: ''
        }

        await db.putUser(userRecord)
        expect(dbAdapter.put).toBeCalledWith(expectedSoul, userRecord)
      })
    })

    describe('deleteUser', () => {
      it('deletes user for given id', async () => {
        const userId = 'testuserid'
        const expectedSoul = Souls.user(userId)

        await db.deleteUser(userId)
        expect(dbAdapter.delete).toBeCalledWith(expectedSoul)
      })
      it.todo('deletes associated devices')
    })
  })

  describe('Device', () => {
    describe('getDevice', () => {
      it('resolves a device record when present', async () => {
        const userId = 'testuserid'
        const deviceId = 'testdeviceid'
        const expectedSoul = Souls.device(userId, deviceId)
        const deviceRecord: DeviceRecord = {
          id: deviceId,
          userId,
          signPubKey: '',
          cryptPubKey: '',
          cryptTransformKey: ''
        }
        dbAdapter.get = jest.fn().mockResolvedValue(deviceRecord)

        const result = await db.getDevice(userId, deviceId)
        expect(dbAdapter.get).toBeCalledWith(expectedSoul)
        expect(result).toEqual(deviceRecord)
      })
    })

    describe('putDevice', () => {
      it('persists a device record via the adapter', async () => {
        const userId = 'testuserid'
        const deviceId = 'testdeviceid'
        const expectedSoul = Souls.device(userId, deviceId)
        const deviceRecord: DeviceRecord = {
          id: deviceId,
          userId,
          signPubKey: '',
          cryptPubKey: '',
          cryptTransformKey: ''
        }

        await db.putDevice(deviceRecord)
        expect(dbAdapter.put).toBeCalledWith(expectedSoul, deviceRecord)
      })
    })

    describe('deleteDevice', () => {
      it('deletes a device record and associated transformKey', async () => {
        const userId = 'testuserid'
        const deviceId = 'testdeviceid'
        const expectedSoul = Souls.device(userId, deviceId)

        await db.deleteDevice(userId, deviceId)
        expect(dbAdapter.delete).toBeCalledWith(expectedSoul)
      })
    })
  })

  describe('Group', () => {
    describe('getGroup', () => {
      it('resolves group record when present', async () => {
        const groupId = 'testgroupid'
        const expectedSoul = Souls.group(groupId)
        const groupRecord: GroupRecord = {
          id: groupId,
          userId: 'testUserId',
          cryptPubKey: '',
          encCryptPrivKey: ''
        }

        expect(await db.getGroup(groupId)).toEqual(null)
        dbAdapter.get = jest.fn().mockResolvedValue(groupRecord)

        const result = await db.getGroup(groupId)
        expect(dbAdapter.get).toBeCalledWith(expectedSoul)
        expect(result).toEqual(groupRecord)
      })
    })

    describe('putGroup', () => {
      it('persists a group record via the adapter', async () => {
        const groupId = 'testgroupid'
        const expectedSoul = Souls.group(groupId)
        const groupRecord: GroupRecord = {
          id: groupId,
          userId: 'testUserId',
          cryptPubKey: '',
          encCryptPrivKey: ''
        }

        await db.putGroup(groupRecord)
        expect(dbAdapter.put).toBeCalledWith(expectedSoul, groupRecord)
      })
    })

    describe('deleteGroup', () => {
      it('deletes a group record', async () => {
        const groupId = 'testgroupid'
        const expectedSoul = Souls.group(groupId)
        await db.deleteGroup(groupId)
        expect(dbAdapter.delete).toBeCalledWith(expectedSoul)
      })

      it.todo('deletes associated grants')
    })
  })

  describe('Membership', () => {
    const userId = 'testuserid'
    const groupId = 'testgroupid'
    const expectedSoul = Souls.membership(groupId, userId)
    const membershipRecord: MembershipRecord = {
      groupId,
      userId,
      cryptTransformKey: '',
      signPubKey: '',
      encSignPrivKey: '',
      signTransformToUserId: '',
      signTransformKey: '',
      encGroupCryptPrivKey: ''
    }

    describe('getMembership', () => {
      it('resolves membership record for group/user if present', async () => {
        dbAdapter.get = jest.fn().mockResolvedValue(membershipRecord)
        const result = await db.getMembership(groupId, userId)
        expect(dbAdapter.get).toBeCalledWith(expectedSoul)
        expect(result).toEqual(membershipRecord)
      })
    })

    describe('putMembership', () => {
      it('persists a membership record via the adapter', async () => {
        await db.putMembership(membershipRecord)
        expect(dbAdapter.put).toBeCalledWith(expectedSoul, membershipRecord)
      })
    })

    describe('deleteMembership', () => {
      it('deletes a membership record and associated transformKey', async () => {
        const userId = 'testuserid'
        const groupId = 'testgroupid'
        const expectedSoul = Souls.membership(groupId, userId)

        await db.deleteMembership(groupId, userId)
        expect(dbAdapter.delete).toBeCalledWith(expectedSoul)
      })
    })
  })

  describe('Document', () => {
    const documentId = 'testdocumentid'
    const expectedSoul = Souls.document(documentId)
    const documentRecord: DocumentRecord = {
      id: documentId,
      cryptUserId: '',
      cryptPubKey: '',
      encCryptPrivKey: '',
      signUserId: '',
      encSignPrivKey: ''
    }

    describe('getDocument', () => {
      it('resolves document record for given id when present', async () => {
        dbAdapter.get = jest.fn().mockResolvedValue(documentRecord)
        const result = await db.getDocument(documentId)
        expect(dbAdapter.get).toBeCalledWith(expectedSoul)
        expect(result).toEqual(documentRecord)
      })
    })

    describe('putDocument', () => {
      it('persists a document record via the adapter', async () => {
        await db.putDocument(documentRecord)
        expect(dbAdapter.put).toBeCalledWith(expectedSoul, documentRecord)
      })
    })

    describe('deleteDocument', () => {
      it('deletes a document record', async () => {
        await db.deleteDocument(documentId)
        expect(dbAdapter.delete).toBeCalledWith(expectedSoul)
      })
    })
  })

  describe('Grant', () => {
    const documentId = 'testdocumentid'
    const userId = 'testuserid'
    const expectedSoul = Souls.grant(documentId, 'user', userId)
    const grantRecord: GrantRecord = {
      documentId,
      id: userId,
      kind: 'user',
      encCryptPrivKey: '',

      signPubKey: '',
      encSignPrivKey: '',
      signTransformKey: '',
      signTransformToKind: 'user',
      signTransformToId: ''
    }

    describe('getGrant', () => {
      it('resolves grant record when present', async () => {
        expect(await db.getGrant(documentId, 'user', userId)).toEqual(null)
        dbAdapter.get = jest.fn().mockResolvedValue(grantRecord)

        const result = await db.getGrant(documentId, 'user', userId)
        expect(dbAdapter.get).toBeCalledWith(expectedSoul)
        expect(result).toEqual(grantRecord)
      })
    })

    describe('putGrant', () => {
      it('persists a grant record', async () => {
        dbAdapter.get = jest.fn().mockResolvedValue(grantRecord)

        await db.putGrant(grantRecord)
        expect(dbAdapter.put).toBeCalledWith(expectedSoul, grantRecord)
      })
    })

    describe('deleteGrant', () => {
      it('deletes a grant record', async () => {
        const documentId = 'testdocumentid'
        const userId = 'testuserid'
        const expectedSoul = Souls.grant(documentId, 'user', userId)

        await db.deleteGrant(documentId, 'user', userId)
        expect(dbAdapter.delete).toBeCalledWith(expectedSoul)
      })
    })

    describe('getDocumentGrants', () => {
      it('resolves document grant records from db', async () => {
        const documentId = 'testdocumentid'
        const grants = [
          {
            kind: 'user',
            documentId,
            id: 'testUserId'
          },
          {
            kind: 'group',
            documentId,
            id: 'testGroupId'
          }
        ]
        dbAdapter.getDocumentGrants = jest.fn().mockResolvedValue(grants)

        expect(await db.getDocumentGrants(documentId)).toEqual(grants)
        expect(dbAdapter.getDocumentGrants).toBeCalledWith(Souls.document(documentId))
      })
    })
  })
})
