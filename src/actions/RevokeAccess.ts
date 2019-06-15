import { ActionHandler } from './ActionHandler'

export class RevokeAccess extends ActionHandler {
  payload: RevokeAccessAction

  constructor(userId: string, deviceId: string, payload: RevokeAccessAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    if (this.userId === this.payload.userId) return true
    return db.getHasAccess(this.userId, this.payload.documentId)
  }

  async execute(db: DatabaseInterface) {
    await db.deleteGrant(this.payload.documentId, this.payload.userId)
    return {
      documentId: this.payload.documentId,
      userId: this.payload.userId
    } as RevokeAccessResult
  }
}
