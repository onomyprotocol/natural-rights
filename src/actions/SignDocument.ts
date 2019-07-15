import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class SignDocument extends ActionHandler {
  payload: SignDocumentAction

  constructor(userId: string, deviceId: string, payload: SignDocumentAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    const canSign = await service.getHasSignAccess(this.userId, this.payload.documentId)
    if (canSign) return true
    return false
  }

  async execute(service: LocalService) {
    const documentRecord = await service.db.getDocument(this.payload.documentId)
    const signKeyPair = {
      pubKey: documentRecord!.id,
      privKey: documentRecord!.signPrivKey
    }

    return {
      ...this.payload,
      signatures: await Promise.all(
        this.payload.hashes.map(hash => service.sea.signHash(hash, signKeyPair))
      )
    }
  }
}
