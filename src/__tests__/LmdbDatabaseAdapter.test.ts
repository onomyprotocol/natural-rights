import { LmdbDatabaseAdapter } from '../LmdbDatabaseAdapter'
import { Souls } from '../Database'

const path = require('path')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')

describe('LmdbDatabaseAdapter', () => {
  const testDirPath = path.resolve(__dirname, './testdata')
  let db: LmdbDatabaseAdapter

  beforeEach(async () => {
    await new Promise((ok, fail) =>
      rimraf(testDirPath, (err: any) => {
        if (err) return fail(err)
        mkdirp(testDirPath, (err: any) => (err ? fail(err) : ok()))
      })
    )

    db = new LmdbDatabaseAdapter({
      path: testDirPath
    })
  })

  afterEach(async () => {
    if (db) db.close()
    await new Promise(ok => rimraf(testDirPath, ok))
  })

  it('can get, put and delete records', async () => {
    const record = {
      id: 'documentId',
      userId: 'userId',
      cryptPubKey: 'cryptPubKey',
      encCryptPrivKey: 'encCryptPrivKey',
      encSignPrivKey: 'encSignPrivKey'
    }
    const soul = 'testsoul'

    expect(await db.get('')).toEqual(null)
    expect(await db.get(soul)).toEqual(null)
    await db.put(soul, record)
    expect(await db.get(soul)).toEqual(record)
    await db.delete(soul)
    expect(await db.get(soul)).toEqual(null)
  })

  describe('put', () => {
    it('calls delete if data is falsy', async () => {
      const soul = 'testsoul'

      db.delete = jest.fn().mockResolvedValue(undefined)

      await db.put(soul, null)

      expect(db.delete).toBeCalledWith(soul)
    })

    it('resolves undefined if no soul passed', async () => {
      const record = {
        id: 'documentId',
        userId: 'userId',
        cryptPubKey: 'cryptPubKey',
        encCryptPrivKey: 'encCryptPrivKey',
        encSignPrivKey: 'encSignPrivKey'
      }

      expect(await db.put('', record)).toEqual(undefined)
    })
  })

  describe('delete', () => {
    it('resolves undefined if no soul is passed', async () => {
      expect(await db.delete('')).toEqual(undefined)
    })
  })

  describe('getDocumentGrants', () => {
    it('resolves grant records for a given document soul', async () => {
      const documentId = 'testDocumentId'
      const document = {
        id: documentId,
        userId: 'testUserId',
        cryptPubKey: 'cryptPubKey',

        encCryptPrivKey: 'encCryptPrivKey',
        encSignPrivKey: 'encSignPrivKey'
      }

      const someOtherDoc = {
        id: 'someOtherDoc',
        userId: 'testUserId',
        cryptPubKey: 'cryptPubKey',

        encCryptPrivKey: 'encCryptPrivKey',
        encSignPrivKey: 'encSignPrivKey'
      }

      const expectedGrants = [
        {
          documentId,
          kind: 'group',
          id: 'group1'
        },
        {
          documentId,
          kind: 'group',
          id: 'group2'
        },
        {
          documentId,
          kind: 'user',
          id: 'user1'
        },
        {
          documentId,
          kind: 'user',
          id: 'user2'
        }
      ]

      const unexpectedGrants = [
        {
          documentId: 'someOtherDoc',
          kind: 'group',
          id: 'group1'
        },
        {
          documentId: 'someOtherDoc',
          kind: 'group',
          id: 'group2'
        },
        {
          documentId: 'someOtherDoc',
          kind: 'user',
          id: 'user1'
        },
        {
          documentId: 'someOtherDoc',
          kind: 'user',
          id: 'user2'
        }
      ]

      const allGrants = [...expectedGrants, ...unexpectedGrants] as GrantRecord[]

      await db.put(Souls.document(document.id), document)
      await db.put(Souls.document(someOtherDoc.id), someOtherDoc)

      for (let grant of allGrants) {
        await db.put(Souls.grant(grant.documentId, grant.kind, grant.id), grant)
      }

      expect(await db.getDocumentGrants(Souls.document(document.id))).toEqual(expectedGrants)
    })
  })

  describe('lmdb specifics', () => {
    describe('transact', () => {
      it('aborts if errors thrown in transaction and rethrows', async () => {
        const txn = { abort: jest.fn() }
        db.env.beginTxn = jest.fn().mockReturnValue(txn)
        const error = new Error('Expected Error')
        const fn = jest.fn().mockImplementation(() => {
          throw error
        })

        let success = false
        try {
          await db.transact(fn)
          success = true
        } catch (e) {
          expect(e).toEqual(error)
        }

        expect(fn).toBeCalledWith(txn)
        expect(success).toEqual(false)
        expect(txn.abort).toBeCalled()
      })
    })

    describe('cursor', () => {
      it('aborts if errors thrown in transaction and rethrows', async () => {
        const error = new Error('Expected Error')
        const fn = jest.fn().mockImplementation(() => {
          throw error
        })

        let success = false
        try {
          await db.cursor(fn)
          success = true
        } catch (e) {
          expect(e).toEqual(error)
        }

        expect(success).toEqual(false)
      })
    })

    describe('serialize', () => {
      it("returns '' if node is falsy", () => {
        expect(db.serialize(null)).toEqual('')
      })
    })
  })
})
