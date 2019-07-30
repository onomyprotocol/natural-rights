import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class Login extends ActionHandler {
  payload: LoginAction

  constructor(userId: string, deviceId: string, payload: LoginAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return true
  }

  async execute(service: LocalService) {
    if (!this.payload.cryptPubKey) throw new Error('No device cryptPubKey')
    const device = {
      id: this.deviceId,
      userId: '',
      cryptTransformKey: '',
      ...(await service.db.getDevice(this.deviceId)),
      signPubKey: this.deviceId,
      cryptPubKey: this.payload.cryptPubKey
    }
    const { userId } = device
    const [user] = await Promise.all([service.db.getUser(userId), service.db.putDevice(device)])

    return {
      userId,
      rootDocumentId: user ? user.rootDocumentId : ''
    } as LoginResult
  }
}
