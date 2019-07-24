export class Client implements ClientInterface {
  service: ServiceInterface
  userId: string
  deviceId: string
  deviceCryptKeyPair: KeyPair
  deviceSignKeyPair: KeyPair

  constructor(
    service: ServiceInterface,
    userId: string,
    deviceCryptKeyPair: KeyPair,
    deviceSignKeyPair: KeyPair
  ) {
    this.service = service
    this.userId = userId
    this.deviceCryptKeyPair = deviceCryptKeyPair
    this.deviceSignKeyPair = deviceSignKeyPair
    this.deviceId = deviceSignKeyPair.pubKey
  }

  async sign(actions: NaturalRightsAction[]) {
    const body = JSON.stringify(actions)
    const signature = await this.service.primitives.sign(this.deviceSignKeyPair, body)
    return {
      userId: this.userId,
      deviceId: this.deviceId,
      body,
      signature
    } as NaturalRightsRequest
  }

  async request(actions: NaturalRightsAction[]) {
    const request = await this.sign(actions)
    const response = await this.service.request(request)
    const errors = getErrors(response)
    if (errors.length) throw errors
    return response
  }

  async initializeUser() {
    const userSignKeyPair = await this.service.primitives.signKeyGen()
    const userCryptKeyPair = await this.service.primitives.cryptKeyGen()
    const deviceCryptTransformKey = await this.service.primitives.cryptTransformKeyGen(
      userCryptKeyPair,
      this.deviceCryptKeyPair.pubKey,
      this.deviceSignKeyPair
    )
    const userEncSignPrivKey = await this.service.primitives.encrypt(
      userCryptKeyPair.pubKey,
      userSignKeyPair.privKey,
      this.deviceSignKeyPair
    )
    const userEncCryptPrivKey = await this.service.primitives.encrypt(
      userCryptKeyPair.pubKey,
      userCryptKeyPair.privKey,
      this.deviceSignKeyPair
    )

    this.userId = userSignKeyPair.pubKey

    await this.request([
      {
        type: 'InitializeUser',
        payload: {
          userId: this.userId,
          cryptPubKey: userCryptKeyPair.pubKey,
          encCryptPrivKey: userEncCryptPrivKey,
          encSignPrivKey: userEncSignPrivKey
        }
      },
      {
        type: 'AddDevice',
        payload: {
          deviceId: this.deviceId,
          userId: this.userId,
          cryptPubKey: this.deviceCryptKeyPair.pubKey,
          signPubKey: this.deviceSignKeyPair.pubKey,
          cryptTransformKey: deviceCryptTransformKey
        }
      }
    ] as [Action<InitializeUserAction>, Action<AddDeviceAction>])
  }

  async addDevice(deviceId: string) {
    const userCryptKeyPair = await this.getEncryptionKeyPair('user', this.userId)
    const deviceCryptKeyPair = await this.service.primitives.cryptKeyGen()
    const deviceSignKeyPair = await this.service.primitives.signKeyGen()
    const cryptTransformKey = await this.service.primitives.cryptTransformKeyGen(
      userCryptKeyPair,
      deviceCryptKeyPair.pubKey,
      deviceSignKeyPair
    )

    await this.request([
      {
        type: 'AddDevice',
        payload: {
          deviceId,
          userId: this.userId,
          cryptPubKey: deviceCryptKeyPair.pubKey,
          signPubKey: deviceSignKeyPair.pubKey,
          cryptTransformKey
        }
      }
    ] as [Action<AddDeviceAction>])

    return {
      deviceSignKeyPair,
      deviceCryptKeyPair
    }
  }

  async removeDevice(deviceId: string) {
    await this.request([
      {
        type: 'RemoveDevice',
        payload: {
          userId: this.userId,
          deviceId
        }
      }
    ] as [Action<RemoveDeviceAction>])
  }

  async createGroup() {
    const ownerPubKey = await this.getEncryptionPublicKey('user', this.userId)
    const groupCryptKeyPair = await this.service.primitives.cryptKeyGen()
    const groupSignKeyPair = await this.service.primitives.signKeyGen()
    const encCryptPrivKey = await this.service.primitives.encrypt(
      ownerPubKey,
      groupCryptKeyPair.privKey,
      this.deviceSignKeyPair
    )
    const encSignPrivKey = await this.service.primitives.encrypt(
      ownerPubKey,
      groupSignKeyPair.privKey,
      this.deviceSignKeyPair
    )
    const cryptTransformKey = await this.service.primitives.cryptTransformKeyGen(
      groupCryptKeyPair,
      ownerPubKey,
      this.deviceSignKeyPair
    )
    const groupId = groupSignKeyPair.pubKey

    await this.request([
      {
        type: 'CreateGroup',
        payload: {
          groupId,
          userId: this.userId,
          cryptPubKey: groupCryptKeyPair.pubKey,
          encCryptPrivKey,
          encSignPrivKey
        }
      },
      {
        type: 'AddMemberToGroup',
        payload: {
          groupId,
          userId: this.userId,
          cryptTransformKey
        }
      },
      {
        type: 'AddAdminToGroup',
        payload: {
          groupId,
          userId: this.userId,
          encCryptPrivKey
        }
      }
    ] as [Action<CreateGroupAction>, Action<AddMemberToGroupAction>, Action<AddAdminToGroupAction>])
    return groupId
  }

  async addReaderToGroup(groupId: string, userId: string) {
    const memberPubKey = await this.getEncryptionPublicKey('user', userId)
    const groupCryptKeyPair = await this.getEncryptionKeyPair('group', groupId)
    const cryptTransformKey = await this.service.primitives.cryptTransformKeyGen(
      groupCryptKeyPair,
      memberPubKey,
      this.deviceSignKeyPair
    )
    await this.request([
      {
        type: 'AddMemberToGroup',
        payload: {
          groupId,
          userId,
          cryptTransformKey
        }
      }
    ] as [Action<AddMemberToGroupAction>])
  }

  async addSignerToGroup(groupId: string, userId: string) {
    await this.request([
      {
        type: 'AddMemberToGroup',
        payload: {
          groupId,
          userId,
          canSign: true
        }
      }
    ] as [Action<AddMemberToGroupAction>])
  }

  async removeMemberFromGroup(groupId: string, userId: string) {
    await this.request([
      {
        type: 'RemoveMemberFromGroup',
        payload: {
          groupId,
          userId
        }
      }
    ] as [Action<RemoveMemberFromGroupAction>])
  }

  async addAdminToGroup(groupId: string, userId: string) {
    const memberPubKey = await this.getEncryptionPublicKey('user', userId)
    const groupCryptKeyPair = await this.getEncryptionKeyPair('group', groupId)
    const cryptTransformKey = await this.service.primitives.cryptTransformKeyGen(
      groupCryptKeyPair,
      memberPubKey,
      this.deviceSignKeyPair
    )
    const encCryptPrivKey = await this.service.primitives.encrypt(
      memberPubKey,
      groupCryptKeyPair.privKey,
      this.deviceSignKeyPair
    )
    await this.request([
      {
        type: 'AddMemberToGroup',
        payload: {
          groupId,
          userId,
          cryptTransformKey,
          canSign: true
        }
      },
      {
        type: 'AddAdminToGroup',
        payload: {
          groupId,
          userId,
          encCryptPrivKey
        }
      }
    ] as [Action<AddMemberToGroupAction>, Action<AddAdminToGroupAction>])
  }

  async removeAdminFromGroup(groupId: string, userId: string) {
    await this.request([
      {
        type: 'RemoveAdminFromGroup',
        payload: {
          groupId,
          userId
        }
      }
    ] as [Action<RemoveAdminFromGroupAction>])
  }

  async createDocument() {
    const userCryptPubKey = await this.getEncryptionPublicKey('user', this.userId)
    const docCryptKeyPair = await this.service.sea.cryptKeyGen()

    const encCryptPrivKey = await this.service.primitives.encrypt(
      userCryptPubKey,
      docCryptKeyPair.privKey,
      this.deviceSignKeyPair
    )

    const response = await this.request([
      {
        type: 'CreateDocument',
        payload: {
          cryptUserId: this.userId,
          creatorId: this.userId,

          cryptPubKey: docCryptKeyPair.pubKey,
          encCryptPrivKey
        }
      }
    ] as [Action<CreateDocumentAction>])
    const result = response.results.find(({ type }) => type === 'CreateDocument')
    if (!result) throw new Error('No result')

    return {
      id: (result.payload! as CreateDocumentResult).documentId,
      cryptKeyPair: docCryptKeyPair
    }
  }

  async grantReadAccess(documentId: string, kind: GrantKind, id: string) {
    const granteePubKey = await this.getEncryptionPublicKey(kind, id)
    const docCryptPrivKey = await this.decryptDocumentEncryptionKey(documentId)
    const encCryptPrivKey = await this.service.primitives.encrypt(
      granteePubKey,
      docCryptPrivKey,
      this.deviceSignKeyPair
    )
    await this.request([
      {
        type: 'GrantAccess',
        payload: {
          documentId,
          kind,
          id,
          encCryptPrivKey
        }
      }
    ] as [Action<GrantAccessAction>])
  }

  async grantSignAccess(documentId: string, kind: GrantKind, id: string) {
    await this.request([
      {
        type: 'GrantAccess',
        payload: {
          documentId,
          kind,
          id,
          canSign: true
        }
      }
    ])
  }

  async decryptDocumentEncryptionKey(documentId: string) {
    const response = await this.request([
      {
        type: 'DecryptDocument',
        payload: {
          documentId
        }
      }
    ] as [Action<DecryptDocumentAction>])
    const result = response.results.find(({ type }) => type === 'DecryptDocument')
    if (!result) throw new Error('No DecryptDocument result')
    const { encCryptPrivKey } = result.payload as DecryptDocumentResult
    const cryptPrivKey = this.service.primitives.decrypt(this.deviceCryptKeyPair, encCryptPrivKey)
    return cryptPrivKey
  }

  async revokeAccess(documentId: string, kind: GrantKind, id: string) {
    await this.request([
      {
        type: 'RevokeAccess',
        payload: {
          documentId,
          kind,
          id
        }
      }
    ] as [Action<RevokeAccessAction>])
  }

  async updateDocumentEncryption(documentId: string) {
    const userPubKey = await this.getEncryptionPublicKey('user', this.userId)
    const docCryptKeyPair = await this.service.primitives.cryptKeyGen()
    const encCryptPrivKey = await this.service.primitives.encrypt(
      userPubKey,
      docCryptKeyPair.privKey,
      this.deviceSignKeyPair
    )
    await this.request([
      {
        type: 'UpdateDocument',
        payload: {
          documentId,
          cryptUserId: this.userId,
          cryptPubKey: docCryptKeyPair.pubKey,
          encCryptPrivKey
        }
      }
    ] as [Action<UpdateDocumentAction>])
    return docCryptKeyPair
  }

  async signDocumentHashes(documentId: string, hashes: string[]) {
    const response = await this.request([
      {
        type: 'SignDocument',
        payload: {
          documentId,
          hashes
        }
      }
    ] as [Action<SignDocumentAction>])
    const result = response.results.find(({ type }) => type === 'SignDocument')
    if (!result) throw new Error('No SignDocument result')
    return (result.payload as SignDocumentResult).signatures
  }

  async signDocumentTexts(documentId: string, textsToSign: string[]) {
    const hashes = await Promise.all(textsToSign.map(this.service.sea.hashForSignature))
    return this.signDocumentHashes(documentId, hashes)
  }

  async decryptDocumentTexts(documentId: string, ciphertexts: string[]) {
    const privKey = await this.decryptDocumentEncryptionKey(documentId)
    return Promise.all(ciphertexts.map(ciphertext => this.service.sea.decrypt(privKey, ciphertext)))
  }

  async encryptDocumentTexts(documentId: string, plaintexts: string[]) {
    const privKey = await this.decryptDocumentEncryptionKey(documentId)
    if (!privKey) throw new Error('No document access')
    return Promise.all(plaintexts.map(text => this.service.sea.encrypt(privKey, text)))
  }

  async getPublicKeys(kind: SignatureKind, id: string) {
    const response = await this.request([
      {
        type: 'GetPubKeys',
        payload: {
          kind,
          id
        }
      }
    ] as [Action<GetPubKeysAction>])

    const result = response.results.find(({ type }) => type === 'GetPubKeys')
    if (!result) throw new Error('No GetPubKeys result')

    return result.payload as GetPubKeysResult
  }

  async getKeyPairs(kind: SignatureKind, id: string) {
    const response = await this.request([
      {
        type: 'GetKeyPairs',
        payload: {
          kind,
          id
        }
      }
    ] as [Action<GetKeyPairsAction>])

    const result = response.results.find(({ type }) => type === 'GetKeyPairs')
    if (!result) throw new Error('No GetKeyPairs result')

    return result.payload as GetKeyPairsResult
  }

  async getEncryptionPublicKey(kind: GrantKind, id: string) {
    const keys = await this.getPublicKeys(kind, id)
    return keys.cryptPubKey
  }

  async getEncryptionKeyPair(kind: GrantKind, id: string) {
    const pairs = await this.getKeyPairs(kind, id)

    return {
      pubKey: pairs.cryptPubKey,
      privKey: await this.service.primitives.decrypt(this.deviceCryptKeyPair, pairs.encCryptPrivKey)
    }
  }
}

function getErrors(response: NaturalRightsResponse) {
  return response.results.filter(result => !!result.error)
}
