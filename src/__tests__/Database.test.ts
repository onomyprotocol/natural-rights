import { Database } from '../Database'

describe('Database', () => {
  let db: Database

  beforeEach(() => {
    db = new Database()
  })

  afterEach(() => {
    if (db) db.close()
  })

  describe('User', () => {
    describe('getUser', () => {
      it.todo('resolves a device record')
    })

    describe('putUser', () => {
      it.todo('persists a user record')
    })

    describe('deleteUser', () => {
      it.todo('deletes user and all associated devices for given id')
    })
  })

  describe('Device', () => {
    describe('getDevice', () => {
      it.todo('resolves a device record')
    })

    describe('putDevice', () => {
      it.todo('persists a device record')
    })

    describe('deleteDevice', () => {
      it.todo('deletes a device record and associated transformKey')
    })
  })

  describe('Group', () => {
    describe('getGroup', () => {
      it.todo('resolves group record for given id')
    })

    describe('putGroup', () => {
      it.todo('persists a group record')
    })

    describe('deleteGroup', () => {
      it.todo('deletes a group record and associated memberships')
    })
  })

  describe('Membership', () => {
    describe('getMembership', () => {
      it.todo('resolves membership record for given id')
    })

    describe('putMembership', () => {
      it.todo('persists a membership record')
    })

    describe('deleteMembership', () => {
      it.todo('deletes a membership record and associated transformKey')
    })
  })

  describe('Document', () => {
    describe('getDocument', () => {
      it.todo('resolves document record for given id')
    })

    describe('putDocument', () => {
      it.todo('persists a document record')
    })

    describe('deleteDocument', () => {
      it.todo('deletes a document record')
    })
  })

  describe('Grant', () => {
    describe('getGrant', () => {
      it.todo('resolves grant record for given id')
    })

    describe('putGrant', () => {
      it.todo('persists a grant record')
    })

    describe('deleteGrant', () => {
      it.todo('deletes a grant record and associated transformKey')
    })
  })
})
