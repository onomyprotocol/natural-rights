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
    await service.db.putMembership({
      groupId: this.payload.groupId,
      userId: this.payload.userId,
      cryptTransformKey: this.payload.cryptTransformKey,
      encGroupCryptPrivKey: ''
    })
    return this.payload as AddMemberToGroupResult
  }
}
