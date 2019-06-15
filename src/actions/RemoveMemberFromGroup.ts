import { ActionHandler } from './ActionHandler'

export class RemoveMemberFromGroup extends ActionHandler {
  payload: RemoveMemberFromGroupAction

  constructor(userId: string, deviceId: string, payload: RemoveMemberFromGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    if (this.payload.userId === this.userId) return true
    return db.getIsGroupAdmin(this.payload.groupId, this.userId)
  }

  async execute(db: DatabaseInterface) {
    await db.deleteMembership(this.payload.groupId, this.payload.userId)
    return {
      groupId: this.payload.groupId,
      userId: this.payload.userId
    } as RemoveMemberFromGroupResult
  }
}
