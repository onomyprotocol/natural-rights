import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class Login extends ActionHandler {
  payload: LoginAction

  constructor(userId: string, deviceId: string, payload: LoginAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return !!this.userId
  }

  async execute(service: LocalService) {
    const user = await service.db.getUser(this.userId)
    if (!user) throw new Error('User does not exist')

    return {
      userId: this.userId,
      rootDocumentId: user.rootDocumentId
    } as LoginResult
  }
}
