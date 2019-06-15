import { ActionHandler } from './ActionHandler'

export class UpdateDocument extends ActionHandler {
  payload: UpdateDocumentAction

  constructor(userId: string, deviceId: string, payload: UpdateDocumentAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    if (this.userId !== this.payload.userId) return false
    return db.getHasAccess(this.userId, this.payload.documentId)
  }

  async execute(db: DatabaseInterface) {
    await db.putDocument({
      id: this.payload.documentId,
      userId: this.payload.userId,
      encDecryptKey: this.payload.encCryptPrivKey
    })
    return this.payload as UpdateDocumentResult
  }
}
