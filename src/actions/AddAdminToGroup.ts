import { ActionHandler } from './ActionHandler'

export class AddAdminToGroup extends ActionHandler {
  payload: AddAdminToGroupAction

  constructor(userId: string, deviceId: string, payload: AddAdminToGroupAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    return db.getIsGroupAdmin(this.payload.groupId, this.userId)
  }

  async execute(db: DatabaseInterface) {
    const membership = await db.getMembership(this.payload.groupId, this.payload.userId)

    if (!membership) throw new Error('No membership for user')

    await db.putMembership({
      ...membership,
      groupId: this.payload.groupId,
      userId: this.payload.userId,
      encGroupCryptPrivKey: this.payload.encCryptPrivKey
    })

    return this.payload as AddAdminToGroupResult
  }
}
