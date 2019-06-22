import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class DecryptDocument extends ActionHandler {
  payload: DecryptDocumentAction

  constructor(userId: string, deviceId: string, payload: DecryptDocumentAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return service.getHasReadAccess(this.userId, this.payload.documentId)
  }

  async execute(service: LocalService) {
    const encCryptPrivKey = await service.getDeviceDocumentDecryptKey(
      this.userId,
      this.deviceId,
      this.payload.documentId
    )
    if (!encCryptPrivKey) throw new Error('No access')

    return {
      documentId: this.payload.documentId,
      encCryptPrivKey
    } as DecryptDocumentResult
  }
}
