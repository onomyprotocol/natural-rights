import { RequestFactory } from './RequestFactory'

function getErrors(response: NaturalRightsResponse) {
  return response.results.map(result => result.error).filter(result => !!result)
}

export class Client implements ClientInterface {
  service: ServiceInterface
  factory: RequestFactory
  userId: string
  deviceId: string

  constructor(service: ServiceInterface, userId: string, deviceId: string) {
    this.service = service
    this.factory = new RequestFactory(userId, deviceId)
    this.userId = userId
    this.deviceId = deviceId
  }

  async request(actions: NaturalRightsAction[]) {
    const request = await this.factory.sign(actions)
    const response = await this.service.request(request)
    const errors = getErrors(response)
    if (errors) throw errors
    return response
  }

  async initializeUser() {
    const { actions } = this.factory.initializeUser()
    const response = await this.request(actions)
    return // TODO: Should probably return keys here
  }

  async addDevice(deviceId: string) {
    throw new Error('Not yet implemented')
    return
  }

  async removeDevice(deviceId: string) {
    const { actions } = this.factory.removeDevice(deviceId)
    await this.request(actions)
  }

  async createGroup(groupId: string) {
    throw new Error('Not yet implemented')
    return
  }

  async addMemberToGroup(groupId: string, userId: string) {
    throw new Error('Not yet implemented')
    return
  }

  async removeMemberFromGroup(groupId: string, userId: string) {
    const { actions } = this.factory.removeMemberFromGroup(groupId, userId)
    await this.request(actions)
  }

  async addAdminToGroup(groupId: string, userId: string) {
    throw new Error('Not yet implemented')
    return
  }

  async removeAdminFromGroup(groupId: string, userId: string) {
    const { actions } = this.factory.removeAdminFromGroup(groupId, userId)
    await this.request(actions)
  }

  async encryptDocument(documentId: string) {
    throw new Error('Not yet implemented')
    return ''
  }

  async grantAccess(documentId: string, userOrGroupId: string) {
    throw new Error('Not yet implemented')
    return
  }

  async decryptDocument(documentId: string) {
    throw new Error('Not yet implemented')
    return ''
  }

  async revokeAccess(documentId: string, userOrGroupId: string) {
    const { actions } = this.factory.revokeAccess(documentId, userOrGroupId)
    await this.request(actions)
  }

  async updateDocument(documentId: string) {
    throw new Error('Not yet implemented')
    return ''
  }
}
