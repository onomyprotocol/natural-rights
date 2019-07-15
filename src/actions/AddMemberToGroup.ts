import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class AddMemberToGroup extends ActionHandler {
  payload: AddMemberToGroupAction

  constructor(userId: string, deviceId: string, payload: AddMemberToGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return service.getIsGroupAdmin(this.payload.groupId, this.userId)
  }

  async execute(service: LocalService) {
    const existing = await service.db.getMembership(this.payload.groupId, this.payload.userId)
    const membership: MembershipRecord = {
      canSign: false,
      cryptTransformKey: '',
      encGroupCryptPrivKey: '',
      ...existing,
      groupId: this.payload.groupId,
      userId: this.payload.userId
    }

    if ('cryptTransformKey' in this.payload) {
      membership.cryptTransformKey = this.payload.cryptTransformKey
    }
    if ('canSign' in this.payload) membership.canSign = this.payload.canSign || false

    await service.db.putMembership(membership)
    return this.payload as AddMemberToGroupResult
  }
}
