import { ActionHandler } from './ActionHandler'

export class RemoveAdminFromGroup extends ActionHandler {
  payload: RemoveAdminFromGroupAction

  constructor(userId: string, deviceId: string, payload: RemoveMemberFromGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    if (this.payload.userId === this.userId) return true
    return db.getIsGroupAdmin(this.payload.groupId, this.userId)
  }

  async execute(db: DatabaseInterface) {
    const membership = await db.getMembership(this.payload.groupId, this.payload.userId)
    if (membership) await db.putMembership({ ...membership, encGroupCryptPrivKey: '' })
    return {
      groupId: this.payload.groupId,
      userId: this.payload.userId
    } as RemoveAdminFromGroupResult
  }
}
