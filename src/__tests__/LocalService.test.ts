import { LocalService } from '../LocalService'

describe('LocalService', () => {
  describe('initializeUser', () => {
    it.todo('verifies signature of request matches new id')

    it.todo('persists encrypted private keys for user')
    it.todo("adds the user's first device")
  })

  describe('addDevice', () => {
    it.todo('verifies signature of request matches user')
    it.todo('verifies signature from device key?')

    it.todo('persists transformKey and metadata')
  })

  describe('removeDevice', () => {
    it.todo('verifies signature of request matches user')

    it.todo('deletes device record from database')
  })

  describe('createGroup', () => {
    it.todo('verifies signature of request matches user')

    it.todo('persists groupId, publicKey, userId and encryptedPrivateKey')
  })

  describe('addMemberToGroup', () => {
    it.todo('verifies signature of request matches group admin')

    it.todo('persists groupId, userId, transformKey')
  })

  describe('removeMemberFromGroup', () => {
    it.todo('verifies signature of request matches admin or member to remove')

    it.todo('deletes membership record from database')
  })

  describe('addAdminToGroup', () => {
    it.todo('verifies signature of request matches admin')

    it.todo('persists membership with encrypted private key')
  })

  describe('removeAdminFromGroup', () => {
    it.todo('verifies signature of request matches admin')

    it.todo('deletes encrypted private key for membership')
  })

  describe('encryptDocument', () => {
    it.todo('verifies signature of request matches owner')

    it.todo('persists documentId, ownerId, and encrypted decryption key')
  })

  describe('grantAccess', () => {
    it.todo('verifies signature of request matches owner or user with access')

    it.todo('persists documentId, userIdOrGroupId, encryptedDecryptionKey')
  })

  describe('decryptDocument', () => {})

  describe('revokeAccess', () => {
    it.todo('verifies signature of request matches owner or user with access')

    it.todo('deletes grant record')
  })

  describe('updateDocument', () => {})
})
