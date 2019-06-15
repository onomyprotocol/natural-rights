export class Client implements ClientInterface {
  service: ServiceInterface
  userId: string
  deviceId: string
  deviceCryptKeyPair: KeyPair
  deviceSignKeyPair: KeyPair

  constructor(
    service: ServiceInterface,
    userId: string,
    deviceId: string,
    deviceCryptKeyPair: KeyPair,
    deviceSignKeyPair: KeyPair
  ) {
    this.service = service
    this.userId = userId
    this.deviceId = deviceId
    this.deviceCryptKeyPair = deviceCryptKeyPair
    this.deviceSignKeyPair = deviceSignKeyPair
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
      this.deviceCryptKeyPair.pubKey
    )
    const userEncSignPrivKey = await this.service.primitives.encrypt(
      userCryptKeyPair.pubKey,
      userSignKeyPair.privKey
    )
    const userEncCryptPrivKey = await this.service.primitives.encrypt(
      userCryptKeyPair.pubKey,
      userCryptKeyPair.privKey
    )

    await this.request([
      {
        type: 'InitializeUser',
        payload: {
          userId: this.userId,
          cryptPubKey: userCryptKeyPair.pubKey,
          signPubKey: userSignKeyPair.pubKey,
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
    const userCryptKeyPair = await this.getCryptKeyPair('user', this.userId)
    const deviceCryptKeyPair = await this.service.primitives.cryptKeyGen()
    const deviceSignKeyPair = await this.service.primitives.signKeyGen()
    const cryptTransformKey = await this.service.primitives.cryptTransformKeyGen(
      userCryptKeyPair,
      deviceCryptKeyPair.pubKey
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

  async createGroup(groupId: string) {
    const ownerPubKey = await this.getCryptPubKey('user', this.userId)
    const groupCryptKeyPair = await this.service.primitives.cryptKeyGen()
    const encCryptPrivKey = await this.service.primitives.encrypt(
      ownerPubKey,
      groupCryptKeyPair.privKey
    )
    const cryptTransformKey = await this.service.primitives.cryptTransformKeyGen(
      groupCryptKeyPair,
      ownerPubKey
    )
    await this.request([
      {
        type: 'CreateGroup',
        payload: {
          groupId,
          userId: this.userId,
          cryptPubKey: groupCryptKeyPair.pubKey,
          encCryptPrivKey
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
  }

  async addMemberToGroup(groupId: string, userId: string) {
    const memberPubKey = await this.getCryptPubKey('user', userId)
    const groupCryptKeyPair = await this.getCryptKeyPair('group', groupId)
    const cryptTransformKey = await this.service.primitives.cryptTransformKeyGen(
      groupCryptKeyPair,
      memberPubKey
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
    const memberPubKey = await this.getCryptPubKey('user', userId)
    const groupCryptKeyPair = await this.getCryptKeyPair('group', groupId)
    const cryptTransformKey = await this.service.primitives.cryptTransformKeyGen(
      groupCryptKeyPair,
      memberPubKey
    )
    const encCryptPrivKey = await this.service.primitives.encrypt(
      memberPubKey,
      groupCryptKeyPair.privKey
    )
    await this.request([
      {
        type: 'AddMemberToGroup',
        payload: {
          groupId,
          userId,
          cryptTransformKey
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

  async encryptDocument(documentId: string) {
    const userPubKey = await this.getCryptPubKey('user', this.userId)
    const docCryptKeyPair = await this.service.primitives.cryptKeyGen()
    const encCryptPrivKey = await this.service.primitives.encrypt(
      userPubKey,
      docCryptKeyPair.privKey
    )
    await this.request([
      {
        type: 'EncryptDocument',
        payload: {
          documentId,
          userId: this.userId,
          encCryptPrivKey
        }
      }
    ] as [Action<EncryptDocumentAction>])
    return docCryptKeyPair
  }

  async grantAccess(documentId: string, kind: GrantKind, id: string) {
    const granteePubKey = await this.getCryptPubKey(kind, id)
    const docCryptPrivKey = await this.decryptDocument(documentId)
    const encCryptPrivKey = await this.service.primitives.encrypt(granteePubKey, docCryptPrivKey)
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

  async decryptDocument(documentId: string) {
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

  async updateDocument(documentId: string) {
    const userPubKey = await this.getCryptPubKey('user', this.userId)
    const docCryptKeyPair = await this.service.primitives.cryptKeyGen()
    const encCryptPrivKey = await this.service.primitives.encrypt(
      userPubKey,
      docCryptKeyPair.privKey
    )
    await this.request([
      {
        type: 'UpdateDocument',
        payload: {
          documentId,
          userId: this.userId,
          encCryptPrivKey
        }
      }
    ] as [Action<UpdateDocumentAction>])
    return docCryptKeyPair
  }

  async getPubKeys(kind: GrantKind, id: string) {
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

  async getKeyPairs(kind: GrantKind, id: string) {
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

  async getCryptPubKey(kind: GrantKind, id: string) {
    const keys = await this.getPubKeys(kind, id)
    return keys.cryptPubKey
  }

  async getCryptKeyPair(kind: GrantKind, id: string) {
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
