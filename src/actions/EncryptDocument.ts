import { ActionHandler } from './ActionHandler'

export class EncryptDocument extends ActionHandler {
  payload: EncryptDocumentAction

  constructor(userId: string, deviceId: string, payload: EncryptDocumentAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    const existing = db.getDocument(this.payload.documentId)
    if (existing) return false
    return this.payload.userId === this.userId
  }

  async execute(db: DatabaseInterface) {
    await db.putDocument({
      id: this.payload.documentId,
      userId: this.payload.userId,
      encDecryptKey: this.payload.encCryptPrivKey
    })
    return this.payload as EncryptDocumentResult
  }
}
