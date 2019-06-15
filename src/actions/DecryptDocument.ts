import { ActionHandler } from './ActionHandler'

export class DecryptDocument extends ActionHandler {
  payload: DecryptDocumentAction

  constructor(userId: string, deviceId: string, payload: DecryptDocumentAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(db: DatabaseInterface) {
    return db.getHasAccess(this.userId, this.payload.documentId)
  }

  async execute(db: DatabaseInterface) {
    throw new Error('Not yet implemented')

    return this.payload as DecryptDocumentResult
  }
}
