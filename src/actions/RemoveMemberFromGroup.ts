import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class RemoveMemberFromGroup extends ActionHandler {
  payload: RemoveMemberFromGroupAction

  constructor(userId: string, deviceId: string, payload: RemoveMemberFromGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    if (!this.userId) return false
    if (this.payload.userId === this.userId) return true
    return service.getIsGroupAdmin(this.payload.groupId, this.userId)
  }

  async execute(service: LocalService) {
    await service.db.deleteMembership(this.payload.groupId, this.payload.userId)
    return {
      groupId: this.payload.groupId,
      userId: this.payload.userId
    } as RemoveMemberFromGroupResult
  }
}
