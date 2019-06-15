describe('Request', () => {
  describe('initializeUser', () => {
    it.todo('uses KeyGen to generate encryption key pair')
    it.todo('uses KeyGen to generate signing key pair')
    it.todo('uses Encrypt to encrypt private keys')
    it.todo('generates a request including userId, public keys and encrypted private keys')
    it.todo('signs the request with the signing key for the new user')
  })

  describe('addDevice', () => {
    it.todo('requires or retrieves user private key')
    it.todo('uses KeyGen to generate encryption key pair')
    it.todo('uses KeyGen to generate signing key pair')
    it.todo('uses TransformKeyGen for User->Device to build transformKey')
    it.todo('generates a request including userId, publicKeys, and transformKeys')
    it.todo('signs the request with the device key')
  })

  describe('removeDevice', () => {
    it.todo('generates a request including userId and deviceId')
    it.todo('signs the request with user key')
  })

  describe('createGroup', () => {
    it.todo('uses KeyGen to generate encryption key pair')
    it.todo('uses KeyGen to generate signing key pair')
    it.todo('encrypts private key to owning user pub key')
    it.todo('generates a request with publicKey, userId, encryptedPrivateKey')
    it.todo('signs request as owning user')
  })

  describe('addMemberToGroup', () => {
    it.todo('uses TransformKeyGen for Group->Member to build transformKey')
    it.todo('signs request as group admin')
  })

  describe('removeMemberFromGroup', () => {
    it.todo('generates a request including requesting userId and groupId')
    it.todo('signs request as user')
  })

  describe('addAdminToGroup', () => {
    it.todo("encrypts group private keys to new admin's public key")
    it.todo('generates a request including userId, groupId, and encrypted private keys')
    it.todo('signs request as group admin')
  })

  describe('removeAdminFromGroup', () => {
    it.todo('generates a request including userId and groupId')
    it.todo('signs request as group admin')
  })

  describe('encryptDocument', () => {})

  describe('grantAccess', () => {
    it.todo('encrypts document decryption key for provided userId or groupId')
    it.todo(
      'generates a request including documentId, encrypted decryption key and userId or groupId'
    )
    it.todo('signs request as someone with access to document')
  })

  describe('decryptDocument', () => {
    it.todo('generates a request including documentId')
    it.todo('signs request as someone with access to document')
  })

  describe('revokeAccess', () => {
    it.todo('generates a request including documentId and userId')
    it.todo('signs request as someone with access to document')
  })

  describe('updateDocument', () => {
    it.todo(
      'generates a request including documentId, and list of updated access items with encrypted decryption keys'
    )
  })
})
