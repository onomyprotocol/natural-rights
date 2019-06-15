import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class AddDevice extends ActionHandler {
  payload: AddDeviceAction

  constructor(userId: string, deviceId: string, payload: AddDeviceAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return this.payload.userId === this.userId
  }

  async execute(service: LocalService) {
    await service.db.putDevice({
      id: this.payload.deviceId,
      userId: this.payload.userId,
      signPubKey: this.payload.signPubKey,
      cryptPubKey: this.payload.cryptPubKey,
      cryptTransformKey: this.payload.cryptTransformKey
    })

    return this.payload as AddDeviceResult
  }
}
