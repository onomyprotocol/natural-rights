import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class GetPubKeys extends ActionHandler {
  payload: GetPubKeysAction

  constructor(userId: string, deviceId: string, payload: GetPubKeysAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    return true
  }

  async execute(service: LocalService) {
    if (this.payload.kind === 'user') {
      const user = await service.db.getUser(this.payload.id)
      if (!user) throw new Error('User does not exist')

      return {
        ...this.payload,
        cryptPubKey: user.cryptPubKey,
        signPubKey: user.signPubKey
      } as GetPubKeysResult
    } else if (this.payload.kind === 'group') {
      const group = await service.db.getGroup(this.payload.id)
      if (!group) throw new Error('Group does not exist')

      return {
        ...this.payload,
        cryptPubKey: group.cryptPubKey,
        signPubKey: ''
      } as GetPubKeysResult
    } else if (this.payload.kind === 'document') {
      const doc = await service.db.getDocument(this.payload.id)
      if (!doc) throw new Error('Document does not exist')

      console.log('doc', doc)

      return {
        ...this.payload,
        cryptPubKey: doc.cryptPubKey,
        signPubKey: doc.id
      } as GetPubKeysResult
    }

    throw new Error('Unexpected GetPubKeys kind')
  }
}
