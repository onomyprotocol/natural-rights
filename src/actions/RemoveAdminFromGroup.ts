import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class RemoveAdminFromGroup extends ActionHandler {
  payload: RemoveAdminFromGroupAction

  constructor(userId: string, deviceId: string, payload: RemoveMemberFromGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    if (!this.userId) return false
    return service.getIsGroupAdmin(this.payload.groupId, this.userId)
  }

  async execute(service: LocalService) {
    const membership = await service.db.getMembership(this.payload.groupId, this.payload.userId)
    if (membership) await service.db.putMembership({ ...membership, encGroupCryptPrivKey: '' })
    return {
      groupId: this.payload.groupId,
      userId: this.payload.userId
    } as RemoveAdminFromGroupResult
  }
}
