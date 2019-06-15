export class RequestFactory implements RequestFactoryInterface {
  userId: string
  deviceId: string

  constructor(userId: string, deviceId: string) {
    this.userId = userId
    this.deviceId = deviceId
  }

  async sign(actions: Action<any>[]) {
    const body = JSON.stringify(actions)
    const signature = '' // TODO;
    return {
      userId: this.userId,
      deviceId: this.deviceId,
      body,
      signature
    } as NaturalRightsRequest
  }

  initializeUser() {
    throw new Error('Not yet implemented')

    const userCryptPrivKey = ''
    const cryptPubKey = ''
    const signPubKey = ''
    const encCryptPrivKey = ''
    const encSignPrivKey = ''

    return {
      deviceCryptPrivKey: '',
      deviceSignPrivKey: '',
      actions: [
        {
          type: 'InitializeUser',
          payload: {
            userId: this.userId,
            cryptPubKey,
            signPubKey,
            encCryptPrivKey,
            encSignPrivKey
          }
        },
        ...this.addDevice(userCryptPrivKey, this.deviceId).actions
      ] as [Action<InitializeUserAction>, Action<AddDeviceAction>]
    }
  }

  addDevice(userCryptPrivKey: string, deviceId: string) {
    throw new Error('Not yet implemented')
    return {
      deviceCryptPrivKey: '',
      deviceSignPrivKey: '',
      actions: [
        {
          type: 'AddDevice',
          payload: {
            deviceId: '',
            userId: this.userId,
            cryptPubKey: '',
            signPubKey: '',
            cryptTransformKey: ''
          }
        }
      ] as [Action<AddDeviceAction>]
    }
  }

  removeDevice(deviceId: string) {
    return {
      actions: [
        {
          type: 'RemoveDevice',
          payload: {
            userId: this.userId,
            deviceId
          }
        }
      ] as [Action<RemoveDeviceAction>]
    }
  }

  createGroup(groupId: string) {
    throw new Error('Not yet implemented')

    const userCryptPubKey = ''
    const groupCryptPrivKey = ''

    return {
      actions: [
        {
          type: 'CreateGroup',
          payload: {
            groupId,
            userId: this.userId,
            cryptPubKey: '',
            encCryptPrivKey: ''
          }
        },
        ...this.addAdminToGroup(groupId, groupCryptPrivKey, this.userId, userCryptPubKey).actions
      ] as [
        Action<CreateGroupAction>,
        Action<AddMemberToGroupAction>,
        Action<AddAdminToGroupAction>
      ]
    }
  }

  addMemberToGroup(
    groupCryptPrivKey: string,
    groupId: string,
    userId: string,
    userCryptPubKey: string
  ) {
    throw new Error('Not yet implemented')
    const cryptTransformKey = ''

    return {
      actions: [
        {
          type: 'AddMemberToGroup',
          payload: {
            groupId,
            userId,
            cryptTransformKey
          }
        }
      ] as [Action<AddMemberToGroupAction>]
    }
  }

  removeMemberFromGroup(groupId: string, userId: string) {
    return {
      actions: [
        {
          type: 'RemoveMemberFromGroup',
          payload: {
            groupId,
            userId
          }
        }
      ] as [Action<RemoveMemberFromGroupAction>]
    }
  }

  addAdminToGroup(
    groupId: string,
    groupCryptPrivKey: string,
    userId: string,
    userCryptPubKey: string
  ) {
    throw new Error('Not yet implemented')
    const encCryptPrivKey = ''

    return {
      actions: [
        ...this.addMemberToGroup(groupCryptPrivKey, groupId, this.userId, userCryptPubKey).actions,
        {
          type: 'AddAdminToGroup',
          payload: {
            groupId,
            userId,
            encCryptPrivKey
          }
        }
      ] as [Action<AddMemberToGroupAction>, Action<AddAdminToGroupAction>]
    }
  }

  removeAdminFromGroup(groupId: string, userId: string) {
    return {
      actions: [
        {
          type: 'RemoveAdminFromGroup',
          payload: {
            groupId,
            userId
          }
        }
      ] as [Action<RemoveAdminFromGroupAction>]
    }
  }

  encryptDocument(documentId: string) {
    throw new Error('Not yet implemented')
    const docCryptPrivKey = ''
    const docCryptPubKey = ''

    return {
      docCryptPrivKey,
      docCryptPubKey,
      actions: [
        {
          type: 'EncryptDocument',
          payload: {}
        }
      ] as [Action<EncryptDocumentAction>]
    }
  }

  grantAccess(documentId: string, userId: string) {
    throw new Error('Not yet implemented')
    return {
      actions: [
        {
          type: 'GrantAccess',
          payload: {}
        }
      ] as [Action<GrantAccessAction>]
    }
  }

  decryptDocument(documentId: string) {
    return {
      actions: [
        {
          type: 'DecryptDocument',
          payload: {
            documentId
          }
        }
      ] as [Action<DecryptDocumentAction>]
    }
  }

  revokeAccess(documentId: string, userOrGroupId: string) {
    return {
      actions: [
        {
          type: 'RevokeAccess',
          payload: {
            documentId,
            userOrGroupId
          }
        }
      ] as [Action<RevokeAccessAction>]
    }
  }

  updateDocument(documentId: string) {
    throw new Error('Not yet implemented')
    const docCryptPrivKey = ''
    const docCryptPubKey = ''
    const encCryptPrivKey = ''

    return {
      docCryptPrivKey,
      docCryptPubKey,
      actions: [
        {
          type: 'UpdateDocument',
          payload: {
            documentId,
            userId: this.userId,
            encCryptPrivKey
          }
        }
      ] as [Action<UpdateDocumentAction>]
    }
  }
}
